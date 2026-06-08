package com.tabakpp.app.ui

import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.*
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.*
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.tabakpp.app.ui.theme.*
import com.tabakpp.app.viewmodel.MainViewModel
import com.tabakpp.app.viewmodel.UiMessage

enum class AuthForm { LOGIN, SIGNUP, FORGOT }

@Composable
fun AuthScreen(viewModel: MainViewModel) {
    var form by remember { mutableStateOf(AuthForm.LOGIN) }
    val message by viewModel.message.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val context = LocalContext.current

    val storagePermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            viewModel.continueAsGuest()
        } else {
            Toast.makeText(context, "Permission needed for local storage.", Toast.LENGTH_LONG).show()
        }
    }

    val googleSignInLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)
            account.idToken?.let { viewModel.signInWithGoogle(it) }
        } catch (e: ApiException) {
            Log.e("Auth", "Google Sign-In Error: ${e.statusCode}")
            Toast.makeText(context, "Sign-In Failed (${e.statusCode})", Toast.LENGTH_SHORT).show()
        } catch (_: Exception) {
            Toast.makeText(context, "Login Error", Toast.LENGTH_SHORT).show()
        }
    }

    Box(Modifier.fillMaxSize().background(BgBase)) {
        Box(Modifier.fillMaxSize().background(
            Brush.radialGradient(
                colors = listOf(Accent.copy(alpha = .1f), Color.Transparent),
                radius = 1500f
            )
        ))
            
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally) {
            
            CigaretteLogo(Modifier.padding(top = 100.dp, bottom = 60.dp))

            Card(Modifier.fillMaxWidth().padding(horizontal = 24.dp).shadow(24.dp, RoundedCornerShape(32.dp), ambientColor = Accent, spotColor = Accent.copy(alpha = 0.2f)),
                shape = RoundedCornerShape(32.dp),
                colors = CardDefaults.cardColors(containerColor = BgCard),
                border = BorderStroke(1.dp, BorderSubtle)) {
                
                AnimatedContent(form, transitionSpec = { fadeIn(tween(400)) togetherWith fadeOut(tween(400)) },
                    label = "form") { f ->
                    when (f) {
                        AuthForm.LOGIN  -> LoginForm(viewModel, isLoading, message,
                            { form = AuthForm.FORGOT }, { form = AuthForm.SIGNUP },
                            onGoogle = {
                                val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                                    .requestIdToken("YOUR_GOOGLE_CLIENT_ID")
                                    .requestEmail()
                                    .build()
                                val client = GoogleSignIn.getClient(context, gso)
                                googleSignInLauncher.launch(client.signInIntent)
                            },
                            onGuest = {
                                if (android.os.Build.VERSION.SDK_INT <= android.os.Build.VERSION_CODES.Q) {
                                    storagePermissionLauncher.launch(android.Manifest.permission.WRITE_EXTERNAL_STORAGE)
                                } else {
                                    viewModel.continueAsGuest()
                                }
                            }
                        )
                        AuthForm.SIGNUP -> SignupForm(viewModel, isLoading, message) { form = AuthForm.LOGIN }
                        AuthForm.FORGOT -> ForgotForm(viewModel, message) { form = AuthForm.LOGIN }
                    }
                }
            }
            Spacer(Modifier.height(60.dp))
        }
    }
}

@Composable
fun CigaretteLogo(modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Box(contentAlignment = Alignment.Center) {
            Box(Modifier.offset(y = (-50).dp)) {
                repeat(4) { i ->
                    val alpha by rememberInfiniteTransition(label = "smoke").animateFloat(0.1f, 0.3f, infiniteRepeatable(tween(2000 + i * 200), RepeatMode.Reverse), label = "s")
                    Box(Modifier
                        .offset(x = (i * 14 - 18).dp, y = (i * 6).dp)
                        .size(3.dp, 40.dp)
                        .blur(6.dp)
                        .background(Accent.copy(alpha = alpha), CircleShape))
                }
            }
            
            Row(verticalAlignment = Alignment.CenterVertically) {
                val flicker by rememberInfiniteTransition(label = "ember").animateFloat(0.8f, 1.2f, infiniteRepeatable(tween(150), RepeatMode.Reverse), label = "e")
                Box(Modifier.size(16.dp).blur(8.dp).graphicsLayer { scaleX = flicker; scaleY = flicker }.background(Accent, CircleShape))
                Box(Modifier
                    .size(120.dp, 18.dp)
                    .clip(RoundedCornerShape(topStart = 9.dp, bottomStart = 9.dp))
                    .background(Color(0xFFF5F5F5)))
                Box(Modifier
                    .size(45.dp, 18.dp)
                    .clip(RoundedCornerShape(topEnd = 6.dp, bottomEnd = 6.dp))
                    .background(Color(0xFFD97706)))
            }
        }
        Spacer(Modifier.height(32.dp))
        Text("ONE AT A TIME", fontFamily = FontFamily.SansSerif, fontSize = 13.sp, color = Accent, letterSpacing = 6.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun LoginForm(vm: MainViewModel, loading: Boolean, message: UiMessage,
                      onForgot: () -> Unit, onSignup: () -> Unit, onGoogle: () -> Unit,
                      onGuest: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var pwd by remember { mutableStateOf("") }
    val fm = LocalFocusManager.current

    Column(Modifier.padding(32.dp)) {
        Text("Vault Access.", fontWeight = FontWeight.Black, fontSize = 28.sp, color = TextMain)
        Text("Sign in to your records.", fontSize = 15.sp, color = TextMuted, modifier = Modifier.padding(top = 4.dp, bottom = 32.dp), fontWeight = FontWeight.Bold)
        
        MessageBanner(message)

        TabakField(email, { email = it }, "Email Address", KeyboardType.Email, ImeAction.Next) { fm.moveFocus(FocusDirection.Down) }
        Spacer(Modifier.height(16.dp))
        TabakField(pwd, { pwd = it }, "Security Phrase", KeyboardType.Password, ImeAction.Done, isPassword = true) { fm.clearFocus(); vm.signIn(email, pwd) }

        Box(Modifier.fillMaxWidth().padding(top = 10.dp)) {
            Text("Lost Phrase?", fontSize = 12.sp, color = TextMuted, modifier = Modifier.align(Alignment.CenterEnd).clickable { onForgot() }, fontWeight = FontWeight.Bold)
        }

        Spacer(Modifier.height(32.dp))
        TabakButton(if (loading) "AUTHENTICATING..." else "SIGN IN", !loading) { vm.signIn(email, pwd) }
        
        Spacer(Modifier.height(20.dp))
        Button(
            onClick = onGoogle,
            modifier = Modifier.fillMaxWidth().height(60.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color.White,
                contentColor = Color(0xFF4285F4)
            ),
            border = BorderStroke(1.dp, Color(0xFF4285F4).copy(alpha = 0.2f))
        ) {
            Image(
                painter = painterResource(id = com.tabakpp.app.R.drawable.ic_google_logo),
                contentDescription = null,
                modifier = Modifier.size(24.dp)
            )
            Spacer(Modifier.width(14.dp))
            Text("Google Authentication", fontWeight = FontWeight.Black)
        }

        TextButton(onClick = onGuest, modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) {
            Text("Proceed Offline", color = TextMuted, fontSize = 14.sp, fontWeight = FontWeight.Bold, textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline)
        }

        TextButton(onSignup, Modifier.fillMaxWidth().padding(top = 8.dp)) {
            Text("New user? ", color = TextMuted, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            Text("Register vault", color = Accent, fontSize = 14.sp, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
private fun SignupForm(vm: MainViewModel, loading: Boolean, message: UiMessage, onLogin: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var pwd by remember { mutableStateOf("") }
    val fm = LocalFocusManager.current

    Column(Modifier.padding(32.dp)) {
        Text("Initialization.", fontWeight = FontWeight.Black, fontSize = 28.sp, color = TextMain)
        Text("Create your tracking vault.", fontSize = 15.sp, color = TextMuted, modifier = Modifier.padding(top = 4.dp, bottom = 32.dp), fontWeight = FontWeight.Bold)
        
        MessageBanner(message)

        TabakField(name, { name = it }, "Identity (Alias)", imeAction = ImeAction.Next) { fm.moveFocus(FocusDirection.Down) }
        Spacer(Modifier.height(16.dp))
        TabakField(email, { email = it }, "Email Address", KeyboardType.Email, ImeAction.Next) { fm.moveFocus(FocusDirection.Down) }
        Spacer(Modifier.height(16.dp))
        TabakField(pwd, { pwd = it }, "Security Phrase (min 6)", KeyboardType.Password, ImeAction.Done, isPassword = true) { fm.clearFocus(); vm.signUp(email, pwd, name) }

        Spacer(Modifier.height(32.dp))
        TabakButton(if (loading) "INITIALIZING..." else "CREATE VAULT", !loading) { vm.signUp(email, pwd, name) }

        TextButton(onLogin, Modifier.fillMaxWidth().padding(top = 12.dp)) {
            Text("Stored vault? ", color = TextMuted, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            Text("Access here", color = Accent, fontSize = 14.sp, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
private fun ForgotForm(vm: MainViewModel, message: UiMessage, onBack: () -> Unit) {
    var email by remember { mutableStateOf("") }
    Column(Modifier.padding(32.dp)) {
        Text("Recovery.", fontWeight = FontWeight.Black, fontSize = 28.sp, color = TextMain)
        Text("Request access link.", fontSize = 15.sp, color = TextMuted, modifier = Modifier.padding(top = 4.dp, bottom = 32.dp), fontWeight = FontWeight.Bold)
        
        MessageBanner(message)
        
        TabakField(email, { email = it }, "Email Address", KeyboardType.Email)
        
        Spacer(Modifier.height(32.dp))
        TabakButton("SEND RECOVERY") { vm.resetPassword(email) }

        TextButton(onBack, Modifier.fillMaxWidth().padding(top = 12.dp)) {
            Text("Return to ", color = TextMuted, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            Text("access point", color = Accent, fontSize = 14.sp, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
fun TabakField(value: String, onChange: (String) -> Unit, label: String,
               keyboardType: KeyboardType = KeyboardType.Text, imeAction: ImeAction = ImeAction.Done,
               isPassword: Boolean = false, onIme: () -> Unit = {}) {
    OutlinedTextField(value, onChange,
        label = { Text(label, fontSize = 14.sp, fontWeight = FontWeight.Bold) },
        singleLine = true,
        visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
        keyboardActions = KeyboardActions(onAny = { onIme() }),
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Accent,
            unfocusedBorderColor = BorderSubtle,
            focusedLabelColor = Accent,
            unfocusedLabelColor = TextMuted,
            cursorColor = Accent,
            focusedTextColor = TextMain,
            unfocusedTextColor = TextMain,
            focusedContainerColor = TextMain.copy(alpha = 0.02f),
            unfocusedContainerColor = TextMain.copy(alpha = 0.02f)))
}

@Composable
fun TabakButton(text: String, enabled: Boolean = true, onClick: () -> Unit) =
    Button(onClick, enabled = enabled,
        modifier = Modifier.fillMaxWidth().height(60.dp),
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = AccentFg,
            disabledContainerColor = Accent.copy(alpha = .4f),
            disabledContentColor = AccentFg.copy(alpha = .4f))) {
        Text(text, fontWeight = FontWeight.Black, fontSize = 16.sp, letterSpacing = 1.sp)
    }

@Composable
fun MessageBanner(message: UiMessage) {
    when (message) {
        is UiMessage.Error -> Card(
            modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = DangerColor.copy(alpha = .1f)),
            border = BorderStroke(1.dp, DangerColor.copy(alpha = .3f))) {
            Text(message.msg, color = DangerColor, fontSize = 14.sp, modifier = Modifier.padding(16.dp), fontWeight = FontWeight.Bold)
        }
        is UiMessage.Success -> Card(
            modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = SuccessColor.copy(alpha = .1f)),
            border = BorderStroke(1.dp, SuccessColor.copy(alpha = .3f))) {
            Text(message.msg, color = SuccessColor, fontSize = 14.sp, modifier = Modifier.padding(16.dp), fontWeight = FontWeight.Bold)
        }
        else -> {}
    }
}
