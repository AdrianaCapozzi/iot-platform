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

`POST /api/refresh` currently starts a refresh in the background. The public
route and UI status handling are being addressed in a later implementation
stage; do not expose this endpoint on a public deployment until it is protected.

## Analytics and exports

The application no longer requires a Databricks workspace, token, job, or
scheduled export. Databricks-specific integration code and configuration have
been removed. CSV export for Power BI and retention of original API payloads
are not implemented in this stage.

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

Run the backend's dependency-free test suite with:

```sh
cd backend
npm test
```

The test command uses the Node.js built-in test runner (Node.js 18 or newer).
