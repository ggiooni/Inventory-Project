package com.example.waiter_app.services

import android.util.Log
import com.google.android.gms.tasks.Tasks
import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore

data class StockWarning(
    val inventoryId: String,
    val name: String,
    val openMl: Int,
    val minOpenMlWarning: Int
)

private data class OrderItemBasic(val menuItemId: String, val qty: Int)

private data class Ingredient(
    val inventoryId: String,
    val qtyMl: Int,
    val consumeWhole: Boolean = false
)

// Holds the Firestore DocumentReference needed for the write phase
private data class InventoryRef(val ref: DocumentReference)

class FinalizeOrderService(private val db: FirebaseFirestore = FirebaseFirestore.getInstance()) {

    fun finalizeOrder(
        orderId: String,
        onSuccess: (lowStock: List<StockWarning>, insufficient: List<InsufficientStockWarning>) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val orderRef = db.collection("orders").document(orderId)
        val itemsRef = orderRef.collection("items")

        // Step 1: read order items (outside transaction — subcollections can't be read inside)
        itemsRef.get()
            .addOnSuccessListener { itemsSnap ->
                val orderItems = itemsSnap.documents.mapNotNull { doc ->
                    val menuItemId = doc.getString("menuItemId") ?: return@mapNotNull null
                    val qty = (doc.getLong("qty") ?: 1L).toInt()
                    OrderItemBasic(menuItemId, qty)
                }

                if (orderItems.isEmpty()) {
                    onSuccess(emptyList(), emptyList())
                    return@addOnSuccessListener
                }

                // Step 2: fetch all menu recipes in parallel
                val uniqueMenuItemIds = orderItems.map { it.menuItemId }.distinct()

                fetchMenuRecipes(
                    menuItemIds = uniqueMenuItemIds,
                    onSuccess = { recipeMap ->

                        // Build total ml needed per inventoryId (pour-based)
                        val requiredMl = mutableMapOf<String, Int>()
                        // Build whole-unit count per inventoryId (consumeWhole)
                        val requiredUnits = mutableMapOf<String, Int>()

                        for (item in orderItems) {
                            val recipe = recipeMap[item.menuItemId] ?: emptyList()
                            for (ing in recipe) {
                                if (ing.consumeWhole) {
                                    requiredUnits[ing.inventoryId] =
                                        (requiredUnits[ing.inventoryId] ?: 0) + item.qty
                                } else {
                                    requiredMl[ing.inventoryId] =
                                        (requiredMl[ing.inventoryId] ?: 0) + ing.qtyMl * item.qty
                                }
                            }
                        }

                        // All inventory IDs we need to read in the transaction
                        val allInventoryIds = (requiredMl.keys + requiredUnits.keys).toSet()

                        // Step 3: run Firestore transaction — read, calculate, write atomically
                        db.runTransaction { tx ->

                            // --- READ PHASE ---
                            val orderSnap = tx.get(orderRef)
                            if (!orderSnap.exists()) throw IllegalStateException("Order not found")

                            if (orderSnap.getString("status") != "open") {
                                return@runTransaction Pair(
                                    emptyList<StockWarning>(),
                                    emptyList<InsufficientStockWarning>()
                                )
                            }

                            // Read all inventory docs first, then write (Firestore transaction rule)
                            val inventoryRefs = mutableMapOf<String, InventoryRef>()
                            val inventoryInputs = mutableMapOf<String, InventoryInput>()

                            for (inventoryId in allInventoryIds) {
                                val invRef = db.collection("inventory").document(inventoryId)
                                val snap = tx.get(invRef)
                                if (!snap.exists()) continue

                                inventoryRefs[inventoryId] = InventoryRef(invRef)
                                inventoryInputs[inventoryId] = InventoryInput(
                                    inventoryId = inventoryId,
                                    name = snap.getString("name") ?: inventoryId,
                                    stockItems = (snap.getLong("stockItems") ?: 0L).toInt(),
                                    sizeMl = (snap.getLong("sizeMl") ?: 750L).toInt(),
                                    openMl = (snap.getLong("openMl") ?: 0L).toInt(),
                                    minOpenMlWarning = (snap.getLong("minOpenMlWarning") ?: 0L).toInt()
                                )
                            }

                            // --- CALCULATION PHASE (pure, no Firestore calls) ---
                            val result = StockCalculator.calculate(requiredMl, requiredUnits, inventoryInputs)

                            // --- WRITE PHASE ---
                            for ((inventoryId, update) in result.updates) {
                                val ref = inventoryRefs[inventoryId]?.ref ?: continue
                                tx.update(ref, mapOf(
                                    "stockItems" to update.stockItems,
                                    "openMl" to update.openMl,
                                    "lastUpdated" to Timestamp.now()
                                ))
                            }

                            tx.update(orderRef, mapOf(
                                "status" to "closed",
                                "closedAt" to Timestamp.now()
                            ))

                            if (result.insufficientWarnings.isNotEmpty()) {
                                Log.w(
                                    "FinalizeOrderService",
                                    "Insufficient stock for ${result.insufficientWarnings.size} item(s): " +
                                        result.insufficientWarnings.joinToString { it.name }
                                )
                            }

                            Pair(result.lowStockWarnings, result.insufficientWarnings)

                        }.addOnSuccessListener { (lowStock, insufficient) ->
                            onSuccess(lowStock, insufficient)
                        }.addOnFailureListener { e ->
                            onError(e)
                        }
                    },
                    onError = onError
                )
            }
            .addOnFailureListener { e -> onError(e) }
    }

    /**
     * Fetches all menu item recipes in parallel using Tasks.whenAllSuccess.
     */
    private fun fetchMenuRecipes(
        menuItemIds: List<String>,
        onSuccess: (Map<String, List<Ingredient>>) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val tasks = menuItemIds.map { id ->
            db.collection("menuItems").document(id).get()
        }

        Tasks.whenAllSuccess<DocumentSnapshot>(tasks)
            .addOnSuccessListener { snapshots ->
                val result = mutableMapOf<String, List<Ingredient>>()

                snapshots.forEachIndexed { i, snap ->
                    val id = menuItemIds[i]
                    @Suppress("UNCHECKED_CAST")
                    val recipeRaw = snap.get("recipe") as? List<Map<String, Any>> ?: emptyList()
                    result[id] = recipeRaw.mapNotNull { m ->
                        val invId = m["inventoryId"] as? String ?: return@mapNotNull null
                        val consumeWhole = m["consumeWhole"] as? Boolean ?: false
                        if (consumeWhole) {
                            Ingredient(invId, 0, consumeWhole = true)
                        } else {
                            val qtyMl = (m["qtyMl"] as? Number)?.toInt() ?: return@mapNotNull null
                            Ingredient(invId, qtyMl, consumeWhole = false)
                        }
                    }
                }

                onSuccess(result)
            }
            .addOnFailureListener { e -> onError(e) }
    }
}
