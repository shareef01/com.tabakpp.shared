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
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tabakpp.app.domain.RecoveryMilestone
import com.tabakpp.app.ui.theme.*
import com.tabakpp.app.viewmodel.MainViewModel
import kotlinx.coroutines.delay
import kotlin.time.Duration.Companion.milliseconds

@Composable
fun HealthScreen(vm: MainViewModel) {
    val milestones by vm.recoveryMilestones.collectAsState()
    var infoTarget by remember { mutableStateOf<Pair<String, String>?>(null) }
    val listState = rememberLazyListState()

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
                HealthHeader {
                    infoTarget = "Biological Recovery" to "This hub displays real-time repair progress of your major organ systems. Each phase has a specific duration based on medical research."
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
private fun HealthHeader(onInfo: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().shadow(TabakDesign.cardElevation, RoundedCornerShape(TabakDesign.cornerLarge), ambientColor = SuccessColor.copy(alpha = 0.15f)),
        shape = RoundedCornerShape(TabakDesign.cornerLarge),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        border = BorderStroke(1.dp, BorderSubtle)
    ) {
        Row(Modifier.padding(28.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(64.dp).background(SuccessColor.copy(alpha = 0.15f), CircleShape), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.AutoAwesome, null, tint = SuccessColor, modifier = Modifier.size(32.dp))
            }
            Spacer(Modifier.width(20.dp))
            Column(Modifier.weight(1f)) {
                Text("VITALITY TRACKER", fontSize = 11.sp, fontWeight = FontWeight.Black, color = SuccessColor, letterSpacing = 3.sp)
                Text("Body Restoration", fontWeight = FontWeight.Black, fontSize = 24.sp, color = TextMain, letterSpacing = (-1).sp)
            }
            InfoMarker(onClick = onInfo)
        }
    }
}

@Composable
private fun StaggeredHealthItem(index: Int, content: @Composable () -> Unit) {
    val visible = remember { MutableTransitionState(initialState = false) }.apply { targetState = true }
    val delayAmount = remember(index) { index * 45L }
    LaunchedEffect(Unit) { delay(delayAmount.milliseconds) }
    AnimatedVisibility(visibleState = visible, enter = fadeIn(tween(450)) + slideInVertically(tween(450)) { it / 5 }, label = "h_stagger") { content() }
}

@Composable
private fun RecoveryCard(milestone: RecoveryMilestone, onInfo: () -> Unit) {
    val isComplete = milestone.progress >= 1f
    val accentColor = if (isComplete) SuccessColor else Accent
    
    Card(
        modifier = Modifier.fillMaxWidth().shadow(TabakDesign.cardElevation, RoundedCornerShape(TabakDesign.cornerLarge), ambientColor = Color.Black.copy(alpha = TabakDesign.shadowAlpha)),
        shape = RoundedCornerShape(TabakDesign.cornerLarge),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        border = BorderStroke(1.dp, if (isComplete) SuccessColor.copy(alpha = 0.3f) else BorderSubtle)
    ) {
        Column(Modifier.padding(28.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(milestone.title.uppercase(), fontWeight = FontWeight.Black, fontSize = 15.sp, color = TextMain, letterSpacing = 1.5.sp)
                    Text(if (isComplete) "PHASE COMPLETE" else "RECOVERY IN PROGRESS", fontSize = 10.sp, fontWeight = FontWeight.Black, color = if (isComplete) SuccessColor else TextDim, letterSpacing = 2.sp)
                }
                Text(
                    text = "${(milestone.progress * 100).toInt()}%",
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Black,
                    color = accentColor,
                    letterSpacing = (-1).sp,
                    modifier = Modifier.graphicsLayer {
                        if (!isComplete && (milestone.progress > 0)) {
                            val pulse = 1f + 0.05f * kotlin.math.sin(System.currentTimeMillis() / 400.0).toFloat()
                            scaleX = pulse
                            scaleY = pulse
                        }
                    }
                )
            }
            
            Spacer(Modifier.height(24.dp))
            
            Box(Modifier.fillMaxWidth().height(20.dp).clip(CircleShape).background(TextMain.copy(alpha = 0.05f)).border(1.dp, TextMain.copy(alpha = 0.05f), CircleShape)) {
                val animatedProgress by animateFloatAsState(milestone.progress, tween(2000, easing = FastOutSlowInEasing), label = "p")
                Box(Modifier.fillMaxWidth(animatedProgress).fillMaxHeight().background(Brush.horizontalGradient(listOf(accentColor.copy(alpha = 0.6f), accentColor, accentColor.copy(alpha = 0.8f)))))
                
                if (milestone.progress > 0 && milestone.progress < 1f) {
                    val infiniteTransition = rememberInfiniteTransition(label = "shimmer")
                    val shimmerX by infiniteTransition.animateFloat(initialValue = 0f, targetValue = 1f, animationSpec = infiniteRepeatable(tween(2000, easing = LinearEasing)), label = "s")
                    Box(Modifier.fillMaxWidth(animatedProgress).fillMaxHeight()) {
                        Box(Modifier.align(Alignment.CenterEnd).size(24.dp).offset(x = 12.dp).blur(12.dp).background(accentColor.copy(alpha = 0.5f), CircleShape))
                        Box(Modifier.fillMaxWidth().fillMaxHeight().background(Brush.horizontalGradient(0.0f to Color.Transparent, shimmerX to Color.White.copy(alpha = 0.12f), (shimmerX + 0.15f).coerceAtMost(1f) to Color.Transparent)))
                    }
                }
            }
            
            Spacer(Modifier.height(28.dp))
            Text(milestone.description, fontSize = 15.sp, color = TextMain, fontWeight = FontWeight.Bold, lineHeight = 22.sp)
            Text(milestone.realLifeImpact, fontSize = 13.sp, color = TextMuted, lineHeight = 18.sp, modifier = Modifier.padding(top = 8.dp))

            Spacer(Modifier.height(24.dp))
            Box(Modifier.fillMaxWidth().background(accentColor.copy(alpha = 0.06f), RoundedCornerShape(20.dp)).border(1.dp, accentColor.copy(alpha = 0.1f), RoundedCornerShape(20.dp)).padding(20.dp)) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Restaurant, null, tint = accentColor, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(12.dp))
                        Text("NUTRITIONAL SUPPORT", fontSize = 10.sp, fontWeight = FontWeight.Black, color = accentColor, letterSpacing = 1.5.sp)
                    }
                    Spacer(Modifier.height(10.dp))
                    Text(milestone.nutritionalAdvice, fontSize = 13.sp, color = TextMain, lineHeight = 20.sp, fontWeight = FontWeight.Medium)
                }
            }
            
            Row(Modifier.padding(top = 20.dp).clickable { onInfo() }, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Info, null, tint = TextDim, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(8.dp))
                Text("RECOVERY DATA LOGIC", fontSize = 10.sp, color = TextDim, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
            }
        }
    }
}
