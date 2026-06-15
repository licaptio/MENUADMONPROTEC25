PROVSOFT - Administrador de Productos Modular

Archivos:
- index.html
- config.js
- css/productos.css
- css/loader.css
- js/productos.estado.js
- js/productos.utils.js
- js/productos.loader.js
- js/productos.local.js
- js/productos.firebase.js
- js/productos.busqueda.js
- js/productos.tabla.js
- js/productos.modal-busqueda.js
- js/productos.editor.js
- js/productos.main.js

Flujo:
1. Carga IndexedDB primero.
2. Si hay local, muestra rápido.
3. Sincroniza Firebase en segundo plano.
4. Búsqueda por descripción trabaja local.
5. Búsqueda por código: local primero, Firebase si no existe.
6. Alta/edición/eliminación actualiza Firebase + IndexedDB + memoria.
