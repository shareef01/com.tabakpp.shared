package com.tabakpp.app.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tabakpp.app.domain.RecoveryMilestone
import com.tabakpp.app.ui.theme.*
import com.tabakpp.app.viewmodel.HealthViewModel
import kotlinx.coroutines.delay

@Composable
fun HealthScreen(vm: HealthViewModel) {
    val milestones by vm.recoveryMilestones.collectAsStateWithLifecycle()
    val lastEntry by vm.lastEntryTimestamp.collectAsStateWithLifecycle()
    
    var infoTarget by remember { mutableStateOf<Pair<String, String>?>(null) }
    val listState = rememberLazyListState()

    val timeSinceLast = remember(lastEntry) {
        val lastTimestamp = lastEntry
        if (lastTimestamp == null || lastTimestamp == 0L) "No recent activity"
        else {
            val diff = (System.currentTimeMillis() - lastTimestamp) / (1000 * 60)
            when {
                diff < 1L -> "Just now"
                diff < 60L -> "$diff mins ago"
                diff < 1440L -> "${diff / 60}h ${diff % 60}m ago"
                else -> "${diff / 1440} days ago"
            }
        }
    }

    Box(Modifier.fillMaxSize().background(BgBase)) {
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(SuccessColor.copy(alpha = 0.08f), BgBase))))
        
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            item { Spacer(Modifier.statusBarsPadding().height(84.dp)) }

            item(contentType = "header") {
                HealthHeader(timeSinceLast) {
                    infoTarget = "Biological Recovery" to "This hub displays real-time repair progress of your major organ systems. Each phase has a specific duration based on medical research. Timer starts from your last recorded entry."
                }
            }

            if (milestones.isEmpty()) {
                item {
                    Column(Modifier.fillMaxWidth().padding(top = 100.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = Accent.copy(alpha = 0.5f))
                        Spacer(Modifier.height(16.dp))
                        Text("Analyzing markers...", fontSize = 14.sp, color = TextMuted, fontWeight = FontWeight.Bold)
                    }
                }
            } else {
                itemsIndexed(milestones, key = { _, m -> m.title }, contentType = { _, _ -> "recovery_card" }) { index, milestone ->
                    StaggeredHealthItem(index = index + 1) {
                        RecoveryCard(milestone) {
                            infoTarget = milestone.title to "Calculation: (Time since last log) / (${milestone.durationMinutes} min total). Status reflects ${((milestone.progress * 100)).toInt()}% repair completion."
                        }
                    }
                }
            }
            
            item { Spacer(Modifier.height(100.dp)) }
        }
    }

    infoTarget?.let { (title, text) ->
        InfoDialog(title, text) { infoTarget = null }
    }
}

@Composable
private fun HealthHeader(timeSinceLast: String, onInfo: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = TabakDesign.cardElevation,
                shape = RoundedCornerShape(TabakDesign.cornerLarge),
                ambientColor = SuccessColor.copy(alpha = 0.2f)
            ),
        shape = RoundedCornerShape(TabakDesign.cornerLarge),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        border = BorderStroke(1.dp, BorderSubtle)
    ) {
        Column(Modifier.padding(28.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .background(SuccessColor.copy(alpha = 0.12f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.AutoAwesome,
                        null,
                        tint = SuccessColor,
                        modifier = Modifier.size(28.dp)
                    )
                }
                
                Spacer(Modifier.width(20.dp))
                
                Column(Modifier.weight(1f)) {
                    Text(
                        "BIOLOGICAL REPAIR",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        color = SuccessColor,
                        letterSpacing = 2.sp
                    )
                    Text(
                        "Health Restoration",
                        fontWeight = FontWeight.Black,
                        fontSize = 24.sp,
                        color = TextMain,
                        letterSpacing = (-1).sp
                    )
                }
                
                InfoMarker(onClick = onInfo)
            }
            
            HorizontalDivider(
                modifier = Modifier.padding(vertical = 20.dp),
                color = BorderSubtle.copy(alpha = 0.5f),
                thickness = 0.5.dp
            )
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Timer, null, tint = TextDim, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = "LAST ACTIVITY:",
                        fontSize = 10.sp,
                        color = TextDim,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.sp
                    )
                }
                
                Box(
                    modifier = Modifier
                        .background(SuccessColor.copy(alpha = 0.1f), RoundedCornerShape(8.dp))
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = timeSinceLast.uppercase(),
                        fontSize = 10.sp,
                        color = SuccessColor,
                        fontWeight = FontWeight.Black
                    )
                }
            }
        }
    }
}

@Composable
private fun StaggeredHealthItem(index: Int, content: @Composable () -> Unit) {
    var visible by remember { mutableStateOf(false) }
    val delayAmount = remember(index) { index * 40L }
    
    val alpha by animateFloatAsState(if (visible) 1f else 0f, tween(500), label = "alpha")
    val translateY by animateFloatAsState(if (visible) 0f else 40f, tween(500, easing = LinearOutSlowInEasing), label = "y")

    LaunchedEffect(Unit) {
        delay(delayAmount)
        visible = true
    }

    Box(Modifier.graphicsLayer {
        this.alpha = alpha
        this.translationY = translateY
    }) {
        content()
    }
}

@Composable
private fun RecoveryCard(milestone: RecoveryMilestone, onInfo: () -> Unit) {
    val isComplete = milestone.progress >= 1f
    val accentColor = if (isComplete) SuccessColor else Accent
    val backgroundColor = if (isComplete) SuccessColor.copy(alpha = 0.04f) else BgCard
    
    val infinitePulse = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infinitePulse.animateFloat(
        initialValue = 1f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(tween(800, easing = LinearEasing), RepeatMode.Reverse),
        label = "p"
    )

    val timeRemaining = remember(milestone) {
        val remaining = (milestone.durationMinutes * (1f - milestone.progress)).toLong()
        when {
            remaining <= 0 -> "Completed"
            remaining < 60 -> "$remaining mins left"
            remaining < 1440 -> "${remaining / 60}h left"
            else -> "${remaining / 1440}d left"
        }
    }

    val milestoneIcon = remember(milestone.title) {
        when {
            milestone.title.contains("Heart") -> Icons.Default.Favorite
            milestone.title.contains("Carbon") -> Icons.Default.CloudOff
            milestone.title.contains("Lung") -> Icons.Default.Air
            milestone.title.contains("Respiratory") -> Icons.Default.SelfImprovement
            milestone.title.contains("Cardiovascular") -> Icons.Default.FitnessCenter
            else -> Icons.Default.VerifiedUser
        }
    }
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = TabakDesign.cardElevation,
                shape = RoundedCornerShape(TabakDesign.cornerLarge),
                ambientColor = Color.Black.copy(alpha = TabakDesign.shadowAlpha)
            ),
        shape = RoundedCornerShape(TabakDesign.cornerLarge),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        border = BorderStroke(1.dp, if (isComplete) SuccessColor.copy(alpha = 0.2f) else BorderSubtle)
    ) {
        Column(Modifier.padding(24.dp)) {
            // Header: Icon + Title + Progress
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(accentColor.copy(alpha = 0.1f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(milestoneIcon, null, tint = accentColor, modifier = Modifier.size(24.dp))
                }
                
                Spacer(Modifier.width(16.dp))
                
                Column(Modifier.weight(1f)) {
                    Text(
                        text = milestone.title,
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        color = TextMain,
                        letterSpacing = (-0.5).sp
                    )
                    Text(
                        text = if (isComplete) "RESTORATION COMPLETE" else "BODY REPAIRING...",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        color = if (isComplete) SuccessColor else TextDim,
                        letterSpacing = 1.5.sp
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "${(milestone.progress * 100).toInt()}%",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Black,
                        color = accentColor,
                        modifier = Modifier.graphicsLayer {
                            if (!isComplete && (milestone.progress > 0)) {
                                scaleX = pulseScale
                                scaleY = pulseScale
                            }
                        }
                    )
                    Text(
                        text = timeRemaining.uppercase(),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        color = TextDim
                    )
                }
            }
            
            Spacer(Modifier.height(24.dp))
            
            // Modernized Progress Bar
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(12.dp)
                    .clip(CircleShape)
                    .background(TextMain.copy(alpha = 0.05f))
            ) {
                val animatedProgress by animateFloatAsState(
                    targetValue = milestone.progress,
                    animationSpec = tween(1500, easing = FastOutSlowInEasing),
                    label = "p"
                )
                
                // Active Progress Fill
                Box(
                    Modifier
                        .fillMaxWidth(animatedProgress)
                        .fillMaxHeight()
                        .background(
                            Brush.horizontalGradient(
                                listOf(accentColor.copy(alpha = 0.7f), accentColor)
                            )
                        )
                )

                // Shimmer/Spark Effect
                if (!isComplete && animatedProgress > 0) {
                    val infiniteShimmer = rememberInfiniteTransition(label = "shimmer")
                    val shimmerOffset by infiniteShimmer.animateFloat(
                        initialValue = -100f,
                        targetValue = 100f,
                        animationSpec = infiniteRepeatable(tween(2000, easing = LinearEasing)),
                        label = "s"
                    )
                    
                    Box(
                        Modifier
                            .align(Alignment.CenterStart)
                            .fillMaxHeight()
                            .fillMaxWidth(animatedProgress)
                            .graphicsLayer { translationX = shimmerOffset }
                            .background(
                                Brush.horizontalGradient(
                                    listOf(Color.Transparent, Color.White.copy(alpha = 0.15f), Color.Transparent)
                                )
                            )
                    )
                }
            }
            
            Spacer(Modifier.height(24.dp))

            // Details Section - Modernized
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // Description & Impact
                Column {
                    Text(
                        text = milestone.description,
                        fontSize = 15.sp,
                        color = TextMain,
                        fontWeight = FontWeight.Bold,
                        lineHeight = 22.sp
                    )
                    Text(
                        text = milestone.realLifeImpact,
                        fontSize = 13.sp,
                        color = TextMuted,
                        lineHeight = 18.sp,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                // Nutritional Support Card - Modernized
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(accentColor.copy(alpha = 0.05f), RoundedCornerShape(16.dp))
                        .border(1.dp, accentColor.copy(alpha = 0.1f), RoundedCornerShape(16.dp))
                        .padding(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.Top) {
                        Box(
                            Modifier
                                .size(32.dp)
                                .background(accentColor.copy(alpha = 0.1f), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Restaurant, null, tint = accentColor, modifier = Modifier.size(16.dp))
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(
                                "NUTRITIONAL ADVICE",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                color = accentColor,
                                letterSpacing = 1.sp
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                milestone.nutritionalAdvice,
                                fontSize = 13.sp,
                                color = TextMain,
                                lineHeight = 18.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
            
            // Footer Info
            Row(
                Modifier
                    .padding(top = 16.dp)
                    .clickable { onInfo() },
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.History, null, tint = TextDim, modifier = Modifier.size(12.dp))
                Spacer(Modifier.width(6.dp))
                Text(
                    "VIEW CALCULATION LOGIC",
                    fontSize = 9.sp,
                    color = TextDim,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp
                )
            }
        }
    }
}
