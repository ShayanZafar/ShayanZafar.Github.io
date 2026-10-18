// Unit tests for assets/js/main.js on its own: small pages made here, a fixed clock, and stand-ins for the GitHub
// snapshot and API (no network). They check what README.md says the page should do.
// Run with `node --test` from the repo root.

import assert from 'node:assert/strict';
import test from 'node:test';
import { textOf } from '../support/mini-dom.mjs';
import { DAY, GITHUB_API, HOUR, SNAPSHOT_URL, commit, repo, runMain, settle } from '../support/browser.mjs';

const NOW = '2026-10-18T12:00:00Z';
const ago = (ms) => new Date(Date.parse(NOW) - ms).toISOString();
const COMMITS_API = `${GITHUB_API}repos/ShayanZafar/ThirteenF/commits?per_page=10`;
const REPOS_API = `${GITHUB_API}users/ShayanZafar/repos?sort=pushed&per_page=100`;

const HEADER = '<header id="site-header"><nav class="site-nav"><a href="#about">About</a><a href="#career">Career</a></nav></header>';

const projectCard = `
  <article class="project">
    <span data-gh-kind="ShayanZafar/ThirteenF">Personal project · In active development</span>
    <span data-gh-updated="ShayanZafar/ThirteenF">Updated Oct 3, 2026</span>
    <h4>Recent commits <span class="live-badge" data-gh-source hidden></span></h4>
    <ol data-gh-commits="ShayanZafar/ThirteenF"><li><a href="https://github.com/ShayanZafar/ThirteenF/commit/written">Written into the page</a></li></ol>
  </article>`;

const repoBlock = `
  <div data-gh-repos-block hidden>
    <h3>More on GitHub <span class="live-badge" data-gh-source hidden></span></h3>
    <ul data-gh-repos="ShayanZafar" data-gh-exclude="ShayanZafar.Github.io, ThirteenF, CImg" data-gh-days="365" data-gh-max="6"></ul>
  </div>`;

const page = (body) => `<!doctype html><html><body>${HEADER}<main>${body}</main></body></html>`;

const snapshot = (takenAgo, { commits = [commit('a1', ago(2 * DAY), 'Snapshot commit')], repos = [] } = {}) => ({
  generatedAt: ago(takenAgo),
  commits: { 'ShayanZafar/ThirteenF': commits },
  repos,
});

const commitTexts = (document) => document.querySelectorAll('[data-gh-commits] li').map(textOf);
const badge = (document, scope = '.project') => document.querySelector(`${scope} [data-gh-source]`);

test('years of experience count whole years since each start month', () => {
  const html = page('<span data-years-since="2012-04">14</span> <span data-years-since="2019-11">7</span> <span data-years-since="2026-06">0</span>');
  for (const [now, expected] of [['2026-10-18T12:00:00Z', ['14', '6', '0']], ['2027-04-02T12:00:00Z', ['15', '7', '0']]]) {
    const { document } = runMain(html, { now });
    // A figure under a year keeps what the page was written with.
    assert.deepEqual(document.querySelectorAll('[data-years-since]').map(textOf), expected, `on ${now}`);
  }
});

test('the footer year is the current year', () => {
  const { document } = runMain(page('<footer>© <span data-current-year>2020</span></footer>'), { now: '2027-01-01T12:00:00Z' });
  assert.equal(textOf(document.querySelector('[data-current-year]')), '2027');
});

test("a career highlights toggle shows and hides the role's highlights", () => {
  const { document } = runMain(page(`
    <article class="role">
      <button class="more-toggle" aria-expanded="false" aria-controls="points" data-count="3"><span class="more-toggle__label">Show 3 highlights</span></button>
      <ul id="points"><li>One</li><li>Two</li><li>Three</li></ul>
    </article>`));
  const role = document.querySelector('.role');
  const button = document.querySelector('.more-toggle');
  button.click();
  assert.equal(role.classList.contains('is-expanded'), true);
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.equal(textOf(button), 'Hide highlights');
  button.click();
  assert.equal(role.classList.contains('is-expanded'), false);
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(textOf(button), 'Show 3 highlights');
});

test('the nav marks the section in view, and the header gets its hairline once the page scrolls', () => {
  const { document, window, observers, listeners } = runMain(
    page('<section id="about">About</section><section id="career">Career</section>'),
    { intersectionObserver: true },
  );
  const [observer] = observers;
  assert.deepEqual(observer.targets.map((s) => s.id), ['about', 'career']);
  const current = () => document.querySelectorAll('.site-nav a').filter((a) => a.getAttribute('aria-current') === 'true').map(textOf);
  observer.callback([{ isIntersecting: true, target: document.getElementById('career') }]);
  assert.deepEqual(current(), ['Career']);
  observer.callback([{ isIntersecting: false, target: document.getElementById('about') }]);
  assert.deepEqual(current(), ['Career']);
  observer.callback([{ isIntersecting: true, target: document.getElementById('about') }]);
  assert.deepEqual(current(), ['About']);

  const header = document.getElementById('site-header');
  assert.equal(header.classList.contains('is-scrolled'), false);
  window.scrollY = 120;
  listeners.scroll.forEach((fn) => fn());
  assert.equal(header.classList.contains('is-scrolled'), true);
});

test('main.js fetches nothing on a page without GitHub activity', async () => {
  const { calls } = runMain(page('<section id="about"><p>Long-form text</p></section>'));
  await settle();
  assert.deepEqual(calls, []);
});

test("commits come from a fresh snapshot without calling GitHub's API", async () => {
  const commits = [
    commit('m1', ago(1 * DAY), 'Merge pull request #9', 2),
    commit('c1', ago(1 * DAY), 'Add the manager pages\n\nLonger body that stays off the card'),
    commit('c2', ago(2 * DAY), 'Second'),
    commit('c3', ago(3 * DAY), 'Third'),
    commit('c4', ago(4 * DAY), 'Fourth'),
    commit('c5', ago(5 * DAY), 'Fifth'),
  ];
  const { document, calls } = runMain(page(projectCard), { now: NOW, routes: { [SNAPSHOT_URL]: snapshot(3 * HOUR, { commits }) } });
  await settle();
  assert.deepEqual(calls, [SNAPSHOT_URL]);
  // Merge commits are skipped, four are shown, each with its date and first line.
  assert.deepEqual(commitTexts(document), ['Oct 17Add the manager pages', 'Oct 16Second', 'Oct 15Third', 'Oct 14Fourth']);
  assert.equal(document.querySelector('[data-gh-commits] a').href, 'https://github.com/ShayanZafar/ThirteenF/commit/c1');
  assert.equal(textOf(document.querySelector('[data-gh-updated]')), 'Updated yesterday');
  assert.equal(textOf(badge(document)), 'Synced 3 hours ago');
  assert.equal(badge(document).hidden, false);
  assert.equal(badge(document).classList.contains('live-badge--snapshot'), true);
  assert.equal(textOf(document.querySelector('[data-gh-kind]')), 'Personal project · In active development');
});

test("a stale snapshot is shown, then replaced by GitHub's API", async () => {
  const { document, calls } = runMain(page(projectCard), {
    now: NOW,
    routes: {
      [SNAPSHOT_URL]: snapshot(13 * HOUR),
      [COMMITS_API]: [commit('live1', ago(2 * HOUR), 'Live from the API')],
    },
  });
  await settle();
  assert.deepEqual(calls, [SNAPSHOT_URL, COMMITS_API]);
  assert.deepEqual(commitTexts(document), ['Oct 18Live from the API']);
  assert.equal(textOf(document.querySelector('[data-gh-updated]')), 'Updated today');
  assert.equal(textOf(badge(document)), 'Live');
  assert.equal(badge(document).classList.contains('live-badge--snapshot'), false);
});

test('without a snapshot the API is called, and when it fails the commits written into the page stay', async () => {
  for (const routes of [{}, { [SNAPSHOT_URL]: { status: 404, body: null }, [COMMITS_API]: { status: 403, body: { message: 'API rate limit exceeded' } } }]) {
    const { document, calls } = runMain(page(projectCard), { now: NOW, routes });
    await settle();
    assert.deepEqual(calls, [SNAPSHOT_URL, COMMITS_API]);
    assert.deepEqual(commitTexts(document), ['Written into the page']);
    assert.equal(badge(document).hidden, true);
  }
});

test('when the API fails, a stale snapshot stays on screen', async () => {
  const { document } = runMain(page(projectCard), { now: NOW, routes: { [SNAPSHOT_URL]: snapshot(2 * DAY), [COMMITS_API]: new TypeError('offline') } });
  await settle();
  assert.deepEqual(commitTexts(document), ['Oct 16Snapshot commit']);
  assert.equal(textOf(badge(document)), 'Synced 2 days ago');
});

test("a snapshot that can't be read counts as missing", async () => {
  for (const bad of [{ generatedAt: 'not a date', commits: {} }, { generatedAt: ago(HOUR), commits: { 'ShayanZafar/ThirteenF': 'nope' } }]) {
    const { document, calls } = runMain(page(projectCard), { now: NOW, routes: { [SNAPSHOT_URL]: bad, [COMMITS_API]: [commit('l', ago(HOUR), 'From the API')] } });
    await settle();
    assert.deepEqual(calls, [SNAPSHOT_URL, COMMITS_API]);
    assert.deepEqual(commitTexts(document), ['Oct 18From the API']);
  }
});

test("commits that don't link to github.com are never shown", async () => {
  const unsafe = { ...commit('x', ago(DAY), 'Elsewhere'), html_url: 'javascript:alert(1)' };
  const { document } = runMain(page(projectCard), { now: NOW, routes: { [SNAPSHOT_URL]: snapshot(HOUR, { commits: [unsafe, commit('ok', ago(DAY), 'Safe')] }) } });
  await settle();
  assert.deepEqual(commitTexts(document), ['Oct 17Safe']);
});

test('the project says "Personal project" after 90 days without commits', async () => {
  const { document } = runMain(page(projectCard), { now: NOW, routes: { [SNAPSHOT_URL]: snapshot(HOUR, { commits: [commit('old', ago(91 * DAY), 'Old work')] }) } });
  await settle();
  assert.equal(textOf(document.querySelector('[data-gh-kind]')), 'Personal project');
  assert.equal(textOf(document.querySelector('[data-gh-updated]')), 'Updated on Jul 19, 2026');

  const recent = runMain(page(projectCard), { now: NOW, routes: { [SNAPSHOT_URL]: snapshot(HOUR, { commits: [commit('mid', ago(89 * DAY), 'Still active')] }) } });
  await settle();
  assert.equal(textOf(recent.document.querySelector('[data-gh-kind]')), 'Personal project · In active development');
});

test('the repo list skips forks, archived, excluded and hidden repos, and old ones unless tagged portfolio', async () => {
  const repos = [
    repo('Recent', ago(10 * DAY), { stargazers_count: 3, homepage: 'https://recent.example.com/', language: 'TypeScript' }),
    repo('Forked', ago(DAY), { fork: true }),
    repo('Archived', ago(DAY), { archived: true }),
    repo('thirteenf', ago(DAY)),
    repo('ShayanZafar.github.io', ago(DAY)),
    repo('Hidden', ago(DAY), { topics: ['hide-from-site'] }),
    repo('Old', ago(400 * DAY)),
    repo('OldButFeatured', ago(400 * DAY), { topics: ['portfolio'], description: null, language: null, homepage: 'javascript:alert(1)' }),
  ];
  const { document, calls } = runMain(page(repoBlock), { now: NOW, routes: { [SNAPSHOT_URL]: { generatedAt: ago(HOUR), commits: {}, repos } } });
  await settle();
  assert.deepEqual(calls, [SNAPSHOT_URL]);
  const cards = document.querySelectorAll('.repo');
  assert.deepEqual(cards.map((c) => textOf(c.querySelector('.repo__name'))), ['Recent', 'OldButFeatured']);
  assert.equal(document.querySelector('[data-gh-repos-block]').hidden, false);
  assert.equal(textOf(badge(document, '[data-gh-repos-block]')), 'Synced an hour ago');

  const [recent, featured] = cards;
  assert.equal(textOf(recent.querySelector('.repo__desc')), 'Recent description');
  assert.equal(textOf(recent.querySelector('.repo__meta')), 'TypeScriptUpdated 10 days ago★ 3');
  assert.equal(recent.querySelector('.repo__name').href, 'https://github.com/ShayanZafar/Recent');
  assert.equal(recent.querySelector('.repo__name').rel, 'noopener');
  assert.equal(recent.querySelector('.repo__link').href, 'https://recent.example.com/');
  // No description, language or stars: just the name and when it was updated. Only http(s) homepages are linked.
  assert.equal(featured.querySelector('.repo__desc'), null);
  assert.equal(textOf(featured.querySelector('.repo__meta')), 'Updated on Sep 13, 2025');
  assert.equal(featured.querySelector('.repo__link'), null);
});

test('the repo list shows at most data-gh-max repos and stays hidden while none qualifies', async () => {
  const many = Array.from({ length: 9 }, (_, i) => repo(`Repo${i}`, ago((i + 1) * DAY)));
  const full = runMain(page(repoBlock), { now: NOW, routes: { [SNAPSHOT_URL]: { generatedAt: ago(HOUR), commits: {}, repos: many } } });
  const none = runMain(page(repoBlock), { now: NOW, routes: { [SNAPSHOT_URL]: { generatedAt: ago(HOUR), commits: {}, repos: [repo('Forked', ago(DAY), { fork: true })] } } });
  await settle();
  assert.equal(full.document.querySelectorAll('.repo').length, 6);
  assert.equal(none.document.querySelectorAll('.repo').length, 0);
  assert.equal(none.document.querySelector('[data-gh-repos-block]').hidden, true);
});

test("the repo list comes from GitHub's API when there is no snapshot", async () => {
  const { document, calls } = runMain(page(repoBlock), { now: NOW, routes: { [REPOS_API]: [repo('FromApi', ago(DAY))] } });
  await settle();
  assert.deepEqual(calls, [SNAPSHOT_URL, REPOS_API]);
  assert.deepEqual(document.querySelectorAll('.repo__name').map(textOf), ['FromApi']);
  assert.equal(textOf(badge(document, '[data-gh-repos-block]')), 'Live');
});
