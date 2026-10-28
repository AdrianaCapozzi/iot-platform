// src/db/mongo.js
// MongoDB connection and schemas for sensor data storage
// Graceful fallback if mongoose not installed

import { logger } from '../utils/logger.js';
import { RAW_PAYLOAD, SENSOR_SOURCES } from '../models/sensor.js';

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

if (isAvailable && mongoose) {
  const Schema = mongoose.Schema;
  const model = mongoose.model;

  // Schema para leitura histórica de sensores
  const sensorReadingSchema = new Schema(
    {
      sensorId: { type: String, required: true, index: true },
      source: { type: String, enum: SENSOR_SOURCES, required: true },
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
      rawPayload: mongoose.Schema.Types.Mixed,
      recordedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
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

  // Criar models
  SensorReading = model('SensorReading', sensorReadingSchema);
  CacheEntry = model('CacheEntry', cacheEntrySchema);
  GeocodeEntry = model('GeocodeEntry', geocodeEntrySchema);
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

export function isMongoConnected() {
  return Boolean(isAvailable && mongoose?.connection?.readyState === 1);
}

/**
 * Save a sensor reading snapshot
 */
export function mapSensorToReading(sensor) {
  return {
    sensorId: sensor.id,
    source: sensor.source,
    name: sensor.name,
    location: sensor.location,
    measurements: sensor.measurements,
    icaud: sensor.icaud,
    deviceType: sensor.deviceType,
    sensorCount: sensor.sensorCount,
    exposure: sensor.exposure,
    rawPayload: sensor[RAW_PAYLOAD] ?? undefined,
    recordedAt: new Date(sensor.lastSeen || Date.now()),
  };
}

export async function saveSensorReading(sensor) {
  if (!isAvailable || !SensorReading) return;

  try {
    const reading = new SensorReading(mapSensorToReading(sensor));
    await reading.save();
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
    const readings = sensors.map(mapSensorToReading);
    await SensorReading.insertMany(readings, { ordered: false });
  } catch (err) {
    logger.debug('SensorReading batch save error:', err.message);
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
 * Read-only cursor for CSV export from the existing SensorReading collection.
 */
export function getSensorReadingsCursor({ from, to, source } = {}) {
  if (!isMongoConnected() || !SensorReading) return null;

  const filter = { recordedAt: { $gte: from, $lte: to } };
  if (source) filter.source = source;

  return SensorReading.find(filter)
    .select('sensorId source name location measurements icaud deviceType sensorCount exposure recordedAt')
    .sort({ recordedAt: 1, sensorId: 1 })
    .lean()
    .cursor({ batchSize: 500 });
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
