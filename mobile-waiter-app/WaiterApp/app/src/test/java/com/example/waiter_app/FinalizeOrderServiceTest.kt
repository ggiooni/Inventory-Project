package com.example.waiter_app

import com.example.waiter_app.services.InventoryInput
import com.example.waiter_app.services.StockCalculator
import org.junit.Assert.*
import org.junit.Test

/**
 * Unit tests for StockCalculator — the pure stock deduction logic
 * extracted from FinalizeOrderService.
 *
 * No Firestore mocking needed: these tests run on the JVM.
 * Run with: ./gradlew test --tests "com.example.waiter_app.StockCalculatorTest"
 */
class StockCalculatorTest {

    // Helper to reduce boilerplate
    private fun input(
        id: String = "inv1",
        name: String = "Gin",
        stockItems: Int = 5,
        sizeMl: Int = 750,
        openMl: Int = 500,
        minOpenMlWarning: Int = 120
    ) = InventoryInput(id, name, stockItems, sizeMl, openMl, minOpenMlWarning)

    // ─── 1. Enough openMl — no new bottle needed ───────────────────────────────

    @Test
    fun `consumes from open bottle when enough ml available`() {
        val result = StockCalculator.calculate(
            required = mapOf("inv1" to 200),
            inputs = mapOf("inv1" to input(openMl = 500, stockItems = 5))
        )
        assertEquals(300, result.updates["inv1"]!!.openMl)
        assertEquals(5, result.updates["inv1"]!!.stockItems)  // no bottle opened
    }

    @Test
    fun `no warning when openMl stays above threshold after deduction`() {
        val result = StockCalculator.calculate(
            required = mapOf("inv1" to 100),
            inputs = mapOf("inv1" to input(openMl = 500, minOpenMlWarning = 120))
        )
        // 500 - 100 = 400 > 120 → no warning
        assertTrue(result.lowStockWarnings.isEmpty())
    }

    // ─── 2. Opens exactly one new bottle ───────────────────────────────────────

    @Test
    fun `opens one new bottle when open ml is exhausted`() {
        val result = StockCalculator.calculate(
            required = mapOf("inv1" to 600),
            inputs = mapOf("inv1" to input(openMl = 300, stockItems = 3, sizeMl = 750))
        )
        // 300 + 750 = 1050 >= 600 → open 1 bottle; stockItems = 3-1 = 2
        assertEquals(2, result.updates["inv1"]!!.stockItems)
        assertEquals(450, result.updates["inv1"]!!.openMl)  // 1050 - 600 = 450
    }

    // ─── 3. Opens multiple bottles ─────────────────────────────────────────────

    @Test
    fun `opens multiple bottles for a large order`() {
        val result = StockCalculator.calculate(
            required = mapOf("inv1" to 2000),
            inputs = mapOf("inv1" to input(openMl = 100, stockItems = 5, sizeMl = 750))
        )
        // 100 → need more; open 3 bottles: 100+750=850, +750=1600, +750=2350 >= 2000
        // stockItems = 5 - 3 = 2; openMl = 2350 - 2000 = 350
        assertEquals(2, result.updates["inv1"]!!.stockItems)
        assertEquals(350, result.updates["inv1"]!!.openMl)
    }

    // ─── 4. Insufficient stock → openMl set to 0, warning emitted ─────────────

    @Test
    fun `sets openMl to zero when stock runs out before order is satisfied`() {
        val result = StockCalculator.calculate(
            required = mapOf("inv1" to 2000),
            inputs = mapOf("inv1" to input(openMl = 100, stockItems = 1, sizeMl = 750))
        )
        // 100 + 750 = 850 < 2000 → insufficient
        assertEquals(0, result.updates["inv1"]!!.stockItems)
        assertEquals(0, result.updates["inv1"]!!.openMl)
        // Should also emit an InsufficientStockWarning
        assertEquals(1, result.insufficientWarnings.size)
        assertEquals("inv1", result.insufficientWarnings[0].inventoryId)
        assertEquals(2000, result.insufficientWarnings[0].requestedMl)
        assertEquals(850, result.insufficientWarnings[0].availableMl)
    }

    // ─── 5. Stock warning triggered ────────────────────────────────────────────

    @Test
    fun `warning triggered when openMl falls to exactly the threshold`() {
        val result = StockCalculator.calculate(
            required = mapOf("inv1" to 380),
            inputs = mapOf("inv1" to input(openMl = 500, minOpenMlWarning = 120))
        )
        // 500 - 380 = 120 → exactly at threshold → warning
        assertEquals(1, result.lowStockWarnings.size)
        assertEquals("inv1", result.lowStockWarnings[0].inventoryId)
        assertEquals(120, result.lowStockWarnings[0].openMl)
    }

    @Test
    fun `warning triggered when openMl falls below threshold`() {
        val result = StockCalculator.calculate(
            required = mapOf("inv1" to 420),
            inputs = mapOf("inv1" to input(openMl = 500, minOpenMlWarning = 120))
        )
        // 500 - 420 = 80 < 120 → warning
        assertEquals(1, result.lowStockWarnings.size)
        assertEquals(80, result.lowStockWarnings[0].openMl)
    }

    @Test
    fun `no warning when openMl is exactly one above threshold`() {
        val result = StockCalculator.calculate(
            required = mapOf("inv1" to 379),
            inputs = mapOf("inv1" to input(openMl = 500, minOpenMlWarning = 120))
        )
        // 500 - 379 = 121 > 120 → no warning
        assertTrue(result.lowStockWarnings.isEmpty())
    }

    // ─── 6. Multiple inventory items in one order ──────────────────────────────

    @Test
    fun `handles multiple inventory items independently`() {
        val result = StockCalculator.calculate(
            required = mapOf("gin" to 50, "tonic" to 150),
            inputs = mapOf(
                "gin" to input(id = "gin", name = "Gin", openMl = 300, stockItems = 2, minOpenMlWarning = 100),
                "tonic" to input(id = "tonic", name = "Tonic", openMl = 200, stockItems = 5, minOpenMlWarning = 100)
            )
        )
        assertEquals(250, result.updates["gin"]!!.openMl)    // 300 - 50
        assertEquals(50, result.updates["tonic"]!!.openMl)   // 200 - 150

        // tonic at 50 < 100 warning; gin at 250 > 100 no warning
        assertEquals(1, result.lowStockWarnings.size)
        assertEquals("tonic", result.lowStockWarnings[0].inventoryId)
    }

    // ─── 7. Unknown inventory ID is silently skipped ───────────────────────────

    @Test
    fun `skips inventory items not present in inputs`() {
        val result = StockCalculator.calculate(
            required = mapOf("missing" to 100),
            inputs = emptyMap()
        )
        assertTrue(result.updates.isEmpty())
        assertTrue(result.lowStockWarnings.isEmpty())
    }

    // ─── 8. Zero ml required causes no change ─────────────────────────────────

    @Test
    fun `zero ml required produces no change and no warning`() {
        val result = StockCalculator.calculate(
            required = mapOf("inv1" to 0),
            inputs = mapOf("inv1" to input(openMl = 500, minOpenMlWarning = 120))
        )
        assertEquals(500, result.updates["inv1"]!!.openMl)
        assertTrue(result.lowStockWarnings.isEmpty())
    }

    // ─── 9. consumeWhole: whole-unit deduction ─────────────────────────────────

    @Test
    fun `consumeWhole decrements stockItems and leaves openMl unchanged`() {
        val result = StockCalculator.calculate(
            required = emptyMap(),
            requiredUnits = mapOf("can1" to 3),
            inputs = mapOf(
                "can1" to input(
                    id = "can1", name = "Coke Can",
                    stockItems = 10, sizeMl = 330, openMl = 0, minOpenMlWarning = 0
                )
            )
        )
        assertEquals(7, result.updates["can1"]!!.stockItems)  // 10 - 3
        assertEquals(0, result.updates["can1"]!!.openMl)       // unchanged
        assertTrue(result.insufficientWarnings.isEmpty())
    }

    @Test
    fun `consumeWhole emits InsufficientStockWarning when stock runs out`() {
        val result = StockCalculator.calculate(
            required = emptyMap(),
            requiredUnits = mapOf("can1" to 5),
            inputs = mapOf(
                "can1" to input(
                    id = "can1", name = "Coke Can",
                    stockItems = 3, sizeMl = 330, openMl = 0, minOpenMlWarning = 0
                )
            )
        )
        assertEquals(0, result.updates["can1"]!!.stockItems)
        assertEquals(1, result.insufficientWarnings.size)
        assertEquals("can1", result.insufficientWarnings[0].inventoryId)
    }
}
