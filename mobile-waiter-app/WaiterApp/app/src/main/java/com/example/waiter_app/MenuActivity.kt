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
import com.example.waiter_app.services.ApiClient

class MenuActivity : AppCompatActivity() {

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

        ApiClient.getOpenOrder(
            tableId = id,
            onSuccess = { oid, _ ->
                if (oid != null) {
                    orderId = oid
                    loadCurrentOrderItems()
                } else {
                    orderId = null
                    localQtys.clear()
                    runOnUiThread {
                        adapter.notifyDataSetChanged()
                        updateOrderBar()
                    }
                }
            },
            onError = { e ->
                Log.e("MenuActivity", "Failed to load open order", e)
            }
        )
    }

    private fun loadCurrentOrderItems() {
        val oid = orderId ?: return
        ApiClient.getOrderDetails(
            orderId = oid,
            onSuccess = { order ->
                runOnUiThread {
                    localQtys.clear()
                    val items = order["items"] as? List<Map<String, Any>> ?: emptyList()
                    for (item in items) {
                        val menuItemId = item["menuItemId"] as? String ?: continue
                        val qty = (item["qty"] as? Number)?.toInt() ?: 1
                        localQtys[menuItemId] = qty
                    }
                    adapter.notifyDataSetChanged()
                    updateOrderBar()
                }
            },
            onError = { e ->
                Log.e("MenuActivity", "Failed to load order items", e)
            }
        )
    }

    // ── Menu loading ──────────────────────────────────────────────────────────

    private fun loadMenu() {
        ApiClient.getMenuItems(
            onSuccess = { items ->
                runOnUiThread {
                    val menuItems = items.map { data ->
                        val stockInfo = data["stockInfo"] as? Map<*, *>

                        val item = MenuItem(
                            id = data["id"] as? String ?: "",
                            name = data["name"] as? String ?: "Unknown",
                            price = (data["price"] as? Number)?.toDouble() ?: 0.0,
                            category = data["category"] as? String ?: "Other",
                            isAvailable = stockInfo?.get("available") as? Boolean ?: true,
                            servingsLeft = (stockInfo?.get("servingsLeft") as? Number)?.toInt() ?: 0,
                            lowStock = stockInfo?.get("lowStock") as? Boolean ?: false
                        )
                        menuItemsById[item.id] = item
                        item
                    }

                    val sorted = menuItems.sortedWith(compareBy<MenuItem> { it.category }.thenBy { it.name })
                    val grouped = sorted.groupBy { it.category }

                    allMenuRows.clear()
                    for ((cat, list) in grouped) {
                        allMenuRows.add(MenuRow.Header(cat))
                        for (it in list) allMenuRows.add(MenuRow.Item(it))
                    }

                    if (expandedCategories.isEmpty()) {
                        val firstHeader = allMenuRows.firstOrNull { it is MenuRow.Header } as? MenuRow.Header
                        if (firstHeader != null) expandedCategories.add(firstHeader.title)
                    }

                    buildDisplayRows()
                    buildCategoryChips(grouped.keys.toList())
                }
            },
            onError = { e ->
                runOnUiThread {
                    Log.e("MenuActivity", "Failed to load menu", e)
                    Toast.makeText(this, "Failed to load menu: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        )
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

        // Find the item in the order and update/delete via API
        ApiClient.getOrderDetails(
            orderId = oid,
            onSuccess = { order ->
                val items = order["items"] as? List<Map<String, Any>> ?: return@getOrderDetails
                val orderItem = items.firstOrNull { it["menuItemId"] == item.id } ?: return@getOrderDetails
                val itemId = orderItem["id"] as? String ?: return@getOrderDetails

                if (newQty <= 0) {
                    ApiClient.deleteOrderItem(oid, itemId, onSuccess = {}, onError = { e ->
                        Log.e("MenuActivity", "Failed to remove item", e)
                    })
                } else {
                    ApiClient.updateOrderItem(oid, itemId, newQty, onSuccess = {}, onError = { e ->
                        Log.e("MenuActivity", "Failed to update item qty", e)
                    })
                }
            },
            onError = { e -> Log.e("MenuActivity", "Failed to fetch order for decrement", e) }
        )
    }

    private fun refreshItemRow(menuItemId: String) {
        val pos = displayRows.indexOfFirst { it is MenuRow.Item && it.item.id == menuItemId }
        if (pos >= 0) adapter.notifyItemChanged(pos)
    }

    // ── API order write ─────────────────────────────────────────────

    private fun addItemToOrder(menuItem: MenuItem) {
        val currentOrderId = orderId
        if (currentOrderId != null) {
            addItemViaApi(currentOrderId, menuItem)
            return
        }

        if (isCreatingOrder) return

        val id = tableId ?: return
        isCreatingOrder = true

        ApiClient.createOrder(
            tableName = id,
            onSuccess = { newOrderId ->
                orderId = newOrderId
                isCreatingOrder = false
                addItemViaApi(newOrderId, menuItem)
            },
            onError = { e ->
                isCreatingOrder = false
                runOnUiThread {
                    Toast.makeText(this, "Order create failed: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        )
    }

    private fun addItemViaApi(orderId: String, menuItem: MenuItem) {
        ApiClient.addOrderItem(
            orderId = orderId,
            menuItemId = menuItem.id,
            name = menuItem.name,
            unitPrice = menuItem.price,
            onSuccess = { _ -> },
            onError = { e ->
                runOnUiThread {
                    Toast.makeText(this, "Failed to add item: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        )
    }
}
