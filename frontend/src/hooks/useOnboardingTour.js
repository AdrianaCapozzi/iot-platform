// src/hooks/useOnboardingTour.js
// Tour guiado de primeira visita: passos com alvo (data-tour="...") e uma
// chave de tradução. Título e descrição ficam em i18n/locales/*.json em
// `tour.steps.<key>`, então o tour acompanha o idioma da página. Roda
// automaticamente uma vez (localStorage) e pode ser reaberto a qualquer
// momento pelo botão "?" no cabeçalho.

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'ecosense_tour_seen';

export const TOUR_STEPS = [
  // Primeiro passo: escolher o idioma. O balão mostra os botões
  // Português/English e, ao escolher, página e tour trocam juntos.
  { key: 'language',   target: '[data-tour="lang-toggle"]',    type: 'language' },
  { key: 'welcome',    target: '[data-tour="nav-dashboard"]' },
  { key: 'map',        target: '[data-tour="live-map"]' },
  { key: 'periods',    target: '[data-tour="period-filters"]' },
  { key: 'alerts',     target: '[data-tour="alerts-panel"]' },
  { key: 'ranking',    target: '[data-tour="top10-ranking"]' },
  { key: 'howItWorks', target: '[data-tour="nav-howitworks"]' },
  { key: 'a11y',       target: '[data-tour="a11y-menu"]' },
];

export function useOnboardingTour() {
  const [stepIndex, setStepIndex] = useState(-1); // -1 = tour fechado
  const isActive = stepIndex >= 0;

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      // pequeno atraso pra garantir que o conteúdo da página já montou
      const timer = setTimeout(() => setStepIndex(0), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const start = useCallback(() => setStepIndex(0), []);

  const finish = useCallback(() => {
    setStepIndex(-1);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const next = useCallback(() => {
    setStepIndex(i => {
      if (i + 1 >= TOUR_STEPS.length) {
        localStorage.setItem(STORAGE_KEY, 'true');
        return -1;
      }
      return i + 1;
    });
  }, []);

  const prev = useCallback(() => {
    setStepIndex(i => Math.max(0, i - 1));
  }, []);

  return { isActive, stepIndex, step: TOUR_STEPS[stepIndex], total: TOUR_STEPS.length, start, next, prev, finish };
}
