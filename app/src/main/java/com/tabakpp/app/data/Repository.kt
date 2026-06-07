package com.tabakpp.app.data

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.UserProfileChangeRequest
import com.google.firebase.firestore.FirebaseFirestore
import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.CounterType
import com.tabakpp.app.data.model.DailyLog
import kotlinx.coroutines.tasks.await

object Repository {
    private val authRepo = AuthRepository()
    private val logsRepo = LogsRepository()
    
    private val auth get() = FirebaseAuth.getInstance()
    private val db get() = FirebaseFirestore.getInstance()

    suspend fun signIn(email: String, password: String) {
        authRepo.signIn(email, password)
    }

    suspend fun signInWithGoogle(idToken: String) {
        val credential = GoogleAuthProvider.getCredential(idToken, null)
        auth.signInWithCredential(credential).await()
    }

    suspend fun signInAnonymously() {
        authRepo.signInAnonymously()
    }

    suspend fun signUp(email: String, password: String, name: String) {
        authRepo.signUp(email, password)
        if (name.isNotEmpty()) {
            updateDisplayName(name)
        }
    }

    fun signOut() = auth.signOut()

    suspend fun resetPassword(email: String) {
        authRepo.resetPassword(email)
    }

    suspend fun updatePassword(pwd: String) {
        auth.currentUser?.updatePassword(pwd)?.await()
    }

    suspend fun updateDisplayName(name: String) {
        val profileUpdates = UserProfileChangeRequest.Builder()
            .setDisplayName(name)
            .build()
        auth.currentUser?.updateProfile(profileUpdates)?.await()
    }

    suspend fun deleteAccount() {
        val user = auth.currentUser ?: return
        val uid = user.uid
        // 1. Delete user data from Firestore
        db.collection("users").document(uid).delete().await()
        // 2. Delete the user from Auth
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
    }

    suspend fun deleteLog(uid: String, date: String) {
        logsRepo.deleteLog(uid, date)
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
}
