package com.provsoft.recordatorios.alarm

import android.content.Context
import android.media.RingtoneManager
import android.net.Uri

object AlarmPreferences {
    private const val PREFS = "provsoft_alarm_settings"
    private const val KEY_SOUND_URI = "alarm_sound_uri"
    private const val KEY_VIBRATION = "alarm_vibration"

    fun getSoundUri(context: Context): Uri? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val saved = prefs.getString(KEY_SOUND_URI, null)
        if (!saved.isNullOrBlank()) return Uri.parse(saved)

        return RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    }

    fun setSoundUri(context: Context, uri: Uri) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_SOUND_URI, uri.toString())
            .apply()
    }

    fun useSystemDefaultSound(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_SOUND_URI)
            .apply()
    }

    fun isVibrationEnabled(context: Context): Boolean {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY_VIBRATION, true)
    }

    fun setVibrationEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_VIBRATION, enabled)
            .apply()
    }
}
