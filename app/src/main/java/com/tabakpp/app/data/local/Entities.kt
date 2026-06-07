package com.tabakpp.app.data.local

import androidx.room.*
import com.tabakpp.app.data.model.CounterType

@Entity(tableName = "counter_configs")
data class CounterConfigEntity(
    @PrimaryKey val id: String,
    val name: String,
    val limit: Int,
    val type: CounterType,
    val isSynced: Boolean = false
)

@Entity(tableName = "daily_logs", primaryKeys = ["userId", "logDate"])
data class DailyLogEntity(
    val userId: String,
    val logDate: String,
    val isSynced: Boolean = false
)

@Entity(
    tableName = "log_events",
    foreignKeys = [
        ForeignKey(
            entity = CounterConfigEntity::class,
            parentColumns = ["id"],
            childColumns = ["counterId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("counterId")]
)
data class LogEventEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val userId: String,
    val counterId: String,
    val logDate: String, // YYYY-MM-DD
    val timestamp: Long, // Unix millis
    val isSynced: Boolean = false
)

data class CounterCount(
    val counterId: String,
    val count: Int
)
