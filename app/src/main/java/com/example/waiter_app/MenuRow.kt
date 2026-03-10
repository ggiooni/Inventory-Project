package com.example.waiter_app

sealed class MenuRow {
    data class Header(val title: String) : MenuRow()
    data class Item(val item: MenuItem) : MenuRow()
}