// Unit tests for single parts of the pages, read from the files as they are served (no network): the print
// layout in styles.css that the résumé PDF is made from, and the home page's contact panel.
// Run with `node --test` from the repo root.

import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHTML, textOf } from '../support/mini-dom.mjs';
import { read } from '../support/browser.mjs';

const CSS = read('assets/css/styles.css').replace(/\/\*[\s\S]*?\*\//g, '');

/** The body of the block that starts at `opener` (e.g. "@media print"), braces balanced. */
const block = (css, opener, from = 0) => {
  const start = css.indexOf('{', css.indexOf(opener, from));
  let depth = 0;
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(start + 1, i);
  }
  throw new Error(`no block for ${opener}`);
};

/** The top-level rules of a stylesheet body, as { selectors, body }. Nested at-rules are kept whole. */
const rules = (css) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
  selectors: selectors.split(',').map((s) => s.trim()),
  body,
}));

test('the print layout is the résumé: letter pages, résumé sections only, and text the PDF can keep', () => {
  assert.match(CSS, /@media print/, 'styles.css has a print layout');
  const print = block(CSS, '@media print');
  assert.match(block(print, '@page'), /size:\s*letter/);

  // On screen, the résumé-only parts (summary, skills, education) are hidden; in print they come back.
  const screen = rules(CSS.slice(0, CSS.indexOf('@media print')));
  assert.ok(screen.some((r) => r.selectors.includes('.print-only') && /display:\s*none/.test(r.body)));
  const inPrint = rules(print);
  assert.ok(inPrint.some((r) => r.selectors.includes('.print-only') && /display:\s*revert/.test(r.body)));

  // What only makes sense on screen stays out of the PDF: navigation, buttons, the web-only sections, the contact panel.
  const hidden = inPrint.filter((r) => /display:\s*none\s*!important/.test(r.body)).flatMap((r) => r.selectors);
  for (const selector of ['.site-header', '.skip-link', '.hero__actions', '.hero__portrait', '#about', '#how-i-lead', '#projects',
    '.contact', '.site-footer', '.screen-only', '.more-toggle']) {
    assert.ok(hidden.includes(selector), `print hides ${selector}`);
  }

  // Ligatures and alternate figures off, so "T-SQL" and "Sep 2024" survive in the PDF's text layer.
  const all = inPrint.find((r) => r.selectors.includes('*'));
  assert.match(all?.body ?? '', /font-feature-settings:\s*"calt" 0, "liga" 0 !important/);
  assert.match(all?.body ?? '', /font-variant-numeric:\s*normal !important/);
});

const CAL = 'https://cal.com/shayan-zafar-ahmad/intro-call';
const EMAIL = 'mailto:shayan.zafar.ahmad@gmail.com';
const LINKEDIN = 'https://www.linkedin.com/in/shayan-zafar-ahmad-85351023/';

test('the contact panel offers an intro call, email and LinkedIn, each counted as a click', () => {
  const contact = parseHTML(read('index.html')).getElementById('contact');
  assert.ok(contact, 'the home page has a #contact panel');
  const links = contact.querySelectorAll('a[href]');
  const find = (href) => links.find((a) => a.href === href);

  const call = find(CAL);
  assert.ok(call, 'the panel links to the Cal.com intro call');
  assert.match(textOf(call), /Request an intro call/);
  assert.equal(call.target, '_blank');
  assert.match(call.rel, /noopener/);

  for (const [href, event] of [[CAL, 'request-intro-call'], [EMAIL, 'email'], [LINKEDIN, 'linkedin']]) {
    const link = find(href);
    assert.ok(link, `the panel links to ${href}`);
    assert.equal(link.getAttribute('data-goatcounter-click'), event);
    assert.ok(link.getAttribute('data-goatcounter-title'), `${event} has a title for the dashboard`);
    if (link.target === '_blank') assert.match(link.rel, /noopener/);
  }
});
