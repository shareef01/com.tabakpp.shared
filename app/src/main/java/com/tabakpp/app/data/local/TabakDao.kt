package com.tabakpp.app.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface TabakDao {
    // Counter Configs
    @Query("SELECT * FROM counter_configs")
    fun getAllCounterConfigs(): Flow<List<CounterConfigEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCounterConfig(config: CounterConfigEntity)

    @Delete
    suspend fun deleteCounterConfig(config: CounterConfigEntity)

    // Daily Logs
    @Query("SELECT * FROM daily_logs WHERE userId = :userId ORDER BY logDate DESC")
    fun getLogsForUser(userId: String): Flow<List<DailyLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDailyLog(log: DailyLogEntity)

    // Log Events
    @Query("SELECT counterId, COUNT(*) as count FROM log_events WHERE userId = :userId AND logDate = :logDate GROUP BY counterId")
    fun getCountsForDay(userId: String, logDate: String): Flow<List<CounterCount>>

    @Insert
    suspend fun insertEvent(event: LogEventEntity)

    @Query("DELETE FROM log_events WHERE userId = :userId AND logDate = :logDate AND counterId = :counterId")
    suspend fun deleteLatestEvent(userId: String, logDate: String, counterId: String)
    
    @Query("SELECT * FROM log_events WHERE isSynced = 0")
    suspend fun getUnsyncedEvents(): List<LogEventEntity>
    
    @Update
    suspend fun updateEvents(events: List<LogEventEntity>)
}
