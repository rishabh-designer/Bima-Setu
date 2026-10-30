# BimaSetu CRM — clickable prototype

The sales and relationship-management interface for BimaKavach, as a working
prototype. Nothing here is a mock-up: every button writes to a shared record
held in the browser, and every screen is re-derived from it.

**Every company, person, PAN, GSTIN, premium, quote and insurer reply in this
prototype is invented.** There is no real customer data in this repository.

**The deployed link is the investor demo (v76).** It starts with a cast of seven,
an empty book and two prospects to walk live — Sharma Industries (Workmen's
Compensation, DUA) and Northgate Systems (Cyber Liability, Non-DUA) — with a
*Fill sample data* button on every form and the exception simulators hidden.
The full prototype, with nine people and its sample records, is the same code
without the two `*-investor-demo*.js` modules: `node build.mjs --full`.

---

## Running it

The prototype is one self-contained HTML page with no runtime dependencies.

```bash
node build.mjs          # -> public/index.html  (the investor demo, as deployed)
node build.mjs --full   # -> tests/full.html    (the full prototype)
open public/index.html  # or just double-click it
```

That is the whole build. There is no bundler, no framework and no install step.

### Tests

```bash
npm install                        # playwright, for the tests only
npx playwright install chromium
npm test                           # build both pages, then both clickable suites
npm run shots                      # build, then 27 screenshots of the full prototype into shots/
```

There are two suites. `tests/demo.js` drives the deployed page, the investor
demo: it takes both prospects from Arjun's first call through the hand-off and
Nikhil's selling to an issued policy (Sharma's WC through Cholamandalam's instant
link, Northgate's Cyber through the RFQ, placement and the Ops payment ticket),
fills every typed pop-up with *Fill sample data*, checks that the exception
simulators stay hidden and that Priya is allocated by the RM rule, then walks
every screen for the seven and checks Reset.

`tests/smoke.js` drives the full prototype (`tests/full.html`). It signs in as each person,
takes the Workmen's Compensation line through Cholamandalam's real-time
issuance (and the assisted and provisional-account variants), takes the Cyber
line through its band-chosen RFQ to placement, pays two same-insurer
opportunities on one request, holds an unverified account at KYC Details
Requested until KYC clears, hands an ABM prospect off to Sales, checks
website-lead placement and priority, the Won filter, the Admin console and
masters, and the repo fixes, walks every screen and tab for all nine people, and
fails on any `FAIL` line or any browser console error. Without network access the Google Fonts request
fails and logs two console errors, so the run ends `ERRORS` and exits 1 even
when nothing else is wrong — check for lines beginning `FAIL`. CI has network
access, so it sees neither.

---

## How the code is arranged

```
app/            the source — one stylesheet fragment, fifty JS modules, repo fixes
build.mjs       concatenates app/ into public/index.html (or, with --full, tests/full.html)
public/         the built page (committed, and rebuilt on every deploy)
tests/          demo.js and smoke.js (assertions), shots.js (screenshots)
docs/           the changelog, and what every version changed and why
vercel.json     the deploy configuration
```

Modules are concatenated **in filename order**, so the filename — number prefix
first — is the dependency order. Everything shares one scope — there are no imports.

| Module | What lives in it |
|---|---|
| `01-css.html` | The design tokens, the type scale and every style |
| `02-core.js` | Icons, formatting, the fixed clock, state, the router, modals |
| `03-data.js` | The seed: users, accounts, opportunities, lines, policies, rules |
| `04-derive.js` | Everything computed rather than stored — stage, next action, search |
| `05-shell.js` | The sidebar, the view switch, the top bar |
| `06-home.js` | The home screens and the task rows |
| `07-line.js` | The product line workspace, and most of the selling flows |
| `07-verify.js` | Verifying a provisional account — PAN/GST (or Aadhaar) upload and OCR |
| `08`–`10` | Opportunity, account, create-opportunity |
| `10-web-inbound.js` | Inbound website and embedded enquiries, and how they attach to an account |
| `11`–`13` | Team, service, tickets |
| `14-rules.js` | The task-rule engine, the builder and the simulator |
| `15-post.js` | The post-purchase ticket, the RM's work, the manager views |
| `16-rfq.js` | The RFQ, and the client's own link |
| `17-qcr.js` | The quote comparison report and its viewer |
| `18-pay.js` | Payment requests, payment details and proof |
| `19-renew.js` | Renewals |
| `20-policy.js` | Policy 360 and the policy record |
| `21-ctc.js` | Click to call |
| `22-docs.js` | The document viewer — view and download, every document type |
| `23-helpers.js` | Shared helpers — panel states, activity kinds, renewal and lead priority |
| `24`–`33` | v74 — payment and issuance tickets, instant link vs Ops ticket, call tasks, website drop-off, quotes decide the route, addresses, simulated events, seed |
| `34`–`35` | Raise ticket (endorsements and claims only), fallback users, payment details emailed to the client automatically, and the Overview's *Payment details* block (the ABM shared helpers begin at the end of `35-payment-overview.js`) |
| `36`–`41` | ABM pre-sales — prospect calls and email, tasks, the glue into BimaSetu, configurator stages, the ABM pool and team |
| `42-rm-allocation.js` | RM allocation master — editable, live at Payment Completed |
| `43-users-master.js` | Users master and reporting lines |
| `44-customer-type.js` | Customer type at creation — sole proprietor? has GST? — which decides GSTIN or Aadhaar and the KYC documents |
| `45-investor-demo.js` | v76 investor demo — the cast of seven, the two prospects, what the hand-off pre-fills, routing to Nikhil and Priya (left out by `--full`) |
| `46-investor-demo-fill.js` | v76 investor demo — *Fill sample data* on every form, the hidden exception simulators, the Cyber QCR's cover terms (left out by `--full`) |
| `99-boot.js` | Boot |
| `repo-fixes.css`, `repo-fixes.js` | Fixes applied on top of the prototype — see *Repo fixes* below |

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
`bksales.v26` (v76 moved it from `bksales.v25`, so anyone who opened the link
before starts fresh). **Reset** in the sidebar returns to the seed — on the
deployed page, the demo's two prospects. The clock is fixed
at Mon 21 Sep 2026, 11:00 and only moves through *Prototype controls* or the
rule simulator; when it moves, every scheduled rule check between then and the
target runs.

### Repo fixes

`app/01-css.html` and the numbered modules are ported from the prototype artifact
and kept identical to it. Bugs found while porting are fixed in two files a port
never overwrites: `build.mjs` adds `app/repo-fixes.css` after the stylesheet and
`app/repo-fixes.js` after the modules.

- **Compliance buttons clipped** (v64 onward). Below about 1400px the PAN row's
  verification line stretched Account 360 past the panel, hiding View and
  Download. `repo-fixes.css` lets the line wrap.
- **Admin could not open renewals** (v73 onward). Admin's lists are company-wide,
  but `canSeeLine()` refuses a renewal to anyone who is not an RM. `repo-fixes.js`
  lets Admin open them; every other role keeps the prototype's own check. (v73
  also refused Admin every account; the prototype fixed that part in v75.)

After each port, check whether the prototype now carries a fix and delete it
here if so. The smoke tests cover both, and the demo walk-through checks the
Compliance buttons too.

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
