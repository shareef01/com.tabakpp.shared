package com.tabakpp.app.domain.usecase

import com.tabakpp.app.data.DashboardLayout
import com.tabakpp.app.data.SettingsRepository
import javax.inject.Inject

class SettingsUseCases @Inject constructor(
    private val settingsRepo: SettingsRepository
) {
    suspend fun setDarkMode(enabled: Boolean) = settingsRepo.setDarkMode(enabled)
    suspend fun setFontScale(scale: Float) = settingsRepo.setFontScale(scale)
    suspend fun setWidgetCounter(id: String) = settingsRepo.setWidgetCounterId(id)
    suspend fun setDashboardLayout(layout: DashboardLayout) = settingsRepo.setDashboardLayout(layout)
    suspend fun setCostPerUnit(cost: Float) = settingsRepo.setCostPerUnit(cost)
    suspend fun setManualReset(enabled: Boolean) = settingsRepo.setManualReset(enabled)
    suspend fun setActiveLogDate(date: String) = settingsRepo.setActiveLogDate(date)
    suspend fun setAccentColor(color: String?) = settingsRepo.setAccentColor(color)
    suspend fun setUserGoal(goal: String) = settingsRepo.setUserGoal(goal)
    suspend fun setProfileImage(uri: String?) = settingsRepo.setProfileImageUri(uri)
}
