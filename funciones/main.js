// funciones/main.js
import { inicializarIntro } from './intro.js';
import { configurarLogin } from './login.js';
import { cargarFrontpage } from './frontpage.js';

// 1. Inyección inmediata de la estructura ósea en el DOM
document.getElementById('app-root').innerHTML = `
  <div id="introLayer" class="intro-layer">
    <div class="intro-center">
      <img id="logoMundial" src="./img/logoMundial.png" alt="Logo Mundial" class="logo-mundial">
      <div id="neonText" class="netflix-neon-text">Polla Mundialista</div>
    </div>
  </div>

  <main class="pantalla-presentacion">
    <!-- LIENZO 1: INICIO DE SESIÓN -->
    <div id="loginForm" class="wrapper-login">
      <img src="./img/logoMundial.png" alt="Logo Copa Mundial" class="logo-login-card">
      <h2>Iniciar Sesión</h2>
      <div id="loginError" class="alerta-error" style="display: none;"></div>
      <form id="formLogin">
        <div class="grupo-input">
          <input type="text" id="inputUsuario" placeholder="Usuario" autocomplete="off" required>
        </div>
        <div class="grupo-input">
          <input type="password" id="inputPassword" placeholder="Contraseña" required>
        </div>
        <div class="fila-toggle">
          <span>Recordar credenciales</span>
          <label class="switch-apple">
            <input type="checkbox" id="chkRecordar">
            <span class="slider-apple"></span>
          </label>
        </div>
        <button type="submit" class="btn-enviar" id="btnIngresar">Ingresar</button>
      </form>
    </div>

    <!-- LIENZO 2: CUENTAS ASIGNADAS -->
    <div id="cuentasForm" class="wrapper-login">
      <img src="./img/logoMundial.png" alt="Logo Copa Mundial" class="logo-login-card">
      <h2 id="cuenta-saludo">¡Hola!</h2>
      <div class="title-sub" id="cuenta-sub">Cargando cuentas asignadas...</div>
      <div class="cuenta-list" id="cuenta-list">
        <div class="loader">⟳ Consultando Velneo...</div>
      </div>
      <button type="button" class="btn-regresar" id="btnRegresar">Regresar</button>
    </div>

    <!-- LIENZO 3: FRONTPAGE -->
    <div id="frontpageForm" class="wrapper-login">
      <img src="./img/logoMundial.png" alt="Logo Copa Mundial" class="logo-login-card">
      <h2 id="fp-titulo-cuenta">Cuenta</h2>
      <div class="title-sub">Detalles de Sincronización</div>
      
      <style>
        .tabla-apple { width: 100%; border-collapse: collapse; margin: 20px 0; background: rgba(255,255,255,0.03); border-radius: 14px; overflow: hidden; }
        .tabla-apple td { padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.9rem; }
        .tabla-apple tr:last-child td { border-bottom: none; }
        .tabla-label { text-align: left; color: rgba(255,255,255,0.5); font-weight: 500; }
        .tabla-valor { text-align: right; color: #ffffff; font-weight: 600; }
        .font-resaltado { color: #34c759; }
      </style>
      
      <table class="tabla-apple">
        <tbody id="fp-tabla-datos">
          <!-- Inyectado dinámicamente -->
        </tbody>
      </table>
      
      <button type="button" class="btn-regresar" id="btnRegresarFrontpage">Regresar</button>
    </div>
  </main>
`;

// 2. Orquestación síncrona
inicializarIntro(() => {
  configurarLogin(cargarFrontpage);
});