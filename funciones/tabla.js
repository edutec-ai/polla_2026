// funciones/tabla.js
// Módulo de Tabla de Posiciones - Listado COMPLETO (sin límite TOP 50)
// EXCLUYE usuarios de prueba: 'super', 'mundial'
// EXCLUYE usuarios con 0 puntos
// ORGANIZADORES al final del grupo de puntos
// Título actualizado: "Tabla de Posiciones Dinámica" + "Esta tabla se actualiza con el resultado en vivo"

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

export async function renderizarTabla(contenedor, datosCuenta) {
    if (!contenedor) return;
    
    // Mostrar loader
    contenedor.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100%; min-height: 300px;">
            <div style="text-align: center;">
                <div style="width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #007aff; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto;"></div>
                <p style="color: white; margin-top: 16px;">Cargando tabla de posiciones...</p>
            </div>
        </div>
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    
    try {
        const response = await fetch(urlWithTimestamp(`${BASE}/fifa_jug?api_key=${KEY}`));
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const jugadores = data.fifa_jug || [];
        
        // Filtrar usuarios excluidos, inactivos y con 0 puntos
        const jugadoresActivos = jugadores.filter(j => {
            if (j.off === true) return false;
            if (esUsuarioExcluido(j.name)) return false;
            if (!j.name || j.name.trim() === '') return false;
            if ((j.pts || 0) === 0) return false;
            return true;
        });
        
        // Ordenar: por puntos (mayor a menor), organizadores al final del grupo de puntos
        jugadoresActivos.sort((a, b) => {
            const ptsA = a.pts || 0;
            const ptsB = b.pts || 0;
            
            if (ptsA !== ptsB) {
                return ptsB - ptsA;
            }
            
            const aEsOrganizador = esOrganizador(a.name);
            const bEsOrganizador = esOrganizador(b.name);
            
            if (aEsOrganizador && !bEsOrganizador) {
                return 1;
            }
            if (!aEsOrganizador && bEsOrganizador) {
                return -1;
            }
            
            return (a.name || '').localeCompare(b.name || '');
        });
        
        // ✅ CAMBIO 1: Mostrar TODOS los jugadores (sin límite de 50)
        const todosLosJugadores = jugadoresActivos;
        
        if (todosLosJugadores.length === 0) {
            contenedor.innerHTML = `
                <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.7);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
                    <div style="font-size: 16px;">No hay datos disponibles</div>
                    <div style="font-size: 12px; margin-top: 8px;">Los puntajes se actualizarán después del primer partido</div>
                </div>
            `;
            return;
        }
        
        // ✅ CAMBIO 2: Nuevo título y subtítulo
        let html = `
            <div style="padding: 16px; height: 100%; overflow-y: auto;">
                <div style="background: rgba(0,0,0,0.2); border-radius: 20px; padding: 12px 16px; margin-bottom: 16px;">
                    <div style="font-size: 18px; font-weight: 700; color: white;">🏆 Tabla de Posiciones Dinámica</div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.5);">Esta tabla se actualiza con el resultado en vivo</div>
                </div>
                
                <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 20px; overflow: hidden; overflow-x: auto;">
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
        
        todosLosJugadores.forEach((jugador, index) => {
            const posicion = index + 1;
            let bgColor = '';
            
            if (posicion === 1) {
                bgColor = 'rgba(255, 215, 0, 0.1)';
            } else if (posicion === 2) {
                bgColor = 'rgba(192, 192, 192, 0.1)';
            } else if (posicion === 3) {
                bgColor = 'rgba(205, 127, 50, 0.1)';
            }
            
            let nombreJugador = jugador.name || jugador.nombre || `Jugador ${jugador.id}`;
            // Limitar longitud para móvil
            if (nombreJugador.length > 25) {
                nombreJugador = nombreJugador.substring(0, 22) + '...';
            }
            const puntos = jugador.pts || 0;
            
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
                </div>
                
                <div style="margin-top: 12px; text-align: center; font-size: 9px; color: rgba(255,255,255,0.3);">
                    Total de participantes: ${todosLosJugadores.length} · Actualizado en tiempo real
                </div>
            </div>
        `;
        
        contenedor.innerHTML = html;
        
    } catch (error) {
        console.error('[Tabla] Error cargando datos:', error);
        contenedor.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff6b6b;">
                <div>⚠️ Error al cargar la tabla de posiciones</div>
                <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 20px; background: #007aff; border: none; border-radius: 10px; color: white; cursor: pointer;">Reintentar</button>
            </div>
        `;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
