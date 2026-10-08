# BimaSetu CRM — Change Log v47 → v64

**Purpose:** everything that changed in the prototype between **v47** (your last ported baseline) and **v64** (current), written so you can port the changes into the React/Next.js Vercel build.

**Prototype artifact:** https://claude.ai/artifact/V4ADJNCJwuYxDHs5pUcAAz (same link across all versions; current = artifact Version 77)
**Current storage key:** `bksales.v16` (bumped from `v14` → `v15` → `v16` across this range — see "Seed / demo-only" notes).

---

## How to read this

Each item is tagged so you know whether it's real product behaviour to build, or just prototype plumbing:

- **[PRODUCT]** — a real feature/behaviour to implement in the Vercel app.
- **[SEED/DEMO]** — prototype-only: demo data, simulate buttons, localStorage key bumps, persona plumbing. Port only the parts that map to how your real app seeds/authenticates; the behaviour itself is not a feature.

If you only port the **[PRODUCT]** items, you'll have the full functional delta from v47.

---

## Part 1 — Roll-up: product features to port (v48 → v64)

Grouped by area, this is the "what to build" list. Version-by-version detail follows in Part 2.

### A. Cholamandalam real-time WC issuance (new 4th flow) — v50–v55
A DUA Workmen's Compensation line where **Cholamandalam** is the selected insurer issues the policy in real time, with **no payment ticket, no post-purchase ticket, no QC**.
- Chola appears as a rater quote **on WC lines only**, tagged for instant issuance.
- Picking Chola branches the existing WC line onto the real-time path; picking any other insurer keeps the normal payment-ticket path.
- Path: confirm quote → **run KYC with Chola** → **generate / send payment link (24h validity)** → client pays (auto-detected) → **policy copy generated in real time** → RM shares copy → Issued.
- Stages 12 (Docs Pending) and 13 (Awaiting Policy Copy) are **hidden** on a Chola line.
- A guided **capture wizard** (Details → Risk → Company details → KYC) collects what Chola needs after the quote is confirmed.
- **Account-aware KYC:** verified account auto-fills PAN/GSTIN read-only; provisional account uploads PAN + GST (OCR), and that upload **also verifies the account**.
- Payment link: **Copy link** and **Send payment link** (emails the contact, logs activity, moves to stage 10); expired link → **Resend / Regenerate** a fresh 24h link.

### B. WC capture questions replaced — v51
The Workmen's Compensation requirement-capture set is **replaced** (not augmented) with six questions; **sum insured is derived** as annual wages = workers × monthly salary × 12. (See Part 2 · v51 for the exact field list.)

### C. Cyber capture + digitised band RFQ — v56
- Cyber "capture details" gains a defined question set (Part A).
- **Non-DUA Cyber** gets a **digitised RFQ form chosen by sum-insured band**: 0–2 Cr form and 2–10 Cr form (above-10 uses the 2–10 form for now).
- New **`multi`** RFQ field type: tick-all-that-apply chips.

### D. Placement "Answer the query" is a simulation — v57
In the Non-DUA placement flow, "Answer the query" is a **simulated inbound event** ("Placement raises a query"), **not** an action auto-present on every product line.

### E. Quote bifurcation tags (Instant vs Assisted) — v58–v59
- Quote table tags: **"Instant issuance"** (violet — Chola WC end-to-end) vs **"Assisted issuance"** (grey — standard rater quotes), shown **only where both coexist**.
- Same tags added to the **"Select quotes and send the QCR" picker**; the "SI … · valid 28 days" subtitle line was **removed** from each quote row in that picker.

### F. Line-screen restructure — v54
- **Requirement tab removed**; full requirement list now shows inline in **Overview** (always expanded).
- **Sold block** (insurer · premium · payment status) moved from RFQ & Quotes to **Overview**.
- Once a policy copy exists, **RFQ & Quotes tab is replaced by a Documents tab** (QCR, selected quote, PAN, GST, policy copy) — for any issued line.

### G. Post-purchase task rules dropped — v55
- **Welcome call (TR-08)** and **Policy-explanation call (TR-10)** removed across all products. A line at Payment Completed no longer offers "Welcome call"; a line at Policy Copy Sent reads **"Issued · steady state"**.
- Document-chase task (**TR-09**) is kept.

### H. "Switch person" → full selector — v60
Sidebar **"Switch person"** now goes straight to the full 5-card person selector (the compact modal is dropped). Data is preserved on switch.

### I. Website-lead prioritisation (P0–P3) — v62
- Website-sourced leads (not manually-created opportunities/lines) get a priority **P0–P3** derived from the funnel stage they dropped from (your exact mapping table).
- Priority badge shows on the homepage **"Newly assigned"** section and in the **pipeline list view**; both are **sorted by priority** (P0 → P3).
- Homepage sections keep their **empty states** (a section with nothing to show still renders, rather than disappearing).
- Badge colours: **P0 red, P1 amber, P2 violet, P3 grey**.

### J. Single-RM book — v64
**Rohan Desai removed** entirely (no user, no sign-in persona); his book reassigned to **Priya Nair**, now the sole RM.

### K. Platform baseline from v48 (if not already ported)
v48 was a large batch closing prototype-vs-Jira gaps across epics F1–F19. If your Vercel baseline is pre-v48, see Part 2 · v48 for the scope.

---

## Part 2 — Version-by-version detail

### v47 — baseline
Your last ported version. Everything below is the delta from here.

---

### v48 — Jira-gap batch (epics F1–F19) · [PRODUCT]
A large batch bringing the prototype in line with the Jira backlog across foundations F1–F19 (platform foundations, roles/permissions, tasks, tickets, opportunity/line rules, Account 360, etc.). This was breadth across the spec rather than one feature. **[SEED/DEMO]** storage key at `bksales.v14`.

> If your Vercel app already reflects the v48 spec batch, treat v48 as "no new delta" and start porting from v49. If not, reconcile against the feature breakdown docs in the project (the `18-prototype-v48` changelog enumerates it by epic).

---

### v49 — three demo flows + DAU→DUA rename + "New Lead" reset
- **[PRODUCT · terminology]** Renamed all display strings **DAU → DUA** (all ~55 occurrences) across the UI. Port this as a straight label rename.
- **[PRODUCT · copy]** "Reset" control relabelled **"New Lead"**.
- **[SEED/DEMO]** Seeded three demo lines (WC / Cyber / D&O) to exercise DUA, Non-DUA, and DUA→Non-DUA switch. Storage key `v14` → `v15`. Dead `postSeed()` dropped.

---

### v50 — Cholamandalam real-time WC issuance (4th flow) · [PRODUCT]
Adds the Chola real-time path on the existing WC line (OP-2001). **[SEED/DEMO]** key unchanged at `v15`.

Decisions baked in:
- 4th flow = **branch the existing WC line**, not a separate line. Picking Chola's quote → real-time path; any other insurer → normal payment-ticket path.
- Chola appears as a quote on **WC lines only** (added to the DUA rater set for WC; D&O and other DUA products unchanged).
- **Happy path only** (KYC succeeds, client pays, policy issues) — no KYC-failure / unpaid-link fallback modelled.
- **Both tickets gone, no QC:** no payment ticket, no post-purchase ticket; payment auto-detected on the link; policy copy auto-generated; RM just shares it.

Flow, step by step (on a WC/DUA line where Chola is confirmed):
1. **Run real-time KYC with Cholamandalam** (stage 9) — runs on Chola's API using PAN/GST on the account; on success Chola returns a live payment link (replaces the BimaOps payment ticket).
2. **Share the payment link** (stage 9 → 10) — RM sends Chola's link; line waits on the client (no screenshot, no confirm step).
3. **Client pays** (simulated inbound event, stage 10 → 11) — payment auto-confirmed; **policy copy generated in real time** (fully issued, insurer policy number set); ownership → RM; **no post-purchase ticket**.
4. **Share the policy copy** (stage 11 → 14) — RM sends copy + tax invoice; no QC; line Issued.

Stages 12 (Docs Pending) and 13 (Awaiting Policy Copy) are **skipped / hidden** on a Chola line. A Chola line derives **no ticket of any kind**.

---

### v51 — WC capture questions + Chola capture wizard + OCR KYC + 24h link · [PRODUCT]
**[SEED/DEMO]** key unchanged at `v15`.

**1. WC "capture details" questions — replace the WC requirement set (for every WC line):**

| Question | Type |
|---|---|
| Type of business | dropdown (Electric Cables makers & suppliers, auto components, textiles, chemicals, …) |
| Number of workers | number |
| Monthly salary of workers | number |
| Do you need medical expenses coverage? | Yes / No |
| Medical expenses amount | ₹10,000 / ₹25,000 / ₹50,000 / ₹1,00,000 — **shown only when coverage = Yes** |
| How long do you need this policy? | 3 Months / 6 Months / 1 Year |

- **Sum insured derived** = annual wages = workers × monthly salary × 12 (e.g. 10 × ₹5,000 × 12 = SI ₹6,00,000). Quotes and QCR show that. Old WC fields (existing policy, claims history, etc.) removed.

**2. Chola issuance: guided capture wizard (Back / Continue), four steps:**
1. **Details** — Are you a sole proprietor? → if Yes, Do you have a GST registration certificate? (Yes/No).
2. **Risk** — Type of worker (dropdown) + Risk location (All India Coverage / Specific Location → if Specific: risk address, state, city, pincode).
3. **Company details** — Address, Place of incorporation, Pincode, Area code, Incorporation date (prefilled from the account where possible).
4. **KYC** — upload PAN + GST certificate; OCR extracts PAN + GSTIN ("Use sample documents" fakes the OCR); KYC clears with Chola.

Then RM **generates the payment link** (`https://pay.cholamsgeneral.com/wc/…`) → stage 10. Link **valid 24 hours**. A simulate control ("24 hours pass — the payment link expires") lapses it; next action becomes **Regenerate payment link** (fresh 24h window). **[SEED/DEMO]** the expiry is a simulate button, not a real clock.

---

### v52 — account-aware Chola KYC step · [PRODUCT]
Makes the wizard's KYC step (step 4) depend on account type. **[SEED/DEMO]** key unchanged at `v15`.

| Account | KYC step behaviour |
|---|---|
| **Verified** (PAN + GST on file) | **Auto-fills** — PAN + GSTIN read-only, "already on file — KYC cleared with Cholamandalam", View/Download for on-file PAN card + GST certificate. No upload; Complete KYC enabled immediately. |
| **Provisional** (docs not on file) | **Upload + OCR** — upload PAN + GST; OCR reads the numbers. Completing the step **verifies the account** (records PAN/GST, marks verified) **and** clears Chola KYC in one go. |

- The earlier stage-9 "account not KYC verified — get verified first" block is **lifted for the Chola flow** (provisional account proceeds into the wizard; the upload there is its verification).
- KYC step **still appears** for verified accounts (auto-filled, read-only — not skipped).
- **[SEED/DEMO]** a "Make the WC account provisional" prototype toggle, since the WC demo account is verified by default.

---

### v53 — copy / send the Chola payment link · [PRODUCT]
Refines the "Generate payment link" step. **[SEED/DEMO]** key unchanged at `v15`.
- **Copy link** — button beside the link field ("Link copied" toast).
- **Send payment link** — primary action; **emails the link to the contact on the line** (`l.contact.e`), records an activity ("Payment link sent to …"), moves line to stage 10.
- A valid sent link → modal shows "Sent to … on …" and the action reads **Resend payment link**. An expired link → action reads **Send payment link** and regenerates a fresh 24h link on send.

---

### v54 — line-screen restructure (Overview, Documents) · [PRODUCT]
**[SEED/DEMO]** key unchanged at `v15`.
1. **Requirement tab removed** → the full requirement question list shows inline in **Overview** (always expanded, under "Captured at creation"). "Capture requirement / Edit" still available there.
2. **Sold block** (insurer · confirmed premium · payment status) moved from RFQ & Quotes to **Overview**. Payment status reads per flow (Chola: "In KYC / KYC cleared / Payment link sent / Paid on the Cholamandalam link"; normal line: Ops/ticket states).
3. Once a **policy copy exists** (`polOfLine(l)`, set at stage 11 for both Chola real-time and the normal post-purchase ticket), **RFQ & Quotes is replaced by a Documents tab** (any issued line). Documents lists: **Quote Comparison Report (QCR)**, **Quote · selected insurer**, **PAN card**, **GST certificate**, **Policy copy** (Chola: "issued in real time" + policy number; normal: "awaited from the insurer" until it arrives). Each viewable/downloadable. Before issuance the tab stays RFQ & quotes.

---

### v55 — drop the Welcome and Policy-explanation calls · [PRODUCT]
Across all products (not only Chola). **[SEED/DEMO]** key unchanged at `v15`.
- **Welcome call (TR-08)** (fired at Payment Completed) and **Policy-explanation call (TR-10)** (fired at Policy Copy Sent) — both rules **deleted**; neither task is ever created.
- Next-action card degrades cleanly: a line at **Payment Completed** no longer offers "Welcome call" (reads "waiting on post-purchase", or for Chola "Share the policy copy"); a line at **Policy Copy Sent** reads **"Issued · steady state"** (no "Policy explanation" action).
- **Document-chase task (TR-09)** (chase proposal form + mandate at stage 12) **kept**.

---

### v56 — Cyber capture questions + digitised band RFQ · [PRODUCT]
Two parts, matching the supplied screenshots/PDFs.
- **Part A — Cyber "capture details":** adds the defined question set to the Cyber capture popup.
- **Part B — digitised Cyber RFQ, chosen by sum-insured band (Non-DUA Cyber):**
  - **0–2 crore** → one RFQ form.
  - **2–10 crore** → a second RFQ form.
  - **Above 10 crore** → not available yet; uses the 2–10 form for now.
  - The band is parsed from the (free-text) coverage/sum-insured value.
- **New `multi` RFQ field type** — tick-all-that-apply chips (comma-joined value). Fidelity: every question kept; inputs simplified. Verified against the two actual PDFs.

---

### v57 — placement "Answer the query" is a simulation · [PRODUCT]
In the Non-DUA placement flow, **"Answer the query"** is now a **simulated inbound event** ("Placement raises a query") — it is **not** an action auto-present on every product line. Only when the simulated query fires does the "Answer the query" action appear.

---

### v58 — quote bifurcation tags (Instant vs Assisted) · [PRODUCT]
In the quote table:
- **"Instant issuance"** tag (violet) — Chola WC end-to-end real-time quote.
- **"Assisted issuance"** tag (grey) — standard rater quotes.
- Shown **only where both coexist** on the same line (i.e. "Assisted" only appears where an Instant option also exists). Labels live in the **quote table only**. (Renamed from the earlier "Real-time issuance" wording.)

---

### v59 — QCR-picker tags + remove SI subtitle · [PRODUCT]
- Added the **Instant / Assisted** tags to the **"Select quotes and send the QCR" picker** (previously only in the quote table).
- **Removed** the "SI … · valid 28 days" subtitle line from every quote row in that picker.
- Added CSS so the chips stay legible on selected (violet) rows.

---

### v60 — "Switch person" → full selector · [PRODUCT]
Sidebar **"Switch person"** now routes straight to the **full 5-card person selector** (the compact Switch-person modal is dropped). Signing a person out returns to the chooser; picking a card signs back in with **all data preserved**.

---

### v61 — seed the RM book · [SEED/DEMO]
Seeds a realistic RM book for the demo: **4 issued post-purchase lines** (2 Priya / 2 Rohan at the time), **2 active + 2 renewal-due**, **no open service tickets**.
- Note: `renSweep()` auto-creates renewal lines for policies within 90 days (`REN_WINDOW`), and skips CONTRACTUAL products (WC, CAR, EAR) which never renew. The two renewal-due policies each spawn a renewal line.
- This is demo seed data — port only as sample data if useful; not a feature.

---

### v62 — website-lead prioritisation (P0–P3) + homepage empty states · [PRODUCT]
- **Priority P0–P3** for **website-sourced leads only** (`src === 'Website'`, has a funnel drop stage, not dead, pre-sales stage) — **excludes** manually-created opportunities/product lines. Derived from the funnel stage the user dropped from, per your mapping table:

| Web event / drop-off stage | Priority |
|---|---|
| KYC verified | P0 |
| Payment start | P0 |
| View all the available quotes | P1 |
| L1 completed | P2 |
| Name / phone / email filled (company name filled) | P3 |

  *(Full mapping is the table you supplied; the above reflects the seeded examples. Map each funnel stage → its P-level.)*
- **Badge shown** on homepage **"Newly assigned"** and in **pipeline list view**; both **sorted P0 → P3**. Badge colours: **P0 red, P1 amber, P2 violet, P3 grey**.
- **Homepage empty states:** sections like "No activity" now render with an empty state when there's nothing to show (rather than being hidden) — for all five personas (Sales, RM, Renewal, Sales head, RM head).
- **[SEED/DEMO]** seeded website leads for Sales + RM to demonstrate the badges.

---

### v63 — storage-key bump + more Priya leads · [SEED/DEMO]
- **Storage key `v15` → `v16`** — fixes "I can't see the priority": the app only seeds when there's no saved state, so a stale localStorage from a prior key showed old leads without the `drop` field. Bumping the key forces a re-seed on load. **Port note:** this is localStorage plumbing specific to the prototype; in the Vercel app the equivalent is ensuring lead records carry the `drop`/priority field and that cached state is migrated.
- Added 3 more newly-assigned website leads to Priya (demo data).

---

### v64 — single-RM book (remove Rohan Desai) · [PRODUCT + SEED/DEMO]
- **[PRODUCT]** **Rohan Desai removed** entirely — no longer a user and no longer a sign-in persona. **Priya Nair is the sole RM.**
- **[SEED/DEMO]** Rohan's book (lines + accounts) reassigned to Priya; fallback RM pointer set to Priya. After this, Priya owns 9 accounts (4 with policies incl. Rohan's former book, 5 web-lead prospects), 2 renewals due within 90 days.

---

## Part 3 — Quick checklist for the Vercel port

**Must-build (product behaviour):**
- [ ] DUA terminology everywhere (v49); "New Lead" label (v49)
- [ ] Chola real-time WC flow: quote tag → KYC → payment link (24h, copy/send/resend/regenerate) → auto-pay → real-time policy copy → share; no payment/post-purchase ticket; hide stages 12–13 (v50–v55)
- [ ] WC capture questions replaced + SI = workers × salary × 12 (v51)
- [ ] Chola capture wizard: Details → Risk → Company → KYC (v51)
- [ ] Account-aware KYC: verified auto-fill vs provisional upload-that-verifies (v52)
- [ ] Cyber capture questions + band-based digitised RFQ (0–2 Cr, 2–10 Cr) + `multi` field type (v56)
- [ ] Placement "Answer the query" as a simulated inbound event, not an always-on action (v57)
- [ ] Quote tags Instant (violet) vs Assisted (grey), only where both coexist — quote table + QCR picker; remove SI subtitle in picker (v58–v59)
- [ ] Line screen: Overview holds requirement + Sold block; Documents tab replaces RFQ & Quotes once issued (v54)
- [ ] Drop Welcome (TR-08) + Policy-explanation (TR-10) tasks; keep TR-09; "Issued · steady state" (v55)
- [ ] Switch person → full selector (v60)
- [ ] Website-lead priority P0–P3 from funnel drop stage; badge + sort on homepage "Newly assigned" + pipeline list; homepage empty states (v62)
- [ ] Single RM (Rohan removed) if your directory still has him (v64)

**Plumbing only (adapt, don't literally port):**
- Storage-key bumps `v14→v15→v16` → ensure your lead records carry the priority/`drop` field and migrate cached state
- Seeded demo lines, RM book, website leads, persona roster → your real data/auth
- Simulate buttons (client pays, 24h expiry, placement raises a query) → real events/webhooks in production

---

*Source: prototype changelog docs ui/18 (v48) through ui/36 (v64) in the "RM Interface" project. Prototype artifact Version 77, storage key `bksales.v16`.*
