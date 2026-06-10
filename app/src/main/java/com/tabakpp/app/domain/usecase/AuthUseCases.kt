package com.tabakpp.app.domain.usecase

import com.tabakpp.app.data.Repository
import javax.inject.Inject

class AuthUseCases @Inject constructor(
    private val repository: Repository,
    private val authRepo: com.tabakpp.app.data.AuthRepository
) {
    val authState = authRepo.authState
    fun getCurrentUser() = repository.getCurrentUser()
    suspend fun signIn(e: String, p: String) = repository.signIn(e, p)
    suspend fun signInWithGoogle(token: String) = repository.signInWithGoogle(token)
    suspend fun signInAnonymously() = repository.signInAnonymously()
    suspend fun signUp(e: String, p: String, n: String) = repository.signUp(e, p, n)
    fun signOut() = repository.signOut()
    suspend fun deleteAccount() = repository.deleteAccount()
    suspend fun updateDisplayName(n: String) = repository.updateDisplayName(n)
    suspend fun updatePassword(p: String) = repository.updatePassword(p)
    suspend fun resetPassword(e: String) = repository.resetPassword(e)
}
