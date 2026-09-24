import 'dotenv/config';

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3002', 10),
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5174',
  },

  cache: {
    ttlSensors: parseInt(process.env.CACHE_TTL_SENSORS || '300', 10),
    ttlCities: parseInt(process.env.CACHE_TTL_CITIES || '600', 10),
    ttlRanking: parseInt(process.env.CACHE_TTL_RANKING || '600', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  apis: {
    sensorCommunity: {
      baseUrl: process.env.SENSOR_COMMUNITY_BASE_URL || 'https://data.sensor.community/airrohr/v1/filter',
    },
  },

  sensors: {
    maxPerSource: parseInt(process.env.MAX_SENSORS_PER_SOURCE || '200', 10),
    maxAgeHours: parseInt(process.env.SENSOR_MAX_AGE_HOURS || '2', 10),
  },

  database: {
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/iot_platform',
    mongoUriReadonly: process.env.MONGO_URI_READONLY || null,
    mongoEnabled: process.env.MONGO_ENABLED === 'true',
    mongoTimeout: 5000,
  },

  landing: {
    // storage da landing zone consumida pelo databricks auto loader
    provider: process.env.LANDING_PROVIDER || 's3', // 's3' | 'adls'
    bucket: process.env.LANDING_BUCKET || null,
    region: process.env.AWS_REGION || 'us-east-1',
  },

  // implementando databricks

  databricks: {
    exportEnabled: process.env.DATABRICKS_EXPORT_ENABLED === 'true',
    exportBatchLimit: parseInt(process.env.DATABRICKS_EXPORT_BATCH_LIMIT || '10000', 10),
    exportCron: process.env.DATABRICKS_EXPORT_CRON || '*/15 * * * *',
    host: process.env.DATABRICKS_HOST || null,
    token: process.env.DATABRICKS_TOKEN || null,
    jobId: process.env.DATABRICKS_JOB_ID || null,
  },

};
