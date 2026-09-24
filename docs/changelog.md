# BimaSetu CRM — working prototype (v47)

**Artifact:** https://claude.ai/artifact/V4ADJNCJwuYxDHs5pUcAAz
**Design language:** BimaOps / BimaPlacement kit (tokens, Outfit, 248 px sidebar, white panel on grey shell, diamonds divider, one primary CTA per screen — and it is the screen's own, not a global button; amber-dashed = simulated inbound event, dotted-grey = prototype time control).
**Storage:** every change is remembered in the browser (`localStorage`, key `bksales.v12` — older state is discarded on first load). *Reset* in the sidebar returns to the seed. The clock is fixed at **Mon 21 Sep 2026, 11:00** and only moves through *Prototype controls* or the simulator; when it moves, every scheduled rule check between then and the target runs.

This is the clickable version of specs 00–11b, `post-purchase-ticket.md`, `rm-workflow.md` v3.1 and `07-task-configurator.md` v3. Nothing here is a mock-up: every button writes to the shared record and every screen is re-derived from it.

## Changes in v46–v47 — feedback round of 24 Sep

Eight pieces of feedback, plus the answers to the open questions that touch the prototype.

### 1 · A QCR or quote can be downloaded and shared by hand

**[stated]** sending it from the CRM is no longer the only route. The QCR viewer's footer now carries
three actions — *Send back for revision* · **Download and share myself** · *Send to <contact>* — and
the next-action card at Quotes Received offers the same as a secondary.

*Download and share myself* opens a short form: how it went (WhatsApp · email from my own mailbox ·
in a meeting · printed · courier), who it went to (defaulting to the line's contact) and an optional
note. **The line still moves to Quote Sent** and the quote-sent follow-up rules start, exactly as if
the system had emailed it — what differs is the record: *QCR v1 shared with client — by hand ·
downloaded and sent on WhatsApp to Rahul Mehta · not sent from the CRM*.

On a DAU line the same choice sits inside *Select quotes and send the QCR*, as a two-way switch:
**Email it from here** or **I will send it myself**.

### 2 · A renewal is always an RFQ line — there is no DAU route at renewal

**[stated]** whatever the product and whatever the fresh buy was, a renewal goes to placement. The
v21 DAU re-check at Details Captured is gone with it, and so is the ₹25 Cr rater limit it turned on.

Three ways the renewal's RFQ opens, and the RM is asked something different in each:

| The fresh buy was… | What opens | What the RM is asked |
|---|---|---|
| **Non-DAU, bought here** | Last year's RFQ, **carried over** | Change what has changed, then send it on |
| **DAU** — the rater priced it, so no RFQ was ever raised | A **new RFQ**, pre-filled from the policy and the account | Fill it — *there is no RFQ to carry over* |
| **Not bought through the CRM** | The same, pre-filled from the policy record | Fill it |

The line says which case it is, on the card and on the RFQ tab: *POL-FSP-2025-8841 was priced by the
rater at the fresh buy, so one was never raised. A renewal always goes to placement.* The route chip
reads **Placement · renewal**; the renewals table reads *RFQ carried over* or *RFQ to fill*.

**Seed:** Sharma's Fire policy is now linked to **OP-1876**, a DAU line sold in Nov 2025, so its
renewal (OP-2944) demonstrates the second case with nothing carried over.

### 3 · Workmen's Compensation, Contractors All Risk and Erection All Risk never renew

**[stated]** they are contractual policies — written for the length of a contract, not a policy year.

- **No renewal line is ever opened** on one, by the 90-day sweep or otherwise.
- They are out of the **renewals pipeline**, the RM home's **Renewal management** card and the head
  of RM's **Renewals at risk** card — so they can no longer sit there forever looking unstarted.
- **Policy 360** says so where the renewal would be: *No renewal — this is a contractual policy.*
- **Erection All Risk** is added to the product master (it was missing).
- The two seeded WC renewal lines are gone. Their demo cases moved to new policies on the same
  accounts: Meridian · **Group Health** (expires today, payment with Ops) and Novacast ·
  **Directors & Officers** (the second line for the multi-line payment request).

### 4 · A provisional account is verified from the account, with PAN and GST **or Aadhaar**

**[stated]** *Get verified* sits on the account header and in the new Compliance section, and is
open to **whoever is on the account — the RM who owns it included** (it was hidden from RMs).

The flow is now two real uploads. A segmented control picks the second document: **GST certificate**
for a registered business, or **Aadhaar** for a proprietor with no GST, where it stands in for the
registration certificate. Each is a drop target that accepts an image or a PDF; *Use sample
documents* fills both for the demo. PAN is still checked against the ten characters inside the GSTIN,
and the mismatch and merge-into-an-existing-account states are unchanged.

### 8 · OCR reads the legal name off the PAN, and the account takes it

**[stated]** on the reading step the form shows **Legal name as per PAN**, and where it differs from
the name that was typed at creation, an amber block shows the change before it is written:

> ~~Ravi Steel Traders Pvt Ltd~~ → **RAVI STEEL TRADERS PRIVATE LIMITED**

Verifying renames the account. Every screen, document and search follows the PAN from there; the name
typed at creation is kept on the activity trail and shown under the legal name on Profile.

### 5 · Compliance documents, on the account

**[stated]** a new **Compliance** tab on Account 360, in two parts:

- **Identity** — PAN card, GST certificate and, on a proprietorship, Aadhaar. Each carries the number
  and one line of what it is for, plus **View** and **Download**. A provisional account shows what is
  missing and the *Get verified* button.
- **Authority** — every mandate letter on the account, with **Valid** or **Expired**, who signed it,
  when, and until when.

### 6 · Documents, on the RM's post-purchase line

**[stated]** a **Documents** section under the requirements table on the Post-purchase tab:
proposal form · mandate letter · risk-held letter · policy copy · tax invoice — each with **View**
and **Download** when it is held, and a *Not on file* chip with who it sits with when it is not. The
header counts *n of m on file*. The requirements table above it stays the chase; this is the shelf.

### 7 · Every document can be viewed and downloaded, everywhere

**[stated]** the old *"nothing to show in a prototype"* toast is gone. There is now **one document
viewer** behind every document in the system, and every place that names a document carries **View**
and **Download**: the account's compliance documents, the post-purchase line, the ticket's document
vault, Policy 360's Documents tab, the requirements table, the RFQ, each insurer quote and the QCR.

| Document | What the viewer renders |
|---|---|
| PAN card · GST certificate · Aadhaar | The card or certificate, with the number and the legal name |
| Mandate letter | The letter of appointment on the client's letterhead, with the register entry, scope, signatory and validity |
| Proposal form | The insurer's form with the proposer's details and whether the declaration is signed |
| Risk-held letter | The insurer's confirmation of cover, with the date the risk was held from |
| Policy copy | The policy schedule — **both numbers**, insured, period, sum insured, premium |
| Tax invoice | Premium, GST at 18%, total |
| Quote · QCR · RFQ | The quote slip, the comparison report, the RFQ as sent to placement |
| Payment proof | The screenshot, with the amount and UTR read from it |

**Download produces a real PDF.** The sheet is written out as a single-font PDF under the name and
size the screen promised — `Mandate_BlueHarbourShipping_MD-003.pdf`, `QCR_v1_SharmaIndustries.pdf`.
In the published artifact the file is handed over through the viewer's download permission, so the
viewer is asked once and then gets the file.

### 9 · The answered open questions that touch the prototype

Built from the returned workbook:

| # | Answer | What changed |
|---|---|---|
| **TBD-34** | Two numbers, never one | Every policy now carries **Policy number** (the insurer's, read off the copy at QC — *awaited* until then) and **BK internal policy number** (generated when the record is written; empty on a migrated policy that never had one). Both on Policy 360, the policies table and the policy copy |
| **TBD-53** | Working days | Stalled clocks run on **working** days — Payment Completed 1 · Policy Documents Pending 5 · Awaiting Policy Copy 3 · **a new lead uncalled 3** (was 1 calendar day). The 30-day quiet clock stays on calendar days |
| **TBD-05 + TBD-06** | Unreachable, at 10 attempts | **Unreachable** is a sixth status. The tenth call that does not connect, on a line nobody has ever reached, closes it — set by the system, never by a person, stage preserved, open tasks closed. No timing rule and no channel rule. The card and the Overview count down the attempts left |
| **TBD-62 / TBD-63** | Liability products only | The RHL and the proposal form are required on **liability products only**; HDFC Ergo and Future Generali generate the RHL, every other insurer emails it. *The liability product list itself is still a stand-in — the product groups are pending* |
| **TBD-25 / 26 / 27 / 29** | Account level, one year, never revoked | One mandate covers the whole account — every insurer, every policy — and expires **one year** from signature. Nothing is ever marked revoked. *Scope is still with Amogh* |
| **TBD-22** | Not mandatory | The handover note at Confirm payment is optional |
| **TBD-02** | Already captured | The decision-maker field is off the requirement form — the contact on the line is the answer |
| **TBD-51** | No limit | The 30-day endorsement backdating validation is removed |
| **TBD-23** | 3 | The chase escalates to the RM's manager at three missed follow-ups. *"after 3 [open]"* is gone from the copy |
| **TBD-52** | The account's owner | Whoever owns the account raises endorsements and claims and works its service tickets — a head of RM on her own accounts included |
| **TBD-58** | Manager only | An executive can no longer reassign their own line; the Manage tab says who can |
| **TBD-54** | Yes | The head of RM gets **Pipeline** and **Renewals** in Team view |
| **TBD-36** | Yes | Policies are in global search, on either number, and open Policy 360 |
| **TBD-37** | Yes | A manager closing someone else's escalated task now picks a reason; it lands on the line's trail with who closed it |
| **TBD-42** | No | A task the system closed does not satisfy another rule's **Done** condition |
| **TBD-43** | Refuse | A task title another rule points at **cannot be renamed** — the builder says which rules and refuses. Nothing carries through any more |
| **TBD-21** | Manually | Past the RHL follow-up ladder the desk handles it by hand |
| **TBD-30** | Deliberate | Withdrawal has no refund path, and the copy says that is deliberate, not missing |
| **TBD-14** | No template | The Excel upload is described as a stopgap until the digitised RFQ exists |
| **NFR-02** | Owner only | PAN, GSTIN and Aadhaar show in full only to the account's owner (and a manager above them); everyone else sees the last four characters |

**Already as answered, so unchanged:** TBD-07 (a cancelled ring is not an attempt) · TBD-11 (no round
alert) · TBD-12 (a client's RFQ edit does not write back) · TBD-13 (one contact, plus Copy link) ·
TBD-19 (screenshot only) · TBD-24 (Post-purchase is a waiting-on value) · TBD-28 (the register is
checked first) · TBD-31 (the RM may re-trigger a send) · TBD-35 (policies sort by start date) ·
TBD-38 (a rule never doubles up) · TBD-39 / TBD-55 (one level) · TBD-44 (a rule always has a clock) ·
TBD-45 (titles are unique) · TBD-68 (no re-opening) · TBD-69 (sales keeps read access).

**Answered but not built, and why:**

- **TBD-15 — the RM confirms payment.** The prototype has the salesperson confirm it, and that
  confirmation is what hands the account over to the RM. Making the RM confirm inverts the handover:
  the RM would have to own the line before the sale completes. This needs a decision about where the
  handover happens, not a code change.
- **TBD-18** — removing a line from a raised payment request has no path yet.
- **TBD-40** — *is not* is on the condition model but not on every condition type in the builder.
- **TBD-03 / TBD-04** — the product-level fallback user and fallback RM are configuration the
  prototype has no screen for.
- **TBD-20** — ticket stage names come from BimaOps, which does not exist yet.

## Changes in v45 — one global type scale (24 Sep)

**[stated] the type was too small.** The prototype now has a single 12-step type scale as its global
standard, with a **16 px body size** — the web default, up from 13.5 px.

| Token | Size | Used for |
|---|---|---|
| `--fs-3xs` | 11 px | tags inside a chip |
| `--fs-2xs` | 13 px | labels, hints, field errors |
| `--fs-xs` | 14 px | meta lines, chips, secondary text |
| `--fs-base` | **16 px** | body, tables, inputs, buttons |
| `--fs-md` | 17 px | emphasised body, card titles, nav |
| `--fs-lg` | 18 px | section titles |
| `--fs-xl` → `--fs-5xl` | 20–34 px | headings and the wordmark |

- **213 hard-coded sizes** across the CSS and five JS modules were replaced with tokens; none remain.
- The **sidebar widens to 248 px** so the nav does not wrap at the larger size.
- Table chips, sub-lines and phase labels step **down** one level, so a denser table still fits.
- Line height goes from 1.5 to 1.55.

**Known, and pre-existing:** on the pipeline table the Account and Opportunity columns wrap, because a
generated opportunity name repeats the account name; *In stage* sits to the right of the table's
horizontal scroll.

## Changes in v44 — Log activity comes off the next-action card (23 Sep)

**[stated] remove *Log activity* from every next-action card.** The card answers one question — what
to do next — and logging an activity is not an answer to it. It appeared on every card at every
stage, including the ones where it was the only button.

- It **stays on the line's Activity tab**, where the button sits beside the heading. Nothing is lost.
- A card with a next action shows the primary and its secondaries, and nothing else.
- A card with **no** action for you — a stage where you are only waiting — now shows **no button row
  at all**, rather than a lone *Log activity*.

## Changes in v43 — click to call (23 Sep)

**[stated] the RM presses the button, the system places the call, and the moment it ends the outcome
form opens on its own.** Logging a call by hand opens the same form.

**The line's next action now has two call routes.** At **New Lead** the card reads **First contact**
(primary, places the call) with **Log a call manually** beside it; at **Consultation Setup** it is
**Call** · *Capture requirement* · *Log a call manually*. Both routes end in the same six-outcome
disposition form.

**The call itself** — the line's own contact is dialled, the one the line already carries:

| Phase | Shows | Can you leave? |
|---|---|---|
| **Dialling** | The contact, their number, a pulsing dot | Yes — **Cancel the call**. Nothing is on the record |
| **Ringing** | **They answer**, plus the amber-dashed switch events — *Nobody picks up* · *Busy* · *Switched off* | Yes, same |
| **Connected** | A running **mm:ss** timer and a red **End call** | **No.** The modal has no close, Escape does nothing, the backdrop does nothing |
| **Ended** | The result and the duration, for a beat | No — the outcome form opens by itself |

- **[stated] nothing is pre-selected.** The switch knows whether it connected and for how long; only
  the RM knows what was said. The form opens with the duration on a strip at the top and every outcome
  unpicked.
- **[stated] the disposition is not optional.** Once a call has connected, the outcome modal cannot be
  dismissed — no X, no Cancel, no Escape, no backdrop click. *Log disposition* stays disabled until an
  outcome is chosen.
- **The call is on the activity whatever the outcome**, including *Discovery complete* which hands
  straight over to the requirement form: `Call · Discovery complete · Nikhil Sharma · call 1 ·
  connected · click to call · 2 min 14 sec`.
- A call cancelled while dialling or ringing writes nothing — no attempt, no stage change.

**Open:** the call is only on the product line's action card. It is not yet on the line header, the
home rows, or an account's contact list.

## Changes in v42 — the heads get a book of their own (23 Sep)

**[stated] a head's My view homepage must be the RM homepage / the sales executive homepage.** It already
was — *My view* calls the same `SCREENS.home` and `SCREENS.rmhome` an executive and an RM get, and the
bucket builders behind them filter on one thing only, `owner === you`. There is no role branch inside
either screen.

**What was actually wrong was the seed.** Meera owned **0 lines, 0 accounts, 0 tasks**; Vikram owned 3
lines but no task, and none of the three was an uncalled lead, waiting on Us, or quiet for 30 days.
Both heads rendered the correct screen with every card empty, which reads as broken.

So both now carry a real personal book:

| | What was added |
|---|---|
| **Meera** (head of RM) | Two accounts of her own — **Marigold Hospitality** (nine properties, Fire and Burglary in force) and **Northgate Systems**. One line just handed over at payment (Marigold · Cyber, welcome call due today) → *Newly assigned*. One renewal (Marigold · Fire, expires 19 Nov) → *Renewal management*. One line collecting documents (Northgate · Group Health) with an overdue chase → *Tasks · Overdue*. One line she is selling herself (Northgate · Professional Indemnity, at Details Captured) → *Action required* |
| **Vikram** (sales head) | A referral he has not called yet (Sterling Foods · Cyber) → *Newly assigned*, with an overdue **Call the new lead**. Plus an overdue RFQ chase on Sterling · Group Health and a follow-up due today on Apex · Fire |

- **The heads' own book stays out of Team view.** Both team homes scope to the team's ids, which do not
  include the head, so nothing here changes what either head sees in Team view.
- Storage key bumped to `bksales.v12`; the `seq` counters moved past the new ids (accounts to 1020,
  post-purchase tickets to 443) so a newly created account can no longer collide with a seeded one.

## Changes in v41 — My view / Team view, and two cards renamed (23 Sep)

**[stated] A head works in two modes, and the switch is global.** *My view* is the head as an individual — their own book, their own tasks, the executive screens. *Team view* is the head as a head. The control sits **at the top of the sidebar**, under the wordmark and above search, as a two-button segment: **My view** / **Team view**.

**[stated] What the switch scopes**

| Screen | My view | Team view |
|---|---|---|
| **Home** | The executive home — *Everything that needs you today* | The head's home — escalated tasks, stalled lines, (RM head) renewals at risk |
| **Pipeline** | *Every product line you own* | *Every product line your team owns*, with an **Owner** column |
| **Accounts** | The ones they own or sell on | The ones the team owns or sells on |
| **Opportunities** | The ones they created or own a line on | The team's |
| **Tickets** | Their own lines and accounts | The team's |
| **Inside a product line** | No switch — a line is one record with one owner, whoever is looking at it | The same |

- The **nav changes with the view**. A sales head in My view gets the executive nav (Home · Pipeline · Opportunities · Accounts · Tasks · Tickets · Task rules); the head of RM in My view gets the RM nav, **Renewals included** — a head of RM owns accounts personally, so their own renewal book has to be reachable.
- Switching **keeps you where you are**. Change the view on Pipeline and you stay on Pipeline, now scoped differently; only Home swaps, because the two homes are different screens.
- A head lands in **Team view** by default, and each person starts in their own default when you switch person.
- Tasks is *not* scoped — *My tasks* means the head's own tasks in both views, as it did before.

**[stated] Two cards renamed** on both head homes: **Escalated to you → Escalated tasks**, **Slipping → Stalled**. The rules behind them are unchanged.

## Changes in v40 — the sales head and RM head homes, rebuilt around what to do now (23 Sep)

**[stated] Both manager dashboards were cluttered, the lists too long, and half of each page was a table.** They now answer the same question the executive home answers: *what do I work on right now.*

**[stated] The tables are gone, not moved.** Pipeline by stage, post-purchase by who must act, and the per-person table are removed from the prototype. The stat tiles go with them — a tile that repeats the card heading one screen higher is not work.

| | The sales head (Vikram) | The head of RM (Meera) |
|---|---|---|
| **Opens with** | *Good morning, Vikram* · a date pill · one line naming the team and its open lines | *Good morning, Meera* · the same |
| **Card 1** | **Escalated to you** — the tasks that are already his to close per `06-roles-and-permissions.md`. Each row: task, how long it has been escalated, the account · product · owner, then **Take it over** and **Close** | The same |
| **Card 2** | **Slipping** — a new lead nobody has called, or an open line quiet for 30 days. Chip says which; the row says the owner, stage and who it waits on. **Take it over** on every row | **Slipping** — a post-purchase line past its clock (1 day unassigned, 5 collecting documents, 3 awaiting the copy), or a client-pending line whose follow-up date has gone |
| **Card 3** | — | **Renewals at risk** — a policy inside the 90-day window with **no renewal line at all**, or one inside 30 days still sitting at Details Captured. Soonest expiry first |
| **Ends with** | One grey line: closing an escalated task closes it for the owner and the line does not move; taking a line over is the audited fallback; your own book is on Pipeline | The same, pointing at Renewals and Tickets |

- **[stated] no list runs long.** Every card shows **five rows** and then *N more*, which expands in place and collapses again.
- The nav item for both is now **Home**, not Team, because that is what it is.
- **A clear day says so**: when nothing is escalated, nothing is slipping and every renewal in the window has been started, the page is one line — *Nothing needs you right now* — and nothing else.

## Changes in v39 — the call outcomes, and the two that ask a question back (23 Sep)

**[stated] Six outcomes on the log-call form, and nothing else.** *Gatekeeper not put through* is gone.

| Outcome | Group |
|---|---|
| Ringing, no answer | No connect |
| Busy, call cut | No connect |
| Switched off or unreachable | No connect |
| **Wrong person, referred to correct POC** | Connected · asks who |
| **Asked to call back later** | Connected · asks when |
| Discovery complete, requirement captured | Connected · opens the requirement questions |

**[stated] Two of them ask for more before the disposition can be logged.** The questions appear **directly under the option that asks them**, not at the foot of the form.

| Outcome | Asks | What it does |
|---|---|---|
| **Wrong person, referred to correct POC** | **Name · Contact number · Designation**, and an optional email | **[stated]** the person is added to the account's Contacts and **becomes the contact on this product line** — so the RFQ, the quote and the payment details go to them. The previous contact stays on the account. Two trail entries: the call, naming who it was referred to, and a system line recording the contact change |
| **Asked to call back later** | **Call back date and time** | The **callback rule's own task takes that exact time** instead of its default two days — one task, on the hour the client asked for, titled *Call back <name>* |

- A field is not flagged red until it has been touched; the *Log disposition* button stays disabled until the outcome's questions are answered. A contact number must be at least 10 digits, and a callback time must be in the future.
- Nothing else about the call flow changed: the stage still follows the outcome, calls still count per product line, and *Discovery complete* still opens the requirement questions.

## Changes in v38 — the Account Overview is the counts and the contacts (23 Sep)

**[stated] Three blocks come off the account's Overview tab:** *Bimanetra recommends*, *In the post-purchase ticket*, and *Open product lines*.

What is left is the five counts — open lines, opportunities, policies in force, premium in force, service tickets — and **Contacts**, with *Add contact*.

**[derived] each of the three had a tab of its own.** Open product lines are on Opportunities and Renewals; the post-purchase ticket is on Servicing and on the line itself; the recommendations were the only thing on the page with nowhere else to go, and they go too. Overview stops being a second copy of the tabs underneath it.

## Changes in v37 — Status has two values; a missing policy copy is said in Documents (23 Sep)

**[stated] A policy waiting on its copy is Active.** *Issuing* has gone from the Status column — the premium is paid and the cover is on, so the policy is active like any other. Status now reads only **Active** or **Inactive**, as specified.

**[stated] The waiting is said where it is acted on — the Documents section.**

| Where | What it now says |
|---|---|
| **Policies table** | Status reads **Active**; a small line under it reads *policy copy pending* |
| **Policy 360 header** | The chip reads **Active**. A violet banner explains that the number and period are provisional until the copy arrives, and points at Documents |
| **Policy 360 › Documents** | Rebuilt as a list, one row per document: those on file carry **Review** and **Download**, those not carry a **Pending** chip and who they sit with — *policy copy: with the insurer, the desk is chasing it* · *tax invoice: comes with the policy copy* · *proposal form / mandate: with the client*. The header counts *n of m on file*, and a note links the post-purchase ticket where the chase history sits |

- A document that does not apply to the product is not listed at all, so *pending* always means somebody owes it.
- Nothing else about *issuing* changed underneath: the record is still written at Payment Completed with a provisional number and period, still cannot be endorsed or renewed until the copy lands, and is still deleted outright if the client withdraws.

## Changes in v36 — policy type on the account, and Policy 360 (23 Sep)

**[stated] Every policy is Fresh, Cross-sell or Renewal, and the type is written once.**

| Type | Which policy gets it |
|---|---|
| **Fresh** | The **first** policy ever booked on the account |
| **Cross-sell** | **Every policy after that** |
| **Renewal** | A policy produced by **renewing** an earlier one |

The type is decided at booking and never changes — renewing the first policy does not make the new one Fresh, and a cross-sell bought later never becomes Fresh even if the original lapses.

**The Policies tab, rebuilt.** **[stated]** a filter over one table — **All · Fresh · Cross-sell · Renewal**, each with its count — and one row per policy carrying exactly:

**Policy number · Product · Insurer · Premium · Sum insured · Start · End · Status (Active / Inactive) · Type**

The policy number is a link. The RM who owns the account still gets *Endorse* and *Claim* on the row.

**[stated] Policy 360** — the policy's own screen, opened from the number, **readable by anyone who can see the account** (sales included):

| Section | What is on it |
|---|---|
| **Header and rail** | Product, account, number, *Active / Inactive*, the type, the insurer; a period clock showing how long the policy has to run, and the sum insured |
| **Overview** | Every basic detail — number, product, insurer, SI, premium, type, start, end, status, account, sold by, endorsement count — then **where it came from and what comes next**: the policy it was renewed from, the product line it was sold on, and either the policy it was renewed into or the renewal line open on it now |
| **RFQ & quotes** | The RFQ and every QCR version behind the sale, read off the product line |
| **Documents** | Policy copy, tax invoice, filled proposal form, RHL, signed mandate, PAN and GST — with a link to the post-purchase ticket that collected them |
| **Endorsements & claims** | Every service ticket raised against this policy, each opening its own flow |

**Seed.** Sharma Industries now carries a four-policy history so all three types are visible: a 2024 Burglary policy (**Fresh**, now inactive), Fire and Workmen's Comp (**Cross-sell**), and the 2025 Burglary policy that renewed the 2024 one (**Renewal**). Storage key bumped to `bksales.v11`.

## Changes in v35 — a renewal is a product line, not an opportunity (23 Sep)

**[stated] A renewal never creates an opportunity. It is always a product line.** The renewal line hangs off the account and carries the policy it renews; it has no opportunity at all.

| | Before | Now |
|---|---|---|
| What the renewal route creates | An opportunity *(Marine Cargo_Renewal_Nov 2026)* plus one line inside it | **A product line only** |
| The line's trail | Accounts › Account › **O-1092** › Marine Cargo | Accounts › Account › **Renewal** › Marine Cargo |
| Overview | Opportunity · Business type | **Business type: Renewal — no opportunity**, then *Renews POL-MC-2026-4417 · expires in 42 days* |
| The account's Renewals tab | Renewal opportunities | **Renewal product lines**, soonest expiry first |
| Task rules filtered by *Opportunity type = Renewal* | Read the opportunity | Read the line — a line that renews a policy |

**[stated] Payment: several renewal lines on one request.** A payment request is raised against an amount, not against products, and for fresh business one request can already cover several lines on the opportunity. A renewal has no opportunity, so the grouping is **the account's other renewal lines**:

- On the account's **Renewals** tab, every renewal line at *Purchase Requested* that is yours and not yet billed carries a **Select** button. Ticking shows *n lines selected · ₹total*, and **Raise payment request** opens with exactly those lines ticked.
- The request can still be raised from a single renewal line's own screen; it opens with all eligible renewal lines on that account listed.
- A line owned by someone else is listed but cannot be included, exactly as on an opportunity.

**Seed and storage.** The eight renewal opportunities are gone; their lines carry `opp: ''`. Two renewal lines on **Novacast Foundry** (Commercial General Liability and Workmen’s Compensation, Rohan’s) sit at *Purchase Requested* so the multi-line request can be tried. Storage key bumped to `bksales.v10`.

## Changes in v34 — a Renewals section on the account, and the product is now BimaSetu (23 Sep)

**[stated] Renewals get their own section inside the account, and sales never sees it.**

| | |
|---|---|
| **Where** | Account 360, a tab between *Opportunities* and *Policies*: **Overview · Opportunities · Renewals · Policies · Servicing · Profile · Group** |
| **What is in it** | Every renewal on that account — **v35**: renewal *product lines*, soonest expiry first, each with its stage, the policy it renews and that policy's due date |
| **Who sees it** | **[stated]** the RM and the head of RM only. Hidden for the sales executive, the sales manager and Customer Success |
| **Opportunities** | **[stated]** renewals are out of it. **v35** made that automatic — a renewal is no longer an opportunity at all |

- **Hiding the tab actually hides the renewals.** For a sales role the renewal product lines are dropped from the account Overview's *Open product lines* and *In the post-purchase ticket* lists too. A sales manager who can see the account sees its fresh business and nothing else.
- The section restates the rule it exists for: a renewal is separate from fresh business — it never joins a fresh-business opportunity, and a fresh enquiry never joins a renewal.

**[stated] BimaSales is now BimaSetu** — the sidebar wordmark, the sign-in screen and the browser title. The BimaKavach mark on the client-facing RFQ page and the QCR is unchanged; those are the customer's view of the broker, not the internal tool.

## Changes in v33 — three opportunities were labelled Renewal and were not (23 Sep)

**[stated] Renewals were showing up in the sales executive and sales manager views.** The visibility rule was right; the seed was wrong.

- **O-1042** (Sharma Industries), **O-1065** (Kalyan Logistics) and **O-1067** (Meridian Chemicals) carried `type: Renewal` with `bt: Market rollover`, no `renews` link on any of their lines, and their lines owned by **sales executives**. They are market-rollover **new business** — a policy taken off another broker — and are now typed that way. Their names regenerate as *"— New Business —"*.
- A market rollover has always been a business type under New Business: **Create opportunity** hard-codes the type and only offers *Fresh* or *Market rollover*. The only writer of `type: Renewal` is the renewal route, which sets `by: system`, `src: Renewal route`, and links the line to the expiring policy.
- **What this also fixed:** `renewalLineFor` matches an open line on an account by product and opportunity type. On Kalyan Logistics, Anand's Marine Cargo sales line matched the Marine Cargo policy as readily as the RM's real renewal line. Policies now bind to the renewal lines only. Task rules scoped to *Opportunity type = Renewal* also stop firing on sales lines.
- After the fix, every sales role — executive and manager — shows **zero** renewal opportunities under *Mine*; the eight real ones sit with the RMs and the head of RM.
- **Storage key bumped to `bksales.v9`**, so a browser holding the old seed picks the corrected one up on first load.

## Changes in v31–v32 — the product line's tabs, rearranged for a handed-over line (23 Sep)

**[stated] All four changes apply only to a line handed over to the RM after payment** — that is, one that has a post-purchase ticket. A line still being sold is untouched. **v32** corrected v31, which had moved RFQ & quotes on every line.

| The line is… | Tabs |
|---|---|
| **Still being sold** | Overview · Requirement · **RFQ & quotes** · Tickets · Activity · Tasks · Manage — exactly as before |
| **Handed over after payment** | Overview · Post-purchase · **Mail trail** · Requirement · Tickets · Activity · Tasks · Manage |

| Change | What it means |
|---|---|
| **Handover packet removed** | It is gone from the Post-purchase tab. Every field on it already read off the line, the account or the ticket — sold by, decision maker, insurer and premium, KYC, payment proof — so it was the same facts a second time |
| **Mail trail is its own tab** | The three threads — client, RM ↔ desk, insurer — with their filter and counts, move out of Post-purchase onto a **Mail trail** tab. It appears at Payment Completed, when the ticket opens and the threads begin. The ticket screen still carries the same trail at the bottom |
| **Manage ticket moves to Manage** | Reminders and escalations, reassign ticket / mark customer withdrawn, and the manual review queue now sit on the **Manage** tab under a *Manage ticket* heading, below the line's own manage actions and above Related. All three stay the desk's, not the RM's |
| **RFQ & quotes folded into Overview** | **On a handed-over line only.** The tab goes, and Overview becomes *Captured at creation*, then a divider, then the quoting block — the RFQ, every QCR version and the *Sold* summary. For the RM this is history, not a working screen, so it does not need a tab of its own. A seller's line keeps the tab and a plain Overview |

- Post-purchase is now just the requirements table and its sub-statuses, with one line pointing at where the mail and the ticket actions went.

## Changes in v30 — Newly assigned says which of the two cases a row is (23 Sep)

**[stated] On the RM's home, a line lands in *Newly assigned* in two different ways:** the assignment rule gave it to them, or it was handed over to them after the payment went through. The two used to look alike. Each row now carries its own chip, and the list stays one list on one time filter:

| Case | Chip | The line under it |
|---|---|---|
| The assignment rule gave them the line | **New lead** (violet) | *assigned 2 days ago · Inbound — website* |
| Handed over once payment was confirmed | **Handed over** (amber) | *paid today · sold by Nikhil Sharma* |

- The chip is the only difference. Both kinds share the **Today · Last 3 days · This week · This month** filter and its counts, both rows open the product line, and the order is still newest first.
- The sales home is unchanged — a sales executive only ever has the first case.

## Changes in v25 — the sales home, rebuilt around today (23 Sep)

**[stated] The homepage answers one question: what do I have to do today.** A sales executive should not have to open another screen to find their work. The four tiles, the long section glosses and the running commentary are gone; what is left is four sections, in this order:

| Section | What is in it |
|---|---|
| **Newly assigned** | Lines assigned to you that **nobody has called yet**, with a time filter — **Today · Last 3 days · This week · This month**, each showing its count. The filter defaults to the narrowest band that has anything in it, so the section is never misleadingly empty |
| **Tasks** | One section with two sub-sections — **[stated] v27**: a segmented switch, **Due today** (default) and **Overdue**, each carrying its count, the overdue count in red. Row: task name · a state chip (*Due 14:00*, *Overdue by 2 days*, *Escalated · overdue by 5 days*) · account · product, and **Mark done**. Tasks due later stay off the homepage until their day. If nothing is due today and something is overdue, the switch opens on Overdue |
| **Action required** | Product lines where the next move is yours, with the next action in one line |
| **No activity in 30 days** | Open lines only — not won, not lost, not parked — showing account, product and **how many days** since the last activity |

- **[stated] Every product-line row opens its own line screen.** Task rows open the line the task hangs off; the Mark done button completes the task without leaving home.
- **[stated] Nothing else on the page** — no count tiles, no inline next-action buttons, no "with someone else" summary. Each section shows its count beside its name, the way a messenger shows unread.
- Wording cut back throughout: a row is *account · product* with one line of meta under it, and headings carry the count rather than a sentence explaining themselves.

**v27 — the look.** The page opens with *Good morning, <name>* and a date pill, then four cards. Each card carries a tinted icon, its name, and its control on the right: the time filter on Newly assigned, the Due today / Overdue switch on Tasks, a count chip on the other two. Rows are one line of *Account · Product* in ink with a second line of meta, a tick-button where a task can be closed, and a chevron where the row opens a line. The four flat tiles, the section glosses and the footnotes are gone.

## Changes in v28 — the RM home, same shape as sales (23 Sep)

**[stated] The RM home is now the sales home plus renewals.** Same greeting, same cards, same rows, same rules — only the contents differ:

| Card | On the RM's home |
|---|---|
| **Newly assigned** | Two kinds, on one time filter (Today · Last 3 days · This week · This month): a sales line of theirs nobody has called, and **an account handed over at payment** — each chipped (**v30**: *New lead* / *Handed over*), with *assigned N days ago · source* or *paid today · sold by <name>* |
| **Renewal management** | **[stated]** four buckets by how soon the policy expires — **Next 7 days · 8–30 days · 31–60 days · 61–90 days**, each with its count, defaulting to the first that has anything in it. A row is **account · product**, then the renewal line's **current stage** and **the date the renewal is due** (*Due 31 Aug 2026*), in red inside the first bucket — **[stated] v29**: the date, never *expired N days ago*. Overdue renewals sit in that first bucket. The row opens the renewal product line |
| **Tasks** | Identical to sales: Due today (default) · Overdue |
| **Action required** | Their lines where the next move is theirs — selling or post-purchase — and **service tickets waiting on their reply**, which open the ticket |
| **No activity in 30 days** | Identical to sales |

- The five tiles, the *Your desk* framing and the long glosses are gone; the renewals tile is replaced by the bucketed card, with the full list still a click away on **Renewals**.

## Changes in v24 — the opportunity container tightened (23 Sep)

- **[stated] *Add product line* only while the opportunity is open.** The button stays on the Opportunity screen but is **disabled** on a Parked, Won, Part won or Closed opportunity, with the reason in its tooltip — *a product line can only be added while the opportunity is open. This one reads won.* It is the same rule as the attach rule seen from the inside: nothing joins a finished conversation, by hand or automatically. A new requirement on that account starts a new opportunity.
- **[stated] The *Empty* opportunity status is gone.** An opportunity cannot exist without a product line — the create form makes the first one — so a status for "no lines yet" described a state the system cannot reach. The Opportunities list filters now read Open · Parked · Won · Part won · Closed only.
- Smoke test added for both: the button is disabled on the won opportunity **O-1083**, and no seeded opportunity resolves to *Empty*.
- Decisions recorded in `claude/ui/13-opportunity-attach-rules.md` (v6), which also carries the attach rules, the repeat-enquiry activity entry, and the status derivation these two changes follow from.

## Changes in v22–v23 (22 Sep)

- **[stated]** A renewal opportunity is named **Productline_Renewal_Month Year**, the month being when the expiring policy ends — e.g. *Marine Cargo_Renewal_Nov 2026*. Applies to every renewal the system opens.
- **[stated]** On the Overview the field is labelled **Business type** again (it was *Fresh or rollover* in v19–v21). A renewal line reads **Renewal**; a fresh line keeps its value, e.g. *Fresh · New Business*.

## Changes in v21 — a DAU renewal can be updated and re-checked (22 Sep)

**Decided [stated]:**

| Question | Decision |
|---|---|
| What the re-check looks at | **Sum insured above the rater's limit** — ₹25 Cr in the prototype. A rateable product stays DAU only while the sum insured is within it |
| Direction | **Only DAU → Non-DAU.** A Non-DAU renewal stays with placement whatever the details |
| Until when | **Until the QCR is sent** — only at Details Captured. After that the Update button is gone |
| Scope | **Renewals only.** Fresh lines are still classified by product |

**How it works.** On a DAU renewal at Details Captured the next action offers **Update details** (also on the Requirement tab). It opens the requirement, carried over, titled *Update the renewal details*. As the sum insured is typed, a note says **Stays DAU** or **This will become Non-DAU**. **Save and re-check the route**:
- within the limit → *Still DAU*; the rater re-prices from the updated details and the quotes are there as before;
- above the limit → the line becomes **Non-DAU at Details Captured**: the RFQ opens, carried over from the fresh buy (or pre-filled from the policy), with the updated sum insured and details; the tab shows *Switched from DAU — sum insured ₹X is above the rater's ₹25 Cr limit*; from there it is the Non-DAU renewal flow (client review or float).

**Consequence [derived]:** the same rule runs when the system opens a renewal line, so a rateable policy above ₹25 Cr opens as Non-DAU. The seeded Kalyan Fire policy was set to ₹24 Cr to stay DAU.

## Changes in v20 — the renewals pipeline (22 Sep)

**Decided [stated]:**

| Question | Decision |
|---|---|
| Who sees it | **RMs only** — a *Renewals* item in the RM's menu, between Pipeline and Opportunities |
| How a renewal line appears | **The system opens it 90 days before the policy expires** — its own renewal opportunity, linked to the expiring policy, owned by the account's RM. Nobody starts it by hand |
| Groups | **Overdue** (expired, not renewed) · **Due today** · **1–7 days** · **8–30 days** · **31–60 days** · **61–90 days** — each line in exactly one, by when the current policy expires |
| Where it starts | **Details Captured.** The requirement is carried over from the expiring policy; New Lead and Consultation are hidden on the stage bar |
| DAU | The rater's quotes are there at once; pick, send the QCR, and the flow continues as fresh buying |
| Non-DAU | **The RFQ from the fresh buy is carried over** — the RM can change any field, then **send it for client review** (the client changes what has changed, or approves) **or float it directly** once every required field is filled. Placement, QCR, confirmation and payment follow as fresh buying |

**What the screen shows.** Six band tiles with the count and the expiring premium (a tile filters to its band), pills for *Due in 90 days · Renewed · Not renewed*, and one table per band: renewal (product, line, DAU or Non-DAU), account, expiring policy and insurer, expiry date and days left, stage, waiting on, expiring premium. The nav badge counts renewals due within 7 days or overdue. RM Home's *Renewal management* now lists the renewal lines (with their band) and links here; *Start renewal* is gone.

**On the renewal line.** A *Renewal · expires [date]* chip in the header; *Renews* on the Overview with the days left; the RFQ tab says where the RFQ came from; the client's link reads as a renewal (*check it, change anything that has changed, and approve*).

**Carried over, and what is refreshed.** Requirement: sum insured and premium from the policy, the rest from the original line where one exists. RFQ: every field from the original line; the insured's name, sum insured, current insurer, its expiry and the new start date (the day after expiry) are refreshed. **Where the policy was not bought through the CRM**, the RFQ is pre-filled from the policy and the account and the rest is left to fill — *my default, not yet confirmed*.

**Also shown, from `lms-in-plain-english.md` ("the trap in renewals"):** an expiring policy that was endorsed carries *endorsed N times* on its row and a note on the renewal line to check the endorsements before quoting, since the policy record holds the cover as first issued.

**Seed:** eight renewal lines across Priya and Rohan covering every band — Meridian WC due today (payment with Ops), Sharma Burglary in 5 days (DAU, quotes in), Blue Harbour Marine in 21 days (Non-DAU, pre-filled from the policy), Kalyan Marine in 42 days (Non-DAU, RFQ carried over from last year's **OP-1874**), Kalyan Fire (Quote Sent) and Sharma Fire in 42–54 days, Novacast CGL **expired 21 days ago** (QCR back), Novacast WC in 80 days. Blue Harbour's Fire policy (expires 23 Dec) opens its renewal line when the clock is moved a week. A policy whose cancellation endorsement completed never gets one.

## Changes in v19 — Overview and Requirement without repeats (22 Sep)

What overlapped between *Overview › Captured at creation* (with its Requirement block) and the *Requirement* tab, and what was decided:

| Overlap | Decision [stated] |
|---|---|
| Sum insured, target premium and existing policy shown on both | **Removed from the Overview.** The requirement lives only on its tab |
| *Contact on this line* (Overview) and *Decision maker* (Requirement) — the same person | **One field: Contact on this line.** Decision maker is dropped from the Requirement tab |
| *Premium · estimate* (Overview) and *Target premium* (Requirement) — two numbers for one idea | **Target premium only.** The Overview shows no estimate; once the client confirms, it shows **Confirmed premium** |
| *PAN or GSTIN* (Requirement) and the Verified / Provisional tag on the account | **PAN or GSTIN dropped from the Requirement tab.** The tag stays; PAN is still asked in the capture form when missing |
| *Business type* (Fresh · New Business) read like *Type of business* (Manufacturing) | **Renamed on the Overview to "Fresh or rollover"** — reverted to *Business type* in v22 |

Not changed: turnover, type of business, nature of company, tenure and claims history stay in the requirement (the DAU rating inputs, 20 Sep). The capture-requirement form still shows the decision maker as a read-only line.

## Changes in v18 — stage names, payment mode, screenshot proof, the ticket screen (22 Sep)

- **[stated] No stage numbers next to stage names**, everywhere except Task rules (the configurator, simulator and rule sentences keep them, since conditions are written against them). The stage bar, captions, chips, pipeline filter, toasts and modal notes show the name only.
- **[stated] Renamed:** stage 3 *Consultation Call Done* → **Details Captured**; the short label of stage 10 → **Payment Details Shared** (full name stays *Payment Details Shared with Client*).
- **[stated] The payment mode is visible to the owner before anything goes to the client.** The mode chosen on the payment request (NEFT / RTGS · Payment link · Cheque · Proforma invoice) is carried on the line. The next-action card names it once Ops returns the details, and *Share with client* opens on a **Payment mode** band followed by the details for that mode (beneficiary, account, IFSC and quote reference for NEFT / RTGS; payee and what to write on the back for a cheque; the proforma and pay-by date; or the link and its validity), then Email / WhatsApp and the contact.
- **[stated] Payment proof is a payment screenshot only.** *Confirm payment* asks for an image upload (PNG, JPG or WebP; anything else is refused with a message). The amount and the UTR are read from the screenshot; if the amount cannot be read, the owner types it (UTR optional). The amount must match the request — part payments are refused. The handover note stays mandatory. The proof-type picker is gone. *(Reading the screenshot is simulated: "Use a sample screenshot" and "Make the amount unreadable".)*
- **[stated] The placement and payment ticket screen is redesigned.** Header: ticket type and desk, ticket ID, account, product, raised date, status chip. Then one **status panel** — who it is waiting on, one sentence of what is happening, the action that moves it (Answer the query · Review the QCR · Share with client · Confirm payment / Resend) and *Open the line* — with a horizontal track underneath (Raised → Query → QCR received → Sent to the client → Closed; or Raised → Ops prepares the details → Sent to the client → Paid), each step dated. Below, the ticket's key details: for placement, the query and your reply, the QCR report card(s) and *What went to placement* (route, sum insured, target premium, exclusive mandate, insurers, round, note to placement, View the RFQ); for payment, the payment mode and amount, what it covers, insurer and recipient, the details from Ops (or "Ops is preparing…") with whether they have been sent, and after payment the proof (screenshot, amount and how it was read, UTR, handover note). An **Activity** list that is never empty, and on the side *On the line* and *People* (desk, client contact, owner). The track stacks vertically on a phone.
- Fixes found on the way: a placement ticket on a closed line (e.g. No Appetite) now reads **Closed** instead of Open with a live query; a placement ticket stays **open at Quote Sent** and closes when the client confirms, as the spec says (it had been shown Closed at Quote Sent); seeded RFQ dates now sit before the stage the line is in; a two-column detail grid no longer collapses into one row.

## Changes in v17 — the QCR is a report (22 Sep)

- **[stated] The QCR is a report of the quotes, not a list of them.** Wherever a QCR appears — the RFQ & quotes tab, the placement ticket — it is a *Quote Comparison Report* card (version, status, insurers compared, premium range) that opens the report. The report is a document: prepared for, product, sum insured, policy period, prepared by, reference; one column per insurer comparing premium, sum insured, scope of cover, deductible, add-ons, exclusions to note, claim settlement ratio and validity; the insurers approached who declined or did not respond; and a note that it names no preferred insurer. *(Per-insurer terms are prototype stand-ins.)*
- **[stated] *Review the QCR* opens the report** with **Send to [contact]** as the primary action and **Send back for revision** as the secondary. Sending emails it to the line's contact and moves the line to 8; sending back opens the revision form and returns the line to 6 for a new version. A QCR already sent opens read-only.
- Once the RFQ is floated, the tab leads with the QCR; the RFQ folds into a one-line *Request for quote* card that expands to show what placement received.
- The DAU rater's quotes are still listed at stage 3, where the owner picks which go into the QCR; after sending, the DAU line shows the QCR report card.

## Changes in v16 — a simpler RFQ screen (22 Sep)

- **[stated] After requirement capture the next action is *Fill the RFQ*** (it opens the RFQ & quotes tab), with *Send for client review* as the secondary action. Once every required detail is filled the card offers *Send for client review* and *Float to placement*.
- **[stated] The RFQ tab is the form and one footer.** The footer stays pinned to the bottom of the screen while the form scrolls: with required details still empty it shows progress (*8 of 11 required details filled*) and **one secondary button — Send for client review**; once everything required is filled it shows **two primary buttons — Send for client review and Float to placement**. After sharing, approval and floating, the same footer carries the status and the next action (Copy link · Resend email · Float to placement).
- **[stated] Removed:** the missing-field chips, *Fill from an Excel*, and the pre-filled / owner / client marks on fields. Who filled each value is still recorded in the data; it is simply not shown.

## Changes in v15 — a fresh non-DAU case to demo (22 Sep)

- New seed: **Kaveri Polymers Pvt Ltd · Commercial General Liability** (OP-2335, opportunity O-1088), an inbound website lead in **Nikhil's** pipeline at **1 · New Lead**, with its *Call the new lead* task. It shows under *Newly assigned* on his Home.
- Its path: *First Contact* → *Discovery complete, requirement captured* → classified **non-DAU** → stage 3 with the RFQ open on screen, pre-filled from the account and the requirement, and three required details left (cover start date, limit of liability, revenue outside India). From there: send for client review, or fill them and float directly.

## Changes in v14 — the stage bar shows only the path the line will take (22 Sep)

- **[stated] Skipped steps are hidden, not struck through.** Before the route is known the bar shows all eleven selling steps. Once the system knows the route it drops the steps the line will not pass through: a DAU line shows 1 · 2 · 3 · 8 · 9 · 10 · 11; a non-DAU line floated directly shows 1 · 2 · 3 · 6 … 11. Steps keep their spine numbers.
- **[stated] The RM's post-purchase steps appear only from Payment Completed.** Before that the bar is selling only.
- **[stated] After payment** the selling phase collapses to one *Sold · Payment Completed* block (with the seller and the paid date), and the RM's steps 12 → 13 → 14 take the rest of the bar.
- The caption no longer says "of 14", since the bar no longer shows fourteen steps.

## Changes in v13 — non-DAU RFQ, reworked after review (22 Sep)

- **The RFQ screen is redesigned** — less text, one obvious next step. A four-step track (Fill → Client review → Approved → Floated), a required-fields progress bar, one action bar whose colour and buttons follow the state, the missing required fields listed as chips that jump to the field, and a coloured dot per field for who filled it (hover for the name) instead of a line of text under every field.
- **Actions** [stated]: with every required field filled the owner has **Float to placement** and **Send for client review** side by side; with any required field empty, only **Send for client review**. Float opens the float form, which creates the placement ticket.
- **Send for client review is one click** [stated]: the email goes to the line's contact at once and the stage moves to **4** when it is sent. **Copy link** (also on the toast) and **Resend email** sit in the action bar.
- **The client's link is a page of its own** [stated]: it shows the form as the owner filled it; required details still empty are shown first, for the client to fill; the client can change any field; **Approve** appears once every required field is filled. Approving moves the line to **5 · RFQ Verified by Client** and the owner gets **Float to placement**. In the prototype the amber *Open the client's link* opens it full-screen as the client would see it.

## Changes in v12 — DAU skips the RFQ; the RFQ becomes one shared form (22 Sep)

Decided 22 Sep 2026. This reverses the 18 Sep position in `00-revised-spine.md` §4 (every line gets an RFQ; the system classifies at stage 5 from the submitted RFQ).

- **Classification at requirement capture.** When the requirement is captured, the system reads it and classifies the line DAU or non-DAU. Before that the route is unknown. *(What in the requirement decides it is still open — the prototype uses the product as a stand-in.)*
- **DAU — no RFQ.** The rater prices the line from the requirement straight away. The owner sees the rater's quotes on the RFQ & quotes tab at **stage 3**, picks one or more, and sends the QCR — the line jumps **3 → 8 Quote Sent**; stages 4–7 show as skipped. From the client's approval on, nothing changes (8 → 9 Purchase Requested …).
- **DAU with no usable quotes switches to the RFQ route.** Two ways in: the rater returns no quotes (the line stays at 3 and the RFQ opens), or the client **rejects every quote** at stage 8 (new action on the line; the line goes **back to 3 as non-DAU** with the RFQ open, pre-filled from the requirement; the rejected DAU QCR stays on record, marked rejected). The route chip reads *Placement · switched from DAU*.
- **Non-DAU — the RFQ renders on screen.** It opens at stage 3, pre-filled from the requirement and the account, with every field marked by who filled it (pre-filled · the owner · the client · from Excel). The owner fills what they know, then either:
  - **floats it straight to placement** — allowed only once every required field is filled; **3 → 6**, stages 4 and 5 show as skipped; or
  - **sends it for client review** — **3 → 4 RFQ Shared for Client Review**. The client's link opens **the same form**: they see what the owner filled and complete the gaps; what either side types shows on both. The client can send it back only when every required field is filled — **5 RFQ Verified by Client** — and the owner floats it (**5 → 6**). Placement's workflow is unchanged.
- **Stages 4 and 5 renamed:** *RFQ Requested from Client* → **RFQ Shared for Client Review**; *RFQ Received from Client* → **RFQ Verified by Client**.
- **Who acts:** whoever owns the line — the sales executive while selling, or an RM selling on their own account. Ownership is unchanged.
- **Fill from an Excel** stays (confirmed 22 Sep): at stages 3–4 it fills only the empty fields (marked *From Excel*) and does not move the stage.
- **While the RFQ is with the client** (stage 4) the owner can keep editing but cannot float it until the client sends it back (confirmed 22 Sep).
- Spec docs `00-revised-spine.md` (v2), `02-rfq-flow.md` (v5) and `08-stage-gates-and-dispositions.md` (v4) are updated to match.
- **Prototype stand-ins:** the RFQ field set per product family (property, marine, liability, group health, workmen's compensation) is [proposed]; the client's link is simulated by an amber-dashed *Open the client's link — fill it as the client* and *Client fills the rest and sends it back*; *The rater comes back empty* simulates a DAU line with no quotes.

## Changes in v11 (22 Sep)

- Saving a rule no longer fires it; it is tested from the next change on a line or its next scheduled check. The builder's *Complete* note and the save toast say so.
- *Change status* and *Reassign* live only on the Manage tab of the product line; the header carries only *Take it over* / *Hand back* for managers.

## Changes in v10 — Task rules, the configurator (22 Sep)

The Task rules screen is now the v3 configurator, merged from the standalone *BimaSales Task Rules* prototype and wired to the CRM's own lines, tasks and clock. A rule is a **condition set, not a trigger**: it fires when its conditions are true, built from **stage · line status · latest call (a disposition or "any No connect / any Connected") · a task name and its state (Pending / Overdue / Escalated / Done)**, joined with AND inside a group and OR between groups. It is tested the moment something changes on a line, and again at its hourly or daily check when the clock moves. It creates its task once each time its conditions turn from false to true; with **Repeat** on, it creates again once the last task is done and the **wait** has passed (optional **maximum**); a task the owner leaves open blocks the next one from the same rule. **Close when** lets a rule close its own tasks (closed "by the system", with the reason on the task). Filters (products, DAU / placement, new business / renewal, owned by anyone / named people / a group), class SLA / Follow-up with the two clocks, active from / until and a season tag are unchanged from v2.

- **Rules** — the list (rule · when and closes when · task · clocks · runs · active), with fired counts and warnings per rule; toggling off keeps history and tasks; deleting is not offered. *Create a task rule* is the top-bar CTA.
- **Builder** — live sentence, worked example on a real line with the created / due / escalates moments, "before it can be saved" errors (unique task titles, a task name on every Task condition, an escalation clock on every SLA) and "worth a second look" warnings (two stages in one AND group, a wait with no check, hours on a daily check, repeat with no maximum, a DAU/placement filter on stage 1–2). Renaming a task title carries through to conditions in other rules. Duplicate.
- **Simulator** — the prototype's own lines and clock, not a stand-in: pick a product line, move the clock (+30 min · next hourly check · next daily check · +1 day · +1 week), act as its owner (move the stage, log a call, set the status — amber-dashed because it is a stand-in for the owner), see the tasks on the line, *What happened* (the engine's log — created / closed by the system / overdue / escalated / clock moved, this line or all lines) and *Every rule, against this line* with each condition ticked or crossed and why a task was or was not created (task open · waiting until · already created for this turn · maximum reached · not for this line · conditions false).
- **Task settings** — one central calendar: working hours, the daily-check hour, holidays (add / remove). The hourly check runs on the hour in working hours, the daily at the chosen hour, working days only.
- **Seeded rules** — TR-01…TR-10 rewritten as condition sets (TR-01 chase the new lead closes when the line leaves stage 1; TR-02 / TR-04 / TR-06 close when the line leaves the stage; TR-03 callback closes when the next call is logged; TR-09 chase the form and mandate now repeats daily after a 1-day wait, max 3, closes when the line leaves stage 12) plus three chains only the condition model can express: **TR-11** Follow-up call after no connect (stage 2 · latest call any No connect · wait 4 h · repeat · closes on a connected call or a stage move), **TR-12** Quote sent · follow-up (stage 8 · wait 1 day · repeats daily · closes when the line leaves stage 8), **TR-13** Time Pending · revisit (status Time Pending · wait 5 days · repeats). There is no attempt ladder and nothing auto-closes a line.
- **Engine** — per line and rule the prototype keeps the "turn" (conditions went true when, task already made for this turn, count). Every event on a line (stage move, call, status change, task completed) runs the rules on that line; the clock controls run the checks on every live line. **Saving a rule does not fire it** (decided 22 Sep, v11): a new or edited rule is first tested at the next change on a line or at its next hourly / daily check. The seed is primed so that the tasks it already carries count as their rules' turns.

## Changes in v5–v9 (21–22 Sep)

- **Tickets** is one screen for everyone (Needs you · Open · Closed · All × Placement · Payment · Post-purchase · Endorsement · Claim); *Raise request* is its top-bar CTA; *Add task* is the Tasks screen's. **New opportunity** is the CTA only where creating one makes sense.
- **Product line:** tickets moved to their own **Tickets** tab and activity to the **Activity** tab (Overview ends at the requirement); **RFQ & quotes** shows the final RFQ (link or Excel, preview / download) and every QCR version with its status, then the comparison for the latest version; the **stepper** is a two-phase track — Selling (1–11, the seller) → RM → Post-purchase (12–14, the RM) — stacked below 1180 px.
- **Opportunity:** the payment section is a **Payment** button, active only when a product line is at Purchase Requested and owned by the person (otherwise it says why); the activity card is gone.
- **RM Home** is five sections: **Newly assigned · Renewal management (Start renewal creates a Renewal opportunity and line at stage 1 with the requirement pre-filled) · Overdue tasks · Action required · No activity in 30 days.**
- First-contact rules from feedback round 1: stage-1 action is **First Contact**; discovery can complete on the first contact (1 → 3); DAU / Non-DAU is classified only at requirement capture; no six-call ladder; **Opportunities** in the left nav.

## Changes in v4 — the RM side (22 Sep)

- **The product line runs to 14 stages** (R-9, R-10): 11 Payment Completed → 12 Policy Documents Pending → 13 Awaiting Policy Copy → 14 Policy Copy Sent to Client. Ownership moves to the RM at 11 (orange marker on the stepper). Every move after 11 is a ticket event; the RM never moves a stage except indirectly by uploading the offline proposal form. Skip 11 → 13 when nothing applies.
- **The post-purchase ticket (ISS-xxxx, BimaOps, Customer Success — Radha Iyer)** is created at Payment Completed and carried on the line: rows for RHL (system-generated / from insurer by email / not required), proposal form (digitised / offline PDF / not required), mandate (always, unless **on file** — the mandate register is checked at creation, R-6), then policy copy + tax invoice. Status · sub-status · follow-up count per row; three rails on every delivery; ticket stages New → Document Collection or Proposal form Pending → Awaiting Policy copy → Closed / Withdrawn. Mail trail in three threads (client from a generic address naming the RM, R-8; RM ↔ desk; insurer). Document vault. Manage-ticket actions are the desk's and are shown as such.
- **Waiting-on gains Insurer and Post-purchase.** Inside stage 12 it is derived from the rows: Client wins; the RM when an offline form is received but not uploaded; Insurer when only the RHL is pending. Stage 13: Insurer, or Post-purchase while the copy is in QC (R-5).
- **Two new people.** *Rohan Desai* (second RM) and *Meera Pillai* (head of relationship management). Priya's manager is Meera. Accounts with policies in force are RM-owned (Sharma → Priya; Novacast, Blue Harbour → Rohan).
- **The RM does sales and RM work.** The RM has the full sales toolkit on lines they own (cross-sell and renewal on their accounts — Priya's Kalyan · Cyber, Meridian · D&O; Rohan's Blue Harbour renewal), *New opportunity* is available to them, and their Pipeline shows Selling · Post-purchase · Issued side by side.
- **RM Home — "Your desk"** (rm-workflow §5): *On me* (welcome calls, chases past their date, offline forms to upload, policy explanation calls, service queries, sales lines that need them) · *With the client* (forms and mandates Shared with client · Pending, days waiting, next follow-up; sales lines waiting on the client) · *With the insurer or post-purchase* (watch only) · *Renewals* (P1 ≤30 d, P2 ≤60 d) · *Service tickets*.
- **RM actions on a post-purchase line:** welcome call (outcomes incl. signatory named, cannot access Bimakendra — urgent, relayed to the desk), **one chase for form + mandate** with the §4.3 outcomes (by a date → follow-up moves; question → relayed to the desk's RM thread; signatory unavailable; can't access; offline form received; no response → counts toward escalation), **upload the offline proposal form** (with an incomplete-form error state), re-share a link or document (send logged, open item 7 = yes), policy explanation call. Logging the welcome or explanation call completes its SLA task.
- **Handover packet** on the line (rm-workflow §2.1): sold by, mandatory handover note (now required on Confirm payment), decision maker, insurer and premium, RFQ · QCR · quote, KYC documents, payment proof and UTR, ticket reference.
- **RM head view — "RM team":** tiles (escalated to you · forms past follow-up · with insurer or desk · renewals P1), *Needs your attention* (escalated tasks, closable; lines stuck — >1 day unassigned, >5 days collecting, >3 days awaiting copy [proposed] — with Take it over), *Post-purchase by who must act* (Client / Insurer-or-desk / On the RM / All, per RM), *People* (accounts, post-purchase, with client, awaiting copy, on them, issued 30 d, selling, service, renewals, escalated, premium in force), *Renewals in 60 days*, *The book*. Task rules are open to the head of RM (the RM clocks live there).
- **Three seeded RM rules** [proposed], editable in Task rules: TR-08 Welcome call (stage 11, SLA 1 wd, escalate +1 wd), TR-09 Chase the proposal form and mandate (stage 12, Follow-up 2 wd; from v10 repeats daily after a 1-day wait, max 3), TR-10 Policy explanation call (stage 14, SLA 2 wd, escalate +1 wd).
- **Simulated events** on a post-purchase line: desk assigns the ticket; insurer sends the RHL (bot); desk follow-up to the insurer; client fills the form / signs the mandate on Bimakendra; client sends the filled offline form; insurer sends the policy copy (bot); desk follow-up / escalation (3 + 3, then Ops outside the ticket); desk passes QC and sends to the client (writes the policy record and period — T-7); insurer wants a corrected form (13 → 12, T-8); client withdraws (status Withdrawn, stage frozen, no refund path — R-4, open item 11).
- Service tickets are scoped to the account's RM (raise, reply, upload, withdraw); the head of RM sees the team's; sales sees them read-only.

## Prototype stand-ins carried as [proposed]

| Rule | Stand-in in the prototype |
|---|---|
| RHL master | ICICI Lombard, Bajaj Allianz, HDFC Ergo → system-generated; New India, Oriental, Tata AIG, United India, Reliance → requested from the insurer by email; Group Health, D&O, PI, Cyber → no RHL |
| Proposal-form master | Marine Cargo → offline insurer PDF; Workmen's Compensation → not required; everything else digitised on Bimakendra |
| Mandate scope (M-1 to M-3) | One mandate per account per insurer, no expiry, signed at account level |
| RM clocks | TR-08 / TR-09 / TR-10 above; escalation after 3 "no response" chases [open] |
| Working calendar | Mon–Fri 10:00–19:00, daily check 10:00, five holidays — editable in Task settings |
| Example chains TR-11 / TR-12 / TR-13 | examples of the condition model, not the agreed cadence |
| Stuck thresholds on the head's view | >1 working day unassigned, >5 days in stage 12, >3 days in stage 13 |
| One ISS ticket | per product line (open item 8) |
| DAU / Non-DAU at requirement capture | by product |
| RFQ field set | per product family — property, marine, liability, group health, workmen's compensation |

---

## 1 · Roles

Pick a person on sign-in; switch from the avatar card at any time. Same data, different chair.

| Person | Role | What they see | What they can do |
|---|---|---|---|
| **Nikhil Sharma** | Sales executive (P&C) | Home · Pipeline · Opportunities · Accounts · Tasks · Tickets | Work his own lines to Payment Completed, create opportunities, add lines, raise placement/payment tickets, tasks |
| **Vikram Rao** | Sales manager | Team · My own book · Opportunities · Accounts · My tasks · Tickets · Task rules | Sees every sales line, acts on none — except closing escalated tasks, taking a line over (audited), hand-back, and the rule configurator (rules · simulator · task settings) |
| **Priya Nair** · **Rohan Desai** | Relationship managers | Home · Pipeline · Opportunities · Accounts · Tickets · Tasks | Own accounts after the sale: welcome call, chase the client for the proposal form and mandate, upload the offline form, policy explanation call; raise and follow endorsements and claims; **sell** on their own accounts with the full sales toolkit |
| **Meera Pillai** | Head of RM | Team · Opportunities · Accounts · Tickets · My tasks · Task rules | Sees every RM's post-purchase lines, renewals and service tickets; closes escalations, takes a line over, sets the RM clocks |

Ownership sits on the **product line**; the account's owner becomes the RM at Payment Completed. Anyone opening someone else's line gets a read-only banner that says who owns it and why — the salesperson sees "Sold by you" on a line they handed over.

---

## 2 · Screens

### Sales executive
- **Home — "What needs you"**, **Pipeline**, **Opportunities**, **Product line workspace** (two-phase stepper, stage clock, next-action card, tabs Overview · Post-purchase (after payment) · Requirement · RFQ & quotes · Tickets · Activity · Tasks · Manage), **Opportunity** (Payment button), **Accounts finder**, **Account 360** (incl. "In the post-purchase ticket" and policies in *Issuing*), **Tasks** (CTA Add task), **Tickets** (one screen: placement · payment · post-purchase · endorsement · claim, CTA Raise request, with the ticket-flow screen for each), **Create opportunity**, **Search**.

### Sales manager
- **Team** (Won = paid in the last 30 days), **Task rules** — Rules · Builder · Simulator · Task settings (v10 above).

### Relationship manager
- **Home** — Newly assigned · Renewal management · Overdue tasks · Action required · No activity in 30 days, **Pipeline** (Selling · Post-purchase · Issued · Parked · Closed · All), **Opportunities**, **Accounts** (Mine = owned or selling on), **Tasks**, **Tickets** (post-purchase, endorsements and claims on the RM's accounts alongside placement/payment on the RM's sales lines; raise on own accounts).
- **Product line at stages 11–14:** the Post-purchase tab (requirement rows, handover packet, mail trail, manage-ticket), the RM next-action card, the desk/client/insurer simulations. **ISS ticket screen:** flow, requirements, document vault, mail trail.
- **Raise a ticket · Service ticket detail** — as in v2, scoped to the account's RM.

### Head of RM
- **RM team** as described above; Accounts and Opportunities scoped to the team; Tickets (the team's); Task rules (the same configurator — the RM clocks live there).

---

## 3 · Every action, and what it writes

| Action | Where | Effect |
|---|---|---|
| First Contact / Log call · Capture requirement (classifies DAU / Non-DAU; DAU gets rater quotes, non-DAU gets the RFQ on screen) · Float · Answer query · QCR · Confirm · KYC · Payment request · Share · Change status · Resume · Reassign · Take over · Hand back · Add line · Create opportunity · Add contact · Add / complete task · Endorsement / claim lifecycle | as in v2/v3 | unchanged — every one of these now also runs the task rules on the line |
| Create / save a rule · toggle · Task settings | Task rules | Rule saved; nothing is created at save — it fires from the next change on a line or its next scheduled check. Settings change the shared calendar |
| Simulator: move the clock · move the stage · log a call · set the status | Task rules › Simulator | Real writes on the chosen line, logged as the simulator acting for the owner; the clock runs every hourly / daily check up to the target |
| Fill the RFQ · Send for client review · Float directly (3 → 6) · Float after review (5 → 6) · Fill from an Excel | Line › RFQ & quotes | Field-level writes with who filled each field; stage moves as in v12 above |
| Client rejected every quote (DAU) | Line at 8 | Route switches to non-DAU, line back to 3, RFQ opens pre-filled, DAU QCR kept as rejected |
| Start renewal | RM Home | Renewal opportunity + line at stage 1 with the requirement pre-filled from the policy |
| **Confirm payment** | Line · payment ticket | Needs the **payment screenshot** (amount and UTR read from it, or the amount typed if it cannot be read; must match the request) and a **handover note**. Line → 11; owner → the account's RM (or the least-loaded RM); account owner → RM; open tasks move; **ISS ticket created**, policy record in *Issuing*; welcome-call rule fires for the RM |
| Welcome call | Post-purchase line | Logged; completes the TR-08 task; signatory noted; access problem relayed to the desk |
| Log chase | Post-purchase line | Increments the pending rows' follow-up counts; outcome drives the follow-up date, a relay to the desk, the offline-form flag or the no-response counter |
| Upload proposal form | Post-purchase line / ISS ticket | Row Completed; if it was the last requirement, the copy is requested and the line moves 12 → 13 |
| Re-share | Post-purchase line | Logged on the client thread |
| Policy explanation call | Issued line | Logged; completes the TR-10 task |
| Simulated desk / client / insurer events | Post-purchase line, ISS ticket | Assign · RHL · form · mandate (writes the register) · offline form received · policy copy · follow-ups / escalations · QC and send (line → 14, policy record written) · correction (13 → 12) · withdraw (Withdrawn, frozen) |

---

## 4 · Error and empty states built in

As in v2, plus: mandatory handover note on Confirm payment; incomplete offline proposal form; follow-up date in the past; "cannot access Bimakendra" urgent state; read-only for the salesperson who sold the line and for the head of RM; withdrawn line (frozen, no refund path); RM cannot raise a service ticket on an account they do not own; empty RM Home, RM team, Pipeline pills.

---

## 5 · How to demo the RM side in ten minutes

1. Sign in as **Nikhil**, take **Gokhale Textiles · Fire** through to Confirm payment (write the handover note). Note the "Sold by you" banner and the ISS ticket on the line.
2. Switch to **Priya**. Home: *On me* has the welcome call and an overdue chase. Open **Sharma Industries · D&O** (stage 11): log the welcome call → simulate *desk assigns the ticket* → stage 12, waiting on Client, links out → log a chase with a date → simulate *client fills the form* and *signs the mandate* → stage 13 → simulate *insurer sends the policy copy* → in QC → *desk passes QC* → stage 14, policy record written → log the policy explanation call.
3. Switch to **Rohan**. Open **Novacast · Marine** — the client sent the filled offline form; upload it. Open the **ISS-0433** ticket for the flow and the three mail threads.
4. As Priya, open **Kalyan Logistics · CGL** and simulate *client withdraws*.
5. As Priya, **New opportunity** on Kalyan (PAN `AAECK9912J`) — the RM sells on her own account; the line runs the sales spine under her.
6. Switch to **Meera**: RM team — forms past follow-up, the stuck line, the People table; take a line over; open **Task rules** and change a welcome-call clock.
7. Switch to **Vikram**: **Task rules › Simulator**, pick *OP-2203 · Sharma · Fire* (last call: ringing, no answer), press *+1 working day* — TR-11 creates *Follow-up call* for Nikhil at the hourly check; move the stage to 3 — the system closes it (Close when). Open **TR-12** to see repeat + wait + close when in the builder; create a rule with an OR group and watch the sentence.

---

## 6 · What is synthetic

Companies, people, PANs, GSTINs, premiums, quotes, insurer responses, Probe42 and Bimanetra data, telephony / OCR / rater / email-bot results, every desk reply, and the masters above. Placement, Ops, Customer Success and the service desk are faked by the amber-dashed buttons.

## 7 · Open questions and assumptions

- What in the captured requirement decides DAU vs non-DAU (product, captured fields, or the rater)?
- The real RFQ field set per product, and which fields are required.
- Mandate scope, expiry and signing entity (M-1 to M-3); legacy mandates; who marks a mandate revoked.
- RM clocks and the escalation count; stuck thresholds on the head's view; the real follow-up cadences behind TR-11 / TR-12 / TR-13 (built as examples).
- The RHL and proposal-form masters.
- Where client replies to the generic address land (open item 4a); whether the RM can re-trigger a system send (built as yes, logged).
- Pipeline layout; which activities reset the quiet clock; due-today outside working hours; inbound assignment = least-loaded in category; endorsement and claim phase lists; withdrawal window on service tickets.
