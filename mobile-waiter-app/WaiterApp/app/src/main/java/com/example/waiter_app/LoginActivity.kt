package com.example.waiter_app

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.auth.FirebaseAuth
import com.example.waiter_app.services.ApiClient

class LoginActivity : AppCompatActivity() {

    private lateinit var auth: FirebaseAuth

    private lateinit var emailInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var loginButton: Button
    private lateinit var loading: ProgressBar
    private lateinit var errorText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        auth = FirebaseAuth.getInstance()

        // If already logged in to Firebase but no API token, force re-login
        // (API token is lost when app restarts since it's only in memory)
        if (auth.currentUser != null && !ApiClient.hasToken()) {
            auth.signOut()
        }

        emailInput = findViewById(R.id.emailInput)
        passwordInput = findViewById(R.id.passwordInput)
        loginButton = findViewById(R.id.loginButton)
        loading = findViewById(R.id.loading)
        errorText = findViewById(R.id.errorText)

        loginButton.setOnClickListener {
            errorText.visibility = View.GONE

            val email = emailInput.text.toString().trim()
            val password = passwordInput.text.toString()

            if (email.isBlank() || password.isBlank()) {
                showError("Please enter email and password.")
                return@setOnClickListener
            }

            setLoading(true)

            // Step 1: Authenticate with Firebase
            auth.signInWithEmailAndPassword(email, password)
                .addOnSuccessListener {
                    // Step 2: Get JWT token from backend API
                    ApiClient.login(
                        email = email,
                        password = password,
                        onSuccess = { _ ->
                            runOnUiThread {
                                setLoading(false)
                                goToTables()
                            }
                        },
                        onError = { e ->
                            runOnUiThread {
                                setLoading(false)
                                showError("API login failed: ${e.message}")
                            }
                        }
                    )
                }
                .addOnFailureListener { e ->
                    setLoading(false)
                    showError(e.message ?: "Login failed")
                }
        }
    }

    private fun setLoading(isLoading: Boolean) {
        loading.visibility = if (isLoading) View.VISIBLE else View.GONE
        loginButton.isEnabled = !isLoading
    }

    private fun showError(message: String) {
        errorText.text = message
        errorText.visibility = View.VISIBLE
    }

    private fun goToTables() {
        startActivity(Intent(this, TablesActivity::class.java))
        finish()
    }
}
