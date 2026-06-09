// funciones/admin.js
// Panel de administración - solo visible para usuario 'super'
// Controla qué elementos se muestran en la interfaz
// Las configuraciones se guardan en localStorage

// Clave para localStorage
const ADMIN_CONFIG_KEY = 'polla_admin_config';

// Configuración por defecto - ESPECIALES habilitado, el resto deshabilitado
const DEFAULT_CONFIG = {
  mostrarIdCuenta: false,
  mostrarIdVelneo: false,
  mostrarEstado: false,
  habilitarPartidos: false,
  habilitarEspeciales: true,
  habilitarTabla: false,
  habilitarLaPolla: false,
  habilitarLab: false
};

// Leer configuración desde localStorage
export function getAdminConfig() {
  const guardado = localStorage.getItem(ADMIN_CONFIG_KEY);
  if (guardado) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(guardado) };
    } catch(e) {
      console.error('Error parsing admin config:', e);
      return { ...DEFAULT_CONFIG };
    }
  }
  return { ...DEFAULT_CONFIG };
}

// Guardar configuración en localStorage
export function saveAdminConfig(config) {
  localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config));
  // Disparar evento para que otros componentes se actualicen
  window.dispatchEvent(new CustomEvent('admin-config-changed', { detail: config }));
}

// Actualizar una clave específica
export function updateAdminConfig(key, value) {
  const config = getAdminConfig();
  config[key] = value;
  saveAdminConfig(config);
  return config;
}

// Renderizar panel de administración
export function renderizarAdmin(contenedor, datosCuenta) {
  if (!contenedor) return;
  
  // Verificar que realmente sea admin
  const esAdmin = datosCuenta.usr === 'super' || datosCuenta.name === 'super' || datosCuenta.nombre === 'super';
  
  if (!esAdmin) {
    contenedor.innerHTML = `<div style="padding: 40px; text-align: center; color: red;">
      <h3>⛔ Acceso Denegado</h3>
      <p>No tienes permisos para acceder a esta sección.</p>
    </div>`;
    return;
  }
  
  const config = getAdminConfig();
  
  contenedor.innerHTML = `
    <div style="width:100%; background: #ffffff; border-radius: 20px; padding: 20px;">
      <style>
        .admin-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e5e5ea;
          flex-wrap: wrap;
          gap: 12px;
        }
        .admin-header h2 {
          font-size: 24px;
          font-weight: 700;
          color: #1c1c1e;
          margin: 0;
        }
        .admin-badge {
          background: #007aff;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .admin-section {
          margin-bottom: 24px;
        }
        .admin-section-title {
          font-size: 18px;
          font-weight: 700;
          color: #1c1c1e;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e5ea;
        }
        .admin-card {
          background: #f9f9fb;
          border: 1px solid #e5e5ea;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .toggle-row:last-child {
          border-bottom: none;
        }
        .toggle-label {
          font-size: 15px;
          font-weight: 500;
          color: #1c1c1e;
        }
        .toggle-desc {
          font-size: 11px;
          color: #8e8e93;
          margin-top: 2px;
        }
        
        /* Switch estilo Apple (reutilizado de login.js) */
        .switch-apple {
          position: relative;
          display: inline-block;
          width: 51px;
          height: 31px;
          flex-shrink: 0;
        }
        .switch-apple input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider-apple {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #e5e5ea;
          transition: 0.3s;
          border-radius: 31px;
        }
        .slider-apple:before {
          position: absolute;
          content: "";
          height: 27px;
          width: 27px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        input:checked + .slider-apple {
          background-color: #34c759;
        }
        input:checked + .slider-apple:before {
          transform: translateX(20px);
        }
        
        .admin-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e5e5ea;
        }
        .admin-btn {
          flex: 1;
          padding: 12px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }
        .admin-btn-primary {
          background: #007aff;
          color: white;
          border: none;
        }
        .admin-btn-secondary {
          background: #f2f2f7;
          color: #007aff;
          border: none;
        }
        .admin-btn-danger {
          background: #fff2f2;
          color: #ff3b30;
          border: none;
        }
        .admin-btn-primary:active { transform: scale(0.98); }
        .admin-btn-secondary:active { transform: scale(0.98); }
        .admin-btn-danger:active { transform: scale(0.98); }
        
        .toast-message {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 10px 20px;
          border-radius: 30px;
          font-size: 13px;
          z-index: 2000;
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }
        .toast-message.show {
          opacity: 1;
        }
      </style>
      
      <div class="admin-header">
        <h2>🔧 Panel de Administración</h2>
        <div class="admin-badge">Super User: ${datosCuenta.name || datosCuenta.nombre || 'super'}</div>
      </div>
      
      <!-- SECCIÓN: HEADER (elementos visibles en la cabecera) -->
      <div class="admin-section">
        <div class="admin-section-title">📌 Cabecera (Header)</div>
        <div class="admin-card">
          <div class="toggle-row">
            <div>
              <div class="toggle-label">Mostrar ID de cuenta</div>
              <div class="toggle-desc">Muestra el #ID junto al nombre del usuario</div>
            </div>
            <label class="switch-apple">
              <input type="checkbox" id="toggle-mostrar-id-cuenta" ${config.mostrarIdCuenta ? 'checked' : ''}>
              <span class="slider-apple"></span>
            </label>
          </div>
          <div class="toggle-row">
            <div>
              <div class="toggle-label">Mostrar ID Velneo (usr)</div>
              <div class="toggle-desc">Muestra el número de usuario asociado</div>
            </div>
            <label class="switch-apple">
              <input type="checkbox" id="toggle-mostrar-id-velneo" ${config.mostrarIdVelneo ? 'checked' : ''}>
              <span class="slider-apple"></span>
            </label>
          </div>
          <div class="toggle-row">
            <div>
              <div class="toggle-label">Mostrar Estado (Activa/Inactiva)</div>
              <div class="toggle-desc">Muestra el estado de la cuenta</div>
            </div>
            <label class="switch-apple">
              <input type="checkbox" id="toggle-mostrar-estado" ${config.mostrarEstado ? 'checked' : ''}>
              <span class="slider-apple"></span>
            </label>
          </div>
        </div>
      </div>
      
      <!-- SECCIÓN: MENÚ (opciones disponibles) -->
      <div class="admin-section">
        <div class="admin-section-title">📋 Menú de navegación</div>
        <div class="admin-card">
          <div class="toggle-row">
            <div>
              <div class="toggle-label">⚽ Partidos</div>
              <div class="toggle-desc">Calendario y pronósticos de partidos</div>
            </div>
            <label class="switch-apple">
              <input type="checkbox" id="toggle-habilitar-partidos" ${config.habilitarPartidos ? 'checked' : ''}>
              <span class="slider-apple"></span>
            </label>
          </div>
          <div class="toggle-row">
            <div>
              <div class="toggle-label">⭐ Especiales</div>
              <div class="toggle-desc">Clasificados por grupo y finalistas</div>
            </div>
            <label class="switch-apple">
              <input type="checkbox" id="toggle-habilitar-especiales" ${config.habilitarEspeciales ? 'checked' : ''}>
              <span class="slider-apple"></span>
            </label>
          </div>
          <div class="toggle-row">
            <div>
              <div class="toggle-label">📊 Tabla</div>
              <div class="toggle-desc">Tabla de posiciones por grupo</div>
            </div>
            <label class="switch-apple">
              <input type="checkbox" id="toggle-habilitar-tabla" ${config.habilitarTabla ? 'checked' : ''}>
              <span class="slider-apple"></span>
            </label>
          </div>
          <div class="toggle-row">
            <div>
              <div class="toggle-label">🏆 La Polla</div>
              <div class="toggle-desc">Mis pronósticos y puntuación</div>
            </div>
            <label class="switch-apple">
              <input type="checkbox" id="toggle-habilitar-la-polla" ${config.habilitarLaPolla ? 'checked' : ''}>
              <span class="slider-apple"></span>
            </label>
          </div>
          <div class="toggle-row">
            <div>
              <div class="toggle-label">🔬 Lab</div>
              <div class="toggle-desc">Simulador de fecha y consultas API</div>
            </div>
            <label class="switch-apple">
              <input type="checkbox" id="toggle-habilitar-lab" ${config.habilitarLab ? 'checked' : ''}>
              <span class="slider-apple"></span>
            </label>
          </div>
        </div>
      </div>
      
      <!-- ACCIONES -->
      <div class="admin-actions">
        <button class="admin-btn admin-btn-primary" id="admin-btn-guardar">💾 Guardar Configuración</button>
        <button class="admin-btn admin-btn-secondary" id="admin-btn-restablecer">↺ Restablecer</button>
        <button class="admin-btn admin-btn-danger" id="admin-btn-exportar">📤 Exportar</button>
      </div>
    </div>
  `;
  
  // Mostrar toast (notificación temporal)
  function showToast(message) {
    let toast = document.querySelector('.admin-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast-message admin-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }
  
  // Guardar configuración
  function guardarConfiguracion() {
    const nuevaConfig = {
      mostrarIdCuenta: document.getElementById('toggle-mostrar-id-cuenta').checked,
      mostrarIdVelneo: document.getElementById('toggle-mostrar-id-velneo').checked,
      mostrarEstado: document.getElementById('toggle-mostrar-estado').checked,
      habilitarPartidos: document.getElementById('toggle-habilitar-partidos').checked,
      habilitarEspeciales: document.getElementById('toggle-habilitar-especiales').checked,
      habilitarTabla: document.getElementById('toggle-habilitar-tabla').checked,
      habilitarLaPolla: document.getElementById('toggle-habilitar-la-polla').checked,
      habilitarLab: document.getElementById('toggle-habilitar-lab').checked
    };
    saveAdminConfig(nuevaConfig);
    showToast('✅ Configuración guardada');
  }
  
  // Restablecer a valores por defecto
  function restablecerConfiguracion() {
    saveAdminConfig({ ...DEFAULT_CONFIG });
    // Actualizar los checkboxes visualmente
    document.getElementById('toggle-mostrar-id-cuenta').checked = DEFAULT_CONFIG.mostrarIdCuenta;
    document.getElementById('toggle-mostrar-id-velneo').checked = DEFAULT_CONFIG.mostrarIdVelneo;
    document.getElementById('toggle-mostrar-estado').checked = DEFAULT_CONFIG.mostrarEstado;
    document.getElementById('toggle-habilitar-partidos').checked = DEFAULT_CONFIG.habilitarPartidos;
    document.getElementById('toggle-habilitar-especiales').checked = DEFAULT_CONFIG.habilitarEspeciales;
    document.getElementById('toggle-habilitar-tabla').checked = DEFAULT_CONFIG.habilitarTabla;
    document.getElementById('toggle-habilitar-la-polla').checked = DEFAULT_CONFIG.habilitarLaPolla;
    document.getElementById('toggle-habilitar-lab').checked = DEFAULT_CONFIG.habilitarLab;
    showToast('↺ Configuración restablecida');
  }
  
  // Exportar configuración a JSON
  function exportarConfiguracion() {
    const config = getAdminConfig();
    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_config_${new Date().toISOString().slice(0,19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📤 Configuración exportada');
  }
  
  // Eventos
  document.getElementById('admin-btn-guardar').onclick = guardarConfiguracion;
  document.getElementById('admin-btn-restablecer').onclick = restablecerConfiguracion;
  document.getElementById('admin-btn-exportar').onclick = exportarConfiguracion;
}