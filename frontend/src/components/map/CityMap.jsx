// src/components/map/CityMap.jsx
// Interactive map showing cities with their sensor details

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { getMarkerColor, classify, formatMeasurement } from '../../utils/icaud.js';
import { formatRelativeTimeBRT, formatFullDateTimeBRT } from '../../utils/dateFormatter.js';
import { ScoreBadge } from '../ui/index.jsx';
import { useEffect } from 'react';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;

/** Recenter the map when center prop changes */
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Sensor descriptions are now resolved via t('cityMap.descriptions.*') in component

/**
 * City map with circle markers colored by ICAU-D score
 * Shows city details and sensor breakdown on hover
 */
export default function CityMap({ cities = [], sensors = [], center = [-14.2350, -51.9253], zoom = 4, height = '500px' }) {
  const { t } = useTranslation();
  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapController center={center} zoom={zoom} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {cities.map(city => {
          const score = city.icaud?.score ?? null;
          const color = getMarkerColor(score);
          const cls = classify(score);
          const m = city.measurements;

          // Get sensors that contribute to this city
          const citySensors = sensors.filter(s => {
            const distance = Math.sqrt(
              Math.pow(s.location.lat - city.location.lat, 2) +
              Math.pow(s.location.lon - city.location.lon, 2)
            );
            return distance < 0.3; // ~30km
          });

          return (
            <CircleMarker
              key={city.id}
              center={[city.location.lat, city.location.lon]}
              radius={score !== null ? Math.max(8, score / 8) : 8}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.7,
                color: color,
                weight: 2,
                opacity: 0.9,
              }}
            >
              <Popup>
                <div className="min-w-60 font-sans max-w-sm">
                  {/* City Name */}
                  <div className="font-bold text-gray-800 mb-3 truncate">
                    📍 {city.name}
                  </div>

                  {/* ICAU-D Score */}
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-600">ICAU-D:</span>
                    {score !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg" style={{ color }}>
                          {score.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-600">{t(`classifications.${cls?.label}`, cls?.label)}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-xs">{t('table.na')}</span>
                    )}
                  </div>

                  {/* Measurements */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                      {t('cityMap.aggregatedMeasurements')}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>🌡️ {formatMeasurement(m.temperature, '°C')}</div>
                      <div>💧 {formatMeasurement(m.humidity, '%', 0)}</div>
                      <div>🌫️ PM2.5: {formatMeasurement(m.pm25, 'µg/m³')}</div>
                      <div>💨 {formatMeasurement(m.windSpeed, 'm/s')}</div>
                    </div>
                  </div>

                  {/* Available Metrics Count */}
                  <div className="mb-4 pb-3 border-b border-gray-200">
                    <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                      {t('cityMap.availableComponents')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {city.icaud?.availableComponents?.map(comp => (
                        <span key={comp} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {comp === 'temperature' ? '🌡️' : ''}
                          {comp === 'humidity' ? '💧' : ''}
                          {comp === 'airQuality' ? '🌫️' : ''}
                          {comp === 'wind' ? '💨' : ''}
                          {' '}{comp}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Sensors Contributing to This City */}
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                      {t('cityMap.sensorsSectionTitle')} ({city.sensorCount || citySensors.length})
                    </div>
                    {citySensors.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {citySensors.slice(0, 5).map(sensor => (
                          <div key={sensor.id} className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
                            <div className="font-semibold text-gray-700 truncate mb-1">
                              {sensor.name}
                            </div>
                            <div className="text-gray-600 mb-1">
                              {t('cityMap.deviceType')} <span className="font-medium">{sensor.deviceType || '—'}</span>
                            </div>
                            <div className="space-y-1">
                              {sensor.measurements.temperature !== null && (
                                <div className="text-gray-600">
                                  {t('cityMap.descriptions.temperature')}
                                </div>
                              )}
                              {sensor.measurements.humidity !== null && (
                                <div className="text-gray-600">
                                  {t('cityMap.descriptions.humidity')}
                                </div>
                              )}
                              {sensor.measurements.pm25 !== null && (
                                <div className="text-gray-600">
                                  {t('cityMap.descriptions.pm25')}
                                </div>
                              )}
                              {sensor.measurements.windSpeed !== null && (
                                <div className="text-gray-600">
                                  {t('cityMap.descriptions.windSpeed')}
                                </div>
                              )}
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                              🕐 {formatRelativeTimeBRT(sensor.lastSeen)} — {formatFullDateTimeBRT(sensor.lastSeen)}
                            </div>
                          </div>
                        ))}
                        {citySensors.length > 5 && (
                          <div className="text-xs text-gray-500 italic">
                            +{citySensors.length - 5}...
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 italic">
                        {t('cityMap.noSensorsNearby')}
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

/** Map legend component */
export function CityMapLegend() {
  const { t } = useTranslation();
  const items = [
    { color: '#22c55e', label: t('map.legend.veryComfortable') },
    { color: '#84cc16', label: t('map.legend.comfortable') },
    { color: '#f59e0b', label: t('map.legend.uncomfortable') },
    { color: '#ef4444', label: t('map.legend.unhealthy') },
    { color: '#6b7280', label: t('map.legend.noData') },
  ];

  return (
    <div className="bg-white/90 backdrop-blur rounded-lg border border-gray-200 p-3 shadow-sm">
      <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">{t('map.legend.title')}</div>
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-gray-600">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
