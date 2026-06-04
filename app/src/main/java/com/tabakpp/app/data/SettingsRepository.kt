package com.tabakpp.app.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "settings")

enum class DashboardLayout { LARGE, COMPACT }

class SettingsRepository(private val context: Context) {
    companion object {
        val IS_DARK_MODE = booleanPreferencesKey("is_dark_mode")
        val FONT_SCALE = floatPreferencesKey("font_scale")
        val WIDGET_COUNTER_ID = stringPreferencesKey("widget_counter_id")
        val DASHBOARD_LAYOUT = stringPreferencesKey("dashboard_layout")
        val HAS_LAUNCHED_BEFORE = booleanPreferencesKey("has_launched_before")
    }

    val isDarkMode: Flow<Boolean> = context.dataStore.data.map { it[IS_DARK_MODE] ?: true }
    val fontScale: Flow<Float> = context.dataStore.data.map { it[FONT_SCALE] ?: 1f }
    val widgetCounterId: Flow<String> = context.dataStore.data.map { it[WIDGET_COUNTER_ID] ?: "cigarettes" }
    val dashboardLayout: Flow<DashboardLayout> = context.dataStore.data.map { 
        DashboardLayout.valueOf(it[DASHBOARD_LAYOUT] ?: DashboardLayout.LARGE.name) 
    }
    val hasLaunchedBefore: Flow<Boolean> = context.dataStore.data.map { it[HAS_LAUNCHED_BEFORE] ?: false }

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
}
