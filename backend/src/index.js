// src/index.js
// Application entry point - Express server setup

import express from 'express';
import { config } from './config/index.js';
import routes   from './routes.js';
import {
  corsMiddleware,
  compressionMiddleware,
  requestLogger,
  rateLimiter,
  addCacheStatsRoute,
  errorHandler,
  notFoundHandler,
} from './middleware/index.js';
import { logger } from './utils/logger.js';
import { connectMongo, saveSensorReadingsBatch } from './db/mongo.js';
import { setMongoCache } from './utils/cache.js';

const app = express();

// Necessário para express-rate-limit funcionar corretamente atrás de nginx/proxy
app.set('trust proxy', 1);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(corsMiddleware);
app.use(compressionMiddleware);
app.use(requestLogger);
app.use(express.json({ limit: '1mb' }));
app.use(rateLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
addCacheStatsRoute(app);
app.use('/api', routes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = config.server.port;
const server = app.listen(PORT, async () => {
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(`  🌿 IoT Environmental Platform Backend`);
  console.log(`  🚀 Servidor iniciando na porta: ${PORT}`);
  console.log(`  📍 URL: http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  logger.info(`🌿 IoT Environmental Platform API running on port ${PORT}`);
  logger.info(`   Environment: ${config.server.env}`);
  logger.info(`   CORS origin: ${config.server.corsOrigin}`);

  // Inicializar MongoDB (único storage)
  if (config.database.mongoEnabled) {
    logger.info('📦 Conectando ao MongoDB...');
    const connected = await connectMongo(config.database.mongoUri);

    if (connected) {
      const { mongoCacheManager } = await import('./db/mongo.js');
      setMongoCache(mongoCacheManager);
      logger.info('✅ MongoDB configurado como cache centralizado');
    }
  }

  // Warm-up na startup + scheduler a cada 1 hora
  await refreshData();
  startScheduler();
});

// Timeout generoso para não resetar conexões lentas na primeira carga
server.setTimeout(120_000);

/**
 * Busca todos os dados das APIs externas, persiste no MongoDB
 * e atualiza o cache. Chamado na startup e pelo scheduler.
 */
export async function refreshData() {
  logger.info('🔄 Atualizando dados das APIs externas...');
  try {
    const { cache }     = await import('./utils/cache.js');
    const { config }    = await import('./config/index.js');
    const sensorMod     = await import('./services/sensorService.js');
    const cityMod       = await import('./services/cityService.js');

    // 1. Sensores brutos → salvar histórico no MongoDB
    logger.info('🔄 [1/3] Buscando sensores das APIs...');
    let allSensorsRaw = [];
    try {
      allSensorsRaw = await sensorMod.fetchAllSensorsRaw();
      if (config.database.mongoEnabled && allSensorsRaw.length > 0) {
        await saveSensorReadingsBatch(allSensorsRaw);
        logger.info(`💾 ${allSensorsRaw.length} leituras salvas no MongoDB`);
      }
    } catch (err) {
      logger.warn(`⚠️  Erro ao buscar sensores brutos: ${err.message}`);
    }

    // 2. Sensores com ICAU-D completo → cache
    const sensors = await sensorMod.fetchAllSensors();
    if (sensors && sensors.length > 0) {
      await cache.set('sensors:all', sensors, config.cache.ttlSensors);
      logger.info(`✅ [1/3] ${sensors.length} sensores com ICAU-D em cache`);
    } else {
      logger.warn('⚠️  [1/3] Nenhum sensor retornado pelas APIs');
    }

    // 3. Cidades agregadas → cache
    logger.info('🔄 [2/3] Agregando cidades...');
    const cities = await cityMod.fetchAllCities();
    if (cities && cities.length > 0) {
      await cache.set('cities:aggregated', cities, config.cache.ttlCities);
      logger.info(`✅ [2/3] ${cities.length} cidades em cache`);
    }

    // 4. Ranking → cache
    logger.info('🔄 [3/3] Construindo ranking...');
    const ranking = await cityMod.buildRanking(50);
    if (ranking && ranking.length > 0) {
      await cache.set('cities:ranking:50', ranking, config.cache.ttlRanking);
      logger.info(`✅ [3/3] Ranking: ${ranking.length} cidades — plataforma pronta! 🌿`);
    }

    return true;
  } catch (err) {
    logger.warn(`⚠️  refreshData falhou: ${err.message}`);
    return false;
  }
}

/**
 * Agenda refreshData() para rodar a cada 1 hora.
 * Usa um intervalo simples — sem dependências externas.
 */
function startScheduler() {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 hora
  logger.info(`⏰ Scheduler iniciado — próxima atualização em 1h`);

  setInterval(async () => {
    logger.info('⏰ Scheduler: iniciando atualização horária dos dados...');
    const ok = await refreshData();
    logger.info(`⏰ Scheduler: atualização ${ok ? 'concluída ✅' : 'falhou ⚠️'}`);
  }, INTERVAL_MS);
}

export default app;
