package com.example.waiter_app

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton

class MenuAdapter(
    private val rows: List<MenuRow>,
    private val isExpanded: (category: String) -> Boolean,
    private val getQty: (menuItemId: String) -> Int,
    private val onPlus: (MenuItem) -> Unit,
    private val onMinus: (MenuItem) -> Unit,
    private val onHeaderClick: (category: String) -> Unit
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    private val TYPE_HEADER = 0
    private val TYPE_ITEM = 1

    override fun getItemViewType(position: Int): Int = when (rows[position]) {
        is MenuRow.Header -> TYPE_HEADER
        is MenuRow.Item -> TYPE_ITEM
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return if (viewType == TYPE_HEADER) {
            HeaderVH(inflater.inflate(R.layout.item_menu_header, parent, false))
        } else {
            ItemVH(inflater.inflate(R.layout.item_menu, parent, false))
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (val row = rows[position]) {

            is MenuRow.Header -> {
                val vh = holder as HeaderVH
                vh.title.text = row.title.uppercase()
                val expanded = isExpanded(row.title)
                // Rotate chevron: 0° = collapsed (pointing down), 180° = expanded (pointing up)
                vh.chevron.rotation = if (expanded) 180f else 0f
                vh.itemView.setOnClickListener {
                    // Animate chevron on tap
                    val targetRotation = if (expanded) 0f else 180f
                    vh.chevron.animate().rotation(targetRotation).setDuration(200).start()
                    onHeaderClick(row.title)
                }
            }

            is MenuRow.Item -> {
                val item = row.item
                val vh = holder as ItemVH
                val qty = getQty(item.id)

                vh.name.text = item.name
                vh.price.text = "€${"%.2f".format(item.price)}"

                if (item.isAvailable) {
                    vh.itemView.alpha = 1.0f
                    vh.qtyGroup.visibility = View.VISIBLE
                    vh.outOfStock.visibility = View.GONE

                    vh.tvQty.text = qty.toString()
                    vh.btnMinus.isEnabled = qty > 0
                    vh.btnMinus.alpha = if (qty > 0) 1.0f else 0.3f

                    vh.btnPlus.setOnClickListener(null)
                    vh.btnMinus.setOnClickListener(null)
                    vh.btnPlus.setOnClickListener { onPlus(item) }
                    vh.btnMinus.setOnClickListener { if (qty > 0) onMinus(item) }
                } else {
                    vh.itemView.alpha = 0.45f
                    vh.qtyGroup.visibility = View.GONE
                    vh.outOfStock.visibility = View.VISIBLE
                    vh.btnPlus.setOnClickListener(null)
                    vh.btnMinus.setOnClickListener(null)
                }
            }
        }
    }

    override fun getItemCount() = rows.size

    class HeaderVH(view: View) : RecyclerView.ViewHolder(view) {
        val title: TextView = view.findViewById(R.id.headerTitle)
        val chevron: ImageView = view.findViewById(R.id.headerChevron)
    }

    class ItemVH(view: View) : RecyclerView.ViewHolder(view) {
        val name: TextView = view.findViewById(R.id.menuItemName)
        val price: TextView = view.findViewById(R.id.tvPrice)
        val qtyGroup: View = view.findViewById(R.id.qtyGroup)
        val tvQty: TextView = view.findViewById(R.id.tvQty)
        val btnMinus: MaterialButton = view.findViewById(R.id.btnMinus)
        val btnPlus: MaterialButton = view.findViewById(R.id.btnPlus)
        val outOfStock: TextView = view.findViewById(R.id.tvOutOfStock)
    }
}
