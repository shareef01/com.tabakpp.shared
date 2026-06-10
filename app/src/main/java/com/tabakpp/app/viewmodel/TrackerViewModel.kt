package com.tabakpp.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tabakpp.app.data.DashboardLayout
import com.tabakpp.app.data.SettingsRepository
import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.DailyLog
import com.tabakpp.app.domain.SmokingCalculator
import com.tabakpp.app.domain.usecase.GetLogsUseCase
import com.tabakpp.app.domain.usecase.TrackingUseCases
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

@HiltViewModel
class TrackerViewModel @Inject constructor(
    private val trackingUseCases: TrackingUseCases,
    private val getLogsUseCase: GetLogsUseCase,
    private val settingsRepo: SettingsRepository,
    private val authUseCases: com.tabakpp.app.domain.usecase.AuthUseCases
) : ViewModel() {

    private val userId = authUseCases.getCurrentUser()?.uid ?: ""

    val counterConfigs: StateFlow<List<CounterConfig>> = trackingUseCases.counterConfigs
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val logs: StateFlow<List<DailyLog>> = getLogsUseCase(userId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _systemDate = MutableStateFlow(LocalDate.now().toString())
    val isManualReset = settingsRepo.isManualReset.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)
    
    val activeDate = combine(_systemDate, settingsRepo.activeLogDate, isManualReset) { system, manual, isManual ->
        if (isManual) manual ?: system else system
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), LocalDate.now().toString())

    val todayLog = combine(logs, activeDate) { list, date ->
        list.find { it.logDate == date }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val dashboardLayout = settingsRepo.dashboardLayout.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DashboardLayout.LARGE)
    val userGoal = settingsRepo.userGoal.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "")
    val profileImageUri = settingsRepo.profileImageUri.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val metrics = combine(todayLog, counterConfigs, logs) { log, configs, allLogs ->
        val count = SmokingCalculator.getTotalCount(log, configs)
        val limit = SmokingCalculator.getTotalLimit(configs)
        val streak = SmokingCalculator.calculateStreak(allLogs, configs)
        val xp = SmokingCalculator.calculateXP(allLogs, streak)
        TrackerMetrics(count, limit, streak, xp, SmokingCalculator.getRank(xp), generateCoachMessage(count, limit, streak))
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), TrackerMetrics())

    fun increment(counterId: String) = viewModelScope.launch { trackingUseCases.increment(userId, activeDate.value, counterId) }
    fun decrement(counterId: String) = viewModelScope.launch { trackingUseCases.decrement(userId, activeDate.value, counterId) }
    fun updateCounterConfig(id: String, name: String, limit: Int) = viewModelScope.launch { trackingUseCases.updateCounterConfig(id, name, limit, 0f, false) }
    fun resetTodayCounts() = viewModelScope.launch { trackingUseCases.resetDay(userId, activeDate.value) }
    fun startNewDay() = viewModelScope.launch {
        val today = LocalDate.now().toString()
        settingsRepo.setActiveLogDate(today)
        _systemDate.value = today
    }

    private fun generateCoachMessage(count: Int, limit: Int, streak: Int): String {
        val progress = if (limit > 0) count.toFloat() / limit else 0f
        return when {
            count == 0 && streak > 0 -> "Perfect start! You're on a $streak-day streak."
            progress > 1.0f -> "You've hit your limit for today. Time for a breather."
            progress > 0.8f -> "Nearing your limit. You've come so far, keep going."
            else -> "Tracking is the first step to progress."
        }
    }
}

data class TrackerMetrics(
    val totalCount: Int = 0,
    val totalLimit: Int = 1,
    val streak: Int = 0,
    val xp: Int = 0,
    val rank: String = "Apprentice",
    val coachMessage: String = "Welcome back."
)
