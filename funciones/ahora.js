// ahora.js - Módulo de partidos de hoy
// VERSIÓN 3 COLUMNAS - Tabla: LOCAL | VS | VISITANTE
// - Lista plana de partidos (sin agrupación por grupo/hora)
// - Scroll vertical DENTRO de la card
// - SIN scroll horizontal
// - Click → redirige a partidos.js con tab='todos' y scroll al partido
// - MOCK INTELIGENTE: solo se muestra si NO hay partidos reales en la API
// - Countdown para partidos pendientes
// - CARD INFORMATIVA: explica 90 minutos + alargue + puntos extra
// - CORREGIDO: Orden específico: 103 (3er Puesto) primero, luego 104 (Final)

import { getBandera } from './banderas.js';

const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

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

// ========== SUSCRIPCIÓN AL SIMULADOR ==========
export function suscribirAhoraAlSimulador(callback) {
    console.log('[Ahora] suscribirAhoraAlSimulador llamado (legacy)');
    if (typeof callback === 'function') {
        window.__ahoraSimuladorCallback = callback;
    }
}

// ========== FUNCIÓN LOCAL formatearHora12h ==========
function formatearHora12h(horaStr) {
    if (!horaStr) return '';
    const horaLimpia = horaStr.split(':').slice(0, 2).join(':');
    const [hora, minuto] = horaLimpia.split(':');
    let horaNum = parseInt(hora);
    const periodo = horaNum >= 12 ? 'pm' : 'am';
    if (horaNum > 12) horaNum -= 12;
    if (horaNum === 0) horaNum = 12;
    return `${horaNum}:${minuto} ${periodo}`;
}

// ========== FECHA LOCAL ==========
function getLocalDate() {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = String(ahora.getMonth() + 1).padStart(2, '0');
    const day = String(ahora.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ========== CARGAR PARTIDOS DE HOY ==========
async function cargarPartidosHoy() {
    try {
        const timestamp = Date.now();
        const response = await fetch(`${BASE}/fifa_ptd?api_key=${KEY}&_=${timestamp}`);
        const data = await response.json();
        const todos = data.fifa_ptd || [];
        const hoy = getLocalDate();
        
        // PRIMERO: buscar partidos de hoy
        let hoyFiltered = todos.filter(p => {
            const fechaPartido = p.fch?.split('T')[0];
            const est = Number(p.est);
            return fechaPartido === hoy && est >= 1 && est <= 4;
        });
        
        // SEGUNDO: si no hay partidos de hoy, buscar 103 y 104
        if (hoyFiltered.length === 0) {
            console.log('[Ahora] No hay partidos para hoy, buscando 103 y 104...');
            hoyFiltered = todos.filter(p => {
                const id = Number(p.id);
                const est = Number(p.est);
                return (id === 103 || id === 104) && est >= 1 && est <= 4;
            });
            
            if (hoyFiltered.length > 0) {
                console.log(`[Ahora] ✅ Encontrados partidos 103 y 104`);
            }
        }
        
        // ORDEN ESPECÍFICO: 103 (3er Puesto) primero, luego 104 (Final)
        hoyFiltered.sort((a, b) => {
            const idA = Number(a.id);
            const idB = Number(b.id);
            // 103 va antes que 104
            if (idA === 103 && idB === 104) return -1;
            if (idA === 104 && idB === 103) return 1;
            // Si no son 103/104, ordenar por hora
            return (a.hor || '00:00:00').localeCompare(b.hor || '00:00:00');
        });
        
        console.log(`[Ahora] ${hoyFiltered.length} partidos para mostrar`);
        return hoyFiltered;
    } catch (error) {
        console.error('[Ahora] Error cargando partidos:', error);
        return [];
    }
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
    const hoy = getLocalDate();
    return [
        { id: 9991, nom_loc: 'Suiza', nom_vis: 'Canadá', fch: hoy, hor: '14:00:00', est: '1', grp_for: 'B', fas: '1' },
        { id: 9992, nom_loc: 'Bosnia', nom_vis: 'Catar', fch: hoy, hor: '14:00:00', est: '1', grp_for: 'B', fas: '1' },
        { id: 9993, nom_loc: 'Escocia', nom_vis: 'Brasil', fch: hoy, hor: '17:00:00', est: '1', grp_for: 'C', fas: '1' },
        { id: 9994, nom_loc: 'Marruecos', nom_vis: 'Haití', fch: hoy, hor: '17:00:00', est: '1', grp_for: 'C', fas: '1' },
        { id: 9995, nom_loc: 'República Checa', nom_vis: 'México', fch: hoy, hor: '20:00:00', est: '1', grp_for: 'A', fas: '1' },
        { id: 9996, nom_loc: 'Sudáfrica', nom_vis: 'República de Corea', fch: hoy, hor: '20:00:00', est: '1', grp_for: 'A', fas: '1' }
    ];
}

// ========== RENDERIZAR CARD INFORMATIVA ==========
function renderizarInfoCard() {
    return `
        <div style="
            background: rgba(0, 122, 255, 0.05);
            border: 1px solid rgba(0, 122, 255, 0.10);
            border-radius: 12px;
            padding: 10px 14px;
            margin: 6px 12px 10px 12px;
            font-size: 11px;
            color: #1c1c1e;
            line-height: 1.5;
        ">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                <span style="font-size: 14px;">📋</span>
                <span style="font-weight: 700; color: #007aff; font-size: 12px;">¿Cómo funciona el pronóstico?</span>
            </div>
            <div style="padding-left: 4px;">
                ⚽ El marcador que pronostiques es para el partido de <strong>90 minutos</strong>.
                <br>
                ⭐ En fases finales (16avos en adelante), si el partido termina empatado, 
                podrás elegir qué equipo avanza en el <strong>alargue</strong>.
                <br>
                ✅ Si aciertas quién avanza, sumas <strong style="color: #f1c40f;">puntos extra</strong>.
            </div>
        </div>
    `;
}

// ========== RENDERIZAR FILA DE PARTIDO ==========
function renderizarFila(partido) {
    const estado = getEstadoPartido(partido);
    const horaFormateada = formatearHora12h(partido.hor);
    const countdown = calcularCountdown(partido.fch?.split('T')[0], partido.hor);
    
    let faseBadge = '';
    const fas = Number(partido.fas);
    if (fas === 6) faseBadge = '🥉 3er Puesto';
    else if (fas === 7) faseBadge = '🏆 FINAL';
    else if (fas >= 2) faseBadge = `⚡ Fase ${fas}`;
    
    let vsContent = '';
    
    if (estado.tipo === 'terminado') {
        vsContent = `
            <div style="font-weight: 600; color: #8e8e93; font-size: 11px; margin-bottom: 4px;">VS</div>
            <div style="font-size: 13px; font-weight: 600; color: #007aff; margin-bottom: 4px;">${horaFormateada}</div>
            <div style="font-size: 16px; font-weight: 800; color: ${estado.badgeColor}; margin-bottom: 4px;">${estado.marcador}</div>
            <div style="display: inline-flex; align-items: center; gap: 4px; background: ${estado.badgeColor}15; padding: 3px 10px; border-radius: 16px;">
                <span style="font-size: 10px;">${estado.badgeIcono}</span>
                <span style="font-size: 10px; font-weight: 600; color: ${estado.badgeColor};">${estado.badge}</span>
            </div>
            ${faseBadge ? `<div style="font-size: 8px; color: #8e8e93; margin-top: 2px;">${faseBadge}</div>` : ''}
        `;
    } else if (estado.tipo === 'envivo') {
        vsContent = `
            <div style="font-weight: 600; color: #8e8e93; font-size: 11px; margin-bottom: 4px;">VS</div>
            <div style="font-size: 13px; font-weight: 600; color: #007aff; margin-bottom: 4px;">${horaFormateada}</div>
            <div style="font-size: 16px; font-weight: 800; color: ${estado.badgeColor}; margin-bottom: 4px;">${estado.marcador}</div>
            <div style="display: inline-flex; align-items: center; gap: 4px; background: ${estado.badgeColor}15; padding: 3px 10px; border-radius: 16px;">
                <span style="font-size: 10px;">${estado.badgeIcono}</span>
                <span style="font-size: 10px; font-weight: 600; color: ${estado.badgeColor};">${estado.badge}</span>
            </div>
            ${faseBadge ? `<div style="font-size: 8px; color: #8e8e93; margin-top: 2px;">${faseBadge}</div>` : ''}
        `;
    } else if (countdown) {
        vsContent = `
            <div style="font-weight: 600; color: #8e8e93; font-size: 11px; margin-bottom: 4px;">VS</div>
            <div style="font-size: 13px; font-weight: 600; color: #007aff; margin-bottom: 4px;">${horaFormateada}</div>
            <div class="ahora-countdown" data-fch="${partido.fch?.split('T')[0]}" data-hor="${partido.hor}" style="font-size: 11px; font-weight: 600; color: #ff9500;">${countdown}</div>
            ${faseBadge ? `<div style="font-size: 8px; color: #8e8e93; margin-top: 2px;">${faseBadge}</div>` : ''}
        `;
    } else {
        vsContent = `
            <div style="font-weight: 600; color: #8e8e93; font-size: 11px; margin-bottom: 4px;">VS</div>
            <div style="font-size: 13px; font-weight: 600; color: #007aff; margin-bottom: 4px;">${horaFormateada}</div>
            <div style="font-size: 10px; color: #8e8e93;">PENDIENTE</div>
            ${faseBadge ? `<div style="font-size: 8px; color: #8e8e93; margin-top: 2px;">${faseBadge}</div>` : ''}
        `;
    }
    
    const nombreLocal = partido.nom_loc.length > 12 ? partido.nom_loc.substring(0, 11) + '…' : partido.nom_loc;
    const nombreVisita = partido.nom_vis.length > 12 ? partido.nom_vis.substring(0, 11) + '…' : partido.nom_vis;
    
    return `
        <tr class="ahora-fila" data-id="${partido.id}" style="cursor: pointer; border-bottom: 0.5px solid rgba(0,0,0,0.05);">
            <td style="padding: 10px 6px; text-align: center; vertical-align: middle;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 3px;">
                    <span style="font-size: 32px;">${getBandera(partido.nom_loc)}</span>
                    <span style="font-weight: 600; color: #1c1c1e; font-size: 12px;">${nombreLocal}</span>
                </div>
            </td>
            <td style="padding: 10px 6px; text-align: center; vertical-align: middle;">
                ${vsContent}
            </td>
            <td style="padding: 10px 6px; text-align: center; vertical-align: middle;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 3px;">
                    <span style="font-size: 32px;">${getBandera(partido.nom_vis)}</span>
                    <span style="font-weight: 600; color: #1c1c1e; font-size: 12px;">${nombreVisita}</span>
                </div>
            </td>
        </tr>
    `;
}

// ========== RENDERIZAR PRINCIPAL ==========
async function renderizarAhora(contenedor, datosCuenta) {
    if (!contenedor) return;
    
    currentJugador = datosCuenta;
    detenerCountdownAhora();
    
    if (currentJugador) {
        try {
            const response = await fetch(`${BASE}/fifa_jug_pro?api_key=${KEY}&filter[id]=${currentJugador.id}&fields=jug,jug.name,id,ptd,pro_gol_loc,pro_gol_vis,pro_res,pul&_=${Date.now()}`);
            const data = await response.json();
            pronosticosCache = {};
            (data.fifa_jug_pro || []).forEach(p => {
                pronosticosCache[p.ptd] = { s1: p.pro_gol_loc || 0, s2: p.pro_gol_vis || 0 };
            });
        } catch (error) {
            console.error('[Ahora] Error cargando pronósticos:', error);
        }
    }
    
    let partidosHoy = await cargarPartidosHoy();
    
    if (partidosHoy.length === 0) {
        partidosHoy = generarMockPartidos();
        console.log('🧪 MODO PRUEBA - Usando mock');
    } else {
        console.log(`✅ ${partidosHoy.length} partidos reales cargados`);
        partidosHoy.forEach(p => {
            console.log(`   📅 ${p.nom_loc} vs ${p.nom_vis} (id=${p.id}, fas=${p.fas})`);
        });
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
    
    let filasHtml = partidosHoy.map(p => renderizarFila(p)).join('');
    let infoCardHTML = renderizarInfoCard();
    
    contenedor.innerHTML = `
        <style>
            .ahora-container {
                background: rgba(255, 255, 255, 0.92);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border-radius: 20px;
                overflow: hidden;
                border: 1px solid rgba(255, 255, 255, 0.15);
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
                display: flex;
                flex-direction: column;
                max-height: calc(100vh - 140px);
            }
            .ahora-header {
                padding: 14px 12px 10px 12px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                text-align: center;
                flex-shrink: 0;
                background: rgba(255, 255, 255, 0.02);
            }
            .ahora-titulo {
                font-size: 16px;
                font-weight: 700;
                color: #1c1c1e;
                margin-bottom: 2px;
            }
            .ahora-badge {
                display: inline-block;
                background: linear-gradient(135deg, #007aff 0%, #5856d6 100%);
                color: white;
                padding: 3px 12px;
                border-radius: 20px;
                font-size: 10px;
                font-weight: 600;
                letter-spacing: 0.5px;
            }
            .ahora-tabla-wrapper {
                overflow-y: auto;
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
                flex: 1;
                padding: 4px 12px 4px 12px;
            }
            .ahora-tabla-wrapper::-webkit-scrollbar {
                width: 3px;
            }
            .ahora-tabla-wrapper::-webkit-scrollbar-track {
                background: transparent;
            }
            .ahora-tabla-wrapper::-webkit-scrollbar-thumb {
                background: rgba(0, 0, 0, 0.15);
                border-radius: 4px;
            }
            .ahora-tabla {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
            }
            .ahora-tabla th {
                padding: 8px 4px 6px 4px;
                text-align: center;
                color: #8e8e93;
                font-weight: 600;
                font-size: 11px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            }
            .ahora-tabla th:nth-child(1),
            .ahora-tabla td:nth-child(1) {
                width: 28%;
            }
            .ahora-tabla th:nth-child(2),
            .ahora-tabla td:nth-child(2) {
                width: 44%;
            }
            .ahora-tabla th:nth-child(3),
            .ahora-tabla td:nth-child(3) {
                width: 28%;
            }
            .ahora-fila:hover {
                background: rgba(0, 0, 0, 0.03);
                transition: background 0.2s ease;
            }
            .ahora-fila:active {
                transform: scale(0.99);
            }
            .ahora-footer {
                padding: 10px;
                text-align: center;
                border-top: 1px solid rgba(0, 0, 0, 0.04);
                font-size: 9px;
                color: rgba(0, 0, 0, 0.2);
                flex-shrink: 0;
                letter-spacing: 0.3px;
                background: rgba(255, 255, 255, 0.02);
            }
            @media (max-width: 600px) {
                .ahora-container {
                    max-height: calc(100vh - 120px);
                    border-radius: 16px;
                }
                .ahora-tabla-wrapper {
                    padding: 2px 8px 2px 8px;
                }
                .ahora-tabla td {
                    padding: 6px 3px;
                }
                .ahora-tabla td div span:first-child {
                    font-size: 26px;
                }
                .ahora-tabla td div span:nth-child(2) {
                    font-size: 10px;
                }
                .ahora-countdown {
                    font-size: 9px;
                }
                .ahora-header {
                    padding: 10px 8px 8px 8px;
                }
                .ahora-titulo {
                    font-size: 14px;
                }
                .ahora-badge {
                    font-size: 9px;
                }
            }
        </style>
        
        <div class="ahora-container">
            <div class="ahora-header">
                <div class="ahora-titulo">🏆 PARTIDOS DE HOY</div>
                <span class="ahora-badge">🎯 HAZ TUS PRONÓSTICOS</span>
            </div>
            
            ${infoCardHTML}
            
            <div class="ahora-tabla-wrapper">
                <table class="ahora-tabla">
                    <thead>
                        <tr>
                            <th>LOCAL</th>
                            <th>VS</th>
                            <th>VISITANTE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasHtml}
                    </tbody>
                </table>
            </div>
            
            <div class="ahora-footer">
                💡 Haz clic en cualquier fila para pronosticar
            </div>
        </div>
    `;
    
    // ========== EVENTO: CLICK EN FILA → REDIRIGIR A PARTIDOS CON SCROLL ==========
    document.querySelectorAll('.ahora-fila').forEach(fila => {
        fila.addEventListener('click', function() {
            if (globalCambiarVistaCallback) {
                const partidoId = this.dataset.id;
                // Pasar ID para scroll automático
                globalCambiarVistaCallback('partidos', currentJugador, null, 'todos', partidoId);
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
