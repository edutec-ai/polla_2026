// funciones/partidos.js
// Módulo de Partidos - La Polla Mundialista 2026
// CORREGIDO:
// - ✅ Implementado sistema de PULSO (multiplicador de puntos según campo 'pul' de Velneo)
// - ✅ Para partidos TERMINADOS, ignora cache local y siempre consulta API fresca
// - ✅ Forzar actualización de 'pul' cuando el partido está en est=4
// - ✅ CORREGIDO: Promise.all para evitar [object Promise]
// - ✅ NUEVO: Permite apostar durante 1er tiempo (est=2) solo si NO tiene pronóstico (PULSO 50)
// - ✅ NUEVO: Bloquea completamente en 2do tiempo (est=3) y terminado (est=4)
// - ✅ NUEVO: Valores vacíos (placeholder "-") cuando pul=0 (nunca ha pronosticado)
// - ✅ NUEVO: Mensajes de toast en dos líneas con <br>
// - ✅ NUEVO: Badge de advertencia para 0-0
// - Acepta parámetro tabInicial (todos/grupos/colombia)
// - Scroll automático al inicio cuando se cambia a GRUPOS
// - Grupo A activo por defecto al entrar a GRUPOS
// - NO actualiza cache hasta que Velneo confirme éxito (COD=1)
// - Lee respuesta de Velneo (COD y DES)
// - Revertir a valor original si hay error
// - Tabla de posiciones con columna flexible
// - Redirección desde ahora.js funciona correctamente

import { onSimuladorCambio, simGetFechaStr, simGetHoraStr } from './lab.js';
import { gruposSeleccion } from './especiales.js';
import { getBandera } from './banderas.js';
import { cargarPronosticosPartidosLocal, guardarPronosticosPartidosLocal, cargarPronosticosEspecialesLocal } from './sync.js';

const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
const BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

// Mapeo de multiplicadores de PULSO según la tabla FIFA_PUL
function getMultiplicadorPulso(pul) {
    if (pul === '1') return 1;      // PULSO 100 → 100% de puntos
    if (pul === '2') return 0.5;    // PULSO 50 → 50% de puntos
    return 0;                        // PULSO 0 → 0% de puntos
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

let partidosCache = [], equiposCache = [], pronosticosCache = {}, resultadosRealesCache = {};
let tabActivo = 'todos', grupoActivo = 'A', simuladorSuscrito = false, currentJugador = null;
let countdownInterval = null;
let countdownActivo = false;
let syncIntervals = new Map();
let tempPronosticos = new Map();
let enVivoInterval = null;
let globalCambiarVistaCallback = null;

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
                pul: pronostico.pul || '0'
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
                pul: pronostico.pul || '0'
            };
        }
        return null;
    } catch (error) {
        console.error('[Partidos] Error obteniendo pronóstico fresco:', error);
        return null;
    }
}

async function sincronizarConVelneo(ptdId) {
    if (!currentJugador) return;
    try {
        const valorActual = await obtenerPronosticoActual(ptdId);
        if (valorActual) {
            pronosticosCache[ptdId] = { s1: valorActual.s1, s2: valorActual.s2, pul: valorActual.pul };
            guardarPronosticosPartidosLocal(pronosticosCache);
            const temp = tempPronosticos.get(ptdId);
            if (temp && (temp.s1 !== valorActual.s1 || temp.s2 !== valorActual.s2)) {
                console.log(`[Sync] Partido ${ptdId}: temporal ${temp.s1}-${temp.s2} vs Velneo ${valorActual.s1}-${valorActual.s2}`);
                actualizarCardPartido(ptdId, valorActual.s1, valorActual.s2);
            }
            tempPronosticos.delete(ptdId);
            if (syncIntervals.has(ptdId)) {
                clearTimeout(syncIntervals.get(ptdId));
                syncIntervals.delete(ptdId);
            }
        }
    } catch (error) {
        console.error(`[Sync] Error sincronizando partido ${ptdId}:`, error);
    }
}

function iniciarSincronizacionPeriodica(ptdId, s1, s2) {
    if (syncIntervals.has(ptdId)) {
        clearTimeout(syncIntervals.get(ptdId));
        syncIntervals.delete(ptdId);
    }
    tempPronosticos.set(ptdId, { s1, s2, timestamp: Date.now() });
    const timeoutId = setTimeout(() => { sincronizarConVelneo(ptdId); }, 30000);
    syncIntervals.set(ptdId, timeoutId);
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
                pul: p.pul || '0'
            }; 
        });
        guardarPronosticosPartidosLocal(pronosticosCache);
        console.log(`[Partidos] ✅ ${Object.keys(pronosticosCache).length} pronósticos desde API (con PULSO)`);
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
                pronosticosCache[ptdId] = { s1: pronosticoFresco.s1, s2: pronosticoFresco.s2, pul: pronosticoFresco.pul };
                guardarPronosticosPartidosLocal(pronosticosCache);
                return pronosticoFresco;
            }
        }
    }
    return pronosticosCache[ptdId];
}

function actualizarLocalStorage() { 
    guardarPronosticosPartidosLocal(pronosticosCache); 
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

function renderTablaPosiciones(grupo) {
    const equiposGrupo = equiposCache.filter(e => obtenerGrupoPorEquipo(e.name) === grupo);
    const clasificados = gruposSeleccion[grupo] || {};
    
    if (!equiposGrupo.length) {
        return '<div style="padding:20px;text-align:center;color:#8e8e93;">Sin datos del grupo ' + grupo + '</div>';
    }
    
    equiposGrupo.forEach(eq => {
        eq.pj = 0;
        eq.pg = 0;
        eq.pe = 0;
        eq.pp = 0;
        eq.gf = 0;
        eq.gc = 0;
        
        const partidosGrupo = partidosCache.filter(p => 
            p.grupoCalculado === grupo && 
            (p.nom_loc === eq.name || p.nom_vis === eq.name) &&
            Number(p.est) !== 0 && 
            Number(p.est) !== 1
        );
        
        partidosGrupo.forEach(p => {
            const esLocal = p.nom_loc === eq.name;
            const esVisitante = p.nom_vis === eq.name;
            
            if (esLocal || esVisitante) {
                eq.pj++;
                
                let golesFavor, golesContra;
                const est = Number(p.est);
                
                if (est === 4) {
                    const resultado = getResultadoReal(p.id);
                    if (resultado) {
                        golesFavor = esLocal ? resultado.gol_loc : resultado.gol_vis;
                        golesContra = esLocal ? resultado.gol_vis : resultado.gol_loc;
                    }
                } else if (est === 2 || est === 3) {
                    const marcador = getMarcadorEnVivo(p);
                    if (marcador) {
                        golesFavor = esLocal ? marcador.gol_loc : marcador.gol_vis;
                        golesContra = esLocal ? marcador.gol_vis : marcador.gol_loc;
                    }
                }
                
                if (golesFavor !== undefined) {
                    eq.gf += golesFavor;
                    eq.gc += golesContra;
                    
                    if (golesFavor > golesContra) {
                        eq.pg++;
                    } else if (golesFavor === golesContra) {
                        eq.pe++;
                    } else {
                        eq.pp++;
                    }
                }
            }
        });
        
        eq.dif = eq.gf - eq.gc;
        eq.pts = (eq.pg * 3) + eq.pe;
    });
    
    equiposGrupo.sort((a, b) => {
        if (a.pts !== b.pts) return b.pts - a.pts;
        if (a.dif !== b.dif) return b.dif - a.dif;
        return b.gf - a.gf;
    });
    
    let html = `
        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
            <style>
                .tabla-posiciones {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    min-width: 550px;
                }
                .tabla-posiciones th {
                    padding: 10px 6px;
                    background: #f2f2f7;
                    border-bottom: 1px solid #e5e5ea;
                    font-weight: 600;
                    color: #3c3c43;
                }
                .tabla-posiciones td {
                    padding: 10px 6px;
                    border-bottom: 0.5px solid #f0f0f0;
                }
                .tabla-posiciones th:nth-child(1),
                .tabla-posiciones td:nth-child(1) {
                    width: 45px;
                    text-align: center;
                }
                .tabla-posiciones th:nth-child(2),
                .tabla-posiciones td:nth-child(2) {
                    text-align: left;
                    white-space: normal;
                    word-break: break-word;
                    min-width: 140px;
                }
                .tabla-posiciones th:nth-child(n+3),
                .tabla-posiciones td:nth-child(n+3) {
                    width: 45px;
                    text-align: center;
                    white-space: nowrap;
                }
            </style>
            <table class="tabla-posiciones">
                <thead>
                    <tr>
                        <th>Pos</th>
                        <th>Equipo</th>
                        <th>PJ</th>
                        <th>G</th>
                        <th>E</th>
                        <th>P</th>
                        <th>GF</th>
                        <th>GC</th>
                        <th>DG</th>
                        <th>PTS</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    equiposGrupo.forEach((eq, idx) => {
        const posicion = idx + 1;
        const esClasificado1 = eq.name === clasificados[1];
        const esClasificado2 = eq.name === clasificados[2];
        
        let badgeClasificacion = '';
        if (esClasificado1) badgeClasificacion = ' 🏆[1]';
        else if (esClasificado2) badgeClasificacion = ' ✅[2]';
        
        let bgColor = '';
        if (posicion === 1) bgColor = 'rgba(255, 215, 0, 0.08)';
        else if (posicion === 2) bgColor = 'rgba(192, 192, 192, 0.08)';
        
        const difFormateado = eq.dif > 0 ? `+${eq.dif}` : eq.dif;
        
        html += `
            <tr style="background: ${bgColor};">
                <td style="font-weight: 600; color: ${posicion <= 2 ? '#34c759' : '#1c1c1e'};">${posicion}</td>
                <td>
                    <span style="font-size: 16px; margin-right: 6px;">${getBandera(eq.name)}</span>
                    ${eq.name}${badgeClasificacion}
                </td>
                <td>${eq.pj || 0}</td>
                <td style="color: ${eq.pg > 0 ? '#34c759' : '#1c1c1e'};">${eq.pg || 0}</td>
                <td style="color: ${eq.pe > 0 ? '#ff9500' : '#1c1c1e'};">${eq.pe || 0}</td>
                <td style="color: ${eq.pp > 0 ? '#ff3b30' : '#1c1c1e'};">${eq.pp || 0}</td>
                <td>${eq.gf || 0}</td>
                <td>${eq.gc || 0}</td>
                <td style="color: ${eq.dif > 0 ? '#34c759' : (eq.dif < 0 ? '#ff3b30' : '#1c1c1e')};">${difFormateado || 0}</td>
                <td style="font-weight: 700; color: #007aff;">${eq.pts || 0}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    return html;
}

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
        pronostico = { s1: temp.s1, s2: temp.s2 };
    }
    const resultadoReal = getResultadoReal(partido.id);
    const estilo = getFondoStyle(tipoFondo);
    const marcadorEnVivo = getMarcadorEnVivo(partido);
    
    if (!estadoEst.visible) return '';
    
    let badgeHTML = '';
    if (estadoEst.estado === 'terminado') {
        badgeHTML = `<div style="text-align:center; margin-bottom:10px;"><span style="background:rgba(52, 199, 89, 0.15); padding:4px 12px; border-radius:20px; color:#34c759; font-size:13px; font-weight:700;">${estadoEst.icono} ${estadoEst.texto}</span></div>`;
    } else if (estadoEst.estado === 'primer_tiempo') {
        badgeHTML = `<div style="text-align:center; margin-bottom:10px;"><span style="background:rgba(255, 149, 0, 0.15); padding:4px 12px; border-radius:20px; color:#ff9500; font-size:13px; font-weight:700;">🟡 PULSO 50 - 1er TIEMPO</span></div>`;
    } else if (estadoEst.estado === 'segundo_tiempo') {
        badgeHTML = `<div style="text-align:center; margin-bottom:10px;"><span style="background:rgba(142, 142, 147, 0.15); padding:4px 12px; border-radius:20px; color:#8e8e93; font-size:13px; font-weight:700;">🔴 CERRADO - 2do TIEMPO</span></div>`;
    }
    
    const fechaFormateada = formatearFecha(partido.fch);
    const horaFormateada = partido.hor ? formatearHora12h(partido.hor) : '';
    const grupoDisplay = partido.grupoCalculado ? `Grupo ${partido.grupoCalculado}` : `Fase ${partido.fas}`;
    
    let infoHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <span style="font-size:11px; color:#8e8e93;">${grupoDisplay}</span>
        <span style="font-size:11px; color:#8e8e93; text-align:center;">${fechaFormateada}</span>
        <span style="font-size:11px; padding:3px 10px; border-radius:20px; background:#f2f2f7; color:#8e8e93;">${horaFormateada}</span>
    </div>`;
    
    const cardStyle = `${estilo.bg}; border-radius:14px; padding:14px; margin-bottom:10px; border: ${estilo.borderWidth} solid ${estilo.border}; cursor:pointer;`;
    
    let centroHTML = '';
    let centroExtraClass = '';
    
    if (resultadoReal && estadoEst.estado === 'terminado') {
        centroHTML = `<div style="font-size:20px; font-weight:700; color:#000;">${resultadoReal.gol_loc} - ${resultadoReal.gol_vis}</div>`;
    } else if (estadoEst.estado === 'primer_tiempo' && marcadorEnVivo) {
        centroHTML = `
            <div style="font-size:20px; font-weight:700; color:#ff3b30;">${marcadorEnVivo.gol_loc} - ${marcadorEnVivo.gol_vis}</div>
            <div style="font-size:10px; color:#ff9500; margin-top:4px;">🔴 1er TIEMPO</div>
        `;
        centroExtraClass = 'centro-marcador-envivo';
    } else if (estadoEst.estado === 'segundo_tiempo' && marcadorEnVivo) {
        centroHTML = `
            <div style="font-size:20px; font-weight:700; color:#ff3b30;">${marcadorEnVivo.gol_loc} - ${marcadorEnVivo.gol_vis}</div>
            <div style="font-size:10px; color:#8e8e93; margin-top:4px;">⚫ 2do TIEMPO</div>
        `;
        centroExtraClass = 'centro-marcador-envivo';
    } else if (estadoEst.estado === 'pendiente') {
        centroHTML = '<div style="font-size:14px; font-weight:700; color:#007aff;">VS</div>';
        centroExtraClass = 'centro-marcador-pendiente';
    } else {
        centroHTML = '<div style="font-size:14px; font-weight:700; color:#8e8e93;">- - -</div>';
        centroExtraClass = 'centro-marcador-other';
    }
    
    let countdownHTML = '';
    if (esPrimerDia && estadoEst.estado === 'pendiente' && partido.fch && partido.hor) {
        const fechaPartido = partido.fch.split('T')[0];
        const { fecha: fechaReal, hora: horaReal } = obtenerFechaReal();
        const countdownText = calcularCountdown(fechaPartido, partido.hor, fechaReal, horaReal);
        if (countdownText) {
            countdownHTML = `<div class="partido-countdown" data-id="${partido.id}" data-fch="${fechaPartido}" data-hor="${partido.hor}" style="margin-top:8px; font-size:11px; color:#ff9500; text-align:center; font-weight:600;">⏱️ ${countdownText}</div>`;
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
            
            const pronosticoGanador = pronosticoLocal > pronosticoVisita ? 'local' : (pronosticoVisita > pronosticoLocal ? 'visita' : 'empate');
            const realGanador = realLocal > realVisita ? 'local' : (realVisita > realLocal ? 'visita' : 'empate');
            
            if (pronosticoGanador === realGanador) ganador = p.GANADOR;
            if (realLocal === pronosticoLocal) golLocal = p.GOL;
            if (realVisita === pronosticoVisita) golVisita = p.GOL;
            
            const pronosticoDiferencia = Math.abs(pronosticoLocal - pronosticoVisita);
            const realDiferencia = Math.abs(realLocal - realVisita);
            if (pronosticoDiferencia === realDiferencia) diferencia = p.DIFERENCIA;
            
            if (pronosticoGanador !== realGanador) {
                if (realLocal === pronosticoVisita && realVisita === pronosticoLocal) inverso = p.INVERSO;
            }
            
            let total = ganador + golLocal + golVisita + diferencia + inverso;
            const multiplicadorPulso = getMultiplicadorPulso(pronostico.pul || '0');
            const totalConPulso = Math.round(total * multiplicadorPulso);
            
            let pulsoHTML = '';
            if (multiplicadorPulso === 0.5) {
                pulsoHTML = `<div style="margin-top: 4px;"><span style="background: #ff9500; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 9px;">⚡ PULSO 50</span></div>`;
            } else if (multiplicadorPulso === 0 && total > 0) {
                pulsoHTML = `<div style="margin-top: 4px;"><span style="background: #8e8e93; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 9px;">❌ PULSO 0</span></div>`;
            }
            
            pronosticoHTML = `<div class="pronostico-container"><div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; gap:12px;">
                <span style="font-size:11px; color:#8e8e93; flex-shrink:0;">Tu pronóstico:</span>
                <div style="flex:1; display:flex; justify-content:center;">
                    <div style="background:#f2f2f7; border-radius:10px; padding:6px 16px; display:inline-block;">
                        <span style="font-size:16px; font-weight:700; color:#007aff;">
                            ${pronostico && pronostico.pul !== '0' ? `${pronosticoLocal} - ${pronosticoVisita}` : '—'}
                        </span>
                    </div>
                </div>
                <div style="background:#fff2f2; border:1px solid #ffd0d0; border-radius:10px; padding:6px 16px; flex-shrink:0;">
                    <span style="font-size:13px; font-weight:800; color:#c0392b;">${totalConPulso} pts</span>
                    ${pulsoHTML}
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; gap:12px;">
                <span style="font-size:11px; color:#8e8e93; flex-shrink:0;">Resultado real:</span>
                <div style="flex:1; display:flex; justify-content:center;">
                    <div style="background:#eafaf1; border-radius:10px; padding:6px 16px; display:inline-block;">
                        <span style="font-size:16px; font-weight:700; color:#34c759;">${realLocal} - ${realVisita}</span>
                    </div>
                </div>
                <div style="width:70px; flex-shrink:0;"></div>
            </div></div>`;
        } else {
            pronosticoHTML = `<div class="pronostico-container"><div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; gap:12px;">
                <span style="font-size:11px; color:#8e8e93; flex-shrink:0;">Tu pronóstico:</span>
                <div style="flex:1; display:flex; justify-content:center;">
                    <div style="background:#f2f2f7; border-radius:10px; padding:6px 16px; display:inline-block;">
                        <span style="font-size:16px; font-weight:700; color:#007aff;">
                            ${pronostico && pronostico.pul !== '0' ? `${pronostico.s1} - ${pronostico.s2}` : '—'}
                        </span>
                    </div>
                </div>
                <div style="width:70px; flex-shrink:0;"></div>
            </div></div>`;
        }
    } else if ((esFuturo && estadoEst.editable) || estadoEst.estado === 'primer_tiempo') {
        pronosticoHTML = '<div class="pronostico-container"><div style="margin-top:8px; text-align:center;"><span style="font-size:11px; color:#007aff; font-weight:600;">⚽ HAZ TU PRONÓSTICO</span></div></div>';
    }
    
    return `<div class="partido-card" data-id="${partido.id}" data-fas="${partido.fas}" data-est="${partido.est}" data-fch="${partido.fch}" data-hor="${partido.hor}" style="${cardStyle}" data-fechapartido="${partido.fch ? partido.fch.split('T')[0] : ''}">
        ${badgeHTML}
        ${infoHTML}
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <div style="text-align:center; flex:1;">
                <div style="font-size:28px;">${getBandera(partido.nom_loc)}</div>
                <div style="font-size:13px; font-weight:600; color:#000;">${partido.nom_loc}</div>
            </div>
            <div class="${centroExtraClass}" style="text-align:center; min-width:60px;">
                ${centroHTML}
            </div>
            <div style="text-align:center; flex:1;">
                <div style="font-size:28px;">${getBandera(partido.nom_vis)}</div>
                <div style="font-size:13px; font-weight:600; color:#000;">${partido.nom_vis}</div>
            </div>
        </div>
        ${pronosticoHTML}
        ${countdownHTML}
    </div>`;
}

function calcularCountdown(fechaPartido, horaPartido, fechaActual, horaActual) {
    const [year, month, day] = fechaPartido.split('-');
    const [hour, minute] = horaPartido.split(':');
    const fechaObjetivo = new Date(year, month - 1, day, hour, minute, 0);
    const [actualYear, actualMonth, actualDay] = fechaActual.split('-');
    const [actualHour, actualMinute] = horaActual.split(':');
    const fechaActualDate = new Date(actualYear, actualMonth - 1, actualDay, actualHour, actualMinute, 0);
    const diffMs = fechaObjetivo - fechaActualDate;
    if (diffMs <= 0) return null;
    const diffSegundos = Math.floor(diffMs / 1000);
    const dias = Math.floor(diffSegundos / 86400);
    const horas = Math.floor((diffSegundos % 86400) / 3600);
    const minutos = Math.floor((diffSegundos % 3600) / 60);
    const segundos = diffSegundos % 60;
    
    const partes = [];
    if (dias > 0) partes.push(`${dias} ${dias === 1 ? 'día' : 'días'}`);
    if (horas > 0) partes.push(`${horas} ${horas === 1 ? 'hora' : 'horas'}`);
    if (minutos > 0) partes.push(`${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`);
    if (segundos > 0 && dias === 0 && horas === 0) partes.push(`${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}`);
    if (partes.length === 0) return 'Faltan menos de un minuto';
    if (partes.length === 1) return `Faltan ${partes[0]}`;
    if (partes.length === 2) return `Faltan ${partes[0]} y ${partes[1]}`;
    return `Faltan ${partes[0]}, ${partes[1]} y ${partes[2]}`;
}

function actualizarCountdowns() {
    const countdownElements = document.querySelectorAll('.partido-countdown');
    if (countdownElements.length === 0) return;
    const { fecha: fechaReal, hora: horaReal } = obtenerFechaReal();
    countdownElements.forEach(el => {
        const fechaPartido = el.dataset.fch;
        const horaPartido = el.dataset.hor;
        if (fechaPartido && horaPartido) {
            const countdown = calcularCountdown(fechaPartido, horaPartido, fechaReal, horaReal);
            if (countdown) {
                el.textContent = `⏱️ ${countdown}`;
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
                        <div style="font-size:20px; font-weight:700; color:#ff3b30;">${golLoc} - ${golVis}</div>
                        <div style="font-size:10px; color:${color}; margin-top:4px;">🔴 ${texto}</div>
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

async function guardarPronostico(ptdId, s1, s2, pul = '1') {
    if (!currentJugador) { 
        mostrarToast('Inicia sesión primero', 'err'); 
        return; 
    }
    
    const originalPronostico = pronosticosCache[ptdId];
    
    mostrarToast('💾 Guardando...', 'info');
    
    try {
        const response = await fetch(`${BASE_V2}/_process/API_PUT_PAR?api_key=${KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ 
                jug: currentJugador.id, 
                id: ptdId, 
                pro_gol_loc: s1, 
                pro_gol_vis: s2, 
                pro_res: s1 > s2 ? '1' : s2 > s1 ? '2' : 'X',
                pul: pul
            })
        });
        
        const respuesta = await response.json();
        console.log('[Partidos] Respuesta de Velneo:', respuesta);
        
        if (respuesta.COD === 1) {
            pronosticosCache[ptdId] = { s1, s2, pul: pul };
            actualizarLocalStorage();
            actualizarCardPartido(ptdId, s1, s2);
            
            if (pul === '2') {
                mostrarToast('✅ Pronóstico guardado con PULSO 50<br>(puntos reducidos a la mitad)', 'ok');
            } else {
                mostrarToast('✅ Pronóstico guardado correctamente', 'ok');
            }
            
            tempPronosticos.delete(ptdId);
            if (syncIntervals.has(ptdId)) {
                clearTimeout(syncIntervals.get(ptdId));
                syncIntervals.delete(ptdId);
            }
            
            setTimeout(() => sincronizarConVelneo(ptdId), 2000);
            
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

function abrirModal(partido, fechaSim, horaSim) {
    const estadoEst = getEstadoPartidoPorEst(partido);
    let pronostico = pronosticosCache[partido.id] || { s1: 0, s2: 0, pul: '0' };
    const temp = tempPronosticos.get(partido.id);
    if (temp && (Date.now() - temp.timestamp) < 30000) { 
        pronostico = { s1: temp.s1, s2: temp.s2, pul: pronostico.pul || '0' }; 
    }
    const ptsBase = estadoEst.puntosBase || getPtsBase(partido.fas);
    
    // ========== VALIDACIONES DE APUESTA ==========
    
    if (estadoEst.estado === 'terminado') {
        const resultadoReal = getResultadoReal(partido.id);
        if (!resultadoReal) { mostrarToast('Partido finalizado sin resultados disponibles', 'err'); return; }
        const pronosticoLocal = pronostico.s1;
        const pronosticoVisita = pronostico.s2;
        const realLocal = resultadoReal.gol_loc;
        const realVisita = resultadoReal.gol_vis;
        let ganador = 0, golLocal = 0, golVisita = 0, diferencia = 0, inverso = 0;
        const ptsBaseOriginal = getPtsBase(partido.fas);
        const p = { GANADOR: Math.round(ptsBaseOriginal * 0.4), GOL: Math.round(ptsBaseOriginal * 0.2), DIFERENCIA: Math.round(ptsBaseOriginal * 0.2), INVERSO: Math.round(ptsBaseOriginal * 0.2) };
        const pronosticoGanador = pronosticoLocal > pronosticoVisita ? 'local' : (pronosticoVisita > pronosticoLocal ? 'visita' : 'empate');
        const realGanador = realLocal > realVisita ? 'local' : (realVisita > realLocal ? 'visita' : 'empate');
        if (pronosticoGanador === realGanador) ganador = p.GANADOR;
        if (realLocal === pronosticoLocal) golLocal = p.GOL;
        if (realVisita === pronosticoVisita) golVisita = p.GOL;
        const pronosticoDiferencia = Math.abs(pronosticoLocal - pronosticoVisita);
        const realDiferencia = Math.abs(realLocal - realVisita);
        if (pronosticoDiferencia === realDiferencia) diferencia = p.DIFERENCIA;
        if (pronosticoGanador !== realGanador && realLocal === pronosticoVisita && realVisita === pronosticoLocal) inverso = p.INVERSO;
        
        let total = ganador + golLocal + golVisita + diferencia + inverso;
        const multiplicadorPulso = getMultiplicadorPulso(pronostico.pul || '0');
        const totalConPulso = Math.round(total * multiplicadorPulso);
        
        let pulsoHTML = '';
        if (multiplicadorPulso === 0.5) {
            pulsoHTML = `<div style="margin-top: 8px; text-align: center;"><span style="background: #ff9500; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 10px;">⚡ PULSO 50 - Puntos reducidos a la mitad</span></div>`;
        } else if (multiplicadorPulso === 0 && total > 0) {
            pulsoHTML = `<div style="margin-top: 8px; text-align: center;"><span style="background: #8e8e93; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 10px;">❌ PULSO 0 - Sin puntos</span></div>`;
        }
        
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:3000;display:flex;align-items:flex-end;justify-content:center;';
        overlay.innerHTML = `<div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:16px;"><div style="font-size:17px;font-weight:700;">${partido.grp_for||'Fase '+partido.fas}</div><button id="cerrar-modal-btn" style="background:none;border:none;font-size:22px;">✕</button></div>
            <div style="font-size:12px;color:#8e8e93;margin-bottom:20px;text-align:center;">${formatearFecha(partido.fch)} · ${formatearHora12h(partido.hor)}</div>
            <div style="background:#f2f2f7;border-radius:14px;padding:16px;margin-bottom:16px;">
                <div style="font-size:12px;color:#8e8e93;margin-bottom:12px;text-align:center;">TU PRONÓSTICO</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="text-align:center; flex:1;"><div style="font-size:40px; margin-bottom:4px;">${getBandera(partido.nom_loc)}</div><div style="font-size:12px;font-weight:600;">${partido.nom_loc}</div><div style="font-size:24px;font-weight:800;color:#007aff;margin-top:8px;">${pronosticoLocal}</div></div>
                    <div style="font-size:20px; font-weight:700; color:#8e8e93;">VS</div>
                    <div style="text-align:center; flex:1;"><div style="font-size:40px; margin-bottom:4px;">${getBandera(partido.nom_vis)}</div><div style="font-size:12px;font-weight:600;">${partido.nom_vis}</div><div style="font-size:24px;font-weight:800;color:#007aff;margin-top:8px;">${pronosticoVisita}</div></div>
                </div>
            </div>
            <div style="background:#f9f9fb;border-radius:14px;padding:16px;margin-bottom:16px;">
                <div style="font-size:12px;color:#8e8e93;margin-bottom:12px;text-align:center;">RESULTADO REAL</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="text-align:center; flex:1;"><div style="font-size:40px; margin-bottom:4px;">${getBandera(partido.nom_loc)}</div><div style="font-size:12px;font-weight:600;">${partido.nom_loc}</div><div style="font-size:24px;font-weight:800;color:#34c759;margin-top:8px;">${realLocal}</div></div>
                    <div style="font-size:20px; font-weight:700; color:#8e8e93;">VS</div>
                    <div style="text-align:center; flex:1;"><div style="font-size:40px; margin-bottom:4px;">${getBandera(partido.nom_vis)}</div><div style="font-size:12px;font-weight:600;">${partido.nom_vis}</div><div style="font-size:24px;font-weight:800;color:#34c759;margin-top:8px;">${realVisita}</div></div>
                </div>
            </div>
            <div style="background:#f2f2f7;border-radius:12px;padding:12px;margin-bottom:16px;">
                <div style="font-size:11px;font-weight:700;margin-bottom:8px;">📊 TU PUNTUACIÓN</div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>🏆 Ganador / Empate</span><span style="color:${ganador>0?'#34c759':'#ff3b30'}">${ganador} pts</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>⚽ Gol local exacto</span><span style="color:${golLocal>0?'#34c759':'#ff3b30'}">${golLocal} pts</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>⚽ Gol visita exacto</span><span style="color:${golVisita>0?'#34c759':'#ff3b30'}">${golVisita} pts</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>📊 Diferencia de goles</span><span style="color:${diferencia>0?'#34c759':'#ff3b30'}">${diferencia} pts</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>🔄 Marcador inverso</span><span style="color:${inverso>0?'#34c759':'#ff3b30'}">${inverso} pts</span></div>
                <div style="height:1px;background:#e5e5ea;margin:8px 0;"></div>
                <div style="display:flex;justify-content:space-between;"><span style="font-weight:700;">⭐ TOTAL</span><span style="color:#ff9500;font-weight:800;">${totalConPulso} pts</span></div>
                ${pulsoHTML}
            </div>
            <button id="cerrar-modal-accion" style="width:100%;background:#007aff;color:#fff;border:none;border-radius:14px;padding:14px;font-size:16px;cursor:pointer;">Cerrar</button>
        </div>`;
        document.body.appendChild(overlay);
        document.getElementById('cerrar-modal-btn')?.addEventListener('click', () => overlay.remove());
        document.getElementById('cerrar-modal-accion')?.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        return;
    }
    
    if (estadoEst.estado === 'segundo_tiempo') {
        mostrarToast('🔒 Partido en 2do tiempo.<br>No se aceptan más pronósticos.', 'err');
        return;
    }
    
    if (estadoEst.estado === 'primer_tiempo') {
        const yaTienePronostico = pronosticosCache[partido.id] !== undefined && pronosticosCache[partido.id].pul !== '0';
        
        if (yaTienePronostico) {
            mostrarToast('🔴 Ya tienes un pronóstico para este partido.<br>No se puede modificar durante el partido.', 'err');
            return;
        }
        
        console.log('[Partidos] Usuario sin pronóstico, puede apostar en 1er tiempo con PULSO 50');
    }
    
    if (estadoEst.estado !== 'pendiente' && estadoEst.estado !== 'primer_tiempo') {
        mostrarToast('🔒 Este partido no está disponible para pronósticos', 'err');
        return;
    }
    
    const pulsoAEnviar = (estadoEst.estado === 'primer_tiempo') ? '2' : '1';
    const puntosBaseParaModal = (estadoEst.estado === 'primer_tiempo') ? Math.round(ptsBase * 0.5) : ptsBase;
    
    let mensajePulso = '';
    if (estadoEst.estado === 'primer_tiempo') {
        mensajePulso = `🟡 PULSO 50 · Estás apostando durante el 1er tiempo.<br>Si aciertas el marcador exacto tendrás ${puntosBaseParaModal} puntos (50% del total).`;
    } else {
        mensajePulso = `🟢 PULSO 100 · Si aciertas el marcador exacto tendrás ${ptsBase} puntos.`;
    }
    
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:3000;display:flex;align-items:flex-end;justify-content:center;';
    
    const mostrarValorVacio = (pronostico.pul === '0');
    const valorS1 = mostrarValorVacio ? '' : pronostico.s1;
    const valorS2 = mostrarValorVacio ? '' : pronostico.s2;
    
    overlay.innerHTML = `<div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
            <div style="font-size:17px;font-weight:700;">${partido.grp_for||'Fase '+partido.fas}</div>
            <button id="cerrar-modal-btn" style="background:none;border:none;font-size:22px;">✕</button>
        </div>
        <div style="font-size:12px;color:#8e8e93;margin-bottom:20px;text-align:center;">${formatearFecha(partido.fch)} · ${formatearHora12h(partido.hor)}</div>
        
        <div style="background: linear-gradient(135deg, #0a2f1f 0%, #1a5a3a 100%); border-radius: 20px; padding: 16px; margin-bottom: 20px; position: relative; overflow: hidden;">
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 20px); pointer-events: none;"></div>
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 20%; background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%); pointer-events: none;"></div>
            <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 20%; background: linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%); pointer-events: none;"></div>
            <div style="position: absolute; top: 50%; left: 50%; width: 100px; height: 100px; border: 2px solid rgba(255,255,255,0.15); border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none;"></div>
            <div style="position: absolute; top: 0; left: 50%; width: 2px; height: 100%; background: rgba(255,255,255,0.15); transform: translateX(-50%); pointer-events: none;"></div>
            <div style="position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; background: rgba(255,255,255,0.3); border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none;"></div>
            <div style="position: relative; z-index: 10; display:flex; justify-content:space-between; align-items:center;">
                <div style="text-align:center; flex:1;"><div style="font-size:56px; margin-bottom:8px;">${getBandera(partido.nom_loc)}</div><div style="font-size:15px; font-weight:700; color:white; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${partido.nom_loc}</div></div>
                <div style="font-size:18px; font-weight:700; color:white; text-shadow: 0 1px 2px rgba(0,0,0,0.5); padding:0 20px;">VS</div>
                <div style="text-align:center; flex:1;"><div style="font-size:56px; margin-bottom:8px;">${getBandera(partido.nom_vis)}</div><div style="font-size:15px; font-weight:700; color:white; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${partido.nom_vis}</div></div>
            </div>
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:24px;">
            <div style="flex:1; text-align:center;">
                <div style="display:flex; align-items:center; justify-content:center; gap:8px; background:#f9f9fb; border-radius:30px; padding:6px 10px;">
                    <button id="modal-dec-loc" style="width:36px;height:36px;border-radius:18px;background:#fff;border:1px solid #e5e5ea;font-size:18px;font-weight:700;cursor:pointer; display:flex; align-items:center; justify-content:center;">−</button>
                    <input id="modal-s1" type="text" inputmode="numeric" pattern="[0-9]*" value="${valorS1}" placeholder="-" style="width:44px;height:36px;text-align:center;font-size:17px;font-weight:700;border:1px solid #e5e5ea;border-radius:10px; background:#fff;">
                    <button id="modal-inc-loc" style="width:36px;height:36px;border-radius:18px;background:#fff;border:1px solid #e5e5ea;font-size:18px;font-weight:700;cursor:pointer; display:flex; align-items:center; justify-content:center;">+</button>
                </div>
            </div>
            <div style="flex:1; text-align:center;">
                <div style="display:flex; align-items:center; justify-content:center; gap:8px; background:#f9f9fb; border-radius:30px; padding:6px 10px;">
                    <button id="modal-dec-vis" style="width:36px;height:36px;border-radius:18px;background:#fff;border:1px solid #e5e5ea;font-size:18px;font-weight:700;cursor:pointer; display:flex; align-items:center; justify-content:center;">−</button>
                    <input id="modal-s2" type="text" inputmode="numeric" pattern="[0-9]*" value="${valorS2}" placeholder="-" style="width:44px;height:36px;text-align:center;font-size:17px;font-weight:700;border:1px solid #e5e5ea;border-radius:10px; background:#fff;">
                    <button id="modal-inc-vis" style="width:36px;height:36px;border-radius:18px;background:#fff;border:1px solid #e5e5ea;font-size:18px;font-weight:700;cursor:pointer; display:flex; align-items:center; justify-content:center;">+</button>
                </div>
            </div>
        </div>
        
        <!-- ========== BADGE DE ADVERTENCIA 0-0 ========== -->
        <div style="text-align: center; margin-bottom: 16px;">
            <div style="background:rgb(17, 55, 95); color: white; font-size: 12px; font-weight: 500; padding: 6px 14px; border-radius: 20px; display: inline-block; line-height: 1.4;">
                ⚠️ Si tu pronóstico es 0-0<br>
                <span style="color: #ffd60a;">selecciona explícitamente 0 - 0</span>
            </div>
        </div>
        
        <div style="background:#f2f2f7;border-radius:12px;padding:12px;margin-bottom:16px;">
            <div style="font-size:14px;font-weight:700;margin-bottom:12px;">📋 Detalle de puntos</div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>🏆 Ganador / Empate</span><span style="color:#34c759;font-weight:700;">${Math.round(puntosBaseParaModal * 0.4)} pts</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>⚽ Gol local exacto</span><span style="color:#34c759;font-weight:700;">${Math.round(puntosBaseParaModal * 0.2)} pts</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>⚽ Gol visita exacto</span><span style="color:#34c759;font-weight:700;">${Math.round(puntosBaseParaModal * 0.2)} pts</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>📊 Diferencia de goles</span><span style="color:#34c759;font-weight:700;">${Math.round(puntosBaseParaModal * 0.2)} pts</span></div>
            <div style="height:1px;background:#e5e5ea;margin:8px 0;"></div>
            <div style="display:flex;justify-content:space-between;"><span style="font-weight:700;">⭐ BASE</span><span style="color:#ff9500;font-weight:800;">${puntosBaseParaModal} pts</span></div>
        </div>
        
        <div style="background:#eafaf1;border-radius:12px;padding:12px;margin-bottom:16px;text-align:center;">
            <span style="color:#1e8449;font-size:13px;font-weight:600;">${mensajePulso}</span>
        </div>
        
        <button id="modal-guardar-btn" style="width:100%;background:#34c759;color:#fff;border:none;border-radius:14px;padding:14px;font-weight:700;cursor:pointer;">💾 Guardar pronóstico</button>
    </div>`;
    
    document.body.appendChild(overlay);
    document.getElementById('cerrar-modal-btn')?.addEventListener('click', () => overlay.remove());
    
    const s1Input = document.getElementById('modal-s1');
    const s2Input = document.getElementById('modal-s2');
    const guardarBtn = document.getElementById('modal-guardar-btn');
    
    document.getElementById('modal-inc-loc')?.addEventListener('click', () => { 
        if (s1Input) {
            let val = parseInt(s1Input.value);
            if (isNaN(val)) val = 0;
            s1Input.value = Math.min(20, val + 1);
        }
    });
    document.getElementById('modal-dec-loc')?.addEventListener('click', () => { 
        if (s1Input) {
            let val = parseInt(s1Input.value);
            if (isNaN(val)) val = 0;
            s1Input.value = Math.max(0, val - 1);
        }
    });
    document.getElementById('modal-inc-vis')?.addEventListener('click', () => { 
        if (s2Input) {
            let val = parseInt(s2Input.value);
            if (isNaN(val)) val = 0;
            s2Input.value = Math.min(20, val + 1);
        }
    });
    document.getElementById('modal-dec-vis')?.addEventListener('click', () => { 
        if (s2Input) {
            let val = parseInt(s2Input.value);
            if (isNaN(val)) val = 0;
            s2Input.value = Math.max(0, val - 1);
        }
    });
    
    validarInputNumerico(s1Input);
    validarInputNumerico(s2Input);
    
    if (guardarBtn) {
        guardarBtn.onclick = () => { 
            let s1 = parseInt(s1Input?.value);
            let s2 = parseInt(s2Input?.value);
            if (isNaN(s1)) s1 = 0;
            if (isNaN(s2)) s2 = 0;
            overlay.remove();
            guardarPronostico(partido.id, s1, s2, pulsoAEnviar); 
        };
    }
    
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

async function refrescarDatosPartidos() {
    console.log('🔄 Refrescando datos de partidos...');
    mostrarToast('⟳ Actualizando partidos...', 'info');
    await cargarEquipos();
    await cargarPartidos();
    await cargarPronosticos(currentJugador?.id);
    refrescarContenido();
    mostrarToast('✅ Partidos actualizados', 'ok');
}

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
    
    const partidosVisibles = partidosCache.filter(p => { const est = Number(p.est); return est >= 1 && est <= 4 && p.fas === 1; });
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
        const partidosGrupo = partidosVisibles.filter(p => p.grupoCalculado === grupoActivo);
        
        const cardsPromises = partidosGrupo.map(async (p) => {
            const fechaPartido = p.fch ? p.fch.split('T')[0] : '';
            const tipo = getTipoFondo(fechaPartido, fechaSim);
            const esPrimerDia = (fechaPartido === primerDia);
            return renderPartidoCard(p, fechaSim, horaSim, tipo, esPrimerDia);
        });
        const cards = await Promise.all(cardsPromises);
        
        const botonesGrupos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(g => {
            let label = g; if (g === 'K') label = 'K🇨🇴';
            return `<button class="grupo-tab ${grupoActivo === g ? 'active' : ''}" data-grupo="${g}" style="width:48px;height:48px;border-radius:24px;background:${grupoActivo === g ? '#007aff' : '#f2f2f7'};border:1px solid ${grupoActivo === g ? '#007aff' : '#e5e5ea'};color:${grupoActivo === g ? '#fff' : '#3c3c43'};cursor:pointer;font-weight:700;">${label}</button>`;
        }).join('');
        
        contenedorScroll.innerHTML = `<div style="padding:16px;">
            <div class="grupos-tabs" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;justify-content:center;">${botonesGrupos}</div>
            <div style="background:#f9f9fb;border-radius:14px;border:1px solid #e5e5ea;margin-bottom:20px;overflow-x:auto;">${renderTablaPosiciones(grupoActivo)}</div>
            <div id="partidos-lista" style="margin-top:16px;">${cards.length > 0 ? cards.join('') : '<div style="text-align:center;padding:40px;color:#8e8e93;">No hay partidos programados para este grupo</div>'}</div>
        </div>`;
        
        setTimeout(() => {
            if (contenedorScroll) {
                contenedorScroll.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 100);
        
        document.querySelectorAll('.grupo-tab').forEach(btn => { 
            btn.onclick = () => { 
                grupoActivo = btn.dataset.grupo; 
                refrescarContenido(); 
            }; 
        });
        
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
            <div style="margin-bottom:16px;"><h3 style="color:#1c1c1e; font-size:16px; margin:0;">🇨🇴 Partidos de Colombia</h3></div>
            <div id="partidos-lista" style="margin-top:16px;">${cards.length > 0 ? cards.join('') : '<div style="text-align:center;padding:40px;color:#8e8e93;">No hay partidos programados para Colombia</div>'}</div>
        </div>`;
        
        setTimeout(() => {
            if (contenedorScroll) {
                contenedorScroll.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 100);
    }
    
    document.querySelectorAll('.partido-card').forEach(card => {
        const id = parseInt(card.dataset.id);
        const partido = partidosCache.find(p => p.id === id);
        if (partido) { card.onclick = () => abrirModal(partido, fechaSim, horaSim); }
    });
}

function cambiarTab(tab) { 
    tabActivo = tab; 
    document.querySelectorAll('.partidos-tab').forEach(t => { 
        if (t.dataset.tab === tab) { t.classList.add('active'); t.style.background = '#007aff'; t.style.color = '#fff'; } 
        else { t.classList.remove('active'); t.style.background = '#f2f2f7'; t.style.color = '#3c3c43'; } 
    }); 
    refrescarContenido(); 
}

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
    await cargarPronosticos(datosCuenta.id);
    
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
            <button class="partidos-tab ${tabInicial === 'grupos' ? 'active' : ''}" data-tab="grupos" style="flex:1;padding:10px;border:none;border-radius:12px;background:${tabInicial === 'grupos' ? '#007aff' : '#f2f2f7'};color:${tabInicial === 'grupos' ? '#fff' : '#3c3c43'};cursor:pointer;">📊 GRUPOS</button>
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

export { cargarPartidos, getBandera, formatearHora12h };
