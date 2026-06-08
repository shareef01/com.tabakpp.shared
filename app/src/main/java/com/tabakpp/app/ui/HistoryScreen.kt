package com.tabakpp.app.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.text.font.*
import androidx.compose.ui.unit.*
import androidx.compose.ui.window.Dialog
import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.DailyLog
import com.tabakpp.app.ui.theme.*
import com.tabakpp.app.viewmodel.MainViewModel
import com.tabakpp.app.domain.SmokingCalculator
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import java.util.Locale
import kotlin.math.roundToInt

enum class ChartTimeframe { DAY, WEEK }
data class ChartPoint(val value: Int, val label: String)

@Composable
fun HistoryScreen(vm: MainViewModel) {
    val logs by vm.logs.collectAsState()
    val configs by vm.counterConfigs.collectAsState()
    val costPerUnit by vm.costPerUnit.collectAsState()
    
    var selectedCounterId by remember { mutableStateOf("cigarettes") }
    var timeframe by remember { mutableStateOf(ChartTimeframe.DAY) }
    var editTarget by remember { mutableStateOf<Pair<DailyLog, String>?>(null) }
    var deleteTarget by remember { mutableStateOf<Pair<DailyLog, String>?>(null) }
    
    val expandedDates = remember { mutableStateMapOf<String, Boolean>() }

    LazyColumn(Modifier.fillMaxSize().background(BgBase).padding(horizontal = 20.dp),
        contentPadding = PaddingValues(top = 20.dp, bottom = 120.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)) {
        
        item { Spacer(Modifier.statusBarsPadding().height(84.dp)) }

        item { 
            AnimatedVisibility(
                visible = logs.isNotEmpty(),
                enter = fadeIn() + expandVertically()
            ) {
                StockChart(logs, configs, selectedCounterId, timeframe, 
                    onSelectCounter = { selectedCounterId = it },
                    onSelectTimeframe = { timeframe = it }
                )
            }
            Spacer(Modifier.height(16.dp)) 
        }

        item {
            AnimatedVisibility(
                visible = logs.isNotEmpty(),
                enter = fadeIn(animationSpec = tween(600, delayMillis = 200))
            ) {
                InsightsRow(vm)
            }
            Spacer(Modifier.height(16.dp))
        }
        
        items(logs, key = { it.logDate }) { log ->
            var visible by remember { mutableStateOf(false) }
            LaunchedEffect(Unit) { visible = true }
            
            AnimatedVisibility(
                visible = visible,
                enter = fadeIn(tween(400)) + slideInVertically(tween(400)) { it / 2 }
            ) {
                val isExpanded = expandedDates[log.logDate] ?: false
                DateBundle(
                    log = log,
                    configs = configs,
                    isToday = log.logDate == vm.todayString,
                    isExpanded = isExpanded,
                    onToggle = { expandedDates[log.logDate] = !isExpanded },
                    onEdit = { cid -> editTarget = log to cid },
                    onDelete = { cid -> deleteTarget = log to cid }
                )
            }
        }
    }

    editTarget?.let { (log, cid) ->
        val config = configs.find { it.id == cid }
        EditDialog(log, config?.displayName ?: cid, cid, { editTarget = null }) { cnt ->
            vm.editLog(log.logDate, cid, cnt)
        }
    }

    deleteTarget?.let { (log, cid) ->
        val config = configs.find { it.id == cid }
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            containerColor = BgCard,
            title = { Text("Reset Entry?", color = TextMain, fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to reset ${config?.displayName ?: cid} for ${log.logDate}?", color = TextMuted) },
            confirmButton = {
                TextButton({ vm.deleteCounterFromLog(log.logDate, cid); deleteTarget = null }) {
                    Text("Reset", color = DangerColor, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton({ deleteTarget = null }) {
                    Text("Cancel", color = TextMain)
                }
            }
        )
    }
}

@Composable
private fun InsightsRow(vm: MainViewModel) {
    val totalCost by vm.totalSavings.collectAsState()
    val lifeLost by vm.lifeLostMinutes.collectAsState()
    val currentStreak by vm.currentStreak.collectAsState()

    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        InsightCard(
            label = "Streak",
            value = "$currentStreak",
            suffix = "days",
            icon = Icons.Default.Whatshot,
            modifier = Modifier.weight(1f),
            color = Color(0xFFF59E0B)
        )
        InsightCard(
            label = "Spent",
            value = String.format(Locale.getDefault(), "$%.2f", totalCost),
            suffix = "total",
            icon = Icons.Default.AccountBalanceWallet,
            modifier = Modifier.weight(1f),
            color = Color(0xFF10B981)
        )
        InsightCard(
            label = "Health",
            value = "${lifeLost / 60}h ${lifeLost % 60}m",
            suffix = "lost",
            icon = Icons.Default.Favorite,
            modifier = Modifier.weight(1f),
            color = DangerColor
        )
    }
}

@Composable
private fun InsightCard(label: String, value: String, suffix: String, icon: androidx.compose.ui.graphics.vector.ImageVector, color: Color, modifier: Modifier = Modifier) {
    var sizeScale by remember { mutableStateOf(0.8f) }
    val animatedScale by animateFloatAsState(targetValue = sizeScale, animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow))
    
    LaunchedEffect(Unit) { sizeScale = 1f }

    Card(
        modifier = modifier.graphicsLayer { scaleX = animatedScale; scaleY = animatedScale },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        border = BorderStroke(1.dp, BorderSubtle)
    ) {
        Column(Modifier.padding(16.dp)) {
            Icon(icon, null, tint = color.copy(alpha = 0.8f), modifier = Modifier.size(18.dp))
            Spacer(Modifier.height(8.dp))
            Text(value, fontWeight = FontWeight.Black, fontSize = 20.sp, color = TextMain)
            Text(suffix, fontSize = 12.sp, color = TextMuted, fontWeight = FontWeight.Medium)
            Spacer(Modifier.height(6.dp))
            Text(label.uppercase(), fontSize = 9.sp, color = TextDim, fontWeight = FontWeight.Black, letterSpacing = 1.2.sp)
        }
    }
}

@Composable
private fun DateBundle(
    log: DailyLog,
    configs: List<CounterConfig>,
    isToday: Boolean,
    isExpanded: Boolean,
    onToggle: () -> Unit,
    onEdit: (String) -> Unit,
    onDelete: (String) -> Unit
) {
    val dateDisplay = remember(log.logDate, isToday) {
        if (isToday) "today" else try {
            LocalDate.parse(log.logDate).format(DateTimeFormatter.ofPattern("EEEE, MMM d", Locale.getDefault())).lowercase()
        } catch (_: Exception) { log.logDate }
    }

    val totalActivity = remember(log.counts) { log.counts.values.sum() }

    Card(
        modifier = Modifier.fillMaxWidth().clickable { onToggle() }.animateContentSize(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(if (isToday) Accent.copy(alpha = .03f) else BgCard),
        border = BorderStroke(1.dp, if (isToday) Accent.copy(alpha = 0.1f) else BorderSubtle)) {
        
        Column(Modifier.padding(horizontal = 20.dp, vertical = 18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(dateDisplay, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = TextMain)
                    Text("$totalActivity total events", fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.Medium)
                }
                Icon(
                    if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                    null, tint = TextDim, modifier = Modifier.size(24.dp)
                )
            }

            if (isExpanded) {
                Column(Modifier.padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    HorizontalDivider(color = BorderSubtle.copy(alpha = 0.5f))
                    log.counts.forEach { (cid, count) ->
                        val config = configs.find { it.id == cid } ?: return@forEach
                        HistoryRowItem(config.displayName, count, onEdit = { onEdit(cid) }, onDelete = { onDelete(cid) })
                    }
                }
            }
        }
    }
}

@Composable
private fun HistoryRowItem(name: String, count: Int, onEdit: () -> Unit, onDelete: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Text(name.lowercase(), fontSize = 14.sp, color = TextMain, modifier = Modifier.weight(1f), fontWeight = FontWeight.Medium)
        Text("$count", fontWeight = FontWeight.Black, fontSize = 20.sp, color = Accent)
        Spacer(Modifier.width(16.dp))
        IconButton(onEdit, Modifier.size(32.dp)) { Icon(Icons.Default.Edit, null, tint = TextDim, modifier = Modifier.size(16.dp)) }
        IconButton(onDelete, Modifier.size(32.dp)) { Icon(Icons.Default.Delete, null, tint = DangerColor.copy(alpha = 0.4f), modifier = Modifier.size(16.dp)) }
    }
}

@Composable
private fun StockChart(
    logs: List<DailyLog>, 
    configs: List<CounterConfig>, 
    selectedId: String, 
    timeframe: ChartTimeframe,
    onSelectCounter: (String) -> Unit,
    onSelectTimeframe: (ChartTimeframe) -> Unit
) {
    val selectedConfig = configs.find { it.id == selectedId }
    val limit = selectedConfig?.limit ?: 20
    var showMenu by remember { mutableStateOf(false) }
    
    val chartData = remember(logs, selectedId, timeframe) {
        if (timeframe == ChartTimeframe.DAY) {
            logs.sortedBy { it.logDate }.takeLast(7).map { 
                ChartPoint(
                    it.counts[selectedId] ?: 0,
                    try { LocalDate.parse(it.logDate).format(DateTimeFormatter.ofPattern("EEE")).take(2).lowercase() } catch (_: Exception) { "" }
                )
            }
        } else {
            val weeks = mutableListOf<ChartPoint>()
            for (i in 0 until 5) {
                val weekStart = LocalDate.now().minusWeeks(i.toLong()).with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY))
                val weekEnd = weekStart.plusDays(6)
                val sum = logs.filter { 
                    val d = try { LocalDate.parse(it.logDate) } catch (_: Exception) { null }
                    d != null && !d.isBefore(weekStart) && !d.isAfter(weekEnd)
                }.sumOf { it.counts[selectedId] ?: 0 }
                weeks.add(ChartPoint(sum, "w${5-i}")) 
            }
            weeks.reversed()
        }
    }

    val maxVal = remember(chartData) { (chartData.maxOfOrNull { it.value } ?: 1).coerceAtLeast(limit).coerceAtLeast(1) }
    val avgVal = remember(chartData) { if (chartData.isEmpty()) 0f else chartData.map { it.value }.average().toFloat() }
    
    // Animation for the path
    val pathProgress = remember { Animatable(0f) }
    LaunchedEffect(chartData, selectedId, timeframe) {
        pathProgress.snapTo(0f)
        pathProgress.animateTo(1f, animationSpec = tween(1000, easing = FastOutSlowInEasing))
    }

    // Capture colors for Canvas
    val accentColor = Accent
    val bgCardColor = BgCard
    val dangerColor = DangerColor
    val textDimColor = TextDim
    val textMutedColor = TextMuted

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        border = BorderStroke(1.dp, BorderSubtle)) {
        
        Column(Modifier.padding(24.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("TREND ANALYSIS", fontSize = 10.sp, color = TextMuted, letterSpacing = 2.sp, fontWeight = FontWeight.Bold)
                    Text("${selectedConfig?.displayName?.lowercase() ?: "history"} (${timeframe.name.lowercase()})", fontWeight = FontWeight.Black, fontSize = 18.sp, color = Accent)
                }
                
                Box {
                    IconButton(onClick = { showMenu = true }, modifier = Modifier.size(36.dp).background(Accent.copy(alpha = 0.08f), CircleShape)) {
                        Icon(Icons.Default.Tune, "Settings", tint = Accent, modifier = Modifier.size(18.dp))
                    }
                    DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }, modifier = Modifier.background(BgPanel).border(1.dp, BorderSubtle, RoundedCornerShape(12.dp))) {
                        Text("TRACKER", fontSize = 10.sp, color = TextMuted, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), fontWeight = FontWeight.Black)
                        configs.forEach { config ->
                            DropdownMenuItem(
                                text = { Text(config.displayName.lowercase(), fontSize = 14.sp, color = if (config.id == selectedId) Accent else TextMain, fontWeight = if (config.id == selectedId) FontWeight.Bold else FontWeight.Normal) },
                                onClick = { onSelectCounter(config.id); showMenu = false }
                            )
                        }
                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = BorderSubtle)
                        Text("TIMEFRAME", fontSize = 10.sp, color = TextMuted, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), fontWeight = FontWeight.Black)
                        ChartTimeframe.entries.forEach { tf ->
                            DropdownMenuItem(
                                text = { Text(tf.name.lowercase(), fontSize = 14.sp, color = if (timeframe == tf) Accent else TextMain, fontWeight = if (timeframe == tf) FontWeight.Bold else FontWeight.Normal) },
                                onClick = { onSelectTimeframe(tf); showMenu = false }
                            )
                        }
                    }
                }
            }
            
            Spacer(Modifier.height(32.dp))
            
            Canvas(modifier = Modifier.fillMaxWidth().height(140.dp)) {
                val width = size.width
                val height = size.height
                val numPoints = chartData.size
                if (numPoints < 2) return@Canvas
                
                val spaceX = width / (numPoints - 1)
                
                fun getY(value: Int) = height - (value.toFloat() / maxVal * height)

                // 1. Draw Limit Line
                val limitY = getY(if (timeframe == ChartTimeframe.WEEK) limit * 7 else limit)
                drawLine(
                    color = textDimColor.copy(alpha = 0.4f),
                    start = Offset(0f, limitY),
                    end = Offset(width, limitY),
                    strokeWidth = 1.dp.toPx(),
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(15f, 10f))
                )

                // 2. Draw Average Line
                val avgY = getY(avgVal.roundToInt())
                drawLine(
                    color = accentColor.copy(alpha = 0.2f),
                    start = Offset(0f, avgY),
                    end = Offset(width, avgY),
                    strokeWidth = 2.dp.toPx()
                )

                val points = chartData.mapIndexed { index, point ->
                    Offset(index * spaceX, getY(point.value))
                }

                val path = Path().apply {
                    moveTo(points[0].x, points[0].y)
                    for (i in 1 until points.size) {
                        val prev = points[i - 1]
                        val current = points[i]
                        val cp1 = Offset(prev.x + (current.x - prev.x) / 2, prev.y)
                        val cp2 = Offset(prev.x + (current.x - prev.x) / 2, current.y)
                        cubicTo(cp1.x, cp1.y, cp2.x, cp2.y, current.x, current.y)
                    }
                }

                // Animate Path using clip
                clipRect(right = width * pathProgress.value) {
                    val fillPath = Path().apply {
                        addPath(path)
                        lineTo(points.last().x, height)
                        lineTo(points.first().x, height)
                        close()
                    }
                    drawPath(fillPath, brush = Brush.verticalGradient(listOf(accentColor.copy(alpha = 0.3f), Color.Transparent)))
                    drawPath(path, color = accentColor, style = Stroke(width = 4.dp.toPx(), cap = StrokeCap.Round))
                }

                if (pathProgress.value > 0.99f) {
                    points.forEachIndexed { idx, point ->
                        val pointLimit = if (timeframe == ChartTimeframe.WEEK) limit * 7 else limit
                        val overLimit = chartData[idx].value > pointLimit
                        drawCircle(color = bgCardColor, radius = 6.dp.toPx(), center = point)
                        drawCircle(color = if (overLimit) dangerColor else accentColor, radius = 4.dp.toPx(), center = point)
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                chartData.forEach { point ->
                    Text(text = point.label, fontSize = 10.sp, color = textDimColor, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(8.dp).background(accentColor.copy(alpha = 0.3f), CircleShape))
                Spacer(Modifier.width(8.dp))
                Text(
                    text = "avg: ${avgVal.roundToInt()} | goal: ${if (timeframe == ChartTimeframe.WEEK) limit * 7 else limit}",
                    fontSize = 11.sp, color = textMutedColor, fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun EditDialog(log: DailyLog, name: String, cid: String, onDismiss: () -> Unit, onSave: (Int) -> Unit) {
    var value by remember { mutableStateOf((log.counts[cid] ?: 0).toString()) }
    Dialog(onDismiss) {
        Card(modifier = Modifier.fillMaxWidth().padding(16.dp), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(BgPanel), border = BorderStroke(1.dp, BorderMid)) {
            Column(Modifier.padding(28.dp)) {
                Text("Edit ${name.lowercase()}", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = TextMain)
                Text(log.logDate, fontSize = 14.sp, color = TextMuted, modifier = Modifier.padding(top = 4.dp, bottom = 24.dp), fontWeight = FontWeight.Medium)
                OutlinedTextField(value, { value = it.filter { c -> c.isDigit() } }, label = { Text("Update Count") }, singleLine = true,
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, unfocusedBorderColor = BorderSubtle, cursorColor = Accent, focusedTextColor = TextMain, unfocusedTextColor = TextMain, focusedContainerColor = BgBase, unfocusedContainerColor = BgBase, focusedLabelColor = Accent, unfocusedLabelColor = TextMuted))
                Row(Modifier.padding(top = 24.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(onDismiss, Modifier.weight(1f), shape = RoundedCornerShape(12.dp)) { Text("Cancel", fontWeight = FontWeight.Bold) }
                    Button({ onSave(value.toIntOrNull() ?: 0) }, Modifier.weight(1f), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = AccentFg)) { Text("Save", fontWeight = FontWeight.Bold) }
                }
            }
        }
    }
}
