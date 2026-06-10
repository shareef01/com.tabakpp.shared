package com.tabakpp.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tabakpp.app.data.DashboardLayout
import com.tabakpp.app.data.SettingsRepository
import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.CounterType
import com.tabakpp.app.domain.usecase.AuthUseCases
import com.tabakpp.app.domain.usecase.SettingsUseCases
import com.tabakpp.app.domain.usecase.TrackingUseCases
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settingsUseCases: SettingsUseCases,
    private val trackingUseCases: TrackingUseCases,
    private val authUseCases: AuthUseCases,
    private val settingsRepo: SettingsRepository
) : ViewModel() {

    private val userId = authUseCases.getCurrentUser()?.uid ?: ""

    private val _message = MutableStateFlow<UiMessage>(UiMessage.None)
    val message: StateFlow<UiMessage> = _message.asStateFlow()

    val isDarkMode = settingsRepo.isDarkMode.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)
    val fontScale = settingsRepo.fontScale.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 1f)
    val widgetCounterId = settingsRepo.widgetCounterId.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "cigarettes")
    val dashboardLayout = settingsRepo.dashboardLayout.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DashboardLayout.LARGE)
    val costPerUnit = settingsRepo.costPerUnit.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0f)
    val accentColor = settingsRepo.accentColor.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)
    val userGoal = settingsRepo.userGoal.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "")
    val profileImageUri = settingsRepo.profileImageUri.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)
    val isManualReset = settingsRepo.isManualReset.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val counterConfigs: StateFlow<List<CounterConfig>> = trackingUseCases.counterConfigs
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun toggleDarkMode(enabled: Boolean) = viewModelScope.launch { settingsUseCases.setDarkMode(enabled) }
    fun updateFontSize(m: Float) = viewModelScope.launch { settingsUseCases.setFontScale(m) }
    fun setWidgetCounter(id: String) = viewModelScope.launch { settingsUseCases.setWidgetCounter(id) }
    fun setDashboardLayout(layout: DashboardLayout) = viewModelScope.launch { settingsUseCases.setDashboardLayout(layout) }
    fun setCostPerUnit(cost: Float) = viewModelScope.launch { settingsUseCases.setCostPerUnit(cost) }
    fun setManualReset(enabled: Boolean) = viewModelScope.launch { 
        settingsUseCases.setManualReset(enabled)
        settingsUseCases.setActiveLogDate(java.time.LocalDate.now().toString())
    }
    fun setAccentColor(colorHex: String?) = viewModelScope.launch { settingsUseCases.setAccentColor(colorHex) }
    fun setUserGoal(goal: String) = viewModelScope.launch { settingsUseCases.setUserGoal(goal) }
    fun setProfileImage(uri: String?) = viewModelScope.launch { settingsUseCases.setProfileImage(uri) }

    fun addCounter(name: String, limit: Int, type: CounterType, price: Float, exclude: Boolean) = 
        viewModelScope.launch { trackingUseCases.addCounter(name, limit, type, price, exclude) }

    fun updateCounterConfig(id: String, name: String, limit: Int, price: Float, exclude: Boolean) = 
        viewModelScope.launch { trackingUseCases.updateCounterConfig(id, name, limit, price, exclude) }

    fun removeCounter(id: String) = viewModelScope.launch { trackingUseCases.removeCounter(id) }
    fun reorderCounters(configs: List<CounterConfig>) = viewModelScope.launch { trackingUseCases.reorderCounters(configs) }

    fun updateDisplayName(n: String) = viewModelScope.launch { authUseCases.updateDisplayName(n) }
    fun signOut() = authUseCases.signOut()
    fun deleteAccount() = viewModelScope.launch { authUseCases.deleteAccount() }
}
