# BimaSetu CRM — what changed v73 → v75 (and 27 Oct)

> **Derived, not official.** No changelog document was supplied for these versions. This summary is
> taken from the prototype's own build notes and the `[stated …]` comments at the top of each new
> section of code (artifact version `1793105277-a808`, storage key `bksales.v25`). Replace it with
> the official changelog when there is one.

## v74 — 23 Oct 2026: the amendments after v73
Code: `app/24-v74.js` to `app/33-v74-seed.js`.

1. **BimaOps payment ticket.** Four reachable stages plus Withdrawn: Under routing → Link generation →
   Awaiting payment details → Payment details sent. Escalated is the only tag BimaOps sends; Share with
   client waits for Payment details sent. Multiple payment gains a **seventh condition: the same
   insurer**. The payment request carries the insurer branch.
2. **Post-purchase issuance ticket.** No provisional policy id or period: the opportunity id shows until
   QC, then the insurer's number and the real period. QC is the copy and one approve; queries live on the
   ticket; the escalation after three follow-ups runs there.
3. **DUA purchase — instant link vs Ops ticket.** The confirmed quote's instant flag decides the route.
   Instant insurers: Cholamandalam (Workmen's Compensation; link valid 24 h, payment by callback) and
   Go Digit (Fire, Burglary; 48 h, by polling). Account KYC (stage 9) applies to both routes. One modal
   generates the link (stays at 10, shown as Payment Link Generated) and sends it (→ 11); payment is
   detected automatically (→ 12); the policy comes back and is shared (→ 15), else the issuance ticket.
   *Switch to Ops* moves an instant opportunity to the Ops payment ticket.
4. **Call tasks and click-to-call (v1).** Every required call is a task with *Call Now*. Not connected →
   the task closes and the next opens; connected → one of six outcomes. Tasks close themselves when the
   opportunity leaves the stage. Pending → Overdue → Escalated. Task rules are set up by the administrator
   only (Masters → Task configurator: *Stage tasks*, *After a connected call*); the manual call is
   *Log a call manually*.
5. **Website drop-off → opportunity stage.** A website lead opens where the customer stopped — for
   example L1 completed → Details Captured, KYC documents submitted → KYC Details Requested, and the new
   P0 event *Payment failed* → Purchase Requested.
6. **Quotes decide the route.** After the requirement is captured the rater is asked (*Get quotes*): one
   or more quotes → DUA, none → Non-DUA (*Open the RFQ*). The Question Master joins Admin › Masters; Quote
   Sent gets a follow-up.
7. **Account addresses and sum-insured currency.** A new account needs its address.

Plus the v74 simulated events (one handler) and seed additions, including new website drop-offs
OP-2145 to OP-2147.

## 27 Oct 2026
- **Raise ticket = endorsements and claims only** (`app/34-raise-ticket.js`). Placement and payment tickets
  are raised from the opportunity's journey.
- **Fallback users** (`app/35-fallback-users.js`): one each for a Sales opportunity, a Post-sales
  opportunity and the ABM, used only when the master that normally decides finds nobody. Replaces the
  per-product fallback list.
- **RM allocation — editable and live at Payment Completed** (`app/42-rm-allocation.js`): Bands · Owners ·
  Regions, plus *Test an account*. An account with no RM goes to the next owner (round robin) at the
  highest band any parameter reaches, in its region.
- **Users master and reporting lines** (`app/43-users-master.js`): each person has a function (Pre-sales,
  Sales, Post-sales), a role (Manager or Executive) and a *Reports to*; you see yourself and everyone below
  you.

## v75 — 23 Oct 2026: the ABM pre-sales journey
Code: `app/36-abm-call-email.js` to `app/41-abm-team.js`.

- ABM users — executives (Arjun, Sneha, Rahul) and a manager (Kavya) — sign in to BimaSetu and switch
  between *Pre-sales* (the prospect journey) and *Post-sales*.
- Prospect → MQL → Meeting Set-up → Meeting Completed → Handed off. A hand-off creates real opportunities
  at New Lead, one per product.
- Click-to-call (Ozonetel) and email from the prospect; one open pre-sales task per active prospect,
  configurable as ABM pre-sales stages in the task configurator.
- At Payment Completed an ABM is assigned to the account with the RM (the sourcing ABM, else round robin).
- Admin › Masters › ABM assignment: the round-robin pool and the ABM team.

## Found while porting
- **Repo fixes still applied** (`app/repo-fixes.css`, `app/repo-fixes.js`; see the README): Compliance
  buttons clipped below about 1400 px; Admin blocked from renewal opportunities. The prototype fixed
  Admin's account access in v75, so that part of the repo fix was removed.
- **Not fixed — reported:** an instant-route opportunity on a provisional account waits at KYC Details
  Requested (stage 9) with an empty next-action card, so it offers no *Get verified*. `cholaSalesNext()`
  covers stages 10–11 only. KYC can still be completed from Account 360, and the opportunity then moves on.
