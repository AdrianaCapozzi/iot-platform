// src/db/mongo.js
// MongoDB connection and schemas for sensor data storage
// Graceful fallback if mongoose not installed

import { logger } from '../utils/logger.js';

let mongoose = null;
let isAvailable = false;

try {
  const mongooseModule = await import('mongoose');
  mongoose = mongooseModule.default;
  isAvailable = true;
} catch (err) {
  logger.warn('⚠️  Mongoose não instalado - MongoDB desabilitado');
  logger.warn('   Para ativar: npm install mongoose');
}

// Models (null se mongoose não disponível)
let SensorReading = null;
let CacheEntry = null;
let GeocodeEntry = null;
let CityHourlyStat = null;

if (isAvailable && mongoose) {
  const Schema = mongoose.Schema;
  const model = mongoose.model;

  // Schema para leitura histórica de sensores
  const sensorReadingSchema = new Schema(
    {
      sensorId: { type: String, required: true, index: true },
      source: { type: String, enum: ['sensor_community', 'open_meteo', 'open_meteo_aq'], required: true },
      name: String,
      location: {
        lat: { type: Number, required: true },
        lon: { type: Number, required: true },
        city: String,
        country: String,
      },
      measurements: {
        temperature: Number,
        humidity: Number,
        pm25: Number,
        pm10: Number,
        windSpeed: Number,
      },
      icaud: {
        score: Number,
        classification: String,
      },
      deviceType: String,
      sensorCount: Number,
      exposure: { type: String, enum: ['indoor', 'outdoor', null] },
      recordedAt: { type: Date, default: Date.now },
      // Hora cheia de recordedAt (minutos/segundos zerados) — usada como chave de
      // idempotência: um sensor só pode ter 1 leitura por hora, mesmo que o job de
      // coleta rode mais de uma vez no período.
      readingHour: { type: Date, required: true },
    },
    { timestamps: true }
  );

  // Idempotência: no máximo 1 leitura por sensor por hora.
  // partialFilterExpression (não sparse) porque documentos já existentes (gravados
  // antes desta mudança) têm sensorId mas não readingHour — um índice sparse comum
  // ainda os inclui nesse caso (só ignora quando TODOS os campos estão ausentes),
  // causando erro de duplicidade no build. O partial index exclui corretamente
  // qualquer doc sem readingHour.
  sensorReadingSchema.index(
    { sensorId: 1, readingHour: 1 },
    { unique: true, partialFilterExpression: { readingHour: { $exists: true } } }
  );

  // TTL index — auto-delete readings older than 30 days
  sensorReadingSchema.index({ recordedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

  // Schema para cache persistente
  const cacheEntrySchema = new Schema(
    {
      key: { type: String, required: true, unique: true },
      value: mongoose.Schema.Types.Mixed,
      expiresAt: { type: Date },
    },
    { timestamps: true }
  );

  // TTL index — auto-delete expired entries
  cacheEntrySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  // Schema para geocode cache (lat/lon → cidade)
  const geocodeEntrySchema = new Schema(
    {
      key: { type: String, required: true, unique: true }, // "lat,lon" com 2 casas decimais
      city: { type: String, default: null },
    },
    { timestamps: true }
  );

  // Resumo horário por cidade — Fase 2 do plano de dados: em vez de recalcular
  // médias sobre sensorreadings bruto a cada request, guardamos 1 doc por
  // cidade por hora já pronto (ICAU-D + medições agregadas). É a base do
  // histórico "de verdade" nos gráficos.
  const cityHourlyStatSchema = new Schema(
    {
      city: { type: String, required: true },
      country: String,
      hour: { type: Date, required: true }, // hora cheia, mesma convenção de readingHour
      location: {
        lat: Number,
        lon: Number,
      },
      measurements: {
        temperature: Number,
        humidity: Number,
        pm25: Number,
        pm10: Number,
        windSpeed: Number,
      },
      icaud: {
        score: Number,
        classification: String,
      },
      sensorCount: Number,
    },
    { timestamps: true }
  );

  cityHourlyStatSchema.index({ city: 1, hour: 1 }, { unique: true });
  cityHourlyStatSchema.index({ hour: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 }); // 400 dias

  // Criar models
  SensorReading   = model('SensorReading', sensorReadingSchema);
  CacheEntry      = model('CacheEntry', cacheEntrySchema);
  GeocodeEntry    = model('GeocodeEntry', geocodeEntrySchema);
  CityHourlyStat  = model('CityHourlyStat', cityHourlyStatSchema);
}

/**
 * Connect to MongoDB
 */
export async function connectMongo(mongoUri) {
  if (!isAvailable) {
    logger.warn('MongoDB desabilitado - conexão pulada');
    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('MongoDB connected successfully');
    return true;
  } catch (err) {
    logger.error('MongoDB connection failed:', err.message);
    return false;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectMongo() {
  if (!isAvailable) return;

  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (err) {
    logger.error('MongoDB disconnect error:', err.message);
  }
}

/**
 * Trunca uma data para a hora cheia (zera minutos/segundos/ms).
 * Usado como chave de idempotência das leituras.
 */
function toReadingHour(date) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

/**
 * sensor.icaud.classification vem como objeto completo ({min, max, label, color,
 * emoji}) de models/icaud.js, mas o schema histórico guarda só o rótulo (String).
 * Sem isso, o Mongoose falha o cast silenciosamente e a leitura inteira não é salva.
 */
function toStoredIcaud(icaud) {
  if (!icaud) return { score: null, classification: null };
  return {
    score: icaud.score ?? null,
    classification: icaud.classification?.label ?? null,
  };
}

/**
 * Save a sensor reading snapshot
 */
export async function saveSensorReading(sensor) {
  if (!isAvailable || !SensorReading) return;

  try {
    const recordedAt = new Date(sensor.lastSeen || Date.now());
    await SensorReading.updateOne(
      { sensorId: sensor.id, readingHour: toReadingHour(recordedAt) },
      {
        $set: {
          source: sensor.source,
          name: sensor.name,
          location: sensor.location,
          measurements: sensor.measurements,
          icaud: toStoredIcaud(sensor.icaud),
          deviceType: sensor.deviceType,
          sensorCount: sensor.sensorCount,
          exposure: sensor.exposure,
          recordedAt,
        },
      },
      { upsert: true }
    );
  } catch (err) {
    logger.debug('SensorReading save error:', err.message);
  }
}

/**
 * Save multiple sensor readings in batch
 */
export async function saveSensorReadingsBatch(sensors) {
  if (!isAvailable || !SensorReading || sensors.length === 0) return;

  try {
    const ops = sensors.map(sensor => {
      const recordedAt = new Date(sensor.lastSeen || Date.now());
      return {
        updateOne: {
          filter: { sensorId: sensor.id, readingHour: toReadingHour(recordedAt) },
          update: {
            $set: {
              source: sensor.source,
              name: sensor.name,
              location: sensor.location,
              measurements: sensor.measurements,
              icaud: toStoredIcaud(sensor.icaud),
              deviceType: sensor.deviceType,
              sensorCount: sensor.sensorCount,
              exposure: sensor.exposure,
              recordedAt,
            },
          },
          upsert: true,
        },
      };
    });
    await SensorReading.bulkWrite(ops, { ordered: false });
  } catch (err) {
    logger.debug('SensorReading batch save error:', err.message);
  }
}

/**
 * Salva o resumo horário de cada cidade (1 doc por cidade por hora, upsert).
 * Chamado logo após fetchAllCities() em refreshData(), reaproveitando os
 * objetos de cidade já computados — não faz nenhuma query extra de sensores.
 */
export async function saveCityHourlyStats(cities) {
  if (!isAvailable || !CityHourlyStat || !cities || cities.length === 0) return;

  try {
    const hour = toReadingHour(new Date());
    const ops = cities
      .filter(c => c.name && c.location)
      .map(city => ({
        updateOne: {
          filter: { city: city.name, hour },
          update: {
            $set: {
              country: city.country,
              location: { lat: city.location.lat, lon: city.location.lon },
              measurements: city.measurements,
              icaud: {
                score: city.icaud?.score ?? null,
                classification: city.icaud?.classification?.label ?? null,
              },
              sensorCount: city.sensorCount,
            },
          },
          upsert: true,
        },
      }));
    if (ops.length === 0) return;
    await CityHourlyStat.bulkWrite(ops, { ordered: false });
  } catch (err) {
    logger.debug('CityHourlyStat batch save error:', err.message);
  }
}

/**
 * Histórico de resumos horários de uma cidade nos últimos N dias — já vem
 * pronto do banco, sem recalcular nada sobre os dados brutos.
 */
export async function getCityHourlyHistory(cityName, daysBack = 7) {
  if (!isAvailable || !CityHourlyStat) return [];

  try {
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    return await CityHourlyStat.find({
      city: cityName,
      hour: { $gte: since },
    }).sort({ hour: 1 }).lean();
  } catch (err) {
    logger.debug('getCityHourlyHistory error:', err.message);
    return [];
  }
}

/**
 * Get sensor readings history for a sensor
 */
export async function getSensorReadingsHistory(sensorId, hoursBack = 24) {
  if (!isAvailable || !SensorReading) return [];

  try {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return await SensorReading.find({
      sensorId,
      recordedAt: { $gte: since },
    }).sort({ recordedAt: -1 });
  } catch (err) {
    logger.debug('getSensorReadingsHistory error:', err.message);
    return [];
  }
}

/**
 * Get sensor readings history for a city (by location proximity)
 */
export async function getSensorReadingsNearLocation(lat, lon, radiusKm = 25, hoursBack = 24) {
  if (!isAvailable || !SensorReading) return [];

  try {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const radiusDegrees = radiusKm / 111; // 1 degree ~ 111km

    return await SensorReading.find({
      'location.lat': { $gte: lat - radiusDegrees, $lte: lat + radiusDegrees },
      'location.lon': { $gte: lon - radiusDegrees, $lte: lon + radiusDegrees },
      recordedAt: { $gte: since },
    }).sort({ recordedAt: -1 });
  } catch (err) {
    logger.debug('getSensorReadingsNearLocation error:', err.message);
    return [];
  }
}

/**
 * Cache entry operations (alternative to Redis)
 */
export async function mongoCacheGet(key) {
  if (!isAvailable || !CacheEntry) return null;

  try {
    const entry = await CacheEntry.findOne({
      key,
      expiresAt: { $gt: new Date() },
    });
    return entry ? entry.value : null;
  } catch (err) {
    logger.debug('mongoCacheGet error:', err.message);
    return null;
  }
}

export async function mongoCacheSet(key, value, ttlSecs = 3600) {
  if (!isAvailable || !CacheEntry) return;

  try {
    const expiresAt = new Date(Date.now() + ttlSecs * 1000);
    await CacheEntry.findOneAndUpdate(
      { key },
      { key, value, expiresAt },
      { upsert: true }
    );
  } catch (err) {
    logger.debug('mongoCacheSet error:', err.message);
  }
}

export async function mongoCacheDel(key) {
  if (!isAvailable || !CacheEntry) return;

  try {
    await CacheEntry.deleteOne({ key });
  } catch (err) {
    logger.debug('mongoCacheDel error:', err.message);
  }
}

export async function mongoCacheDelPattern(pattern) {
  if (!isAvailable || !CacheEntry) return;

  try {
    const regex = new RegExp(pattern);
    await CacheEntry.deleteMany({ key: { $regex: regex } });
  } catch (err) {
    logger.debug('mongoCacheDelPattern error:', err.message);
  }
}

export async function mongoCacheFlush() {
  if (!isAvailable || !CacheEntry) return;

  try {
    await CacheEntry.deleteMany({});
    logger.info('Cache flushed');
  } catch (err) {
    logger.debug('mongoCacheFlush error:', err.message);
  }
}

/**
 * Cache manager object (singleton pattern)
 * Wraps MongoDB cache operations for unified interface
 */
export const mongoCacheManager = {
  mongoCacheGet,
  mongoCacheSet,
  mongoCacheDel,
  mongoCacheDelPattern,
  flush: mongoCacheFlush,
};

/**
 * Cleanup old readings (periodicamente)
 */
export async function cleanupOldReadings(daysBack = 30) {
  if (!isAvailable || !SensorReading) return;

  try {
    const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const result = await SensorReading.deleteMany({ recordedAt: { $lt: cutoff } });
    logger.info(`Cleaned up ${result.deletedCount} old sensor readings`);
  } catch (err) {
    logger.error('cleanupOldReadings error:', err.message);
  }
}

/**
 * Detecta sensores "travados": mesmo valor de PM2.5 e temperatura em todas as
 * leituras de uma janela de tempo, com leituras suficientes pra não ser
 * coincidência (Fase 3 — controle de qualidade dos dados).
 */
export async function getStuckSensors(hoursBack = 6, minReadings = 3) {
  if (!isAvailable || !SensorReading) return [];

  try {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const groups = await SensorReading.aggregate([
      // Só sensores físicos reais — fontes baseadas em modelo (open_meteo,
      // open_meteo_aq) legitimamente repetem valor entre leituras próximas,
      // o que geraria falso-positivo de "travado".
      { $match: { recordedAt: { $gte: since }, source: 'sensor_community' } },
      { $sort: { recordedAt: -1 } },
      {
        $group: {
          _id: '$sensorId',
          name: { $first: '$name' },
          city: { $first: '$location.city' },
          country: { $first: '$location.country' },
          readingCount: { $sum: 1 },
          distinctPm25: { $addToSet: '$measurements.pm25' },
          distinctTemp: { $addToSet: '$measurements.temperature' },
          lastSeen: { $max: '$recordedAt' },
        },
      },
      { $match: { readingCount: { $gte: minReadings } } },
    ]);

    return groups
      .filter(g => {
        // "travado" = 1 único valor não-nulo repetido em todas as leituras,
        // pra pelo menos uma das duas métricas
        const pm25Stuck = g.distinctPm25.filter(v => v !== null).length === 1 && g.distinctPm25.length <= 1;
        const tempStuck = g.distinctTemp.filter(v => v !== null).length === 1 && g.distinctTemp.length <= 1;
        return pm25Stuck || tempStuck;
      })
      .map(g => ({
        sensorId: g._id,
        name: g.name,
        city: g.city,
        country: g.country,
        readingCount: g.readingCount,
        hoursChecked: hoursBack,
        lastSeen: g.lastSeen,
      }));
  } catch (err) {
    logger.debug('getStuckSensors error:', err.message);
    return [];
  }
}

/**
 * Get aggregated sensor stats for a time period (historical averages from MongoDB)
 */
export async function getHistoricalSensorStats(hoursBack = 168) {
  if (!isAvailable || !SensorReading) return null;

  try {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const results = await SensorReading.aggregate([
      { $match: { recordedAt: { $gte: since } } },
      {
        $group: {
          _id: '$sensorId',
          name: { $last: '$name' },
          source: { $last: '$source' },
          lat: { $last: '$location.lat' },
          lon: { $last: '$location.lon' },
          city: { $last: '$location.city' },
          country: { $last: '$location.country' },
          avgTemperature: { $avg: '$measurements.temperature' },
          avgHumidity: { $avg: '$measurements.humidity' },
          avgPm25: { $avg: '$measurements.pm25' },
          avgWindSpeed: { $avg: '$measurements.windSpeed' },
          avgScore: { $avg: '$icaud.score' },
          readingCount: { $sum: 1 },
          lastSeen: { $max: '$recordedAt' },
          deviceType: { $last: '$deviceType' },
          exposure: { $last: '$exposure' },
          sensorCount: { $last: '$sensorCount' },
        },
      },
    ]);

    return results.map(r => ({
      id: r._id,
      name: r.name,
      source: r.source,
      location: { lat: r.lat, lon: r.lon, city: r.city, country: r.country },
      measurements: {
        temperature: r.avgTemperature,
        humidity: r.avgHumidity,
        pm25: r.avgPm25,
        windSpeed: r.avgWindSpeed,
      },
      icaud: { score: r.avgScore, classification: null },
      deviceType: r.deviceType,
      exposure: r.exposure,
      sensorCount: r.sensorCount,
      lastSeen: r.lastSeen,
      readingCount: r.readingCount,
    }));
  } catch (err) {
    logger.debug('getHistoricalSensorStats error:', err.message);
    return null;
  }
}

// ─── Geocode cache operations ─────────────────────────────────────────────
export async function geocodeCacheGet(key) {
  if (!isAvailable || !GeocodeEntry) return undefined;
  try {
    const entry = await GeocodeEntry.findOne({ key });
    return entry ? entry.city : undefined;
  } catch (err) {
    logger.debug('geocodeCacheGet error:', err.message);
    return undefined;
  }
}

export async function geocodeCacheSet(key, city) {
  if (!isAvailable || !GeocodeEntry) return;
  try {
    await GeocodeEntry.findOneAndUpdate(
      { key },
      { key, city },
      { upsert: true }
    );
  } catch (err) {
    logger.debug('geocodeCacheSet error:', err.message);
  }
}

export async function geocodeCacheCount() {
  if (!isAvailable || !GeocodeEntry) return 0;
  try {
    return await GeocodeEntry.countDocuments();
  } catch { return 0; }
}

export { SensorReading, CacheEntry, GeocodeEntry };
