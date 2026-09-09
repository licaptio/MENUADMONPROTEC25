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
        val original = reminder.fecha_programada?.toDate()

        if (original == null) {
            Log.e(TAG, "No se programó ${reminder.id}: no tiene fecha")
            return
        }

        // Protección final: aunque algún cliente viejo haya guardado una hora nocturna,
        // Android nunca hará sonar una alarma entre 23:00 y 05:00.
        val safeDate = QuietHours.normalizeForward(original)
        val whenMillis = safeDate.time

        if (whenMillis <= System.currentTimeMillis()) {
            Log.d(
                TAG,
                "No se programó ${reminder.id}: la fecha ya pasó: ${formatDate(whenMillis)}"
            )
            return
        }

        if (safeDate.time != original.time) {
            Log.w(
                TAG,
                "${reminder.id}: horario protegido. ${formatDate(original.time)} -> ${formatDate(safeDate.time)}"
            )
        }

        scheduleAt(context, reminder.id, safeDate)
    }

    fun scheduleAt(context: Context, id: String, date: Date) {
        val safeDate = QuietHours.normalizeForward(date)
        val whenMillis = safeDate.time

        if (whenMillis <= System.currentTimeMillis()) {
            Log.e(TAG, "No se programó $id: fecha no futura ${formatDate(whenMillis)}")
            return
        }

        val manager = context.getSystemService(AlarmManager::class.java)
        val pendingIntent = alarmPendingIntent(context, id)

        try {
            val exactasPermitidas =
                Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
                    manager.canScheduleExactAlarms()

            Log.d(
                TAG,
                "Programando $id para ${formatDate(whenMillis)}. Exactas permitidas: $exactasPermitidas"
            )

            if (exactasPermitidas) {
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
            Log.e(TAG, "Error programando alarma $id", error)
        }
    }

    fun cancel(context: Context, id: String) {
        val manager = context.getSystemService(AlarmManager::class.java)
        manager.cancel(alarmPendingIntent(context, id))
    }

    private fun alarmPendingIntent(context: Context, id: String): PendingIntent {
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("reminder_id", id)
        }

        return PendingIntent.getBroadcast(
            context,
            id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun formatDate(value: Long): String =
        SimpleDateFormat(
            "dd/MM/yyyy HH:mm:ss",
            Locale("es", "MX")
        ).format(Date(value))
}
