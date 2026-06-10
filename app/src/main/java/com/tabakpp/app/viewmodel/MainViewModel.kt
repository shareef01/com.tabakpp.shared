package com.tabakpp.app.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.glance.appwidget.updateAll
import com.tabakpp.app.widget.TabakWidget
import com.tabakpp.app.data.*
import com.tabakpp.app.data.local.LogEventEntity
import com.tabakpp.app.data.model.*
import com.tabakpp.app.domain.SmokingCalculator
import com.tabakpp.app.viewmodel.TrackerMetrics
import com.tabakpp.app.domain.usecase.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    application: Application,
    private val repository: Repository,
    private val settingsRepo: SettingsRepository,
    private val authUseCases: AuthUseCases,
    private val trackingUseCases: TrackingUseCases,
    private val getLogsUseCase: GetLogsUseCase
) : AndroidViewModel(application) {
    
    val authState: StateFlow<AuthState> = authUseCases.authState.map { user ->
        if (user != null) AuthState.Authenticated(user.uid, user.displayName, user.isAnonymous)
        else AuthState.Unauthenticated
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AuthState.Loading)

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _message = MutableStateFlow<UiMessage>(UiMessage.None)
    val message: StateFlow<UiMessage> = _message.asStateFlow()

    // --- DATA STREAMS ---

    val counterConfigs: StateFlow<List<CounterConfig>> = repository.counterConfigs
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val logs: StateFlow<List<DailyLog>> = authState.flatMapLatest { state ->
        if (state is AuthState.Authenticated) {
            repository.getLogsFlow(state.userId)
        } else {
            flowOf(emptyList())
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _systemDate = MutableStateFlow(LocalDate.now().toString())

    val isManualReset = settingsRepo.isManualReset.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)
    
    val activeDate = combine(_systemDate, settingsRepo.activeLogDate, isManualReset) { system, manual, isManual ->
        if (isManual) manual ?: system
        else system
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), LocalDate.now().toString())

    val todayString: String get() = activeDate.value

    val todayLog: StateFlow<DailyLog?> = combine(logs, activeDate) { list, date ->
        list.find { it.logDate == date }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val totalDailyCount = combine(todayLog, counterConfigs) { log, configs ->
        SmokingCalculator.getTotalCount(log, configs)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val totalDailyLimit = counterConfigs.map { configs ->
        SmokingCalculator.getTotalLimit(configs)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 1)

    // --- SETTINGS ---

    val isDarkMode = settingsRepo.isDarkMode.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)
    val fontScale = settingsRepo.fontScale.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 1f)
    val widgetCounterId = settingsRepo.widgetCounterId.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "cigarettes")
    val dashboardLayout = settingsRepo.dashboardLayout.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DashboardLayout.LARGE)
    val costPerUnit = settingsRepo.costPerUnit.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0f)
    val accentColor = settingsRepo.accentColor.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)
    val userGoal = settingsRepo.userGoal.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "")
    val profileImageUri = settingsRepo.profileImageUri.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    init {
        viewModelScope.launch { 
            trackingUseCases.ensureDefault()
            val isManual = settingsRepo.isManualReset.first()
            val manualDate = settingsRepo.activeLogDate.first()
            if (isManual && manualDate == null) {
                settingsRepo.setActiveLogDate(LocalDate.now().toString())
            }
        }
        
        authState.onEach { state ->
            if (state is AuthState.Authenticated) loadData()
        }.launchIn(viewModelScope)

        startMidnightResetWorker()
        observeDataForWidget()
    }

    fun checkSession() {
        if (repository.getCurrentUser() != null) loadData()
    }

    fun loadData() = viewModelScope.launch {
        if (_isLoading.value) return@launch
        _isLoading.value = true
        try {
            trackingUseCases.syncAll()
        } catch (e: Exception) {
            val errorMsg = e.localizedMessage ?: "Sync Error"
            _message.value = UiMessage.Error(if (errorMsg.contains("787")) "Database conflict. Retrying..." else errorMsg)
        } finally {
            _isLoading.value = false
        }
    }

    // --- ACTIONS (Shortcut support / Common) ---

    fun increment(counterId: String) = viewModelScope.launch {
        val uid = authUseCases.getCurrentUser()?.uid ?: return@launch
        trackingUseCases.increment(uid, todayString, counterId)
    }
    
    fun signOut() = viewModelScope.launch {
        authUseCases.signOut()
    }
    
    fun deleteAccount() = viewModelScope.launch {
        try { 
            authUseCases.deleteAccount()
        } catch (_: Exception) { _message.value = UiMessage.Error("Delete failed") }
    }

    fun clearMessage() { _message.value = UiMessage.None }

    private fun observeDataForWidget() {
        combine(totalDailyCount, totalDailyLimit) { _, _ -> }.debounce(1000).onEach {
            TabakWidget().updateAll(getApplication())
        }.launchIn(viewModelScope)
    }

    private fun startMidnightResetWorker() = viewModelScope.launch(Dispatchers.Default) {
        while (isActive) {
            val now = LocalDateTime.now()
            val midnight = now.toLocalDate().plusDays(1).atStartOfDay()
            val sleepMillis = Duration.between(now, midnight).toMillis()
            if (sleepMillis > 0) {
                delay(sleepMillis + 1000)
                _systemDate.value = LocalDate.now().toString()
                loadData()
            }
        }
    }
}
