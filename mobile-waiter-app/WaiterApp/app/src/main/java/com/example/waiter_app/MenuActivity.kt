package com.example.waiter_app

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import android.content.Intent

class MenuActivity : AppCompatActivity() {

    private val db = FirebaseFirestore.getInstance()
    private val menuRows = mutableListOf<MenuRow>()
    private lateinit var adapter: MenuAdapter

    private var tableName: String? = null
    private var orderId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_menu)

        tableName = intent.getStringExtra("TABLE_NAME")

        findViewById<TextView>(R.id.menuTitle).text = "Menu - $tableName"

        val recycler = findViewById<RecyclerView>(R.id.menuRecycler)
        recycler.layoutManager = LinearLayoutManager(this)

        adapter = MenuAdapter(menuRows) { item ->
            addItemToOrder(item)
        }
        recycler.adapter = adapter

        findViewById<Button>(R.id.viewOrderButton).setOnClickListener {
            val intent = Intent(this, OrderActivity::class.java)
            intent.putExtra("TABLE_NAME", tableName)
            startActivity(intent)
        }

        loadOpenOrder()
        loadMenu()
    }

    private fun loadOpenOrder() {
        db.collection("orders")
            .whereEqualTo("table", tableName)
            .whereEqualTo("status", "open")
            .limit(1)
            .get()
            .addOnSuccessListener { result ->
                if (!result.isEmpty) {
                    orderId = result.documents[0].id
                }
            }
    }

    private fun loadMenu() {
        db.collection("menuItems")
            .whereEqualTo("active", true)
            .get()
            .addOnSuccessListener { result ->

                val items = mutableListOf<MenuItem>()

                for (doc in result.documents) {
                    val name = doc.getString("name") ?: continue
                    val price = doc.getDouble("price") ?: 0.0
                    val category = doc.getString("category") ?: "Other"

                    items.add(MenuItem(doc.id, name, price, category))
                }

                // sort by category then name
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
    }

    private fun addItemToOrder(menuItem: MenuItem) {
        val currentOrderId = orderId

        if (currentOrderId != null) {
            addOrIncrementItem(currentOrderId, menuItem)
            return
        }

        val order = hashMapOf(
            "table" to tableName,
            "status" to "open",
            "createdAt" to FieldValue.serverTimestamp()
        )

        db.collection("orders")
            .add(order)
            .addOnSuccessListener { orderRef ->
                orderId = orderRef.id
                addOrIncrementItem(orderRef.id, menuItem)
            }
            .addOnFailureListener { e ->
                Toast.makeText(this, "Order create failed: ${e.message}", Toast.LENGTH_LONG).show()
            }
    }

    // ✅ This prevents repeats by incrementing qty if item already exists
    private fun addOrIncrementItem(orderId: String, menuItem: MenuItem) {
        val itemsRef = db.collection("orders").document(orderId).collection("items")

        itemsRef
            .whereEqualTo("menuItemId", menuItem.id)
            .limit(1)
            .get()
            .addOnSuccessListener { result ->
                if (!result.isEmpty) {
                    val docId = result.documents[0].id
                    itemsRef.document(docId).update("qty", FieldValue.increment(1))
                    Toast.makeText(this, "${menuItem.name} +1", Toast.LENGTH_SHORT).show()
                } else {
                    val item = hashMapOf(
                        "menuItemId" to menuItem.id,
                        "name" to menuItem.name,
                        "unitPrice" to menuItem.price,
                        "qty" to 1,
                        "status" to "pending"
                    )
                    itemsRef.add(item)
                    Toast.makeText(this, "${menuItem.name} added", Toast.LENGTH_SHORT).show()
                }
            }
    }
}