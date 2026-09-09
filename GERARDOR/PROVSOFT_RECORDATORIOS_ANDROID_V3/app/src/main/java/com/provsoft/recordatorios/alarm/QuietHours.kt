package com.provsoft.recordatorios.alarm

import java.util.Calendar
import java.util.Date

/**
 * Horario protegido de descanso PROVSOFT: 23:00 a 04:59.
 * A partir de las 05:00 vuelven a permitirse alarmas.
 */
object QuietHours {
    const val START_HOUR = 23
    const val END_HOUR = 5

    fun isBlocked(date: Date): Boolean {
        val c = Calendar.getInstance().apply { time = date }
        val hour = c.get(Calendar.HOUR_OF_DAY)
        return hour >= START_HOUR || hour < END_HOUR
    }

    /**
     * Para aplazamientos automáticos: si el resultado cae en horario de descanso,
     * lo mueve a las 05:00 más próximas sin retroceder en el tiempo.
     */
    fun normalizeForward(date: Date): Date {
        if (!isBlocked(date)) return date

        val c = Calendar.getInstance().apply { time = date }
        val hour = c.get(Calendar.HOUR_OF_DAY)

        if (hour >= START_HOUR) {
            c.add(Calendar.DAY_OF_MONTH, 1)
        }

        c.set(Calendar.HOUR_OF_DAY, END_HOUR)
        c.set(Calendar.MINUTE, 0)
        c.set(Calendar.SECOND, 0)
        c.set(Calendar.MILLISECOND, 0)
        return c.time
    }

    fun tomorrowAtSameTime(original: Date?): Date {
        val now = Calendar.getInstance()
        val source = Calendar.getInstance().apply {
            time = original ?: Date()
        }

        val target = Calendar.getInstance().apply {
            time = now.time
            add(Calendar.DAY_OF_MONTH, 1)
            set(Calendar.HOUR_OF_DAY, source.get(Calendar.HOUR_OF_DAY))
            set(Calendar.MINUTE, source.get(Calendar.MINUTE))
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        return normalizeForward(target.time)
    }
}
