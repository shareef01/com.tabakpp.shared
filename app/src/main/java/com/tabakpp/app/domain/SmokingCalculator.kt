package com.tabakpp.app.domain

import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.DailyLog
import kotlinx.datetime.*

object SmokingCalculator {
    
    fun getTotalCount(log: DailyLog?, configs: List<CounterConfig>): Int {
        if (log == null) return 0
        return configs.sumOf { log.counts[it.id] ?: 0 }
    }

    fun getTotalLimit(configs: List<CounterConfig>): Int {
        return configs.sumOf { it.limit }.coerceAtLeast(1)
    }

    fun getRemainingCount(log: DailyLog?, configs: List<CounterConfig>): Int {
        val totalCount = getTotalCount(log, configs)
        val totalLimit = getTotalLimit(configs)
        return (totalLimit - totalCount).coerceAtLeast(0)
    }

    private fun getLastNDays(n: Int): List<String> {
        val today = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
        return (0 until n).map { today.minus(it, DateTimeUnit.DAY).toString() }
    }

    fun getWeekTotal(logs: List<DailyLog>, counterId: String = "cigarettes"): Int {
        val lastSevenDays = getLastNDays(7)
        return logs.filter { it.logDate in lastSevenDays }
            .sumOf { it.counts[counterId] ?: 0 }
    }

    fun getWeekAverage(logs: List<DailyLog>, counterId: String = "cigarettes"): Float {
        val lastSevenDays = getLastNDays(7)
        val relevantLogs = logs.filter { it.logDate in lastSevenDays }
        if (relevantLogs.isEmpty()) return 0f
        return relevantLogs.sumOf { it.counts[counterId] ?: 0 } / 7f // Always divide by 7 for weekly average
    }

    fun getYesterdayCount(logs: List<DailyLog>, counterId: String = "cigarettes"): Int {
        val yesterday = Clock.System.now()
            .minus(1, DateTimeUnit.DAY, TimeZone.currentSystemDefault())
            .toLocalDateTime(TimeZone.currentSystemDefault())
            .date
            .toString()
        
        return logs.find { it.logDate == yesterday }?.counts?.get(counterId) ?: 0 // Return 0 instead of -1 if missing
    }

    fun calculateSavings(logs: List<DailyLog>, costPerUnit: Float): Float {
        return logs.sumOf { it.counts.values.sum() } * costPerUnit
    }

    fun calculateLifeLostMinutes(logs: List<DailyLog>): Int {
        // Average life lost per cigarette is often cited as 11 minutes.
        // We assume other smoking trackers also contribute similarly.
        return logs.sumOf { it.counts.values.sum() } * 11
    }

    fun calculateStreak(logs: List<DailyLog>, configs: List<CounterConfig>): Int {
        if (logs.isEmpty()) return 0
        
        val totalLimit = getTotalLimit(configs)
        val sortedLogs = logs.filter { it.counts.values.any { v -> v > 0 } } // Only count days with activity
            .sortedByDescending { it.logDate }
        
        if (sortedLogs.isEmpty()) return 0

        val now = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
        val today = now.toString()
        val yesterday = now.minus(1, DateTimeUnit.DAY).toString()
        
        val firstLog = sortedLogs.first()
        // Streak is only active if the last activity was today or yesterday
        if (firstLog.logDate != today && firstLog.logDate != yesterday) {
            return 0
        }

        var streak = 0
        var expectedDate = LocalDate.parse(firstLog.logDate)
        
        for (log in sortedLogs) {
            val logDate = LocalDate.parse(log.logDate)
            if (logDate != expectedDate) break // Gap in logs
            
            if (getTotalCount(log, configs) <= totalLimit) {
                streak++
                expectedDate = logDate.minus(1, DateTimeUnit.DAY)
            } else {
                break // Limit exceeded
            }
        }
        return streak
    }
}
