// funciones/tv.js
// Módulo de TV - Transmisión en vivo (solo visible en Desktop)
// Muestra un iframe con contenido de fútbol en vivo
// AUTO AJUSTABLE al contenedor

export async function renderizarTV(contenedor, datosCuenta) {
    if (!contenedor) return;
    
    contenedor.innerHTML = `
        <style>
            .tv-container {
                width: 100%;
                height: 100%;
                background: #000;
                border-radius: 16px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            .tv-header {
                background: linear-gradient(135deg, #0a2f1f 0%, #1a5a3a 100%);
                padding: 10px 16px;
                text-align: center;
                color: white;
                flex-shrink: 0;
            }
            .tv-header h4 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
            }
            .tv-header p {
                margin: 2px 0 0;
                font-size: 10px;
                opacity: 0.7;
            }
            .tv-iframe-wrapper {
                flex: 1;
                position: relative;
                background: #000;
                min-height: 0;
            }
            .tv-iframe {
                width: 100%;
                height: 100%;
                border: none;
                display: block;
            }
            .tv-footer {
                background: rgba(0,0,0,0.6);
                padding: 6px;
                text-align: center;
                font-size: 9px;
                color: rgba(255,255,255,0.4);
                flex-shrink: 0;
            }
        </style>
        
        <div class="tv-container">
            <div class="tv-header">
                <h4>📺 TRANSMISIÓN EN VIVO</h4>
                <p>DSports</p>
            </div>
            <div class="tv-iframe-wrapper">
                <iframe 
                    class="tv-iframe"
                    src="https://tvtvhd.com/vivo/canal.php?stream=dsports"
                    title="DSports En Vivo"
                    allow="autoplay; fullscreen; encrypted-media"
                    referrerpolicy="strict-origin-when-cross-origin"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                    loading="eager">
                </iframe>
            </div>
            <div class="tv-footer">
                ⚽ Transmisión en vivo
            </div>
        </div>
    `;
}