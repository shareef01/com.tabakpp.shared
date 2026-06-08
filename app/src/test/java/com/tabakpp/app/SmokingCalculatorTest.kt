package com.tabakpp.app

import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.CounterType
import com.tabakpp.app.data.model.DailyLog
import com.tabakpp.app.domain.SmokingCalculator
import kotlinx.datetime.Clock
import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.TimeZone
import kotlinx.datetime.minus
import kotlinx.datetime.toLocalDateTime
import kotlin.test.Test
import kotlin.test.assertEquals

class SmokingCalculatorTest {

    private val configs = listOf(
        CounterConfig("cigarettes", "Cigarettes", 10, CounterType.CIGARETTE),
        CounterConfig("joint", "Joint", 5, CounterType.JOINT_KING)
    )

    @Test
    fun testTotalCount() {
        val log = DailyLog(counts = mapOf("cigarettes" to 3, "joint" to 2))
        assertEquals(5, SmokingCalculator.getTotalCount(log, configs))
    }

    @Test
    fun testTotalLimit() {
        assertEquals(15, SmokingCalculator.getTotalLimit(configs))
    }

    @Test
    fun testRemainingCount() {
        val logUnder = DailyLog(counts = mapOf("cigarettes" to 3))
        assertEquals(12, SmokingCalculator.getRemainingCount(logUnder, configs))

        val logOver = DailyLog(counts = mapOf("cigarettes" to 20))
        assertEquals(0, SmokingCalculator.getRemainingCount(logOver, configs)) // Clamped at 0
    }

    @Test
    fun testCalculateStreak_Continuous() {
        val now = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
        val today = now.toString()
        val yesterday = now.minus(1, DateTimeUnit.DAY).toString()
        val dayBefore = now.minus(2, DateTimeUnit.DAY).toString()

        val logs = listOf(
            DailyLog(logDate = today, counts = mapOf("cigarettes" to 5)),
            DailyLog(logDate = yesterday, counts = mapOf("cigarettes" to 5)),
            DailyLog(logDate = dayBefore, counts = mapOf("cigarettes" to 5))
        )

        assertEquals(3, SmokingCalculator.calculateStreak(logs, configs))
    }

    @Test
    fun testCalculateStreak_BrokenByLimit() {
        val now = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
        val today = now.toString()
        val yesterday = now.minus(1, DateTimeUnit.DAY).toString()

        val logs = listOf(
            DailyLog(logDate = today, counts = mapOf("cigarettes" to 5)),
            DailyLog(logDate = yesterday, counts = mapOf("cigarettes" to 20)) // Over limit
        )

        assertEquals(1, SmokingCalculator.calculateStreak(logs, configs))
    }

    @Test
    fun testCalculateStreak_BrokenByGap() {
        val now = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
        val today = now.toString()
        val dayBeforeYesterday = now.minus(2, DateTimeUnit.DAY).toString()

        val logs = listOf(
            DailyLog(logDate = today, counts = mapOf("cigarettes" to 5)),
            DailyLog(logDate = dayBeforeYesterday, counts = mapOf("cigarettes" to 5))
        )

        assertEquals(1, SmokingCalculator.calculateStreak(logs, configs))
    }

    @Test
    fun testCalculateStreak_StartsYesterday() {
        val now = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
        val yesterday = now.minus(1, DateTimeUnit.DAY).toString()

        val logs = listOf(
            DailyLog(logDate = yesterday, counts = mapOf("cigarettes" to 5))
        )

        assertEquals(1, SmokingCalculator.calculateStreak(logs, configs))
    }

    @Test
    fun testWeekTotal() {
        val today = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
        val logs = (0..10).map { 
            DailyLog(logDate = today.minus(it, DateTimeUnit.DAY).toString(), counts = mapOf("cigarettes" to 1))
        }
        // Should only count the last 7 days (0 to 6)
        assertEquals(7, SmokingCalculator.getWeekTotal(logs, "cigarettes"))
    }

    @Test
    fun testWeekAverage() {
        val today = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
        val logs = listOf(
            DailyLog(logDate = today.toString(), counts = mapOf("cigarettes" to 14))
        )
        // 14 / 7 = 2
        assertEquals(2f, SmokingCalculator.getWeekAverage(logs, "cigarettes"))
    }
}
