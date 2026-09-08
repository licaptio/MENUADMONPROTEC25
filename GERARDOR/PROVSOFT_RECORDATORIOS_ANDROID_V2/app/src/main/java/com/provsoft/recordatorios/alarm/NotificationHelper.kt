package com.provsoft.recordatorios.alarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build

object NotificationHelper {
    const val ALARM_CHANNEL = "provsoft_alarm"
    const val SYNC_CHANNEL = "provsoft_sync"

    fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        val sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
        val alarm = NotificationChannel(ALARM_CHANNEL, "Alarmas PROVSOFT", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Alarmas de recordatorios programados"
            setSound(sound, attrs); enableVibration(true); lockscreenVisibility = 0
        }
        val sync = NotificationChannel(SYNC_CHANNEL, "Sincronización PROVSOFT", NotificationManager.IMPORTANCE_LOW).apply {
            description = "Mantiene sincronizados los recordatorios creados desde la PC"
        }
        manager.createNotificationChannels(listOf(alarm, sync))
    }
}
