package com.provsoft.recordatorios.ui

import android.Manifest
import android.app.AlarmManager
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.widget.PopupMenu
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.firebase.firestore.ListenerRegistration
import com.provsoft.recordatorios.alarm.AlarmPreferences
import com.provsoft.recordatorios.alarm.AlarmScheduler
import com.provsoft.recordatorios.alarm.NotificationHelper
import com.provsoft.recordatorios.data.Reminder
import com.provsoft.recordatorios.data.ReminderRepository
import com.provsoft.recordatorios.databinding.ActivityMainBinding
import com.provsoft.recordatorios.sync.ReminderSyncService

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var adapter: ReminderAdapter

    private var listener: ListenerRegistration? = null
    private var requestedExactAlarmPermission = false
    private var previewRingtone: Ringtone? = null
    private var previewVibrator: Vibrator? = null
    private val previewHandler = Handler(Looper.getMainLooper())

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (!granted) {
                binding.tvStatus.text = "Las notificaciones están desactivadas"
            }
        }

    private val ringtonePicker =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            if (result.resultCode != RESULT_OK) return@registerForActivityResult

            val uri: Uri? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                result.data?.getParcelableExtra(
                    RingtoneManager.EXTRA_RINGTONE_PICKED_URI,
                    Uri::class.java
                )
            } else {
                @Suppress("DEPRECATION")
                result.data?.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
            }

            if (uri != null) {
                AlarmPreferences.setSoundUri(this, uri)
                Toast.makeText(this, "Sonido de alarma guardado", Toast.LENGTH_SHORT).show()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        NotificationHelper.createChannels(this)

        adapter = ReminderAdapter(::confirmAction)
        binding.recyclerReminders.layoutManager = LinearLayoutManager(this)
        binding.recyclerReminders.adapter = adapter

        binding.btnMenu.setOnClickListener { showAlarmMenu() }

        requestNotificationPermission()
        requestExactAlarmPermission()
        startReminderSyncService()

        listener = ReminderRepository.listenPending(
            onData = { reminders ->
                runOnUiThread {
                    adapter.submit(reminders)
                    binding.tvStatus.text =
                        "${reminders.size} pendientes · Firebase conectado"
                    programAllReminders(reminders)
                }
            },
            onError = { error ->
                runOnUiThread {
                    binding.tvStatus.text = "Error: ${error.message}"
                }
            }
        )
    }

    private fun showAlarmMenu() {
        val popup = PopupMenu(this, binding.btnMenu)
        val vibrationEnabled = AlarmPreferences.isVibrationEnabled(this)

        popup.menu.add("Seleccionar sonido del sistema…")
        popup.menu.add("Usar sonido predeterminado del sistema")
        popup.menu.add(if (vibrationEnabled) "Vibrar: ACTIVADO ✓" else "Vibrar: DESACTIVADO")
        popup.menu.add("Probar sonido y vibración")

        popup.setOnMenuItemClickListener { item ->
            when (item.title.toString()) {
                "Seleccionar sonido del sistema…" -> {
                    openRingtonePicker()
                    true
                }

                "Usar sonido predeterminado del sistema" -> {
                    AlarmPreferences.useSystemDefaultSound(this)
                    Toast.makeText(
                        this,
                        "Se usará el sonido predeterminado de alarma",
                        Toast.LENGTH_SHORT
                    ).show()
                    true
                }

                "Vibrar: ACTIVADO ✓", "Vibrar: DESACTIVADO" -> {
                    val newValue = !AlarmPreferences.isVibrationEnabled(this)
                    AlarmPreferences.setVibrationEnabled(this, newValue)
                    Toast.makeText(
                        this,
                        if (newValue) "Vibración activada" else "Vibración desactivada",
                        Toast.LENGTH_SHORT
                    ).show()
                    true
                }

                "Probar sonido y vibración" -> {
                    testAlarmFeedback()
                    true
                }

                else -> false
            }
        }

        popup.show()
    }

    private fun openRingtonePicker() {
        val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER).apply {
            putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM)
            putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
            putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
            putExtra(
                RingtoneManager.EXTRA_RINGTONE_DEFAULT_URI,
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            )
            putExtra(
                RingtoneManager.EXTRA_RINGTONE_EXISTING_URI,
                AlarmPreferences.getSoundUri(this@MainActivity)
            )
            putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Sonido de alarma PROVSOFT")
        }
        ringtonePicker.launch(intent)
    }

    private fun testAlarmFeedback() {
        stopPreview()

        try {
            val uri = AlarmPreferences.getSoundUri(this)
            if (uri != null) {
                previewRingtone = RingtoneManager.getRingtone(this, uri)?.apply {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        audioAttributes = AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                        volume = 1.0f
                    }
                    play()
                }
            }
        } catch (_: Exception) {
        }

        if (AlarmPreferences.isVibrationEnabled(this)) {
            try {
                previewVibrator = getAlarmVibrator()
                val timings = longArrayOf(0, 650, 250, 650, 250, 650)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    // 220/255: vibración fuerte, pero sin usar la amplitud máxima.
                    val amplitudes = intArrayOf(0, 220, 0, 220, 0, 220)
                    previewVibrator?.vibrate(
                        VibrationEffect.createWaveform(timings, amplitudes, -1)
                    )
                } else {
                    @Suppress("DEPRECATION")
                    previewVibrator?.vibrate(timings, -1)
                }
            } catch (_: Exception) {
            }
        }

        previewHandler.postDelayed({ stopPreview() }, 3000L)
        Toast.makeText(this, "Prueba de alarma", Toast.LENGTH_SHORT).show()
    }

    private fun getAlarmVibrator(): Vibrator? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            getSystemService(VibratorManager::class.java)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(VIBRATOR_SERVICE) as? Vibrator
        }
    }

    private fun stopPreview() {
        try {
            previewRingtone?.stop()
        } catch (_: Exception) {
        }
        previewRingtone = null

        try {
            previewVibrator?.cancel()
        } catch (_: Exception) {
        }
        previewVibrator = null
    }

    override fun onResume() {
        super.onResume()
        if (canScheduleExactAlarms()) {
            startReminderSyncService()
            reloadAndScheduleReminders()
        }
    }

    private fun requestNotificationPermission() {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun requestExactAlarmPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return

        val alarmManager = getSystemService(AlarmManager::class.java)
        if (!alarmManager.canScheduleExactAlarms() && !requestedExactAlarmPermission) {
            requestedExactAlarmPermission = true

            AlertDialog.Builder(this)
                .setTitle("Permitir alarmas exactas")
                .setMessage(
                    "PROVSOFT necesita este permiso para hacer sonar " +
                        "los recordatorios exactamente a la hora programada."
                )
                .setNegativeButton("Después", null)
                .setPositiveButton("Abrir configuración") { _, _ ->
                    val intent = Intent(
                        Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                        Uri.parse("package:$packageName")
                    )
                    startActivity(intent)
                }
                .show()
        }
    }

    private fun canScheduleExactAlarms(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val alarmManager = getSystemService(AlarmManager::class.java)
        return alarmManager.canScheduleExactAlarms()
    }

    private fun startReminderSyncService() {
        try {
            ContextCompat.startForegroundService(
                this,
                Intent(this, ReminderSyncService::class.java)
            )
        } catch (error: Exception) {
            binding.tvStatus.text =
                "No se pudo iniciar sincronización: ${error.message}"
        }
    }

    private fun reloadAndScheduleReminders() {
        ReminderRepository.listenPending(
            onData = { reminders -> programAllReminders(reminders) },
            onError = {}
        )
    }

    private fun programAllReminders(reminders: List<Reminder>) {
        reminders.forEach { reminder ->
            AlarmScheduler.schedule(this, reminder)
        }
    }

    private fun confirmAction(reminder: Reminder) {
        AlertDialog.Builder(this)
            .setTitle(reminder.titulo)
            .setMessage("¿Deseas editar este recordatorio?")
            .setNegativeButton("No") { _, _ ->
                startActivity(
                    Intent(this, ReminderDetailActivity::class.java)
                        .putExtra("reminder_id", reminder.id)
                )
            }
            .setPositiveButton("Sí") { _, _ ->
                startActivity(
                    Intent(this, EditReminderActivity::class.java)
                        .putExtra("reminder_id", reminder.id)
                )
            }
            .show()
    }

    override fun onDestroy() {
        stopPreview()
        listener?.remove()
        super.onDestroy()
    }
}
