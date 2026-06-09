package com.tabakpp.app.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.glance.appwidget.updateAll
import com.tabakpp.app.widget.TabakWidget
import com.tabakpp.app.data.*
import com.tabakpp.app.data.local.LogEventEntity
import com.tabakpp.app.data.model.*
import com.tabakpp.app.domain.*
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
    private val settingsRepo: SettingsRepository
) : AndroidViewModel(application) {
    
    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

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

    // --- DERIVED METRICS ---

    val totalDailyCount = combine(todayLog, counterConfigs) { log, configs ->
        SmokingCalculator.getTotalCount(log, configs)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val totalDailyLimit = counterConfigs.map { configs ->
        SmokingCalculator.getTotalLimit(configs)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 1)

    val currentStreak = combine(logs, counterConfigs) { l, c ->
        SmokingCalculator.calculateStreak(l, c)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val totalSavings = combine(logs, counterConfigs, settingsRepo.costPerUnit) { l, configs, cost ->
        SmokingCalculator.calculateSavings(l, configs, cost)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0f)

    val lifeLostMinutes = logs.map { SmokingCalculator.calculateLifeLostMinutes(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    @Suppress("OPT_IN_USAGE")
    val recoveryMilestones = authState.flatMapLatest { state ->
        if (state is AuthState.Authenticated) {
            repository.getAllEvents(state.userId).map { events ->
                val lastValidEvent = events.filter { it.timestamp > 0 }.maxByOrNull { it.timestamp }
                SmokingCalculator.calculateRecoveryMilestones(lastValidEvent?.timestamp)
            }
        } else flowOf(emptyList())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val userXP = combine(logs, currentStreak) { l, s -> SmokingCalculator.calculateXP(l, s) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val userRank = userXP.map { SmokingCalculator.getRank(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "Apprentice")

    @Suppress("OPT_IN_USAGE")
    val hourlyHeatmap: StateFlow<Map<Int, Int>> = authState.flatMapLatest { state ->
        if (state is AuthState.Authenticated) {
            repository.getAllEvents(state.userId).map { SmokingCalculator.calculateHourlyHeatmap(it) }
        } else flowOf(emptyMap())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())

    val coachMessage = combine(totalDailyCount, totalDailyLimit, currentStreak) { count, limit, streak ->
        generateCoachMessage(count, limit, streak)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "Welcome back.")

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
            repository.ensureDefaultCounter()
            val isManual = settingsRepo.isManualReset.first()
            val manualDate = settingsRepo.activeLogDate.first()
            if (isManual && manualDate == null) {
                settingsRepo.setActiveLogDate(LocalDate.now().toString())
            }
        }
        checkSession()
        startMidnightResetWorker()
        observeDataForWidget()
    }

    private fun checkSession() {
        val user = repository.getCurrentUser()
        if (user != null) {
            _authState.value = AuthState.Authenticated(user.uid, user.displayName, user.isAnonymous)
            loadData()
        } else {
            _authState.value = AuthState.Unauthenticated
        }
    }

    fun loadData() = viewModelScope.launch {
        if (_isLoading.value) return@launch
        _isLoading.value = true
        try {
            repository.loadAndSyncAll()
        } catch (e: Exception) {
            val errorMsg = e.localizedMessage ?: "Sync Error"
            _message.value = UiMessage.Error(if (errorMsg.contains("787")) "Database conflict. Retrying..." else errorMsg)
        } finally {
            _isLoading.value = false
        }
    }

    // --- ACTIONS ---

    fun increment(counterId: String) = viewModelScope.launch {
        val user = repository.getCurrentUser() ?: return@launch
        repository.logIncrement(user.uid, todayString, counterId)
    }
    fun decrement(counterId: String) = viewModelScope.launch {
        val user = repository.getCurrentUser() ?: return@launch
        repository.logDecrement(user.uid, todayString, counterId)
    }

    fun addCounter(name: String, limit: Int, type: CounterType, price: Float = 0f, exclude: Boolean = false) = viewModelScope.launch {
        val newConfig = CounterConfig(id = UUID.randomUUID().toString(), name = name, limit = limit, type = type, pricePerUnit = price, excludeFromEconomics = exclude)
        repository.saveCounterConfigs(counterConfigs.value + newConfig)
    }

    fun updateCounterConfig(id: String, newName: String, newLimit: Int, newPrice: Float = 0f, newExclude: Boolean = false) = viewModelScope.launch {
        val updated = counterConfigs.value.map { if (it.id == id) it.copy(name = newName, limit = newLimit, pricePerUnit = newPrice, excludeFromEconomics = newExclude) else it }
        repository.saveCounterConfigs(updated)
        if (id == "cigarettes") repository.saveDailyLimit(newLimit)
    }

    fun removeCounter(id: String) = viewModelScope.launch {
        if (id == "cigarettes") return@launch
        repository.removeCounter(id)
    }

    fun editLog(date: String, counterId: String, count: Int) = viewModelScope.launch {
        val user = repository.getCurrentUser() ?: return@launch
        repository.overwriteCounterLogs(user.uid, date, counterId, count)
    }

    fun deleteCounterFromLog(date: String, counterId: String) = editLog(date, counterId, 0)

    fun toggleDarkMode(enabled: Boolean) = viewModelScope.launch { settingsRepo.setDarkMode(enabled) }
    fun updateFontSize(m: Float) = viewModelScope.launch { settingsRepo.setFontScale(m) }
    fun setWidgetCounter(id: String) = viewModelScope.launch { settingsRepo.setWidgetCounterId(id) }
    fun setDashboardLayout(layout: DashboardLayout) = viewModelScope.launch { settingsRepo.setDashboardLayout(layout) }
    fun setCostPerUnit(cost: Float) = viewModelScope.launch { settingsRepo.setCostPerUnit(cost) }
    fun setManualReset(enabled: Boolean) = viewModelScope.launch { 
        settingsRepo.setManualReset(enabled)
        settingsRepo.setActiveLogDate(LocalDate.now().toString())
    }
    fun startNewDay() = viewModelScope.launch {
        val today = LocalDate.now().toString()
        settingsRepo.setActiveLogDate(today)
        _systemDate.value = today
        loadData()
    }

    fun resetTodayCounts() = viewModelScope.launch {
        val user = repository.getCurrentUser() ?: return@launch
        repository.resetDayLog(user.uid, todayString)
    }
    fun setAccentColor(colorHex: String?) = viewModelScope.launch { settingsRepo.setAccentColor(colorHex) }
    fun setUserGoal(goal: String) = viewModelScope.launch { settingsRepo.setUserGoal(goal) }
    fun setProfileImage(uri: String?) = viewModelScope.launch { settingsRepo.setProfileImageUri(uri) }

    fun reorderCounters(configs: List<CounterConfig>) = viewModelScope.launch {
        val updated = configs.mapIndexed { index, config -> config.copy(displayOrder = index) }
        repository.saveCounterConfigs(updated)
    }

    fun signIn(e: String, p: String) = viewModelScope.launch { 
        _isLoading.value = true
        try { 
            repository.signIn(e, p)
            checkSession()
        } catch (ex: Exception) { _message.value = UiMessage.Error(ex.message ?: "Login failed") }
        finally { _isLoading.value = false }
    }

    fun signInWithGoogle(idToken: String) = viewModelScope.launch {
        _isLoading.value = true
        try {
            repository.signInWithGoogle(idToken)
            checkSession()
        } catch (_: Exception) { _message.value = UiMessage.Error("Google Login failed") }
        finally { _isLoading.value = false }
    }

    fun continueAsGuest() = viewModelScope.launch {
        _isLoading.value = true
        try {
            repository.signInAnonymously()
            checkSession()
        } catch (ex: Exception) { _message.value = UiMessage.Error("Guest login failed") }
        finally { _isLoading.value = false }
    }

    fun signUp(e: String, p: String, n: String) = viewModelScope.launch {
        _isLoading.value = true
        try {
            repository.signUp(email = e, password = p, name = n)
            _message.value = UiMessage.Success("Account created!")
        } catch (ex: Exception) { _message.value = UiMessage.Error(ex.message ?: "Signup failed") }
        finally { _isLoading.value = false }
    }
    
    fun signOut() = viewModelScope.launch {
        repository.signOut()
        _authState.value = AuthState.Unauthenticated
    }
    
    fun deleteAccount() = viewModelScope.launch {
        try { 
            repository.deleteAccount()
            _authState.value = AuthState.Unauthenticated
        } catch (ex: Exception) { _message.value = UiMessage.Error("Delete failed") }
    }
    
    fun updateDisplayName(n: String) = viewModelScope.launch {
        try { 
            repository.updateDisplayName(n)
            checkSession()
        } catch (ex: Exception) { _message.value = UiMessage.Error("Update failed") }
    }

    fun updatePassword(p: String) = viewModelScope.launch { repository.updatePassword(p) }
    fun resetPassword(e: String) = viewModelScope.launch { repository.resetPassword(e) }
    fun clearMessage() { _message.value = UiMessage.None }

    private fun generateCoachMessage(count: Int, limit: Int, streak: Int): String {
        val progress = if (limit > 0) count.toFloat() / limit else 0f
        return when {
            count == 0 && streak > 0 -> "Perfect start! You're on a $streak-day streak."
            progress > 1.0f -> "You've hit your limit for today. Time for a breather."
            progress > 0.8f -> "Nearing your limit. You've come so far, keep going."
            else -> "Tracking is the first step to progress."
        }
    }

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
