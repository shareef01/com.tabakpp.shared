package com.tabakpp.app.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.*
import androidx.compose.ui.unit.*
import com.tabakpp.app.data.DashboardLayout
import com.tabakpp.app.ui.theme.*
import com.tabakpp.app.viewmodel.MainViewModel
import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.CounterType
import com.tabakpp.app.domain.SmokingCalculator
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Composable
fun TrackerScreen(vm: MainViewModel) {
    val log by vm.todayLog.collectAsState()
    val configs by vm.counterConfigs.collectAsState()
    val layout by vm.dashboardLayout.collectAsState()

    // Calculate Global Progress
    val totalCount = remember(log, configs) { SmokingCalculator.getTotalCount(log, configs) }
    val totalLimit = remember(configs) { SmokingCalculator.getTotalLimit(configs) }

    Box(Modifier.fillMaxSize().background(BgBase)) {
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(TextMain.copy(alpha = 0.05f), BgBase))))
        
        if (layout == DashboardLayout.LARGE) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 24.dp, end = 24.dp, bottom = 120.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                item { Spacer(Modifier.statusBarsPadding().height(84.dp)) }
                
                // NEW GLOBAL CIGARETTE PROGRESS HEADER
                item { GlobalCigaretteHeader(totalCount, totalLimit) }

                items(configs, key = { it.id }) { config ->
                    CounterCard(config, log?.counts?.get(config.id) ?: 0, vm, isCompact = false)
                }
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 120.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item(span = { GridItemSpan(2) }) { Spacer(Modifier.statusBarsPadding().height(84.dp)) }
                
                // NEW GLOBAL CIGARETTE PROGRESS HEADER (Full Width in Grid)
                item(span = { GridItemSpan(2) }) { GlobalCigaretteHeader(totalCount, totalLimit) }

                items(configs, key = { it.id }) { config ->
                    CounterCard(config, log?.counts?.get(config.id) ?: 0, vm, isCompact = true)
                }
            }
        }
    }
}

@Composable
private fun GlobalCigaretteHeader(totalCount: Int, totalLimit: Int) {
    val dateStr = remember { LocalDate.now().format(DateTimeFormatter.ofPattern("MMM d")).uppercase() }
    val dayName = remember { LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE")).lowercase() }
    val progress = remember(totalCount, totalLimit) { (totalCount / totalLimit.toFloat()).coerceIn(0f, 1f) }
    val animatedProgress by animateFloatAsState(targetValue = progress, animationSpec = spring(stiffness = Spring.StiffnessLow), label = "global_burn")

    Column(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp, top = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(text = dayName, fontFamily = FontFamily.Monospace, fontSize = 14.sp, color = TextMuted, letterSpacing = 2.sp)
            Box(Modifier.padding(horizontal = 12.dp).size(4.dp).background(Accent.copy(alpha = 0.3f), CircleShape))
            Text(text = dateStr, fontFamily = FontFamily.Monospace, fontSize = 14.sp, color = TextMain, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        }
        
        Spacer(Modifier.height(20.dp))

        // GLOBAL "SMOKE" BAR (Represents sum of all trackers)
        Box(
            modifier = Modifier
                .height(8.dp)
                .width(200.dp)
                .clip(CircleShape)
                .background(TextMain.copy(alpha = 0.05f))
                .border(0.5.dp, BorderSubtle, CircleShape),
            contentAlignment = Alignment.CenterStart
        ) {
            if (totalCount >= totalLimit) {
                // Entire bar turns red once goal is met
                Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(listOf(DangerColor.copy(alpha = 0.7f), DangerColor))))
            } else {
                Row(modifier = Modifier.fillMaxSize()) {
                    // Burned part
                    Spacer(Modifier.weight(animatedProgress.coerceAtLeast(0.0001f)))
                    
                    // Fire/Ember (Small glowing head)
                    if (totalCount > 0) {
                        Box(modifier = Modifier.fillMaxHeight().width(4.dp).background(Brush.horizontalGradient(listOf(Color(0xFFFF3D00), Color(0xFFFFB74D)))))
                    }
                    
                    // Remaining "Unburned" life for the day
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .weight((1f - animatedProgress).coerceAtLeast(0.0001f))
                            .background(Color.White)
                    )
                }
            }
        }
        
        Spacer(Modifier.height(12.dp))
        Text("TOTAL JOURNEY PROGRESS", fontFamily = FontFamily.Monospace, fontSize = 9.sp, color = TextDim, letterSpacing = 4.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun CounterCard(config: CounterConfig, count: Int, vm: MainViewModel, isCompact: Boolean) {
    val isLimitReached = count >= config.limit
    val progress = remember(count, config.limit) { (count / config.limit.coerceAtLeast(1).toFloat()).coerceIn(0f, 1f) }
    val animatedProgress by animateFloatAsState(targetValue = progress, animationSpec = spring(stiffness = Spring.StiffnessLow, dampingRatio = Spring.DampingRatioMediumBouncy), label = "progress")

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(if (isCompact) 24.dp else 32.dp),
        colors = CardDefaults.cardColors(containerColor = TextMain.copy(alpha = 0.02f)),
        border = BorderStroke(1.dp, BorderSubtle)
    ) {
        Column(
            Modifier.padding(horizontal = if (isCompact) 16.dp else 24.dp, vertical = if (isCompact) 24.dp else 40.dp).fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(text = config.displayName.lowercase(), fontFamily = FontFamily.Monospace, fontSize = if (isCompact) 11.sp else 13.sp, color = if (isLimitReached) DangerColor else Accent, fontWeight = FontWeight.Bold, letterSpacing = if (isCompact) 1.sp else 2.sp, maxLines = 1)
            Spacer(Modifier.height(if (isCompact) 20.dp else 40.dp))
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxWidth()) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    when (config.type) {
                        CounterType.CIGARETTE -> CigaretteVisual(count, config.limit, animatedProgress, isCompact)
                        CounterType.JOINT_KING -> JointVisual(count, config.limit, animatedProgress, isKing = true, isCompact)
                        CounterType.JOINT_QUEEN -> JointVisual(count, config.limit, animatedProgress, isKing = false, isCompact)
                        CounterType.SIMPLE -> ModernRingVisual(count, config.limit, animatedProgress, size = if (isCompact) 100.dp else 180.dp)
                    }
                    Spacer(Modifier.height(if (isCompact) 20.dp else 48.dp))
                    AnimatedContent(targetState = count, transitionSpec = { (fadeIn() + scaleIn()).togetherWith(fadeOut() + scaleOut()) }, label = "count") { c ->
                        Text(text = c.toString(), fontFamily = FontFamily.Monospace, fontWeight = FontWeight.ExtraBold, fontSize = if (isCompact) 36.sp else 84.sp, color = TextMain, lineHeight = if (isCompact) 36.sp else 84.sp)
                    }
                }
            }
            Spacer(Modifier.height(if (isCompact) 20.dp else 40.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                SmallCounterBtn(Icons.Default.Remove, isCompact = isCompact) { vm.decrement(config.id) }
                Spacer(Modifier.width(if (isCompact) 16.dp else 40.dp))
                SmallCounterBtn(Icons.Default.Add, isPrimary = true, isCompact = isCompact) { vm.increment(config.id) }
            }
        }
    }
}

@Composable
private fun ModernRingVisual(count: Int, limit: Int, animatedProgress: Float, size: Dp) {
    val isLimitReached = count >= limit
    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(size)) {
        CircularProgressIndicator(progress = { 1f }, modifier = Modifier.fillMaxSize(), color = TextMain.copy(alpha = 0.05f), strokeWidth = (size.value / 30).dp, strokeCap = StrokeCap.Round)
        CircularProgressIndicator(progress = { animatedProgress }, modifier = Modifier.fillMaxSize(), color = if (isLimitReached) DangerColor else Accent, strokeWidth = (size.value / 30).dp, strokeCap = StrokeCap.Round)
        if (count > 0) {
            val alpha by rememberInfiniteTransition(label = "ring_glow").animateFloat(0.2f, 0.5f, infiniteRepeatable(tween(1500), RepeatMode.Reverse), label = "g")
            CircularProgressIndicator(progress = { animatedProgress }, modifier = Modifier.fillMaxSize().blur(if (isLimitReached) 4.dp else 8.dp).graphicsLayer(alpha = alpha), color = if (isLimitReached) DangerColor.copy(alpha = 0.8f) else Accent, strokeWidth = (size.value / 25).dp, strokeCap = StrokeCap.Round)
        }
    }
}

@Composable
private fun SmallCounterBtn(icon: androidx.compose.ui.graphics.vector.ImageVector, isPrimary: Boolean = false, isCompact: Boolean, onClick: () -> Unit) {
    val size = if (isCompact) 44.dp else 64.dp
    val iconSize = if (isCompact) 20.dp else 32.dp
    Box(Modifier.size(size).clip(CircleShape).background(if (isPrimary) Accent.copy(alpha = 0.12f) else TextMain.copy(alpha = 0.05f)).clickable { onClick() }, contentAlignment = Alignment.Center) {
        Icon(icon, null, tint = if (isPrimary) Accent else TextMuted, modifier = Modifier.size(iconSize))
    }
}

@Composable
private fun BurnableVisual(
    count: Int,
    limit: Int,
    progress: Float,
    isCompact: Boolean,
    colors: List<Color>,
    emberColors: List<Color>,
    glowColor: Color,
    width: Dp,
    height: Dp,
    roachColor: Color = Color(0xFF424242)
) {
    val isLimitReached = count >= limit
    val cornerRadius = remember(height) { height / 2 }
    
    Box(
        modifier = Modifier.height(height).width(width)
            .clip(RoundedCornerShape(cornerRadius))
            .background(TextMain.copy(alpha = 0.05f))
            .border(1.dp, BorderSubtle, RoundedCornerShape(cornerRadius)),
        contentAlignment = Alignment.CenterStart
    ) {
        Row(modifier = Modifier.fillMaxSize()) {
            Box(modifier = Modifier.fillMaxHeight().weight(1f)) {
                if (isLimitReached) {
                    Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(listOf(DangerColor.copy(alpha = 0.7f), DangerColor))))
                } else {
                    Row(modifier = Modifier.fillMaxSize()) {
                        val leftWeight = progress.coerceAtLeast(0.0001f)
                        Spacer(modifier = Modifier.weight(leftWeight))
                        if (count > 0) {
                            val alpha by rememberInfiniteTransition(label = "ember").animateFloat(
                                0.6f, 1f, infiniteRepeatable(tween(800), RepeatMode.Reverse), label = "alpha"
                            )
                            Box(contentAlignment = Alignment.Center) {
                                Box(modifier = Modifier.fillMaxHeight().width(if (isCompact) 5.dp else 10.dp).background(Brush.horizontalGradient(emberColors)).graphicsLayer(alpha = alpha))
                                Box(modifier = Modifier.size(if (isCompact) 16.dp else 24.dp).blur(if (isCompact) 6.dp else 12.dp).background(glowColor.copy(alpha = 0.5f * alpha), CircleShape))
                            }
                        }
                        val rightWeight = (1f - progress).coerceAtLeast(0.0001f)
                        Box(modifier = Modifier.fillMaxHeight().weight(rightWeight).background(Brush.horizontalGradient(colors)))
                    }
                }
            }
            Box(
                modifier = Modifier.fillMaxHeight().width(if (isCompact) 20.dp else 44.dp).background(if (isLimitReached) DangerColor else roachColor),
                contentAlignment = Alignment.Center
            ) {
                // Roach area
            }
        }
    }
}

@Composable
private fun JointVisual(count: Int, limit: Int, animatedBurnProgress: Float, isKing: Boolean, isCompact: Boolean) {
    BurnableVisual(
        count = count,
        limit = limit,
        progress = animatedBurnProgress,
        isCompact = isCompact,
        colors = listOf(Color(0xFFA5D6A7).copy(alpha = 0.8f), Color(0xFFC8E6C9)),
        emberColors = listOf(Color(0xFF9C27B0), Color(0xFFE91E63)),
        glowColor = Color(0xFFBA68C8),
        width = if (isCompact) (if (isKing) 110.dp else 90.dp) else (if (isKing) 240.dp else 180.dp),
        height = if (isCompact) (if (isKing) 14.dp else 10.dp) else (if (isKing) 24.dp else 16.dp),
        roachColor = Color(0xFF424242)
    )
}

@Composable
private fun CigaretteVisual(count: Int, limit: Int, animatedBurnProgress: Float, isCompact: Boolean) {
    BurnableVisual(
        count = count,
        limit = limit,
        progress = animatedBurnProgress,
        isCompact = isCompact,
        colors = listOf(Color(0xFFF5F5F5), Color(0xFFFFFFFF)),
        emberColors = listOf(Color(0xFFFF3D00), Color(0xFFFFB74D)),
        glowColor = Color(0xFFFF3D00),
        width = if (isCompact) 100.dp else 220.dp,
        height = if (isCompact) 12.dp else 20.dp,
        roachColor = Color(0xFFE6A33E).copy(alpha = 0.9f)
    )
}

