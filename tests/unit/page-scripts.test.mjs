// Unit tests for the small scripts written into the pages themselves: the 404 page's GoatCounter path and the
// /admin/ page's counting switch. Each runs alone against its own page, with stand-ins for location and
// localStorage (no network). Run with `node --test` from the repo root.

import assert from 'node:assert/strict';
import test from 'node:test';
import { textOf } from '../support/mini-dom.mjs';
import { inlineScripts, read, runScript } from '../support/browser.mjs';

const NOT_FOUND = read('404.html');
const ADMIN = read('admin/index.html');

test('the 404 page counts the visit as "404: " and the missing path', () => {
  const config = inlineScripts(NOT_FOUND).find((code) => code.includes('goatcounter'));
  for (const pathname of ['/old-page', '/how-i-work/missing/', '/assets/nope.pdf']) {
    const { window } = runScript(config, NOT_FOUND, { location: { hostname: 'shayanzafar.github.io', pathname } });
    assert.equal(typeof window.goatcounter.path, 'function', 'GoatCounter calls goatcounter.path() for the page path');
    assert.equal(window.goatcounter.path(), `404: ${pathname}`);
  }
});

const adminSwitch = (options) => {
  const script = inlineScripts(ADMIN).find((code) => code.includes('skipgc'));
  const run = runScript(script, ADMIN, options);
  const status = run.document.querySelector('[data-gc-status]');
  const toggle = run.document.querySelector('[data-gc-toggle]');
  return { ...run, status, toggle };
};

test("the admin switch says whether this browser is counted, from GoatCounter's skipgc setting", () => {
  const live = { hostname: 'shayanzafar.github.io', pathname: '/admin/' };

  const counted = adminSwitch({ location: live });
  assert.equal(counted.status.hidden, false);
  assert.equal(textOf(counted.status), 'This browser is counted.');
  assert.equal(textOf(counted.toggle), 'Stop counting this browser');

  const skipped = adminSwitch({ location: live, storage: { skipgc: 't' } });
  assert.equal(textOf(skipped.status), 'This browser is not counted.');
  assert.equal(textOf(skipped.toggle), 'Count this browser again');

  // Using the switch in another tab, or coming back to this one, updates what the page says.
  counted.storage.set('skipgc', 't');
  counted.window.dispatchEvent({ type: 'storage' });
  assert.equal(textOf(counted.status), 'This browser is not counted.');
  counted.storage.delete('skipgc');
  counted.window.dispatchEvent({ type: 'pageshow' });
  assert.equal(textOf(counted.status), 'This browser is counted.');
});

test('away from the live site the admin page says where the switch can be read', () => {
  for (const hostname of ['localhost', '127.0.0.1']) {
    const { status, toggle } = adminSwitch({ location: { hostname, pathname: '/admin/' }, storage: { skipgc: 't' } });
    assert.equal(textOf(status), 'Open this page on shayanzafar.github.io to see whether this browser is counted.');
    assert.equal(textOf(toggle), 'Stop counting this browser');
  }
});

test('when site storage is blocked the admin page shows no status rather than a wrong one', () => {
  const { status, toggle } = adminSwitch({ location: { hostname: 'shayanzafar.github.io', pathname: '/admin/' }, storage: 'blocked' });
  assert.equal(status.hidden, true);
  assert.equal(textOf(status), '');
  // The switch itself still works: it is GoatCounter's link, not this script.
  assert.equal(toggle.href, 'https://shayanzafar.github.io/#toggle-goatcounter');
});
