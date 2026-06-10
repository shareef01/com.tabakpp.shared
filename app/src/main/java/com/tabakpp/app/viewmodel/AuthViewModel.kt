package com.tabakpp.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tabakpp.app.domain.usecase.AuthUseCases
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authUseCases: AuthUseCases
) : ViewModel() {

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _message = MutableStateFlow<UiMessage>(UiMessage.None)
    val message: StateFlow<UiMessage> = _message.asStateFlow()

    fun signIn(e: String, p: String, onAuthenticated: () -> Unit) = viewModelScope.launch {
        _isLoading.value = true
        try {
            authUseCases.signIn(e, p)
            onAuthenticated()
        } catch (ex: Exception) {
            _message.value = UiMessage.Error(ex.message ?: "Login failed")
        } finally {
            _isLoading.value = false
        }
    }

    fun signInWithGoogle(idToken: String, onAuthenticated: () -> Unit) = viewModelScope.launch {
        _isLoading.value = true
        try {
            authUseCases.signInWithGoogle(idToken)
            onAuthenticated()
        } catch (_: Exception) {
            _message.value = UiMessage.Error("Google Login failed")
        } finally {
            _isLoading.value = false
        }
    }

    fun continueAsGuest(onAuthenticated: () -> Unit) = viewModelScope.launch {
        _isLoading.value = true
        try {
            authUseCases.signInAnonymously()
            onAuthenticated()
        } catch (ex: Exception) {
            _message.value = UiMessage.Error("Guest login failed")
        } finally {
            _isLoading.value = false
        }
    }

    fun signUp(e: String, p: String, n: String) = viewModelScope.launch {
        _isLoading.value = true
        try {
            authUseCases.signUp(e, p, n)
            _message.value = UiMessage.Success("Account created!")
        } catch (ex: Exception) {
            _message.value = UiMessage.Error(ex.message ?: "Signup failed")
        } finally {
            _isLoading.value = false
        }
    }

    fun resetPassword(e: String) = viewModelScope.launch {
        try {
            authUseCases.resetPassword(e)
            _message.value = UiMessage.Success("Recovery email sent!")
        } catch (ex: Exception) {
            _message.value = UiMessage.Error(ex.message ?: "Failed to send recovery email")
        }
    }

    fun clearMessage() { _message.value = UiMessage.None }
}
