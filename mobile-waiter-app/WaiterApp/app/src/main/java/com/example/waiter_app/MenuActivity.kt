package com.example.waiter_app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.button.MaterialButton
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore

class MenuActivity : AppCompatActivity() {

    private val db = FirebaseFirestore.getInstance()

    // allMenuRows holds every row (all categories + all items, always)
    private val allMenuRows = mutableListOf<MenuRow>()
    // displayRows is what the adapter actually renders (filtered by expanded state)
    private val displayRows = mutableListOf<MenuRow>()
    // Which category sections are currently open
    private val expandedCategories = mutableSetOf<String>()

    private lateinit var adapter: MenuAdapter
    private lateinit var recycler: RecyclerView

    private var tableId: String? = null
    private var tableName: String? = null
    private var orderId: String? = null
    private var isCreatingOrder = false

    private val localQtys = mutableMapOf<String, Int>()
    private val menuItemsById = mutableMapOf<String, MenuItem>()

    private lateinit var orderBar: LinearLayout
    private lateinit var orderBarSummary: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_menu)

        tableId = intent.getStringExtra("TABLE_ID")
        tableName = intent.getStringExtra("TABLE_NAME")

        val toolbar = findViewById<MaterialToolbar>(R.id.toolbar)
        setSupportActionBar(toolbar)
        supportActionBar?.apply {
            title = tableName ?: "Menu"
            setDisplayHomeAsUpEnabled(true)
        }

        orderBar = findViewById(R.id.orderBar)
        orderBarSummary = findViewById(R.id.orderBarSummary)

        recycler = findViewById(R.id.menuRecycler)
        recycler.layoutManager = LinearLayoutManager(this)

        adapter = MenuAdapter(
            rows = displayRows,
            isExpanded = { cat -> cat in expandedCategories },
            getQty = { menuItemId -> localQtys[menuItemId] ?: 0 },
            onPlus = { item -> onPlus(item) },
            onMinus = { item -> onMinus(item) },
            onHeaderClick = { cat -> toggleCategory(cat) }
        )
        recycler.adapter = adapter

        findViewById<MaterialButton>(R.id.viewOrderButton).setOnClickListener {
            val intent = Intent(this, OrderActivity::class.java)
            intent.putExtra("TABLE_ID", tableId)
            intent.putExtra("TABLE_NAME", tableName)
            startActivity(intent)
        }

        loadMenu()
    }

    override fun onResume() {
        super.onResume()
        loadOpenOrder()
    }

    override fun onSupportNavigateUp(): Boolean {
        onBackPressedDispatcher.onBackPressed()
        return true
    }

    // ── Collapsible categories ────────────────────────────────────────────────

    private fun toggleCategory(category: String) {
        if (category in expandedCategories) {
            expandedCategories.remove(category)
        } else {
            expandedCategories.add(category)
        }
        buildDisplayRows()
    }

    /** Rebuilds displayRows from allMenuRows based on which categories are expanded. */
    private fun buildDisplayRows() {
        var currentCategory: String? = null
        displayRows.clear()
        for (row in allMenuRows) {
            when (row) {
                is MenuRow.Header -> {
                    currentCategory = row.title
                    displayRows.add(row)
                }
                is MenuRow.Item -> {
                    if (currentCategory != null && currentCategory in expandedCategories) {
                        displayRows.add(row)
                    }
                }
            }
        }
        adapter.notifyDataSetChanged()
    }

    // ── Order state sync ─────────────────────────────────────────────────────

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
                    loadCurrentOrderItems()
                } else {
                    orderId = null
                    localQtys.clear()
                    adapter.notifyDataSetChanged()
                    updateOrderBar()
                }
            }
            .addOnFailureListener { e ->
                Log.e("MenuActivity", "Failed to load open order", e)
            }
    }

    private fun loadCurrentOrderItems() {
        val oid = orderId ?: return
        db.collection("orders").document(oid).collection("items").get()
            .addOnSuccessListener { items ->
                localQtys.clear()
                for (doc in items.documents) {
                    val menuItemId = doc.getString("menuItemId") ?: continue
                    val qty = (doc.getLong("qty") ?: 1L).toInt()
                    localQtys[menuItemId] = qty
                }
                adapter.notifyDataSetChanged()
                updateOrderBar()
            }
            .addOnFailureListener { e ->
                Log.e("MenuActivity", "Failed to load order items", e)
            }
    }

    // ── Menu loading ──────────────────────────────────────────────────────────

    private fun loadMenu() {
        db.collection("menuItems")
            .get()
            .addOnSuccessListener { result ->
                val items = mutableListOf<MenuItem>()

                for (doc in result.documents) {
                    val active = doc.getBoolean("active") ?: true
                    if (!active) continue

                    val name = doc.getString("name") ?: continue
                    val price = doc.getDouble("price") ?: 0.0
                    val category = doc.getString("category") ?: "Other"
                    val isAvailable = doc.getBoolean("isAvailable") ?: true

                    val item = MenuItem(doc.id, name, price, category, isAvailable)
                    items.add(item)
                    menuItemsById[doc.id] = item
                }

                val sorted = items.sortedWith(compareBy<MenuItem> { it.category }.thenBy { it.name })
                val grouped = sorted.groupBy { it.category }

                allMenuRows.clear()
                for ((cat, list) in grouped) {
                    allMenuRows.add(MenuRow.Header(cat))
                    for (it in list) allMenuRows.add(MenuRow.Item(it))
                }

                // Auto-expand first category so the screen isn't completely empty on load
                if (expandedCategories.isEmpty()) {
                    val firstHeader = allMenuRows.firstOrNull { it is MenuRow.Header } as? MenuRow.Header
                    if (firstHeader != null) expandedCategories.add(firstHeader.title)
                }

                buildDisplayRows()
                buildCategoryChips(grouped.keys.toList())
            }
            .addOnFailureListener { e ->
                Log.e("MenuActivity", "Failed to load menu", e)
                Toast.makeText(this, "Failed to load menu: ${e.message}", Toast.LENGTH_LONG).show()
            }
    }

    // ── Category chip navigation ───────────────────────────────────────────

    private fun buildCategoryChips(categories: List<String>) {
        val chipGroup = findViewById<ChipGroup>(R.id.categoryChipGroup)
        chipGroup.removeAllViews()

        for (cat in categories.sorted()) {
            val chip = Chip(this).apply {
                text = cat
                isCheckable = false
                setOnClickListener { scrollToCategory(cat) }
            }
            chipGroup.addView(chip)
        }
    }

    private fun scrollToCategory(category: String) {
        // Expand the category first if it's collapsed — chip tap implies "I want to see this"
        if (category !in expandedCategories) {
            expandedCategories.add(category)
            buildDisplayRows()
        }
        val pos = displayRows.indexOfFirst { it is MenuRow.Header && it.title == category }
        if (pos >= 0) {
            (recycler.layoutManager as LinearLayoutManager).scrollToPositionWithOffset(pos, 0)
        }
    }

    // ── Bottom order bar ──────────────────────────────────────────────────

    private fun updateOrderBar() {
        var totalQty = 0
        var totalPrice = 0.0
        for ((id, qty) in localQtys) {
            if (qty <= 0) continue
            val item = menuItemsById[id] ?: continue
            totalQty += qty
            totalPrice += qty * item.price
        }
        if (totalQty > 0) {
            val label = if (totalQty == 1) "item" else "items"
            orderBarSummary.text = "$totalQty $label • €${"%.2f".format(totalPrice)}"
            orderBar.visibility = View.VISIBLE
        } else {
            orderBar.visibility = View.GONE
        }
    }

    // ── Qty interaction ───────────────────────────────────────────────────

    private fun onPlus(item: MenuItem) {
        if (isCreatingOrder) return

        val newQty = (localQtys[item.id] ?: 0) + 1
        localQtys[item.id] = newQty
        refreshItemRow(item.id)
        updateOrderBar()
        addItemToOrder(item)
    }

    private fun onMinus(item: MenuItem) {
        val currentQty = localQtys[item.id] ?: 0
        if (currentQty <= 0) return

        val newQty = currentQty - 1
        localQtys[item.id] = newQty
        refreshItemRow(item.id)
        updateOrderBar()

        val oid = orderId ?: return
        val itemsRef = db.collection("orders").document(oid).collection("items")
        itemsRef.whereEqualTo("menuItemId", item.id).limit(1).get()
            .addOnSuccessListener { result ->
                if (result.isEmpty) return@addOnSuccessListener
                val docRef = result.documents[0].reference
                if (newQty <= 0) docRef.delete() else docRef.update("qty", newQty.toLong())
            }
            .addOnFailureListener { e ->
                Log.e("MenuActivity", "Failed to decrement item", e)
            }
    }

    private fun refreshItemRow(menuItemId: String) {
        // Search in displayRows — the filtered list the adapter actually uses
        val pos = displayRows.indexOfFirst { it is MenuRow.Item && it.item.id == menuItemId }
        if (pos >= 0) adapter.notifyItemChanged(pos)
    }

    // ── Firestore order write ─────────────────────────────────────────────

    private fun addItemToOrder(menuItem: MenuItem) {
        val currentOrderId = orderId
        if (currentOrderId != null) {
            addOrIncrementItem(currentOrderId, menuItem)
            return
        }

        if (isCreatingOrder) return

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

        itemsRef.get()
            .addOnSuccessListener { allItems ->
                val existing = allItems.documents.firstOrNull {
                    it.getString("menuItemId") == menuItem.id
                }
                if (existing != null) {
                    itemsRef.document(existing.id).update("qty", FieldValue.increment(1))
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
                }
            }
            .addOnFailureListener { e ->
                Toast.makeText(this, "Failed to add item: ${e.message}", Toast.LENGTH_LONG).show()
            }
    }
}
