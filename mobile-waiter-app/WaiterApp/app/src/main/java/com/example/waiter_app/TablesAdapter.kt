package com.example.waiter_app

import android.content.Intent
import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView

class TablesAdapter(private val tables: List<Table>) :
    RecyclerView.Adapter<TablesAdapter.TableViewHolder>() {

    class TableViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val card: MaterialCardView = view.findViewById(R.id.tableCard)
        val statusDot: View = view.findViewById(R.id.statusDot)
        val tableName: TextView = view.findViewById(R.id.tableName)
        val tableStatus: TextView = view.findViewById(R.id.tableStatus)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TableViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_table, parent, false)
        return TableViewHolder(view)
    }

    override fun onBindViewHolder(holder: TableViewHolder, position: Int) {
        val table = tables[position]
        val ctx = holder.itemView.context

        holder.tableName.text = table.name

        if (table.hasOpenOrder) {
            holder.tableStatus.text = "Open Order"
            holder.tableStatus.setTextColor(ContextCompat.getColor(ctx, R.color.green_400))
            holder.statusDot.backgroundTintList =
                ColorStateList.valueOf(ContextCompat.getColor(ctx, R.color.green_500))
            holder.card.strokeColor = ContextCompat.getColor(ctx, R.color.green_500)
            holder.card.strokeWidth = 2
        } else {
            holder.tableStatus.text = "Available"
            holder.tableStatus.setTextColor(ContextCompat.getColor(ctx, R.color.text_secondary))
            holder.statusDot.backgroundTintList =
                ColorStateList.valueOf(ContextCompat.getColor(ctx, R.color.text_disabled))
            holder.card.strokeColor = ContextCompat.getColor(ctx, R.color.colorOutline)
            holder.card.strokeWidth = 1
        }

        holder.itemView.setOnClickListener {
            val intent = Intent(ctx, MenuActivity::class.java)
            intent.putExtra("TABLE_ID", table.id)
            intent.putExtra("TABLE_NAME", table.name)
            ctx.startActivity(intent)
        }
    }

    override fun getItemCount() = tables.size
}
