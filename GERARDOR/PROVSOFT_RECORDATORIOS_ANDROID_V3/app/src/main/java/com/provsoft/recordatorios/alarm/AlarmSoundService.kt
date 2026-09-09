package com.provsoft.recordatorios.alarm

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.provsoft.recordatorios.R
import java.util.ArrayDeque

class AlarmSoundService : Service() {

    companion object {
        private const val TAG = "PROVSOFT_ALARM"
        private const val FOREGROUND_ID = 9001
        private const val ALERT_DURATION_MS = 6000L
        private const val ACTION_DISMISS = "com.provsoft.recordatorios.DISMISS_ALARM"

        fun dismissAlarm(context: Context, reminderId: String) {
            val intent = Intent(context, AlarmSoundService::class.java).apply {
                action = ACTION_DISMISS
                putExtra("reminder_id", reminderId)
            }
            context.startService(intent)
        }
    }

    private val queue = ArrayDeque<String>()
    private val queuedIds = mutableSetOf<String>()
    private val handler = Handler(Looper.getMainLooper())

    private var currentId: String? = null
    private var player: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var finishRunnable: Runnable? = null

    override fun onCreate() {
        super.onCreate()
        NotificationHelper.createChannels(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val reminderId = intent?.getStringExtra("reminder_id")

        if (intent?.action == ACTION_DISMISS) {
            if (!reminderId.isNullOrBlank()) {
                dismissInternal(reminderId)
            }
            if (currentId == null && queue.isEmpty()) {
                stopSelf(startId)
            }
            return START_NOT_STICKY
        }

        if (reminderId.isNullOrBlank()) {
            Log.e(TAG, "AlarmSoundService recibió un ID vacío")
            return START_NOT_STICKY
        }

        ensureForeground()

        if (reminderId != currentId && queuedIds.add(reminderId)) {
            queue.addLast(reminderId)
            Log.d(TAG, "Alarma en cola: $reminderId. Cola=${queue.size}")
        }

        if (currentId == null) {
            processNext()
        }

        return START_NOT_STICKY
    }

    private fun ensureForeground() {
        val notification = NotificationCompat.Builder(
            this,
            NotificationHelper.ALARM_SERVICE_CHANNEL
        )
            .setSmallIcon(R.drawable.ic_alarm_notification)
            .setContentTitle("PROVSOFT")
            .setContentText("Procesando alertas")
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        try {
            startForeground(FOREGROUND_ID, notification)
        } catch (error: Exception) {
            Log.e(TAG, "No se pudo iniciar el motor de alarmas", error)
        }
    }

    private fun processNext() {
        stopCurrentSound()

        val next = if (queue.isEmpty()) null else queue.removeFirst()
        if (next == null) {
            currentId = null
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return
        }

        queuedIds.remove(next)
        currentId = next

        publishAlarmNotification(next)
        startAlarmSound(next)
        openAlarmScreenIfNeeded(next)

        val runnable = Runnable {
            Log.d(TAG, "Fin de alerta sonora para $next")
            if (currentId == next) {
                currentId = null
                processNext()
            }
        }
        finishRunnable = runnable
        handler.postDelayed(runnable, ALERT_DURATION_MS)
    }

    private fun publishAlarmNotification(reminderId: String) {
        val openIntent = Intent(this, AlarmActivity::class.java).apply {
            putExtra("reminder_id", reminderId)
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            reminderId.hashCode(),
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification: Notification = NotificationCompat.Builder(
            this,
            NotificationHelper.ALARM_CHANNEL
        )
            .setSmallIcon(R.drawable.ic_alarm_notification)
            .setContentTitle("PROVSOFT")
            .setContentText("Recordatorio pendiente")
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setFullScreenIntent(pendingIntent, true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(this).notify(
                NotificationHelper.notificationId(reminderId),
                notification
            )
            Log.d(TAG, "Notificación independiente publicada: $reminderId")
        } catch (error: SecurityException) {
            Log.e(TAG, "Sin permiso para publicar notificación", error)
        }
    }

    private fun startAlarmSound(reminderId: String) {
        stopCurrentSound()

        try {
            val alarmUri = AlarmPreferences.getSoundUri(this)

            if (alarmUri != null) {
                player = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    setDataSource(this@AlarmSoundService, alarmUri)
                    setVolume(1.0f, 1.0f)
                    isLooping = true
                    setOnPreparedListener {
                        it.start()
                        Log.d(TAG, "Sonido iniciado para $reminderId")
                    }
                    setOnErrorListener { _, what, extra ->
                        Log.e(TAG, "MediaPlayer error what=$what extra=$extra")
                        true
                    }
                    prepareAsync()
                }
            }
        } catch (error: Exception) {
            Log.e(TAG, "No se pudo reproducir el tono para $reminderId", error)
        }

        if (AlarmPreferences.isVibrationEnabled(this)) {
            try {
                vibrator = getAlarmVibrator()
                val timings = longArrayOf(0, 650, 250, 650, 250, 650)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    // 220/255: fuerte y perceptible sin usar la amplitud máxima.
                    val amplitudes = intArrayOf(0, 220, 0, 220, 0, 220)
                    vibrator?.vibrate(
                        VibrationEffect.createWaveform(timings, amplitudes, 0)
                    )
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(timings, 0)
                }
                Log.d(TAG, "Vibración fuerte iniciada para $reminderId")
            } catch (error: Exception) {
                Log.e(TAG, "No se pudo vibrar para $reminderId", error)
            }
        } else {
            Log.d(TAG, "Vibración desactivada por el usuario para $reminderId")
        }
    }

    private fun getAlarmVibrator(): Vibrator? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            getSystemService(VibratorManager::class.java)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(VIBRATOR_SERVICE) as? Vibrator
        }
    }

    private fun openAlarmScreenIfNeeded(reminderId: String) {
        if (AlarmActivity.isVisible) {
            Log.d(TAG, "AlarmActivity ya visible; se conserva la pantalla actual")
            return
        }

        val openIntent = Intent(this, AlarmActivity::class.java).apply {
            putExtra("reminder_id", reminderId)
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
        }

        try {
            startActivity(openIntent)
            Log.d(TAG, "AlarmActivity abierta para $reminderId")
        } catch (error: Exception) {
            Log.e(TAG, "No se pudo abrir AlarmActivity", error)
        }
    }

    private fun dismissInternal(reminderId: String) {
        queue.remove(reminderId)
        queuedIds.remove(reminderId)

        if (currentId == reminderId) {
            finishRunnable?.let(handler::removeCallbacks)
            finishRunnable = null
            currentId = null
            stopCurrentSound()
            processNext()
        }
    }

    private fun stopCurrentSound() {
        try {
            if (player?.isPlaying == true) player?.stop()
        } catch (_: Exception) {
        }
        player?.release()
        player = null

        try {
            vibrator?.cancel()
        } catch (_: Exception) {
        }
        vibrator = null
    }

    override fun onDestroy() {
        finishRunnable?.let(handler::removeCallbacks)
        finishRunnable = null
        stopCurrentSound()
        queue.clear()
        queuedIds.clear()
        currentId = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
