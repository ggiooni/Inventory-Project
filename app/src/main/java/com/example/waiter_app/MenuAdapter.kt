package com.example.waiter_app

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class MenuAdapter(
    private val rows: List<MenuRow>,
    private val onClick: (MenuItem) -> Unit
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    private val TYPE_HEADER = 0
    private val TYPE_ITEM = 1

    override fun getItemViewType(position: Int): Int {
        return when (rows[position]) {
            is MenuRow.Header -> TYPE_HEADER
            is MenuRow.Item -> TYPE_ITEM
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {

        val inflater = LayoutInflater.from(parent.context)

        return if (viewType == TYPE_HEADER) {
            val view = inflater.inflate(R.layout.item_menu_header, parent, false)
            HeaderVH(view)
        } else {
            val view = inflater.inflate(R.layout.item_menu, parent, false)
            ItemVH(view)
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {

        when (val row = rows[position]) {

            is MenuRow.Header -> {
                (holder as HeaderVH).title.text = row.title
            }

            is MenuRow.Item -> {
                val item = row.item
                val vh = holder as ItemVH
                vh.title.text = "${item.name}  €${"%.2f".format(item.price)}"
                vh.itemView.setOnClickListener { onClick(item) }
            }
        }
    }

    override fun getItemCount() = rows.size

    class HeaderVH(view: View) : RecyclerView.ViewHolder(view) {
        val title: TextView = view.findViewById(R.id.headerTitle)
    }

    class ItemVH(view: View) : RecyclerView.ViewHolder(view) {
        val title: TextView = view.findViewById(R.id.menuItemName)
    }
}