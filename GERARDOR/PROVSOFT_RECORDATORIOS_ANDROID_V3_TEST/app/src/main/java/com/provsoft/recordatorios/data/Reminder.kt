package com.provsoft.recordatorios.data

import com.google.firebase.Timestamp

data class Reminder(
    val id: String = "",
    val tipo: String = "RECORDATORIO",
    val titulo: String = "Recordatorio",
    val contenido: String = "",
    val estado: String = "PENDIENTE",
    val fecha_programada: Timestamp? = null,
    val imagenes: List<String> = emptyList()
)
