package com.example.waiter_app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore

class MenuActivity : AppCompatActivity() {

    private val db = FirebaseFirestore.getInstance()
    private val menuRows = mutableListOf<MenuRow>()
    private lateinit var adapter: MenuAdapter

    // Both ID (for Firestore queries) and name (for display) are passed from TablesActivity
    private var tableId: String? = null
    private var tableName: String? = null

    private var orderId: String? = null

    // Prevents duplicate order creation when user taps quickly before loadOpenOrder() returns
    private var isCreatingOrder = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_menu)

        tableId = intent.getStringExtra("TABLE_ID")
        tableName = intent.getStringExtra("TABLE_NAME")

        findViewById<TextView>(R.id.menuTitle).text = "Menu - $tableName"

        val recycler = findViewById<RecyclerView>(R.id.menuRecycler)
        recycler.layoutManager = LinearLayoutManager(this)

        adapter = MenuAdapter(menuRows) { item -> addItemToOrder(item) }
        recycler.adapter = adapter

        findViewById<Button>(R.id.viewOrderButton).setOnClickListener {
            val intent = Intent(this, OrderActivity::class.java)
            intent.putExtra("TABLE_ID", tableId)
            intent.putExtra("TABLE_NAME", tableName)
            startActivity(intent)
        }

        loadOpenOrder()
        loadMenu()
    }

    private fun loadOpenOrder() {
        val id = tableId ?: return

        db.collection("orders")
            .whereEqualTo("table", id)
            .whereEqualTo("status", "open")
            .limit(1)
            .get()
            .addOnSuccessListener { result ->
                if (!result.isEmpty) {
                    orderId = result.documents[0].id
                }
            }
            .addOnFailureListener { e ->
                Log.e("MenuActivity", "Failed to load open order", e)
            }
    }

    private fun loadMenu() {
        // Fetches all menuItems and filters in-memory.
        // whereEqualTo("active", true) is intentionally removed: documents with a missing
        // `active` field would be excluded by Firestore (null != true), causing an empty menu.
        // Treating a missing field as "active" is the safe, backward-compatible default.
        db.collection("menuItems")
            .get()
            .addOnSuccessListener { result ->
                val items = mutableListOf<MenuItem>()

                for (doc in result.documents) {
                    // Skip only documents where active is explicitly set to false
                    val active = doc.getBoolean("active") ?: true
                    if (!active) continue

                    val name = doc.getString("name") ?: continue
                    val price = doc.getDouble("price") ?: 0.0
                    val category = doc.getString("category") ?: "Other"
                    val isAvailable = doc.getBoolean("isAvailable") ?: true

                    items.add(MenuItem(doc.id, name, price, category, isAvailable))
                }

                val grouped = items
                    .sortedWith(compareBy<MenuItem> { it.category }.thenBy { it.name })
                    .groupBy { it.category }

                menuRows.clear()
                for ((cat, list) in grouped) {
                    menuRows.add(MenuRow.Header(cat))
                    for (it in list) menuRows.add(MenuRow.Item(it))
                }

                adapter.notifyDataSetChanged()
            }
            .addOnFailureListener { e ->
                Log.e("MenuActivity", "Failed to load menu", e)
                Toast.makeText(this, "Failed to load menu: ${e.message}", Toast.LENGTH_LONG).show()
            }
    }

    private fun addItemToOrder(menuItem: MenuItem) {
        val currentOrderId = orderId

        if (currentOrderId != null) {
            addOrIncrementItem(currentOrderId, menuItem)
            return
        }

        // Guard: reject tap if order creation is already in flight
        if (isCreatingOrder) {
            Toast.makeText(this, "Please wait…", Toast.LENGTH_SHORT).show()
            return
        }

        val id = tableId ?: return
        isCreatingOrder = true

        val counterRef = db.collection("counters").document("orders")

        db.runTransaction { tx ->
            val snap = tx.get(counterRef)
            val next = (snap.getLong("count") ?: 0L) + 1L
            tx.set(counterRef, mapOf("count" to next))
            next
        }.addOnSuccessListener { next ->
            val newOrderId = "order_${next.toString().padStart(3, '0')}"
            val order = hashMapOf(
                "table" to id,
                "status" to "open",
                "createdAt" to FieldValue.serverTimestamp()
            )
            db.collection("orders").document(newOrderId).set(order)
                .addOnSuccessListener {
                    orderId = newOrderId
                    isCreatingOrder = false
                    addOrIncrementItem(newOrderId, menuItem)
                }
                .addOnFailureListener { e ->
                    isCreatingOrder = false
                    Toast.makeText(this, "Order create failed: ${e.message}", Toast.LENGTH_LONG).show()
                }
        }.addOnFailureListener { e ->
            isCreatingOrder = false
            Toast.makeText(this, "Order create failed: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun addOrIncrementItem(orderId: String, menuItem: MenuItem) {
        val itemsRef = db.collection("orders").document(orderId).collection("items")

        // Fetch all items once: check for existing entry and get count for sequential ID
        itemsRef.get()
            .addOnSuccessListener { allItems ->
                val existing = allItems.documents.firstOrNull {
                    it.getString("menuItemId") == menuItem.id
                }
                if (existing != null) {
                    itemsRef.document(existing.id).update("qty", FieldValue.increment(1))
                    Toast.makeText(this, "${menuItem.name} +1", Toast.LENGTH_SHORT).show()
                } else {
                    val newItemId = "item_${(allItems.size() + 1).toString().padStart(3, '0')}"
                    val item = hashMapOf(
                        "menuItemId" to menuItem.id,
                        "name" to menuItem.name,
                        "unitPrice" to menuItem.price,
                        "qty" to 1,
                        "status" to "pending"
                    )
                    itemsRef.document(newItemId).set(item)
                    Toast.makeText(this, "${menuItem.name} added", Toast.LENGTH_SHORT).show()
                }
            }
            .addOnFailureListener { e ->
                Toast.makeText(this, "Failed to add item: ${e.message}", Toast.LENGTH_LONG).show()
            }
    }
}
