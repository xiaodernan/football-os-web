# M1249 · Egress Doctor — evidence

## What shipped
- `scripts/egress-doctor.mjs` and `npm run doctor`: an offline, one-command report that checks exactly
  the three things that matter for the "Clash dependency" complaint:
  1. `127.0.0.1:7897` is free (no local proxy binding);
  2. no inherited proxy environment variables exist (direct egress);
  3. the dev server on `127.0.0.1:5199` answers HTTP 200.
- No model call, no secret, no network egress beyond localhost.

## Measured on this tree
- `npm run doctor` → **3/3 checks passed**, prints `Open: http://127.0.0.1:5199/`.
- No app bundle change; earlier gates remain: full battery 243/243 (5751/5751), E2E
  299 passed / 12 skipped / 0 failed.

## Honest caveat
- The two Clash Windows services still run with Automatic start type; stopping them requires
  administrator rights. They are not bound to 7897 and are not used by this app. The doctor reports
  the observable state, not the service list.
