PROVSOFT RECORDATORIOS ANDROID V1

PAQUETE
com.provsoft.recordatorios

INCLUYE
- Conexión al proyecto Firebase notasfoliador.
- Lista en tiempo real de recordatorios PENDIENTES.
- Al tocar una tarjeta pregunta: ¿Deseas editar este recordatorio?
  * Sí: abre editor.
  * No: abre vista de solo lectura.
- Editor de fecha, hora, mensaje e imágenes.
- Alarma exacta con el tono nativo de ALARMA de Android.
- Sin voz y sin leer el contenido en público.
- Pantalla de alarma privada: solo indica “Recordatorio pendiente”.
- Botones ATENDER y POSPONER 10 MIN.
- ATENDER abre el contenido; editar requiere confirmación.
- Servicio de sincronización para recibir recordatorios creados desde la PC.
- Reprogramación después de reiniciar el teléfono.

COMO ABRIR
1. Instala Android Studio.
2. File > Open y selecciona esta carpeta.
3. Espera la sincronización de Gradle.
4. Conecta el celular con Depuración USB.
5. Ejecuta con Run.

PARA GENERAR APK
Build > Build Bundle(s) / APK(s) > Build APK(s)
El archivo aparecerá en app/build/outputs/apk/debug/app-debug.apk

PRIMERA EJECUCION
Autoriza:
- Notificaciones.
- Alarmas y recordatorios exactos.
- Pantalla completa, si Android lo solicita.
- En Xiaomi/HyperOS conviene usar batería “Sin restricciones” y permitir inicio automático.

LIMITACION V1
Android puede restringir servicios permanentes según fabricante. La aplicación usa un servicio visible de sincronización para programar inmediatamente los recordatorios creados desde la PC. No utiliza voz.
