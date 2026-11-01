// src/pages/SensorExplainer.jsx
// Comprehensive guide about sensors and types
import { useTranslation } from 'react-i18next';

/** Sensor type card */
function SensorTypeCard({ icon, name, model, description, measurements, manufacturer, cost }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4 mb-4">
        <div className="text-4xl">{icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg">{name}</h3>
          <p className="text-xs text-gray-500 mt-1"><span className="font-mono">{model}</span></p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">{description}</p>

      <div className="space-y-2 mb-4">
        <div>
          <span className="text-xs font-semibold text-gray-700 uppercase">{t('sensors.sensorFields.measures')}:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {measurements.map(m => (
              <span key={m} className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                {m}
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-700 uppercase">{t('sensors.sensorFields.type')}:</span>
          <p className="text-sm text-gray-600 mt-0.5">{manufacturer}</p>
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-700 uppercase">{t('sensors.sensorFields.precision')}:</span>
          <p className="text-sm text-gray-600 mt-0.5">{cost}</p>
        </div>
      </div>
    </div>
  );
}

/** Measurement info card */
function MeasurementInfoCard({ icon, name, unit, range, accuracy, importance }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <h4 className="font-semibold text-gray-900">{name}</h4>
          <p className="text-xs text-gray-500">{unit}</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between border-b border-gray-100 pb-2">
          <span className="text-gray-600">{range}</span>
        </div>
        <div className="flex justify-between border-b border-gray-100 pb-2">
          <span className="font-mono font-semibold text-gray-800">{accuracy}</span>
        </div>
        <div>
          <p className="text-gray-600">{importance}</p>
        </div>
      </div>
    </div>
  );
}

export default function SensorExplainer() {
  const { t } = useTranslation();
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100 p-8 md:p-12">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            {t('sensors.title')}
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            {t('sensors.subtitle')}
          </p>
        </div>
      </div>

      {/* How sensors work */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-5">{t('sensors.howTitle')}</h2>

        <div className="bg-white rounded-xl border border-gray-100 p-8">
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-xl">
                🔬
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">1. Medição</h3>
                <p className="text-gray-600">
                  O sensor detecta uma variável física (temperatura, umidade, particulas de ar)
                  usando circuitos eletrônicos especializados.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-xl">
                📊
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">2. Conversão</h3>
                <p className="text-gray-600">
                  O sinal analógico é convertido para digital (0-1023 ou similar) por um microcontrolador.
                  Dados são calibrados para a unidade correta (°C, %, µg/m³, m/s).
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-xl">
                📡
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">3. Transmissão</h3>
                <p className="text-gray-600">
                  Os dados são enviados via WiFi, GPRS, LoRaWAN ou outro protocolo de rede
                  para servidores na internet (Sensor.Community, Open-Meteo, etc).
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-xl">
                ☁️
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">4. Armazenamento</h3>
                <p className="text-gray-600">
                  Os servidores armazenam os dados em bancos de dados. A EcoSense acessa essas APIs
                  públicas para coletar os dados em tempo real.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-xl">
                📈
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">5. Análise</h3>
                <p className="text-gray-600">
                  A plataforma processa os dados, calcula o índice ICAU-D, agrega por cidade,
                  e exibe em mapas, gráficos e rankings para o usuário final.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sensor types used in EcoSense */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-5">{t('sensors.typesTitle')}</h2>
        <p className="text-gray-600 mb-6">
          A plataforma integra dados de <strong>2 redes públicas</strong> diferentes, agregando sensores comunitários e estações meteorológicas:
        </p>

        <div className="space-y-6">
          {/* Sensor.Community */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🌍</span> Sensor.Community — Luftdaten / NOVA
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SensorTypeCard
                icon="💨"
                name="Nova SDS011"
                model="SDS011"
                description="Sensor de qualidade do ar por dispersão laser. Detecta particulas finas com alta precisão. Muito popular em redes comunitárias de baixo custo."
                measurements={['PM2.5', 'PM10']}
                manufacturer="Nova Fitness"
                cost="€20-30"
              />
              <SensorTypeCard
                icon="💧"
                name="DHT22"
                model="DHT22"
                description="Sensor de temperatura e umidade relativa. Combina com SDS011 em muitas estações Sensor.Community para medir 4 variáveis."
                measurements={['Temperatura', 'Umidade']}
                manufacturer="Aosong"
                cost="€5-10"
              />
            </div>
          </div>

          {/* Open-Meteo */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>⛅</span> Open-Meteo — Estações Meteorológicas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SensorTypeCard
                icon="⛅"
                name="Estações Meteorológicas (Open-Meteo)"
                model="Reanálise + estações globais"
                description="API gratuita e aberta que fornece dados meteorológicos de alta resolução para qualquer coordenada do mundo. Combina dados de estações meteorológicas e modelos numéricos. Cobre cidades brasileiras e europeias."
                measurements={['Temperatura', 'Umidade', 'Velocidade do Vento']}
                manufacturer="Open-Meteo (open source)"
                cost="Gratuito (sem chave de API)"
              />
              <SensorTypeCard
                icon="🌫️"
                name="Open-Meteo Air Quality (modelo CAMS)"
                model="CAMS / ECMWF"
                description="API gratuita de qualidade do ar baseada no modelo CAMS do ECMWF. Cobre todo o globo em altíssima resolução, fornecendo concentrações de PM2.5/PM10 mesmo em regiões sem sensores comunitários. Usada para garantir cobertura de qualidade do ar em todas as cidades brasileiras (onde Sensor.Community tem pouca presença)."
                measurements={['PM2.5', 'PM10']}
                manufacturer="ECMWF / Open-Meteo"
                cost="Gratuito (sem chave de API)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Multi-source merging */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6 md:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>🔗</span> Fusão Multi-Fonte por Cidade
        </h2>
        <p className="text-gray-700 mb-5">
          Cada fonte mede coisas diferentes: <strong>Sensor.Community</strong> é forte em qualidade do ar
          (PM2.5, PM10), enquanto <strong>Open-Meteo</strong> traz meteorologia confiável (vento, temperatura,
          umidade) para todas as cidades fixas. Sozinha, nenhuma cobre as 4 variáveis do ICAU-D em todos os lugares.
        </p>
        <p className="text-gray-700 mb-5">
          Por isso a EcoSense <strong>combina automaticamente as fontes por cidade</strong>: para cada
          variável faltante em uma cidade, buscamos o sensor mais próximo de outra fonte (até 80 km) e
          usamos o valor dele. Assim, São Paulo, por exemplo, ganha o vento do Open-Meteo e o PM2.5
          de um sensor IoT comunitário próximo.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg border border-blue-100 p-4">
            <div className="text-2xl mb-2">1️⃣</div>
            <h4 className="font-semibold text-gray-900 mb-1">Coleta separada</h4>
            <p className="text-sm text-gray-600">Cada fonte é consultada de forma independente — Sensor.Community traz PM2.5/PM10, Open-Meteo traz temperatura/umidade/vento.</p>
          </div>
          <div className="bg-white rounded-lg border border-blue-100 p-4">
            <div className="text-2xl mb-2">2️⃣</div>
            <h4 className="font-semibold text-gray-900 mb-1">Agrupamento por cidade</h4>
            <p className="text-sm text-gray-600">Sensores são agrupados pela cidade onde estão instalados (resolvida via geocoding reverso quando necessário).</p>
          </div>
          <div className="bg-white rounded-lg border border-blue-100 p-4">
            <div className="text-2xl mb-2">3️⃣</div>
            <h4 className="font-semibold text-gray-900 mb-1">Preenchimento cruzado</h4>
            <p className="text-sm text-gray-600">Variáveis ausentes são preenchidas com o sensor mais próximo de outra fonte (raio 80 km). A fonte de cada métrica é registrada e exibida no tooltip ⓘ.</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-white bg-opacity-70 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-700">
            <strong>💡 Dica:</strong> Em qualquer card de medição (Painel, Cidade, Ranking), passe o mouse sobre
            o ícone <span className="inline-block px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">ⓘ</span> ou
            sobre o valor numérico para ver de qual fonte aquele dado veio.
          </p>
        </div>
      </div>

      {/* Measurement specifications */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-5">{t('sensors.maintenanceTitle')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MeasurementInfoCard
            icon="🌡️"
            name="Temperatura"
            unit="Celsius (°C)"
            range="-50°C a +60°C"
            accuracy="±0.5°C a ±2°C"
            importance="Sensível a localização. Varia muito com sombra/sol. Ideal é 22°C para conforto humano."
          />
          <MeasurementInfoCard
            icon="💧"
            name="Umidade Relativa"
            unit="Porcentagem (%)"
            range="0% a 100%"
            accuracy="±2% a ±5%"
            importance="Indica conforto térmico. Muito seca (<30%) resseca pele. Muito úmida (>70%) favorece mofo."
          />
          <MeasurementInfoCard
            icon="🌫️"
            name="PM2.5"
            unit="Microgramas/m³ (µg/m³)"
            range="0 a 1000+ µg/m³"
            accuracy="±10% a ±30% (depende do sensor)"
            importance="Particulas finas que penetram pulmões profundos. Principal indicador de qualidade do ar urbano."
          />
          <MeasurementInfoCard
            icon="💨"
            name="Velocidade do Vento"
            unit="Metros/segundo (m/s)"
            range="0 a 30+ m/s"
            accuracy="±0.3 m/s a ±1 m/s"
            importance="Afeta percepção de temperatura (windchill). Vento dispersa poluentes ou os acumula."
          />
        </div>
      </div>

      {/* Sensor maintenance and accuracy */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-5">{t('sensors.maintenanceTitle')}</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">{t('sensors.maintenanceRequired')}</h3>
            <ul className="space-y-2 text-sm text-gray-600 ml-4 list-disc">
              <li><strong>Limpeza:</strong> Sensores PM podem acumular poeira — limpeza a cada 3-6 meses</li>
              <li><strong>Calibração:</strong> Sensores de PM podem desvia com o tempo — recalibração anual recomendada</li>
              <li><strong>Atualizações:</strong> Firmware/software pode ser atualizado para melhorar precisão</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">{t('sensors.limitations')}</h3>
            <ul className="space-y-2 text-sm text-gray-600 ml-4 list-disc">
              <li><strong>Sensores comunitários:</strong> Menor precisão (~10-30%) que estações profissionais (~2-5%)</li>
              <li><strong>Localização:</strong> Um sensor em uma rua movimentada ≠ sensor em parque — geograficamente representativo</li>
              <li><strong>Variabilidade:</strong> Temperatura muda com hora do dia, sol, sombra. Leituras instantâneas podem não ser representativas</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">{t('sensors.validation')}</h3>
            <p className="text-sm text-gray-600">
              A EcoSense filtra sensores com dados inválidos (ex: temperatura -99°C, umidade 999%).
              Sensores que não reportam dados há mais de 2 horas são marcados como inativos. Dados agregados por cidade
              usam média aritmética, então um sensor com leitura errada afeta menos cidades com muitos sensores.
            </p>
          </div>
        </div>
      </div>

      {/* Learning resources */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-5">{t('sensors.resourcesTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">⛅ Open-Meteo</h3>
            <p className="text-sm text-gray-600 mb-3">
              API meteorológica gratuita e open source com dados globais de alta resolução.
            </p>
            <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-medium">
              open-meteo.com →<span className="sr-only"> (abre em nova aba)</span>
            </a>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">🌍 Sensor.Community</h3>
            <p className="text-sm text-gray-600 mb-3">
              Comunidade global de voluntários monitorando qualidade do ar com sensores de baixo custo.
            </p>
            <a href="https://sensor.community" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-medium">
              sensor.community →<span className="sr-only"> (abre em nova aba)</span>
            </a>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">📊 Documentação de APIs</h3>
            <p className="text-sm text-gray-600 mb-3">
              Como acessar dados das redes públicas programaticamente via REST APIs.
            </p>
            <div className="space-y-1">
              <a href="https://github.com/opendata-stuttgart/meta/wiki/APIs" target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline text-sm font-medium">
                Sensor.Community API →<span className="sr-only"> (abre em nova aba)</span>
              </a>
              <a href="https://open-meteo.com/en/docs" target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline text-sm font-medium">
                Open-Meteo API →<span className="sr-only"> (abre em nova aba)</span>
              </a>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">🔬 Ciência Cidadã</h3>
            <p className="text-sm text-gray-600 mb-3">
              Como montar seu próprio sensor e contribuir para monitoramento ambiental.
            </p>
            <a href="https://sensor.community/en/sensors/airrohr/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-medium">
              Guia de montagem Sensor.Community →<span className="sr-only"> (abre em nova aba)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Call to action */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-100 p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('sensors.ctaTitle')}</h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          {t('sensors.ctaText')}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a href="https://sensor.community/en/" target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1">
            {t('sensors.ctaButton')}<span className="sr-only"> (abre em nova aba)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
