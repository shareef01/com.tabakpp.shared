package com.tabakpp.app.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface TabakDao {
    // Counter Configs
    @Query("SELECT * FROM counter_configs")
    fun getAllCounterConfigs(): Flow<List<CounterConfigEntity>>
    
    @Query("SELECT * FROM counter_configs")
    suspend fun getAllCounterConfigsOnce(): List<CounterConfigEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCounterConfig(config: CounterConfigEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCounterConfigs(configs: List<CounterConfigEntity>)

    @Delete
    suspend fun deleteCounterConfig(config: CounterConfigEntity)

    // Daily Logs
    @Query("SELECT * FROM daily_logs WHERE userId = :userId ORDER BY logDate DESC")
    fun getLogsForUser(userId: String): Flow<List<DailyLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDailyLog(log: DailyLogEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDailyLogs(logs: List<DailyLogEntity>)

    // Log Events
    @Query("SELECT counterId, COUNT(*) as count FROM log_events WHERE userId = :userId AND logDate = :logDate GROUP BY counterId")
    fun getCountsForDay(userId: String, logDate: String): Flow<List<CounterCount>>

    @Query("SELECT * FROM log_events WHERE userId = :userId")
    fun getAllEvents(userId: String): Flow<List<LogEventEntity>>
    
    @Query("SELECT * FROM log_events WHERE userId = :userId")
    suspend fun getAllEventsOnce(userId: String): List<LogEventEntity>

    @Insert
    suspend fun insertEvent(event: LogEventEntity)
    
    @Insert
    suspend fun insertEvents(events: List<LogEventEntity>)

    @Query("DELETE FROM log_events WHERE id = (SELECT id FROM log_events WHERE userId = :userId AND logDate = :logDate AND counterId = :counterId ORDER BY timestamp DESC LIMIT 1)")
    suspend fun deleteLatestEvent(userId: String, logDate: String, counterId: String)
    
    @Query("DELETE FROM log_events WHERE userId = :userId AND logDate = :logDate AND counterId = :counterId")
    suspend fun deleteAllEventsForCounter(userId: String, logDate: String, counterId: String)

    @Query("SELECT * FROM log_events WHERE isSynced = 0")
    suspend fun getUnsyncedEvents(): List<LogEventEntity>
    
    @Update
    suspend fun updateEvents(events: List<LogEventEntity>)
    
    @Transaction
    suspend fun migrateLegacyData(logs: List<DailyLogEntity>, events: List<LogEventEntity>) {
        insertDailyLogs(logs)
        insertEvents(events)
    }
}
