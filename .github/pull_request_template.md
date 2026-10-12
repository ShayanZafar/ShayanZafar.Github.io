<!-- Keep it short. The reviewer (human or Claude) reads this first. -->

## What changed and why

<!-- One or two sentences. -->

## How it was checked

- [ ] `node scripts/check-site.mjs` passes (with `--external` if a link was added or changed), and `node --test` if `scripts/` or `tests/` changed
- [ ] A visible change was previewed in light and dark, at phone width, and in print preview if it touches the résumé
- [ ] A changed or new core flow has unit, integration and UI tests named in docs/core-flows.md
- [ ] `README.md` still matches the site (new file, page, rule or click event added to its tables)
- [ ] `/code-review` was run and its findings were addressed
- [ ] No unrelated changes are mixed in
- [ ] Debt found outside this change and decisions it needs are filed as issues (labels `debt`, `decision`); decisions it made are in `docs/decisions.md`

## Anything the reviewer should look at closely

<!-- A risky spot, a judgment call, a part you're unsure about. "Nothing" is a fine answer. -->
