// src/hooks/useAccessibilityPrefs.js
// Preferências de acessibilidade do usuário (alto contraste, tamanho da
// fonte, reduzir animações) — persistidas em localStorage e aplicadas como
// atributos em <html>, lidos pelo CSS em styles/index.css.

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'ecosense_a11y_prefs';
const FONT_SIZES = ['normal', 'large', 'xlarge'];

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      contrast: saved.contrast === 'high' ? 'high' : 'normal',
      fontSize: FONT_SIZES.includes(saved.fontSize) ? saved.fontSize : 'normal',
      reduceMotion: saved.reduceMotion === true,
    };
  } catch {
    return { contrast: 'normal', fontSize: 'normal', reduceMotion: false };
  }
}

function applyPrefs(prefs) {
  const html = document.documentElement;
  if (prefs.contrast === 'high') html.setAttribute('data-contrast', 'high');
  else html.removeAttribute('data-contrast');

  if (prefs.fontSize !== 'normal') html.setAttribute('data-font-size', prefs.fontSize);
  else html.removeAttribute('data-font-size');

  if (prefs.reduceMotion) html.setAttribute('data-motion', 'reduce');
  else html.removeAttribute('data-motion');
}

export function useAccessibilityPrefs() {
  const [prefs, setPrefs] = useState(loadPrefs);

  useEffect(() => {
    applyPrefs(prefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const toggleContrast = useCallback(() => {
    setPrefs(p => ({ ...p, contrast: p.contrast === 'high' ? 'normal' : 'high' }));
  }, []);

  const toggleReduceMotion = useCallback(() => {
    setPrefs(p => ({ ...p, reduceMotion: !p.reduceMotion }));
  }, []);

  const cycleFontSize = useCallback((direction) => {
    setPrefs(p => {
      const idx = FONT_SIZES.indexOf(p.fontSize);
      const next = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + direction));
      return { ...p, fontSize: FONT_SIZES[next] };
    });
  }, []);

  const reset = useCallback(() => {
    setPrefs({ contrast: 'normal', fontSize: 'normal', reduceMotion: false });
  }, []);

  return { prefs, toggleContrast, toggleReduceMotion, cycleFontSize, reset, FONT_SIZES };
}
