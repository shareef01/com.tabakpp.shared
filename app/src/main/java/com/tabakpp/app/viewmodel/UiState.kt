package com.tabakpp.app.viewmodel

sealed class AuthState {
    object Loading : AuthState()
    object Unauthenticated : AuthState()
    data class Authenticated(val userId: String, val displayName: String?, val isGuest: Boolean = false) : AuthState()
}

sealed class UiMessage {
    data class Error(val msg: String) : UiMessage()
    data class Success(val msg: String) : UiMessage()
    object None : UiMessage()
}
