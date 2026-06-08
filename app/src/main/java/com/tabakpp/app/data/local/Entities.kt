package com.tabakpp.app.data.local

import androidx.room.*
import com.tabakpp.app.data.model.CounterType

@Entity(tableName = "counter_configs")
data class CounterConfigEntity(
    @PrimaryKey val id: String,
    val name: String,
    val limit: Int,
    val type: CounterType,
    val displayOrder: Int = 0,
    val isSynced: Boolean = true
)

@Entity(tableName = "daily_logs", primaryKeys = ["userId", "logDate"])
data class DailyLogEntity(
    val userId: String,
    val logDate: String,
    val notes: String = "",
    val isSynced: Boolean = true
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
    indices = [Index("counterId"), Index("logDate")]
)
data class LogEventEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val userId: String,
    val counterId: String,
    val logDate: String,
    val timestamp: Long,
    val isSynced: Boolean = false
)

data class CounterCount(
    val counterId: String,
    val count: Int
)
