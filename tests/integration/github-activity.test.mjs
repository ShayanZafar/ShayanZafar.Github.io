// Integration test of the GitHub activity under Projects: the real home page, main.js, a snapshot in the shape the
// Site workflow writes (only the fields its jq keeps) and a stand-in for GitHub's API. No network.
// Run with `node --test` from the repo root.

import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHTML, textOf } from '../support/mini-dom.mjs';
import { DAY, GITHUB_API, HOUR, SNAPSHOT_URL, commit, read, repo, runMain, settle } from '../support/browser.mjs';

const HOME = read('index.html');
const NOW = '2026-10-18T12:00:00Z';
const ago = (ms) => new Date(Date.parse(NOW) - ms).toISOString();

// The repos and the user the page shows, read from the page as the workflow reads them.
const shown = parseHTML(HOME);
const REPOS = [...new Set(shown.querySelectorAll('[data-gh-commits]').map((el) => el.dataset.ghCommits))];
const USER = shown.querySelector('[data-gh-repos]').dataset.ghRepos;
const WRITTEN = shown.querySelectorAll('[data-gh-commits] li').map(textOf);

const snapshotTaken = (takenAgo) => ({
  generatedAt: ago(takenAgo),
  commits: Object.fromEntries(REPOS.map((r) => [r, [
    commit('m', ago(DAY), 'Merge pull request #12 from ShayanZafar/branch', 2, r),
    commit('s1', ago(DAY), 'From the snapshot', 1, r),
    commit('s2', ago(2 * DAY), 'Also from the snapshot', 1, r),
  ]])),
  repos: [repo('Newer', ago(5 * DAY)), repo('CImg', ago(DAY)), repo('ThirteenF', ago(DAY)), repo('Forked', ago(DAY), { fork: true })],
});

const api = {
  ...Object.fromEntries(REPOS.map((r) => [`${GITHUB_API}repos/${r}/commits?per_page=10`, [commit('l1', ago(HOUR), 'Live from GitHub', 1, r)]])),
  [`${GITHUB_API}users/${USER}/repos?sort=pushed&per_page=100`]: [repo('LiveRepo', ago(HOUR))],
};

const view = (document) => ({
  commits: document.querySelectorAll('[data-gh-commits] li').map(textOf),
  repos: document.querySelectorAll('[data-gh-repos] .repo__name').map(textOf),
  reposShown: !document.querySelector('[data-gh-repos-block]').hidden,
  badges: document.querySelectorAll('[data-gh-source]').map((b) => (b.hidden ? null : textOf(b))),
});

test("the home page shows the deploy's snapshot, and GitHub's API when the snapshot is stale or missing", async () => {
  assert.ok(REPOS.includes('ShayanZafar/ThirteenF'), 'the ThirteenF card shows its commits');
  assert.equal(USER, 'ShayanZafar');

  // A fresh snapshot: shown as it is, and GitHub's API is never called.
  const fresh = runMain(HOME, { now: NOW, routes: { [SNAPSHOT_URL]: snapshotTaken(2 * HOUR), ...api } });
  await settle();
  assert.deepEqual(fresh.calls, [SNAPSHOT_URL]);
  assert.deepEqual(view(fresh.document), {
    commits: ['Oct 17From the snapshot', 'Oct 16Also from the snapshot'],
    repos: ['Newer'], // CImg and ThirteenF are excluded by the page; forks never appear
    reposShown: true,
    badges: ['Synced 2 hours ago', 'Synced 2 hours ago'],
  });
  assert.equal(textOf(fresh.document.querySelector('[data-gh-updated]')), 'Updated yesterday');

  // A stale one (over 12 hours old): shown first, then replaced by GitHub's API, one request per list.
  const stale = runMain(HOME, { now: NOW, routes: { [SNAPSHOT_URL]: snapshotTaken(13 * HOUR), ...api } });
  await settle();
  assert.deepEqual(stale.calls.sort(), [SNAPSHOT_URL, ...Object.keys(api)].sort());
  assert.deepEqual(view(stale.document), { commits: ['Oct 18Live from GitHub'], repos: ['LiveRepo'], reposShown: true, badges: ['Live', 'Live'] });

  // No snapshot and GitHub's API refusing (its limit of 60 an hour): the commits written into the page stay.
  const refused = Object.fromEntries(Object.keys(api).map((url) => [url, { status: 403, body: { message: 'API rate limit exceeded' } }]));
  const fallback = runMain(HOME, { now: NOW, routes: { [SNAPSHOT_URL]: { status: 404, body: null }, ...refused } });
  await settle();
  assert.ok(WRITTEN.length > 0, 'index.html ships with commits for the last resort');
  assert.deepEqual(view(fallback.document), { commits: WRITTEN, repos: [], reposShown: false, badges: [null, null] });
});
