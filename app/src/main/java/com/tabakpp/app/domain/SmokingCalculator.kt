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
        return totalLimit - totalCount
    }

    fun getWeekTotal(logs: List<DailyLog>, counterId: String = "cigarettes"): Int {
        return logs.take(7).sumOf { it.counts[counterId] ?: 0 }
    }

    fun getWeekAverage(logs: List<DailyLog>, counterId: String = "cigarettes"): Float {
        val lastSeven = logs.take(7)
        if (lastSeven.isEmpty()) return 0f
        return lastSeven.sumOf { it.counts[counterId] ?: 0 } / lastSeven.size.toFloat()
    }

    fun getYesterdayCount(logs: List<DailyLog>, counterId: String = "cigarettes"): Int {
        val yesterday = Clock.System.now()
            .minus(1, DateTimeUnit.DAY, TimeZone.currentSystemDefault())
            .toLocalDateTime(TimeZone.currentSystemDefault())
            .date
            .toString()
        
        return logs.find { it.logDate == yesterday }?.counts?.get(counterId) ?: -1
    }

    // Money and Health Insights
    fun calculateSavings(logs: List<DailyLog>, costPerUnit: Float): Float {
        val totalCount = logs.sumOf { it.counts.values.sum() }
        // This is a bit complex without "planned vs actual". 
        // Let's assume savings = (sum of limits - sum of actual) * costPerUnit
        // But limits change. For now, let's just return actual cost.
        return totalCount * costPerUnit
    }

    fun calculateLifeLostMinutes(logs: List<DailyLog>): Int {
        val totalCigarettes = logs.sumOf { it.counts["cigarettes"] ?: 0 }
        return totalCigarettes * 11 // Average 11 mins per cigarette
    }

    fun calculateStreak(logs: List<DailyLog>, configs: List<CounterConfig>): Int {
        if (logs.isEmpty()) return 0
        var streak = 0
        val sortedLogs = logs.sortedByDescending { it.logDate }
        val totalLimit = getTotalLimit(configs)
        
        for (log in sortedLogs) {
            if (getTotalCount(log, configs) <= totalLimit) {
                streak++
            } else {
                break
            }
        }
        return streak
    }
}
