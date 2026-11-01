// src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import pt from './locales/pt.json';

const STORAGE_KEY = 'ecosense_lang';

// Sem preferência salva, segue o idioma do navegador: pt-BR abre em português,
// qualquer outro em inglês. O botão PT/EN do cabeçalho continua mandando
// depois disso (a escolha fica salva em localStorage).
function detectBrowserLang() {
  const nav = typeof navigator !== 'undefined' ? (navigator.language || '') : '';
  return nav.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

const saved = localStorage.getItem(STORAGE_KEY);
const defaultLang = saved === 'pt' || saved === 'en' ? saved : detectBrowserLang();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pt: { translation: pt },
    },
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
  // Acessibilidade: leitores de tela usam lang do <html> pra escolher a
  // pronúncia certa — sem isso, conteúdo em português é lido com regras
  // de inglês (e vice-versa) sempre que o usuário troca o idioma.
  document.documentElement.lang = lng === 'pt' ? 'pt-BR' : 'en';
});

// Aplica o idioma inicial também (index.html vem fixo com lang="en")
document.documentElement.lang = defaultLang === 'pt' ? 'pt-BR' : 'en';

export default i18n;
