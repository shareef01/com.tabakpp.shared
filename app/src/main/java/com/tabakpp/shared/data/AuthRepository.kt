package com.tabakpp.shared.data

import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.auth.auth
import dev.gitlive.firebase.auth.FirebaseUser

class AuthRepository {
    private val auth = Firebase.auth

    fun getCurrentUser(): FirebaseUser? = auth.currentUser

    suspend fun signIn(email: String, password: String) {
        auth.signInWithEmailAndPassword(email, password)
    }

    suspend fun signUp(email: String, password: String) {
        auth.createUserWithEmailAndPassword(email, password)
    }

    suspend fun signInAnonymously() {
        auth.signInAnonymously()
    }

    suspend fun signOut() {
        auth.signOut()
    }

    suspend fun resetPassword(email: String) {
        auth.sendPasswordResetEmail(email)
    }

    suspend fun deleteAccount(uid: String) {
        // Deleting user data is usually done in the data repository, 
        // but here we just handle the Auth part if needed.
        auth.currentUser?.delete()
    }
}
