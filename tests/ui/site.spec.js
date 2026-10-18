// UI tests: Playwright drives the running site in Chromium, as a visitor or the owner would, with everything outside
// the site played by the stand-ins in stand-ins.js. Run with tests/ui/run.sh; CI runs them on every push and pull
// request.

import { COMMITS_API, DAY, HOUR, LIVE_SITE, REPOS_API, ago, commit, expect, repo, test } from './stand-ins.js';

const freshSnapshot = (takenAgo = 2 * HOUR) => ({
  generatedAt: ago(takenAgo),
  commits: { 'ShayanZafar/ThirteenF': [commit('s1', ago(DAY), 'From the snapshot'), commit('s2', ago(2 * DAY), 'Also from the snapshot')] },
  repos: [repo('Newer', ago(5 * DAY), { homepage: 'https://newer.example.com/' })],
});

test('the home page shows about and Now, how I lead, career and projects', async ({ page }) => {
  // A year on, the figures written into the page (14 and 7 years) update themselves: 15 years since April 2012,
  // 8 since June 2019.
  await page.clock.setFixedTime(new Date('2027-07-01T12:00:00Z'));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Shayan Zafar Ahmad');
  await expect(page.locator('[data-years-since="2012-04"]')).toHaveText(['15', '15']);
  await expect(page.locator('[data-years-since="2019-06"]')).toHaveText(['8', '8']);

  const nav = page.getByRole('navigation', { name: 'Sections' });
  for (const [name, id] of [['About', 'about'], ['How I lead', 'how-i-lead'], ['Career', 'career'], ['Projects', 'projects']]) {
    await nav.getByRole('link', { name, exact: true }).click();
    await expect(page.locator(`#${id}`)).toBeInViewport();
    await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'true');
  }
  await expect(page.locator('#about').getByRole('heading', { name: 'Now' })).toBeVisible();

  // Each role's highlights open under its summary and close again.
  const toggle = page.locator('.more-toggle').first();
  const highlights = page.locator(`#${await toggle.getAttribute('aria-controls')}`);
  await expect(highlights).toBeHidden();
  await toggle.click();
  await expect(highlights).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveText('Hide highlights');
  await toggle.click();
  await expect(highlights).toBeHidden();

  // Readable in light and dark, and at phone width without sideways scrolling.
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.emulateMedia({ colorScheme: 'light' });
  const light = await background();
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await background()).not.toBe(light);
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(page.locator('#career')).toBeAttached();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test("the project cards show the snapshot, then GitHub's API when the snapshot is stale", async ({ page, site }) => {
  const commits = page.locator('[data-gh-commits] li');
  const badge = page.locator('.project [data-gh-source]');
  const repos = page.locator('[data-gh-repos] .repo__name');
  site.github = { [COMMITS_API]: [commit('l1', ago(HOUR), 'Live from GitHub')], [REPOS_API]: [repo('LiveRepo', ago(HOUR))] };

  // A fresh snapshot: shown, with no call to GitHub.
  site.snapshot = freshSnapshot();
  await page.goto('/');
  await expect(commits).toHaveText(['Oct 17From the snapshot', 'Oct 16Also from the snapshot']);
  await expect(badge).toHaveText('Synced 2 hours ago');
  await expect(repos).toHaveText(['Newer']);
  await expect(page.locator('.more-repos').getByRole('link', { name: 'Live site' })).toHaveAttribute('href', 'https://newer.example.com/');
  expect(site.external.filter((url) => url.startsWith('https://api.github.com/'))).toEqual([]);

  // Over 12 hours old: replaced by what GitHub's API answers, marked Live.
  site.snapshot = freshSnapshot(13 * HOUR);
  await page.reload();
  await expect(commits).toHaveText(['Oct 18Live from GitHub']);
  await expect(badge).toHaveText('Live');
  await expect(repos).toHaveText(['LiveRepo']);
  expect(site.external).toEqual(expect.arrayContaining([COMMITS_API, REPOS_API]));

  // No snapshot and GitHub refusing: the commits written into the page stay, and "More on GitHub" stays hidden.
  site.snapshot = null;
  site.github = { [COMMITS_API]: { status: 403, body: { message: 'API rate limit exceeded' } }, [REPOS_API]: { status: 403, body: {} } };
  await page.reload();
  await expect(commits.first()).toContainText('Show where the money moves');
  await expect(badge).toBeHidden();
  await expect(page.locator('.more-repos')).toBeHidden();
  await expect(page.getByRole('link', { name: 'All repositories on GitHub' })).toBeVisible();
});

test('the résumé link downloads the PDF, and the print layout renders to at most 2 pages', async ({ page }) => {
  await page.goto('/');
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.hero__resume').click()]);
  expect(download.suggestedFilename()).toBe('Shayan_Zafar_Ahmad_Resume.pdf');

  await page.emulateMedia({ media: 'print' });
  const printed = await page.locator('body').innerText();
  for (const text of ['Shayan Zafar Ahmad', 'SUMMARY', 'EXPERIENCE', 'EDUCATION', 'Sep 2024', 'T-SQL']) expect(printed).toContain(text);
  expect(printed).not.toMatch(/\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/);
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.locator('#contact')).toBeHidden();

  const pdf = await page.pdf({ preferCSSPageSize: true });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page(?![a-z])/g) || []).length;
  expect(pages).toBeGreaterThanOrEqual(1);
  expect(pages).toBeLessThanOrEqual(2);
});

test('How I work shows its three parts and links back to the home page', async ({ page, site }) => {
  await page.goto('/how-i-work/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How I work');
  const toc = page.getByRole('navigation', { name: 'On this page' });
  for (const name of ['As an engineer', 'As a manager', 'Where AI fits']) {
    await toc.getByRole('link', { name }).click();
    await expect(page.getByRole('heading', { level: 2, name })).toBeInViewport();
  }
  expect(site.external.filter((url) => url.includes('api.github.com'))).toEqual([]);
  await page.locator('.article__back').click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Shayan Zafar Ahmad');
});

test('the intro-call, email and LinkedIn links go where they say, with GoatCounter loaded to count them', async ({ page, site }) => {
  await page.goto('/');
  const contact = page.locator('#contact');
  await contact.scrollIntoViewIfNeeded();

  const [call] = await Promise.all([page.waitForEvent('popup'), contact.getByRole('link', { name: /Request an intro call/ }).click()]);
  await expect(call).toHaveURL('https://cal.com/shayan-zafar-ahmad/intro-call');
  await call.close();
  const [linkedin] = await Promise.all([page.waitForEvent('popup'), contact.getByRole('link', { name: /LinkedIn/ }).click()]);
  await expect(linkedin).toHaveURL('https://www.linkedin.com/in/shayan-zafar-ahmad-85351023/');
  await linkedin.close();
  await expect(contact.getByRole('link', { name: /shayan\.zafar\.ahmad@gmail\.com|Email me/ })).toHaveAttribute('href', 'mailto:shayan.zafar.ahmad@gmail.com');

  for (const link of await contact.locator('a[data-goatcounter-click]').all()) {
    await expect(link).toHaveAttribute('data-goatcounter-title', /\S/);
  }
  // GoatCounter's script loads once, and counts this page view.
  expect(site.external.filter((url) => url === 'https://gc.zgo.at/count.js')).toHaveLength(1);
  await expect.poll(() => site.counts).toEqual(['/']);
});

test('a missing address shows the 404 page, counts it as "404: /path" and leads home', async ({ page, site }) => {
  // GitHub Pages answers any missing address with 404.html; the local server does not, so stand in for it.
  await page.route('**/no/such/page', async (route) => {
    const notFound = await route.fetch({ url: new URL('/404.html', route.request().url()).href });
    await route.fulfill({ status: 404, contentType: 'text/html', body: await notFound.text() });
  });
  const response = await page.goto('/no/such/page');
  expect(response.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  // Styled from the root, so it works at any depth.
  expect(await page.locator('.btn--primary').evaluate((el) => getComputedStyle(el).display)).not.toBe('inline');
  await expect.poll(() => site.counts).toEqual(['404: /no/such/page']);

  await page.getByRole('link', { name: 'Go to shayanzafar.github.io' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Shayan Zafar Ahmad');
});

test('/admin/ links to the dashboard and shows whether this browser is counted', async ({ page, site }) => {
  await page.goto('/admin/');
  await expect(page.locator('[data-gc-status]')).toHaveText('Open this page on shayanzafar.github.io to see whether this browser is counted.');
  await expect(page.getByRole('link', { name: 'Open the GoatCounter dashboard' })).toHaveAttribute('href', 'https://shayanzafar.goatcounter.com/');

  // On the live site (played by the local copy), the page reads GoatCounter's switch from this browser's storage.
  site.liveOrigin();
  await page.goto(`${LIVE_SITE}/admin/`);
  const status = page.locator('[data-gc-status]');
  const toggle = page.locator('[data-gc-toggle]');
  await expect(status).toHaveText('This browser is counted.');
  await expect(toggle).toHaveText('Stop counting this browser');
  await expect(toggle).toHaveAttribute('href', `${LIVE_SITE}/#toggle-goatcounter`);

  await page.evaluate(() => localStorage.setItem('skipgc', 't'));
  await page.reload();
  await expect(status).toHaveText('This browser is not counted.');
  await expect(toggle).toHaveText('Count this browser again');

  // The owner's page is never counted.
  expect(site.external.filter((url) => url.includes('goatcounter') || url.includes('gc.zgo.at'))).toEqual([]);
  expect(site.counts).toEqual([]);
});
