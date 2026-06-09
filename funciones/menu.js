// funciones/menu.js
// Módulo de menú con cards - recibe opciones dinámicamente

export function inicializarMenu(datosCuenta, onSeleccionarOpcion, opciones) {
  const menuContainer = document.getElementById('fp-body-menu');
  if (!menuContainer) {
    console.error('No se encontró fp-body-menu');
    return;
  }
  
  // Usar las opciones que vienen de frontpage.js (AHORA + PARTIDOS + ESPECIALES + SIMULADOR)
  const opcionesMenu = opciones || [
    { id: 'ahora', nombre: 'AHORA', color: '#34c759', icono: '🏠' },
    { id: 'partidos', nombre: 'PARTIDOS', color: '#007aff', icono: '⚽' },
    { id: 'especiales', nombre: 'ESPECIALES', color: '#af52de', icono: '⭐' },
    { id: 'simulador', nombre: 'SIMULADOR', color: '#ff3b30', icono: '💻' }
  ];

  const wrapperDiv = document.createElement('div');
  wrapperDiv.className = 'menu-cards-wrapper';
  wrapperDiv.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    padding: 6px;
    box-sizing: border-box;
  `;

  opcionesMenu.forEach((card, index) => {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'menu-card';
    cardDiv.setAttribute('data-opcion', card.id);
    cardDiv.style.cssText = `
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 14px 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 14px;
      width: auto;
      animation: slideInCard 0.4s ease forwards;
      opacity: 0;
      transform: translateX(-20px);
      animation-delay: ${0.05 * (index + 1)}s;
    `;
    
    cardDiv.innerHTML = `
      <div class="card-icono" style="
        width: 44px;
        height: 44px;
        border-radius: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        background: ${card.color}20;
        border: 1px solid ${card.color}40;
        flex-shrink: 0;
      ">${card.icono}</div>
      <div class="card-contenido" style="flex: 1; text-align: left; min-width: 0;">
        <div class="card-titulo" style="
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
          text-transform: uppercase;
          white-space: nowrap;
        ">${card.nombre}</div>
      </div>
      <div class="card-flecha" style="
        font-size: 18px;
        color: rgba(255, 255, 255, 0.3);
        flex-shrink: 0;
      ">→</div>
    `;
    
    cardDiv.addEventListener('click', () => {
      if (typeof onSeleccionarOpcion === 'function') {
        onSeleccionarOpcion(card.id, datosCuenta);
      }
    });
    
    wrapperDiv.appendChild(cardDiv);
  });

  menuContainer.innerHTML = '';
  menuContainer.appendChild(wrapperDiv);
  
  if (!document.querySelector('#menu-keyframes')) {
    const styleKeyframes = document.createElement('style');
    styleKeyframes.id = 'menu-keyframes';
    styleKeyframes.textContent = `
      @keyframes slideInCard {
        0% { opacity: 0; transform: translateX(-20px); }
        100% { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(styleKeyframes);
  }
}