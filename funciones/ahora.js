// ahora.js - Módulo de partidos de hoy
// CORREGIDO:
// - Usa fecha/hora LOCAL del computador (NO UTC)
// - Muestra TODOS los partidos del día (terminados, en vivo, pendientes)
// - NO muestra pronóstico ni puntos en las tarjetas
// - Al hacer clic → redirige a partidos.js con tab "TODOS"
// - SIN HARDCODES - 100% depende del campo 'est' de la API de Velneo

import { cargarPartidos, getBandera, formatearHora12h } from './partidos.js';

let currentJugador = null;
let pronosticosCache = {};
let resultadosRealesCache = {};

// ========== CALLBACK PARA CAMBIAR VISTA ==========
let globalCambiarVistaCallback = null;

export function setCambiarVistaCallback(callback) {
    globalCambiarVistaCallback = callback;
}

// ========== SUSCRIPCIÓN AL SIMULADOR ==========
let simuladorSuscrito = false;
let simuladorCallback = null;

export function suscribirAhoraAlSimulador(callback) {
    if (!simuladorSuscrito && typeof callback === 'function') {
        simuladorSuscrito = true;
        simuladorCallback = callback;
        console.log('[Ahora] Suscrito al simulador');
    }
}

export function refrescarAhora() {
    const contenedor = document.getElementById('ahora-contenedor');
    if (contenedor && currentJugador) {
        renderizarAhora(contenedor, currentJugador);
    }
}

// ========== FECHA LOCAL (CORREGIDO - NO UTC) ==========
function getLocalDate() {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = String(ahora.getMonth() + 1).padStart(2, '0');
    const day = String(ahora.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getLocalDateTime() {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = String(ahora.getMonth() + 1).padStart(2, '0');
    const day = String(ahora.getDate()).padStart(2, '0');
    const hours = String(ahora.getHours()).padStart(2, '0');
    const minutes = String(ahora.getMinutes()).padStart(2, '0');
    return { fecha: `${year}-${month}-${day}`, hora: `${hours}:${minutes}` };
}

// ========== FILTRAR PARTIDOS DE HOY (FECHA LOCAL) ==========
function obtenerPartidosDeHoy(partidos) {
    const hoy = getLocalDate();
    return partidos.filter(p => {
        const fechaPartido = p.fch?.split('T')[0];
        return fechaPartido === hoy;
    });
}

// ========== OBTENER ESTADO DEL PARTIDO DESDE API ==========
function getEstadoPartido(partido) {
    const est = Number(partido.est);
    
    if (est === 4) {
        return { texto: 'TERMINADO', color: '#34c759', icono: '✅', editable: false };
    }
    if (est === 2 || est === 3) {
        return { texto: 'EN VIVO', color: '#ff3b30', icono: '🔴', editable: false };
    }
    return { texto: 'PENDIENTE', color: '#ff9500', icono: '⏱️', editable: true };
}

// ========== OBTENER MARCADOR DESDE API ==========
function getMarcador(partido) {
    const est = Number(partido.est);
    
    if (est === 4) {
        const golLoc = partido.t90_gol_loc || partido.gol_loc || 0;
        const golVis = partido.t90_gol_vis || partido.gol_vis || 0;
        return { golLoc, golVis, mostrar: true };
    }
    if (est === 2 || est === 3) {
        return { golLoc: partido.gol_loc || 0, golVis: partido.gol_vis || 0, mostrar: true };
    }
    return { golLoc: 0, golVis: 0, mostrar: false };
}

// ========== CAMBIAR A TAB "TODOS" EN PARTIDOS ==========
function cambiarTabPartidosATodos() {
    const tabTodos = document.querySelector('.partidos-tab[data-tab="todos"]');
    if (tabTodos) {
        tabTodos.click();
    }
}

// ========== RENDERIZAR PRINCIPAL ==========
async function renderizarAhora(contenedor, datosCuenta) {
    if (!contenedor) return;
    
    currentJugador = datosCuenta;
    
    // Cargar pronósticos del usuario
    if (currentJugador) {
        try {
            const BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
            const KEY = 'SuzvTp4qwXQtAVFJbdzP';
            const response = await fetch(`${BASE_V2}/fifa_jug_pro?api_key=${KEY}&filter[id]=${currentJugador.id}`);
            const data = await response.json();
            pronosticosCache = {};
            (data.fifa_jug_pro || []).forEach(p => {
                pronosticosCache[p.ptd] = { s1: p.pro_gol_loc || 0, s2: p.pro_gol_vis || 0 };
            });
        } catch (error) {
            console.error('[Ahora] Error cargando pronósticos:', error);
        }
    }
    
    let partidos = await cargarPartidos();
    const partidosHoy = obtenerPartidosDeHoy(partidos);
    
    // Ordenar por hora
    partidosHoy.sort((a, b) => (a.hor || '00:00:00').localeCompare(b.hor || '00:00:00'));
    
    if (partidosHoy.length === 0) {
        contenedor.innerHTML = `
            <div style="padding:20px;text-align:center;color:#8e8e93;">
                ⚽ No hay partidos programados para hoy
            </div>
        `;
        return;
    }
    
    let cardsHtml = '';
    for (const p of partidosHoy) {
        const estado = getEstadoPartido(p);
        const marcador = getMarcador(p);
        const pronostico = pronosticosCache[p.id];
        const horaFormateada = formatearHora12h(p.hor);
        
        let marcadorHTML = '';
        if (marcador.mostrar) {
            marcadorHTML = `
                <div style="margin: 8px 0; text-align: center;">
                    <span style="font-size: 24px; font-weight: 800; color: ${estado.color};">${marcador.golLoc} - ${marcador.golVis}</span>
                </div>
            `;
        }
        
        cardsHtml += `
            <div class="ahora-card" data-id="${p.id}" data-fch="${p.fch?.split('T')[0] || ''}" data-hor="${p.hor || ''}" style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;border:1.5px solid ${estado.color};cursor:pointer;">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <span style="font-size:12px;color:#8e8e93;">Grupo ${p.grupoCalculado || '?'}</span>
                    <span style="font-size:12px;color:#8e8e93;">${horaFormateada}</span>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:40px;">${getBandera(p.nom_loc)}</div>
                        <div style="font-weight:600;font-size:13px;">${p.nom_loc}</div>
                    </div>
                    <div style="text-align:center;min-width:60px;">
                        <div style="font-size:18px;font-weight:700;color:#007aff;">VS</div>
                    </div>
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:40px;">${getBandera(p.nom_vis)}</div>
                        <div style="font-weight:600;font-size:13px;">${p.nom_vis}</div>
                    </div>
                </div>
                ${marcadorHTML}
                <div style="margin-top:8px;text-align:center;">
                    <span style="font-size:14px;font-weight:600;color:${estado.color};">${estado.icono} ${estado.texto}</span>
                </div>
                <div style="margin-top:12px;text-align:center;padding-top:8px;border-top:1px solid #e5e5ea;">
                    <span style="font-size:11px;color:#007aff;font-weight:500;">⚽ Haz clic para ver tu pronóstico</span>
                </div>
            </div>
        `;
    }
    
    contenedor.innerHTML = `
        <div style="padding:16px;">
            <h2 style="font-size:18px;margin-bottom:16px;">⚽ Partidos de hoy</h2>
            <div id="ahora-partidos-lista">
                ${cardsHtml}
            </div>
            <p style="font-size:11px;color:#8e8e93;text-align:center;margin-top:16px;">
                💡 Haz clic en cualquier partido para ver tu pronóstico y detalles
            </p>
        </div>
    `;
    
    // Eventos de clic en las tarjetas
    document.querySelectorAll('.ahora-card').forEach(card => {
        card.onclick = () => {
            if (globalCambiarVistaCallback) {
                globalCambiarVistaCallback('partidos', currentJugador);
                setTimeout(() => {
                    cambiarTabPartidosATodos();
                }, 300);
            }
        };
    });
}

export { renderizarAhora };
