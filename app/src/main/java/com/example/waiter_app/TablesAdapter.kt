package com.example.waiter_app

import android.content.Intent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class TablesAdapter(private val tables: List<String>) :
    RecyclerView.Adapter<TablesAdapter.TableViewHolder>() {

    class TableViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tableName: TextView = view.findViewById(R.id.tableName)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TableViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_table, parent, false)
        return TableViewHolder(view)
    }

    override fun onBindViewHolder(holder: TableViewHolder, position: Int) {
        val table = tables[position]
        holder.tableName.text = table

        holder.itemView.setOnClickListener {

            val intent = Intent(holder.itemView.context, MenuActivity::class.java)
            intent.putExtra("TABLE_NAME", table)
            holder.itemView.context.startActivity(intent)

        }
    }

    override fun getItemCount() = tables.size
}