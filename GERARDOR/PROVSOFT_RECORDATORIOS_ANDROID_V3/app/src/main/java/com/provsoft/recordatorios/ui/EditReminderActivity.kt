package com.provsoft.recordatorios.ui

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.bumptech.glide.Glide
import com.provsoft.recordatorios.alarm.AlarmScheduler
import com.provsoft.recordatorios.alarm.NotificationHelper
import com.provsoft.recordatorios.alarm.QuietHours
import com.provsoft.recordatorios.data.Reminder
import com.provsoft.recordatorios.data.ReminderRepository
import com.provsoft.recordatorios.databinding.ActivityEditBinding
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.UUID

class EditReminderActivity : AppCompatActivity() {

 private lateinit var binding: ActivityEditBinding
 private lateinit var reminderId: String

 private val calendar = Calendar.getInstance()
 private val imageUrls = mutableListOf<String>()

 private var reminder: Reminder? = null

 private val imagePicker =
  registerForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
   uris.forEach(::uploadImage)
  }

 override fun onCreate(savedInstanceState: Bundle?) {
  super.onCreate(savedInstanceState)

  binding = ActivityEditBinding.inflate(layoutInflater)
  setContentView(binding.root)

  reminderId = intent.getStringExtra("reminder_id") ?: run {
   finish()
   return
  }

  loadReminder()

  binding.btnDate.setOnClickListener {
   DatePickerDialog(
    this,
    { _, year, month, day ->
     calendar.set(year, month, day)
     updateLabels()
    },
    calendar.get(Calendar.YEAR),
    calendar.get(Calendar.MONTH),
    calendar.get(Calendar.DAY_OF_MONTH)
   ).show()
  }

  binding.btnTime.setOnClickListener {
   TimePickerDialog(
    this,
    { _, hour, minute ->
     calendar.set(Calendar.HOUR_OF_DAY, hour)
     calendar.set(Calendar.MINUTE, minute)
     calendar.set(Calendar.SECOND, 0)
     updateLabels()
    },
    calendar.get(Calendar.HOUR_OF_DAY),
    calendar.get(Calendar.MINUTE),
    true
   ).show()
  }

  binding.btnAddImages.setOnClickListener {
   imagePicker.launch("image/*")
  }

  binding.btnSave.setOnClickListener {
   saveChanges()
  }
 }

 private fun loadReminder() {
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
    binding.etMessage.setText(result.contenido)

    result.fecha_programada?.toDate()?.let {
     calendar.time = it
    }

    imageUrls.clear()
    imageUrls.addAll(result.imagenes)

    updateLabels()
    renderImages()
   }
  }
 }

 private fun updateLabels() {
  binding.btnDate.text =
   "Fecha: " + SimpleDateFormat(
    "dd/MM/yyyy",
    Locale("es", "MX")
   ).format(calendar.time)

  binding.btnTime.text =
   "Hora: " + SimpleDateFormat(
    "HH:mm",
    Locale("es", "MX")
   ).format(calendar.time)
 }

 private fun renderImages() {
  binding.editImageContainer.removeAllViews()

  imageUrls.forEach { url ->

   val imageView = ImageView(this).apply {
    layoutParams = LinearLayout.LayoutParams(
     220,
     220
    ).also {
     it.marginEnd = 12
    }

    scaleType = ImageView.ScaleType.CENTER_CROP
    isClickable = true
    isFocusable = true
    contentDescription = "Abrir imagen"

    setOnClickListener {
     startActivity(
      Intent(
       this@EditReminderActivity,
       ImageViewerActivity::class.java
      ).putExtra("image_url", url)
     )
    }
   }

   Glide.with(this)
    .load(url)
    .centerCrop()
    .into(imageView)

   binding.editImageContainer.addView(imageView)
  }
 }

 private fun uploadImage(uri: Uri) {
  val reference =
   ReminderRepository.storage.reference.child(
    "recordatorios/$reminderId/${UUID.randomUUID()}.jpg"
   )

  reference.putFile(uri)
   .continueWithTask { task ->
    if (!task.isSuccessful) {
     throw task.exception ?: Exception("Error al subir imagen")
    }

    reference.downloadUrl
   }
   .addOnSuccessListener { downloadUrl ->
    imageUrls.add(downloadUrl.toString())
    renderImages()
   }
   .addOnFailureListener { error ->
    Toast.makeText(
     this,
     error.message ?: "Error al subir imagen",
     Toast.LENGTH_LONG
    ).show()
   }
 }

 private fun saveChanges() {
  if (calendar.time.time <= System.currentTimeMillis()) {
   Toast.makeText(
    this,
    "La fecha y hora deben estar en el futuro",
    Toast.LENGTH_LONG
   ).show()
   return
  }

  if (QuietHours.isBlocked(calendar.time)) {
   Toast.makeText(
    this,
    "Horario de descanso: no se permiten alarmas entre 23:00 y 05:00",
    Toast.LENGTH_LONG
   ).show()
   return
  }

  binding.btnSave.isEnabled = false

  ReminderRepository.update(
   reminderId,
   binding.etMessage.text.toString(),
   calendar.time,
   imageUrls,
   done = {
    ReminderRepository.get(reminderId) { updatedReminder ->
     updatedReminder?.let {
      AlarmScheduler.schedule(this, it)
      NotificationHelper.cancelAlarm(this, reminderId)
     }
    }

    Toast.makeText(
     this,
     "Cambios guardados",
     Toast.LENGTH_SHORT
    ).show()

    finish()
   },
   fail = { error ->
    binding.btnSave.isEnabled = true

    Toast.makeText(
     this,
     error.message ?: "No se pudieron guardar los cambios",
     Toast.LENGTH_LONG
    ).show()
   }
  )
 }
}