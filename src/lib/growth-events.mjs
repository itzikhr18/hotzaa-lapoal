// Only editorially defined intent counters belong here. Never add user-entered
// values, link URLs/text, form fields, demo choices, or campaign parameters.
const EVENTS = new Set(['partner_offer_open', 'partner_demo_open', 'partner_contact_intent']);
const PLACEMENTS = new Set([
  'header_desktop', 'header_mobile', 'footer', 'home_offer', 'tools_offer',
  'partners_hero', 'partners_offer', 'partners_contact', 'partners_demo',
]);
const PRODUCTION_ORIGINS = new Set(['https://hotzaa-lapoal.info', 'https://www.hotzaa-lapoal.info']);

export function isAnalyticsExcludedPath(pathname) {
  return /^\/partners\/demo(?:\/|$)/.test(pathname);
}

export function getGrowthEvent(eventName, placement) {
  if (!EVENTS.has(eventName) || !PLACEMENTS.has(placement)) return null;
  return { name: eventName, parameters: { placement } };
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
 * The small pending queue contains only allowlisted counters, and is discarded
 * when consent is withdrawn, including while the library is still loading.
 * GA4 Enhanced Measurement must also remain OFF in the property's web stream;
 * that remote setting is not controlled by send_page_view:false.
 */
export function createGrowthAnalytics({ window, document, measurementId, storageKey }) {
  let consent = null;
  let loading = false;
  let ready = false;
  let configured = false;
  const pending = [];
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

  function emit(event) {
    if (!permitted() || !ready || !configured) return false;
    window.gtag('event', event.name, {
      ...event.parameters,
      ...getAnalyticsPage(window.location),
      send_to: measurementId,
    });
    return true;
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
      emit({ name: 'page_view', parameters: {} });
    }
    pending.splice(0).forEach(emit);
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
      pending.length = 0;
      script.remove();
    };
    document.head.appendChild(script);
  }

  function initialize() {
    // Even a previously granted choice must never activate the demonstration.
    if (isAnalyticsExcludedPath(window.location.pathname)) return 'denied';
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
    pending.length = 0;
    saveChoice(consent);
    clearAnalyticsCookies();
    // Do not send a consent-mode ping after opting out.
  }

  function trackElement(element) {
    if (!permitted()) return false;
    const event = getGrowthEvent(
      element?.getAttribute('data-growth-event'),
      element?.getAttribute('data-growth-placement'),
    );
    if (!event) return false;
    if (!ready) {
      if (pending.length < 20) pending.push(event);
      return false;
    }
    return emit(event);
  }

  return { initialize, grant, revoke, trackElement };
}
