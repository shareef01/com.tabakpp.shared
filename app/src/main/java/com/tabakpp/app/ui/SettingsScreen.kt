package com.tabakpp.app.ui

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.*
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.*
import androidx.compose.ui.window.Dialog
import androidx.core.content.FileProvider
import androidx.compose.ui.res.stringResource
import com.tabakpp.app.R
import com.tabakpp.app.data.*
import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.CounterType
import com.tabakpp.app.data.model.DailyLog
import com.tabakpp.app.ui.theme.*
import com.tabakpp.app.viewmodel.AuthState
import com.tabakpp.app.viewmodel.MainViewModel
import com.tabakpp.app.viewmodel.UiMessage
import kotlinx.coroutines.launch
import java.io.File

@Composable
fun SettingsScreen(vm: MainViewModel, logs: List<DailyLog>) {
    val msg by vm.message.collectAsState()
    val authState by vm.authState.collectAsState()
    val isDark by vm.isDarkMode.collectAsState()
    val fontScale by vm.fontScale.collectAsState()
    val configs by vm.counterConfigs.collectAsState()
    val widgetCounterId by vm.widgetCounterId.collectAsState()
    val dashboardLayout by vm.dashboardLayout.collectAsState()
    val costPerUnit by vm.costPerUnit.collectAsState()
    val isBiometricEnabled by vm.isBiometricEnabled.collectAsState()
    
    var name by remember { mutableStateOf("") }
    var tempCost by remember { mutableStateOf("") }
    
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showSignOutDialog by remember { mutableStateOf(false) }
    var confirmAction by remember { mutableStateOf<(() -> Unit)?>(null) }
    var confirmTitle by remember { mutableStateOf("") }
    var confirmText by remember { mutableStateOf("") }
    
    var showAddCounter by remember { mutableStateOf(false) }
    var editConfig by remember { mutableStateOf<CounterConfig?>(null) }

    val ctx = LocalContext.current

    LaunchedEffect(authState) {
        if (authState is AuthState.Authenticated) {
            val user = authState as AuthState.Authenticated
            name = user.displayName ?: ""
        }
    }
    
    LaunchedEffect(costPerUnit) {
        tempCost = if (costPerUnit > 0) costPerUnit.toString() else ""
    }

    Column(Modifier.fillMaxSize().background(BgBase).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        
        Spacer(Modifier.statusBarsPadding().height(84.dp))
        if (msg !is UiMessage.None) MessageBanner(msg)

        SCard(stringResource(R.string.tracker_label).uppercase() + " CONFIGURATION") {
            configs.forEach { config ->
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 12.dp)) {
                    Column(Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(config.displayName, fontWeight = FontWeight.Black, color = TextMain, fontSize = 16.sp)
                            if (config.id == widgetCounterId) {
                                Box(Modifier.padding(start = 10.dp).background(Accent.copy(alpha = 0.15f), RoundedCornerShape(6.dp)).padding(horizontal = 6.dp, vertical = 2.dp)) {
                                    Text("WIDGET", fontSize = 8.sp, color = Accent, fontWeight = FontWeight.Black)
                                }
                            }
                        }
                        Text("DAILY LIMIT: ${config.limit} • ${config.type.name.replace("_", " ")}", fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.Bold)
                    }
                    IconButton({ vm.setWidgetCounter(config.id) }, Modifier.size(36.dp)) {
                        Icon(Icons.Default.Dashboard, null, tint = if (config.id == widgetCounterId) Accent else TextDim, modifier = Modifier.size(20.dp))
                    }
                    IconButton({ editConfig = config }, Modifier.size(36.dp)) {
                        Icon(Icons.Default.Edit, null, tint = Accent, modifier = Modifier.size(20.dp))
                    }
                    if (config.id != "cigarettes") {
                        IconButton({ vm.removeCounter(config.id) }, Modifier.size(36.dp)) { Icon(Icons.Default.Delete, null, tint = DangerColor.copy(alpha = 0.5f), modifier = Modifier.size(20.dp)) }
                    }
                }
                if (config != configs.last()) HorizontalDivider(color = BorderSubtle.copy(alpha = 0.5f), thickness = 0.5.dp)
            }
            Spacer(Modifier.height(16.dp))
            SBtn("Add New Counter") { showAddCounter = true }
        }

        SCard("ECONOMIC PARAMETERS") {
            Text("Price per unit ($)", fontSize = 11.sp, color = Accent, fontWeight = FontWeight.Black, modifier = Modifier.padding(bottom = 12.dp))
            TabakField(tempCost, { tempCost = it }, "Enter price", keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal)
            Spacer(Modifier.height(12.dp))
            SBtn("Update Parameters") {
                tempCost.toFloatOrNull()?.let { vm.setCostPerUnit(it) }
            }
        }

        SCard("SECURITY & PRIVACY") {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Vault Lock", fontWeight = FontWeight.Black, color = TextMain, fontSize = 16.sp)
                    Text("Secure with biometrics", fontSize = 13.sp, color = TextMuted, fontWeight = FontWeight.Medium)
                }
                Switch(checked = isBiometricEnabled, onCheckedChange = { vm.setBiometricEnabled(it) }, colors = SwitchDefaults.colors(checkedThumbColor = Accent, checkedTrackColor = Accent.copy(alpha = 0.5f)))
            }
        }

        SCard("IDENTITY") {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 24.dp)) {
                Box(Modifier.size(64.dp).background(Accent.copy(alpha = 0.12f), CircleShape), contentAlignment = Alignment.Center) {
                    Text(name.take(1).uppercase(), color = Accent, fontWeight = FontWeight.Black, fontSize = 28.sp)
                }
                Spacer(Modifier.width(20.dp))
                Column {
                    Text(name.ifEmpty { "Anonymous" }, fontWeight = FontWeight.Black, color = TextMain, fontSize = 20.sp)
                    if (authState is AuthState.Authenticated && (authState as AuthState.Authenticated).isGuest) {
                        Text("TEMPORARY SESSION", fontSize = 10.sp, color = Accent, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                    }
                }
            }
            Text("Update identity alias", fontSize = 11.sp, color = Accent, fontWeight = FontWeight.Black, modifier = Modifier.padding(bottom = 12.dp))
            TabakField(name, { name = it }, "Alias")
            Spacer(Modifier.height(12.dp))
            SBtn("Sync Identity") { confirmTitle = "Update Alias?"; confirmText = "This change will propagate to all devices."; confirmAction = { vm.updateDisplayName(name) } }
        }

        SCard("VISUAL INTERFACE") {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Obsidian Mode", fontWeight = FontWeight.Black, color = TextMain, fontSize = 16.sp)
                    Text("Dark thematic interface", fontSize = 13.sp, color = TextMuted, fontWeight = FontWeight.Medium)
                }
                Switch(checked = isDark, onCheckedChange = { vm.toggleDarkMode(it) }, colors = SwitchDefaults.colors(checkedThumbColor = Accent))
            }
            Spacer(Modifier.height(24.dp))
            Column {
                Text("Dashboard Matrix", fontWeight = FontWeight.Black, color = TextMain, fontSize = 16.sp)
                Text("Optimize screen real estate", fontSize = 13.sp, color = TextMuted, fontWeight = FontWeight.Medium)
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    FilterChip(selected = dashboardLayout == DashboardLayout.LARGE, onClick = { vm.setDashboardLayout(DashboardLayout.LARGE) }, label = { Text("STANDARD", fontWeight = FontWeight.Black, fontSize = 10.sp) }, shape = RoundedCornerShape(10.dp))
                    FilterChip(selected = dashboardLayout == DashboardLayout.COMPACT, onClick = { vm.setDashboardLayout(DashboardLayout.COMPACT) }, label = { Text("MATRIX (2x2)", fontWeight = FontWeight.Black, fontSize = 10.sp) }, shape = RoundedCornerShape(10.dp))
                }
            }
            Spacer(Modifier.height(24.dp))
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Typography Scale", fontWeight = FontWeight.Black, color = TextMain, modifier = Modifier.weight(1f), fontSize = 16.sp)
                    Text("${(fontScale * 100).toInt()}%", fontSize = 13.sp, color = Accent, fontWeight = FontWeight.Black)
                }
                Slider(value = fontScale, onValueChange = { vm.updateFontSize(it) }, valueRange = 0.85f..1.3f, steps = 3, colors = SliderDefaults.colors(thumbColor = Accent, activeTrackColor = Accent))
            }
        }

        SCard("DATA MANAGEMENT") {
            Text("Extract full history to CSV format.", fontSize = 13.sp, color = TextMuted, modifier = Modifier.padding(bottom = 16.dp), fontWeight = FontWeight.Medium)
            SBtn("Generate Data Export") {
                try {
                    var csv = "Date,Counts\n"
                    logs.forEach { log -> csv += "${log.logDate},${log.counts.entries.joinToString("|") { "${it.key}:${it.value}" }}\n" }
                    val file = File(ctx.cacheDir, "tabak_export.csv")
                    file.writeText(csv)
                    val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.provider", file)
                    ctx.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "text/csv"; putExtra(Intent.EXTRA_STREAM, uri); addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION) }, "Export Records"))
                } catch (_: Exception) {}
            }
        }

        SCard("SESSION TERMINATION", danger = true) {
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Button({ showSignOutDialog = true }, shape = RoundedCornerShape(12.dp), modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = DangerColor.copy(alpha = .12f), contentColor = DangerColor), border = BorderStroke(1.5.dp, DangerColor.copy(alpha = .2f))) { Text("TERMINATE", fontWeight = FontWeight.Black, fontSize = 12.sp) }
                OutlinedButton({ showDeleteDialog = true }, shape = RoundedCornerShape(12.dp), modifier = Modifier.weight(1f), border = BorderStroke(1.5.dp, DangerColor.copy(alpha = .2f)), colors = ButtonDefaults.outlinedButtonColors(contentColor = DangerColor)) { Text("WIPE VAULT", fontWeight = FontWeight.Black, fontSize = 12.sp) }
            }
        }
        
        Spacer(Modifier.height(120.dp))
    }

    if (showAddCounter) AddCounterDialog({ showAddCounter = false }) { n, l, t -> vm.addCounter(n, l, t); showAddCounter = false }
    
    editConfig?.let { config ->
        var tempName by remember(config) { mutableStateOf(config.name) }
        var tempLimit by remember(config) { mutableStateOf(config.limit.toString()) }
        AlertDialog(
            onDismissRequest = { editConfig = null },
            containerColor = BgCard,
            title = { Text("Edit Tracker", fontWeight = FontWeight.Black) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    TabakField(tempName, { tempName = it }, "Label")
                    TabakField(tempLimit, { tempLimit = it.filter { c -> c.isDigit() } }, "Daily Limit", keyboardType = androidx.compose.ui.text.input.KeyboardType.Number)
                }
            },
            confirmButton = {
                TextButton({ 
                    tempLimit.toIntOrNull()?.let { vm.updateCounterConfig(config.id, tempName, it) }
                    editConfig = null 
                }) { Text("SAVE", color = Accent, fontWeight = FontWeight.Black) }
            },
            dismissButton = {
                TextButton({ editConfig = null }) { Text("CANCEL", color = TextMain, fontWeight = FontWeight.Bold) }
            }
        )
    }

    if (showSignOutDialog) AlertDialog(onDismissRequest = { showSignOutDialog = false }, containerColor = BgCard, title = { Text("Terminate Session?", fontWeight = FontWeight.Black) }, text = { Text("You will be logged out of your tracking vault.", color = TextMuted) }, confirmButton = { TextButton({ vm.signOut(); showSignOutDialog = false }) { Text("TERMINATE", color = DangerColor, fontWeight = FontWeight.Black) } }, dismissButton = { TextButton({ showSignOutDialog = false }) { Text("CANCEL", color = TextMain, fontWeight = FontWeight.Bold) } })
    if (showDeleteDialog) AlertDialog(onDismissRequest = { showDeleteDialog = false }, containerColor = BgCard, title = { Text("Wipe All Data?", fontWeight = FontWeight.Black) }, text = { Text("This will permanently delete your vault and all history from cloud servers. This cannot be undone.", color = TextMuted) }, confirmButton = { TextButton({ vm.deleteAccount(); showDeleteDialog = false }) { Text("WIPE EVERYTHING", color = DangerColor, fontWeight = FontWeight.Black) } }, dismissButton = { TextButton({ showDeleteDialog = false }) { Text("CANCEL", color = TextMain, fontWeight = FontWeight.Bold) } })
    confirmAction?.let { action -> AlertDialog(onDismissRequest = { confirmAction = null }, containerColor = BgCard, title = { Text(confirmTitle, fontWeight = FontWeight.Black) }, text = { Text(confirmText, color = TextMuted) }, confirmButton = { TextButton({ action(); confirmAction = null }) { Text("CONFIRM", color = Accent, fontWeight = FontWeight.Black) } }, dismissButton = { TextButton({ confirmAction = null }) { Text("CANCEL", color = TextMain, fontWeight = FontWeight.Bold) } }) }
}

@Composable
private fun AddCounterDialog(onDismiss: () -> Unit, onAdd: (String, Int, CounterType) -> Unit) {
    var name by remember { mutableStateOf("") }
    var limit by remember { mutableStateOf("20") }
    var type by remember { mutableStateOf(CounterType.SIMPLE) }
    
    Dialog(onDismiss) {
        Card(modifier = Modifier.fillMaxWidth().padding(16.dp), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(BgPanel), border = BorderStroke(1.dp, BorderSubtle)) {
            Column(Modifier.padding(32.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
                Text("New Tracker", fontWeight = FontWeight.Black, fontSize = 24.sp, color = TextMain)
                TabakField(name, { name = it }, "Label")
                TabakField(limit, { limit = it.filter { c -> c.isDigit() } }, "Daily Target", keyboardType = androidx.compose.ui.text.input.KeyboardType.Number)
                
                Text("VISUAL ARCHETYPE", color = TextMuted, fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                @OptIn(ExperimentalLayoutApi::class)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    CounterType.entries.forEach { t ->
                        @OptIn(ExperimentalMaterial3Api::class)
                        FilterChip(
                            selected = type == t, 
                            onClick = { type = t }, 
                            label = { Text(t.name.replace("_", " ").uppercase(), fontSize = 9.sp, fontWeight = FontWeight.Black) },
                            shape = RoundedCornerShape(10.dp)
                        )
                    }
                }
                
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.padding(top = 16.dp)) {
                    OutlinedButton(onDismiss, Modifier.weight(1f), shape = RoundedCornerShape(14.dp)) { Text("CANCEL", fontWeight = FontWeight.Bold) }
                    Button({ onAdd(name, limit.toIntOrNull() ?: 20, type) }, Modifier.weight(1f), shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = AccentFg)) { Text("CREATE", fontWeight = FontWeight.Black) }
                }
            }
        }
    }
}

@Composable
fun SCard(title: String, danger: Boolean = false, content: @Composable ColumnScope.() -> Unit) =
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = BgCard), border = BorderStroke(1.dp, if (danger) DangerColor.copy(alpha = .2f) else BorderSubtle)) {
        Column(Modifier.padding(24.dp)) {
            Text(title.uppercase(), fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Black, fontSize = 11.sp, color = if (danger) DangerColor else TextMain, letterSpacing = 2.sp)
            HorizontalDivider(Modifier.padding(vertical = 16.dp), color = if (danger) DangerColor.copy(alpha = .1f) else BorderSubtle, thickness = 0.5.dp)
            content()
        }
    }

@Composable
private fun SBtn(text: String, onClick: () -> Unit) =
    OutlinedButton(onClick, shape = RoundedCornerShape(12.dp), border = BorderStroke(1.5.dp, BorderMid), colors = ButtonDefaults.outlinedButtonColors(contentColor = TextMain)) { 
        Text(text.uppercase(), fontWeight = FontWeight.Black, fontSize = 11.sp, letterSpacing = 1.sp) 
    }
