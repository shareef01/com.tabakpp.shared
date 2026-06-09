package com.tabakpp.app.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density

@Immutable
data class TabakColors(
    val accent: Color,
    val accentFg: Color,
    val bgBase: Color,
    val bgPanel: Color,
    val bgCard: Color,
    val textMain: Color,
    val textMuted: Color,
    val textDim: Color,
    val borderSubtle: Color,
    val borderMid: Color,
    val danger: Color,
    val success: Color = Color(0xFF4ADE80)
)

val DarkTabakColors = TabakColors(
    accent = Color(0xFFD4FF5C),
    accentFg = Color(0xFF0C0C00),
    bgBase = Color(0xFF020202),
    bgPanel = Color(0xFF0D0D0E),
    bgCard = Color(0xFF121214),
    textMain = Color(0xFFFFFFFF),
    textMuted = Color(0xFFAAAAA8),
    textDim = Color(0xFF666664),
    borderSubtle = Color(0x1AFFFFFF),
    borderMid = Color(0x2BFFFFFF),
    danger = Color(0xFFF87171)
)

val LightTabakColors = TabakColors(
    accent = Color(0xFF2563EB),
    accentFg = Color(0xFFFFFFFF),
    bgBase = Color(0xFFF8F9FA),
    bgPanel = Color(0xFFFFFFFF),
    bgCard = Color(0xFFFFFFFF),
    textMain = Color(0xFF111113),
    textMuted = Color(0xFF64748B),
    textDim = Color(0xFF94A3B8),
    borderSubtle = Color(0x0F000000),
    borderMid = Color(0x1A000000),
    danger = Color(0xFFE11D48)
)

val LocalTabakColors = staticCompositionLocalOf { DarkTabakColors }

object TabakTheme {
    val colors: TabakColors
        @Composable
        @ReadOnlyComposable
        get() = LocalTabakColors.current
}

val Accent @Composable get() = TabakTheme.colors.accent
val AccentFg @Composable get() = TabakTheme.colors.accentFg
val BgBase @Composable get() = TabakTheme.colors.bgBase
val BgPanel @Composable get() = TabakTheme.colors.bgPanel
val BgCard @Composable get() = TabakTheme.colors.bgCard
val TextMain @Composable get() = TabakTheme.colors.textMain
val TextMuted @Composable get() = TabakTheme.colors.textMuted
val TextDim @Composable get() = TabakTheme.colors.textDim
val BorderSubtle @Composable get() = TabakTheme.colors.borderSubtle
val BorderMid @Composable get() = TabakTheme.colors.borderMid
val DangerColor @Composable get() = TabakTheme.colors.danger
val SuccessColor @Composable get() = TabakTheme.colors.success

@Composable
fun TabakTheme(
    isDark: Boolean = true,
    fontScale: Float = 1f,
    accentColorHex: String? = null,
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val context = LocalContext.current
    
    val baseAccent = if (isDark) DarkTabakColors.accent else LightTabakColors.accent
    val finalAccent = accentColorHex?.let { Color(android.graphics.Color.parseColor(it)) } ?: baseAccent

    val colorScheme = when {
        dynamicColor && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S -> {
            if (isDark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        isDark -> darkColorScheme(
            primary = finalAccent,
            onPrimary = DarkTabakColors.accentFg,
            background = DarkTabakColors.bgBase,
            surface = DarkTabakColors.bgCard
        )
        else -> lightColorScheme(
            primary = finalAccent,
            onPrimary = LightTabakColors.accentFg,
            background = LightTabakColors.bgBase,
            surface = LightTabakColors.bgCard
        )
    }

    val baseColors = if (isDark) DarkTabakColors else LightTabakColors
    val colors = baseColors.copy(accent = finalAccent)

    val currentDensity = LocalDensity.current
    val customDensity = remember(currentDensity, fontScale) {
        Density(density = currentDensity.density, fontScale = currentDensity.fontScale * fontScale)
    }

    CompositionLocalProvider(
        LocalTabakColors provides colors,
        LocalDensity provides customDensity
    ) {
        MaterialTheme(colorScheme = colorScheme, content = content)
    }
}
