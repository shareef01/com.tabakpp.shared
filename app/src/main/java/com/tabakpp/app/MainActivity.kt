package com.tabakpp.app

import android.os.Bundle
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.fragment.app.FragmentActivity
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dagger.hilt.android.AndroidEntryPoint
import com.tabakpp.app.ui.*
import com.tabakpp.app.ui.theme.*
import com.tabakpp.app.util.NotificationHelper
import com.tabakpp.app.viewmodel.AuthState
import com.tabakpp.app.viewmodel.MainViewModel
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

enum class Tab(val icon: ImageVector, val labelRes: Int) {
    TRACKER(Icons.Default.Dashboard, R.string.tracker_label),
    HEALTH(Icons.Default.Favorite, R.string.health_label),
    HISTORY(Icons.Default.Storage, R.string.history_label),
    SETTINGS(Icons.Default.Settings, R.string.settings_label)
}

@AndroidEntryPoint
class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        NotificationHelper.createChannel(this)
        val shortcutAction = intent.getStringExtra("shortcut_action")

        setContent {
            val viewModel: MainViewModel = hiltViewModel()

            val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }

            LaunchedEffect(Unit) {
                if (shortcutAction == "log_cigarette") viewModel.increment("cigarettes")
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) permissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
            }

            TabakTheme(isDark = viewModel.isDarkMode.collectAsStateWithLifecycle().value, fontScale = viewModel.fontScale.collectAsStateWithLifecycle().value, accentColorHex = viewModel.accentColor.collectAsStateWithLifecycle().value) {
                Surface(Modifier.fillMaxSize(), color = BgBase) {
                    TabakApp(viewModel)
                }
            }
        }
    }
}

@Composable
fun TabakApp(viewModel: MainViewModel) {
    val authState by viewModel.authState.collectAsStateWithLifecycle()
    Crossfade(targetState = authState, label = "auth", animationSpec = tween(600)) { state ->
        when (state) {
            is AuthState.Loading -> LoadingScreen()
            is AuthState.Unauthenticated -> AuthScreen(viewModel)
            is AuthState.Authenticated -> MainApp(viewModel)
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MainApp(viewModel: MainViewModel) {
    val screens = Tab.entries
    val pagerState = rememberPagerState { screens.size }
    val scope = rememberCoroutineScope()
    val logs by viewModel.logs.collectAsStateWithLifecycle()
    val haptic = LocalHapticFeedback.current
    LaunchedEffect(pagerState.currentPage) { haptic.performHapticFeedback(HapticFeedbackType.LongPress) }

    val density = LocalDensity.current
    val statusBarHeight = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val statusBarHeightPx = with(density) { statusBarHeight.toPx() }
    val totalHeaderHeightPx = with(density) { 140.dp.toPx() }
    val headerOffsetHeightPx = remember { mutableStateOf(0f) }
    val nestedScrollConnection = remember { object : NestedScrollConnection { override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset { val delta = available.y; val newOffset = headerOffsetHeightPx.value + delta; headerOffsetHeightPx.value = newOffset.coerceIn(-(totalHeaderHeightPx - statusBarHeightPx), 0f); return Offset.Zero } } }

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = BgBase.copy(alpha = 0.98f), tonalElevation = 0.dp, modifier = Modifier.clipToBounds().border(0.5.dp, BorderSubtle, RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)).clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)), windowInsets = WindowInsets.navigationBars) {
                 Tab.entries.forEach { tab ->
                    val label = stringResource(tab.labelRes); val selected = screens[pagerState.currentPage] == tab; val scale by animateFloatAsState(if (selected) 1.2f else 1f, label = "s")
                    NavigationBarItem(selected = selected, onClick = { scope.launch { pagerState.animateScrollToPage(screens.indexOf(tab)) }; headerOffsetHeightPx.value = 0f }, icon = { Icon(tab.icon, contentDescription = label, tint = if (selected) Accent else TextMuted, modifier = Modifier.graphicsLayer { scaleX = scale; scaleY = scale }) }, label = { Text(label.lowercase(), fontFamily = FontFamily.SansSerif, fontSize = 10.sp, fontWeight = if (selected) FontWeight.Black else FontWeight.Medium, color = if (selected) Accent else TextMuted) }, colors = NavigationBarItemDefaults.colors(indicatorColor = Color.Transparent))
                }
            }
        }
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(bottom = padding.calculateBottomPadding())) {
            HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize().nestedScroll(nestedScrollConnection)) { page ->
                val pageOffset = ((pagerState.currentPage - page) + pagerState.currentPageOffsetFraction).let { if (it < 0) -it else it }
                Box(Modifier.graphicsLayer { val scale = 1f - (pageOffset * 0.12f).coerceIn(0f, 1f); scaleX = scale; scaleY = scale; alpha = 1f - (pageOffset * 0.5f).coerceIn(0f, 1f); translationX = pageOffset * size.width * 0.1f }) {
                    when (screens[page]) {
                        Tab.TRACKER -> TrackerScreen(viewModel)
                        Tab.HEALTH -> HealthScreen(viewModel)
                        Tab.HISTORY -> HistoryScreen(viewModel)
                        Tab.SETTINGS -> SettingsScreen(viewModel, logs)
                    }
                }
            }
            val currentTab = screens[pagerState.currentPage]
            val scrollThreshold = totalHeaderHeightPx - statusBarHeightPx
            
            val bgBase = BgBase
            val headerBrush = remember(bgBase) {
                Brush.verticalGradient(listOf(bgBase, bgBase.copy(alpha = 0.95f), bgBase.copy(alpha = 0.6f), Color.Transparent))
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .offset { IntOffset(x = 0, y = headerOffsetHeightPx.value.roundToInt()) }
                    .background(headerBrush)
                    .statusBarsPadding()
                    .padding(horizontal = 24.dp), 
                verticalArrangement = Arrangement.Center
            ) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.graphicsLayer { 
                        val alpha = (1f + (headerOffsetHeightPx.value / scrollThreshold)).coerceIn(0f, 1f)
                        this.alpha = alpha
                        this.translationY = (1f - alpha) * (-20f) 
                    }) {
                        Text(text = stringResource(R.string.app_name), fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Black, fontSize = 32.sp, color = TextMain, letterSpacing = (-1.5).sp)
                        Text(text = stringResource(currentTab.labelRes).lowercase(), fontFamily = FontFamily.SansSerif, fontSize = 12.sp, color = Accent, fontWeight = FontWeight.Black, letterSpacing = 2.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun LoadingScreen() {
    Box(Modifier.fillMaxSize().background(BgBase), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.size(64.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Accent.copy(alpha = 0.1f), strokeWidth = 3.dp, modifier = Modifier.fillMaxSize())
                CircularProgressIndicator(color = Accent, strokeWidth = 3.dp, modifier = Modifier.fillMaxSize())
            }
            Spacer(Modifier.height(32.dp))
            Text("SYNCING VAULT", fontSize = 11.sp, color = Accent, fontWeight = FontWeight.Black, letterSpacing = 3.sp)
            Text("Updating records from cloud...", fontSize = 13.sp, color = TextMuted, modifier = Modifier.padding(top = 4.dp), fontWeight = FontWeight.Medium)
        }
    }
}
