package com.tabakpp.app.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.*
import androidx.compose.ui.unit.*
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
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
    val todayLog by vm.todayLog.collectAsStateWithLifecycle()
    val configs by vm.counterConfigs.collectAsStateWithLifecycle()
    val layout by vm.dashboardLayout.collectAsStateWithLifecycle()
    val totalDailyCount by vm.totalDailyCount.collectAsStateWithLifecycle()
    val totalDailyLimit by vm.totalDailyLimit.collectAsStateWithLifecycle()
    val coachMessage by vm.coachMessage.collectAsStateWithLifecycle()
    val userRank by vm.userRank.collectAsStateWithLifecycle()
    val userXP by vm.userXP.collectAsStateWithLifecycle()
    val userGoal by vm.userGoal.collectAsStateWithLifecycle()
    val profileImageUri by vm.profileImageUri.collectAsStateWithLifecycle()
    val isManualReset by vm.isManualReset.collectAsStateWithLifecycle()
    val activeDate by vm.activeDate.collectAsStateWithLifecycle()
    
    val totalCount = totalDailyCount
    val totalLimit = totalDailyLimit
    
    var infoTarget by remember { mutableStateOf<Pair<String, String>?>(null) }
    var showResetDialog by remember { mutableStateOf(false) }

    val listState = rememberLazyListState()

    Box(Modifier.fillMaxSize().background(BgBase)) {
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(TextMain.copy(alpha = 0.03f), BgBase))))
        
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 140.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            item { Spacer(Modifier.statusBarsPadding().height(84.dp)) }
            
            // --- HEADER ---
            item(contentType = "header") { 
                StaggeredEntry(index = 0) { 
                    GlobalCigaretteHeader(
                        totalCount, totalLimit, userGoal, userRank, userXP,
                        isManualReset = isManualReset,
                        activeDate = activeDate,
                        profileImageUri = profileImageUri,
                        onStartNewDay = { vm.startNewDay() },
                        onResetToday = { showResetDialog = true }
                    ) {
                        infoTarget = "Vitality Progress" to "Total usage today vs combined limits. Embers show active progress. XP and Rank reflect your consistency."
                    }
                }
            }

            // --- TRACKERS ---
            val sortedConfigs = configs.sortedBy { it.displayOrder }
            if (layout == DashboardLayout.LARGE) {
                itemsIndexed(sortedConfigs, key = { _, it -> it.id }, contentType = { _, _ -> "counter_card" }) { index, config ->
                    StaggeredEntry(index = index + 1) {
                        val count = remember(todayLog, config.id) { todayLog?.counts?.get(config.id) ?: 0 }
                        CounterCard(config, count, vm, isCompact = false)
                    }
                }
            } else {
                item(contentType = "counter_grid") {
                    // Use a slightly smaller vertical gap for the matrix to look more intentional
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        sortedConfigs.chunked(2).forEachIndexed { rowIndex, rowConfigs ->
                            StaggeredEntry(index = rowIndex + 1) {
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    rowConfigs.forEach { config ->
                                        Box(Modifier.weight(1f)) {
                                            val count = remember(todayLog, config.id) { todayLog?.counts?.get(config.id) ?: 0 }
                                            CounterCard(config, count, vm, isCompact = true)
                                        }
                                    }
                                    if (rowConfigs.size == 1) Spacer(Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            }
            
            // --- COACH ---
            item(contentType = "coach") { 
                StaggeredEntry(index = configs.size + 2) { 
                    CoachCard(coachMessage) {
                        infoTarget = "Virtual Coach" to "Adaptive messages based on your progress and streaks. Higher streaks unlock more encouraging insights."
                    }
                }
            }
        }
    }
    
    infoTarget?.let { (title, text) ->
        InfoDialog(title, text) { infoTarget = null }
    }

    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = { showResetDialog = false },
            containerColor = BgCard,
            shape = RoundedCornerShape(TabakDesign.cornerLarge),
            title = { Text("Reset Progress?", fontWeight = FontWeight.Black, fontSize = 24.sp, color = TextMain) },
            text = { Text("This will set all counts for ${activeDate} to zero. This action is synced to the cloud.", color = TextMuted, fontSize = 15.sp) },
            confirmButton = {
                Button(
                    onClick = { 
                        vm.resetTodayCounts()
                        showResetDialog = false 
                    },
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = DangerColor, contentColor = Color.White),
                    modifier = Modifier.padding(horizontal = 4.dp).height(48.dp)
                ) { Text("RESET DATA", fontWeight = FontWeight.Black) }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { showResetDialog = false },
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, BorderSubtle),
                    modifier = Modifier.padding(horizontal = 4.dp).height(48.dp)
                ) { Text("CANCEL", color = TextMain, fontWeight = FontWeight.Bold) }
            }
        )
    }
}

@Composable
private fun StaggeredEntry(index: Int, content: @Composable () -> Unit) {
    var visible by remember { mutableStateOf(false) }
    val delay = remember(index) { index * 40L }
    LaunchedEffect(Unit) { 
        kotlinx.coroutines.delay(delay)
        visible = true
    }
    val alpha by animateFloatAsState(if (visible) 1f else 0f, tween(500), label = "alpha")
    val translateY by animateFloatAsState(if (visible) 0f else 40f, tween(500, easing = LinearOutSlowInEasing), label = "y")
    
    Box(Modifier.graphicsLayer {
        this.alpha = alpha
        this.translationY = translateY
    }) {
        content()
    }
}

@Composable
private fun CoachCard(message: String, onInfo: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().shadow(TabakDesign.cardElevation, RoundedCornerShape(TabakDesign.cornerLarge), ambientColor = Accent.copy(alpha = 0.2f)),
        shape = RoundedCornerShape(TabakDesign.cornerLarge),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        border = BorderStroke(1.dp, BorderSubtle)
    ) {
        Column(Modifier.padding(28.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(44.dp).background(Accent.copy(alpha = 0.12f), CircleShape), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.AutoAwesome, null, tint = Accent, modifier = Modifier.size(20.dp))
                }
                Spacer(Modifier.width(16.dp))
                Text("COACHING INSIGHT", fontSize = 11.sp, fontWeight = FontWeight.Black, color = Accent, letterSpacing = 2.sp, modifier = Modifier.weight(1f))
                InfoMarker(onClick = onInfo)
            }
            Spacer(Modifier.height(20.dp))
            Text(message, fontSize = 17.sp, fontWeight = FontWeight.Bold, color = TextMain, lineHeight = 24.sp)
        }
    }
}

@Composable
private fun GlobalCigaretteHeader(
    totalCount: Int, 
    totalLimit: Int, 
    userGoal: String, 
    rank: String, 
    xp: Int, 
    isManualReset: Boolean,
    activeDate: String,
    profileImageUri: String?,
    onStartNewDay: () -> Unit,
    onResetToday: () -> Unit,
    onInfo: () -> Unit
) {
    val dateStr = remember(activeDate) { 
        try { LocalDate.parse(activeDate).format(DateTimeFormatter.ofPattern("MMM d")).uppercase() }
        catch (e: Exception) { activeDate.uppercase() }
    }
    val dayName = remember(activeDate) { 
        try { LocalDate.parse(activeDate).format(DateTimeFormatter.ofPattern("EEEE")).lowercase() }
        catch (e: Exception) { "" }
    }
    val progress by remember(totalCount, totalLimit) { 
        derivedStateOf { (totalCount / totalLimit.toFloat()).coerceIn(0f, 1f) } 
    }
    val animatedProgress by animateFloatAsState(targetValue = progress, animationSpec = spring(stiffness = Spring.StiffnessLow), label = "global_burn")

    val infiniteTransition = rememberInfiniteTransition(label = "flicker")
    val flickerAlpha by infiniteTransition.animateFloat(
        initialValue = 0.85f, targetValue = 1.15f,
        animationSpec = infiniteRepeatable(tween(150, easing = LinearEasing), RepeatMode.Reverse),
        label = "f"
    )

    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Box(
                    Modifier.size(48.dp).clip(CircleShape).background(Accent.copy(alpha = 0.1f)).border(1.5.dp, Accent.copy(alpha = 0.2f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    if (profileImageUri != null) {
                        AsyncImage(model = profileImageUri, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = androidx.compose.ui.layout.ContentScale.Crop)
                    } else {
                        Icon(Icons.Default.Person, null, tint = Accent, modifier = Modifier.size(22.dp))
                    }
                }
                Spacer(Modifier.width(16.dp))
                Column {
                    Text(text = dayName, fontSize = 12.sp, color = TextMuted, fontWeight = FontWeight.Bold)
                    Text(text = dateStr, fontSize = 15.sp, color = TextMain, fontWeight = FontWeight.Black)
                }
            }
            
            Column(horizontalAlignment = Alignment.End) {
                Text(rank.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Black, color = Accent, letterSpacing = 1.sp)
                Text("$xp XP", fontSize = 12.sp, fontWeight = FontWeight.Black, color = TextMuted)
            }
        }
        
        if (isManualReset) {
            val today = LocalDate.now().toString()
            if (activeDate != today) {
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = onStartNewDay,
                    modifier = Modifier.fillMaxWidth().height(48.dp).bounceClick(onClick = onStartNewDay),
                    shape = RoundedCornerShape(TabakDesign.cornerSmall),
                    colors = ButtonDefaults.buttonColors(containerColor = Accent.copy(alpha = 0.12f), contentColor = Accent),
                    border = BorderStroke(1.dp, Accent.copy(alpha = 0.3f))
                ) {
                    Icon(Icons.Default.Login, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(10.dp))
                    Text("START NEW TRACKING DAY", fontWeight = FontWeight.Black, fontSize = 11.sp, letterSpacing = 1.sp)
                }
            }
        }
        
        Spacer(Modifier.height(16.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            if (totalCount > 0) {
                OutlinedButton(
                    onClick = onResetToday,
                    modifier = Modifier.weight(1f).height(40.dp).bounceClick(onClick = onResetToday),
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.dp, DangerColor.copy(alpha = 0.2f)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = DangerColor)
                ) {
                    Icon(Icons.Default.RestartAlt, null, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("RESET TODAY", fontSize = 9.sp, fontWeight = FontWeight.Black)
                }
            }
            
            if (userGoal.isNotBlank()) {
                Row(
                    verticalAlignment = Alignment.CenterVertically, 
                    modifier = Modifier.weight(1f).height(40.dp).background(Accent.copy(alpha = 0.08f), RoundedCornerShape(10.dp)).padding(horizontal = 10.dp),
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(Icons.Default.Flag, null, tint = Accent, modifier = Modifier.size(12.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(userGoal.uppercase(), fontSize = 8.sp, color = Accent, fontWeight = FontWeight.Black, letterSpacing = 0.5.sp, maxLines = 1)
                }
            }
        }
        
        Spacer(Modifier.height(24.dp))

        Box(
            modifier = Modifier.height(14.dp).width(240.dp).clip(CircleShape).background(TextMain.copy(alpha = 0.05f)).border(0.5.dp, BorderSubtle, CircleShape),
            contentAlignment = Alignment.CenterStart
        ) {
            val dangerColor = DangerColor
            Box(Modifier.fillMaxSize().drawBehind {
                if (totalCount >= totalLimit) {
                    drawRect(Brush.horizontalGradient(listOf(dangerColor.copy(alpha = 0.8f), dangerColor)))
                } else {
                    val splitX = size.width * animatedProgress
                    // Draw filled portion with flicker
                    if (totalCount > 0) {
                        drawRect(
                            brush = Brush.horizontalGradient(listOf(Color(0xFFFF3D00), Color(0xFFFFB74D))),
                            topLeft = Offset(splitX - 6.dp.toPx(), 0f),
                            size = Size(6.dp.toPx(), size.height),
                            alpha = flickerAlpha
                        )
                    }
                    // Draw background for remaining part
                    drawRect(
                        color = Color.White,
                        topLeft = Offset(splitX, 0f),
                        size = Size(size.width - splitX, size.height)
                    )
                }
            })
        }
        
        Spacer(Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("VITALITY PROGRESS", fontSize = 10.sp, color = TextDim, letterSpacing = 3.sp, fontWeight = FontWeight.Black)
            Spacer(Modifier.width(8.dp))
            InfoMarker(onClick = onInfo)
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun CounterCard(config: CounterConfig, count: Int, vm: MainViewModel, isCompact: Boolean) {
    val isLimitReached = count >= config.limit
    val progress by remember(count, config.limit) { derivedStateOf { (count / config.limit.coerceAtLeast(1).toFloat()).coerceIn(0f, 1f) } }
    val haptic = LocalHapticFeedback.current
    
    var showEditDialog by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth().shadow(TabakDesign.cardElevation, RoundedCornerShape(TabakDesign.cornerLarge), ambientColor = Color.Black.copy(alpha = TabakDesign.shadowAlpha))
            .combinedClickable(onClick = {}, onLongClick = { haptic.performHapticFeedback(HapticFeedbackType.LongPress); showEditDialog = true }),
        shape = RoundedCornerShape(TabakDesign.cornerLarge),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        border = BorderStroke(1.5.dp, if (isLimitReached) DangerColor.copy(alpha = 0.25f) else BorderSubtle)
    ) {
        Column(
            Modifier.padding(horizontal = if (isCompact) 16.dp else 32.dp, vertical = if (isCompact) 32.dp else 56.dp).fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(text = config.displayName.uppercase(), fontSize = if (isCompact) 11.sp else 13.sp, color = if (isLimitReached) DangerColor else Accent, fontWeight = FontWeight.Black, letterSpacing = 3.sp, maxLines = 1)
            Text(text = "DAILY TARGET: ${config.limit}", fontSize = if (isCompact) 9.sp else 11.sp, color = TextDim, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            
            Spacer(Modifier.height(if (isCompact) 32.dp else 48.dp))
            
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxWidth()) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    when (config.type) {
                        CounterType.CIGARETTE -> CigaretteVisual(count, config.limit, progress, isCompact)
                        CounterType.JOINT_KING -> JointVisual(count, config.limit, progress, isKing = true, isCompact)
                        CounterType.JOINT_QUEEN -> JointVisual(count, config.limit, progress, isKing = false, isCompact)
                        CounterType.SIMPLE -> ModernRingVisual(count, config.limit, progress, size = if (isCompact) 120.dp else 220.dp)
                    }
                    Spacer(Modifier.height(if (isCompact) 32.dp else 64.dp))
                    AnimatedContent(targetState = count, transitionSpec = { (fadeIn(tween(250)) + scaleIn(initialScale = 0.7f)).togetherWith(fadeOut(tween(250)) + scaleOut(targetScale = 1.3f)) }, label = "count") { c ->
                        Text(text = c.toString(), fontWeight = FontWeight.Black, fontSize = if (isCompact) 64.sp else 128.sp, color = TextMain, lineHeight = if (isCompact) 64.sp else 128.sp, letterSpacing = (-4).sp)
                    }
                }
            }
            Spacer(Modifier.height(if (isCompact) 32.dp else 48.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                SmallCounterBtn(Icons.Default.Remove, isCompact = isCompact) { vm.decrement(config.id); haptic.performHapticFeedback(HapticFeedbackType.LongPress) }
                Spacer(Modifier.width(if (isCompact) 32.dp else 64.dp))
                SmallCounterBtn(Icons.Default.Add, isPrimary = true, isCompact = isCompact) { vm.increment(config.id); haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove) }
            }
        }
    }

    if (showEditDialog) {
        var tempName by remember { mutableStateOf(config.name) }
        var tempLimit by remember { mutableStateOf(config.limit.toString()) }
        AlertDialog(
            onDismissRequest = { showEditDialog = false },
            containerColor = BgCard,
            title = { Text("Edit Tracker", fontWeight = FontWeight.Black) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    TabakField(tempName, { tempName = it }, "Label")
                    TabakField(tempLimit, { tempLimit = it.filter { c -> c.isDigit() } }, "Daily Limit", keyboardType = androidx.compose.ui.text.input.KeyboardType.Number)
                }
            },
            confirmButton = {
                TextButton({ tempLimit.toIntOrNull()?.let { vm.updateCounterConfig(config.id, tempName, it) }; showEditDialog = false }) { Text("SAVE", color = Accent, fontWeight = FontWeight.Black) }
            },
            dismissButton = {
                TextButton({ showEditDialog = false }) { Text("CANCEL", color = TextMain, fontWeight = FontWeight.Bold) }
            }
        )
    }
}

@Composable
private fun ModernRingVisual(count: Int, limit: Int, progress: Float, size: Dp) {
    val isLimitReached = count >= limit
    val animatedProgress by animateFloatAsState(targetValue = progress, animationSpec = spring(stiffness = Spring.StiffnessLow, dampingRatio = Spring.DampingRatioMediumBouncy), label = "progress")
    val infiniteTransition = rememberInfiniteTransition(label = "ring_glow")
    val glowAlpha by infiniteTransition.animateFloat(0.3f, 0.6f, infiniteRepeatable(tween(1200), RepeatMode.Reverse), label = "g")
    val accentColor = Accent
    val dangerColor = DangerColor

    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(size)) {
        CircularProgressIndicator(progress = { 1f }, modifier = Modifier.fillMaxSize(), color = TextMain.copy(alpha = 0.05f), strokeWidth = (size.value / 20).dp, strokeCap = StrokeCap.Round)
        CircularProgressIndicator(progress = { animatedProgress }, modifier = Modifier.fillMaxSize(), color = if (isLimitReached) dangerColor else accentColor, strokeWidth = (size.value / 20).dp, strokeCap = StrokeCap.Round)
        if (count > 0) {
            val glowColor = if (isLimitReached) dangerColor else accentColor
            Box(
                Modifier
                    .fillMaxSize()
                    .graphicsLayer { alpha = glowAlpha }
                    .drawBehind {
                        drawCircle(
                            Brush.sweepGradient(
                                0.0f to Color.Transparent,
                                animatedProgress to glowColor.copy(alpha = 0.5f),
                                animatedProgress to Color.Transparent,
                                1.0f to Color.Transparent
                            ),
                            style = Stroke(width = (size.value / 15).dp.toPx(), cap = StrokeCap.Round)
                        )
                    }
            )
        }
    }
}

@Composable
private fun SmallCounterBtn(icon: androidx.compose.ui.graphics.vector.ImageVector, isPrimary: Boolean = false, isCompact: Boolean, onClick: () -> Unit) {
    val size = if (isCompact) 64.dp else 88.dp
    val iconSize = if (isCompact) 28.dp else 40.dp
    Box(
        Modifier.size(size).bounceClick(onClick = onClick).clip(CircleShape).background(if (isPrimary) Accent.copy(alpha = 0.18f) else TextMain.copy(alpha = 0.06f)),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, null, tint = if (isPrimary) Accent else TextMuted, modifier = Modifier.size(iconSize))
    }
}

@Composable
private fun BurnableVisual(
    count: Int, limit: Int, progress: Float, isCompact: Boolean,
    colors: List<Color>, emberColors: List<Color>, glowColor: Color, width: Dp, height: Dp, roachColor: Color = Color(0xFF424242)
) {
    val isLimitReached = count >= limit
    val cornerRadius = remember(height) { height / 2 }
    val infiniteTransition = rememberInfiniteTransition(label = "ember")
    val alpha by infiniteTransition.animateFloat(0.7f, 1f, infiniteRepeatable(tween(500), RepeatMode.Reverse), label = "alpha")
    
    val roachWidth = if (isCompact) 32.dp else 64.dp
    val bodyWidth = width - roachWidth
    val dangerColor = DangerColor

    Box(
        modifier = Modifier
            .height(height)
            .width(width)
            .clip(RoundedCornerShape(cornerRadius))
            .background(TextMain.copy(alpha = 0.05f))
            .border(1.dp, BorderSubtle, RoundedCornerShape(cornerRadius)),
        contentAlignment = Alignment.CenterStart
    ) {
        // Body and Roach
        Box(modifier = Modifier.fillMaxSize()) {
            // Draw Body with Progress
            Box(
                Modifier
                    .fillMaxHeight()
                    .width(bodyWidth)
                    .drawBehind {
                        if (isLimitReached) {
                            drawRect(Brush.horizontalGradient(listOf(dangerColor.copy(alpha = 0.7f), dangerColor)))
                        } else {
                            val splitX = size.width * progress
                            // Draw remaining part
                            drawRect(
                                brush = Brush.horizontalGradient(colors),
                                topLeft = Offset(splitX, 0f),
                                size = Size(size.width - splitX, size.height)
                            )
                        }
                    }
            ) {
                // Ember (Animating part)
                if (count > 0 && !isLimitReached) {
                    Box(
                        Modifier
                            .fillMaxHeight()
                            .width(if (isCompact) 8.dp else 14.dp)
                            .graphicsLayer {
                                translationX = (bodyWidth.toPx() * progress) - (size.width / 2)
                                this.alpha = alpha
                            }
                            .background(Brush.horizontalGradient(emberColors))
                    )
                    Box(
                        Modifier
                            .size(if (isCompact) 22.dp else 36.dp)
                            .graphicsLayer {
                                translationX = (bodyWidth.toPx() * progress) - (size.width / 2)
                                this.alpha = 0.4f * alpha
                            }
                            .background(Brush.radialGradient(listOf(glowColor.copy(alpha = 0.8f), Color.Transparent)), CircleShape)
                    )
                }
            }
            // Roach
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .width(roachWidth)
                    .align(Alignment.CenterEnd)
                    .background(if (isLimitReached) DangerColor else roachColor)
            )
        }
    }
}

@Composable
private fun JointVisual(count: Int, limit: Int, progress: Float, isKing: Boolean, isCompact: Boolean) {
    val animatedProgress by animateFloatAsState(targetValue = progress, animationSpec = spring(stiffness = Spring.StiffnessLow, dampingRatio = Spring.DampingRatioMediumBouncy), label = "progress")
    BurnableVisual(count, limit, animatedProgress, isCompact, listOf(Color(0xFFA5D6A7).copy(alpha = 0.9f), Color(0xFFC8E6C9)), listOf(Color(0xFF9C27B0), Color(0xFFE91E63)), Color(0xFFBA68C8), if (isCompact) 130.dp else 280.dp, if (isCompact) (if (isKing) 20.dp else 16.dp) else (if (isKing) 36.dp else 24.dp))
}

@Composable
private fun CigaretteVisual(count: Int, limit: Int, progress: Float, isCompact: Boolean) {
    val animatedProgress by animateFloatAsState(targetValue = progress, animationSpec = spring(stiffness = Spring.StiffnessLow, dampingRatio = Spring.DampingRatioMediumBouncy), label = "progress")
    BurnableVisual(count, limit, animatedProgress, isCompact, listOf(Color(0xFFF5F5F5), Color(0xFFFFFFFF)), listOf(Color(0xFFFF3D00), Color(0xFFFFB74D)), Color(0xFFFF3D00), if (isCompact) 120.dp else 260.dp, if (isCompact) 18.dp else 28.dp, Color(0xFFE6A33E).copy(alpha = 0.9f))
}
