// funciones/banderas.js
// Mapeo centralizado de banderas para todos los módulos
// Basado en los equipos validados en especiales.js

export const BANDERAS = {
  // Grupo A
  'México': '🇲🇽',
  'Sudáfrica': '🇿🇦',
  'República de Corea': '🇰🇷',
  'Corea del Sur': '🇰🇷',
  'República Checa': '🇨🇿',
  
  // Grupo B
  'Canadá': '🇨🇦',
  'Bosnia': '🇧🇦',
  'Catar': '🇶🇦',
  'Suiza': '🇨🇭',
  
  // Grupo C
  'Brasil': '🇧🇷',
  'Marruecos': '🇲🇦',
  'Haití': '🇭🇹',
  'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  
  // Grupo D
  'Estados Unidos': '🇺🇸',
  'EE. UU.': '🇺🇸',
  'Paraguay': '🇵🇾',
  'Australia': '🇦🇺',
  'Turquía': '🇹🇷',
  
  // Grupo E
  'Alemania': '🇩🇪',
  'Curazao': '🇨🇼',
  'Costa de Marfil': '🇨🇮',
  'Ecuador': '🇪🇨',
  
  // Grupo F
  'Países Bajos': '🇳🇱',
  'Japón': '🇯🇵',
  'Suecia': '🇸🇪',
  'Tunez': '🇹🇳',
  
  // Grupo G
  'Bélgica': '🇧🇪',
  'Egipto': '🇪🇬',
  'RI de Irán': '🇮🇷',
  'Nueva Zelanda': '🇳🇿',
  
  // Grupo H
  'España': '🇪🇸',
  'Islas de Cabo Verde': '🇨🇻',
  'Cabo Verde': '🇨🇻',      // Alias para nombre corto
  'Arabia Saudí': '🇸🇦',
  'Uruguay': '🇺🇾',
  
  // Grupo I
  'Francia': '🇫🇷',
  'Senegal': '🇸🇳',
  'Irak': '🇮🇶',
  'Noruega': '🇳🇴',
  
  // Grupo J
  'Argentina': '🇦🇷',
  'Argelia': '🇩🇿',
  'Austria': '🇦🇹',
  'Jordania': '🇯🇴',
  
  // Grupo K
  'Portugal': '🇵🇹',
  'RD Congo': '🇨🇩',
  'Uzbekistán': '🇺🇿',
  'Colombia': '🇨🇴',
  
  // Grupo L
  'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Croacia': '🇭🇷',
  'Ghana': '🇬🇭',
  'Panamá': '🇵🇦',
  
  // Playoff
  'Playoff UEFA': '🏆'
};

// Nombres cortos para visualización (no afecta la lógica de negocio)
export const NOMBRES_VISUALES = {
  'República de Corea': 'Corea del Sur',
  'Islas de Cabo Verde': 'Cabo Verde'
};

// Obtener nombre corto para visualización
export function getNombreVisual(nombre) {
  return NOMBRES_VISUALES[nombre] || nombre;
}

export function getBandera(nombre) {
  // Primero buscar el nombre original, luego el alias
  if (BANDERAS[nombre]) return BANDERAS[nombre];
  const alias = NOMBRES_VISUALES[nombre];
  if (alias && BANDERAS[alias]) return BANDERAS[alias];
  return '🏳️';
}
