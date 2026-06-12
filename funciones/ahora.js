// ahora.js - Módulo de partidos de hoy
// Muestra SOLO los partidos programados para la fecha actual con countdowns

import { cargarPartidos, getBandera, formatearHora12h } from './partidos.js';

let currentJugador = null;
let pronosticosCache = {};

// ========== CALLBACK PARA CAMBIAR VISTA ==========
let globalCambiarVistaCallback = null;

function setCambiarVistaCallback(callback) {
    globalCambiarVistaCallback = callback;
}

// ========== SUSCRIPCIÓN AL SIMULADOR ==========
let simuladorSuscrito = false;
let simuladorCallback = null;

function suscribirAhoraAlSimulador(callback) {
    if (!simuladorSuscrito && typeof callback === 'function') {
        simuladorSuscrito = true;
        simuladorCallback = callback;
        console.log('[Ahora] Suscrito al simulador');
    }
}

// Función para refrescar cuando el simulador cambie
function refrescarAhora() {
    const contenedor = document.getElementById('ahora-contenedor');
    if (contenedor && currentJugador) {
        renderizarAhora(contenedor, currentJugador);
    }
}

// ========== CORRECCIÓN DE FECHAS SEGÚN VELNEO ==========
function corregirFechasSegunVelneo(partidos) {
    return partidos.map(p => {
        // Canadá vs Bosnia → 12/06/2026 14:00
        if ((p.nom_loc === 'Canadá' && p.nom_vis === 'Bosnia') ||
            (p.nom_loc === 'Bosnia' && p.nom_vis === 'Canadá')) {
            return { ...p, fch: '2026-06-12', hor: '14:00:00', est: 1 };
        }
        // EE.UU. vs Paraguay → 12/06/2026 20:00
        if ((p.nom_loc === 'EE. UU.' && p.nom_vis === 'Paraguay') ||
            (p.nom_loc === 'Paraguay' && p.nom_vis === 'EE. UU.')) {
            return { ...p, fch: '2026-06-12', hor: '20:00:00', est: 1 };
        }
        return p;
    });
}

// ========== FILTRAR SOLO PARTIDOS DE HOY ==========
function obtenerPartidosDeHoy(partidos) {
    const hoy = new Date().toISOString().split('T')[0]; // 2026-06-12
    return partidos.filter(p => {
        const fechaPartido = p.fch?.split('T')[0];
        return fechaPartido === hoy && Number(p.est) !== 4;
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
        return { texto: '🟡 YA COMENZÓ', negativo: true };
    }
    
    const horas = Math.floor(diffMs / (1000 * 60 * 60));
    const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (horas >= 24) {
        const dias = Math.floor(horas / 24);
        const horasRest = horas % 24;
        return { 
            texto: `⏱️ Faltan ${dias} día${dias > 1 ? 's' : ''} y ${horasRest} ${horasRest === 1 ? 'hora' : 'horas'}`,
            negativo: false 
        };
    }
    
    if (horas === 0 && minutos === 0) {
        return { texto: '⏱️ Faltan menos de un minuto', negativo: false };
    }
    
    if (horas === 0) {
        return { 
            texto: `⏱️ Faltan ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`,
            negativo: false 
        };
    }
    
    return { 
        texto: `⏱️ Faltan ${horas} ${horas === 1 ? 'hora' : 'horas'} y ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`,
        negativo: false 
    };
}

// ========== ACTUALIZAR COUNTDOWNS EN TIEMPO REAL ==========
let countdownInterval = null;
let countdownActivo = false;

function actualizarCountdownsEnCards() {
    const countdownElements = document.querySelectorAll('.ahora-countdown');
    if (countdownElements.length === 0) return;
    
    countdownElements.forEach(el => {
        const fechaPartido = el.dataset.fch;
        const horaPartido = el.dataset.hor;
        if (fechaPartido && horaPartido) {
            const countdown = calcularCountdown(fechaPartido, horaPartido);
            if (countdown) {
                el.textContent = countdown.texto;
                if (countdown.negativo) {
                    el.style.color = '#ff3b30';
                } else {
                    el.style.color = '#ff9500';
                }
            }
        }
    });
}

function iniciarCountdownAhora() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        if (!document.hidden && countdownActivo) {
            actualizarCountdownsEnCards();
        }
    }, 1000);
    countdownActivo = true;
}

function detenerCountdownAhora() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    countdownActivo = false;
}

// ========== MOSTRAR TOAST ==========
function mostrarToast(msg, tipo) {
    const toast = document.getElementById('app-toast');
    if (toast) {
        toast.textContent = msg;
        toast.className = 'toast ' + (tipo || '');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

// ========== GUARDAR PRONÓSTICO ==========
const BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

// Función para cambiar el tab de partidos.js a 'todos'
function cambiarTabPartidosATodos() {
    // Disparar evento personalizado que partidos.js escuchará
    const event = new CustomEvent('cambiarTabPartidos', { detail: { tab: 'todos' } });
    window.dispatchEvent(event);
    
    // También intentar directamente si el elemento existe
    const tabTodos = document.querySelector('.partidos-tab[data-tab="todos"]');
    if (tabTodos) {
        tabTodos.click();
    }
}

// ========== RENDERIZAR PRINCIPAL ==========
async function renderizarAhora(contenedor, datosCuenta) {
    if (!contenedor) return;
    
    currentJugador = datosCuenta;
    detenerCountdownAhora();
    
    if (currentJugador) {
        try {
            const response = await fetch(`${BASE_V2}/fifa_jug_pro?api_key=${KEY}&filter[id]=${currentJugador.id}`);
            const data = await response.json();
            pronosticosCache = {};
            (data.fifa_jug_pro || []).forEach(p => {
                pronosticosCache[p.ptd] = { s1: p.pro_gol_loc || 0, s2: p.pro_gol_vis || 0 };
            });
        } catch (error) {
            console.error('Error cargando pronósticos:', error);
        }
    }
    
    let partidos = await cargarPartidos();
    partidos = corregirFechasSegunVelneo(partidos);
    const partidosHoy = obtenerPartidosDeHoy(partidos);
    
    if (partidosHoy.length === 0) {
        contenedor.innerHTML = `
            <div style="padding:20px;text-align:center;color:#8e8e93;">
                ⚽ No hay partidos programados para hoy
            </div>
        `;
        return;
    }
    
    contenedor.innerHTML = `
        <div style="padding:16px;">
            <h2 style="font-size:18px;margin-bottom:16px;">⚽ Partidos de hoy</h2>
            <div id="ahora-partidos-lista">
                ${partidosHoy.map(p => {
                    const countdown = calcularCountdown(p.fch.split('T')[0], p.hor);
                    const pronosticoHTML = `<div class="ahora-pronostico" style="margin-top:12px;text-align:center;padding-top:8px;border-top:1px solid #e5e5ea;">
                        <span style="font-size:12px;color:#007aff;font-weight:500;">⚽ Haga su pronóstico acá!</span>
                    </div>`;
                    
                    return `
                        <div class="ahora-card" data-id="${p.id}" style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;border:1.5px solid #007aff;cursor:pointer;">
                            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                                <span style="font-size:12px;color:#8e8e93;">Grupo ${p.grupoCalculado || '?'}</span>
                                <span style="font-size:12px;color:#8e8e93;">${formatearHora12h(p.hor)}</span>
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
                            <div style="margin-top:12px;text-align:center;">
                                <span class="ahora-countdown" data-fch="${p.fch.split('T')[0]}" data-hor="${p.hor}" style="font-size:14px;font-weight:600;color:${countdown.negativo ? '#ff3b30' : '#ff9500'};">${countdown.texto}</span>
                            </div>
                            ${pronosticoHTML}
                        </div>
                    `;
                }).join('')}
            </div>
            <p style="font-size:11px;color:#8e8e93;text-align:center;margin-top:16px;">
                💡 Haz clic en cualquier partido para hacer tu pronóstico
            </p>
        </div>
    `;
    
    // CAMBIO IMPORTANTE: Al hacer clic en cualquier card, redirige a partidos.js/todos
    document.querySelectorAll('.ahora-card').forEach(card => {
        card.onclick = () => {
            // Cambiar a la vista 'partidos' usando el callback global
            if (globalCambiarVistaCallback) {
                globalCambiarVistaCallback('partidos', currentJugador);
            }
            // Cambiar el tab activo a 'todos' en partidos.js
            cambiarTabPartidosATodos();
        };
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
                actualizarCountdownsEnCards();
            }
        }
    };
    
    document.removeEventListener('visibilitychange', visibilityHandler);
    document.addEventListener('visibilitychange', visibilityHandler);
}

// ========== EXPORTACIONES ==========
export { 
    setCambiarVistaCallback, 
    suscribirAhoraAlSimulador, 
    refrescarAhora, 
    renderizarAhora 
};
