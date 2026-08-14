(() => {
  const MOBILE_BREAKPOINT = 820;
  const botones = [...document.querySelectorAll('[data-mobile-section]')];
  const paneles = [...document.querySelectorAll('[data-mobile-panel]')];
  if (!botones.length || !paneles.length) return;

  function esMovil(){ return window.innerWidth <= MOBILE_BREAKPOINT; }

  function abrirSeccion(nombre, actualizarHash = true){
    if (!esMovil()) {
      paneles.forEach(p => p.classList.add('active'));
      botones.forEach(b => b.classList.remove('active'));
      return;
    }

    const destino = nombre === 'revisar' ? 'revisar' : 'crear';
    paneles.forEach(p => p.classList.toggle('active', p.dataset.mobilePanel === destino));
    botones.forEach(b => b.classList.toggle('active', b.dataset.mobileSection === destino));

    if (actualizarHash) history.replaceState(null, '', destino === 'revisar' ? '#revisar' : '#nuevo');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  botones.forEach(boton => boton.addEventListener('click', () => abrirSeccion(boton.dataset.mobileSection)));

  const inicial = location.hash === '#revisar' ? 'revisar' : 'crear';
  abrirSeccion(inicial, false);

  window.addEventListener('resize', () => {
    if (esMovil()) {
      const activa = botones.find(b => b.classList.contains('active'))?.dataset.mobileSection || inicial;
      abrirSeccion(activa, false);
    } else {
      paneles.forEach(p => p.classList.add('active'));
    }
  });
})();
