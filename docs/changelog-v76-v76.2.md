# BimaSetu prototype — changelog v76 → v76.2 (Vercel update)

**Vercel link today:** https://bima-setu-rho.vercel.app/ runs **v76** (investor demo). Storage key `bksales.v26`.
**Update to:** **v76.2** (prototype artifact Version 127). Storage key unchanged (`bksales.v26`).
**File to deploy:** `index.html` (sent with this changelog).

---

## What changed

### 1. Quote prices follow the captured details (v76.1)
- The rater (DUA) and placement (Non-DUA) now price from the requirement captured on the opportunity:
  - **Workmen's Compensation:** annual wages (number of workers × monthly salary × 12), and the medical cover chosen.
  - **Cyber and every other product:** the sum insured / cover amount.
- With the demo values, prices are the same as before (e.g. ICICI Lombard ₹3,18,400 on WC, New India ₹3,05,900 on Cyber).
- Each round keeps the prices and the details it was quoted on. QCR v1 still shows its own premiums and sum insured after QCR v2 goes out.

### 2. Out-of-date quotes are flagged — DUA, Details Captured (v76.1)
- If the requirement is edited after the rater has priced the opportunity, the quotes are marked **out of date**.
- The next action becomes **Get fresh quotes**. It shows the old and new premium for each insurer.
- The RFQ & quotes tab shows an "Out of date" banner on the rater's quotes.
- The QCR cannot be sent until the quotes are refreshed.

### 3. Change details and re-quote — DUA, Quote Sent (v76.1, v76.2)
- New **Change details and re-quote** button on the Requirement section (Overview) and in the next action, while the QCR is with the client.
- It opens the requirement form. **No reason is asked (v76.2).**
- Saving:
  - moves the opportunity back to **Details Captured**,
  - runs the rater again on the new details,
  - opens quote selection, and the QCR goes out as the **next version** (v2, v3…).
- Activity log: "Details changed after QCR v1", then "Fresh quotes from the rater — round 2 on the changed details".
- A follow-up logged as **Asked for changes** on a DUA line now opens this form (it used to open "Client rejected every quote").

### 4. Changed cover on Non-DUA — Revise (v76.1)
- **Revise** with "Changed sum insured or cover" now opens the requirement form straight after the request.
- The requirement stays editable until placement returns the next round.
- Placement's next round is priced on the new details (e.g. Cyber ₹10 Cr → ₹15 Cr: New India ₹3,05,900 → ₹4,23,050).

### 5. Fill sample data on the re-quote form (v76.1)
- On **Change details and re-quote**, Fill sample data changes one number: WC adds 100 workers; Cyber moves the cover to ₹15 Cr.

---

## Check after deploying
- [ ] Open the Vercel link and press **Reset** (clears data from the earlier version in this browser).
- [ ] WC: walk to Quote Sent → **Change details and re-quote** → Fill sample data → Save → quote selection shows new prices → send QCR v2.
- [ ] Open QCR v1 and v2 on the RFQ & quotes tab — each shows its own premiums and sum insured.
- [ ] WC at Details Captured (after quotes, before QCR): Edit the requirement → next action reads "The requirement changed — the quotes are out of date" → **Get fresh quotes**.
- [ ] Cyber at Quotes Received: **Revise** → "Changed sum insured or cover" → requirement form opens → change cover → placement returns round 2 at the new price.

## Note on pricing
The price model is a prototype stand-in: base prices scale with annual wages (WC) or with the cover (other products). The real rater and placement return their own prices.
