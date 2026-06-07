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
    }

    val isDarkMode: Flow<Boolean> = context.dataStore.data.map { it[IS_DARK_MODE] ?: true }
    val fontScale: Flow<Float> = context.dataStore.data.map { it[FONT_SCALE] ?: 1f }
    val widgetCounterId: Flow<String> = context.dataStore.data.map { it[WIDGET_COUNTER_ID] ?: "cigarettes" }
    val dashboardLayout: Flow<DashboardLayout> = context.dataStore.data.map { 
        DashboardLayout.valueOf(it[DASHBOARD_LAYOUT] ?: DashboardLayout.LARGE.name) 
    }
    val hasLaunchedBefore: Flow<Boolean> = context.dataStore.data.map { it[HAS_LAUNCHED_BEFORE] ?: false }
    val costPerUnit: Flow<Float> = context.dataStore.data.map { it[COST_PER_UNIT] ?: 0f }

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
}
