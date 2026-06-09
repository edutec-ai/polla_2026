// funciones/reglas.js
// Módulo "REGLAS" - Tutorial interactivo de La Polla Mundialista 2026
// 6 cards en grid responsivo: 2 columnas móvil / 3 columnas desktop
// Cada card abre un modal con explicación detallada

import { getBandera } from './banderas.js';

let currentContenedor = null;
let currentDatosCuenta = null;
let cambiarVistaCallback = null;

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

// ========== MODALES ==========

// Modal 1: ¿Qué es La Polla?
function abrirModalQueEsLaPolla() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:flex-end;justify-content:center;';
    
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div style="font-size:20px;font-weight:700;color:#1c1c1e;">🏆 ¿Qué es La Polla?</div>
                <button class="modal-cerrar-btn" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:20px;">
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">
                    <strong>La Polla Mundialista 2026</strong> es un juego interactivo de pronósticos deportivos donde los participantes compiten para ver quién acierta más resultados del Mundial de Fútbol 2026, que se celebrará en Estados Unidos, México y Canadá con 48 equipos participantes.
                </p>
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">
                    El objetivo es <strong>acumular la mayor cantidad de puntos posible</strong> a lo largo del torneo. Los puntos se obtienen acertando:
                </p>
                <ul style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-left:20px;margin-bottom:12px;">
                    <li>⚽ Los resultados de los partidos (marcador exacto, ganador, diferencia de goles)</li>
                    <li>⭐ Los clasificados de la fase de grupos (CICLO 1)</li>
                    <li>🏆 Los finalistas del torneo (CICLO 2)</li>
                </ul>
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">
                    El participante con más puntos al final de la final del mundial será el <strong>GANADOR</strong> de La Polla.
                </p>
            </div>
            <div style="background:#f2f2f7;border-radius:16px;padding:16px;margin-bottom:16px;">
                <div style="font-size:14px;font-weight:700;margin-bottom:12px;">📊 Puntajes máximos totales</div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>⚽ Partidos (78 partidos):</span><span style="color:#007aff;font-weight:700;">2.700 pts</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>📋 CICLO 1 (12 grupos):</span><span style="color:#007aff;font-weight:700;">720 pts</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>🏆 CICLO 2 (4 finalistas):</span><span style="color:#007aff;font-weight:700;">1.350 pts</span></div>
                <div style="height:1px;background:#e5e5ea;margin:8px 0;"></div>
                <div style="display:flex;justify-content:space-between;"><span style="font-weight:700;">⭐ TOTAL GENERAL:</span><span style="color:#ff9500;font-weight:800;">4.770 pts</span></div>
            </div>
            <button class="modal-cerrar-accion" style="width:100%;background:#007aff;color:#fff;border:none;border-radius:14px;padding:14px;margin-top:8px;cursor:pointer;">Cerrar</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    const cerrar = () => overlay.remove();
    overlay.querySelectorAll('.modal-cerrar-btn, .modal-cerrar-accion').forEach(btn => btn.addEventListener('click', cerrar));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
}

// Modal 2: Sistema de PULSO
function abrirModalPulso() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:flex-end;justify-content:center;';
    
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div style="font-size:20px;font-weight:700;color:#1c1c1e;">⚡ Sistema de PULSO</div>
                <button class="modal-cerrar-btn" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:20px;">
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">
                    El <strong>PULSO</strong> es un sistema de puntuación dinámica que recompensa a los usuarios que realizan sus pronósticos con anticipación. Cuanto antes hagas tu pronóstico, más puntos puedes obtener.
                </p>
            </div>
            <div style="background:#f2f2f7;border-radius:16px;padding:16px;margin-bottom:16px;">
                <div style="font-size:14px;font-weight:700;margin-bottom:12px;">📊 Los tres estados del PULSO</div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;padding:8px;background:#eafaf1;border-radius:12px;">
                    <span>🟢 <strong>PULSO 100</strong></span>
                    <span>Antes del inicio</span>
                    <span style="color:#34c759;font-weight:700;">100% puntos</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;padding:8px;background:#fff9ec;border-radius:12px;">
                    <span>🟡 <strong>PULSO 50</strong></span>
                    <span>Durante el evento</span>
                    <span style="color:#ff9500;font-weight:700;">50% puntos</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:8px;background:#f2f2f7;border-radius:12px;">
                    <span>🔒 <strong>CERRADO</strong></span>
                    <span>Después del evento</span>
                    <span style="color:#8e8e93;font-weight:700;">0% puntos</span>
                </div>
            </div>
            <div style="background:#f2f2f7;border-radius:16px;padding:16px;margin-bottom:16px;">
                <div style="font-size:14px;font-weight:700;margin-bottom:12px;">⏱️ Línea de tiempo del PULSO</div>
                <div style="margin-bottom:8px;">📋 <strong>CICLO 1:</strong> Solo Abierto (antes 11/06) o CERRADO (después)</div>
                <div style="margin-bottom:8px;">🏆 <strong>CICLO 2:</strong> 🟢 PULSO 100 → 🟡 PULSO 50 (11/06) → 🔒 CERRADO (28/06)</div>
                <div>⚽ <strong>Partidos:</strong> 🟢 PULSO 100 (antes) → 🟡 PULSO 50 (primer tiempo) → 🔒 CERRADO (entretiempo)</div>
            </div>
            <div style="background:#fff9ec;border:1px solid #ffd080;border-radius:12px;padding:12px;margin-bottom:16px;">
                <span style="color:#c05a00;font-size:12px;">⚠️ <strong>Importante:</strong> En PULSO 50, solo puedes crear un pronóstico si NO lo hiciste antes. No puedes modificar pronósticos existentes.</span>
            </div>
            <button class="modal-cerrar-accion" style="width:100%;background:#007aff;color:#fff;border:none;border-radius:14px;padding:14px;margin-top:8px;cursor:pointer;">Cerrar</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    const cerrar = () => overlay.remove();
    overlay.querySelectorAll('.modal-cerrar-btn, .modal-cerrar-accion').forEach(btn => btn.addEventListener('click', cerrar));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
}

// Modal 3: Especiales - CICLO 1
function abrirModalCiclo1() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:flex-end;justify-content:center;';
    
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div style="font-size:20px;font-weight:700;color:#1c1c1e;">⭐ Especiales · CICLO 1</div>
                <button class="modal-cerrar-btn" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:20px;">
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">
                    El <strong>CICLO 1 · Modo Maratón</strong> consiste en seleccionar los <strong>dos mejores equipos de cada uno de los 12 grupos</strong> del mundial. En cada grupo hay 4 equipos, y debes elegir el 1° y 2° clasificado que avanzarán a octavos de final.
                </p>
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">
                    <strong>📅 Fecha límite:</strong> 11 de junio de 2026, 2:00 PM (hora del partido inaugural)
                </p>
                <p style="font-size:14px;color:#ff3b30;line-height:1.5;margin-bottom:12px;">
                    ⚠️ No hay PULSO 50 para el CICLO 1. O lo haces antes de la inauguración, o pierdes la oportunidad para siempre.
                </p>
            </div>
            <div style="background:#f2f2f7;border-radius:16px;padding:16px;margin-bottom:16px;">
                <div style="font-size:14px;font-weight:700;margin-bottom:12px;">💰 SISTEMA DE PUNTOS</div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <span>✅ Aciertas el orden exacto (1° y 2° correctos):</span>
                    <span style="color:#34c759;font-weight:700;">60 pts por grupo</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <span>🔄 Aciertas pero en desorden:</span>
                    <span style="color:#ff9500;font-weight:700;">30 pts por grupo</span>
                </div>
                <div style="height:1px;background:#e5e5ea;margin:8px 0;"></div>
                <div style="display:flex;justify-content:space-between;">
                    <span>⭐ Puntaje máximo posible:</span>
                    <span style="color:#007aff;font-weight:700;">720 pts (12 grupos × 60 pts)</span>
                </div>
            </div>
            <button class="modal-cerrar-accion" style="width:100%;background:#007aff;color:#fff;border:none;border-radius:14px;padding:14px;margin-top:8px;cursor:pointer;">Cerrar</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    const cerrar = () => overlay.remove();
    overlay.querySelectorAll('.modal-cerrar-btn, .modal-cerrar-accion').forEach(btn => btn.addEventListener('click', cerrar));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
}

// Modal 4: CICLO 2 · Modo Sprint
function abrirModalCiclo2() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:flex-end;justify-content:center;';
    
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div style="font-size:20px;font-weight:700;color:#1c1c1e;">⚡ CICLO 2 · Modo Sprint</div>
                <button class="modal-cerrar-btn" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:20px;">
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">
                    El <strong>CICLO 2 · Modo Sprint</strong> consiste en pronosticar los <strong>cuatro finalistas del torneo</strong> en su orden correcto: Campeón, Subcampeón, Tercer puesto y Cuarto puesto.
                </p>
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">
                    Se llama "Modo Sprint" porque requiere un análisis concentrado y veloz sobre los equipos candidatos al título, a diferencia del CICLO 1 que analiza 48 equipos.
                </p>
            </div>
            <div style="background:#f2f2f7;border-radius:16px;padding:16px;margin-bottom:16px;">
                <div style="font-size:14px;font-weight:700;margin-bottom:12px;">💰 SISTEMA DE PUNTOS</div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>🏆 Campeón:</span><span style="color:#ff9500;font-weight:700;">720 pts</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>🥈 Subcampeón:</span><span style="color:#ff9500;font-weight:700;">360 pts</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>🥉 Tercer puesto:</span><span style="color:#ff9500;font-weight:700;">180 pts</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>4️⃣ Cuarto puesto:</span><span style="color:#ff9500;font-weight:700;">90 pts</span></div>
                <div style="height:1px;background:#e5e5ea;margin:8px 0;"></div>
                <div style="display:flex;justify-content:space-between;"><span>⭐ Puntaje máximo posible:</span><span style="color:#007aff;font-weight:700;">1.350 pts</span></div>
            </div>
            <div style="background:#fff9ec;border:1px solid #ffd080;border-radius:12px;padding:12px;margin-bottom:16px;">
                <span style="color:#c05a00;font-size:12px;">🟡 <strong>PULSO 50:</strong> Si completas el CICLO 2 después del inicio del mundial (11/06 2:00 PM), los puntos se reducen a la mitad. Si lo completas después del 28/06, ya no se puede modificar.</span>
            </div>
            <button class="modal-cerrar-accion" style="width:100%;background:#007aff;color:#fff;border:none;border-radius:14px;padding:14px;margin-top:8px;cursor:pointer;">Cerrar</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    const cerrar = () => overlay.remove();
    overlay.querySelectorAll('.modal-cerrar-btn, .modal-cerrar-accion').forEach(btn => btn.addEventListener('click', cerrar));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
}

// Modal 5: Partidos - Sistema de puntos
function abrirModalPuntosPartidos() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:flex-end;justify-content:center;';
    
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div style="font-size:20px;font-weight:700;color:#1c1c1e;">⚽ Partidos - Sistema de Puntos</div>
                <button class="modal-cerrar-btn" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:20px;">
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">
                    Cada partido tiene una <strong>base de puntos</strong> según la fase del torneo. Tu pronóstico consiste en predecir el marcador exacto.
                </p>
            </div>
            <div style="background:#f2f2f7;border-radius:12px;padding:12px;margin-bottom:16px;">
                <div style="font-size:13px;font-weight:700;margin-bottom:8px;">📋 PUNTOS BASE POR FASE</div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>📋 Fase de grupos:</span><span style="font-weight:700;">20 pts base</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>🏆 Octavos de final:</span><span style="font-weight:700;">40 pts base</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>🏆 Cuartos de final:</span><span style="font-weight:700;">60 pts base</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>🏆 Semifinales:</span><span style="font-weight:700;">80 pts base</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>🏆 Final:</span><span style="font-weight:700;">100 pts base</span></div>
                <div style="display:flex;justify-content:space-between;"><span>🏆 Gran final (desempate):</span><span style="font-weight:700;">200 pts base</span></div>
            </div>
            <div style="background:#f2f2f7;border-radius:16px;padding:16px;margin-bottom:16px;">
                <div style="font-size:13px;font-weight:700;margin-bottom:12px;">📊 DISTRIBUCIÓN DE PUNTOS</div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>🏆 Ganador / Empate:</span><span style="color:#34c759;font-weight:700;">40% de la base</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>⚽ Gol local exacto:</span><span style="color:#34c759;font-weight:700;">20% de la base</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>⚽ Gol visita exacto:</span><span style="color:#34c759;font-weight:700;">20% de la base</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>📊 Diferencia de goles:</span><span style="color:#34c759;font-weight:700;">20% de la base</span></div>
                <div style="height:1px;background:#e5e5ea;margin:8px 0;"></div>
                <div style="display:flex;justify-content:space-between;"><span>⭐ Marcador exacto:</span><span style="color:#ff9500;font-weight:800;">100% de la base</span></div>
                <div style="height:1px;background:#e5e5ea;margin:8px 0;"></div>
                <div style="display:flex;justify-content:space-between;"><span>🔄 Marcador inverso (consolación):</span><span style="color:#ff9500;font-weight:800;">20% de la base</span></div>
            </div>
            <div style="background:#eafaf1;border:1px solid #a9dfbf;border-radius:12px;padding:12px;margin-bottom:16px;">
                <span style="color:#1e8449;font-size:12px;">💡 <strong>Ejemplo (fase grupos - 20 pts base):</strong> Aciertas el ganador (8 pts) + gol local exacto (4 pts) + gol visita exacto (4 pts) + diferencia exacta (4 pts) = <strong>20 pts</strong>. Si fallas el ganador pero el marcador es inverso, obtienes 4 pts de consolación.</span>
            </div>
            <button class="modal-cerrar-accion" style="width:100%;background:#007aff;color:#fff;border:none;border-radius:14px;padding:14px;margin-top:8px;cursor:pointer;">Cerrar</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    const cerrar = () => overlay.remove();
    overlay.querySelectorAll('.modal-cerrar-btn, .modal-cerrar-accion').forEach(btn => btn.addEventListener('click', cerrar));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
}

// Modal 6: Calendario y Estrategias
function abrirModalCalendarioEstrategias() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:flex-end;justify-content:center;';
    
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div style="font-size:20px;font-weight:700;color:#1c1c1e;">📅 Calendario + Estrategias</div>
                <button class="modal-cerrar-btn" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:20px;">
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">
                    Conocer las fechas clave y aplicar buenas estrategias puede marcar la diferencia entre ganar o perder.
                </p>
            </div>
            <div style="background:#f2f2f7;border-radius:16px;padding:16px;margin-bottom:16px;">
                <div style="font-size:13px;font-weight:700;margin-bottom:12px;">📅 FECHAS CLAVE</div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>CICLO 1 (grupos):</span><span style="font-weight:700;">Cierra 11/06 2:00 PM</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>CICLO 2 (finalistas):</span><span style="font-weight:700;">PULSO 50 desde 11/06</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>CICLO 2 cierra:</span><span style="font-weight:700;">28/06 (inicio 16avos)</span></div>
                <div style="display:flex;justify-content:space-between;"><span>Partidos:</span><span style="font-weight:700;">PULSO 50 al comenzar</span></div>
            </div>
            <div style="background:#f2f2f7;border-radius:16px;padding:16px;margin-bottom:16px;">
                <div style="font-size:13px;font-weight:700;margin-bottom:12px;">💡 ESTRATEGIAS PARA GANAR</div>
                <div style="margin-bottom:8px;">🏆 <strong>Completa los ciclos temprano</strong> - Evitas el PULSO 50</div>
                <div style="margin-bottom:8px;">⚽ <strong>Haz pronósticos con anticipación</strong> - No olvides ningún partido</div>
                <div style="margin-bottom:8px;">📊 <strong>Revisa estadísticas</strong> - Mejora tu tasa de acierto</div>
                <div style="margin-bottom:8px;">🎯 <strong>Enfócate en el campeón primero</strong> - Vale 720 pts</div>
                <div>⚠️ <strong>No dejes pronósticos para última hora</strong> - El PULSO reducirá tus puntos</div>
            </div>
            <div style="background:#eafaf1;border:1px solid #a9dfbf;border-radius:12px;padding:12px;margin-bottom:16px;">
                <span style="color:#1e8449;font-size:12px;">🏆 <strong>El participante con más puntos al final de la final será el GANADOR de La Polla.</strong></span>
            </div>
            <button class="modal-cerrar-accion" style="width:100%;background:#007aff;color:#fff;border:none;border-radius:14px;padding:14px;margin-top:8px;cursor:pointer;">Cerrar</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    const cerrar = () => overlay.remove();
    overlay.querySelectorAll('.modal-cerrar-btn, .modal-cerrar-accion').forEach(btn => btn.addEventListener('click', cerrar));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
}

// ========== FUNCIÓN PRINCIPAL DE RENDERIZADO ==========
// (ÚNICA DECLARACIÓN - SIN DUPLICAR)

export async function renderizarReglas(contenedor, datosCuenta) {
    if (!contenedor) return;
    currentContenedor = contenedor;
    currentDatosCuenta = datosCuenta;
    
    contenedor.innerHTML = `
        <div style="width:100%; height:100%; background: #ffffff; border-radius: 20px; overflow-y: auto; overflow-x: hidden;">
            <style>
                .reglas-header {
                    background: linear-gradient(135deg, #af52de 0%, #5856d6 100%);
                    padding: 20px;
                    text-align: center;
                    color: white;
                }
                .reglas-header h2 {
                    font-size: 22px;
                    font-weight: 700;
                    margin: 0 0 4px 0;
                    color: white;
                }
                .reglas-header p {
                    font-size: 12px;
                    opacity: 0.9;
                    margin: 0;
                }
                
                /* Grid responsivo: 2 columnas en móvil, 3 columnas en desktop */
                .reglas-cards {
                    padding: 16px;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                
                @media (min-width: 769px) {
                    .reglas-cards {
                        grid-template-columns: repeat(3, 1fr);
                        gap: 16px;
                    }
                }
                
                .reglas-card {
                    background: #f9f9fb;
                    border: 1px solid #e5e5ea;
                    border-radius: 16px;
                    padding: 16px 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: center;
                }
                .reglas-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 14px rgba(0,0,0,0.08);
                    background: #ffffff;
                }
                .reglas-card:active {
                    transform: scale(0.98);
                }
                .reglas-card-icono {
                    font-size: 40px;
                    margin-bottom: 8px;
                }
                .reglas-card-titulo {
                    font-size: 13px;
                    font-weight: 700;
                    color: #1c1c1e;
                    line-height: 1.3;
                }
                .reglas-footer {
                    padding: 12px 16px;
                    text-align: center;
                    border-top: 1px solid #e5e5ea;
                    margin-top: 8px;
                }
                .reglas-footer-text {
                    font-size: 10px;
                    color: #8e8e93;
                }
            </style>
            
            <div class="reglas-header">
                <h2>📖 Reglas de La Polla Mundialista 2026</h2>
                <p>Aprende cómo funcionan los pronósticos y el sistema de puntos</p>
            </div>
            
            <div class="reglas-cards">
                <div class="reglas-card" data-modal="que-es-la-polla">
                    <div class="reglas-card-icono">🏆</div>
                    <div class="reglas-card-titulo">¿Qué es La Polla?</div>
                </div>
                <div class="reglas-card" data-modal="pulso">
                    <div class="reglas-card-icono">⚡</div>
                    <div class="reglas-card-titulo">Sistema de PULSO</div>
                </div>
                <div class="reglas-card" data-modal="ciclo1">
                    <div class="reglas-card-icono">⭐</div>
                    <div class="reglas-card-titulo">Especiales · CICLO 1</div>
                </div>
                <div class="reglas-card" data-modal="ciclo2">
                    <div class="reglas-card-icono">⚡</div>
                    <div class="reglas-card-titulo">CICLO 2 · Modo Sprint</div>
                </div>
                <div class="reglas-card" data-modal="puntos-partidos">
                    <div class="reglas-card-icono">⚽</div>
                    <div class="reglas-card-titulo">Partidos - Sistema de puntos</div>
                </div>
                <div class="reglas-card" data-modal="calendario-estrategias">
                    <div class="reglas-card-icono">📅</div>
                    <div class="reglas-card-titulo">Calendario + Estrategias</div>
                </div>
            </div>
            
            <div class="reglas-footer">
                <div class="reglas-footer-text">💡 Haz clic en cualquier card para ver la explicación detallada</div>
            </div>
        </div>
    `;
    
    const cards = contenedor.querySelectorAll('.reglas-card');
    cards.forEach(card => {
        const modalType = card.dataset.modal;
        card.addEventListener('click', () => {
            switch(modalType) {
                case 'que-es-la-polla':
                    abrirModalQueEsLaPolla();
                    break;
                case 'pulso':
                    abrirModalPulso();
                    break;
                case 'ciclo1':
                    abrirModalCiclo1();
                    break;
                case 'ciclo2':
                    abrirModalCiclo2();
                    break;
                case 'puntos-partidos':
                    abrirModalPuntosPartidos();
                    break;
                case 'calendario-estrategias':
                    abrirModalCalendarioEstrategias();
                    break;
            }
        });
    });
}