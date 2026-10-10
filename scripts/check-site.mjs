#!/usr/bin/env node
// Checks for shayanzafar.github.io. No dependencies, so it runs the same locally and in GitHub Actions.
//
//   node scripts/check-site.mjs                  structure, links between pages, copy and privacy rules
//   node scripts/check-site.mjs --external       ...plus every external link
//   node scripts/check-site.mjs --external-only  only external links
//   --root <dir>                                 check a different folder (used to test the checks)
//
// Exits with code 1 if anything fails. In GitHub Actions, problems show up as annotations on the run.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const ROOT = resolve(argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : join(dirname(fileURLToPath(import.meta.url)), '..'));
const CHECK_EXTERNAL = argv.includes('--external') || argv.includes('--external-only');
const CHECK_INTERNAL = !argv.includes('--external-only');

const SITE_ORIGIN = 'https://shayanzafar.github.io/';
const PAGES = ['index.html', 'how-i-work/index.html', '404.html', 'admin/index.html'];
const PAGES_NEEDING_DESCRIPTION = ['index.html', 'how-i-work/index.html'];
const RESUME_PDF = 'assets/Shayan_Zafar_Ahmad_Resume.pdf';
const OG_IMAGE = { path: 'assets/img/og-image.png', width: 1200, height: 627 };

// Visit statistics: GoatCounter runs on every public page. The owner's page is unlisted and never counted.
const ANALYTICS = {
  endpoint: 'https://shayanzafar.goatcounter.com/count',
  script: 'https://gc.zgo.at/count.js',
  privacyPolicy: 'https://www.goatcounter.com/help/privacy',
};
const UNLISTED_PAGES = ['admin/index.html'];
// Link fragments that count.js handles itself (its opt-out switch), so they don't need a matching id.
const SCRIPT_FRAGMENTS = ['toggle-goatcounter'];

// Editorial rules for profile text: keep it professional, with no placeholders.
const BANNED_PHRASES = ['boring', 'heroics', 'day job', 'on the side', 'tour of the architecture',
  'management in miniature', 'no description yet', 'lorem ipsum', 'todo', 'tbd'];

// Privacy rules: the phone number and street address stay off the public site.
const PRIVACY_PATTERNS = [
  { name: 'phone number', re: /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/ },
  { name: 'postal code', re: /\b[A-Z]\d[A-Z] ?\d[A-Z]\d\b/ },
];

// Sites that refuse automated requests (LinkedIn answers 999); they are skipped, not failed.
const SKIP_EXTERNAL = [/^https:\/\/(www\.)?linkedin\.com\//];

const IN_ACTIONS = process.env.GITHUB_ACTIONS === 'true';
const problems = [];
const report = (level, file, message) => problems.push({ level, file, message });
const error = (file, message) => report('error', file, message);

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const exists = (rel) => existsSync(join(ROOT, rel));
const htmlCache = new Map();
const html = (rel) => {
  if (!htmlCache.has(rel)) htmlCache.set(rel, read(rel));
  return htmlCache.get(rel);
};

const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
const idsIn = (s) => [...stripComments(s).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const attrs = (s, name) => [...stripComments(s).matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map((m) => m[1]);
const tags = (s, name) => stripComments(s).match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) || [];

/** The visible copy of a page: text content plus user-facing attributes, without code or markup. */
const visibleText = (s) => {
  const withoutCode = stripComments(s)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ');
  const userAttrs = [...withoutCode.matchAll(/\s(?:alt|aria-label|title|content)="([^"]*)"/g)].map((m) => m[1]);
  const text = withoutCode.replace(/<[^>]+>/g, ' ');
  return `${text} ${userAttrs.join(' ')}`.replace(/&amp;/g, '&').replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/\s+/g, ' ');
};

/** Resolves a link on `page` to a repo file and fragment, or null for external / non-file links. */
const resolveLocal = (page, href) => {
  let url = href;
  if (url.startsWith(SITE_ORIGIN)) url = `/${url.slice(SITE_ORIGIN.length)}`;
  if (/^(https?:|mailto:|tel:|data:|javascript:)/i.test(url)) return null;
  const [beforeHash, fragment = ''] = url.split('#');
  const path = beforeHash.split('?')[0];
  if (!path) return { file: page, fragment };
  let file = path.startsWith('/') ? path.slice(1) : posix.join(posix.dirname(page), path);
  file = posix.normalize(file);
  if (file === '.' || file === '') file = 'index.html';
  if (file.endsWith('/')) file += 'index.html';
  else if (exists(file) && statSync(join(ROOT, file)).isDirectory()) file += '/index.html';
  return { file, fragment };
};

function checkPages() {
  const versions = new Set();
  const eventTitles = new Map(); // click-event name -> title, across pages

  for (const page of PAGES) {
    if (!exists(page)) { error(page, 'page is missing'); continue; }
    const s = html(page);

    if (!/<html\s[^>]*lang="[^"]+"/.test(s)) error(page, 'the <html> element needs a lang attribute');
    if (!/<title>[^<]+<\/title>/.test(s)) error(page, 'missing <title>');
    if (PAGES_NEEDING_DESCRIPTION.includes(page) && !/<meta name="description" content="[^"]+"/.test(s)) {
      error(page, 'missing meta description');
    }
    const h1s = tags(s, 'h1').length;
    if (h1s !== 1) error(page, `expected exactly one <h1>, found ${h1s}`);

    const ids = idsIn(s);
    const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    if (dupes.length) error(page, `duplicate ids: ${dupes.join(', ')}`);

    for (const name of ['aria-controls', 'aria-labelledby', 'aria-describedby']) {
      for (const value of attrs(s, name)) {
        for (const id of value.split(/\s+/)) if (!ids.includes(id)) error(page, `${name}="${id}" points to a missing id`);
      }
    }

    for (const img of tags(s, 'img')) if (!/\salt="/.test(img)) error(page, `image without alt text: ${img.slice(0, 80)}`);
    for (const a of tags(s, 'a')) {
      if (/target="_blank"/.test(a) && !/rel="[^"]*noopener/.test(a)) error(page, `link opens a new tab without rel="noopener": ${a.slice(0, 90)}`);
    }

    // Every local link, image, stylesheet, script and in-page anchor must resolve.
    const refs = [...attrs(s, 'href'), ...attrs(s, 'src'), ...attrs(s, 'srcset').flatMap((v) => v.split(',').map((p) => p.trim().split(/\s+/)[0]))];
    for (const ref of refs) {
      const target = resolveLocal(page, ref);
      if (!target) continue;
      if (!exists(target.file)) { error(page, `broken link: ${ref} (no file ${target.file})`); continue; }
      if (UNLISTED_PAGES.includes(target.file) && target.file !== page) error(page, `links to the unlisted page ${target.file}`);
      if (target.fragment && !SCRIPT_FRAGMENTS.includes(target.fragment) && target.file.endsWith('.html')
        && !idsIn(html(target.file)).includes(target.fragment)) {
        error(page, `broken anchor: ${ref} (no id "${target.fragment}" in ${target.file})`);
      }
    }

    // Visit statistics: one GoatCounter script and a notice on public pages; none on unlisted pages. allow_local
    // would count local previews and the résumé PDF build, which renders the page from 127.0.0.1.
    const counters = tags(s, 'script').filter((t) => /\sdata-goatcounter=/.test(t));
    if (UNLISTED_PAGES.includes(page)) {
      if (counters.length) error(page, 'unlisted pages must not load the GoatCounter script');
      if (!/<meta name="robots" content="noindex/.test(s)) error(page, 'unlisted pages need <meta name="robots" content="noindex">');
    } else {
      if (counters.length !== 1) error(page, `expected the GoatCounter script once, found ${counters.length}`);
      for (const t of counters) {
        if (!t.includes(`data-goatcounter="${ANALYTICS.endpoint}"`) || !t.includes(`src="${ANALYTICS.script}"`)) {
          error(page, `the GoatCounter script must send to ${ANALYTICS.endpoint} and load ${ANALYTICS.script}`);
        }
      }
      if (!attrs(s, 'href').includes(ANALYTICS.privacyPolicy)) error(page, `missing the visit statistics notice (link to ${ANALYTICS.privacyPolicy})`);
    }
    if (/allow_local/.test(stripComments(s))) error(page, 'GoatCounter must not use allow_local');

    // Click events: names GoatCounter accepts, and one title per name (the dashboard shows only one).
    for (const el of stripComments(s).match(/<[a-z][^>]*\sdata-goatcounter-click="[^"]*"[^>]*>/gi) || []) {
      const name = el.match(/\sdata-goatcounter-click="([^"]*)"/)[1];
      const title = (el.match(/\sdata-goatcounter-title="([^"]*)"/) || [])[1];
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) error(page, `click event "${name}" should be lowercase words joined by hyphens`);
      if (!title) error(page, `click event "${name}" needs a data-goatcounter-title`);
      else if (!eventTitles.has(name)) eventTitles.set(name, title);
      else if (eventTitles.get(name) !== title) {
        error(page, `click event "${name}" has two titles ("${eventTitles.get(name)}" and "${title}")`);
        eventTitles.set(name, title);
      }
    }

    for (const m of s.matchAll(/\?v=([\w.-]+)"/g)) versions.add(m[1]);

    // Copy and privacy rules apply to everything a visitor can read.
    const text = visibleText(s);
    for (const phrase of BANNED_PHRASES) {
      if (new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'i').test(text)) error(page, `unprofessional or placeholder wording: "${phrase}"`);
    }
    for (const { name, re } of PRIVACY_PATTERNS) {
      const hit = s.match(re);
      if (hit) error(page, `possible ${name} on a public page: "${hit[0]}"`);
    }
  }

  if (versions.size > 1) error('index.html', `asset versions differ between pages (${[...versions].join(', ')}); bump them together`);
}

function checkAssets() {
  if (!exists(RESUME_PDF)) error(RESUME_PDF, 'résumé PDF is missing');
  else if (statSync(join(ROOT, RESUME_PDF)).size < 20_000) error(RESUME_PDF, 'résumé PDF looks too small to be complete');

  if (!exists(OG_IMAGE.path)) {
    error(OG_IMAGE.path, 'link-preview image is missing');
  } else {
    const png = readFileSync(join(ROOT, OG_IMAGE.path));
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    if (width !== OG_IMAGE.width || height !== OG_IMAGE.height) {
      error(OG_IMAGE.path, `link-preview image is ${width}×${height}; LinkedIn expects ${OG_IMAGE.width}×${OG_IMAGE.height}`);
    }
  }

  for (const file of ['assets/js/main.js', 'README.md']) {
    if (!exists(file)) continue;
    for (const { name, re } of PRIVACY_PATTERNS) {
      const hit = read(file).match(re);
      if (hit) error(file, `possible ${name}: "${hit[0]}"`);
    }
  }
}

async function checkExternalLinks() {
  const links = new Map(); // url -> first page it appears on
  for (const page of PAGES.filter(exists)) {
    for (const a of tags(html(page), 'a')) {
      const href = (a.match(/\shref="([^"]+)"/) || [])[1];
      if (!href || !/^https?:\/\//.test(href) || href.startsWith(SITE_ORIGIN)) continue;
      if (!links.has(href)) links.set(href, page);
    }
  }

  const headers = { 'user-agent': 'Mozilla/5.0 (compatible; site-link-check; +https://shayanzafar.github.io/)' };
  for (const [url, page] of links) {
    if (SKIP_EXTERNAL.some((re) => re.test(url))) continue;
    let status = 0;
    let detail = '';
    for (let attempt = 1; attempt <= 3 && !(status >= 200 && status < 400); attempt++) {
      try {
        let res = await fetch(url, { method: 'HEAD', redirect: 'follow', headers, signal: AbortSignal.timeout(20_000) });
        if (res.status >= 400) res = await fetch(url, { method: 'GET', redirect: 'follow', headers, signal: AbortSignal.timeout(20_000) });
        status = res.status;
      } catch (e) {
        detail = e.cause?.code || e.name || String(e);
      }
      if (!(status >= 200 && status < 400) && attempt < 3) await new Promise((r) => setTimeout(r, 2_000 * attempt));
    }
    if (!(status >= 200 && status < 400)) error(page, `external link failed (${status || detail}): ${url}`);
  }
  return links.size;
}

const started = Date.now();
if (CHECK_INTERNAL) { checkPages(); checkAssets(); }
const externalCount = CHECK_EXTERNAL ? await checkExternalLinks() : 0;

for (const { level, file, message } of problems) {
  if (IN_ACTIONS) console.log(`::${level} file=${file}::${message}`);
  else console.log(`${level === 'error' ? '✗' : '!'} ${file}: ${message}`);
}
const errorCount = problems.filter((p) => p.level === 'error').length;
const scope = [CHECK_INTERNAL && `${PAGES.length} pages`, CHECK_EXTERNAL && `${externalCount} external links`].filter(Boolean).join(' and ');
console.log(errorCount
  ? `\n${errorCount} problem(s) found while checking ${scope}.`
  : `\nAll checks passed for ${scope} (${((Date.now() - started) / 1000).toFixed(1)}s).`);
process.exit(errorCount ? 1 : 0);
