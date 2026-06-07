package com.tabakpp.app.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.tabakpp.app.data.Repository
import com.tabakpp.app.util.NotificationHelper
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.time.LocalDateTime

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted private val context: Context,
    @Assisted params: WorkerParameters,
    private val repository: Repository
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val user = repository.getCurrentUser()
            if (user != null) {
                val logs = repository.loadLogs()
                val todayStr = LocalDateTime.now().toLocalDate().toString()
                val todayLog = logs.find { it.logDate == todayStr }
                
                // Smart Reminder: If it's after 6 PM and no activity logged today
                val hour = LocalDateTime.now().hour
                if (hour >= 18 && (todayLog == null || todayLog.counts.values.sum() == 0)) {
                    NotificationHelper.showReminder(
                        context,
                        "tabak++ reminder",
                        "You haven't logged anything today. How's it going?"
                    )
                }
            }
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
