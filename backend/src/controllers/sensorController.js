// src/controllers/sensorController.js

import { getAllSensors, getSensorsNear, getICAUDForLocation } from '../services/sensorService.js';
import { getAlerts } from '../services/alertService.js';
import { logger } from '../utils/logger.js';

/**
 * GET /sensors
 * Returns all active sensors with ICAU-D scores
 * Query params: source, minScore, limit
 */
export async function getSensors(req, res) {
  try {
    const { source, minScore, limit = 500 } = req.query;
    let sensors = await getAllSensors() || [];

    if (source) {
      sensors = sensors.filter(s => s.source === source);
    }

    if (minScore !== undefined) {
      const min = parseFloat(minScore);
      sensors = sensors.filter(s => s.icaud?.score !== null && s.icaud.score >= min);
    }

    sensors = sensors.slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      count: sensors.length,
      data: sensors,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('getSensors error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch sensors' });
  }
}

/**
 * GET /alerts
 * Picos de poluição e sensores com problema de qualidade (Fase 3)
 */
export async function getSensorAlerts(req, res) {
  try {
    const alerts = await getAlerts();
    res.json({
      success: true,
      count: alerts.length,
      data: alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('getSensorAlerts error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
  }
}

/**
 * GET /icau?lat=...&lon=...
 * Calculate ICAU-D for a specific coordinate
 */
export async function getICAUD(req, res) {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'lat and lon query parameters are required',
      });
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({ success: false, error: 'Invalid coordinates' });
    }

    const result = await getICAUDForLocation(latNum, lonNum);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('getICAUD error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to calculate ICAU-D' });
  }
}
