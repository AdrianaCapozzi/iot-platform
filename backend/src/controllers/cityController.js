// src/controllers/cityController.js

import { getAllCities, getCitiesRanking, getCityByName } from '../services/cityService.js';
import { logger } from '../utils/logger.js';

function csvCell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // Prevent spreadsheet formula injection when opening CSV in Excel/Power BI.
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

function citiesToCsv(cities) {
  const columns = [
    ['cidade', c => c.name],
    ['pais', c => c.country],
    ['latitude', c => c.location?.lat],
    ['longitude', c => c.location?.lon],
    ['quantidade_sensores', c => c.sensorCount],
    ['temperatura_c', c => c.measurements?.temperature],
    ['umidade_percentual', c => c.measurements?.humidity],
    ['pm25_ug_m3', c => c.measurements?.pm25],
    ['pm10_ug_m3', c => c.measurements?.pm10],
    ['vento_m_s', c => c.measurements?.windSpeed],
    ['icaud_score', c => c.icaud?.score],
    ['icaud_classificacao', c => c.icaud?.classification],
    ['ultima_leitura', c => c.lastSeen],
    ['atualizado_em', c => c.updatedAt],
  ];
  const header = columns.map(([name]) => csvCell(name)).join(',');
  const rows = cities.map(city =>
    columns.map(([, getValue]) => csvCell(getValue(city))).join(',')
  );
  return [header, ...rows].join('\r\n') + '\r\n';
}

/**
 * GET /cities/export.csv
 * Exports current city aggregates for Power BI.
 * This is a snapshot of current API/cache data, not historical time series.
 */
export async function exportCitiesCsv(req, res) {
  try {
    let cities = await getAllCities() || [];
    const { country } = req.query;

    if (country) {
      cities = cities.filter(c =>
        c.country?.toLowerCase() === String(country).toLowerCase()
      );
    }

    if (cities.length === 0) {
      return res.status(503).json({
        success: false,
        error: 'Nenhum dado de cidade disponível para exportação no momento.',
      });
    }

    const csv = '\uFEFF' + citiesToCsv(cities);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ecosense_cidades.csv"');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(csv);
  } catch (err) {
    logger.error('exportCitiesCsv error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Falha ao exportar os dados ambientais.',
    });
  }
}

/**
 * GET /cities
 * Returns all cities with environmental data
 */
export async function getCities(req, res) {
  try {
    const { country, minSensors = 1 } = req.query;
    let cities = await getAllCities() || [];

    logger.info(`📍 getCities: Obtidas ${cities.length} cidades do cache`);

    if (country) {
      cities = cities.filter(c =>
        c.country?.toLowerCase() === country.toLowerCase()
      );
    }

    if (minSensors) {
      cities = cities.filter(c => c.sensorCount >= parseInt(minSensors, 10));
    }

    logger.info(`✅ getCities: Retornando ${cities.length} cidades (país: ${country || 'todas'}, min sensores: ${minSensors})`);

    res.json({
      success: true,
      count: cities.length,
      data: cities,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('❌ getCities error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch cities' });
  }
}

/**
 * GET /cities/ranking
 * Returns top cities ranked by ICAU-D score
 * Query params: limit (default 50)
 */
export async function getRanking(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    logger.info(`📊 getRanking: Buscando ranking com limit=${limit}`);

    const ranking = await getCitiesRanking(limit) || [];

    logger.info(`📊 getRanking: Obtidas ${ranking.length} cidades com score válido`);

    if (ranking.length === 0) {
      logger.warn(`⚠️ getRanking: Nenhuma cidade com score válido! Verifique se sensores estão sendo coletados.`);
      return res.status(202).json({
        success: true,
        count: 0,
        data: [],
        loading: true,
        message: 'Dados sendo carregados. Tente novamente em alguns instantes.',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      count: ranking.length,
      data: ranking,
      loading: false,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('getRanking error:', err.message);
    res.status(202).json({
      success: true,
      count: 0,
      data: [],
      loading: true,
      message: 'Dados temporariamente indisponíveis. Tente novamente em breve.',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * GET /cities/:city
 * Returns detailed data for a specific city
 */
export async function getCityDetail(req, res) {
  try {
    const { city } = req.params;
    const data = await getCityByName(decodeURIComponent(city));

    if (!data) {
      return res.status(404).json({
        success: false,
        error: `City '${city}' not found`,
      });
    }

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('getCityDetail error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch city data' });
  }
}
