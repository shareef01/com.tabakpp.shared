package com.tabakpp.app.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.glance.appwidget.updateAll
import com.tabakpp.app.widget.TabakWidget
import com.tabakpp.app.data.*
import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.CounterType
import com.tabakpp.app.data.model.DailyLog
import com.tabakpp.app.domain.SmokingCalculator
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
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

    val counterConfigs: StateFlow<List<CounterConfig>> = repository.counterConfigs
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val logs: StateFlow<List<DailyLog>> = authState.flatMapLatest { state ->
        if (state is AuthState.Authenticated) {
            repository.getLogsFlow(state.userId)
        } else {
            flowOf(emptyList())
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val isDarkMode: StateFlow<Boolean> = settingsRepo.isDarkMode
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    val fontSizeMultiplier: StateFlow<Float> = settingsRepo.fontScale
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 1f)

    val widgetCounterId: StateFlow<String> = settingsRepo.widgetCounterId
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "cigarettes")

    val dashboardLayout: StateFlow<DashboardLayout> = settingsRepo.dashboardLayout
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DashboardLayout.LARGE)

    val costPerUnit: StateFlow<Float> = settingsRepo.costPerUnit
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0f)

    val todayString: String get() = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)

    val todayLog: StateFlow<DailyLog?> = logs.map { list ->
        list.find { it.logDate == todayString }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val totalDailyCount = combine(todayLog, counterConfigs) { log, configs ->
        SmokingCalculator.getTotalCount(log, configs)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val totalDailyLimit = counterConfigs.map { configs ->
        SmokingCalculator.getTotalLimit(configs)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 1)

    init {
        viewModelScope.launch { repository.ensureDefaultCounter() }
        checkSession()
        startMidnightResetWorker()
    }

    private fun startMidnightResetWorker() = viewModelScope.launch(Dispatchers.Default) {
        while (isActive) {
            val now = LocalDateTime.now()
            val midnight = now.toLocalDate().plusDays(1).atStartOfDay()
            val sleepMillis = Duration.between(now, midnight).toMillis()
            
            if (sleepMillis > 0) {
                delay(sleepMillis + 1000)
                loadData()
            }
        }
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
        repository.getCurrentUser() ?: return@launch
        _isLoading.value = true
        try {
            repository.syncRemoteConfigs()
            // We can also trigger a full logs sync here
            val remoteLogs = repository.loadLogs()
            remoteLogs.forEach { repository.upsertLog(it) }
        } catch (e: Exception) {
            _message.value = UiMessage.Error("Sync error: ${e.localizedMessage}")
        } finally {
            _isLoading.value = false
        }
    }

    fun addCounter(name: String, limit: Int, type: CounterType) = viewModelScope.launch {
        val newConfig = CounterConfig(id = UUID.randomUUID().toString(), name = name, limit = limit, type = type)
        repository.saveCounterConfigs(counterConfigs.value + newConfig)
        TabakWidget().updateAll(getApplication())
    }

    fun updateCounterConfig(id: String, newName: String, newLimit: Int) = viewModelScope.launch {
        val updatedConfigs = counterConfigs.value.map { 
            if (it.id == id) it.copy(name = newName, limit = newLimit) else it 
        }
        repository.saveCounterConfigs(updatedConfigs)
        if (id == "cigarettes") repository.saveDailyLimit(newLimit)
        TabakWidget().updateAll(getApplication())
    }

    fun removeCounter(id: String) = viewModelScope.launch {
        if (id == "cigarettes") return@launch
        val updatedConfigs = counterConfigs.value.filter { it.id != id }
        repository.saveCounterConfigs(updatedConfigs)
        TabakWidget().updateAll(getApplication())
    }

    fun increment(counterId: String) = viewModelScope.launch {
        repository.logIncrement(counterId)
        TabakWidget().updateAll(getApplication())
    }

    fun decrement(counterId: String) = viewModelScope.launch {
        repository.logDecrement(counterId)
        TabakWidget().updateAll(getApplication())
    }

    fun editLog(date: String, counterId: String, count: Int) = viewModelScope.launch {
        val user = repository.getCurrentUser() ?: return@launch
        try {
            // For historical editing, we update Firestore and then we can sync back to Room 
            // or just rely on the next full sync. 
            // For now, let's just update Firestore.
            val logs = repository.loadLogs().toMutableList()
            val index = logs.indexOfFirst { it.logDate == date }
            if (index >= 0) {
                val updatedCounts = logs[index].counts.toMutableMap().apply { this[counterId] = count }
                val updatedLog = logs[index].copy(counts = updatedCounts)
                repository.upsertLog(updatedLog)
                loadData()
            }
        } catch (_: Exception) {}
    }

    fun deleteCounterFromLog(date: String, counterId: String) = editLog(date, counterId, 0)

    fun toggleDarkMode(enabled: Boolean) = viewModelScope.launch { 
        settingsRepo.setDarkMode(enabled)
        TabakWidget().updateAll(getApplication())
    }
    
    fun updateFontSize(m: Float) = viewModelScope.launch { settingsRepo.setFontScale(m) }
    
    fun setWidgetCounter(id: String) = viewModelScope.launch {
        settingsRepo.setWidgetCounterId(id)
        TabakWidget().updateAll(getApplication())
    }

    fun setDashboardLayout(layout: DashboardLayout) = viewModelScope.launch {
        settingsRepo.setDashboardLayout(layout)
    }

    fun markLaunched() = viewModelScope.launch {
        settingsRepo.setLaunchedBefore()
    }

    fun setCostPerUnit(cost: Float) = viewModelScope.launch {
        settingsRepo.setCostPerUnit(cost)
    }

    fun signIn(e: String, p: String) = viewModelScope.launch { 
        _isLoading.value = true
        try { 
            repository.signIn(e, p)
            val user = repository.getCurrentUser()!!
            _authState.value = AuthState.Authenticated(user.uid, user.displayName, user.isAnonymous)
            loadData() 
        }
        catch (ex: Exception) { _message.value = UiMessage.Error(ex.message ?: "Sign in failed") }
        finally { _isLoading.value = false }
    }

    fun signInWithGoogle(idToken: String) = viewModelScope.launch {
        _isLoading.value = true
        try {
            repository.signInWithGoogle(idToken)
            val user = repository.getCurrentUser()!!
            _authState.value = AuthState.Authenticated(user.uid, user.displayName, user.isAnonymous)
            loadData()
        } catch (_: Exception) { 
            _message.value = UiMessage.Error("Google Sign-In failed") 
        } finally { 
            _isLoading.value = false
        }
    }

    fun continueAsGuest() = viewModelScope.launch {
        _isLoading.value = true
        try {
            repository.signInAnonymously()
            val user = repository.getCurrentUser()!!
            _authState.value = AuthState.Authenticated(user.uid, "Guest", true)
            loadData()
        } catch (ex: Exception) {
            _message.value = UiMessage.Error("Guest login failed")
        } finally {
            _isLoading.value = false
        }
    }

    fun signUp(e: String, p: String, n: String) = viewModelScope.launch {
        _isLoading.value = true
        try { repository.signUp(email = e, password = p, name = n); _message.value = UiMessage.Success("Account created! You can now sign in.") }
        catch (ex: Exception) { _message.value = UiMessage.Error(ex.message ?: "Sign up failed") }
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
            TabakWidget().updateAll(getApplication()) 
        }
        catch (ex: Exception) { _message.value = UiMessage.Error("Deletion failed") }
    }
    
    fun clearMessage() { _message.value = UiMessage.None }
    
    fun updateDisplayName(n: String) = viewModelScope.launch {
        try { 
            repository.updateDisplayName(n)
            val user = repository.getCurrentUser()!!
            _authState.value = AuthState.Authenticated(user.uid, n, user.isAnonymous) 
        }
        catch (ex: Exception) { _message.value = UiMessage.Error("Update failed") }
    }

    fun updatePassword(p: String) = viewModelScope.launch { repository.updatePassword(p) }
    fun resetPassword(e: String) = viewModelScope.launch { repository.resetPassword(e) }
}
