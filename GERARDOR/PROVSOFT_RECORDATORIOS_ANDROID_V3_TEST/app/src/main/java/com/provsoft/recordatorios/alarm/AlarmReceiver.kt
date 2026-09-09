package com.provsoft.recordatorios.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra("reminder_id")

        Log.d(
            "PROVSOFT_ALARM",
            "AlarmReceiver ejecutado. ID: $id"
        )

        if (id.isNullOrBlank()) {
            Log.e(
                "PROVSOFT_ALARM",
                "AlarmReceiver recibió un ID vacío"
            )
            return
        }

        val serviceIntent =
            Intent(context, AlarmSoundService::class.java).apply {
                putExtra("reminder_id", id)
            }

        try {
            ContextCompat.startForegroundService(
                context,
                serviceIntent
            )

            Log.d(
                "PROVSOFT_ALARM",
                "AlarmSoundService solicitado correctamente"
            )
        } catch (error: Exception) {
            Log.e(
                "PROVSOFT_ALARM",
                "No se pudo iniciar AlarmSoundService",
                error
            )
        }
    }
}