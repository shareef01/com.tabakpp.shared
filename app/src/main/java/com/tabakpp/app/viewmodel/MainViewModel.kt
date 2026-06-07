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

    private val _logs = MutableStateFlow<List<DailyLog>>(emptyList())
    val logs: StateFlow<List<DailyLog>> = _logs.asStateFlow()

    private val _counterConfigs = MutableStateFlow<List<CounterConfig>>(emptyList())
    val counterConfigs: StateFlow<List<CounterConfig>> = _counterConfigs.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _message = MutableStateFlow<UiMessage>(UiMessage.None)
    val message: StateFlow<UiMessage> = _message.asStateFlow()

    val isDarkMode: StateFlow<Boolean> = settingsRepo.isDarkMode
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    val fontSizeMultiplier: StateFlow<Float> = settingsRepo.fontScale
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 1f)

    val widgetCounterId: StateFlow<String> = settingsRepo.widgetCounterId
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "cigarettes")

    val dashboardLayout: StateFlow<DashboardLayout> = settingsRepo.dashboardLayout
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DashboardLayout.LARGE)

    val hasLaunchedBefore: StateFlow<Boolean> = settingsRepo.hasLaunchedBefore
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    val costPerUnit: StateFlow<Float> = settingsRepo.costPerUnit
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0f)

    val todayString: String get() = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)

    val todayLog: StateFlow<DailyLog?> = _logs.map { list ->
        list.find { it.logDate == todayString }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    init {
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
        val user = repository.getCurrentUser() ?: return@launch
        try {
            _counterConfigs.value = repository.getCounterConfigs()
            val data = repository.loadLogs().toMutableList()
            if (data.none { it.logDate == todayString }) {
                val today = DailyLog(userId = user.uid, logDate = todayString)
                data.add(0, today)
                repository.upsertLog(today)
            }
            _logs.value = data
        } catch (_: Exception) {
            _message.value = UiMessage.Error("Sync error")
        }
    }

    fun addCounter(name: String, limit: Int, type: CounterType) = viewModelScope.launch {
        val newConfig = CounterConfig(id = UUID.randomUUID().toString(), name = name, limit = limit, type = type)
        _counterConfigs.update { it + newConfig }
        repository.saveCounterConfigs(_counterConfigs.value)
        TabakWidget().updateAll(getApplication())
    }

    fun updateCounterConfig(id: String, newName: String, newLimit: Int) = viewModelScope.launch {
        _counterConfigs.update { configs ->
            configs.map { if (it.id == id) it.copy(name = newName, limit = newLimit) else it }
        }
        repository.saveCounterConfigs(_counterConfigs.value)
        if (id == "cigarettes") repository.saveDailyLimit(newLimit)
        TabakWidget().updateAll(getApplication())
    }

    fun removeCounter(id: String) = viewModelScope.launch {
        if (id == "cigarettes") return@launch
        _counterConfigs.update { configs -> configs.filter { it.id != id } }
        repository.saveCounterConfigs(_counterConfigs.value)
        
        _logs.update { logs ->
            logs.map { log ->
                if (log.counts.containsKey(id)) {
                    val newCounts = log.counts.toMutableMap().apply { remove(id) }
                    val updatedLog = log.copy(counts = newCounts)
                    viewModelScope.launch { repository.upsertLog(updatedLog) }
                    updatedLog
                } else log
            }
        }
        TabakWidget().updateAll(getApplication())
    }

    fun increment(counterId: String) = changeToday(counterId, 1)
    fun decrement(counterId: String) = changeToday(counterId, -1)

    private fun changeToday(counterId: String, delta: Int) {
        _logs.update { list ->
            val mutableList = list.toMutableList()
            val i = mutableList.indexOfFirst { it.logDate == todayString }
            if (i >= 0) {
                val currentCounts = mutableList[i].counts.toMutableMap()
                val currentVal = currentCounts[counterId] ?: 0
                val newVal = (currentVal + delta).coerceAtLeast(0)
                
                if (newVal != currentVal) {
                    currentCounts[counterId] = newVal
                    val updated = mutableList[i].copy(counts = currentCounts)
                    mutableList[i] = updated
                    
                    viewModelScope.launch {
                        try {
                            repository.upsertLog(updated)
                            repository.logIncrement(counterId) // New: Log timestamped event
                            TabakWidget().updateAll(getApplication())
                        } catch (_: Exception) {
                            _message.value = UiMessage.Error("Sync failed")
                        }
                    }
                }
            }
            mutableList
        }
    }

    fun editLog(date: String, counterId: String, count: Int) {
        _logs.update { list ->
            val mutableList = list.toMutableList()
            val i = mutableList.indexOfFirst { it.logDate == date }
            if (i >= 0) {
                val currentCounts = mutableList[i].counts.toMutableMap()
                currentCounts[counterId] = count.coerceAtLeast(0)
                val updated = mutableList[i].copy(counts = currentCounts)
                mutableList[i] = updated
                viewModelScope.launch {
                    try { repository.upsertLog(updated); TabakWidget().updateAll(getApplication()) }
                    catch (_: Exception) {}
                }
            }
            mutableList
        }
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
        _logs.value = emptyList() 
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

    fun getYesterdayCount(): Int = SmokingCalculator.getYesterdayCount(_logs.value)
    
    fun getWeekAvg(): Float = SmokingCalculator.getWeekAverage(_logs.value)
    
    fun getWeekTotal(): Int = SmokingCalculator.getWeekTotal(_logs.value)
}
