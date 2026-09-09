package com.provsoft.recordatorios

import android.app.Application
import com.provsoft.recordatorios.alarm.NotificationHelper

class ProvsoftApp : Application() {
    override fun onCreate() {
        super.onCreate()
        NotificationHelper.createChannels(this)
    }
}
