import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SENSOR_SOURCES } from '../src/models/sensor.js';
import { collectSensorSnapshot, selectSensorsForAggregation } from '../src/services/sensorSnapshot.js';
import { SensorReading } from '../src/db/mongo.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(backendRoot, 'src');

function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : [];
  });
}

test('backend JavaScript sources parse with the supported Node.js runtime', () => {
  for (const filePath of [...javascriptFiles(sourceRoot), path.join(backendRoot, 'check_mongo.mjs')]) {
    execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' });
  }
});

test('backend startup and configuration have no Databricks dependency', () => {
  const entrypoint = readFileSync(path.join(sourceRoot, 'index.js'), 'utf8');
  const config = readFileSync(path.join(sourceRoot, 'config/index.js'), 'utf8');

  assert.doesNotMatch(entrypoint, /databricks|node-cron/i);
  assert.doesNotMatch(config, /databricks/i);
});

test('MongoDB diagnostic reads environment credentials and reports only schema metadata', () => {
  const diagnostic = readFileSync(path.join(backendRoot, 'check_mongo.mjs'), 'utf8');

  assert.match(diagnostic, /process\.env\.MONGO_URI_READONLY\s*\|\|\s*process\.env\.MONGO_URI/);
  assert.doesNotMatch(diagnostic, /mongodb(?:\+srv)?:\/\/[^\s"']+@[^\s"']+/i);
  assert.match(diagnostic, /listCollections/);
  assert.match(diagnostic, /findOne/);
  assert.match(diagnostic, /collection\.indexes\(\)/);
  assert.match(diagnostic, /describeDocumentStructure/);
  assert.doesNotMatch(
    diagnostic,
    /countDocuments|deleteMany|deleteOne|dropDatabase|insertMany|findOneAndUpdate|updateOne|\.save\(/i
  );
  assert.doesNotMatch(diagnostic, /sample\.(?:sensorId|source|location|measurements)/);
});

test('MongoDB sensor source enum includes Open-Meteo Air Quality', () => {
  assert.ok(SENSOR_SOURCES.includes('open_meteo_aq'));
  assert.ok(SensorReading, 'Mongoose model must be available from the declared dependency');

  const reading = new SensorReading({
    sensorId: 'aq-validation-test',
    source: 'open_meteo_aq',
    location: { lat: 0, lon: 0 },
    measurements: { pm25: 12 },
    recordedAt: new Date(),
  });

  assert.equal(reading.validateSync(), undefined);
});

test('one collected snapshot feeds both MongoDB persistence and sensor cache', async () => {
  const sensors = [{ id: 'real-source-snapshot' }];
  let fetchCount = 0;
  let persisted;
  let cached;

  const result = await collectSensorSnapshot({
    fetchSensors: async () => {
      fetchCount += 1;
      return sensors;
    },
    persistEnabled: true,
    persistReadings: async (readings) => { persisted = readings; },
    cacheSensors: async (readings) => { cached = readings; },
  });

  assert.equal(fetchCount, 1);
  assert.strictEqual(result, sensors);
  assert.strictEqual(persisted, sensors);
  assert.strictEqual(cached, sensors);
});

test('an empty collection reuses cached readings without fetching again', async () => {
  const cachedSensors = [{ id: 'cached-reading' }];
  let cacheReads = 0;

  const result = await selectSensorsForAggregation([], async () => {
    cacheReads += 1;
    return cachedSensors;
  });

  assert.strictEqual(result, cachedSensors);
  assert.equal(cacheReads, 1);
});

test('refresh orchestration uses its collected snapshot for city aggregation', () => {
  const entrypoint = readFileSync(path.join(sourceRoot, 'index.js'), 'utf8');

  assert.match(entrypoint, /fetchSensors:\s*\(\)\s*=>\s*sensorMod\.fetchAllSensors\(\)/);
  assert.doesNotMatch(entrypoint, /fetchAllSensorsRaw/);
  assert.match(entrypoint, /fetchAllCities\(sensorsForCities\)/);
});
