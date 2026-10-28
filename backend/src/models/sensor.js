// src/models/sensor.js
// Sensor data model - normalized schema shared across all data sources

/**
 * Faixas físicas plausíveis para cada variável.
 * Sensor.Community tem leituras corrompidas (ex: temperatura 668°C, umidade 722%)
 * que precisam ser descartadas antes de entrar em qualquer agregação/ICAU-D.
 *
 * Observação: PM2.5 e PM10 podem ter picos altos em incêndios (>500 µg/m³),
 * mas valores >1000 são quase certamente sensor com falha óptica/poeira.
 */
const PLAUSIBLE_RANGES = {
  temperature: { min: -50,  max: 60   },  // °C
  humidity:    { min: 0,    max: 100  },  // %
  pm25:        { min: 0,    max: 1000 },  // µg/m³
  pm10:        { min: 0,    max: 2000 },  // µg/m³
  windSpeed:   { min: 0,    max: 100  },  // m/s (~360 km/h)
};

export const SENSOR_SOURCES = Object.freeze([
  'sensor_community',
  'open_meteo',
  'open_meteo_aq',
]);

// Symbol metadata survives object spreads inside the backend but is omitted by
// JSON serialization, so source payloads are not exposed by the existing API.
export const RAW_PAYLOAD = Symbol.for('ecosense.rawPayload');

export function attachRawPayload(sensor, rawPayload) {
  Object.defineProperty(sensor, RAW_PAYLOAD, {
    value: rawPayload,
    enumerable: true,
  });
  return sensor;
}

function inRange(field, val) {
  if (val === null || val === undefined || isNaN(val)) return false;
  const r = PLAUSIBLE_RANGES[field];
  if (!r) return true;
  return val >= r.min && val <= r.max;
}

/**
 * Parse a float and validate against plausible physical range for the field.
 * Out-of-range values are coerced to null — eles não devem entrar em médias
 * nem no cálculo de ICAU-D.
 */
function safeMeasurement(field, val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return inRange(field, n) ? n : null;
}

/**
 * Create a normalized sensor object
 * All external API responses are mapped to this schema
 *
 * @param {object} raw
 * @returns {object} Normalized sensor
 */
export function createSensor({
  id,
  source,        // one of SENSOR_SOURCES
  name,
  lat,
  lon,
  city,
  country,
  temperature,   // °C
  humidity,      // %
  pm25,          // µg/m³
  pm10,          // µg/m³
  windSpeed,     // m/s
  lastSeen,      // ISO string
  icaud = null,  // calculated later
  deviceType = null,  // ex: 'senseBox', 'SDS011+DHT22', 'Weather Station'
  sensorCount = null, // número de sensores físicos
  exposure = null,    // 'indoor' | 'outdoor' | null
}) {
  return {
    id: String(id),
    source,
    name: name || `Sensor ${id}`,
    location: {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      city: city || null,
      country: country || null,
    },
    measurements: {
      temperature: safeMeasurement('temperature', temperature),
      humidity:    safeMeasurement('humidity',    humidity),
      pm25:        safeMeasurement('pm25',        pm25),
      pm10:        safeMeasurement('pm10',        pm10),
      windSpeed:   safeMeasurement('windSpeed',   windSpeed),
    },
    lastSeen: lastSeen || new Date().toISOString(),
    icaud,
    deviceType,
    sensorCount,
    exposure,
  };
}

/**
 * Check if a sensor has been active within the given hours
 */
export function isActive(sensor, maxAgeHours = 2) {
  if (!sensor.lastSeen) return false;
  const ageMs = Date.now() - new Date(sensor.lastSeen).getTime();
  return ageMs <= maxAgeHours * 60 * 60 * 1000;
}

/**
 * Check if sensor has at least one valid measurement
 */
export function hasValidMeasurements(sensor) {
  const m = sensor.measurements;
  return (
    m.temperature !== null ||
    m.humidity    !== null ||
    m.pm25        !== null ||
    m.pm10        !== null
  );
}

/**
 * Check if sensor has ALL 4 ICAU-D components
 * Temperature, Humidity, Air Quality (PM2.5 or PM10), Wind Speed
 */
export function hasAllICAUDComponents(sensor) {
  const m = sensor.measurements;
  const hasTemp = m.temperature !== null;
  const hasHumidity = m.humidity !== null;
  const hasAirQuality = m.pm25 !== null || m.pm10 !== null;
  const hasWind = m.windSpeed !== null;

  return hasTemp && hasHumidity && hasAirQuality && hasWind;
}
