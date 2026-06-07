package com.tabakpp.app.data

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.CounterType
import com.tabakpp.app.data.model.DailyLog
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LogsRepository @Inject constructor(
    private val db: FirebaseFirestore
) {
    suspend fun loadLogs(uid: String): List<DailyLog> {
        return try {
            val snapshot = db.collection("users").document(uid)
                .collection("logs")
                .orderBy("logDate", Query.Direction.DESCENDING)
                .get()
                .await()
            snapshot.toObjects(DailyLog::class.java)
        } catch (_: Exception) {
            emptyList()
        }
    }

    suspend fun upsertLog(uid: String, log: DailyLog) {
        db.collection("users").document(uid)
            .collection("logs").document(log.logDate)
            .set(log, SetOptions.merge())
            .await()
    }

    suspend fun deleteLog(uid: String, date: String) {
        db.collection("users").document(uid)
            .collection("logs").document(date)
            .delete()
            .await()
    }

    suspend fun saveCounterConfigs(uid: String, configs: List<CounterConfig>) {
        db.collection("users").document(uid)
            .set(mapOf("counters" to configs), SetOptions.merge())
            .await()
    }

    suspend fun getDailyLimit(uid: String): Int {
        return try {
            val doc = db.collection("users").document(uid).get().await()
            doc.getLong("dailyLimit")?.toInt() ?: 20
        } catch (e: Exception) {
            20
        }
    }

    suspend fun saveDailyLimit(uid: String, limit: Int) {
        db.collection("users").document(uid)
            .set(mapOf("dailyLimit" to limit), SetOptions.merge())
            .await()
    }

    suspend fun getCounterConfigs(uid: String): List<CounterConfig> {
        return try {
            val doc = db.collection("users").document(uid).get().await()
            val data = doc.toObject(UserData::class.java)
            data?.counters ?: listOf(CounterConfig("cigarettes", "Cigarettes", 20, CounterType.CIGARETTE))
        } catch (e: Exception) {
            listOf(CounterConfig("cigarettes", "Cigarettes", 20, CounterType.CIGARETTE))
        }
    }

    private data class UserData(
        val counters: List<CounterConfig> = emptyList()
    )
}
