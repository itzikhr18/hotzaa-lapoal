// Pageviews only. Never add input values, link data or campaign parameters.
const PRODUCTION_ORIGINS = new Set(['https://hotzaa-lapoal.info', 'https://www.hotzaa-lapoal.info']);

export function isAnalyticsExcludedPath(pathname) {
  return /^\/partners\/demo(?:\/|$)/.test(pathname);
}

export function getAnalyticsPage(location) {
  return {
    page_location: `${location.origin}${location.pathname}`,
    page_referrer: '',
    page_title: 'hotzaa-lapoal.info',
  };
}

/**
 * Basic opt-in: the Google library is not requested until permission is given.
 * Only one pageview is sent per document, after consent and library readiness.
 * GA4 Enhanced Measurement must also remain OFF in the property's web stream;
 * that remote setting is not controlled by send_page_view:false.
 */
export function createPageAnalytics({ window, document, measurementId, storageKey }) {
  let consent = null;
  let loading = false;
  let ready = false;
  let configured = false;
  let listeningForConsent = false;
  const disableKey = `ga-disable-${measurementId}`;
  window[disableKey] = true;

  function permitted() {
    return consent === 'granted'
      && PRODUCTION_ORIGINS.has(window.location.origin)
      && !isAnalyticsExcludedPath(window.location.pathname);
  }

  function saveChoice(choice) {
    try { window.localStorage.setItem(storageKey, choice); } catch (_) { /* Storage may be unavailable. */ }
  }

  function clearAnalyticsCookies() {
    document.cookie.split(';').forEach((part) => {
      const name = part.split('=')[0]?.trim();
      if (!name || (name !== '_ga' && !name.startsWith('_ga_'))) return;
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      const labels = window.location.hostname.split('.');
      for (let index = 0; index < labels.length - 1; index += 1) {
        document.cookie = `${name}=; Max-Age=0; path=/; domain=.${labels.slice(index).join('.')}; SameSite=Lax`;
      }
    });
  }

  function configure() {
    if (!permitted() || !ready) return;
    window[disableKey] = false;
    if (!configured) {
      // All configuration precedes the first event; document.referrer, title,
      // query strings and fragments are never forwarded by our measurement.
      const page = getAnalyticsPage(window.location);
      window.gtag('consent', 'default', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
      window.gtag('set', page);
      window.gtag('js', new Date());
      window.gtag('config', measurementId, {
        ...page,
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_flags: 'SameSite=Lax;Secure',
      });
      configured = true;
      window.gtag('event', 'page_view', { ...page, send_to: measurementId });
    }
  }

  function load() {
    if (!permitted()) return;
    // Reset the opt-out flag even when the library was loaded before revocation.
    window[disableKey] = false;
    if (ready) { configure(); return; }
    if (loading) return;
    loading = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    const script = document.createElement('script');
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.onload = () => {
      loading = false;
      ready = true;
      configure();
    };
    script.onerror = () => {
      loading = false;
      script.remove();
    };
    document.head.appendChild(script);
  }

  function initialize() {
    // Even a previously granted choice must never activate the demonstration.
    if (isAnalyticsExcludedPath(window.location.pathname)) return 'denied';
    if (!listeningForConsent) {
      window.addEventListener('storage', (event) => {
        // An opt-out in another tab also stops measurement in this document.
        if (event.key === storageKey && event.newValue !== 'granted') revoke();
      });
      listeningForConsent = true;
    }
    try { consent = window.localStorage.getItem(storageKey); } catch (_) { consent = null; }
    if (consent === 'granted') load();
    return consent;
  }

  function grant() {
    if (isAnalyticsExcludedPath(window.location.pathname)) return false;
    consent = 'granted';
    saveChoice(consent);
    load();
    return true;
  }

  function revoke() {
    consent = 'denied';
    window[disableKey] = true;
    saveChoice(consent);
    clearAnalyticsCookies();
    // Do not send a consent-mode ping after opting out.
  }

  return { initialize, grant, revoke };
}
