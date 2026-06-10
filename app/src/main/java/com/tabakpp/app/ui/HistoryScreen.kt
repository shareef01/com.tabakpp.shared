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
import androidx.compose.material3.pulltorefresh.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.*
import androidx.compose.ui.unit.*
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.DailyLog
import com.tabakpp.app.ui.theme.*
import com.tabakpp.app.viewmodel.HistoryViewModel
import com.tabakpp.app.ui.InfoMarker
import com.tabakpp.app.ui.InfoDialog
import kotlinx.coroutines.delay
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import java.util.Locale
import kotlin.math.roundToInt

enum class ChartTimeframe { DAY, WEEK }
data class ChartPoint(val value: Int, val label: String)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(vm: HistoryViewModel, todayString: String) {
    val logs by vm.logs.collectAsStateWithLifecycle()
    val configs by vm.counterConfigs.collectAsStateWithLifecycle()
    val heatmap by vm.hourlyHeatmap.collectAsStateWithLifecycle()
    val isLoading by vm.isLoading.collectAsStateWithLifecycle()
    
    var selectedCounterId by remember { mutableStateOf("cigarettes") }
    var timeframe by remember { mutableStateOf(ChartTimeframe.DAY) }
    var editTarget by remember { mutableStateOf<Pair<DailyLog, String>?>(null) }
    var deleteTarget by remember { mutableStateOf<Pair<DailyLog, String>?>(null) }
    
    var infoTarget by remember { mutableStateOf<Pair<String, String>?>(null) }
    val expandedDates = remember { mutableStateMapOf<String, Boolean>() }
    val listState = rememberLazyListState()

    val pullToRefreshState = rememberPullToRefreshState()
    
    LaunchedEffect(pullToRefreshState.isRefreshing) {
        if (pullToRefreshState.isRefreshing) {
            vm.loadData()
        }
    }

    LaunchedEffect(isLoading) {
        if (!isLoading) pullToRefreshState.endRefresh()
    }

    Box(Modifier.fillMaxSize().background(BgBase).nestedScroll(pullToRefreshState.nestedScrollConnection)) {
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp),
            contentPadding = PaddingValues(top = 20.dp, bottom = 140.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)) {
            
            item { Spacer(Modifier.statusBarsPadding().height(84.dp)) }

            item(contentType = "chart") { 
                StaggeredHistoryItem(index = 0) {
                    StockChart(logs, configs, selectedCounterId, timeframe, 
                        onSelectCounter = { selectedCounterId = it },
                        onSelectTimeframe = { timeframe = it }
                    )
                }
            }

            item(contentType = "insights") {
                StaggeredHistoryItem(index = 1) {
                    InsightsRow(vm) { title, text -> infoTarget = title to text }
                }
            }

            if (heatmap.isNotEmpty()) {
                item(contentType = "heatmap") {
                    StaggeredHistoryItem(index = 2) {
                        HeatmapSection(heatmap) {
                            infoTarget = "Peak Usage Heatmap" to "This heatmap aggregates all your recorded activities by hour of the day. It helps you identify high-risk times where you are most likely to record an entry."
                        }
                    }
                }
            }
            
            itemsIndexed(logs, key = { _, it -> it.logDate }, contentType = { _, _ -> "date_bundle" }) { index, log ->
                StaggeredHistoryItem(index = index + 3) {
                    val isExpanded = expandedDates[log.logDate] ?: false
                    DateBundle(
                        log = log,
                        configs = configs,
                        isToday = log.logDate == todayString,
                        isExpanded = isExpanded,
                        onToggle = { expandedDates[log.logDate] = !isExpanded },
                        onEdit = { cid -> editTarget = log to cid },
                        onDelete = { cid -> deleteTarget = log to cid }
                    )
                }
            }
        }
        
        PullToRefreshContainer(
            state = pullToRefreshState,
            modifier = Modifier.align(Alignment.TopCenter),
            containerColor = BgCard,
            contentColor = Accent
        )
    }

    infoTarget?.let { (title, text) ->
        InfoDialog(title, text) { infoTarget = null }
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
            title = { Text("Reset Entry?", color = TextMain, fontWeight = FontWeight.Black) },
            text = { Text("Are you sure you want to reset ${config?.displayName ?: cid} for ${log.logDate}?", color = TextMuted) },
            confirmButton = {
                TextButton({ vm.deleteCounterFromLog(log.logDate, cid); deleteTarget = null }) {
                    Text("RESET", color = DangerColor, fontWeight = FontWeight.Black)
                }
            },
            dismissButton = {
                TextButton({ deleteTarget = null }) {
                    Text("CANCEL", color = TextMain, fontWeight = FontWeight.Bold)
                }
            }
        )
    }
}

@Composable
private fun StaggeredHistoryItem(index: Int, content: @Composable () -> Unit) {
    var visible by remember { mutableStateOf(false) }
    val delayAmount = remember(index) { index * 40L }
    LaunchedEffect(Unit) { 
        delay(delayAmount)
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
private fun HeatmapSection(heatmap: Map<Int, Int>, onInfo: () -> Unit) {
    val accentColor = Accent
    val baseContentColor = TextMain
    val entryProgress = remember { Animatable(0f) }
    LaunchedEffect(heatmap) {
        entryProgress.animateTo(1f, animationSpec = tween(1200, easing = FastOutSlowInEasing))
    }

    Card(
        modifier = Modifier.fillMaxWidth().shadow(TabakDesign.cardElevation, RoundedCornerShape(TabakDesign.cornerLarge), ambientColor = Color.Black.copy(alpha = TabakDesign.shadowAlpha)),
        shape = RoundedCornerShape(TabakDesign.cornerLarge),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        border = BorderStroke(1.dp, BorderSubtle)
    ) {
        Column(Modifier.padding(24.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("PEAK USAGE TIMES", fontSize = 11.sp, color = TextMuted, letterSpacing = 2.sp, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                InfoMarker(onClick = onInfo)
            }
            Spacer(Modifier.height(28.dp))
            
            Canvas(modifier = Modifier.fillMaxWidth().height(64.dp).graphicsLayer { 
                alpha = entryProgress.value 
                scaleY = 0.85f + (0.15f * entryProgress.value)
            }) {
                val width = size.width
                val height = size.height
                val barSpacing = 4.dp.toPx()
                val barWidth = (width - (barSpacing * 23)) / 24
                val maxVal = heatmap.values.maxOrNull()?.coerceAtLeast(1) ?: 1

                for (h in 0..23) {
                    val count = heatmap[h] ?: 0
                    val heightFactor = count.toFloat() / maxVal.toFloat()
                    val barHeight = (heightFactor * height).coerceAtLeast(4.dp.toPx())
                    val x = h * (barWidth + barSpacing)
                    val y = height - barHeight
                    drawRoundRect(
                        color = if (count > 0) accentColor.copy(alpha = 0.3f + 0.7f * heightFactor) else baseContentColor.copy(alpha = 0.05f),
                        topLeft = Offset(x, y),
                        size = Size(barWidth, barHeight),
                        cornerRadius = CornerRadius(4.dp.toPx(), 4.dp.toPx())
                    )
                }
            }

            Spacer(Modifier.height(12.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("12 AM", fontSize = 9.sp, color = TextDim, fontWeight = FontWeight.Black)
                Text("12 PM", fontSize = 9.sp, color = TextDim, fontWeight = FontWeight.Black)
                Text("11 PM", fontSize = 9.sp, color = TextDim, fontWeight = FontWeight.Black)
            }
        }
    }
}

@Composable
private fun InsightsRow(vm: HistoryViewModel, onInfo: (String, String) -> Unit) {
    val insights by vm.insights.collectAsStateWithLifecycle()

    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        InsightCard(label = "Streak", value = "${insights.currentStreak}", suffix = "days", icon = Icons.Default.Whatshot, modifier = Modifier.weight(1f), color = Color(0xFFF59E0B),
            onInfo = { onInfo("Tracking Streak", "Consecutive days logging within your set limits. Reaching milestones increases your rank and XP multiplier.") })
        InsightCard(label = "Spent", value = String.format(Locale.getDefault(), "$%.2f", insights.totalSavings), suffix = "total", icon = Icons.Default.AccountBalanceWallet, modifier = Modifier.weight(1f), color = Color(0xFF10B981),
            onInfo = { onInfo("Economic Impact", "Total investment in tracked items. Use the Control panel to update price per unit for precise calculation.") })
        InsightCard(label = "Health", value = "${insights.lifeLostMinutes / 60}h ${insights.lifeLostMinutes % 60}m", suffix = "lost", icon = Icons.Default.Favorite, modifier = Modifier.weight(1f), color = DangerColor,
            onInfo = { onInfo("Vitality Impact", "Cumulative physiological cost estimated based on log frequency. Every entry tracked affects your long-term health metrics.") })
    }
}

@Composable
private fun InsightCard(label: String, value: String, suffix: String, icon: androidx.compose.ui.graphics.vector.ImageVector, color: Color, modifier: Modifier = Modifier, onInfo: () -> Unit) {
    val scale = remember { Animatable(0.8f) }
    LaunchedEffect(Unit) { scale.animateTo(1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow)) }

    Card(
        modifier = modifier.graphicsLayer { scaleX = scale.value; scaleY = scale.value }.bounceClick(onClick = onInfo),
        shape = RoundedCornerShape(TabakDesign.cornerMedium),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        border = BorderStroke(1.dp, BorderSubtle)
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, null, tint = color.copy(alpha = 0.8f), modifier = Modifier.size(20.dp).weight(1f, false))
                Spacer(Modifier.weight(1f))
                InfoMarker(onClick = onInfo)
            }
            Spacer(Modifier.height(12.dp))
            Text(value, fontWeight = FontWeight.Black, fontSize = 22.sp, color = TextMain)
            Text(suffix, fontSize = 13.sp, color = TextMuted, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            Text(label.uppercase(), fontSize = 9.sp, color = TextDim, fontWeight = FontWeight.Black, letterSpacing = 1.5.sp)
        }
    }
}

@Composable
private fun DateBundle(log: DailyLog, configs: List<CounterConfig>, isToday: Boolean, isExpanded: Boolean, onToggle: () -> Unit, onEdit: (String) -> Unit, onDelete: (String) -> Unit) {
    val dateDisplay = remember(log.logDate, isToday) { if (isToday) "Today" else try { LocalDate.parse(log.logDate).format(DateTimeFormatter.ofPattern("EEEE, MMM d", Locale.getDefault())) } catch (_: Exception) { log.logDate } }
    val totalActivity = remember(log.counts) { log.counts.values.sum() }
    val overLimit = remember(log.counts, configs) { configs.any { (log.counts[it.id] ?: 0) > it.limit } }

    Card(
        modifier = Modifier.fillMaxWidth().clickable { onToggle() }.animateContentSize(),
        shape = RoundedCornerShape(TabakDesign.cornerMedium),
        colors = CardDefaults.cardColors(if (isToday) Accent.copy(alpha = .04f) else BgCard),
        border = BorderStroke(1.dp, if (overLimit) DangerColor.copy(alpha = 0.3f) else if (isToday) Accent.copy(alpha = 0.2f) else BorderSubtle)) {
        Column(Modifier.padding(24.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(dateDisplay, fontWeight = FontWeight.Black, fontSize = 18.sp, color = if (isToday) Accent else TextMain)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("$totalActivity logs recorded", fontSize = 13.sp, color = TextMuted, fontWeight = FontWeight.Bold)
                        if (overLimit) Box(Modifier.padding(start = 8.dp).size(6.dp).background(DangerColor, CircleShape))
                    }
                }
                Icon(if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown, null, tint = if (isToday) Accent else TextDim, modifier = Modifier.size(28.dp))
            }
            if (isExpanded) {
                Column(Modifier.padding(top = 24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    configs.forEach { config ->
                        val count = log.counts[config.id] ?: 0
                        if (count > 0 || isToday) HistoryRowItem(config, count, onEdit = { onEdit(config.id) }, onDelete = { onDelete(config.id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun HistoryRowItem(config: CounterConfig, count: Int, onEdit: () -> Unit, onDelete: () -> Unit) {
    val overLimit = count > config.limit
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.weight(1f)) {
            Text(config.displayName.lowercase(), fontSize = 15.sp, color = TextMain, fontWeight = FontWeight.Bold)
            Text("Limit: ${config.limit}", fontSize = 11.sp, color = TextDim, fontWeight = FontWeight.Bold)
        }
        Text("$count", fontWeight = FontWeight.Black, fontSize = 24.sp, color = if (overLimit) DangerColor else Accent)
        Spacer(Modifier.width(16.dp))
        Row {
            IconButton(onEdit, Modifier.size(36.dp).background(TextMain.copy(alpha = 0.03f), CircleShape)) { Icon(Icons.Default.Edit, null, tint = TextDim, modifier = Modifier.size(16.dp)) }
            Spacer(Modifier.width(8.dp))
            IconButton(onDelete, Modifier.size(36.dp).background(DangerColor.copy(alpha = 0.03f), CircleShape)) { Icon(Icons.Default.Delete, null, tint = DangerColor.copy(alpha = 0.4f), modifier = Modifier.size(16.dp)) }
        }
    }
}

@Composable
private fun StockChart(logs: List<DailyLog>, configs: List<CounterConfig>, selectedId: String, timeframe: ChartTimeframe, onSelectCounter: (String) -> Unit, onSelectTimeframe: (ChartTimeframe) -> Unit) {
    val selectedConfig = configs.find { it.id == selectedId }
    val limit = selectedConfig?.limit ?: 20
    var showMenu by remember { mutableStateOf(false) }
    val chartData = remember(logs, selectedId, timeframe) {
        if (timeframe == ChartTimeframe.DAY) { logs.sortedBy { it.logDate }.takeLast(7).map { ChartPoint(it.counts[selectedId] ?: 0, try { LocalDate.parse(it.logDate).format(DateTimeFormatter.ofPattern("EEE")).take(2).lowercase() } catch (_: Exception) { "" }) }
        } else { val weeks = mutableListOf<ChartPoint>(); for (i in 0 until 5) { val weekStart = LocalDate.now().minusWeeks(i.toLong()).with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)); val weekEnd = weekStart.plusDays(6); val sum = logs.filter { val d = try { LocalDate.parse(it.logDate) } catch (_: Exception) { null }; d != null && !d.isBefore(weekStart) && !d.isAfter(weekEnd) }.sumOf { it.counts[selectedId] ?: 0 }; weeks.add(ChartPoint(sum, "w${5-i}")) }; weeks.reversed() }
    }
    val chartLimit = if (timeframe == ChartTimeframe.WEEK) limit * 7 else limit
    val maxVal by remember(chartData, chartLimit) { derivedStateOf { ((chartData.maxOfOrNull { it.value } ?: 1).coerceAtLeast(chartLimit).coerceAtLeast(1) * 1.25f).roundToInt() } }
    val avgVal by remember { derivedStateOf { if (chartData.isEmpty()) 0f else chartData.map { it.value }.average().toFloat() } }
    val pathProgress = remember { Animatable(0f) }
    LaunchedEffect(chartData, selectedId, timeframe) { pathProgress.snapTo(0f); pathProgress.animateTo(1f, animationSpec = tween(1200, easing = FastOutSlowInEasing)) }

    val accentColor = Accent
    val bgCardColor = BgCard
    val dangerColor = DangerColor
    val textDimColor = TextDim
    val textMutedColor = TextMuted

    Card(modifier = Modifier.fillMaxWidth().shadow(TabakDesign.cardElevation, RoundedCornerShape(TabakDesign.cornerLarge), ambientColor = Color.Black.copy(alpha = TabakDesign.shadowAlpha)), shape = RoundedCornerShape(TabakDesign.cornerLarge), colors = CardDefaults.cardColors(containerColor = BgCard), border = BorderStroke(1.dp, BorderSubtle)) {
        Column(Modifier.padding(24.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("TREND ANALYSIS", fontSize = 11.sp, color = TextMuted, letterSpacing = 2.sp, fontWeight = FontWeight.Black)
                    Text("${selectedConfig?.displayName?.lowercase() ?: "history"}", fontWeight = FontWeight.Black, fontSize = 22.sp, color = Accent)
                }
                Box {
                    IconButton(onClick = { showMenu = true }, modifier = Modifier.size(40.dp).background(Accent.copy(alpha = 0.08f), CircleShape)) { Icon(Icons.Default.Tune, null, tint = Accent, modifier = Modifier.size(20.dp)) }
                    DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }, modifier = Modifier.background(BgPanel).border(1.dp, BorderSubtle, RoundedCornerShape(12.dp))) {
                        Text("TRACKER", fontSize = 11.sp, color = TextMuted, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), fontWeight = FontWeight.Black)
                        configs.forEach { config -> DropdownMenuItem(text = { Text(config.displayName.lowercase(), fontSize = 15.sp, color = if (config.id == selectedId) Accent else TextMain, fontWeight = if (config.id == selectedId) FontWeight.Black else FontWeight.Normal) }, onClick = { onSelectCounter(config.id); showMenu = false }) }
                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = BorderSubtle)
                        ChartTimeframe.entries.forEach { tf -> DropdownMenuItem(text = { Text(tf.name.lowercase(), fontSize = 15.sp, color = if (timeframe == tf) Accent else TextMain, fontWeight = if (timeframe == tf) FontWeight.Black else FontWeight.Normal) }, onClick = { onSelectTimeframe(tf); showMenu = false }) }
                    }
                }
            }
            Spacer(Modifier.height(48.dp))
            Canvas(modifier = Modifier.fillMaxWidth().height(180.dp).clipToBounds()) {
                val width = size.width; val height = size.height; val numPoints = chartData.size; if (numPoints < 2) return@Canvas
                val spaceX = width / (numPoints - 1)
                
                // Add vertical padding to prevent "breaking out"
                val topPadding = 16.dp.toPx()
                val bottomPadding = 8.dp.toPx()
                val usableHeight = height - topPadding - bottomPadding
                
                fun getY(value: Int) = height - bottomPadding - (value.toFloat() / maxVal * usableHeight)

                val limitY = getY(if (timeframe == ChartTimeframe.WEEK) limit * 7 else limit)
                if (limitY in 0f..height) drawLine(color = textDimColor.copy(alpha = 0.4f), start = Offset(0f, limitY), end = Offset(width, limitY), strokeWidth = 1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(25f, 20f)))
                val avgY = getY(avgVal.roundToInt())
                if (avgY in 0f..height) drawLine(color = accentColor.copy(alpha = 0.2f), start = Offset(0f, avgY), end = Offset(width, avgY), strokeWidth = 2.dp.toPx())
                val points = chartData.mapIndexed { index, point -> Offset(index * spaceX, getY(point.value)) }
                val path = Path().apply { moveTo(points[0].x, points[0].y); for (i in 1 until points.size) { val prev = points[i - 1]; val current = points[i]; cubicTo(prev.x + (current.x - prev.x) / 2, prev.y, prev.x + (current.x - prev.x) / 2, current.y, current.x, current.y) } }
                clipRect(right = width * pathProgress.value) { val fillPath = Path().apply { addPath(path); lineTo(points.last().x, height); lineTo(points.first().x, height); close() }; drawPath(fillPath, brush = Brush.verticalGradient(listOf(accentColor.copy(alpha = 0.4f), Color.Transparent))); drawPath(path, color = accentColor, style = Stroke(width = 6.dp.toPx(), cap = StrokeCap.Round)) }
                if (pathProgress.value > 0.99f) points.forEachIndexed { idx, point -> val overLimit = chartData[idx].value > (if (timeframe == ChartTimeframe.WEEK) limit * 7 else limit); drawCircle(color = bgCardColor, radius = 8.dp.toPx(), center = point); drawCircle(color = if (overLimit) dangerColor else accentColor, radius = 5.dp.toPx(), center = point) }
            }
            Spacer(Modifier.height(24.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { chartData.forEach { point -> Text(text = point.label, fontSize = 11.sp, color = textDimColor, fontWeight = FontWeight.Black) } }
            Spacer(Modifier.height(24.dp))
            Row(verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(12.dp).background(accentColor.copy(alpha = 0.3f), CircleShape)); Spacer(Modifier.width(12.dp)); Text(text = "AVERAGE: ${avgVal.roundToInt()} | TARGET: ${if (timeframe == ChartTimeframe.WEEK) limit * 7 else limit}", fontSize = 13.sp, color = textMutedColor, fontWeight = FontWeight.Bold) }
        }
    }
}

@Composable
private fun EditDialog(log: DailyLog, name: String, cid: String, onDismiss: () -> Unit, onSave: (Int) -> Unit) {
    var value by remember { mutableStateOf((log.counts[cid] ?: 0).toString()) }
    Dialog(onDismiss) {
        Card(modifier = Modifier.fillMaxWidth().padding(16.dp), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(BgPanel), border = BorderStroke(1.dp, BorderMid)) {
            Column(Modifier.padding(32.dp)) {
                Text("Manual Correction", fontWeight = FontWeight.Black, fontSize = 24.sp, color = TextMain)
                Text("${name.lowercase()} for ${log.logDate}", fontSize = 14.sp, color = TextMuted, modifier = Modifier.padding(top = 4.dp, bottom = 32.dp), fontWeight = FontWeight.Bold)
                OutlinedTextField(value, { value = it.filter { c -> c.isDigit() } }, label = { Text("Update Count") }, singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, unfocusedBorderColor = BorderSubtle, cursorColor = Accent, focusedTextColor = TextMain, unfocusedTextColor = TextMain, focusedContainerColor = BgBase, unfocusedContainerColor = BgBase, focusedLabelColor = Accent, unfocusedLabelColor = TextMuted))
                Row(Modifier.padding(top = 32.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    OutlinedButton(onDismiss, Modifier.weight(1f), shape = RoundedCornerShape(14.dp)) { Text("CANCEL", fontWeight = FontWeight.Black) }
                    Button({ onSave(value.toIntOrNull() ?: 0) }, Modifier.weight(1f), shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = AccentFg)) { Text("SAVE", fontWeight = FontWeight.Black) }
                }
            }
        }
    }
}
