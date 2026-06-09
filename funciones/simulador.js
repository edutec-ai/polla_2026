// funciones/simulador.js
// Módulo del Simulador de Puntos - 100% fiel al diseño original

export async function renderizarSimulador(contenedor, datosCuenta) {
  if (!contenedor) return;

  // Cargar CSS solo una vez
  if (!document.querySelector('#simulador-styles')) {
    const link = document.createElement('link');
    link.id = 'simulador-styles';
    link.rel = 'stylesheet';
    link.href = './funciones/simulador/simulador.css';
    document.head.appendChild(link);
  }

  // Cargar HTML del simulador
  try {
    const response = await fetch('./funciones/simulador/simulador.html');
    const html = await response.text();
    contenedor.innerHTML = html;

    // Inicializar la lógica del simulador
    inicializarSimulador(datosCuenta);
  } catch (error) {
    console.error('Error cargando el simulador:', error);
    contenedor.innerHTML = '<div style="color:white;padding:20px;text-align:center;">❌ Error cargando el simulador</div>';
  }
}

function inicializarSimulador(datosCuenta) {
  // Banderas aleatorias
  const BANDERAS = ['🇦🇷', '🇧🇷', '🇫🇷', '🇩🇪', '🇪🇸', '🇮🇹', '🇳🇱', '🇵🇹', '🇬🇧', '🇺🇸', '🇲🇽', '🇨🇴', '🇯🇵', '🇦🇺'];
  const banderaLocal = BANDERAS[Math.floor(Math.random() * BANDERAS.length)];
  const banderaVisita = BANDERAS[Math.floor(Math.random() * BANDERAS.length)];
  
  document.getElementById('banderaLocalSim').textContent = banderaLocal;
  document.getElementById('banderaVisitaSim').textContent = banderaVisita;

  // PUNTOS POR FASE
  const PUNTOS_POR_FASE = {
    'grupos':   { BASE: 20, GANADOR: 8,  GOL: 4, DIFERENCIA: 4, INVERSO: 4 },
    '16avos':   { BASE: 40, GANADOR: 16, GOL: 8, DIFERENCIA: 8, INVERSO: 8 },
    '8avos':    { BASE: 60, GANADOR: 24, GOL: 12, DIFERENCIA: 12, INVERSO: 12 },
    'cuartos':  { BASE: 80, GANADOR: 32, GOL: 16, DIFERENCIA: 16, INVERSO: 16 },
    'semis':    { BASE: 100, GANADOR: 40, GOL: 20, DIFERENCIA: 20, INVERSO: 20 },
    'tercero':  { BASE: 100, GANADOR: 40, GOL: 20, DIFERENCIA: 20, INVERSO: 20 },
    'final':    { BASE: 200, GANADOR: 80, GOL: 40, DIFERENCIA: 40, INVERSO: 40 }
  };

  let pronosticoLocal = 3;
  let pronosticoVisita = 2;
  let resultadoRealLocal = 0;
  let resultadoRealVisita = 0;
  let puntosActuales = PUNTOS_POR_FASE['grupos'];

  // ========== FUNCIONES ==========
  function getGanador(local, visita) {
    if (local > visita) return 'local';
    if (visita > local) return 'visita';
    return 'empate';
  }

  function getDiferencia(local, visita) {
    return Math.abs(local - visita);
  }

  function calcularPuntos() {
    const p = puntosActuales;
    let ganador = 0, golLocal = 0, golVisita = 0, diferencia = 0, inverso = 0;

    const pronosticoGanador = getGanador(pronosticoLocal, pronosticoVisita);
    const realGanador = getGanador(resultadoRealLocal, resultadoRealVisita);
    
    if (pronosticoGanador === realGanador) ganador = p.GANADOR;
    if (resultadoRealLocal === pronosticoLocal) golLocal = p.GOL;
    if (resultadoRealVisita === pronosticoVisita) golVisita = p.GOL;

    const pronosticoDiferencia = getDiferencia(pronosticoLocal, pronosticoVisita);
    const realDiferencia = getDiferencia(resultadoRealLocal, resultadoRealVisita);
    if (pronosticoDiferencia === realDiferencia) diferencia = p.DIFERENCIA;

    if (pronosticoGanador !== realGanador) {
      if (resultadoRealLocal === pronosticoVisita && resultadoRealVisita === pronosticoLocal) {
        inverso = p.INVERSO;
      }
    }

    const total = ganador + golLocal + golVisita + diferencia + inverso;
    return { ganador, golLocal, golVisita, diferencia, inverso, total };
  }

  function actualizarUI() {
    const pts = calcularPuntos();
    const p = puntosActuales;

    document.getElementById('ptsGanadorSim').innerHTML = `${pts.ganador} pts`;
    document.getElementById('ptsGolLocalSim').innerHTML = `${pts.golLocal} pts`;
    document.getElementById('ptsGolVisitaSim').innerHTML = `${pts.golVisita} pts`;
    document.getElementById('ptsDiferenciaSim').innerHTML = `${pts.diferencia} pts`;
    document.getElementById('ptsInversoSim').innerHTML = `${pts.inverso} pts`;
    document.getElementById('totalPuntosSim').innerHTML = `${pts.total} pts`;
    document.getElementById('basePtsBadgeSim').innerHTML = `BASE: ${p.BASE} PTS`;
    document.getElementById('multBadgeSim').innerHTML = `${p.BASE}`;

    const elementos = [
      { id: 'ptsGanadorSim', valor: pts.ganador },
      { id: 'ptsGolLocalSim', valor: pts.golLocal },
      { id: 'ptsGolVisitaSim', valor: pts.golVisita },
      { id: 'ptsDiferenciaSim', valor: pts.diferencia },
      { id: 'ptsInversoSim', valor: pts.inverso }
    ];

    elementos.forEach(el => {
      const element = document.getElementById(el.id);
      if (el.valor > 0) element.classList.add('acierto');
      else element.classList.remove('acierto');
    });

    const totalEl = document.getElementById('totalPuntosSim');
    if (pts.total > 0) totalEl.classList.add('acierto');
    else totalEl.classList.remove('acierto');
  }

  function actualizarPronosticoUI() {
    document.getElementById('pronosticoLocalSim').value = pronosticoLocal;
    document.getElementById('pronosticoVisitaSim').value = pronosticoVisita;
    actualizarUI();
  }

  function actualizarResultadoUI() {
    document.getElementById('realGolLocalSim').textContent = resultadoRealLocal;
    document.getElementById('realGolVisitaSim').textContent = resultadoRealVisita;
    actualizarUI();
  }

  function cambiarFase(fase) {
    puntosActuales = PUNTOS_POR_FASE[fase];
    actualizarUI();
  }

  function simularPronostico() {
    const nuevoLocal = Math.floor(Math.random() * 6);
    const nuevoVisita = Math.floor(Math.random() * 6);
    pronosticoLocal = nuevoLocal;
    pronosticoVisita = nuevoVisita;
    actualizarPronosticoUI();
    document.querySelectorAll('.btn-resultado-sim').forEach(b => b.classList.remove('activo'));
  }

  // ========== EVENTOS ==========
  document.getElementById('btnSimularSim').addEventListener('click', simularPronostico);

  document.querySelectorAll('.btn-resultado-sim').forEach(btn => {
    btn.addEventListener('click', function() {
      pronosticoLocal = parseInt(this.dataset.local);
      pronosticoVisita = parseInt(this.dataset.visita);
      actualizarPronosticoUI();
      document.querySelectorAll('.btn-resultado-sim').forEach(b => b.classList.remove('activo'));
      this.classList.add('activo');
    });
  });

  document.getElementById('btnRealIncLocalSim').addEventListener('click', () => {
    if (resultadoRealLocal < 20) { resultadoRealLocal++; actualizarResultadoUI(); }
    document.querySelectorAll('.btn-resultado-sim').forEach(b => b.classList.remove('activo'));
  });
  document.getElementById('btnRealDecLocalSim').addEventListener('click', () => {
    if (resultadoRealLocal > 0) { resultadoRealLocal--; actualizarResultadoUI(); }
    document.querySelectorAll('.btn-resultado-sim').forEach(b => b.classList.remove('activo'));
  });
  document.getElementById('btnRealIncVisitaSim').addEventListener('click', () => {
    if (resultadoRealVisita < 20) { resultadoRealVisita++; actualizarResultadoUI(); }
    document.querySelectorAll('.btn-resultado-sim').forEach(b => b.classList.remove('activo'));
  });
  document.getElementById('btnRealDecVisitaSim').addEventListener('click', () => {
    if (resultadoRealVisita > 0) { resultadoRealVisita--; actualizarResultadoUI(); }
    document.querySelectorAll('.btn-resultado-sim').forEach(b => b.classList.remove('activo'));
  });

  document.getElementById('faseSelectSim').addEventListener('change', function() {
    cambiarFase(this.value);
  });

  // Inicializar
  cambiarFase('grupos');
  actualizarPronosticoUI();
  actualizarResultadoUI();
}