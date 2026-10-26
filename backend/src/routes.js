// src/routes.js
// Central route definitions

import { Router } from 'express';
import { getSensors, getICAUD } from './controllers/sensorController.js';
import { getCities, getRanking, getCityDetail, exportCitiesCsv } from './controllers/cityController.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// Manual refresh trigger (útil para forçar atualização sem reiniciar)
router.post('/refresh', async (req, res) => {
  try {
    const { refreshData } = await import('./index.js');
    res.json({ success: true, message: 'Atualização iniciada em background' });
    refreshData(); // não await — roda em background
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Debug: verificar estado do sistema
router.get('/debug', async (req, res) => {
  const { getAllSensors } = await import('./services/sensorService.js');
  const { getAllCities } = await import('./services/cityService.js');
  const { cache } = await import('./utils/cache.js');

  const sensors = await getAllSensors() || [];
  const cities = await getAllCities() || [];
  const cacheStats = cache.getStats();

  res.json({
    success: true,
    data: {
      sensors: {
        total: sensors.length,
        withScore: sensors.filter(s => s.icaud?.score !== null).length,
      },
      cities: {
        total: cities.length,
        withScore: cities.filter(c => c.icaud?.score !== null).length,
        sample: cities.slice(0, 3).map(c => ({
          name: c.name,
          sensors: c.sensorCount,
          score: c.icaud?.score,
        })),
      },
      cache: cacheStats,
    },
  });
});

// Sensor routes
router.get('/sensors', getSensors);
router.get('/sensors/history', async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const hoursBack = period === 'month' ? 720 : 168; // 30 days or 7 days
    const { getHistoricalSensorStats } = await import('./db/mongo.js');
    const data = await getHistoricalSensorStats(hoursBack);
    if (!data) {
      return res.json({ success: true, count: 0, data: [], period });
    }
    res.json({ success: true, count: data.length, data, period });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch historical data' });
  }
});
router.get('/icau', getICAUD);

// City routes — static paths must precede /cities/:city
router.get('/cities/export.csv', exportCitiesCsv);
router.get('/cities', getCities);
router.get('/cities/ranking', getRanking);
router.get('/cities/:city', getCityDetail);

export default router;
