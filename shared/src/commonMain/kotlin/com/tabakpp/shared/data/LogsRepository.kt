package com.tabakpp.shared.data

import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.firestore
import dev.gitlive.firebase.firestore.Direction

class LogsRepository {
    private val db = Firebase.firestore

    suspend fun loadLogs(uid: String): List<DailyLog> {
        return try {
            val snapshot = db.collection("users").document(uid)
                .collection("logs")
                .orderBy("logDate", Direction.DESCENDING)
                .get()
            snapshot.documents.map { it.data<DailyLog>() }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun upsertLog(uid: String, log: DailyLog) {
        db.collection("users").document(uid)
            .collection("logs").document(log.logDate)
            .set(log, encodeDefaults = true)
    }

    suspend fun deleteLog(uid: String, date: String) {
        db.collection("users").document(uid)
            .collection("logs").document(date)
            .delete()
    }

    suspend fun saveCounterConfigs(uid: String, configs: List<CounterConfig>) {
        db.collection("users").document(uid)
            .set(mapOf("counters" to configs), merge = true)
    }

    suspend fun getDailyLimit(uid: String): Int {
        return try {
            val doc = db.collection("users").document(uid).get()
            val data: Map<String, Int>? = doc.data()
            data?.get("dailyLimit") ?: 20
        } catch (e: Exception) {
            20
        }
    }

    suspend fun saveDailyLimit(uid: String, limit: Int) {
        db.collection("users").document(uid)
            .set(mapOf("dailyLimit" to limit), merge = true)
    }

    suspend fun getCounterConfigs(uid: String): List<CounterConfig> {
        return try {
            val doc = db.collection("users").document(uid).get()
            val data: Map<String, List<CounterConfig>>? = doc.data()
            data?.get("counters") ?: listOf(CounterConfig("cigarettes", "Cigarettes", 20, CounterType.CIGARETTE))
        } catch (e: Exception) {
            listOf(CounterConfig("cigarettes", "Cigarettes", 20, CounterType.CIGARETTE))
        }
    }
}
