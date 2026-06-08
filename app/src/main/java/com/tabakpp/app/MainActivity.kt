package com.tabakpp.app

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
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
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.hilt.navigation.compose.hiltViewModel
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
    HISTORY(Icons.Default.History, R.string.history_label),
    SETTINGS(Icons.Default.Settings, R.string.settings_label)
}

@AndroidEntryPoint
class MainActivity : FragmentActivity() { // Changed to FragmentActivity for Biometric
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        NotificationHelper.createChannel(this)
        
        val shortcutAction = intent.getStringExtra("shortcut_action")

        setContent {
            val viewModel: MainViewModel = hiltViewModel()
            
            LaunchedEffect(shortcutAction) {
                if (shortcutAction == "log_cigarettes") {
                    viewModel.increment("cigarettes")
                    Toast.makeText(this@MainActivity, "Logged!", Toast.LENGTH_SHORT).show()
                }
            }
            val isUnlocked by viewModel.isUnlocked.collectAsState()
            val isBiometricEnabled by viewModel.isBiometricEnabled.collectAsState()

            val permissionLauncher = rememberLauncherForActivityResult(
                ActivityResultContracts.RequestPermission()
            ) { }
            
            LaunchedEffect(Unit) {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                    permissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
                }
            }

            LaunchedEffect(isBiometricEnabled) {
                if (isBiometricEnabled && !isUnlocked) {
                    showBiometricPrompt(viewModel)
                } else {
                    viewModel.setUnlocked(true)
                }
            }

            if (isUnlocked || !isBiometricEnabled) {
                TabakApp(viewModel)
            } else {
                LockScreen { showBiometricPrompt(viewModel) }
            }
        }
    }

    private fun showBiometricPrompt(viewModel: MainViewModel) {
        val executor = ContextCompat.getMainExecutor(this)
        val biometricPrompt = BiometricPrompt(this, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    viewModel.setUnlocked(true)
                }
            })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("tabak++ Lock")
            .setSubtitle("Unlock to access your tracking")
            .setNegativeButtonText("Cancel")
            .build()

        biometricPrompt.authenticate(promptInfo)
    }
}

@Composable
fun LockScreen(onRetry: () -> Unit) {
    Box(Modifier.fillMaxSize().background(BgBase), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.Lock, null, tint = Accent, modifier = Modifier.size(64.dp))
            Spacer(Modifier.height(24.dp))
            Text("App Locked", fontWeight = FontWeight.Black, fontSize = 20.sp, color = TextMain)
            Spacer(Modifier.height(40.dp))
            Button(onClick = onRetry, colors = ButtonDefaults.buttonColors(containerColor = Accent)) {
                Text("Unlock Now", color = AccentFg, fontWeight = FontWeight.Bold)
            }
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
