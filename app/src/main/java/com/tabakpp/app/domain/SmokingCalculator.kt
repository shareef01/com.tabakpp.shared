package com.tabakpp.app.domain

import com.tabakpp.app.data.local.LogEventEntity
import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.DailyLog
import kotlinx.datetime.*
import kotlin.math.min

data class RecoveryMilestone(
    val title: String,
    val durationMinutes: Long,
    val description: String,
    val progress: Float // 0.0 to 1.0
)

data class Badge(
    val id: String,
    val title: String,
    val icon: String, // Icon name or emoji
    val description: String,
    val isUnlocked: Boolean
)

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
        return relevantLogs.sumOf { it.counts[counterId] ?: 0 } / 7f
    }

    fun getYesterdayCount(logs: List<DailyLog>, counterId: String = "cigarettes"): Int {
        val yesterday = Clock.System.now()
            .minus(1, DateTimeUnit.DAY, TimeZone.currentSystemDefault())
            .toLocalDateTime(TimeZone.currentSystemDefault())
            .date
            .toString()
        
        return logs.find { it.logDate == yesterday }?.counts?.get(counterId) ?: 0
    }

    fun calculateSavings(logs: List<DailyLog>, costPerUnit: Float): Float {
        return logs.sumOf { it.counts.values.sum() } * costPerUnit
    }

    fun calculateLifeLostMinutes(logs: List<DailyLog>): Int {
        return logs.sumOf { it.counts.values.sum() } * 11
    }

    fun calculateStreak(logs: List<DailyLog>, configs: List<CounterConfig>): Int {
        if (logs.isEmpty()) return 0
        val totalLimit = getTotalLimit(configs)
        val sortedLogs = logs.filter { it.counts.values.any { v -> v > 0 } }.sortedByDescending { it.logDate }
        if (sortedLogs.isEmpty()) return 0
        val now = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
        val today = now.toString()
        val yesterday = now.minus(1, DateTimeUnit.DAY).toString()
        val firstLog = sortedLogs.first()
        if (firstLog.logDate != today && firstLog.logDate != yesterday) return 0
        var streak = 0
        var expectedDate = LocalDate.parse(firstLog.logDate)
        for (log in sortedLogs) {
            val logDate = LocalDate.parse(log.logDate)
            if (logDate != expectedDate) break
            if (getTotalCount(log, configs) <= totalLimit) {
                streak++
                expectedDate = logDate.minus(1, DateTimeUnit.DAY)
            } else break
        }
        return streak
    }

    // --- NEW ADVANCED FEATURES ---

    fun calculateRecoveryMilestones(lastLogTimestamp: Long?): List<RecoveryMilestone> {
        if (lastLogTimestamp == null) return emptyList()
        val now = Clock.System.now().toEpochMilliseconds()
        val diffMinutes = (now - lastLogTimestamp) / (1000 * 60)
        
        val milestones = listOf(
            RecoveryMilestone("Heart Rate Normalizes", 20, "Your heart rate and blood pressure begin to drop.", 0f),
            RecoveryMilestone("Carbon Monoxide Drops", 12 * 60, "The carbon monoxide level in your blood drops to normal.", 0f),
            RecoveryMilestone("Lung Function Improves", 2 * 7 * 24 * 60, "Your circulation improves and your lung function increases.", 0f),
            RecoveryMilestone("Coughing Decreases", 30 * 24 * 60, "Coughing and shortness of breath decrease.", 0f)
        )

        return milestones.map { m ->
            val progress = (diffMinutes.toFloat() / m.durationMinutes).coerceIn(0f, 1f)
            m.copy(progress = progress)
        }
    }

    fun calculateXP(logs: List<DailyLog>, streak: Int): Int {
        val totalDays = logs.size
        val totalLogs = logs.sumOf { it.counts.values.sum() }
        return (totalDays * 10) + (streak * 15) + (totalLogs * 2)
    }

    fun getRank(xp: Int): String {
        return when {
            xp < 100 -> "Apprentice"
            xp < 500 -> "Scout"
            xp < 1500 -> "Veteran"
            xp < 5000 -> "Master"
            else -> "Legend"
        }
    }

    fun calculateHourlyHeatmap(events: List<LogEventEntity>): Map<Int, Int> {
        val heatmap = mutableMapOf<Int, Int>()
        // Initialize all hours to 0
        for (h in 0..23) heatmap[h] = 0
        
        events.forEach { event ->
            val instant = Instant.fromEpochMilliseconds(event.timestamp)
            val hour = instant.toLocalDateTime(TimeZone.currentSystemDefault()).hour
            heatmap[hour] = heatmap.getOrDefault(hour, 0) + 1
        }
        return heatmap
    }

    fun checkBadges(logs: List<DailyLog>, streak: Int): List<Badge> {
        val totalLogs = logs.sumOf { it.counts.values.sum() }
        return listOf(
            Badge("streak_7", "7 Day Streak", "🔥", "Stay under limit for 7 consecutive days", streak >= 7),
            Badge("early_bird", "Early Bird", "🌅", "Log your first activity after 10 AM", false), // Logic depends on timestamp
            Badge("clean_weekend", "Weekend Warrior", "🏖️", "Stay under limit for a full weekend", false),
            Badge("quitter_initiate", "Starting Out", "🌱", "Complete your first day under the limit", totalLogs > 0)
        )
    }
}
