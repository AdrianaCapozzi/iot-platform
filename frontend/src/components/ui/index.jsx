// src/components/ui/index.jsx
// Shared UI primitives

import { classify, formatScore } from '../../utils/icaud.js';

/** Score badge with color coding */
export function ScoreBadge({ score, size = 'md' }) {
  const cls = classify(score);
  const sizes = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1', lg: 'text-base px-4 py-1.5' };
  if (!cls) return <span className={`${sizes[size]} rounded-full bg-gray-100 text-gray-500 font-mono`}>N/A</span>;
  return (
    <span className={`${sizes[size]} ${cls.badge} rounded-full font-semibold font-mono`}>
      {formatScore(score)}
    </span>
  );
}

/** Score ring - circular progress indicator */
export function ScoreRing({ score, size = 120 }) {
  const cls = classify(score);
  const radius = (size / 2) - 10;
  const circumference = 2 * Math.PI * radius;
  const progress = score !== null ? (score / 100) * circumference : 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="none"
          stroke={cls?.color || '#9ca3af'}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold font-mono" style={{ color: cls?.color || '#9ca3af' }}>
          {score !== null ? Math.round(score) : '—'}
        </div>
        <div className="text-xs text-gray-500">ICAU-D</div>
      </div>
    </div>
  );
}

/** Stat card
 *
 * Aceita opcionalmente `source` — objeto { labels: [...], count, maxDistanceKm }
 * que descreve de onde a métrica veio. Quando presente, exibimos um pequeno
 * indicador "ⓘ" com tooltip contendo a fonte (ex: "Sensor.Community").
 */
export function StatCard({ label, value, unit, icon, color = '#6b7280', source = null }) {
  const hasValue = value !== null && value !== undefined;

  let tooltip = '';
  if (source && source.labels?.length) {
    const fontes = source.labels.join(' + ');
    const detalhe = source.count ? ` — ${source.count} sensor(es)` : '';
    const distancia = source.maxDistanceKm != null
      ? ` — até ${source.maxDistanceKm} km`
      : '';
    tooltip = `Fonte: ${fontes}${detalhe}${distancia}`;
  }

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow"
      title={tooltip || undefined}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium flex-1">{label}</span>
        {tooltip && (
          <span
            className="text-[10px] text-gray-500 cursor-help select-none"
            aria-label={tooltip}
          >
            ⓘ
          </span>
        )}
      </div>
      <div className="text-2xl font-bold font-mono" style={{ color }}>
        {hasValue ? value : '—'}
        {hasValue && unit && (
          <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
        )}
      </div>
    </div>
  );
}

/** Loading spinner */
export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex items-center justify-center p-4">
      <div className={`${sizes[size]} animate-spin rounded-full border-2 border-green-500 border-t-transparent`} />
    </div>
  );
}

/** Error alert */
export function ErrorAlert({ message }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
      ⚠️ {message}
    </div>
  );
}

/** Classification badge */
export function ClassificationBadge({ label, color }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-white text-sm font-semibold"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

/** Empty state */
export function EmptyState({ message, icon = '📡' }) {
  return (
    <div className="text-center py-12 text-gray-500">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

/** Backend status banner */
export { BackendBanner } from './BackendBanner.jsx';
