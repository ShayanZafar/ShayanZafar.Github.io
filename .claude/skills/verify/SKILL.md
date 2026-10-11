---
name: verify
description: Run the site's checks (structure, links between pages, copy and privacy rules) and report only failures. Claude runs this before each commit; type /verify to run it yourself.
---

Run the site's check script from the repo root, showing only the end of the output:

`node scripts/check-site.mjs 2>&1 | tail -30`

If the change added or changed an external link, run it again with `--external`. CI runs the same script on every push and pull request, and re-checks external links every Monday.

Report each failure with the file and the rule it broke; don't paste the full log. If everything passes, say so in one line, quoting the script's last line.

If a check fails because of the change being committed, fix it before committing. If it fails for an unrelated reason, say so and stop. Never loosen or remove a check in `scripts/check-site.mjs` or `.github/workflows/site.yml` to make it pass; ask first.
