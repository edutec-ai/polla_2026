// funciones/reglas.js
// Módulo "REGLAS" - Tutorial interactivo de La Polla Mundialista 2026
// CON INFORME EN VENTANA EXTERNA + BOTÓN DE DESCARGA

import { getBandera } from './banderas.js';
import { cargarPronosticosPartidosLocal, cargarPronosticosEspecialesLocal } from './sync.js';

let currentContenedor = null;
let currentDatosCuenta = null;
let currentPronosticosPartidos = {};
let currentPronosticosEspeciales = { grupos: {}, finalistas: {} };
let currentPartidosCache = [];
let currentEquiposCache = [];

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

// ========== FUNCIONES PARA CARGAR DATOS ==========

async function cargarPartidos() {
    const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
    const KEY = 'SuzvTp4qwXQtAVFJbdzP';
    try {
        const timestamp = Date.now();
        const response = await fetch(`${BASE}/fifa_ptd?api_key=${KEY}&_=${timestamp}`);
        const data = await response.json();
        currentPartidosCache = data.fifa_ptd || [];
        
        currentPartidosCache.sort((a, b) => {
            if (a.fch !== b.fch) return a.fch.localeCompare(b.fch);
            return (a.hor || '00:00:00').localeCompare(b.hor || '00:00:00');
        });
        
        console.log('[Reglas] Partidos cargados:', currentPartidosCache.length);
        return currentPartidosCache;
    } catch (error) {
        console.error('[Reglas] Error cargando partidos:', error);
        return [];
    }
}

async function cargarEquipos() {
    const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
    const KEY = 'SuzvTp4qwXQtAVFJbdzP';
    try {
        const timestamp = Date.now();
        const response = await fetch(`${BASE}/fifa_equ?api_key=${KEY}&_=${timestamp}`);
        const data = await response.json();
        currentEquiposCache = data.fifa_equ || [];
        console.log('[Reglas] Equipos cargados:', currentEquiposCache.length);
        return currentEquiposCache;
    } catch (error) {
        console.error('[Reglas] Error cargando equipos:', error);
        return [];
    }
}

function cargarPronosticosLocales() {
    currentPronosticosPartidos = cargarPronosticosPartidosLocal();
    const especiales = cargarPronosticosEspecialesLocal();
    currentPronosticosEspeciales = { grupos: especiales.grupos || {}, finalistas: especiales.finalistas || {} };
    console.log('[Reglas] Pronósticos cargados - Partidos:', Object.keys(currentPronosticosPartidos).length, 'Especiales:', currentPronosticosEspeciales);
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

function getMultiplicadorPulso(pul) {
    if (pul === '1') return 1;
    if (pul === '2') return 0.5;
    return 0;
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
    
    const pronosticoGanador = pronostico.s1 > pronostico.s2 ? 'local' : (pronostico.s2 > pronostico.s1 ? 'visita' : 'empate');
    const realGanador = resultadoReal.gol_loc > resultadoReal.gol_vis ? 'local' : (resultadoReal.gol_vis > resultadoReal.gol_loc ? 'visita' : 'empate');
    
    let ganador = 0, golLocal = 0, golVisita = 0, diferencia = 0, inverso = 0;
    
    if (pronosticoGanador === realGanador) ganador = p.GANADOR;
    if (resultadoReal.gol_loc === pronostico.s1) golLocal = p.GOL;
    if (resultadoReal.gol_vis === pronostico.s2) golVisita = p.GOL;
    
    const pronosticoDiferencia = Math.abs(pronostico.s1 - pronostico.s2);
    const realDiferencia = Math.abs(resultadoReal.gol_loc - resultadoReal.gol_vis);
    if (pronosticoDiferencia === realDiferencia) diferencia = p.DIFERENCIA;
    
    if (pronosticoGanador !== realGanador) {
        if (resultadoReal.gol_loc === pronostico.s2 && resultadoReal.gol_vis === pronostico.s1) inverso = p.INVERSO;
    }
    
    let total = ganador + golLocal + golVisita + diferencia + inverso;
    total = Math.round(total * multiplicador);
    
    return { ganador, golLocal, golVisita, diferencia, inverso, total, multiplicador };
}

// ========== GENERACIÓN DEL CONTENIDO PARA EL INFORME ==========

function generarHTMLPDF(datosCuenta, puntosReales) {
    const fechaGeneracion = new Date();
    const fechaStr = fechaGeneracion.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    const horaStr = fechaGeneracion.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const partidosGrupos = currentPartidosCache.filter(p => Number(p.fas) === 1);
    
    const gruposOrden = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    
    let gruposHTML = '';
    gruposOrden.forEach(grupo => {
        const clasificados = currentPronosticosEspeciales.grupos[grupo] || {};
        const primero = clasificados[1] || '—';
        const segundo = clasificados[2] || '—';
        gruposHTML += `
            <tr>
                <td style="padding: 6px; border: 1px solid #ccc;"><strong>Grupo ${grupo}</strong></td>
                <td style="padding: 6px; border: 1px solid #ccc;">${getBandera(primero)} ${primero}</td>
                <td style="padding: 6px; border: 1px solid #ccc;">${getBandera(segundo)} ${segundo}</td>
            </tr>
        `;
    });
    
    let partidosHTML = '';
    partidosGrupos.forEach(p => {
        const pronostico = currentPronosticosPartidos[p.id];
        const resultadoReal = (Number(p.est) === 4) ? { gol_loc: p.t90_gol_loc || 0, gol_vis: p.t90_gol_vis || 0 } : null;
        const pulso = pronostico?.pul || '0';
        let pulsoTexto = '';
        let pulsoColor = '';
        if (pulso === '1') { pulsoTexto = '🟢 PULSO 100'; pulsoColor = '#1e8449'; }
        else if (pulso === '2') { pulsoTexto = '🟡 PULSO 50'; pulsoColor = '#c05a00'; }
        else { pulsoTexto = '🔴 PULSO 0'; pulsoColor = '#c0392b'; }
        
        const fechaPartido = p.fch ? p.fch.split('T')[0] : '';
        const horaPartido = p.hor ? p.hor.substring(0, 5) : '';
        
        let puntosDetalle = { ganador: 0, golLocal: 0, golVisita: 0, diferencia: 0, inverso: 0, total: 0, multiplicador: 1 };
        if (resultadoReal && pronostico) {
            puntosDetalle = calcularPuntosDetalle(pronostico, resultadoReal, p.fas, pulso);
        }
        
        const resultadoRealText = resultadoReal ? `${resultadoReal.gol_loc} - ${resultadoReal.gol_vis}` : 'PENDIENTE';
        const pronosticoText = pronostico ? `${pronostico.s1} - ${pronostico.s2}` : '—';
        
        partidosHTML += `
            <tr style="page-break-inside: avoid;">
                <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${fechaPartido}<br>${horaPartido}</td>
                <td style="padding: 6px; border: 1px solid #ccc;" class="partido-equipos">
                    ${getBandera(p.nom_loc)} ${p.nom_loc} vs ${getBandera(p.nom_vis)} ${p.nom_vis}
                </td>
                <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">
                    <span style="color: ${pulsoColor}; font-weight: bold;">${pulsoTexto}</span>
                </td>
                <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${resultadoRealText}</td>
                <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${pronosticoText}</td>
                <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">
                    ${puntosDetalle.total > 0 || resultadoReal ? `
                        <div>🏆 Ganador / Empate= ${puntosDetalle.ganador}</div>
                        <div>⚽ Gol local exacto= ${puntosDetalle.golLocal}</div>
                        <div>⚽ Gol visita exacto= ${puntosDetalle.golVisita}</div>
                        <div>📊 Diferencia de goles= ${puntosDetalle.diferencia}</div>
                        <div>🔄 Marcador inverso= ${puntosDetalle.inverso}</div>
                        <div class="total-puntos" style="font-weight: bold; color: #007aff; margin-top: 4px;">⭐ TOTAL= ${puntosDetalle.total}</div>
                    ` : '<span style="color:#999;">—</span>'}
                </td>
            </tr>
        `;
    });
    
    const finalistas = currentPronosticosEspeciales.finalistas || {};
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Informe de Pronósticos - Polla Mundialista 2026</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: white; color: black; }
                .print-container { max-width: 1200px; margin: 0 auto; }
                .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                .print-header h1 { font-size: 18px; margin: 0; }
                .print-header h2 { font-size: 14px; margin: 5px 0 0; color: #555; font-weight: normal; }
                .print-header .participante { font-size: 12px; margin-top: 8px; }
                .print-section { margin-bottom: 25px; }
                .print-section-title { font-size: 14px; font-weight: bold; background: #f0f0f0; padding: 6px 10px; margin-bottom: 10px; border-left: 4px solid #007aff; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 15px; }
                th, td { border: 1px solid #ccc; padding: 6px; vertical-align: top; }
                th { background: #f5f5f5; font-weight: bold; text-align: center; }
                .partidos-table { table-layout: fixed; }
                .partidos-table th:nth-child(1), .partidos-table td:nth-child(1) { width: 10%; }
                .partidos-table th:nth-child(2), .partidos-table td:nth-child(2) { width: 30%; }
                .partidos-table th:nth-child(3), .partidos-table td:nth-child(3) { width: 10%; }
                .partidos-table th:nth-child(4), .partidos-table td:nth-child(4) { width: 10%; }
                .partidos-table th:nth-child(5), .partidos-table td:nth-child(5) { width: 10%; }
                .partidos-table th:nth-child(6), .partidos-table td:nth-child(6) { width: 30%; }
                .partido-equipos { word-break: break-word; }
                .finalistas-list { display: flex; flex-wrap: wrap; gap: 15px; }
                .finalista-item { flex: 1; min-width: 150px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px; }
                .print-footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 8px; text-align: center; color: #777; }
                .total-puntos { font-weight: bold; color: #007aff; margin-top: 4px; }
                .download-btn-container { text-align: center; margin: 30px 0 20px; padding: 10px; }
                .download-btn { background: #007aff; color: white; border: none; padding: 10px 24px; font-size: 14px; font-weight: 600; border-radius: 30px; cursor: pointer; transition: background 0.2s; }
                .download-btn:hover { background: #005fc4; }
                .download-hint { font-size: 11px; color: #777; margin-top: 8px; }
                @media print { .download-btn-container { display: none; } }
            </style>
        </head>
        <body>
            <div class="print-container">
                <div class="print-header">
                    <h1>🏆 POLLA MUNDIALISTA 2026</h1>
                    <h2>Documento de verificación de pronósticos y puntuación</h2>
                    <div class="participante">
                        <strong>Participante:</strong> ${datosCuenta.name || datosCuenta.nombre || '—'} | 
                        <strong>ID Cuenta:</strong> ${datosCuenta.id || '—'} | 
                        <strong>Puntos totales:</strong> ${puntosReales} pts
                    </div>
                    <div class="participante">
                        <strong>Fecha generación:</strong> ${fechaStr} - ${horaStr}
                    </div>
                </div>
                
                <div class="print-section">
                    <div class="print-section-title">📋 CICLO 1: CLASIFICADOS POR GRUPO</div>
                    <table><thead><tr><th>Grupo</th><th>1° Clasificado</th><th>2° Clasificado</th></tr></thead>
                    <tbody>${gruposHTML}</tbody></table>
                </div>
                
                <div class="print-section">
                    <div class="print-section-title">⚽ CICLO 1: PARTIDOS - FASE DE GRUPOS</div>
                    <table class="partidos-table" style="font-size: 9px;">
                        <thead><tr><th>Fecha/Hora</th><th>Partido</th><th>Pulso</th><th>Resultado Real</th><th>Pronóstico</th><th>Detalle Puntos</th></tr></thead>
                        <tbody>${partidosHTML}</tbody>
                    </table>
                </div>
                
                <div class="print-section">
                    <div class="print-section-title">👑 CICLO 2: FINALISTAS</div>
                    <div class="finalistas-list">
                        <div class="finalista-item"><strong>🏆 Campeón</strong><br>${getBandera(finalistas.campeon)} ${finalistas.campeon || '—'}</div>
                        <div class="finalista-item"><strong>🥈 Subcampeón</strong><br>${getBandera(finalistas.subcampeon)} ${finalistas.subcampeon || '—'}</div>
                        <div class="finalista-item"><strong>🥉 Tercer puesto</strong><br>${getBandera(finalistas.tercero)} ${finalistas.tercero || '—'}</div>
                        <div class="finalista-item"><strong>4️⃣ Cuarto puesto</strong><br>${getBandera(finalistas.cuarto)} ${finalistas.cuarto || '—'}</div>
                    </div>
                </div>
                
                <div class="download-btn-container">
                    <button class="download-btn" onclick="window.print();">📥 Descargar / Guardar como PDF</button>
                    <div class="download-hint">💡 También puedes usar Ctrl+P (Windows) o Cmd+P (Mac)</div>
                </div>
                
                <div class="print-footer">
                    Documento generado automáticamente el ${fechaStr} a las ${horaStr}.<br>
                    Este informe es una verificación de los pronósticos registrados en La Polla Mundialista 2026.
                </div>
            </div>
        </body>
        </html>
    `;
}

// ========== FUNCIÓN PARA GENERAR Y ABRIR INFORME EN VENTANA EXTERNA ==========

// ========== FUNCIÓN PARA GENERAR Y MOSTRAR INFORME EN MODAL ==========

export async function generarPDF(datosCuenta) {
    mostrarToast('📄 Generando informe...', 'info');
    
    await cargarEquipos();
    await cargarPartidos();
    cargarPronosticosLocales();
    
    let puntosReales = 0;
    const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
    const KEY = 'SuzvTp4qwXQtAVFJbdzP';
    try {
        const jugadorId = datosCuenta.id || datosCuenta.ID;
        const response = await fetch(`${BASE}/fifa_jug?api_key=${KEY}&filter[id]=${jugadorId}&_=${Date.now()}`);
        if (response.ok) {
            const data = await response.json();
            const jugador = data.fifa_jug?.[0];
            if (jugador && jugador.pts !== undefined) {
                puntosReales = jugador.pts;
            }
        }
    } catch (error) {
        console.error('[Reglas] Error obteniendo puntos reales:', error);
    }
    
    const htmlContent = generarHTMLPDF(datosCuenta, puntosReales);
    
    // Crear el modal
    const modalOverlay = document.createElement('div');
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.85);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease;
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.style.cssText = `
        width: 90%;
        max-width: 1200px;
        height: 90%;
        background: white;
        border-radius: 20px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
    `;
    
    // Cabecera del modal con botón cerrar
    const modalHeader = document.createElement('div');
    modalHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: linear-gradient(135deg, #003087 0%, #c8102e 100%);
        color: white;
        flex-shrink: 0;
    `;
    modalHeader.innerHTML = `
        <div>
            <div style="font-size: 16px; font-weight: 700;">📄 Informe de Pronósticos</div>
            <div style="font-size: 11px; opacity: 0.8;">Polla Mundialista 2026</div>
        </div>
        <div style="display: flex; gap: 12px;">
            <button id="modal-download-btn" style="
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.4);
                border-radius: 30px;
                padding: 6px 14px;
                color: white;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">📥 Descargar PDF</button>
            <button id="modal-close-btn" style="
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border-radius: 16px;
                transition: all 0.2s;
                " onmouseover="this.style.background='rgba(255,255,255,0.2)'" 
                onmouseout="this.style.background='none'">🅧
            </button>
        </div>
    `;
    
    // Contenido del modal (iframe para el informe)
    const modalBody = document.createElement('div');
    modalBody.style.cssText = `
        flex: 1;
        overflow: hidden;
        background: white;
    `;
    
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
    `;
    modalBody.appendChild(iframe);
    
    modalContainer.appendChild(modalHeader);
    modalContainer.appendChild(modalBody);
    modalOverlay.appendChild(modalContainer);
    document.body.appendChild(modalOverlay);
    
    // Escribir el contenido en el iframe
    iframe.contentDocument.open();
    iframe.contentDocument.write(htmlContent);
    iframe.contentDocument.close();
    
    // Animaciones
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Evento cerrar modal
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modalOverlay.remove();
            mostrarToast('✅ Informe cerrado', 'ok');
        });
    }
    
    // Evento descargar PDF (usando print del iframe)
    const downloadBtn = document.getElementById('modal-download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            iframe.contentWindow.print();
        });
    }
    
    // Cerrar al hacer clic fuera del modal
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
            mostrarToast('✅ Informe cerrado', 'ok');
        }
    });
    
    mostrarToast('✅ Informe cargado', 'ok');
}

// ========== MODALES ==========

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
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;"><strong>La Polla Mundialista 2026</strong> es un juego interactivo de pronósticos deportivos donde los participantes compiten para ver quién acierta más resultados del Mundial de Fútbol 2026, que se celebrará en Estados Unidos, México y Canadá con 48 equipos participantes.</p>
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">El objetivo es <strong>acumular la mayor cantidad de puntos posible</strong> a lo largo del torneo. Los puntos se obtienen acertando:</p>
                <ul style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-left:20px;margin-bottom:12px;"><li>⚽ Los resultados de los partidos (marcador exacto, ganador, diferencia de goles)</li><li>⭐ Los clasificados de la fase de grupos (CICLO 1)</li><li>🏆 Los finalistas del torneo (CICLO 2)</li></ul>
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">El participante con más puntos al final de la final del mundial será el <strong>GANADOR</strong> de La Polla.</p>
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

function abrirModalPulso() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:flex-end;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div style="font-size:20px;font-weight:700;color:#1c1c1e;">⚡ Sistema de PULSO</div>
                <button class="modal-cerrar-btn" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:20px;"><p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">El <strong>PULSO</strong> es un sistema de puntuación dinámica que recompensa a los usuarios que realizan sus pronósticos con anticipación. Cuanto antes hagas tu pronóstico, más puntos puedes obtener.</p></div>
            <div style="background:#f2f2f7;border-radius:16px;padding:16px;margin-bottom:16px;">
                <div style="font-size:14px;font-weight:700;margin-bottom:12px;">📊 Los tres estados del PULSO</div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;padding:8px;background:#eafaf1;border-radius:12px;"><span>🟢 <strong>PULSO 100</strong></span><span>Antes del inicio</span><span style="color:#34c759;font-weight:700;">100% puntos</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;padding:8px;background:#fff9ec;border-radius:12px;"><span>🟡 <strong>PULSO 50</strong></span><span>Durante el evento</span><span style="color:#ff9500;font-weight:700;">50% puntos</span></div>
                <div style="display:flex;justify-content:space-between;padding:8px;background:#f2f2f7;border-radius:12px;"><span>🔒 <strong>CERRADO</strong></span><span>Después del evento</span><span style="color:#8e8e93;font-weight:700;">0% puntos</span></div>
            </div>
            <div style="background:#f2f2f7;border-radius:16px;padding:16px;margin-bottom:16px;">
                <div style="font-size:14px;font-weight:700;margin-bottom:12px;">⏱️ Línea de tiempo del PULSO</div>
                <div style="margin-bottom:8px;">📋 <strong>CICLO 1:</strong> Solo Abierto (antes 11/06) o CERRADO (después)</div>
                <div style="margin-bottom:8px;">🏆 <strong>CICLO 2:</strong> 🟢 PULSO 100 → 🟡 PULSO 50 (11/06) → 🔒 CERRADO (28/06)</div>
                <div>⚽ <strong>Partidos:</strong> 🟢 PULSO 100 (antes) → 🟡 PULSO 50 (primer tiempo) → 🔒 CERRADO (entretiempo)</div>
            </div>
            <div style="background:#fff9ec;border:1px solid #ffd080;border-radius:12px;padding:12px;margin-bottom:16px;"><span style="color:#c05a00;font-size:12px;">⚠️ <strong>Importante:</strong> En PULSO 50, solo puedes crear un pronóstico si NO lo hiciste antes. No puedes modificar pronósticos existentes.</span></div>
            <button class="modal-cerrar-accion" style="width:100%;background:#007aff;color:#fff;border:none;border-radius:14px;padding:14px;margin-top:8px;cursor:pointer;">Cerrar</button>
        </div>
    `;
    document.body.appendChild(overlay);
    const cerrar = () => overlay.remove();
    overlay.querySelectorAll('.modal-cerrar-btn, .modal-cerrar-accion').forEach(btn => btn.addEventListener('click', cerrar));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
}

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
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">El <strong>CICLO 1 · Modo Maratón</strong> consiste en seleccionar los <strong>dos mejores equipos de cada uno de los 12 grupos</strong> del mundial. En cada grupo hay 4 equipos, y debes elegir el 1° y 2° clasificado que avanzarán a octavos de final.</p>
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;"><strong>📅 Fecha límite:</strong> 11 de junio de 2026, 2:00 PM (hora del partido inaugural)</p>
                <p style="font-size:14px;color:#ff3b30;line-height:1.5;margin-bottom:12px;">⚠️ No hay PULSO 50 para el CICLO 1. O lo haces antes de la inauguración, o pierdes la oportunidad para siempre.</p>
            </div>
            <div style="background:#f2f2f7;border-radius:16px;padding:16px;margin-bottom:16px;">
                <div style="font-size:14px;font-weight:700;margin-bottom:12px;">💰 SISTEMA DE PUNTOS</div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>✅ Aciertas el orden exacto (1° y 2° correctos):</span><span style="color:#34c759;font-weight:700;">60 pts por grupo</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>🔄 Aciertas pero en desorden:</span><span style="color:#ff9500;font-weight:700;">30 pts por grupo</span></div>
                <div style="height:1px;background:#e5e5ea;margin:8px 0;"></div>
                <div style="display:flex;justify-content:space-between;"><span>⭐ Puntaje máximo posible:</span><span style="color:#007aff;font-weight:700;">720 pts (12 grupos × 60 pts)</span></div>
            </div>
            <button class="modal-cerrar-accion" style="width:100%;background:#007aff;color:#fff;border:none;border-radius:14px;padding:14px;margin-top:8px;cursor:pointer;">Cerrar</button>
        </div>
    `;
    document.body.appendChild(overlay);
    const cerrar = () => overlay.remove();
    overlay.querySelectorAll('.modal-cerrar-btn, .modal-cerrar-accion').forEach(btn => btn.addEventListener('click', cerrar));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
}

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
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">El <strong>CICLO 2 · Modo Sprint</strong> consiste en pronosticar los <strong>cuatro finalistas del torneo</strong> en su orden correcto: Campeón, Subcampeón, Tercer puesto y Cuarto puesto.</p>
                <p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">Se llama "Modo Sprint" porque requiere un análisis concentrado y veloz sobre los equipos candidatos al título, a diferencia del CICLO 1 que analiza 48 equipos.</p>
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
            <div style="background:#fff9ec;border:1px solid #ffd080;border-radius:12px;padding:12px;margin-bottom:16px;"><span style="color:#c05a00;font-size:12px;">🟡 <strong>PULSO 50:</strong> Si completas el CICLO 2 después del inicio del mundial (11/06 2:00 PM), los puntos se reducen a la mitad. Si lo completas después del 28/06, ya no se puede modificar.</span></div>
            <button class="modal-cerrar-accion" style="width:100%;background:#007aff;color:#fff;border:none;border-radius:14px;padding:14px;margin-top:8px;cursor:pointer;">Cerrar</button>
        </div>
    `;
    document.body.appendChild(overlay);
    const cerrar = () => overlay.remove();
    overlay.querySelectorAll('.modal-cerrar-btn, .modal-cerrar-accion').forEach(btn => btn.addEventListener('click', cerrar));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
}

function abrirModalPuntosPartidos() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:flex-end;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div style="font-size:20px;font-weight:700;color:#1c1c1e;">⚽ Partidos - Sistema de Puntos</div>
                <button class="modal-cerrar-btn" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:20px;"><p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">Cada partido tiene una <strong>base de puntos</strong> según la fase del torneo. Tu pronóstico consiste en predecir el marcador exacto.</p></div>
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
            <div style="background:#eafaf1;border:1px solid #a9dfbf;border-radius:12px;padding:12px;margin-bottom:16px;"><span style="color:#1e8449;font-size:12px;">💡 <strong>Ejemplo (fase grupos - 20 pts base):</strong> Aciertas el ganador (8 pts) + gol local exacto (4 pts) + gol visita exacto (4 pts) + diferencia exacta (4 pts) = <strong>20 pts</strong>. Si fallas el ganador pero el marcador es inverso, obtienes 4 pts de consolación.</span></div>
            <button class="modal-cerrar-accion" style="width:100%;background:#007aff;color:#fff;border:none;border-radius:14px;padding:14px;margin-top:8px;cursor:pointer;">Cerrar</button>
        </div>
    `;
    document.body.appendChild(overlay);
    const cerrar = () => overlay.remove();
    overlay.querySelectorAll('.modal-cerrar-btn, .modal-cerrar-accion').forEach(btn => btn.addEventListener('click', cerrar));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
}

function abrirModalCalendarioEstrategias() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:flex-end;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div style="font-size:20px;font-weight:700;color:#1c1c1e;">📅 Calendario + Estrategias</div>
                <button class="modal-cerrar-btn" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:20px;"><p style="font-size:14px;color:#1c1c1e;line-height:1.5;margin-bottom:12px;">Conocer las fechas clave y aplicar buenas estrategias puede marcar la diferencia entre ganar o perder.</p></div>
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
            <div style="background:#eafaf1;border:1px solid #a9dfbf;border-radius:12px;padding:12px;margin-bottom:16px;"><span style="color:#1e8449;font-size:12px;">🏆 <strong>El participante con más puntos al final de la final será el GANADOR de La Polla.</strong></span></div>
            <button class="modal-cerrar-accion" style="width:100%;background:#007aff;color:#fff;border:none;border-radius:14px;padding:14px;margin-top:8px;cursor:pointer;">Cerrar</button>
        </div>
    `;
    document.body.appendChild(overlay);
    const cerrar = () => overlay.remove();
    overlay.querySelectorAll('.modal-cerrar-btn, .modal-cerrar-accion').forEach(btn => btn.addEventListener('click', cerrar));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
}

// ========== RENDERIZADO PRINCIPAL ==========

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
                    position: relative;
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
                .btn-pdf {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.3);
                    border-radius: 30px;
                    padding: 6px 14px;
                    color: white;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    z-index: 10;
                }
                .btn-pdf:hover {
                    background: rgba(255,255,255,0.3);
                    transform: scale(1.02);
                }
                .btn-pdf:active {
                    transform: scale(0.98);
                }
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
                @media (max-width: 600px) {
                    .btn-pdf {
                        position: static;
                        margin-top: 12px;
                        display: inline-block;
                    }
                }
            </style>
            
            <div class="reglas-header">
                <h2>📖 Reglas de La Polla Mundialista 2026</h2>
                <p>Aprende cómo funcionan los pronósticos y el sistema de puntos</p>
                <button class="btn-pdf" id="btn-pdf-reglas">📄 DESCARGAR INFORME PDF</button>
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
    
    const btnPDF = document.getElementById('btn-pdf-reglas');
    if (btnPDF) {
        btnPDF.onclick = () => generarPDF(datosCuenta);
    }
    
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
