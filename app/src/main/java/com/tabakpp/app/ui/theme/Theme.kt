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
    bgCard = Color(0xFF161618),
    textMain = Color(0xFFFFFFFF),
    textMuted = Color(0xFF888880),
    textDim = Color(0xFF444442),
    borderSubtle = Color(0x22FFFFFF),
    borderMid = Color(0x33FFFFFF),
    danger = Color(0xFFF87171)
)

val LightTabakColors = TabakColors(
    accent = Color(0xFF2563EB),
    accentFg = Color(0xFFFFFFFF),
    bgBase = Color(0xFFF5F5F7),
    bgPanel = Color(0xFFFFFFFF),
    bgCard = Color(0xFFE8E8EB),
    textMain = Color(0xFF1A1A1C),
    textMuted = Color(0xFF6B6B6B),
    textDim = Color(0xFF9E9E9E),
    borderSubtle = Color(0x11000000),
    borderMid = Color(0x22000000),
    danger = Color(0xFFD32F2F)
)

val LocalTabakColors = staticCompositionLocalOf { DarkTabakColors }

object TabakTheme {
    val colors: TabakColors
        @Composable
        @ReadOnlyComposable
        get() = LocalTabakColors.current
}

// Keep these for backward compatibility with existing code during transition
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
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colors = if (isDark) DarkTabakColors else LightTabakColors
    val context = LocalContext.current
    
    val colorScheme = when {
        dynamicColor && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S -> {
            if (isDark) dynamicDarkColorScheme(context) else lightColorScheme() // We want to keep our custom base if possible, but dynamic scheme overrides primary
        }
        isDark -> darkColorScheme(
            primary = colors.accent,
            onPrimary = colors.accentFg,
            background = colors.bgBase,
            onBackground = colors.textMain,
            surface = colors.bgPanel,
            onSurface = colors.textMain,
            error = colors.danger,
            outline = colors.borderSubtle
        )
        else -> lightColorScheme(
            primary = colors.accent,
            onPrimary = colors.accentFg,
            background = colors.bgBase,
            onBackground = colors.textMain,
            surface = colors.bgPanel,
            onSurface = colors.textMain,
            error = colors.danger,
            outline = colors.borderSubtle
        )
    }

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
