package com.tabakpp.app

import android.os.Bundle
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
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
class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        NotificationHelper.createChannel(this)
        
        val shortcutAction = intent.getStringExtra("shortcut_action")

        setContent {
            val viewModel: MainViewModel = hiltViewModel()
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

            LaunchedEffect(shortcutAction) {
                if (shortcutAction == "log_cigarettes") {
                    viewModel.increment("cigarettes")
                    Toast.makeText(this@MainActivity, "Logged!", Toast.LENGTH_SHORT).show()
                }
            }

            LaunchedEffect(isBiometricEnabled) {
                if (isBiometricEnabled && !isUnlocked) {
                    showBiometricPrompt(viewModel)
                } else {
                    viewModel.setUnlocked(true)
                }
            }

            TabakTheme(
                isDark = viewModel.isDarkMode.collectAsState().value,
                fontScale = viewModel.fontScale.collectAsState().value
            ) {
                Surface(Modifier.fillMaxSize(), color = BgBase) {
                    AnimatedContent(
                        targetState = isUnlocked || !isBiometricEnabled,
                        transitionSpec = { fadeIn(tween(500)) togetherWith fadeOut(tween(500)) },
                        label = "lock_gate"
                    ) { unlocked ->
                        if (unlocked) {
                            TabakApp(viewModel)
                        } else {
                            LockScreen { showBiometricPrompt(viewModel) }
                        }
                    }
                }
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
            Icon(Icons.Default.Lock, null, tint = Accent, modifier = Modifier.size(72.dp))
            Spacer(Modifier.height(24.dp))
            Text("Vault Locked", fontWeight = FontWeight.Black, fontSize = 24.sp, color = TextMain)
            Text("Authentication required", fontSize = 14.sp, color = TextMuted)
            Spacer(Modifier.height(48.dp))
            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(containerColor = Accent),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.height(56.dp).width(200.dp)
            ) {
                Text("Unlock Now", color = AccentFg, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        }
    }
}

@Composable
fun TabakApp(viewModel: MainViewModel) {
    val authState by viewModel.authState.collectAsState()

    Crossfade(targetState = authState, label = "auth_switch", animationSpec = tween(600)) { state ->
        when (state) {
            is AuthState.Loading -> LoadingScreen()
            is AuthState.Unauthenticated -> AuthScreen(viewModel)
            is AuthState.Authenticated -> MainApp(viewModel)
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
                containerColor = BgBase.copy(alpha = 0.98f),
                tonalElevation = 0.dp,
                modifier = Modifier.clipToBounds().border(0.5.dp, BorderSubtle, RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)).clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)),
                windowInsets = WindowInsets.navigationBars
            ) {
                 Tab.entries.forEach { tab ->
                    val label = stringResource(tab.labelRes)
                    val selected = currentTab == tab
                    val animatedSize by animateFloatAsState(if (selected) 1.2f else 1f, label = "nav_scale")
                    
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            currentTab = tab
                            headerOffsetHeightPx.value = 0f
                        },
                        icon = {
                            Icon(
                                tab.icon,
                                contentDescription = label,
                                tint = if (selected) Accent else TextMuted,
                                modifier = Modifier.graphicsLayer { scaleX = animatedSize; scaleY = animatedSize }
                            )
                        },
                        label = {
                            Text(
                                label.lowercase(),
                                fontFamily = FontFamily.SansSerif,
                                fontSize = 10.sp,
                                fontWeight = if (selected) FontWeight.Black else FontWeight.Medium,
                                color = if (selected) Accent else TextMuted
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
                            listOf(BgBase, BgBase.copy(alpha = 0.95f), BgBase.copy(alpha = 0.6f), Color.Transparent)
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
                    Column(Modifier.graphicsLayer { 
                        alpha = headerAlpha
                        translationY = (1f - headerAlpha) * (-20f)
                    }) {
                        Text(
                            text = stringResource(R.string.app_name),
                            fontFamily = FontFamily.SansSerif,
                            fontWeight = FontWeight.Black,
                            fontSize = 32.sp,
                            color = TextMain,
                            letterSpacing = (-1.5).sp
                        )
                        Text(
                            text = stringResource(currentTab.labelRes).lowercase(),
                            fontFamily = FontFamily.SansSerif,
                            fontSize = 12.sp,
                            color = Accent,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 2.sp
                        )
                    }

                    if (currentTab == Tab.TRACKER) {
                        IconButton(
                            onClick = { viewModel.loadData() },
                            modifier = Modifier
                                .size(44.dp)
                                .background(TextMain.copy(alpha = 0.05f), CircleShape)
                                .border(1.dp, BorderSubtle, CircleShape)
                        ) {
                            Icon(
                                Icons.Default.Refresh,
                                null,
                                tint = TextMain.copy(alpha = 0.7f),
                                modifier = Modifier.size(20.dp)
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
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
             CircularProgressIndicator(color = Accent, strokeWidth = 3.dp, modifier = Modifier.size(48.dp))
             Spacer(Modifier.height(16.dp))
             Text("syncing...", fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
        }
    }
}
