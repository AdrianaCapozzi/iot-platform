import test from 'node:test';
import assert from 'node:assert/strict';
import { attachRawPayload, RAW_PAYLOAD } from '../src/models/sensor.js';
import {
  escapeCsvCell,
  parseSensorCsvFilters,
  SENSOR_CSV_HEADER,
  serializeSensorCsvRow,
  SensorCsvFilterError,
} from '../src/utils/sensorCsv.js';
import { createSensorCsvExportHandler } from '../src/controllers/exportController.js';
import { isValidBearerToken } from '../src/middleware/manualRefreshAuth.js';
import { createRefreshCoordinator } from '../src/services/refreshCoordinator.js';
import { getSensorReadingsCursor, isMongoConnected } from '../src/db/mongo.js';
import routes from '../src/routes.js';
import { readFileSync } from 'node:fs';

function createResponse() {
  const chunks = [];
  return {
    chunks,
    headers: {},
    headersSent: false,
    statusCode: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    set(headers) {
      Object.assign(this.headers, headers);
      return this;
    },
    json(body) {
      this.body = body;
      this.headersSent = true;
      return this;
    },
    write(chunk) {
      chunks.push(String(chunk));
      this.headersSent = true;
      return true;
    },
    end() {
      this.ended = true;
      return this;
    },
    destroy() {
      this.destroyed = true;
    },
  };
}

test('raw API payload survives backend spreads but is absent from JSON responses', () => {
  const rawPayload = { apiField: 'source-only-value' };
  const sensor = attachRawPayload({ id: 'sensor-fixture' }, rawPayload);
  const enriched = { ...sensor, icaud: { score: 50 } };

  assert.strictEqual(enriched[RAW_PAYLOAD], rawPayload);
  assert.doesNotMatch(JSON.stringify(enriched), /apiField|source-only-value/);
});

test('Sensor.Community and Open-Meteo adapters attach the original response records', () => {
  const sensorCommunity = readFileSync(
    new URL('../src/api/sensorCommunity.js', import.meta.url),
    'utf8'
  );
  const openMeteo = readFileSync(
    new URL('../src/api/brazilSensors.js', import.meta.url),
    'utf8'
  );

  assert.match(sensorCommunity, /attachRawPayload\(sensor,\s*\{\s*pm:\s*entry,\s*temperature:\s*tempEntry/s);
  assert.match(openMeteo, /attachRawPayload\(sensor,\s*results\[i\]\)/);
  assert.match(openMeteo, /attachRawPayload\(sensor,\s*response\.data\)/);
});

test('CSV cells escape commas, quotes and line breaks without losing accents', () => {
  assert.equal(
    escapeCsvCell('São Paulo, "zona 1"\r\nestação'),
    '"São Paulo, ""zona 1""\r\nestação"'
  );
});

test('CSV row converts offsets to UTC and preserves zero-valued measurements', () => {
  const row = serializeSensorCsvRow({
    recordedAt: '2026-06-01T00:00:00-03:00',
    sensorId: 'id,1',
    source: 'open_meteo_aq',
    name: 'Sensor "Centro"',
    location: { city: 'São Paulo, SP', country: 'BR', lat: -3.7, lon: -38.5 },
    measurements: { temperature: 0, humidity: null, pm25: 12.5, pm10: 0 },
    icaud: { score: 0, classification: 'Bom' },
    deviceType: 'CAMS',
    sensorCount: 1,
    exposure: 'outdoor',
  });

  assert.equal(
    row,
    '2026-06-01T03:00:00.000Z,"id,1",open_meteo_aq,"Sensor ""Centro""","São Paulo, SP",BR,-3.7,-38.5,0,,12.5,0,,0,Bom,CAMS,1,outdoor'
  );
  assert.equal(SENSOR_CSV_HEADER.split(',').length, 18);
});

test('CSV filters default to the retained 30-day window and validate source/date filters', () => {
  const now = new Date('2026-10-27T12:00:00.000Z');
  const defaults = parseSensorCsvFilters({}, { now });
  assert.equal(defaults.from.toISOString(), '2026-09-27T12:00:00.000Z');
  assert.equal(defaults.to.toISOString(), now.toISOString());
  assert.equal(defaults.source, undefined);

  const selected = parseSensorCsvFilters({
    from: '2026-10-01',
    to: '2026-10-02',
    source: 'open_meteo_aq',
  }, { now });
  assert.equal(selected.from.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(selected.to.toISOString(), '2026-10-02T23:59:59.999Z');
  assert.equal(selected.source, 'open_meteo_aq');

  assert.throws(
    () => parseSensorCsvFilters({ from: '2026-08-01' }, { now }),
    SensorCsvFilterError
  );
  assert.throws(
    () => parseSensorCsvFilters({ from: '2026-10-01T00:00:00' }, { now }),
    SensorCsvFilterError
  );
  assert.throws(
    () => parseSensorCsvFilters({ source: 'unknown-source' }, { now }),
    SensorCsvFilterError
  );
});

test('CSV export returns unavailable without MongoDB and does not open a cursor', async () => {
  let cursorRequested = false;
  const handler = createSensorCsvExportHandler({
    isConnected: () => false,
    createCursor: () => {
      cursorRequested = true;
      throw new Error('must not run');
    },
  });
  const response = createResponse();

  await handler({ query: {} }, response);

  assert.equal(response.statusCode, 503);
  assert.equal(cursorRequested, false);
});

test('Mongo export cursor is unavailable when no database connection exists', () => {
  assert.equal(isMongoConnected(), false);
  assert.equal(getSensorReadingsCursor({
    from: new Date('2026-10-01T00:00:00.000Z'),
    to: new Date('2026-10-02T00:00:00.000Z'),
  }), null);
});

test('CSV export streams a BOM, header and rows using only parsed filters', async () => {
  const reading = {
    recordedAt: new Date('2026-10-20T09:00:00.000Z'),
    sensorId: 'fixture-sensor',
    source: 'sensor_community',
    name: 'Estação Centro',
    location: { city: 'Fortaleza', country: 'BR', lat: -3.7, lon: -38.5 },
    measurements: { pm25: 14 },
  };
  let cursorFilters;
  const handler = createSensorCsvExportHandler({
    isConnected: () => true,
    createCursor: (filters) => {
      cursorFilters = filters;
      return (async function* rows() {
        yield reading;
      }());
    },
  });
  const response = createResponse();

  await handler({
    query: {
      from: '2026-10-20T00:00:00Z',
      to: '2026-10-20T23:59:59Z',
      source: 'sensor_community',
    },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.match(response.headers['Content-Type'], /text\/csv; charset=utf-8/);
  assert.equal(response.headers['Content-Disposition'], 'attachment; filename="ecosense-readings.csv"');
  assert.equal(response.chunks[0], `\uFEFF${SENSOR_CSV_HEADER}\r\n`);
  assert.match(response.chunks[1], /2026-10-20T09:00:00\.000Z,fixture-sensor,sensor_community/);
  assert.equal(cursorFilters.source, 'sensor_community');
  assert.equal(response.ended, true);
});

test('manual refresh bearer authentication fails closed and compares exact tokens', () => {
  assert.equal(isValidBearerToken(undefined, undefined), false);
  assert.equal(isValidBearerToken('Bearer wrong', 'expected-test-token'), false);
  assert.equal(isValidBearerToken('Bearer expected-test-token', 'expected-test-token'), true);
});

test('CSV and refresh status routes are registered; manual refresh is token-gated', () => {
  const registeredRoutes = routes.stack
    .filter(layer => layer.route)
    .map(layer => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods),
    }));
  const routeSource = readFileSync(new URL('../src/routes.js', import.meta.url), 'utf8');

  assert.ok(registeredRoutes.some(route =>
    route.path === '/sensors/export.csv' && route.methods.includes('get')
  ));
  assert.ok(registeredRoutes.some(route =>
    route.path === '/refresh/status' && route.methods.includes('get')
  ));
  assert.match(routeSource, /config\.security\.manualRefreshToken/);
  assert.match(routeSource, /isValidBearerToken\(req\.get\('authorization'\)/);
});

test('refresh coordinator reports state and prevents simultaneous cycles', async () => {
  const startedAt = new Date('2026-10-27T12:00:00.000Z');
  const coordinator = createRefreshCoordinator({ now: () => startedAt });
  let releaseTask;
  let taskCalls = 0;

  const first = coordinator.start(() => {
    taskCalls += 1;
    return new Promise(resolve => { releaseTask = resolve; });
  });
  const second = coordinator.start(() => {
    taskCalls += 1;
    return true;
  });

  assert.equal(first.started, true);
  assert.equal(second.started, false);
  assert.strictEqual(second.promise, first.promise);
  assert.equal(coordinator.getStatus().status, 'running');

  await Promise.resolve();
  assert.equal(taskCalls, 1);
  releaseTask(true);
  assert.equal(await first.promise, true);

  assert.deepEqual(coordinator.getStatus(), {
    status: 'succeeded',
    startedAt: startedAt.toISOString(),
    completedAt: startedAt.toISOString(),
    running: false,
  });
});
