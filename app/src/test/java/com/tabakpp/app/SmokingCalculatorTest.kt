package com.tabakpp.app

import com.tabakpp.app.data.local.LogEventEntity
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
import kotlin.test.assertTrue

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
    fun testWeekTotal() {
        val today = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
        val logs = (0..10).map { 
            DailyLog(logDate = today.minus(it, DateTimeUnit.DAY).toString(), counts = mapOf("cigarettes" to 1))
        }
        assertEquals(7, SmokingCalculator.getWeekTotal(logs, "cigarettes"))
    }

    @Test
    fun testCalculateXP() {
        val logs = listOf(DailyLog(), DailyLog()) // 2 days
        val streak = 5
        assertEquals(95, SmokingCalculator.calculateXP(logs, streak))
    }

    @Test
    fun testGetRank() {
        assertEquals("Apprentice", SmokingCalculator.getRank(50))
        assertEquals("Scout", SmokingCalculator.getRank(150))
        assertEquals("Veteran", SmokingCalculator.getRank(600))
        assertEquals("Master", SmokingCalculator.getRank(2000))
        assertEquals("Legend", SmokingCalculator.getRank(6000))
    }

    @Test
    fun testCalculateRecoveryMilestones_Progress() {
        val now = System.currentTimeMillis()
        val tenMinutesAgo = now - (10 * 60 * 1000)
        val milestones = SmokingCalculator.calculateRecoveryMilestones(tenMinutesAgo)
        val heartRate = milestones.find { it.title == "Heart Rate Normalizes" }
        assertEquals(0.5f, heartRate?.progress ?: 0f, 0.01f)
    }

    @Test
    fun testCalculateHourlyHeatmap() {
        val events = listOf(
            LogEventEntity(userId = "1", counterId = "c", logDate = "2023-01-01", timestamp = 1672531200000)
        )
        val heatmap = SmokingCalculator.calculateHourlyHeatmap(events)
        assertTrue(heatmap.values.sum() >= 1)
    }

    @Test
    fun testWeekAverage_EmptyLogs() {
        assertEquals(0f, SmokingCalculator.getWeekAverage(emptyList()))
    }

    @Test
    fun testCalculateSavings() {
        val logs = listOf(
            DailyLog(counts = mapOf("cigarettes" to 10, "joint" to 2))
        )
        val globalCost = 0.5f
        // Cigarettes: 10 * 0.5 = 5.0
        // Joint: 2 * 0 = 0 (config has price 0 in this test setup)
        // Let's use a setup where joint has a price.
        val customConfigs = listOf(
            CounterConfig("cigarettes", "Cigarettes", 10, CounterType.CIGARETTE, pricePerUnit = 1.0f),
            CounterConfig("joint", "Joint", 5, CounterType.JOINT_KING, pricePerUnit = 2.0f)
        )
        assertEquals(14.0f, SmokingCalculator.calculateSavings(logs, customConfigs, 0.5f))
    }

    @Test
    fun testCalculateSavings_Excluded() {
        val logs = listOf(DailyLog(counts = mapOf("cigarettes" to 10)))
        val customConfigs = listOf(
            CounterConfig("cigarettes", "Cigarettes", 10, CounterType.CIGARETTE, pricePerUnit = 1.0f, excludeFromEconomics = true)
        )
        assertEquals(0f, SmokingCalculator.calculateSavings(logs, customConfigs, 0.5f))
    }

    @Test
    fun testCalculateLifeLostMinutes() {
        val logs = listOf(
            DailyLog(counts = mapOf("cigarettes" to 5)),
            DailyLog(counts = mapOf("cigarettes" to 10))
        )
        // (5 + 10) * 11 = 165
        assertEquals(165, SmokingCalculator.calculateLifeLostMinutes(logs))
    }

    @Test
    fun testCalculateStreak_VeryLongStreak() {
        val today = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
        val logs = (0 until 100).map { 
            DailyLog(logDate = today.minus(it, DateTimeUnit.DAY).toString(), counts = mapOf("cigarettes" to 1))
        }
        assertEquals(100, SmokingCalculator.calculateStreak(logs, configs))
    }
}
