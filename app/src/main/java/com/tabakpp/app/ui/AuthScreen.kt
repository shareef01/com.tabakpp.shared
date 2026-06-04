package com.tabakpp.app.ui

import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
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
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
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
            Toast.makeText(context, "Permission needed for guest session storage.", Toast.LENGTH_LONG).show()
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
            Toast.makeText(context, "Google Sign-In Failed (${e.statusCode})", Toast.LENGTH_SHORT).show()
        } catch (_: Exception) {
            Toast.makeText(context, "Login Error", Toast.LENGTH_SHORT).show()
        }
    }

    Box(Modifier.fillMaxSize().background(BgBase)) {
        Box(Modifier.fillMaxSize().background(
            Brush.radialGradient(
                colors = listOf(Accent.copy(alpha = .08f), Color.Transparent),
                radius = 1200f
            )
        ))
            
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally) {
            
            CigaretteLogo(Modifier.padding(top = 80.dp, bottom = 40.dp))

            Card(Modifier.fillMaxWidth().padding(horizontal = 32.dp, vertical = 20.dp),
                shape = RoundedCornerShape(32.dp),
                colors = CardDefaults.cardColors(containerColor = TextMain.copy(alpha = 0.03f)),
                border = BorderStroke(1.dp, BorderSubtle)) {
                
                AnimatedContent(form, transitionSpec = { fadeIn() togetherWith fadeOut() },
                    label = "form") { f ->
                    when (f) {
                        AuthForm.LOGIN  -> LoginForm(viewModel, isLoading, message,
                            { form = AuthForm.FORGOT }, { form = AuthForm.SIGNUP },
                            onGoogle = {
                                val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                                    .requestIdToken("651175477527-qn8ntoef1ja4664fq8uf0fuvtbg9d5kf.apps.googleusercontent.com")
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
            Spacer(Modifier.height(40.dp))
        }
    }
}

@Composable
fun CigaretteLogo(modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Box(contentAlignment = Alignment.Center) {
            Box(Modifier.offset(y = (-40).dp)) {
                repeat(3) { i ->
                    Box(Modifier
                        .offset(x = (i * 12 - 12).dp, y = (i * 4).dp)
                        .size(2.dp, 30.dp)
                        .blur(4.dp)
                        .background(Accent.copy(alpha = 0.2f), CircleShape))
                }
            }
            
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(12.dp).blur(6.dp).background(Accent, CircleShape))
                Box(Modifier
                    .size(100.dp, 14.dp)
                    .clip(RoundedCornerShape(topStart = 7.dp, bottomStart = 7.dp))
                    .background(if (TextMain == Color.White) Color(0xFF1A1A1C) else Color(0xFFCCCCCC)))
                Box(Modifier
                    .size(40.dp, 14.dp)
                    .clip(RoundedCornerShape(topEnd = 4.dp, bottomEnd = 4.dp))
                    .background(Color(0xFFD97706)))
            }
        }
        Spacer(Modifier.height(24.dp))
        Text("ONE AT A TIME", fontFamily = FontFamily.Monospace, fontSize = 12.sp, color = Accent, letterSpacing = 4.sp, fontWeight = FontWeight.Bold)
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
        Text("Welcome back.", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 24.sp, color = TextMain)
        Text("Sign in to continue.", fontSize = 14.sp, color = TextMuted, modifier = Modifier.padding(top = 4.dp, bottom = 24.dp))
        
        MessageBanner(message)

        TabakField(email, { email = it }, "Email", KeyboardType.Email, ImeAction.Next) { fm.moveFocus(FocusDirection.Down) }
        Spacer(Modifier.height(12.dp))
        TabakField(pwd, { pwd = it }, "Password", KeyboardType.Password, ImeAction.Done, isPassword = true) { fm.clearFocus(); vm.signIn(email, pwd) }

        Box(Modifier.fillMaxWidth().padding(top = 8.dp)) {
            Text("Forgot?", fontSize = 12.sp, color = TextMuted, modifier = Modifier.align(Alignment.CenterEnd).clickable { onForgot() })
        }

        Spacer(Modifier.height(24.dp))
        TabakButton(if (loading) "Signing in..." else "Sign In", !loading) { vm.signIn(email, pwd) }
        
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = onGoogle,
            modifier = Modifier.fillMaxWidth().height(56.dp),
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
                modifier = Modifier.size(20.dp)
            )
            Spacer(Modifier.width(12.dp))
            Text("Sign in with Google", fontWeight = FontWeight.Bold)
        }

        TextButton(onClick = onGuest, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
            Text("Continue without an account", color = TextMuted, fontSize = 13.sp, textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline)
        }

        TextButton(onSignup, Modifier.fillMaxWidth().padding(top = 4.dp)) {
            Text("New here? ", color = TextMuted, fontSize = 13.sp)
            Text("Create account", color = Accent, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
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
        Text("Join us.", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 24.sp, color = TextMain)
        Text("Start tracking your journey.", fontSize = 14.sp, color = TextMuted, modifier = Modifier.padding(top = 4.dp, bottom = 24.dp))
        
        MessageBanner(message)

        TabakField(name, { name = it }, "Name (optional)", imeAction = ImeAction.Next) { fm.moveFocus(FocusDirection.Down) }
        Spacer(Modifier.height(12.dp))
        TabakField(email, { email = it }, "Email", KeyboardType.Email, ImeAction.Next) { fm.moveFocus(FocusDirection.Down) }
        Spacer(Modifier.height(12.dp))
        TabakField(pwd, { pwd = it }, "Password (min 6)", KeyboardType.Password, ImeAction.Done, isPassword = true) { fm.clearFocus(); vm.signUp(email, pwd, name) }

        Spacer(Modifier.height(28.dp))
        TabakButton(if (loading) "Creating..." else "Create Account", !loading) { vm.signUp(email, pwd, name) }

        TextButton(onLogin, Modifier.fillMaxWidth().padding(top = 12.dp)) {
            Text("Have an account? ", color = TextMuted, fontSize = 13.sp)
            Text("Sign in", color = Accent, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun ForgotForm(vm: MainViewModel, message: UiMessage, onBack: () -> Unit) {
    var email by remember { mutableStateOf("") }
    Column(Modifier.padding(32.dp)) {
        Text("Recover.", fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 24.sp, color = TextMain)
        Text("We'll send a recovery link.", fontSize = 14.sp, color = TextMuted, modifier = Modifier.padding(top = 4.dp, bottom = 24.dp))
        
        MessageBanner(message)
        
        TabakField(email, { email = it }, "Email", KeyboardType.Email)
        
        Spacer(Modifier.height(28.dp))
        TabakButton("Send Link") { vm.resetPassword(email) }

        TextButton(onBack, Modifier.fillMaxWidth().padding(top = 12.dp)) {
            Text("Back to ", color = TextMuted, fontSize = 13.sp)
            Text("sign in", color = Accent, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
fun TabakField(value: String, onChange: (String) -> Unit, label: String,
               keyboardType: KeyboardType = KeyboardType.Text, imeAction: ImeAction = ImeAction.Done,
               isPassword: Boolean = false, onIme: () -> Unit = {}) {
    OutlinedTextField(value, onChange,
        label = { Text(label, fontSize = 13.sp) },
        singleLine = true,
        visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
        keyboardActions = KeyboardActions(onAny = { onIme() }),
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
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
        modifier = Modifier.fillMaxWidth().height(56.dp),
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = AccentFg,
            disabledContainerColor = Accent.copy(alpha = .4f),
            disabledContentColor = AccentFg.copy(alpha = .4f))) {
        Text(text, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
    }

@Composable
fun MessageBanner(message: UiMessage) {
    when (message) {
        is UiMessage.Error -> Card(
            modifier = Modifier.fillMaxWidth().padding(bottom = 20.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = DangerColor.copy(alpha = .08f)),
            border = BorderStroke(1.dp, DangerColor.copy(alpha = .2f))) {
            Text(message.msg, color = DangerColor, fontSize = 13.sp, modifier = Modifier.padding(16.dp))
        }
        is UiMessage.Success -> Card(
            modifier = Modifier.fillMaxWidth().padding(bottom = 20.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = SuccessColor.copy(alpha = .08f)),
            border = BorderStroke(1.dp, SuccessColor.copy(alpha = .2f))) {
            Text(message.msg, color = SuccessColor, fontSize = 13.sp, modifier = Modifier.padding(16.dp))
        }
        else -> {}
    }
}
