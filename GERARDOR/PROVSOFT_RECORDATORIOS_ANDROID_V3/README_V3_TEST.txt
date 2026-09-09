PROVSOFT RECORDATORIOS ANDROID V3 TEST
======================================

Cambios principales:
- Cada recordatorio genera una notificación independiente.
- El sonido/vibración dura aprox. 6 segundos por recordatorio.
- Si llegan varios recordatorios juntos, se procesan en cola y todos alertan.
- Un recordatorio vencido no bloquea los recordatorios nuevos.
- Botones de alarma: ATENDER / POSPONER 30 MIN / POSPONER 4 HORAS / MAÑANA.
- Posponer actualiza fecha_programada en Firestore y vuelve a programar AlarmManager.
- Horario protegido: 23:00 a 05:00. Los aplazamientos que caen allí pasan a las 05:00.
- El editor Android no permite guardar alarmas dentro de 23:00-05:00 ni fechas pasadas.
- Nuevo icono de despertador PROVSOFT en launcher y notificaciones.

PRUEBA RECOMENDADA
1. Instalar desde Android Studio.
2. Conceder notificaciones y permiso de alarmas exactas.
3. Crear 3 recordatorios para la misma hora (2-3 minutos adelante).
4. Confirmar que los 3 producen sonido/vibración en secuencia y dejan 3 avisos.
5. Probar POSPONER 30 MIN.
6. Probar POSPONER 4 HORAS.
7. Probar POSPONER PARA MAÑANA.
8. Intentar editar una alarma a las 02:00: debe bloquear el guardado.
9. Dejar recordatorios vencidos y crear uno nuevo: el nuevo debe alertar normalmente.

Logcat: tag:PROVSOFT_ALARM
