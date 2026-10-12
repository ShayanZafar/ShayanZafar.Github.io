# Core flows

These are the flows a visitor or the owner relies on the site for, each with the tests that cover it at three levels: unit (one module, no network), integration (several parts together, outside services played by stand-ins) and UI (a real browser driving the running site). `scripts/check-site.mjs` checks this file: every named test must exist under that exact title, and `Gaps allowed` must equal the number of `—` cells, a number that only ever goes down.

Gaps allowed: 21

| Flow | Unit | Integration | UI |
|---|---|---|---|
| Read the home page: about and Now, how I lead, career and projects | — | — | — |
| See what Shayan is building: recent commits and repos on the project cards (the deploy's snapshot, live from GitHub when it's stale) | — | — | — |
| Download the résumé PDF (made from the page's print layout, 2 pages) | — | — | — |
| Read How I work | — | — | — |
| Request an intro call, or reach Shayan by email or LinkedIn | — | — | — |
| Follow a broken link and get back to the site (the 404 page counts the missing address) | — | — | — |
| Owner: open the visit statistics and stop counting my own visits (/admin/) | — | — | — |
