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
        // Solo partidos de hoy que NO están terminados (est !== 4)
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

async function guardarPronosticoAhora(ptdId, s1, s2) {
    if (!currentJugador) {
        mostrarToast('Inicia sesión primero', 'err');
        return;
    }
    
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
                pro_res: s1 > s2 ? '1' : s2 > s1 ? '2' : 'X'
            })
        });
        
        if (response.ok) {
            pronosticosCache[ptdId] = { s1, s2 };
            mostrarToast('✅ Pronóstico guardado', 'ok');
            
            // No actualizamos el texto de la card para mantener "Haga su pronóstico acá!"
            // La card ya tiene el mensaje fijo
            
            if (ptdId === 1 && globalCambiarVistaCallback) {
                setTimeout(() => {
                    globalCambiarVistaCallback('partidos', currentJugador);
                }, 1500);
            }
        } else {
            mostrarToast('❌ Error al guardar', 'err');
        }
    } catch (error) {
        console.error('Error al guardar:', error);
        mostrarToast('❌ Error de conexión', 'err');
    }
}

// ========== ABRIR MODAL DE PRONÓSTICO CON FONDO DE CANCHA ==========
function abrirModalPronostico(partido) {
    if (!currentJugador) {
        mostrarToast('Inicia sesión para hacer tu pronóstico', 'err');
        return;
    }
    
    const pronostico = pronosticosCache[partido.id] || { s1: 0, s2: 0 };
    const ptsBase = 20;
    
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:3000;display:flex;align-items:flex-end;justify-content:center;';
    
    const fechaFormateada = new Date(partido.fch).toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
                <div style="font-size:17px;font-weight:700;">Grupo ${partido.grupoCalculado || '?'}</div>
                <button id="cerrar-modal-ahora" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
            </div>
            <div style="font-size:12px;color:#8e8e93;margin-bottom:20px;text-align:center;">
                ${fechaFormateada} · ${formatearHora12h(partido.hor)}
            </div>
            
            <!-- FONDO DE CANCHA DE FÚTBOL -->
            <div style="background: linear-gradient(135deg, #0a2f1f 0%, #1a5a3a 100%); border-radius: 20px; padding: 16px; margin-bottom: 20px; position: relative; overflow: hidden;">
                <!-- Líneas de césped decorativas -->
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 20px); pointer-events: none;"></div>
                <!-- Sombra superior -->
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 20%; background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%); pointer-events: none;"></div>
                <!-- Sombra inferior -->
                <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 20%; background: linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%); pointer-events: none;"></div>
                <!-- Círculo central -->
                <div style="position: absolute; top: 50%; left: 50%; width: 100px; height: 100px; border: 2px solid rgba(255,255,255,0.15); border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none;"></div>
                <!-- Línea media -->
                <div style="position: absolute; top: 0; left: 50%; width: 2px; height: 100%; background: rgba(255,255,255,0.15); transform: translateX(-50%); pointer-events: none;"></div>
                <!-- Punto central -->
                <div style="position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; background: rgba(255,255,255,0.3); border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none;"></div>
                <!-- Área penal izquierda -->
                <div style="position: absolute; top: 50%; left: 0; width: 30px; height: 60px; border: 2px solid rgba(255,255,255,0.15); border-left: none; transform: translateY(-50%); pointer-events: none;"></div>
                <!-- Área penal derecha -->
                <div style="position: absolute; top: 50%; right: 0; width: 30px; height: 60px; border: 2px solid rgba(255,255,255,0.15); border-right: none; transform: translateY(-50%); pointer-events: none;"></div>
                
                <div style="position: relative; z-index: 10; display:flex; justify-content:space-between; align-items:center;">
                    <div style="text-align:center; flex:1;">
                        <div style="font-size:56px; margin-bottom:8px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${getBandera(partido.nom_loc)}</div>
                        <div style="font-size:15px; font-weight:700; color:white; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${partido.nom_loc}</div>
                    </div>
                    <div style="font-size:20px; font-weight:800; color:white; text-shadow: 0 1px 2px rgba(0,0,0,0.5); background: rgba(0,0,0,0.3); padding: 8px 16px; border-radius: 30px; letter-spacing: 2px;">VS</div>
                    <div style="text-align:center; flex:1;">
                        <div style="font-size:56px; margin-bottom:8px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${getBandera(partido.nom_vis)}</div>
                        <div style="font-size:15px; font-weight:700; color:white; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${partido.nom_vis}</div>
                    </div>
                </div>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:24px;">
                <div style="flex:1; text-align:center;">
                    <div style="display:flex; align-items:center; justify-content:center; gap:8px; background:#f9f9fb; border-radius:30px; padding:6px 10px;">
                        <button id="modal-dec-loc" style="width:36px;height:36px;border-radius:18px;background:#fff;border:1px solid #e5e5ea;font-size:18px;font-weight:700;cursor:pointer;">−</button>
                        <input id="modal-s1" type="text" inputmode="numeric" pattern="[0-9]*" value="${pronostico.s1}" style="width:44px;height:36px;text-align:center;font-size:17px;font-weight:700;border:1px solid #e5e5ea;border-radius:10px;">
                        <button id="modal-inc-loc" style="width:36px;height:36px;border-radius:18px;background:#fff;border:1px solid #e5e5ea;font-size:18px;font-weight:700;cursor:pointer;">+</button>
                    </div>
                </div>
                <div style="flex:1; text-align:center;">
                    <div style="display:flex; align-items:center; justify-content:center; gap:8px; background:#f9f9fb; border-radius:30px; padding:6px 10px;">
                        <button id="modal-dec-vis" style="width:36px;height:36px;border-radius:18px;background:#fff;border:1px solid #e5e5ea;font-size:18px;font-weight:700;cursor:pointer;">−</button>
                        <input id="modal-s2" type="text" inputmode="numeric" pattern="[0-9]*" value="${pronostico.s2}" style="width:44px;height:36px;text-align:center;font-size:17px;font-weight:700;border:1px solid #e5e5ea;border-radius:10px;">
                        <button id="modal-inc-vis" style="width:36px;height:36px;border-radius:18px;background:#fff;border:1px solid #e5e5ea;font-size:18px;font-weight:700;cursor:pointer;">+</button>
                    </div>
                </div>
            </div>
            
            <div style="background:#f2f2f7;border-radius:12px;padding:12px;margin-bottom:16px;">
                <div style="font-size:14px;font-weight:700;margin-bottom:12px;">📋 Detalle de puntos</div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>🏆 Ganador / Empate</span><span style="color:#34c759;">${Math.round(ptsBase * 0.4)} pts</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>⚽ Gol local exacto</span><span style="color:#34c759;">${Math.round(ptsBase * 0.2)} pts</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>⚽ Gol visita exacto</span><span style="color:#34c759;">${Math.round(ptsBase * 0.2)} pts</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>📊 Diferencia de goles</span><span style="color:#34c759;">${Math.round(ptsBase * 0.2)} pts</span></div>
                <div style="height:1px;background:#e5e5ea;margin:8px 0;"></div>
                <div style="display:flex;justify-content:space-between;"><span style="font-weight:700;">⭐ BASE</span><span style="color:#ff9500;font-weight:800;">${ptsBase} pts</span></div>
            </div>
            
            <div style="background:#eafaf1;border-radius:12px;padding:12px;margin-bottom:16px;text-align:center;">
                <span style="color:#1e8449;font-size:13px;font-weight:600;">🟢 PULSO 100 · Si aciertas el marcador exacto tendrás ${ptsBase} puntos.</span>
            </div>
            
            <button id="modal-guardar-ahora" style="width:100%;background:#34c759;color:#fff;border:none;border-radius:14px;padding:14px;font-weight:700;cursor:pointer;">💾 Guardar pronóstico</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('cerrar-modal-ahora')?.addEventListener('click', () => overlay.remove());
    
    const s1Input = document.getElementById('modal-s1');
    const s2Input = document.getElementById('modal-s2');
    
    function validarInput(input) {
        if (!input) return;
        input.addEventListener('input', (e) => {
            let valor = e.target.value.replace(/[^0-9]/g, '');
            if (valor === '') valor = '0';
            let num = parseInt(valor);
            if (num > 20) num = 20;
            e.target.value = num;
        });
    }
    validarInput(s1Input);
    validarInput(s2Input);
    
    document.getElementById('modal-inc-loc')?.addEventListener('click', () => {
        if (s1Input) s1Input.value = Math.min(20, parseInt(s1Input.value || 0) + 1);
    });
    document.getElementById('modal-dec-loc')?.addEventListener('click', () => {
        if (s1Input) s1Input.value = Math.max(0, parseInt(s1Input.value || 0) - 1);
    });
    document.getElementById('modal-inc-vis')?.addEventListener('click', () => {
        if (s2Input) s2Input.value = Math.min(20, parseInt(s2Input.value || 0) + 1);
    });
    document.getElementById('modal-dec-vis')?.addEventListener('click', () => {
        if (s2Input) s2Input.value = Math.max(0, parseInt(s2Input.value || 0) - 1);
    });
    
    document.getElementById('modal-guardar-ahora')?.addEventListener('click', async () => {
        const s1 = parseInt(s1Input?.value) || 0;
        const s2 = parseInt(s2Input?.value) || 0;
        overlay.remove();
        await guardarPronosticoAhora(partido.id, s1, s2);
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
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
                    // SIEMPRE mostramos el mensaje "Haga su pronóstico acá!" sin importar si tiene pronóstico
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
    
    document.querySelectorAll('.ahora-card').forEach(card => {
        const id = parseInt(card.dataset.id);
        const partido = partidosHoy.find(p => p.id === id);
        if (partido) {
            card.onclick = () => abrirModalPronostico(partido);
        }
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
