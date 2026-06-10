package com.tabakpp.app.domain.usecase

import com.tabakpp.app.data.Repository
import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.CounterType
import javax.inject.Inject

class TrackingUseCases @Inject constructor(
    private val repository: Repository
) {
    val counterConfigs = repository.counterConfigs
    fun getEvents(uid: String) = repository.getAllEvents(uid)

    suspend fun increment(uid: String, date: String, counterId: String) = repository.logIncrement(uid, date, counterId)
    suspend fun decrement(uid: String, date: String, counterId: String) = repository.logDecrement(uid, date, counterId)
    suspend fun addCounter(name: String, limit: Int, type: CounterType, price: Float, exclude: Boolean) {
        val newConfig = CounterConfig(id = java.util.UUID.randomUUID().toString(), name = name, limit = limit, type = type, pricePerUnit = price, excludeFromEconomics = exclude)
        val current = repository.getCounterConfigsOnce()
        repository.saveCounterConfigs(current + newConfig)
    }
    suspend fun updateCounterConfig(id: String, name: String, limit: Int, price: Float, exclude: Boolean) {
        val current = repository.getCounterConfigsOnce()
        val updated = current.map { if (it.id == id) it.copy(name = name, limit = limit, pricePerUnit = price, excludeFromEconomics = exclude) else it }
        repository.saveCounterConfigs(updated)
        if (id == "cigarettes") repository.saveDailyLimit(limit)
    }
    suspend fun removeCounter(id: String) = repository.removeCounter(id)
    suspend fun editLog(uid: String, date: String, counterId: String, count: Int) = repository.overwriteCounterLogs(uid, date, counterId, count)
    suspend fun resetDay(uid: String, date: String) = repository.resetDayLog(uid, date)
    suspend fun reorderCounters(configs: List<CounterConfig>) {
        val updated = configs.mapIndexed { index, config -> config.copy(displayOrder = index) }
        repository.saveCounterConfigs(updated)
    }
    suspend fun syncAll() = repository.loadAndSyncAll()
    suspend fun ensureDefault() = repository.ensureDefaultCounter()
}
