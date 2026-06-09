// funciones/frontpage.js
// VERSIÓN CORREGIDA - CON TIMESTAMP ANTI-CACHE EN TODOS LOS GET

import { inicializarMenu } from './menu.js';
import { renderizarLab, onSimuladorCambio } from './lab.js';
import { renderizarEspeciales, renderizarEspecialesConTab } from './especiales.js';
import { renderizarPartidos } from './partidos.js';
import { renderizarAdmin, getAdminConfig } from './admin.js';
import { renderizarPolla } from './polla.js';
import { renderizarSimulador } from './simulador.js';
import { renderizarAhora, setCambiarVistaCallback, suscribirAhoraAlSimulador } from './ahora.js';
import { renderizarReglas, setCambiarVistaCallback as setReglasCallback } from './reglas.js';
import { 
  guardarPronosticosPartidosLocal, 
  guardarPronosticosEspecialesLocal,
  guardarJugadorIdLocal,
  actualizarTimestampSincronizacion,
  guardarUltimaSincronizacionCompleta,
  guardarEquiposCacheLocal
} from './sync.js';

const BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

let globalCambiarVista = null;

// Función helper para agregar timestamp anti-cache a URLs GET
function urlWithTimestamp(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_=${Date.now()}`;
}

function cambiarVistaPrincipal(opcion, datosCuenta, tabEspecial = null) {
    const contenidoContainer = document.getElementById('fp-body-contenido');
    if (!contenidoContainer) return;
    
    contenidoContainer.style.animation = 'fadeOutContent 0.2s ease-out forwards';
    setTimeout(() => {
        switch(opcion) {
            case 'ahora':
                renderizarAhora(contenidoContainer, datosCuenta);
                break;
            case 'partidos':
                renderizarPartidos(contenidoContainer, datosCuenta);
                break;
            case 'especiales':
                if (tabEspecial) {
                    renderizarEspecialesConTab(contenidoContainer, datosCuenta, tabEspecial);
                } else {
                    renderizarEspeciales(contenidoContainer, datosCuenta);
                }
                break;
            case 'reglas':
                renderizarReglas(contenidoContainer, datosCuenta);
                break;
            case 'tabla':
                contenidoContainer.innerHTML = `<div style="text-align:center;color:white;padding:40px;"><h3>📊 Tabla de Posiciones</h3><p>Próximamente...</p></div>`;
                break;
            case 'la-polla':
                renderizarPolla(contenidoContainer, datosCuenta);
                break;
            case 'simulador':
                renderizarSimulador(contenidoContainer, datosCuenta);
                break;
            case 'lab':
                renderizarLab(contenidoContainer, datosCuenta);
                break;
            case 'admin':
                const esAdmin = datosCuenta.usr === 'super' || datosCuenta.name === 'super' || datosCuenta.nombre === 'super';
                if (esAdmin) renderizarAdmin(contenidoContainer, datosCuenta);
                break;
            default:
                renderizarAhora(contenidoContainer, datosCuenta);
        }
        contenidoContainer.style.animation = 'fadeInContent 0.3s ease-out forwards';
    }, 200);
}

async function cargarDatosIniciales(jugadorId) {
  console.log('[Sync] Cargando datos iniciales desde API para jugador:', jugadorId);
  
  try {
    // 1. Cargar equipos (con timestamp anti-cache)
    const equiposUrl = urlWithTimestamp(`${BASE}/fifa_equ?api_key=${KEY}`);
    console.log('[Sync] Fetching equipos:', equiposUrl);
    const responseEquipos = await fetch(equiposUrl);
    if (!responseEquipos.ok) throw new Error('Error cargando equipos');
    const dataEquipos = await responseEquipos.json();
    const equiposCache = dataEquipos.fifa_equ || [];
    guardarEquiposCacheLocal(equiposCache);
    
    // 2. PARTIDOS - 104 pronósticos (con timestamp anti-cache)
    const partidosUrl = urlWithTimestamp(`${BASE_V2}/fifa_jug_pro?api_key=${KEY}&filter[id]=${jugadorId}&fields=jug,jug.name,id,ptd,pro_gol_loc,pro_gol_vis,pro_res&filterQuery[ptd.cic]=1`);
    console.log('[Sync] Fetching partidos:', partidosUrl);
    const responsePartidos = await fetch(partidosUrl);
    if (!responsePartidos.ok) throw new Error('Error cargando partidos');
    const dataPartidos = await responsePartidos.json();
    
    const pronosticosPartidos = {};
    (dataPartidos.fifa_jug_pro || []).forEach(p => {
      pronosticosPartidos[p.ptd] = { 
        s1: p.pro_gol_loc || 0, 
        s2: p.pro_gol_vis || 0,
        res: p.pro_res || null
      };
    });
    guardarPronosticosPartidosLocal(pronosticosPartidos);
    console.log(`[Sync] ✅ Guardados ${Object.keys(pronosticosPartidos).length} pronósticos de partidos`);
    
    // 3. CLASIFICADOS POR GRUPO + FINALISTAS (con timestamp anti-cache)
    const especialesUrl = urlWithTimestamp(`${BASE}/fifa_jug?api_key=${KEY}&filter[id]=${jugadorId}`);
    console.log('[Sync] Fetching especiales:', especialesUrl);
    const responseEspeciales = await fetch(especialesUrl);
    if (!responseEspeciales.ok) throw new Error('Error cargando especiales');
    const dataEspeciales = await responseEspeciales.json();
    const jugador = dataEspeciales.fifa_jug?.[0];
    
    if (jugador) {
      const gruposData = {};
      const finalistasData = {
        campeon: null,
        subcampeon: null,
        tercero: null,
        cuarto: null
      };
      
      const gruposLista = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
      
      gruposLista.forEach(grupo => {
        const clf1Id = jugador[`grp_${grupo.toLowerCase()}_clf1`];
        const clf2Id = jugador[`grp_${grupo.toLowerCase()}_clf2`];
        
        if (clf1Id && clf1Id !== 0) {
          const equipo = equiposCache.find(e => e.id === clf1Id);
          if (equipo) {
            if (!gruposData[grupo]) gruposData[grupo] = {};
            gruposData[grupo][1] = equipo.name;
          }
        }
        if (clf2Id && clf2Id !== 0) {
          const equipo = equiposCache.find(e => e.id === clf2Id);
          if (equipo) {
            if (!gruposData[grupo]) gruposData[grupo] = {};
            gruposData[grupo][2] = equipo.name;
          }
        }
      });
      
      if (jugador.cam && jugador.cam !== 0) {
        const equipo = equiposCache.find(e => e.id === jugador.cam);
        if (equipo) finalistasData.campeon = equipo.name;
      }
      if (jugador.sub && jugador.sub !== 0) {
        const equipo = equiposCache.find(e => e.id === jugador.sub);
        if (equipo) finalistasData.subcampeon = equipo.name;
      }
      if (jugador.ter && jugador.ter !== 0) {
        const equipo = equiposCache.find(e => e.id === jugador.ter);
        if (equipo) finalistasData.tercero = equipo.name;
      }
      if (jugador.cua && jugador.cua !== 0) {
        const equipo = equiposCache.find(e => e.id === jugador.cua);
        if (equipo) finalistasData.cuarto = equipo.name;
      }
      
      guardarPronosticosEspecialesLocal({ grupos: gruposData, finalistas: finalistasData });
      console.log('[Sync] ✅ Guardados pronósticos de especiales (grupos y finalistas)');
      console.log('   Finalistas:', finalistasData);
    }
    
    guardarJugadorIdLocal(jugadorId);
    actualizarTimestampSincronizacion();
    guardarUltimaSincronizacionCompleta();
    
    console.log('[Sync] ✅ Sincronización inicial COMPLETADA exitosamente');
    
  } catch (error) {
    console.error('[Sync] ❌ Error cargando datos iniciales:', error);
    throw error;
  }
}

export async function cargarFrontpage(datosCuenta) {
  const frontpageCard = document.getElementById('frontpageForm');
  if (!frontpageCard) return;
  
  const esAdmin = datosCuenta.usr === 'super' || datosCuenta.name === 'super' || datosCuenta.nombre === 'super';
  const jugadorId = datosCuenta.id || datosCuenta.ID;
  
  const contenidoContainer = document.getElementById('fp-body-contenido');
  if (contenidoContainer) {
    contenidoContainer.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:300px;">
        <div style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <div style="margin-top:16px;color:white;font-size:14px;">Cargando tus pronósticos...</div>
        <div style="margin-top:8px;color:rgba(255,255,255,0.5);font-size:11px;">Sincronizando con Velneo</div>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }
  
  if (jugadorId) {
    try {
      await cargarDatosIniciales(jugadorId);
      console.log('[Frontpage] Datos cargados exitosamente, procediendo a renderizar');
    } catch (error) {
      console.error('[Frontpage] Error cargando datos:', error);
      if (contenidoContainer) {
        contenidoContainer.innerHTML = `
          <div style="text-align:center;padding:40px;color:#ff6b6b;">
            <div>⚠️</div>
            <div style="margin-top:12px;">Error al sincronizar con Velneo</div>
            <div style="margin-top:8px;font-size:12px;">Los datos mostrados podrían estar desactualizados</div>
          </div>
        `;
      }
    }
  }
  
  const adminConfig = getAdminConfig();
  
  onSimuladorCambio((fecha, hora) => console.log('📅 Simulador actualizado:', fecha, hora));
  
  globalCambiarVista = (opcion, cuenta, tabEspecial = null) => cambiarVistaPrincipal(opcion, cuenta, tabEspecial);
  
  setCambiarVistaCallback(globalCambiarVista);
  setReglasCallback(globalCambiarVista);
  
  suscribirAhoraAlSimulador();
  
  const manejarSeleccionMenu = (opcion, cuenta) => {
    cambiarVistaPrincipal(opcion, cuenta);
  };
  
  const idCuenta = datosCuenta.id || '—';
  const nombreCuenta = datosCuenta.name || datosCuenta.nombre || 'Cuenta';
  const puntosCuenta = datosCuenta.ptr || datosCuenta.pun || 0;
  const usrAsociado = datosCuenta.usr || '—';
  const estadoCuenta = datosCuenta.off ? 'Inactiva' : 'Activa';
  
  const paletaColoresFijos = ["#ff9500", "#34c759", "#ff3b30", "#af52de", "#007aff"];
  let hashSuma = 0;
  for (let i = 0; i < nombreCuenta.length; i++) hashSuma += nombreCuenta.charCodeAt(i);
  const colorFinal = paletaColoresFijos[hashSuma % paletaColoresFijos.length];
  const inicial = nombreCuenta.charAt(0).toUpperCase();

  frontpageCard.style.cssText = 'max-width:100%;width:calc(100vw - 32px);height:calc(100dvh - 32px);border-radius:20px;background:rgba(255,255,255,0.12);backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,0.18);display:flex;flex-direction:column;padding:0;overflow:visible;';
  
  frontpageCard.innerHTML = `
    <style>
      .fp-header-premium { 
        display:flex; 
        align-items:center; 
        justify-content:space-between; 
        padding:14px 24px; 
        background:rgba(0,0,0,0.25); 
        border-bottom:2px solid ${colorFinal}; 
        flex-wrap:wrap; 
        gap:12px; 
      }
      .fp-header-left { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
      .fp-avatar-emblema { 
        width:40px; 
        height:40px; 
        border-radius:50%; 
        background:${colorFinal}; 
        display:flex; 
        align-items:center; 
        justify-content:center; 
        color:white; 
        font-weight:700; 
        font-size:1.1rem; 
      }
      .fp-nombre-cuenta { font-size:1.1rem; font-weight:700; color:#fff; }
      .fp-id-cuenta { font-size:0.75rem; color:rgba(255,255,255,0.4); margin-left:6px; }
      .fp-linea-dos { font-size:0.85rem; color:${colorFinal}; font-weight:700; }
      .fp-linea-tres { font-size:0.8rem; color:rgba(255,255,255,0.5); }
      .fp-status-badge { color:#34c759; }
      
      .fp-header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .fp-btn-header { 
        padding:8px 16px; 
        background:rgba(255,255,255,0.08); 
        border:1px solid rgba(255,255,255,0.12); 
        border-radius:10px; 
        color:#fff; 
        cursor:pointer;
        transition: all 0.2s ease;
        font-size: 14px;
        font-weight: 500;
      }
      .fp-btn-header:hover { 
        background:rgba(255,255,255,0.15); 
        transform:scale(1.02); 
      }
      .fp-btn-header:active {
        transform: scale(0.98);
      }
      
      .fp-content-body { 
        flex: 1; 
        display: flex; 
        gap: 12px; 
        padding: 12px; 
        overflow: hidden;
        min-height: 0;
      }
      
      @media (min-width: 769px) {
        .fp-body-zone-menu { 
          width: 280px;
          flex-shrink: 0;
          background: rgba(0,0,0,0.15); 
          padding: 20px 14px; 
          border: 2px solid #fff; 
          border-radius: 20px; 
          overflow-y: auto; 
        }
        .fp-body-zone-contenido { 
          flex: 1;
          min-width: 0;
          min-height: 0;
          background: rgba(0,0,0,0.1); 
          padding: 0px; 
          border: 2px solid #fff; 
          border-radius: 20px; 
          overflow-y: hidden;
          overflow-x: hidden;
        }
        .mobile-tab-bar {
          display: none !important;
        }
      }
      
      @media (max-width: 768px) {
        .fp-content-body { 
          flex-direction: column; 
          gap: 8px; 
          padding: 8px; 
        }
        .fp-body-zone-menu { 
          display: none !important;
        }
        .fp-body-zone-contenido { 
          flex: 1;
          min-width: 0;
          min-height: 0;
          background: rgba(0,0,0,0.1); 
          padding: 0px; 
          border: 2px solid #fff; 
          border-radius: 20px; 
          overflow-y: hidden;
          overflow-x: hidden;
        }
        
        .mobile-tab-bar {
          display: flex !important;
          flex-direction: row !important;
          justify-content: center;
          gap: 8px;
          background: transparent;
          padding: 0;
          margin: 0 0 16px 0;
        }
        
        .mobile-tab-item {
          display: flex !important;
          flex-direction: column !important;
          justify-content: center;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 10px 8px;
          flex: 1;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .mobile-tab-item.active {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .mobile-tab-icono {
          font-size: 22px;
        }
        
        .mobile-tab-label {
          font-size: 10px;
          font-weight: 600;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
      }
      
      .fp-body-zone-contenido > div { 
        width: 100%; 
        height: 100%;
      }
      
      @keyframes fadeOutContent { 
        from { opacity: 1; } 
        to { opacity: 0; transform: scale(0.98); } 
      }
      @keyframes fadeInContent { 
        from { opacity: 0; transform: scale(0.98); } 
        to { opacity: 1; transform: scale(1); } 
      }

      .esp-dropdown-menu {
        position: absolute;
        z-index: 9999 !important;
        background: white;
        border: 1px solid #e5e5ea;
        border-radius: 12px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        min-width: 200px;
      }
      body, html {
        overflow: visible !important;
        height: auto !important;
        min-height: 100% !important;
      }
    </style>
    
    <header class="fp-header-premium">
      <div class="fp-header-left">
        <div class="fp-avatar-emblema">${inicial}</div>
        <div>
          <div class="fp-nombre-wrapper">
            <span class="fp-nombre-cuenta">${nombreCuenta}</span>
            ${adminConfig.mostrarIdCuenta && esAdmin ? `<span class="fp-id-cuenta">#${idCuenta}</span>` : ''}
          </div>
          <div class="fp-linea-dos">${puntosCuenta} pts</div>
          <div class="fp-linea-tres">
            ${adminConfig.mostrarIdVelneo && esAdmin ? `Usuario: ${usrAsociado} · ` : ''}
            ${adminConfig.mostrarEstado && esAdmin ? `<span class="fp-status-badge">${estadoCuenta}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="fp-header-actions">
        ${esAdmin ? `<button class="fp-btn-header" id="btnAdminFrontpage">🔧 Admin</button>` : ''}
        <button class="fp-btn-header" id="btnRegresarFrontpage">Regresar</button>
      </div>
    </header>
    
    <div class="mobile-tab-bar" id="mobile-tab-bar"></div>
    
    <div class="fp-content-body">
      <nav class="fp-body-zone-menu" id="fp-body-menu"></nav>
      <main class="fp-body-zone-contenido" id="fp-body-contenido"></main>
    </div>
  `;

  const opcionesMenu = [
    { id: 'ahora', nombre: 'AHORA', color: '#34c759', icono: '🏠' },
    { id: 'partidos', nombre: 'PARTIDOS', color: '#007aff', icono: '⚽' },
    { id: 'especiales', nombre: 'ESPECIALES', color: '#af52de', icono: '⭐' },
    { id: 'simulador', nombre: 'SIMULADOR', color: '#ff3b30', icono: '💻' },
    { id: 'reglas', nombre: 'REGLAS', color: '#5856d6', icono: '📖' }
  ];
  
  inicializarMenu(datosCuenta, manejarSeleccionMenu, opcionesMenu);
  
  if (esAdmin) {
    const btnAdmin = document.getElementById('btnAdminFrontpage');
    if (btnAdmin) {
      btnAdmin.onclick = () => {
        manejarSeleccionMenu('admin', datosCuenta);
      };
    }
  }
  
  document.getElementById('btnRegresarFrontpage').onclick = () => {
    const cuentasCard = document.getElementById('cuentasForm');
    frontpageCard.classList.add('login-retirado');
    setTimeout(() => {
      frontpageCard.classList.remove('login-activo', 'login-retirado');
      frontpageCard.style = '';
      frontpageCard.innerHTML = `<img src="./img/logoMundial.png" class="logo-login-card"><h2 id="fp-titulo-cuenta">Cuenta</h2><div class="title-sub">Detalles de Sincronización</div><table class="tabla-apple"><tbody id="fp-tabla-datos"></tbody>表<button class="btn-regresar" id="btnRegresarFrontpage">Regresar</button>`;
      if (cuentasCard) cuentasCard.classList.add('login-activo');
    }, 400);
  };
  
  const mobileTabBar = document.getElementById('mobile-tab-bar');
  if (mobileTabBar) {
    const opcionesMovil = [
      { id: 'ahora', icono: '🏠', label: 'AHORA' },
      { id: 'partidos', icono: '⚽', label: 'PARTIDOS' },
      { id: 'especiales', icono: '⭐', label: 'ESPECIALES' },
      { id: 'simulador', icono: '💻', label: 'SIMULADOR' },
      { id: 'reglas', icono: '📖', label: 'REGLAS' }
    ];
    
    mobileTabBar.innerHTML = opcionesMovil.map(op => `
      <div class="mobile-tab-item" data-opcion="${op.id}">
        <div class="mobile-tab-icono">${op.icono}</div>
        <div class="mobile-tab-label">${op.label}</div>
      </div>
    `).join('');
    
    document.querySelectorAll('.mobile-tab-item').forEach(tab => {
      tab.addEventListener('click', () => {
        const opcion = tab.dataset.opcion;
        document.querySelectorAll('.mobile-tab-item').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        manejarSeleccionMenu(opcion, datosCuenta);
      });
    });
  }
  
  setTimeout(() => {
    renderizarAhora(document.getElementById('fp-body-contenido'), datosCuenta);
  }, 100);
  
  window.addEventListener('admin-config-changed', (e) => {
    if (esAdmin) {
      window.location.reload();
    }
  });
}