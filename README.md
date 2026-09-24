# BimaSetu CRM — clickable prototype

The sales and relationship-management interface for BimaKavach, as a working
prototype. Nothing here is a mock-up: every button writes to a shared record
held in the browser, and every screen is re-derived from it.

**Every company, person, PAN, GSTIN, premium, quote and insurer reply in this
prototype is invented.** There is no real customer data in this repository.

---

## Running it

The prototype is one self-contained HTML page with no runtime dependencies.

```bash
node build.mjs          # -> public/index.html
open public/index.html  # or just double-click it
```

That is the whole build. There is no bundler, no framework and no install step.

### Tests

```bash
npm install                        # playwright, for the tests only
npx playwright install chromium
npm test                           # build, then ~30 clickable assertions
npm run shots                      # build, then 27 screenshots into shots/
```

`npm test` drives the real page in a real browser: it signs in as each role,
takes a product line from first contact to payment, verifies a renewal, opens
documents, and checks that nothing throws. Two `ERR_TUNNEL_CONNECTION_FAILED`
console lines are expected — that is the Google Fonts request failing in the
sandbox, and it is harmless. The line `ERRORS` at the end is a section label,
not a failure; look for lines beginning `FAIL`.

---

## How the code is arranged

```
app/            the source — one stylesheet fragment, twenty-two JS modules
build.mjs       concatenates app/ into public/index.html
public/         the built page (committed, and rebuilt on every deploy)
tests/          smoke.js (assertions) and shots.js (screenshots)
docs/           the changelog, and what every version changed and why
vercel.json     the deploy configuration
```

Modules are concatenated **in filename order**, so the number prefix is the
dependency order. Everything shares one scope — there are no imports.

| Module | What lives in it |
|---|---|
| `01-css.html` | The design tokens, the type scale and every style |
| `02-core.js` | Icons, formatting, the fixed clock, state, the router, modals |
| `03-data.js` | The seed: users, accounts, opportunities, lines, policies, rules |
| `04-derive.js` | Everything computed rather than stored — stage, next action, search |
| `05-shell.js` | The sidebar, the view switch, the top bar |
| `06-home.js` | The home screens and the task rows |
| `07-line.js` | The product line workspace, and most of the selling flows |
| `08`–`13` | Opportunity, account, create-opportunity, team, service, tickets |
| `14-rules.js` | The task-rule engine, the builder and the simulator |
| `15-post.js` | The post-purchase ticket, the RM's work, the manager views |
| `16-rfq.js` | The RFQ, and the client's own link |
| `17-qcr.js` | The quote comparison report and its viewer |
| `18-pay.js` | Payment requests, payment details and proof |
| `19-renew.js` | Renewals |
| `20-policy.js` | Policy 360 and the policy record |
| `21-ctc.js` | Click to call |
| `22-docs.js` | The document viewer — view and download, every document type |
| `99-boot.js` | Boot |

### Conventions

- **Derive, never store,** anything two places could disagree about.
- **Amber dashed** buttons simulate an inbound event — a client, an insurer,
  placement or Ops acting outside the CRM.
- **Dotted grey** buttons are prototype time controls.
- One primary action per screen, and it is the screen's own.
- A decision taken with the business is marked `[stated <date>]` in a comment
  next to the code it governs. A guess is marked `[proposed]` or `[open]`.

### State

Everything is remembered in the browser under `localStorage`, key
`bksales.v12`. **Reset** in the sidebar returns to the seed. The clock is fixed
at Mon 21 Sep 2026, 11:00 and only moves through *Prototype controls* or the
rule simulator; when it moves, every scheduled rule check between then and the
target runs.

---

## Deploying

Vercel builds and deploys this repository on every push to `main`. The
configuration is in `vercel.json`:

- `buildCommand` — `node build.mjs`
- `outputDirectory` — `public`
- no install step, because there are no runtime dependencies

So editing a module in `app/` is enough; the deployed page is rebuilt from it.
`public/index.html` is committed too, so the repository is usable without a
build, but Vercel always rebuilds rather than serving the committed copy.

Every response carries `X-Robots-Tag: noindex, nofollow`, and the page carries
the same as a meta tag, so the prototype does not turn up in search results.

### First-time setup

1. Push this repository to GitHub.
2. In Vercel: **Add New → Project → Import Git Repository**, pick the
   repository, and deploy. The settings in `vercel.json` are picked up
   automatically — leave the framework preset as **Other**.
3. That is all. Vercel installs its GitHub App during the import, and from then
   on every push to `main` redeploys, and every pull request gets its own
   preview URL.

---

## Where the thinking lives

`docs/changelog.md` is the record of what each version changed and why, with
the business decision behind it. The specifications it implements live in the
RM Interface project, not in this repository.
