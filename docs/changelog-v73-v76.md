# BimaSetu CRM — what changed v73 → v76

> **Derived, not official.** No changelog document was supplied for these versions. This summary is
> taken from the prototype's own build notes and the `[stated …]` comments at the top of each new
> section of code (artifact versions `1793105277-a808`, `1793276861-8b77` for 29 Oct,
> `1793365270-585f` for 30 Oct and `1793372188-5166` for v76; storage key `bksales.v25`, `bksales.v26`
> from v76). Replace it with the official changelog when there is one.

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

## 29 Oct 2026
- **Payment details go to the client automatically** (`app/35-payment-details-auto.js`). When Ops closes the
  payment ticket at *Payment details sent*, BimaSetu emails the details to the client contact on the request
  (email only, no RM or Sales name in the body) and moves the opportunity to Payment Details Shared with
  Client by itself. For a multiple payment, every opportunity on the ticket moves. The manual *Share with
  client* step is gone. While the opportunity is at that stage the user can *Resend* — a new email with the
  same details.
- **Overview: "Sold" is now "Payment details"** (`app/35-payment-overview.js`): insurer, branch and premium,
  then what the client was sent — the insurer's payment link on the instant route, the NEFT / RTGS details
  or the proforma invoice — with *Copy* on links. Before that it says where the details are (with Ops on
  the ticket, or the link not yet generated).
- Related edits: the stage-11 next action, the Overview layout, the simulated event *Ops sends the details
  and closes the ticket*, and the email-preview style.

## 30 Oct 2026 (v75.32): customer type at creation
Code: `app/44-customer-type.js`, with edits in `app/07-verify.js`, `app/09-acct.js` and `app/10-newopp.js`.

- **New opportunity asks two questions first:** *Is the customer a sole proprietor?* and, if yes, *Does the
  customer have GST?* Not a sole proprietor, or a sole proprietor with GST → the GST number (optional) now,
  the PAN card and GST certificate at KYC. A sole proprietor without GST → the Aadhaar number (optional)
  now — twelve digits, and it finds an existing account — with no GST address, and the PAN card and
  Aadhaar at KYC.
- **The answers live on the account** as its *Customer type* (Profile and Compliance tabs). They can be
  edited only while the account is provisional, and every change is logged.
- **KYC follows the customer type** with no choice of second document. A sole proprietor with GST no longer
  has "PRIVATE LIMITED" added to the legal name.

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

## v76 — 30 Oct 2026: the investor demo
Code: `app/45-investor-demo.js` and `app/46-investor-demo-fill.js` (left out by `node build.mjs --full`).
The deployed link is this demo.

- **Two cases, walked live from pre-sales:** Sharma Industries — Workmen's Compensation (DUA) and
  Northgate Systems — Cyber Liability (Non-DUA). The page starts with no accounts or opportunities, just
  these two prospects with Arjun.
- **A small cast:** Arjun (ABM) and Kavya (ABM manager), Nikhil (Sales) and Vikram (his manager), Priya
  (RM) and Meera (Head of RM), and Admin. Every product routes to Nikhil; Priya is the only RM owner, and
  both customers fall in the RM band so the RM rule — not the fallback — picks her.
- **The hand-off fills in what BimaKavach already knows** about the company: trade name, city,
  industry, profile and financials.
- **Fill sample data:** every pop-up that needs typing or an upload has a button that fills it with demo
  values; the presenter checks it and presses the pop-up's own button. The RFQ form and *Raise a
  request* have the same button inline.
- **Happy path only:** the exception simulators (queries, declines, no-answer calls, PAN mismatch,
  follow-ups) are hidden.
- **The Cyber QCR's cover terms read as cyber** (breach response, ransomware, social engineering).
- The storage key moves to `bksales.v26`, so a browser that opened the link before starts fresh.

## Found while porting
- **Repo fixes still applied** (`app/repo-fixes.css`, `app/repo-fixes.js`; see the README): Compliance
  buttons clipped below about 1400 px; Admin blocked from renewal opportunities. The prototype fixed
  Admin's account access in v75, so that part of the repo fix was removed.
- **Not fixed — reported:** an instant-route opportunity on a provisional account waits at KYC Details
  Requested (stage 9) with an empty next-action card, so it offers no *Get verified*. `cholaSalesNext()`
  covers stages 10–11 only. KYC can still be completed from Account 360, and the opportunity then moves on.
  **In the v76 investor demo this is on the main path:** Sharma's WC opportunity is confirmed on
  Cholamandalam while the account is still provisional, so it stops at stage 9 with an empty card. The
  presenter has to go to Accounts → Sharma Industries → *Get verified* → *Use sample documents*.
- **Not fixed — reported (30 Oct):** when a provisional account's customer type is edited from *Sole
  proprietor · no GST* to *has GST*, KYC asks for the GST certificate but the Compliance tab still lists
  Aadhaar as the identity document, because that list keys off the Aadhaar number already on the account.
- **Not fixed — reported (v76):** the payment-proof sample note names Sharma's contact ("Rahul Mehta is the
  decision maker; plant HR handles worker additions") on every case. Only Northgate's journey uses the
  proof step, so the note always names the wrong person there.
