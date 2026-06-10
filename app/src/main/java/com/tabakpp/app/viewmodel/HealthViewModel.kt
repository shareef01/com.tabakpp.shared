package com.tabakpp.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tabakpp.app.domain.SmokingCalculator
import com.tabakpp.app.domain.usecase.TrackingUseCases
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class HealthViewModel @Inject constructor(
    private val trackingUseCases: TrackingUseCases,
    private val authUseCases: com.tabakpp.app.domain.usecase.AuthUseCases
) : ViewModel() {

    private val userId = authUseCases.getCurrentUser()?.uid ?: ""

    val lastEntryTimestamp: StateFlow<Long?> = flow {
        emitAll(trackingUseCases.getEvents(userId).map { events ->
            events.filter { it.timestamp > 0 }.maxByOrNull { it.timestamp }?.timestamp
        })
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val recoveryMilestones = lastEntryTimestamp.map { timestamp ->
        SmokingCalculator.calculateRecoveryMilestones(timestamp)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
}
