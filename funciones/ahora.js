// funciones/ahora.js
// Pantalla "AHORA" - VERSIÓN CON PARTIDOS DEL DÍA Y GRUPOS CORREGIDOS
// - Card 1: Partidos del día con grupo correcto (A, B, C, etc.)
// - Card 2 y Card 3 ocultas (comentadas)

import { simGetFechaStr, simGetHoraStr, onSimuladorCambio } from './lab.js';
import { getBandera } from './banderas.js';
import { cargarPronosticosPartidosLocal, guardarPronosticosPartidosLocal } from './sync.js';

const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
const BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

// ========== MAPEO HARCODEADO DE GRUPOS ==========
const GRUPOS_POR_EQUIPO = {
    'México': 'A', 'Sudáfrica': 'A', 'República de Corea': 'A', 'Corea': 'A',
    'Corea del Sur': 'A', 'República Checa': 'A', 'Chequia': 'A',
    'Canadá': 'B', 'Bosnia': 'B', 'Bosnia y Herzegovina': 'B', 'Catar': 'B', 'Suiza': 'B',
    'Brasil': 'C', 'Marruecos': 'C', 'Haití': 'C', 'Escocia': 'C',
    'Estados Unidos': 'D', 'EE. UU.': 'D', 'Paraguay': 'D', 'Australia': 'D', 'Turquía': 'D',
    'Alemania': 'E', 'Curazao': 'E', 'Costa de Marfil': 'E', 'C. de Marfil': 'E', 'Ecuador': 'E',
    'Países Bajos': 'F', 'Japón': 'F', 'Suecia': 'F', 'Tunez': 'F',
    'Bélgica': 'G', 'Egipto': 'G', 'Irán': 'G', 'RI de Irán': 'G', 'Nueva Zelanda': 'G', 'N. Zelanda': 'G',
    'España': 'H', 'Islas de Cabo Verde': 'H', 'Cabo Verde': 'H', 'Arabia Saudí': 'H', 'Arabia Saudita': 'H', 'Uruguay': 'H',
    'Francia': 'I', 'Senegal': 'I', 'Irak': 'I', 'Noruega': 'I',
    'Argentina': 'J', 'Argelia': 'J', 'Austria': 'J', 'Jordania': 'J',
    'Portugal': 'K', 'RD Congo': 'K', 'República Democrática del Congo': 'K', 'Uzbekistán': 'K', 'Colombia': 'K',
    'Inglaterra': 'L', 'Croacia': 'L', 'Ghana': 'L', 'Panamá': 'L'
};

function obtenerGrupoPorEquipo(nombreEquipo) {
    if (!nombreEquipo) return null;
    const nombreLimpio = nombreEquipo.trim();
    return GRUPOS_POR_EQUIPO[nombreLimpio] || null;
}

let currentContenedor = null;
let currentDatosCuenta = null;
let actualizacionPeriodicaInterval = null;
let cambiarVistaCallback = null;
let pronosticosCache = {};
let partidosCache = [];
let resultadosRealesCache = {};

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

function obtenerFechaReal() {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = String(ahora.getMonth() + 1).padStart(2, '0');
    const day = String(ahora.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatearHora12h(horaStr) {
    if (!horaStr) return '';
    const horaLimpia = horaStr.split(':').slice(0, 2).join(':');
    const [hora, minuto] = horaLimpia.split(':');
    let horaNum = parseInt(hora);
    const periodo = horaNum >= 12 ? 'pm' : 'am';
    if (horaNum > 12) horaNum -= 12;
    if (horaNum === 0) horaNum = 12;
    return `${horaNum}:${minuto}`;
}

async function cargarPartidos() {
    try {
        const timestamp = Date.now();
        const response = await fetch(`${BASE}/fifa_ptd?api_key=${KEY}&_=${timestamp}`);
        const data = await response.json();
        partidosCache = data.fifa_ptd || [];
        
        // Asignar grupo a cada partido
        partidosCache.forEach(p => {
            let grupo = obtenerGrupoPorEquipo(p.nom_loc);
            if (!grupo) {
                grupo = obtenerGrupoPorEquipo(p.nom_vis);
            }
            p.grupoCalculado = grupo;
            if (!p.grp_for && grupo) {
                p.grp_for = grupo;
            }
        });
        
        const responseReales = await fetch(`${BASE}/fifa_ptd?api_key=${KEY}&filter[est]=4&_=${timestamp}`);
        const dataReales = await responseReales.json();
        resultadosRealesCache = {};
        (dataReales.fifa_ptd || []).forEach(p => { 
            resultadosRealesCache[p.id] = { 
                gol_loc: p.t90_gol_loc, 
                gol_vis: p.t90_gol_vis, 
                est: p.est 
            }; 
        });
        
        return partidosCache;
    } catch (error) { 
        console.error('Error cargando partidos:', error); 
        return []; 
    }
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

function irAPartidos() {
    if (typeof cambiarVistaCallback === 'function') {
        cambiarVistaCallback('partidos', currentDatosCuenta);
    }
}

function getEstadoPartido(partido) {
    const est = Number(partido.est);
    
    if (est === 4) {
        return { estado: 'terminado', texto: 'FIN', icono: '🏁' };
    }
    if (est === 2 || est === 3) {
        return { estado: 'envivo', texto: 'EN VIVO', icono: '🔴' };
    }
    return { estado: 'pendiente', texto: '', icono: '' };
}

function getResultadoReal(partidoId) { 
    const real = resultadosRealesCache[partidoId]; 
    return real && real.gol_loc !== null ? { gol_loc: real.gol_loc, gol_vis: real.gol_vis } : null; 
}

function obtenerPartidosDelDia() {
    const fechaActual = obtenerFechaReal();
    const partidosDelDia = partidosCache.filter(p => {
        const fechaPartido = p.fch ? p.fch.split('T')[0] : '';
        return fechaPartido === fechaActual && p.fas === 1;
    });
    
    partidosDelDia.sort((a, b) => {
        return (a.hor || '00:00:00').localeCompare(b.hor || '00:00:00');
    });
    
    return partidosDelDia;
}

function renderizarPartidosDelDia() {
    const partidosDelDia = obtenerPartidosDelDia();
    
    if (partidosDelDia.length === 0) {
        return `
            <div style="text-align: center; padding: 12px; color: #8e8e93;">
                <div style="font-size: 16px; margin-bottom: 2px;">📅</div>
                <div style="font-size: 11px;">No hay partidos hoy</div>
            </div>
        `;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    
    partidosDelDia.forEach(partido => {
        const estado = getEstadoPartido(partido);
        const resultadoReal = getResultadoReal(partido.id);
        
        const fechaObj = new Date(partido.fch);
        const diasSemana = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' };
        const meses = { 0: 'Ene', 1: 'Feb', 2: 'Mar', 3: 'Abr', 4: 'May', 5: 'Jun', 6: 'Jul', 7: 'Ago', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dic' };
        const diaSemana = diasSemana[fechaObj.getDay()];
        const dia = fechaObj.getDate();
        const mes = meses[fechaObj.getMonth()];
        const horaFormateada = partido.hor ? formatearHora12h(partido.hor) : '';
        
        // Usar grp_for o grupoCalculado
        const grupoDisplay = partido.grp_for || (partido.grupoCalculado ? `Grupo ${partido.grupoCalculado}` : 'Grupo ?');
        
        let centroHtml = '';
        let borderColor = '#007aff';
        
        if (estado.estado === 'terminado' && resultadoReal) {
            borderColor = '#34c759';
            centroHtml = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                    <span style="font-size: 14px; font-weight: 700; color: #1c1c1e;">${resultadoReal.gol_loc}</span>
                    <span style="font-size: 11px; color: #8e8e93;">-</span>
                    <span style="font-size: 14px; font-weight: 700; color: #1c1c1e;">${resultadoReal.gol_vis}</span>
                    <span style="background: #34c75920; color: #34c759; padding: 2px 5px; border-radius: 8px; font-size: 8px; font-weight: 600;">FIN</span>
                </div>
            `;
        } else if (estado.estado === 'envivo') {
            borderColor = '#ff3b30';
            centroHtml = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 3px;">
                    <span style="color: #ff3b30; font-size: 10px;">🔴</span>
                    <span style="color: #ff3b30; font-size: 10px; font-weight: 600;">EN VIVO</span>
                </div>
            `;
        } else {
            borderColor = '#007aff';
            centroHtml = `
                <div style="display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 12px; font-weight: 700; color: #007aff;">VS</span>
                </div>
            `;
        }
        
        html += `
            <div style="background: #f9f9fb; border-radius: 12px; padding: 8px 10px; border-left: 3px solid ${borderColor}; cursor: pointer;" data-id="${partido.id}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 9px; font-weight: 600; color: #8e8e93;">${grupoDisplay}</span>
                    <span style="font-size: 9px; color: #8e8e93;">${diaSemana} ${dia} ${mes} · ${horaFormateada}</span>
                </div>
                
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-width: 0;">
                        <span style="font-size: 28px;">${getBandera(partido.nom_loc)}</span>
                        <span style="font-size: 10px; font-weight: 500; color: #1c1c1e; text-align: center; word-break: break-word; max-width: 80px; line-height: 1.2;">${partido.nom_loc}</span>
                    </div>
                    
                    <div style="flex-shrink: 0; min-width: 65px; text-align: center;">
                        ${centroHtml}
                    </div>
                    
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-width: 0;">
                        <span style="font-size: 28px;">${getBandera(partido.nom_vis)}</span>
                        <span style="font-size: 10px; font-weight: 500; color: #1c1c1e; text-align: center; word-break: break-word; max-width: 80px; line-height: 1.2;">${partido.nom_vis}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

async function renderizarAhoraContent() {
    await cargarPartidos();
    
    const partidosDelDiaHtml = renderizarPartidosDelDia();
    
    const html = `
        <div style="width:100%; height:100%; background: #ffffff; border-radius: 20px; overflow-y: auto; overflow-x: hidden;">
            <style>
                .ahora-header { 
                    background: linear-gradient(135deg, #0a2f1f 0%, #1a5a3a 100%);
                    padding: 16px 20px; 
                    text-align: center; 
                    color: white;
                    border-radius: 20px 20px 0 0;
                }
                .ahora-header h2 { 
                    font-size: 18px; 
                    font-weight: 700; 
                    margin: 0 0 4px 0; 
                }
                .ahora-header p { 
                    font-size: 12px; 
                    opacity: 0.95; 
                    margin: 0;
                }
                .ahora-cards { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
                .ahora-card { 
                    background: #f9f9fb; 
                    border: 1px solid #e5e5ea; 
                    border-radius: 16px; 
                    padding: 14px 16px; 
                    cursor: pointer; 
                }
                .ahora-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
                .ahora-card:active { transform: scale(0.98); }
                .ahora-card-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                }
                .ahora-card-icono { 
                    font-size: 24px; 
                    width: 40px;
                    height: 40px;
                    background: rgba(0,122,255,0.1);
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .ahora-card-titulo { 
                    font-size: 14px; 
                    font-weight: 700; 
                    color: #1c1c1e; 
                    flex: 1;
                }
                .ahora-card-flecha { 
                    font-size: 14px; 
                    color: #c7c7cc; 
                }
                .ahora-card-contenido {
                    padding-left: 52px;
                }
                .ahora-footer { 
                    padding: 12px 16px; 
                    text-align: center; 
                    border-top: 1px solid #e5e5ea; 
                    margin-top: 4px; 
                }
                .ahora-footer-text { 
                    font-size: 10px; 
                    color: #8e8e93; 
                }
            </style>
            
            <div class="ahora-header">
                <h2>🏆 La Polla Mundialista 2026</h2>
                <p>¡Bienvenido, ${currentDatosCuenta?.name || currentDatosCuenta?.nombre || 'Participante'}!</p>
            </div>
            
            <div class="ahora-cards">
                <!-- CARD 1: PARTIDOS DEL DÍA -->
                <div class="ahora-card" data-accion="partidos">
                    <div class="ahora-card-header">
                        <div class="ahora-card-icono">⚽</div>
                        <div class="ahora-card-titulo">Partidos de hoy</div>
                        <div class="ahora-card-flecha">→</div>
                    </div>
                    <div class="ahora-card-contenido">
                        ${partidosDelDiaHtml}
                    </div>
                </div>
            </div>
            
            <div class="ahora-footer">
                <div class="ahora-footer-text">💡 Haz clic en cualquier partido para hacer tu pronóstico</div>
            </div>
        </div>
    `;
    
    return html;
}

export async function renderizarAhora(contenedor, datosCuenta) {
    if (!contenedor) return;
    currentContenedor = contenedor;
    currentDatosCuenta = datosCuenta;
    
    await cargarPronosticos(datosCuenta.id);
    
    if (actualizacionPeriodicaInterval) {
        clearInterval(actualizacionPeriodicaInterval);
        actualizacionPeriodicaInterval = null;
    }
    
    contenedor.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100%; min-height: 300px;">
            <div style="text-align: center;">
                <div style="width: 40px; height: 40px; border: 3px solid rgba(0,0,0,0.1); border-top-color: #007aff; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto;"></div>
                <p style="color: #8e8e93; margin-top: 16px;">Cargando...</p>
            </div>
        </div>
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    
    const html = await renderizarAhoraContent();
    contenedor.innerHTML = html;
    
    const cardPartidos = contenedor.querySelector('.ahora-card[data-accion="partidos"]');
    if (cardPartidos) cardPartidos.addEventListener('click', () => irAPartidos());
    
    actualizacionPeriodicaInterval = setInterval(async () => {
        await cargarPronosticos(datosCuenta.id);
        await cargarPartidos();
        const nuevoHtml = await renderizarAhoraContent();
        if (currentContenedor) {
            currentContenedor.innerHTML = nuevoHtml;
            const newCardPartidos = currentContenedor.querySelector('.ahora-card[data-accion="partidos"]');
            if (newCardPartidos) newCardPartidos.addEventListener('click', () => irAPartidos());
        }
    }, 60000);
}

export function suscribirAhoraAlSimulador() {
    onSimuladorCambio(() => {
        if (currentContenedor && currentDatosCuenta) {
            renderizarAhora(currentContenedor, currentDatosCuenta);
        }
    });
}
