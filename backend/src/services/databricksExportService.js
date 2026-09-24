// src/services/databricksExportService.js
//
// Exporta incrementalmente as leituras salvas por saveSensorReadingsBatch()
// (em db/mongo.js) para um Volume do Unity Catalog, consumido pelo Databricks
// Auto Loader. Usa a Databricks Files API (REST) em vez de S3 — não precisa
// de conta AWS nem IAM, só do token do próprio Databricks.
//
// Necessário porque SensorReading tem TTL de 30 dias — sem essa exportação,
// o histórico além desse período é perdido para sempre.

import { randomUUID } from 'crypto';
import { SensorReading, mongoCacheGet, mongoCacheSet } from '../db/mongo.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const WATERMARK_KEY = 'pipeline:databricks_export:watermark';
const WATERMARK_TTL_SECS = 90 * 24 * 60 * 60;

async function getWatermark() {
  const stored = await mongoCacheGet(WATERMARK_KEY);
  return stored ? new Date(stored) : new Date(0);
}

async function setWatermark(date) {
  await mongoCacheSet(WATERMARK_KEY, date.toISOString(), WATERMARK_TTL_SECS);
}

function toNdjson(readings) {
  return readings
    .map((r) =>
      JSON.stringify({
        sensor_id: r.sensorId,
        source: r.source,
        name: r.name,
        city: r.location?.city ?? null,
        country: r.location?.country ?? null,
        lat: r.location?.lat,
        lon: r.location?.lon,
        event_timestamp: r.recordedAt.toISOString(),
        temperature_c: r.measurements?.temperature ?? null,
        humidity_pct: r.measurements?.humidity ?? null,
        pm25: r.measurements?.pm25 ?? null,
        pm10: r.measurements?.pm10 ?? null,
        wind_speed: r.measurements?.windSpeed ?? null,
        icaud_score: r.icaud?.score ?? null,
        icaud_classification: r.icaud?.classification ?? null,
        device_type: r.deviceType ?? null,
        exposure: r.exposure ?? null,
        sensor_count: r.sensorCount ?? null,
      })
    )
    .join('\n');
}

/**
 * Sobe um arquivo pro Volume via Databricks Files API.
 * Doc: PUT /api/2.0/fs/files/{file_path}
 * https://docs.databricks.com/api/workspace/files/upload
 */
async function uploadFile(volumeFilePath, body) {
  const url = `${config.databricks.host}/api/2.0/fs/files${volumeFilePath}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.databricks.token}`,
      'Content-Type': 'application/octet-stream',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upload falhou (${res.status}) em ${volumeFilePath}: ${text}`);
  }
}

/**
 * Sobe um lote particionado por dia (event_date=YYYY-MM-DD/) dentro do
 * Volume — mesmo formato de particionamento que o Auto Loader espera.
 */
async function uploadBatch(readings) {
  const byDate = {};
  for (const r of readings) {
    const dateKey = r.recordedAt.toISOString().slice(0, 10);
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(r);
  }

  const uploads = Object.entries(byDate).map(async ([dateKey, group]) => {
    const fileName = `part-${randomUUID().slice(0, 8)}.json`;
    const volumeFilePath = `${config.databricks.volumePath}/event_date=${dateKey}/${fileName}`;
    await uploadFile(volumeFilePath, toNdjson(group));
    logger.info(`[databricksExportService] Upload: ${volumeFilePath} (${group.length} registros)`);
  });

  await Promise.all(uploads);
}

async function triggerDatabricksJob() {
  if (!config.databricks.host || !config.databricks.token || !config.databricks.jobId) return;

  const res = await fetch(`${config.databricks.host}/api/2.1/jobs/run-now`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.databricks.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ job_id: config.databricks.jobId }),
  });

  if (!res.ok) {
    logger.warn(`[databricksExportService] Falha ao disparar job Databricks: ${res.status}`);
  } else {
    logger.info('[databricksExportService] Job Databricks disparado');
  }
}

/**
 * Roda um ciclo de exportação incremental. Seguro pra rodar mesmo se o
 * Mongo/mongoose não estiver disponível (SensorReading fica null nesse caso).
 */
export async function exportPendingReadings() {
  if (!config.databricks.exportEnabled || !SensorReading) {
    return { exported: 0, skipped: true };
  }

  const since = await getWatermark();

  const pending = await SensorReading.find({ recordedAt: { $gt: since } })
    .sort({ recordedAt: 1 })
    .limit(config.databricks.exportBatchLimit)
    .lean();

  if (pending.length === 0) {
    logger.info('[databricksExportService] Nada novo para exportar');
    return { exported: 0 };
  }

  await uploadBatch(pending);

  const newWatermark = pending[pending.length - 1].recordedAt;
  await setWatermark(newWatermark);
  await triggerDatabricksJob();

  logger.info(`[databricksExportService] ${pending.length} leituras exportadas até ${newWatermark.toISOString()}`);
  return { exported: pending.length, watermark: newWatermark };
}