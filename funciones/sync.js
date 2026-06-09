// funciones/sync.js
// Módulo de sincronización con localStorage y Velneo
// VERSIÓN CON VERSIONADO Y TIMESTAMPS

const STORAGE_KEYS = {
  PARTIDOS: 'polla_pronosticos_partidos',
  ESPECIALES: 'polla_pronosticos_especiales',
  JUGADOR_ID: 'polla_jugador_id',
  ULTIMA_SINCRONIZACION: 'polla_ultima_sincronizacion',
  ULTIMA_SINCRONIZACION_COMPLETA: 'polla_ultima_sincronizacion_completa',
  EQUIPOS: 'polla_equipos_cache',
  GRUPOS_EQUIPOS: 'polla_grupos_equipos',
  VERSION: 'polla_data_version'
};

const DATA_VERSION = '2.0.0';

// Guardar pronósticos de partidos en localStorage (con versionado)
export function guardarPronosticosPartidosLocal(pronosticos) {
  const dataToSave = {
    version: DATA_VERSION,
    timestamp: Date.now(),
    data: pronosticosa
  };
  localStorage.setItem(STORAGE_KEYS.PARTIDOS, JSON.stringify(dataToSave));
}

// Cargar pronósticos de partidos desde localStorage
export function cargarPronosticosPartidosLocal() {
  const rawData = localStorage.getItem(STORAGE_KEYS.PARTIDOS);
  if (!rawData) return {};
  
  try {
    const parsed = JSON.parse(rawData);
    if (parsed.version && parsed.data) {
      return parsed.data;
    }
    return parsed;
  } catch (e) {
    console.error('Error cargando pronósticos partidos:', e);
    return {};
  }
}

export function getTimestampPartidosLocal() {
  const rawData = localStorage.getItem(STORAGE_KEYS.PARTIDOS);
  if (!rawData) return null;
  try {
    const parsed = JSON.parse(rawData);
    return parsed.timestamp || null;
  } catch (e) {
    return null;
  }
}

// Guardar pronósticos de especiales
export function guardarPronosticosEspecialesLocal(data) {
  const dataToSave = {
    version: DATA_VERSION,
    timestamp: Date.now(),
    data: data
  };
  localStorage.setItem(STORAGE_KEYS.ESPECIALES, JSON.stringify(dataToSave));
}

export function cargarPronosticosEspecialesLocal() {
  const rawData = localStorage.getItem(STORAGE_KEYS.ESPECIALES);
  if (!rawData) return { grupos: {}, finalistas: {} };
  
  try {
    const parsed = JSON.parse(rawData);
    if (parsed.version && parsed.data) {
      return parsed.data;
    }
    return parsed;
  } catch (e) {
    console.error('Error cargando pronósticos especiales:', e);
    return { grupos: {}, finalistas: {} };
  }
}

// Guardar ID del jugador
export function guardarJugadorIdLocal(id) {
  localStorage.setItem(STORAGE_KEYS.JUGADOR_ID, id);
}

export function getJugadorIdLocal() {
  return localStorage.getItem(STORAGE_KEYS.JUGADOR_ID);
}

// Guardar equipos cache
export function guardarEquiposCacheLocal(equipos) {
  const dataToSave = {
    version: DATA_VERSION,
    timestamp: Date.now(),
    data: equipos
  };
  localStorage.setItem(STORAGE_KEYS.EQUIPOS, JSON.stringify(dataToSave));
}

export function cargarEquiposCacheLocal() {
  const rawData = localStorage.getItem(STORAGE_KEYS.EQUIPOS);
  if (!rawData) return null;
  
  try {
    const parsed = JSON.parse(rawData);
    if (parsed.version && parsed.data) {
      return parsed.data;
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

// Guardar grupos equipos
export function guardarGruposEquiposLocal(grupos) {
  const dataToSave = {
    version: DATA_VERSION,
    timestamp: Date.now(),
    data: grupos
  };
  localStorage.setItem(STORAGE_KEYS.GRUPOS_EQUIPOS, JSON.stringify(dataToSave));
}

export function cargarGruposEquiposLocal() {
  const rawData = localStorage.getItem(STORAGE_KEYS.GRUPOS_EQUIPOS);
  if (!rawData) return null;
  
  try {
    const parsed = JSON.parse(rawData);
    if (parsed.version && parsed.data) {
      return parsed.data;
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

// Timestamps de sincronización
export function actualizarTimestampSincronizacion() {
  localStorage.setItem(STORAGE_KEYS.ULTIMA_SINCRONIZACION, Date.now().toString());
}

export function guardarUltimaSincronizacionCompleta() {
  const syncData = {
    timestamp: Date.now(),
    version: DATA_VERSION,
    type: 'full_sync'
  };
  localStorage.setItem(STORAGE_KEYS.ULTIMA_SINCRONIZACION_COMPLETA, JSON.stringify(syncData));
}

export function getUltimaSincronizacionCompleta() {
  const rawData = localStorage.getItem(STORAGE_KEYS.ULTIMA_SINCRONIZACION_COMPLETA);
  if (!rawData) return null;
  try {
    const parsed = JSON.parse(rawData);
    return parsed.timestamp;
  } catch (e) {
    return null;
  }
}

export function getUltimaSincronizacion() {
  return localStorage.getItem(STORAGE_KEYS.ULTIMA_SINCRONIZACION);
}

export function sonDatosLocalesValidos(maxAgeMs = 24 * 60 * 60 * 1000) {
  const lastSync = getUltimaSincronizacionCompleta();
  if (!lastSync) return false;
  const age = Date.now() - lastSync;
  return age < maxAgeMs;
}

// Limpiar todos los datos
export function limpiarLocalStorage() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  console.log('[Sync] ✅ localStorage limpiado completamente');
}

export function hayDatosLocales() {
  return localStorage.getItem(STORAGE_KEYS.PARTIDOS) !== null;
}

export function getCacheStats() {
  const stats = {};
  for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
    const data = localStorage.getItem(storageKey);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        stats[key] = {
          exists: true,
          size: data.length,
          timestamp: parsed.timestamp || null,
          version: parsed.version || 'legacy'
        };
      } catch (e) {
        stats[key] = { exists: true, size: data.length, error: 'invalid_json' };
      }
    } else {
      stats[key] = { exists: false };
    }
  }
  return stats;
}