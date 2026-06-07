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
        val local = tabakDao.getAllCounterConfigs().first()
        if (local.isEmpty()) {
            tabakDao.insertCounterConfig(CounterConfig("cigarettes", "Cigarettes", 20, CounterType.CIGARETTE).toEntity())
        }
    }
    
    fun getLogsFlow(userId: String): Flow<List<DailyLog>> {
        return combine(
            tabakDao.getLogsForUser(userId),
            tabakDao.getAllEvents(userId)
        ) { logs, events ->
            logs.map { logEntity ->
                // Start with any legacy counts from the DailyLog (this would need the DailyLogEntity to store them)
                // OR: We migrate them once and then only use events. 
                // Let's rely on the migration logic in loadData.
                val counts = events.filter { it.logDate == logEntity.logDate }
                    .groupBy { it.counterId }
                    .mapValues { it.value.size }
                DailyLog(logEntity.userId, logEntity.logDate, counts)
            }
        }.distinctUntilChanged()
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

    suspend fun loadLogs(): List<DailyLog> {
        val uid = auth.currentUser?.uid ?: return emptyList()
        return logsRepo.loadLogs(uid)
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
            remoteConfigs.forEach { tabakDao.insertCounterConfig(it.toEntity()) }
        } catch (_: Exception) {}
    }

    suspend fun migrateLogs(remoteLogs: List<DailyLog>) {
        val uid = auth.currentUser?.uid ?: return
        remoteLogs.forEach { log ->
            // 1. Ensure log entry exists in Room
            tabakDao.insertDailyLog(DailyLogEntity(uid, log.logDate))
            
            // 2. Check if we have events for this day
            val localEvents = tabakDao.getAllEvents(uid).first().filter { it.logDate == log.logDate }
            if (localEvents.isEmpty() && log.counts.values.sum() > 0) {
                // If Room is empty for this day but remote has counts, migrate them
                log.counts.forEach { (cid, count) ->
                    repeat(count) {
                        tabakDao.insertEvent(LogEventEntity(
                            userId = uid,
                            counterId = cid,
                            logDate = log.logDate,
                            timestamp = 0 // Marker for migrated data
                        ))
                    }
                }
            }
        }
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
            configs.forEach { tabakDao.insertCounterConfig(it.toEntity()) }
        } catch (_: Exception) {}
    }

    suspend fun logIncrement(counterId: String) {
        val uid = auth.currentUser?.uid ?: return
        val todayStr = LocalDate.now().toString()
        tabakDao.insertDailyLog(DailyLogEntity(uid, todayStr))
        tabakDao.insertEvent(LogEventEntity(userId = uid, counterId = counterId, logDate = todayStr, timestamp = System.currentTimeMillis()))
    }

    suspend fun logDecrement(counterId: String) {
        val uid = auth.currentUser?.uid ?: return
        val todayStr = LocalDate.now().toString()
        tabakDao.deleteLatestEvent(uid, todayStr, counterId)
    }

    suspend fun getCounterConfigs(): List<CounterConfig> {
        val local = tabakDao.getAllCounterConfigs().first()
        if (local.isNotEmpty()) return local.map { it.toDomain() }
        
        val uid = auth.currentUser?.uid ?: return listOf(CounterConfig("cigarettes", "Cigarettes", 20, CounterType.CIGARETTE))
        val remote = logsRepo.getCounterConfigs(uid)
        remote.forEach { tabakDao.insertCounterConfig(it.toEntity()) }
        return remote
    }
}
