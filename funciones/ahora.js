// ahora.js - Módulo de partidos de hoy
// VERSIÓN 7 COLUMNAS - Partidos simultáneos agrupados por bloque
// Columnas: LOCAL | VS | VISITANTE | SEP | LOCAL | VS | VISITANTE
// - Agrupa partidos por GRUPO + HORA (partidos simultáneos)
// - 2 filas: Fila 1 (nombres), Fila 2 (banderas)
// - Scroll vertical DENTRO de la card
// - SIN scroll horizontal
// - Click → redirige a partidos.js con tab='todos'
// - MOCK INTELIGENTE: solo se muestra si NO hay partidos reales en la API
// - Nombres de equipos CORREGIDOS para que coincidan con la API y las banderas

import { cargarPartidos, getBandera, formatearHora12h } from './partidos.js';

let currentJugador = null;
let pronosticosCache = {};
let countdownInterval = null;
let countdownActivo = false;

// ========== CALLBACK PARA CAMBIAR VISTA ==========
let globalCambiarVistaCallback = null;

export function setCambiarVistaCallback(callback) {
    globalCambiarVistaCallback = callback;
}

export function refrescarAhora() {
    const contenedor = document.getElementById('ahora-contenedor');
    if (contenedor && currentJugador) {
        renderizarAhora(contenedor, currentJugador);
    }
}

// ========== SUSCRIPCIÓN AL SIMULADOR (legacy - compatibilidad) ==========
export function suscribirAhoraAlSimulador(callback) {
    console.log('[Ahora] suscribirAhoraAlSimulador llamado (legacy)');
    if (typeof callback === 'function') {
        window.__ahoraSimuladorCallback = callback;
    }
}

// ========== FECHA LOCAL ==========
function getLocalDate() {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = String(ahora.getMonth() + 1).padStart(2, '0');
    const day = String(ahora.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ========== FILTRAR PARTIDOS DE HOY ==========
function obtenerPartidosDeHoy(partidos) {
    const hoy = getLocalDate();
    return partidos.filter(p => {
        const fechaPartido = p.fch?.split('T')[0];
        return fechaPartido === hoy;
    });
}

// ========== CALCULAR COUNTDOWN ==========
function calcularCountdown(fechaPartido, horaPartido) {
    const ahora = new Date();
    const [year, month, day] = fechaPartido.split('-');
    const [hour, minute] = horaPartido.split(':');
    const fechaObj = new Date(year, month - 1, day, hour, minute, 0);
    const diffMs = fechaObj - ahora;
    
    if (diffMs <= 0) return null;
    
    const diffSegundos = Math.floor(diffMs / 1000);
    const horas = Math.floor(diffSegundos / 3600);
    const minutos = Math.floor((diffSegundos % 3600) / 60);
    
    if (horas >= 24) {
        const dias = Math.floor(horas / 24);
        const horasRest = horas % 24;
        return `Faltan ${dias}d ${horasRest}h`;
    }
    if (horas === 0 && minutos === 0) return `Faltan <1m`;
    if (horas === 0) return `Faltan ${minutos}m`;
    return `Faltan ${horas}h ${minutos}m`;
}

// ========== OBTENER ESTADO DEL PARTIDO ==========
function getEstadoPartido(partido) {
    const est = Number(partido.est);
    
    if (est === 4) {
        const golLoc = partido.t90_gol_loc || partido.gol_loc || 0;
        const golVis = partido.t90_gol_vis || partido.gol_vis || 0;
        return { 
            tipo: 'terminado',
            marcador: `${golLoc} - ${golVis}`,
            badge: 'TERMINADO',
            badgeColor: '#34c759',
            badgeIcono: '✅'
        };
    }
    if (est === 2 || est === 3) {
        const golLoc = (partido.gol_loc !== undefined && partido.gol_loc !== null) 
            ? partido.gol_loc 
            : (partido.t90_gol_loc || 0);
        const golVis = (partido.gol_vis !== undefined && partido.gol_vis !== null) 
            ? partido.gol_vis 
            : (partido.t90_gol_vis || 0);
        return { 
            tipo: 'envivo',
            marcador: `${golLoc} - ${golVis}`,
            badge: 'EN VIVO',
            badgeColor: '#ff3b30',
            badgeIcono: '🔴'
        };
    }
    return { 
        tipo: 'pendiente',
        marcador: null,
        badge: null,
        badgeColor: null,
        badgeIcono: null
    };
}

// ========== AGRUPAR PARTIDOS POR BLOQUE ==========
function agruparPartidosPorBloque(partidos) {
    const grupos = {};
    
    partidos.forEach(p => {
        const clave = `${p.grp_for || 'X'}_${p.hor || '00:00:00'}`;
        if (!grupos[clave]) {
            grupos[clave] = {
                grupo: p.grp_for || 'X',
                hora: p.hor || '00:00:00',
                partidos: []
            };
        }
        grupos[clave].partidos.push(p);
    });
    
    const bloques = Object.values(grupos);
    bloques.sort((a, b) => a.hora.localeCompare(b.hora));
    
    return bloques;
}

// ========== ACTUALIZAR COUNTDOWNS ==========
function actualizarCountdownsEnTabla() {
    const countdownElements = document.querySelectorAll('.ahora-countdown');
    if (countdownElements.length === 0) return;
    
    countdownElements.forEach(el => {
        const fechaPartido = el.dataset.fch;
        const horaPartido = el.dataset.hor;
        if (fechaPartido && horaPartido) {
            const countdown = calcularCountdown(fechaPartido, horaPartido);
            if (countdown) {
                el.innerHTML = countdown;
                el.style.color = '#ff9500';
            } else {
                refrescarAhora();
            }
        }
    });
}

function iniciarCountdownAhora() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        if (!document.hidden && countdownActivo) {
            actualizarCountdownsEnTabla();
        }
    }, 60000);
    countdownActivo = true;
}

function detenerCountdownAhora() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    countdownActivo = false;
}

// ========== GENERAR MOCK PARA PRUEBAS ==========
function generarMockPartidos() {
    const fechaMock = '2026-06-24';
    return [
        { id: 9991, nom_loc: 'Suiza', nom_vis: 'Canadá', fch: fechaMock, hor: '14:00:00', est: '1', grp_for: 'B', fas: '1' },
        { id: 9992, nom_loc: 'Bosnia', nom_vis: 'Catar', fch: fechaMock, hor: '14:00:00', est: '1', grp_for: 'B', fas: '1' },
        { id: 9993, nom_loc: 'Escocia', nom_vis: 'Brasil', fch: fechaMock, hor: '17:00:00', est: '1', grp_for: 'C', fas: '1' },
        { id: 9994, nom_loc: 'Marruecos', nom_vis: 'Haití', fch: fechaMock, hor: '17:00:00', est: '1', grp_for: 'C', fas: '1' },
        { id: 9995, nom_loc: 'República Checa', nom_vis: 'México', fch: fechaMock, hor: '20:00:00', est: '1', grp_for: 'A', fas: '1' },
        { id: 9996, nom_loc: 'Sudáfrica', nom_vis: 'República de Corea', fch: fechaMock, hor: '20:00:00', est: '1', grp_for: 'A', fas: '1' }
    ];
}

// ========== RENDERIZAR BLOQUE DE PARTIDOS (7 COLUMNAS) ==========
function renderizarBloque(bloque) {
    const { grupo, hora, partidos } = bloque;
    const horaFormateada = formatearHora12h(hora);
    
    const partidosOrdenados = [...partidos].sort((a, b) => a.nom_loc.localeCompare(b.nom_loc));
    const p1 = partidosOrdenados[0];
    const p2 = partidosOrdenados[1];
    
    const estado1 = getEstadoPartido(p1);
    const estado2 = getEstadoPartido(p2);
    
    function getColumnaCentral(estado, partido) {
        if (estado.tipo === 'terminado') {
            return `
                <div style="font-size: 13px; font-weight: 800; color: ${estado.badgeColor}; margin-bottom: 2px;">${estado.marcador}</div>
                <div style="display: inline-flex; align-items: center; gap: 3px; background: ${estado.badgeColor}15; padding: 2px 8px; border-radius: 12px;">
                    <span style="font-size: 8px;">${estado.badgeIcono}</span>
                    <span style="font-size: 7px; font-weight: 600; color: ${estado.badgeColor};">${estado.badge}</span>
                </div>
            `;
        } else if (estado.tipo === 'envivo') {
            return `
                <div style="font-size: 13px; font-weight: 800; color: ${estado.badgeColor}; margin-bottom: 2px;">${estado.marcador}</div>
                <div style="display: inline-flex; align-items: center; gap: 3px; background: ${estado.badgeColor}15; padding: 2px 8px; border-radius: 12px;">
                    <span style="font-size: 8px;">${estado.badgeIcono}</span>
                    <span style="font-size: 7px; font-weight: 600; color: ${estado.badgeColor};">${estado.badge}</span>
                </div>
            `;
        } else {
            const countdownText = calcularCountdown(partido.fch?.split('T')[0], partido.hor);
            return `
                <div style="font-weight: 600; color: #8e8e93; font-size: 9px; margin-bottom: 1px;">VS</div>
                ${countdownText ? `<div class="ahora-countdown" data-fch="${partido.fch?.split('T')[0]}" data-hor="${partido.hor}" style="font-size: 8px; font-weight: 600; color: #ff9500;">${countdownText}</div>` : '<div style="font-size: 7px; color: #8e8e93;">PENDIENTE</div>'}
            `;
        }
    }

    const centro1 = getColumnaCentral(estado1, p1);
    const centro2 = getColumnaCentral(estado2, p2);
    
    const nombreLocal1 = p1.nom_loc.length > 10 ? p1.nom_loc.substring(0, 9) + '…' : p1.nom_loc;
    const nombreVisita1 = p1.nom_vis.length > 10 ? p1.nom_vis.substring(0, 9) + '…' : p1.nom_vis;
    const nombreLocal2 = p2.nom_loc.length > 10 ? p2.nom_loc.substring(0, 9) + '…' : p2.nom_loc;
    const nombreVisita2 = p2.nom_vis.length > 10 ? p2.nom_vis.substring(0, 9) + '…' : p2.nom_vis;
    
    const badgeGrupo = grupo && grupo !== 'X' ? `Grupo ${grupo}` : 'Fase 1';
    
    return `
        <div class="ahora-bloque" data-grupo="${grupo}" data-hora="${hora}" style="
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(4px);
            border-radius: 16px;
            padding: 12px 10px;
            margin-bottom: 12px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 0 4px;">
                <span style="font-size: 12px; font-weight: 700; color: rgba(0,0,0,0.5);">${badgeGrupo}</span>
                <span style="font-size: 11px; font-weight: 600; color: #007aff;">⏰ ${horaFormateada}</span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 0.7fr 1fr 0.1fr 1fr 0.7fr 1fr; gap: 2px; align-items: center; text-align: center; margin-bottom: 4px;">
                <div style="font-size: 10px; font-weight: 600; color: rgba(0,0,0,0.8);">${nombreLocal1}</div>
                <div style="font-size: 10px; font-weight: 600; color: rgba(0,0,0,0.4);">${centro1}</div>
                <div style="font-size: 10px; font-weight: 600; color: rgba(0,0,0,0.8);">${nombreVisita1}</div>
                
                <!-- COLUMNA 4: SEPARADOR AZUL -->
                <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                    <div style="width: 2px; height: 60%; background: #007aff; opacity: 0.3; border-radius: 2px;"></div>
                </div>
                
                <div style="font-size: 10px; font-weight: 600; color: rgba(0,0,0,0.8);">${nombreLocal2}</div>
                <div style="font-size: 10px; font-weight: 600; color: rgba(0,0,0,0.4);">${centro2}</div>
                <div style="font-size: 10px; font-weight: 600; color: rgba(0,0,0,0.8);">${nombreVisita2}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 0.7fr 1fr 0.1fr 1fr 0.7fr 1fr; gap: 2px; align-items: center; text-align: center;">
                <div style="font-size: 28px; line-height: 1.2;">${getBandera(p1.nom_loc)}</div>
                <div style="font-size: 10px; font-weight: 700; color: rgba(0,0,0,0.2);">VS</div>
                <div style="font-size: 28px; line-height: 1.2;">${getBandera(p1.nom_vis)}</div>
                
                <!-- COLUMNA 4: SEPARADOR AZUL -->
                <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                    <div style="width: 2px; height: 60%; background: #007aff; opacity: 0.3; border-radius: 2px;"></div>
                </div>
                
                <div style="font-size: 28px; line-height: 1.2;">${getBandera(p2.nom_loc)}</div>
                <div style="font-size: 10px; font-weight: 700; color: rgba(0,0,0,0.2);">VS</div>
                <div style="font-size: 28px; line-height: 1.2;">${getBandera(p2.nom_vis)}</div>
            </div>
        </div>
    `;
}

// ========== RENDERIZAR PRINCIPAL ==========
async function renderizarAhora(contenedor, datosCuenta) {
    if (!contenedor) return;
    
    currentJugador = datosCuenta;
    detenerCountdownAhora();
    
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
    let partidosHoy = obtenerPartidosDeHoy(partidos);
    
    // ========== MOCK INTELIGENTE ==========
    if (partidosHoy.length === 0) {
        partidosHoy = generarMockPartidos();
        console.log('🧪 MODO PRUEBA - Usando mock porque no hay partidos reales en la API');
    } else {
        console.log(`✅ ${partidosHoy.length} partidos reales cargados desde la API`);
    }
    
    if (partidosHoy.length === 0) {
        contenedor.innerHTML = `
            <div style="background: rgba(255,255,255,0.04); backdrop-filter: blur(4px); border-radius: 20px; padding: 30px 20px; text-align: center; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 48px; margin-bottom: 16px;">⚽</div>
                <div style="color: rgba(255,255,255,0.5); font-size: 14px;">No hay partidos programados para hoy</div>
            </div>
        `;
        return;
    }
    
    const bloques = agruparPartidosPorBloque(partidosHoy);
    let bloquesHtml = bloques.map(b => renderizarBloque(b)).join('');
    
    contenedor.innerHTML = `
        <style>
            .ahora-container {
                background: rgba(255, 255, 255, 0.04);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border-radius: 20px;
                overflow: hidden;
                border: 1px solid rgba(255, 255, 255, 0.06);
                display: flex;
                flex-direction: column;
                max-height: calc(100vh - 140px);
            }
            .ahora-header {
                padding: 14px 12px 10px 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                text-align: center;
                flex-shrink: 0;
                background: rgba(255, 255, 255, 0.02);
            }
            .ahora-titulo {
                font-size: 16px;
                font-weight: 700;
                color: rgba(255, 255, 255, 0.9);
                margin-bottom: 2px;
            }
            .ahora-scroll {
                overflow-y: auto;
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
                flex: 1;
                padding: 12px 12px 8px 12px;
            }
            .ahora-scroll::-webkit-scrollbar {
                width: 3px;
            }
            .ahora-scroll::-webkit-scrollbar-track {
                background: transparent;
            }
            .ahora-scroll::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.15);
                border-radius: 4px;
            }
            .ahora-footer {
                padding: 10px;
                text-align: center;
                border-top: 1px solid rgba(255, 255, 255, 0.04);
                font-size: 9px;
                color: rgba(255, 255, 255, 0.2);
                flex-shrink: 0;
                letter-spacing: 0.3px;
            }
            .ahora-bloque {
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .ahora-bloque:hover {
                background: rgba(240, 240, 240, 0.95);
                border-color: rgba(0, 122, 255, 0.2);
            }
            .ahora-bloque:active {
                transform: scale(0.99);
            }
            @media (max-width: 600px) {
                .ahora-container {
                    max-height: calc(100vh - 120px);
                    border-radius: 16px;
                }
                .ahora-scroll {
                    padding: 8px 8px 4px 8px;
                }
                .ahora-bloque {
                    padding: 10px 8px;
                }
                .ahora-bloque div[style*="grid-template-columns"] {
                    gap: 1px !important;
                }
            }
        </style>
        
        <div class="ahora-container">
            <div class="ahora-header">
                <div class="ahora-titulo">🏆 PARTIDOS DE HOY</div>
            </div>
            
            <div class="ahora-scroll" id="ahora-scroll">
                ${bloquesHtml}
            </div>
            
            <div class="ahora-footer">
                💡 Haz clic en cualquier bloque para pronosticar
            </div>
        </div>
    `;
    
    document.querySelectorAll('.ahora-bloque').forEach(bloque => {
        bloque.addEventListener('click', function() {
            if (globalCambiarVistaCallback) {
                globalCambiarVistaCallback('partidos', currentJugador, null, 'todos');
            }
        });
    });
    
    if (document.querySelectorAll('.ahora-countdown').length > 0) {
        iniciarCountdownAhora();
    }
    
    const visibilityHandler = () => {
        if (document.hidden) {
            detenerCountdownAhora();
        } else {
            if (document.querySelectorAll('.ahora-countdown').length > 0) {
                iniciarCountdownAhora();
                actualizarCountdownsEnTabla();
            } else {
                refrescarAhora();
            }
        }
    };
    
    document.removeEventListener('visibilitychange', visibilityHandler);
    document.addEventListener('visibilitychange', visibilityHandler);
}

// ========== EXPORTAR ==========
export { renderizarAhora };
