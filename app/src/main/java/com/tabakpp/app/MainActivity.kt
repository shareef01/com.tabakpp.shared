package com.tabakpp.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tabakpp.app.data.DashboardLayout
import com.tabakpp.app.ui.*
import com.tabakpp.app.ui.theme.*
import com.tabakpp.app.viewmodel.AuthState
import com.tabakpp.app.viewmodel.MainViewModel
import com.tabakpp.app.viewmodel.UiMessage
import com.tabakpp.shared.data.DailyLog
import com.tabakpp.shared.domain.SmokingCalculator
import kotlin.math.roundToInt

enum class Tab(val icon: ImageVector, val label: String) {
    TRACKER(Icons.Default.Home, "Today"),
    HISTORY(Icons.Default.DateRange, "History"),
    SETTINGS(Icons.Default.Settings, "Settings")
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { TabakApp() }
    }
}

@Composable
fun TabakApp() {
    val vm: MainViewModel = viewModel()
    val authState by vm.authState.collectAsState()
    val isDark by vm.isDarkMode.collectAsState()
    val fontScale by vm.fontSizeMultiplier.collectAsState()
    val hasLaunchedBefore by vm.hasLaunchedBefore.collectAsState()

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ -> 
        vm.markLaunched()
    }

    LaunchedEffect(hasLaunchedBefore) {
        if (!hasLaunchedBefore) {
            val permissions = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                arrayOf(
                    android.Manifest.permission.POST_NOTIFICATIONS,
                    android.Manifest.permission.READ_MEDIA_IMAGES
                )
            } else if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                arrayOf(android.Manifest.permission.READ_EXTERNAL_STORAGE)
            } else {
                arrayOf(
                    android.Manifest.permission.READ_EXTERNAL_STORAGE,
                    android.Manifest.permission.WRITE_EXTERNAL_STORAGE
                )
            }
            permissionLauncher.launch(permissions)
        }
    }

    TabakTheme(isDark = isDark, fontScale = fontScale) {
        AnimatedContent(targetState = authState, transitionSpec = { fadeIn() togetherWith fadeOut() }, label = "root") { state ->
            when (state) {
                AuthState.Loading -> LoadingScreen()
                AuthState.Unauthenticated -> AuthScreen(vm)
                is AuthState.Authenticated -> MainApp(vm)
            }
        }
    }
}

@Composable
fun MainApp(vm: MainViewModel) {
    var currentTab by remember { mutableStateOf(Tab.TRACKER) }
    var showAboutDialog by remember { mutableStateOf(false) }
    val logs by vm.logs.collectAsState()
    val configs by vm.counterConfigs.collectAsState()
    val msgState by vm.message.collectAsState()
    val layout by vm.dashboardLayout.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    // Summary Data for the "Smart Badge"
    val todayLog by vm.todayLog.collectAsState()
    val summaryText = remember(currentTab, todayLog, logs, configs) {
        when (currentTab) {
            Tab.TRACKER -> {
                val remaining = SmokingCalculator.getRemainingCount(todayLog, configs)
                if (remaining >= 0) "$remaining left" else "${-remaining} over"
            }
            Tab.HISTORY -> {
                val avg = SmokingCalculator.getWeekAverage(logs).roundToInt()
                "avg: $avg"
            }
            Tab.SETTINGS -> "active"
        }
    }

    // DYNAMIC COLLAPSIBLE HEADER LOGIC
    val density = LocalDensity.current
    val statusBarHeight = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val contentHeaderHeight = 64.dp
    val totalHeaderHeight = contentHeaderHeight + statusBarHeight
    val totalHeaderHeightPx = with(density) { totalHeaderHeight.toPx() }
    val statusBarHeightPx = with(density) { statusBarHeight.toPx() }
    
    val headerOffsetHeightPx = remember { mutableStateOf(0f) }

    val nestedScrollConnection = remember {
        object : NestedScrollConnection {
            override fun onPreScroll(available: androidx.compose.ui.geometry.Offset, source: NestedScrollSource): androidx.compose.ui.geometry.Offset {
                val delta = available.y
                val newOffset = headerOffsetHeightPx.value + delta
                headerOffsetHeightPx.value = newOffset.coerceIn(-(totalHeaderHeightPx - statusBarHeightPx), 0f)
                return androidx.compose.ui.geometry.Offset.Zero
            }
        }
    }

    LaunchedEffect(msgState) {
        val text = when (val msg = msgState) {
            is UiMessage.Success -> msg.msg
            is UiMessage.Error -> msg.msg
            else -> ""
        }
        if (text.isNotEmpty()) {
            snackbarHostState.showSnackbar(text, duration = SnackbarDuration.Short)
            vm.clearMessage()
        }
    }

    Scaffold(
        modifier = Modifier.nestedScroll(nestedScrollConnection),
        snackbarHost = { SnackbarHost(snackbarHostState) { data ->
            Snackbar(snackbarData = data, containerColor = TextMain, contentColor = BgBase, shape = RoundedCornerShape(100.dp))
        } },
        bottomBar = {
            NavigationBar(
                containerColor = BgPanel.copy(alpha = 0.98f), 
                tonalElevation = 0.dp,
                modifier = Modifier
                    .padding(horizontal = 24.dp, vertical = 20.dp)
                    .clip(RoundedCornerShape(32.dp))
                    .border(1.dp, BorderSubtle, RoundedCornerShape(32.dp)),
                windowInsets = WindowInsets(0)
            ) {
                Tab.entries.forEach { tab ->
                    val isSelected = currentTab == tab
                    NavigationBarItem(
                        selected = isSelected,
                        onClick = { 
                            currentTab = tab
                            headerOffsetHeightPx.value = 0f
                        },
                        icon = { 
                            Icon(
                                imageVector = tab.icon, 
                                contentDescription = tab.label, 
                                modifier = Modifier.size(if (isSelected) 36.dp else 28.dp),
                                tint = if (isSelected) Accent else TextMuted.copy(alpha = 0.6f)
                            ) 
                        },
                        label = null,
                        colors = NavigationBarItemDefaults.colors(indicatorColor = Color.Transparent)
                    )
                }
            }
        },
        containerColor = BgBase
    ) { padding ->
        Box(Modifier.fillMaxSize()) {
            // MAIN CONTENT
            Box(Modifier.fillMaxSize().padding(bottom = padding.calculateBottomPadding())) {
                AnimatedContent(targetState = currentTab, transitionSpec = { fadeIn() togetherWith fadeOut() }, label = "tab") { targetTab ->
                    when (targetTab) {
                        Tab.TRACKER -> TrackerScreen(vm)
                        Tab.HISTORY -> HistoryScreen(vm)
                        Tab.SETTINGS -> SettingsScreen(vm, logs)
                    }
                }
            }

            // REFINED CLEAN HEADER
            val headerAlpha = (1f + (headerOffsetHeightPx.value / (totalHeaderHeightPx - statusBarHeightPx))).coerceIn(0f, 1f)
            
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(totalHeaderHeight)
                    .offset { IntOffset(x = 0, y = headerOffsetHeightPx.value.roundToInt()) }
                    .background(Brush.verticalGradient(listOf(BgPanel, BgPanel.copy(alpha = 0.9f), Color.Transparent)))
                    .clipToBounds()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .statusBarsPadding()
                        .padding(horizontal = 24.dp)
                        .alpha(headerAlpha),
                    contentAlignment = Alignment.Center
                ) {
                    // Left: Layout Toggle or Info Button
                    Box(modifier = Modifier.align(Alignment.CenterStart)) {
                        if (currentTab == Tab.TRACKER) {
                            IconButton(
                                onClick = { vm.setDashboardLayout(if (layout == DashboardLayout.LARGE) DashboardLayout.COMPACT else DashboardLayout.LARGE) },
                                modifier = Modifier.size(40.dp)
                            ) {
                                Icon(if (layout == DashboardLayout.LARGE) Icons.Default.GridView else Icons.Default.ViewStream, null, tint = Accent, modifier = Modifier.size(24.dp))
                            }
                        } else if (currentTab == Tab.SETTINGS) {
                            IconButton(
                                onClick = { showAboutDialog = true },
                                modifier = Modifier.size(40.dp)
                            ) {
                                Icon(Icons.Default.Info, "About", tint = Accent, modifier = Modifier.size(24.dp))
                            }
                        }
                    }

                    // Center: Logo
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(36.dp), contentAlignment = Alignment.Center) {
                            Box(Modifier.size(28.dp).background(Accent.copy(alpha = 0.1f), CircleShape))
                            Text("++", color = Accent, fontWeight = FontWeight.Black, fontSize = 16.sp, fontFamily = FontFamily.Monospace)
                        }
                        Spacer(Modifier.width(12.dp))
                        Text("tabak++", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = TextMain)
                    }

                    // Right: Smart Badge
                    Box(
                        modifier = Modifier
                            .align(Alignment.CenterEnd)
                            .clip(RoundedCornerShape(100.dp))
                            .background(Accent.copy(alpha = 0.05f))
                            .border(1.dp, Accent.copy(alpha = 0.15f), RoundedCornerShape(100.dp))
                            .padding(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Text(text = summaryText, fontFamily = FontFamily.Monospace, fontSize = 10.sp, color = Accent, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                    }
                }
            }
        }
    }

    if (showAboutDialog) {
        val context = androidx.compose.ui.platform.LocalContext.current
        AlertDialog(
            onDismissRequest = { showAboutDialog = false },
            containerColor = BgCard,
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(24.dp).background(Accent.copy(alpha = 0.1f), CircleShape), contentAlignment = Alignment.Center) {
                        Text("++", color = Accent, fontWeight = FontWeight.Black, fontSize = 10.sp)
                    }
                    Spacer(Modifier.width(12.dp))
                    Text("about tabak++", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, color = TextMain)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text(
                        "tabak++ is a minimalist habit tracking utility designed to help you monitor and reduce daily consumption through clear visual data.",
                        fontSize = 13.sp, color = TextMuted, lineHeight = 18.sp
                    )
                    Text(
                        "version 1.0.0\nbuilt with modern android architecture.",
                        fontSize = 11.sp, color = TextDim, fontFamily = FontFamily.Monospace
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val intent = android.content.Intent(android.content.Intent.ACTION_SENDTO).apply {
                            data = android.net.Uri.parse("mailto:shareef2189@gmail.com")
                            putExtra(android.content.Intent.EXTRA_SUBJECT, "tabak++ support")
                        }
                        try { context.startActivity(intent) } catch (_: Exception) {}
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = AccentFg),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.Email, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Contact Developer", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton({ showAboutDialog = false }) { Text("Close", color = TextMain) }
            }
        )
    }
}

@Composable
private fun LoadingScreen() =
    Box(Modifier.fillMaxSize().background(BgBase), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(color = Accent, strokeWidth = 2.dp, modifier = Modifier.size(32.dp))
            Spacer(Modifier.height(16.dp))
            Text("tabak++", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Accent)
        }
    }
