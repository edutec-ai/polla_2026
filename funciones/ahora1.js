// funciones/ahora.js
// Pantalla "AHORA" - Con redirección al modal de partidos para el Partido Inaugural
// Actualización periódica: cada 60 segundos verifica cambios en los ciclos
// CICLO 2: PULSO 100 antes de inauguración, PULSO 50 después
// FONDO DE ESTADIO: 100% CSS (sin imágenes externas)

import { simGetFechaStr, simGetHoraStr, onSimuladorCambio } from './lab.js';
import { gruposSeleccion, finalistasSeleccion } from './especiales.js';
import { getBandera } from './banderas.js';
import { cargarPronosticosPartidosLocal, guardarPronosticosPartidosLocal } from './sync.js';

const BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

const FECHA_INAUGURAL = '2026-06-11';
const HORA_LIMITE_CICLO1 = '14:00';

let currentContenedor = null;
let currentDatosCuenta = null;
let tiempoRestanteInterval = null;
let actualizacionPeriodicaInterval = null;
let cambiarVistaCallback = null;
let pronosticosCache = {};

// Datos del partido inaugural
const PARTIDO_INAUGURAL = {
    id: 1,
    nom_loc: 'México',
    nom_vis: 'Sudáfrica',
    fch: '2026-06-11',
    hor: '14:00:00',
    fas: 1,
    grp_for: 'A',
    est: 1
};

export function setCambiarVistaCallback(callback) {
    cambiarVistaCallback = callback;
}

function mostrarToast(msg, tipo) {
    const toast = document.getElementById('app-toast');
    if (toast) {
        toast.textContent = msg;
        toast.className = 'toast ' + (tipo || '');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

function getPtsBase(fase) {
    const f = Number(fase);
    if (f === 1) return 20;
    if (f === 2) return 40;
    if (f === 3) return 60;
    if (f === 4) return 80;
    if (f === 5) return 100;
    if (f === 7) return 200;
    return 20;
}

async function cargarPronosticos(jugId) {
    if (!jugId) return;
    const locales = cargarPronosticosPartidosLocal();
    if (locales && Object.keys(locales).length > 0) {
        pronosticosCache = locales;
        return;
    }
    try {
        const response = await fetch(`${BASE_V2}/fifa_jug_pro?api_key=${KEY}&filter[id]=${jugId}&fields=jug,jug.name,id,ptd,pro_gol_loc,pro_gol_vis,pro_res`);
        const pronosticos = (await response.json()).fifa_jug_pro || [];
        pronosticosCache = {};
        pronosticos.forEach(p => { pronosticosCache[p.ptd] = { s1: p.pro_gol_loc || 0, s2: p.pro_gol_vis || 0 }; });
        guardarPronosticosPartidosLocal(pronosticosCache);
    } catch (error) {
        console.error('[AHORA] Error cargando pronósticos:', error);
    }
}

// ========== NUEVA FUNCIÓN: REDIRIGIR AL PARTIDO INAUGURAL EN PARTIDOS ==========
function irAlPartidoInaugural() {
    if (!cambiarVistaCallback) {
        console.error('[AHORA] No hay callback para cambiar vista');
        return;
    }
    
    console.log('[AHORA] Redirigiendo al Partido Inaugural en PARTIDOS');
    
    // Cambiar a la pestaña PARTIDOS
    cambiarVistaCallback('partidos', currentDatosCuenta);
    
    // Esperar a que se renderice la lista de partidos y abrir el modal del partido ID=1
    setTimeout(() => {
        const cardInaugural = document.querySelector('.partido-card[data-id="1"]');
        if (cardInaugural) {
            cardInaugural.click();
            console.log('[AHORA] Modal del Partido Inaugural abierto');
        } else {
            console.warn('[AHORA] No se encontró la card del partido inaugural');
            mostrarToast('Partido no encontrado', 'err');
        }
    }, 500);
}

// Función para navegar a especiales con pestaña específica
function irAEspeciales(tab) {
    if (typeof cambiarVistaCallback === 'function') {
        cambiarVistaCallback('especiales', currentDatosCuenta, tab);
    }
}

function esAntesDeInauguracion() {
    const fechaSim = simGetFechaStr();
    const horaSim = simGetHoraStr();
    if (fechaSim < FECHA_INAUGURAL) return true;
    if (fechaSim === FECHA_INAUGURAL && horaSim < HORA_LIMITE_CICLO1) return true;
    return false;
}

function tieneCiclo1Completo() {
    const gruposLista = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    for (const grupo of gruposLista) {
        const sel = gruposSeleccion[grupo] || {};
        if (!sel[1] || !sel[2]) return false;
    }
    return true;
}

function tieneCiclo2Completo() {
    return !!(finalistasSeleccion.campeon && finalistasSeleccion.subcampeon &&
        finalistasSeleccion.tercero && finalistasSeleccion.cuarto);
}

function navegarACiclo1() {
    if (!cambiarVistaCallback) return;
    cambiarVistaCallback('especiales', currentDatosCuenta);
    setTimeout(() => {
        const tab = document.querySelector('.esp-tab[data-tab="ciclo1"]');
        if (tab) {
            tab.click();
        } else {
            const tabs = document.querySelectorAll('.esp-tab');
            for (let t of tabs) {
                if (t.textContent.includes('CICLO 1')) {
                    t.click();
                    break;
                }
            }
        }
    }, 500);
}

function navegarACiclo2() {
    if (!cambiarVistaCallback) return;
    cambiarVistaCallback('especiales', currentDatosCuenta);
    setTimeout(() => {
        const tab = document.querySelector('.esp-tab[data-tab="ciclo2"]');
        if (tab) {
            tab.click();
        } else {
            const tabs = document.querySelectorAll('.esp-tab');
            for (let t of tabs) {
                if (t.textContent.includes('CICLO 2')) {
                    t.click();
                    break;
                }
            }
        }
    }, 500);
}

function navegarAReglas() {
    if (!cambiarVistaCallback) return;
    cambiarVistaCallback('reglas', currentDatosCuenta);
}

function calcularTiempoRestante() {
    const fechaActual = new Date();
    const fechaInauguracion = new Date(2026, 5, 11, 14, 0, 0);
    const diffMs = fechaInauguracion - fechaActual;
    
    if (diffMs <= 0) return null;
    
    const diffSegundos = Math.floor(diffMs / 1000);
    const dias = Math.floor(diffSegundos / 86400);
    const horas = Math.floor((diffSegundos % 86400) / 3600);
    const minutos = Math.floor((diffSegundos % 3600) / 60);
    const segundos = diffSegundos % 60;
    
    const partes = [];
    if (dias > 0) partes.push(`${dias}d`);
    if (horas > 0 || dias > 0) partes.push(`${horas}h`);
    if (minutos > 0 || (horas === 0 && dias === 0)) partes.push(`${minutos}m`);
    if (segundos > 0 && dias === 0 && horas === 0 && minutos < 5) partes.push(`${segundos}s`);
    
    if (partes.length === 0) return '<1m';
    return partes.join(' ');
}

function actualizarEstadoCards() {
    const ciclo1Completo = tieneCiclo1Completo();
    const ciclo2Completo = tieneCiclo2Completo();
    const antesInauguracion = esAntesDeInauguracion();
    
    const cardCiclo1 = document.querySelector('.ahora-card[data-accion="ciclo1"]');
    if (cardCiclo1) {
        if (ciclo1Completo) {
            cardCiclo1.classList.add('completado');
            const badge = cardCiclo1.querySelector('.ahora-card-badge');
            if (badge) {
                badge.textContent = '✅ COMPLETADO';
                badge.className = 'ahora-card-badge completado';
                badge.style.background = '#34c759';
            }
        } else {
            cardCiclo1.classList.remove('completado');
            const badge = cardCiclo1.querySelector('.ahora-card-badge');
            if (badge) {
                badge.textContent = '⚠️ PENDIENTE';
                badge.className = 'ahora-card-badge pendiente';
                badge.style.background = '#8e8e93';
            }
        }
    }
    
    const cardCiclo2 = document.querySelector('.ahora-card[data-accion="ciclo2"]');
    if (cardCiclo2) {
        if (ciclo2Completo) {
            cardCiclo2.classList.remove('ahora-card-urgente');
            cardCiclo2.classList.add('completado');
            const badge = cardCiclo2.querySelector('.ahora-card-badge');
            if (badge) {
                badge.textContent = '✅ COMPLETADO';
                badge.className = 'ahora-card-badge completado';
                badge.style.background = '#34c759';
            }
            const descSpan = cardCiclo2.querySelector('.ahora-card-desc strong');
            if (descSpan) descSpan.parentElement.innerHTML = 'Pronostica quiénes serán: Campeón, Subcampeón, Tercer y Cuarto puesto.';
        } else {
            cardCiclo2.classList.remove('completado');
            cardCiclo2.classList.add('ahora-card-urgente');
            const badge = cardCiclo2.querySelector('.ahora-card-badge');
            if (badge) {
                if (antesInauguracion) {
                    badge.textContent = '🟢 PULSO 100';
                    badge.className = 'ahora-card-badge';
                    badge.style.background = '#34c759';
                } else {
                    badge.textContent = '🟡 PULSO 50';
                    badge.className = 'ahora-card-badge pulso50';
                    badge.style.background = '#ff9500';
                }
            }
            const descContainer = cardCiclo2.querySelector('.ahora-card-desc');
            if (descContainer) {
                if (antesInauguracion) {
                    descContainer.innerHTML = `Pronostica quiénes serán: Campeón, Subcampeón, Tercer y Cuarto puesto. <strong style="color:#34c759;">🟢 PULSO 100: Puntos completos</strong>`;
                } else {
                    descContainer.innerHTML = `Pronostica quiénes serán: Campeón, Subcampeón, Tercer y Cuarto puesto. <strong style="color:#ff9500;">🟡 PULSO 50: Puntos a la mitad</strong>`;
                }
            }
        }
    }
    
    actualizarCountdownTexto();
}

function actualizarCountdownTexto() {
    const countdownElement = document.getElementById('ahora-countdown');
    if (countdownElement) {
        const tiempoRestante = calcularTiempoRestante();
        if (tiempoRestante) {
            countdownElement.textContent = `⏱️ Faltan ${tiempoRestante} para la inauguración`;
        } else {
            countdownElement.style.display = 'none';
        }
    }
}

// Obtener el pronóstico del partido inaugural desde el cache global
function obtenerPronosticoInaugural() {
    const pronostico = pronosticosCache[PARTIDO_INAUGURAL.id];
    if (pronostico) {
        return `${pronostico.s1} - ${pronostico.s2}`;
    }
    return '? - ?';
}

function renderizarPreInauguracion(contenedor) {
    const ciclo1Completo = tieneCiclo1Completo();
    const ciclo2Completo = tieneCiclo2Completo();
    const tiempoRestante = calcularTiempoRestante();
    const antesInauguracion = esAntesDeInauguracion();
    
    const pronosticoInaugural = obtenerPronosticoInaugural();
    
    const ciclo2Badge = !ciclo2Completo 
        ? (antesInauguracion 
            ? '<div class="ahora-card-badge" style="background:#34c759;">🟢 PULSO 100</div>' 
            : '<div class="ahora-card-badge pulso50">🟡 PULSO 50</div>')
        : '<div class="ahora-card-badge completado">✅ COMPLETADO</div>';
    
    const ciclo2Desc = !ciclo2Completo
        ? (antesInauguracion
            ? 'Pronostica quiénes serán: Campeón, Subcampeón, Tercer y Cuarto puesto. <strong style="color:#34c759;">🟢 PULSO 100: Puntos completos</strong>'
            : 'Pronostica quiénes serán: Campeón, Subcampeón, Tercer y Cuarto puesto. <strong style="color:#ff9500;">🟡 PULSO 50: Puntos a la mitad</strong>')
        : 'Pronostica quiénes serán: Campeón, Subcampeón, Tercer y Cuarto puesto.';
    
    contenedor.innerHTML = `
        <div style="width:100%; height:100%; background: #ffffff; border-radius: 20px; overflow-y: auto; overflow-x: hidden;">
            <style>
                .ahora-header { 
                    background: linear-gradient(135deg, #0a2f1f 0%, #1a5a3a 100%);
                    padding: 16px 20px; 
                    text-align: center; 
                    color: white;
                    height: 150px; 
                    border-radius: 20px 20px 0 0;
                    position: relative;
                    overflow: hidden;
                }
                
                .ahora-header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 20px);
                    pointer-events: none;
                }
                
                .ahora-header .gradas-top {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 25%;
                    background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%);
                    pointer-events: none;
                }
                
                .ahora-header .gradas-bottom {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 25%;
                    background: linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%);
                    pointer-events: none;
                }
                
                .ahora-header .circulo-central {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 100px;
                    height: 100px;
                    border: 2px solid rgba(255,255,255,0.15);
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                }
                
                .ahora-header .linea-medio {
                    position: absolute;
                    top: 0;
                    left: 50%;
                    width: 2px;
                    height: 100%;
                    background: rgba(255,255,255,0.15);
                    transform: translateX(-50%);
                    pointer-events: none;
                }
                
                .ahora-header .punto-central {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 6px;
                    height: 6px;
                    background: rgba(255,255,255,0.3);
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                }
                
                .ahora-header .textura-puntos {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px);
                    background-size: 25px 25px;
                    pointer-events: none;
                }
                
                .ahora-header h2 { 
                    font-size: 18px; 
                    font-weight: 700; 
                    margin: 0 0 4px 0; 
                    color: white; 
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                    position: relative;
                    z-index: 5;
                }
                
                .ahora-header p { 
                    font-size: 12px; 
                    opacity: 0.95; 
                    margin: 0;
                    position: relative;
                    z-index: 5;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                }
                
                .ahora-countdown { 
                    background: rgba(0,0,0,0.5); 
                    backdrop-filter: blur(4px);
                    border-radius: 20px; 
                    padding: 4px 12px; 
                    display: inline-block; 
                    margin-top: 8px; 
                    font-size: 11px; 
                    font-weight: 600;
                    position: relative;
                    z-index: 5;
                }
                
                .ahora-cards { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
                
                .ahora-card { 
                    background: #f9f9fb; 
                    border: 3px solid #e5e5ea; 
                    border-radius: 14px; 
                    padding: 12px 16px; 
                    cursor: pointer; 
                    transition: all 0.2s ease; 
                    display: flex; 
                    align-items: center; 
                    gap: 12px; 
                }
                
                .ahora-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
                .ahora-card:active { transform: scale(0.98); }
                .ahora-card.completado { opacity: 0.7; }
                .ahora-card-icono { font-size: 32px; flex-shrink: 0; }
                .ahora-card-info { flex: 1; }
                .ahora-card-titulo { font-size: 14px; font-weight: 700; color: #1c1c1e; margin-bottom: 2px; }
                .ahora-card-desc { font-size: 11px; color: #8e8e93; line-height: 1.3; }
                .ahora-card-badge { background: #ff9500; color: white; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 700; flex-shrink: 0; white-space: nowrap; }
                .ahora-card-badge.pulso50 { background: #ff9500; }
                .ahora-card-badge.completado { background: #34c759; }
                .ahora-card-badge.pendiente { background: #8e8e93; }
                .ahora-card-flecha { font-size: 14px; color: #c7c7cc; flex-shrink: 0; }
                .ahora-footer { padding: 10px 16px; text-align: center; border-top: 1px solid #e5e5ea; margin-top: 4px; }
                .ahora-footer-text { font-size: 10px; color: #8e8e93; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
                .ahora-card-urgente { border: 1.5px solid #ff3b30; animation: pulse 1.5s ease-in-out infinite; }
            </style>
            
            <div class="ahora-header">
                <div class="gradas-top"></div>
                <div class="gradas-bottom"></div>
                <div class="circulo-central"></div>
                <div class="linea-medio"></div>
                <div class="punto-central"></div>
                <div class="textura-puntos"></div>
                <h2>🏆 La Polla Mundialista 2026</h2>
                <p>¡Bienvenido, ${currentDatosCuenta?.name || currentDatosCuenta?.nombre || 'Participante'}!</p>
                ${tiempoRestante ? `<div class="ahora-countdown" id="ahora-countdown">⏱️ Faltan ${tiempoRestante} para la inauguración</div>` : ''}
            </div>
            
            <div class="ahora-cards">
                <div class="ahora-card ${ciclo1Completo ? 'completado' : ''}" data-accion="ciclo1">
                    <div class="ahora-card-icono">📋</div>
                    <div class="ahora-card-info">
                        <div class="ahora-card-titulo">CICLO 1 · Los dos mejores de cada grupo</div>
                        <div class="ahora-card-desc">Selecciona los dos equipos que avanzarán a octavos de final en cada uno de los 12 grupos. ${!ciclo1Completo ? '<strong style="color:#007aff;">🔴 Cierra el 11/06 2:00 PM</strong>' : ''}</div>
                    </div>
                    ${ciclo1Completo ? '<div class="ahora-card-badge completado">✅ COMPLETADO</div>' : '<div class="ahora-card-badge pendiente">⚠️ PENDIENTE</div>'}
                    <div class="ahora-card-flecha">→</div>
                </div>
                
                <div class="ahora-card ${ciclo2Completo ? 'completado' : ''}" data-accion="ciclo2">
                    <div class="ahora-card-icono">🏆</div>
                    <div class="ahora-card-info">
                        <div class="ahora-card-titulo">CICLO 2 · Los cuatro finalistas del torneo</div>
                        <div class="ahora-card-desc">${ciclo2Desc}</div>
                    </div>
                    ${ciclo2Badge}
                    <div class="ahora-card-flecha">→</div>
                </div>
                
                <!-- ========== CARD PARTIDO INAUGURAL REDIRIGE A PARTIDOS ========== -->
                <div class="ahora-card" data-accion="partido-inaugural">
                    <div class="ahora-card-icono">⚽</div>
                    <div class="ahora-card-info">
                        <div class="ahora-card-titulo">Partido Inaugural</div>
                        <div class="ahora-card-desc">🇲🇽 México vs Sudáfrica 🇿🇦 · 11 de junio, 2:00 PM<br><strong>Tu pronóstico: ${pronosticoInaugural}</strong></div>
                    </div>
                    <div class="ahora-card-flecha">→</div>
                </div>
                
                <div class="ahora-card" data-accion="reglas">
                    <div class="ahora-card-icono">📖</div>
                    <div class="ahora-card-info">
                        <div class="ahora-card-titulo">Reglas del juego</div>
                        <div class="ahora-card-desc">Aprende cómo funciona La Polla, los ciclos y el sistema de puntos</div>
                    </div>
                    <div class="ahora-card-flecha">→</div>
                </div>
            </div>
            
            <div class="ahora-footer">
                <div class="ahora-footer-text">💡 Completa los CICLOS 1 y 2 antes del inicio del mundial para obtener la máxima puntuación</div>
            </div>
        </div>
    `;
    
    const cardCiclo1 = contenedor.querySelector('.ahora-card[data-accion="ciclo1"]');
    const cardCiclo2 = contenedor.querySelector('.ahora-card[data-accion="ciclo2"]');
    const cardPartido = contenedor.querySelector('.ahora-card[data-accion="partido-inaugural"]');
    const cardReglas = contenedor.querySelector('.ahora-card[data-accion="reglas"]');
    
    if (cardCiclo1) cardCiclo1.addEventListener('click', () => navegarACiclo1());
    if (cardCiclo2) cardCiclo2.addEventListener('click', () => navegarACiclo2());
    if (cardPartido) cardPartido.addEventListener('click', () => irAlPartidoInaugural()); // ✅ Redirige a PARTIDOS
    if (cardReglas) cardReglas.addEventListener('click', () => navegarAReglas());
}

function renderizarDuranteMundial(contenedor) {
    if (actualizacionPeriodicaInterval) {
        clearInterval(actualizacionPeriodicaInterval);
        actualizacionPeriodicaInterval = null;
    }
    
    contenedor.innerHTML = `
        <div style="width:100%; height:100%; background: #ffffff; border-radius: 20px; display: flex; align-items: center; justify-content: center;">
            <div style="text-align: center; color: #8e8e93;">
                <div style="font-size: 48px; margin-bottom: 16px;">🏆</div>
                <div style="font-size: 16px; font-weight: 600;">Mundial en curso</div>
                <div style="font-size: 12px; margin-top: 8px;">Usa el menú para ver partidos y especiales</div>
            </div>
        </div>
    `;
}

export async function renderizarAhora(contenedor, datosCuenta) {
    if (!contenedor) return;
    currentContenedor = contenedor;
    currentDatosCuenta = datosCuenta;
    
    await cargarPronosticos(datosCuenta.id);
    
    if (tiempoRestanteInterval) {
        clearInterval(tiempoRestanteInterval);
        tiempoRestanteInterval = null;
    }
    if (actualizacionPeriodicaInterval) {
        clearInterval(actualizacionPeriodicaInterval);
        actualizacionPeriodicaInterval = null;
    }
    
    if (esAntesDeInauguracion()) {
        renderizarPreInauguracion(contenedor);
        
        tiempoRestanteInterval = setInterval(() => {
            if (esAntesDeInauguracion()) {
                actualizarCountdownTexto();
                // También actualizar el pronóstico mostrado
                const pronosticoInaugural = obtenerPronosticoInaugural();
                const cardDesc = document.querySelector('.ahora-card[data-accion="partido-inaugural"] .ahora-card-desc');
                if (cardDesc) {
                    const textoActual = cardDesc.innerHTML;
                    const nuevoTexto = textoActual.replace(/Tu pronóstico: .*?(?=<br|$)/, `Tu pronóstico: ${pronosticoInaugural}`);
                    if (nuevoTexto !== textoActual) {
                        cardDesc.innerHTML = nuevoTexto;
                    }
                }
            } else {
                clearInterval(tiempoRestanteInterval);
                tiempoRestanteInterval = null;
                renderizarDuranteMundial(contenedor);
            }
        }, 1000);
        
        actualizacionPeriodicaInterval = setInterval(() => {
            if (esAntesDeInauguracion()) {
                actualizarEstadoCards();
                // Recargar pronósticos para actualizar el marcador del inaugural
                cargarPronosticos(datosCuenta.id).then(() => {
                    const pronosticoInaugural = obtenerPronosticoInaugural();
                    const cardDesc = document.querySelector('.ahora-card[data-accion="partido-inaugural"] .ahora-card-desc');
                    if (cardDesc) {
                        const textoActual = cardDesc.innerHTML;
                        const nuevoTexto = textoActual.replace(/Tu pronóstico: .*?(?=<br|$)/, `Tu pronóstico: ${pronosticoInaugural}`);
                        if (nuevoTexto !== textoActual) {
                            cardDesc.innerHTML = nuevoTexto;
                        }
                    }
                });
            } else {
                clearInterval(actualizacionPeriodicaInterval);
                actualizacionPeriodicaInterval = null;
            }
        }, 60000);
    } else {
        renderizarDuranteMundial(contenedor);
    }
}

export function suscribirAhoraAlSimulador() {
    onSimuladorCambio(() => {
        if (currentContenedor && currentDatosCuenta) {
            renderizarAhora(currentContenedor, currentDatosCuenta);
        }
    });
}
