# EcoSense data pipeline

## Current ingestion

The Node.js/Express backend fetches environmental observations from the
Sensor.Community and Open-Meteo adapters. It performs a warm-up at startup and
refreshes the data hourly. When MongoDB is enabled and connected, normalized
sensor readings are stored in MongoDB; the existing `SensorReading` collection
uses a 30-day TTL index. Sensor, city and ranking results are also cached for
the frontend.

Each refresh fetches one sensor snapshot and reuses it for MongoDB history,
the sensor cache and city aggregation. If a collection returns no sensors, city
aggregation falls back to the existing cached snapshot instead of issuing a
second API collection in that refresh. The MongoDB schema accepts all current
source identifiers: `sensor_community`, `open_meteo` and `open_meteo_aq`.

`POST /api/refresh` starts a refresh in the background. Do not expose this
endpoint on a public deployment until it is protected by authentication or
restricted to trusted access.

## Analytics and CSV export

The application no longer requires a Databricks workspace, token, job, or
scheduled export. Databricks-specific integration code and configuration have
been removed.

The endpoint `GET /api/cities/export.csv` exports the current city aggregates
as a UTF-8 CSV file suitable for importing into Power BI. Optional query
parameter `country` filters by country, for example
`/api/cities/export.csv?country=BR`.

The export includes city and country, coordinates, sensor count, temperature,
humidity, PM2.5, PM10, wind speed, ICAU-D score and classification, latest
reading timestamp, and aggregate update timestamp. Missing measurements are
exported as empty cells. The export represents the current aggregate snapshot;
it is **not** a historical time series and requires the API data/cache to be
available. Historical analysis depends on MongoDB being configured and
successfully storing readings.

## MongoDB connection safety

Provide `MONGO_URI` through the runtime's secret manager or an untracked local
`.env` file. Never commit or log its value. If a URI has appeared in Git
history, rotate the corresponding Atlas credential; removing it from the
current files does not erase earlier commits.

For a read-only Atlas metadata check, run `node check_mongo.mjs` from
`backend` with `MONGO_URI_READONLY` preferred (or `MONGO_URI`). The checker
lists collection names, field/type structure from one document, and index
metadata; it does not print document values or execute writes. It uses only
variables injected into the process and does not load a local `.env` file.

## Tests

Run the backend test suite with:

```sh
cd backend
npm test
```

The test command uses the Node.js built-in test runner (Node.js 18 or newer).
