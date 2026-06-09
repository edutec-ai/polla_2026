// funciones/puntosPartidosFG.js
// Módulo para calcular y mostrar los puntos obtenidos por el usuario en la fase de grupos
// Si no hay partidos finalizados, muestra un simulador interactivo

import { simGetFechaStr, simGetHoraStr } from './lab.js';
import { getBandera } from './banderas.js';

// Configuración de APIs
const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

// Puntos base por fase (fase de grupos = 20 pts)
const PUNTOS_BASE_FG = 20;

// Distribución de puntos
const PUNTOS = {
    GANADOR: 8,
    GOL_LOCAL: 4,
    GOL_VISITA: 4,
    DIFERENCIA: 4,
    INVERSO: 4
};

// Estado interno
let partidosCache = [];
let pronosticosCache = {};
let currentJugador = null;

// Callback para cuando se recalculan los puntos
let onPuntosActualizados = null;

export function setOnPuntosActualizados(callback) {
    onPuntosActualizados = callback;
}

function getGanador(local, visita) {
    if (local > visita) return 'local';
    if (visita > local) return 'visita';
    return 'empate';
}

function getDiferencia(local, visita) {
    return Math.abs(local - visita);
}

function calcularPuntosPartido(pronostico, resultado) {
    if (!pronostico || !resultado) return 0;
    
    const pronosticoGanador = getGanador(pronostico.s1, pronostico.s2);
    const realGanador = getGanador(resultado.golLoc, resultado.golVis);
    
    let puntos = 0;
    
    // Ganador / Empate
    if (pronosticoGanador === realGanador) {
        puntos += PUNTOS.GANADOR;
    }
    
    // Gol local exacto
    if (resultado.golLoc === pronostico.s1) {
        puntos += PUNTOS.GOL_LOCAL;
    }
    
    // Gol visita exacto
    if (resultado.golVis === pronostico.s2) {
        puntos += PUNTOS.GOL_VISITA;
    }
    
    // Diferencia de goles
    const pronosticoDiferencia = getDiferencia(pronostico.s1, pronostico.s2);
    const realDiferencia = getDiferencia(resultado.golLoc, resultado.golVis);
    if (pronosticoDiferencia === realDiferencia) {
        puntos += PUNTOS.DIFERENCIA;
    }
    
    // Marcador inverso (solo si falló el ganador)
    if (pronosticoGanador !== realGanador) {
        if (resultado.golLoc === pronostico.s2 && resultado.golVis === pronostico.s1) {
            puntos += PUNTOS.INVERSO;
        }
    }
    
    return puntos;
}

async function cargarPartidos() {
    try {
        const response = await fetch(`${BASE}/fifa_ptd?api_key=${KEY}`);
        const data = await response.json();
        partidosCache = data.fifa_ptd || [];
        // Filtrar solo fase de grupos (fas=1) y partidos finalizados (est=2)
        partidosCache = partidosCache.filter(p => p.fas == 1 && p.est == 2);
        return partidosCache;
    } catch (error) {
        console.error('[PuntosFG] Error cargando partidos:', error);
        return [];
    }
}

async function cargarPronosticos(jugId) {
    if (!jugId) return;
    try {
        const response = await fetch(`${BASE}/fifa_jug_pro?api_key=${KEY}`);
        const data = await response.json();
        const todos = data.fifa_jug_pro || [];
        const misPronosticos = todos.filter(p => Number(p.jug) === Number(jugId));
        pronosticosCache = {};
        misPronosticos.forEach(p => {
            pronosticosCache[p.ptd] = { s1: p.pro_gol_loc || 0, s2: p.pro_gol_vis || 0 };
        });
    } catch (error) {
        console.error('[PuntosFG] Error cargando pronósticos:', error);
    }
}

function calcularPuntosTotales() {
    let total = 0;
    const detalles = [];
    
    partidosCache.forEach(partido => {
        const pronostico = pronosticosCache[partido.id];
        if (pronostico) {
            const resultado = {
                golLoc: partido.t90_gol_loc || 0,
                golVis: partido.t90_gol_vis || 0
            };
            const puntos = calcularPuntosPartido(pronostico, resultado);
            total += puntos;
            detalles.push({
                id: partido.id,
                partido: `${partido.nom_loc} vs ${partido.nom_vis}`,
                pronostico: `${pronostico.s1} - ${pronostico.s2}`,
                resultado: `${resultado.golLoc} - ${resultado.golVis}`,
                puntos: puntos,
                fase: partido.fas,
                grupo: partido.grp_for || 'FG'
            });
        }
    });
    
    return { total, detalles, cantidad: partidosCache.length, pronosticados: detalles.length };
}

// Función para renderizar el simulador interactivo
function renderizarSimulador(contenedor) {
    // Estilos específicos del simulador
    const simuladorHTML = `
        <div style="margin-top: 16px;">
            <div style="background: linear-gradient(135deg, #2c2c3e 0%, #1a1a2e 100%); border-radius: 20px; padding: 16px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 16px;">
                    <div style="text-align: center;">
                        <div style="font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.7); margin-bottom: 4px;">⚽ EQUIPO A</div>
                        <div style="font-size: 48px; font-weight: 800; color: #fff; line-height: 1;" id="sim-gol-local">3</div>
                    </div>
                    <div style="font-size: 20px; font-weight: 700; color: #ffd700;">VS</div>
                    <div style="text-align: center;">
                        <div style="font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.7); margin-bottom: 4px;">⚽ EQUIPO B</div>
                        <div style="font-size: 48px; font-weight: 800; color: #fff; line-height: 1;" id="sim-gol-visita">2</div>
                    </div>
                </div>
                <div style="text-align: center; font-size: 12px; color: #ffd700; background: rgba(255,215,0,0.15); display: inline-block; width: 100%; padding: 6px 16px; border-radius: 20px; box-sizing: border-box;">
                    TU PRONÓSTICO: <span id="sim-pronostico-texto">3 - 2</span>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.3); border-radius: 16px; padding: 12px 16px; text-align: center; margin-bottom: 16px;">
                <span style="font-size: 13px; color: rgba(255,255,255,0.5);">🎯 Simular resultado real:</span>
                <strong style="font-size: 16px; color: #fff; margin-left: 8px;" id="sim-resultado-texto">Selecciona un marcador</strong>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
                <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
                    <button class="sim-btn" data-local="3" data-visita="0">3 - 0</button>
                    <button class="sim-btn" data-local="3" data-visita="1">3 - 1</button>
                    <button class="sim-btn sim-btn-destacado" data-local="3" data-visita="2" id="sim-btn-pronostico">3 - 2</button>
                    <button class="sim-btn" data-local="3" data-visita="3">3 - 3</button>
                    <button class="sim-btn" data-local="3" data-visita="4">3 - 4</button>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
                    <button class="sim-btn" data-local="2" data-visita="0">2 - 0</button>
                    <button class="sim-btn" data-local="2" data-visita="1">2 - 1</button>
                    <button class="sim-btn" data-local="2" data-visita="2">2 - 2</button>
                    <button class="sim-btn" data-local="2" data-visita="3">2 - 3</button>
                    <button class="sim-btn" data-local="2" data-visita="4">2 - 4</button>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
                    <button class="sim-btn" data-local="0" data-visita="0">0 - 0</button>
                    <button class="sim-btn" data-local="1" data-visita="0">1 - 0</button>
                    <button class="sim-btn" data-local="1" data-visita="1">1 - 1</button>
                    <button class="sim-btn" data-local="1" data-visita="2">1 - 2</button>
                    <button class="sim-btn" data-local="1" data-visita="3">1 - 3</button>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.3); border-radius: 20px; padding: 16px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="font-size: 16px; font-weight: 600; color: #fff;">📋 Detalle de puntos</h3>
                    <span style="font-size: 12px; color: rgba(255,255,255,0.5);">Base: 20 pts</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 0.5px solid rgba(255,255,255,0.08);">
                    <span style="font-size: 14px; color: rgba(255,255,255,0.7);">🏆 Ganador / Empate</span>
                    <span style="font-size: 14px; font-weight: 600; color: #fff;" id="sim-pts-ganador">0 pts</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 0.5px solid rgba(255,255,255,0.08);">
                    <span style="font-size: 14px; color: rgba(255,255,255,0.7);">⚽ Gol local exacto</span>
                    <span style="font-size: 14px; font-weight: 600; color: #fff;" id="sim-pts-gol-local">0 pts</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 0.5px solid rgba(255,255,255,0.08);">
                    <span style="font-size: 14px; color: rgba(255,255,255,0.7);">⚽ Gol visita exacto</span>
                    <span style="font-size: 14px; font-weight: 600; color: #fff;" id="sim-pts-gol-visita">0 pts</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 0.5px solid rgba(255,255,255,0.08);">
                    <span style="font-size: 14px; color: rgba(255,255,255,0.7);">📊 Diferencia de goles</span>
                    <span style="font-size: 14px; font-weight: 600; color: #fff;" id="sim-pts-diferencia">0 pts</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 0.5px solid rgba(255,255,255,0.08);">
                    <span style="font-size: 14px; color: rgba(255,255,255,0.7);">🔄 Marcador inverso (consolación)</span>
                    <span style="font-size: 14px; font-weight: 600; color: #fff;" id="sim-pts-inverso">0 pts</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2);">
                    <span style="font-size: 18px; font-weight: 700; color: #fff;">⭐ PUNTAJE TOTAL</span>
                    <span style="font-size: 28px; font-weight: 800; color: #fff;" id="sim-total-puntos">0 pts</span>
                </div>
            </div>
            
            <div style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,0.5);">
                    <div style="width: 12px; height: 12px; border-radius: 4px; background: #ffd700;"></div>
                    Puntos obtenidos
                </div>
                <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,0.5);">
                    <div style="width: 12px; height: 12px; border-radius: 4px; background: #ff3b30;"></div>
                    Consolación (inverso)
                </div>
                <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,0.5);">
                    <div style="width: 12px; height: 12px; border-radius: 4px; border: 1px solid #ff3b30; background: none;"></div>
                    Tu pronóstico (borde rojo)
                </div>
            </div>
            <div style="margin-top: 16px; font-size: 11px; color: rgba(255,255,255,0.4); text-align: center;">
                💡 El marcador inverso (ej: 2-3) otorga 4 pts de consolación si no acertaste el ganador
            </div>
        </div>
    `;
    
    contenedor.innerHTML = simuladorHTML;
    
    // Inicializar simulador
    let simPronosticoLocal = 3;
    let simPronosticoVisita = 2;
    
    function getGanadorSim(local, visita) {
        if (local > visita) return 'local';
        if (visita > local) return 'visita';
        return 'empate';
    }
    
    function getDiferenciaSim(local, visita) {
        return Math.abs(local - visita);
    }
    
    function calcularPuntosSim(realLocal, realVisita) {
        const pronosticoGanador = getGanadorSim(simPronosticoLocal, simPronosticoVisita);
        const realGanador = getGanadorSim(realLocal, realVisita);
        
        let ganador = 0, golLocal = 0, golVisita = 0, diferencia = 0, inverso = 0;
        
        if (pronosticoGanador === realGanador) ganador = 8;
        if (realLocal === simPronosticoLocal) golLocal = 4;
        if (realVisita === simPronosticoVisita) golVisita = 4;
        
        const pronosticoDiff = getDiferenciaSim(simPronosticoLocal, simPronosticoVisita);
        const realDiff = getDiferenciaSim(realLocal, realVisita);
        if (pronosticoDiff === realDiff) diferencia = 4;
        
        if (pronosticoGanador !== realGanador) {
            if (realLocal === simPronosticoVisita && realVisita === simPronosticoLocal) inverso = 4;
        }
        
        const total = ganador + golLocal + golVisita + diferencia + inverso;
        return { ganador, golLocal, golVisita, diferencia, inverso, total };
    }
    
    function actualizarSimulador(realLocal, realVisita) {
        const puntos = calcularPuntosSim(realLocal, realVisita);
        
        document.getElementById('sim-resultado-texto').innerHTML = `${realLocal} - ${realVisita}`;
        document.getElementById('sim-pts-ganador').innerHTML = `${puntos.ganador} pts`;
        document.getElementById('sim-pts-gol-local').innerHTML = `${puntos.golLocal} pts`;
        document.getElementById('sim-pts-gol-visita').innerHTML = `${puntos.golVisita} pts`;
        document.getElementById('sim-pts-diferencia').innerHTML = `${puntos.diferencia} pts`;
        document.getElementById('sim-pts-inverso').innerHTML = `${puntos.inverso} pts`;
        document.getElementById('sim-total-puntos').innerHTML = `${puntos.total} pts`;
        
        // Colores
        const elements = [
            { id: 'sim-pts-ganador', valor: puntos.ganador },
            { id: 'sim-pts-gol-local', valor: puntos.golLocal },
            { id: 'sim-pts-gol-visita', valor: puntos.golVisita },
            { id: 'sim-pts-diferencia', valor: puntos.diferencia },
            { id: 'sim-pts-inverso', valor: puntos.inverso }
        ];
        
        elements.forEach(el => {
            const element = document.getElementById(el.id);
            if (el.valor > 0) {
                element.style.color = '#ffd700';
            } else {
                element.style.color = '#fff';
            }
        });
        
        const totalEl = document.getElementById('sim-total-puntos');
        if (puntos.total > 0) {
            totalEl.style.color = '#ffd700';
        } else {
            totalEl.style.color = '#fff';
        }
    }
    
    function actualizarPronosticoSim(local, visita) {
        simPronosticoLocal = local;
        simPronosticoVisita = visita;
        
        document.getElementById('sim-gol-local').textContent = local;
        document.getElementById('sim-gol-visita').textContent = visita;
        document.getElementById('sim-pronostico-texto').textContent = `${local} - ${visita}`;
        
        actualizarSimulador(local, visita);
    }
    
    const botones = document.querySelectorAll('.sim-btn');
    const btnPronostico = document.getElementById('sim-btn-pronostico');
    
    botones.forEach(btn => {
        btn.addEventListener('click', function() {
            const local = parseInt(this.dataset.local);
            const visita = parseInt(this.dataset.visita);
            
            if (this === btnPronostico) {
                actualizarPronosticoSim(local, visita);
            } else {
                actualizarSimulador(local, visita);
            }
            
            botones.forEach(b => b.classList.remove('activo'));
            this.classList.add('activo');
        });
    });
    
    // Estilo para botones activos en simulador
    const style = document.createElement('style');
    style.textContent = `
        .sim-btn {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            padding: 8px 12px;
            font-size: 13px;
            font-weight: 600;
            color: #fff;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: center;
            min-width: 65px;
        }
        .sim-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.02);
        }
        .sim-btn:active {
            transform: scale(0.98);
        }
        .sim-btn.activo {
            background: #007aff;
            border-color: #007aff;
        }
        .sim-btn-destacado {
            border: 1px solid #ff3b30;
            box-shadow: 0 0 8px rgba(255, 59, 48, 0.6);
        }
        .sim-btn-destacado:hover {
            background: rgba(255, 59, 48, 0.2);
            box-shadow: 0 0 12px rgba(255, 59, 48, 0.8);
        }
    `;
    document.head.appendChild(style);
    
    // Inicializar con 3-2
    actualizarPronosticoSim(3, 2);
    btnPronostico.classList.add('activo');
}

export async function renderizarPuntosPartidosFG(contenedor, datosCuenta) {
    if (!contenedor) return;
    
    currentJugador = datosCuenta;
    
    contenedor.innerHTML = `
        <div style="width:100%; background: #ffffff; border-radius: 20px; padding: 20px;">
            <style>
                .pts-fg-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                    border-bottom: 2px solid #e5e5ea;
                    flex-wrap: wrap;
                    gap: 12px;
                }
                .pts-fg-titulo {
                    font-size: 20px;
                    font-weight: 700;
                    color: #1c1c1e;
                }
                .pts-fg-badge {
                    background: #007aff;
                    color: white;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 600;
                }
                .pts-fg-loading {
                    text-align: center;
                    padding: 40px;
                    color: #8e8e93;
                }
            </style>
            
            <div class="pts-fg-header">
                <div class="pts-fg-titulo">⚽ Puntos - Fase de Grupos</div>
                <div class="pts-fg-badge">20 pts por partido</div>
            </div>
            
            <div id="pts-fg-contenido">
                <div class="pts-fg-loading">⟳ Cargando...</div>
            </div>
        </div>
    `;
    
    // Cargar datos
    await cargarPartidos();
    await cargarPronosticos(currentJugador.id);
    
    const { total, detalles, cantidad, pronosticados } = calcularPuntosTotales();
    const contenidoDiv = document.getElementById('pts-fg-contenido');
    
    if (cantidad === 0 || detalles.length === 0) {
        // No hay partidos finalizados, mostrar simulador interactivo
        renderizarSimulador(contenidoDiv);
    } else {
        // Hay partidos finalizados, mostrar los puntos reales
        const porcentaje = cantidad > 0 ? Math.round((pronosticados / cantidad) * 100) : 0;
        
        contenidoDiv.innerHTML = `
            <div style="background: linear-gradient(135deg, #007aff 0%, #5856d6 100%); border-radius: 20px; padding: 24px; margin-bottom: 20px; text-align: center;">
                <div style="font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.8); margin-bottom: 8px;">⭐ PUNTAJE TOTAL</div>
                <div style="font-size: 48px; font-weight: 800; color: #fff;">${total}<span style="font-size: 16px; font-weight: 500; color: rgba(255,255,255,0.7); margin-left: 4px;">pts</span></div>
            </div>
            
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <div style="flex: 1; background: #f2f2f7; border-radius: 16px; padding: 12px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 800; color: #1c1c1e;">${cantidad}</div>
                    <div style="font-size: 11px; color: #8e8e93; margin-top: 4px;">Partidos totales</div>
                </div>
                <div style="flex: 1; background: #f2f2f7; border-radius: 16px; padding: 12px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 800; color: #1c1c1e;">${pronosticados}</div>
                    <div style="font-size: 11px; color: #8e8e93; margin-top: 4px;">Pronosticados</div>
                </div>
                <div style="flex: 1; background: #f2f2f7; border-radius: 16px; padding: 12px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 800; color: #1c1c1e;">${porcentaje}%</div>
                    <div style="font-size: 11px; color: #8e8e93; margin-top: 4px;">Participación</div>
                </div>
            </div>
            
            <div style="max-height: 400px; overflow-y: auto;" id="pts-fg-lista"></div>
        `;
        
        const listaContainer = document.getElementById('pts-fg-lista');
        
        detalles.sort((a, b) => b.puntos - a.puntos);
        
        detalles.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = 'background: #f9f9fb; border: 1px solid #e5e5ea; border-radius: 14px; padding: 12px; margin-bottom: 8px;';
            itemDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                    <span style="font-size: 11px; font-weight: 600; color: #8e8e93; background: #e5e5ea; padding: 2px 8px; border-radius: 12px;">${item.grupo || 'FG'}</span>
                    <span style="font-size: 13px; font-weight: 600; color: #1c1c1e;">${item.partido}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 12px; color: #007aff; font-weight: 600;">📋 ${item.pronostico}</span>
                    <span style="font-size: 12px; color: #34c759; font-weight: 600;">✅ ${item.resultado}</span>
                    <span style="font-size: 14px; font-weight: 800; color: #ff9500;">${item.puntos} pts</span>
                </div>
            `;
            listaContainer.appendChild(itemDiv);
        });
    }
    
    if (onPuntosActualizados) {
        onPuntosActualizados({ total, cantidad, pronosticados, detalles });
    }
}

export function getPuntosFG() {
    return { total: 0, cantidad: 0, pronosticados: 0, detalles: [] };
}