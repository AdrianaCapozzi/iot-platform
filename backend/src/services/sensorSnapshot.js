/**
 * Fetch one sensor snapshot and reuse it for persistence and cache updates.
 */
export async function collectSensorSnapshot({
  fetchSensors,
  persistEnabled,
  persistReadings,
  cacheSensors,
}) {
  const sensors = await fetchSensors();
  if (!Array.isArray(sensors)) {
    throw new TypeError('Sensor collection must return an array');
  }

  if (sensors.length > 0) {
    if (persistEnabled) await persistReadings(sensors);
    await cacheSensors(sensors);
  }

  return sensors;
}

/**
 * Reuse the last cached readings if the current collection returned no sensors.
 * This keeps stale-while-revalidate behavior without starting another API fetch.
 */
export async function selectSensorsForAggregation(currentSensors, getCachedSensors) {
  if (currentSensors.length > 0) return currentSensors;

  const cachedSensors = await getCachedSensors();
  return Array.isArray(cachedSensors) ? cachedSensors : [];
}
