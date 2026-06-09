package com.tabakpp.app.data

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore(name = "settings")

enum class DashboardLayout { LARGE, COMPACT }

@Singleton
class SettingsRepository @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private val IS_DARK_MODE = booleanPreferencesKey("is_dark_mode")
        private val FONT_SCALE = floatPreferencesKey("font_scale")
        private val WIDGET_COUNTER_ID = stringPreferencesKey("widget_counter_id")
        private val DASHBOARD_LAYOUT = stringPreferencesKey("dashboard_layout")
        private val HAS_LAUNCHED_BEFORE = booleanPreferencesKey("has_launched_before")
        private val COST_PER_UNIT = floatPreferencesKey("cost_per_unit")
        private val ACCENT_COLOR = stringPreferencesKey("accent_color")
        private val USER_GOAL = stringPreferencesKey("user_goal")
        private val IS_MANUAL_RESET = booleanPreferencesKey("is_manual_reset")
        private val ACTIVE_LOG_DATE = stringPreferencesKey("active_log_date")
        private val PROFILE_IMAGE_URI = stringPreferencesKey("profile_image_uri")
    }

    val isDarkMode: Flow<Boolean> = context.dataStore.data.map { it[IS_DARK_MODE] ?: true }
    val fontScale: Flow<Float> = context.dataStore.data.map { it[FONT_SCALE] ?: 1f }
    val widgetCounterId: Flow<String> = context.dataStore.data.map { it[WIDGET_COUNTER_ID] ?: "cigarettes" }
    val dashboardLayout: Flow<DashboardLayout> = context.dataStore.data.map { 
        DashboardLayout.valueOf(it[DASHBOARD_LAYOUT] ?: DashboardLayout.LARGE.name) 
    }
    val hasLaunchedBefore: Flow<Boolean> = context.dataStore.data.map { it[HAS_LAUNCHED_BEFORE] ?: false }
    val costPerUnit: Flow<Float> = context.dataStore.data.map { it[COST_PER_UNIT] ?: 0f }
    val accentColor: Flow<String?> = context.dataStore.data.map { it[ACCENT_COLOR] }
    val userGoal: Flow<String> = context.dataStore.data.map { it[USER_GOAL] ?: "" }
    val isManualReset: Flow<Boolean> = context.dataStore.data.map { it[IS_MANUAL_RESET] ?: false }
    val activeLogDate: Flow<String?> = context.dataStore.data.map { it[ACTIVE_LOG_DATE] }
    val profileImageUri: Flow<String?> = context.dataStore.data.map { it[PROFILE_IMAGE_URI] }

    suspend fun setDarkMode(enabled: Boolean) {
        context.dataStore.edit { it[IS_DARK_MODE] = enabled }
    }

    suspend fun setFontScale(scale: Float) {
        context.dataStore.edit { it[FONT_SCALE] = scale }
    }

    suspend fun setWidgetCounterId(id: String) {
        context.dataStore.edit { it[WIDGET_COUNTER_ID] = id }
    }

    suspend fun setDashboardLayout(layout: DashboardLayout) {
        context.dataStore.edit { it[DASHBOARD_LAYOUT] = layout.name }
    }

    suspend fun setLaunchedBefore() {
        context.dataStore.edit { it[HAS_LAUNCHED_BEFORE] = true }
    }

    suspend fun setCostPerUnit(cost: Float) {
        context.dataStore.edit { it[COST_PER_UNIT] = cost }
    }

    suspend fun setAccentColor(colorHex: String?) {
        context.dataStore.edit { 
            if (colorHex == null) it.remove(ACCENT_COLOR) else it[ACCENT_COLOR] = colorHex 
        }
    }

    suspend fun setUserGoal(goal: String) {
        context.dataStore.edit { it[USER_GOAL] = goal }
    }

    suspend fun setManualReset(enabled: Boolean) {
        context.dataStore.edit { it[IS_MANUAL_RESET] = enabled }
    }

    suspend fun setActiveLogDate(date: String) {
        context.dataStore.edit { it[ACTIVE_LOG_DATE] = date }
    }

    suspend fun setProfileImageUri(uri: String?) {
        context.dataStore.edit { 
            if (uri == null) it.remove(PROFILE_IMAGE_URI) else it[PROFILE_IMAGE_URI] = uri 
        }
    }
}
