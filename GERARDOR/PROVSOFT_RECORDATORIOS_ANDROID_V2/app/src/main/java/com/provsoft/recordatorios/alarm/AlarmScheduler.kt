package com.provsoft.recordatorios.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.provsoft.recordatorios.data.Reminder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object AlarmScheduler {

    private const val TAG = "PROVSOFT_ALARM"

    fun schedule(context: Context, reminder: Reminder) {
        val whenMillis = reminder.fecha_programada?.toDate()?.time

        if (whenMillis == null) {
            Log.e(TAG, "No se programó ${reminder.id}: no tiene fecha")
            return
        }

        if (whenMillis <= System.currentTimeMillis()) {
            Log.e(
                TAG,
                "No se programó ${reminder.id}: la fecha ya pasó: ${
                    formatDate(whenMillis)
                }"
            )
            return
        }

        val manager = context.getSystemService(AlarmManager::class.java)

        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("reminder_id", reminder.id)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            reminder.id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            val exactasPermitidas =
                Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
                        manager.canScheduleExactAlarms()

            Log.d(
                TAG,
                "Programando ${reminder.id} para ${formatDate(whenMillis)}. " +
                        "Exactas permitidas: $exactasPermitidas"
            )

            if (exactasPermitidas) {
                manager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    whenMillis,
                    pendingIntent
                )
            } else {
                Log.e(
                    TAG,
                    "Sin permiso para alarmas exactas. Se usará alarma inexacta."
                )

                manager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    whenMillis,
                    pendingIntent
                )
            }
        } catch (error: Exception) {
            Log.e(TAG, "Error programando alarma ${reminder.id}", error)
        }
    }

    fun snooze(context: Context, id: String, minutes: Int) {
        val manager = context.getSystemService(AlarmManager::class.java)

        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("reminder_id", id)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val whenMillis =
            System.currentTimeMillis() + minutes * 60_000L

        Log.d(
            TAG,
            "Posponiendo $id hasta ${formatDate(whenMillis)}"
        )

        try {
            if (
                Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
                manager.canScheduleExactAlarms()
            ) {
                manager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    whenMillis,
                    pendingIntent
                )
            } else {
                manager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    whenMillis,
                    pendingIntent
                )
            }
        } catch (error: Exception) {
            Log.e(TAG, "Error posponiendo alarma $id", error)
        }
    }

    private fun formatDate(value: Long): String {
        return SimpleDateFormat(
            "dd/MM/yyyy HH:mm:ss",
            Locale("es", "MX")
        ).format(Date(value))
    }
}