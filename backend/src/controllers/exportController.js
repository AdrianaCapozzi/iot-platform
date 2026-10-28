import { once } from 'node:events';
import { getSensorReadingsCursor, isMongoConnected } from '../db/mongo.js';
import {
  parseSensorCsvFilters,
  SENSOR_CSV_HEADER,
  serializeSensorCsvRow,
} from '../utils/sensorCsv.js';

export function createSensorCsvExportHandler({
  isConnected = isMongoConnected,
  createCursor = getSensorReadingsCursor,
} = {}) {
  return async function exportSensorCsv(req, res) {
    let filters;
    try {
      filters = parseSensorCsvFilters(req.query);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Histórico indisponível: MongoDB não conectado.',
      });
    }

    let cursor;
    try {
      cursor = createCursor(filters);
      if (!cursor) {
        return res.status(503).json({
          success: false,
          error: 'Histórico indisponível: MongoDB não conectado.',
        });
      }

      res.status(200);
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="ecosense-readings.csv"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.write(`\uFEFF${SENSOR_CSV_HEADER}\r\n`);

      for await (const reading of cursor) {
        if (!res.write(`${serializeSensorCsvRow(reading)}\r\n`)) {
          await once(res, 'drain');
        }
      }
      return res.end();
    } catch {
      try {
        await cursor?.close?.();
      } catch {
        // Best-effort cursor cleanup; never surface driver details to the response.
      }

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error: 'Falha ao exportar o histórico ambiental.',
        });
      }
      return res.destroy();
    }
  };
}

export const exportSensorCsv = createSensorCsvExportHandler();
