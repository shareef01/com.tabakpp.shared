package com.tabakpp.app

import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.CounterType
import kotlin.test.Test
import kotlin.test.assertEquals

class CounterConfigTest {

    @Test
    fun testDisplayName_WhenNameIsSet() {
        val config = CounterConfig(id = "1", name = "My Counter", type = CounterType.SIMPLE)
        assertEquals("My Counter", config.displayName)
    }

    @Test
    fun testDisplayName_WhenNameIsEmpty_Cigarette() {
        val config = CounterConfig(id = "1", name = "", type = CounterType.CIGARETTE)
        assertEquals("cigarettes", config.displayName)
    }

    @Test
    fun testDisplayName_WhenNameIsEmpty_JointKing() {
        val config = CounterConfig(id = "1", name = "", type = CounterType.JOINT_KING)
        assertEquals("king size", config.displayName)
    }

    @Test
    fun testDisplayName_WhenNameIsEmpty_JointQueen() {
        val config = CounterConfig(id = "1", name = "", type = CounterType.JOINT_QUEEN)
        assertEquals("queen size", config.displayName)
    }

    @Test
    fun testDisplayName_WhenNameIsEmpty_Simple() {
        val config = CounterConfig(id = "1", name = "", type = CounterType.SIMPLE)
        assertEquals("counter", config.displayName)
    }
}
