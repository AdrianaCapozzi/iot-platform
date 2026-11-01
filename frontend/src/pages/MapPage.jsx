// src/pages/MapPage.jsx
// Full-page interactive sensor map

import { Suspense, lazy, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSensors } from '../hooks/useEnvironmentalData.js';
import { useSyncedFilters } from '../hooks/useSyncedFilters.js';
import { Spinner, ErrorAlert } from '../components/ui/index.jsx';
import { MapLegend } from '../components/map/SensorMap.jsx';
import { CLASSIFICATIONS } from '../utils/icaud.js';

const SensorMap = lazy(() => import('../components/map/SensorMap.jsx'));

// Country → continent mapping (alinhado com Dashboard/Ranking)
const COUNTRY_CONTINENT = {
  BR: 'South America',
  DE: 'Europe', GB: 'Europe', FR: 'Europe', ES: 'Europe', IT: 'Europe',
  NL: 'Europe', AT: 'Europe', PL: 'Europe', CZ: 'Europe', HU: 'Europe',
  BE: 'Europe', CH: 'Europe', DK: 'Europe', SE: 'Europe', NO: 'Europe',
  FI: 'Europe', PT: 'Europe', GR: 'Europe', IE: 'Europe', RO: 'Europe',
  BG: 'Europe', HR: 'Europe', RS: 'Europe', MK: 'Europe', BA: 'Europe',
  SK: 'Europe', SI: 'Europe', LT: 'Europe', LV: 'Europe', EE: 'Europe',
  RU: 'Europe', UA: 'Europe', BY: 'Europe', AM: 'Europe',
};
const getContinent = c => COUNTRY_CONTINENT[c] || 'Other';

export default function MapPage() {
  const { t } = useTranslation();
  const { filters, update: setFilters, clear: clearFilters, hasActive } = useSyncedFilters();

  const SOURCE_OPTIONS = [
    { value: '',                 label: t('map.allSources') },
    { value: 'sensor_community', label: '🌍 Sensor.Community' },
    { value: 'open_meteo',       label: '⛅ Open-Meteo (Meteorologia)' },
    { value: 'open_meteo_aq',    label: '🌫️ Open-Meteo Air Quality' },
  ];

  const { data: sensors = [], isLoading, error } = useSensors({ limit: 1000 });

  const filtered = useMemo(() => sensors.filter(s => {
    if (filters.source && s.source !== filters.source) return false;
    if (filters.continent && getContinent(s.location?.country) !== filters.continent) return false;
    if (filters.country && s.location?.country !== filters.country) return false;
    if (filters.class) {
      const cls = s.icaud?.classification?.label;
      if (cls !== filters.class) return false;
    }
    return true;
  }), [sensors, filters]);

  const { continents, countriesInContinent } = useMemo(() => {
    const continentSet = new Set();
    const countrySet = new Set();
    for (const s of sensors) {
      const code = s.location?.country;
      if (code) {
        continentSet.add(getContinent(code));
        countrySet.add(code);
      }
    }
    return {
      continents: [...continentSet].sort(),
      countriesInContinent: [...countrySet]
        .filter(code => !filters.continent || getContinent(code) === filters.continent)
        .sort((a, b) => (t(`countries.${a}`, a)).localeCompare(t(`countries.${b}`, b))),
    };
  }, [sensors, filters.continent, t]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('map.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {t('map.activeSensors', { count: filtered.length })}
          </p>
        </div>
      </div>

      {/* Filtros — alinhados com Painel/Ranking, sincronizados via URL */}
      <div className="flex gap-3 items-center flex-wrap">
        <select
          value={filters.source}
          onChange={e => setFilters({ source: e.target.value })}
          aria-label={t('map.allSources', 'Fonte de dados')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {SOURCE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={filters.continent}
          onChange={e => setFilters({ continent: e.target.value, country: '' })}
          aria-label={t('ranking.allContinents', 'Continente')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">{t('ranking.allContinents')}</option>
          {continents.map(c => (
            <option key={c} value={c}>{t(`countries.continents.${c}`, c)}</option>
          ))}
        </select>

        <select
          value={filters.country}
          onChange={e => setFilters({ country: e.target.value })}
          aria-label={t('ranking.allCountries', 'País')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">{t('ranking.allCountries')}</option>
          {countriesInContinent.map(code => (
            <option key={code} value={code}>{t(`countries.${code}`, code)}</option>
          ))}
        </select>

        <select
          value={filters.class}
          onChange={e => setFilters({ class: e.target.value })}
          aria-label={t('ranking.allClassifications', 'Classificação')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">{t('ranking.allClassifications')}</option>
          {CLASSIFICATIONS.map(c => (
            <option key={c.label} value={c.label}>{t(`classifications.${c.label}`, c.label)}</option>
          ))}
        </select>

        {hasActive && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 rounded"
            title="Limpar filtros"
            aria-label="Limpar filtros"
          >
            <span aria-hidden="true">✕</span> Limpar
          </button>
        )}
      </div>

      {error && <ErrorAlert message="Failed to load sensor data" />}

      <div className="relative">
        <Suspense fallback={<Spinner />}>
          {isLoading ? (
            <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-xl border border-gray-200">
              <Spinner size="lg" />
            </div>
          ) : filtered.length === 0 && hasActive ? (
            <div role="status" className="flex items-center justify-center h-[600px] bg-gray-50 rounded-xl border border-gray-200 text-gray-500">
              Nenhum sensor corresponde ao filtro
            </div>
          ) : (
            <SensorMap sensors={filtered} height="600px" />
          )}
        </Suspense>

        {/* Legend overlay */}
        <div className="absolute bottom-4 right-4 z-[1000]">
          <MapLegend />
        </div>
      </div>

      {/* Source statistics — total por fonte (não respeita os outros filtros, só ilustrativo) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SOURCE_OPTIONS.slice(1).map(src => {
          const count = sensors.filter(s => s.source === src.value).length;
          return (
            <div key={src.value} className="bg-white rounded-lg border border-gray-100 p-3 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="text-2xl font-bold font-mono text-gray-700">{count}</div>
              <div className="text-xs text-gray-500 mt-0.5">{src.label}</div>
            </div>
          );
        })}
        <div className="bg-green-50 rounded-lg border border-green-100 p-3 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold font-mono text-green-700">{filtered.length}</div>
          <div className="text-xs text-green-600 mt-0.5">{t('map.showing')}</div>
        </div>
      </div>
    </div>
  );
}
