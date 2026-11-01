// src/components/charts/EnvironmentalChart.jsx
// Chart.js visualizations for environmental data

import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, Filler, ArcElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { CLASSIFICATIONS } from '../../utils/icaud.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, Filler, ArcElement
);

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { font: { family: 'Space Grotesk', size: 12 } } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: 'JetBrains Mono', size: 11 } } },
    y: { grid: { color: '#f3f4f6' }, ticks: { font: { family: 'JetBrains Mono', size: 11 } } },
  },
};

/**
 * Top cities bar chart by ICAU-D score
 */
export function TopCitiesChart({ cities = [] }) {
  const top10 = cities.slice(0, 10);

  const data = {
    labels: top10.map(c => c.name),
    datasets: [{
      label: 'ICAU-D Score',
      data:  top10.map(c => c.icaud?.score ?? 0),
      backgroundColor: top10.map(c => {
        const score = c.icaud?.score ?? 0;
        if (score >= 81) return '#22c55e';
        if (score >= 61) return '#84cc16';
        if (score >= 31) return '#f59e0b';
        return '#ef4444';
      }),
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const summary = top10.map(c => `${c.name}: ${(c.icaud?.score ?? 0).toFixed(0)}`).join(', ');

  return (
    <div role="img" aria-label={`Gráfico de barras — top 10 cidades por ICAU-D: ${summary}`} style={{ height: 300 }}>
      <Bar data={data} options={{
        ...defaultOptions,
        plugins: {
          ...defaultOptions.plugins,
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `Score: ${ctx.parsed.y.toFixed(1)}`,
            },
          },
        },
        scales: {
          ...defaultOptions.scales,
          y: { ...defaultOptions.scales.y, min: 0, max: 100 },
        },
      }} />
    </div>
  );
}

/**
 * Distribution donut chart by classification
 */
export function ClassificationDonut({ cities = [] }) {
  const counts = CLASSIFICATIONS.map(cls =>
    cities.filter(c => {
      const s = c.icaud?.score ?? -1;
      return s >= cls.min && s <= cls.max;
    }).length
  );

  const data = {
    labels: CLASSIFICATIONS.map(c => c.label),
    datasets: [{
      data: counts,
      backgroundColor: CLASSIFICATIONS.map(c => c.color),
      borderWidth: 2,
      borderColor: '#ffffff',
    }],
  };

  const donutSummary = CLASSIFICATIONS.map((c, i) => `${c.label}: ${counts[i]}`).join(', ');

  return (
    <div role="img" aria-label={`Gráfico de rosca — distribuição de cidades por classificação: ${donutSummary}`} style={{ height: 260 }}>
      <Doughnut data={data} options={{
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Space Grotesk', size: 11 }, padding: 12 },
          },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.parsed} cities`,
            },
          },
        },
      }} />
    </div>
  );
}

/**
 * ICAU-D history line chart for a single city — reads pre-computed hourly
 * summaries from GET /cities/:city/history (Fase 2 do plano de dados).
 */
export function CityICAUDHistoryChart({ history = [] }) {
  const points = history.filter(h => h.icaud?.score !== null && h.icaud?.score !== undefined);

  if (points.length < 2) {
    return (
      <div role="status" className="flex items-center justify-center h-40 text-sm text-gray-500">
        Histórico ainda sendo acumulado — volte em algumas horas.
      </div>
    );
  }

  const labels = points.map(p =>
    new Date(p.hour).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit' })
  );
  const scores = points.map(p => p.icaud.score);

  const data = {
    labels,
    datasets: [{
      label: 'ICAU-D',
      data: scores,
      borderColor: '#16a34a',
      backgroundColor: 'rgba(34, 197, 94, 0.12)',
      pointRadius: points.length > 40 ? 0 : 3,
      pointBackgroundColor: '#16a34a',
      tension: 0.3,
      fill: true,
      borderWidth: 2,
    }],
  };

  const firstScore = scores[0].toFixed(0);
  const lastScore = scores[scores.length - 1].toFixed(0);
  const trendSummary = `ICAU-D variou de ${firstScore} para ${lastScore} ao longo de ${points.length} leituras (mínimo ${Math.min(...scores).toFixed(0)}, máximo ${Math.max(...scores).toFixed(0)})`;

  return (
    <div role="img" aria-label={`Gráfico de linha — histórico do ICAU-D: ${trendSummary}`} style={{ height: 260 }}>
      <Line data={data} options={{
        ...defaultOptions,
        plugins: {
          ...defaultOptions.plugins,
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => `ICAU-D: ${ctx.parsed.y.toFixed(1)}` },
          },
        },
        scales: {
          ...defaultOptions.scales,
          y: { ...defaultOptions.scales.y, min: 0, max: 100 },
          x: { ...defaultOptions.scales.x, ticks: { ...defaultOptions.scales.x.ticks, maxTicksLimit: 8 } },
        },
      }} />
    </div>
  );
}

/**
 * Measurement comparison bar chart for a single city
 */
export function CityMeasurementsChart({ measurements = {} }) {
  const { temperature, humidity, pm25, pm10, windSpeed } = measurements;

  const labels = [];
  const values = [];
  const colors = [];

  if (temperature !== null && temperature !== undefined) {
    labels.push('Temperature (°C)');
    values.push(temperature);
    colors.push('#f59e0b');
  }
  if (humidity !== null && humidity !== undefined) {
    labels.push('Humidity (%)');
    values.push(humidity);
    colors.push('#3b82f6');
  }
  if (pm25 !== null && pm25 !== undefined) {
    labels.push('PM2.5 (µg/m³)');
    values.push(pm25);
    colors.push('#8b5cf6');
  }
  if (pm10 !== null && pm10 !== undefined) {
    labels.push('PM10 (µg/m³)');
    values.push(pm10);
    colors.push('#ec4899');
  }
  if (windSpeed !== null && windSpeed !== undefined) {
    labels.push('Wind Speed (m/s)');
    values.push(windSpeed);
    colors.push('#06b6d4');
  }

  const data = {
    labels,
    datasets: [{
      label: 'Current Value',
      data: values,
      backgroundColor: colors.map(c => c + 'bb'),
      borderColor: colors,
      borderWidth: 1.5,
      borderRadius: 6,
    }],
  };

  const measurementsSummary = labels.map((l, i) => `${l}: ${values[i]}`).join(', ');

  return (
    <div role="img" aria-label={`Gráfico de barras — medições atuais: ${measurementsSummary}`} style={{ height: 260 }}>
      <Bar data={data} options={{
        ...defaultOptions,
        plugins: { ...defaultOptions.plugins, legend: { display: false } },
      }} />
    </div>
  );
}
