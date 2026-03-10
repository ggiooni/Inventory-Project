package com.example.waiter_app.services

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.FirebaseFirestore

data class StockWarning(
    val inventoryId: String,
    val name: String,
    val openMl: Int,
    val minOpenMlWarning: Int
)

private data class OrderItemBasic(
    val menuItemId: String,
    val qty: Int
)

private data class Ingredient(
    val inventoryId: String,
    val qtyMl: Int
)

private data class InventoryState(
    val ref: DocumentReference,
    val name: String,
    var stock: Int,
    val bottleSizeMl: Int,
    var openMl: Int,
    val minOpenMlWarning: Int
)

class FinalizeOrderService(private val db: FirebaseFirestore = FirebaseFirestore.getInstance()) {

    fun finalizeOrder(
        orderId: String,
        onSuccess: (List<StockWarning>) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val orderRef = db.collection("orders").document(orderId)
        val itemsRef = orderRef.collection("items")

        // 1) Read order items outside transaction
        itemsRef.get()
            .addOnSuccessListener { itemsSnap ->

                val orderItems = itemsSnap.documents.mapNotNull { doc ->
                    val menuItemId = doc.getString("menuItemId") ?: return@mapNotNull null
                    val qty = (doc.getLong("qty") ?: 1L).toInt()
                    OrderItemBasic(menuItemId, qty)
                }

                if (orderItems.isEmpty()) {
                    onSuccess(emptyList())
                    return@addOnSuccessListener
                }

                // 2) Fetch all menu recipes outside transaction
                val uniqueMenuItemIds = orderItems.map { it.menuItemId }.distinct()

                fetchMenuRecipes(
                    menuItemIds = uniqueMenuItemIds,
                    onSuccess = { recipeMap ->

                        // Build total ml needed per inventoryId
                        val requiredByInventory = mutableMapOf<String, Int>()

                        for (item in orderItems) {
                            val recipe = recipeMap[item.menuItemId] ?: emptyList()
                            for (ing in recipe) {
                                val totalMl = ing.qtyMl * item.qty
                                requiredByInventory[ing.inventoryId] =
                                    (requiredByInventory[ing.inventoryId] ?: 0) + totalMl
                            }
                        }

                        db.runTransaction { tx ->
                            // ----- READ PHASE -----

                            // Read order first
                            val orderSnap = tx.get(orderRef)
                            if (!orderSnap.exists()) {
                                throw IllegalStateException("Order not found")
                            }

                            val status = orderSnap.getString("status") ?: "open"
                            if (status != "open") {
                                return@runTransaction emptyList<StockWarning>()
                            }

                            // Read ALL inventory docs first
                            val inventoryStates = mutableMapOf<String, InventoryState>()

                            for ((inventoryId, _) in requiredByInventory) {
                                val invRef = db.collection("inventory").document(inventoryId)
                                val snap = tx.get(invRef)

                                if (!snap.exists()) continue

                                val state = InventoryState(
                                    ref = invRef,
                                    name = snap.getString("name") ?: inventoryId,
                                    stock = (snap.getLong("stock") ?: 0L).toInt(),
                                    bottleSizeMl = (snap.getLong("bottleSizeMl") ?: 750L).toInt(),
                                    openMl = (snap.getLong("openMl")
                                        ?: (snap.getLong("bottleSizeMl") ?: 750L)).toInt(),
                                    minOpenMlWarning = (snap.getLong("minOpenMlWarning") ?: 120L).toInt()
                                )

                                inventoryStates[inventoryId] = state
                            }

                            // ----- CALCULATION PHASE (in memory, no tx writes yet) -----
                            val warnings = mutableListOf<StockWarning>()

                            for ((inventoryId, totalConsumeMl) in requiredByInventory) {
                                val state = inventoryStates[inventoryId] ?: continue

                                var remaining = totalConsumeMl

                                // consume from current open bottle
                                val fromOpen = minOf(state.openMl, remaining)
                                state.openMl -= fromOpen
                                remaining -= fromOpen

                                // open new bottles as needed
                                while (remaining > 0) {
                                    if (state.stock <= 0) {
                                        state.openMl = 0
                                        break
                                    }

                                    state.stock -= 1
                                    state.openMl = state.bottleSizeMl

                                    val used = minOf(state.openMl, remaining)
                                    state.openMl -= used
                                    remaining -= used
                                }

                                if (state.openMl <= state.minOpenMlWarning) {
                                    warnings.add(
                                        StockWarning(
                                            inventoryId = inventoryId,
                                            name = state.name,
                                            openMl = state.openMl,
                                            minOpenMlWarning = state.minOpenMlWarning
                                        )
                                    )
                                }
                            }

                            // ----- WRITE PHASE -----
                            for ((_, state) in inventoryStates) {
                                tx.update(state.ref, mapOf(
                                    "stock" to state.stock,
                                    "openMl" to state.openMl,
                                    "lastUpdated" to Timestamp.now()
                                ))
                            }

                            tx.update(orderRef, mapOf(
                                "status" to "closed",
                                "closedAt" to Timestamp.now()
                            ))

                            warnings
                        }.addOnSuccessListener { warnings ->
                            onSuccess(warnings)
                        }.addOnFailureListener { e ->
                            onError(e)
                        }
                    },
                    onError = { e ->
                        onError(e)
                    }
                )
            }
            .addOnFailureListener { e ->
                onError(e)
            }
    }

    private fun fetchMenuRecipes(
        menuItemIds: List<String>,
        onSuccess: (Map<String, List<Ingredient>>) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val result = mutableMapOf<String, List<Ingredient>>()
        var index = 0

        fun next() {
            if (index >= menuItemIds.size) {
                onSuccess(result)
                return
            }

            val id = menuItemIds[index++]
            db.collection("menuItems").document(id).get()
                .addOnSuccessListener { snap ->
                    val recipeRaw = snap.get("recipe") as? List<Map<String, Any>> ?: emptyList()

                    val ingredients = recipeRaw.mapNotNull { m ->
                        val invId = m["inventoryId"] as? String ?: return@mapNotNull null
                        val qtyMl = (m["qtyMl"] as? Number)?.toInt() ?: return@mapNotNull null
                        Ingredient(invId, qtyMl)
                    }

                    result[id] = ingredients
                    next()
                }
                .addOnFailureListener { e ->
                    onError(e)
                }
        }

        next()
    }
}