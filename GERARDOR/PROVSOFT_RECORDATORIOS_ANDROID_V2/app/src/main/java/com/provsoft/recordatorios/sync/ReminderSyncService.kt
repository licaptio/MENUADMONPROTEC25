package com.provsoft.recordatorios.sync

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.firestore.ListenerRegistration
import com.provsoft.recordatorios.R
import com.provsoft.recordatorios.alarm.AlarmScheduler
import com.provsoft.recordatorios.alarm.NotificationHelper
import com.provsoft.recordatorios.data.ReminderRepository

class ReminderSyncService : Service() {

    private var listener: ListenerRegistration? = null

    override fun onCreate() {
        super.onCreate()

        Log.d(
            "PROVSOFT_ALARM",
            "ReminderSyncService iniciado"
        )

        NotificationHelper.createChannels(this)

        val notification = NotificationCompat.Builder(
            this,
            NotificationHelper.SYNC_CHANNEL
        )
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("PROVSOFT activo")
            .setContentText("Sincronizando recordatorios")
            .setOngoing(true)
            .build()

        startForeground(9002, notification)

        listener = ReminderRepository.listenPending(
            onData = { reminders ->

                Log.d(
                    "PROVSOFT_ALARM",
                    "Firestore entregó ${reminders.size} recordatorios pendientes"
                )

                reminders.forEach { reminder ->

                    Log.d(
                        "PROVSOFT_ALARM",
                        "Enviando a programar: ${reminder.id} - ${reminder.titulo}"
                    )

                    AlarmScheduler.schedule(
                        this,
                        reminder
                    )
                }
            },
            onError = { error ->

                Log.e(
                    "PROVSOFT_ALARM",
                    "Error sincronizando recordatorios",
                    error
                )
            }
        )
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int
    ): Int {

        Log.d(
            "PROVSOFT_ALARM",
            "ReminderSyncService onStartCommand"
        )

        return START_STICKY
    }

    override fun onDestroy() {
        Log.d(
            "PROVSOFT_ALARM",
            "ReminderSyncService destruido"
        )

        listener?.remove()
        listener = null

        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}