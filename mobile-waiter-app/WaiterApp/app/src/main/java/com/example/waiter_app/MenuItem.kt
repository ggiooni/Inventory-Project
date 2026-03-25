package com.example.waiter_app

data class MenuItem(
    val id: String,
    val name: String,
    val price: Double,
    val category: String,
    val isAvailable: Boolean = true,
    val servingsLeft: Int = 0,
    val lowStock: Boolean = false
)
