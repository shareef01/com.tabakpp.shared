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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.*
import androidx.compose.ui.unit.*
import androidx.compose.ui.window.Dialog
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.tabakpp.app.R
import com.tabakpp.app.data.*
import com.tabakpp.app.data.model.CounterConfig
import com.tabakpp.app.data.model.CounterType
import com.tabakpp.app.data.model.DailyLog
import com.tabakpp.app.ui.theme.*
import com.tabakpp.app.viewmodel.AuthState
import com.tabakpp.app.viewmodel.SettingsViewModel
import com.tabakpp.app.viewmodel.UiMessage
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.io.File

@Composable
fun SettingsScreen(vm: SettingsViewModel, authState: AuthState, logs: List<DailyLog>) {
    val msg: UiMessage by vm.message.collectAsStateWithLifecycle()
    val isDark: Boolean by vm.isDarkMode.collectAsStateWithLifecycle()
    val fontScale: Float by vm.fontScale.collectAsStateWithLifecycle()
    val configs: List<CounterConfig> by vm.counterConfigs.collectAsStateWithLifecycle()
    val widgetCounterId: String by vm.widgetCounterId.collectAsStateWithLifecycle()
    val dashboardLayout: DashboardLayout by vm.dashboardLayout.collectAsStateWithLifecycle()
    val costPerUnit: Float by vm.costPerUnit.collectAsStateWithLifecycle()
    val isManualReset: Boolean by vm.isManualReset.collectAsStateWithLifecycle()
    val accentColorHex: String? by vm.accentColor.collectAsStateWithLifecycle()
    val userGoal: String by vm.userGoal.collectAsStateWithLifecycle()
    val profileImageUri: String? by vm.profileImageUri.collectAsStateWithLifecycle()
    
    var name by remember { mutableStateOf("") }
    var tempGoal by remember { mutableStateOf("") }
    var tempCost by remember { mutableStateOf("") }
    
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showSignOutDialog by remember { mutableStateOf(false) }
    var confirmAction by remember { mutableStateOf<(() -> Unit)?>(null) }
    var confirmTitle by remember { mutableStateOf("") }
    var confirmText by remember { mutableStateOf("") }
    
    var showAddCounter by remember { mutableStateOf(false) }
    var showAbout by remember { mutableStateOf(false) }
    var editConfig by remember { mutableStateOf<CounterConfig?>(null) }

    val ctx = LocalContext.current
    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri?.let { ctx.contentResolver.takePersistableUriPermission(it, Intent.FLAG_GRANT_READ_URI_PERMISSION); vm.setProfileImage(it.toString()) }
    }

    LaunchedEffect(authState) { if (authState is AuthState.Authenticated) { name = (authState as AuthState.Authenticated).displayName ?: "" } }
    LaunchedEffect(costPerUnit) { tempCost = if (costPerUnit > 0) costPerUnit.toString() else "" }
    LaunchedEffect(userGoal) { tempGoal = userGoal }

    Column(Modifier.fillMaxSize().background(BgBase).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Spacer(Modifier.statusBarsPadding().height(84.dp))
        if (msg !is UiMessage.None) MessageBanner(msg)

        SCard("IDENTITY") {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 24.dp)) {
                Box(contentAlignment = Alignment.BottomEnd) {
                    Box(
                        Modifier
                            .size(80.dp)
                            .clip(CircleShape)
                            .background(Accent.copy(alpha = 0.12f))
                            .border(2.dp, Accent.copy(alpha = 0.2f), CircleShape)
                            .clickable { imagePicker.launch(arrayOf("image/*")) },
                        contentAlignment = Alignment.Center
                    ) {
                        if (profileImageUri != null) {
                            AsyncImage(
                                model = profileImageUri,
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = androidx.compose.ui.layout.ContentScale.Crop
                            )
                        } else {
                            Text(name.take(1).uppercase(), color = Accent, fontWeight = FontWeight.Black, fontSize = 32.sp)
                        }
                    }
                    
                    // Styled Edit Badge
                    Box(
                        Modifier
                            .size(28.dp)
                            .background(Accent, CircleShape)
                            .border(2.dp, BgCard, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.CameraAlt, null, tint = AccentFg, modifier = Modifier.size(14.dp))
                    }
                }
                Spacer(Modifier.width(24.dp))
                Column {
                    Text(name.ifEmpty { "Anonymous" }, fontWeight = FontWeight.Black, color = TextMain, fontSize = 24.sp, letterSpacing = (-0.5).sp)
                    if (authState is AuthState.Authenticated && (authState as AuthState.Authenticated).isGuest) {
                        Text("TEMPORARY SESSION", fontSize = 10.sp, color = Accent, fontWeight = FontWeight.Black, letterSpacing = 2.sp)
                    }
                }
            }
            Text("Personal Goal", fontSize = 11.sp, color = Accent, fontWeight = FontWeight.Black, modifier = Modifier.padding(bottom = 8.dp))
            TabakField(tempGoal, { tempGoal = it }, "e.g. Save $500 for a trip")
            Spacer(Modifier.height(12.dp))
            SBtn("Update Goal") { vm.setUserGoal(tempGoal) }
            HorizontalDivider(Modifier.padding(vertical = 24.dp), color = BorderSubtle.copy(alpha = 0.5f), thickness = 0.5.dp)
            Text("Update identity alias", fontSize = 11.sp, color = Accent, fontWeight = FontWeight.Black, modifier = Modifier.padding(bottom = 12.dp))
            TabakField(name, { name = it }, "Alias")
            Spacer(Modifier.height(12.dp))
            SBtn("Sync Identity") { confirmTitle = "Update Alias?"; confirmText = "This change will propagate to all devices."; confirmAction = { vm.updateDisplayName(name) } }
        }

        SCard("TRACKER CONFIGURATION") {
            configs.sortedBy { it.displayOrder }.forEachIndexed { index, config ->
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 12.dp)) {
                    Column(Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(config.displayName, fontWeight = FontWeight.Black, color = TextMain, fontSize = 16.sp)
                            if (config.id == widgetCounterId) Box(Modifier.padding(start = 10.dp).background(Accent.copy(alpha = 0.15f), RoundedCornerShape(6.dp)).padding(horizontal = 6.dp, vertical = 2.dp)) { Text("WIDGET", fontSize = 8.sp, color = Accent, fontWeight = FontWeight.Black) }
                        }
                        Text("LIMIT: ${config.limit} • ${config.type.name.replace("_", " ")}", fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.Bold)
                        if (config.excludeFromEconomics) {
                            Text("EXCLUDED FROM COSTS", fontSize = 9.sp, color = DangerColor, fontWeight = FontWeight.Black)
                        } else if (config.pricePerUnit > 0) {
                            Text("PRICE: $${config.pricePerUnit}", fontSize = 9.sp, color = SuccessColor, fontWeight = FontWeight.Black)
                        }
                    }
                    Row {
                        IconButton({ if (index > 0) { val newList = configs.toMutableList(); val item = newList.removeAt(index); newList.add(index - 1, item); vm.reorderCounters(newList) } }, Modifier.size(36.dp), enabled = index > 0) { Icon(Icons.Default.ArrowUpward, null, tint = if (index > 0) TextMain else TextDim, modifier = Modifier.size(18.dp)) }
                        IconButton({ if (index < configs.size - 1) { val newList = configs.toMutableList(); val item = newList.removeAt(index); newList.add(index + 1, item); vm.reorderCounters(newList) } }, Modifier.size(36.dp), enabled = index < configs.size - 1) { Icon(Icons.Default.ArrowDownward, null, tint = if (index < configs.size - 1) TextMain else TextDim, modifier = Modifier.size(18.dp)) }
                    }
                    IconButton({ vm.setWidgetCounter(config.id) }, Modifier.size(36.dp)) { Icon(Icons.Default.Dashboard, null, tint = if (config.id == widgetCounterId) Accent else TextDim, modifier = Modifier.size(20.dp)) }
                    IconButton({ editConfig = config }, Modifier.size(36.dp)) { Icon(Icons.Default.Edit, null, tint = Accent, modifier = Modifier.size(20.dp)) }
                    if (config.id != "cigarettes") IconButton({ vm.removeCounter(config.id) }, Modifier.size(36.dp)) { Icon(Icons.Default.Delete, null, tint = DangerColor.copy(alpha = 0.5f), modifier = Modifier.size(20.dp)) }
                }
                if (config != configs.last()) HorizontalDivider(color = BorderSubtle.copy(alpha = 0.5f), thickness = 0.5.dp)
            }
            Spacer(Modifier.height(16.dp))
            SBtn("Add New Counter") { showAddCounter = true }
        }

        SCard("ECONOMIC PARAMETERS") {
            Text("Global Price per unit ($)", fontSize = 11.sp, color = Accent, fontWeight = FontWeight.Black, modifier = Modifier.padding(bottom = 4.dp))
            Text("Used if tracker doesn't have a specific price.", fontSize = 10.sp, color = TextMuted, modifier = Modifier.padding(bottom = 12.dp))
            TabakField(tempCost, { tempCost = it }, "Enter global price", keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal)
            Spacer(Modifier.height(12.dp))
            SBtn("Update Parameters") { tempCost.toFloatOrNull()?.let { vm.setCostPerUnit(it) } }
        }

        SCard("SECURITY & PRIVACY") {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Night Owl Mode", fontWeight = FontWeight.Black, color = TextMain, fontSize = 16.sp)
                    Text("Manually start new day", fontSize = 13.sp, color = TextMuted, fontWeight = FontWeight.Medium)
                }
                Switch(
                    checked = isManualReset, 
                    onCheckedChange = { vm.setManualReset(it) }, 
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Accent,
                        checkedTrackColor = Accent.copy(alpha = 0.38f),
                        uncheckedThumbColor = TextDim,
                        uncheckedTrackColor = BorderMid.copy(alpha = 0.5f),
                        checkedBorderColor = Color.Transparent,
                        uncheckedBorderColor = Color.Transparent
                    )
                )
            }
        }

        SCard("VISUAL INTERFACE") {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Obsidian Mode", fontWeight = FontWeight.Black, color = TextMain, fontSize = 16.sp)
                    Text("Dark thematic interface", fontSize = 13.sp, color = TextMuted, fontWeight = FontWeight.Medium)
                }
                Switch(
                    checked = isDark, 
                    onCheckedChange = { vm.toggleDarkMode(it) }, 
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Accent,
                        checkedTrackColor = Accent.copy(alpha = 0.38f),
                        uncheckedThumbColor = TextDim,
                        uncheckedTrackColor = BorderMid.copy(alpha = 0.5f),
                        checkedBorderColor = Color.Transparent,
                        uncheckedBorderColor = Color.Transparent
                    )
                )
            }
            Spacer(Modifier.height(24.dp))
            Column {
                Text("Accent Spectrum", fontWeight = FontWeight.Black, color = TextMain, fontSize = 16.sp)
                Text("Select your primary aesthetic", fontSize = 13.sp, color = TextMuted, fontWeight = FontWeight.Medium)
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    val colors = listOf(null, "#FF4ADE80", "#FFF87171", "#FFFB923C", "#FFA78BFA", "#FFF472B6")
                    colors.forEach { colorHex ->
                        val color = colorHex?.let { Color(android.graphics.Color.parseColor(it)) } ?: (if (isDark) DarkTabakColors.accent else LightTabakColors.accent)
                        Box(Modifier.size(36.dp).background(color, CircleShape).border(if (accentColorHex == colorHex) 2.dp else 0.dp, TextMain, CircleShape).clickable { vm.setAccentColor(colorHex) })
                    }
                }
            }
            Spacer(Modifier.height(24.dp))
            Column {
                Text("Dashboard Matrix", fontWeight = FontWeight.Black, color = TextMain, fontSize = 16.sp)
                Text("Optimize screen real estate", fontSize = 13.sp, color = TextMuted, fontWeight = FontWeight.Medium)
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    val chipColors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Accent.copy(alpha = 0.15f),
                        selectedLabelColor = Accent,
                        selectedLeadingIconColor = Accent,
                        containerColor = BgPanel,
                        labelColor = TextMuted
                    )
                    FilterChip(
                        selected = dashboardLayout == DashboardLayout.LARGE, 
                        onClick = { vm.setDashboardLayout(DashboardLayout.LARGE) }, 
                        label = { Text("STANDARD", fontWeight = FontWeight.Black, fontSize = 10.sp) }, 
                        shape = RoundedCornerShape(10.dp),
                        colors = chipColors,
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = dashboardLayout == DashboardLayout.LARGE,
                            borderColor = BorderSubtle,
                            selectedBorderColor = Accent.copy(alpha = 0.5f),
                            borderWidth = 1.dp,
                            selectedBorderWidth = 1.5.dp
                        )
                    )
                    FilterChip(
                        selected = dashboardLayout == DashboardLayout.COMPACT, 
                        onClick = { vm.setDashboardLayout(DashboardLayout.COMPACT) }, 
                        label = { Text("MATRIX (2x2)", fontWeight = FontWeight.Black, fontSize = 10.sp) }, 
                        shape = RoundedCornerShape(10.dp),
                        colors = chipColors,
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = dashboardLayout == DashboardLayout.COMPACT,
                            borderColor = BorderSubtle,
                            selectedBorderColor = Accent.copy(alpha = 0.5f),
                            borderWidth = 1.dp,
                            selectedBorderWidth = 1.5.dp
                        )
                    )
                }
            }
            Spacer(Modifier.height(24.dp))
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Typography Scale", fontWeight = FontWeight.Black, color = TextMain, modifier = Modifier.weight(1f), fontSize = 16.sp)
                    Text("${(fontScale * 100).toInt()}%", fontSize = 13.sp, color = Accent, fontWeight = FontWeight.Black)
                }
                Slider(
                    value = fontScale, 
                    onValueChange = { vm.updateFontSize(it) }, 
                    valueRange = 0.85f..1.3f, 
                    steps = 3, 
                    colors = SliderDefaults.colors(
                        thumbColor = Accent, 
                        activeTrackColor = Accent,
                        inactiveTrackColor = BorderSubtle,
                        activeTickColor = AccentFg.copy(alpha = 0.5f),
                        inactiveTickColor = TextDim
                    )
                )
            }
        }

        SCard("DATA MANAGEMENT") {
            Text("Extract full history to CSV format.", fontSize = 13.sp, color = TextMuted, modifier = Modifier.padding(bottom = 16.dp), fontWeight = FontWeight.Medium)
            SBtn("Generate Data Export") { try { var csv = "Date,Counts\n"; logs.forEach { log -> csv += "${log.logDate},${log.counts.entries.joinToString("|") { "${it.key}:${it.value}" }}\n" }; val file = File(ctx.cacheDir, "tabak_export.csv"); file.writeText(csv); val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.provider", file); ctx.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "text/csv"; putExtra(Intent.EXTRA_STREAM, uri); addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION) }, "Export Records")) } catch (_: Exception) {} }
        }

        SCard("SESSION TERMINATION", danger = true) {
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Button({ showSignOutDialog = true }, shape = RoundedCornerShape(12.dp), modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = DangerColor.copy(alpha = .12f), contentColor = DangerColor), border = BorderStroke(1.5.dp, DangerColor.copy(alpha = .2f))) { Text("TERMINATE", fontWeight = FontWeight.Black, fontSize = 12.sp) }
                OutlinedButton({ showDeleteDialog = true }, shape = RoundedCornerShape(12.dp), modifier = Modifier.weight(1f), border = BorderStroke(1.5.dp, DangerColor.copy(alpha = .2f)), colors = ButtonDefaults.outlinedButtonColors(contentColor = DangerColor)) { Text("WIPE VAULT", fontWeight = FontWeight.Black, fontSize = 12.sp) }
            }
        }

        SCard("APPLICATION INFO") { Row(verticalAlignment = Alignment.CenterVertically) { Column(Modifier.weight(1f)) { Text("tabak++ Premium", fontWeight = FontWeight.Black, color = TextMain, fontSize = 16.sp); Text("Version 1.0.4", fontSize = 13.sp, color = TextMuted, fontWeight = FontWeight.Medium) }; SBtn("Read About") { showAbout = true } } }
        Spacer(Modifier.height(120.dp))
    }

    if (showAbout) AboutDialog { showAbout = false }
    if (showAddCounter) AddCounterDialog({ showAddCounter = false }) { n, l, t, p, e -> vm.addCounter(n, l, t, p, e); showAddCounter = false }
    
    editConfig?.let { config -> 
        var tempName by remember(config) { mutableStateOf(config.name) }
        var tempLimit by remember(config) { mutableStateOf(config.limit.toString()) }
        var tempPrice by remember(config) { mutableStateOf(if (config.pricePerUnit > 0) config.pricePerUnit.toString() else "") }
        var tempExclude by remember(config) { mutableStateOf(config.excludeFromEconomics) }

        AlertDialog(
            onDismissRequest = { editConfig = null },
            containerColor = BgCard,
            shape = RoundedCornerShape(TabakDesign.cornerLarge),
            title = { Text("Edit Tracker", fontWeight = FontWeight.Black, fontSize = 24.sp, color = TextMain) },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(20.dp),
                    modifier = Modifier.padding(top = 8.dp)
                ) {
                    TabakField(tempName, { tempName = it }, "Label")
                    TabakField(tempLimit, { tempLimit = it.filter { c -> c.isDigit() } }, "Daily Target", keyboardType = androidx.compose.ui.text.input.KeyboardType.Number)
                    
                    HorizontalDivider(color = BorderSubtle.copy(alpha = 0.5f))
                    
                    Text("ECONOMIC CONTROLS", fontSize = 10.sp, fontWeight = FontWeight.Black, color = Accent, letterSpacing = 1.5.sp)
                    TabakField(tempPrice, { tempPrice = it }, "Custom Price ($)", keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal)
                    Row(
                        verticalAlignment = Alignment.CenterVertically, 
                        modifier = Modifier.fillMaxWidth().clickable { tempExclude = !tempExclude }
                    ) {
                        Checkbox(
                            checked = tempExclude, 
                            onCheckedChange = { tempExclude = it }, 
                            colors = CheckboxDefaults.colors(
                                checkedColor = Accent,
                                uncheckedColor = BorderMid,
                                checkmarkColor = AccentFg
                            )
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("Exclude from all cost calculations", fontSize = 13.sp, color = TextMuted, fontWeight = FontWeight.Medium)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { 
                        val limit = tempLimit.toIntOrNull() ?: config.limit
                        val price = tempPrice.toFloatOrNull() ?: 0f
                        vm.updateCounterConfig(config.id, tempName, limit, price, tempExclude)
                        editConfig = null 
                    },
                    shape = RoundedCornerShape(TabakDesign.cornerSmall),
                    colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = AccentFg),
                    modifier = Modifier.padding(horizontal = 4.dp).height(48.dp)
                ) { Text("SAVE", fontWeight = FontWeight.Black, fontSize = 14.sp) }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { editConfig = null },
                    shape = RoundedCornerShape(TabakDesign.cornerSmall),
                    border = BorderStroke(1.5.dp, BorderSubtle),
                    modifier = Modifier.padding(horizontal = 4.dp).height(48.dp)
                ) { Text("CANCEL", color = TextMain, fontWeight = FontWeight.Bold, fontSize = 14.sp) }
            }
        )
    }

    if (showSignOutDialog) AlertDialog(onDismissRequest = { showSignOutDialog = false }, containerColor = BgCard, title = { Text("Terminate Session?", fontWeight = FontWeight.Black) }, text = { Text("You will be logged out of your tracking vault.", color = TextMuted) }, confirmButton = { TextButton({ vm.signOut(); showSignOutDialog = false }) { Text("TERMINATE", color = DangerColor, fontWeight = FontWeight.Black) } }, dismissButton = { TextButton({ showSignOutDialog = false }) { Text("CANCEL", color = TextMain, fontWeight = FontWeight.Bold) } })
    if (showDeleteDialog) AlertDialog(onDismissRequest = { showDeleteDialog = false }, containerColor = BgCard, title = { Text("Wipe All Data?", fontWeight = FontWeight.Black) }, text = { Text("This will permanently delete your vault and all history from cloud servers. This cannot be undone.", color = TextMuted) }, confirmButton = { TextButton({ vm.deleteAccount(); showDeleteDialog = false }) { Text("WIPE EVERYTHING", color = DangerColor, fontWeight = FontWeight.Black) } }, dismissButton = { TextButton({ showDeleteDialog = false }) { Text("CANCEL", color = TextMain, fontWeight = FontWeight.Bold) } })
    confirmAction?.let { action -> AlertDialog(onDismissRequest = { confirmAction = null }, containerColor = BgCard, title = { Text(confirmTitle, fontWeight = FontWeight.Black) }, text = { Text(confirmText, color = TextMuted) }, confirmButton = { TextButton({ action(); confirmAction = null }) { Text("CONFIRM", color = Accent, fontWeight = FontWeight.Black) } }, dismissButton = { TextButton({ confirmAction = null }) { Text("CANCEL", color = TextMain, fontWeight = FontWeight.Bold) } }) }
}

@Composable
fun AddCounterDialog(onDismiss: () -> Unit, onAdd: (String, Int, CounterType, Float, Boolean) -> Unit) {
    var name by remember { mutableStateOf("") }
    var limit by remember { mutableStateOf("20") }
    var type by remember { mutableStateOf(CounterType.SIMPLE) }
    var price by remember { mutableStateOf("") }
    var exclude by remember { mutableStateOf(false) }
    
    Dialog(onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth().padding(16.dp), 
            shape = RoundedCornerShape(TabakDesign.cornerLarge), 
            colors = CardDefaults.cardColors(BgPanel), 
            border = BorderStroke(1.dp, BorderSubtle)
        ) {
            Column(
                Modifier.padding(32.dp).verticalScroll(rememberScrollState()), 
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                Text("New Tracker", fontWeight = FontWeight.Black, fontSize = 24.sp, color = TextMain)
                TabakField(name, { name = it }, "Label")
                TabakField(limit, { limit = it.filter { c -> c.isDigit() } }, "Daily Target", keyboardType = androidx.compose.ui.text.input.KeyboardType.Number)
                
                Text("VISUAL ARCHETYPE", color = TextMuted, fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 1.5.sp)
                @OptIn(ExperimentalLayoutApi::class)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    CounterType.entries.forEach { t ->
                        FilterChip(
                            selected = type == t, 
                            onClick = { type = t }, 
                            label = { Text(t.name.replace("_", " ").uppercase(), fontSize = 9.sp, fontWeight = FontWeight.Black) }, 
                            shape = RoundedCornerShape(10.dp),
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Accent.copy(alpha = 0.15f),
                                selectedLabelColor = Accent,
                                containerColor = BgBase.copy(alpha = 0.4f),
                                labelColor = TextMuted
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = type == t,
                                borderColor = BorderSubtle,
                                selectedBorderColor = Accent.copy(alpha = 0.5f),
                                borderWidth = 1.dp,
                                selectedBorderWidth = 1.5.dp
                            )
                        )
                    }
                }
                
                HorizontalDivider(color = BorderSubtle.copy(alpha = 0.5f))
                Text("ECONOMIC CONTROLS", fontSize = 10.sp, fontWeight = FontWeight.Black, color = Accent, letterSpacing = 1.5.sp)
                TabakField(price, { price = it }, "Price per unit ($)", keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal)
                Row(
                    verticalAlignment = Alignment.CenterVertically, 
                    modifier = Modifier.fillMaxWidth().clickable { exclude = !exclude }
                ) {
                    Checkbox(
                        checked = exclude, 
                        onCheckedChange = { exclude = it }, 
                        colors = CheckboxDefaults.colors(
                            checkedColor = Accent,
                            uncheckedColor = BorderMid,
                            checkmarkColor = AccentFg
                        )
                    )
                    Spacer(Modifier.width(8.dp))
                    Text("Exclude from costs", fontSize = 13.sp, color = TextMuted, fontWeight = FontWeight.Medium)
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp), 
                    modifier = Modifier.padding(top = 16.dp).fillMaxWidth()
                ) {
                    OutlinedButton(
                        onDismiss, 
                        Modifier.weight(1f).height(52.dp), 
                        shape = RoundedCornerShape(TabakDesign.cornerSmall),
                        border = BorderStroke(1.5.dp, BorderSubtle)
                    ) { Text("CANCEL", fontWeight = FontWeight.Bold, color = TextMain, fontSize = 14.sp) }
                    Button(
                        { onAdd(name, limit.toIntOrNull() ?: 20, type, price.toFloatOrNull() ?: 0f, exclude) }, 
                        Modifier.weight(1f).height(52.dp), 
                        shape = RoundedCornerShape(TabakDesign.cornerSmall), 
                        colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = AccentFg)
                    ) { Text("CREATE", fontWeight = FontWeight.Black, fontSize = 14.sp) }
                }
            }
        }
    }
}
