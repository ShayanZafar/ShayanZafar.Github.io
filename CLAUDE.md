# shayanzafar.github.io

Shayan Zafar Ahmad's personal site, live at https://shayanzafar.github.io/. A static site with no build
step and no dependencies: HTML, one stylesheet and a little JavaScript, served as they are by GitHub Pages.
`README.md` is the full guide (what each file is for, how editing, visit statistics and deployment work);
read it before changing anything.

Instructions for Claude are this file (at most 600 words, checked by `scripts/check-site.mjs`) and
`.claude/rules/` (one area each, loaded only when Claude touches a file its `paths` match); everything else is
documentation, read when needed.

## Where things are

- `index.html`: all the home page's content. `how-i-work/index.html`: the long-form page. `404.html`.
- `admin/index.html`: an unlisted page for the owner (GoatCounter dashboard link, the switch that stops
  counting their own visits).
- `assets/css/styles.css`: every style, including dark mode and the print layout the résumé PDF is made from.
- `assets/js/main.js`: small enhancements (years of experience, GitHub commits and repo list, shown from the
  snapshot `assets/data/github.json` the Site workflow writes on each deploy; GitHub's API only when it's stale).
- `scripts/check-site.mjs`: the site's checks. `.github/workflows/site.yml`: runs them, rebuilds the résumé
  PDF from the print layout and deploys only when they pass.
- `docs/decisions.md`: decisions made, one line each (date, decision, why, issue). Pending decisions and debt are GitHub issues labelled `decision` and `debt`; the `backlog` skill files and closes them. Not deployed.
- `docs/core-flows.md`: the core flows a visitor or the owner relies on, each with its unit, integration and UI
  tests (`—` marks a gap) and the `Gaps allowed` count; `scripts/check-site.mjs` checks it. Not deployed.

## Rules

- No build step, framework or npm package. What's in the repo is what gets served.
- No phone number or postal code anywhere public, including the PDF. Copy stays professional, with no
  placeholders; the banned phrases are in `scripts/check-site.mjs`.
- When `styles.css` or `main.js` changes, bump the `?v=` date on their links in every page, together.
- Never commit secrets or personal contact details beyond what the page already shows.

## Definition of done

- `node scripts/check-site.mjs` passes. Show its last line in your summary. Add `--external` when you
  added or changed an external link.
- For a visible change, preview it (`python3 -m http.server 4173`, then http://localhost:4173) in light
  and dark, and at phone width.
- Every core flow in `docs/core-flows.md` names a test at each level: unit (one module, no network; Node's
  built-in `node:test`, no package), integration (several parts together, outside services played by stand-ins)
  and UI (Playwright driving the running site, run with `npx` in CI only). Tests and their tools never go in the
  served files. A changed or new flow comes with its tests; `Gaps allowed` only goes down.
- `README.md` matches the site: a new file, page, rule or click event goes in its tables and lists.
- A new site rule goes into `scripts/check-site.mjs` too, so it is checked rather than remembered.
- Never loosen or remove a check in `scripts/check-site.mjs` or `site.yml` without asking the user first.

## Commands

- `node scripts/check-site.mjs`: structure, links between pages, copy and privacy rules, the core-flows map,
  what isn't deployed and the instruction files (what CI runs).
  `--external` adds every external link; `--external-only` checks only those.
- `node --test`: the unit tests in `tests/unit/` (CI runs them too).
- `scripts/preview.cmd` (Windows), `scripts/preview.command` (macOS) or `scripts/preview.sh` (Linux): local preview at http://localhost:4173, the same as `python3 -m http.server 4173` (on Windows `py -3 -m http.server 4173`).
