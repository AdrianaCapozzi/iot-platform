// src/pages/Dashboard.jsx
// Main dashboard: sensor map, stats, top cities

import { Suspense, lazy, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSensors, useSensorsHistory, useSensorsHistoryFallback, useRanking, useCities } from '../hooks/useEnvironmentalData.js';
import { useSyncedFilters } from '../hooks/useSyncedFilters.js';
import { formatRelativeTimeBRT, formatFullDateTimeBRT } from '../utils/dateFormatter.js';
import { StatCard, ScoreRing, Spinner, ErrorAlert } from '../components/ui/index.jsx';
import RankingTable from '../components/ranking/RankingTable.jsx';
import AlertsPanel from '../components/alerts/AlertsPanel.jsx';
import { TopCitiesChart, ClassificationDonut } from '../components/charts/EnvironmentalChart.jsx';
import { classify, CLASSIFICATIONS, formatMeasurement } from '../utils/icaud.js';

const SensorMap = lazy(() => import('../components/map/SensorMap.jsx'));

// Country → continent mapping (mesmo do Ranking — mantido em sincronia)
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

function getContinent(country) {
  return COUNTRY_CONTINENT[country] || 'Other';
}

const SOURCE_LABELS_FRONT = {
  sensor_community: 'Sensor.Community (sensores IoT comunitários)',
  open_meteo:       'Open-Meteo (estações meteorológicas)',
  open_meteo_aq:    'Open-Meteo Air Quality (modelo CAMS)',
};

function summarizeSources(contributing) {
  if (contributing.length === 0) return null;
  const set = new Set(contributing.map(s => s.source));
  return {
    sources: [...set],
    labels:  [...set].map(src => SOURCE_LABELS_FRONT[src] || src),
    count:   contributing.length,
  };
}

function GlobalStats({ cities = [], sensors = [] }) {
  const { t } = useTranslation();
  const validCities = cities.filter(c => c.icaud?.score !== null);
  const avgScore = validCities.length > 0
    ? validCities.reduce((s, c) => s + c.icaud.score, 0) / validCities.length
    : null;

  const avgTemp = sensors.filter(s => s.measurements?.temperature !== null && s.measurements?.temperature !== undefined);
  const avgHum  = sensors.filter(s => s.measurements?.humidity    !== null && s.measurements?.humidity    !== undefined);
  const avgPm25 = sensors.filter(s => s.measurements?.pm25        !== null && s.measurements?.pm25        !== undefined);
  const avgWind = sensors.filter(s => s.measurements?.windSpeed   !== null && s.measurements?.windSpeed   !== undefined);

  const mean = (arr, field) =>
    arr.length > 0
      ? arr.reduce((s, x) => s + x.measurements[field], 0) / arr.length
      : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatCard label={t('stats.avgTemp')}     value={mean(avgTemp, 'temperature')?.toFixed(1)} unit="°C"    icon="🌡️" color="#f59e0b" source={summarizeSources(avgTemp)} />
      <StatCard label={t('stats.avgHumidity')} value={mean(avgHum,  'humidity')?.toFixed(0)}    unit="%"     icon="💧" color="#3b82f6" source={summarizeSources(avgHum)} />
      <StatCard label={t('stats.avgPm25')}     value={mean(avgPm25, 'pm25')?.toFixed(1)}        unit="µg/m³" icon="🌫️" color="#8b5cf6" source={summarizeSources(avgPm25)} />
      <StatCard label={t('stats.windSpeed')}   value={mean(avgWind, 'windSpeed')?.toFixed(1)}   unit="m/s"   icon="💨" color="#06b6d4" source={summarizeSources(avgWind)} />
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [timePeriod, setTimePeriod] = useState('live');
  const { filters, update: setFilters, clear: clearFilters, hasActive: hasActiveFilter } = useSyncedFilters();
  const filterClass     = filters.class;
  const filterContinent = filters.continent;
  const filterCountry   = filters.country;

  const { data: liveSensors = [], isLoading: sensorsLoading } = useSensors({ limit: 500 });
  const { data: historySensors = [], isLoading: historyLoading } = useSensorsHistory(timePeriod);
  // Só dispara o fallback histórico se o live ainda não trouxe nada
  const { data: fallbackSensors = [] } = useSensorsHistoryFallback({ enabled: liveSensors.length === 0 });
  const { data: rankingRes, isLoading: rankingLoading } = useRanking(50);
  const { data: cities = [], isLoading: citiesLoading } = useCities();

  const isHistoryMode = timePeriod !== 'live';

  // Sensor selection with fallback:
  // - live mode: use live data, or fallback to MongoDB history if live is still empty
  // - history mode: use selected period history, or live data if history is empty
  const allSensors = isHistoryMode
    ? (historySensors.length > 0 ? historySensors : liveSensors)
    : (liveSensors.length > 0 ? liveSensors : fallbackSensors);

  const usingFallback = !isHistoryMode && liveSensors.length === 0 && fallbackSensors.length > 0;

  // Quando há filtro ativo, usamos `cities` (catálogo completo, ~258) ordenado
  // como fonte do ranking — assim filtrar "Brasil" mostra todas as BR, não só
  // as poucas que entraram no top global.
  const hasActiveFilterPeek = filterClass || filterContinent || filterCountry;
  const allRanking = (hasActiveFilterPeek && cities.length > 0)
    ? [...cities]
        .filter(c => c.icaud?.score !== null && c.icaud?.score !== undefined)
        .sort((a, b) => (b.icaud.score || 0) - (a.icaud.score || 0))
        .map((c, i) => ({ ...c, rank: i + 1 }))
    : (rankingRes?.data || []);
  const rankingStillLoading = rankingLoading || rankingRes?.loading;
  const isLoading = sensorsLoading || rankingLoading || (isHistoryMode && historyLoading);

  // Aplica filtros de continente / país / classificação a cidades e sensores.
  // Sensores são filtrados pelo país do seu location, mantendo o mapa coerente
  // com os cards e ranking.
  const matchesCity = (c) => {
    if (filterClass && c.icaud?.classification?.label !== filterClass) return false;
    if (filterContinent && getContinent(c.country) !== filterContinent) return false;
    if (filterCountry && c.country !== filterCountry) return false;
    return true;
  };
  const matchesSensor = (s) => {
    const country = s.location?.country;
    if (filterContinent && getContinent(country) !== filterContinent) return false;
    if (filterCountry && country !== filterCountry) return false;
    return true;
  };

  const filteredCities  = useMemo(() => cities.filter(matchesCity),
    [cities, filterClass, filterContinent, filterCountry]);
  const filteredSensors = useMemo(() => allSensors.filter(matchesSensor),
    [allSensors, filterContinent, filterCountry]);
  const filteredRanking = useMemo(() => allRanking.filter(matchesCity).slice(0, 10),
    [allRanking, filterClass, filterContinent, filterCountry]);

  // Stats baseiam-se em cidades filtradas
  const validCities = filteredCities.filter(c => c.icaud?.score !== null);
  const globalAvgScore = validCities.length > 0
    ? validCities.reduce((s, c) => s + c.icaud.score, 0) / validCities.length
    : null;

  const mapReady = !(sensorsLoading || (isHistoryMode && historyLoading));

  // Listas para popular os selects de continente e país
  const { continents, countriesInContinent } = useMemo(() => {
    const continentSet = new Set();
    const countrySet = new Set();
    for (const c of cities) {
      if (c.country) {
        continentSet.add(getContinent(c.country));
        countrySet.add(c.country);
      }
    }
    const continents = [...continentSet].sort();
    const countriesInContinent = [...countrySet]
      .filter(code => !filterContinent || getContinent(code) === filterContinent)
      .sort((a, b) => (t(`countries.${a}`, a)).localeCompare(t(`countries.${b}`, b)));
    return { continents, countriesInContinent };
  }, [cities, filterContinent, t]);

  // Data da leitura mais recente entre todos os sensores visíveis
  const lastReadingAt = useMemo(() => {
    const timestamps = filteredSensors
      .map(s => s.lastSeen)
      .filter(Boolean)
      .sort();
    return timestamps.at(-1) || null;
  }, [filteredSensors]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isHistoryMode
              ? t('dashboard.subtitleHistory', { period: timePeriod === 'week' ? t('dashboard.week') : t('dashboard.month'), sensors: filteredSensors.length, cities: filteredCities.length })
              : usingFallback
                ? t('dashboard.subtitleFallback', { sensors: filteredSensors.length })
                : t('dashboard.subtitleLive', { sensors: filteredSensors.length, cities: filteredCities.length })
            }
          </p>
          {lastReadingAt && (
            <span
              title={`${formatFullDateTimeBRT(lastReadingAt)} (BRT)`}
              className="inline-flex items-center gap-1 mt-1 text-xs text-gray-500 cursor-help"
            >
              🕐 {t('backend.updatedAgo', { time: formatRelativeTimeBRT(lastReadingAt) })}
            </span>
          )}
          {usingFallback && (
            <span className="inline-flex items-center gap-1 mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              {t('dashboard.fallbackBadge')}
            </span>
          )}
        </div>
        <div className="flex-shrink-0">
          <ScoreRing score={globalAvgScore} size={100} />
          <p className="text-xs text-center text-gray-500 mt-1">{t('dashboard.icaudGlobal')}</p>
        </div>
      </div>

      <div data-tour="alerts-panel">
        <AlertsPanel />
      </div>

      {/* Period Filters */}
      <div data-tour="period-filters" className="flex flex-wrap gap-2">
        <button
          onClick={() => setTimePeriod('live')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            timePeriod === 'live'
              ? 'bg-green-700 text-white shadow-md'
              : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          {t('periods.live')}
        </button>
        <button
          onClick={() => setTimePeriod('week')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            timePeriod === 'week'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          {t('periods.week')}
        </button>
        <button
          onClick={() => setTimePeriod('month')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            timePeriod === 'month'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          {t('periods.month')}
        </button>
      </div>

      {/* Geographic / classification filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterContinent}
          onChange={e => setFilters({ continent: e.target.value, country: '' })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">{t('ranking.allContinents')}</option>
          {continents.map(c => (
            <option key={c} value={c}>{t(`countries.continents.${c}`, c)}</option>
          ))}
        </select>

        <select
          value={filterCountry}
          onChange={e => setFilters({ country: e.target.value })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">{t('ranking.allCountries')}</option>
          {countriesInContinent.map(code => (
            <option key={code} value={code}>{t(`countries.${code}`, code)}</option>
          ))}
        </select>

        <select
          value={filterClass}
          onChange={e => setFilters({ class: e.target.value })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">{t('ranking.allClassifications')}</option>
          {CLASSIFICATIONS.map(c => (
            <option key={c.label} value={c.label}>{t(`classifications.${c.label}`, c.label)}</option>
          ))}
        </select>

        {hasActiveFilter && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2"
            title="Limpar filtros"
          >
            ✕ Limpar
          </button>
        )}

        <div className="text-sm text-gray-500 flex items-center ml-auto">
          {t('ranking.showing', { count: filteredCities.length })}
        </div>
      </div>

      {isLoading ? <Spinner /> : <GlobalStats cities={filteredCities} sensors={filteredSensors} />}

      {/* Map */}
      <div data-tour="live-map">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          {isHistoryMode
            ? t('dashboard.mapHistory', { period: timePeriod === 'week' ? t('dashboard.week') : t('dashboard.month') })
            : t('dashboard.mapLive')
          }
        </h2>
        <Suspense fallback={<Spinner />}>
          {mapReady && filteredSensors.length > 0 ? (
            <SensorMap sensors={filteredSensors} height="450px" />
          ) : mapReady && filteredSensors.length === 0 ? (
            <div className="h-[450px] bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">🗺️</div>
                <p className="text-sm">{hasActiveFilter ? 'Nenhum sensor corresponde ao filtro' : t('common.loading')}</p>
              </div>
            </div>
          ) : (
            <div className="h-[450px] flex items-center justify-center"><Spinner /></div>
          )}
        </Suspense>
      </div>

      {/* Charts + Top 10 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">{t('dashboard.topCities')}</h2>
          {rankingStillLoading || filteredRanking.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 gap-2">
              <div className="animate-spin text-3xl">⚙️</div>
              <p className="text-sm">{hasActiveFilter && allRanking.length > 0 ? 'Nenhuma cidade corresponde ao filtro' : t('common.loading')}</p>
            </div>
          ) : (
            <TopCitiesChart cities={filteredRanking} />
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">{t('dashboard.distribution')}</h2>
          {citiesLoading || filteredCities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 gap-2">
              <div className="animate-spin text-3xl">⚙️</div>
              <p className="text-sm">{hasActiveFilter && cities.length > 0 ? 'Nenhuma cidade corresponde ao filtro' : t('common.loading')}</p>
            </div>
          ) : (
            <ClassificationDonut cities={filteredCities} />
          )}
        </div>
      </div>

      {/* Top 10 ranking */}
      <div data-tour="top10-ranking" className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">{t('dashboard.top10')}</h2>
          <Link to="/ranking" className="text-sm text-green-600 hover:text-green-700 font-medium">
            {t('dashboard.viewAll')}
          </Link>
        </div>
        {rankingStillLoading ? (
          <Spinner />
        ) : filteredRanking.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-500 gap-3">
            {hasActiveFilter && allRanking.length > 0 ? (
              <p className="text-sm">Nenhuma cidade corresponde ao filtro</p>
            ) : (
              <>
                <div className="animate-spin text-3xl">⚙️</div>
                <p className="text-sm">{t('common.loading')}</p>
              </>
            )}
          </div>
        ) : (
          <RankingTable cities={filteredRanking} />
        )}
      </div>
    </div>
  );
}
