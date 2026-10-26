// src/services/cityService.js
// Aggregates sensor data by city, computes city-level ICAU-D, generates ranking

import { getAllSensors }   from './sensorService.js';
import { calculateICAUD }  from '../models/icaud.js';
import { reverseGeocode, haversineDistance }  from '../utils/geo.js';
import { cache }           from '../utils/cache.js';
import { config }          from '../config/index.js';
import { logger }          from '../utils/logger.js';

// Raio (km) para procurar sensores de outras fontes que complementem dados
// faltantes em uma cidade (ex: PM2.5 do Sensor.Community para uma cidade do Open-Meteo)
const CROSS_SOURCE_FILL_RADIUS_KM = 80;

// Rótulos amigáveis das fontes — usados nos tooltips do frontend
const SOURCE_LABELS = {
  sensor_community: 'Sensor.Community (sensores IoT comunitários)',
  open_meteo:       'Open-Meteo (estações meteorológicas)',
  open_meteo_aq:    'Open-Meteo Air Quality (modelo CAMS)',
};

function sourceLabel(source) {
  return SOURCE_LABELS[source] || source || 'Desconhecida';
}

const CACHE_KEY_CITIES  = 'cities:aggregated';
const CACHE_KEY_RANKING = 'cities:ranking';

// Tempo máximo (ms) para toda a etapa de geocodificação reversa
// Depois disso, sensores sem cidade usam fallback aproximado (mas os com cidade continuam)
const GEOCODE_TIMEOUT_MS = 60_000; // Aumentado de 30s para 60s para melhor cobertura

/**
 * Verifica se um nome de cidade é válido (não é uma coordenada)
 */
function isValidCityName(name) {
  if (!name || typeof name !== 'string' || name.trim().length < 2) return false;
  if (/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?)?$/.test(name.trim())) return false;
  return true;
}

/**
 * Agrupa sensores por cidade.
 *
 * Estratégia em 2 passos para minimizar chamadas ao Nominatim:
 * 1. Sensores que já têm cidade válida nos metadados → agrupados diretamente.
 * 2. Sensores sem cidade → deduplicados por grade de 0.02° (~2km) antes de
 *    enfileirar para geocodificação reversa (respeita 1 req/s do Nominatim).
 *    Um timeout global de 30s protege contra travamento.
 */
async function groupSensorsByCity(sensors) {
  const cityMap     = new Map();
  const needGeocode = [];

  // ── Passo 1: separar os que já têm cidade ──────────────────────────────────
  for (const sensor of sensors) {
    const cityName = isValidCityName(sensor.location.city)
      ? sensor.location.city.trim()
      : null;

    if (cityName) {
      addToCity(cityMap, cityName, sensor.location.country, sensor);
    } else {
      needGeocode.push(sensor);
    }
  }

  logger.info(`Geocodificação necessária: ${needGeocode.length} sensores sem cidade`);

  // Se não há sensores sem cidade, pula o geocoding
  if (needGeocode.length === 0) return cityMap;

  // ── Passo 2: geocodificação com timeout global ─────────────────────────────
  const gridCache = new Map();

  const geocodeAll = async () => {
    for (const sensor of needGeocode) {
      // Chave de grade 0.02° (~2 km)
      const gridKey = `${(sensor.location.lat / 0.02).toFixed(0)},${(sensor.location.lon / 0.02).toFixed(0)}`;

      let cityName;
      if (gridCache.has(gridKey)) {
        cityName = gridCache.get(gridKey);
      } else {
        try {
          cityName = await reverseGeocode(sensor.location.lat, sensor.location.lon);
        } catch {
          cityName = null;
        }
        gridCache.set(gridKey, cityName);
      }

      if (isValidCityName(cityName)) {
        addToCity(cityMap, cityName, sensor.location.country, sensor);
      }
    }
  };

  // Corre com timeout: se demorar demais, continua com as cidades já resolvidas
  try {
    await Promise.race([
      geocodeAll(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Geocode timeout')), GEOCODE_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    logger.warn(`Geocodificação encerrada (${err.message}). Cidades já resolvidas serão usadas.`);
  }

  return cityMap;
}

/** Utilitário: adiciona sensor ao mapa de cidades */
function addToCity(cityMap, name, country, sensor) {
  if (!cityMap.has(name)) {
    cityMap.set(name, {
      name,
      country: country || 'Unknown',
      lat:     sensor.location.lat,
      lon:     sensor.location.lon,
      sensors: [],
    });
  }
  cityMap.get(name).sensors.push(sensor);
}

/**
 * Calcula estatísticas agregadas de uma cidade.
 *
 * Para cada métrica (temperature, humidity, pm25, pm10, windSpeed):
 *  - Calcula a média dos sensores que reportaram essa variável
 *  - Registra de QUAIS fontes os dados vieram (measurementSources)
 *    — assim o frontend pode mostrar "PM2.5 vindo de Sensor.Community" no tooltip
 */
function computeCityStats(cityData) {
  const { name, country, lat, lon, sensors } = cityData;

  const fields = ['temperature', 'humidity', 'pm25', 'pm10', 'windSpeed'];
  const measurements = {};
  const counts = {};
  const measurementSources = {};

  for (const field of fields) {
    const contributing = sensors.filter(s => {
      const v = s.measurements?.[field];
      return v !== null && v !== undefined && !isNaN(v);
    });

    if (contributing.length > 0) {
      const sum = contributing.reduce((a, s) => a + s.measurements[field], 0);
      measurements[field] = Math.round((sum / contributing.length) * 10) / 10;

      const sourceSet = new Set(contributing.map(s => s.source));
      measurementSources[field] = {
        sources: [...sourceSet],
        labels:  [...sourceSet].map(sourceLabel),
        count:   contributing.length,
        // Distância máxima dos sensores contribuintes ao centro da cidade
        // (mostra ao usuário se o dado vem de longe, p. ex. cross-source fill)
        maxDistanceKm: Math.round(
          Math.max(...contributing.map(s =>
            haversineDistance(lat, lon, s.location.lat, s.location.lon)
          )) * 10
        ) / 10,
      };
    } else {
      measurements[field] = null;
      measurementSources[field] = null;
    }
    counts[field] = contributing.length;
  }

  // Calcula ICAU-D — nunca lança exceção, retorna score: null se dados insuficientes
  let icaud;
  try {
    icaud = calculateICAUD({
      temperature: measurements.temperature,
      humidity:    measurements.humidity,
      pm25:        measurements.pm25,
      windSpeed:   measurements.windSpeed,
    });
  } catch (err) {
    logger.warn(`Falha no cálculo ICAU-D para ${name}: ${err.message}`);
    icaud = { score: null, classification: null, components: {}, weights: {}, availableComponents: [] };
  }

  return {
    id:          name.toLowerCase().replace(/\s+/g, '_'),
    name,
    country,
    location:    { lat, lon },
    sensorCount: sensors.length,
    measurements,
    measurementCounts: counts,
    measurementSources,
    icaud,
    sensorList: sensors.map(s => ({
      id: s.id,
      name: s.name,
      source: s.source,
      sourceLabel: sourceLabel(s.source),
      deviceType: s.deviceType,
      lastSeen: s.lastSeen || null,
      // Quais variáveis esse sensor está contribuindo
      provides: Object.entries(s.measurements || {})
        .filter(([, v]) => v !== null && v !== undefined && !isNaN(v))
        .map(([k]) => k),
    })),
    // lastSeen = timestamp mais recente entre todos os sensores da cidade
    lastSeen: sensors
      .map(s => s.lastSeen)
      .filter(Boolean)
      .sort()
      .at(-1) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Para cada cidade, completa variáveis faltantes (ex: PM2.5) usando o sensor
 * mais próximo de OUTRA fonte dentro de CROSS_SOURCE_FILL_RADIUS_KM.
 *
 * Exemplo prático:
 *  - "São Paulo" foi formada por sensores Open-Meteo → tem temp/umid/vento, mas pm25 = null
 *  - Existe sensor Sensor.Community a 12 km com pm25 disponível
 *  → Importamos o sensor SC para a cidade. Sua média de PM2.5 entra no cálculo
 *    do ICAU-D, e measurementSources.pm25 fica registrado como Sensor.Community.
 *
 * Importante: só preenchemos variáveis que a cidade ainda NÃO tem. Não
 * sobrescrevemos dados próprios da cidade.
 */
function fillMissingMetricsAcrossSources(cityMap, allSensors) {
  // Indexa todos os sensores por fonte para busca rápida
  const fields = ['temperature', 'humidity', 'pm25', 'pm10', 'windSpeed'];

  for (const city of cityMap.values()) {
    // Quais fontes a cidade já usa (para não duplicar sensores próprios)
    const ownSensorIds = new Set(city.sensors.map(s => s.id));

    // Quais variáveis faltam
    const missing = fields.filter(f => {
      const hasValue = city.sensors.some(s => {
        const v = s.measurements?.[f];
        return v !== null && v !== undefined && !isNaN(v);
      });
      return !hasValue;
    });

    if (missing.length === 0) continue;

    // Para cada variável faltante, encontra o sensor mais próximo de outra fonte
    // que tem aquela variável e está dentro do raio
    for (const field of missing) {
      let nearest = null;
      let nearestDist = Infinity;

      for (const s of allSensors) {
        if (ownSensorIds.has(s.id)) continue;
        const v = s.measurements?.[field];
        if (v === null || v === undefined || isNaN(v)) continue;

        const dist = haversineDistance(city.lat, city.lon, s.location.lat, s.location.lon);
        if (dist <= CROSS_SOURCE_FILL_RADIUS_KM && dist < nearestDist) {
          nearest = s;
          nearestDist = dist;
        }
      }

      if (nearest) {
        // Adiciona o sensor à cidade. Como a média da cidade é por variável
        // (skipping nulls), as outras variáveis NÃO já presentes não são afetadas:
        // o sensor importado contribui apenas com as variáveis que ele tem.
        city.sensors.push(nearest);
        ownSensorIds.add(nearest.id);
      }
    }
  }
}

// Promise em vôo — evita múltiplas agregações concorrentes (cada uma dispara
// geocoding em paralelo e satura o Nominatim com requisições redundantes).
let inflightFetchAllCities = null;

/**
 * Função pura que agrega sensores em cidades.
 * Chamada diretamente na primeira vez e pelo revalidador em background.
 *
 * Single-flight: enquanto uma agregação está rodando, callers concorrentes
 * recebem a MESMA Promise em vez de iniciar uma nova.
 */
export async function fetchAllCities(sensorSnapshot = undefined) {
  if (inflightFetchAllCities) return inflightFetchAllCities;
  inflightFetchAllCities = _fetchAllCitiesInner(sensorSnapshot).finally(() => {
    inflightFetchAllCities = null;
  });
  return inflightFetchAllCities;
}

async function _fetchAllCitiesInner(sensorSnapshot = undefined) {
  logger.info('Agregando sensores por cidade...');

  let sensors = [];
  try {
    sensors = Array.isArray(sensorSnapshot) ? sensorSnapshot : await getAllSensors();
  } catch (err) {
    logger.error('Falha ao buscar sensores:', err.message);
    return [];
  }

  if (sensors.length === 0) {
    logger.warn('Nenhum sensor disponível para agregação');
    return [];
  }

  let cityMap;
  try {
    cityMap = await groupSensorsByCity(sensors);
  } catch (err) {
    logger.error('Falha ao agrupar por cidade:', err.message);
    return [];
  }

  // Cross-source fill: completa variáveis faltantes (PM2.5, vento, etc.)
  // usando sensores mais próximos de outras fontes
  try {
    fillMissingMetricsAcrossSources(cityMap, sensors);
  } catch (err) {
    logger.warn(`Cross-source fill falhou: ${err.message}`);
  }

  const cities = Array.from(cityMap.values())
    .filter(c => c.sensors.length >= 1)
    .map(c => {
      try { return computeCityStats(c); }
      catch (err) {
        logger.warn(`Erro ao computar stats para ${c.name}: ${err.message}`);
        return null;
      }
    })
    .filter(Boolean);

  // Métrica para log: quantas cidades têm PM2.5 agora
  const withPm25 = cities.filter(c => c.measurements.pm25 !== null).length;
  logger.info(`Agregadas ${cities.length} cidades (${withPm25} com PM2.5)`);
  return cities;
}

/**
 * Retorna todas as cidades com dados ambientais agregados.
 * Usa stale-while-revalidate: nunca bloqueia, sempre retorna algo.
 */
export async function getAllCities() {
  return cache.getOrSet(CACHE_KEY_CITIES, fetchAllCities, config.cache.ttlCities);
}

/**
 * Retorna cidades ordenadas por ICAU-D (maior primeiro)
 */
export async function getCitiesRanking(limit = 50) {
  const cacheKey = `${CACHE_KEY_RANKING}:${limit}`;
  return cache.getOrSet(cacheKey, () => buildRanking(limit), config.cache.ttlRanking);
}

// Mínimo de componentes ICAU-D que uma cidade precisa para entrar no ranking.
// Evita que cidades com 1 sensor único (ex: só PM2.5) fiquem no topo com score
// inflado por ter peso 100% em uma só variável.
const MIN_ICAUD_COMPONENTS_FOR_RANKING = 3;

export async function buildRanking(limit) {
  const cities = await getAllCities();

  if (!cities || cities.length === 0) {
    logger.warn('⚠️  Nenhuma cidade disponível para ranking');
    return [];
  }

  // Filtra cidades com score válido E pelo menos N componentes ICAU-D
  const validCities = cities.filter(c => {
    if (!c.icaud || c.icaud.score === null || c.icaud.score === undefined) return false;
    const components = c.icaud.availableComponents || [];
    return components.length >= MIN_ICAUD_COMPONENTS_FOR_RANKING;
  });

  if (validCities.length === 0) {
    logger.warn(`⚠️  Nenhuma cidade com ${MIN_ICAUD_COMPONENTS_FOR_RANKING}+ componentes ICAU-D. Total: ${cities.length}`);
    // Fallback: aceita qualquer cidade com score válido
    const anyScored = cities.filter(c => c.icaud && c.icaud.score !== null);
    return anyScored
      .sort((a, b) => (b.icaud.score || 0) - (a.icaud.score || 0))
      .slice(0, limit)
      .map((city, index) => ({ ...city, rank: index + 1 }));
  }

  logger.info(`✅ Ranking: ${validCities.length} cidades com ${MIN_ICAUD_COMPONENTS_FOR_RANKING}+ componentes`);

  return validCities
    .sort((a, b) => (b.icaud.score || 0) - (a.icaud.score || 0))
    .slice(0, limit)
    .map((city, index) => ({ ...city, rank: index + 1 }));
}

/**
 * Retorna dados detalhados de uma cidade pelo nome
 */
export async function getCityByName(cityName) {
  const cities = await getAllCities();
  const normalized = cityName.toLowerCase().trim();
  return cities.find(c =>
    c.name.toLowerCase() === normalized ||
    c.id === normalized
  ) || null;
}

