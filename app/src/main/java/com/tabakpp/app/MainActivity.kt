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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
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
import com.tabakpp.app.data.model.DailyLog
import com.tabakpp.app.domain.SmokingCalculator
import com.tabakpp.app.util.NotificationHelper
import dagger.hilt.android.AndroidEntryPoint
import kotlin.math.roundToInt

enum class Tab(val icon: ImageVector, val labelRes: Int) {
    TRACKER(Icons.Default.Home, R.string.tracker_label),
    HISTORY(Icons.Default.DateRange, R.string.history_label),
    SETTINGS(Icons.Default.Settings, R.string.settings_label)
}

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        NotificationHelper.createChannel(this)
        setContent {
            val viewModel: MainViewModel = viewModel()
            
            val permissionLauncher = rememberLauncherForActivityResult(
                ActivityResultContracts.RequestPermission()
            ) { }
            
            LaunchedEffect(Unit) {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                    permissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
                }
            }

            TabakApp(viewModel)
        }
    }
}

@Composable
fun TabakApp(viewModel: MainViewModel) {
    val authState by viewModel.authState.collectAsState()
    val isDark by viewModel.isDarkMode.collectAsState()
    val fontScale by viewModel.fontSizeMultiplier.collectAsState()

    TabakTheme(isDark = isDark, fontScale = fontScale) {
        Crossfade(targetState = authState, label = "auth_switch") { state ->
            when (state) {
                is AuthState.Loading -> LoadingScreen()
                is AuthState.Unauthenticated -> AuthScreen(viewModel)
                is AuthState.Authenticated -> MainApp(viewModel)
            }
        }
    }
}

@Composable
fun MainApp(viewModel: MainViewModel) {
    var currentTab by remember { mutableStateOf(Tab.TRACKER) }
    val logs by viewModel.logs.collectAsState()

    val density = LocalDensity.current
    val statusBarHeight = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val statusBarHeightPx = with(density) { statusBarHeight.toPx() }
    val totalHeaderHeightPx = with(density) { 140.dp.toPx() }

    val headerOffsetHeightPx = remember { mutableStateOf(0f) }

    val nestedScrollConnection = remember {
        object : NestedScrollConnection {
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                val delta = available.y
                val newOffset = headerOffsetHeightPx.value + delta
                headerOffsetHeightPx.value = newOffset.coerceIn(-(totalHeaderHeightPx - statusBarHeightPx), 0f)
                return Offset.Zero
            }
        }
    }

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = BgBase.copy(alpha = 0.95f),
                tonalElevation = 0.dp,
                modifier = Modifier.clipToBounds(),
                windowInsets = WindowInsets.navigationBars
            ) {
                Tab.entries.forEach { tab ->
                    val label = stringResource(tab.labelRes)
                    NavigationBarItem(
                        selected = currentTab == tab,
                        onClick = {
                            currentTab = tab
                            headerOffsetHeightPx.value = 0f
                        },
                        icon = {
                            Icon(
                                tab.icon,
                                contentDescription = label,
                                tint = if (currentTab == tab) Accent else TextMuted
                            )
                        },
                        label = {
                            Text(
                                label.lowercase(),
                                fontFamily = FontFamily.Monospace,
                                fontSize = 10.sp,
                                fontWeight = if (currentTab == tab) FontWeight.Bold else FontWeight.Normal,
                                color = if (currentTab == tab) Accent else TextMuted
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(indicatorColor = Color.Transparent)
                    )
                }
            }
        }
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(bottom = padding.calculateBottomPadding())) {
            Box(Modifier.fillMaxSize().nestedScroll(nestedScrollConnection)) {
                when (currentTab) {
                    Tab.TRACKER -> TrackerScreen(viewModel)
                    Tab.HISTORY -> HistoryScreen(viewModel)
                    Tab.SETTINGS -> SettingsScreen(viewModel, logs)
                }
            }

            // Header Overlay
            val headerAlpha = (1f + (headerOffsetHeightPx.value / (totalHeaderHeightPx - statusBarHeightPx))).coerceIn(0f, 1f)
            
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .offset { IntOffset(x = 0, y = headerOffsetHeightPx.value.roundToInt()) }
                    .background(
                        Brush.verticalGradient(
                            listOf(BgBase, BgBase.copy(alpha = 0.9f), Color.Transparent)
                        )
                    )
                    .statusBarsPadding()
                    .padding(horizontal = 24.dp),
                verticalArrangement = Arrangement.Center
            ) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(Modifier.graphicsLayer { alpha = headerAlpha }) {
                        Text(
                            text = stringResource(R.string.app_name),
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Black,
                            fontSize = 28.sp,
                            color = TextMain,
                            letterSpacing = (-1).sp
                        )
                        Text(
                            text = stringResource(currentTab.labelRes).lowercase(),
                            fontFamily = FontFamily.Monospace,
                            fontSize = 11.sp,
                            color = Accent,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 2.sp
                        )
                    }

                    if (currentTab == Tab.TRACKER) {
                        IconButton(
                            onClick = { viewModel.loadData() },
                            modifier = Modifier
                                .size(40.dp)
                                .background(TextMain.copy(alpha = 0.03f), CircleShape)
                        ) {
                            Icon(
                                Icons.Default.Refresh,
                                null,
                                tint = TextMain.copy(alpha = 0.5f),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun LoadingScreen() {
    Box(Modifier.fillMaxSize().background(BgBase), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = Accent, strokeWidth = 2.dp, modifier = Modifier.size(32.dp))
    }
}
