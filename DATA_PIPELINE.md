# EcoSense data pipeline

## Current ingestion

The Node.js/Express backend fetches environmental observations from the
Sensor.Community and Open-Meteo adapters. It performs a warm-up at startup and
refreshes the data hourly. When MongoDB is enabled and connected, normalized
sensor readings are stored in MongoDB; the existing `SensorReading` collection
uses a 30-day TTL index. Sensor, city and ranking results are also cached for
the frontend.

Each refresh now fetches one sensor snapshot and reuses it for MongoDB history,
the sensor cache and city aggregation. If a collection returns no sensors, city
aggregation falls back to the existing cached snapshot instead of issuing a
second API collection in that refresh. The MongoDB schema accepts all current
source identifiers: `sensor_community`, `open_meteo` and `open_meteo_aq`.

Manual refresh uses `POST /api/refresh` with a bearer token configured as
`MANUAL_REFRESH_TOKEN`; it is disabled when the secret is absent. Concurrent
refreshes are rejected, and `GET /api/refresh/status` reports the in-memory
state. Do not deploy publicly until the token is configured in Secrets.

## Analytics and exports

The application no longer requires a Databricks workspace, token, job, or
scheduled export. Databricks-specific integration code and configuration have
been removed.

`GET /api/sensors/export.csv` exports the existing `SensorReading` history for
optional `from`, `to`, and `source` filters. The default window is 30 days;
timestamps are written as UTC ISO 8601, with UTF-8 BOM and RFC 4180 escaping.
The route streams from MongoDB and returns `503` when MongoDB is not connected.

API adapters retain each original source record as an internal symbol while
normalizing readings. When MongoDB persistence is enabled, batches store that
payload in the optional `rawPayload` field of the existing `SensorReading`
collection; the symbol is omitted from JSON responses. No new collection or
index is defined. Existing Atlas records have not been backfilled or changed.

## MongoDB connection safety

Provide `MONGO_URI` through the runtime's secret manager or an untracked local
`.env` file. Never commit or log its value. If a URI has appeared in Git
history, rotate the corresponding Atlas credential; removing it from the
current files does not erase earlier commits.

For a read-only Atlas metadata check, run `node check_mongo.mjs` from `backend`
with `MONGO_URI_READONLY` preferred (or `MONGO_URI`). The checker lists
collection names, field/type structure from one document, and index metadata;
it does not print document values or execute writes. It uses only variables
injected into the process and does not load a local `.env` file.

## Tests

Run the backend tests using its already-declared dependencies:

```sh
cd backend
npm install
npm test
```

The test command uses the Node.js built-in test runner (Node.js 18 or newer).
Unit tests do not connect to MongoDB or write to external services.
