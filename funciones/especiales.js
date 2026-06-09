// funciones/especiales.js
// Módulo de Apuestas Especiales - VERSIÓN FINAL CORREGIDA
// - SOLO dos pestañas: CICLO 1 y CICLO 2
// - Botones de guardar integrados dentro de cada ciclo (2 líneas: 💾 Guardar / Ciclo X)
// - CORREGIDO: CICLO 1 ya NO envía finalistas como 0 (NO sobrescribe)
// - CORREGIDO: CICLO 2 ya NO envía grupos como 0 (NO sobrescribe)
// - En CICLO 1: guarda solo grupos, respeta finalistas existentes en Velneo
// - En CICLO 2: guarda solo finalistas, respeta grupos existentes en Velneo

import { onSimuladorCambio, simGetFechaStr, simGetHoraStr } from './lab.js';
import { getBandera, getNombreVisual } from './banderas.js';
import { 
  cargarPronosticosEspecialesLocal, 
  guardarPronosticosEspecialesLocal,
  guardarEquiposCacheLocal,
  cargarEquiposCacheLocal,
  guardarGruposEquiposLocal,
  cargarGruposEquiposLocal
} from './sync.js';

// Configuración de APIs
const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
const BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

// FECHAS CLAVE DEL MUNDIAL 2026
const FECHA_INAUGURAL = '2026-06-11';
const HORA_INAUGURAL_LIMITE = '14:55';
const FECHA_INICIO_16AVOS = '2026-06-28';

// Lista de grupos
const GRUPOS_LISTA = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// Estado interno
let GRUPOS_EQUIPOS = {};
let equiposCache = [];

// Estado de selecciones del usuario
export let gruposSeleccion = {};
export let finalistasSeleccion = {
  campeon: null,
  subcampeon: null,
  tercero: null,
  cuarto: null
};

let grupoActivo = 'A';
let tabActivo = 'ciclo1';
let datosGuardados = false;
let openDropdownId = null;
let simuladorSuscrito = false;
let currentJugadorId = null;

// Estado de ventanas
let estadoVentanas = {
  ciclo1Bloqueado: false,
  ciclo2Pulso: 100,
  ciclo2Bloqueado: false,
  fechaActual: null,
  horaActual: null
};

// ─────────────────────────────────────────────────────────────
// 1. FUNCIONES AUXILIARES
// ─────────────────────────────────────────────────────────────

function getEquipoIdPorNombre(nombre) {
  if (!nombre) return null;
  const equipo = equiposCache.find(e => e.name === nombre);
  return equipo ? equipo.id : null;
}

async function cargarEquiposDesdeAPI() {
  const equiposLocal = cargarEquiposCacheLocal();
  const gruposLocal = cargarGruposEquiposLocal();
  
  if (equiposLocal && gruposLocal && equiposLocal.length > 0) {
    equiposCache = equiposLocal;
    GRUPOS_EQUIPOS = gruposLocal;
    console.log('[Especiales] Equipos cargados desde localStorage');
    return true;
  }
  
  try {
    const response = await fetch(`${BASE}/fifa_equ?api_key=${KEY}&_=${Date.now()}`);
    const data = await response.json();
    equiposCache = data.fifa_equ || [];
    
    const gruposTemp = {};
    GRUPOS_LISTA.forEach(grupo => { gruposTemp[grupo] = []; });
    
    equiposCache.forEach(equipo => {
      const grupo = equipo.grp;
      if (grupo && gruposTemp[grupo]) {
        gruposTemp[grupo].push(equipo.name);
      }
    });
    
    GRUPOS_LISTA.forEach(grupo => { gruposTemp[grupo].sort(); });
    GRUPOS_EQUIPOS = gruposTemp;
    
    guardarEquiposCacheLocal(equiposCache);
    guardarGruposEquiposLocal(GRUPOS_EQUIPOS);
    
    console.log('[Especiales] Equipos cargados desde API');
    return true;
  } catch (error) {
    console.error('[Especiales] Error cargando equipos:', error);
    return false;
  }
}

function actualizarLocalStorage() {
  const dataToSave = {
    grupos: gruposSeleccion,
    finalistas: finalistasSeleccion
  };
  guardarPronosticosEspecialesLocal(dataToSave);
}

async function cargarPronosticosDesdeAPI(jugadorId) {
  if (!jugadorId) return;
  
  const locales = cargarPronosticosEspecialesLocal();
  if (locales.grupos && Object.keys(locales.grupos).length > 0) {
    gruposSeleccion = locales.grupos;
    finalistasSeleccion = locales.finalistas;
    console.log('[Especiales] Pronósticos cargados desde localStorage');
    return;
  }
  
  try {
    if (equiposCache.length === 0) {
      await cargarEquiposDesdeAPI();
    }
    
    const response = await fetch(`${BASE}/fifa_jug?api_key=${KEY}&filter[id]=${jugadorId}&_=${Date.now()}`);
    const data = await response.json();
    const jugador = data.fifa_jug?.[0];
    
    if (jugador) {
      GRUPOS_LISTA.forEach(grupo => {
        const clf1Id = jugador[`grp_${grupo.toLowerCase()}_clf1`];
        const clf2Id = jugador[`grp_${grupo.toLowerCase()}_clf2`];
        
        if (clf1Id && clf1Id !== 0) {
          const equipo = equiposCache.find(e => e.id === clf1Id);
          if (equipo) {
            if (!gruposSeleccion[grupo]) gruposSeleccion[grupo] = {};
            gruposSeleccion[grupo][1] = equipo.name;
          }
        }
        if (clf2Id && clf2Id !== 0) {
          const equipo = equiposCache.find(e => e.id === clf2Id);
          if (equipo) {
            if (!gruposSeleccion[grupo]) gruposSeleccion[grupo] = {};
            gruposSeleccion[grupo][2] = equipo.name;
          }
        }
      });
      
      if (jugador.cam && jugador.cam !== 0) {
        const equipo = equiposCache.find(e => e.id === jugador.cam);
        if (equipo) finalistasSeleccion.campeon = equipo.name;
      }
      if (jugador.sub && jugador.sub !== 0) {
        const equipo = equiposCache.find(e => e.id === jugador.sub);
        if (equipo) finalistasSeleccion.subcampeon = equipo.name;
      }
      if (jugador.ter && jugador.ter !== 0) {
        const equipo = equiposCache.find(e => e.id === jugador.ter);
        if (equipo) finalistasSeleccion.tercero = equipo.name;
      }
      if (jugador.cua && jugador.cua !== 0) {
        const equipo = equiposCache.find(e => e.id === jugador.cua);
        if (equipo) finalistasSeleccion.cuarto = equipo.name;
      }
      
      actualizarLocalStorage();
      console.log('[Especiales] Pronósticos cargados desde API');
    }
  } catch (error) {
    console.error('[Especiales] Error cargando pronósticos:', error);
  }
}

function getPtsGrupo(grupo) {
  const sel = gruposSeleccion[grupo] || {};
  if (!sel[1] || !sel[2]) return 0;
  
  const equiposGrupo = GRUPOS_EQUIPOS[grupo] || [];
  if (equiposGrupo.length < 2) return 0;
  
  if (sel[1] === equiposGrupo[0] && sel[2] === equiposGrupo[1]) return 60;
  if (sel[1] === equiposGrupo[1] && sel[2] === equiposGrupo[0]) return 30;
  return 0;
}

function getTotalPtsGrupos() {
  let total = 0;
  GRUPOS_LISTA.forEach(g => { total += getPtsGrupo(g); });
  return total;
}

function getPtsFinalistas() {
  let total = 0;
  const multiplicador = estadoVentanas.ciclo2Pulso === 100 ? 1 : 0.5;
  
  if (finalistasSeleccion.campeon) total += 720 * multiplicador;
  if (finalistasSeleccion.subcampeon) total += 360 * multiplicador;
  if (finalistasSeleccion.tercero) total += 180 * multiplicador;
  if (finalistasSeleccion.cuarto) total += 90 * multiplicador;
  return total;
}

function getTotalPts() {
  return getTotalPtsGrupos() + getPtsFinalistas();
}

function cerrarTodosDropdowns() {
  document.querySelectorAll('.esp-dropdown-menu').forEach(menu => {
    menu.classList.remove('open');
  });
  openDropdownId = null;
}

function mostrarToast(msg, tipo) {
  const toast = document.getElementById('app-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'toast ' + (tipo || '');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function actualizarEstadoVentanas() {
  const fechaSim = simGetFechaStr();
  const horaSim = simGetHoraStr();
  
  estadoVentanas.fechaActual = fechaSim;
  estadoVentanas.horaActual = horaSim;
  
  let ciclo1Bloqueado = false;
  if (fechaSim > FECHA_INAUGURAL) {
    ciclo1Bloqueado = true;
  } else if (fechaSim === FECHA_INAUGURAL) {
    if (horaSim >= '14:55') ciclo1Bloqueado = true;
  }
  estadoVentanas.ciclo1Bloqueado = ciclo1Bloqueado;
  
  let ciclo2Pulso = 100;
  let ciclo2Bloqueado = false;
  
  if (fechaSim > FECHA_INICIO_16AVOS) {
    ciclo2Bloqueado = true;
  } else if (fechaSim === FECHA_INICIO_16AVOS) {
    if (horaSim >= '14:00') {
      ciclo2Bloqueado = true;
    } else {
      ciclo2Pulso = 50;
    }
  } else if (fechaSim > FECHA_INAUGURAL) {
    ciclo2Pulso = 50;
  } else if (fechaSim === FECHA_INAUGURAL) {
    if (horaSim >= '15:00') ciclo2Pulso = 50;
  }
  
  estadoVentanas.ciclo2Pulso = ciclo2Pulso;
  estadoVentanas.ciclo2Bloqueado = ciclo2Bloqueado;
  
  console.log('[Especiales] Ventanas actualizadas');
}

function getBadgePulsoHTML() {
  const pulso = estadoVentanas.ciclo2Pulso;
  const bloqueado = estadoVentanas.ciclo2Bloqueado;
  
  if (bloqueado) {
    return '<div class="esp-bloqueo-aviso" style="background:#fff2f2; border-color:#ffd0d0; color:#c0392b;">🔒 PRONÓSTICOS CERRADOS</div>';
  } else if (pulso === 50) {
    return '<div class="esp-pulso-badge pulso-50" style="background:#fff9ec; border:1px solid #ffd080; color:#c05a00;">🟡 PULSO 50 · Puntos reducidos a la mitad</div>';
  } else {
    return '<div class="esp-pulso-badge pulso-100" style="background:#eafaf1; border:1px solid #a9dfbf; color:#1e8449;">🟢 PULSO 100 · Puntos completos</div>';
  }
}

// ─────────────────────────────────────────────────────────────
// 2. RENDERIZADO DE RESUMENES PARA MODALES
// ─────────────────────────────────────────────────────────────

function renderResumenGruposParaModal() {
  let html = '<div style="max-height:300px; overflow-y:auto;">';
  GRUPOS_LISTA.forEach(grupo => {
    const sel = gruposSeleccion[grupo] || {};
    const primero = sel[1] ? `${getBandera(sel[1])} ${sel[1]}` : '<span style="color:#ff3b30;">❌ Pendiente</span>';
    const segundo = sel[2] ? `${getBandera(sel[2])} ${sel[2]}` : '<span style="color:#ff3b30;">❌ Pendiente</span>';
    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:0.5px solid #e5e5ea; font-size:12px;">
        <span style="font-weight:700; width:36px; font-size:11px;">${grupo}</span>
        <span style="flex:1; font-size:12px;">🥇 ${primero}</span>
        <span style="flex:1; font-size:12px;">🥈 ${segundo}</span>
      </div>
    `;
  });
  html += '</div>';
  return html;
}

function renderResumenFinalistasParaModal() {
  return `
    <div style="padding:4px 0;">
      <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:0.5px solid #e5e5ea;">
        <span style="font-weight:700;">🏆 Campeón:</span>
        <span>${finalistasSeleccion.campeon ? getBandera(finalistasSeleccion.campeon) + ' ' + finalistasSeleccion.campeon : '<span style="color:#ff3b30;">❌ Pendiente</span>'}</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:0.5px solid #e5e5ea;">
        <span style="font-weight:700;">🥈 Subcampeón:</span>
        <span>${finalistasSeleccion.subcampeon ? getBandera(finalistasSeleccion.subcampeon) + ' ' + finalistasSeleccion.subcampeon : '<span style="color:#ff3b30;">❌ Pendiente</span>'}</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:0.5px solid #e5e5ea;">
        <span style="font-weight:700;">🥉 Tercero:</span>
        <span>${finalistasSeleccion.tercero ? getBandera(finalistasSeleccion.tercero) + ' ' + finalistasSeleccion.tercero : '<span style="color:#ff3b30;">❌ Pendiente</span>'}</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding:8px 0;">
        <span style="font-weight:700;">4️⃣ Cuarto:</span>
        <span>${finalistasSeleccion.cuarto ? getBandera(finalistasSeleccion.cuarto) + ' ' + finalistasSeleccion.cuarto : '<span style="color:#ff3b30;">❌ Pendiente</span>'}</span>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// 3. MODALES DE CONFIRMACION
// ─────────────────────────────────────────────────────────────

// MODAL CICLO 1: SOLO GRUPOS
function mostrarModalConfirmacionCiclo1(callback) {
  const gruposCompletados = Object.keys(gruposSeleccion).filter(g => {
    const sel = gruposSeleccion[g];
    return sel && sel[1] && sel[2];
  }).length;
  
  const modal = document.createElement('div');
  modal.id = 'esp-modal-confirmacion';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 20000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 24px; max-width: 550px; width: 90%; max-height: 85%; overflow: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
      <div style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #007aff; padding-bottom: 12px;">
          <h3 style="margin: 0; color: #1c1c1e; font-size: 16px;">🏆 Clasificados por Grupo</h3>
          <button id="esp-modal-cerrar" style="background: none; border: none; font-size: 22px; cursor: pointer; color: #8e8e93;">✕</button>
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="background:#e8f3ff; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600;">${gruposCompletados}/12 grupos</span>
          </div>
          <div style="background: #f9f9fb; border-radius: 12px; padding: 8px;">
            ${renderResumenGruposParaModal()}
          </div>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 8px;">
          <button id="esp-modal-confirmar" style="flex:1; background: #34c759; color: white; border: none; border-radius: 14px; padding: 12px; font-size: 14px; font-weight: 700; cursor: pointer;">✅ Confirmar y Guardar</button>
          <button id="esp-modal-cancelar" style="flex:1; background: #f2f2f7; color: #8e8e93; border: none; border-radius: 14px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer;">✕ Cancelar</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const cerrar = () => modal.remove();
  
  document.getElementById('esp-modal-cerrar')?.addEventListener('click', cerrar);
  document.getElementById('esp-modal-cancelar')?.addEventListener('click', cerrar);
  document.getElementById('esp-modal-confirmar')?.addEventListener('click', () => {
    cerrar();
    if (callback) callback();
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
}

// MODAL CICLO 2: SOLO FINALISTAS
function mostrarModalConfirmacionCiclo2(callback) {
  const finalistasCompletados = Object.values(finalistasSeleccion).filter(v => v !== null).length;
  
  const modal = document.createElement('div');
  modal.id = 'esp-modal-confirmacion';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 20000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 24px; max-width: 480px; width: 90%; max-height: 85%; overflow: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
      <div style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #af52de; padding-bottom: 12px;">
          <h3 style="margin: 0; color: #1c1c1e; font-size: 16px;">👑 Finalistas</h3>
          <button id="esp-modal-cerrar" style="background: none; border: none; font-size: 22px; cursor: pointer; color: #8e8e93;">✕</button>
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="background:#f3e8ff; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600;">${finalistasCompletados}/4 seleccionados</span>
          </div>
          <div style="background: #f9f9fb; border-radius: 12px; padding: 12px;">
            ${renderResumenFinalistasParaModal()}
          </div>
        </div>
        
        <div style="display: flex; gap: 12px; margin-top: 8px;">
          <button id="esp-modal-confirmar" style="flex:1; background: #34c759; color: white; border: none; border-radius: 14px; padding: 12px; font-size: 14px; font-weight: 700; cursor: pointer;">✅ Confirmar y Guardar</button>
          <button id="esp-modal-cancelar" style="flex:1; background: #f2f2f7; color: #8e8e93; border: none; border-radius: 14px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer;">✕ Cancelar</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const cerrar = () => modal.remove();
  
  document.getElementById('esp-modal-cerrar')?.addEventListener('click', cerrar);
  document.getElementById('esp-modal-cancelar')?.addEventListener('click', cerrar);
  document.getElementById('esp-modal-confirmar')?.addEventListener('click', () => {
    cerrar();
    if (callback) callback();
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
}

// ─────────────────────────────────────────────────────────────
// 4. VALIDACIONES
// ─────────────────────────────────────────────────────────────

function validarSeleccionGrupo(grupo, pos, valor) {
  const sel = gruposSeleccion[grupo] || {};
  const otraPos = pos === 1 ? 2 : 1;
  if (sel[otraPos] === valor) {
    mostrarToast(`⚠️ No puedes seleccionar el mismo equipo como 1° y 2° clasificado en el Grupo ${grupo}`, 'err');
    return false;
  }
  return true;
}

function validarSeleccionFinalista(key, valor) {
  for (const [k, v] of Object.entries(finalistasSeleccion)) {
    if (k !== key && v === valor) {
      const nombres = { campeon: 'Campeón', subcampeon: 'Subcampeón', tercero: 'Tercer puesto', cuarto: 'Cuarto puesto' };
      mostrarToast(`⚠️ ${valor} ya fue seleccionado como ${nombres[k]}`, 'err');
      return false;
    }
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// 5. RENDERIZADO DE SELECCIONADORES
// ─────────────────────────────────────────────────────────────

function renderGrupoSelector(grupo) {
  const sel = gruposSeleccion[grupo] || {};
  const equipos = GRUPOS_EQUIPOS[grupo] || [];
  
  if (equipos.length === 0) {
    return `<div class="esp-grupo-panel">Cargando equipos del grupo ${grupo}...</div>`;
  }
  
  return `
    <div class="esp-grupo-panel" data-grupo="${grupo}">
      <div class="esp-grupo-header">
        <span class="esp-grupo-titulo">📋 Grupo ${grupo}</span>
      </div>
      
      <div class="esp-equipos-lista">
        ${equipos.map(eq => `
          <div class="esp-equipo-item">
            <div class="esp-bandera">${getBandera(eq)}</div>
            <div class="esp-nombre">${getNombreVisual(eq)}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="esp-posicion-row">
        <div class="esp-posicion-label">1°</div>
        <div class="esp-selector" data-grupo="${grupo}" data-pos="1">
          <button class="esp-selector-btn ${sel[1] ? 'has-value' : ''}" id="esp-btn-${grupo}-1">
            <span class="esp-selector-value" id="esp-val-${grupo}-1">${sel[1] ? getBandera(sel[1]) + ' ' + getNombreVisual(sel[1]) : '<span style="color:#8e8e93;">Seleccionar 1° clasificado...</span>'}</span>
            <span class="esp-selector-arrow">▼</span>
          </button>
          <div class="esp-dropdown-menu" id="esp-drop-${grupo}-1">
            ${equipos.map(eq => `<div class="esp-dropdown-item ${sel[1] === eq ? 'selected' : ''}" data-value="${eq}" data-grupo="${grupo}" data-pos="1">${getBandera(eq)} ${getNombreVisual(eq)}</div>`).join('')}
          </div>
        </div>
      </div>
      
      <div class="esp-posicion-row">
        <div class="esp-posicion-label">2°</div>
        <div class="esp-selector" data-grupo="${grupo}" data-pos="2">
          <button class="esp-selector-btn ${sel[2] ? 'has-value' : ''}" id="esp-btn-${grupo}-2">
            <span class="esp-selector-value" id="esp-val-${grupo}-2">${sel[2] ? getBandera(sel[2]) + ' ' + getNombreVisual(sel[2]) : '<span style="color:#8e8e93;">Seleccionar 2° clasificado...</span>'}</span>
            <span class="esp-selector-arrow">▼</span>
          </button>
          <div class="esp-dropdown-menu" id="esp-drop-${grupo}-2">
            ${equipos.map(eq => `<div class="esp-dropdown-item ${sel[2] === eq ? 'selected' : ''}" data-value="${eq}" data-grupo="${grupo}" data-pos="2">${getBandera(eq)} ${getNombreVisual(eq)}</div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFinalistaSelector(titulo, key, pts, icon) {
  const valor = finalistasSeleccion[key];
  const equipos = equiposCache.filter(e => e.name !== 'Playoff UEFA').map(e => e.name);
  
  return `
    <div class="esp-finalista-card">
      <div class="esp-finalista-header">
        <span class="esp-finalista-titulo">${icon} ${titulo}</span>
        <span class="esp-finalista-pts">${pts} pts</span>
      </div>
      
      <div class="esp-selector" data-finalista="${key}">
        <button class="esp-selector-btn ${valor ? 'has-value' : ''}" id="esp-btn-final-${key}">
          <span class="esp-selector-value" id="esp-val-final-${key}">
            ${valor ? getBandera(valor) + ' ' + getNombreVisual(valor) : '<span style="color:#8e8e93;">Seleccionar equipo...</span>'}
          </span>
          <span class="esp-selector-arrow">▼</span>
        </button>
        <div class="esp-dropdown-menu" id="esp-drop-final-${key}">
          ${equipos.map(eq => {
            const isUsed = Object.entries(finalistasSeleccion).some(([k, v]) => k !== key && v === eq);
            const isCurrent = valor === eq;
            return `<div class="esp-dropdown-item ${isCurrent ? 'selected' : ''} ${isUsed ? 'used' : ''}" data-value="${eq}" data-finalista="${key}" style="${isUsed && !isCurrent ? 'opacity:0.5;cursor:not-allowed;' : ''}">${getBandera(eq)} ${getNombreVisual(eq)} ${isUsed && !isCurrent ? '⚠️ ya seleccionado' : ''}</div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// 6. RENDERIZADO DE CONTENIDO DE CADA TAB
// ─────────────────────────────────────────────────────────────

function renderCiclo1Content() {
  function calcularTiempoRestanteCiclo1() {
    const fechaActual = new Date();
    const fechaCierre = new Date(2026, 5, 11, 14, 0, 0);
    const diffMs = fechaCierre - fechaActual;
    
    if (diffMs <= 0) return 'CERRADO';
    
    const diffSegundos = Math.floor(diffMs / 1000);
    const dias = Math.floor(diffSegundos / 86400);
    const horas = Math.floor((diffSegundos % 86400) / 3600);
    const minutos = Math.floor((diffSegundos % 3600) / 60);
    
    const partes = [];
    if (dias > 0) partes.push(`${dias}d`);
    if (horas > 0) partes.push(`${horas}h`);
    if (minutos > 0) partes.push(`${minutos}m`);
    
    if (partes.length === 0) return '<1m';
    return partes.join(' ');
  }
  
  const tiempoRestante = calcularTiempoRestanteCiclo1();
  
  return `
    <div>
      <div style="background: #f2f2f7; border-radius: 16px; padding: 12px 16px; margin-bottom: 12px;">
        <strong style="display:block; margin-bottom:4px; font-size:16px; color:#8B0000;">LOS DOS MEJORES DE CADA GRUPO</strong>
        <div style="margin-bottom:12px;">
          <span style="background:rgba(255,255,255,0.8); border-radius:20px; padding:4px 12px; font-size:11px; font-weight:600; color:#ff9500;">⏱️ Faltan ${tiempoRestante} para seleccionar las parejas</span>
        </div>
        
        <!-- TABLA 2 COLUMNAS: PUNTOS + BOTÓN GUARDAR -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
          <div style="flex: 1; text-align: left;">
            <div>• Si acierta en el orden: <span style="background:#ffcc00; color:#1c1c1e; padding:2px 8px; border-radius:12px; font-weight:700;">60 pts</span></div>
            <div style="margin-top: 4px;">• En desorden: <span style="background:#ffcc00; color:#1c1c1e; padding:2px 8px; border-radius:12px; font-weight:700;">30 pts</span></div>
          </div>
          <div>
            <button id="btn-guardar-ciclo1" style="background: #34c759; color: white; border: none; border-radius: 14px; padding: 8px 16px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; flex-direction: column; align-items: center; line-height: 1.3;">
  <span>💾 Guardar</span>
  <span>Ciclo 1</span>
</button>
          </div>
        </div>
      </div>
      
      <div class="esp-seccion-titulo"><span>📋</span> Selecciona un grupo</div>
      <div class="esp-grupos-tabs" id="esp-grupos-tabs">
        ${GRUPOS_LISTA.map(g => {
          let label = g;
          if (g === 'K') label = 'K🇨🇴';
          return `<button class="esp-grupo-tab ${grupoActivo === g ? 'active' : ''}" data-grupo="${g}">${label}</button>`;
        }).join('')}
      </div>
      <div id="esp-grupo-panel">${GRUPOS_EQUIPOS[grupoActivo] ? renderGrupoSelector(grupoActivo) : '<div class="esp-grupo-panel">Cargando...</div>'}</div>
    </div>
  `;
}

function renderCiclo2Content() {
  return `
    <div>
      <div style="background: #f2f2f7; border-radius: 16px; padding: 12px 16px; margin-bottom: 12px;">
        <strong style="display:block; margin-bottom:4px; font-size:16px; color:#8B0000;">LOS CUATRO FINALISTAS</strong>
        <div id="pulso-inline" style="margin-bottom:8px;">${getBadgePulsoHTML()}</div>
        
        <!-- TABLA 2 COLUMNAS: PUNTOS + BOTÓN GUARDAR -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
          <div style="flex: 1; text-align: left;">
            <div>• Campeón: <strong>720 pts</strong></div>
            <div>• Subcampeón: <strong>360 pts</strong></div>
            <div>• Tercer puesto: <strong>180 pts</strong></div>
            <div>• Cuarto puesto: <strong>90 pts</strong></div>
          </div>
          <div>
            <button id="btn-guardar-ciclo2" style="background: #34c759; color: white; border: none; border-radius: 14px; padding: 8px 16px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; flex-direction: column; align-items: center; line-height: 1.3;">
  <span>💾 Guardar</span>
  <span>Ciclo 2</span>
</button>
          </div>
        </div>
      </div>
      
      <div id="esp-finalistas-container">
        ${renderFinalistaSelector('🥇 Campeón', 'campeon', '720', '🏆')}
        ${renderFinalistaSelector('🥈 Subcampeón', 'subcampeon', '360', '🥈')}
        ${renderFinalistaSelector('🥉 Tercer puesto', 'tercero', '180', '🥉')}
        ${renderFinalistaSelector('4° Cuarto puesto', 'cuarto', '90', '4️⃣')}
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// 7. FUNCIÓN PARA INICIALIZAR LOS TABS DE GRUPOS
// ─────────────────────────────────────────────────────────────

function inicializarGruposTabs() {
  const tabs = document.querySelectorAll('.esp-grupo-tab');
  console.log('[Especiales] Inicializando grupos tabs, encontrados:', tabs.length);
  
  tabs.forEach(tab => {
    const newTab = tab.cloneNode(true);
    tab.parentNode.replaceChild(newTab, tab);
    
    newTab.onclick = () => {
      document.querySelectorAll('.esp-grupo-tab').forEach(t => t.classList.remove('active'));
      newTab.classList.add('active');
      grupoActivo = newTab.dataset.grupo;
      console.log('[Especiales] Grupo seleccionado:', grupoActivo);
      
      const panel = document.getElementById('esp-grupo-panel');
      if (panel && GRUPOS_EQUIPOS[grupoActivo]) {
        panel.innerHTML = renderGrupoSelector(grupoActivo);
        setTimeout(() => setupEventListeners(), 50);
      }
    };
  });
}

// ─────────────────────────────────────────────────────────────
// 8. MANEJADORES DE EVENTOS
// ─────────────────────────────────────────────────────────────

function cambiarTab(tabId) {
  tabActivo = tabId;
  
  document.querySelectorAll('.esp-tab').forEach(tab => {
    if (tab.dataset.tab === tabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  const zona3Content = document.getElementById('esp-zona3-contenido');
  if (!zona3Content) return;
  
  if (tabId === 'ciclo1') {
    zona3Content.innerHTML = renderCiclo1Content();
    setTimeout(() => inicializarGruposTabs(), 50);
  } else if (tabId === 'ciclo2') {
    zona3Content.innerHTML = renderCiclo2Content();
  }
  
  setTimeout(() => setupEventListeners(), 100);
}

function seleccionarEquipoGrupo(grupo, pos, valor) {
  if (!validarSeleccionGrupo(grupo, pos, valor)) return;
  
  if (!gruposSeleccion[grupo]) gruposSeleccion[grupo] = {};
  gruposSeleccion[grupo][pos] = valor;
  
  const valSpan = document.getElementById(`esp-val-${grupo}-${pos}`);
  const btnEl = document.getElementById(`esp-btn-${grupo}-${pos}`);
  if (valSpan) valSpan.innerHTML = getBandera(valor) + ' ' + getNombreVisual(valor);
  if (btnEl) btnEl.classList.add('has-value');
  
  actualizarLocalStorage();
}

function seleccionarFinalista(key, valor) {
  if (!validarSeleccionFinalista(key, valor)) return;
  
  finalistasSeleccion[key] = valor;
  
  const valSpan = document.getElementById(`esp-val-final-${key}`);
  const btnEl = document.getElementById(`esp-btn-final-${key}`);
  if (valSpan) valSpan.innerHTML = getBandera(valor) + ' ' + getNombreVisual(valor);
  if (btnEl) btnEl.classList.add('has-value');
  
  actualizarLocalStorage();
  
  if (tabActivo === 'ciclo2') {
    const zona3Content = document.getElementById('esp-zona3-contenido');
    if (zona3Content) {
      zona3Content.innerHTML = renderCiclo2Content();
      setTimeout(() => setupEventListeners(), 50);
    }
  }
}

function refrescarEspecialesPorFecha() {
  console.log('[Especiales] Refrescando por fecha...');
  actualizarEstadoVentanas();
  
  if (tabActivo === 'ciclo1') {
    const zona3Content = document.getElementById('esp-zona3-contenido');
    if (zona3Content) {
      zona3Content.innerHTML = renderCiclo1Content();
      setTimeout(() => inicializarGruposTabs(), 100);
      setTimeout(() => setupEventListeners(), 100);
    }
  } else if (tabActivo === 'ciclo2') {
    const zona3Content = document.getElementById('esp-zona3-contenido');
    if (zona3Content) {
      zona3Content.innerHTML = renderCiclo2Content();
      setTimeout(() => setupEventListeners(), 50);
    }
  }
}

function setupEventListeners() {
  console.log('[Especiales] Configurando event listeners...');
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.esp-selector')) {
      cerrarTodosDropdowns();
    }
  });
  
  // Selectores de grupos
  document.querySelectorAll('.esp-selector[data-grupo]').forEach(selector => {
    const btn = selector.querySelector('.esp-selector-btn');
    const dropdown = selector.querySelector('.esp-dropdown-menu');
    const grupo = selector.dataset.grupo;
    const pos = parseInt(selector.dataset.pos);
    
    if (btn && dropdown) {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      newBtn.onclick = (e) => {
        e.stopPropagation();
        cerrarTodosDropdowns();
        dropdown.classList.add('open');
        console.log(`[Especiales] Abriendo dropdown Grupo ${grupo} Posición ${pos}`);
      };
      
      dropdown.querySelectorAll('.esp-dropdown-item').forEach(item => {
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        newItem.onclick = (e) => {
          e.stopPropagation();
          const valor = newItem.dataset.value;
          console.log(`[Especiales] Seleccionado: Grupo ${grupo} Pos ${pos} = ${valor}`);
          seleccionarEquipoGrupo(grupo, pos, valor);
          cerrarTodosDropdowns();
        };
      });
    }
  });
  
  // Selectores de finalistas
  document.querySelectorAll('.esp-selector[data-finalista]').forEach(selector => {
    const btn = selector.querySelector('.esp-selector-btn');
    const dropdown = selector.querySelector('.esp-dropdown-menu');
    const finalistaKey = selector.dataset.finalista;
    
    if (btn && dropdown) {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      newBtn.onclick = (e) => {
        e.stopPropagation();
        cerrarTodosDropdowns();
        dropdown.classList.add('open');
        console.log(`[Especiales] Abriendo dropdown Finalista: ${finalistaKey}`);
      };
      
      dropdown.querySelectorAll('.esp-dropdown-item').forEach(item => {
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        newItem.onclick = (e) => {
          e.stopPropagation();
          const valor = newItem.dataset.value;
          if (!newItem.classList.contains('used') || newItem.classList.contains('selected')) {
            console.log(`[Especiales] Seleccionado Finalista: ${finalistaKey} = ${valor}`);
            seleccionarFinalista(finalistaKey, valor);
            cerrarTodosDropdowns();
          }
        };
      });
    }
  });
  
  // ========== BOTÓN GUARDAR CICLO 1 ==========
  const btnGuardarCiclo1 = document.getElementById('btn-guardar-ciclo1');
  if (btnGuardarCiclo1) {
    const newBtn = btnGuardarCiclo1.cloneNode(true);
    btnGuardarCiclo1.parentNode.replaceChild(newBtn, btnGuardarCiclo1);
    
    newBtn.onclick = () => {
      mostrarModalConfirmacionCiclo1(() => guardarEspecialesPorCiclo('ciclo1'));
    };
  }
  
  // ========== BOTÓN GUARDAR CICLO 2 ==========
  const btnGuardarCiclo2 = document.getElementById('btn-guardar-ciclo2');
  if (btnGuardarCiclo2) {
    const newBtn = btnGuardarCiclo2.cloneNode(true);
    btnGuardarCiclo2.parentNode.replaceChild(newBtn, btnGuardarCiclo2);
    
    newBtn.onclick = () => {
      mostrarModalConfirmacionCiclo2(() => guardarEspecialesPorCiclo('ciclo2'));
    };
  }
  
  // Actualizar countdown de Ciclo 1 periódicamente
  if (window.ciclo1CountdownInterval) clearInterval(window.ciclo1CountdownInterval);
  window.ciclo1CountdownInterval = setInterval(() => {
    if (tabActivo === 'ciclo1') {
      const zona3Content = document.getElementById('esp-zona3-contenido');
      if (zona3Content && zona3Content.innerHTML.includes('Faltan')) {
        function calcularTiempoRestanteCiclo1() {
          const fechaActual = new Date();
          const fechaCierre = new Date(2026, 5, 11, 14, 0, 0);
          const diffMs = fechaCierre - fechaActual;
          
          if (diffMs <= 0) return 'CERRADO';
          
          const diffSegundos = Math.floor(diffMs / 1000);
          const dias = Math.floor(diffSegundos / 86400);
          const horas = Math.floor((diffSegundos % 86400) / 3600);
          const minutos = Math.floor((diffSegundos % 3600) / 60);
          
          const partes = [];
          if (dias > 0) partes.push(`${dias}d`);
          if (horas > 0) partes.push(`${horas}h`);
          if (minutos > 0) partes.push(`${minutos}m`);
          
          if (partes.length === 0) return '<1m';
          return partes.join(' ');
        }
        
        const tiempoRestante = calcularTiempoRestanteCiclo1();
        const countdownSpan = document.querySelector('#esp-zona3-contenido span[style*="background:rgba(255,255,255,0.8)"]');
        if (countdownSpan) {
          countdownSpan.textContent = `⏱️ Faltan ${tiempoRestante} para seleccionar las parejas`;
        }
      }
    }
  }, 1000);
}

// ─────────────────────────────────────────────────────────────
// 9. GUARDAR EN API (CORREGIDO - NO ENVÍA CAMPOS QUE NO SE MODIFICAN)
// ─────────────────────────────────────────────────────────────

async function guardarEspecialesPorCiclo(ciclo) {
  if (!currentJugadorId) {
    mostrarToast('❌ Error: No se ha identificado el jugador', 'err');
    return;
  }
  
  const payload = { id: currentJugadorId };
  
  if (ciclo === 'ciclo1') {
    console.log('[Especiales] Guardando solo CICLO 1 (Clasificados por grupo)');
    const gruposOrden = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    gruposOrden.forEach(grupo => {
      const sel = gruposSeleccion[grupo] || {};
      const clf1 = sel[1] ? getEquipoIdPorNombre(sel[1]) : 0;
      const clf2 = sel[2] ? getEquipoIdPorNombre(sel[2]) : 0;
      // Solo enviar si hay valor (evita enviar 0 innecesarios)
      if (clf1 !== 0) payload[`grp_${grupo.toLowerCase()}_clf1`] = clf1;
      if (clf2 !== 0) payload[`grp_${grupo.toLowerCase()}_clf2`] = clf2;
    });
    
    // IMPORTANTE: NO enviamos cam, sub, ter, cua
    // Así Velneo mantiene los valores existentes de finalistas
    
  } else if (ciclo === 'ciclo2') {
    console.log('[Especiales] Guardando solo CICLO 2 (Finalistas)');
    
    if (finalistasSeleccion.campeon) {
      const camId = getEquipoIdPorNombre(finalistasSeleccion.campeon);
      if (camId) payload.cam = camId;
    }
    if (finalistasSeleccion.subcampeon) {
      const subId = getEquipoIdPorNombre(finalistasSeleccion.subcampeon);
      if (subId) payload.sub = subId;
    }
    if (finalistasSeleccion.tercero) {
      const terId = getEquipoIdPorNombre(finalistasSeleccion.tercero);
      if (terId) payload.ter = terId;
    }
    if (finalistasSeleccion.cuarto) {
      const cuaId = getEquipoIdPorNombre(finalistasSeleccion.cuarto);
      if (cuaId) payload.cua = cuaId;
    }
    
    // IMPORTANTE: NO enviamos grp_X_clf1, grp_X_clf2
    // Así Velneo mantiene los valores existentes de grupos
  }
  
  console.log(`[Especiales] Enviando payload (${ciclo}):`, payload);
  
  // Si el payload solo tiene { id }, no hay nada que guardar
  if (Object.keys(payload).length === 1) {
    mostrarToast('⚠️ No hay cambios para guardar', 'err');
    return;
  }
  
  try {
    const response = await fetch(`${BASE_V2}/_process/API_PUT_JUG?api_key=${KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const respuesta = await response.json();
    console.log('[Especiales] Respuesta del servidor:', respuesta);
    
    datosGuardados = true;
    actualizarLocalStorage();
    
    const mensajeCiclo = ciclo === 'ciclo1' ? 'Ciclo 1 (Clasificados)' : 'Ciclo 2 (Finalistas)';
    mostrarToast(`✅ ${mensajeCiclo} guardado correctamente`, 'ok');
    
  } catch (error) {
    console.error('[Especiales] Error al guardar:', error);
    mostrarToast(`❌ Error al guardar: ${error.message}`, 'err');
  }
}

// ─────────────────────────────────────────────────────────────
// 10. RENDERIZADO PRINCIPAL
// ─────────────────────────────────────────────────────────────

export async function renderizarEspeciales(contenedor, datosCuenta) {
  if (!contenedor) return;
  
  console.log('[Especiales] Renderizando...');
  
  currentJugadorId = datosCuenta?.id || datosCuenta?.ID || null;
  
  if (equiposCache.length === 0) {
    const cargado = await cargarEquiposDesdeAPI();
    if (!cargado) {
      contenedor.innerHTML = `<div style="padding: 40px; text-align: center; color: red;">Error cargando equipos. Intente nuevamente.</div>`;
      return;
    }
  }
  
  await cargarPronosticosDesdeAPI(currentJugadorId);
  actualizarEstadoVentanas();
  
  if (!simuladorSuscrito && typeof onSimuladorCambio === 'function') {
    simuladorSuscrito = true;
    onSimuladorCambio(() => {
      console.log('[Especiales] Recibido cambio del simulador');
      refrescarEspecialesPorFecha();
    });
  }
  
  contenedor.innerHTML = `
    <div style="width:100%; height:100%; background: #ffffff; border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
      <style>
        .esp-tabs-container { display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid #e5e5ea; padding-bottom: 8px; flex-shrink: 0; }
        .esp-tab { flex: 1; padding: 12px 8px; background: none; border: 1px solid #d1d1d6; border-radius: 12px; font-size: 13px; font-weight: 600; color: #8e8e93; cursor: pointer; transition: all 0.2s; text-align: center; }
        .esp-tab.active { background: #007aff; border-color: #007aff; color: #fff; font-size: 15px; font-weight: 700; }
        @media (max-width: 600px) { .esp-tab { padding: 8px 4px; font-size: 11px; } .esp-tab.active { font-size: 13px; } }
        
        .esp-seccion-titulo { font-size: 16px; font-weight: 700; color: #1c1c1e; margin: 20px 0 12px; display: flex; align-items: center; gap: 10px; }
        .esp-grupos-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; max-width: 300px; justify-content: center; margin-left: auto; margin-right: auto; }
        .esp-grupo-tab { width: 38px; height: 38px; border-radius: 19px; background: #f2f2f7; border: 1px solid #e5e5ea; color: #3c3c43; font-size: 14px; font-weight: 700; cursor: pointer; }
        .esp-grupo-tab.active { background: #007aff; border-color: #007aff; color: #fff; }
        .esp-grupo-panel { background: #f9f9fb; border: 1px solid #e5e5ea; border-radius: 16px; padding: 16px; margin-bottom: 20px; }
        .esp-grupo-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5ea; }
        .esp-grupo-titulo { font-size: 16px; font-weight: 700; color: #1c1c1e; }
        .esp-equipos-lista { display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; margin-bottom: 20px; }
        .esp-equipo-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .esp-equipo-item .esp-bandera { font-size: 40px; }
        .esp-equipo-item .esp-nombre { font-size: 12px; font-weight: 500; color: #1c1c1e; text-align: center; max-width: 70px; }
        .esp-posicion-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .esp-posicion-label { width: 32px; font-size: 14px; font-weight: 700; color: #8e8e93; }
        .esp-selector { flex: 1; position: relative; }
        .esp-selector-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: #ffffff; border: 1.5px solid #e5e5ea; border-radius: 12px; font-size: 14px; font-weight: 500; color: #1c1c1e; cursor: pointer; }
        .esp-selector-btn.has-value { border-color: #34c759; background: #eafaf1; }
        .esp-selector-value { text-align: left; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 8px; }
        .esp-selector-arrow { font-size: 10px; color: #8e8e93; }
        .esp-dropdown-menu { position: absolute; top: 100%; left: 0; right: 0; background: #ffffff; border: 1px solid #e5e5ea; border-radius: 12px; margin-top: 4px; z-index: 100; display: none; max-height: 200px; overflow-y: auto; box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
        .esp-dropdown-menu.open { display: block; }
        .esp-dropdown-item { padding: 10px 14px; font-size: 13px; color: #1c1c1e; cursor: pointer; }
        .esp-dropdown-item:hover { background: #f2f2f7; }
        .esp-dropdown-item.selected { background: #e8f3ff; color: #007aff; font-weight: 600; }
        .esp-dropdown-item.used { opacity: 0.5; cursor: not-allowed; }
        .esp-finalista-card { background: #f9f9fb; border: 1px solid #e5e5ea; border-radius: 16px; padding: 16px; margin-bottom: 12px; }
        .esp-finalista-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .esp-finalista-titulo { font-size: 15px; font-weight: 700; color: #1c1c1e; }
        .esp-finalista-pts { font-size: 12px; font-weight: 700; color: #ff9500; background: #fff9ec; padding: 3px 10px; border-radius: 20px; }
        
        .esp-zona3 {
          flex: 1;
          overflow-y: auto;
          padding: 0 20px 20px 20px;
          min-height: 0;
        }
      </style>
      
      <div style="padding: 20px 20px 0 20px; flex-shrink: 0;">
        <div class="esp-tabs-container">
          <button class="esp-tab active" data-tab="ciclo1">CICLO 1</button>
          <button class="esp-tab" data-tab="ciclo2">CICLO 2</button>
        </div>
      </div>
      
      <div id="esp-zona3" class="esp-zona3">
        <div id="esp-zona3-contenido">
          ${renderCiclo1Content()}
        </div>
      </div>
    </div>
  `;
  
  document.querySelectorAll('.esp-tab').forEach(tab => {
    tab.onclick = () => cambiarTab(tab.dataset.tab);
  });
  
  setTimeout(() => inicializarGruposTabs(), 100);
  setTimeout(() => setupEventListeners(), 100);
}

// ========== FUNCIÓN PARA RENDERIZAR CON TAB ESPECÍFICO ==========
export async function renderizarEspecialesConTab(contenedor, datosCuenta, tabDestino = 'ciclo1') {
    await renderizarEspeciales(contenedor, datosCuenta);
    setTimeout(() => {
        const tab = document.querySelector(`.esp-tab[data-tab="${tabDestino}"]`);
        if (tab) {
            tab.click();
            console.log(`[Especiales] Cambiado a tab: ${tabDestino}`);
        } else {
            const tabs = document.querySelectorAll('.esp-tab');
            const textoBuscado = tabDestino === 'ciclo2' ? 'CICLO 2' : 'CICLO 1';
            for (const t of tabs) {
                if (t.textContent.includes(textoBuscado)) {
                    t.click();
                    console.log(`[Especiales] Fallback: cambiado a ${textoBuscado}`);
                    break;
                }
            }
        }
        setTimeout(() => inicializarGruposTabs(), 100);
    }, 400);
}