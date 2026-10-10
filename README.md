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
| `assets/js/main.js` | Small enhancements: auto-updating "years of experience", career highlight toggles, active nav link, live GitHub commits and repo list |
| `assets/img/shayan-zafar-ahmad.jpg` | Portrait used in the hero (600×600, face-centred crop, metadata stripped) |
| `assets/img/projects/` | ThirteenF screenshots (light and dark), cropped from the ThirteenF repo's `design/screens/png/` |
| `assets/img/og-image.png` | Link-preview image shown when the URL is shared on LinkedIn, Slack, etc. (1200×627) |
| `assets/Shayan_Zafar_Ahmad_Resume.pdf` | Downloadable résumé, rebuilt from the page's print layout on every deploy |
| `scripts/check-site.mjs` | Site checks (links, structure, copy and privacy rules), run locally and on every push |
| `.github/workflows/site.yml` | Checks every change, rebuilds the résumé PDF, and deploys only when the checks pass |
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

**Live GitHub activity:** the Projects section lists ThirteenF's latest commits. `main.js` fetches them from the public
GitHub API in each visitor's browser (`data-gh-commits="owner/repo"`), skipping merge commits. The commits written
into `index.html` are a fallback snapshot, shown if the API is slow, blocked or rate-limited, so refresh them
occasionally. To feature another repo, copy the project card and change the `data-gh-*` attributes.

**New repos appear automatically:** under Projects, "More on GitHub" lists your own public repos, fetched live, so a
new repo shows up on the next page load after you push to it. The rules:

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

## Checks and deployment

Every push to `master` runs the **Site** workflow (`.github/workflows/site.yml`):

1. **Checks** (`scripts/check-site.mjs`): every local link, image and anchor resolves; one `<h1>` per page; no
   duplicate ids; images have alt text; new-tab links are safe; `?v=` asset versions match across pages; and the
   site's own rules: no phone number or postal code, and no casual or placeholder wording. Visit statistics: every
   public page loads GoatCounter once and shows the footer notice, click events are named consistently, and
   `/admin/` stays unlisted (no GoatCounter, `noindex`, and no page links to it).
2. **Résumé PDF:** rebuilt from the page's print layout with headless Chrome, then verified: the name, section
   headings, dates and "T-SQL" must survive in the text layer, there must be no phone number, and it warns if the
   PDF runs past 2 pages.
3. **Deploy:** publishes to GitHub Pages only if the checks pass.

External links are checked on every push and every Monday. A broken one fails the run, and GitHub emails you, but it
doesn't block the deploy.

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
