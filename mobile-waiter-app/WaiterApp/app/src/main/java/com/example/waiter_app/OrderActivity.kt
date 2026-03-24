package com.example.waiter_app

import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.waiter_app.services.FinalizeOrderService
import com.example.waiter_app.services.InsufficientStockWarning
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException

class OrderActivity : AppCompatActivity() {

    private val db = FirebaseFirestore.getInstance()
    private val lines = mutableListOf<OrderLine>()
    private lateinit var adapter: OrderAdapter
    private lateinit var btnFinalizeOrder: Button
    private lateinit var totalText: TextView

    private var tableId: String? = null
    private var tableName: String? = null
    private var currentOrderId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_order)

        tableId = intent.getStringExtra("TABLE_ID")
        tableName = intent.getStringExtra("TABLE_NAME")

        btnFinalizeOrder = findViewById(R.id.btnFinalizeOrder)
        totalText = findViewById(R.id.orderTotal)

        findViewById<TextView>(R.id.orderTitle).text = "Order - $tableName"

        val recycler = findViewById<RecyclerView>(R.id.orderRecycler)
        recycler.layoutManager = LinearLayoutManager(this)
        adapter = OrderAdapter(lines)
        recycler.adapter = adapter

        loadOrder()

        btnFinalizeOrder.setOnClickListener {
            val orderId = currentOrderId ?: run {
                Toast.makeText(this, "No open order found.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            finalizeOrder(orderId)
        }
    }

    private fun finalizeOrder(orderId: String) {
        setFinalizing(true)

        FinalizeOrderService().finalizeOrder(
            orderId = orderId,
            onSuccess = { lowStock, insufficient ->
                setFinalizing(false)
                loadOrder()

                val lines = mutableListOf<String>()
                insufficient.forEach { lines.add("OUT OF STOCK: ${it.name} (needed ${it.requestedMl}ml, had ${it.availableMl}ml)") }
                lowStock.forEach { lines.add("Low stock: ${it.name}: ${it.openMl}ml left") }

                if (lines.isNotEmpty()) {
                    AlertDialog.Builder(this)
                        .setTitle("Stock Alerts")
                        .setMessage(lines.joinToString("\n"))
                        .setPositiveButton("OK", null)
                        .show()
                } else {
                    Toast.makeText(this, "Order finalized!", Toast.LENGTH_SHORT).show()
                }
            },
            onError = { e ->
                setFinalizing(false)
                Log.e("OrderActivity", "Finalize failed", e)
                Toast.makeText(this, errorMessage(e), Toast.LENGTH_LONG).show()
            }
        )
    }

    /** Disables the button and updates its label while a finalization is in progress. */
    private fun setFinalizing(active: Boolean) {
        btnFinalizeOrder.isEnabled = !active
        btnFinalizeOrder.text = if (active) "Finalizing…" else "Finalize Order"
    }

    private fun loadOrder() {
        val id = tableId ?: return

        db.collection("orders")
            .whereEqualTo("table", id)
            .whereEqualTo("status", "open")
            .limit(1)
            .get()
            .addOnSuccessListener { result ->
                if (result.isEmpty) {
                    lines.clear()
                    adapter.notifyDataSetChanged()
                    totalText.text = "Total: €0.00"
                    currentOrderId = null
                    return@addOnSuccessListener
                }

                val orderId = result.documents[0].id
                currentOrderId = orderId

                db.collection("orders").document(orderId)
                    .collection("items")
                    .get()
                    .addOnSuccessListener { items ->
                        lines.clear()
                        var total = 0.0

                        for (doc in items.documents) {
                            val name = doc.getString("name") ?: "Item"
                            val qty = doc.getLong("qty") ?: 1L
                            val unitPrice = doc.getDouble("unitPrice") ?: 0.0
                            val line = OrderLine(name, qty, unitPrice)
                            lines.add(line)
                            total += line.lineTotal
                        }

                        adapter.notifyDataSetChanged()
                        totalText.text = "Total: €${"%.2f".format(total)}"
                    }
                    .addOnFailureListener { e ->
                        Log.e("OrderActivity", "Failed to load order items", e)
                        Toast.makeText(this, "Failed to load items: ${e.message}", Toast.LENGTH_LONG).show()
                    }
            }
            .addOnFailureListener { e ->
                Log.e("OrderActivity", "Failed to load order", e)
                Toast.makeText(this, "Failed to load order: ${e.message}", Toast.LENGTH_LONG).show()
            }
    }

    private fun errorMessage(e: Exception): String = when {
        e is FirebaseFirestoreException &&
                e.code == FirebaseFirestoreException.Code.ABORTED ->
            "Transaction conflict. Please try again."

        e is FirebaseFirestoreException &&
                e.code == FirebaseFirestoreException.Code.UNAVAILABLE ->
            "Network error. Check your connection."

        e.message?.contains("Order not found", ignoreCase = true) == true ->
            "Order not found. It may have already been closed."

        else -> "Finalize failed: ${e.message}"
    }
}
