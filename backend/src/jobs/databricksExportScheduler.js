// implementando


import cron from 'node-cron';
import { exportPendingReadings } from '../services/databricksExportService.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export function startDatabricksExportJob() {
  if (!config.databricks.exportEnabled) {
    logger.info('[databricksExportScheduler] DATABRICKS_EXPORT_ENABLED=false — job não iniciado');
    return;
  }

  cron.schedule(config.databricks.exportCron, async () => {
    try {
      await exportPendingReadings();
    } catch (err) {
      logger.error(`[databricksExportScheduler] Falha no ciclo de export: ${err.message}`);
    }
  });

  logger.info(`[databricksExportScheduler] Job agendado: "${config.databricks.exportCron}"`);
}