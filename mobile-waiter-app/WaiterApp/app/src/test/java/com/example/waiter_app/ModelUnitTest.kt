package com.example.waiter_app

import org.junit.Assert.*
import org.junit.Test

class MenuItemTest {

    @Test
    fun `MenuItem holds correct field values`() {
        val item = MenuItem(id = "1", name = "Espresso", price = 2.50, category = "Coffee")
        assertEquals("1", item.id)
        assertEquals("Espresso", item.name)
        assertEquals(2.50, item.price, 0.001)
        assertEquals("Coffee", item.category)
    }

    @Test
    fun `MenuItem with empty name is valid`() {
        val item = MenuItem(id = "x", name = "", price = 0.0, category = "")
        assertEquals("", item.name)
    }

    @Test
    fun `Two MenuItems with same data are equal`() {
        val a = MenuItem("1", "Beer", 4.0, "Drinks")
        val b = MenuItem("1", "Beer", 4.0, "Drinks")
        assertEquals(a, b)
    }

    @Test
    fun `Two MenuItems with different ids are not equal`() {
        val a = MenuItem("1", "Beer", 4.0, "Drinks")
        val b = MenuItem("2", "Beer", 4.0, "Drinks")
        assertNotEquals(a, b)
    }
}

class OrderLineTest {

    @Test
    fun `lineTotal is qty times unitPrice`() {
        val line = OrderLine(name = "Gin Tonic", qty = 2L, unitPrice = 8.50)
        assertEquals(17.00, line.lineTotal, 0.001)
    }

    @Test
    fun `lineTotal is zero when qty is zero`() {
        val line = OrderLine(name = "Water", qty = 0L, unitPrice = 1.50)
        assertEquals(0.0, line.lineTotal, 0.001)
    }

    @Test
    fun `lineTotal is zero when unitPrice is zero`() {
        val line = OrderLine(name = "Tap Water", qty = 3L, unitPrice = 0.0)
        assertEquals(0.0, line.lineTotal, 0.001)
    }

    @Test
    fun `lineTotal handles single item correctly`() {
        val line = OrderLine(name = "Wine", qty = 1L, unitPrice = 6.00)
        assertEquals(6.00, line.lineTotal, 0.001)
    }

    @Test
    fun `lineTotal handles large quantities`() {
        val line = OrderLine(name = "Coke", qty = 100L, unitPrice = 2.50)
        assertEquals(250.0, line.lineTotal, 0.001)
    }
}

class MenuRowTest {

    @Test
    fun `MenuRow Header holds title`() {
        val header = MenuRow.Header("Starters")
        assertEquals("Starters", header.title)
    }

    @Test
    fun `MenuRow Item wraps a MenuItem`() {
        val menuItem = MenuItem("42", "Nachos", 5.0, "Starters")
        val row = MenuRow.Item(menuItem)
        assertEquals(menuItem, row.item)
    }

    @Test
    fun `MenuRow Header and Item are distinct types`() {
        val header: MenuRow = MenuRow.Header("Drinks")
        val item: MenuRow = MenuRow.Item(MenuItem("1", "Cola", 2.0, "Drinks"))
        assertTrue(header is MenuRow.Header)
        assertTrue(item is MenuRow.Item)
        assertFalse(header is MenuRow.Item)
        assertFalse(item is MenuRow.Header)
    }

    @Test
    fun `Two MenuRow Headers with same title are equal`() {
        assertEquals(MenuRow.Header("Main"), MenuRow.Header("Main"))
    }

    @Test
    fun `Two MenuRow Headers with different titles are not equal`() {
        assertNotEquals(MenuRow.Header("Main"), MenuRow.Header("Desserts"))
    }
}
