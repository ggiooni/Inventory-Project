package com.example.waiter_app

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton

class OrderAdapter(
    private val items: List<OrderLine>,
    private val onIncrement: (OrderLine) -> Unit,
    private val onDecrement: (OrderLine) -> Unit
) : RecyclerView.Adapter<OrderAdapter.OrderViewHolder>() {

    class OrderViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val name: TextView = view.findViewById(R.id.orderItemName)
        val tvQty: TextView = view.findViewById(R.id.tvQty)
        val btnMinus: MaterialButton = view.findViewById(R.id.btnMinus)
        val btnPlus: MaterialButton = view.findViewById(R.id.btnPlus)
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
        holder.tvQty.text = line.qty.toString()
        holder.total.text = "€${"%.2f".format(line.lineTotal)}"

        holder.btnPlus.setOnClickListener(null)
        holder.btnMinus.setOnClickListener(null)
        holder.btnPlus.setOnClickListener { onIncrement(line) }
        holder.btnMinus.setOnClickListener { onDecrement(line) }
    }

    override fun getItemCount() = items.size
}
