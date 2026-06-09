package com.tabakpp.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [CounterConfigEntity::class, DailyLogEntity::class, LogEventEntity::class],
    version = 5,
    exportSchema = false
)
abstract class TabakDatabase : RoomDatabase() {
    abstract fun tabakDao(): TabakDao
}
