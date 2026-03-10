package com.example.waiter_app

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class OrderAdapter(private val items: List<OrderLine>) :
    RecyclerView.Adapter<OrderAdapter.OrderViewHolder>() {

    class OrderViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val name: TextView = view.findViewById(R.id.orderItemName)
        val qty: TextView = view.findViewById(R.id.orderItemQty)
        val total: TextView = view.findViewById(R.id.orderItemTotal)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OrderViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_order, parent, false)
        return OrderViewHolder(view)
    }

    override fun onBindViewHolder(holder: OrderViewHolder, position: Int) {
        val line = items[position]
        holder.name.text = line.name
        holder.qty.text = "x${line.qty}"
        holder.total.text = "€${"%.2f".format(line.lineTotal)}"
    }

    override fun getItemCount() = items.size
}