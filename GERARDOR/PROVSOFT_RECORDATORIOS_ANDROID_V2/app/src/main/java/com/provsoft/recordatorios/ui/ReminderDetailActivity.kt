package com.provsoft.recordatorios.ui

import android.content.Intent
import android.os.Bundle
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.bumptech.glide.Glide
import com.provsoft.recordatorios.data.Reminder
import com.provsoft.recordatorios.data.ReminderRepository
import com.provsoft.recordatorios.databinding.ActivityDetailBinding
import java.text.SimpleDateFormat
import java.util.Locale

class ReminderDetailActivity : AppCompatActivity() {

 private lateinit var binding: ActivityDetailBinding
 private lateinit var reminderId: String
 private var reminder: Reminder? = null

 override fun onCreate(savedInstanceState: Bundle?) {
  super.onCreate(savedInstanceState)

  binding = ActivityDetailBinding.inflate(layoutInflater)
  setContentView(binding.root)

  reminderId = intent.getStringExtra("reminder_id") ?: run {
   finish()
   return
  }

  binding.btnEdit.setOnClickListener {
   AlertDialog.Builder(this)
    .setTitle("Confirmar edición")
    .setMessage("¿Deseas editar este recordatorio?")
    .setNegativeButton("No", null)
    .setPositiveButton("Sí") { _, _ ->
     startActivity(
      Intent(
       this,
       EditReminderActivity::class.java
      ).putExtra("reminder_id", reminderId)
     )
    }
    .show()
  }

  binding.btnMarkDone.setOnClickListener {
   AlertDialog.Builder(this)
    .setTitle("Marcar atendido")
    .setMessage("¿Confirmas que el recordatorio ya fue atendido?")
    .setNegativeButton("Cancelar", null)
    .setPositiveButton("Atendido") { _, _ ->
     ReminderRepository.markDone(
      reminderId,
      done = {
       Toast.makeText(
        this,
        "Recordatorio atendido",
        Toast.LENGTH_SHORT
       ).show()

       finish()
      },
      fail = { error ->
       Toast.makeText(
        this,
        error.message ?: "Error al marcar atendido",
        Toast.LENGTH_LONG
       ).show()
      }
     )
    }
    .show()
  }

  load()
 }

 override fun onResume() {
  super.onResume()

  if (::reminderId.isInitialized) {
   load()
  }
 }

 private fun load() {
  ReminderRepository.get(reminderId) { result ->

   runOnUiThread {

    if (result == null) {
     Toast.makeText(
      this,
      "No se encontró el recordatorio",
      Toast.LENGTH_LONG
     ).show()

     finish()
     return@runOnUiThread
    }

    reminder = result

    binding.tvDetailTitle.text = result.titulo

    binding.tvDetailMessage.text =
     result.contenido.ifBlank { "Sin mensaje" }

    binding.tvDetailDate.text =
     result.fecha_programada?.toDate()?.let { date ->
      SimpleDateFormat(
       "dd MMM yyyy · HH:mm",
       Locale("es", "MX")
      ).format(date)
     } ?: "Sin fecha programada"

    binding.imageContainer.removeAllViews()

    result.imagenes.forEach { url ->

     val imageView = ImageView(this).apply {

      layoutParams = LinearLayout.LayoutParams(
       320,
       320
      ).also {
       it.marginEnd = 18
      }

      scaleType = ImageView.ScaleType.CENTER_CROP
      isClickable = true
      isFocusable = true

      setOnClickListener {

       Toast.makeText(
        this@ReminderDetailActivity,
        "CLICK DETECTADO",
        Toast.LENGTH_LONG
       ).show()

       startActivity(
        Intent(
         this@ReminderDetailActivity,
         ImageViewerActivity::class.java
        ).putExtra("image_url", url)
       )
      }
     }

     Glide.with(this@ReminderDetailActivity)
      .load(url)
      .centerCrop()
      .into(imageView)

     binding.imageContainer.addView(imageView)
    }
   }
  }
 }
}