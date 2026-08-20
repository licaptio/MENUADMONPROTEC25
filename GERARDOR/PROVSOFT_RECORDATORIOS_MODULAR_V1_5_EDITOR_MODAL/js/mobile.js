// mobile.js - Versión mejorada con 3 secciones
(() => {
  const MOBILE_BREAKPOINT = 820;
  const botones = [...document.querySelectorAll('[data-mobile-section]')];
  const paneles = [...document.querySelectorAll('[data-mobile-panel]')];
  
  if (!botones.length || !paneles.length) return;

  function esMovil() { 
    return window.innerWidth <= MOBILE_BREAKPOINT; 
  }

  function abrirSeccion(nombre, actualizarHash = true) {
    if (!esMovil()) {
      // En desktop: mostrar todos los paneles
      paneles.forEach(p => p.style.display = 'block');
      paneles.forEach(p => p.classList.add('active'));
      botones.forEach(b => b.classList.remove('active'));
      return;
    }

    // En móvil: mostrar solo el panel seleccionado
    // Definir qué panel corresponde a cada sección
    const mapaPaneles = {
      'crear': 'crear',
      'revisar': 'revisar',
      'fechas': 'fechas'  // NUEVA SECCIÓN
    };

    const destino = mapaPaneles[nombre] || 'crear';
    
    // Ocultar todos los paneles
    paneles.forEach(p => {
      p.style.display = 'none';
      p.classList.remove('active');
    });

    // Mostrar el panel seleccionado
    const panelActivo = paneles.find(p => p.dataset.mobilePanel === destino);
    if (panelActivo) {
      panelActivo.style.display = 'flex';
      panelActivo.classList.add('active');
    }

    // Actualizar botones activos
    botones.forEach(b => {
      b.classList.toggle('active', b.dataset.mobileSection === destino);
    });

    // Actualizar hash de la URL
    if (actualizarHash) {
      const hash = destino === 'crear' ? '#nuevo' : destino === 'revisar' ? '#revisar' : '#fechas';
      history.replaceState(null, '', hash);
    }

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // Event listeners para todos los botones
  botones.forEach(boton => {
    boton.addEventListener('click', () => {
      const seccion = boton.dataset.mobileSection;
      if (seccion) abrirSeccion(seccion);
    });
  });

  // Inicializar según el hash de la URL
  const hash = location.hash;
  let inicial = 'crear';
  if (hash === '#revisar') inicial = 'revisar';
  else if (hash === '#fechas') inicial = 'fechas';  // NUEVO

  abrirSeccion(inicial, false);

  // Manejar cambio de tamaño de ventana
  let timeoutId = null;
  window.addEventListener('resize', () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (esMovil()) {
        const activa = botones.find(b => b.classList.contains('active'))?.dataset.mobileSection || inicial;
        abrirSeccion(activa, false);
      } else {
        // En desktop mostrar todo
        paneles.forEach(p => {
          p.style.display = 'block';
          p.classList.add('active');
        });
        botones.forEach(b => b.classList.remove('active'));
      }
    }, 150);
  });

  console.log('📱 Navegación móvil con 3 secciones inicializada');
})();
