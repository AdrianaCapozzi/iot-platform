// src/pages/ICAUDExplainer.jsx
// Comprehensive explanation of ICAU-D, platform architecture, and data flow

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScoreRing, ClassificationBadge, StatCard } from '../components/ui/index.jsx';
import { classify, CLASSIFICATIONS, formatMeasurement } from '../utils/icaud.js';

/** Component explanation card */
function ComponentCard({ icon, name, ideal, formula, normalizedValue = null }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <h3 className="font-semibold text-gray-900">{name}</h3>
          <p className="text-xs text-gray-500">{ideal}</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded p-3 mb-3 text-xs font-mono text-gray-700 overflow-x-auto">
        {formula}
      </div>

      {normalizedValue !== null && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{t('explainer.icaud.scoreLabel')}</span>
            <span className="font-semibold">{normalizedValue.toFixed(1)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(100, normalizedValue))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Classification row for the scale */
function ClassificationRow({ classification }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-lg">
      <div
        className="w-20 h-20 rounded-lg flex items-center justify-center text-3xl"
        style={{ backgroundColor: `${classification.color}20` }}
      >
        <ScoreRing score={(classification.min + classification.max) / 2} size={60} />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-gray-900 mb-1">{t(`classifications.${classification.label}`, classification.label)}</div>
        <div className="text-sm text-gray-600">
          {t('common.range', { min: classification.min, max: classification.max })}
        </div>
      </div>
      <ClassificationBadge label={t(`classifications.${classification.label}`, classification.label)} color={classification.color} />
    </div>
  );
}

export default function ICAUDExplainer() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('arquitetura');

  // Example calculation
  const exampleTemp = 25;
  const exampleHumidity = 60;
  const examplePM25 = 15;
  const exampleWind = 3;

  const tempNorm = Math.max(0, 100 - Math.abs(exampleTemp - 22) * 4);
  const humidityNorm = Math.max(0, 100 - Math.abs(exampleHumidity - 50) * 2);
  const airQualityNorm = Math.max(0, 100 - examplePM25 * 2);
  const windNorm = Math.max(0, 100 - Math.abs(exampleWind - 2) * 20);

  const weights = {
    temp: 0.4,
    humidity: 0.3,
    airQuality: 0.2,
    wind: 0.1,
  };
  const icaudScore = (
    tempNorm * weights.temp +
    humidityNorm * weights.humidity +
    airQualityNorm * weights.airQuality +
    windNorm * weights.wind
  );

  const exampleClassification = classify(icaudScore);

  const TabButton = ({ id, label, icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      role="tab"
      aria-selected={activeTab === id}
      className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 ${
        activeTab === id
          ? 'bg-green-700 text-white shadow-md'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-100 p-8 md:p-12">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            {t('explainer.title')}
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            {t('explainer.subtitle')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label={t('explainer.title')} className="flex flex-wrap gap-3 border-b border-gray-200 pb-4">
        <TabButton id="arquitetura" label={t('explainer.tabArchitecture')} icon="🏗️" />
        <TabButton id="icaud" label={t('explainer.tabIcaud')} icon="📊" />
        <TabButton id="fontes" label={t('explainer.tabSources')} icon="🌍" />
        <TabButton id="v2" label="O que muda na v2.0" icon="🚀" />
      </div>

      {/* ============ TAB: ARQUITETURA ============ */}
      {activeTab === 'arquitetura' && (
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-10 bg-blue-500 rounded"></div>
          <h2 className="text-3xl font-bold text-gray-900">{t('explainer.architecture.title')}</h2>
        </div>

        <div className="space-y-8">

          {/* Overview */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('explainer.architecture.overviewTitle')}</h3>
            <p className="text-gray-600 mb-3">
              {t('explainer.architecture.overviewText1')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                t('explainer.architecture.stackCards.backend'),
                t('explainer.architecture.stackCards.frontend'),
                t('explainer.architecture.stackCards.db'),
                t('explainer.architecture.stackCards.deploy'),
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <div className="text-xs text-gray-500">{item.label}</div>
                  <div className="text-sm font-semibold text-gray-800">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Flow */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('explainer.architecture.flowTitle')}</h3>
            <div className="space-y-3">
              {[
                { num: 1, color: 'blue',   ...t('explainer.architecture.steps.1', { returnObjects: true }) },
                { num: 2, color: 'green',  ...t('explainer.architecture.steps.2', { returnObjects: true }) },
                { num: 3, color: 'purple', ...t('explainer.architecture.steps.3', { returnObjects: true }) },
                { num: 4, color: 'amber',  ...t('explainer.architecture.steps.4', { returnObjects: true }) },
                { num: 5, color: 'orange', ...t('explainer.architecture.steps.5', { returnObjects: true }) },
                { num: 6, color: 'cyan',   ...t('explainer.architecture.steps.6', { returnObjects: true }) },
                { num: 7, color: 'pink',   ...t('explainer.architecture.steps.7', { returnObjects: true }) },
              ].map(step => (
                <div key={step.num} className="flex gap-4 items-start">
                  <div className={`flex-shrink-0 w-12 h-12 bg-${step.color}-100 rounded-lg flex items-center justify-center text-lg font-bold text-${step.color}-600`}>
                    {step.num}
                  </div>
                  <div className="flex-1 bg-white border border-gray-100 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <span>{step.icon}</span>{step.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Multi-source fusion explanation */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>🔗</span> Fusão Multi-Fonte por Cidade
            </h3>
            <p className="text-gray-700 mb-3">
              Sensor.Community traz qualidade do ar (PM2.5/PM10), Open-Meteo traz meteorologia (temperatura/umidade/vento).
              Sozinha, nenhuma fonte cobre todas as 4 variáveis do ICAU-D em todas as cidades.
            </p>
            <p className="text-gray-700 mb-3">
              A EcoSense <strong>combina automaticamente as fontes</strong>: quando uma cidade está sem alguma
              variável, o sistema procura o sensor mais próximo de outra fonte (até 80 km) e usa o valor dele.
              Cada métrica guarda registro de sua origem — passe o mouse sobre qualquer valor para ver no tooltip ⓘ.
            </p>
            <div className="bg-white rounded-lg p-3 text-xs text-gray-700 border border-blue-100">
              <strong>Exemplo:</strong> "São Paulo" forma-se a partir do Open-Meteo (temp, umidade, vento). PM2.5 ainda
              está vazio, então buscamos o sensor Sensor.Community mais próximo (a ~12 km) e importamos só o PM2.5
              dele. Resultado: a cidade fica com as 4 variáveis e o ICAU-D usa pesos completos.
            </div>
          </div>

          {/* Diagrama de Arquitetura */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Diagrama Técnico</h3>
            <div className="bg-gray-950 border border-gray-700 rounded-xl p-6 font-mono text-xs text-green-400 overflow-x-auto">
              <pre className="leading-relaxed">{`
┌──────────────────────────────────────────────────────────────────────┐
│                    APIS EXTERNAS (Internet)                          │
│                                                                      │
│  ┌────────────────────────┐    ┌─────────────────────────────────┐   │
│  │   Sensor.Community     │    │         Open-Meteo              │   │
│  │  data.sensor.community │    │      api.open-meteo.com         │   │
│  │  ~200 sensores globais │    │  48 cidades (18 BR + 30 EU)     │   │
│  │  PM2.5, PM10, Temp,    │    │  Temperatura, Umidade, Vento    │   │
│  │  Umidade               │    │  Gratuito, sem chave de API     │   │
│  └──────────┬─────────────┘    └───────────────┬─────────────────┘   │
│             │                                  │                      │
│  ┌──────────┴──────────────────────────────────┘                      │
│  │    nominatim.openstreetmap.org (Reverse Geocoding)                 │
│  │    lat/lon → nome de cidade   |  1 req/s  |  cache MongoDB         │
│  └────────────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────┘
                               │ HTTP fetch (a cada 1h + startup)
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    BACKEND  Node.js / Express  :3002                 │
│                                                                      │
│  startup / scheduler (1h)                                            │
│       │                                                              │
│       ▼                                                              │
│  fetchAllSensors()  ──►  normalização  ──►  cálculo ICAU-D           │
│       │                                        │                     │
│       │                            saveSensorReadingsBatch()         │
│       ▼                                        ▼                     │
│  reverseGeocode()  (fila 1 req/s)     MongoDB Atlas                  │
│       │                               ├── SensorReading (TTL 30d)    │
│       ▼                               ├── CacheEntry  (TTL 1h)       │
│  fetchAllCities()                     └── GeocodeEntry (permanente)  │
│  buildRanking()    ──►  cache.set()                                  │
│                                                                      │
│  REST API endpoints:                                                 │
│  GET /api/health            GET /api/cities                          │
│  GET /api/sensors           GET /api/cities/ranking                  │
│  GET /api/sensors/history   GET /api/cities/:name                    │
│  POST /api/refresh                                                   │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ HTTP/JSON (proxy via Nginx em produção)
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                 FRONTEND  React + Vite  (Nginx :80)                  │
│                                                                      │
│  React Query (cache 55min)  ──►  fallback automático p/ histórico    │
│                                                                      │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐  │
│  │  Painel  │ │ Ranking │ │   Mapa   │ │Sensores │ │Como Funciona│  │
│  │Dashboard │ │  + 7d   │ │Leaflet   │ │Explainer│ │  ICAU-D    │  │
│  │ charts   │ │  + 30d  │ │ + popup  │ │         │ │Arquitetura │  │
│  └──────────┘ └─────────┘ └──────────┘ └─────────┘ └────────────┘  │
│                                                                      │
│  Filtros: Ao Vivo | Últimos 7 Dias | Último Mês                      │
│  Filtros Ranking: Continente | País | Classificação ICAU-D           │
└──────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
             ┌─────────────────────────┐
             │   Docker + Portainer    │
             │  docker-compose.yml     │
             │  backend + frontend     │
             │  iot-platform.viniciusgnandt.com.br  │
             └─────────────────────────┘
`}</pre>
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('explainer.architecture.stackTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { stack: t('explainer.architecture.backendStack',  { returnObjects: true }), color: 'bg-green-500' },
                { stack: t('explainer.architecture.frontendStack', { returnObjects: true }), color: 'bg-blue-500' },
                { stack: t('explainer.architecture.infraStack',    { returnObjects: true }), color: 'bg-purple-500' },
                { stack: t('explainer.architecture.securityStack', { returnObjects: true }), color: 'bg-amber-500' },
              ].map(({ stack, color }) => (
                <div key={stack.title} className="bg-white border border-gray-100 rounded-xl p-5">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">{stack.title}</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {stack.items.map(item => (
                      <li key={item} className="flex items-center gap-2">
                        <span className={`w-2 h-2 ${color} rounded-full flex-shrink-0`}></span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* MongoDB Atlas Structure */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('explainer.architecture.mongoTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { color: 'blue',   ...t('explainer.architecture.collections.sensorReading', { returnObjects: true }) },
                { color: 'green',  ...t('explainer.architecture.collections.cacheEntry',    { returnObjects: true }) },
                { color: 'purple', ...t('explainer.architecture.collections.geocodeEntry',  { returnObjects: true }) },
              ].map(col => (
                <div key={col.name} className={`bg-${col.color}-50 border border-${col.color}-200 rounded-xl p-5`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{col.icon}</span>
                    <div>
                      <h4 className="font-bold text-gray-900 font-mono text-sm">{col.name}</h4>
                      <p className="text-xs text-gray-600">{col.desc}</p>
                    </div>
                  </div>
                  <ul className="space-y-1 mt-3">
                    {col.fields.map(f => (
                      <li key={f} className="text-xs text-gray-700 font-mono bg-white bg-opacity-60 rounded px-2 py-1">{f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Data Sources */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('explainer.architecture.sourcesTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">🌍 Sensor.Community</h4>
                <p className="text-sm text-gray-600 mb-3">{t('explainer.sources.sc.desc')}</p>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>{t('explainer.sources.coverageLabel')}:</strong> {t('explainer.sources.sc.coverage')}</div>
                  <div><strong>{t('explainer.sources.updateLabel')}:</strong> {t('explainer.sources.sc.update')}</div>
                  <div><strong>{t('explainer.sources.dataLabel')}:</strong> {t('explainer.sources.sc.data')}</div>
                  <div><strong>API:</strong> data.sensor.community</div>
                  <div><strong>{t('explainer.sources.freeTag')}</strong></div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">⛅ Open-Meteo (Meteorologia)</h4>
                <p className="text-sm text-gray-600 mb-3">{t('explainer.sources.meteo.desc')}</p>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>{t('explainer.sources.coverageLabel')}:</strong> {t('explainer.sources.meteo.coverage')}</div>
                  <div><strong>{t('explainer.sources.updateLabel')}:</strong> {t('explainer.sources.meteo.update')}</div>
                  <div><strong>{t('explainer.sources.dataLabel')}:</strong> {t('explainer.sources.meteo.data')}</div>
                  <div><strong>API:</strong> api.open-meteo.com</div>
                  <div><strong>{t('explainer.sources.freeTag')}</strong></div>
                </div>
              </div>

              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">🌫️ Open-Meteo Air Quality</h4>
                <p className="text-sm text-gray-600 mb-3">
                  API gratuita baseada no modelo CAMS (ECMWF) que fornece PM2.5 e PM10 globalmente.
                  Garante cobertura de qualidade do ar em cidades brasileiras, onde Sensor.Community
                  praticamente não tem sensores instalados.
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>Cobertura:</strong> Global (modelo CAMS)</div>
                  <div><strong>Atualização:</strong> Horária</div>
                  <div><strong>Dados:</strong> PM2.5, PM10</div>
                  <div><strong>API:</strong> air-quality-api.open-meteo.com</div>
                  <div><strong>API Gratuita</strong></div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">🗺️ Nominatim (OpenStreetMap)</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Reverse geocoding: lat/lon → city name
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>{t('explainer.sources.coverageLabel')}:</strong> Global</div>
                  <div><strong>Rate limit:</strong> 1 req/s</div>
                  <div><strong>Cache:</strong> MongoDB</div>
                  <div><strong>API:</strong> nominatim.openstreetmap.org</div>
                  <div><strong>Custo:</strong> Gratuito, sem chave</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      )}

      {/* ============ TAB: ICAU-D ============ */}
      {activeTab === 'icaud' && (
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-10 bg-green-500 rounded"></div>
          <h2 className="text-3xl font-bold text-gray-900">{t('explainer.icaud.title')}</h2>
        </div>

        <div className="space-y-8">
          {/* What is ICAU-D */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('explainer.icaud.whatTitle')}</h3>
            <p className="text-gray-600 mb-4">{t('explainer.icaud.whatText1')}</p>
            <p className="text-gray-600">{t('explainer.icaud.whatText2')}</p>
          </div>

          {/* 4 Components */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('explainer.icaud.componentsTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['temperature','humidity','airQuality','wind'].map((key, i) => {
                const comp = t(`explainer.icaud.components.${key}`, { returnObjects: true });
                const vals = [tempNorm, humidityNorm, airQualityNorm, windNorm];
                return (
                  <ComponentCard
                    key={key}
                    icon={comp.icon}
                    name={comp.name}
                    ideal={comp.ideal}
                    formula={comp.formula}
                    normalizedValue={vals[i]}
                  />
                );
              })}
            </div>
          </div>

          {/* Weights */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('explainer.icaud.weightsTitle')}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weights table */}
              <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-4">{t('explainer.icaud.weightsTitle')}</h4>
                <div className="space-y-3">
                  {[
                    { icon: '🌡️', key: 'temperature', color: 'text-green-600', pct: '40%' },
                    { icon: '💧', key: 'humidity',    color: 'text-blue-600',  pct: '30%' },
                    { icon: '🌫️', key: 'airQuality',  color: 'text-purple-600', pct: '20%' },
                    { icon: '💨', key: 'wind',        color: 'text-cyan-600',  pct: '10%' },
                  ].map(({ icon, key, color, pct }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-gray-700">
                        <span>{icon}</span> {t(`explainer.icaud.components.${key}`, { returnObjects: true }).name}
                      </span>
                      <span className={`font-mono font-bold ${color}`}>{pct}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formula box */}
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
                <h4 className="font-semibold text-gray-900 mb-4">{t('explainer.icaud.dynamicTitle')}</h4>
                <div className="bg-white rounded p-3 text-xs font-mono text-gray-700 mb-3 overflow-x-auto">
                  ICAU-D = (T × 0.4) + (U × 0.3) + (AQ × 0.2) + (V × 0.1)
                </div>
                <p className="text-sm text-gray-600">
                  {t('explainer.icaud.dynamicText')}
                </p>
              </div>
            </div>
          </div>

          {/* Classification Scale */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('explainer.icaud.scaleTitle')}</h3>

            <div className="space-y-3">
              {CLASSIFICATIONS.map((classification) => (
                <ClassificationRow key={classification.label} classification={classification} />
              ))}
            </div>
          </div>

          {/* Example */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('explainer.icaud.exampleTitle')}</h3>
            <p className="text-gray-600 mb-6">{t('explainer.icaud.exampleSubtitle')}</p>
            {/* Input values */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard
                label={t('cityDetail.measurements.temperature')}
                value={exampleTemp}
                unit="°C"
                icon="🌡️"
                color="#f59e0b"
              />
              <StatCard
                label={t('cityDetail.measurements.humidity')}
                value={exampleHumidity}
                unit="%"
                icon="💧"
                color="#3b82f6"
              />
              <StatCard
                label={t('cityDetail.measurements.pm25')}
                value={examplePM25}
                unit="µg/m³"
                icon="🌫️"
                color="#8b5cf6"
              />
              <StatCard
                label={t('cityDetail.measurements.windSpeed')}
                value={exampleWind}
                unit="m/s"
                icon="💨"
                color="#06b6d4"
              />
            </div>

            {/* Step by step */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h4 className="font-semibold text-gray-900 mb-3">Step 1: Normalize</h4>
                <div className="space-y-2 text-sm font-mono text-gray-700">
                  <div>🌡️ Temp = max(0, 100 - |{exampleTemp} - 22| × 4) = <span className="font-bold text-green-600">{tempNorm.toFixed(1)}</span></div>
                  <div>💧 Hum = max(0, 100 - |{exampleHumidity} - 50| × 2) = <span className="font-bold text-green-600">{humidityNorm.toFixed(1)}</span></div>
                  <div>🌫️ AQ = max(0, 100 - {examplePM25} × 2) = <span className="font-bold text-green-600">{airQualityNorm.toFixed(1)}</span></div>
                  <div>💨 Wind = max(0, 100 - |{exampleWind} - 2| × 20) = <span className="font-bold text-green-600">{windNorm.toFixed(1)}</span></div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h4 className="font-semibold text-gray-900 mb-3">Step 2: Apply weights</h4>
                <div className="text-sm font-mono text-gray-700">
                  = ({tempNorm.toFixed(1)} × 0.40) + ({humidityNorm.toFixed(1)} × 0.30) + ({airQualityNorm.toFixed(1)} × 0.20) + ({windNorm.toFixed(1)} × 0.10)
                  <div className="text-xs text-gray-500 mt-2">
                    = {(tempNorm * 0.4).toFixed(2)} + {(humidityNorm * 0.3).toFixed(2)} + {(airQualityNorm * 0.2).toFixed(2)} + {(windNorm * 0.1).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-100 p-5">
                <h4 className="font-semibold text-gray-900 mb-4">{t('explainer.icaud.exampleResult', { score: icaudScore.toFixed(1), label: t(`classifications.${exampleClassification?.label}`, exampleClassification?.label) })}</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 mb-2">ICAU-D Score</div>
                    <div className="text-3xl font-bold font-mono" style={{ color: exampleClassification?.color }}>
                      {icaudScore.toFixed(1)}
                    </div>
                  </div>
                  <div className="text-right">
                    <ClassificationBadge
                      label={t(`classifications.${exampleClassification?.label}`, exampleClassification?.label)}
                      color={exampleClassification?.color}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ============ TAB: FONTES DE DADOS ============ */}
      {activeTab === 'fontes' && (
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-10 bg-amber-500 rounded"></div>
          <h2 className="text-3xl font-bold text-gray-900">{t('explainer.sources.title')}</h2>
        </div>

        <div className="space-y-8">
          {/* Introduction */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <p className="text-gray-600 mb-3">{t('explainer.sources.subtitle')}</p>
          </div>

          {/* Sensor.Community */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">🌍 {t('explainer.sources.sc.name')}</h4>
                  <p className="text-sm text-gray-600 mt-1">{t('explainer.sources.sc.type')}</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">{t('explainer.sources.freeTag')}</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">{t('explainer.sources.sc.desc')}</p>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <div><strong>{t('explainer.sources.coverageLabel')}:</strong> {t('explainer.sources.sc.coverage')}</div>
                <div><strong>{t('explainer.sources.updateLabel')}:</strong> {t('explainer.sources.sc.update')}</div>
                <div><strong>{t('explainer.sources.dataLabel')}:</strong> {t('explainer.sources.sc.data')}</div>
                <div><strong>{t('explainer.sources.sensorsLabel')}:</strong> {t('explainer.sources.sc.sensors')}</div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <a href="https://sensor.community" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  <span aria-hidden="true">📍</span> sensor.community →<span className="sr-only"> (abre em nova aba)</span>
                </a>
              </div>
            </div>

            {/* Open-Meteo */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">⛅ {t('explainer.sources.meteo.name')}</h4>
                  <p className="text-sm text-gray-600 mt-1">{t('explainer.sources.meteo.type')}</p>
                </div>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">{t('explainer.sources.freeTag')}</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">{t('explainer.sources.meteo.desc')}</p>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <div><strong>{t('explainer.sources.coverageLabel')}:</strong> {t('explainer.sources.meteo.coverage')}</div>
                <div><strong>{t('explainer.sources.updateLabel')}:</strong> {t('explainer.sources.meteo.update')}</div>
                <div><strong>{t('explainer.sources.dataLabel')}:</strong> {t('explainer.sources.meteo.data')}</div>
                <div><strong>{t('explainer.sources.sensorsLabel')}:</strong> {t('explainer.sources.meteo.sensors')}</div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  <span aria-hidden="true">📍</span> open-meteo.com →<span className="sr-only"> (abre em nova aba)</span>
                </a>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 {t('explainer.sources.summaryTitle')}</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              {(t('explainer.sources.summaryItems', { returnObjects: true })).map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">✓</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      )}

      {/* ============ TAB: O QUE MUDA NA V2.0 ============ */}
      {activeTab === 'v2' && (
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-10 bg-teal-500 rounded"></div>
          <h2 className="text-3xl font-bold text-gray-900">O que muda na v2.0</h2>
        </div>

        <div className="space-y-8">
          {/* Intro */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border border-teal-100 p-6">
            <p className="text-gray-700">
              A v2.0 já está em boa parte no ar: histórico confiável, tendências, alertas
              de qualidade e um painel de acessibilidade de verdade. Falta só a base
              técnica de monetização (API paga + publicidade) prevista no plano de
              negócios.
            </p>
          </div>

          {/* Tour guiado */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-start gap-4">
            <span className="text-3xl" aria-hidden="true">❔</span>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Novo: tour guiado de primeira visita</h3>
              <p className="text-sm text-gray-600">
                Quem entra pela primeira vez recebe um passo a passo com destaque
                escurecendo o resto da tela — nav principal, mapa ao vivo, filtros,
                alertas, ranking e o menu de acessibilidade. Pode ser revisto a qualquer
                momento clicando no <strong>❔</strong> no canto do cabeçalho.
              </p>
            </div>
          </div>

          {/* Limitações x Objetivos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <h3 className="font-bold text-orange-700 mb-3 flex items-center gap-2">
                <span>⚠️</span> Limitações — antes da v2.0
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✅</span><span>Limitação quanto ao armazenamento do histórico <em className="text-green-700 not-italic font-medium">— resolvido (Fase 1)</em></span></li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✅</span><span>Inexistência de controle de qualidade dos dados <em className="text-green-700 not-italic font-medium">— resolvido (Fase 3)</em></span></li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✅</span><span>Falta de identificação de tendências <em className="text-green-700 not-italic font-medium">— resolvido (Fase 3)</em></span></li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✅</span><span>Ausência de geração de alertas <em className="text-green-700 not-italic font-medium">— resolvido (Fase 3)</em></span></li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✅</span><span>Não apresenta recursos de acessibilidade <em className="text-green-700 not-italic font-medium">— resolvido (Fase 3)</em></span></li>
              </ul>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                <span>🎯</span> Objetivos da v2.0
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✅</span>Melhorar como os dados são armazenados, processados e apresentados</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✅</span>Armazenar e analisar histórico de dados ambientais</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✅</span>Gerar resumos, identificando tendências</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✅</span>Emitir alertas sobre alterações relevantes</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✅</span>Apresentar informações de forma acessível a todos</li>
              </ul>
            </div>
          </div>

          {/* Fases */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Roteiro em 4 fases</h3>
            <div className="space-y-3">
              {[
                {
                  num: 1,
                  badge: 'flex-shrink-0 w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center text-lg font-bold text-teal-600',
                  tag: 'base de tudo',
                  status: 'done',
                  title: 'Arrumar a coleta',
                  desc: 'Feito: todas as fontes (Sensor.Community, Open-Meteo, Open-Meteo Air Quality) agora salvam histórico de verdade, sem duplicar, com correção de um bug que descartava leituras silenciosamente.',
                },
                {
                  num: 2,
                  badge: 'flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-lg font-bold text-emerald-600',
                  tag: 'destrava os gráficos',
                  status: 'done',
                  title: 'Montar os resumos',
                  desc: 'Feito: resumo horário por cidade pronto no banco (ICAU-D + medições) e gráfico de histórico na página de cada cidade, com toggle 7 dias / 30 dias.',
                },
                {
                  num: 3,
                  badge: 'flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-lg font-bold text-purple-600',
                  tag: 'valor pro usuário',
                  status: 'done',
                  title: 'Análise: tendências, qualidade, alertas e acessibilidade',
                  desc: 'Feito: badge de tendência (melhorando/estável/piorando) na página da cidade, detecção de sensor travado, painel de alertas de pico de poluição no Dashboard. Em acessibilidade: menu no cabeçalho com alto contraste, 3 tamanhos de fonte, reduzir animações e um narrador que lê a página em voz alta — além de contraste de cor corrigido (WCAG AA), skip-link, foco por teclado visível e ARIA em Painel, Ranking, Mapa, Sensores e Como Funciona. E um tour guiado (❔ no cabeçalho) que apresenta a plataforma na primeira visita.',
                },
                {
                  num: 4,
                  badge: 'flex-shrink-0 w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-lg font-bold text-amber-600',
                  tag: 'monetização',
                  status: 'planned',
                  title: 'API pública paga e publicidade',
                  desc: 'Chave de acesso por cliente, controle de cota/limite de uso e registro de consultas — a base técnica para cobrar por uso da API e sustentar o plano gratuito com publicidade no painel público.',
                },
              ].map(phase => (
                <div key={phase.num} className="flex gap-4 items-start">
                  <div className={phase.badge}>
                    {phase.num}
                  </div>
                  <div className="flex-1 bg-white border border-gray-100 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                      {phase.title}
                      <span className="text-[10px] uppercase tracking-wide font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                        {phase.tag}
                      </span>
                      {phase.status === 'done' ? (
                        <span className="text-[10px] uppercase tracking-wide font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          ✅ concluído
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wide font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          🔜 planejado
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{phase.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status atual */}
          <div className="bg-amber-50 border-l-4 border-amber-400 border border-amber-200 rounded-xl p-6">
            <h3 className="font-semibold text-amber-800 mb-2">O que falta</h3>
            <p className="text-sm text-gray-700">
              Fases 1, 2 e 3 estão no ar e testadas contra o banco real. Só falta a
              <strong> Fase 4</strong>: a chave de API por cliente, controle de cota e
              registro de consultas que viabilizam a API paga e a publicidade previstas
              no plano de negócios.
            </p>
          </div>
        </div>
      </div>
      )}

      {/* Footer */}
      <div className="text-center py-8 text-sm text-gray-500 border-t border-gray-100">
        <p className="font-semibold">EcoSense — {t('explainer.title')}</p>
      </div>
    </div>
  );
}

