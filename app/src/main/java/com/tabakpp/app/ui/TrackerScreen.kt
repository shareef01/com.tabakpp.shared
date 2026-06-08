package com.tabakpp.app.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
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
    val totalCount by vm.totalDailyCount.collectAsState()
    val totalLimit by vm.totalDailyLimit.collectAsState()
    val coachMessage by vm.coachMessage.collectAsState()
    val userRank by vm.userRank.collectAsState()
    val userXP by vm.userXP.collectAsState()
    val milestones by vm.recoveryMilestones.collectAsState()

    Box(Modifier.fillMaxSize().background(BgBase)) {
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(TextMain.copy(alpha = 0.05f), BgBase))))
        
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 140.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            item { Spacer(Modifier.statusBarsPadding().height(84.dp)) }
            
            // --- HEADER ---
            item { 
                StaggeredEntry(index = 0) { GlobalCigaretteHeader(totalCount, totalLimit) }
            }
            
            // --- COACH ---
            item { 
                StaggeredEntry(index = 1) { CoachCard(coachMessage, userRank, userXP) }
            }

            // --- TRACKERS ---
            if (layout == DashboardLayout.LARGE) {
                itemsIndexed(configs, key = { _, it -> it.id }) { index, config ->
                    StaggeredEntry(index = index + 2) {
                        CounterCard(config, log?.counts?.get(config.id) ?: 0, vm, isCompact = false)
                    }
                }
            } else {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        configs.chunked(2).forEachIndexed { rowIndex, rowConfigs ->
                            StaggeredEntry(index = rowIndex + 2) {
                                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                    rowConfigs.forEach { config ->
                                        Box(Modifier.weight(1f)) {
                                            CounterCard(config, log?.counts?.get(config.id) ?: 0, vm, isCompact = true)
                                        }
                                    }
                                    if (rowConfigs.size == 1) Spacer(Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            }

            // --- RECOVERY TIMELINE ---
            if (milestones.isNotEmpty()) {
                item {
                    Text(
                        "HEALTH RECOVERY",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        color = TextDim,
                        letterSpacing = 3.sp,
                        modifier = Modifier.padding(top = 32.dp, bottom = 8.dp).fillMaxWidth()
                    )
                }
                itemsIndexed(milestones) { index, milestone ->
                    StaggeredEntry(index = index + configs.size + 3) {
                        RecoveryCard(milestone)
                    }
                }
            }
        }
    }
}

@Composable
private fun StaggeredEntry(index: Int, content: @Composable () -> Unit) {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(index * 40L)
        visible = true
    }
    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(tween(400)) + slideInVertically(tween(400)) { it / 8 },
        label = "stagger"
    ) {
        content()
    }
}

@Composable
private fun CoachCard(message: String, rank: String, xp: Int) {
    Card(
        modifier = Modifier.fillMaxWidth().shadow(16.dp, RoundedCornerShape(24.dp), ambientColor = Accent, spotColor = Accent.copy(alpha = 0.25f)),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        border = BorderStroke(1.dp, BorderSubtle)
    ) {
        Column(Modifier.padding(24.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(48.dp).background(Accent.copy(alpha = 0.12f), CircleShape), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.AutoAwesome, null, tint = Accent, modifier = Modifier.size(24.dp))
                }
                Spacer(Modifier.width(16.dp))
                Column {
                    Text(rank.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.Black, color = Accent, letterSpacing = 2.sp)
                    Text("$xp XP POINTS", fontSize = 13.sp, fontWeight = FontWeight.Black, color = TextMuted)
                }
            }
            Spacer(Modifier.height(20.dp))
            Text(message, fontSize = 17.sp, fontWeight = FontWeight.Bold, color = TextMain, lineHeight = 24.sp)
        }
    }
}

@Composable
private fun RecoveryCard(milestone: com.tabakpp.app.domain.RecoveryMilestone) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = TextMain.copy(alpha = 0.015f)),
        border = BorderStroke(1.dp, BorderSubtle)
    ) {
        Column(Modifier.padding(22.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(milestone.title, fontWeight = FontWeight.Black, fontSize = 15.sp, color = TextMain, modifier = Modifier.weight(1f))
                Text("${(milestone.progress * 100).toInt()}%", fontSize = 13.sp, fontWeight = FontWeight.Black, color = if (milestone.progress >= 1f) SuccessColor else Accent)
            }
            Spacer(Modifier.height(14.dp))
            Box(Modifier.fillMaxWidth().height(10.dp).clip(CircleShape).background(TextMain.copy(alpha = 0.05f))) {
                val animatedProgress by animateFloatAsState(milestone.progress, tween(1200, easing = FastOutSlowInEasing), label = "recovery")
                Box(Modifier.fillMaxWidth(animatedProgress).fillMaxHeight().background(Brush.horizontalGradient(listOf(Accent.copy(alpha = 0.8f), if (milestone.progress >= 1f) SuccessColor else Accent))))
            }
            if (milestone.progress < 1f) {
                Spacer(Modifier.height(12.dp))
                Text(milestone.description, fontSize = 13.sp, color = TextMuted, lineHeight = 18.sp, fontWeight = FontWeight.Medium)
            } else {
                Row(Modifier.padding(top = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, null, tint = SuccessColor, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Milestone Achieved", fontSize = 11.sp, color = SuccessColor, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun GlobalCigaretteHeader(totalCount: Int, totalLimit: Int) {
    val dateStr = remember { LocalDate.now().format(DateTimeFormatter.ofPattern("MMMM d")).uppercase() }
    val dayName = remember { LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE")).lowercase() }
    val progress = remember(totalCount, totalLimit) { (totalCount / totalLimit.toFloat()).coerceIn(0f, 1f) }
    val animatedProgress by animateFloatAsState(targetValue = progress, animationSpec = spring(stiffness = Spring.StiffnessLow), label = "global_burn")

    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(text = dayName, fontSize = 18.sp, color = TextMuted, fontWeight = FontWeight.Bold)
            Box(Modifier.padding(horizontal = 14.dp).size(4.dp).background(Accent.copy(alpha = 0.4f), CircleShape))
            Text(text = dateStr, fontSize = 18.sp, color = TextMain, fontWeight = FontWeight.Black)
        }
        
        Spacer(Modifier.height(28.dp))

        Box(
            modifier = Modifier
                .height(14.dp)
                .width(260.dp)
                .clip(CircleShape)
                .background(TextMain.copy(alpha = 0.05f))
                .border(0.5.dp, BorderSubtle, CircleShape),
            contentAlignment = Alignment.CenterStart
        ) {
            if (totalCount >= totalLimit) {
                Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(listOf(DangerColor.copy(alpha = 0.8f), DangerColor))))
            } else {
                Row(modifier = Modifier.fillMaxSize()) {
                    Spacer(Modifier.weight(animatedProgress.coerceAtLeast(0.0001f)))
                    if (totalCount > 0) {
                        val flicker by rememberInfiniteTransition(label = "flicker").animateFloat(0.85f, 1.15f, infiniteRepeatable(tween(150, easing = LinearEasing), RepeatMode.Reverse), label = "f")
                        Box(modifier = Modifier.fillMaxHeight().width(6.dp).graphicsLayer { scaleY = flicker; alpha = flicker }.background(Brush.horizontalGradient(listOf(Color(0xFFFF3D00), Color(0xFFFFB74D)))))
                    }
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .weight((1f - animatedProgress).coerceAtLeast(0.0001f))
                            .background(Color.White)
                    )
                }
            }
        }
        
        Spacer(Modifier.height(16.dp))
        Text("DAILY PROGRESS", fontSize = 11.sp, color = TextDim, letterSpacing = 5.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun CounterCard(config: CounterConfig, count: Int, vm: MainViewModel, isCompact: Boolean) {
    val isLimitReached = count >= config.limit
    val progress by remember(count, config.limit) { 
        derivedStateOf { (count / config.limit.coerceAtLeast(1).toFloat()).coerceIn(0f, 1f) } 
    }
    val animatedProgress by animateFloatAsState(targetValue = progress, animationSpec = spring(stiffness = Spring.StiffnessLow, dampingRatio = Spring.DampingRatioMediumBouncy), label = "progress")
    val haptic = LocalHapticFeedback.current

    Card(
        modifier = Modifier.fillMaxWidth().shadow(if (isCompact) 6.dp else 12.dp, RoundedCornerShape(if (isCompact) 24.dp else 32.dp), ambientColor = Color.Black.copy(alpha = 0.15f)),
        shape = RoundedCornerShape(if (isCompact) 24.dp else 32.dp),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        border = BorderStroke(1.dp, BorderSubtle)
    ) {
        Column(
            Modifier.padding(horizontal = if (isCompact) 16.dp else 32.dp, vertical = if (isCompact) 32.dp else 56.dp).fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(text = config.displayName.uppercase(), fontSize = if (isCompact) 12.sp else 14.sp, color = if (isLimitReached) DangerColor else Accent, fontWeight = FontWeight.Black, letterSpacing = 3.sp, maxLines = 1)
            Spacer(Modifier.height(if (isCompact) 24.dp else 48.dp))
            
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxWidth()) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    when (config.type) {
                        CounterType.CIGARETTE -> CigaretteVisual(count, config.limit, animatedProgress, isCompact)
                        CounterType.JOINT_KING -> JointVisual(count, config.limit, animatedProgress, isKing = true, isCompact)
                        CounterType.JOINT_QUEEN -> JointVisual(count, config.limit, animatedProgress, isKing = false, isCompact)
                        CounterType.SIMPLE -> ModernRingVisual(count, config.limit, animatedProgress, size = if (isCompact) 120.dp else 220.dp)
                    }
                    Spacer(Modifier.height(if (isCompact) 28.dp else 64.dp))
                    AnimatedContent(targetState = count, transitionSpec = { (fadeIn(tween(250)) + scaleIn(initialScale = 0.7f)).togetherWith(fadeOut(tween(250)) + scaleOut(targetScale = 1.3f)) }, label = "count") { c ->
                        Text(text = c.toString(), fontWeight = FontWeight.Black, fontSize = if (isCompact) 56.sp else 120.sp, color = TextMain, lineHeight = if (isCompact) 56.sp else 120.sp, letterSpacing = (-3).sp)
                    }
                }
            }
            Spacer(Modifier.height(if (isCompact) 24.dp else 48.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                SmallCounterBtn(Icons.Default.Remove, isCompact = isCompact) { 
                    vm.decrement(config.id)
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
                Spacer(Modifier.width(if (isCompact) 24.dp else 56.dp))
                SmallCounterBtn(Icons.Default.Add, isPrimary = true, isCompact = isCompact) { 
                    vm.increment(config.id)
                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove) 
                }
            }
        }
    }
}

@Composable
private fun ModernRingVisual(count: Int, limit: Int, animatedProgress: Float, size: Dp) {
    val isLimitReached = count >= limit
    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(size)) {
        CircularProgressIndicator(progress = { 1f }, modifier = Modifier.fillMaxSize(), color = TextMain.copy(alpha = 0.05f), strokeWidth = (size.value / 20).dp, strokeCap = StrokeCap.Round)
        CircularProgressIndicator(progress = { animatedProgress }, modifier = Modifier.fillMaxSize(), color = if (isLimitReached) DangerColor else Accent, strokeWidth = (size.value / 20).dp, strokeCap = StrokeCap.Round)
        if (count > 0) {
            val alpha by rememberInfiniteTransition(label = "ring_glow").animateFloat(0.3f, 0.6f, infiniteRepeatable(tween(1200), RepeatMode.Reverse), label = "g")
            CircularProgressIndicator(progress = { animatedProgress }, modifier = Modifier.fillMaxSize().blur(if (isLimitReached) 10.dp else 16.dp).graphicsLayer { this.alpha = alpha }, color = if (isLimitReached) DangerColor else Accent, strokeWidth = (size.value / 15).dp, strokeCap = StrokeCap.Round)
        }
    }
}

@Composable
private fun SmallCounterBtn(icon: androidx.compose.ui.graphics.vector.ImageVector, isPrimary: Boolean = false, isCompact: Boolean, onClick: () -> Unit) {
    val size = if (isCompact) 64.dp else 88.dp
    val iconSize = if (isCompact) 28.dp else 40.dp
    Box(Modifier.size(size).clip(CircleShape).background(if (isPrimary) Accent.copy(alpha = 0.18f) else TextMain.copy(alpha = 0.06f)).clickable { onClick() }, contentAlignment = Alignment.Center) {
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
                                0.7f, 1f, infiniteRepeatable(tween(500), RepeatMode.Reverse), label = "alpha"
                            )
                            Box(contentAlignment = Alignment.Center) {
                                Box(modifier = Modifier.fillMaxHeight().width(if (isCompact) 8.dp else 14.dp).background(Brush.horizontalGradient(emberColors)).graphicsLayer { this.alpha = alpha })
                                Box(modifier = Modifier.size(if (isCompact) 22.dp else 36.dp).blur(if (isCompact) 12.dp else 20.dp).background(glowColor.copy(alpha = 0.4f * alpha), CircleShape))
                            }
                        }
                        val rightWeight = (1f - progress).coerceAtLeast(0.0001f)
                        Box(modifier = Modifier.fillMaxHeight().weight(rightWeight).background(Brush.horizontalGradient(colors)))
                    }
                }
            }
            Box(
                modifier = Modifier.fillMaxHeight().width(if (isCompact) 32.dp else 64.dp).background(if (isLimitReached) DangerColor else roachColor),
                contentAlignment = Alignment.Center
            ) {
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
        colors = listOf(Color(0xFFA5D6A7).copy(alpha = 0.9f), Color(0xFFC8E6C9)),
        emberColors = listOf(Color(0xFF9C27B0), Color(0xFFE91E63)),
        glowColor = Color(0xFFBA68C8),
        width = if (isCompact) 130.dp else 280.dp,
        height = if (isCompact) (if (isKing) 20.dp else 16.dp) else (if (isKing) 36.dp else 24.dp),
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
        width = if (isCompact) 120.dp else 260.dp,
        height = if (isCompact) 18.dp else 28.dp,
        roachColor = Color(0xFFE6A33E).copy(alpha = 0.9f)
    )
}
