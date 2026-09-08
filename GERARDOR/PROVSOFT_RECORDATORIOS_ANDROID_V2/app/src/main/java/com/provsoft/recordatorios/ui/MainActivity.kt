package com.provsoft.recordatorios.ui

import android.Manifest
import android.app.AlarmManager
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.firebase.firestore.ListenerRegistration
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

    private val notificationPermission =
        registerForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) { granted ->
            if (!granted) {
                binding.tvStatus.text =
                    "Las notificaciones están desactivadas"
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        NotificationHelper.createChannels(this)

        adapter = ReminderAdapter(::confirmAction)

        binding.recyclerReminders.layoutManager =
            LinearLayoutManager(this)

        binding.recyclerReminders.adapter = adapter

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
                    binding.tvStatus.text =
                        "Error: ${error.message}"
                }
            }
        )
    }

    override fun onResume() {
        super.onResume()

        /*
         * Cuando el usuario vuelve de la pantalla especial
         * de alarmas exactas, reiniciamos el servicio y
         * volvemos a leer/programar los recordatorios.
         */
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
            notificationPermission.launch(
                Manifest.permission.POST_NOTIFICATIONS
            )
        }
    }

    private fun requestExactAlarmPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return
        }

        val alarmManager =
            getSystemService(AlarmManager::class.java)

        if (
            !alarmManager.canScheduleExactAlarms() &&
            !requestedExactAlarmPermission
        ) {
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
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true
        }

        val alarmManager =
            getSystemService(AlarmManager::class.java)

        return alarmManager.canScheduleExactAlarms()
    }

    private fun startReminderSyncService() {
        try {
            ContextCompat.startForegroundService(
                this,
                Intent(
                    this,
                    ReminderSyncService::class.java
                )
            )
        } catch (error: Exception) {
            binding.tvStatus.text =
                "No se pudo iniciar sincronización: ${error.message}"
        }
    }

    private fun reloadAndScheduleReminders() {
        ReminderRepository.listenPending(
            onData = { reminders ->
                programAllReminders(reminders)
            },
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
                    Intent(
                        this,
                        ReminderDetailActivity::class.java
                    ).putExtra(
                        "reminder_id",
                        reminder.id
                    )
                )
            }
            .setPositiveButton("Sí") { _, _ ->
                startActivity(
                    Intent(
                        this,
                        EditReminderActivity::class.java
                    ).putExtra(
                        "reminder_id",
                        reminder.id
                    )
                )
            }
            .show()
    }

    override fun onDestroy() {
        listener?.remove()
        super.onDestroy()
    }
}