// src/hooks/useNarrator.js
// Leitura em voz alta do conteúdo principal da página via Web Speech API do
// navegador — um "narrador" embutido, complementar a leitores de tela
// externos (NVDA/VoiceOver/TalkBack) que já são suportados pelo ARIA da
// Fase 3, mas que nem todo usuário tem instalado/ativado.

import { useCallback, useEffect, useState } from 'react';

const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function useNarrator() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!isSupported) return;
    return () => window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback(() => {
    if (!isSupported) return;

    const main = document.getElementById('main-content');
    const text = (main?.innerText || '').trim();
    if (!text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = document.documentElement.lang || 'pt-BR';
    utterance.rate = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, []);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const toggle = useCallback(() => {
    if (isSpeaking) stop();
    else speak();
  }, [isSpeaking, speak, stop]);

  return { isSupported, isSpeaking, toggle };
}
