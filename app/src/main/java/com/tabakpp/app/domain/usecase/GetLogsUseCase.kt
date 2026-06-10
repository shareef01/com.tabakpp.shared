package com.tabakpp.app.domain.usecase

import com.tabakpp.app.data.Repository
import javax.inject.Inject

class GetLogsUseCase @Inject constructor(
    private val repository: Repository
) {
    operator fun invoke(userId: String) = repository.getLogsFlow(userId)
}
