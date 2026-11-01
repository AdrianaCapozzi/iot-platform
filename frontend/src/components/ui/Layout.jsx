// src/components/ui/Layout.jsx
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBackendHealth } from '../../hooks/useBackendHealth.js';
import { BackendBanner } from './BackendBanner.jsx';
import AccessibilityMenu from './AccessibilityMenu.jsx';
import OnboardingTour from '../tour/OnboardingTour.jsx';
import { useOnboardingTour } from '../../hooks/useOnboardingTour.js';

export default function Layout({ children }) {
  const { isHealthy, isChecking } = useBackendHealth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const tour = useOnboardingTour();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { to: '/',              label: t('nav.dashboard'),   icon: '📊', tourId: 'nav-dashboard' },
    { to: '/ranking',       label: t('nav.ranking'),     icon: '🏆', tourId: 'nav-ranking' },
    { to: '/map',           label: t('nav.map'),         icon: '🗺️', tourId: 'nav-map' },
    { to: '/about-sensors', label: t('nav.sensors'),     icon: '📡', tourId: 'nav-sensors' },
    { to: '/about-icaud',   label: t('nav.howItWorks'),  icon: '❓', tourId: 'nav-howitworks' },
  ];

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'pt' : 'en');
  };

  // Fecha o menu ao mudar de página
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // O tour depende de elementos que só existem no Painel (mapa, alertas,
  // ranking). Se disparado de outra página, navega pra "/" primeiro.
  const startTour = () => {
    setIsMenuOpen(false);

    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(tour.start, 300);
    } else {
      tour.start();
    }
  };

  // Se o tour automático dispara enquanto o usuário não está no Painel
  // (ex: entrou direto por /ranking), leva pra lá também.
  useEffect(() => {
    if (tour.isActive && tour.stepIndex === 0 && location.pathname !== '/') {
      navigate('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.isActive]);

  return (
    <div className="min-h-screen bg-gray-50 font-display">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-green-700 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
      >
        {t('nav.skipToContent', 'Pular para o conteúdo')}
      </a>

      <BackendBanner isHealthy={isHealthy} isChecking={isChecking} />

      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                🌿
              </div>

              <span className="font-bold text-gray-900 text-lg tracking-tight">
                EcoSense
              </span>

              <span className="hidden sm:block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                {t('nav.platform')}
              </span>
            </Link>

            {/* ================= DESKTOP ================= */}
            <div className="hidden md:flex items-center gap-1">

              <nav
                aria-label={t('nav.mainNavigation', 'Navegação principal')}
                className="flex items-center gap-1"
              >
                {navLinks.map(link => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    aria-label={link.label}
                    data-tour={link.tourId}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 ${
                        isActive
                          ? 'bg-green-50 text-green-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`
                    }
                  >
                    <span aria-hidden="true">{link.icon}</span>
                    <span className="hidden sm:inline">{link.label}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="ml-2" data-tour="a11y-menu">
                <AccessibilityMenu />
              </div>

              {/* Language toggle — alvo do 1º passo do tour (data-tour="lang-toggle") */}
              <button
                onClick={toggleLang}
                data-tour="lang-toggle"
                title={t('nav.switchLanguage')}
                aria-label={t('nav.switchLanguage')}
                className="ml-2 flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1"
              >
                {i18n.language === 'en' ? '🇧🇷 PT' : '🇺🇸 EN'}
              </button>

              {/* Reabrir o tour guiado */}
              <button
                onClick={startTour}
                title={t('tour.open')}
                aria-label={t('tour.open')}
                className="ml-2 flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1"
              >
                <span aria-hidden="true">❔</span>
              </button>
            </div>

            {/* ================= MOBILE ================= */}
            <div className="md:hidden flex items-center gap-2">

              {/* Acessibilidade */}
              <div data-tour="a11y-menu">
                <AccessibilityMenu />
              </div>

              {/* Idioma — mesmo data-tour do desktop; o tour pega o que estiver visível */}
              <button
                onClick={toggleLang}
                data-tour="lang-toggle"
                title={t('nav.switchLanguage')}
                aria-label={t('nav.switchLanguage')}
                className="flex items-center justify-center w-11 h-10 rounded-lg text-sm font-semibold border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1"
              >
                {i18n.language === 'en' ? '🇧🇷' : '🇺🇸'}
              </button>

              {/* Botão do menu */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                aria-label={t('nav.openMenu')}
                aria-expanded={isMenuOpen}
                className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1"
              >
                <span className="text-xl" aria-hidden="true">
                  ☰
                </span>
              </button>

            </div>

          </div>
        </div>
      </header>

      {/* ================= MENU LATERAL MOBILE ================= */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          isMenuOpen
            ? 'visible bg-black/40'
            : 'invisible bg-black/0 pointer-events-none'
        }`}
        onClick={() => setIsMenuOpen(false)}
      >

        <aside
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 top-0 h-full w-[85%] max-w-sm bg-white shadow-2xl transition-transform duration-300 ${
            isMenuOpen
              ? 'translate-x-0'
              : 'translate-x-full'
          }`}
        >

          {/* Cabeçalho do menu */}
          <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100">

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                🌿
              </div>

              <span className="font-bold text-gray-900 text-lg">
                EcoSense
              </span>
            </div>

            {/* Fechar */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              aria-label={t('nav.closeMenu')}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <span className="text-2xl" aria-hidden="true">
                ×
              </span>
            </button>

          </div>

          {/* Links */}
          <nav
            aria-label={t('nav.mainNavigation', 'Navegação principal')}
            className="p-4"
          >
            <div className="space-y-1">

              {navLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  data-tour={link.tourId}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <span
                    className="text-lg w-7 text-center"
                    aria-hidden="true"
                  >
                    {link.icon}
                  </span>

                  <span>{link.label}</span>
                </NavLink>
              ))}

            </div>
          </nav>

          <div className="mx-4 border-t border-gray-100" />

          {/* Opções */}
          <div className="p-4 space-y-2">

            <button
              type="button"
              onClick={startTour}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg" aria-hidden="true">
                ❔
              </span>

              {t('tour.open')}
            </button>

          </div>

        </aside>
      </div>

      <main
        id="main-content"
        tabIndex={-1}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 focus:outline-none"
      >
        {children}
      </main>

      <OnboardingTour
        isActive={tour.isActive}
        step={tour.step}
        stepIndex={tour.stepIndex}
        total={tour.total}
        next={tour.next}
        prev={tour.prev}
        finish={tour.finish}
      />

      <footer className="border-t border-gray-100 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{t('footer.tagline')}</span>
            <span>{t('footer.index')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}