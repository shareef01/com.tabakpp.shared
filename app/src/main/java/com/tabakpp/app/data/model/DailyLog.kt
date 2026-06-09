package com.tabakpp.app.data.model

import androidx.compose.runtime.Immutable
import kotlinx.serialization.Serializable

@Immutable
@Serializable
data class DailyLog(
    val userId: String = "",
    val logDate: String = "",
    val counts: Map<String, Int> = mapOf("cigarettes" to 0),
    val notes: String = ""
)

@Immutable
@Serializable
data class CounterConfig(
    val id: String = "",
    val name: String = "",
    val limit: Int = 20,
    val type: CounterType = CounterType.CIGARETTE,
    val displayOrder: Int = 0,
    val pricePerUnit: Float = 0f,
    val excludeFromEconomics: Boolean = false
) {
    @get:com.google.firebase.firestore.Exclude
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
