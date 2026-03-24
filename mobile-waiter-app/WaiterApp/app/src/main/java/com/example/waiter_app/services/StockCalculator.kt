package com.example.waiter_app.services

/**
 * Pure (Firestore-free) stock deduction logic.
 * Extracted from FinalizeOrderService so it can be unit-tested without mocking Firestore.
 *
 * Supports two deduction modes:
 *  - Pour-based  (required):      totalNeeded ml deducted from openMl, opening new
 *                                  containers as needed.
 *  - Whole-unit  (requiredUnits): stockItems decremented by count, openMl unchanged.
 */
internal data class InventoryInput(
    val inventoryId: String,
    val name: String,
    val stockItems: Int,
    val sizeMl: Int,
    val openMl: Int,
    val minOpenMlWarning: Int
)

/**
 * Emitted when stock is exhausted before the full required amount can be deducted.
 * The order is still finalized; the waiter is notified so they can check stock.
 */
data class InsufficientStockWarning(
    val inventoryId: String,
    val name: String,
    val requestedMl: Int,   // total ml that was needed
    val availableMl: Int    // ml that was available when stock ran out
)

internal object StockCalculator {

    data class Update(val stockItems: Int, val openMl: Int)

    data class Result(
        val updates: Map<String, Update>,
        val lowStockWarnings: List<StockWarning>,
        val insufficientWarnings: List<InsufficientStockWarning>
    )

    /**
     * @param required       inventoryId → total ml needed (pour-based ingredients)
     * @param requiredUnits  inventoryId → whole units needed (consumeWhole ingredients)
     * @param inputs         current inventory state per inventoryId
     */
    fun calculate(
        required: Map<String, Int>,
        requiredUnits: Map<String, Int> = emptyMap(),
        inputs: Map<String, InventoryInput>
    ): Result {
        val updates = mutableMapOf<String, Update>()
        val lowStockWarnings = mutableListOf<StockWarning>()
        val insufficientWarnings = mutableListOf<InsufficientStockWarning>()

        // ── Pour-based deductions ──────────────────────────────────────────────
        for ((inventoryId, totalMl) in required) {
            val input = inputs[inventoryId] ?: continue

            var stockItems = input.stockItems
            var openMl = input.openMl

            // Accumulate open containers until we have enough (or run out of stock)
            if (totalMl > openMl) {
                while (totalMl > openMl && stockItems > 0) {
                    openMl += input.sizeMl
                    stockItems--
                }
            }

            if (totalMl > openMl) {
                // Not enough stock to fulfil the order
                insufficientWarnings.add(
                    InsufficientStockWarning(
                        inventoryId = inventoryId,
                        name = input.name,
                        requestedMl = totalMl,
                        availableMl = openMl
                    )
                )
                openMl = 0
            } else {
                openMl -= totalMl
            }

            updates[inventoryId] = Update(stockItems, openMl)

            // Low-stock threshold warning (only meaningful for pour-based items with a threshold)
            if (input.minOpenMlWarning > 0 && openMl <= input.minOpenMlWarning) {
                lowStockWarnings.add(
                    StockWarning(
                        inventoryId = inventoryId,
                        name = input.name,
                        openMl = openMl,
                        minOpenMlWarning = input.minOpenMlWarning
                    )
                )
            }
        }

        // ── Whole-unit deductions ──────────────────────────────────────────────
        for ((inventoryId, unitCount) in requiredUnits) {
            val input = inputs[inventoryId] ?: continue

            // Build on any existing update for this ID (e.g., if also in pour-based)
            val currentStock = updates[inventoryId]?.stockItems ?: input.stockItems
            val currentOpenMl = updates[inventoryId]?.openMl ?: input.openMl

            val newStock = currentStock - unitCount
            if (newStock < 0) {
                insufficientWarnings.add(
                    InsufficientStockWarning(
                        inventoryId = inventoryId,
                        name = input.name,
                        requestedMl = unitCount * input.sizeMl,
                        availableMl = currentStock * input.sizeMl
                    )
                )
                updates[inventoryId] = Update(0, currentOpenMl)
            } else {
                updates[inventoryId] = Update(newStock, currentOpenMl)
            }
        }

        return Result(updates, lowStockWarnings, insufficientWarnings)
    }
}
