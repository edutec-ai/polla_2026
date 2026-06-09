// funciones/login.js
// Módulo de autenticación - VERSIÓN ESTABLE (sin anti-cache agresivo)
// - Botón "Cambiar contraseña" como badge pequeño y discreto
// - Modal con botones "Cambiar contraseña" y "Cancelar"
// - Autocomplete deshabilitado para evitar sugerencias de Windows
// - Validación de espacios en blanco
// - Limpieza completa de localStorage al logout

const BASE    = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
const BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
const KEY     = 'SuzvTp4qwXQtAVFJbdzP';

// Hash de la contraseña "123" (primeros 50 caracteres)
const HASH_123 = 'a03ab19b866fc585b5cb1812a2f63ca861e7e7643ee5d43fd7';

// Nombres de usuarios para mostrar en el saludo
const NOMBRES_USUARIOS = { '1': 'Henry', '3': 'Héctor' };

let callbackFrontpage = null;
let usuarioActual = null;
let modalActivo = false;

// Función hash simple si sha3_256 no está disponible
function generarHashSimple(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

// Función para obtener hash de la contraseña (primeros 50 caracteres)
function obtenerHashPassword(pass) {
    if (typeof sha3_256 !== 'undefined') {
        return sha3_256(pass).substring(0, 50);
    } else {
        console.warn('⚠️ Usando hash simple (sha3_256 no disponible)');
        return generarHashSimple(pass + KEY).substring(0, 50);
    }
}

// Función para limpiar completamente los datos del usuario (logout)
function limpiarDatosUsuario() {
    const keysToRemove = [
        'polla_recordar',
        'polla_usuario',
        'usuarioActual',
        'polla_pronosticos_partidos',
        'polla_pronosticos_especiales',
        'polla_jugador_id',
        'polla_ultima_sincronizacion',
        'polla_ultima_sincronizacion_completa',
        'polla_equipos_cache',
        'polla_grupos_equipos',
        'polla_data_version'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('[Login] ✅ Datos de usuario limpiados');
}

// Mostrar modal de cambio de contraseña
function mostrarModalCambioPassword(usuario, usrId) {
    if (modalActivo) return;
    modalActivo = true;
    
    // Crear overlay del modal
    const overlay = document.createElement('div');
    overlay.id = 'modal-cambio-password';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    overlay.innerHTML = `
        <div style="background: white; border-radius: 24px; max-width: 400px; width: 90%; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 48px; margin-bottom: 8px;">🔐</div>
                <h3 style="color: #1c1c1e; margin: 0;">Cambio de contraseña requerido</h3>
                <p style="color: #8e8e93; font-size: 13px; margin-top: 8px;">Por seguridad, debes cambiar tu contraseña temporal.</p>
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 13px; font-weight: 600; color: #1c1c1e; margin-bottom: 6px;">Nueva contraseña</label>
                <div style="position: relative;">
                    <input type="password" id="new-password" 
                           autocomplete="new-password"
                           autocomplete="off"
                           autocomplete="one-time-code"
                           placeholder="Ingresa tu nueva contraseña" 
                           style="width: 100%; padding: 12px 44px 12px 12px; border: 1px solid #e5e5ea; border-radius: 12px; font-size: 15px; box-sizing: border-box;">
                    <button type="button" id="toggle-new-password" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 18px; cursor: pointer;">👁️</button>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 13px; font-weight: 600; color: #1c1c1e; margin-bottom: 6px;">Confirmar contraseña</label>
                <div style="position: relative;">
                    <input type="password" id="confirm-password"
                           autocomplete="new-password"
                           autocomplete="off"
                           autocomplete="one-time-code"
                           placeholder="Confirma tu nueva contraseña" 
                           style="width: 100%; padding: 12px 44px 12px 12px; border: 1px solid #e5e5ea; border-radius: 12px; font-size: 15px; box-sizing: border-box;">
                    <button type="button" id="toggle-confirm-password" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 18px; cursor: pointer;">👁️</button>
                </div>
            </div>
            
            <div id="password-error" style="background: #fff2f2; border-radius: 10px; padding: 10px; margin-bottom: 16px; display: none; color: #ff3b30; font-size: 12px; text-align: center;"></div>
            
            <div style="display: flex; gap: 12px; margin-top: 8px;">
                <button id="btn-cambiar-password" style="flex: 1; background: #007aff; color: white; border: none; border-radius: 14px; padding: 14px; font-size: 16px; font-weight: 600; cursor: pointer;">Cambiar contraseña</button>
                <button id="btn-cancelar-modal" style="flex: 1; background: #f2f2f7; color: #1c1c1e; border: none; border-radius: 14px; padding: 14px; font-size: 16px; font-weight: 600; cursor: pointer;">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Toggle para mostrar/ocultar contraseña
    const toggleNew = document.getElementById('toggle-new-password');
    const toggleConfirm = document.getElementById('toggle-confirm-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    
    let newVisible = false;
    let confirmVisible = false;
    
    if (toggleNew) {
        toggleNew.onclick = () => {
            newVisible = !newVisible;
            newPasswordInput.type = newVisible ? 'text' : 'password';
            toggleNew.textContent = newVisible ? '🙈' : '👁️';
        };
    }
    
    if (toggleConfirm) {
        toggleConfirm.onclick = () => {
            confirmVisible = !confirmVisible;
            confirmPasswordInput.type = confirmVisible ? 'text' : 'password';
            toggleConfirm.textContent = confirmVisible ? '🙈' : '👁️';
        };
    }
    
    const cambiarBtn = document.getElementById('btn-cambiar-password');
    const cancelarBtn = document.getElementById('btn-cancelar-modal');
    const errorDiv = document.getElementById('password-error');
    
    // Botón Cancelar - limpiar datos al cancelar
    if (cancelarBtn) {
        cancelarBtn.onclick = () => {
            overlay.remove();
            modalActivo = false;
            // Limpiar campos del login Y datos de localStorage
            const inputUsuario = document.getElementById('inputUsuario');
            const inputPassword = document.getElementById('inputPassword');
            if (inputUsuario) inputUsuario.value = '';
            if (inputPassword) inputPassword.value = '';
            limpiarDatosUsuario(); // Limpiar completamente
        };
    }
    
    if (cambiarBtn) {
        cambiarBtn.onclick = async () => {
            const newPassword = newPasswordInput.value.trim();
            const confirmPassword = confirmPasswordInput.value.trim();
            
            if (!newPassword) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = '❌ Por favor, ingresa una nueva contraseña.';
                return;
            }
            
            if (newPassword.length < 3) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = '❌ La contraseña debe tener al menos 3 caracteres.';
                return;
            }
            
            if (newPassword !== confirmPassword) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = '❌ Las contraseñas no coinciden.';
                return;
            }
            
            errorDiv.style.display = 'none';
            cambiarBtn.disabled = true;
            cambiarBtn.textContent = '⟳ Cambiando...';
            
            try {
                const response = await fetch(`${BASE_V2}/_process/API_PUT_PWD?api_key=${KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ 
                        sso_usr: usuario,
                        sso_usr_pwd: newPassword
                    })
                });
                
                if (response.ok) {
                    const respuesta = await response.json();
                    console.log('Respuesta API_PUT_PWD:', respuesta);
                    
                    if (respuesta.COD === 1) {
                        // Limpiar TODO antes de recargar
                        limpiarDatosUsuario();
                        
                        overlay.remove();
                        modalActivo = false;
                        
                        alert('✅ Contraseña actualizada correctamente. Por favor, inicia sesión con tu nueva contraseña.');
                        
                        const inputUsuario = document.getElementById('inputUsuario');
                        const inputPassword = document.getElementById('inputPassword');
                        if (inputUsuario) inputUsuario.value = '';
                        if (inputPassword) inputPassword.value = '';
                        
                        window.location.reload();
                    } else {
                        errorDiv.style.display = 'block';
                        errorDiv.textContent = `❌ ${respuesta.DES || 'Error al cambiar la contraseña'}`;
                        cambiarBtn.disabled = false;
                        cambiarBtn.textContent = 'Cambiar contraseña';
                    }
                } else {
                    const errorText = await response.text();
                    console.error('Error en API_PUT_PWD:', errorText);
                    errorDiv.style.display = 'block';
                    errorDiv.textContent = '❌ Error al cambiar la contraseña. Intenta nuevamente.';
                    cambiarBtn.disabled = false;
                    cambiarBtn.textContent = 'Cambiar contraseña';
                }
            } catch (error) {
                console.error('Error de conexión:', error);
                errorDiv.style.display = 'block';
                errorDiv.textContent = '❌ Error de conexión. Verifica tu red.';
                cambiarBtn.disabled = false;
                cambiarBtn.textContent = 'Cambiar contraseña';
            }
        };
    }
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            modalActivo = false;
            limpiarDatosUsuario();
        }
    });
}

export function configurarLogin(fnCargarFrontpage) {
  const form = document.getElementById('formLogin');
  const btnRegresar = document.getElementById('btnRegresar');
  const chkRecordar = document.getElementById('chkRecordar');
  const inputUsuario = document.getElementById('inputUsuario');

  callbackFrontpage = fnCargarFrontpage;

  const estiloLocalLogin = document.createElement('style');
  estiloLocalLogin.textContent = `
    .logo-login-card { 
      width: 128px !important; 
      height: auto !important; 
      margin-bottom: 20px !important; 
    }
    #loginForm h2 {
      color: #ffffff !important;
      font-weight: 700 !important;
      letter-spacing: -0.5px !important;
    }
  `;
  document.head.appendChild(estiloLocalLogin);

  const tituloLogin = document.querySelector('#loginForm h2');
  if (tituloLogin) {
    tituloLogin.textContent = 'Polla Mundialista 2026';
  }

  if (localStorage.getItem('polla_recordar') === '1') {
    if (inputUsuario) inputUsuario.value = localStorage.getItem('polla_usuario') || '';
    if (chkRecordar) chkRecordar.checked = true;
  }

  if (chkRecordar) {
    chkRecordar.addEventListener('change', () => {
      if (!chkRecordar.checked && inputUsuario) {
        localStorage.removeItem('polla_recordar');
        localStorage.removeItem('polla_usuario');
        inputUsuario.value = '';
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      ejecutarAutenticacion();
    });
  }

  if (btnRegresar) {
    btnRegresar.addEventListener('click', () => {
      const loginCard = document.getElementById('loginForm');
      const cuentascCard = document.getElementById('cuentasForm');
      
      const inputPass = document.getElementById('inputPassword');
      if (inputPass) inputPass.value = '';
      const cuentaList = document.getElementById('cuenta-list');
      if (cuentaList) cuentaList.innerHTML = '<div class="loader">⟳ Consultando Velneo...</div>';
      
      if (chkRecordar && !chkRecordar.checked && inputUsuario) {
        inputUsuario.value = '';
      }
      
      // Limpiar datos al regresar al login
      limpiarDatosUsuario();
      
      if (cuentascCard && loginCard) {
        cuentascCard.classList.add('login-retirado');
        setTimeout(() => {
          cuentascCard.classList.remove('login-activo', 'login-retirado');
          loginCard.classList.add('login-activo');
        }, 400);
      }
    });
  }
}

function ejecutarAutenticacion() {
  // Limpiar espacios en blanco al inicio y final
  let usuario = document.getElementById('inputUsuario').value;
  let pass = document.getElementById('inputPassword').value;
  
  // Eliminar espacios en blanco al inicio y final
  usuario = usuario ? usuario.trim().toLowerCase() : '';
  pass = pass ? pass.trim() : '';
  
  const errEl = document.getElementById('loginError');
  const btn = document.getElementById('btnIngresar');
  const chkRecordar = document.getElementById('chkRecordar');
  
  // Validar que no estén vacíos después de limpiar espacios
  if (!usuario || !pass) {
    if (errEl) {
      errEl.textContent = '⚠️ Usuario y contraseña son obligatorios';
      errEl.style.display = 'block';
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Ingresar';
    }
    return;
  }
  
  if (errEl) errEl.style.display = 'none';
  if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }
  
  const hashPassword = obtenerHashPassword(pass);
  const esContrasenaTemporal = (hashPassword === HASH_123);
  
  console.log('📌 Usuario:', usuario);
  console.log('📌 Hash ingresado:', hashPassword);
  console.log('📌 ¿Es contraseña temporal "123"?', esContrasenaTemporal);
  
  fetch(BASE_V2 + '/_process/API_VLD_USR?api_key=' + KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ USR_NOM: usuario, HASH: hashPassword })
  })
  .then(r => {
    if (!r.ok) throw new Error('Error HTTP: ' + r.status);
    return r.json();
  })
  .then(data => {
    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar'; }
    
    const usrId = data.ID || data.usr || data.USR || data.id || null;
    
    if (!usrId) {
      if (errEl) {
        errEl.textContent = '⚠️ Usuario o contraseña incorrectos';
        errEl.style.display = 'block';
      }
      return;
    }
    
    if (esContrasenaTemporal) {
      usuarioActual = { nombre: usuario, id: usrId };
      mostrarModalCambioPassword(usuario, usrId);
      return;
    }
    
    if (chkRecordar && chkRecordar.checked) {
      localStorage.setItem('polla_recordar', '1');
      localStorage.setItem('polla_usuario', usuario);
    }
    
    const nombre = NOMBRES_USUARIOS[String(usrId)] || usuario;
    const saludoEl = document.getElementById('cuenta-saludo');
    if (saludoEl) saludoEl.textContent = '¡Hola, ' + nombre + '!';
    
    const loginCard = document.getElementById('loginForm');
    const cuentascCard = document.getElementById('cuentasForm');
    
    if (loginCard && cuentascCard) {
      loginCard.classList.add('login-retirado');
      setTimeout(() => {
        loginCard.classList.remove('login-activo', 'login-retirado');
        cuentascCard.classList.add('login-activo');
        renderizarCardsCuentas(Number(usrId), usuario);
      }, 400);
    }
  })
  .catch((error) => {
    console.error('Error de conexión:', error);
    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar'; }
    if (errEl) {
      errEl.textContent = '⚠️ Error de conexión con Velneo';
      errEl.style.display = 'block';
    }
  });
}

function renderizarCardsCuentas(usrId, nombreUsuario) {
  const listEl = document.getElementById('cuenta-list');
  const subEl = document.getElementById('cuenta-sub');
  
  fetch(BASE + '/fifa_jug?api_key=' + KEY)
    .then(r => {
      if (!r.ok) throw new Error('Error HTTP: ' + r.status);
      return r.json();
    })
    .then(data => {
      const todos = data.fifa_jug || [];
      const cuentas = todos.filter(j => Number(j.usr) === usrId && j.off !== true);
      const colores = ['#f0a500', '#34c759', '#af52de', '#007aff', '#ff3b30'];
      
      if (!cuentas.length) {
        if (subEl) subEl.textContent = 'No tienes cuentas configuradas.';
        if (listEl) listEl.innerHTML = '<div class="loader">Sin registros</div>';
        return;
      }
      
      if (subEl) subEl.textContent = 'Tienes ' + cuentas.length + ' cuenta' + (cuentas.length > 1 ? 's' : '') + ' asignada(s).';
      if (listEl) {
        listEl.innerHTML = '';
        cuentas.forEach((c, i) => {
          const iniciales = (c.name || 'X').split(' ').map(w => w[0]).join('').toUpperCase().substring(0,2);
          const card = document.createElement('div');
          
          card.className = 'cuenta-item-static';
          card.style.cursor = 'pointer';
          card.style.transition = 'background 0.2s, transform 0.1s';
          
          card.innerHTML = `
            <div class="cuenta-avatar" style="background:${colores[i % colores.length]};color:#fff;">${iniciales}</div>
            <div class="cuenta-info">
              <div class="cuenta-nombre">${escapeHtml(c.name || '—')}</div>
              <div class="cuenta-tag">Cuenta ${i+1} · ID: ${c.id}</div>
            </div>
            <div class="cuenta-pts">${c.ptr || c.pun || 0} pts</div>
          `;
          
          card.onmousedown = () => card.style.transform = 'scale(0.97)';
          card.onmouseup = () => card.style.transform = 'scale(1)';
          
          card.onclick = () => {
            const cuentascCard = document.getElementById('cuentasForm');
            const frontpageCard = document.getElementById('frontpageForm');
            
            if (cuentascCard && frontpageCard) {
              cuentascCard.classList.add('login-retirado');
              setTimeout(() => {
                cuentascCard.classList.remove('login-activo', 'login-retirado');
                frontpageCard.classList.add('login-activo');
                if (typeof callbackFrontpage === 'function') {
                  callbackFrontpage(c);
                }
              }, 400);
            }
          };
          listEl.appendChild(card);
        });
        
        // ========== BADGE PEQUEÑO PARA CAMBIAR CONTRASEÑA ==========
        const btnCambioDiv = document.createElement('div');
        btnCambioDiv.style.marginTop = '12px';
        btnCambioDiv.style.textAlign = 'center';
        btnCambioDiv.innerHTML = `
            <div id="btnCambiarPasswordCuentas" style="display: inline-block; background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; padding: 6px 16px; font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.8); cursor: pointer; transition: all 0.2s ease;">
                🔐 Cambiar contraseña
            </div>
        `;
        listEl.appendChild(btnCambioDiv);
        
        const btnCambio = document.getElementById('btnCambiarPasswordCuentas');
        if (btnCambio) {
          btnCambio.addEventListener('click', () => {
            mostrarModalCambioPassword(nombreUsuario, usrId);
          });
        }
        // ========================================================
      }
    })
    .catch((error) => {
      console.error('Error cargando cuentas:', error);
      if (subEl) subEl.textContent = 'Error de sincronización.';
      if (listEl) listEl.innerHTML = '<div class="loader" style="color:#ff453a;">⚠️ Error de datos</div>';
    });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}