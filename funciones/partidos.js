// funciones/partidos.js
// Módulo de Partidos - La Polla Mundialista 2026
// VERSIÓN COMPLETA CON:
// - ✅ Sistema de PULSO (multiplicador de puntos según campo 'pul' de Velneo)
// - ✅ Para partidos TERMINADOS, ignora cache local y siempre consulta API fresca
// - ✅ Forzar actualización de 'pul' cuando el partido está en est=4
// - ✅ Permite apostar durante 1er tiempo (est=2) solo si NO tiene pronóstico (PULSO 50)
// - ✅ Bloquea completamente en 2do tiempo (est=3) y terminado (est=4)
// - ✅ Valores vacíos (placeholder "-") cuando pul=0 (nunca ha pronosticado)
// - ✅ Mensajes de toast en dos líneas con <br>
// - ✅ Badge de advertencia para 0-0
// - ✅ Filtro dinámico por fase (fas <= faseMax) para acumulación progresiva
// - ✅ Función getFaseMaximaPorFecha() para mapear fecha → fase máxima
// - ✅ Selector de alargue en modal para fases finales (fas >= 2)
// - ✅ Bonus Alargue en detalle de puntos
// - ✅ Badge 0-0 movido ARRIBA en el modal
// - ✅ Selector de alargue centrado, con banderas grandes y texto azul
// - ✅ Radio buttons de alargue SIN SELECCIÓN por defecto
// - ✅ Captura correcta de la selección de alargue al guardar
// - ✅ pro_res se sobrescribe correctamente con la selección de alargue
// - ✅ pro_res se guarda en pronosticosCache
// - ✅ INDICADOR "⭐ avanza en alargue" en cards de partidos (color AZUL)
// - ✅ Modal carga pronóstico existente (inputs y selector de alargue)
// - ✅ Modal de partido terminado con desglose de puntos
// - ✅ Badge "MARCADOR 90 MINUTOS" debajo de la cancha en el modal
// - ✅ SCROLL VERTICAL en modal (max-height: 90vh, overflow-y: auto)
// - ✅ Tamaños reducidos en modal (banderas 40px, nombres 13px)
// - ✅ Modal centrado verticalmente
// - ✅ Pestaña GRUPOS muestra imagen CRUCES DE 16AVOS (cruces.jpg)
// - ✅ cargarPronosticos() LEE pro_res DE VELNEO
// - ✅ obtenerPronosticoFresco() LEE pro_res DE VELNEO
// - ✅ obtenerPronosticoActual() LEE pro_res DE VELNEO
// - ✅ renderizarPartidos() SIEMPRE consulta API al cargar (forceRefresh=true)
// - ✅ refrescarContenido() usa forceRefresh=false (para mantener rendimiento)
// - ✅ Modal de partido terminado: muestra desglose de puntos (NO editable)
// - ✅ Al hacer clic en partido terminado → modal de resultados
// - ✅ Al hacer clic en 1er tiempo sin pronóstico → modal de pronóstico PULSO 50
// - ✅ Al hacer clic en 1er tiempo con pronóstico → toast "No se puede modificar"
// - ✅ Al hacer clic en 2do tiempo → toast "No se aceptan más pronósticos"
// - ✅ Al hacer clic en pendiente → modal de pronóstico PULSO 100
// - ✅ Modal partido terminado: sección "RESULTADO FINAL" y "TU PRONÓSTICO" separadas
// - ✅ Badge "⭐ X avanza en alargue" en sección de pronóstico con color AZUL (#007aff)
// - ✅ Botón único "Cerrar" (eliminado botón redundante con pronóstico)
// - ✅ Bonus Alargue solo se muestra si REALMENTE hubo alargue (empate en 90 minutos)
// - ✅ Bonus Alargue cuando no hubo alargue: "0 pts ❌"
// - ✅ Texto "⭐ X avanza en alargue" en CARDS (fuera del modal) también en AZUL

import { onSimuladorCambio, simGetFechaStr, simGetHoraStr } from './lab.js';
import { gruposSeleccion } from './especiales.js';
import { getBandera } from './banderas.js';
import { cargarPronosticosPartidosLocal, guardarPronosticosPartidosLocal, cargarPronosticosEspecialesLocal } from './sync.js';

const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
const BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

// ========== MAPEO DE MULTIPLICADORES DE PULSO ==========
function getMultiplicadorPulso(pul) {
    if (pul === '1') return 1;
    if (pul === '2') return 0.5;
    return 0;
}

// ========== FUNCIÓN: FASE MÁXIMA SEGÚN FECHA ==========
function getFaseMaximaPorFecha(fecha) {
    if (!fecha) return 1;
    
    if (fecha <= '2026-06-27') return 1;
    if (fecha >= '2026-06-28' && fecha <= '2026-07-03') return 2;
    if (fecha >= '2026-07-04' && fecha <= '2026-07-08') return 3;
    if (fecha >= '2026-07-09' && fecha <= '2026-07-13') return 4;
    if (fecha >= '2026-07-14' && fecha <= '2026-07-17') return 5;
    if (fecha === '2026-07-18') return 6;
    if (fecha >= '2026-07-19') return 7;
    return 1;
}

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

// ========== ESTADO GLOBAL ==========
let partidosCache = [], equiposCache = [], pronosticosCache = {}, resultadosRealesCache = {};
let tabActivo = 'todos', grupoActivo = 'A', simuladorSuscrito = false, currentJugador = null;
let countdownInterval = null;
let countdownActivo = false;
let syncIntervals = new Map();
let tempPronosticos = new Map();
let enVivoInterval = null;
let globalCambiarVistaCallback = null;

// ========== FUNCIONES AUXILIARES ==========
function mostrarToast(msg, tipo) {
    const toast = document.getElementById('app-toast');
    if (toast) { 
        toast.innerHTML = msg;
        toast.className = 'toast ' + (tipo || ''); 
        toast.classList.add('show'); 
        setTimeout(() => toast.classList.remove('show'), 4000); 
    }
}

export function setGlobalCambiarVistaCallback(callback) {
    globalCambiarVistaCallback = callback;
}

function obtenerFechaReal() {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = String(ahora.getMonth() + 1).padStart(2, '0');
    const day = String(ahora.getDate()).padStart(2, '0');
    const hours = String(ahora.getHours()).padStart(2, '0');
    const minutes = String(ahora.getMinutes()).padStart(2, '0');
    return {
        fecha: `${year}-${month}-${day}`,
        hora: `${hours}:${minutes}`
    };
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    const fechaLimpia = fechaStr.split('T')[0];
    const [year, month, day] = fechaLimpia.split('-');
    if (!year || !month || !day) return '';
    const fecha = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
    let fechaFormateada = fecha.toLocaleDateString('es-ES', opciones);
    fechaFormateada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
    return fechaFormateada;
}

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

// ========== FUNCIONES DE PUNTOS BASE ==========
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

// ========== FUNCIONES DE CÁLCULO DE PUNTOS ==========
function getGanador(local, visita) {
    if (local > visita) return 'local';
    if (visita > local) return 'visita';
    return 'empate';
}

function getDiferencia(local, visita) {
    return Math.abs(local - visita);
}

function calcularPuntosDetalle(pronostico, resultadoReal, fase, pul) {
    if (!pronostico || !resultadoReal) {
        return { ganador: 0, golLocal: 0, golVisita: 0, diferencia: 0, inverso: 0, total: 0, multiplicador: 1 };
    }
    
    const ptsBaseOriginal = getPtsBase(fase);
    const multiplicador = getMultiplicadorPulso(pul);
    
    const p = { 
        GANADOR: Math.round(ptsBaseOriginal * 0.4), 
        GOL: Math.round(ptsBaseOriginal * 0.2), 
        DIFERENCIA: Math.round(ptsBaseOriginal * 0.2), 
        INVERSO: Math.round(ptsBaseOriginal * 0.2) 
    };
    
    const pronosticoGanador = getGanador(pronostico.s1, pronostico.s2);
    const realGanador = getGanador(resultadoReal.gol_loc, resultadoReal.gol_vis);
    
    let ganador = 0, golLocal = 0, golVisita = 0, diferencia = 0, inverso = 0;
    
    if (pronosticoGanador === realGanador) ganador = p.GANADOR;
    if (resultadoReal.gol_loc === pronostico.s1) golLocal = p.GOL;
    if (resultadoReal.gol_vis === pronostico.s2) golVisita = p.GOL;
    
    const pronosticoDiferencia = getDiferencia(pronostico.s1, pronostico.s2);
    const realDiferencia = getDiferencia(resultadoReal.gol_loc, resultadoReal.gol_vis);
    if (pronosticoDiferencia === realDiferencia) diferencia = p.DIFERENCIA;
    
    if (pronosticoGanador !== realGanador) {
        if (resultadoReal.gol_loc === pronostico.s2 && resultadoReal.gol_vis === pronostico.s1) inverso = p.INVERSO;
    }
    
    let total = ganador + golLocal + golVisita + diferencia + inverso;
    total = Math.round(total * multiplicador);
    
    return { ganador, golLocal, golVisita, diferencia, inverso, total, multiplicador };
}

// ========== FUNCIONES DE ESTADO DE PARTIDO ==========
function getEstadoPartidoPorEst(partido) {
    const est = Number(partido.est);
    
    if (est === 4) {
        return { 
            estado: 'terminado', 
            texto: 'TERMINADO',
            icono: '🏁',
            editable: false,
            visible: true,
            puntosBase: getPtsBase(partido.fas)
        };
    }
    
    if (est === 2) {
        return { 
            estado: 'primer_tiempo', 
            texto: 'EN VIVO (1T)',
            icono: '🟡',
            editable: true,
            visible: true,
            puntosBase: 0
        };
    }
    
    if (est === 3) {
        return { 
            estado: 'segundo_tiempo', 
            texto: 'EN VIVO (2T)',
            icono: '🔴',
            editable: false,
            visible: true,
            puntosBase: 0
        };
    }
    
    return { 
        estado: 'pendiente', 
        texto: '',
        icono: '',
        editable: true,
        visible: true,
        puntosBase: getPtsBase(partido.fas)
    };
}

function getMarcadorEnVivo(partido) {
    const est = Number(partido.est);
    if (est === 2 || est === 3) {
        const golLoc = (partido.gol_loc !== undefined && partido.gol_loc !== null) 
            ? partido.gol_loc 
            : (partido.t90_gol_loc || 0);
        const golVis = (partido.gol_vis !== undefined && partido.gol_vis !== null) 
            ? partido.gol_vis 
            : (partido.t90_gol_vis || 0);
        
        return { 
            tieneMarcador: true, 
            texto: est === 2 ? 'EN VIVO (1T)' : 'EN VIVO (2T)',
            gol_loc: golLoc,
            gol_vis: golVis
        };
    }
    return null;
}

function getResultadoReal(partidoId) { 
    const real = resultadosRealesCache[partidoId]; 
    if (real && real.gol_loc !== null) {
        return { gol_loc: real.gol_loc, gol_vis: real.gol_vis };
    }
    const partido = partidosCache.find(p => p.id === partidoId);
    if (partido && Number(partido.est) === 4) {
        return { 
            gol_loc: partido.t90_gol_loc || 0, 
            gol_vis: partido.t90_gol_vis || 0 
        };
    }
    return null;
}

function getTipoFondo(fechaPartido, fechaSim) {
    if (!fechaPartido) return 'normal';
    if (fechaPartido < fechaSim) return 'finalizado';
    if (fechaPartido === fechaSim) return 'hoy';
    const hoy = new Date(fechaSim + 'T12:00:00');
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const mananaStr = manana.toISOString().split('T')[0];
    if (fechaPartido === mananaStr) return 'proximo';
    return 'normal';
}

function getFondoStyle(tipoFondo) {
    switch(tipoFondo) {
        case 'finalizado': return { bg: 'rgba(142, 142, 147, 0.2)', border: '#6c6c70', borderWidth: '1.5px' };
        case 'hoy': return { bg: 'rgba(52, 199, 89, 0.25)', border: '#2ecc71', borderWidth: '2px' };
        case 'proximo': return { bg: 'rgba(255, 149, 0, 0.25)', border: '#e67e22', borderWidth: '1.5px' };
        default: return { bg: '#ffffff', border: '#007aff', borderWidth: '1.5px' };
    }
}

// ========== CARGAR DATOS DESDE API ==========
async function cargarPartidos() {
    try {
        const timestamp = Date.now();
        const response = await fetch(`${BASE}/fifa_ptd?api_key=${KEY}&_=${timestamp}`);
        const data = await response.json();
        partidosCache = data.fifa_ptd || [];
        
        partidosCache.sort((a, b) => {
            if (a.fch !== b.fch) return a.fch.localeCompare(b.fch);
            return (a.hor || '00:00:00').localeCompare(b.hor || '00:00:00');
        });
        
        partidosCache.forEach(p => {
            let grupo = obtenerGrupoPorEquipo(p.nom_loc);
            if (!grupo) grupo = obtenerGrupoPorEquipo(p.nom_vis);
            p.grupoCalculado = grupo;
            if (!p.grp_for && grupo) p.grp_for = grupo;
        });
        
        console.log('[Partidos] Cargados', partidosCache.length, 'partidos');
        
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

async function cargarEquipos() {
    try { 
        const timestamp = Date.now();
        const response = await fetch(`${BASE}/fifa_equ?api_key=${KEY}&_=${timestamp}`); 
        equiposCache = (await response.json()).fifa_equ || []; 
        console.log(`[Partidos] Cargados ${equiposCache.length} equipos`);
        return equiposCache; 
    } catch (error) { 
        console.error('Error cargando equipos:', error); 
        return []; 
    }
}

// ========== FUNCIONES DE PRONÓSTICOS ==========
async function obtenerPronosticoActual(ptdId) {
    if (!currentJugador) return null;
    try {
        const timestamp = Date.now();
        const response = await fetch(`${BASE_V2}/fifa_jug_pro?api_key=${KEY}&filter[id]=${currentJugador.id}&fields=jug,jug.name,id,ptd,pro_gol_loc,pro_gol_vis,pro_res,pul&_=${timestamp}`);
        const data = await response.json();
        const pronostico = data.fifa_jug_pro?.find(p => p.ptd === ptdId);
        if (pronostico) {
            return { 
                s1: pronostico.pro_gol_loc || 0, 
                s2: pronostico.pro_gol_vis || 0,
                pul: pronostico.pul || '0',
                pro_res: pronostico.pro_res || 'X'
            };
        }
        return null;
    } catch (error) {
        console.error('[Partidos] Error obteniendo pronóstico actual:', error);
        return null;
    }
}

async function obtenerPronosticoFresco(ptdId) {
    if (!currentJugador) return null;
    try {
        const timestamp = Date.now();
        const response = await fetch(`${BASE_V2}/fifa_jug_pro?api_key=${KEY}&filter[id]=${currentJugador.id}&fields=jug,jug.name,id,ptd,pro_gol_loc,pro_gol_vis,pro_res,pul&_=${timestamp}`);
        const data = await response.json();
        const pronostico = data.fifa_jug_pro?.find(p => p.ptd === ptdId);
        if (pronostico) {
            return { 
                s1: pronostico.pro_gol_loc || 0, 
                s2: pronostico.pro_gol_vis || 0,
                pul: pronostico.pul || '0',
                pro_res: pronostico.pro_res || 'X'
            };
        }
        return null;
    } catch (error) {
        console.error('[Partidos] Error obteniendo pronóstico fresco:', error);
        return null;
    }
}

async function cargarPronosticos(jugId, forceRefresh = false) {
    if (!jugId) return;
    
    if (!forceRefresh) {
        const locales = cargarPronosticosPartidosLocal();
        if (locales && Object.keys(locales).length > 0) { 
            pronosticosCache = locales; 
            console.log(`[Partidos] ${Object.keys(pronosticosCache).length} pronósticos desde localStorage`); 
            return; 
        }
    }
    
    try {
        const timestamp = Date.now();
        const response = await fetch(`${BASE_V2}/fifa_jug_pro?api_key=${KEY}&filter[id]=${jugId}&fields=jug,jug.name,id,ptd,pro_gol_loc,pro_gol_vis,pro_res,pul&_=${timestamp}`);
        const pronosticos = (await response.json()).fifa_jug_pro || [];
        pronosticosCache = {};
        pronosticos.forEach(p => { 
            pronosticosCache[p.ptd] = { 
                s1: p.pro_gol_loc || 0, 
                s2: p.pro_gol_vis || 0,
                pul: p.pul || '0',
                pro_res: p.pro_res || 'X'
            }; 
        });
        guardarPronosticosPartidosLocal(pronosticosCache);
        console.log(`[Partidos] ✅ ${Object.keys(pronosticosCache).length} pronósticos desde API (con PULSO y pro_res)`);
    } catch (error) { 
        console.error('Error cargando pronósticos:', error); 
    }
}

async function refrescarPronosticoSiTerminado(ptdId, est) {
    if (est === 4 && currentJugador) {
        const pronosticoFresco = await obtenerPronosticoFresco(ptdId);
        if (pronosticoFresco) {
            const actual = pronosticosCache[ptdId];
            if (!actual || actual.s1 !== pronosticoFresco.s1 || actual.s2 !== pronosticoFresco.s2 || actual.pul !== pronosticoFresco.pul) {
                console.log(`[Partidos] Actualizando pronóstico fresco para partido terminado ${ptdId}: pul=${pronosticoFresco.pul}`);
                pronosticosCache[ptdId] = { 
                    s1: pronosticoFresco.s1, 
                    s2: pronosticoFresco.s2, 
                    pul: pronosticoFresco.pul, 
                    pro_res: pronosticoFresco.pro_res || 'X' 
                };
                guardarPronosticosPartidosLocal(pronosticosCache);
                return pronosticoFresco;
            }
        }
    }
    return pronosticosCache[ptdId];
}

function guardarPronosticoLocal(ptdId, s1, s2, pul, pro_res) {
    pronosticosCache[ptdId] = { s1, s2, pul, pro_res: pro_res || 'X' };
    guardarPronosticosPartidosLocal(pronosticosCache);
}

function actualizarCardPartido(ptdId, s1, s2) {
    const card = document.querySelector(`.partido-card[data-id="${ptdId}"]`);
    if (!card) return;
    const pronosticoContainer = card.querySelector('.pronostico-container');
    if (pronosticoContainer) {
        pronosticoContainer.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; gap:12px;">
                <span style="font-size:11px; color:#8e8e93; flex-shrink:0;">Tu pronóstico:</span>
                <div style="flex:1; display:flex; justify-content:center;">
                    <div style="background:#f2f2f7; border-radius:10px; padding:6px 16px; display:inline-block;">
                        <span style="font-size:16px; font-weight:700; color:#007aff;">${s1} - ${s2}</span>
                    </div>
                </div>
                <div style="width:70px; flex-shrink:0;"></div>
            </div>
        `;
    }
}

// ========== GUARDAR PRONÓSTICO EN API ==========
async function guardarPronostico(ptdId, s1, s2, pul = '1', alargue = null) {
    if (!currentJugador) { 
        mostrarToast('Inicia sesión primero', 'err'); 
        return; 
    }
    
    const originalPronostico = pronosticosCache[ptdId];
    
    mostrarToast('💾 Guardando...', 'info');
    
    let pro_res = 'X';
    if (s1 > s2) pro_res = '1';
    else if (s2 > s1) pro_res = '2';
    
    if (alargue === 'local') {
        pro_res = '1';
    } else if (alargue === 'visita') {
        pro_res = '2';
    }
    
    try {
        const response = await fetch(`${BASE_V2}/_process/API_PUT_PAR?api_key=${KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ 
                jug: currentJugador.id, 
                id: ptdId, 
                pro_gol_loc: s1, 
                pro_gol_vis: s2, 
                pro_res: pro_res,
                pul: pul
            })
        });
        
        const respuesta = await response.json();
        console.log('[Partidos] Respuesta de Velneo:', respuesta);
        
        if (respuesta.COD === 1) {
            pronosticosCache[ptdId] = { s1, s2, pul: pul, pro_res: pro_res };
            guardarPronosticosPartidosLocal(pronosticosCache);
            actualizarCardPartido(ptdId, s1, s2);
            
            if (pul === '2') {
                mostrarToast('✅ Pronóstico guardado con PULSO 50<br>(puntos reducidos a la mitad)', 'ok');
            } else {
                mostrarToast('✅ Pronóstico guardado correctamente', 'ok');
            }
            
            if (ptdId === 1 && globalCambiarVistaCallback) {
                setTimeout(() => { 
                    globalCambiarVistaCallback('ahora', currentJugador); 
                }, 1500);
            }
        } else {
            if (originalPronostico) {
                pronosticosCache[ptdId] = originalPronostico;
                actualizarCardPartido(ptdId, originalPronostico.s1, originalPronostico.s2);
                mostrarToast(`❌ ${respuesta.DES || 'Error al guardar el pronóstico'}`, 'err');
            } else {
                mostrarToast(`❌ ${respuesta.DES || 'No se pudo guardar el pronóstico'}`, 'err');
            }
        }
        
    } catch (error) { 
        console.error('Error al guardar:', error);
        if (originalPronostico) {
            pronosticosCache[ptdId] = originalPronostico;
            actualizarCardPartido(ptdId, originalPronostico.s1, originalPronostico.s2);
        }
        mostrarToast('❌ Error de conexión. Intenta nuevamente.', 'err');
    }
}

function validarInputNumerico(input) {
    if (!input) return;
    input.addEventListener('input', (e) => {
        let valor = e.target.value.replace(/[^0-9]/g, '');
        if (valor === '') valor = '';
        let num = parseInt(valor);
        if (!isNaN(num) && num > 20) num = 20;
        if (valor === '') {
            e.target.value = '';
        } else {
            e.target.value = num;
        }
    });
}

// ========== MODAL: PARTIDO TERMINADO (SOLO LECTURA) ==========
function mostrarModalResultadoTerminado(partido, pronostico) {
    const resultadoReal = getResultadoReal(partido.id);
    if (!resultadoReal) {
        mostrarToast('Partido finalizado sin resultados disponibles', 'err');
        return;
    }
    
    const detalle = calcularPuntosDetalle(pronostico, resultadoReal, partido.fas, pronostico.pul || '0');
    const esFaseFinal = Number(partido.fas) >= 2;
    
    const tienePronostico = pronostico && pronostico.pul !== '0' && pronostico.pul !== undefined;
    const pronoLocal = tienePronostico ? pronostico.s1 : '—';
    const pronoVisita = tienePronostico ? pronostico.s2 : '—';
    const realLocal = resultadoReal.gol_loc;
    const realVisita = resultadoReal.gol_vis;
    
    // ========== DETERMINAR QUIÉN AVANZA SEGÚN EL PRONÓSTICO ==========
    let avanzaTexto = '';
    let avanzaBandera = '';
    let avanzaNombre = '';
    
    if (esFaseFinal && tienePronostico) {
        const pro_res = pronostico.pro_res || 'X';
        if (pro_res === '1') {
            avanzaTexto = `⭐ ${partido.nom_loc} avanza en alargue`;
            avanzaBandera = getBandera(partido.nom_loc);
            avanzaNombre = partido.nom_loc;
        } else if (pro_res === '2') {
            avanzaTexto = `⭐ ${partido.nom_vis} avanza en alargue`;
            avanzaBandera = getBandera(partido.nom_vis);
            avanzaNombre = partido.nom_vis;
        }
    }
    
    // Aciertos
    const aciertoGanador = getGanador(pronoLocal, pronoVisita) === getGanador(realLocal, realVisita);
    const aciertoGolLocal = realLocal === pronoLocal;
    const aciertoGolVisita = realVisita === pronoVisita;
    const aciertoDiferencia = getDiferencia(pronoLocal, pronoVisita) === getDiferencia(realLocal, realVisita);
    const aciertoInverso = (pronoLocal === realVisita && pronoVisita === realLocal) && !aciertoGanador;
    
    // ========== BONUS ALARGUE - SOLO SI REALMENTE HUBO ALARGUE ==========
    let bonusAlargueTexto = '';
    let bonusAlarguePts = 0;
    let bonusAcierto = false;

    if (esFaseFinal && tienePronostico) {
        const pro_res = pronostico.pro_res || 'X';
        const avanzaReal = realLocal > realVisita ? 'local' : (realVisita > realLocal ? 'visita' : 'empate');
        const avanzaProno = pro_res === '1' ? 'local' : (pro_res === '2' ? 'visita' : 'empate');
        
        // ✅ SOLO hay bonus si REALMENTE hubo alargue (empate en 90 minutos)
        const huboAlargue = (realLocal === realVisita);
        
        if (huboAlargue && avanzaReal === avanzaProno && avanzaProno !== 'empate') {
            bonusAlarguePts = Math.round(getPtsBase(partido.fas) * 0.4);
            bonusAlargueTexto = `✅ Acierto alargue: +${bonusAlarguePts} pts`;
            bonusAcierto = true;
        }
    }
    
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:center;justify-content:center;';
    
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px;padding:20px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,0.3);">
            
            <!-- HEADER -->
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                <div style="font-size:17px;font-weight:700;">✅ Partido Terminado</div>
                <button class="modal-cerrar-btn" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
            </div>
            
            <!-- FECHA/HORA -->
            <div style="font-size:12px;color:#8e8e93;margin-bottom:14px;text-align:center;">
                ${formatearFecha(partido.fch)} · ${formatearHora12h(partido.hor)}
            </div>
            
            <!-- ========== SECCIÓN: RESULTADO REAL ========== -->
            <div style="background:#f0faf5;border:1.5px solid #34c759;border-radius:12px;padding:14px;margin-bottom:12px;">
                <div style="font-size:11px;font-weight:700;color:#1e8449;text-align:center;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
                    🏆 RESULTADO FINAL
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:32px;">${getBandera(partido.nom_loc)}</div>
                        <div style="font-size:12px;font-weight:600;color:#1c1c1e;">${partido.nom_loc}</div>
                    </div>
                    <div style="font-size:22px;font-weight:800;color:#34c759;padding:0 12px;">
                        ${realLocal} - ${realVisita}
                    </div>
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:32px;">${getBandera(partido.nom_vis)}</div>
                        <div style="font-size:12px;font-weight:600;color:#1c1c1e;">${partido.nom_vis}</div>
                    </div>
                </div>
            </div>
            
            <!-- ========== SECCIÓN: TU PRONÓSTICO ========== -->
            <div style="background:#f0f7ff;border:1.5px solid #007aff;border-radius:12px;padding:14px;margin-bottom:12px;">
                <div style="font-size:11px;font-weight:700;color:#005fc4;text-align:center;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
                    📋 TU PRONÓSTICO
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:32px;opacity:0.7;">${getBandera(partido.nom_loc)}</div>
                        <div style="font-size:12px;font-weight:600;color:#1c1c1e;">${partido.nom_loc}</div>
                    </div>
                    <div style="font-size:22px;font-weight:800;color:${tienePronostico ? '#007aff' : '#8e8e93'};padding:0 12px;">
                        ${tienePronostico ? `${pronoLocal} - ${pronoVisita}` : '—'}
                    </div>
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:32px;opacity:0.7;">${getBandera(partido.nom_vis)}</div>
                        <div style="font-size:12px;font-weight:600;color:#1c1c1e;">${partido.nom_vis}</div>
                    </div>
                </div>
                
                <!-- ========== BADGE: QUIÉN AVANZA EN ALARGUE (COLOR AZUL) ========== -->
                ${avanzaTexto ? `
                    <div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-top:8px;background:rgba(0,122,255,0.08);border:1px solid rgba(0,122,255,0.2);border-radius:20px;padding:4px 14px;">
                        <span style="font-size:20px;">${avanzaBandera}</span>
                        <span style="font-size:12px;font-weight:700;color:#007aff;">${avanzaTexto}</span>
                    </div>
                ` : (esFaseFinal && tienePronostico ? `
                    <div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-top:8px;background:rgba(142,142,147,0.1);border:1px solid rgba(142,142,147,0.2);border-radius:20px;padding:4px 14px;">
                        <span style="font-size:12px;color:#8e8e93;">❌ No seleccionaste quién avanza en alargue</span>
                    </div>
                ` : '')}
                
                ${!tienePronostico ? `
                    <div style="text-align:center;margin-top:6px;font-size:11px;color:#ff3b30;font-weight:600;">
                        ⚠️ No realizaste pronóstico para este partido
                    </div>
                ` : ''}
            </div>
            
            <!-- ========== SECCIÓN: DESGLOSE DE PUNTOS ========== -->
            <div style="background:#f2f2f7;border-radius:12px;padding:14px;margin-bottom:12px;">
                <div style="font-size:13px;font-weight:700;margin-bottom:10px;text-align:center;">📊 Desglose de Puntos</div>
                
                <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:0.5px solid rgba(0,0,0,0.05);">
                    <span>🏆 Ganador / Empate</span>
                    <span style="font-weight:600;color:${aciertoGanador ? '#34c759' : '#8e8e93'};">
                        ${detalle.ganador} pts ${aciertoGanador ? '✅' : '❌'}
                    </span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:0.5px solid rgba(0,0,0,0.05);">
                    <span>⚽ Gol local exacto</span>
                    <span style="font-weight:600;color:${aciertoGolLocal ? '#34c759' : '#8e8e93'};">
                        ${detalle.golLocal} pts ${aciertoGolLocal ? '✅' : '❌'}
                    </span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:0.5px solid rgba(0,0,0,0.05);">
                    <span>⚽ Gol visita exacto</span>
                    <span style="font-weight:600;color:${aciertoGolVisita ? '#34c759' : '#8e8e93'};">
                        ${detalle.golVisita} pts ${aciertoGolVisita ? '✅' : '❌'}
                    </span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:0.5px solid rgba(0,0,0,0.05);">
                    <span>📊 Diferencia de goles</span>
                    <span style="font-weight:600;color:${aciertoDiferencia ? '#34c759' : '#8e8e93'};">
                        ${detalle.diferencia} pts ${aciertoDiferencia ? '✅' : '❌'}
                    </span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:0.5px solid rgba(0,0,0,0.05);">
                    <span>🔄 Marcador inverso</span>
                    <span style="font-weight:600;color:${aciertoInverso ? '#ff9500' : '#8e8e93'};">
                        ${detalle.inverso} pts ${aciertoInverso ? '🔄' : '❌'}
                    </span>
                </div>
                
                <!-- ========== BONUS ALARGUE - CORREGIDO ========== -->
                ${esFaseFinal ? `
                    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:0.5px solid rgba(0,0,0,0.05);">
                        <span>⭐ Bonus Alargue</span>
                        <span style="font-weight:600;color:${bonusAcierto ? '#f1c40f' : '#8e8e93'};">
                            ${bonusAcierto ? bonusAlargueTexto : '0 pts ❌'}
                        </span>
                    </div>
                ` : ''}
                
                ${detalle.multiplicador < 1 && detalle.total > 0 ? `
                <div style="display:flex;justify-content:space-between;padding:5px 0;border-top:1px solid #e5e5ea;margin-top:4px;padding-top:8px;">
                    <span>⚡ PULSO ${detalle.multiplicador === 0.5 ? '50' : '0'}</span>
                    <span style="font-weight:600;color:#ff9500;">×${detalle.multiplicador}</span>
                </div>` : ''}
                
                <div style="display:flex;justify-content:space-between;padding:5px 0;border-top:2px solid #007aff;margin-top:4px;padding-top:10px;">
                    <span style="font-weight:700;font-size:15px;">⭐ TOTAL</span>
                    <span style="font-weight:800;font-size:20px;color:#007aff;">${detalle.total} pts</span>
                </div>
            </div>
            
            <!-- ========== BOTÓN DE CERRAR (ÚNICO) ========== -->
            <button class="modal-cerrar-btn" style="width:100%;background:#f2f2f7;color:#1c1c1e;border:none;border-radius:14px;padding:14px;font-weight:600;cursor:pointer;margin-top:4px;">
                ✕ Cerrar
            </button>
            
            <div style="margin-top:10px;font-size:10px;color:#8e8e93;text-align:center;">
                💡 Este partido ya finalizó. No se pueden modificar los pronósticos.
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    overlay.querySelectorAll('.modal-cerrar-btn').forEach(btn => {
        btn.addEventListener('click', () => overlay.remove());
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ========== MODAL: PRONÓSTICO (EDITABLE) ==========
function mostrarModalPronostico(partido, pulsoAEnviar, pronosticoExistente = null) {
    const estadoEst = getEstadoPartidoPorEst(partido);
    const ptsBase = estadoEst.puntosBase || getPtsBase(partido.fas);
    const esFaseFinal = Number(partido.fas) >= 2;
    const puntosBaseParaModal = pulsoAEnviar === '2' ? Math.round(ptsBase * 0.5) : ptsBase;
    
    let mensajePulso = '';
    if (pulsoAEnviar === '2') {
        mensajePulso = `🟡 PULSO 50 · Estás apostando durante el 1er tiempo.<br>Si aciertas el marcador exacto tendrás ${puntosBaseParaModal} puntos (50% del total).`;
    } else {
        mensajePulso = `🟢 PULSO 100 · Si aciertas el marcador exacto tendrás ${ptsBase} puntos.`;
    }
    
    const tienePronosticoGuardado = pronosticoExistente && pronosticoExistente.pul !== '0';
    const valorS1 = tienePronosticoGuardado ? pronosticoExistente.s1 : '';
    const valorS2 = tienePronosticoGuardado ? pronosticoExistente.s2 : '';
    const alargueGuardado = (esFaseFinal && pronosticoExistente?.pro_res === '1') ? 'local' : 
                           (esFaseFinal && pronosticoExistente?.pro_res === '2') ? 'visita' : null;
    
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:3000;display:flex;align-items:center;justify-content:center;';
    
    // Badge MARCADOR 90 MINUTOS
    const badge90HTML = `
        <div style="text-align: center; margin-bottom: 10px;">
            <span style="display:inline-block;background:#ffd60a;color:#1a1a2e;font-size:11px;font-weight:700;padding:2px 14px;border-radius:20px;letter-spacing:0.5px;">🟡 MARCADOR 90 MINUTOS</span>
        </div>
    `;
    
    // Badge 0-0
    const badgeZeroHTML = `
        <div style="text-align: center; margin-bottom: 10px;">
            <div style="background:rgb(17,55,95);color:white;font-size:11px;font-weight:500;padding:4px 12px;border-radius:20px;display:inline-block;line-height:1.4;">
                ⚠️ Si tu pronóstico es 0-0<br>
                <span style="color:#ffd60a;">selecciona explícitamente 0 - 0</span>
            </div>
        </div>
    `;
    
    // Selector de alargue
    let alargueHTML = '';
    if (esFaseFinal) {
        const bonusAlargueVal = Math.round(ptsBase * 0.4);
        const checkedLocal = (alargueGuardado === 'local') ? 'checked' : '';
        const checkedVisita = (alargueGuardado === 'visita') ? 'checked' : '';
        alargueHTML = `
            <div style="background:rgba(0,122,255,0.05);border:1px solid rgba(0,122,255,0.15);border-radius:12px;padding:12px;margin-bottom:12px;">
                <div style="font-size:13px;font-weight:600;color:#007aff;text-align:center;margin-bottom:8px;">⚽ En caso de alargue, ¿quién avanza?</div>
                <div style="display:flex;gap:12px;justify-content:center;">
                    <label style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:8px 16px;border-radius:10px;background:${alargueGuardado === 'local' ? 'rgba(0,122,255,0.15)' : 'rgba(255,255,255,0.05)'};border:2px solid ${alargueGuardado === 'local' ? '#007aff' : 'rgba(0,122,255,0.15)'};transition:all 0.2s;min-width:80px;flex:1;max-width:130px;">
                        <input type="radio" name="alargue" value="local" ${checkedLocal} style="accent-color:#007aff;width:16px;height:16px;margin-bottom:2px;">
                        <span style="font-size:24px;line-height:1.2;">${getBandera(partido.nom_loc)}</span>
                        <span style="font-size:12px;font-weight:600;text-align:center;">${partido.nom_loc || 'Local'}</span>
                    </label>
                    <label style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:8px 16px;border-radius:10px;background:${alargueGuardado === 'visita' ? 'rgba(0,122,255,0.15)' : 'rgba(255,255,255,0.05)'};border:2px solid ${alargueGuardado === 'visita' ? '#007aff' : 'rgba(0,122,255,0.15)'};transition:all 0.2s;min-width:80px;flex:1;max-width:130px;">
                        <input type="radio" name="alargue" value="visita" ${checkedVisita} style="accent-color:#007aff;width:16px;height:16px;margin-bottom:2px;">
                        <span style="font-size:24px;line-height:1.2;">${getBandera(partido.nom_vis)}</span>
                        <span style="font-size:12px;font-weight:600;text-align:center;">${partido.nom_vis || 'Visitante'}</span>
                    </label>
                </div>
                <div style="font-size:11px;color:#007aff;text-align:center;margin-top:6px;font-weight:600;">⭐ Bonus Alargue: ${bonusAlargueVal} pts si aciertas quién avanza</div>
            </div>
        `;
    }
    
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px;padding:16px 20px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,0.3);">
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                <div style="font-size:17px;font-weight:700;">${partido.grp_for || 'Fase '+partido.fas}</div>
                <button class="modal-cerrar-btn" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
            </div>
            <div style="font-size:12px;color:#8e8e93;margin-bottom:14px;text-align:center;">${formatearFecha(partido.fch)} · ${formatearHora12h(partido.hor)}</div>
            
            <div style="background:linear-gradient(135deg,#0a2f1f 0%,#1a5a3a 100%);border-radius:20px;padding:12px;margin-bottom:12px;position:relative;overflow:hidden;">
                <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:repeating-linear-gradient(90deg,rgba(0,0,0,0.1) 0px,rgba(0,0,0,0.1) 2px,transparent 2px,transparent 20px);pointer-events:none;"></div>
                <div style="position:absolute;top:0;left:0;width:100%;height:20%;background:linear-gradient(180deg,rgba(0,0,0,0.5) 0%,rgba(0,0,0,0) 100%);pointer-events:none;"></div>
                <div style="position:absolute;bottom:0;left:0;width:100%;height:20%;background:linear-gradient(0deg,rgba(0,0,0,0.5) 0%,rgba(0,0,0,0) 100%);pointer-events:none;"></div>
                <div style="position:absolute;top:50%;left:50%;width:80px;height:80px;border:2px solid rgba(255,255,255,0.15);border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;"></div>
                <div style="position:absolute;top:0;left:50%;width:2px;height:100%;background:rgba(255,255,255,0.15);transform:translateX(-50%);pointer-events:none;"></div>
                <div style="position:absolute;top:50%;left:50%;width:6px;height:6px;background:rgba(255,255,255,0.3);border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;"></div>
                <div style="position:relative;z-index:10;display:flex;justify-content:space-between;align-items:center;">
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:40px;margin-bottom:2px;">${getBandera(partido.nom_loc)}</div>
                        <div style="font-size:13px;font-weight:700;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.5);">${partido.nom_loc}</div>
                    </div>
                    <div style="font-size:18px;font-weight:700;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.5);padding:0 16px;">VS</div>
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:40px;margin-bottom:2px;">${getBandera(partido.nom_vis)}</div>
                        <div style="font-size:13px;font-weight:700;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.5);">${partido.nom_vis}</div>
                    </div>
                </div>
            </div>
            
            ${badge90HTML}
            
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;">
                <div style="flex:1;text-align:center;">
                    <div style="display:flex;align-items:center;justify-content:center;gap:6px;background:#f9f9fb;border-radius:30px;padding:4px 8px;">
                        <button class="modal-dec-btn" data-target="modal-s1" style="width:32px;height:32px;border-radius:16px;background:#fff;border:1px solid #e5e5ea;font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;">−</button>
                        <input id="modal-s1" type="text" inputmode="numeric" pattern="[0-9]*" value="${valorS1}" placeholder="-" style="width:40px;height:32px;text-align:center;font-size:16px;font-weight:700;border:1px solid #e5e5ea;border-radius:8px;background:#fff;">
                        <button class="modal-inc-btn" data-target="modal-s1" style="width:32px;height:32px;border-radius:16px;background:#fff;border:1px solid #e5e5ea;font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>
                    </div>
                </div>
                <div style="flex:1;text-align:center;">
                    <div style="display:flex;align-items:center;justify-content:center;gap:6px;background:#f9f9fb;border-radius:30px;padding:4px 8px;">
                        <button class="modal-dec-btn" data-target="modal-s2" style="width:32px;height:32px;border-radius:16px;background:#fff;border:1px solid #e5e5ea;font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;">−</button>
                        <input id="modal-s2" type="text" inputmode="numeric" pattern="[0-9]*" value="${valorS2}" placeholder="-" style="width:40px;height:32px;text-align:center;font-size:16px;font-weight:700;border:1px solid #e5e5ea;border-radius:8px;background:#fff;">
                        <button class="modal-inc-btn" data-target="modal-s2" style="width:32px;height:32px;border-radius:16px;background:#fff;border:1px solid #e5e5ea;font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>
                    </div>
                </div>
            </div>
            
            ${badgeZeroHTML}
            ${alargueHTML}
            
            <div style="background:#f2f2f7;border-radius:12px;padding:10px;margin-bottom:12px;">
                <div style="font-size:13px;font-weight:700;margin-bottom:8px;">📋 Detalle de puntos</div>
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                    <span style="font-size:12px;">🏆 Ganador / Empate</span>
                    <span style="color:#34c759;font-weight:700;font-size:12px;">${Math.round(puntosBaseParaModal * 0.4)} pts</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                    <span style="font-size:12px;">⚽ Gol local exacto</span>
                    <span style="color:#34c759;font-weight:700;font-size:12px;">${Math.round(puntosBaseParaModal * 0.2)} pts</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                    <span style="font-size:12px;">⚽ Gol visita exacto</span>
                    <span style="color:#34c759;font-weight:700;font-size:12px;">${Math.round(puntosBaseParaModal * 0.2)} pts</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                    <span style="font-size:12px;">📊 Diferencia de goles</span>
                    <span style="color:#34c759;font-weight:700;font-size:12px;">${Math.round(puntosBaseParaModal * 0.2)} pts</span>
                </div>
                <div style="height:1px;background:#e5e5ea;margin:6px 0;"></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                    <span style="font-weight:700;font-size:12px;">⭐ BASE</span>
                    <span style="color:#ff9500;font-weight:800;font-size:12px;">${puntosBaseParaModal} pts</span>
                </div>
                ${esFaseFinal ? `
                <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                    <span style="font-weight:700;font-size:12px;">⭐ Bonus Alargue</span>
                    <span style="color:#f1c40f;font-weight:700;font-size:12px;">${Math.round(puntosBaseParaModal * 0.4)} pts</span>
                </div>` : ''}
            </div>
            
            <div style="background:#eafaf1;border-radius:10px;padding:8px;margin-bottom:12px;text-align:center;">
                <span style="color:#1e8449;font-size:12px;font-weight:600;">${mensajePulso}</span>
            </div>
            
            <button id="modal-guardar-btn" style="width:100%;background:#34c759;color:#fff;border:none;border-radius:14px;padding:12px;font-weight:700;cursor:pointer;font-size:15px;">💾 Guardar pronóstico</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.querySelectorAll('.modal-cerrar-btn').forEach(btn => {
        btn.addEventListener('click', () => overlay.remove());
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    
    overlay.querySelectorAll('.modal-inc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.target);
            if (target) {
                let val = parseInt(target.value);
                if (isNaN(val)) val = 0;
                target.value = Math.min(20, val + 1);
            }
        });
    });
    overlay.querySelectorAll('.modal-dec-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.target);
            if (target) {
                let val = parseInt(target.value);
                if (isNaN(val)) val = 0;
                target.value = Math.max(0, val - 1);
            }
        });
    });
    
    const s1Input = document.getElementById('modal-s1');
    const s2Input = document.getElementById('modal-s2');
    validarInputNumerico(s1Input);
    validarInputNumerico(s2Input);
    
    const guardarBtn = document.getElementById('modal-guardar-btn');
    if (guardarBtn) {
        guardarBtn.onclick = () => {
            let s1 = parseInt(s1Input?.value);
            let s2 = parseInt(s2Input?.value);
            if (isNaN(s1)) s1 = 0;
            if (isNaN(s2)) s2 = 0;
            
            let alargue = null;
            if (esFaseFinal) {
                const alargueRadios = document.querySelectorAll('input[name="alargue"]');
                alargueRadios.forEach(r => {
                    if (r.checked) alargue = r.value;
                });
            }
            
            overlay.remove();
            guardarPronostico(partido.id, s1, s2, pulsoAEnviar, alargue);
        };
    }
}

// ========== ABRIR MODAL (PUNTO DE ENTRADA PRINCIPAL) ==========
function abrirModal(partido, fechaSim, horaSim) {
    const estadoEst = getEstadoPartidoPorEst(partido);
    let pronostico = pronosticosCache[partido.id] || { s1: 0, s2: 0, pul: '0', pro_res: 'X' };
    const temp = tempPronosticos.get(partido.id);
    if (temp && (Date.now() - temp.timestamp) < 30000) {
        pronostico = { s1: temp.s1, s2: temp.s2, pul: pronostico.pul || '0', pro_res: pronostico.pro_res || 'X' };
    }
    
    // ========== PARTIDO TERMINADO → Mostrar resultados ==========
    if (estadoEst.estado === 'terminado') {
        mostrarModalResultadoTerminado(partido, pronostico);
        return;
    }
    
    // ========== PARTIDO EN 2DO TIEMPO → Bloqueado ==========
    if (estadoEst.estado === 'segundo_tiempo') {
        mostrarToast('🔒 Partido en 2do tiempo.<br>No se aceptan más pronósticos.', 'err');
        return;
    }
    
    // ========== PARTIDO EN 1ER TIEMPO ==========
    if (estadoEst.estado === 'primer_tiempo') {
        const yaTienePronostico = pronosticosCache[partido.id] !== undefined && pronosticosCache[partido.id].pul !== '0';
        if (yaTienePronostico) {
            mostrarToast('🔴 Ya tienes un pronóstico para este partido.<br>No se puede modificar durante el partido.', 'err');
            return;
        }
        mostrarModalPronostico(partido, '2', null);
        return;
    }
    
    // ========== PARTIDO PENDIENTE ==========
    mostrarModalPronostico(partido, '1', pronostico);
}

// ========== RENDERIZAR CARD DE PARTIDO ==========
async function renderPartidoCard(partido, fechaSim, horaSim, tipoFondo, esPrimerDia = false) {
    const estadoEst = getEstadoPartidoPorEst(partido);
    const esFuturo = (estadoEst.estado === 'pendiente');
    
    let pronostico = null;
    if (estadoEst.estado === 'terminado') {
        pronostico = await refrescarPronosticoSiTerminado(partido.id, partido.est);
    } else {
        pronostico = pronosticosCache[partido.id];
    }
    
    const temp = tempPronosticos.get(partido.id);
    if (temp && (Date.now() - temp.timestamp) < 30000) {
        pronostico = { s1: temp.s1, s2: temp.s2, pul: pronostico?.pul || '0', pro_res: pronostico?.pro_res || 'X' };
    }
    const resultadoReal = getResultadoReal(partido.id);
    const estilo = getFondoStyle(tipoFondo);
    const marcadorEnVivo = getMarcadorEnVivo(partido);
    
    if (!estadoEst.visible) return '';
    
    let badgeHTML = '';
    if (estadoEst.estado === 'terminado') {
        badgeHTML = `<div style="text-align:center;margin-bottom:10px;"><span style="background:rgba(52,199,89,0.15);padding:4px 12px;border-radius:20px;color:#34c759;font-size:13px;font-weight:700;">${estadoEst.icono} ${estadoEst.texto}</span></div>`;
    } else if (estadoEst.estado === 'primer_tiempo') {
        badgeHTML = `<div style="text-align:center;margin-bottom:10px;"><span style="background:rgba(255,149,0,0.15);padding:4px 12px;border-radius:20px;color:#ff9500;font-size:13px;font-weight:700;">🟡 PULSO 50 - 1er TIEMPO</span></div>`;
    } else if (estadoEst.estado === 'segundo_tiempo') {
        badgeHTML = `<div style="text-align:center;margin-bottom:10px;"><span style="background:rgba(142,142,147,0.15);padding:4px 12px;border-radius:20px;color:#8e8e93;font-size:13px;font-weight:700;">🔴 CERRADO - 2do TIEMPO</span></div>`;
    }
    
    const fechaFormateada = formatearFecha(partido.fch);
    const horaFormateada = partido.hor ? formatearHora12h(partido.hor) : '';
    const grupoDisplay = partido.grupoCalculado ? `Grupo ${partido.grupoCalculado}` : `Fase ${partido.fas}`;
    
    let infoHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:11px;color:#8e8e93;">${grupoDisplay}</span>
        <span style="font-size:11px;color:#8e8e93;text-align:center;">${fechaFormateada}</span>
        <span style="font-size:11px;padding:3px 10px;border-radius:20px;background:#f2f2f7;color:#8e8e93;">${horaFormateada}</span>
    </div>`;
    
    const cardStyle = `${estilo.bg}; border-radius:14px; padding:14px; margin-bottom:10px; border: ${estilo.borderWidth} solid ${estilo.border}; cursor:pointer;`;
    
    let centroHTML = '';
    let centroExtraClass = '';
    
    if (resultadoReal && estadoEst.estado === 'terminado') {
        centroHTML = `<div style="font-size:20px;font-weight:700;color:#000;">${resultadoReal.gol_loc} - ${resultadoReal.gol_vis}</div>`;
    } else if (estadoEst.estado === 'primer_tiempo' && marcadorEnVivo) {
        centroHTML = `
            <div style="font-size:20px;font-weight:700;color:#ff3b30;">${marcadorEnVivo.gol_loc} - ${marcadorEnVivo.gol_vis}</div>
            <div style="font-size:10px;color:#ff9500;margin-top:4px;">🔴 1er TIEMPO</div>
        `;
        centroExtraClass = 'centro-marcador-envivo';
    } else if (estadoEst.estado === 'segundo_tiempo' && marcadorEnVivo) {
        centroHTML = `
            <div style="font-size:20px;font-weight:700;color:#ff3b30;">${marcadorEnVivo.gol_loc} - ${marcadorEnVivo.gol_vis}</div>
            <div style="font-size:10px;color:#8e8e93;margin-top:4px;">⚫ 2do TIEMPO</div>
        `;
        centroExtraClass = 'centro-marcador-envivo';
    } else if (estadoEst.estado === 'pendiente') {
        centroHTML = '<div style="font-size:14px;font-weight:700;color:#007aff;">VS</div>';
        centroExtraClass = 'centro-marcador-pendiente';
    } else {
        centroHTML = '<div style="font-size:14px;font-weight:700;color:#8e8e93;">- - -</div>';
        centroExtraClass = 'centro-marcador-other';
    }
    
    let countdownHTML = '';
    if (esPrimerDia && estadoEst.estado === 'pendiente' && partido.fch && partido.hor) {
        const fechaPartido = partido.fch.split('T')[0];
        const { fecha: fechaReal, hora: horaReal } = obtenerFechaReal();
        const diffMs = new Date(`${fechaPartido}T${partido.hor}`) - new Date(`${fechaReal}T${horaReal}`);
        if (diffMs > 0) {
            const diffSegundos = Math.floor(diffMs / 1000);
            const dias = Math.floor(diffSegundos / 86400);
            const horas = Math.floor((diffSegundos % 86400) / 3600);
            const minutos = Math.floor((diffSegundos % 3600) / 60);
            const partes = [];
            if (dias > 0) partes.push(`${dias}d`);
            if (horas > 0) partes.push(`${horas}h`);
            if (minutos > 0) partes.push(`${minutos}m`);
            if (partes.length === 0) partes.push('<1m');
            countdownHTML = `<div class="partido-countdown" data-id="${partido.id}" data-fch="${fechaPartido}" data-hor="${partido.hor}" style="margin-top:8px;font-size:11px;color:#ff9500;text-align:center;font-weight:600;">⏱️ Faltan ${partes.join(' ')}</div>`;
        }
    }
    
    let pronosticoHTML = '';
    if (pronostico) {
        if (estadoEst.estado === 'terminado' && resultadoReal) {
            const ptsBaseOriginal = getPtsBase(partido.fas);
            const pronosticoLocal = pronostico.s1;
            const pronosticoVisita = pronostico.s2;
            const realLocal = resultadoReal.gol_loc;
            const realVisita = resultadoReal.gol_vis;
            
            let ganador = 0, golLocal = 0, golVisita = 0, diferencia = 0, inverso = 0;
            const p = { GANADOR: Math.round(ptsBaseOriginal * 0.4), GOL: Math.round(ptsBaseOriginal * 0.2), DIFERENCIA: Math.round(ptsBaseOriginal * 0.2), INVERSO: Math.round(ptsBaseOriginal * 0.2) };
            
            const pronosticoGanador = getGanador(pronosticoLocal, pronosticoVisita);
            const realGanador = getGanador(realLocal, realVisita);
            
            if (pronosticoGanador === realGanador) ganador = p.GANADOR;
            if (realLocal === pronosticoLocal) golLocal = p.GOL;
            if (realVisita === pronosticoVisita) golVisita = p.GOL;
            
            const pronosticoDiferencia = getDiferencia(pronosticoLocal, pronosticoVisita);
            const realDiferencia = getDiferencia(realLocal, realVisita);
            if (pronosticoDiferencia === realDiferencia) diferencia = p.DIFERENCIA;
            
            if (pronosticoGanador !== realGanador) {
                if (realLocal === pronosticoVisita && realVisita === pronosticoLocal) inverso = p.INVERSO;
            }
            
            let total = ganador + golLocal + golVisita + diferencia + inverso;
            const multiplicadorPulso = getMultiplicadorPulso(pronostico.pul || '0');
            const totalConPulso = Math.round(total * multiplicadorPulso);
            
            let pulsoHTML = '';
            if (multiplicadorPulso === 0.5) {
                pulsoHTML = `<div style="margin-top:4px;"><span style="background:#ff9500;color:#fff;padding:2px 8px;border-radius:12px;font-size:9px;">⚡ PULSO 50</span></div>`;
            } else if (multiplicadorPulso === 0 && total > 0) {
                pulsoHTML = `<div style="margin-top:4px;"><span style="background:#8e8e93;color:#fff;padding:2px 8px;border-radius:12px;font-size:9px;">❌ PULSO 0</span></div>`;
            }
            
            pronosticoHTML = `<div class="pronostico-container"><div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:12px;">
                <span style="font-size:11px;color:#8e8e93;flex-shrink:0;">Tu pronóstico:</span>
                <div style="flex:1;display:flex;justify-content:center;">
                    <div style="background:#f2f2f7;border-radius:10px;padding:6px 16px;display:inline-block;">
                        <span style="font-size:16px;font-weight:700;color:#007aff;">
                            ${pronostico && pronostico.pul !== '0' ? `${pronosticoLocal} - ${pronosticoVisita}` : '—'}
                        </span>
                    </div>
                </div>
                <div style="background:#fff2f2;border:1px solid #ffd0d0;border-radius:10px;padding:6px 16px;flex-shrink:0;">
                    <span style="font-size:13px;font-weight:800;color:#c0392b;">${totalConPulso} pts</span>
                    ${pulsoHTML}
                </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:12px;">
                <span style="font-size:11px;color:#8e8e93;flex-shrink:0;">Resultado real:</span>
                <div style="flex:1;display:flex;justify-content:center;">
                    <div style="background:#eafaf1;border-radius:10px;padding:6px 16px;display:inline-block;">
                        <span style="font-size:16px;font-weight:700;color:#34c759;">${realLocal} - ${realVisita}</span>
                    </div>
                </div>
                <div style="width:70px;flex-shrink:0;"></div>
            </div></div>`;
        } else {
            let alargueInfo = '';
            const pro_res = pronosticosCache[partido.id]?.pro_res || 'X';
            const avanzaLocal = pro_res === '1';
            const avanzaVisita = pro_res === '2';
            
            // ========== COLOR AZUL PARA CARDS (fuera del modal) ==========
            if (avanzaVisita && Number(partido.fas) >= 2) {
                alargueInfo = `<div style="display:flex;justify-content:center;align-items:center;gap:4px;margin-top:4px;font-size:10px;color:#007aff;font-weight:600;">⭐ ${partido.nom_vis} avanza en alargue</div>`;
            } else if (avanzaLocal && Number(partido.fas) >= 2) {
                alargueInfo = `<div style="display:flex;justify-content:center;align-items:center;gap:4px;margin-top:4px;font-size:10px;color:#007aff;font-weight:600;">⭐ ${partido.nom_loc} avanza en alargue</div>`;
            }
            
            pronosticoHTML = `<div class="pronostico-container">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:12px;">
                    <span style="font-size:11px;color:#8e8e93;flex-shrink:0;">Tu pronóstico:</span>
                    <div style="flex:1;display:flex;justify-content:center;flex-direction:column;align-items:center;">
                        <div style="background:#f2f2f7;border-radius:10px;padding:6px 16px;display:inline-block;">
                            <span style="font-size:16px;font-weight:700;color:#007aff;">
                                ${pronostico && pronostico.pul !== '0' ? `${pronostico.s1} - ${pronostico.s2}` : '—'}
                            </span>
                        </div>
                        ${alargueInfo}
                    </div>
                    <div style="width:70px;flex-shrink:0;"></div>
                </div>
            </div>`;
        }
    } else if ((esFuturo && estadoEst.editable) || estadoEst.estado === 'primer_tiempo') {
        pronosticoHTML = '<div class="pronostico-container"><div style="margin-top:8px;text-align:center;"><span style="font-size:11px;color:#007aff;font-weight:600;">⚽ HAZ TU PRONÓSTICO</span></div></div>';
    }
    
    return `<div class="partido-card" data-id="${partido.id}" data-fas="${partido.fas}" data-est="${partido.est}" data-fch="${partido.fch}" data-hor="${partido.hor}" style="${cardStyle}" data-fechapartido="${partido.fch ? partido.fch.split('T')[0] : ''}">
        ${badgeHTML}
        ${infoHTML}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="text-align:center;flex:1;">
                <div style="font-size:28px;">${getBandera(partido.nom_loc)}</div>
                <div style="font-size:13px;font-weight:600;color:#000;">${partido.nom_loc}</div>
            </div>
            <div class="${centroExtraClass}" style="text-align:center;min-width:60px;">
                ${centroHTML}
            </div>
            <div style="text-align:center;flex:1;">
                <div style="font-size:28px;">${getBandera(partido.nom_vis)}</div>
                <div style="font-size:13px;font-weight:600;color:#000;">${partido.nom_vis}</div>
            </div>
        </div>
        ${pronosticoHTML}
        ${countdownHTML}
    </div>`;
}

// ========== ACTUALIZAR COUNTDOWNS ==========
function actualizarCountdowns() {
    const countdownElements = document.querySelectorAll('.partido-countdown');
    if (countdownElements.length === 0) return;
    const { fecha: fechaReal, hora: horaReal } = obtenerFechaReal();
    countdownElements.forEach(el => {
        const fechaPartido = el.dataset.fch;
        const horaPartido = el.dataset.hor;
        if (fechaPartido && horaPartido) {
            const diffMs = new Date(`${fechaPartido}T${horaPartido}`) - new Date(`${fechaReal}T${horaReal}`);
            if (diffMs > 0) {
                const diffSegundos = Math.floor(diffMs / 1000);
                const dias = Math.floor(diffSegundos / 86400);
                const horas = Math.floor((diffSegundos % 86400) / 3600);
                const minutos = Math.floor((diffSegundos % 3600) / 60);
                const partes = [];
                if (dias > 0) partes.push(`${dias}d`);
                if (horas > 0) partes.push(`${horas}h`);
                if (minutos > 0) partes.push(`${minutos}m`);
                if (partes.length === 0) partes.push('<1m');
                el.textContent = `⏱️ Faltan ${partes.join(' ')}`;
            } else {
                el.style.display = 'none';
            }
        }
    });
}

function iniciarCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => { if (!document.hidden) actualizarCountdowns(); }, 1000);
    countdownActivo = true;
}

function detenerCountdown() {
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
    countdownActivo = false;
}

// ========== ACTUALIZAR MARCADORES EN VIVO ==========
async function actualizarMarcadoresEnVivo() {
    const cardsEnVivo = document.querySelectorAll('.partido-card[data-est="2"], .partido-card[data-est="3"]');
    if (cardsEnVivo.length === 0) return;
    
    try {
        const timestamp = Date.now();
        const response = await fetch(`${BASE}/fifa_ptd?api_key=${KEY}&filter[est]=2,3&_=${timestamp}`);
        const data = await response.json();
        const partidosEnVivo = data.fifa_ptd || [];
        
        partidosEnVivo.forEach(partido => {
            const card = document.querySelector(`.partido-card[data-id="${partido.id}"]`);
            if (card) {
                const centroDiv = card.querySelector('.centro-marcador-envivo');
                if (centroDiv) {
                    const golLoc = (partido.gol_loc !== undefined && partido.gol_loc !== null) 
                        ? partido.gol_loc 
                        : (partido.t90_gol_loc || 0);
                    const golVis = (partido.gol_vis !== undefined && partido.gol_vis !== null) 
                        ? partido.gol_vis 
                        : (partido.t90_gol_vis || 0);
                    
                    const est = Number(partido.est);
                    const texto = est === 2 ? '1er TIEMPO' : '2do TIEMPO';
                    const color = est === 2 ? '#ff9500' : '#8e8e93';
                    
                    centroDiv.innerHTML = `
                        <div style="font-size:20px;font-weight:700;color:#ff3b30;">${golLoc} - ${golVis}</div>
                        <div style="font-size:10px;color:${color};margin-top:4px;">🔴 ${texto}</div>
                    `;
                }
            }
        });
    } catch (error) {
        console.error('[EnVivo] Error actualizando marcadores:', error);
    }
}

function iniciarActualizacionEnVivo() {
    if (enVivoInterval) clearInterval(enVivoInterval);
    enVivoInterval = setInterval(() => {
        if (!document.hidden) {
            actualizarMarcadoresEnVivo();
        }
    }, 60000);
}

function detenerActualizacionEnVivo() {
    if (enVivoInterval) {
        clearInterval(enVivoInterval);
        enVivoInterval = null;
    }
}

// ========== OBTENER PRIMER DÍA CON PARTIDOS ==========
function obtenerPrimerDiaConPartidos(partidos) {
    if (!partidos || partidos.length === 0) return null;
    const fechas = [...new Set(partidos.filter(p => Number(p.est) !== 0 && p.fch).map(p => p.fch.split('T')[0]))].sort();
    return fechas.length > 0 ? fechas[0] : null;
}

function scrollAPrimerDestacado() {
    if (tabActivo !== 'todos') return;
    const contenedorScroll = document.getElementById('partidos-contenido-scroll');
    if (!contenedorScroll) return;
    setTimeout(() => {
        const cards = document.querySelectorAll('.partido-card');
        if (cards.length === 0) return;
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const borderColor = window.getComputedStyle(card).borderColor;
            if (borderColor.includes('46, 204, 113') || borderColor.includes('46,204,113')) {
                card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }
        }
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const borderColor = window.getComputedStyle(card).borderColor;
            if (borderColor.includes('230, 126, 34') || borderColor.includes('230,126,34')) {
                card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }
        }
        contenedorScroll.scrollTo({ top: 0, behavior: 'smooth' });
    }, 500);
}

// ========== REFRESCAR CONTENIDO ==========
async function refrescarContenido() {
    const contenedorScroll = document.getElementById('partidos-contenido-scroll');
    if (!contenedorScroll) return;
    
    if (currentJugador) {
        await cargarPronosticos(currentJugador.id, false);
        const especialesData = cargarPronosticosEspecialesLocal();
        if (especialesData.grupos) {
            Object.assign(gruposSeleccion, especialesData.grupos);
        }
    }
    
    const fechaSim = simGetFechaStr ? simGetFechaStr() : new Date().toISOString().split('T')[0];
    const horaSim = simGetHoraStr ? simGetHoraStr() : new Date().toTimeString().split(' ')[0].substring(0,5);
    
    const faseMax = getFaseMaximaPorFecha(fechaSim);
    console.log(`[Partidos] Fase máxima permitida para ${fechaSim}: ${faseMax}`);
    
    const partidosVisibles = partidosCache.filter(p => { 
        const est = Number(p.est); 
        return est >= 1 && est <= 4 && p.fas <= faseMax; 
    });
    
    console.log(`[Partidos] ${partidosVisibles.length} partidos visibles (fas <= ${faseMax})`);
    const primerDia = obtenerPrimerDiaConPartidos(partidosVisibles);
    
    if (tabActivo === 'todos') {
        const cardsPromises = partidosVisibles.map(async (p) => {
            const fechaPartido = p.fch ? p.fch.split('T')[0] : '';
            const tipo = getTipoFondo(fechaPartido, fechaSim);
            const esPrimerDia = (fechaPartido === primerDia);
            return renderPartidoCard(p, fechaSim, horaSim, tipo, esPrimerDia);
        });
        const cards = await Promise.all(cardsPromises);
        
        contenedorScroll.innerHTML = `<div style="padding:16px;"><div id="partidos-lista">${cards.join('')}</div></div>`;
        
        scrollAPrimerDestacado();
        
    } else if (tabActivo === 'grupos') {
        contenedorScroll.innerHTML = `
            <div style="display:flex;justify-content:center;align-items:center;padding:16px;min-height:400px;">
                <img src="./img/cruces.jpg" alt="Cruces de 16avos de final - Mundial 2026" style="max-width:100%;height:auto;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.1);"/>
            </div>
        `;
        setTimeout(() => {
            if (contenedorScroll) contenedorScroll.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
        
    } else if (tabActivo === 'colombia') {
        const partidosColombia = partidosVisibles.filter(p => (p.nom_loc === 'Colombia' || p.nom_vis === 'Colombia'));
        
        const cardsPromises = partidosColombia.map(async (p) => {
            const fechaPartido = p.fch ? p.fch.split('T')[0] : '';
            const tipo = getTipoFondo(fechaPartido, fechaSim);
            const esPrimerDia = (fechaPartido === primerDia);
            return renderPartidoCard(p, fechaSim, horaSim, tipo, esPrimerDia);
        });
        const cards = await Promise.all(cardsPromises);
        
        contenedorScroll.innerHTML = `<div style="padding:16px;">
            <div style="margin-bottom:16px;"><h3 style="color:#1c1c1e;font-size:16px;margin:0;">🇨🇴 Partidos de Colombia</h3></div>
            <div id="partidos-lista" style="margin-top:16px;">${cards.length > 0 ? cards.join('') : '<div style="text-align:center;padding:40px;color:#8e8e93;">No hay partidos programados para Colombia</div>'}</div>
        </div>`;
        
        setTimeout(() => {
            if (contenedorScroll) contenedorScroll.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    }
    
    document.querySelectorAll('.partido-card').forEach(card => {
        const id = parseInt(card.dataset.id);
        const partido = partidosCache.find(p => p.id === id);
        if (partido) { card.onclick = () => abrirModal(partido, fechaSim, horaSim); }
    });
}

// ========== CAMBIAR TAB ==========
function cambiarTab(tab) { 
    tabActivo = tab; 
    document.querySelectorAll('.partidos-tab').forEach(t => { 
        if (t.dataset.tab === tab) { t.classList.add('active'); t.style.background = '#007aff'; t.style.color = '#fff'; } 
        else { t.classList.remove('active'); t.style.background = '#f2f2f7'; t.style.color = '#3c3c43'; } 
    }); 
    refrescarContenido(); 
}

// ========== RENDERIZAR PRINCIPAL ==========
export async function renderizarPartidos(contenedor, datosCuenta, tabInicial = 'todos') {
    if (!contenedor) return;
    currentJugador = datosCuenta;
    detenerCountdown();
    detenerActualizacionEnVivo();
    tempPronosticos.clear();
    for (const [ptdId, timeout] of syncIntervals) { clearTimeout(timeout); }
    syncIntervals.clear();
    
    await cargarEquipos();
    await cargarPartidos();
    await cargarPronosticos(datosCuenta.id, true);
    
    const especialesData = cargarPronosticosEspecialesLocal();
    if (especialesData.grupos) {
        Object.assign(gruposSeleccion, especialesData.grupos);
    }
    
    if (!simuladorSuscrito && typeof onSimuladorCambio === 'function') { 
        simuladorSuscrito = true; 
        onSimuladorCambio(() => refrescarContenido()); 
    }
    
    if (tabInicial === 'grupos') {
        grupoActivo = 'A';
    }
    
    contenedor.innerHTML = `<div style="width:100%;height:100%;display:flex;flex-direction:column;background:#fff;border-radius:16px;overflow:hidden;">
        <div style="flex-shrink:0;display:flex;gap:8px;padding:12px 16px;background:#fff;border-bottom:1px solid #e5e5ea;">
            <button class="partidos-tab ${tabInicial === 'todos' ? 'active' : ''}" data-tab="todos" style="flex:1;padding:10px;border:none;border-radius:12px;background:${tabInicial === 'todos' ? '#007aff' : '#f2f2f7'};color:${tabInicial === 'todos' ? '#fff' : '#3c3c43'};cursor:pointer;">📋 TODOS</button>
            <button class="partidos-tab ${tabInicial === 'grupos' ? 'active' : ''}" data-tab="grupos" style="flex:1;padding:10px;border:none;border-radius:12px;background:${tabInicial === 'grupos' ? '#007aff' : '#f2f2f7'};color:${tabInicial === 'grupos' ? '#fff' : '#3c3c43'};cursor:pointer;">📊 CRUCES</button>
            <button class="partidos-tab ${tabInicial === 'colombia' ? 'active' : ''}" data-tab="colombia" style="flex:1;padding:10px;border:none;border-radius:12px;background:${tabInicial === 'colombia' ? '#007aff' : '#f2f2f7'};color:${tabInicial === 'colombia' ? '#fff' : '#3c3c43'};cursor:pointer;">🇨🇴 COLOMBIA</button>
        </div>
        <div id="partidos-contenido-scroll" style="flex:1;overflow-y:auto;"></div>
    </div>`;
    
    document.querySelectorAll('.partidos-tab').forEach(tab => { 
        tab.onclick = () => cambiarTab(tab.dataset.tab); 
    });
    
    tabActivo = tabInicial;
    refrescarContenido();
    
    iniciarActualizacionEnVivo();
    
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { 
            detenerCountdown();
            detenerActualizacionEnVivo();
        } else { 
            if (document.querySelectorAll('.partido-countdown').length > 0) { iniciarCountdown(); actualizarCountdowns(); }
            iniciarActualizacionEnVivo();
            refrescarContenido();
        }
    });
}

// ========== EXPORTAR FUNCIONES ==========
export { cargarPartidos, getBandera, formatearHora12h };
