package com.tabakpp.shared.domain

import com.tabakpp.shared.data.CounterConfig
import com.tabakpp.shared.data.DailyLog
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
}
