package com.provsoft.recordatorios.alarm

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.provsoft.recordatorios.data.ReminderRepository
import com.provsoft.recordatorios.databinding.ActivityAlarmBinding
import com.provsoft.recordatorios.ui.ReminderDetailActivity
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class AlarmActivity : AppCompatActivity() {

    companion object {
        @Volatile var isVisible: Boolean = false
            private set
    }

    private lateinit var b: ActivityAlarmBinding
    private lateinit var id: String

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityAlarmBinding.inflate(layoutInflater)
        setContentView(b.root)

        id = intent.getStringExtra("reminder_id") ?: run {
            finish()
            return
        }

        renderTime()
        bindActions()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent.getStringExtra("reminder_id")?.let {
            id = it
            renderTime()
        }
    }

    override fun onStart() {
        super.onStart()
        isVisible = true
    }

    override fun onStop() {
        isVisible = false
        super.onStop()
    }

    private fun renderTime() {
        b.tvAlarmTime.text = SimpleDateFormat(
            "dd MMM yyyy · HH:mm",
            Locale("es", "MX")
        ).format(Date())
    }

    private fun bindActions() {
        b.btnAttend.setOnClickListener {
            AlarmSoundService.dismissAlarm(this, id)
            startActivity(
                Intent(this, ReminderDetailActivity::class.java)
                    .putExtra("reminder_id", id)
                    .putExtra("from_alarm", true)
            )
            finish()
        }

        b.btnSnooze30.setOnClickListener {
            postponeByMinutes(30)
        }

        b.btnSnooze4Hours.setOnClickListener {
            postponeByMinutes(4 * 60)
        }

        b.btnTomorrow.setOnClickListener {
            setButtonsEnabled(false)
            ReminderRepository.get(id) { reminder ->
                runOnUiThread {
                    val target = QuietHours.tomorrowAtSameTime(
                        reminder?.fecha_programada?.toDate()
                    )
                    savePostpone(target, "Pospuesto para mañana")
                }
            }
        }
    }

    private fun postponeByMinutes(minutes: Int) {
        val target = Calendar.getInstance().apply {
            add(Calendar.MINUTE, minutes)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.time

        val safeTarget = QuietHours.normalizeForward(target)
        setButtonsEnabled(false)
        savePostpone(
            safeTarget,
            if (minutes == 30) "Pospuesto 30 minutos" else "Pospuesto 4 horas"
        )
    }

    private fun savePostpone(target: Date, message: String) {
        ReminderRepository.reschedule(
            id = id,
            date = target,
            done = {
                runOnUiThread {
                    AlarmScheduler.scheduleAt(this, id, target)
                    NotificationHelper.cancelAlarm(this, id)
                    AlarmSoundService.dismissAlarm(this, id)

                    Toast.makeText(
                        this,
                        "$message · ${SimpleDateFormat("dd/MM HH:mm", Locale("es", "MX")).format(target)}",
                        Toast.LENGTH_LONG
                    ).show()
                    finish()
                }
            },
            fail = { error ->
                runOnUiThread {
                    setButtonsEnabled(true)
                    Toast.makeText(
                        this,
                        error.message ?: "No se pudo posponer",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        )
    }

    private fun setButtonsEnabled(enabled: Boolean) {
        b.btnAttend.isEnabled = enabled
        b.btnSnooze30.isEnabled = enabled
        b.btnSnooze4Hours.isEnabled = enabled
        b.btnTomorrow.isEnabled = enabled
    }

    @Deprecated("La alarma requiere una acción explícita")
    override fun onBackPressed() {
        // No cerrar con Atrás: Atender o Posponer.
    }
}
