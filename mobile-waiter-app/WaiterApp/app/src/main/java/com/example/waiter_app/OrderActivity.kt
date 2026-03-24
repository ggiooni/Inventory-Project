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
import com.example.waiter_app.services.FinalizeOrderService
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.button.MaterialButton
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException

class OrderActivity : AppCompatActivity() {

    private val db = FirebaseFirestore.getInstance()
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
        db.collection("orders").document(oid).collection("items").document(line.itemId)
            .update("qty", FieldValue.increment(1))
            .addOnSuccessListener { loadOrder() }
            .addOnFailureListener { e ->
                Toast.makeText(this, "Update failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    private fun decrementItem(line: OrderLine) {
        val oid = currentOrderId ?: return
        val itemRef = db.collection("orders").document(oid).collection("items").document(line.itemId)
        if (line.qty <= 1L) {
            itemRef.delete()
                .addOnSuccessListener { loadOrder() }
                .addOnFailureListener { e ->
                    Toast.makeText(this, "Remove failed: ${e.message}", Toast.LENGTH_SHORT).show()
                }
        } else {
            itemRef.update("qty", FieldValue.increment(-1))
                .addOnSuccessListener { loadOrder() }
                .addOnFailureListener { e ->
                    Toast.makeText(this, "Update failed: ${e.message}", Toast.LENGTH_SHORT).show()
                }
        }
    }

    // ── Clear order ───────────────────────────────────────────────────────────

    private fun clearOrder(oid: String) {
        val itemsRef = db.collection("orders").document(oid).collection("items")
        itemsRef.get().addOnSuccessListener { items ->
            val batch = db.batch()
            items.documents.forEach { batch.delete(it.reference) }
            batch.delete(db.collection("orders").document(oid))
            batch.commit().addOnSuccessListener {
                currentOrderId = null
                navigateToTables()
            }.addOnFailureListener { e ->
                Toast.makeText(this, "Clear failed: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    // ── Finalize ──────────────────────────────────────────────────────────────

    private fun finalizeOrder(orderId: String) {
        setFinalizing(true)

        FinalizeOrderService().finalizeOrder(
            orderId = orderId,
            onSuccess = { lowStock, insufficient ->
                setFinalizing(false)

                val alerts = mutableListOf<String>()
                insufficient.forEach { alerts.add("⚠ OUT OF STOCK: ${it.name} (needed ${it.requestedMl}ml, had ${it.availableMl}ml)") }
                lowStock.forEach { alerts.add("Low stock: ${it.name} — ${it.openMl}ml remaining") }

                if (alerts.isNotEmpty()) {
                    AlertDialog.Builder(this)
                        .setTitle("Stock Alerts")
                        .setMessage(alerts.joinToString("\n\n"))
                        .setPositiveButton("OK") { _, _ -> navigateToTables() }
                        .show()
                } else {
                    navigateToTables()
                }
            },
            onError = { e ->
                setFinalizing(false)
                Log.e("OrderActivity", "Finalize failed", e)
                Toast.makeText(this, errorMessage(e), Toast.LENGTH_LONG).show()
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
                    showEmptyState(true)
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
                            val line = OrderLine(
                                itemId = doc.id,
                                name = name,
                                qty = qty,
                                unitPrice = unitPrice
                            )
                            lines.add(line)
                            total += line.lineTotal
                        }

                        adapter.notifyDataSetChanged()
                        totalText.text = "Total: €${"%.2f".format(total)}"
                        showEmptyState(lines.isEmpty())
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

    private fun showEmptyState(empty: Boolean) {
        val recycler = findViewById<RecyclerView>(R.id.orderRecycler)
        recycler.visibility = if (empty) View.GONE else View.VISIBLE
        emptyOrderText.visibility = if (empty) View.VISIBLE else View.GONE
        btnFinalizeOrder.isEnabled = !empty
        btnClearOrder.isEnabled = !empty
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
