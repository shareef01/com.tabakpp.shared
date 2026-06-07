package com.tabakpp.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class DailyLog(
    val userId: String = "",
    val logDate: String = "",
    val counts: Map<String, Int> = mapOf("cigarettes" to 0),
)

@Serializable
data class CounterConfig(
    val id: String = "",
    val name: String = "",
    val limit: Int = 20,
    val type: CounterType = CounterType.CIGARETTE
) {
    val displayName: String get() = name.ifBlank {
        when (type) {
            CounterType.CIGARETTE -> "cigarettes"
            CounterType.JOINT_KING -> "king size"
            CounterType.JOINT_QUEEN -> "queen size"
            CounterType.SIMPLE -> "counter"
        }
    }
}

enum class CounterType {
    CIGARETTE, SIMPLE, JOINT_KING, JOINT_QUEEN
}
