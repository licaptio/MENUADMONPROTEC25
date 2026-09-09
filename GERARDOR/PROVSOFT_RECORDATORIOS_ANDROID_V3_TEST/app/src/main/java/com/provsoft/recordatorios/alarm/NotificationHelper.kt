package com.provsoft.recordatorios.alarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

object NotificationHelper {
    // Canal nuevo para que Android no conserve el sonido/configuración del canal viejo.
    const val ALARM_CHANNEL = "provsoft_alarm_v3"
    const val SYNC_CHANNEL = "provsoft_sync"
    const val ALARM_SERVICE_CHANNEL = "provsoft_alarm_service_v3"

    fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val manager = context.getSystemService(NotificationManager::class.java)

        val alarm = NotificationChannel(
            ALARM_CHANNEL,
            "Alarmas PROVSOFT",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Avisos de recordatorios programados"
            // El sonido y la vibración los controla AlarmSoundService para poder
            // encadenar varias alarmas sin que una bloquee a la siguiente.
            setSound(null, null)
            enableVibration(false)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PRIVATE
        }

        val sync = NotificationChannel(
            SYNC_CHANNEL,
            "Sincronización PROVSOFT",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Mantiene sincronizados los recordatorios de Firebase"
        }

        val service = NotificationChannel(
            ALARM_SERVICE_CHANNEL,
            "Motor de alarmas PROVSOFT",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Procesa las alertas de recordatorios"
            setSound(null, null)
            enableVibration(false)
        }

        manager.createNotificationChannels(listOf(alarm, sync, service))
    }

    fun notificationId(reminderId: String): Int {
        // Evita usar el ID fijo 9001 para todos los recordatorios.
        return (reminderId.hashCode() and 0x7fffffff).coerceAtLeast(10000)
    }

    fun cancelAlarm(context: Context, reminderId: String) {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.cancel(notificationId(reminderId))
    }
}
