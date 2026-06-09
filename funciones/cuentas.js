// funciones/cuentas.js
// Módulo de selección de cuentas con botón para cambiar contraseña

import { obtenerHashPassword } from './login.js';

// Constantes de API
const BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

// Función para mostrar modal de cambio de contraseña (reutilizable)
function mostrarModalCambioPassword(usuario, onSuccess) {
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
                <h3 style="color: #1c1c1e; margin: 0;">Cambiar contraseña</h3>
                <p style="color: #8e8e93; font-size: 13px; margin-top: 8px;">Ingresa tu nueva contraseña.</p>
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 13px; font-weight: 600; color: #1c1c1e; margin-bottom: 6px;">Nueva contraseña</label>
                <div style="position: relative;">
                    <input type="password" id="new-password" placeholder="Ingresa tu nueva contraseña" style="width: 100%; padding: 12px 44px 12px 12px; border: 1px solid #e5e5ea; border-radius: 12px; font-size: 15px; box-sizing: border-box;">
                    <button type="button" id="toggle-new-password" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 18px; cursor: pointer;">👁️</button>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 13px; font-weight: 600; color: #1c1c1e; margin-bottom: 6px;">Confirmar contraseña</label>
                <div style="position: relative;">
                    <input type="password" id="confirm-password" placeholder="Confirma tu nueva contraseña" style="width: 100%; padding: 12px 44px 12px 12px; border: 1px solid #e5e5ea; border-radius: 12px; font-size: 15px; box-sizing: border-box;">
                    <button type="button" id="toggle-confirm-password" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 18px; cursor: pointer;">👁️</button>
                </div>
            </div>
            
            <div id="password-error" style="background: #fff2f2; border-radius: 10px; padding: 10px; margin-bottom: 16px; display: none; color: #ff3b30; font-size: 12px; text-align: center;"></div>
            
            <button id="btn-cambiar-password" style="width: 100%; background: #007aff; color: white; border: none; border-radius: 14px; padding: 14px; font-size: 16px; font-weight: 600; cursor: pointer;">Cambiar contraseña</button>
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
    const errorDiv = document.getElementById('password-error');
    
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
                        overlay.remove();
                        
                        // Mostrar mensaje de éxito
                        alert('✅ Contraseña actualizada correctamente. Por favor, inicia sesión con tu nueva contraseña.');
                        
                        // Limpiar localStorage
                        localStorage.removeItem('polla_recordar');
                        localStorage.removeItem('polla_usuario');
                        
                        // Recargar la página para resetear el estado
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
    
    // No permitir cerrar el modal haciendo clic fuera
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            return;
        }
    });
}

export function cargarModuloCuentas(datosUsuario, onRegresarPulsado) {
    const cuentasCard = document.getElementById("cuentasForm");
    const nombreMostrado = datosUsuario.usrNom || datosUsuario.usr || "Participante";

    cuentasCard.innerHTML = `
        <h1 class="bienvenida-usuario">Hola, ${nombreMostrado}</h1>
        <button id="btnCambiarPassword" class="btn-cambiar-password" style="margin-bottom: 12px; background: #007aff; color: white; border: none; border-radius: 14px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%;">🔐 Cambiar contraseña</button>
        <button id="btnRegresarCuentas" class="btn-regresar">Regresar</button>
    `;

    cuentasCard.classList.remove("cuentas-hidden");
    cuentasCard.classList.add("cuentas-visible");

    // Evento para cambiar contraseña
    document.getElementById("btnCambiarPassword").addEventListener("click", () => {
        mostrarModalCambioPassword(nombreMostrado);
    });

    document.getElementById("btnRegresarCuentas").addEventListener("click", () => {
        cuentasCard.classList.remove("cuentas-visible");
        cuentasCard.classList.add("cuentas-hidden");

        setTimeout(() => {
            cuentasCard.innerHTML = "";
            if (typeof onRegresarPulsado === "function") {
                onRegresarPulsado();
            }
        }, 400);
    });
}

// Función maestra para renderizar la lista aplicando el color basado en el nombre de la cuenta
export function mostrarCuentasAsignadas(listaCuentas, alSeleccionarCuenta, nombreUsuario) {
    const tablaDatos = document.getElementById("fp-tabla-datos");
    if (!tablaDatos) return;

    tablaDatos.innerHTML = "";

    if (!listaCuentas || listaCuentas.length === 0) {
        tablaDatos.innerHTML = `<tr><td colspan="2" style="text-align:center; color:rgba(255,255,255,0.5);">No hay cuentas asignadas</td></tr>`;
        return;
    }

    // PALETA DE COLORES FIJA DE LA APLICACIÓN
    const paletaColoresFijos = ["#ff9500", "#34c759", "#ff3b30", "#af52de", "#007aff"];

    listaCuentas.forEach((cuenta) => {
        const fila = document.createElement("tr");
        fila.style.cursor = "pointer";
        
        // OBTENER UN ÍNDICE FIJO BASADO EN EL TEXTO DEL NOMBRE
        const nombreTexto = cuenta.name || cuenta.nombre || "Cuenta";
        let hashSuma = 0;
        for (let i = 0; i < nombreTexto.length; i++) {
            hashSuma += nombreTexto.charCodeAt(i);
        }
        
        // El color depende estrictamente de los caracteres del nombre
        const colorAsignado = paletaColoresFijos[hashSuma % paletaColoresFijos.length];
        const inicial = nombreTexto.charAt(0).toUpperCase();

        fila.innerHTML = `
            <td style="display: flex; align-items: center; gap: 12px; border: none; background: transparent;">
                <div class="avatar-cuenta-lista" style="
                    width: 32px; 
                    height: 32px; 
                    border-radius: 50% !important; 
                    background-color: ${colorAsignado} !important; 
                    background-image: none !important;
                    display: flex !important; 
                    align-items: center !important; 
                    justify-content: center !important; 
                    color: white !important; 
                    font-weight: 700 !important; 
                    font-size: 0.9rem !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                    flex-shrink: 0;
                ">${inicial}</div>
                <div style="display: flex; flex-direction: column; background: transparent;">
                    <span style="color: #ffffff; font-weight: 600; text-align: left;">${nombreTexto}</span>
                    <span style="color: rgba(255,255,255,0.5); font-size: 0.75rem; text-align: left;">#${cuenta.id || "—"}</span>
                </div>
            </td>
            <td style="text-align: right; color: #34c759; font-weight: 700; border: none; background: transparent;">
                ${cuenta.ptr || cuenta.pun || 0} pts
            </td>
        `;

        fila.onclick = () => {
            if (typeof alSeleccionarCuenta === "function") {
                alSeleccionarCuenta(cuenta);
            }
        };

        tablaDatos.appendChild(fila);
    });
    
    // Agregar botón de cambio de contraseña en la tabla si se pasa el nombre de usuario
    if (nombreUsuario) {
        // Buscar si ya existe un botón de cambio de contraseña para no duplicar
        if (!document.getElementById('btn-cambiar-password-footer')) {
            const footerRow = document.createElement('tr');
            footerRow.id = 'btn-cambiar-password-footer';
            footerRow.innerHTML = `
                <td colspan="2" style="text-align: center; padding-top: 20px;">
                    <button id="btnCambiarPasswordTabla" style="background: #007aff; color: white; border: none; border-radius: 14px; padding: 12px 20px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%;">🔐 Cambiar contraseña</button>
                </td>
            `;
            tablaDatos.appendChild(footerRow);
            
            document.getElementById("btnCambiarPasswordTabla").addEventListener("click", () => {
                mostrarModalCambioPassword(nombreUsuario);
            });
        }
    }
}