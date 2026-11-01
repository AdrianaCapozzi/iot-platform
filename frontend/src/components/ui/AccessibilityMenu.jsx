// src/components/ui/AccessibilityMenu.jsx
// Painel visível de preferências de acessibilidade: alto contraste e
// tamanho da fonte. Complementa as melhorias de código (ARIA, foco por
// teclado, leitor de tela) feitas na Fase 3 — este aqui é o controle que
// o próprio usuário enxerga e ajusta.

import { useEffect, useRef, useState } from 'react';
import { useAccessibilityPrefs } from '../../hooks/useAccessibilityPrefs.js';
import { useNarrator } from '../../hooks/useNarrator.js';

export default function AccessibilityMenu() {
  const { prefs, toggleContrast, toggleReduceMotion, cycleFontSize, reset, FONT_SIZES } = useAccessibilityPrefs();
  const { isSupported: narratorSupported, isSpeaking, toggle: toggleNarrator } = useNarrator();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const fontIndex = FONT_SIZES.indexOf(prefs.fontSize);
  const isActive = prefs.contrast === 'high' || prefs.fontSize !== 'normal' || prefs.reduceMotion;

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Configurações de acessibilidade"
        title="Acessibilidade"
        className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 ${
          isActive
            ? 'border-green-300 bg-green-50 text-green-700'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        <span aria-hidden="true">♿</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Configurações de acessibilidade"
          className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50"
        >
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Acessibilidade</h3>

          {/* Alto contraste */}
          <div className="flex items-center justify-between mb-4">
            <span id="a11y-contrast-label" className="text-sm text-gray-700">Alto contraste</span>
            <button
              role="switch"
              aria-checked={prefs.contrast === 'high'}
              aria-labelledby="a11y-contrast-label"
              onClick={toggleContrast}
              className={`relative w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 ${
                prefs.contrast === 'high' ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  prefs.contrast === 'high' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Tamanho da fonte */}
          <div className="mb-1">
            <span id="a11y-fontsize-label" className="text-sm text-gray-700 block mb-2">Tamanho do texto</span>
            <div role="group" aria-labelledby="a11y-fontsize-label" className="flex items-center gap-2">
              <button
                onClick={() => cycleFontSize(-1)}
                disabled={fontIndex === 0}
                aria-label="Diminuir tamanho do texto"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1"
              >
                <span className="text-xs" aria-hidden="true">A−</span>
              </button>
              <span className="flex-1 text-center text-xs text-gray-500" aria-live="polite">
                {{ normal: 'Normal', large: 'Grande', xlarge: 'Extra grande' }[prefs.fontSize]}
              </span>
              <button
                onClick={() => cycleFontSize(1)}
                disabled={fontIndex === FONT_SIZES.length - 1}
                aria-label="Aumentar tamanho do texto"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1"
              >
                <span className="text-sm" aria-hidden="true">A+</span>
              </button>
            </div>
          </div>

          {/* Reduzir animações */}
          <div className="flex items-center justify-between mb-4 mt-4 pt-4 border-t border-gray-100">
            <span id="a11y-motion-label" className="text-sm text-gray-700">Reduzir animações</span>
            <button
              role="switch"
              aria-checked={prefs.reduceMotion}
              aria-labelledby="a11y-motion-label"
              onClick={toggleReduceMotion}
              className={`relative w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 ${
                prefs.reduceMotion ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  prefs.reduceMotion ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Narrador — lê o conteúdo principal em voz alta */}
          {narratorSupported && (
            <button
              onClick={toggleNarrator}
              aria-pressed={isSpeaking}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 ${
                isSpeaking
                  ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span aria-hidden="true">{isSpeaking ? '⏹️' : '🔊'}</span>
              {isSpeaking ? 'Parar narração' : 'Ouvir esta página'}
            </button>
          )}

          {isActive && (
            <button
              onClick={reset}
              className="mt-4 w-full text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 rounded"
            >
              Restaurar padrão
            </button>
          )}
        </div>
      )}
    </div>
  );
}
