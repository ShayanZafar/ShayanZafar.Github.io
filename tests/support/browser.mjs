// Runs the site's scripts in Node the way a browser would, with stand-ins for what they reach outside the page:
// a mini-dom document, a fixed clock, fetch (GitHub's API and the snapshot), location and localStorage. Test
// tooling only: never deployed (the Site workflow leaves tests/ out).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { parseHTML } from './mini-dom.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

export const SNAPSHOT_URL = '/assets/data/github.json';
export const GITHUB_API = 'https://api.github.com/';
export const HOUR = 3600000;
export const DAY = 24 * HOUR;

/** A Date whose "now" is fixed, so relative times ("3 hours ago") can be checked. */
const fixedClock = (now) => {
  const nowMs = new Date(now).getTime();
  return class FixedDate extends Date {
    constructor(...args) {
      if (args.length) super(...args); else super(nowMs);
    }

    static now() { return nowMs; }
  };
};

/** A fetch stand-in. `routes` maps a URL to a JSON body, a { status, body } answer, or an Error (the network fails). */
export const fetchStandIn = (routes = {}) => {
  const calls = [];
  const fetch = async (url) => {
    calls.push(String(url));
    const answer = routes[url];
    if (answer === undefined || answer instanceof Error) throw answer ?? new TypeError(`Failed to fetch ${url} (no stand-in)`);
    const { status, body } = answer && typeof answer === 'object' && 'status' in answer ? answer : { status: 200, body: answer };
    return { ok: status >= 200 && status < 300, status, json: async () => structuredClone(body) };
  };
  return { fetch, calls };
};

/** Lets every pending promise and timer settle, as after a page finishes loading. */
export const settle = async () => {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
};

/**
 * Runs `source` against the page `html` and returns the document and the stand-ins.
 * Options: now (the clock), routes (for fetch), location ({ hostname, pathname }), storage (localStorage's items, or
 * 'blocked'), intersectionObserver (true to provide one that the test drives).
 */
export function runScript(source, html, { now = '2026-10-18T12:00:00Z', routes = {}, location = {}, storage = {}, intersectionObserver = false } = {}) {
  const document = parseHTML(html);
  const { fetch, calls } = fetchStandIn(routes);
  const listeners = {};
  const blocked = storage === 'blocked'; // as when the browser blocks site storage: every access throws
  const items = new Map(blocked ? [] : Object.entries(storage));
  const guard = (fn) => (...args) => {
    if (blocked) throw new Error('SecurityError: access to localStorage is denied');
    return fn(...args);
  };
  const observers = [];

  const sandbox = {
    document,
    fetch,
    Date: fixedClock(now),
    console,
    scrollY: 0,
    location: { hostname: '127.0.0.1', pathname: '/', ...location },
    localStorage: {
      getItem: guard((key) => (items.has(key) ? items.get(key) : null)),
      setItem: guard((key, value) => items.set(key, String(value))),
      removeItem: guard((key) => items.delete(key)),
    },
    addEventListener: (type, fn) => (listeners[type] ||= []).push(fn),
    dispatchEvent: (event) => (listeners[event.type] || []).forEach((fn) => fn(event)),
  };
  if (intersectionObserver) {
    sandbox.IntersectionObserver = class {
      constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        this.targets = [];
        observers.push(this);
      }

      observe(target) { this.targets.push(target); }
    };
  }
  const context = vm.createContext(sandbox);
  context.window = context;
  vm.runInContext(source, context, { filename: 'page-script.js' });
  return { document, window: context, calls, observers, storage: items, listeners };
}

export const mainJs = () => read('assets/js/main.js');

/** Runs main.js against `html`, as the pages load it (deferred, after the document is parsed). */
export const runMain = (html, options) => runScript(mainJs(), html, options);

/** The inline <script> blocks of a page that hold code (not JSON-LD, not external). */
export const inlineScripts = (html) => parseHTML(html).querySelectorAll('script')
  .filter((s) => !s.hasAttribute('src') && !s.hasAttribute('type'))
  .map((s) => s.textContent);

// GitHub data in the shape the Site workflow's snapshot keeps (the same fields GitHub's API returns, cut down).
export const commit = (sha, date, message, parents = 1, repo = 'ShayanZafar/ThirteenF') => ({
  html_url: `https://github.com/${repo}/commit/${sha}`,
  parents: Array.from({ length: parents }, (_, i) => ({ sha: `${sha}p${i}` })),
  commit: { author: { date }, message },
});

export const repo = (name, pushedAt, extra = {}) => ({
  name,
  html_url: `https://github.com/ShayanZafar/${name}`,
  description: `${name} description`,
  fork: false,
  archived: false,
  pushed_at: pushedAt,
  topics: [],
  language: 'Python',
  stargazers_count: 0,
  homepage: null,
  ...extra,
});
