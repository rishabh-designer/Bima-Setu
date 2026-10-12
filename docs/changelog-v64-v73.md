# BimaSetu CRM — Change Log v64 → v73

**Purpose:** everything that changed in the prototype between **v64** (your last ported baseline) and **v73** (current), written so you can port the changes into the React/Next.js Vercel build.

**Prototype artifact:** https://claude.ai/artifact/V4ADJNCJwuYxDHs5pUcAAz (same link across all versions; current = artifact Version 87)
**Current storage key:** `bksales.v20` (was `v16` at v64; bumped to `v17` at v65, to `v19` across the one-product merge (v67), and to `v20` at v73 — see the "Seed / demo-only" notes).

---

## How to read this

Each item is tagged so you know whether it's real product behaviour to build, or just prototype plumbing:

- **[PRODUCT]** — a real feature/behaviour to implement in the Vercel app.
- **[SEED/DEMO]** — prototype-only: demo data, simulate buttons, localStorage key bumps, persona plumbing. Port only the parts that map to how your real app seeds/authenticates; the behaviour itself is not a feature.

If you only port the **[PRODUCT]** items, you'll have the full functional delta from v64.

> **The one big structural change in this range is v73** — a new lifecycle stage is inserted mid-spine, so every stage number from the old stage 9 onward shifts up by one (14-stage spine → 15-stage spine). If your Vercel app keys any logic off hard-coded stage numbers, read the v73 section carefully. Everything else (v65–v72) layers on top without moving existing stages.

---

## Part 1 — Roll-up: product features to port (v65 → v73)

Grouped by area, this is the "what to build" list. Version-by-version detail follows in Part 2.

### A. Admin role — a company-wide super-user + the master-configuration hub — v65
A sixth login, **Admin**, that sees everything and configures the masters.
- **Company-wide views:** Pipeline, Opportunities, Accounts, Renewals, Tickets and Tasks all widen to the whole company for Admin (no team/book scoping).
- **Super-user, acts directly:** Admin can act on any open record with **no take-ownership step**; the read-only owner banner is suppressed. Admin actions are stamped **"Admin · <name>"** on the activity trail.
- **Admin console** (home): a company-wide stat row + two tile groups — "Everything, across every team" and "Master configuration".
- **Masters hub:** Task configurator (existing rules screen), Working calendar & checks, Lead assignment (read-only), Lead prioritisation (the P0–P3 table, read-only), and the **reference lists** (Products incl. the Contractual/never-renews flag, categories, Insurers, Source, Business type, Payment modes, Park reasons, Disqualification reasons, fallback sales user + fallback RM — read-only display).
- Other roles are **unchanged**: an executive is still self-scoped, a manager still team-scoped, and both still follow take-ownership.

### B. RM allocation master (read-only) in Admin — v66
A new **RM allocation** master screen under Admin › Masters — the **post-payment** RM-ownership logic (distinct from sales lead assignment).
- Bands → designation level (4×4: RM / SRM / AVP / VP against Active GWP, Net revenue, Insurance expense, EB expense); owner = a person at the highest matched designation covering the account's region (from the account's State); ties go round robin.
- Owner roster, a region × designation coverage grid (**13 empty cells flagged** as uncovered), and the state→region map.
- **Not wired to the live hand-off:** the ownership transfer at payment still uses the fixed/fallback RM. This is the documented logic only (§14 of the PRD still lists the live routing as out of scope).

### C. One product per opportunity — the merge — v67
The **opportunity is the unit of work**: one opportunity = one product, carrying its own stage, owner and status.
- The old separate **Opportunity (container) screen redirects to its product** — there is one **"Opportunities"** list, not an opportunity list plus a line list.
- **No "Add product line"** — a second product is a **new opportunity** on the same account.
- **Account-aware create:** "New opportunity" from an Account 360 pre-binds that account.
- The payment gate is re-scoped from the opportunity-container to the **account** (see D).
- *Model note:* internally the prototype still keeps `lines` with a 1:1 `opp` container id; the UI simply surfaces the line **as** the opportunity. In the Vercel app, model it as a single Opportunity entity (one product each) — there is no product-line child table.

### D. Multiple payment — pay several opportunities on one request — v68–v70
A **Multiple payment** control on the **Opportunities list** and the **Account 360 Opportunities tab**.
- Enabled only when that view holds **two or more eligible opportunities on one account**. Turning it on shows a checkbox beside each eligible opportunity; the **first one ticked fixes the account and the type**, after which opportunities on any other account — or of the other type — grey out. A bar shows the running count + total and raises one request.
- **The six-condition gate** (an opportunity can join a request only when all hold): (1) same account, (2) same owner, (3) same type (all Fresh or all Renewal), (4) stage = Purchase Requested, (5) account is KYC-verified, (6) not already on an open request.
- **One ticket, several opportunities:** one payment request maps to one BimaOps payment ticket (`PAY-…`) carrying the IDs of every opportunity it covers. When paid, the single proof is split and each opportunity moves to Payment Completed on its own.
- **Renewals too (v70):** several renewal opportunities on one account can be paid together (all-renewal request). A renewal and a fresh opportunity are **never** on the same request (the anchor key is account **+ type**).
- **Two owners, two requests:** because leads route by product, two salespeople can own eligible opportunities on one account; each raises their own request (condition 2) — accepted, not worked around. A single opportunity can still raise its own request from its screen.

### E. "Won" status + the seller's "Won" view — v71–v72
- **"Won"** is derived from the stage (not a status the user sets): once an opportunity reaches **Payment Completed** it shows **Won** (green) on its workspace and in lists, and keeps that through issuance. The opportunity workspace top bar reads **"Opportunity"**.
- At Payment Completed ownership moves to the RM, so a paid opportunity leaves the seller's book. v72 adds a **"Won" filter** on the Opportunities list that shows the opportunities the signed-in user **sold** (`soldBy === me`), even after the hand-over — so a seller keeps sight of their closed deals.

### F. KYC Details Requested — a new lifecycle stage — v73  **← spine renumber; read carefully**
A new stage, **KYC Details Requested**, is inserted **between Quote Sent (8) and Purchase Requested**. The spine goes from **14 to 15 stages**.
- **On confirming the buy (the client picks an insurer and agrees the premium):**
  - a **KYC-verified** account → **Purchase Requested** (now stage 10), exactly as before;
  - an **unverified** account → **KYC Details Requested** (stage 9), **waiting on the Client** for PAN and GST. Its next action is **Get verified** (the existing account-level KYC popup).
  - When KYC clears, **every** opportunity on that account sitting at KYC Details Requested **advances to Purchase Requested**.
- **Why:** it separates a **KYC drop-off** from a **payment drop-off** in the funnel — two things that previously both read as "Purchase Requested".
- **Standard path only:** the Cholamandalam real-time issuance path is **unchanged** — it runs KYC inline through the insurer's API and does **not** use this stage.
- **Stage 9 is skipped (hidden) on a verified account's track**, the same way DUA hides the RFQ stages — a verified account goes straight from Quote Sent (8) to Purchase Requested (10).
- **The renumber (old → new):** KYC Details Requested is new at **9**; Purchase Requested **9 → 10**; Payment Details Shared **10 → 11**; Payment Completed **11 → 12** (still the sales→RM hand-over and the "Won" line); Policy Documents Pending **12 → 13**; Awaiting Policy Copy **13 → 14**; Policy Copy Sent **14 → 15**. `SALES_STAGES` 11 → 12.
- Everything keyed to those numbers shifts with them: the post-purchase **stall thresholds**, the two stage-driven **task rules** (payment chase, document chase), the **Withdrawn** cut-off (now offered up to Payment Details Shared, stage 11), and the payment-eligibility / "waiting-on" derivations.

---

## Part 2 — Version-by-version detail

### v64 — baseline
Your last ported version (single-RM book; Rohan removed, Priya sole RM). Everything below is the delta from here.

---

### v65 — Admin login + console + master-configuration hub · [PRODUCT]
A new **Admin** login with a company-wide view and the master configurator. Layered on v64 — every v64 feature and screen preserved. **[SEED/DEMO]** storage key `v16` → `v17` (forces a re-seed so the Admin user appears).

**1 · Admin login + console**
- New user **Aditya Verma** (`role: 'admin'`) and a new sign-in persona card.
- Admin lands on a new **Admin console** (`adminhome`): a company-wide stat row (Accounts · Open lines · Renewals due · Open tickets · Open tasks) and two tile groups — **"Everything, across every team"** (Pipeline, Opportunities, Accounts, Renewals, Tickets, Tasks) and **"Master configuration."**
- Admin sidebar: Home · Pipeline · Opportunities · Accounts · Renewals · Tickets · Tasks · **Masters**.

**2 · Super-user (acts directly)**
- **Sees everything:** scope widens to every user for Admin — Pipeline, Opportunities, Accounts, Renewals, Tasks and Tickets are all company-wide.
- **Acts directly:** Admin can act on any open line with **no "take ownership" step**; the read-only owner banner is suppressed for Admin on a live line.
- **Attribution:** Admin actions are stamped **"Admin · <name>"** on the activity trail.
- Other roles unchanged (exec self-scoped, manager team-scoped, both still take-ownership).

**3 · Master configuration hub (`masters`)**
- **Configurable masters:** **Task configurator** (the existing rules screen + builder; the admin-only lock now admits Admin as well as managers) · **Working calendar & checks** (days, hours, holidays, check schedule) · **Lead assignment** (new screen — product-wise round-robin groups + a Logic 2 value-rule summary; **read-only**) · **Lead prioritisation** (new screen — the P0–P3 priority-by-drop-off-stage table, 15 funnel events; **read-only**).
- **Reference lists (read-only display):** Products (with the Contractual/never-renews flag + category), Product categories, Insurers, Source, Business type, Payment modes, Park reasons, Disqualification reasons, fallback sales user + fallback RM.

> **Next build (not in v65):** the inline Edit / +New drawers and the Test-a-lead / Test-priority tools; reference-list editing. Lead assignment and prioritisation are read-only here.

---

### v66 — RM allocation master in Admin (read-only) · [PRODUCT — master screen only]
Adds the **RM allocation** master to **Admin › Masters**, alongside Lead assignment and Lead prioritisation. It is the **post-payment** RM-ownership logic (separate from sales lead assignment). Layered on v65 — **no seed change, key stays `v17`.**

The screen (read-only) shows:
- **How the owner is decided** — each present parameter (payment GWP, net revenue, insurance expense, EB expense) maps to a designation band; the final designation is the **highest** among the parameters present; owner = a person at that designation covering the account's region (from the State on the account); ties at the same designation + region go **round robin**.
- **Bands → designation level** — the 4×4 table (RM / SRM / AVP / VP against Active GWP, Net revenue, Insurance expense, EB expense); a band edge falls into the next band.
- **Owner roster** — the eight business-sheet names with designation + region(s).
- **Coverage grid** (region × designation) — the **13 empty cells are flagged** (East, Central, North-east uncovered, plus West SRM); an account routed to an empty cell has no owner until the names are supplied.
- **State → region** — the six-region map (North, West, South, East, Central, Northeast).

> **Not in this build:** the live stage-driven ownership routing using this logic, the Designation/Region fields on the user record, the role→designation mapping, and capturing City/State + Probe42 expense on the account. The hand-off at payment still uses the fixed/fallback RM.

---

### v67 — one product per opportunity (the merge) · [PRODUCT]
Collapses the opportunity-container / product-line split into a single unit. **[SEED/DEMO]** storage key bumped (to `v18`→`v19` across this merge), and A-1004 Crestline / A-1005 Vantage demo accounts added for the multi-payment demo.

- **One product per opportunity.** An opportunity is a single product and carries its own stage, owner and status. (The seed was already 1:1, so the UI surfaces the product **as** the opportunity; internally a 1:1 `opp` container id is kept — not a literal table merge.)
- **One "Opportunities" list.** The old Opportunity (container) screen **redirects to its product**.
- **No "Add product line."** A second product on the same account is a **new opportunity**.
- **Account-aware create** from Account 360 (pre-binds the account).
- **Payment gate re-scoped to the account** (foundation for Multiple payment): same account + same owner + same type + stage Purchase Requested + KYC-verified + not already on a request.
- Breadcrumb/label scrub from "product line" → "opportunity" (a few deep strings still read "line").

> **Port note:** model the Opportunity as one product each — no product-line child entity. "Won / Part won / Empty" container roll-ups are gone with the container model.

---

### v68–v69 — "Multiple payment" mode · [PRODUCT]
A list-level control to pay several opportunities on one request. **[SEED/DEMO]** demo: A-1004 Crestline (Fire + Burglary) and A-1005 Vantage (Group Health + Marine), two eligible opportunities each.

- **Where:** a **Multiple payment** button on the Opportunities list header and the Account 360 Opportunities tab.
- **When enabled:** only when that view holds **2+ eligible opportunities on one account** that meet the gate.
- **The gate (all six):** (1) same account, (2) same owner, (3) same type (Fresh vs Renewal), (4) stage = Purchase Requested, (5) account KYC-verified, (6) not already on an open request.
- **Interaction:** turning it on shows a checkbox beside each eligible opportunity; the **first pick fixes the account and type**; opportunities on any other account or of the other type **grey out**. A sticky bar shows the running count + total and raises the request.
- **One ticket, several opportunities:** the request maps to **one** BimaOps payment ticket carrying all selected opportunity IDs. (A single opportunity can still raise its own request from its screen via "Combine with other opportunities".)

---

### v70 — renewals in Multiple payment · [PRODUCT]
Extends Multiple payment to **all-renewal** requests.
- Grouping and the anchor key are on **account + type**, so several **renewal** opportunities on one account can be selected and paid together.
- A **renewal and a fresh** opportunity are never combined on one request (different type → greyed out once the first pick fixes the type).

---

### v71 — "Won" status + workspace label · [PRODUCT]
- **"Won"** is **derived from the stage**, not set by the user: once an opportunity reaches **Payment Completed** it shows **Won** (green) on its workspace and in lists, and keeps that through issuance.
- The opportunity workspace **top bar reads "Opportunity"** (was "Product line").

---

### v72 — seller keeps sight of won deals · [PRODUCT]
- At Payment Completed ownership moves to the RM, so a paid opportunity leaves the seller's Opportunities list.
- v72 adds a **"Won" filter** (pill) on the Opportunities list that shows the opportunities the signed-in user **sold** (`soldBy === me`), **even after the hand-over** — demoed on the seeded post-purchase book (e.g. Nikhil's OP-2101, OP-2103).

---

### v73 — new "KYC Details Requested" stage (spine 14 → 15) · [PRODUCT]  **← stage renumber**
Inserts a new stage between **Quote Sent** and **Purchase Requested** so the funnel can tell a **KYC drop-off** apart from a **payment drop-off**. **[SEED/DEMO]** storage key `v19` → `v20` (seed stage numbers changed, so a returning user must re-seed); the demo multi-payment lines move to the new Purchase Requested number; the seeded issued lines move to the new Policy-Copy-Sent number.

**Behaviour (standard path):**
- When the client confirms the buy on **Quote Sent (8)**:
  - account **KYC-verified** → **Purchase Requested (10)** (unchanged behaviour);
  - account **not verified** → **KYC Details Requested (9)**, **waiting on the Client**; its next action is **Get verified** (the existing account-level KYC popup).
- When KYC clears (via that popup), **every** opportunity on the account at **KYC Details Requested** advances to **Purchase Requested**. From there the payment flow is exactly as before.
- **Stage 9 is hidden** on a verified account's stage track (skipped like the RFQ stages on a DUA line) — a verified account shows Quote Sent → Purchase Requested with no gap.
- **Cholamandalam real-time path is unchanged** — it bypasses stage 9 entirely (it does its own KYC inline via the insurer API). The confirm branch routes a Chola line straight to its real-time post-confirm stage, never to KYC Details Requested.

**The renumber (this is the porting work):**

| Stage | Old # | New # |
|---|---|---|
| Quote Sent | 8 | 8 |
| **KYC Details Requested** (new) | — | **9** |
| Purchase Requested | 9 | 10 |
| Payment Details Shared with Client | 10 | 11 |
| Payment Completed (ownership → RM; "Won") | 11 | **12** |
| Policy Documents Pending | 12 | 13 |
| Awaiting Policy Copy | 13 | 14 |
| Policy Copy Sent to Client (terminal) | 14 | 15 |

Everything keyed to those numbers shifts with them:
- **`SALES_STAGES` 11 → 12** (the sales→RM hand-over, and the derived "Won", are at Payment Completed = 12).
- **Post-purchase stall thresholds** shift: Payment Completed > 1, Policy Documents Pending > 5, Awaiting Policy Copy > 3 working days → now keyed to stages 12 / 13 / 14.
- **Task rules:** the payment-chase rule (fires at Payment Details Shared) and the document-chase rule TR-09 (fires at Policy Documents Pending) move to the new stage numbers (11 and 13).
- **Withdrawn** is offered up to **Payment Details Shared (stage 11)** (i.e. not after payment), up from the old stage 10.
- **"waiting on"** for the new stage is **Client**; payment eligibility / Multiple-payment eligibility are at **Purchase Requested (10)**.

> **Port note:** if your Vercel app stores stage as an **enum/name** rather than a raw integer, this is mostly: add the `KYC_DETAILS_REQUESTED` value in the right position, add the confirm-time branch (verified → Purchase Requested, unverified → KYC Details Requested), and add the "advance all KYC-waiting opportunities on the account when KYC clears" step. If you store stage as a **number**, every comparison against 9–14 must be re-mapped per the table above.

---

## Part 3 — Quick checklist for the Vercel port

**Must-build (product behaviour):**
- [ ] **Admin role** — company-wide views (pipeline, opportunities, accounts, renewals, tickets, tasks); super-user acts directly (no take-ownership), actions stamped "Admin · …"; Admin console; Masters hub with Task configurator, Working calendar, Lead assignment (read-only), Lead prioritisation (read-only), reference lists (read-only) (v65)
- [ ] **RM allocation master** screen under Admin › Masters (read-only): bands→designation, owner roster, coverage grid with empty-cell flags, state→region map — **logic display only, not wired to the live hand-off** (v66)
- [ ] **One product per opportunity** — Opportunity = one product; no product-line child; single Opportunities list; container screen redirects; account-aware create; payment gate scoped to the account (v67)
- [ ] **Multiple payment** — list + Account 360 control; enabled on 2+ eligible opportunities on one account; six-condition gate; first pick fixes account + type; one ticket carries all selected IDs (v68–v69)
- [ ] **Renewals in Multiple payment** — all-renewal requests; anchor on account + type; never mix fresh + renewal (v70)
- [ ] **"Won"** derived from Payment Completed; workspace reads "Opportunity" (v71)
- [ ] **Seller's "Won" view** — filter showing opportunities `soldBy === me` after hand-over (v72)
- [ ] **KYC Details Requested stage (v73)** — insert the stage between Quote Sent and Purchase Requested; confirm-time branch (verified → Purchase Requested, unverified → KYC Details Requested, waiting on Client); advance all KYC-waiting opportunities on the account when KYC clears; hide the stage on a verified track; **Chola real-time path bypasses it**; **re-map every stage number 9–14 → 10–15** (and `SALES_STAGES`, stall thresholds, the two stage-driven task rules, and the Withdrawn cut-off)

**Plumbing only (adapt, don't literally port):**
- Storage-key bumps `v16 → v17 → v19 → v20` → ensure records carry the new fields (admin user/role; `soldBy`; the new stage) and migrate/clear cached state so old stage numbers don't linger
- Seeded demo data (Admin persona; Crestline/Vantage multi-payment accounts; the RM post-purchase book) → your real data/auth
- Simulate buttons (client pays, link expiry, placement/Ops queries, KYC via sample docs) → real events/webhooks in production
- The 1:1 `opp` container kept internally in the prototype → model the Opportunity as a single entity in the Vercel app

---

*Source: prototype changelog / UI notes ui/38 (v65), ui/40 (v66), ui/42 (v67–v72) in the "RM Interface" project, plus the v73 build (new KYC Details Requested stage). Prototype artifact Version 87, storage key `bksales.v20`. Companion PRD: `BimaSetu-CRM-PRD-v73.docx`.*
