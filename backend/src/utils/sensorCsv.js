import { SENSOR_SOURCES } from '../models/sensor.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const SENSOR_HISTORY_RETENTION_DAYS = 30;

export const SENSOR_CSV_COLUMNS = Object.freeze([
  'recorded_at_utc',
  'sensor_id',
  'source',
  'name',
  'city',
  'country',
  'latitude',
  'longitude',
  'temperature_c',
  'humidity_pct',
  'pm25_ug_m3',
  'pm10_ug_m3',
  'wind_speed_m_s',
  'icaud_score',
  'icaud_classification',
  'device_type',
  'sensor_count',
  'exposure',
]);

export const SENSOR_CSV_HEADER = SENSOR_CSV_COLUMNS.join(',');

export class SensorCsvFilterError extends Error {}

function parseDateFilter(value, name, endOfDay = false) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || value.length === 0) {
    throw new SensorCsvFilterError(`Parâmetro "${name}" inválido.`);
  }

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const isTimestampWithTimezone =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value);
  if (!isDateOnly && !isTimestampWithTimezone) {
    throw new SensorCsvFilterError(
      `Parâmetro "${name}" deve ser uma data UTC ou timestamp ISO 8601 com fuso.`
    );
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new SensorCsvFilterError(`Parâmetro "${name}" não contém uma data válida.`);
  }
  if (isDateOnly && date.toISOString().slice(0, 10) !== value) {
    throw new SensorCsvFilterError(`Parâmetro "${name}" não contém uma data válida.`);
  }
  if (isDateOnly && endOfDay) date.setUTCHours(23, 59, 59, 999);
  return date;
}

export function parseSensorCsvFilters(query = {}, { now = new Date() } = {}) {
  const currentTime = now instanceof Date ? now.getTime() : Number.NaN;
  if (!Number.isFinite(currentTime)) {
    throw new TypeError('A referência de tempo precisa ser uma data válida.');
  }

  const from = parseDateFilter(query.from, 'from')
    ?? new Date(currentTime - SENSOR_HISTORY_RETENTION_DAYS * DAY_MS);
  const to = parseDateFilter(query.to, 'to', true) ?? new Date(currentTime);

  if (from.getTime() > to.getTime()) {
    throw new SensorCsvFilterError('A data inicial deve ser anterior ou igual à data final.');
  }
  if (from.getTime() > currentTime) {
    throw new SensorCsvFilterError('A data inicial não pode estar no futuro.');
  }
  if (from.getTime() < currentTime - SENSOR_HISTORY_RETENTION_DAYS * DAY_MS) {
    throw new SensorCsvFilterError('O período solicitado excede a retenção disponível de 30 dias.');
  }

  let source;
  if (query.source !== undefined && query.source !== '') {
    if (typeof query.source !== 'string' || !SENSOR_SOURCES.includes(query.source)) {
      throw new SensorCsvFilterError('Fonte inválida.');
    }
    source = query.source;
  }

  return { from, to, source };
}

function toUtcIso(value) {
  if (value === null || value === undefined || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? toUtcIso(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializeSensorCsvRow(reading) {
  const location = reading.location || {};
  const measurements = reading.measurements || {};
  const icaud = reading.icaud || {};

  return [
    toUtcIso(reading.recordedAt),
    reading.sensorId,
    reading.source,
    reading.name,
    location.city,
    location.country,
    location.lat,
    location.lon,
    measurements.temperature,
    measurements.humidity,
    measurements.pm25,
    measurements.pm10,
    measurements.windSpeed,
    icaud.score,
    icaud.classification,
    reading.deviceType,
    reading.sensorCount,
    reading.exposure,
  ].map(escapeCsvCell).join(',');
}
