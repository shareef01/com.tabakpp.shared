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
                val logs = repository.getLogsOnce(user.uid)
                val todayStr = LocalDateTime.now().toLocalDate().toString()
                val todayLog = logs.find { it.logDate == todayStr }
                
                val totalLoggedToday = todayLog?.counts?.values?.sum() ?: 0
                val hour = LocalDateTime.now().hour
                if (hour >= 18 && totalLoggedToday == 0) {
                    NotificationHelper.showReminder(
                        context,
                        "tabak++ reminder",
                        "You haven't logged anything today. How's it going?"
                    )
                }
                
                // Trigger a sync
                repository.loadAndSyncAll()
            }
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
