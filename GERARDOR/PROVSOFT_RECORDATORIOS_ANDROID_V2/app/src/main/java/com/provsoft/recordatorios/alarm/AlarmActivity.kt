package com.provsoft.recordatorios.alarm

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.provsoft.recordatorios.databinding.ActivityAlarmBinding
import com.provsoft.recordatorios.ui.ReminderDetailActivity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class AlarmActivity : AppCompatActivity() {
    private lateinit var b: ActivityAlarmBinding
    private lateinit var id: String
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b=ActivityAlarmBinding.inflate(layoutInflater); setContentView(b.root)
        id=intent.getStringExtra("reminder_id") ?: run { finish(); return }
        b.tvAlarmTime.text=SimpleDateFormat("dd MMM yyyy · HH:mm", Locale("es","MX")).format(Date())
        b.btnAttend.setOnClickListener {
            stopService(Intent(this, AlarmSoundService::class.java))
            startActivity(Intent(this, ReminderDetailActivity::class.java).putExtra("reminder_id", id).putExtra("from_alarm", true)); finish()
        }
        b.btnSnooze.setOnClickListener {
            AlarmScheduler.snooze(this,id,10); stopService(Intent(this, AlarmSoundService::class.java)); finish()
        }
    }
    override fun onBackPressed() { /* La alarma requiere Atender o Posponer */ }
}
