// src/services/alertService.js
// Fase 3 do plano de dados: compara leituras atuais com o padrão histórico
// de cada sensor e sinaliza problemas de qualidade — sem modelo estatístico
// pesado, limiares simples o suficiente para um alerta ser confiável.

import { getAllSensors } from './sensorService.js';
import { getHistoricalSensorStats, getStuckSensors } from '../db/mongo.js';
import { logger } from '../utils/logger.js';

// PM2.5 atual pelo menos 1.6x a média histórica (e crescimento mínimo de
// 15 µg/m³) para não disparar em cidades onde a média já é baixa e qualquer
// ruído vira "pico"
const PM25_SPIKE_RATIO = 1.6;
const PM25_SPIKE_MIN_ABS = 15;

// Mínimo de leituras históricas pra confiar na média como baseline
const MIN_BASELINE_READINGS = 5;

/**
 * Alertas de pico de poluição: leitura atual muito acima da média histórica
 * do próprio sensor (últimos 7 dias).
 */
async function detectPollutionSpikes() {
  const [current, baseline] = await Promise.all([
    getAllSensors(),
    getHistoricalSensorStats(168),
  ]);

  if (!current || !baseline) return [];

  const baselineById = new Map(baseline.map(b => [b.id, b]));
  const alerts = [];

  for (const sensor of current) {
    const base = baselineById.get(sensor.id);
    const pm25 = sensor.measurements?.pm25;
    if (!base || base.readingCount < MIN_BASELINE_READINGS) continue;
    if (pm25 === null || pm25 === undefined || base.measurements.pm25 === null) continue;

    const avg = base.measurements.pm25;
    const isSpike = pm25 >= avg * PM25_SPIKE_RATIO && (pm25 - avg) >= PM25_SPIKE_MIN_ABS;
    if (isSpike) {
      alerts.push({
        type: 'pollution_spike',
        severity: 'warning',
        sensorId: sensor.id,
        name: sensor.name,
        city: sensor.location?.city,
        country: sensor.location?.country,
        message: `PM2.5 em ${pm25.toFixed(1)} µg/m³, ${(pm25 / avg).toFixed(1)}x acima da média histórica (${avg.toFixed(1)} µg/m³)`,
        current: pm25,
        baseline: Number(avg.toFixed(1)),
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

/**
 * Alertas de qualidade: sensor travado (mesmo valor repetido por horas).
 */
async function detectStuckSensorAlerts() {
  const stuck = await getStuckSensors(6, 3);
  return stuck.map(s => ({
    type: 'stuck_sensor',
    severity: 'info',
    sensorId: s.sensorId,
    name: s.name,
    city: s.city,
    country: s.country,
    message: `Sensor sem variação nas últimas ${s.hoursChecked}h (${s.readingCount} leituras idênticas) — possível falha`,
    lastSeen: s.lastSeen,
    detectedAt: new Date().toISOString(),
  }));
}

/**
 * Retorna todos os alertas ativos no momento, mais severos primeiro.
 */
export async function getAlerts() {
  try {
    const [spikes, stuck] = await Promise.all([
      detectPollutionSpikes().catch(err => { logger.debug('detectPollutionSpikes error:', err.message); return []; }),
      detectStuckSensorAlerts().catch(err => { logger.debug('detectStuckSensorAlerts error:', err.message); return []; }),
    ]);

    const severityOrder = { warning: 0, info: 1 };
    return [...spikes, ...stuck].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  } catch (err) {
    logger.warn('getAlerts failed:', err.message);
    return [];
  }
}
