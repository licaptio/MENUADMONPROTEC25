PROVSOFT · CARGADOR CFDI PDD

EJECUCIÓN
1. Abre la carpeta.
2. Ejecuta server.py.
3. La aplicación abrirá http://127.0.0.1:8000/

CONFIGURACIÓN FIREBASE
- Pulsa el icono de engrane.
- Entra a "Autorizar proveedores Firebase".
- Captura únicamente el RFC.
- Cada RFC se guarda como documento en:

/CLIENTES/PDD031204KL5/CONFIGURACION/EGRESOSFIREBASEAUTORIZADOS/items/{RFC}

REGLA DEL CARGADOR
- Supabase: recibe todos los CFDI válidos.
- Firebase: solo recibe CFDI cuyo RFC emisor esté autorizado.
- Si el RFC no está autorizado, Supabase continúa y Firebase lo marca como "Omitido".

IMPORTANTE
Las reglas de Firestore deben permitir lectura y escritura en:
- La subcolección de RFC autorizados.
- /almacenes/ALMACENCENTRALPDD/entradas
