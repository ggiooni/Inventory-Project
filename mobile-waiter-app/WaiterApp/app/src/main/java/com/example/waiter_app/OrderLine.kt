package com.example.waiter_app

data class OrderLine(
    val itemId: String,        // Firestore document ID in orders/{id}/items
    val name: String,
    val qty: Long,
    val unitPrice: Double
) {
    val lineTotal: Double get() = qty * unitPrice
}