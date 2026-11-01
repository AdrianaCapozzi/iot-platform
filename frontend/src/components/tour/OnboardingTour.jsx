// src/components/tour/OnboardingTour.jsx
// Spotlight de tour: escurece a tela, recorta um "buraco" em volta do
// elemento alvo (que continua clicável) e mostra um balão com a
// explicação. Clicar dentro do recorte avança o passo — incentiva o
// usuário a interagir com o elemento de verdade, não só ler texto.
//
// Todos os textos vêm do i18n (bloco `tour` em locales/*.json), então o
// tour acompanha o idioma da página. O primeiro passo é a escolha do
// idioma: ao clicar em Português/English, página e balão trocam juntos.

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const PADDING = 8;
// Largura do balão em pixels reais (não rem) — precisa ficar em sync com o
// clamp de posição abaixo. Se usarmos a classe Tailwind `w-80` (rem), o
// balão fica mais largo em px quando o usuário aumenta o tamanho de fonte
// no painel de acessibilidade, e o cálculo de posição vaza da tela.
const TOOLTIP_WIDTH = 320;

const LANGUAGES = [
  { code: 'pt', flag: '🇧🇷' },
  { code: 'en', flag: '🇺🇸' },
];

// Um mesmo data-tour pode existir duas vezes no DOM (cabeçalho desktop e
// mobile). querySelector pegaria sempre o primeiro, que no celular está
// oculto com tamanho zero — e o passo seria pulado. Pega o primeiro visível.
function findVisible(selector) {
  for (const el of document.querySelectorAll(selector)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function getRect(selector) {
  const el = findVisible(selector);
  if (!el) return null;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PADDING,
    left: r.left - PADDING,
    width: r.width + PADDING * 2,
    height: r.height + PADDING * 2,
  };
}

export default function OnboardingTour({ isActive, step, stepIndex, total, next, prev, finish }) {
  const { t, i18n } = useTranslation();
  const [rect, setRect] = useState(null);

  const updateRect = useCallback(() => {
    if (!step) return;
    const r = getRect(step.target);
    // Alvo não existe na página atual ou está com tamanho zero (ex: painel
    // de alertas sem nenhum alerta ativo agora) — pula o passo em vez de
    // mostrar um recorte vazio/quebrado
    if (!r || r.width <= 0 || r.height <= 0) {
      setRect(null);
      next();
      return;
    }
    setRect(r);
  }, [step, next]);

  useEffect(() => {
    if (!isActive || !step) return;
    updateRect();
    const t = setTimeout(updateRect, 350); // reposiciona após o scroll suave
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isActive, step, updateRect]);

  useEffect(() => {
    if (!isActive) return;
    function handleKey(e) {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isActive, finish, next, prev]);

  const chooseLanguage = (code) => {
    i18n.changeLanguage(code);
    next();
  };

  if (!isActive || !step || !rect) return null;

  const isLanguageStep = step.type === 'language';
  const isLastStep = stepIndex + 1 === total;

  // Tooltip: tenta ficar abaixo do alvo; se não couber, vai pra cima
  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  const tooltipTop = spaceBelow > 200 ? rect.top + rect.height + 16 : Math.max(16, rect.top - 200);
  const tooltipLeft = Math.min(Math.max(16, rect.left), window.innerWidth - TOOLTIP_WIDTH - 16);

  return (
    <div className="fixed inset-0 z-[2000]" role="dialog" aria-modal="true" aria-label={t('tour.dialogLabel')}>
      {/* 4 painéis escuros ao redor do recorte — o recorte fica 100% clicável */}
      <div className="absolute bg-black/60 transition-all duration-300" style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }} />
      <div className="absolute bg-black/60 transition-all duration-300" style={{ top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }} />
      <div className="absolute bg-black/60 transition-all duration-300" style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }} />
      <div className="absolute bg-black/60 transition-all duration-300" style={{ top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height }} />

      {/* Anel de destaque pulsante — decorativo, pointer-events:none deixa o
          elemento real por baixo 100% clicável/navegável como sempre */}
      <div
        aria-hidden="true"
        className="absolute rounded-xl ring-4 ring-green-400 animate-pulse transition-all duration-300"
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, pointerEvents: 'none' }}
      />

      {/* Balão explicativo */}
      <div
        className="absolute bg-white rounded-xl shadow-2xl p-5 transition-all duration-300"
        style={{ top: tooltipTop, left: tooltipLeft, width: TOOLTIP_WIDTH }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">
            {t('tour.stepOf', { current: stepIndex + 1, total })}
          </span>
          <button
            onClick={finish}
            aria-label={t('tour.close')}
            className="text-gray-400 hover:text-gray-600 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
          >
            ✕
          </button>
        </div>
        <h3 className="font-bold text-gray-900 mb-1.5">{t(`tour.steps.${step.key}.title`)}</h3>
        <p className="text-sm text-gray-600 mb-4">{t(`tour.steps.${step.key}.desc`)}</p>

        {/* Passo de idioma: dois botões grandes no lugar de Voltar/Próximo.
            Escolher já avança — o próximo passo aparece no idioma escolhido,
            o que confirma a escolha na hora. */}
        {isLanguageStep && (
          <div className="flex gap-2 mb-4" role="group" aria-label={t('tour.steps.language.title')}>
            {LANGUAGES.map(({ code, flag }) => {
              const active = i18n.language === code;
              return (
                <button
                  key={code}
                  onClick={() => chooseLanguage(code)}
                  aria-pressed={active}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 ${
                    active
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span aria-hidden="true">{flag}</span>
                  {t(`tour.steps.language.${code}`)}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
          >
            {t('tour.skip')}
          </button>
          {!isLanguageStep && (
            <div className="flex gap-2">
              {stepIndex > 0 && (
                <button
                  onClick={prev}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  {t('tour.back')}
                </button>
              )}
              <button
                onClick={next}
                className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1"
              >
                {isLastStep ? t('tour.finish') : t('tour.next')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
