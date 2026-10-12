# shayanzafar.github.io

Personal website of **Shayan Zafar Ahmad**, Senior Software Engineering Manager, live at
**https://shayanzafar.github.io/**.

A fast, dependency-free static site (HTML, CSS, and a little JavaScript) hosted free on GitHub Pages.
No build step: what's in this repo is exactly what gets served.

It's meant to complement LinkedIn, not repeat it: how I lead, what I build (pulled from GitHub), and a compact
career summary. The full résumé lives in the downloadable PDF.

## What's here

| Path | Purpose |
| --- | --- |
| `index.html` | All page content: about and *Now*, how I lead, career, projects, contact. Skills and education are print-only (they appear in the PDF) |
| `how-i-work/index.html` | "How I work": long-form engineering and management style, each point backed by an example (served at `/how-i-work/`) |
| `assets/css/styles.css` | Styles, including automatic dark mode and the print/PDF résumé layout |
| `assets/js/main.js` | Small enhancements: auto-updating "years of experience", career highlight toggles, active nav link, GitHub commits and repo list (from the deploy's snapshot, or GitHub's API when that's stale) |
| `assets/data/github.json` | Snapshot of the GitHub commits and repos shown under Projects, written by the Site workflow on every deploy and never committed (git-ignored); `main.js` calls GitHub's API only when it's over 12 hours old or missing |
| `assets/img/shayan-zafar-ahmad.jpg` | Portrait used in the hero (600×600, face-centred crop, metadata stripped) |
| `assets/img/projects/` | ThirteenF screenshots (light and dark), cropped from the ThirteenF repo's `design/screens/png/` |
| `assets/img/og-image.png` | Link-preview image shown when the URL is shared on LinkedIn, Slack, etc. (1200×627) |
| `assets/Shayan_Zafar_Ahmad_Resume.pdf` | Downloadable résumé, rebuilt from the page's print layout on every deploy |
| `CLAUDE.md` | Rules and the definition of done for Claude Code sessions working on the site (not deployed) |
| `scripts/preview.cmd`, `scripts/preview.command`, `scripts/preview.sh` | Double-click (Windows, macOS) or run (Linux) to preview the site at http://localhost:4173 (not deployed) |
| `scripts/check-site.mjs` | Site checks (links, structure, copy and privacy rules, the GitHub snapshot, the core-flows map), run locally and on every push |
| `docs/core-flows.md` | The core flows a visitor or you rely on, each with the unit, integration and UI tests that cover it, and how many gaps are still allowed (not deployed) |
| `docs/decisions.md` | Decisions you made, one line each (date, decision, why, issue); pending decisions and debt are GitHub issues labelled `decision` and `debt` (not deployed) |
| `.github/ISSUE_TEMPLATE/` | The forms for a new `debt` or `decision` issue |
| `.github/workflows/site.yml` | Checks every change, snapshots the GitHub activity, rebuilds the résumé PDF, and deploys only when the checks pass; redeploys daily to keep the snapshot fresh |
| `.github/workflows/claude-code-review.yml` | Claude reviews each pull request once and comments inline, on Sonnet 5.5 (a different model from the one that usually writes the code) |
| `.github/workflows/codeql.yml` | CodeQL scans the JavaScript for security problems on every push and weekly |
| `.github/dependabot.yml` | Monthly update pull requests for the GitHub Actions the workflows use |
| `.github/pull_request_template.md` | The checklist every pull request starts from |
| `.claude/skills/verify/SKILL.md` | The `verify` skill: Claude runs `scripts/check-site.mjs` before each commit (not deployed) |
| `.claude/skills/backlog/SKILL.md` | The `backlog` skill: how Claude files, triages and works the `debt` and `decision` issues (not deployed) |
| `favicon.svg`, `apple-touch-icon.png` | Browser tab and home-screen icons |
| `404.html` | Custom "page not found" page; counts the missing address so broken inbound links show up in the statistics |
| `admin/index.html` | Unlisted "Site statistics" page for you: a link to the GoatCounter dashboard and the switch that stops counting your own visits (not linked from the site, `noindex`, never counted) |
| `.nojekyll` | Tells GitHub Pages to serve files as-is (skip Jekyll) |

## Editing

All content lives in `index.html`. The "14 years" / "7 years" figures update themselves each year via
`data-years-since="YYYY-MM"`, so they don't need manual edits.

The résumé PDF rebuilds itself on every deploy, so the download always matches the page.

**Booking link:** "Request an intro call" points to the Cal.com event `cal.com/shayan-zafar-ahmad/intro-call` (Google Meet, every booking needs your approval) in three places: the hero, the contact panel, and the How I work page.

**Now section:** update the two lines and the "Updated" month in the About section when your focus changes.

**GitHub activity:** the Projects section lists ThirteenF's latest commits (`data-gh-commits="owner/repo"`, merge
commits skipped) and your other repos (below). Each deploy writes a snapshot of both to `assets/data/github.json`, and
`main.js` shows it. It calls the public GitHub API from the visitor's browser only when the snapshot is over 12 hours
old or missing, so visitors seldom meet GitHub's limit of 60 anonymous requests an hour, and if that call fails, what's
on screen stays. A label beside each list says where it came from: "Synced 3 hours ago" for the snapshot, "Live" for
the API. The commits written into `index.html` are the last resort, shown without JavaScript or when neither the
snapshot nor the API answers, so refresh them occasionally. To feature another repo, copy the project card and change
the `data-gh-*` attributes; the next deploy adds it to the snapshot.

**New repos appear automatically:** under Projects, "More on GitHub" lists your own public repos, so a new repo shows
up within a day of your first push to it (the site redeploys daily), or sooner when this site is pushed. The rules:

- Forks and archived repos are never shown. Neither is anything in `data-gh-exclude` (this site, the featured
  ThirteenF card, and CImg, which is a copy of an open-source library).
- A repo appears if it was pushed to in the last 12 months (`data-gh-days`), up to six (`data-gh-max`).
- Add the GitHub topic `portfolio` to show an older repo, or `hide-from-site` to keep one off. Topics are under
  **About ⚙** on the repo's GitHub page.
- A repo's description, language, stars and homepage ("Live site") come straight from GitHub, so fill those in.

The section stays hidden while no repo qualifies. ThirteenF's "In active development" label switches to "Personal
project" automatically after 90 days without commits.

**Caching:** GitHub Pages lets browsers cache files for 10 minutes. When you change `styles.css` or `main.js`,
bump the `?v=` date on their links in every page so returning visitors don't get new HTML with old CSS. The checks
fail if the versions differ between pages.

## Visit statistics

Visits are counted with [GoatCounter](https://www.goatcounter.com/): anonymous and cookie-free, with a one-line notice
in each page's footer. The dashboard is at **https://shayanzafar.goatcounter.com** (sign-in required), and the unlisted
page **https://shayanzafar.github.io/admin/** links to it.

- **Page views:** the home page, How I work and the 404 page. A missing page is recorded as `404: /the-path`; open it
  in the dashboard to see which site linked to it.
- **Clicks**, listed in the dashboard as events: `request-intro-call` (hero, contact panel, How I work), `email`,
  `linkedin`, `github`, `resume-pdf` and `thirteenf-repo`. Each link carries `data-goatcounter-click` (the event name)
  and `data-goatcounter-title`. To count a new link, add both, reusing an existing name and title where it fits.
- **Tagged links:** add `?ref=name` to any page address, e.g. `https://shayanzafar.github.io/?ref=acme`. Visits through
  it are listed under Referrers as "acme". Add `&campaign=name` as well to group links in the Campaigns panel. No
  dashboard setting is needed.
- **Your own visits:** open `/admin/` and use "Stop counting this browser" once per browser and device (GoatCounter's
  `#toggle-goatcounter` switch; using it again turns counting back on). On a fixed IP address you can instead add it
  under Settings → Tracking → Ignore IPs in the dashboard.
- **Never counted:** local previews and the résumé PDF build, because GoatCounter ignores `localhost` and `127.0.0.1`.
  The checks fail if `allow_local` is ever turned on.

## Preview locally

```bash
py -3 -m http.server 4173
```

Then open http://localhost:4173.

The snapshot of GitHub activity is written only at deploy time, so a local preview gets the GitHub cards from the API.
To test the page with a snapshot, save one as `assets/data/github.json` (git-ignored); `check-site.mjs` checks its shape.

## Checks and deployment

The **Site** workflow (`.github/workflows/site.yml`) runs on every push to `master` and daily at 7:47 Toronto time
(EDT):

1. **Checks** (`scripts/check-site.mjs`): every local link, image and anchor resolves; one `<h1>` per page; no
   duplicate ids; images have alt text; new-tab links are safe; `?v=` asset versions match across pages; and the
   site's own rules: no phone number or postal code, and no casual or placeholder wording. Visit statistics: every
   public page loads GoatCounter once and shows the footer notice, click events are named consistently, and
   `/admin/` stays unlisted (no GoatCounter, `noindex`, and no page links to it). GitHub snapshot: `main.js` and the
   workflow use the same path, and a snapshot, when there is one, has the fields `main.js` reads, a list for every
   `data-gh-commits` repo, and no phone number or postal code. Core flows: every flow in `docs/core-flows.md` names
   a unit, an integration and a UI test (`file` › exact test title) or marks the gap with `—`; each named test must
   exist under that title, and the number of gaps must equal `Gaps allowed:`, which only ever goes down. Unit tests
   use Node's built-in test runner (`node:test`) and UI tests use Playwright, run with `npx` in CI only, so neither
   adds anything to the served files.
2. **GitHub snapshot:** fetches what the Projects section shows (the commits of each `data-gh-commits` repo and the
   repos of the `data-gh-repos` user, both read from `index.html`) with the workflow's own token, keeps only the
   fields `main.js` uses and writes `assets/data/github.json`. The checks then run again with it in place. If a fetch
   or a check fails, the run shows a warning and the site deploys without the file, so browsers call the API instead.
3. **Résumé PDF:** rebuilt from the page's print layout with headless Chrome, then verified: the name, section
   headings, dates and "T-SQL" must survive in the text layer, there must be no phone number, and it warns if the
   PDF runs past 2 pages.
4. **Deploy:** publishes to GitHub Pages only if the checks pass.

The daily run keeps the snapshot under a day old without a push. GitHub turns off scheduled runs in a repo that has
had no pushes for 60 days; turn them back on under **Actions → Site → Enable workflow**. Until then the page falls
back to the API.

External links are checked on every push and every Monday (not on the daily run). A broken one fails the run, and
GitHub emails you, but it doesn't block the deploy.

Run the checks before pushing (add `--external` to include external links):

```bash
node scripts/check-site.mjs
```

**Setup:** GitHub Pages is set to deploy from **GitHub Actions** (Settings → Pages → Build and deployment → Source), so
this workflow is the only way the site is published. If that setting ever reverts to a branch, the workflow skips
deploying and leaves a notice on the run.

The PDF committed in the repo is only used for local preview. To refresh it locally, print the page from Chrome
(**Save as PDF**, Letter, margins *Default*, headers and footers off) or run:

```bash
"/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" --headless=new --no-pdf-header-footer --print-to-pdf=assets/Shayan_Zafar_Ahmad_Resume.pdf http://localhost:4173/
```

## Sharing on LinkedIn

LinkedIn caches link previews. After changing the title, description, or `og-image.png`, refresh the cache
with the [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/).
