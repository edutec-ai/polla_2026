// funciones/frontpage.js
// VERSIÓN COMPLETA CON HEADER REDISEÑADO Y RESPONSIVE
// ✅ Eliminada dependencia de cruces.js

import { inicializarMenu } from './menu.js';
import { renderizarLab, onSimuladorCambio } from './lab.js';
import { renderizarEspeciales, renderizarEspecialesConTab } from './especiales.js';
import { renderizarPartidos, setGlobalCambiarVistaCallback } from './partidos.js';
import { renderizarAdmin, getAdminConfig } from './admin.js';
import { renderizarPolla } from './polla.js';
import { renderizarTabla } from './tabla.js';
import { renderizarAhora, setCambiarVistaCallback as setAhoraCambiarVistaCallback, suscribirAhoraAlSimulador } from './ahora.js';
// import { renderizarReglas, setCambiarVistaCallback as setReglasCallback } from './reglas.js';
import { renderizarTV } from './tv.js';
// ❌ Eliminada importación de cruces.js
// import { renderizarCruces } from './cruces.js';
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

function urlWithTimestamp(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_=${Date.now()}`;
}

function cambiarVistaPrincipal(opcion, datosCuenta, tabEspecial = null, tabPartidos = null, scrollToId = null) {
    const contenidoContainer = document.getElementById('fp-body-contenido');
    if (!contenidoContainer) return;
    
    contenidoContainer.style.animation = 'fadeOutContent 0.2s ease-out forwards';
    setTimeout(() => {
        switch(opcion) {
            case 'ahora':
                renderizarAhora(contenidoContainer, datosCuenta);
                break;
            case 'partidos':
                renderizarPartidos(contenidoContainer, datosCuenta, tabPartidos || 'todos', scrollToId);
                break;
            case 'especiales':
                if (tabEspecial) {
                    renderizarEspecialesConTab(contenidoContainer, datosCuenta, tabEspecial);
                } else {
                    renderizarEspeciales(contenidoContainer, datosCuenta);
                }
                break;
            // ❌ Eliminado case 'cruces'
            // case 'cruces':
            //     renderizarCruces(contenidoContainer, datosCuenta);
            //     break;
            // case 'reglas':
            //     renderizarReglas(contenidoContainer, datosCuenta);
            //     break;
            case 'tabla':
                renderizarTabla(contenidoContainer, datosCuenta);
                break;
            case 'la-polla':
                renderizarPolla(contenidoContainer, datosCuenta);
                break;
            case 'lab':
                renderizarLab(contenidoContainer, datosCuenta);
                break;
            case 'admin':
                const esAdmin = datosCuenta.usr === 'super' || datosCuenta.name === 'super' || datosCuenta.nombre === 'super';
                if (esAdmin) renderizarAdmin(contenidoContainer, datosCuenta);
                break;
            case 'tv':
                renderizarTV(contenidoContainer, datosCuenta);
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
    const equiposUrl = urlWithTimestamp(`${BASE}/fifa_equ?api_key=${KEY}`);
    console.log('[Sync] Fetching equipos:', equiposUrl);
    const responseEquipos = await fetch(equiposUrl);
    if (!responseEquipos.ok) throw new Error('Error cargando equipos');
    const dataEquipos = await responseEquipos.json();
    const equiposCache = dataEquipos.fifa_equ || [];
    guardarEquiposCacheLocal(equiposCache);
    
    const partidosUrl = urlWithTimestamp(`${BASE}/fifa_jug_pro?api_key=${KEY}&filter[id]=${jugadorId}&fields=jug,jug.name,id,ptd,pro_gol_loc,pro_gol_vis,pro_res,pul&_=${timestamp}`);
    console.log('[Sync] Fetching partidos:', partidosUrl);
    const responsePartidos = await fetch(partidosUrl);
    if (!responsePartidos.ok) throw new Error('Error cargando partidos');
    const dataPartidos = await responsePartidos.json();
    
    const pronosticosPartidos = {};
    (dataPartidos.fifa_jug_pro || []).forEach(p => {
      pronosticosPartidos[p.ptd] = { 
        s1: p.pro_gol_loc || 0, 
        s2: p.pro_gol_vis || 0,
        res: p.pro_res || null,
        pul: p.pul || '0'
      };
    });
    guardarPronosticosPartidosLocal(pronosticosPartidos);
    console.log(`[Sync] ✅ Guardados ${Object.keys(pronosticosPartidos).length} pronósticos de partidos (con PULSO)`);
    
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
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:200px;">
        <div style="width:clamp(30px, 5vw, 50px);height:clamp(30px, 5vw, 50px);border:3px solid rgba(255,255,255,0.3);border-top-color:#f5c842;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <div style="margin-top:clamp(12px, 2vh, 20px);color:white;font-size:clamp(12px, 2vw, 16px);">Cargando tus pronósticos...</div>
        <div style="margin-top:clamp(6px, 1vh, 10px);color:rgba(255,255,255,0.5);font-size:clamp(10px, 1.5vw, 14px);">Sincronizando con Velneo</div>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }
  
  let puntosReales = 0;
  
  if (jugadorId) {
    try {
      await cargarDatosIniciales(jugadorId);
      console.log('[Frontpage] Datos cargados exitosamente, procediendo a renderizar');
      
      const puntosUrl = urlWithTimestamp(`${BASE}/fifa_jug?api_key=${KEY}&filter[id]=${jugadorId}`);
      const responsePuntos = await fetch(puntosUrl);
      if (responsePuntos.ok) {
        const dataPuntos = await responsePuntos.json();
        const jugadorActualizado = dataPuntos.fifa_jug?.[0];
        if (jugadorActualizado && jugadorActualizado.pts_par_fnl !== undefined) {
          puntosReales = jugadorActualizado.pts_par_fnl;
          console.log('[Frontpage] Puntos de finales (pts_par_fnl):', puntosReales);
        }
      }
    } catch (error) {
      console.error('[Frontpage] Error cargando datos:', error);
      if (contenidoContainer) {
        contenidoContainer.innerHTML = `
          <div style="text-align:center;padding:clamp(20px, 5vh, 40px);color:#ff6b6b;font-size:clamp(12px, 1.8vw, 16px);">
            <div style="font-size:clamp(30px, 5vw, 48px);">⚠️</div>
            <div style="margin-top:clamp(10px, 2vh, 16px);">Error al sincronizar con Velneo</div>
            <div style="margin-top:clamp(6px, 1vh, 10px);font-size:clamp(10px, 1.4vw, 14px);">Los datos mostrados podrían estar desactualizados</div>
          </div>
        `;
      }
    }
  }
  
  const adminConfig = getAdminConfig();
  
  onSimuladorCambio((fecha, hora) => console.log('📅 Simulador actualizado:', fecha, hora));
  
  globalCambiarVista = (opcion, cuenta, tabEspecial = null, tabPartidos = null, scrollToId = null) => 
    cambiarVistaPrincipal(opcion, cuenta, tabEspecial, tabPartidos, scrollToId);
  
  setAhoraCambiarVistaCallback(globalCambiarVista);
  // setReglasCallback(globalCambiarVista);
  setGlobalCambiarVistaCallback(globalCambiarVista);
  
  suscribirAhoraAlSimulador();
  
  const manejarSeleccionMenu = (opcion, cuenta) => {
    cambiarVistaPrincipal(opcion, cuenta);
  };
  
  const idCuenta = datosCuenta.id || '—';
  const nombreCuenta = datosCuenta.name || datosCuenta.nombre || 'Cuenta';
  const puntosCuenta = puntosReales || datosCuenta.ptr || datosCuenta.pun || 0;
  const usrAsociado = datosCuenta.usr || '—';
  const estadoCuenta = datosCuenta.off ? 'Inactiva' : 'Activa';
  
  const paletaColoresFijos = ["#ff9500", "#34c759", "#ff3b30", "#af52de", "#007aff"];
  let hashSuma = 0;
  for (let i = 0; i < nombreCuenta.length; i++) hashSuma += nombreCuenta.charCodeAt(i);
  const colorFinal = paletaColoresFijos[hashSuma % paletaColoresFijos.length];
  const inicial = nombreCuenta.charAt(0).toUpperCase();

  frontpageCard.style.cssText = `
    max-width:100%;
    width:calc(100vw - clamp(8px, 2vw, 20px));
    height:calc(100dvh - clamp(8px, 2vh, 20px));
    border-radius:clamp(16px, 2.5vh, 28px);
    background:rgba(255,255,255,0.08);
    backdrop-filter:blur(30px);
    -webkit-backdrop-filter:blur(30px);
    border:1px solid rgba(255,255,255,0.12);
    display:flex;
    flex-direction:column;
    padding:0;
    overflow:hidden;
    box-sizing:border-box;
  `;
  
  frontpageCard.innerHTML = `
    <style>
      .fp-header-premium { 
        display:flex; 
        align-items:center; 
        justify-content:space-between; 
        padding:clamp(8px, 1.5vh, 16px) clamp(12px, 2.5vw, 24px); 
        background:rgba(0,0,0,0.25); 
        border-bottom:2px solid ${colorFinal}; 
        flex-wrap:wrap; 
        gap:clamp(4px, 1vw, 12px); 
        flex-shrink:0;
        min-height:clamp(50px, 8vh, 70px);
      }
      
      .fp-header-left { 
        display:flex; 
        flex-direction:column;
        align-items:flex-start;
        gap:clamp(1px, 0.3vh, 4px);
        flex:1;
        min-width:0;
      }
      
      .fp-nombre-cuenta { 
        font-size:clamp(14px, 2.8vw, 24px); 
        font-weight:700; 
        color:#fff;
        line-height:1.2;
        word-break:break-word;
        max-width:100%;
      }
      
      .fp-puntos-cuenta {
        font-size:clamp(12px, 2.2vw, 18px);
        font-weight:700;
        color:#ffd60a;
        line-height:1.2;
      }
      
      .fp-linea-tres { 
        font-size:clamp(9px, 1.4vw, 14px); 
        color:rgba(255,255,255,0.5);
        line-height:1.2;
      }
      
      .fp-status-badge { 
        color:#34c759; 
      }
      
      .fp-id-cuenta { 
        font-size:clamp(9px, 1.4vw, 14px); 
        color:rgba(255,255,255,0.4);
        margin-left:clamp(2px, 0.5vw, 6px);
      }
      
      .fp-header-actions {
        display:flex;
        align-items:center;
        gap:clamp(6px, 1vw, 12px);
        flex-shrink:0;
      }
      
      .fp-btn-header { 
        padding:clamp(6px, 1vh, 10px) clamp(10px, 1.8vw, 18px); 
        background:rgba(255,255,255,0.08); 
        border:1px solid rgba(255,255,255,0.12); 
        border-radius:clamp(8px, 1.2vh, 14px); 
        color:#fff; 
        cursor:pointer;
        transition: all 0.2s ease;
        font-size:clamp(10px, 1.6vw, 15px);
        font-weight:500;
        white-space:nowrap;
        line-height:1.2;
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
        gap: clamp(6px, 1vw, 12px); 
        padding: clamp(6px, 1vw, 12px); 
        overflow: hidden;
        min-height: 0;
      }
      
      #fp-body-contenido {
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
      }
      
      @media (min-width: 769px) {
        .fp-body-zone-menu { 
          width: clamp(200px, 22vw, 280px);
          flex-shrink: 0;
          background: rgba(0,0,0,0.15); 
          padding: clamp(10px, 1.5vh, 20px) clamp(8px, 1.2vw, 14px); 
          border: 2px solid rgba(255,255,255,0.2); 
          border-radius: clamp(12px, 2vh, 20px); 
          overflow-y: auto; 
        }
        .fp-body-zone-contenido { 
          flex: 1;
          min-width: 0;
          min-height: 0;
          background: rgba(0,0,0,0.1); 
          padding: 0px; 
          border: 2px solid rgba(255,255,255,0.2); 
          border-radius: clamp(12px, 2vh, 20px); 
          overflow-y: auto;
          overflow-x: hidden;
        }
        .mobile-tab-bar {
          display: none !important;
        }
      }
      
      @media (max-width: 768px) {
        .fp-content-body { 
          flex-direction: column; 
          gap: clamp(4px, 0.8vw, 8px); 
          padding: clamp(4px, 0.8vw, 8px); 
        }
        .fp-body-zone-menu { 
          display: none !important;
        }
        .fp-body-zone-contenido { 
          flex: 1;
          min-width: 0;
          min-height: 0;
          height: 100%;
          background: rgba(0,0,0,0.1); 
          padding: 0px; 
          border: 2px solid rgba(255,255,255,0.2); 
          border-radius: clamp(10px, 1.8vh, 16px); 
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }
        
        .mobile-tab-bar {
          display: flex !important;
          flex-direction: row !important;
          justify-content: center;
          gap: clamp(2px, 0.4vw, 6px);
          background: transparent;
          padding: 0;
          margin: 0 0 clamp(4px, 0.6vh, 8px) 0;
          flex-shrink:0;
        }
        
        .mobile-tab-item {
          display: flex !important;
          flex-direction: column !important;
          justify-content: center;
          align-items: center;
          gap: clamp(1px, 0.2vh, 4px);
          background: rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);
          border-radius: clamp(10px, 1.8vh, 16px);
          padding: clamp(6px, 1vh, 10px) clamp(4px, 0.8vw, 8px);
          flex: 1;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 0;
        }
        
        .mobile-tab-item.active {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .mobile-tab-icono {
          font-size: clamp(16px, 3.5vw, 28px);
          line-height:1;
        }
        
        .mobile-tab-label {
          font-size: clamp(7px, 1.4vw, 11px);
          font-weight: 600;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          line-height:1.1;
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
        overflow: hidden !important;
        height: 100% !important;
        min-height: 100% !important;
        max-height: 100% !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0;
        padding: 0;
      }
      
      #app-root {
        height: 100dvh !important;
        width: 100vw !important;
        max-height: 100dvh !important;
        max-width: 100vw !important;
        overflow: hidden !important;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
    
    <header class="fp-header-premium">
      <div class="fp-header-left">
        <div class="fp-nombre-wrapper" style="display:flex;align-items:center;flex-wrap:wrap;gap:clamp(2px,0.4vw,6px);">
          <span class="fp-nombre-cuenta">${nombreCuenta}</span>
          ${adminConfig.mostrarIdCuenta && esAdmin ? `<span class="fp-id-cuenta">#${idCuenta}</span>` : ''}
        </div>
        <div class="fp-puntos-cuenta">🏆 ${puntosCuenta} pts</div>
        ${adminConfig.mostrarIdVelneo && esAdmin ? `<div class="fp-linea-tres">Usuario: ${usrAsociado} · ${adminConfig.mostrarEstado && esAdmin ? `<span class="fp-status-badge">${estadoCuenta}</span>` : ''}</div>` : ''}
        ${!adminConfig.mostrarIdVelneo && adminConfig.mostrarEstado && esAdmin ? `<div class="fp-linea-tres"><span class="fp-status-badge">${estadoCuenta}</span></div>` : ''}
      </div>
      <div class="fp-header-actions">
        ${esAdmin ? `<button class="fp-btn-header" id="btnAdminFrontpage">🔧</button>` : ''}
        <button class="fp-btn-header" id="btnRegresarFrontpage">↩️</button>
      </div>
    </header>
    
    <div class="mobile-tab-bar" id="mobile-tab-bar"></div>
    
    <div class="fp-content-body">
      <nav class="fp-body-zone-menu" id="fp-body-menu"></nav>
      <main class="fp-body-zone-contenido" id="fp-body-contenido"></main>
    </div>
  `;

  // ✅ OPCIONES DEL MENÚ - CRUCES ELIMINADO
  const opcionesMenu = [
    { id: 'ahora', nombre: 'AHORA', color: '#34c759', icono: '🏠' },
    { id: 'partidos', nombre: 'PARTIDOS', color: '#007aff', icono: '⚽' },
    { id: 'especiales', nombre: 'ESPECIALES', color: '#af52de', icono: '⭐' },
    // ❌ CRUCES eliminado - no existe el archivo
    // { id: 'cruces', nombre: 'CRUCES', color: '#f5c842', icono: '🏆' },
    // { id: 'reglas', nombre: 'REGLAS', color: '#5856d6', icono: '📖' },
    { id: 'tabla', nombre: 'TABLA', color: '#ff9500', icono: '📊' },
    { id: 'tv', nombre: 'TV', color: '#e74c3c', icono: '📺' }
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
    // ✅ OPCIONES MÓVIL - CRUCES ELIMINADO
    const opcionesMovil = [
      { id: 'ahora', icono: '🏠', label: 'AHORA' },
      { id: 'partidos', icono: '⚽', label: 'PARTIDOS' },
      { id: 'especiales', icono: '⭐', label: 'ESPECIALES' },
      // ❌ CRUCES eliminado
      // { id: 'cruces', icono: '🏆', label: 'CRUCES' },
      // { id: 'reglas', icono: '📖', label: 'REGLAS' },
      { id: 'tabla', icono: '📊', label: 'TABLA' }
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
