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
    val fontScale by vm.fontSizeMultiplier.collectAsState()
    val configs by vm.counterConfigs.collectAsState()
    val widgetCounterId by vm.widgetCounterId.collectAsState()
    val dashboardLayout by vm.dashboardLayout.collectAsState()
    val costPerUnit by vm.costPerUnit.collectAsState()
    
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
    val scope = rememberCoroutineScope()

    LaunchedEffect(authState) {
        if (authState is AuthState.Authenticated) {
            val user = authState as AuthState.Authenticated
            name = user.displayName ?: ""
        }
    }
    
    LaunchedEffect(costPerUnit) {
        tempCost = costPerUnit.toString()
    }

    Column(Modifier.fillMaxSize().background(BgBase).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        
        Spacer(Modifier.statusBarsPadding().height(84.dp))
        if (msg !is UiMessage.None) MessageBanner(msg)

        SCard("Counters") {
            configs.forEach { config ->
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 8.dp)) {
                    Column(Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(config.displayName, fontWeight = FontWeight.Bold, color = TextMain)
                            if (config.id == widgetCounterId) {
                                Box(Modifier.padding(start = 8.dp).background(Accent.copy(alpha = 0.1f), RoundedCornerShape(4.dp)).padding(horizontal = 4.dp, vertical = 1.dp)) {
                                    Text("WIDGET", fontSize = 8.sp, color = Accent, fontWeight = FontWeight.Black)
                                }
                            }
                        }
                        Text("Limit: ${config.limit} • ${config.type.name.lowercase().replace("_", " ")}", fontSize = 11.sp, color = TextMuted)
                    }
                    IconButton({ vm.setWidgetCounter(config.id) }) {
                        Icon(Icons.Default.Home, "Set for Widget", tint = if (config.id == widgetCounterId) Accent else TextDim, modifier = Modifier.size(18.dp))
                    }
                    IconButton({ editConfig = config }) {
                        Icon(Icons.Default.Edit, "Edit", tint = Accent, modifier = Modifier.size(18.dp))
                    }
                    if (config.id != "cigarettes") {
                        IconButton({ vm.removeCounter(config.id) }) { Icon(Icons.Default.Delete, null, tint = DangerColor.copy(alpha = 0.5f), modifier = Modifier.size(18.dp)) }
                    }
                }
                if (config != configs.last()) HorizontalDivider(color = BorderSubtle.copy(alpha = 0.5f))
            }
            Spacer(Modifier.height(12.dp))
            SBtn("Add New Counter") { showAddCounter = true }
        }

        SCard("Health & Economics") {
            Text("Cost per cigarette/unit", fontSize = 11.sp, color = Accent, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 8.dp))
            TabakField(tempCost, { tempCost = it }, "Price (e.g. 0.50)", keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal)
            Spacer(Modifier.height(8.dp))
            SBtn("Save Economic Data") {
                tempCost.toFloatOrNull()?.let { vm.setCostPerUnit(it) }
            }
        }

        SCard("Profile Controls") {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 20.dp)) {
                Box(Modifier.size(56.dp).background(Accent.copy(alpha = 0.1f), CircleShape), contentAlignment = Alignment.Center) {
                    Text(name.take(1).uppercase(), color = Accent, fontWeight = FontWeight.ExtraBold, fontSize = 24.sp)
                }
                Spacer(Modifier.width(16.dp))
                Column {
                    Text(name.ifEmpty { "User" }, fontWeight = FontWeight.Bold, color = TextMain, fontSize = 18.sp)
                    if (authState is AuthState.Authenticated && (authState as AuthState.Authenticated).isGuest) {
                        Text("Guest Mode • Local Only", fontSize = 11.sp, color = Accent, fontWeight = FontWeight.Bold)
                    }
                }
            }
            if (authState is AuthState.Authenticated && (authState as AuthState.Authenticated).isGuest) {
                Spacer(Modifier.height(16.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(Accent.copy(alpha = 0.05f)),
                    border = BorderStroke(1.dp, Accent.copy(alpha = 0.2f))
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Save your progress", fontWeight = FontWeight.Bold, color = Accent, fontSize = 14.sp)
                        Text("Create an account to sync your data across devices and never lose your history.", fontSize = 12.sp, color = TextMuted, modifier = Modifier.padding(vertical = 8.dp))
                        SBtn("Sign Up / Sign In") { vm.signOut() }
                    }
                }
            }
            HorizontalDivider(Modifier.padding(vertical = 20.dp), color = BorderSubtle)
            Text("Edit display name", fontSize = 11.sp, color = Accent, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 8.dp))
            TabakField(name, { name = it }, "Your Name")
            Spacer(Modifier.height(8.dp))
            SBtn("Update Name") { confirmTitle = "Update Name?"; confirmText = "This will sync across devices."; confirmAction = { vm.updateDisplayName(name) } }
        }

        SCard("Display") {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Dark Mode", fontWeight = FontWeight.Bold, color = TextMain)
                    Text("Switch theme", fontSize = 12.sp, color = TextMuted)
                }
                Switch(checked = isDark, onCheckedChange = { vm.toggleDarkMode(it) }, colors = SwitchDefaults.colors(checkedThumbColor = Accent))
            }
            Spacer(Modifier.height(20.dp))
            Column {
                Text("Dashboard Layout", fontWeight = FontWeight.Bold, color = TextMain)
                Text("Fit more counters at once", fontSize = 12.sp, color = TextMuted)
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    @OptIn(ExperimentalMaterial3Api::class)
                    FilterChip(selected = dashboardLayout == DashboardLayout.LARGE, onClick = { vm.setDashboardLayout(DashboardLayout.LARGE) }, label = { Text("Standard") })
                    @OptIn(ExperimentalMaterial3Api::class)
                    FilterChip(selected = dashboardLayout == DashboardLayout.COMPACT, onClick = { vm.setDashboardLayout(DashboardLayout.COMPACT) }, label = { Text("Compact (2x2)") })
                }
            }
            Spacer(Modifier.height(20.dp))
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Font Size", fontWeight = FontWeight.Bold, color = TextMain, modifier = Modifier.weight(1f))
                    Text("${(fontScale * 100).toInt()}%", fontSize = 12.sp, color = Accent, fontWeight = FontWeight.Bold)
                }
                Slider(value = fontScale, onValueChange = { vm.updateFontSize(it) }, valueRange = 0.8f..1.4f, steps = 5, colors = SliderDefaults.colors(thumbColor = Accent, activeTrackColor = Accent))
            }
        }

        SCard("Export") {
            Text("History as CSV.", fontSize = 13.sp, color = TextMuted, modifier = Modifier.padding(bottom = 12.dp))
            SBtn("Export .csv") {
                try {
                    var csv = "Date,Counts\n"
                    logs.forEach { log -> csv += "${log.logDate},${log.counts.entries.joinToString("|") { "${it.key}:${it.value}" }}\n" }
                    val file = File(ctx.cacheDir, "tabak_export.csv")
                    file.writeText(csv)
                    val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.provider", file)
                    ctx.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "text/csv"; putExtra(Intent.EXTRA_STREAM, uri); addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION) }, "Export CSV"))
                } catch (_: Exception) {}
            }
        }

        SCard("Session", danger = true) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button({ showSignOutDialog = true }, shape = RoundedCornerShape(10.dp), modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = DangerColor.copy(alpha = .1f), contentColor = DangerColor), border = BorderStroke(1.dp, DangerColor.copy(alpha = .2f))) { Text("Sign Out", fontWeight = FontWeight.Bold) }
                OutlinedButton({ showDeleteDialog = true }, shape = RoundedCornerShape(10.dp), modifier = Modifier.weight(1f), border = BorderStroke(1.dp, DangerColor.copy(alpha = .2f)), colors = ButtonDefaults.outlinedButtonColors(contentColor = DangerColor)) { Text("Delete Account", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
            }
        }
        
        Spacer(Modifier.height(80.dp))
    }

    if (showAddCounter) AddCounterDialog({ showAddCounter = false }) { n, l, t -> vm.addCounter(n, l, t); showAddCounter = false }
    
    editConfig?.let { config ->
        var tempName by remember(config) { mutableStateOf(config.name) }
        var tempLimit by remember(config) { mutableStateOf(config.limit.toString()) }
        AlertDialog(
            onDismissRequest = { editConfig = null },
            containerColor = BgCard,
            title = { Text("Edit ${config.displayName}") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    TabakField(tempName, { tempName = it }, "Counter Name")
                    TabakField(tempLimit, { tempLimit = it.filter { c -> c.isDigit() } }, "Daily Limit", keyboardType = androidx.compose.ui.text.input.KeyboardType.Number)
                }
            },
            confirmButton = {
                TextButton({ 
                    tempLimit.toIntOrNull()?.let { vm.updateCounterConfig(config.id, tempName, it) }
                    editConfig = null 
                }) { Text("Save", color = Accent, fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                TextButton({ editConfig = null }) { Text("Cancel", color = TextMain) }
            }
        )
    }

    if (showSignOutDialog) AlertDialog(onDismissRequest = { showSignOutDialog = false }, containerColor = BgCard, titleContentColor = TextMain, textContentColor = TextMuted, title = { Text("Sign Out?") }, text = { Text("You will need to sign in again to access your data.") }, confirmButton = { TextButton({ vm.signOut(); showSignOutDialog = false }) { Text("Sign Out", color = DangerColor, fontWeight = FontWeight.Bold) } }, dismissButton = { TextButton({ showSignOutDialog = false }) { Text("Cancel", color = TextMain) } })
    if (showDeleteDialog) AlertDialog(onDismissRequest = { showDeleteDialog = false }, containerColor = BgCard, titleContentColor = TextMain, textContentColor = TextMuted, title = { Text("Delete Account?") }, text = { Text("Permanent deletion of all data. This action cannot be undone.") }, confirmButton = { TextButton({ vm.deleteAccount(); showDeleteDialog = false }) { Text("Delete", color = DangerColor, fontWeight = FontWeight.Bold) } }, dismissButton = { TextButton({ showDeleteDialog = false }) { Text("Cancel", color = TextMain) } })
    confirmAction?.let { action -> AlertDialog(onDismissRequest = { confirmAction = null }, containerColor = BgCard, titleContentColor = TextMain, textContentColor = TextMuted, title = { Text(confirmTitle) }, text = { Text(confirmText) }, confirmButton = { TextButton({ action(); confirmAction = null }) { Text("Confirm", color = Accent, fontWeight = FontWeight.Bold) } }, dismissButton = { TextButton({ confirmAction = null }) { Text("Cancel", color = TextMain) } }) }
}

@Composable
private fun AddCounterDialog(onDismiss: () -> Unit, onAdd: (String, Int, CounterType) -> Unit) {
    var name by remember { mutableStateOf("") }
    var limit by remember { mutableStateOf("20") }
    var type by remember { mutableStateOf(CounterType.SIMPLE) }
    
    Dialog(onDismiss) {
        Card(modifier = Modifier.fillMaxWidth().padding(16.dp), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(BgPanel), border = BorderStroke(1.dp, BorderSubtle)) {
            Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("Add Counter", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = TextMain)
                TabakField(name, { name = it }, "Name")
                TabakField(limit, { limit = it.filter { c -> c.isDigit() } }, "Limit", keyboardType = androidx.compose.ui.text.input.KeyboardType.Number)
                
                Text("Visual Style:", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                @OptIn(ExperimentalLayoutApi::class)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    @OptIn(ExperimentalMaterial3Api::class)
                    FilterChip(selected = type == CounterType.SIMPLE, onClick = { type = CounterType.SIMPLE }, label = { Text("Simple") })
                    @OptIn(ExperimentalMaterial3Api::class)
                    FilterChip(selected = type == CounterType.CIGARETTE, onClick = { type = CounterType.CIGARETTE }, label = { Text("Cigarette") })
                    @OptIn(ExperimentalMaterial3Api::class)
                    FilterChip(selected = type == CounterType.JOINT_KING, onClick = { type = CounterType.JOINT_KING }, label = { Text("King Size") })
                    @OptIn(ExperimentalMaterial3Api::class)
                    FilterChip(selected = type == CounterType.JOINT_QUEEN, onClick = { type = CounterType.JOINT_QUEEN }, label = { Text("Queen Size") })
                }
                
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(onDismiss, Modifier.weight(1f), shape = RoundedCornerShape(10.dp)) { Text("Cancel") }
                    Button({ onAdd(name, limit.toIntOrNull() ?: 20, type) }, Modifier.weight(1f), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = AccentFg)) { Text("Add") }
                }
            }
        }
    }
}

@Composable
fun SCard(title: String, danger: Boolean = false, content: @Composable ColumnScope.() -> Unit) =
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = BgCard), border = BorderStroke(1.dp, if (danger) DangerColor.copy(alpha = .15f) else BorderSubtle)) {
        Column(Modifier.padding(22.dp)) {
            Text(title.uppercase(), fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 10.sp, color = if (danger) DangerColor else TextMain, letterSpacing = 1.5.sp)
            HorizontalDivider(Modifier.padding(vertical = 12.dp), color = if (danger) DangerColor.copy(alpha = .1f) else BorderSubtle)

            content()
        }
    }

@Composable
private fun SBtn(text: String, onClick: () -> Unit) =
    OutlinedButton(onClick, shape = RoundedCornerShape(10.dp), border = BorderStroke(1.dp, BorderMid), colors = ButtonDefaults.outlinedButtonColors(contentColor = TextMuted)) { Text(text, fontWeight = FontWeight.Medium) }
