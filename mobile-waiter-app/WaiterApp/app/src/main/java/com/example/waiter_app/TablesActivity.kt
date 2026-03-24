package com.example.waiter_app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.appbar.MaterialToolbar
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

class TablesActivity : AppCompatActivity() {

    private lateinit var recyclerView: RecyclerView
    private lateinit var emptyText: TextView
    private val db = FirebaseFirestore.getInstance()
    private val tablesList = mutableListOf<Table>()
    private lateinit var adapter: TablesAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_tables)

        val toolbar = findViewById<MaterialToolbar>(R.id.toolbar)
        setSupportActionBar(toolbar)

        emptyText = findViewById(R.id.emptyText)
        recyclerView = findViewById(R.id.tablesRecycler)
        // 2-column grid for scannable table cards
        recyclerView.layoutManager = GridLayoutManager(this, 2)

        adapter = TablesAdapter(tablesList)
        recyclerView.adapter = adapter
    }

    override fun onResume() {
        super.onResume()
        // Refresh table status every time we return (e.g. from menu)
        loadTables()
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.menu_tables, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_logout -> {
                FirebaseAuth.getInstance().signOut()
                val intent = Intent(this, LoginActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun loadTables() {
        db.collection("tables")
            .whereEqualTo("active", true)
            .get()
            .addOnSuccessListener { tableResult ->
                Log.d("TablesActivity", "Tables fetched: ${tableResult.size()}")

                val tables = tableResult.documents.map { doc ->
                    Table(id = doc.id, name = doc.getString("name") ?: doc.id)
                }

                // Query all open orders to mark which tables are active
                db.collection("orders")
                    .whereEqualTo("status", "open")
                    .get()
                    .addOnSuccessListener { ordersResult ->
                        val tablesWithOpenOrders = ordersResult.documents
                            .mapNotNull { it.getString("table") }
                            .toSet()

                        tablesList.clear()
                        tables.mapTo(tablesList) { table ->
                            table.copy(hasOpenOrder = table.id in tablesWithOpenOrders)
                        }
                        // Sort by the trailing number in the name ("Table 10" → 10),
                        // then alphabetically as fallback for non-numeric names.
                        tablesList.sortWith(compareBy(
                            { tableNumber(it.name) },
                            { it.name }
                        ))

                        adapter.notifyDataSetChanged()
                        emptyText.visibility = if (tablesList.isEmpty()) View.VISIBLE else View.GONE
                    }
                    .addOnFailureListener {
                        // Orders query failed — show tables without status
                        tablesList.clear()
                        tablesList.addAll(tables.sortedWith(compareBy({ tableNumber(it.name) }, { it.name })))
                        adapter.notifyDataSetChanged()
                        emptyText.visibility = if (tablesList.isEmpty()) View.VISIBLE else View.GONE
                    }
            }
            .addOnFailureListener { e ->
                Log.e("TablesActivity", "Failed to fetch tables", e)
                Toast.makeText(this, "Failed to load tables: ${e.message}", Toast.LENGTH_LONG).show()
            }
    }

    companion object {
        /** Extracts the last run of digits from a name for natural numeric sorting.
         *  "Table 10" → 10, "Table 2" → 2, "VIP" → Int.MAX_VALUE */
        private fun tableNumber(name: String): Int =
            Regex("""\d+""").findAll(name).lastOrNull()?.value?.toIntOrNull() ?: Int.MAX_VALUE
    }
}
