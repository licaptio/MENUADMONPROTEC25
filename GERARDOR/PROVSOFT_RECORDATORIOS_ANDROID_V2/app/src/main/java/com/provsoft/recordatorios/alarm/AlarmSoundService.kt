package com.provsoft.recordatorios.alarm

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.provsoft.recordatorios.R

class AlarmSoundService : Service() {

    private var player: MediaPlayer? = null

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int
    ): Int {

        Log.d(
            "PROVSOFT_ALARM",
            "AlarmSoundService iniciado"
        )

        val reminderId =
            intent?.getStringExtra("reminder_id")

        if (reminderId.isNullOrBlank()) {
            Log.e(
                "PROVSOFT_ALARM",
                "AlarmSoundService recibió un ID vacío"
            )

            stopSelf()
            return START_NOT_STICKY
        }

        NotificationHelper.createChannels(this)

        val openIntent =
            Intent(this, AlarmActivity::class.java).apply {
                putExtra("reminder_id", reminderId)

                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                            Intent.FLAG_ACTIVITY_CLEAR_TOP or
                            Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
            }

        val fullScreenPendingIntent =
            PendingIntent.getActivity(
                this,
                reminderId.hashCode(),
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or
                        PendingIntent.FLAG_IMMUTABLE
            )

        val notification: Notification =
            NotificationCompat.Builder(
                this,
                NotificationHelper.ALARM_CHANNEL
            )
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("PROVSOFT")
                .setContentText("Recordatorio pendiente")
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setOngoing(true)
                .setAutoCancel(false)
                .setFullScreenIntent(
                    fullScreenPendingIntent,
                    true
                )
                .setContentIntent(
                    fullScreenPendingIntent
                )
                .build()

        try {
            startForeground(
                9001,
                notification
            )

            Log.d(
                "PROVSOFT_ALARM",
                "Notificación de alarma publicada"
            )
        } catch (error: Exception) {
            Log.e(
                "PROVSOFT_ALARM",
                "No se pudo iniciar el servicio en primer plano",
                error
            )

            stopSelf()
            return START_NOT_STICKY
        }

        if (player == null) {
            try {
                val alarmUri =
                    RingtoneManager.getDefaultUri(
                        RingtoneManager.TYPE_ALARM
                    )
                        ?: RingtoneManager.getDefaultUri(
                            RingtoneManager.TYPE_NOTIFICATION
                        )

                if (alarmUri == null) {
                    Log.e(
                        "PROVSOFT_ALARM",
                        "Android no devolvió un tono de alarma"
                    )
                } else {
                    player = MediaPlayer().apply {
                        setAudioAttributes(
                            AudioAttributes.Builder()
                                .setUsage(
                                    AudioAttributes.USAGE_ALARM
                                )
                                .setContentType(
                                    AudioAttributes.CONTENT_TYPE_SONIFICATION
                                )
                                .build()
                        )

                        setDataSource(
                            this@AlarmSoundService,
                            alarmUri
                        )

                        isLooping = true

                        setOnPreparedListener {
                            it.start()

                            Log.d(
                                "PROVSOFT_ALARM",
                                "Sonido de alarma iniciado"
                            )
                        }

                        setOnErrorListener { _, what, extra ->
                            Log.e(
                                "PROVSOFT_ALARM",
                                "Error de MediaPlayer: what=$what extra=$extra"
                            )

                            true
                        }

                        prepareAsync()
                    }
                }
            } catch (error: Exception) {
                Log.e(
                    "PROVSOFT_ALARM",
                    "No se pudo reproducir el tono de alarma",
                    error
                )
            }
        }

        try {
            startActivity(openIntent)

            Log.d(
                "PROVSOFT_ALARM",
                "AlarmActivity solicitada"
            )
        } catch (error: Exception) {
            Log.e(
                "PROVSOFT_ALARM",
                "No se pudo abrir AlarmActivity",
                error
            )
        }

        return START_STICKY
    }

    override fun onDestroy() {
        try {
            player?.stop()
        } catch (_: Exception) {
        }

        player?.release()
        player = null

        Log.d(
            "PROVSOFT_ALARM",
            "AlarmSoundService detenido"
        )

        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}