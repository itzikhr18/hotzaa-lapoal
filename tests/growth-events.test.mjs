import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createPageAnalytics, getAnalyticsPage, isAnalyticsExcludedPath } from '../src/lib/growth-events.mjs';

const measurementId = 'G-TEST';
const storageKey = 'hotzaaAnalyticsConsent';

function fixture({ choice = null, path = '/guides/', origin = 'https://hotzaa-lapoal.info', blockedStorage = false } = {}) {
  const scripts = [], cookieWrites = [], storageWrites = [];
  const listeners = new Map();
  let storageReads = 0;
  const window = {
    location: new URL(`${origin}${path}?email=private@example.com&utm_source=private#case-123`),
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    localStorage: {
      getItem() {
        storageReads += 1;
        if (blockedStorage) throw new Error('Storage blocked');
        return choice;
      },
      setItem(key, value) {
        if (blockedStorage) throw new Error('Storage blocked');
        storageWrites.push([key, value]);
        choice = value;
      },
    },
  };
  const document = {
    get cookie() { return '_ga=123; _ga_TEST=456; preference=keep'; },
    set cookie(value) { cookieWrites.push(value); },
    createElement(tag) {
      assert.equal(tag, 'script');
      return { remove() { this.removed = true; } };
    },
    head: { appendChild(script) { scripts.push(script); } },
  };
  const analytics = createPageAnalytics({ window, document, measurementId, storageKey });
  return {
    window, analytics, scripts, cookieWrites, storageWrites, listeners,
    get storageReads() { return storageReads; },
    commands: () => (window.dataLayer ?? []).map((command) => [...command]),
    dispatchStorage(event) { (listeners.get('storage') ?? []).forEach((listener) => listener(event)); },
  };
}

test('page metadata strips query, fragment and referring-page information', () => {
  assert.deepEqual(getAnalyticsPage(new URL('https://hotzaa-lapoal.info/guides/?phone=0501234567#amount-123')), {
    page_location: 'https://hotzaa-lapoal.info/guides/', page_referrer: '', page_title: 'hotzaa-lapoal.info',
  });
});

test('analytics exposes consent controls only and the component has no document click tracking', () => {
  assert.deepEqual(Object.keys(fixture().analytics).sort(), ['grant', 'initialize', 'revoke']);
  const component = readFileSync(new URL('../src/components/AnalyticsConsent.astro', import.meta.url), 'utf8');
  const helper = readFileSync(new URL('../src/lib/growth-events.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(component, /document\.addEventListener\(['"]click|data-growth-|trackElement/);
  assert.doesNotMatch(helper, /getAttribute|closest\(|trackElement|data-growth-|partner_\w+|placement/);
});

test('no prior consent and a stored denial both prevent library requests and pageviews', () => {
  for (const choice of [null, 'denied', 'invalid']) {
    const env = fixture({ choice });
    assert.equal(env.analytics.initialize(), choice);
    assert.equal(env.scripts.length, 0);
    assert.equal(env.window['ga-disable-G-TEST'], true);
    assert.deepEqual(env.commands(), []);
    assert.deepEqual(env.storageWrites, []);
  }
});

test('opt-in loads once and sends exactly one pageview with sanitized metadata', () => {
  const env = fixture();
  env.analytics.initialize();
  env.analytics.grant();
  assert.deepEqual(env.storageWrites, [[storageKey, 'granted']]);
  assert.equal(env.scripts.length, 1);
  assert.equal(env.scripts[0].referrerPolicy, 'no-referrer');
  assert.deepEqual(env.commands(), [], 'no Google commands before library readiness');
  env.scripts[0].onload();
  const commands = env.commands();
  const config = commands.find(([type]) => type === 'config')[2];
  assert.equal(config.send_page_view, false);
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal(config.page_location, 'https://hotzaa-lapoal.info/guides/');
  assert.equal(config.page_referrer, '');
  assert.deepEqual(commands.filter(([type]) => type === 'event'), [
    ['event', 'page_view', {
      page_location: 'https://hotzaa-lapoal.info/guides/', page_referrer: '', page_title: 'hotzaa-lapoal.info', send_to: measurementId,
    }],
  ]);
  assert.doesNotMatch(JSON.stringify(commands), /private|utm_|case-123|phone|form_submit|generate_lead/);
  env.analytics.grant();
  env.analytics.initialize();
  assert.equal(env.scripts.length, 1);
  assert.equal(env.commands().filter((command) => command[1] === 'page_view').length, 1);
  assert.equal(env.listeners.get('storage').length, 1);
});

test('revocation disables Analytics and clears only its cookies; regrant avoids duplicate pageviews', () => {
  const env = fixture({ choice: 'granted' });
  env.analytics.initialize();
  env.scripts[0].onload();
  const beforeRevocation = env.commands().length;
  env.analytics.revoke();
  assert.equal(env.window['ga-disable-G-TEST'], true);
  assert.equal(env.commands().length, beforeRevocation, 'declining must not add a consent ping');
  assert.ok(env.cookieWrites.some((cookie) => cookie.startsWith('_ga=;')));
  assert.ok(env.cookieWrites.some((cookie) => cookie.startsWith('_ga_TEST=;')));
  assert.ok(env.cookieWrites.every((cookie) => !cookie.includes('preference')));
  assert.deepEqual(env.storageWrites.at(-1), [storageKey, 'denied']);
  env.analytics.grant();
  assert.equal(env.window['ga-disable-G-TEST'], false);
  assert.equal(env.scripts.length, 1);
  assert.equal(env.commands().length, beforeRevocation);
});

test('revocation during loading prevents late initialization; regrant sends the first pageview', () => {
  const env = fixture();
  env.analytics.initialize();
  env.analytics.grant();
  env.analytics.revoke();
  env.scripts[0].onload();
  assert.equal(env.window['ga-disable-G-TEST'], true);
  assert.deepEqual(env.commands(), []);
  env.analytics.grant();
  assert.equal(env.scripts.length, 1);
  assert.equal(env.window['ga-disable-G-TEST'], false);
  assert.equal(env.commands().filter((command) => command[1] === 'page_view').length, 1);
});

test('withdrawal in another tab disables loaded Analytics without sending another event', () => {
  const env = fixture({ choice: 'granted' });
  env.analytics.initialize();
  env.scripts[0].onload();
  const beforeRevocation = env.commands().length;
  env.dispatchStorage({ key: 'unrelated-setting', newValue: 'denied' });
  assert.equal(env.window['ga-disable-G-TEST'], false);
  env.dispatchStorage({ key: storageKey, newValue: 'denied' });
  assert.equal(env.window['ga-disable-G-TEST'], true);
  assert.equal(env.commands().length, beforeRevocation);
  assert.deepEqual(env.storageWrites.at(-1), [storageKey, 'denied']);
  env.analytics.grant();
  assert.equal(env.window['ga-disable-G-TEST'], false);
  assert.equal(env.commands().length, beforeRevocation);
});

test('withdrawal in another tab while loading prevents a late pageview', () => {
  const env = fixture({ choice: 'granted' });
  env.analytics.initialize();
  env.dispatchStorage({ key: storageKey, newValue: null });
  env.scripts[0].onload();
  assert.equal(env.window['ga-disable-G-TEST'], true);
  assert.deepEqual(env.commands(), []);
});

test('the demo is excluded even with stored consent and direct grant attempts', () => {
  for (const path of ['/partners/demo', '/partners/demo/', '/partners/demo/nested']) {
    assert.equal(isAnalyticsExcludedPath(path), true);
    const env = fixture({ choice: 'granted', path });
    assert.equal(env.analytics.initialize(), 'denied');
    assert.equal(env.analytics.grant(), false);
    assert.equal(env.storageReads, 0);
    assert.deepEqual(env.storageWrites, []);
    assert.deepEqual(env.commands(), []);
    assert.equal(env.scripts.length, 0);
    assert.equal(env.listeners.size, 0);
    assert.equal(env.window['ga-disable-G-TEST'], true);
  }
  assert.equal(isAnalyticsExcludedPath('/guides/'), false);
});

test('local development and previews preserve consent choices without reaching production Analytics', () => {
  for (const origin of [
    'http://localhost:4321', 'http://127.0.0.1:4321', 'https://preview.hotzaa-lapoal.pages.dev',
    'https://hotzaa-lapoal.info.example.com', 'http://hotzaa-lapoal.info', 'https://hotzaa-lapoal.info:4321',
  ]) {
    const env = fixture({ origin, choice: 'granted' });
    assert.equal(env.analytics.initialize(), 'granted');
    assert.equal(env.analytics.grant(), true);
    assert.deepEqual(env.storageWrites.at(-1), [storageKey, 'granted']);
    assert.equal(env.scripts.length, 0, `${origin} must never load the Google library`);
    assert.equal(env.window['ga-disable-G-TEST'], true);
    assert.deepEqual(env.commands(), []);
    env.analytics.revoke();
    assert.deepEqual(env.storageWrites.at(-1), [storageKey, 'denied']);
  }
});

test('both exact HTTPS production hostnames support opt-in pageviews', () => {
  for (const origin of ['https://hotzaa-lapoal.info', 'https://www.hotzaa-lapoal.info']) {
    const env = fixture({ origin, choice: 'granted' });
    env.analytics.initialize();
    assert.equal(env.scripts.length, 1);
    env.scripts[0].onload();
    assert.equal(env.commands().at(-1)[1], 'page_view');
    assert.equal(env.commands().at(-1)[2].page_location, `${origin}/guides/`);
  }
});

test('blocked storage preserves explicit in-memory opt-in and opt-out', () => {
  const env = fixture({ blockedStorage: true });
  assert.equal(env.analytics.initialize(), null);
  env.analytics.grant();
  env.scripts[0].onload();
  assert.equal(env.window['ga-disable-G-TEST'], false);
  assert.equal(env.commands().at(-1)[1], 'page_view');
  env.analytics.revoke();
  assert.equal(env.window['ga-disable-G-TEST'], true);
});

test('a failed library request can be retried by granting again', () => {
  const env = fixture();
  env.analytics.initialize();
  env.analytics.grant();
  env.scripts[0].onerror();
  assert.equal(env.scripts[0].removed, true);
  assert.deepEqual(env.commands(), []);
  env.analytics.grant();
  assert.equal(env.scripts.length, 2);
  env.scripts[1].onload();
  assert.equal(env.commands().filter((command) => command[1] === 'page_view').length, 1);
});
