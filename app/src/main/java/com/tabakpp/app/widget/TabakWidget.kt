package com.tabakpp.app.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.glance.*
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.*
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.layout.*
import androidx.glance.state.GlanceStateDefinition
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.glance.text.*
import androidx.glance.unit.ColorProvider
import com.tabakpp.app.MainActivity
import com.tabakpp.app.data.Repository
import com.tabakpp.app.data.SettingsRepository
import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.DailyLog
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.format.DateTimeFormatter

object TabakWidgetKeys {
    val countKey = intPreferencesKey("cigarette_count")
    val limitKey = intPreferencesKey("daily_limit")
}

@EntryPoint
@InstallIn(SingletonComponent::class)
interface WidgetEntryPoint {
    fun repository(): Repository
    fun settingsRepository(): SettingsRepository
}

class TabakWidget : GlanceAppWidget() {
    
    override val stateDefinition: GlanceStateDefinition<*> = PreferencesGlanceStateDefinition

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val entryPoint = EntryPointAccessors.fromApplication(context, WidgetEntryPoint::class.java)
        val repo = entryPoint.repository()
        val settingsRepo = entryPoint.settingsRepository()

        val selectedId = try { settingsRepo.widgetCounterId.first() } catch (e: Exception) { "cigarettes" }
        val configs = try { repo.  getCounterConfigs() } catch (e: Exception) { emptyList() }
        val activeConfig = configs.find { it.id == selectedId } ?: configs.firstOrNull() ?: CounterConfig("cigarettes", "Cigarettes")

        val count = try {
            val logs = repo.loadLogs()
            val todayStr = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
            logs.find { it.logDate == todayStr }?.counts?.get(activeConfig.id) ?: 0
        } catch (e: Exception) { 0 }
        
        val isDark = try { settingsRepo.isDarkMode.first() } catch (e: Exception) { true }

        updateAppWidgetState(context, id) { prefs ->
            prefs[TabakWidgetKeys.countKey] = count
            prefs[TabakWidgetKeys.limitKey] = activeConfig.limit
        }

        provideContent {
            val prefs = currentState<androidx.datastore.preferences.core.Preferences>()
            val c = prefs[TabakWidgetKeys.countKey] ?: count
            val l = prefs[TabakWidgetKeys.limitKey] ?: activeConfig.limit
            WidgetContent(c, l, activeConfig.displayName, isDark)
        }
    }

    @Composable
    private fun WidgetContent(count: Int, limit: Int, name: String, isDark: Boolean) {
        val accentColor = if (isDark) Color(0xFFD4FF5C) else Color(0xFF2563EB)
        val textMuted = if (isDark) Color(0xFF888880) else Color(0xFF6B6B6B)
        val bgBase = if (isDark) Color(0xFF020202) else Color(0xFFF5F5F7)
        val textMain = if (isDark) Color.White else Color(0xFF1A1A1C)
        val dangerColor = if (isDark) Color(0xFFF87171) else Color(0xFFD32F2F)

        Box(modifier = GlanceModifier.fillMaxSize().background(bgBase).clickable(actionStartActivity<MainActivity>()), contentAlignment = Alignment.Center) {
            Row(modifier = GlanceModifier.fillMaxSize().padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = GlanceModifier.size(64.dp).background(accentColor.copy(alpha = 0.15f)).cornerRadius(32.dp), contentAlignment = Alignment.Center) {
                    Box(modifier = GlanceModifier.fillMaxSize().clickable(actionRunCallback<IncrementAction>()), contentAlignment = Alignment.Center) {
                         Text(text = "+", style = TextStyle(color = ColorProvider(if (count >= limit) dangerColor else accentColor), fontSize = 36.sp, fontWeight = FontWeight.Bold))
                    }
                }
                Spacer(GlanceModifier.defaultWeight())
                Column(horizontalAlignment = Alignment.End, verticalAlignment = Alignment.CenterVertically) {
                    Text(text = name.lowercase(), style = TextStyle(color = ColorProvider(accentColor), fontSize = 11.sp, fontWeight = FontWeight.Bold))
                    Text(text = count.toString(), style = TextStyle(color = ColorProvider(textMain), fontSize = 48.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.End))
                    Text(text = "today", style = TextStyle(color = ColorProvider(textMuted), fontSize = 10.sp, fontWeight = FontWeight.Normal))
                }
            }
        }
    }
}

class IncrementAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val updatedCount = withContext(Dispatchers.IO) {
            try {
                val entryPoint = EntryPointAccessors.fromApplication(context, WidgetEntryPoint::class.java)
                val repo = entryPoint.repository()
                val settingsRepo = entryPoint.settingsRepository()

                val selectedId = settingsRepo.widgetCounterId.first()
                val user = repo.getCurrentUser() ?: return@withContext null
                val logs = repo.loadLogs()
                val todayStr = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
                val todayLog = logs.find { it.logDate == todayStr } ?: DailyLog(userId = user.uid, logDate = todayStr)
                
                val currentCounts = todayLog.counts.toMutableMap()
                val newVal = (currentCounts[selectedId] ?: 0) + 1
                currentCounts[selectedId] = newVal
                val updated = todayLog.copy(counts = currentCounts)
                
                repo.upsertLog(updated)
                repo.logIncrement(selectedId)
                newVal
            } catch (e: Exception) { null }
        }

        if (updatedCount != null) {
            updateAppWidgetState(context, glanceId) { prefs -> prefs[TabakWidgetKeys.countKey] = updatedCount }
            TabakWidget().update(context, glanceId)
        }
    }
}

class TabakWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TabakWidget()
}
