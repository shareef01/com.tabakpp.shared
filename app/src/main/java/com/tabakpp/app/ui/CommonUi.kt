package com.tabakpp.app.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.tabakpp.app.ui.theme.*

/**
 * Premium design tokens for consistent UI across the app
 */
object TabakDesign {
    val cornerLarge = 32.dp
    val cornerMedium = 24.dp
    val cornerSmall = 16.dp
    val cardElevation = 12.dp
    val shadowAlpha = 0.15f
}

@Composable
fun Modifier.bounceClick(
    enabled: Boolean = true,
    scaleDown: Float = 0.94f,
    onClick: () -> Unit = {}
): Modifier {
    var isPressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (isPressed) scaleDown else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
        label = "bounce"
    )

    return this
        .graphicsLayer {
            scaleX = scale
            scaleY = scale
        }
        .pointerInput(enabled) {
            if (enabled) {
                detectTapGestures(
                    onPress = {
                        isPressed = true
                        try {
                            awaitRelease()
                        } finally {
                            isPressed = false
                        }
                    },
                    onTap = { onClick() }
                )
            }
        }
}

@Composable
fun InfoMarker(modifier: Modifier = Modifier, onClick: () -> Unit) {
    Icon(
        Icons.Default.Info,
        null,
        tint = TextDim,
        modifier = modifier
            .size(18.dp)
            .clip(CircleShape)
            .clickable { onClick() }
    )
}

@Composable
fun InfoDialog(title: String, text: String, onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            shape = RoundedCornerShape(TabakDesign.cornerMedium),
            colors = CardDefaults.cardColors(BgPanel),
            border = BorderStroke(1.dp, BorderSubtle)
        ) {
            Column(Modifier.padding(32.dp)) {
                Text(title, fontWeight = FontWeight.Black, fontSize = 22.sp, color = TextMain, letterSpacing = (-0.5).sp)
                Spacer(Modifier.height(16.dp))
                Text(text, fontSize = 15.sp, color = TextMuted, lineHeight = 22.sp, fontWeight = FontWeight.Medium)
                Spacer(Modifier.height(32.dp))
                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth().height(56.dp).bounceClick(onClick = onDismiss),
                    shape = RoundedCornerShape(TabakDesign.cornerSmall),
                    colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = AccentFg)
                ) {
                    Text("UNDERSTOOD", fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                }
            }
        }
    }
}

@Composable
fun AboutDialog(onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            shape = RoundedCornerShape(TabakDesign.cornerMedium),
            colors = CardDefaults.cardColors(BgCard),
            border = BorderStroke(1.dp, BorderSubtle)
        ) {
            Column(Modifier.padding(32.dp)) {
                Text("tabak++", fontWeight = FontWeight.Black, fontSize = 32.sp, color = TextMain, letterSpacing = (-1.5).sp)
                Text("v1.0.4 - Premium Edition", fontSize = 12.sp, color = Accent, fontWeight = FontWeight.Black, letterSpacing = 2.sp)
                
                Spacer(Modifier.height(24.dp))
                
                Text(
                    "A high-performance tracking suite designed for mindfulness and self-optimization.",
                    fontSize = 15.sp,
                    color = TextMuted,
                    lineHeight = 22.sp,
                    fontWeight = FontWeight.Medium
                )
                
                Spacer(Modifier.height(24.dp))
                
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    AboutDetailRow("Developer", "Tabak Labs")
                    AboutDetailRow("Engine", "Compose & Room")
                    AboutDetailRow("Cloud", "Firebase FireStore")
                    AboutDetailRow("Optimization", "90Hz Reactive")
                }
                
                Spacer(Modifier.height(32.dp))
                
                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth().height(56.dp).bounceClick(onClick = onDismiss),
                    shape = RoundedCornerShape(TabakDesign.cornerSmall),
                    colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = AccentFg)
                ) {
                    Text("CLOSE", fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                }
            }
        }
    }
}

@Composable
private fun AboutDetailRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 12.sp, color = TextDim, fontWeight = FontWeight.Bold)
        Text(value, fontSize = 12.sp, color = TextMain, fontWeight = FontWeight.Black)
    }
}

@Composable
fun MessageBanner(msg: com.tabakpp.app.viewmodel.UiMessage) {
    val (color, text) = when (msg) {
        is com.tabakpp.app.viewmodel.UiMessage.Error -> DangerColor to msg.msg
        is com.tabakpp.app.viewmodel.UiMessage.Success -> SuccessColor to msg.msg
        else -> Color.Transparent to ""
    }
    if (text.isNotEmpty()) {
        Box(
            Modifier
                .fillMaxWidth()
                .padding(bottom = 20.dp)
                .background(color.copy(alpha = 0.08f), RoundedCornerShape(TabakDesign.cornerSmall))
                .border(1.dp, color.copy(alpha = 0.2f), RoundedCornerShape(TabakDesign.cornerSmall))
                .padding(20.dp)
        ) {
            Text(text, color = color, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        }
    }
}

@Composable
fun SCard(title: String, danger: Boolean = false, content: @Composable ColumnScope.() -> Unit) =
    Card(
        modifier = Modifier.fillMaxWidth().shadow(TabakDesign.cardElevation, RoundedCornerShape(TabakDesign.cornerMedium), ambientColor = Color.Black.copy(alpha = TabakDesign.shadowAlpha)),
        shape = RoundedCornerShape(TabakDesign.cornerMedium),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        border = BorderStroke(1.dp, if (danger) DangerColor.copy(alpha = .2f) else BorderSubtle)
    ) {
        Column(Modifier.padding(24.dp)) {
            Text(title.uppercase(), fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Black, fontSize = 11.sp, color = if (danger) DangerColor else TextMain, letterSpacing = 2.sp)
            HorizontalDivider(Modifier.padding(vertical = 16.dp), color = if (danger) DangerColor.copy(alpha = .1f) else BorderSubtle, thickness = 0.5.dp)
            content()
        }
    }

@Composable
fun SBtn(text: String, onClick: () -> Unit) =
    OutlinedButton(
        onClick = onClick,
        modifier = Modifier.bounceClick(onClick = onClick),
        shape = RoundedCornerShape(TabakDesign.cornerSmall),
        border = BorderStroke(1.5.dp, BorderMid),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = TextMain)
    ) {
        Text(text.uppercase(), fontWeight = FontWeight.Black, fontSize = 11.sp, letterSpacing = 1.sp) 
    }
