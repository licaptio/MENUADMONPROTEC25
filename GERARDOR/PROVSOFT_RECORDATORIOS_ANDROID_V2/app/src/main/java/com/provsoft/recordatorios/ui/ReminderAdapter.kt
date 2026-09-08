package com.provsoft.recordatorios.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.provsoft.recordatorios.data.Reminder
import com.provsoft.recordatorios.databinding.ItemReminderBinding
import java.text.SimpleDateFormat
import java.util.Locale

class ReminderAdapter(private val click:(Reminder)->Unit): RecyclerView.Adapter<ReminderAdapter.VH>() {
    private val items=mutableListOf<Reminder>()
    fun submit(list:List<Reminder>){ items.clear();items.addAll(list);notifyDataSetChanged() }
    class VH(val b:ItemReminderBinding):RecyclerView.ViewHolder(b.root)
    override fun onCreateViewHolder(p:ViewGroup,v:Int)=VH(ItemReminderBinding.inflate(LayoutInflater.from(p.context),p,false))
    override fun getItemCount()=items.size
    override fun onBindViewHolder(h:VH,pos:Int){ val r=items[pos];h.b.tvTitle.text=r.titulo;h.b.tvMessage.text=r.contenido.ifBlank{"Sin mensaje"};h.b.tvDate.text=r.fecha_programada?.toDate()?.let{SimpleDateFormat("dd MMM yyyy · HH:mm",Locale("es","MX")).format(it)}?:"Sin fecha";h.b.root.setOnClickListener{click(r)} }
}
