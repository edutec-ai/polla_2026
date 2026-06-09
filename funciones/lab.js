// funciones/lab.js
// Laboratorio de APIs, Simulador de Fecha y Visor JSON
// VERSIÓN CON SIMULADOR SIEMPRE SINCRONIZADO CON LA HORA REAL
// El simulador se actualiza automáticamente cada minuto
// Los botones "Ahora" y "Aplicar" llevan a la hora real

const BASE    = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
const BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
const KEY     = 'SuzvTp4qwXQtAVFJbdzP';

const LAB_APIS = [
  { id: 'fifa_etd',      label: 'Estadios',       icon: '🏟️', color: '#007aff', desc: '16 sedes del Mundial' },
  { id: 'fifa_fas',      label: 'Fases',          icon: '📅', color: '#5856d6', desc: 'Grupos · 16avos · Final' },
  { id: 'fifa_grp',      label: 'Grupos',         icon: '🔤', color: '#34c759', desc: '12 grupos A–L' },
  { id: 'fifa_equ',      label: 'Equipos',        icon: '⚽', color: '#ff9500', desc: 'Tabla de posiciones' },
  { id: 'fifa_clf',      label: 'Clasificados',   icon: '✅', color: '#30b0c7', desc: '2 clasificados por grupo' },
  { id: 'fifa_reg',      label: 'Reglas',         icon: '📋', color: '#ff3b30', desc: 'Puntos y configuración' },
  { id: 'fifa_reu',      label: 'Reuniones',      icon: '👥', color: '#ff2d55', desc: 'Grupos de jugadores' },
  { id: 'fifa_ptd',      label: 'Partidos',       icon: '🏆', color: '#af52de', desc: 'Fixture completo' },
  { id: 'fifa_ptd_est2', label: 'Partidos est=2', icon: '🔴', color: '#c0392b', desc: 'Filtro: estado=2', filtro: true },
  { id: 'fifa_jug',      label: 'Jugadores',      icon: '🎮', color: '#1c1c1e', desc: 'Ranking y acumulados' },
  { id: 'fifa_jug_pro',  label: 'Pronósticos',    icon: '🎯', color: '#636366', desc: 'Apuestas por partido' },
  { id: 'fifa_jug_pro_by_player', label: 'Pronósticos x Jugador', icon: '🎯', color: '#ff9500', desc: 'Pronósticos 104 partidos por jugador', jugFilter: true },
  { id: 'fifa_jug_clf_by_player', label: 'Clasificados x Jugador', icon: '🏆', color: '#af52de', desc: 'Clasificados y finalistas por jugador', jugFilter: true }
];

let datosCache = {};
let simuladorCallback = null;
let rotationInterval = null;
let refreshInProgress = false;
let autoUpdateInterval = null;

export let fechaSimuladaGlobal = new Date();

let visorState = {
  visible: false,
  apiId: null,
  data: null,
  registros: null,
  campos: null,
  pagina: 0,
  porPagina: 10
};

const STORAGE_KEY = 'polla_simulador_fecha';

function guardarFechaEnStorage(fechaISO) {
  if (fechaISO) localStorage.setItem(STORAGE_KEY, fechaISO);
}

function cargarFechaDesdeStorage() {
  return localStorage.getItem(STORAGE_KEY);
}

function obtenerFechaReal() {
  return new Date();
}

function actualizarFechaGlobal() {
  const el = document.getElementById('sim-datetime');
  if (el && el.value) {
    fechaSimuladaGlobal = new Date(el.value);
  }
}

// Sincronizar el input con la fecha global
function sincronizarInputConFecha() {
  const el = document.getElementById('sim-datetime');
  if (el && fechaSimuladaGlobal) {
    const year = fechaSimuladaGlobal.getFullYear();
    const month = String(fechaSimuladaGlobal.getMonth() + 1).padStart(2, '0');
    const day = String(fechaSimuladaGlobal.getDate()).padStart(2, '0');
    const hours = String(fechaSimuladaGlobal.getHours()).padStart(2, '0');
    const minutes = String(fechaSimuladaGlobal.getMinutes()).padStart(2, '0');
    el.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}

export function simGetFecha() {
  return fechaSimuladaGlobal;
}

export function simGetFechaStr() {
  const d = fechaSimuladaGlobal;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

export function simGetHoraStr() {
  const d = fechaSimuladaGlobal;
  const h = d.getHours();
  const m = d.getMinutes();
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

export function simSetFecha(date) {
  if (date instanceof Date) {
    fechaSimuladaGlobal = date;
    sincronizarInputConFecha();
    guardarFechaEnStorage(fechaSimuladaGlobal.toISOString());
    simActualizar();
  }
}

export function simSetFechaStr(fechaStr) {
  const el = document.getElementById('sim-datetime');
  if (el && fechaStr) {
    el.value = fechaStr;
    fechaSimuladaGlobal = new Date(el.value);
    guardarFechaEnStorage(fechaSimuladaGlobal.toISOString());
    simActualizar();
  }
}

export function simReset() {
  fechaSimuladaGlobal = obtenerFechaReal();
  sincronizarInputConFecha();
  guardarFechaEnStorage(fechaSimuladaGlobal.toISOString());
  simActualizar();
}

export function simActualizar() {
  const fechaStr = simGetFechaStr();
  const horaStr = simGetHoraStr();
  const status = document.getElementById('sim-status');
  if (status) status.textContent = '📅 Simulando: ' + fechaStr + ' · ' + horaStr;
  
  const el = document.getElementById('sim-datetime');
  if (el && el.value) {
    fechaSimuladaGlobal = new Date(el.value);
    guardarFechaEnStorage(fechaSimuladaGlobal.toISOString());
  }
  
  if (typeof simuladorCallback === 'function') {
    simuladorCallback(fechaStr, horaStr);
  }
}

export function onSimuladorCambio(callback) {
  simuladorCallback = callback;
}

function initSimulador() {
  const el = document.getElementById('sim-datetime');
  const fechaGuardada = cargarFechaDesdeStorage();
  
  if (fechaGuardada) {
    fechaSimuladaGlobal = new Date(fechaGuardada);
    sincronizarInputConFecha();
    simActualizar();
  } else {
    simReset();
  }
  
  // Iniciar actualización automática cada minuto
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
  }
  autoUpdateInterval = setInterval(() => {
    // Sincronizar con la hora real del dispositivo
    fechaSimuladaGlobal = obtenerFechaReal();
    sincronizarInputConFecha();
    simActualizar();
  }, 60000); // Cada 60 segundos
}

async function labFetch(api, forceRefresh = false, jugadorId = null) {
  const badge = document.getElementById('lab-badge-' + api.id);
  const btn = document.getElementById('lab-refresh-' + api.id);
  
  if (!forceRefresh && datosCache[api.id]) {
    if (badge) {
      badge.textContent = datosCache[api.id].count + ' reg ✓';
      badge.style.background = '#d4edda';
      badge.style.color = '#155724';
    }
    if (btn) btn.style.opacity = '1';
    const card = document.getElementById('lab-card-' + api.id);
    if (card && !card._data) {
      card._data = datosCache[api.id].data;
      card._api = api;
    }
    return datosCache[api.id].data;
  }
  
  if (badge) { 
    badge.textContent = '⟳'; 
    badge.style.background = '#fff3cd'; 
    badge.style.color = '#856404'; 
  }
  if (btn) btn.style.opacity = '0.5';

  let url;
  if (api.jugFilter) {
    const jugId = jugadorId || document.getElementById('lab-jugador-id')?.value || '1';
    if (api.id === 'fifa_jug_pro_by_player') {
      url = `${BASE_V2}/fifa_jug_pro?api_key=${KEY}&filter[id]=${jugId}&fields=jug,jug.name,id,ptd,pro_gol_loc,pro_gol_vis,pro_res&filterQuery[ptd.cic]=1`;
    } else if (api.id === 'fifa_jug_clf_by_player') {
      url = `${BASE}/fifa_jug?api_key=${KEY}&filter[id]=${jugId}`;
    }
  } else if (api.filtro) {
    const val = document.getElementById('lab-filtro-est') ? document.getElementById('lab-filtro-est').value.trim() || '2' : '2';
    url = BASE + '/fifa_ptd?api_key=' + KEY + '&filter[est]=' + val;
  } else {
    url = BASE + '/' + api.id + '?api_key=' + KEY;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    const key = api.url ? 'fifa_ptd' : api.id;
    const registros = data[key] || data[Object.keys(data).find(k => Array.isArray(data[k]))] || [];
    const count = data.count || registros.length;
    datosCache[api.id] = { data, count, timestamp: Date.now() };
    
    if (badge) { 
      badge.textContent = count + ' reg ✓'; 
      badge.style.background = '#d4edda'; 
      badge.style.color = '#155724'; 
    }
    if (btn) btn.style.opacity = '1';
    const card = document.getElementById('lab-card-' + api.id);
    if (card) {
      card._data = data;
      card._api = api;
    }
    return data;
  } catch (error) {
    console.error('Error fetching', api.id, error);
    if (badge) { 
      badge.textContent = 'Error'; 
      badge.style.background = '#f8d7da'; 
      badge.style.color = '#721c24'; 
    }
    if (btn) btn.style.opacity = '1';
    throw error;
  }
}

export function labConsultar(apiId) {
  const api = LAB_APIS.find(a => a.id === apiId);
  if (api) labFetch(api, true);
}

export function labRefrescarTodo(btnElement) {
  if (refreshInProgress) return;
  refreshInProgress = true;
  const iconSpan = btnElement ? btnElement.querySelector('span:first-child') : null;
  if (iconSpan) {
    if (rotationInterval) clearInterval(rotationInterval);
    let rotation = 0;
    rotationInterval = setInterval(() => {
      rotation = (rotation + 10) % 360;
      iconSpan.style.transform = `rotate(${rotation}deg)`;
      iconSpan.style.display = 'inline-block';
      iconSpan.style.transition = 'transform 0.05s linear';
    }, 20);
    setTimeout(() => {
      if (rotationInterval) clearInterval(rotationInterval);
      if (iconSpan) iconSpan.style.transform = 'rotate(0deg)';
      refreshInProgress = false;
    }, 1500);
  } else {
    setTimeout(() => { refreshInProgress = false; }, 1500);
  }
  LAB_APIS.forEach(api => labFetch(api, true));
}

function labMostrar(api, data) {
  const key = api.url ? 'fifa_ptd' : api.id;
  const registros = data[key] || data[Object.keys(data).find(k => Array.isArray(data[k]))] || [];
  const count = data.count || registros.length;
  const excluir = ['alt_usr', 'alt_tim', 'mod_usr', 'mod_tim', 'off_usr', 'off_tim', 'ban', 'fot'];
  const campos = registros.length > 0 ? Object.keys(registros[0]).filter(k => excluir.indexOf(k) === -1) : [];

  visorState.visible = true;
  visorState.apiId = api.id;
  visorState.data = data;
  visorState.registros = registros;
  visorState.campos = campos;
  visorState.pagina = 0;

  const url = api.url || (BASE + '/' + api.id + '?api_key=' + KEY);
  const tituloEl = document.getElementById('lab-titulo');
  const metaEl = document.getElementById('lab-meta');
  const jsonEl = document.getElementById('lab-json');
  const resultadoEl = document.getElementById('lab-resultado');
  
  if (tituloEl) tituloEl.textContent = api.icon + ' ' + api.label;
  if (metaEl) metaEl.textContent = count + ' registros · ' + url.replace('?api_key=' + KEY, '?api_key=***');
  if (jsonEl) jsonEl.textContent = JSON.stringify(data, null, 2);
  if (resultadoEl) {
      resultadoEl.style.display = 'block';
      setTimeout(() => {
          resultadoEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
  }
  
  labRenderTablaInterna(registros, campos);
}

function labRenderTablaInterna(registros, campos) {
  const tablaEl = document.getElementById('lab-tabla');
  const controlsEl = document.getElementById('lab-paginacion-controls');
  const porPagina = visorState.porPagina;
  const pagina = visorState.pagina;
  const total = registros.length;
  const totalPags = Math.ceil(total / porPagina);
  const inicio = pagina * porPagina;
  const fin = Math.min(inicio + porPagina, total);
  const muestra = registros.slice(inicio, fin);

  if (!tablaEl) return;
  if (total === 0) {
    tablaEl.innerHTML = '<div style="color:#8e8e93;font-size:13px;padding:8px 0;text-align:left;">Sin registros.</div>';
    if (controlsEl) controlsEl.innerHTML = '';
    return;
  }

  let t = '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:8px;"><table style="width:max-content;min-width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>';
  campos.forEach(c => {
    t += '<th style="padding:6px 8px;background:#f2f2f7;color:#3c3c43;font-weight:700;text-align:left;border-bottom:1px solid #e5e5ea;white-space:nowrap;">' + c + '</th>';
  });
  t += '</thead><tbody>';
  muestra.forEach((r, i) => {
    t += '<tr style="background:' + (i % 2 === 0 ? '#fff' : '#f9f9f9') + '">';
    campos.forEach(c => {
      let val = r[c];
      if (val === null || val === undefined) val = '—';
      if (typeof val === 'object') val = JSON.stringify(val).substring(0, 25) + '…';
      if (String(val).length > 28) val = String(val).substring(0, 28) + '…';
      t += '<td style="padding:5px 8px;color:#1c1c1e;border-bottom:0.5px solid #f0f0f0;white-space:nowrap;text-align:left;">' + val + '</td>';
    });
    t += '</td>';
  });
  t += '</tbody></table></div>';
  tablaEl.innerHTML = t;
  
  if (controlsEl) {
    controlsEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:10px 0 4px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:12px;color:#3c3c43;">Mostrar</span>
          <select id="lab-por-pagina" onchange="labCambiarPorPagina(this.value)" style="padding:4px 8px;border:1px solid #e5e5ea;border-radius:8px;font-size:12px;background:#fff;">
            <option value="5" ${porPagina === 5 ? 'selected' : ''}>5</option>
            <option value="10" ${porPagina === 10 ? 'selected' : ''}>10</option>
            <option value="25" ${porPagina === 25 ? 'selected' : ''}>25</option>
            <option value="50" ${porPagina === 50 ? 'selected' : ''}>50</option>
            <option value="100" ${porPagina === 100 ? 'selected' : ''}>100</option>
          </select>
          <span style="font-size:12px;color:#3c3c43;">registros por página</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:12px;color:#3c3c43;">${inicio + 1}–${fin} de ${total} registros</span>
          <div style="display:flex;gap:6px;">
            <button onclick="labPaginar(-1)" ${pagina === 0 ? 'disabled' : ''} style="border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;background:${pagina === 0 ? '#f2f2f7' : '#007aff'};color:${pagina === 0 ? '#c7c7cc' : '#fff'};">← Anterior</button>
            <button onclick="labPaginar(1)" ${pagina >= totalPags - 1 ? 'disabled' : ''} style="border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;background:${pagina >= totalPags - 1 ? '#f2f2f7' : '#007aff'};color:${pagina >= totalPags - 1 ? '#c7c7cc' : '#fff'};">Siguiente →</button>
          </div>
        </div>
      </div>
      <div style="font-size:11px;color:#c7c7cc;text-align:center;padding-top:4px;">Página ${pagina + 1} de ${totalPags}</div>
    `;
  }
}

export function labCambiarPorPagina(valor) {
  visorState.porPagina = parseInt(valor);
  visorState.pagina = 0;
  if (visorState.registros && visorState.campos) labRenderTablaInterna(visorState.registros, visorState.campos);
}

export function labPaginar(dir) {
  if (!visorState.registros) return;
  const totalPags = Math.ceil(visorState.registros.length / visorState.porPagina);
  visorState.pagina = Math.max(0, Math.min(visorState.pagina + dir, totalPags - 1));
  labRenderTablaInterna(visorState.registros, visorState.campos);
}

export function cerrarResultado() {
  const el = document.getElementById('lab-resultado');
  if (el) el.style.display = 'none';
  visorState.visible = false;
  visorState.apiId = null;
  visorState.data = null;
  visorState.registros = null;
  visorState.campos = null;
}

export function renderizarLab(contenedor, datosCuenta) {
  if (!contenedor) return;
  
  window.labPaginar = labPaginar;
  window.labCambiarPorPagina = labCambiarPorPagina;
  window.cerrarResultado = cerrarResultado;
  window.labConsultar = labConsultar;
  window.labRefrescarTodo = labRefrescarTodo;
  window.simActualizar = simActualizar;
  window.simReset = simReset;
  window.simGetFechaStr = simGetFechaStr;
  window.simGetHoraStr = simGetHoraStr;
  window.onSimuladorCambio = onSimuladorCambio;
  window.labMostrar = labMostrar;
  window.LAB_APIS = LAB_APIS;
  
  contenedor.innerHTML = `
    <div style="width:100%; height:100%; background:#fff; border-radius:16px; overflow-y: auto; overflow-x: hidden;">
      <div style="padding:16px;">
        <button id="btn-refrescar-todo" onclick="labRefrescarTodo(this)"
          style="width:100%; background:#1c1c1e; color:#fff; border:none; border-radius:14px; padding:14px 16px; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:10px;">
          <span style="font-size:18px; display:inline-block;">⚙️</span> Actualizar todas las APIs
        </button>
        
        <div style="background:#f2f2f7; border-radius:14px; padding:14px 16px; margin-bottom:10px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
            <span style="font-size:16px;">🕐</span>
            <span style="font-size:13px; font-weight:700; color:#1c1c1e;">Simulador de fecha y hora</span>
            <span style="font-size:11px; color:#8e8e93; margin-left:auto;">Afecta a Partidos y Especiales</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <input type="datetime-local" id="sim-datetime"
              style="flex:1; min-width:180px; padding:8px 12px; border:1.5px solid #e5e5ea; border-radius:10px; font-size:14px; color:#1c1c1e; background:#fff; outline:none;">
            <button id="sim-reset-btn" style="padding:8px 14px; background:#fff; border:1px solid #e5e5ea; border-radius:10px; font-size:12px; font-weight:600; color:#007aff; cursor:pointer;">↺ Ahora</button>
          </div>
          <div id="sim-status" style="margin-top:8px; font-size:11px; color:#8e8e93;"></div>
        </div>
        
        <div id="lab-apis" style="display:flex; flex-direction:column; gap:10px;"></div>
      </div>
      
      <div id="lab-resultado" style="margin:0 16px 20px 16px; display:none; text-align:left;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <div id="lab-titulo" style="font-size:14px; font-weight:700; color:#1c1c1e;"></div>
          <button id="lab-cerrar-resultado" style="background:#f2f2f7; border:none; border-radius:20px; width:28px; height:28px; font-size:16px; color:#8e8e93; cursor:pointer;">✕</button>
        </div>
        <div id="lab-meta" style="font-size:11px; color:#8e8e93; margin-bottom:10px;"></div>
        <div style="font-size:10px; font-weight:700; color:#8e8e93; margin-bottom:6px;">JSON crudo</div>
        <pre id="lab-json" style="background:#1e1e1e; color:#d4d4d4; border-radius:12px; padding:12px; font-size:11px; overflow-x:auto; white-space:pre-wrap; max-height:300px; margin:0 0 14px; text-align:left;"></pre>
        <div style="font-size:10px; font-weight:700; color:#8e8e93; margin-bottom:6px;">Tabla resumen</div>
        <div id="lab-tabla" style="overflow-x:auto; border-radius:8px;"></div>
        <div id="lab-paginacion-controls" style="margin-top:8px;"></div>
      </div>
    </div>
  `;
  
  initSimulador();
  
  const simResetBtn = document.getElementById('sim-reset-btn');
  const simDatetime = document.getElementById('sim-datetime');
  
  if (simResetBtn) simResetBtn.onclick = () => simReset();
  if (simDatetime) simDatetime.onchange = () => simActualizar();
  
  const cerrarBtn = document.getElementById('lab-cerrar-resultado');
  if (cerrarBtn) cerrarBtn.onclick = () => cerrarResultado();
  
  const container = document.getElementById('lab-apis');
  if (container) {
    container.innerHTML = '';
    LAB_APIS.forEach(api => {
      const card = document.createElement('div');
      card.id = 'lab-card-' + api.id;
      card.style.cssText = 'display:flex; align-items:center; gap:12px; background:#f9f9fb; border:1px solid #e5e5ea; border-radius:14px; padding:14px; transition:all 0.2s; cursor:pointer;';
      
      let extraContent = '';
      if (api.jugFilter) {
        extraContent = `
          <div style="margin-top:8px; display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; color:#8e8e93;">ID Jugador:</span>
            <input type="number" id="lab-jugador-id" value="1" style="width:60px; padding:4px 8px; border:1px solid #e5e5ea; border-radius:8px; font-size:12px;" onclick="event.stopPropagation()">
            <button id="lab-jugador-consultar-${api.id}" style="padding:4px 12px; background:#007aff; color:#fff; border:none; border-radius:8px; font-size:11px; cursor:pointer;" onclick="event.stopPropagation(); labConsultar('${api.id}')">Consultar</button>
          </div>
        `;
      }
      
      const cached = datosCache[api.id];
      const badgeText = cached ? cached.count + ' reg ✓' : '...';
      const badgeBg = cached ? '#d4edda' : '#f2f2f7';
      const badgeColor = cached ? '#155724' : '#8e8e93';
      
      card.innerHTML = `
        <div style="width:40px; height:40px; border-radius:10px; background:${api.color}22; display:flex; align-items:center; justify-content:center; font-size:20px;">${api.icon}</div>
        <div style="flex:1;">
          <div style="font-size:14px; font-weight:700; color:#1c1c1e;">${api.label}</div>
          <div style="font-size:11px; color:#8e8e93;">${api.desc}</div>
          ${extraContent}
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <div id="lab-badge-${api.id}" style="font-size:10px; font-weight:600; padding:3px 8px; border-radius:6px; background:${badgeBg}; color:${badgeColor};">${badgeText}</div>
          <button id="lab-refresh-${api.id}" onclick="event.stopPropagation(); labConsultar('${api.id}')" style="background:${api.color}; color:#fff; border:none; border-radius:10px; width:32px; height:32px; font-size:16px; cursor:pointer;">↻</button>
        </div>
      `;
      if (cached) { card._data = cached.data; card._api = api; }
      
      if (api.jugFilter) {
        const consultarBtn = card.querySelector(`#lab-jugador-consultar-${api.id}`);
        if (consultarBtn) {
          consultarBtn.onclick = async (e) => {
            e.stopPropagation();
            const jugId = document.getElementById('lab-jugador-id')?.value || '1';
            const data = await labFetch(api, true, jugId);
            if (data) labMostrar(api, data);
          };
        }
      }
      
      card.onclick = async (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        if (card._data) labMostrar(api, card._data);
        else { 
          let jugId = null;
          if (api.jugFilter) {
            jugId = document.getElementById('lab-jugador-id')?.value || '1';
          }
          const data = await labFetch(api, true, jugId);
          if (data) labMostrar(api, data);
        }
      };
      container.appendChild(card);
    });
    
    const card2 = document.getElementById('lab-card-fifa_ptd_est2');
    if (card2) {
      const descEl = card2.querySelector('div > div:last-child');
      if (descEl) {
        descEl.innerHTML = '<div style="display:flex; align-items:center; gap:6px; margin-top:4px;"><span style="font-size:11px; color:#8e8e93;">est=</span><input id="lab-filtro-est" type="number" value="2" min="0" max="9" style="width:44px; padding:3px 6px; border:1px solid #e5e5ea; border-radius:6px; font-size:12px; color:#1c1c1e; background:#fff; text-align:center;" onclick="event.stopPropagation()" /><span style="font-size:11px; color:#8e8e93;">· toca ↻ para consultar</span></div>';
      }
    }
  }
  
  LAB_APIS.forEach(api => { if (!datosCache[api.id]) labFetch(api, false); });
  if (visorState.visible && visorState.apiId && visorState.data) {
    const api = LAB_APIS.find(a => a.id === visorState.apiId);
    if (api) setTimeout(() => labMostrar(api, visorState.data), 100);
  }
}