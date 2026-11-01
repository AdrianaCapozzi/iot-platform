// src/pages/Ranking.jsx
// Full city ranking page with filtering

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRanking, useSensorsHistory, useSensorsHistoryFallback, useCities } from '../hooks/useEnvironmentalData.js';
import { useSyncedFilters } from '../hooks/useSyncedFilters.js';
import { Spinner, ErrorAlert } from '../components/ui/index.jsx';
import RankingTable from '../components/ranking/RankingTable.jsx';
import { CLASSIFICATIONS, classify } from '../utils/icaud.js';
import { formatRelativeTimeBRT, formatFullDateTimeBRT } from '../utils/dateFormatter.js';

// Country → continent mapping (English keys to match i18n)
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

// Country codes (names resolved via i18n in component)
const COUNTRY_CODES = [
  'BR','DE','GB','FR','ES','IT','NL','AT','PL','CZ','HU','BE',
  'CH','DK','SE','NO','FI','PT','GR','IE','RO','BG','HR','RS',
  'MK','RU','UA','AM',
];

function getContinent(country) {
  return COUNTRY_CONTINENT[country] || 'Other';
}

/**
 * Agrega sensores históricos em cidades (mesmo critério do backend).
 * Usado nos modos "7 dias" e "30 dias".
 */
function aggregateSensorsToCities(sensors) {
  const cityMap = new Map();

  for (const s of sensors) {
    const cityName = s.location?.city;
    if (!cityName) continue;

    if (!cityMap.has(cityName)) {
      cityMap.set(cityName, {
        name: cityName,
        country: s.location?.country || 'Unknown',
        sensors: [],
      });
    }
    cityMap.get(cityName).sensors.push(s);
  }

  const cities = [];
  for (const { name, country, sensors: ss } of cityMap.values()) {
    const scores = ss.map(s => s.icaud?.score).filter(v => v !== null && v !== undefined);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    const avg = (field) => {
      const vals = ss.map(s => s.measurements?.[field]).filter(v => v !== null && v !== undefined);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    cities.push({
      name,
      country,
      sensorCount: ss.length,
      icaud: {
        score: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
        classification: avgScore !== null ? classify(avgScore) : null,
      },
      measurements: {
        temperature: avg('temperature'),
        humidity: avg('humidity'),
        pm25: avg('pm25'),
        windSpeed: avg('windSpeed'),
      },
    });
  }

  return cities.sort((a, b) => (b.icaud?.score ?? -1) - (a.icaud?.score ?? -1));
}

export default function Ranking() {
  const { t } = useTranslation();
  const [timePeriod, setTimePeriod]     = useState('live');
  const [limit, setLimit]               = useState(50);
  const { filters, update: setFilters, clear: clearFilters, hasActive } = useSyncedFilters();
  const filterClass     = filters.class;
  const filterContinent = filters.continent;
  const filterCountry   = filters.country;

  const { data: rankingRes, isLoading: rankingLoading, refetch } = useRanking(limit);
  const { data: allCities = [] } = useCities();
  const { data: historySensors = [], isLoading: historyLoading } = useSensorsHistory(timePeriod);
  const { data: fallbackSensors = [] } = useSensorsHistoryFallback({
    enabled: !rankingRes?.data || rankingRes.data.length === 0,
  });

  const isHistoryMode = timePeriod !== 'live';

  // Quando há filtro de continente/país/classificação ativo, usamos a lista
  // completa de cidades como fonte (até ~258), para que o ranking não fique
  // limitado às top-N globais — caso contrário, ao filtrar "Brasil" só
  // aparecem as 4 cidades BR que entraram no top 50 mundial.
  const useFullCatalog = !isHistoryMode && hasActive && allCities.length > 0;
  const liveCities = useFullCatalog
    ? [...allCities]
        .filter(c => c.icaud?.score !== null && c.icaud?.score !== undefined)
        .sort((a, b) => (b.icaud.score || 0) - (a.icaud.score || 0))
        .map((c, i) => ({ ...c, rank: i + 1 }))
    : (rankingRes?.data || []);

  // Cidades históricas agregadas no frontend
  const historyCities = useMemo(
    () => aggregateSensorsToCities(historySensors),
    [historySensors]
  );
  const fallbackCities = useMemo(
    () => aggregateSensorsToCities(fallbackSensors),
    [fallbackSensors]
  );

  // Seleção de dados com fallback (mesmo padrão do Dashboard)
  const cities = isHistoryMode
    ? (historyCities.length > 0 ? historyCities : liveCities)
    : (liveCities.length > 0 ? liveCities : fallbackCities);

  const usingFallback = !isHistoryMode && liveCities.length === 0 && fallbackCities.length > 0;

  const isLoadingData = isHistoryMode
    ? historyLoading
    : rankingLoading || rankingRes?.loading;

  // Data da leitura mais recente entre todas as cidades visíveis
  const lastReadingAt = useMemo(() => {
    const timestamps = cities.map(c => c.lastSeen || c.updatedAt).filter(Boolean).sort();
    return timestamps.at(-1) || null;
  }, [cities]);

  // Extrair continentes e países disponíveis
  const { continents, countriesInContinent } = useMemo(() => {
    const continentSet = new Set();
    const countrySet = new Set();
    for (const c of cities) {
      const code = c.country;
      if (code) {
        continentSet.add(getContinent(code));
        countrySet.add(code);
      }
    }
    const continents = [...continentSet].sort();
    const countriesInContinent = [...countrySet]
      .filter(code => !filterContinent || getContinent(code) === filterContinent)
      .sort((a, b) => (t(`countries.${a}`, a)).localeCompare(t(`countries.${b}`, b)));

    return { continents, countriesInContinent };
  }, [cities, filterContinent, t]);

  const filtered = cities.filter(c => {
    if (filterClass && c.icaud?.classification?.label !== filterClass) return false;
    if (filterContinent && getContinent(c.country) !== filterContinent) return false;
    if (filterCountry && c.country !== filterCountry) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('ranking.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isHistoryMode
              ? t('ranking.subtitleHistory', { period: timePeriod === 'week' ? t('ranking.week') : t('ranking.month'), cities: cities.length })
              : usingFallback
                ? t('ranking.subtitleFallback', { cities: cities.length })
                : t('ranking.subtitleLive')
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
              {t('ranking.fallbackBadge')}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="text-sm bg-green-50 text-green-700 hover:bg-green-100 px-4 py-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1"
        >
          {t('ranking.refresh')}
        </button>
      </div>

      {/* Period Filters */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('ranking.periodGroup', 'Período')}>
        <button
          onClick={() => setTimePeriod('live')}
          aria-pressed={timePeriod === 'live'}
          className={`px-4 py-2 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 ${
            timePeriod === 'live'
              ? 'bg-green-700 text-white shadow-md'
              : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          {t('periods.live')}
        </button>
        <button
          onClick={() => setTimePeriod('week')}
          aria-pressed={timePeriod === 'week'}
          className={`px-4 py-2 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
            timePeriod === 'week'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          {t('periods.week')}
        </button>
        <button
          onClick={() => setTimePeriod('month')}
          aria-pressed={timePeriod === 'month'}
          className={`px-4 py-2 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1 ${
            timePeriod === 'month'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          {t('periods.month')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {!isHistoryMode && (
          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            aria-label={t('ranking.top50', 'Quantidade de cidades')}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value={25}>{t('ranking.top25')}</option>
            <option value={50}>{t('ranking.top50')}</option>
            <option value={100}>{t('ranking.top100')}</option>
          </select>
        )}

        <select
          value={filterContinent}
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
          value={filterCountry}
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
          value={filterClass}
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

        <div className="text-sm text-gray-500 flex items-center">
          {t('ranking.showing', { count: filtered.length })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-500 gap-3">
            <div className="animate-spin text-4xl">⚙️</div>
            <p className="text-sm font-medium">{t('ranking.loadingData')}</p>
            <p className="text-xs text-gray-300">{t('ranking.autoUpdate')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {cities.length === 0
              ? t('ranking.waiting')
              : t('ranking.noMatch')
            }
          </div>
        ) : (
          <RankingTable cities={filtered} showDetails={true} />
        )}
      </div>

      {/* Classification legend */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">{t('ranking.legend')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CLASSIFICATIONS.map(cls => (
            <div key={cls.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
              <div>
                <div className="text-sm font-medium text-gray-700">{t(`classifications.${cls.label}`, cls.label)}</div>
                <div className="text-xs text-gray-500">{t('common.range', { min: cls.min, max: cls.max })}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
