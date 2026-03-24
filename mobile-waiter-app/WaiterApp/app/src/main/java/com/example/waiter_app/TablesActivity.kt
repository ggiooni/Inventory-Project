package com.example.waiter_app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

class TablesActivity : AppCompatActivity() {

    private lateinit var recyclerView: RecyclerView
    private val db = FirebaseFirestore.getInstance()
    private val tablesList = mutableListOf<Table>()
    private lateinit var adapter: TablesAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_tables)

        recyclerView = findViewById(R.id.tablesRecycler)
        recyclerView.layoutManager = LinearLayoutManager(this)

        adapter = TablesAdapter(tablesList)
        recyclerView.adapter = adapter

        loadTables()

        findViewById<Button>(R.id.btnLogout).setOnClickListener {
            FirebaseAuth.getInstance().signOut()
            val intent = Intent(this, LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
        }
    }

    private fun loadTables() {
        // Only fetches `name` and `active` — no inventory or recipe data
        db.collection("tables")
            .whereEqualTo("active", true)
            .get()
            .addOnSuccessListener { result ->
                Log.d("TablesActivity", "Tables fetched: ${result.size()}")

                tablesList.clear()
                for (doc in result.documents) {
                    val name = doc.getString("name") ?: doc.id
                    tablesList.add(Table(id = doc.id, name = name))
                }

                adapter.notifyDataSetChanged()

                if (tablesList.isEmpty()) {
                    Toast.makeText(this, "No tables found", Toast.LENGTH_LONG).show()
                }
            }
            .addOnFailureListener { e ->
                Log.e("TablesActivity", "Failed to fetch tables", e)
                Toast.makeText(this, "Failed to load tables: ${e.message}", Toast.LENGTH_LONG).show()
            }
    }
}
