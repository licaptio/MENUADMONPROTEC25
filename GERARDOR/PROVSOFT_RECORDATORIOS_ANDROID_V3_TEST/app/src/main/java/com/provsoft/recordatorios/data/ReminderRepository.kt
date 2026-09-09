package com.provsoft.recordatorios.data

import android.util.Log
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.storage.FirebaseStorage
import java.util.Date

object ReminderRepository {

    private val db by lazy { FirebaseFirestore.getInstance() }
    val storage by lazy { FirebaseStorage.getInstance() }

    fun listenPending(
        onData: (List<Reminder>) -> Unit,
        onError: (Exception) -> Unit
    ): ListenerRegistration {
        return db.collection("recordatorios")
            .whereEqualTo("tipo", "RECORDATORIO")
            .whereEqualTo("estado", "PENDIENTE")
            .addSnapshotListener { snap, error ->
                if (error != null) {
                    onError(error)
                    return@addSnapshotListener
                }

                val list = snap?.documents.orEmpty()
                    .mapNotNull { document ->
                        try {
                            val datos = document.data ?: return@mapNotNull null
                            Reminder(
                                id = document.id,
                                titulo = datos["titulo"] as? String ?: "Recordatorio",
                                contenido = datos["contenido"] as? String ?: "",
                                estado = datos["estado"] as? String ?: "PENDIENTE",
                                fecha_programada = datos["fecha_programada"] as? Timestamp,
                                imagenes = leerImagenes(datos["imagenes"])
                            )
                        } catch (e: Exception) {
                            Log.e("ReminderRepository", "Documento inválido: ${document.id}", e)
                            null
                        }
                    }
                    .sortedBy { it.fecha_programada?.toDate()?.time ?: Long.MAX_VALUE }

                onData(list)
            }
    }

    fun get(id: String, callback: (Reminder?) -> Unit) {
        db.collection("recordatorios")
            .document(id)
            .get()
            .addOnSuccessListener { document ->
                try {
                    val datos = document.data
                    if (datos == null) {
                        callback(null)
                        return@addOnSuccessListener
                    }

                    callback(
                        Reminder(
                            id = document.id,
                            titulo = datos["titulo"] as? String ?: "Recordatorio",
                            contenido = datos["contenido"] as? String ?: "",
                            estado = datos["estado"] as? String ?: "PENDIENTE",
                            fecha_programada = datos["fecha_programada"] as? Timestamp,
                            imagenes = leerImagenes(datos["imagenes"])
                        )
                    )
                } catch (e: Exception) {
                    Log.e("ReminderRepository", "Error leyendo recordatorio $id", e)
                    callback(null)
                }
            }
            .addOnFailureListener { callback(null) }
    }

    fun markDone(
        id: String,
        done: () -> Unit,
        fail: (Exception) -> Unit
    ) {
        db.collection("recordatorios")
            .document(id)
            .update(
                mapOf(
                    "estado" to "ATENDIDO",
                    "fecha_atendido" to Timestamp.now(),
                    "ultima_modificacion" to Timestamp.now()
                )
            )
            .addOnSuccessListener { done() }
            .addOnFailureListener(fail)
    }

    fun reschedule(
        id: String,
        date: Date,
        done: () -> Unit,
        fail: (Exception) -> Unit
    ) {
        val now = Timestamp.now()
        db.collection("recordatorios")
            .document(id)
            .update(
                mapOf(
                    "estado" to "PENDIENTE",
                    "fecha_programada" to Timestamp(date),
                    "fecha_reprogramada" to now,
                    "ultima_modificacion" to now
                )
            )
            .addOnSuccessListener { done() }
            .addOnFailureListener(fail)
    }

    fun update(
        id: String,
        message: String,
        date: Date,
        images: List<String>,
        done: () -> Unit,
        fail: (Exception) -> Unit
    ) {
        val title = message
            .lineSequence()
            .map { it.trim() }
            .firstOrNull { it.isNotBlank() }
            ?.take(120)
            ?: "Recordatorio"

        db.collection("recordatorios")
            .document(id)
            .update(
                mapOf(
                    "titulo" to title,
                    "contenido" to message.trim(),
                    "fecha_programada" to Timestamp(date),
                    "imagenes" to images,
                    "ultima_modificacion" to Timestamp.now()
                )
            )
            .addOnSuccessListener { done() }
            .addOnFailureListener(fail)
    }

    private fun leerImagenes(valor: Any?): List<String> {
        val lista = valor as? List<*> ?: return emptyList()
        return lista.mapNotNull { elemento ->
            when (elemento) {
                is String -> elemento
                is Map<*, *> -> {
                    elemento["url"] as? String
                        ?: elemento["downloadURL"] as? String
                        ?: elemento["downloadUrl"] as? String
                }
                else -> null
            }
        }
    }
}
