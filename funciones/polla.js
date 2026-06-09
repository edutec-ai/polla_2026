// funciones/polla.js
// Módulo de La Polla - Resumen de puntuación del usuario

import { renderizarPuntosPartidosFG } from './puntosPartidosFG.js';

let currentJugador = null;
let puntosFGCallback = null;

export function setPuntosFGCallback(callback) {
    puntosFGCallback = callback;
}

export async function renderizarPolla(contenedor, datosCuenta) {
    if (!contenedor) return;
    
    currentJugador = datosCuenta;
    
    contenedor.innerHTML = `
        <div style="width:100%; background: #ffffff; border-radius: 20px; padding: 20px;">
            <style>
                .polla-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                    border-bottom: 2px solid #e5e5ea;
                    flex-wrap: wrap;
                    gap: 12px;
                }
                .polla-titulo {
                    font-size: 20px;
                    font-weight: 700;
                    color: #1c1c1e;
                }
                .polla-subtitulo {
                    font-size: 13px;
                    color: #8e8e93;
                    margin-top: 4px;
                }
                .polla-badge {
                    background: #ff9500;
                    color: white;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 600;
                }
                .polla-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .polla-card {
                    background: #f9f9fb;
                    border: 1px solid #e5e5ea;
                    border-radius: 20px;
                    overflow: hidden;
                    transition: all 0.2s ease;
                }
                .polla-card-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                    background: rgba(0, 0, 0, 0.02);
                    border-bottom: 1px solid #e5e5ea;
                    cursor: pointer;
                }
                .polla-card-icono {
                    font-size: 28px;
                }
                .polla-card-titulo {
                    flex: 1;
                    font-size: 16px;
                    font-weight: 700;
                    color: #1c1c1e;
                }
                .polla-card-estado {
                    font-size: 12px;
                    color: #8e8e93;
                }
                .polla-card-estado.activo {
                    color: #34c759;
                }
                .polla-card-flecha {
                    font-size: 16px;
                    color: #8e8e93;
                    transition: transform 0.2s;
                }
                .polla-card-contenido {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.3s ease-out;
                }
                .polla-card-contenido.abierto {
                    max-height: 800px;
                    overflow-y: auto;
                    transition: max-height 0.3s ease-in;
                }
                .polla-card-contenido-inner {
                    padding: 16px;
                }
                .polla-placeholder {
                    text-align: center;
                    padding: 40px;
                    color: #8e8e93;
                }
                .polla-placeholder-icono {
                    font-size: 48px;
                    margin-bottom: 12px;
                    opacity: 0.5;
                }
                .polla-placeholder-texto {
                    font-size: 14px;
                }
            </style>
            
            <div class="polla-header">
                <div>
                    <div class="polla-titulo">🏆 La Polla</div>
                    <div class="polla-subtitulo">Resumen de tus pronósticos y puntuación</div>
                </div>
                <div class="polla-badge">${datosCuenta.ptr || datosCuenta.pun || 0} pts totales</div>
            </div>
            
            <div class="polla-cards" id="polla-cards">
                <!-- Card 1: Partidos Fase de Grupos -->
                <div class="polla-card" data-card="fg">
                    <div class="polla-card-header">
                        <div class="polla-card-icono">⚽</div>
                        <div class="polla-card-titulo">Partidos - Fase de Grupos</div>
                        <div class="polla-card-estado" id="card-fg-estado">Cargando...</div>
                        <div class="polla-card-flecha">▼</div>
                    </div>
                    <div class="polla-card-contenido" id="card-fg-contenido">
                        <div class="polla-card-contenido-inner">
                            <div class="polla-placeholder">
                                <div class="polla-placeholder-icono">⟳</div>
                                <div class="polla-placeholder-texto">Cargando puntos de fase de grupos...</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Card 2: Partidos Finales (Próximamente) -->
                <div class="polla-card" data-card="finales">
                    <div class="polla-card-header">
                        <div class="polla-card-icono">🏆</div>
                        <div class="polla-card-titulo">Partidos - Fase Final</div>
                        <div class="polla-card-estado">🔜 Próximamente</div>
                        <div class="polla-card-flecha">▼</div>
                    </div>
                    <div class="polla-card-contenido" id="card-finales-contenido">
                        <div class="polla-card-contenido-inner">
                            <div class="polla-placeholder">
                                <div class="polla-placeholder-icono">🔜</div>
                                <div class="polla-placeholder-texto">Los puntos de la fase final se habilitarán cuando comience la eliminación directa (28 de junio)</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Card 3: Categorías Especiales (Próximamente) -->
                <div class="polla-card" data-card="especiales">
                    <div class="polla-card-header">
                        <div class="polla-card-icono">⭐</div>
                        <div class="polla-card-titulo">Categorías Especiales</div>
                        <div class="polla-card-estado">🔜 Próximamente</div>
                        <div class="polla-card-flecha">▼</div>
                    </div>
                    <div class="polla-card-contenido" id="card-especiales-contenido">
                        <div class="polla-card-contenido-inner">
                            <div class="polla-placeholder">
                                <div class="polla-placeholder-icono">🔜</div>
                                <div class="polla-placeholder-texto">Clasificados por grupo y finalistas. Los puntos se calcularán automáticamente al final del torneo.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Configurar eventos de colapso/expansión
    const cards = document.querySelectorAll('.polla-card');
    cards.forEach(card => {
        const header = card.querySelector('.polla-card-header');
        const contenido = card.querySelector('.polla-card-contenido');
        const flecha = card.querySelector('.polla-card-flecha');
        
        header.addEventListener('click', () => {
            const estaAbierto = contenido.classList.contains('abierto');
            
            document.querySelectorAll('.polla-card-contenido').forEach(c => {
                c.classList.remove('abierto');
            });
            document.querySelectorAll('.polla-card-flecha').forEach(f => {
                f.style.transform = 'rotate(0deg)';
            });
            
            if (!estaAbierto) {
                contenido.classList.add('abierto');
                flecha.style.transform = 'rotate(180deg)';
            }
        });
    });
    
    // Renderizar puntos de fase de grupos
    const fgContainer = document.getElementById('card-fg-contenido');
    if (fgContainer) {
        const innerDiv = fgContainer.querySelector('.polla-card-contenido-inner');
        if (innerDiv) {
            await renderizarPuntosPartidosFG(innerDiv, datosCuenta);
            const estadoSpan = document.getElementById('card-fg-estado');
            if (estadoSpan) {
                estadoSpan.textContent = '✅ Disponible';
                estadoSpan.style.color = '#34c759';
            }
        }
    }
}