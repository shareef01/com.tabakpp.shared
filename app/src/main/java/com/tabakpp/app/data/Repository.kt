package com.tabakpp.app.data

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.UserProfileChangeRequest
import com.google.firebase.firestore.FirebaseFirestore
import com.tabakpp.app.data.local.*
import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.CounterType
import com.tabakpp.app.data.model.DailyLog
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.Dispatchers
import javax.inject.Inject
import javax.inject.Singleton
import java.time.LocalDate

@Singleton
class Repository @Inject constructor(
    private val authRepo: AuthRepository,
    private val logsRepo: LogsRepository,
    private val tabakDao: TabakDao,
    private val auth: FirebaseAuth,
    private val db: FirebaseFirestore,
    private val settingsRepo: SettingsRepository
) {
    val counterConfigs = tabakDao.getAllCounterConfigs()
        .map { entities -> 
            if (entities.isEmpty()) {
                listOf(CounterConfig("cigarettes", "Cigarettes", 20, CounterType.CIGARETTE))
            } else {
                entities.map { it.toDomain() }
            }
        }.distinctUntilChanged()
    
    suspend fun ensureDefaultCounter() {
        val local = tabakDao.getAllCounterConfigsOnce()
        if (local.none { it.id == "cigarettes" }) {
            tabakDao.insertCounterConfig(CounterConfig("cigarettes", "Cigarettes", 20, CounterType.CIGARETTE).toEntity())
        }
    }
    
    fun getLogsFlow(userId: String): Flow<List<DailyLog>> {
        return combine(
            tabakDao.getLogsForUser(userId),
            tabakDao.getAllEvents(userId)
        ) { logs, events ->
            if (logs.isEmpty()) return@combine emptyList()
            
            // Optimization: group events by date once using a pre-calculated map
            val eventsByDate = events.groupBy { it.logDate }
            
            logs.map { logEntity ->
                val dayEvents = eventsByDate[logEntity.logDate]
                val counts = if (dayEvents != null) {
                    dayEvents.groupBy { it.counterId }
                        .mapValues { it.value.size }
                } else {
                    emptyMap()
                }
                DailyLog(logEntity.userId, logEntity.logDate, counts)
            }
        }.flowOn(Dispatchers.Default).distinctUntilChanged()
    }

    private fun CounterConfigEntity.toDomain() = CounterConfig(id, name, limit, type)
    private fun CounterConfig.toEntity() = CounterConfigEntity(id, name, limit, type, true)

    suspend fun signIn(email: String, password: String) = authRepo.signIn(email, password)
    suspend fun signInWithGoogle(idToken: String) {
        val credential = GoogleAuthProvider.getCredential(idToken, null)
        auth.signInWithCredential(credential).await()
    }
    suspend fun signInAnonymously() = authRepo.signInAnonymously()
    suspend fun signUp(email: String, password: String, name: String) {
        authRepo.signUp(email, password)
        if (name.isNotEmpty()) updateDisplayName(name)
    }
    fun signOut() = auth.signOut()
    suspend fun resetPassword(email: String) = authRepo.resetPassword(email)
    suspend fun updatePassword(pwd: String) = auth.currentUser?.updatePassword(pwd)?.await()
    suspend fun updateDisplayName(name: String) {
        val profileUpdates = UserProfileChangeRequest.Builder().setDisplayName(name).build()
        auth.currentUser?.updateProfile(profileUpdates)?.await()
    }
    suspend fun deleteAccount() {
        val user = auth.currentUser ?: return
        db.collection("users").document(user.uid).delete().await()
        authRepo.deleteAccount()
    }
    fun getCurrentUser() = auth.currentUser

    fun getAllEvents(userId: String) = tabakDao.getAllEvents(userId)

    suspend fun getLastEvent(userId: String): LogEventEntity? {
        return tabakDao.getAllEventsOnce(userId).maxByOrNull { it.timestamp }
    }

    suspend fun loadLogs(): List<DailyLog> {
        val uid = auth.currentUser?.uid ?: return emptyList()
        val remoteLogs = logsRepo.loadLogs(uid)
        // Optimization: migrate remote logs to Room every time we load to ensure local-first consistency
        if (remoteLogs.isNotEmpty()) migrateLogs(remoteLogs)
        return remoteLogs
    }

    suspend fun upsertLog(log: DailyLog) {
        val uid = auth.currentUser?.uid ?: return
        logsRepo.upsertLog(uid, log)
        tabakDao.insertDailyLog(DailyLogEntity(uid, log.logDate))
    }

    suspend fun syncRemoteConfigs() {
        val uid = auth.currentUser?.uid ?: return
        try {
            val remoteConfigs = logsRepo.getCounterConfigs(uid)
            if (remoteConfigs.isNotEmpty()) {
                tabakDao.insertCounterConfigs(remoteConfigs.map { it.toEntity() })
            }
        } catch (_: Exception) {}
    }

    suspend fun migrateLogs(remoteLogs: List<DailyLog>) {
        val uid = auth.currentUser?.uid ?: return
        if (remoteLogs.isEmpty()) return

        // 1. Fetch current valid counter IDs once
        val validCounterIds = tabakDao.getAllCounterConfigsOnce().map { it.id }.toSet()
        
        // 2. Fetch existing events once
        val existingEvents = tabakDao.getAllEventsOnce(uid)
        val eventsByDate = existingEvents.groupBy { it.logDate }
        
        val logsToInsert = mutableListOf<DailyLogEntity>()
        val eventsToInsert = mutableListOf<LogEventEntity>()

        remoteLogs.forEach { log ->
            logsToInsert.add(DailyLogEntity(uid, log.logDate))
            
            val localEventsForDay = eventsByDate[log.logDate] ?: emptyList()
            if (localEventsForDay.isEmpty() && log.counts.values.sum() > 0) {
                log.counts.forEach { (cid, count) ->
                    if (validCounterIds.contains(cid)) {
                        repeat(count) {
                            eventsToInsert.add(LogEventEntity(
                                userId = uid,
                                counterId = cid,
                                logDate = log.logDate,
                                timestamp = 0
                            ))
                        }
                    }
                }
            }
        }
        
        if (logsToInsert.isNotEmpty() || eventsToInsert.isNotEmpty()) {
            tabakDao.migrateLegacyData(logsToInsert, eventsToInsert)
        }
    }

    suspend fun overwriteCounterLogs(uid: String, date: String, counterId: String, count: Int) {
        tabakDao.deleteAllEventsForCounter(uid, date, counterId)
        val eventsToInsert = mutableListOf<LogEventEntity>()
        repeat(count) {
            eventsToInsert.add(LogEventEntity(
                userId = uid,
                counterId = counterId,
                logDate = date,
                timestamp = 0
            ))
        }
        tabakDao.insertEvents(eventsToInsert)
    }

    suspend fun saveDailyLimit(limit: Int) {
        val uid = auth.currentUser?.uid ?: return
        try {
            logsRepo.saveDailyLimit(uid, limit)
            tabakDao.insertCounterConfig(CounterConfig("cigarettes", "Cigarettes", limit, CounterType.CIGARETTE).toEntity())
        } catch (_: Exception) {}
    }

    suspend fun saveCounterConfigs(configs: List<CounterConfig>) {
        val uid = auth.currentUser?.uid ?: return
        try {
            logsRepo.saveCounterConfigs(uid, configs)
            tabakDao.insertCounterConfigs(configs.map { it.toEntity() })
        } catch (_: Exception) {}
    }

    suspend fun removeCounter(id: String) {
        val uid = auth.currentUser?.uid ?: return
        try {
            // 1. Delete from local Room DB (ForeignKey CASCADE will handle events)
            tabakDao.deleteCounterConfig(CounterConfig(id = id).toEntity())
            
            // 2. Fetch current local configs to update remote
            val remainingLocal = tabakDao.getAllCounterConfigsOnce().map { it.toDomain() }
            
            // 3. Update Firestore
            logsRepo.saveCounterConfigs(uid, remainingLocal)
        } catch (_: Exception) {}
    }

    suspend fun logIncrement(counterId: String) {
        val uid = auth.currentUser?.uid ?: return
        val todayStr = LocalDate.now().toString()
        
        // Safety: Ensure counter exists in local DB before inserting event to avoid 787
        val validCounterIds = tabakDao.getAllCounterConfigsOnce().map { it.id }.toSet()
        if (!validCounterIds.contains(counterId)) {
            syncRemoteConfigs()
            val updatedIds = tabakDao.getAllCounterConfigsOnce().map { it.id }.toSet()
            if (!updatedIds.contains(counterId)) return
        }

        tabakDao.insertDailyLog(DailyLogEntity(uid, todayStr))
        tabakDao.insertEvent(LogEventEntity(userId = uid, counterId = counterId, logDate = todayStr, timestamp = System.currentTimeMillis()))
        
        syncDayToFirestore(uid, todayStr)
    }

    suspend fun logDecrement(counterId: String) {
        val uid = auth.currentUser?.uid ?: return
        val todayStr = LocalDate.now().toString()
        tabakDao.deleteLatestEvent(uid, todayStr, counterId)
        
        syncDayToFirestore(uid, todayStr)
    }

    private suspend fun syncDayToFirestore(uid: String, date: String) {
        try {
            val events = tabakDao.getAllEventsOnce(uid).filter { it.logDate == date }
            val counts = events.groupBy { it.counterId }.mapValues { it.value.size }
            logsRepo.upsertLog(uid, DailyLog(uid, date, counts))
        } catch (_: Exception) {}
    }

    suspend fun getCounterConfigs(): List<CounterConfig> {
        val local = tabakDao.getAllCounterConfigsOnce()
        if (local.isNotEmpty()) return local.map { it.toDomain() }
        
        val uid = auth.currentUser?.uid ?: return listOf(CounterConfig("cigarettes", "Cigarettes", 20, CounterType.CIGARETTE))
        val remote = logsRepo.getCounterConfigs(uid)
        if (remote.isNotEmpty()) {
            tabakDao.insertCounterConfigs(remote.map { it.toEntity() })
        }
        return remote
    }
}
