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
import kotlinx.coroutines.withContext
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
    val counterConfigs: Flow<List<CounterConfig>> = tabakDao.getAllCounterConfigs()
        .map { entities -> 
            if (entities.isEmpty()) {
                listOf(CounterConfig("cigarettes", "Cigarettes", 20, CounterType.CIGARETTE))
            } else {
                entities.map { it.toDomain() }
            }
        }
        .flowOn(Dispatchers.Default)
        .distinctUntilChanged()
    
    fun getLogsFlow(userId: String): Flow<List<DailyLog>> {
        return combine(
            tabakDao.getLogsForUser(userId),
            tabakDao.getAllEvents(userId)
        ) { logs, events ->
            if (logs.isEmpty()) return@combine emptyList()
            val eventsByDate = events.groupBy { it.logDate }
            logs.map { logEntity ->
                val dayEvents = eventsByDate[logEntity.logDate]
                val counts = dayEvents?.groupBy { it.counterId }?.mapValues { it.value.size } ?: emptyMap()
                DailyLog(logEntity.userId, logEntity.logDate, counts, logEntity.notes)
            }
        }.flowOn(Dispatchers.Default).distinctUntilChanged()
    }

    suspend fun getLogsOnce(userId: String): List<DailyLog> = withContext(Dispatchers.IO) {
        val logs = tabakDao.getLogsForUser(userId).first()
        val events = tabakDao.getAllEventsOnce(userId)
        val eventsByDate = events.groupBy { it.logDate }
        logs.map { logEntity ->
            val counts = eventsByDate[logEntity.logDate]?.groupBy { it.counterId }?.mapValues { it.value.size } ?: emptyMap()
            DailyLog(logEntity.userId, logEntity.logDate, counts, logEntity.notes)
        }
    }

    suspend fun getCounterConfigsOnce(): List<CounterConfig> = withContext(Dispatchers.IO) {
        val local = tabakDao.getAllCounterConfigsOnce()
        if (local.isEmpty()) {
            listOf(CounterConfig("cigarettes", "Cigarettes", 20, CounterType.CIGARETTE))
        } else {
            local.map { it.toDomain() }
        }
    }

    suspend fun ensureDefaultCounter() {
        val local = tabakDao.getAllCounterConfigsOnce()
        if (local.none { it.id == "cigarettes" }) {
            tabakDao.insertCounterConfig(CounterConfig("cigarettes", "Cigarettes", 20, CounterType.CIGARETTE).toEntity())
        }
    }

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
    suspend fun getLastEvent(userId: String): LogEventEntity? = withContext(Dispatchers.IO) {
        tabakDao.getAllEventsOnce(userId).maxByOrNull { it.timestamp }
    }

    suspend fun loadAndSyncAll() = withContext(Dispatchers.IO) {
        val uid = auth.currentUser?.uid ?: return@withContext
        val remoteConfigs = logsRepo.getCounterConfigs(uid)
        if (remoteConfigs.isNotEmpty()) {
            tabakDao.insertCounterConfigs(remoteConfigs.map { it.toEntity() })
        } else {
            ensureDefaultCounter()
        }
        val remoteLogs = logsRepo.loadLogs(uid)
        if (remoteLogs.isNotEmpty()) migrateLogs(remoteLogs)
        else tabakDao.insertDailyLog(DailyLogEntity(uid, LocalDate.now().toString()))
    }

    suspend fun migrateLogs(remoteLogs: List<DailyLog>) {
        val uid = auth.currentUser?.uid ?: return
        if (remoteLogs.isEmpty()) return
        val validIds = tabakDao.getAllCounterConfigsOnce().map { it.id }.toSet()
        val existingEvents = tabakDao.getAllEventsOnce(uid).groupBy { it.logDate }
        val logsToInsert = mutableListOf<DailyLogEntity>()
        val eventsToInsert = mutableListOf<LogEventEntity>()
        remoteLogs.forEach { log ->
            logsToInsert.add(DailyLogEntity(uid, log.logDate, log.notes))
            if (existingEvents[log.logDate].isNullOrEmpty() && log.counts.values.sum() > 0) {
                log.counts.forEach { (cid, count) ->
                    if (validIds.contains(cid)) {
                        repeat(count) { eventsToInsert.add(LogEventEntity(userId = uid, counterId = cid, logDate = log.logDate, timestamp = 0)) }
                    }
                }
            }
        }
        if (logsToInsert.isNotEmpty() || eventsToInsert.isNotEmpty()) {
            tabakDao.fullSync(emptyList(), logsToInsert, eventsToInsert)
        }
    }

    suspend fun logIncrement(counterId: String) = withContext(Dispatchers.IO) {
        val uid = auth.currentUser?.uid ?: return@withContext
        val todayStr = LocalDate.now().toString()
        if (!tabakDao.getAllCounterConfigsOnce().any { it.id == counterId }) return@withContext
        tabakDao.insertDailyLog(DailyLogEntity(uid, todayStr))
        tabakDao.insertEvent(LogEventEntity(userId = uid, counterId = counterId, logDate = todayStr, timestamp = System.currentTimeMillis()))
        syncDayToFirestore(uid, todayStr)
    }

    suspend fun logDecrement(counterId: String) = withContext(Dispatchers.IO) {
        val uid = auth.currentUser?.uid ?: return@withContext
        val todayStr = LocalDate.now().toString()
        tabakDao.deleteLatestEvent(uid, todayStr, counterId)
        syncDayToFirestore(uid, todayStr)
    }

    suspend fun overwriteCounterLogs(uid: String, date: String, counterId: String, count: Int) = withContext(Dispatchers.IO) {
        tabakDao.deleteAllEventsForCounter(uid, date, counterId)
        val eventsToInsert = (1..count).map { LogEventEntity(userId = uid, counterId = counterId, logDate = date, timestamp = 0) }
        tabakDao.insertEvents(eventsToInsert)
        syncDayToFirestore(uid, date)
    }

    private suspend fun syncDayToFirestore(uid: String, date: String) {
        try {
            val events = tabakDao.getAllEventsOnce(uid).filter { it.logDate == date }
            val counts = events.groupBy { it.counterId }.mapValues { it.value.size }
            logsRepo.upsertLog(uid, DailyLog(uid, date, counts))
        } catch (_: Exception) {}
    }

    suspend fun saveCounterConfigs(configs: List<CounterConfig>) = withContext(Dispatchers.IO) {
        val uid = auth.currentUser?.uid ?: return@withContext
        try {
            logsRepo.saveCounterConfigs(uid, configs)
            tabakDao.insertCounterConfigs(configs.map { it.toEntity() })
        } catch (_: Exception) {}
    }

    suspend fun removeCounter(id: String) = withContext(Dispatchers.IO) {
        val uid = auth.currentUser?.uid ?: return@withContext
        try {
            tabakDao.deleteCounterConfigById(id)
            val remaining = tabakDao.getAllCounterConfigsOnce().map { it.toDomain() }
            logsRepo.saveCounterConfigs(uid, remaining)
        } catch (_: Exception) {}
    }

    suspend fun saveDailyLimit(limit: Int) = withContext(Dispatchers.IO) {
        val uid = auth.currentUser?.uid ?: return@withContext
        try {
            logsRepo.saveDailyLimit(uid, limit)
            tabakDao.insertCounterConfig(CounterConfig("cigarettes", "Cigarettes", limit, CounterType.CIGARETTE).toEntity())
        } catch (_: Exception) {}
    }

    private fun CounterConfigEntity.toDomain() = CounterConfig(id, name, limit, type)
    private fun CounterConfig.toEntity() = CounterConfigEntity(id, name, limit, type)
}
