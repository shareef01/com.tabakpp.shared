package com.tabakpp.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tabakpp.app.data.SettingsRepository
import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.DailyLog
import com.tabakpp.app.domain.SmokingCalculator
import com.tabakpp.app.domain.usecase.GetLogsUseCase
import com.tabakpp.app.domain.usecase.TrackingUseCases
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val trackingUseCases: TrackingUseCases,
    private val getLogsUseCase: GetLogsUseCase,
    private val settingsRepo: SettingsRepository,
    private val authUseCases: com.tabakpp.app.domain.usecase.AuthUseCases
) : ViewModel() {

    private val userId = authUseCases.getCurrentUser()?.uid ?: ""

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    val counterConfigs: StateFlow<List<CounterConfig>> = trackingUseCases.counterConfigs
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val logs: StateFlow<List<DailyLog>> = getLogsUseCase(userId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val hourlyHeatmap: StateFlow<Map<Int, Int>> = flow {
        emitAll(trackingUseCases.getEvents(userId).map { SmokingCalculator.calculateHourlyHeatmap(it) })
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())

    val insights = combine(logs, counterConfigs, settingsRepo.costPerUnit) { allLogs, configs, cost ->
        val totalSavings = SmokingCalculator.calculateSavings(allLogs, configs, cost)
        val lifeLost = SmokingCalculator.calculateLifeLostMinutes(allLogs)
        val streak = SmokingCalculator.calculateStreak(allLogs, configs)
        HistoryInsights(totalSavings, lifeLost, streak)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), HistoryInsights())

    fun loadData() = viewModelScope.launch {
        _isLoading.value = true
        try { trackingUseCases.syncAll() } finally { _isLoading.value = false }
    }

    fun editLog(date: String, counterId: String, count: Int) = viewModelScope.launch { trackingUseCases.editLog(userId, date, counterId, count) }
    fun deleteCounterFromLog(date: String, counterId: String) = editLog(date, counterId, 0)
}

data class HistoryInsights(
    val totalSavings: Float = 0f,
    val lifeLostMinutes: Int = 0,
    val currentStreak: Int = 0
)
