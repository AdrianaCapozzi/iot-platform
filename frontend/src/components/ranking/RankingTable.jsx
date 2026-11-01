// src/components/ranking/RankingTable.jsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { classify, formatScore, formatMeasurement } from '../../utils/icaud.js';
import { ClassificationBadge } from '../ui/index.jsx';
import { formatRelativeTimeBRT, formatFullDateTimeBRT } from '../../utils/dateFormatter.js';

/** Monta o tooltip de fonte para uma métrica de cidade */
function sourceTooltip(sources, field) {
  const s = sources?.[field];
  if (!s || !s.labels?.length) return undefined;
  const fontes = s.labels.join(' + ');
  const detalhe = s.count ? ` — ${s.count} sensor(es)` : '';
  return `Fonte: ${fontes}${detalhe}`;
}

/**
 * URL externa do sensor, conforme a fonte.
 * Sensor.Community tem uma página por sensor; Open-Meteo é um modelo, então
 * apontamos para sua documentação.
 */
function sensorSourceUrl(sensor) {
  if (!sensor?.source) return null;
  if (sensor.source === 'sensor_community') {
    const numeric = String(sensor.id || '').replace(/^sc_/, '');
    if (numeric) return `https://devices.sensor.community/sensors/${numeric}`;
    return 'https://maps.sensor.community/';
  }
  if (sensor.source === 'open_meteo')    return 'https://open-meteo.com/en/docs';
  if (sensor.source === 'open_meteo_aq') return 'https://open-meteo.com/en/docs/air-quality-api';
  return null;
}

/**
 * Popover com a lista detalhada de sensores que compõem a cidade.
 * Aparece ao passar o mouse sobre o badge de contagem; cada sensor traz
 * um link "ver fonte ↗" para a página externa correspondente.
 */
function SensorsPopover({ city }) {
  const list = city.sensorList || [];
  const count = city.sensorCount ?? list.length;

  return (
    <span className="relative inline-block group">
      <span
        className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 font-mono font-semibold inline-flex items-center justify-center gap-1 cursor-help"
      >
        📡 {count}
      </span>

      {list.length > 0 && (
        <div
          className="absolute z-30 right-0 mt-1 hidden group-hover:block w-72 max-w-[80vw] bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-left"
          role="tooltip"
        >
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Sensores que alimentam {city.name}
          </div>
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {list.map((s) => {
              const url = sensorSourceUrl(s);
              return (
                <li key={s.id} className="text-xs text-gray-700">
                  <div className="font-medium text-gray-900 truncate">{s.name}</div>
                  <div className="text-gray-500 mt-0.5">
                    <span className="font-mono">{s.id}</span>
                  </div>
                  <div className="text-gray-500 mt-0.5">
                    {s.sourceLabel || s.source}
                  </div>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 text-blue-600 hover:text-blue-800 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      ver fonte ↗
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </span>
  );
}

export default function RankingTable({ cities = [], showDetails = false }) {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto overflow-y-visible">
      <table className="w-full text-sm relative">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-semibold w-12">{t('table.rank')}</th>
            <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-semibold">{t('table.city')}</th>
            <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-semibold">{t('table.icaud')}</th>
            <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-semibold hidden sm:table-cell">{t('table.status')}</th>
            {showDetails && (
              <>
                <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-semibold hidden md:table-cell">{t('table.temp')}</th>
                <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-semibold hidden md:table-cell">{t('table.humidity')}</th>
                <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-semibold hidden lg:table-cell">{t('table.pm25')}</th>
                <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-semibold hidden lg:table-cell">{t('table.wind')}</th>
              </>
            )}
            <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-semibold hidden sm:table-cell">{t('table.sensors')}</th>
            <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-gray-500 font-semibold hidden md:table-cell">{t('table.lastReading')}</th>
          </tr>
        </thead>
        <tbody>
          {cities.map((city, idx) => {
            const rank  = city.rank ?? idx + 1;
            const score = city.icaud?.score ?? null;
            const cls   = classify(score);
            const m     = city.measurements || {};
            const ms    = city.measurementSources || {};

            const lastSeen = city.lastSeen || city.updatedAt || null;

            return (
              <tr
                key={city.id || city.name}
                className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4">
                  <span className={`font-bold font-mono text-base ${rank <= 3 ? 'text-amber-500' : 'text-gray-300'}`}>
                    {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}
                  </span>
                </td>

                <td className="py-3 px-4">
                  <Link
                    to={`/cities/${encodeURIComponent(city.name)}`}
                    className="font-semibold text-gray-800 hover:text-green-600 transition-colors"
                  >
                    {city.name}
                  </Link>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {t(`countries.${city.country}`, city.country || 'Unknown')}
                  </div>
                </td>

                <td className="py-3 px-4 text-center">
                  <span className="font-bold font-mono text-lg" style={{ color: cls?.color || '#9ca3af' }}>
                    {formatScore(score)}
                  </span>
                </td>

                <td className="py-3 px-4 text-center hidden sm:table-cell">
                  {cls ? (
                    <ClassificationBadge
                      label={t(`classifications.${cls.label}`, cls.label)}
                      color={cls.color}
                    />
                  ) : (
                    <span className="text-gray-300 text-xs">{t('table.na')}</span>
                  )}
                </td>

                {showDetails && (
                  <>
                    <td className="py-3 px-4 text-center font-mono text-gray-600 hidden md:table-cell" title={sourceTooltip(ms, 'temperature')}>
                      <span className={sourceTooltip(ms, 'temperature') ? 'cursor-help' : ''}>
                        {formatMeasurement(m.temperature, '°C')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-gray-600 hidden md:table-cell" title={sourceTooltip(ms, 'humidity')}>
                      <span className={sourceTooltip(ms, 'humidity') ? 'cursor-help' : ''}>
                        {formatMeasurement(m.humidity, '%', 0)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-gray-600 hidden lg:table-cell" title={sourceTooltip(ms, 'pm25')}>
                      <span className={sourceTooltip(ms, 'pm25') ? 'cursor-help' : ''}>
                        {formatMeasurement(m.pm25, 'µg/m³')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-gray-600 hidden lg:table-cell" title={sourceTooltip(ms, 'windSpeed')}>
                      <span className={sourceTooltip(ms, 'windSpeed') ? 'cursor-help' : ''}>
                        {formatMeasurement(m.windSpeed, 'm/s')}
                      </span>
                    </td>
                  </>
                )}

                <td className="py-3 px-4 text-center hidden sm:table-cell">
                  <SensorsPopover city={city} />
                </td>

                <td className="py-3 px-4 text-center hidden md:table-cell">
                  {lastSeen ? (
                    <span
                      title={formatFullDateTimeBRT(lastSeen) + ' (BRT)'}
                      className="text-xs text-gray-500 cursor-help"
                    >
                      {formatRelativeTimeBRT(lastSeen)}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
