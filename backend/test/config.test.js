import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

test('MongoDB diagnostic reads its connection string from the environment', () => {
  const diagnostic = readFileSync(path.join(backendRoot, 'check_mongo.mjs'), 'utf8');

  assert.match(diagnostic, /process\.env\.MONGO_URI/);
  assert.doesNotMatch(diagnostic, /mongodb(?:\+srv)?:\/\/[^\s"']+@[^\s"']+/i);
});
