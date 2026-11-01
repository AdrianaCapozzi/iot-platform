// src/components/map/SensorMap.jsx
// Interactive Leaflet map showing sensor locations with ICAU-D color coding

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { getMarkerColor, classify, formatMeasurement } from '../../utils/icaud.js';
import { formatFullDateTimeBRT, formatRelativeTimeBRT } from '../../utils/dateFormatter.js';
import { ScoreBadge } from '../ui/index.jsx';
import { useEffect, useRef } from 'react';

// Fix Leaflet default icon issue with Vite
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;

/**
 * Monta a URL externa para o sensor, dependendo da fonte.
 * Sensor.Community tem páginas por sensor (devices.sensor.community/sensors/<id>);
 * Open-Meteo é uma API/modelo, então linkamos para sua documentação.
 */
function getSourceUrl(sensor) {
  if (!sensor?.source) return null;
  if (sensor.source === 'sensor_community') {
    // IDs vêm como "sc_98058" — extrai o número
    const numeric = String(sensor.id || '').replace(/^sc_/, '');
    if (numeric) return `https://devices.sensor.community/sensors/${numeric}`;
    return 'https://maps.sensor.community/';
  }
  if (sensor.source === 'open_meteo') {
    return 'https://open-meteo.com/en/docs';
  }
  if (sensor.source === 'open_meteo_aq') {
    return 'https://open-meteo.com/en/docs/air-quality-api';
  }
  return null;
}

/** Fit map bounds to show all sensors, only on first load */
function FitBounds({ sensors }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || sensors.length === 0) return;
    const bounds = sensors.map(s => [s.location.lat, s.location.lon]);
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      fitted.current = true;
    }
  }, [sensors, map]);
  return null;
}

/**
 * Sensor map with circle markers colored by ICAU-D score
 */
export default function SensorMap({ sensors = [], center = [-14.2350, -51.9253], zoom = 4, height = '500px' }) {
  const { t } = useTranslation();
  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <FitBounds sensors={sensors} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {sensors.map(sensor => {
          const score  = sensor.icaud?.score ?? null;
          const color  = getMarkerColor(score);
          const cls    = classify(score);
          const m      = sensor.measurements;

          return (
            <CircleMarker
              key={sensor.id}
              center={[sensor.location.lat, sensor.location.lon]}
              radius={score !== null ? Math.max(5, score / 10) : 5}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.75,
                color: color,
                weight: 1,
                opacity: 0.9,
              }}
            >
              <Popup>
                <div className="min-w-48 font-sans">
                  <div className="font-bold text-gray-800 mb-1 truncate max-w-xs">
                    {sensor.name}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {sensor.location.city && !sensor.location.city.match(/^-?\d/)
                      ? sensor.location.city
                      : t('map.popup.unknownCity')}
                  </div>

                  {/* Source + Device Type badges */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {/* Source badge */}
                    {sensor.source && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        sensor.source === 'sensor_community' ? 'bg-green-100 text-green-700' :
                        sensor.source === 'open_meteo' ? 'bg-orange-100 text-orange-700' :
                        sensor.source === 'open_meteo_aq' ? 'bg-pink-100 text-pink-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {sensor.source === 'sensor_community' ? '🌍 Sensor.Community' :
                         sensor.source === 'open_meteo' ? '⛅ Open-Meteo' :
                         sensor.source === 'open_meteo_aq' ? '🌫️ Open-Meteo AQ' :
                         sensor.source}
                      </span>
                    )}

                    {/* Device Type badge */}
                    {sensor.deviceType && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {sensor.deviceType}
                      </span>
                    )}

                    {/* Exposure badge */}
                    {sensor.exposure && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        sensor.exposure === 'outdoor' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {sensor.exposure === 'outdoor' ? t('map.popup.outdoor') : t('map.popup.indoor')}
                      </span>
                    )}
                  </div>

                  {/* Sensor identification + link to source */}
                  {(() => {
                    const url = getSourceUrl(sensor);
                    return (
                      <div className="text-xs text-gray-600 mb-2 truncate">
                        <span className="font-mono text-gray-500">{sensor.id}</span>
                        {url && (
                          <>
                            {' · '}
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              ver fonte ↗
                            </a>
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* ICAU-D Score */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-600">ICAU-D:</span>
                    {score !== null ? (
                      <span className="font-bold" style={{ color }}>
                        {score.toFixed(1)} — {t(`classifications.${cls?.label}`, cls?.label)}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">{t('table.na')}</span>
                    )}
                  </div>

                  {/* Measurements */}
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                    <span>🌡️ {formatMeasurement(m.temperature, '°C')}</span>
                    <span>💧 {formatMeasurement(m.humidity, '%', 0)}</span>
                    <span>🌫️ PM2.5: {formatMeasurement(m.pm25, 'µg/m³')}</span>
                    {m.windSpeed !== null && (
                      <span>💨 {formatMeasurement(m.windSpeed, 'm/s')}</span>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-gray-500" title={formatFullDateTimeBRT(sensor.lastSeen) + ' (BRT)'}>
                    🕐 {formatRelativeTimeBRT(sensor.lastSeen)} — {formatFullDateTimeBRT(sensor.lastSeen)}
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
export function MapLegend() {
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
