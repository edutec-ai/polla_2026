// funciones/tabla.js
// Módulo de Tabla de Posiciones - 3 TABLAS:
// 1. 📊 Grupos: usa campo 'pts_par_grp' (fase de grupos)
// 2. 🏆 Finales: usa campo 'pts_par_fnl' (fases finales)
// 3. ⭐ Especiales: usa campo 'pts_fnl_clf' (especiales: 1° y 2° de grupo)
// EXCLUYE usuarios de prueba: 'super', 'mundial'
// EXCLUYE usuarios con 0 puntos en cada categoría
// ORGANIZADORES al final del grupo de puntos

import { generarPDF } from './reglas.js';

const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

// Usuarios de prueba que NO deben aparecer
const USUARIOS_EXCLUIDOS = ['super', 'mundial', 'Super', 'Mundial', 'SUPER', 'MUNDIAL'];

// Organizadores que deben ir al final de su grupo de puntos
const ORGANIZADORES = [
    'hfhoyos', 'Hfhoyos', 'HFHOYOS',
    'villegas', 'Villegas', 'VILLEGAS',
    'henry villegas', 'Henry Villegas', 'HENRY VILLEGAS',
    'hector fabio hoyos', 'HECTOR FABIO HOYOS', 'Hector Fabio Hoyos'
];

function urlWithTimestamp(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_=${Date.now()}`;
}

function formatearPuntos(puntos) {
    if (!puntos && puntos !== 0) return '0';
    return puntos.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function esUsuarioExcluido(nombre) {
    if (!nombre) return false;
    return USUARIOS_EXCLUIDOS.includes(nombre.trim());
}

function esOrganizador(nombre) {
    if (!nombre) return false;
    const nombreLower = nombre.trim().toLowerCase();
    return ORGANIZADORES.some(org => org.toLowerCase() === nombreLower);
}

// ========== RENDERIZAR TABLA ==========
export async function renderizarTabla(contenedor, datosCuenta) {
    if (!contenedor) return;

    let tablaActiva = 'finales';

    contenedor.innerHTML = `
        <div style="padding: 16px; height: 100%; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
                <div style="background: rgba(0,0,0,0.2); border-radius: 20px; padding: 12px 16px; flex: 1; min-width: 200px;">
                    <div style="font-size: 18px; font-weight: 700; color: white;">🏆 Tabla de Posiciones</div>
                    <div style="font-size: 12px; color: #ffd60a;">Selecciona la tabla que quieras ver</div>
                </div>
                <div id="btn-pdf-tabla" style="background: rgba(255,255,255,0.15); border-radius: 20px; padding: 12px 20px; cursor: pointer; transition: all 0.2s ease;">
                    <div style="font-size: 14px; font-weight: 600; color: white; text-align: center;">📄 PDF</div>
                </div>
            </div>

            <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
                <button id="tab-grupos" style="flex:1; padding: 10px 16px; border: none; border-radius: 12px; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); font-weight: 600; cursor: pointer; transition: all 0.3s ease; min-width: 80px; font-size: 13px;">
                    📊 Grupos
                </button>
                <button id="tab-finales" style="flex:1; padding: 10px 16px; border: none; border-radius: 12px; background: #007aff; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s ease; min-width: 80px; font-size: 13px;">
                    🏆 Finales
                </button>
                <button id="tab-especiales" style="flex:1; padding: 10px 16px; border: none; border-radius: 12px; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); font-weight: 600; cursor: pointer; transition: all 0.3s ease; min-width: 80px; font-size: 13px;">
                    ⭐ Especiales
                </button>
            </div>

            <div id="tabla-contenido" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 20px; overflow: hidden; overflow-x: auto; min-height: 300px;">
                <div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.6);">
                    Cargando...
                </div>
            </div>

            <div style="margin-top: 12px; text-align: center; font-size: 9px; color: rgba(255,255,255,0.3);" id="tabla-footer">
                Total de participantes: -- · Actualizado en tiempo real
            </div>
        </div>
    `;

    document.getElementById('tab-grupos').addEventListener('click', () => {
        tablaActiva = 'grupos';
        actualizarTabs();
        cargarTabla(tablaActiva);
    });

    document.getElementById('tab-finales').addEventListener('click', () => {
        tablaActiva = 'finales';
        actualizarTabs();
        cargarTabla(tablaActiva);
    });

    document.getElementById('tab-especiales').addEventListener('click', () => {
        tablaActiva = 'especiales';
        actualizarTabs();
        cargarTabla(tablaActiva);
    });

    document.getElementById('btn-pdf-tabla').addEventListener('click', () => {
        generarPDF(datosCuenta);
    });

    function actualizarTabs() {
        const tabs = ['grupos', 'finales', 'especiales'];
        tabs.forEach((tab) => {
            const el = document.getElementById(`tab-${tab}`);
            if (tab === tablaActiva) {
                el.style.background = '#007aff';
                el.style.color = 'white';
            } else {
                el.style.background = 'rgba(255,255,255,0.1)';
                el.style.color = 'rgba(255,255,255,0.5)';
            }
        });
    }

    async function cargarTabla(tipo) {
        const contenido = document.getElementById('tabla-contenido');
        const footer = document.getElementById('tabla-footer');

        contenido.innerHTML = `
            <div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.6);">
                <div style="width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #007aff; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto;"></div>
                <p style="margin-top: 12px;">Cargando...</p>
            </div>
        `;

        try {
            const response = await fetch(urlWithTimestamp(`${BASE}/fifa_jug?api_key=${KEY}`));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const jugadores = data.fifa_jug || [];

            const jugadoresActivos = jugadores.filter(j => {
                if (j.off === true) return false;
                if (esUsuarioExcluido(j.name)) return false;
                if (!j.name || j.name.trim() === '') return false;
                return true;
            });

            if (jugadoresActivos.length === 0) {
                contenido.innerHTML = `
                    <div style="padding: 40px; text-align: center; color: rgba(255,255,255,0.6);">
                        <div style="font-size: 40px;">📊</div>
                        <div style="font-size: 16px; margin-top: 12px;">No hay datos disponibles</div>
                    </div>
                `;
                return;
            }

            let jugadoresConPuntos = [];

            if (tipo === 'grupos') {
                // TABLA DE GRUPOS: usa campo 'pts_par_grp'
                jugadoresConPuntos = jugadoresActivos
                    .map(j => ({ ...j, puntos: j.pts_par_grp || 0 }))
                    .filter(j => j.puntos > 0);
                    
                console.log(`[Tabla] Grupos: ${jugadoresConPuntos.length} jugadores con pts_par_grp`);

            } else if (tipo === 'finales') {
                // TABLA DE FINALES: usa campo 'pts_par_fnl'
                jugadoresConPuntos = jugadoresActivos
                    .map(j => ({ ...j, puntos: j.pts_par_fnl || 0 }))
                    .filter(j => j.puntos > 0);
                    
                console.log(`[Tabla] Finales: ${jugadoresConPuntos.length} jugadores con pts_par_fnl`);

            } else if (tipo === 'especiales') {
                // TABLA DE ESPECIALES: usa campo 'pts_fnl_clf'
                jugadoresConPuntos = jugadoresActivos
                    .map(j => ({ ...j, puntos: j.pts_fnl_clf || 0 }))
                    .filter(j => j.puntos > 0);
                    
                console.log(`[Tabla] Especiales: ${jugadoresConPuntos.length} jugadores con pts_fnl_clf`);
            }

            jugadoresConPuntos.sort((a, b) => {
                const ptsA = a.puntos || 0;
                const ptsB = b.puntos || 0;

                if (ptsA !== ptsB) {
                    return ptsB - ptsA;
                }

                const aEsOrganizador = esOrganizador(a.name);
                const bEsOrganizador = esOrganizador(b.name);

                if (aEsOrganizador && !bEsOrganizador) return 1;
                if (!aEsOrganizador && bEsOrganizador) return -1;

                return (a.name || '').localeCompare(b.name || '');
            });

            if (jugadoresConPuntos.length === 0) {
                const nombres = {
                    'grupos': 'Grupos',
                    'finales': 'Finales',
                    'especiales': 'Especiales'
                };
                contenido.innerHTML = `
                    <div style="padding: 40px; text-align: center; color: rgba(255,255,255,0.6);">
                        <div style="font-size: 40px;">📊</div>
                        <div style="font-size: 16px; margin-top: 12px;">No hay datos disponibles para ${nombres[tipo]}</div>
                    </div>
                `;
                footer.textContent = `Total de participantes: 0 · Actualizado en tiempo real`;
                return;
            }

            let html = `
                <table style="width: 100%; border-collapse: collapse; font-size: 11px; min-width: 280px;">
                    <thead>
                        <tr style="background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.2);">
                            <th style="padding: 8px 4px; text-align: center; width: 40px; color: #ffd60a;">#</th>
                            <th style="padding: 8px 4px; text-align: left; color: #ffd60a;">Jugador</th>
                            <th style="padding: 8px 4px; text-align: center; width: 50px; color: #ffd60a;">Pts</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            jugadoresConPuntos.forEach((jugador, index) => {
                const posicion = index + 1;
                let bgColor = '';
                if (posicion === 1) bgColor = 'rgba(255, 215, 0, 0.1)';
                else if (posicion === 2) bgColor = 'rgba(192, 192, 192, 0.1)';
                else if (posicion === 3) bgColor = 'rgba(205, 127, 50, 0.1)';

                let nombreJugador = jugador.name || jugador.nombre || `Jugador ${jugador.id}`;
                if (nombreJugador.length > 25) {
                    nombreJugador = nombreJugador.substring(0, 22) + '...';
                }
                const puntos = jugador.puntos || 0;

                html += `
                    <tr style="border-bottom: 0.5px solid rgba(255,255,255,0.1); background: ${bgColor};">
                        <td style="padding: 6px 4px; text-align: center; font-weight: 600; color: ${posicion <= 3 ? '#ffd60a' : 'rgba(255,255,255,0.7)'};">${posicion}</td>
                        <td style="padding: 6px 4px; text-align: left; color: white; font-weight: ${posicion <= 3 ? '600' : '400'}; word-break: break-word;">${escapeHtml(nombreJugador)}</td>
                        <td style="padding: 6px 4px; text-align: center; font-weight: 600; color: #34c759;">${formatearPuntos(puntos)}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;

            contenido.innerHTML = html;
            footer.textContent = `Total de participantes: ${jugadoresConPuntos.length} · Actualizado en tiempo real`;

        } catch (error) {
            console.error(`[Tabla] Error cargando tabla ${tipo}:`, error);
            contenido.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #ff6b6b;">
                    <div>⚠️ Error al cargar la tabla</div>
                    <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 20px; background: #007aff; border: none; border-radius: 10px; color: white; cursor: pointer;">Reintentar</button>
                </div>
            `;
        }
    }

    cargarTabla('finales');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
