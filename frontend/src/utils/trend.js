// src/utils/trend.js
// Computa tendência (melhorando/estável/piorando) do ICAU-D a partir do
// histórico horário de uma cidade (Fase 3 do plano de dados).

const STABLE_THRESHOLD = 3; // pontos de ICAU-D — variação menor que isso é "estável"

/**
 * Acha o ponto do histórico mais próximo de um instante alvo.
 */
function closestPoint(points, targetMs) {
  let best = null;
  let bestDiff = Infinity;
  for (const p of points) {
    const diff = Math.abs(new Date(p.hour).getTime() - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  return best;
}

function labelFor(delta) {
  if (delta === null) return null;
  if (delta > STABLE_THRESHOLD) return 'improving';
  if (delta < -STABLE_THRESHOLD) return 'worsening';
  return 'stable';
}

/**
 * @param {Array} history - pontos { hour, icaud: { score } }, ordenados ou não
 * @returns {{ current: number|null, delta24h: number|null, label24h: string|null, delta7d: number|null, label7d: string|null }}
 */
export function computeTrend(history = []) {
  const points = history
    .filter(p => p.icaud?.score !== null && p.icaud?.score !== undefined)
    .sort((a, b) => new Date(a.hour) - new Date(b.hour));

  if (points.length === 0) {
    return { current: null, delta24h: null, label24h: null, delta7d: null, label7d: null };
  }

  const now = Date.now();
  const latest = points[points.length - 1];
  const current = latest.icaud.score;

  // 24h: só considera se temos um ponto a pelo menos ~18h de distância
  // (evita comparar "agora" com "agora" quando o histórico é muito curto)
  const target24h = now - 24 * 60 * 60 * 1000;
  const point24h = closestPoint(points, target24h);
  const hasEnough24h = point24h && Math.abs(new Date(point24h.hour).getTime() - target24h) < 6 * 60 * 60 * 1000;
  const delta24h = hasEnough24h ? Number((current - point24h.icaud.score).toFixed(1)) : null;

  // 7d: usa o ponto mais antigo disponível, só se cobrir pelo menos ~5 dias
  const oldest = points[0];
  const spanDays = (now - new Date(oldest.hour).getTime()) / (24 * 60 * 60 * 1000);
  const delta7d = spanDays >= 5 ? Number((current - oldest.icaud.score).toFixed(1)) : null;

  return {
    current,
    delta24h,
    label24h: labelFor(delta24h),
    delta7d,
    label7d: labelFor(delta7d),
  };
}

export const TREND_META = {
  improving: { icon: '📈', color: '#16a34a', labelKey: 'melhorando' },
  stable:    { icon: '➖', color: '#6b7280', labelKey: 'estável' },
  worsening: { icon: '📉', color: '#dc2626', labelKey: 'piorando' },
};
