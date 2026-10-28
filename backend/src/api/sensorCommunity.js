// src/api/sensorCommunity.js
// Adapter for Sensor.Community (Luftdaten) API
// https://data.sensor.community/airrohr/v1/filter/

import axios from 'axios';
import { config } from '../config/index.js';
import { attachRawPayload, createSensor } from '../models/sensor.js';
import { logger } from '../utils/logger.js';

const BASE_URL = config.apis.sensorCommunity.baseUrl;

// Sensor Community value types
const VALUE_TYPE_MAP = {
  temperature: ['temperature', 'temp'],
  humidity:    ['humidity'],
  pm25:        ['P2', 'pm25', 'PM2.5'],
  pm10:        ['P1', 'pm10', 'PM10'],
};

/**
 * Extract a sensor value from sensordatavalues array
 */
function extractValue(sensordatavalues = [], keys) {
  for (const entry of sensordatavalues) {
    if (keys.some(k => entry.value_type === k)) {
      const val = parseFloat(entry.value);
      return isNaN(val) ? null : val;
    }
  }
  return null;
}

/**
 * Fetch Sensor.Community data filtered by sensor type
 * Uses type=SDS011 (PM sensor) + DHT22 (temp/humidity)
 */
export async function fetchSensorCommunitySensors(options = {}) {
  const { limit = config.sensors.maxPerSource } = options;

  try {
    logger.info('🌍 Sensor.Community: Buscando sensores globalmente...');

    // Fetch PM sensors (SDS011 is most common PM sensor)
    const [pmResponse, tempResponse] = await Promise.allSettled([
      axios.get(`${BASE_URL}/type=SDS011`, { timeout: 20000 }),
      axios.get(`${BASE_URL}/type=DHT22`,  { timeout: 20000 }),
    ]);

    const pmData   = pmResponse.status   === 'fulfilled' ? pmResponse.value.data   : [];
    const tempData = tempResponse.status === 'fulfilled' ? tempResponse.value.data : [];

    if (!Array.isArray(pmData) || pmData.length === 0) {
      logger.warn('Sensor.Community returned no PM data');
      return [];
    }

    logger.info(`Sensor.Community: ${pmData.length} PM sensors, ${tempData.length} temp sensors`);

    // Build a lookup map for temp sensors by location proximity
    const tempMap = new Map();
    for (const entry of (Array.isArray(tempData) ? tempData : [])) {
      const loc = entry.location;
      if (!loc) continue;
      const key = `${parseFloat(loc.latitude).toFixed(3)},${parseFloat(loc.longitude).toFixed(3)}`;
      tempMap.set(key, entry);
    }

    // Map PM entries and merge temperature data
    const sensors = [];
    const seen = new Set();

    for (const entry of pmData.slice(0, limit)) {
      const loc = entry.location;
      if (!loc?.latitude || !loc?.longitude) continue;

      const lat = parseFloat(loc.latitude);
      const lon = parseFloat(loc.longitude);
      if (isNaN(lat) || isNaN(lon)) continue;

      // Deduplicate by sensor ID
      const sensorId = `sc_${entry.sensor?.id || entry.id}`;
      if (seen.has(sensorId)) continue;
      seen.add(sensorId);

      // Try to find matching temp data by location
      const locKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
      const tempEntry = tempMap.get(locKey) || null;
      const tempValues = tempEntry?.sensordatavalues || [];
      const allValues  = [...(entry.sensordatavalues || []), ...tempValues];

      const sensor = createSensor({
        id:          sensorId,
        source:      'sensor_community',
        name:        `SC-${entry.sensor?.id || entry.id}`,
        lat,
        lon,
        city:        loc.city || null,
        country:     loc.country || null,
        temperature: extractValue(allValues, VALUE_TYPE_MAP.temperature),
        humidity:    extractValue(allValues, VALUE_TYPE_MAP.humidity),
        pm25:        extractValue(allValues, VALUE_TYPE_MAP.pm25),
        pm10:        extractValue(allValues, VALUE_TYPE_MAP.pm10),
        windSpeed:   null,
        lastSeen:    entry.timestamp || new Date().toISOString(),
        deviceType:  entry.sensor?.sensor_type?.name || 'SDS011',
        sensorCount: 2,
        exposure:    'outdoor',
      });
      sensors.push(attachRawPayload(sensor, {
        pm: entry,
        temperature: tempEntry,
      }));
    }

    return sensors;
  } catch (err) {
    logger.error('Sensor.Community fetch failed:', err.message);
    return [];
  }
}
