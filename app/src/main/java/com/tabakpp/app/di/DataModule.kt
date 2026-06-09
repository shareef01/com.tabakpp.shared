package com.tabakpp.app.di

import android.content.Context
import androidx.room.Room
import com.tabakpp.app.data.local.TabakDao
import com.tabakpp.app.data.local.TabakDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DataModule {

    @Provides
    @Singleton
    fun provideFirebaseAuth(): FirebaseAuth = FirebaseAuth.getInstance()

    @Provides
    @Singleton
    fun provideFirebaseFirestore(): FirebaseFirestore {
        val db = FirebaseFirestore.getInstance()
        db.firestoreSettings = com.google.firebase.firestore.firestoreSettings {
            @Suppress("DEPRECATION")
            isPersistenceEnabled = true
        }
        return db
    }

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): TabakDatabase {
        return Room.databaseBuilder(
            context,
            TabakDatabase::class.java,
            "tabak_db"
        ).fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    fun provideTabakDao(database: TabakDatabase): TabakDao {
        return database.tabakDao()
    }
}
