export function inicializarIntro(onIntroFinalizada) {
  const logo = document.getElementById("logoMundial");
  const texto = document.getElementById("neonText");
  const cortina = document.getElementById("introLayer");
  const formulario = document.getElementById("loginForm");

  if (!logo || !texto) {
    if (cortina) cortina.style.display = "none";
    if (formulario) formulario.classList.add("login-activo");
    if (typeof onIntroFinalizada === "function") onIntroFinalizada();
    return;
  }

  // Escalado del logo (2x previo) y aumento de +2pt al texto neón
  logo.style.width = "220px";
  texto.style.fontSize = "2.0rem"; // Escalado proporcional +2pt sobre el valor base de la piel

  // Paso 1: Forzar la visibilidad del logo del mundial
  setTimeout(() => {
    logo.classList.add("logo-visible");
    
    // Paso 2: Forzar el encendido del aviso Neón
    setTimeout(() => {
      texto.classList.add("texto-visible");
      
      // Paso 3: Retirar la cortina negra tras el barrido
      setTimeout(() => {
        if (cortina) cortina.classList.add("cortina-oculta");
        
        setTimeout(() => {
          if (cortina) cortina.style.display = "none";
          if (formulario) formulario.classList.add("login-activo");
          
          // Entregar el control al cerebro modular
          if (typeof onIntroFinalizada === "function") onIntroFinalizada();
        }, 600);
      }, 1200);
    }, 800);
  }, 200);
}