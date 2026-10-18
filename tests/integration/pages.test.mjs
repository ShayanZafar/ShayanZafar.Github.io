// Integration tests: the real pages together with main.js, the stylesheet, the résumé PDF and each other, as they are
// served. Outside services (GitHub, GoatCounter) are played by stand-ins; nothing touches the network.
// Run with `node --test` from the repo root.

import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import test from 'node:test';
import { parseHTML, textOf } from '../support/mini-dom.mjs';
import { ROOT, SNAPSHOT_URL, inlineScripts, read, runMain, runScript, settle } from '../support/browser.mjs';

const PUBLIC_PAGES = ['index.html', 'how-i-work/index.html', '404.html'];
const PAGES = [...PUBLIC_PAGES, 'admin/index.html'];
const NOW = '2026-10-18T12:00:00Z';
const page = (file) => parseHTML(read(file));

/** The repo file a link on `from` points to, or null for links off the site. Mirrors how GitHub Pages serves paths. */
const target = (from, href) => {
  let url = href.replace(/^https:\/\/shayanzafar\.github\.io\//, '/');
  if (/^(https?:|mailto:|tel:|data:|javascript:)/i.test(url)) return null;
  url = url.split('#')[0].split('?')[0];
  if (!url) return from;
  let file = posix.normalize(url.startsWith('/') ? url.slice(1) : posix.join(posix.dirname(from), url));
  if (file === '.' || file === '') return 'index.html';
  if (file.endsWith('/')) file += 'index.html';
  else if (existsSync(join(ROOT, file)) && statSync(join(ROOT, file)).isDirectory()) file += '/index.html';
  return file;
};

// What the print layout hides: the selectors of styles.css's print rules that set display: none.
const printHidden = () => {
  const css = read('assets/css/styles.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const print = css.slice(css.indexOf('@media print'));
  return [...print.matchAll(/([^{}]+)\{([^{}]*display:\s*none[^{}]*)\}/g)]
    .flatMap(([, selectors]) => selectors.split(',').map((s) => s.trim()))
    .filter((s) => !s.includes(':')); // pseudo-elements draw nothing a reader sees
};

const screenHidden = ['.print-only'];

/** The text of `root` a reader sees under the given hidden selectors, block by block. */
const visibleText = (root, hidden) => {
  const out = [];
  const walk = (node) => {
    if (node.nodeType === 3) { out.push(node.data); return; }
    if (node.nodeType !== 1 || ['script', 'style', 'svg', 'head'].includes(node.localName)) return;
    if (hidden.some((s) => node.matches(s))) return;
    node.childNodes.forEach(walk);
    out.push(' ');
  };
  walk(root);
  return out.join('').replace(/\s+/g, ' ').trim();
};

test('main.js on the home page fills the years and every career toggle, and the nav follows each section', async () => {
  const { document, observers } = runMain(read('index.html'), { now: NOW, intersectionObserver: true, routes: { [SNAPSHOT_URL]: { status: 404, body: null } } });
  await settle();

  assert.equal(textOf(document.querySelector('h1')), 'Shayan Zafar Ahmad');
  const sections = ['about', 'how-i-lead', 'career', 'projects'];
  const navTargets = document.querySelectorAll('.site-nav a').map((a) => a.hash.slice(1));
  assert.deepEqual(navTargets, sections, 'the nav lists About, How I lead, Career and Projects');
  for (const id of sections) {
    const section = document.getElementById(id);
    assert.ok(section?.querySelector('h2'), `#${id} has a heading`);
    assert.ok(observers[0].targets.includes(section), `the nav follows #${id}`);
  }
  // About carries the Now notes with the month they were updated.
  const about = document.getElementById('about');
  assert.ok(about.querySelectorAll('h3').some((h) => textOf(h) === 'Now'), 'About has a Now part');
  assert.match(textOf(about.querySelector('.now__date')), /^Updated [A-Z][a-z]+ \d{4}$/);

  // Years of experience: whole years since each start month, on Oct 18, 2026.
  for (const el of document.querySelectorAll('[data-years-since]')) {
    const [year, month] = el.dataset.yearsSince.split('-').map(Number);
    assert.equal(textOf(el), String(Math.floor(((2026 - year) * 12 + (10 - month)) / 12)), `data-years-since="${el.dataset.yearsSince}"`);
  }

  // Each role's toggle says how many highlights it holds, and opens exactly that list.
  const toggles = document.querySelectorAll('.more-toggle');
  assert.ok(toggles.length >= 3, 'the career section has a toggle per role');
  for (const button of toggles) {
    const list = document.getElementById(button.getAttribute('aria-controls'));
    const count = list.querySelectorAll('li').length;
    assert.equal(button.dataset.count, String(count), `${list.id}: data-count matches its highlights`);
    assert.equal(textOf(button), `Show ${count} highlights`);
    assert.ok(button.closest('.role').querySelectorAll('ul').includes(list), `${list.id} is in the same role`);
    button.click();
    assert.equal(button.getAttribute('aria-expanded'), 'true');
    assert.equal(textOf(button), 'Hide highlights');
  }
});

test('main.js on the How I work page fetches nothing and leaves its content as written', async () => {
  const html = read('how-i-work/index.html');
  const before = textOf(parseHTML(html).querySelector('main'));
  const { document, calls } = runMain(html, { now: NOW });
  await settle();
  assert.deepEqual(calls, []);
  assert.equal(textOf(document.querySelector('main')), before);

  assert.equal(textOf(document.querySelector('h1')), 'How I work');
  const toc = document.querySelectorAll('.article__toc a');
  assert.deepEqual(toc.map(textOf), ['As an engineer', 'As a manager', 'Where AI fits']);
  for (const link of toc) {
    const part = document.getElementById(link.hash.slice(1));
    assert.equal(textOf(part?.querySelector('h2')), textOf(link), `${link.hash} leads to its part`);
  }
  assert.equal(target('how-i-work/index.html', document.querySelector('.article__back').href), 'index.html', 'it links back home');
  for (const a of document.querySelectorAll('.site-nav a')) {
    const file = target('how-i-work/index.html', a.href);
    assert.equal(file, 'index.html');
    assert.ok(page('index.html').getElementById(a.hash.slice(1)), `${a.href} exists on the home page`);
  }
});

test("the print layout of the home page keeps the résumé's name, headings, dates and T-SQL, and links the one PDF", () => {
  const home = page('index.html');
  const printed = visibleText(home.querySelector('body'), printHidden());
  for (const text of ['Shayan Zafar Ahmad', 'Summary', 'Experience', 'Skills', 'Education', 'Sep 2024', 'T-SQL']) {
    assert.ok(printed.includes(text), `the printed résumé shows "${text}"`);
  }
  for (const text of ['Show 9 highlights', 'Request an intro call', 'How I lead', 'More on GitHub', 'Recent commits']) {
    assert.ok(!printed.includes(text), `the printed résumé leaves out "${text}"`);
  }
  assert.doesNotMatch(printed, /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/, 'no phone number in the résumé');
  // On screen it's the other way round: the résumé-only parts (summary, skills, education) stay out of the page.
  const onScreen = visibleText(home.querySelector('body'), screenHidden);
  for (const id of ['summary-title', 'skills-title', 'education-title']) {
    const title = textOf(home.getElementById(id));
    assert.ok(home.getElementById(id).closest('.print-only'), `${title} is print-only`);
    assert.ok(printed.includes(title));
  }
  assert.ok(onScreen.includes('Request an intro call'), 'the screen shows the web page');
  const careerTitle = home.getElementById('career-title');
  assert.equal(visibleText(careerTitle, screenHidden), 'Career');
  assert.equal(visibleText(careerTitle, printHidden()), 'Experience', 'the résumé calls the career section Experience');

  // Every résumé link on the public pages downloads the same file, a PDF, and is counted.
  const links = PUBLIC_PAGES.flatMap((file) => page(file).querySelectorAll('a[href]')
    .filter((a) => /Resume\.pdf$/.test(a.href)).map((a) => ({ file, a })));
  assert.ok(links.length >= 3, 'the hero, the career section and How I work link the résumé');
  for (const { file, a } of links) {
    assert.equal(target(file, a.href), 'assets/Shayan_Zafar_Ahmad_Resume.pdf', `${file}: ${a.href}`);
    assert.ok(a.hasAttribute('download'), `${file}: the résumé link downloads`);
    assert.equal(a.getAttribute('data-goatcounter-click'), 'resume-pdf');
  }
  assert.equal(readFileSync(join(ROOT, 'assets/Shayan_Zafar_Ahmad_Resume.pdf')).subarray(0, 5).toString(), '%PDF-');
});

const CAL = 'https://cal.com/shayan-zafar-ahmad/intro-call';
const EMAIL = 'mailto:shayan.zafar.ahmad@gmail.com';
const LINKEDIN = 'https://www.linkedin.com/in/shayan-zafar-ahmad-85351023/';

test('every intro-call, email and LinkedIn link on the public pages goes to one address and one click event', () => {
  const links = PUBLIC_PAGES.flatMap((file) => page(file).querySelectorAll('a[href]').map((a) => ({ file, a })));
  const kinds = [
    { name: 'intro call', test: (h) => h.includes('cal.com'), href: CAL, event: 'request-intro-call' },
    { name: 'email', test: (h) => h.startsWith('mailto:'), href: EMAIL, event: 'email' },
    { name: 'LinkedIn', test: (h) => h.includes('linkedin.com/in/'), href: LINKEDIN, event: 'linkedin' },
  ];
  for (const { name, test: isKind, href, event } of kinds) {
    const found = links.filter(({ a }) => isKind(a.href));
    for (const { file, a } of found) {
      assert.equal(a.href, href, `${file}: ${name} link`);
      if (a.target === '_blank') assert.match(a.rel, /noopener/, `${file}: ${name} opens safely in a new tab`);
      // Links meant to be clicked are counted; the plain-text contact line printed on the résumé is not a button.
      if (a.hasAttribute('data-goatcounter-click')) assert.equal(a.getAttribute('data-goatcounter-click'), event, `${file}: ${name} event`);
    }
    const counted = found.filter(({ a }) => a.getAttribute('data-goatcounter-click') === event);
    assert.ok(counted.length >= 2, `${name}: counted links on the pages`);
  }
  // "Request an intro call" is in three places: the hero, the contact panel and How I work.
  const calls = links.filter(({ a }) => a.href === CAL);
  assert.deepEqual(calls.map(({ file }) => file), ['index.html', 'index.html', 'how-i-work/index.html']);
  for (const { a } of calls) assert.match(textOf(a), /Request an intro call/);
  const home = page('index.html');
  assert.ok(home.querySelector('.hero').querySelectorAll('a').some((a) => a.href === CAL), 'the hero has the intro call');
  assert.ok(home.getElementById('contact').querySelectorAll('a').some((a) => a.href === CAL), 'the contact panel has the intro call');
});

test('the 404 page counts the missing address, works at any path and leads back home', () => {
  const html = read('404.html');
  const doc = parseHTML(html);
  const scripts = doc.querySelector('head').querySelectorAll('script');
  const config = scripts.findIndex((s) => s.textContent.includes('window.goatcounter'));
  const counter = scripts.findIndex((s) => s.hasAttribute('data-goatcounter'));
  assert.ok(config >= 0 && counter > config, 'the 404 path is set before GoatCounter loads');
  assert.equal(scripts[counter].getAttribute('data-goatcounter'), 'https://shayanzafar.goatcounter.com/count');
  assert.equal(scripts[counter].src, 'https://gc.zgo.at/count.js');

  const { window } = runScript(inlineScripts(html).find((c) => c.includes('goatcounter')), html, { location: { pathname: '/talks/2024/' } });
  assert.equal(window.goatcounter.path(), '404: /talks/2024/');

  // GitHub Pages serves this page at whatever address was missing, so every local address must start at the root.
  for (const el of doc.querySelectorAll('[href], [src]')) {
    const ref = el.getAttribute('href') ?? el.getAttribute('src');
    if (/^(https?:|mailto:)/.test(ref)) continue;
    assert.match(ref, /^\//, `${el.localName} ${ref} works from any path`);
    assert.ok(existsSync(join(ROOT, target('404.html', ref))), `${ref} exists`);
  }
  assert.equal(textOf(doc.querySelector('h1')), 'Page not found');
  assert.equal(doc.querySelector('main a').href, '/');
});

test('/admin/ stays unlisted, links to the dashboard and the switch, and lists every click event the pages send', () => {
  const admin = page('admin/index.html');
  assert.match(admin.querySelector('meta[name="robots"]').getAttribute('content'), /noindex/);
  assert.equal(admin.querySelectorAll('script[data-goatcounter]').length, 0, '/admin/ is never counted');
  for (const file of PAGES) {
    for (const a of page(file).querySelectorAll('a[href]')) {
      if (file !== 'admin/index.html') assert.notEqual(target(file, a.href), 'admin/index.html', `${file} must not link to /admin/`);
    }
  }
  const links = admin.querySelectorAll('a[href]');
  assert.ok(links.some((a) => a.href === 'https://shayanzafar.goatcounter.com/' && /dashboard/i.test(textOf(a))), 'links to the dashboard');
  const toggle = admin.querySelector('[data-gc-toggle]');
  // The switch must open the live site, where count.js reads #toggle-goatcounter for that site's storage.
  assert.equal(toggle.href, 'https://shayanzafar.github.io/#toggle-goatcounter');
  assert.equal(target('admin/index.html', toggle.href), 'index.html');
  assert.equal(page('index.html').querySelectorAll('script[data-goatcounter]').length, 1, 'the page it opens loads GoatCounter');

  const listed = admin.querySelectorAll('dt code').map(textOf).sort();
  const sent = [...new Set(PUBLIC_PAGES.flatMap((file) => page(file).querySelectorAll('[data-goatcounter-click]')
    .map((el) => el.getAttribute('data-goatcounter-click'))))].sort();
  assert.deepEqual(listed, sent, 'the "What\'s counted" list matches the click events the pages send');
});
