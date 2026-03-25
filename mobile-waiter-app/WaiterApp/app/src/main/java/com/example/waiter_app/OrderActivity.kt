package com.example.waiter_app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.button.MaterialButton
import com.example.waiter_app.services.ApiClient

class OrderActivity : AppCompatActivity() {

    private val lines = mutableListOf<OrderLine>()
    private lateinit var adapter: OrderAdapter
    private lateinit var btnFinalizeOrder: MaterialButton
    private lateinit var btnClearOrder: MaterialButton
    private lateinit var totalText: TextView
    private lateinit var emptyOrderText: TextView

    private var tableId: String? = null
    private var tableName: String? = null
    private var currentOrderId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_order)

        tableId = intent.getStringExtra("TABLE_ID")
        tableName = intent.getStringExtra("TABLE_NAME")

        val toolbar = findViewById<MaterialToolbar>(R.id.toolbar)
        setSupportActionBar(toolbar)
        supportActionBar?.apply {
            title = "Order — $tableName"
            setDisplayHomeAsUpEnabled(true)
        }

        btnFinalizeOrder = findViewById(R.id.btnFinalizeOrder)
        btnClearOrder = findViewById(R.id.btnClearOrder)
        totalText = findViewById(R.id.orderTotal)
        emptyOrderText = findViewById(R.id.emptyOrderText)

        val recycler = findViewById<RecyclerView>(R.id.orderRecycler)
        recycler.layoutManager = LinearLayoutManager(this)
        adapter = OrderAdapter(
            items = lines,
            onIncrement = { line -> incrementItem(line) },
            onDecrement = { line -> decrementItem(line) }
        )
        recycler.adapter = adapter

        loadOrder()

        btnFinalizeOrder.setOnClickListener {
            val orderId = currentOrderId ?: run {
                Toast.makeText(this, "No open order found.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            finalizeOrder(orderId)
        }

        btnClearOrder.setOnClickListener {
            val oid = currentOrderId ?: return@setOnClickListener
            AlertDialog.Builder(this)
                .setTitle("Clear Order")
                .setMessage("Remove all items from this order?")
                .setPositiveButton("Clear") { _, _ -> clearOrder(oid) }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        onBackPressedDispatcher.onBackPressed()
        return true
    }

    // ── Qty editing ───────────────────────────────────────────────────────────

    private fun incrementItem(line: OrderLine) {
        val oid = currentOrderId ?: return
        val newQty = (line.qty + 1).toInt()
        ApiClient.updateOrderItem(oid, line.itemId, newQty,
            onSuccess = { runOnUiThread { loadOrder() } },
            onError = { e -> runOnUiThread { Toast.makeText(this, "Update failed: ${e.message}", Toast.LENGTH_SHORT).show() } }
        )
    }

    private fun decrementItem(line: OrderLine) {
        val oid = currentOrderId ?: return
        if (line.qty <= 1L) {
            ApiClient.deleteOrderItem(oid, line.itemId,
                onSuccess = { runOnUiThread { loadOrder() } },
                onError = { e -> runOnUiThread { Toast.makeText(this, "Remove failed: ${e.message}", Toast.LENGTH_SHORT).show() } }
            )
        } else {
            val newQty = (line.qty - 1).toInt()
            ApiClient.updateOrderItem(oid, line.itemId, newQty,
                onSuccess = { runOnUiThread { loadOrder() } },
                onError = { e -> runOnUiThread { Toast.makeText(this, "Update failed: ${e.message}", Toast.LENGTH_SHORT).show() } }
            )
        }
    }

    // ── Clear order ───────────────────────────────────────────────────────────

    private fun clearOrder(oid: String) {
        // Delete each item then navigate away
        ApiClient.getOrderDetails(oid,
            onSuccess = { order ->
                val items = order["items"] as? List<Map<String, Any>> ?: emptyList()
                var remaining = items.size
                if (remaining == 0) {
                    runOnUiThread { navigateToTables() }
                    return@getOrderDetails
                }
                for (item in items) {
                    val itemId = item["id"] as? String ?: continue
                    ApiClient.deleteOrderItem(oid, itemId,
                        onSuccess = {
                            remaining--
                            if (remaining <= 0) {
                                runOnUiThread {
                                    currentOrderId = null
                                    navigateToTables()
                                }
                            }
                        },
                        onError = { e ->
                            runOnUiThread { Toast.makeText(this, "Clear failed: ${e.message}", Toast.LENGTH_LONG).show() }
                        }
                    )
                }
            },
            onError = { e ->
                runOnUiThread { Toast.makeText(this, "Clear failed: ${e.message}", Toast.LENGTH_LONG).show() }
            }
        )
    }

    // ── Finalize ──────────────────────────────────────────────────────────────

    private fun finalizeOrder(orderId: String) {
        setFinalizing(true)

        ApiClient.finalizeOrder(
            orderId = orderId,
            onSuccess = { warnings ->
                runOnUiThread {
                    setFinalizing(false)

                    if (warnings.isNotEmpty()) {
                        val msg = warnings.joinToString("\n\n") { warning ->
                            val name = warning["name"] as? String ?: "Unknown"
                            val openMl = (warning["openMl"] as? Number)?.toInt() ?: 0
                            val stock = (warning["stock"] as? Number)?.toInt() ?: 0
                            val message = warning["message"] as? String ?: "Low stock"
                            "⚠ $name: $message (${openMl}ml left, $stock bottles)"
                        }

                        AlertDialog.Builder(this)
                            .setTitle("Stock Alerts")
                            .setMessage(msg)
                            .setPositiveButton("OK") { _, _ -> navigateToTables() }
                            .show()
                    } else {
                        navigateToTables()
                    }
                }
            },
            onError = { e ->
                runOnUiThread {
                    setFinalizing(false)
                    Log.e("OrderActivity", "Finalize failed", e)
                    Toast.makeText(this, "Finalize failed: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    private fun setFinalizing(active: Boolean) {
        btnFinalizeOrder.isEnabled = !active
        btnFinalizeOrder.text = if (active) "Finalizing…" else "Finalize Order"
        btnClearOrder.isEnabled = !active
    }

    private fun navigateToTables() {
        val intent = Intent(this, TablesActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        startActivity(intent)
        finish()
    }

    // ── Load order ────────────────────────────────────────────────────────────

    private fun loadOrder() {
        val id = tableId ?: return

        ApiClient.getOpenOrder(
            tableId = id,
            onSuccess = { orderId, _ ->
                if (orderId == null) {
                    runOnUiThread {
                        lines.clear()
                        adapter.notifyDataSetChanged()
                        totalText.text = "Total: €0.00"
                        currentOrderId = null
                        showEmptyState(true)
                    }
                    return@getOpenOrder
                }

                currentOrderId = orderId

                ApiClient.getOrderDetails(
                    orderId = orderId,
                    onSuccess = { order ->
                        runOnUiThread {
                            lines.clear()
                            val items = order["items"] as? List<Map<String, Any>> ?: emptyList()

                            for (item in items) {
                                val itemId = item["id"] as? String ?: ""
                                val name = item["name"] as? String ?: "Item"
                                val qty = (item["qty"] as? Number)?.toLong() ?: 1L
                                val unitPrice = (item["unitPrice"] as? Number)?.toDouble() ?: 0.0
                                lines.add(OrderLine(itemId, name, qty, unitPrice))
                            }

                            adapter.notifyDataSetChanged()
                            val total = (order["total"] as? Number)?.toDouble() ?: 0.0
                            totalText.text = "Total: €${"%.2f".format(total)}"
                            showEmptyState(lines.isEmpty())
                        }
                    },
                    onError = { e ->
                        runOnUiThread {
                            Log.e("OrderActivity", "Failed to load order items", e)
                            Toast.makeText(this, "Failed to load items: ${e.message}", Toast.LENGTH_LONG).show()
                        }
                    }
                )
            },
            onError = { e ->
                runOnUiThread {
                    Log.e("OrderActivity", "Failed to load order", e)
                    Toast.makeText(this, "Failed to load order: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    private fun showEmptyState(empty: Boolean) {
        val recycler = findViewById<RecyclerView>(R.id.orderRecycler)
        recycler.visibility = if (empty) View.GONE else View.VISIBLE
        emptyOrderText.visibility = if (empty) View.VISIBLE else View.GONE
        btnFinalizeOrder.isEnabled = !empty
        btnClearOrder.isEnabled = !empty
    }
}
