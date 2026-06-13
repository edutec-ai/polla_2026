// ahora.js - Módulo de partidos de hoy
// VERSIÓN TABLA COMPACTA - 3 COLUMNAS
// Columnas: LOCAL | VS (VS + HORA + countdown/marcador + estado) | VISITANTE
// - Scroll vertical DENTRO de la card (no en la pantalla)
// - SIN scroll horizontal
// - Hora integrada dentro de la columna VS
// - SIN ícono de pronóstico
// - SIN fecha en el encabezado
// - Actualización de countdown cada minuto
// - Redirección a partidos.js al hacer clic en cualquier fila

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

// ========== SUSCRIPCIÓN AL SIMULADOR ==========
let simuladorSuscrito = false;

export function suscribirAhoraAlSimulador(callback) {
    if (!simuladorSuscrito && typeof callback === 'function') {
        simuladorSuscrito = true;
        console.log('[Ahora] Suscrito al simulador');
    }
}

export function refrescarAhora() {
    const contenedor = document.getElementById('ahora-contenedor');
    if (contenedor && currentJugador) {
        renderizarAhora(contenedor, currentJugador);
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
    
    if (diffMs <= 0) {
        return null;
    }
    
    const diffSegundos = Math.floor(diffMs / 1000);
    const horas = Math.floor(diffSegundos / 3600);
    const minutos = Math.floor((diffSegundos % 3600) / 60);
    
    if (horas >= 24) {
        const dias = Math.floor(horas / 24);
        const horasRest = horas % 24;
        return `Faltan ${dias}d ${horasRest}h`;
    }
    
    if (horas === 0 && minutos === 0) {
        return `Faltan <1m`;
    }
    
    if (horas === 0) {
        return `Faltan ${minutos}m`;
    }
    
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
            badgeIcono: '✅',
            editable: false 
        };
    }
    if (est === 2 || est === 3) {
        const golLoc = partido.gol_loc || 0;
        const golVis = partido.gol_vis || 0;
        return { 
            tipo: 'envivo',
            marcador: `${golLoc} - ${golVis}`,
            badge: 'EN VIVO',
            badgeColor: '#ff3b30',
            badgeIcono: '🔴',
            editable: false 
        };
    }
    return { 
        tipo: 'pendiente',
        marcador: null,
        badge: null,
        badgeColor: null,
        badgeIcono: null,
        editable: true 
    };
}

// ========== ACTUALIZAR COUNTDOWNS EN TIEMPO REAL ==========
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

// ========== RENDERIZAR PRINCIPAL (SIN SCROLL HORIZONTAL) ==========
async function renderizarAhora(contenedor, datosCuenta) {
    if (!contenedor) return;
    
    currentJugador = datosCuenta;
    detenerCountdownAhora();
    
    // Cargar pronósticos del usuario (para lógica interna)
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
            <div style="background: #fff; border-radius: 20px; padding: 20px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 16px;">⚽</div>
                <div style="color: #8e8e93;">No hay partidos programados para hoy</div>
            </div>
        `;
        return;
    }
    
    // Generar filas de la tabla
    let filasHtml = '';
    for (const p of partidosHoy) {
        const estado = getEstadoPartido(p);
        const countdown = calcularCountdown(p.fch?.split('T')[0], p.hor);
        const horaFormateada = formatearHora12h(p.hor);
        
        // Construir contenido de la columna VS (integrada)
        let vsContent = '';
        
        if (estado.tipo === 'terminado') {
            vsContent = `
                <div style="font-weight: 700; color: #8e8e93; margin-bottom: 8px;">VS</div>
                <div style="font-size: 14px; font-weight: 600; color: #007aff; margin-bottom: 8px;">${horaFormateada}</div>
                <div style="font-size: 18px; font-weight: 800; color: ${estado.badgeColor}; margin-bottom: 6px;">${estado.marcador}</div>
                <div style="display: inline-flex; align-items: center; gap: 4px; background: ${estado.badgeColor}15; padding: 4px 10px; border-radius: 20px;">
                    <span style="font-size: 12px;">${estado.badgeIcono}</span>
                    <span style="font-size: 11px; font-weight: 600; color: ${estado.badgeColor};">${estado.badge}</span>
                </div>
            `;
        } else if (estado.tipo === 'envivo') {
            vsContent = `
                <div style="font-weight: 700; color: #8e8e93; margin-bottom: 8px;">VS</div>
                <div style="font-size: 14px; font-weight: 600; color: #007aff; margin-bottom: 8px;">${horaFormateada}</div>
                <div style="font-size: 18px; font-weight: 800; color: ${estado.badgeColor}; margin-bottom: 6px;">${estado.marcador}</div>
                <div style="display: inline-flex; align-items: center; gap: 4px; background: ${estado.badgeColor}15; padding: 4px 10px; border-radius: 20px;">
                    <span style="font-size: 12px;">${estado.badgeIcono}</span>
                    <span style="font-size: 11px; font-weight: 600; color: ${estado.badgeColor};">${estado.badge}</span>
                </div>
            `;
        } else if (countdown) {
            vsContent = `
                <div style="font-weight: 700; color: #8e8e93; margin-bottom: 8px;">VS</div>
                <div style="font-size: 14px; font-weight: 600; color: #007aff; margin-bottom: 8px;">${horaFormateada}</div>
                <div class="ahora-countdown" data-fch="${p.fch?.split('T')[0]}" data-hor="${p.hor}" style="font-size: 13px; font-weight: 600; color: #ff9500;">${countdown}</div>
            `;
        } else {
            vsContent = `
                <div style="font-weight: 700; color: #8e8e93; margin-bottom: 8px;">VS</div>
                <div style="font-size: 14px; font-weight: 600; color: #007aff; margin-bottom: 8px;">${horaFormateada}</div>
                <div style="font-size: 11px; color: #8e8e93;">PENDIENTE</div>
            `;
        }
        
        // Ajustar nombres largos para móvil
        const nombreLocal = p.nom_loc.length > 12 ? p.nom_loc.substring(0, 10) + '...' : p.nom_loc;
        const nombreVisita = p.nom_vis.length > 12 ? p.nom_vis.substring(0, 10) + '...' : p.nom_vis;
        
        filasHtml += `
            <tr class="ahora-fila" data-id="${p.id}" style="cursor: pointer; border-bottom: 0.5px solid #f0f0f0;">
                <td style="padding: 12px 6px; text-align: center; vertical-align: middle;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        <span style="font-size: 36px;">${getBandera(p.nom_loc)}</span>
                        <span style="font-weight: 600; color: #1c1c1e; font-size: 12px;">${nombreLocal}</span>
                    </div>
                </td>
                <td style="padding: 12px 6px; text-align: center; vertical-align: middle;">
                    ${vsContent}
                </td>
                <td style="padding: 12px 6px; text-align: center; vertical-align: middle;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        <span style="font-size: 36px;">${getBandera(p.nom_vis)}</span>
                        <span style="font-weight: 600; color: #1c1c1e; font-size: 12px;">${nombreVisita}</span>
                    </div>
                </td>
              </tr>
        `;
    }
    
    contenedor.innerHTML = `
        <style>
            .ahora-tabla-container {
                background: #ffffff;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                display: flex;
                flex-direction: column;
                max-height: calc(100vh - 160px);
            }
            .ahora-header {
                padding: 16px 12px 10px 12px;
                border-bottom: 1px solid #e5e5ea;
                background: #ffffff;
                text-align: center;
                flex-shrink: 0;
            }
            .ahora-titulo {
                font-size: 18px;
                font-weight: 700;
                color: #1c1c1e;
                margin-bottom: 4px;
            }
            .ahora-badge {
                display: inline-block;
                background: linear-gradient(135deg, #007aff 0%, #5856d6 100%);
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                margin-top: 4px;
            }
            .ahora-tabla-wrapper {
                overflow-y: auto;
                overflow-x: hidden;
                -webkit-overflow-scrolling: touch;
                flex: 1;
            }
            .ahora-tabla {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
            }
            .ahora-tabla th {
                padding: 10px 4px;
                text-align: center;
                background: #f9f9fb;
                color: #8e8e93;
                font-weight: 600;
                font-size: 11px;
                border-bottom: 1px solid #e5e5ea;
                position: sticky;
                top: 0;
                z-index: 1;
            }
            /* Anchos de columna fijos para evitar desborde */
            .ahora-tabla th:nth-child(1),
            .ahora-tabla td:nth-child(1) {
                width: 30%;
            }
            .ahora-tabla th:nth-child(2),
            .ahora-tabla td:nth-child(2) {
                width: 40%;
            }
            .ahora-tabla th:nth-child(3),
            .ahora-tabla td:nth-child(3) {
                width: 30%;
            }
            .ahora-fila:hover {
                background: #f2f2f7;
                transition: background 0.2s ease;
            }
            .ahora-footer {
                padding: 12px;
                text-align: center;
                border-top: 1px solid #e5e5ea;
                background: #f9f9fb;
                font-size: 10px;
                color: #8e8e93;
                flex-shrink: 0;
            }
            @media (max-width: 600px) {
                .ahora-tabla th, .ahora-tabla td {
                    padding: 8px 3px;
                }
                .ahora-tabla td div span:first-child {
                    font-size: 28px;
                }
                .ahora-tabla td div span:nth-child(2) {
                    font-size: 10px;
                }
                .ahora-countdown {
                    font-size: 9px;
                }
                .ahora-header {
                    padding: 12px 8px 8px 8px;
                }
                .ahora-titulo {
                    font-size: 16px;
                }
                .ahora-badge {
                    font-size: 9px;
                    padding: 3px 10px;
                }
                .ahora-tabla-container {
                    max-height: calc(100vh - 140px);
                }
                .vs-content {
                    font-size: 11px;
                }
            }
        </style>
        
        <div class="ahora-tabla-container">
            <div class="ahora-header">
                <div class="ahora-titulo">🏆 PARTIDOS DE HOY</div>
                <div>
                    <span class="ahora-badge">🎯 HAGA SUS PRONÓSTICOS ACÁ 🎯</span>
                </div>
            </div>
            
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
                💡 Haz clic en cualquier fila para ver tu pronóstico y detalles
            </div>
        </div>
    `;
    
    // Eventos de clic en las filas
    document.querySelectorAll('.ahora-fila').forEach(fila => {
        fila.onclick = () => {
            if (globalCambiarVistaCallback) {
                globalCambiarVistaCallback('partidos', currentJugador);
                setTimeout(() => {
                    const tabTodos = document.querySelector('.partidos-tab[data-tab="todos"]');
                    if (tabTodos) tabTodos.click();
                }, 300);
            }
        };
    });
    
    // Iniciar countdowns si hay partidos pendientes
    if (document.querySelectorAll('.ahora-countdown').length > 0) {
        iniciarCountdownAhora();
    }
    
    // Manejar visibilidad de la página
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

export { renderizarAhora };
