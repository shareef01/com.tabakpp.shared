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
            
            snapshot.documents.mapNotNull { doc ->
                val data = doc.data ?: return@mapNotNull null
                val logDate = data["logDate"] as? String ?: doc.id
                val notes = data["notes"] as? String ?: ""
                
                // Handle both nested 'counts' map and legacy root-level counters
                val counts = mutableMapOf<String, Int>()
                
                // 1. Check for new 'counts' map
                val nestedCounts = data["counts"] as? Map<*, *>
                nestedCounts?.forEach { (k, v) ->
                    if (k is String && v is Number) counts[k] = v.toInt()
                }
                
                // 2. Fallback: check root level for any fields that are Numbers and not metadata
                if (counts.isEmpty()) {
                    val metadataFields = setOf("userId", "logDate", "notes", "counts", "timestamp")
                    data.forEach { (k, v) ->
                        if (k !in metadataFields && v is Number) {
                            counts[k] = v.toInt()
                        }
                    }
                }
                
                DailyLog(uid, logDate, counts, notes)
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    suspend fun upsertLog(uid: String, log: DailyLog) {
        db.collection("users").document(uid)
            .collection("logs").document(log.logDate)
            .set(log)
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
            val counters = doc.get("counters") as? List<*>
            counters?.mapNotNull { item ->
                val map = item as? Map<*, *> ?: return@mapNotNull null
                val id = map["id"] as? String ?: ""
                val name = map["name"] as? String ?: ""
                val limit = (map["limit"] as? Number)?.toInt() ?: 20
                val typeStr = map["type"] as? String ?: CounterType.CIGARETTE.name
                val type = try { CounterType.valueOf(typeStr) } catch (_: Exception) { CounterType.CIGARETTE }
                val order = (map["displayOrder"] as? Number)?.toInt() ?: 0
                
                CounterConfig(id, name, limit, type, order)
            } ?: listOf(CounterConfig("cigarettes", "Cigarettes", 20, CounterType.CIGARETTE, 0))
        } catch (e: Exception) {
            listOf(CounterConfig("cigarettes", "Cigarettes", 20, CounterType.CIGARETTE, 0))
        }
    }
}
