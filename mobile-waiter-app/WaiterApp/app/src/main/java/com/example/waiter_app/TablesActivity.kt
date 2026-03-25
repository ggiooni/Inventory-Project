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
import com.example.waiter_app.services.ApiClient

class TablesActivity : AppCompatActivity() {

    private lateinit var recyclerView: RecyclerView
    private lateinit var emptyText: TextView
    private val tablesList = mutableListOf<Table>()
    private lateinit var adapter: TablesAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_tables)

        val toolbar = findViewById<MaterialToolbar>(R.id.toolbar)
        setSupportActionBar(toolbar)

        emptyText = findViewById(R.id.emptyText)
        recyclerView = findViewById(R.id.tablesRecycler)
        recyclerView.layoutManager = GridLayoutManager(this, 2)

        adapter = TablesAdapter(tablesList)
        recyclerView.adapter = adapter
    }

    override fun onResume() {
        super.onResume()
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
                ApiClient.clearToken()
                val intent = Intent(this, LoginActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun loadTables() {
        ApiClient.getTables(
            onSuccess = { tables ->
                runOnUiThread {
                    Log.d("TablesActivity", "Tables fetched via API: ${tables.size}")

                    val parsedTables = tables.map { data ->
                        Table(
                            id = data["id"] as? String ?: "",
                            name = data["name"] as? String ?: "Unknown",
                            hasOpenOrder = false
                        )
                    }

                    // Fetch open orders to mark which tables have active orders
                    ApiClient.getOrders(
                        status = "open",
                        onSuccess = { orders ->
                            runOnUiThread {
                                val tablesWithOrders = orders
                                    .mapNotNull { it["table"] as? String }
                                    .toSet()

                                tablesList.clear()
                                parsedTables.mapTo(tablesList) { table ->
                                    table.copy(hasOpenOrder = table.id in tablesWithOrders)
                                }

                                tablesList.sortWith(compareBy(
                                    { tableNumber(it.name) },
                                    { it.name }
                                ))

                                adapter.notifyDataSetChanged()
                                emptyText.visibility = if (tablesList.isEmpty()) View.VISIBLE else View.GONE
                            }
                        },
                        onError = {
                            runOnUiThread {
                                tablesList.clear()
                                tablesList.addAll(parsedTables.sortedWith(compareBy({ tableNumber(it.name) }, { it.name })))
                                adapter.notifyDataSetChanged()
                                emptyText.visibility = if (tablesList.isEmpty()) View.VISIBLE else View.GONE
                            }
                        }
                    )
                }
            },
            onError = { e ->
                runOnUiThread {
                    Log.e("TablesActivity", "Failed to fetch tables from API", e)
                    Toast.makeText(this, "API error: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    companion object {
        private fun tableNumber(name: String): Int =
            Regex("""\d+""").findAll(name).lastOrNull()?.value?.toIntOrNull() ?: Int.MAX_VALUE
    }
}
