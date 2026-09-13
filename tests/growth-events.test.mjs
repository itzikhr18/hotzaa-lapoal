import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createGrowthAnalytics, getAnalyticsPage, getGrowthEvent, isAnalyticsExcludedPath,
} from '../src/lib/growth-events.mjs';

const measurementId = 'G-TEST';
const storageKey = 'hotzaaAnalyticsConsent';

function fixture({ choice = null, path = '/partners/', origin = 'https://hotzaa-lapoal.info', blockedStorage = false } = {}) {
  const scripts = [];
  const cookieWrites = [];
  const storageWrites = [];
  let storageReads = 0;
  const window = {
    location: new URL(`${origin}${path}?email=private@example.com&utm_source=private#case-123`),
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
  const analytics = createGrowthAnalytics({ window, document, measurementId, storageKey });
  return {
    window, document, analytics, scripts, cookieWrites, storageWrites,
    get storageReads() { return storageReads; },
    commands: () => (window.dataLayer ?? []).map((command) => [...command]),
  };
}

function element(event = 'partner_contact_intent', placement = 'partners_contact') {
  return {
    getAttribute(name) {
      assert.ok(['data-growth-event', 'data-growth-placement'].includes(name));
      return name === 'data-growth-event' ? event : placement;
    },
    get textContent() { throw new Error('Element text must never be read'); },
    get href() { throw new Error('Link targets must never be read'); },
    get value() { throw new Error('Form values must never be read'); },
    get dataset() { throw new Error('Unrestricted attributes must never be copied'); },
  };
}

test('the event contract allows fixed intent counters and placements only', () => {
  for (const name of ['partner_offer_open', 'partner_demo_open', 'partner_contact_intent']) {
    assert.deepEqual(getGrowthEvent(name, 'home_offer'), { name, parameters: { placement: 'home_offer' } });
  }
  for (const bad of [undefined, null, '', 'generate_lead', 'form_submit', 'case-123', '__proto__']) {
    assert.equal(getGrowthEvent(bad, 'partners_contact'), null);
    assert.equal(getGrowthEvent('partner_contact_intent', bad), null);
  }
  assert.equal(getGrowthEvent('partner_contact_intent', 'partners_contact?email=private@example.com'), null);
});

test('page metadata strips query, fragment and referring-page information', () => {
  assert.deepEqual(getAnalyticsPage(new URL('https://hotzaa-lapoal.info/partners/?phone=0501234567#amount-123')), {
    page_location: 'https://hotzaa-lapoal.info/partners/',
    page_referrer: '',
    page_title: 'hotzaa-lapoal.info',
  });
});

test('no prior consent and a stored denial both prevent library requests and events', () => {
  for (const choice of [null, 'denied', 'invalid']) {
    const env = fixture({ choice });
    assert.equal(env.analytics.initialize(), choice);
    assert.equal(env.analytics.trackElement(element()), false);
    assert.equal(env.scripts.length, 0);
    assert.equal(env.window['ga-disable-G-TEST'], true);
    assert.deepEqual(env.commands(), []);
    assert.deepEqual(env.storageWrites, []);
  }
});

test('opt-in loads once and emits only sanitized page metadata and an allowlisted intent', () => {
  const env = fixture();
  env.analytics.initialize();
  env.analytics.grant();
  env.analytics.trackElement(element());
  assert.deepEqual(env.storageWrites, [[storageKey, 'granted']]);
  assert.equal(env.scripts.length, 1);
  assert.equal(env.scripts[0].referrerPolicy, 'no-referrer');
  assert.deepEqual(env.commands(), [], 'no queued Google commands before the library is ready');
  env.scripts[0].onload();

  const commands = env.commands();
  const config = commands.find(([type]) => type === 'config')[2];
  assert.equal(config.send_page_view, false);
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal(config.page_location, 'https://hotzaa-lapoal.info/partners/');
  assert.equal(config.page_referrer, '');
  assert.deepEqual(commands.filter(([type]) => type === 'event'), [
    ['event', 'page_view', {
      page_location: 'https://hotzaa-lapoal.info/partners/', page_referrer: '', page_title: 'hotzaa-lapoal.info', send_to: measurementId,
    }],
    ['event', 'partner_contact_intent', {
      placement: 'partners_contact', page_location: 'https://hotzaa-lapoal.info/partners/',
      page_referrer: '', page_title: 'hotzaa-lapoal.info', send_to: measurementId,
    }],
  ]);
  assert.doesNotMatch(JSON.stringify(commands), /private|utm_|case-123|phone|form_submit|generate_lead/);
  env.analytics.grant();
  assert.equal(env.scripts.length, 1);
  assert.equal(env.commands().filter((command) => command[1] === 'page_view').length, 1);
});

test('revocation immediately stops counters and clears only Analytics cookies; regrant works', () => {
  const env = fixture({ choice: 'granted' });
  env.analytics.initialize();
  env.scripts[0].onload();
  env.analytics.trackElement(element());
  const beforeRevocation = env.commands().length;
  env.analytics.revoke();
  assert.equal(env.window['ga-disable-G-TEST'], true);
  assert.equal(env.analytics.trackElement(element()), false);
  assert.equal(env.commands().length, beforeRevocation, 'declining must not add a consent ping');
  assert.ok(env.cookieWrites.some((cookie) => cookie.startsWith('_ga=;')));
  assert.ok(env.cookieWrites.some((cookie) => cookie.startsWith('_ga_TEST=;')));
  assert.ok(env.cookieWrites.every((cookie) => !cookie.includes('preference')));
  assert.deepEqual(env.storageWrites.at(-1), [storageKey, 'denied']);

  env.analytics.grant();
  assert.equal(env.window['ga-disable-G-TEST'], false);
  assert.equal(env.scripts.length, 1);
  assert.equal(env.analytics.trackElement(element()), true);
  assert.equal(env.commands().length, beforeRevocation + 1);
});

test('revocation during loading discards pending clicks and prevents late initialization', () => {
  const env = fixture();
  env.analytics.grant();
  env.analytics.trackElement(element());
  env.analytics.revoke();
  env.scripts[0].onload();
  assert.equal(env.window['ga-disable-G-TEST'], true);
  assert.deepEqual(env.commands(), []);
  env.analytics.grant();
  assert.equal(env.scripts.length, 1);
  assert.equal(env.window['ga-disable-G-TEST'], false);
  assert.equal(env.commands().filter((command) => command[1] === 'partner_contact_intent').length, 0);
  assert.equal(env.analytics.trackElement(element()), true);
});

test('the demo is excluded even with stored consent and direct grant attempts', () => {
  for (const path of ['/partners/demo', '/partners/demo/', '/partners/demo/nested']) {
    assert.equal(isAnalyticsExcludedPath(path), true);
    const env = fixture({ choice: 'granted', path });
    assert.equal(env.analytics.initialize(), 'denied');
    assert.equal(env.analytics.grant(), false);
    assert.equal(env.analytics.trackElement(element()), false);
    assert.equal(env.storageReads, 0);
    assert.deepEqual(env.storageWrites, []);
    assert.deepEqual(env.commands(), []);
    assert.equal(env.scripts.length, 0);
    assert.equal(env.window['ga-disable-G-TEST'], true);
  }
  assert.equal(isAnalyticsExcludedPath('/partners/'), false);
});

test('invalid attributes never emit or enter the pending queue', () => {
  const env = fixture();
  env.analytics.grant();
  assert.equal(env.analytics.trackElement(element('private@example.com')), false);
  assert.equal(env.analytics.trackElement(element('partner_demo_open', '0501234567')), false);
  env.scripts[0].onload();
  assert.equal(env.analytics.trackElement(element('generate_lead')), false);
  assert.equal(env.commands().filter(([type]) => type === 'event').length, 1);
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
    assert.equal(env.analytics.trackElement(element()), false);
    assert.equal(env.scripts.length, 0, `${origin} must never load the Google library`);
    assert.equal(env.window['ga-disable-G-TEST'], true);
    assert.deepEqual(env.commands(), []);
    env.analytics.revoke();
    assert.deepEqual(env.storageWrites.at(-1), [storageKey, 'denied']);
  }
});

test('both exact HTTPS production hostnames support opt-in measurement', () => {
  for (const origin of ['https://hotzaa-lapoal.info', 'https://www.hotzaa-lapoal.info']) {
    const env = fixture({ origin, choice: 'granted' });
    env.analytics.initialize();
    assert.equal(env.scripts.length, 1);
    env.scripts[0].onload();
    assert.equal(env.analytics.trackElement(element()), true);
    assert.equal(env.commands().at(-1)[2].page_location, `${origin}/partners/`);
  }
});

test('blocked storage preserves explicit in-memory opt-in and opt-out', () => {
  const env = fixture({ blockedStorage: true });
  assert.equal(env.analytics.initialize(), null);
  env.analytics.grant();
  env.scripts[0].onload();
  assert.equal(env.analytics.trackElement(element()), true);
  env.analytics.revoke();
  assert.equal(env.analytics.trackElement(element()), false);
});

test('a failed library request can be retried by granting again', () => {
  const env = fixture();
  env.analytics.grant();
  env.analytics.trackElement(element());
  env.scripts[0].onerror();
  assert.equal(env.scripts[0].removed, true);
  env.analytics.grant();
  assert.equal(env.scripts.length, 2);
  env.scripts[1].onload();
  assert.equal(env.commands().filter((command) => command[1] === 'partner_contact_intent').length, 0);
  assert.equal(env.analytics.trackElement(element()), true);
});
