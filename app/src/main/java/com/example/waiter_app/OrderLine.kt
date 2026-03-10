package com.example.waiter_app

data class OrderLine(
    val name: String,
    val qty: Long,
    val unitPrice: Double
) {
    val lineTotal: Double get() = qty * unitPrice
}