package com.tabakpp.app.data

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.UserProfileChangeRequest
import com.google.firebase.firestore.FirebaseFirestore
import com.tabakpp.app.data.local.TabakDao
import com.tabakpp.app.data.local.CounterConfigEntity
import com.tabakpp.app.data.local.DailyLogEntity
import com.tabakpp.app.data.local.LogEventEntity
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
    // Flows from Room
    val counterConfigs = tabakDao.getAllCounterConfigs()
        .map { entities -> entities.map { it.toDomain() } }
    
    fun getLogs(userId: String) = tabakDao.getLogsForUser(userId)
        .map { entities -> entities.map { it.toDomain() } }

    // Helper functions for entity mapping
    private fun CounterConfigEntity.toDomain() = CounterConfig(id, name, limit, type)
    private fun DailyLogEntity.toDomain() = DailyLog(userId, logDate) // We'll add counts summary here

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

    suspend fun updatePassword(pwd: String) {
        auth.currentUser?.updatePassword(pwd)?.await()
    }

    suspend fun updateDisplayName(name: String) {
        val profileUpdates = UserProfileChangeRequest.Builder().setDisplayName(name).build()
        auth.currentUser?.updateProfile(profileUpdates)?.await()
    }

    suspend fun deleteAccount() {
        val user = auth.currentUser ?: return
        val uid = user.uid
        db.collection("users").document(uid).delete().await()
        authRepo.deleteAccount()
    }

    fun getCurrentUser() = auth.currentUser

    // Local-First implementation
    suspend fun loadLogs(): List<DailyLog> {
        val uid = auth.currentUser?.uid ?: return emptyList()
        // Try fetching from Room first? Or just use Firebase's persistence for now.
        // For "Local-First", we should return Room flow.
        return logsRepo.loadLogs(uid)
    }

    suspend fun upsertLog(log: DailyLog) {
        val uid = auth.currentUser?.uid ?: return
        logsRepo.upsertLog(uid, log)
    }

    suspend fun saveDailyLimit(limit: Int) {
        val uid = auth.currentUser?.uid ?: return
        logsRepo.saveDailyLimit(uid, limit)
    }

    suspend fun saveCounterConfigs(configs: List<CounterConfig>) {
        val uid = auth.currentUser?.uid ?: return
        logsRepo.saveCounterConfigs(uid, configs)
    }

    suspend fun getCounterConfigs(): List<CounterConfig> {
        val uid = auth.currentUser?.uid ?: return listOf(CounterConfig("cigarettes", "Cigarettes", 20, CounterType.CIGARETTE))
        return logsRepo.getCounterConfigs(uid)
    }

    // New Tracking with Timestamps
    suspend fun logIncrement(counterId: String) {
        val uid = auth.currentUser?.uid ?: return
        val todayStr = LocalDate.now().toString()
        val event = LogEventEntity(
            userId = uid,
            counterId = counterId,
            logDate = todayStr,
            timestamp = System.currentTimeMillis()
        )
        tabakDao.insertEvent(event)
        // In Phase 2/5 we'll add background sync for these events
    }
}
