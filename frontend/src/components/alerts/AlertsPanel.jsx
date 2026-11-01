// src/components/alerts/AlertsPanel.jsx
// Painel de alertas ativos (Fase 3 do plano de dados): picos de poluição e
// sensores com problema de qualidade. Colapsado por padrão pra não competir
// com o conteúdo principal quando não há nada crítico.

import { useState } from 'react';
import { useAlerts } from '../../hooks/useEnvironmentalData.js';

const TYPE_META = {
  pollution_spike: { icon: '⚠️', label: 'Pico de poluição', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  stuck_sensor:    { icon: '🔧', label: 'Sensor sem variação', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
};

export default function AlertsPanel() {
  const { data: alerts = [], isLoading } = useAlerts();
  const [expanded, setExpanded] = useState(false);

  if (isLoading || alerts.length === 0) return null;

  const spikes = alerts.filter(a => a.type === 'pollution_spike').length;
  const stuck = alerts.length - spikes;

  return (
    <section
      aria-label="Alertas ativos"
      role="status"
      className="bg-white border border-amber-200 rounded-xl overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        aria-controls="alerts-panel-list"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-amber-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <span aria-hidden="true">🔔</span>
          {alerts.length} {alerts.length === 1 ? 'alerta ativo' : 'alertas ativos'}
          {spikes > 0 && <span className="text-red-600 font-normal">— {spikes} pico{spikes !== 1 ? 's' : ''} de poluição</span>}
          {stuck > 0 && spikes === 0 && <span className="text-amber-700 font-normal">— {stuck} sensor{stuck !== 1 ? 'es' : ''} sem variação</span>}
        </span>
        <span aria-hidden="true" className="text-gray-500 text-xs">{expanded ? '▲ ocultar' : '▼ ver detalhes'}</span>
      </button>

      {expanded && (
        <ul id="alerts-panel-list" className="divide-y divide-gray-100 border-t border-amber-100">
          {alerts.map(alert => {
            const meta = TYPE_META[alert.type] || TYPE_META.stuck_sensor;
            return (
              <li
                key={`${alert.type}-${alert.sensorId}`}
                className="flex items-start gap-3 px-4 py-3"
                style={{ backgroundColor: meta.bg }}
              >
                <span aria-hidden="true" className="text-lg leading-none mt-0.5">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                    <span className="text-xs text-gray-500 truncate">{alert.name}{alert.city ? ` · ${alert.city}` : ''}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
