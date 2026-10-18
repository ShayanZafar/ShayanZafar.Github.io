// The UI tests' stand-ins for everything outside the site, so they never touch the network: GitHub's API and the
// deploy's snapshot (assets/data/github.json, which only the Site workflow writes), GoatCounter's count.js and its
// count endpoint, Google Fonts, and the pages the site links to (Cal.com, LinkedIn, GitHub). Every test gets them
// through the `site` fixture. Test tooling only: never deployed (the Site workflow leaves tests/ out).

import { test as base, expect } from '@playwright/test';

export { expect };

export const SITE = 'http://127.0.0.1:4173';
export const LIVE_SITE = 'https://shayanzafar.github.io';
export const NOW = '2026-10-18T12:00:00Z';
export const HOUR = 3600000;
export const DAY = 24 * HOUR;
export const ago = (ms) => new Date(Date.parse(NOW) - ms).toISOString();

export const commit = (sha, date, message, parents = 1) => ({
  html_url: `https://github.com/ShayanZafar/ThirteenF/commit/${sha}`,
  parents: Array.from({ length: parents }, (_, i) => ({ sha: `${sha}p${i}` })),
  commit: { author: { date }, message },
});

export const repo = (name, pushedAt, extra = {}) => ({
  name, html_url: `https://github.com/ShayanZafar/${name}`, description: `${name}, described on GitHub`, fork: false, archived: false,
  pushed_at: pushedAt, topics: [], language: 'Python', stargazers_count: 0, homepage: null, ...extra,
});

export const COMMITS_API = 'https://api.github.com/repos/ShayanZafar/ThirteenF/commits?per_page=10';
export const REPOS_API = 'https://api.github.com/users/ShayanZafar/repos?sort=pushed&per_page=100';

// count.js stand-in: like GoatCounter's script, it takes the page path from window.goatcounter.path() when the page
// sets one, and sends it to the endpoint in its data-goatcounter attribute.
const COUNT_JS = `(() => {
  const script = document.currentScript;
  const config = window.goatcounter || {};
  const path = typeof config.path === 'function' ? config.path(location.pathname) : location.pathname;
  fetch(script.dataset.goatcounter + '?p=' + encodeURIComponent(path), { mode: 'no-cors' });
})();`;

const standInPage = (url) => `<!doctype html><title>Stand-in</title><h1>Stand-in for ${url}</h1>`;

/**
 * The `site` fixture. Set `site.snapshot` (an object, or null for none) and `site.github` (API URL -> JSON body, or
 * { status, body }) before the page loads. `site.external` lists every request that left the site, `site.counts` the
 * page paths sent to GoatCounter, and `site.liveOrigin()` serves https://shayanzafar.github.io from the local copy.
 */
export const test = base.extend({
  site: [async ({ context }, use) => {
    const site = { snapshot: null, github: {}, external: [], counts: [], live: false };
    site.liveOrigin = () => { site.live = true; };

    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = request.url();
      const { origin, pathname } = new URL(url);

      if (origin === SITE || (origin === LIVE_SITE && site.live)) {
        if (pathname === '/assets/data/github.json') {
          return site.snapshot ? route.fulfill({ json: site.snapshot }) : route.fulfill({ status: 404, body: 'Not found' });
        }
        if (origin === SITE) return route.fallback();
        // The live site, played by the local copy (for what only runs on shayanzafar.github.io).
        const local = await route.fetch({ url: SITE + pathname });
        return route.fulfill({ response: local });
      }

      site.external.push(url);
      if (url.startsWith('https://api.github.com/')) {
        const answer = site.github[url];
        if (answer === undefined) return route.abort('connectionrefused');
        const { status, body } = answer && typeof answer === 'object' && 'status' in answer ? answer : { status: 200, body: answer };
        return route.fulfill({ status, json: body });
      }
      if (url === 'https://gc.zgo.at/count.js') return route.fulfill({ contentType: 'text/javascript', body: COUNT_JS });
      if (url.startsWith('https://shayanzafar.goatcounter.com/count')) {
        site.counts.push(new URL(url).searchParams.get('p'));
        return route.fulfill({ status: 204, body: '' });
      }
      if (origin === 'https://fonts.googleapis.com') return route.fulfill({ contentType: 'text/css', body: '' });
      if (request.resourceType() === 'document') return route.fulfill({ contentType: 'text/html', body: standInPage(url) });
      return route.abort('blockedbyclient');
    });

    await use(site);
  }, { auto: true }],

  page: async ({ page }, use) => {
    await page.clock.setFixedTime(new Date(NOW));
    await use(page);
  },
});
