import assert from 'node:assert/strict';
import { it } from 'node:test';

function browserFixture(t) {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const scripts = new Map();
  const created = [];
  class Script extends EventTarget {
    id = '';
    src = '';
    async = false;
    dataset = {};
    isConnected = false;
    remove() {
      scripts.delete(this.id);
      this.isConnected = false;
    }
  }
  globalThis.window = { setTimeout, clearTimeout };
  globalThis.document = {
    getElementById(id) { return scripts.get(id) ?? null; },
    createElement(tag) {
      assert.equal(tag, 'script');
      const script = new Script();
      created.push(script);
      return script;
    },
    head: { appendChild(script) { scripts.set(script.id, script); script.isConnected = true; } },
  };
  t.after(() => {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  });
  return { scripts, created, Script };
}

it('shares one asynchronous loader request across concurrent placements', async (t) => {
  const { created } = browserFixture(t);
  const { loadSevioScript } = await import('./sevio.ts?case=concurrent');
  const first = loadSevioScript();
  const second = loadSevioScript();
  assert.equal(first, second);
  assert.equal(created.length, 1);
  assert.equal(created[0].src, 'https://cdn.adx.ws/scripts/loader.js');
  assert.equal(created[0].async, true);
  created[0].dispatchEvent(new Event('load'));
  await Promise.all([first, second]);
  await loadSevioScript();
  assert.equal(created.length, 1);
  assert.equal(created[0].dataset.state, 'loaded');
});

it('removes a failed loader and permits a fresh mounted placement to retry', async (t) => {
  const { created, scripts } = browserFixture(t);
  const { loadSevioScript } = await import('./sevio.ts?case=retry');
  const failed = loadSevioScript();
  created[0].dispatchEvent(new Event('error'));
  await assert.rejects(failed, /unavailable/);
  assert.equal(scripts.size, 0);
  const retry = loadSevioScript();
  assert.equal(created.length, 2);
  created[1].dispatchEvent(new Event('load'));
  await retry;
});

it('bounds a stalled loader and removes its event handlers', async (t) => {
  const { created, scripts } = browserFixture(t);
  let timeoutCallback;
  let cleared = 0;
  window.setTimeout = (callback, delay) => { assert.equal(delay, 20_000); timeoutCallback = callback; return 1; };
  window.clearTimeout = (id) => { assert.equal(id, 1); cleared += 1; };
  const { loadSevioScript } = await import('./sevio.ts?case=timeout');
  const pending = loadSevioScript();
  timeoutCallback();
  await assert.rejects(pending, /unavailable/);
  created[0].dispatchEvent(new Event('load'));
  assert.equal(created[0].dataset.state, 'loading');
  assert.equal(scripts.size, 0);
  assert.equal(cleared, 1);
});

it('reuses an already loaded script when module state is recreated', async (t) => {
  const { scripts, created, Script } = browserFixture(t);
  const existing = new Script();
  existing.id = 'sevio-ads-loader';
  existing.dataset.state = 'loaded';
  existing.isConnected = true;
  scripts.set(existing.id, existing);
  const { loadSevioScript } = await import('./sevio.ts?case=existing');
  await loadSevioScript();
  assert.equal(created.length, 0);
});

it('preserves the publisher banner payload for both preloaded and live queues', async (t) => {
  browserFixture(t);
  const { registerSevioBanner, SEVIO_ASSET_BANNER } = await import('./sevio.ts?case=queue');
  const expected = [{ zone: SEVIO_ASSET_BANNER.zone, adType: 'banner', inventoryId: SEVIO_ASSET_BANNER.inventoryId, accountId: SEVIO_ASSET_BANNER.accountId }];
  registerSevioBanner(SEVIO_ASSET_BANNER);
  assert.deepEqual(window.sevioads, [expected]);
  let submitted;
  window.sevioads = { push(preferences) { submitted = preferences; } };
  registerSevioBanner(SEVIO_ASSET_BANNER);
  assert.deepEqual(submitted, expected);
});
