package com.example.waiter_app

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.firebase.firestore.FirebaseFirestore
import com.example.waiter_app.services.FinalizeOrderService

class OrderActivity : AppCompatActivity() {

    private val db = FirebaseFirestore.getInstance()
    private val lines = mutableListOf<OrderLine>()
    private lateinit var adapter: OrderAdapter

    private var tableName: String? = null
    private var currentOrderId: String? = null
    private lateinit var totalText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_order)

        val btnFinalizeOrder = findViewById<Button>(R.id.btnFinalizeOrder)

        tableName = intent.getStringExtra("TABLE_NAME")

        findViewById<TextView>(R.id.orderTitle).text = "Order - $tableName"
        totalText = findViewById(R.id.orderTotal)

        val recycler = findViewById<RecyclerView>(R.id.orderRecycler)
        recycler.layoutManager = LinearLayoutManager(this)

        adapter = OrderAdapter(lines)
        recycler.adapter = adapter

        loadOrder()

        btnFinalizeOrder.setOnClickListener {
            val orderId = currentOrderId

            if (orderId == null) {
                android.widget.Toast.makeText(this, "No open order found yet.", android.widget.Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            FinalizeOrderService().finalizeOrder(
                orderId = orderId,
                onSuccess = { warnings ->

                    // Refresh the screen so it no longer shows as open
                    loadOrder()

                    if (warnings.isNotEmpty()) {
                        val msg = warnings.joinToString("\n") {
                            "⚠ ${it.name}: low (${it.openMl}ml left)"
                        }

                        androidx.appcompat.app.AlertDialog.Builder(this)
                            .setTitle("Stock warning")
                            .setMessage(msg)
                            .setPositiveButton("OK", null)
                            .show()
                    } else {
                        android.widget.Toast.makeText(this, "Order finalized!", android.widget.Toast.LENGTH_SHORT).show()
                    }
                },
                onError = { e ->
                    android.util.Log.e("FINALIZE_DEBUG", "Finalize failed", e)
                    android.widget.Toast.makeText(
                        this,
                        "Finalize failed: ${e.message}",
                        android.widget.Toast.LENGTH_LONG
                    ).show()
                }
            )
        }
    }

    private fun loadOrder() {
        db.collection("orders")
            .whereEqualTo("table", tableName)
            .whereEqualTo("status", "open")
            .limit(1)
            .get()
            .addOnSuccessListener { result ->
                android.util.Log.d("ORDER_DEBUG", "Items found: ${result.documents.size}")
                if (result.isEmpty) {
                    lines.clear()
                    adapter.notifyDataSetChanged()
                    totalText.text = "Total: €0.00"
                    currentOrderId = null
                    return@addOnSuccessListener
                }

                val orderId = result.documents[0].id
                currentOrderId = orderId

                db.collection("orders")
                    .document(orderId)
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
            }
            .addOnFailureListener { e ->
                android.util.Log.e("ORDER_DEBUG", "Failed loading order items", e)
                android.widget.Toast.makeText(
                    this,
                    "Order load failed: ${e.message}",
                    android.widget.Toast.LENGTH_LONG
                ).show()
            }
    }

}