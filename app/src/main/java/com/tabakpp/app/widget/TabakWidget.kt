package com.tabakpp.app.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
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
import com.tabakpp.app.domain.SmokingCalculator
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
    val streakKey = intPreferencesKey("streak")
    val nameKey = stringPreferencesKey("counter_name")
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
        val configs = try { repo.getCounterConfigsOnce() } catch (e: Exception) { emptyList() }
        val activeConfig = configs.find { it.id == selectedId } ?: configs.firstOrNull() ?: CounterConfig("cigarettes", "Cigarettes")

        val user = repo.getCurrentUser()
        val logs = if (user != null) {
            try { repo.getLogsOnce(user.uid) } catch (e: Exception) { emptyList() }
        } else emptyList()

        val isManual = try { settingsRepo.isManualReset.first() } catch (e: Exception) { false }
        val activeDate = if (isManual) {
            try { settingsRepo.activeLogDate.first() ?: LocalDate.now().toString() } catch (e: Exception) { LocalDate.now().toString() }
        } else {
            LocalDate.now().toString()
        }
        val todayLog = logs.find { it.logDate == activeDate }
        val count = todayLog?.counts?.get(activeConfig.id) ?: 0
        
        val streak = SmokingCalculator.calculateStreak(logs, configs)
        val isDark = try { settingsRepo.isDarkMode.first() } catch (e: Exception) { true }

        updateAppWidgetState(context, id) { prefs ->
            prefs[TabakWidgetKeys.countKey] = count
            prefs[TabakWidgetKeys.limitKey] = activeConfig.limit
            prefs[TabakWidgetKeys.streakKey] = streak
            prefs[TabakWidgetKeys.nameKey] = activeConfig.displayName
        }

        provideContent {
            val prefs = currentState<androidx.datastore.preferences.core.Preferences>()
            val c = prefs[TabakWidgetKeys.countKey] ?: count
            val l = prefs[TabakWidgetKeys.limitKey] ?: activeConfig.limit
            val s = prefs[TabakWidgetKeys.streakKey] ?: streak
            val n = prefs[TabakWidgetKeys.nameKey] ?: activeConfig.displayName
            
            WidgetContent(c, l, s, n, isDark)
        }
    }

    @Composable
    private fun WidgetContent(count: Int, limit: Int, streak: Int, name: String, isDark: Boolean) {
        val accentColor = if (isDark) Color(0xFFD4FF5C) else Color(0xFF2563EB)
        val bgBase = if (isDark) Color(0xFF020202) else Color(0xFFF5F5F7)
        val textMain = if (isDark) Color.White else Color(0xFF1A1A1C)
        val textMuted = if (isDark) Color(0xFF888880) else Color(0xFF6B6B6B)
        val dangerColor = if (isDark) Color(0xFFF87171) else Color(0xFFD32F2F)

        Box(modifier = GlanceModifier.fillMaxSize().background(bgBase).clickable(actionStartActivity<MainActivity>()), contentAlignment = Alignment.Center) {
            Row(modifier = GlanceModifier.fillMaxSize().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = GlanceModifier.size(56.dp).background(accentColor.copy(alpha = 0.15f)).cornerRadius(28.dp), contentAlignment = Alignment.Center) {
                    Box(modifier = GlanceModifier.fillMaxSize().clickable(actionRunCallback<IncrementAction>()), contentAlignment = Alignment.Center) {
                         Text(text = "+", style = TextStyle(color = ColorProvider(if (count >= limit) dangerColor else accentColor), fontSize = 32.sp, fontWeight = FontWeight.Bold))
                    }
                }
                Spacer(GlanceModifier.width(12.dp))
                Column(modifier = GlanceModifier.defaultWeight()) {
                    Text(text = name.lowercase(), style = TextStyle(color = ColorProvider(accentColor), fontSize = 11.sp, fontWeight = FontWeight.Bold))
                    Text(text = count.toString(), style = TextStyle(color = ColorProvider(textMain), fontSize = 36.sp, fontWeight = FontWeight.Bold))
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(text = "$streak DAY", style = TextStyle(color = ColorProvider(textMuted), fontSize = 9.sp, fontWeight = FontWeight.Bold))
                    Text(text = "STREAK", style = TextStyle(color = ColorProvider(textMuted), fontSize = 9.sp, fontWeight = FontWeight.Bold))
                    if (streak > 0) Text(text = "🔥", style = TextStyle(fontSize = 16.sp))
                }
            }
        }
    }
}

class IncrementAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        withContext(Dispatchers.IO) {
            try {
                val entryPoint = EntryPointAccessors.fromApplication(context, WidgetEntryPoint::class.java)
                val repo = entryPoint.repository()
                val settingsRepo = entryPoint.settingsRepository()

                val user = repo.getCurrentUser() ?: return@withContext
                val selectedId = settingsRepo.widgetCounterId.first()
                val isManual = settingsRepo.isManualReset.first()
                val activeDate = if (isManual) {
                    settingsRepo.activeLogDate.first() ?: LocalDate.now().toString()
                } else {
                    LocalDate.now().toString()
                }

                repo.logIncrement(user.uid, activeDate, selectedId)
                TabakWidget().update(context, glanceId)
            } catch (e: Exception) {}
        }
    }
}

class TabakWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TabakWidget()
}
