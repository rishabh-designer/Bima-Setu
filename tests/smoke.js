const { chromium } = require('playwright');
/*
 * Smoke tests for the v75 prototype. Drives the built page in a real browser:
 * every person, every screen and tab, and the flows v48–v75 added or changed
 * (docs/changelog-v48-v64.md, -v64-v73.md, -v73-v75.md), plus the repo fixes in
 * app/repo-fixes.*. The seed is reset between scenarios, so each one starts from
 * the same records. Stage numbers follow the v73 spine (15 stages).
 */
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + ' @ ' + String(e.stack||'').split('\n').slice(0,3).join(' / ')));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(...a);
  const fail = (m) => { console.log('FAIL', m); process.exitCode = 1; };
  await page.goto('file://' + require('path').resolve(__dirname, '../public/index.html'));
  await page.waitForTimeout(300);
  const txt = async () => page.evaluate(() => ['app','ovl','toasts'].map(id => (document.getElementById(id)||{}).innerText||'').join(' '));
  const click = async (sel) => { const el = await page.$(sel); if (!el) { fail('missing ' + sel); return false; } try { await el.click({ timeout: 4000 }); } catch (e) { fail('click ' + sel + ': ' + e.message.replace(/\n/g,' | ')); return false; } await page.waitForTimeout(120); return true; };
  const fill = async (sel, v) => { await page.fill(sel, v); await page.dispatchEvent(sel, 'change'); await page.waitForTimeout(60); };
  const pick = async (sel, v) => { await page.selectOption(sel, v); await page.waitForTimeout(60); };
  const has = async (s) => (await txt()).includes(s);
  const expect = async (s, ctx) => { if (!(await has(s))) fail((ctx || '') + ' expected text: ' + s); };
  const expectNot = async (s, ctx) => { if (await has(s)) fail((ctx || '') + ' unexpected text: ' + s); };
  const stage = async (id) => page.evaluate((id) => lineById(id).stage, id);
  const expectStage = async (id, n, ctx) => { const s = await stage(id); if (s !== n) fail(`${ctx}: ${id} at stage ${s}, expected ${n}`); };
  const signIn = async (who) => { if (await page.$('[data-switch]')) await click('[data-switch]'); await click(`[data-signin="${who}"]`); };
  const openLine = async (id) => { await page.evaluate((id) => go('line', { id }), id); await page.waitForTimeout(100); };
  const reseed = async () => { await click('[data-reset]'); await page.waitForTimeout(150); };
  const CHOLA = 'Cholamandalam MS General Insurance';

  // ---- sign-in: nine people — the ABM team joins [v75], Admin [v65], Rohan gone [v64] ----
  const personas = await page.$$eval('[data-signin]', e => e.map(x => x.dataset.signin).join(','));
  const ROSTER = 'arjun,kavya,sneha,rahul,nikhil,vikram,priya,meera,admin';
  if (personas !== ROSTER) fail('sign-in should offer ' + ROSTER + ', got ' + personas);
  await expectNot('Rohan', 'sign-in');
  await click('[data-signin="nikhil"]');
  await expect('Good morning', 'home');
  await expect('Newly assigned', 'home');
  log('sign-in ok');

  // ---- website-lead priority P0–P3 [v62]; a drop-off opens where the customer stopped [v74 §5] ----
  const placed = await page.evaluate(() => S.data.lines.filter(l => l.src === 'Website' && l.drop).map(l => [l.id, l.stage, webDropStage(l.drop, acctOf(l).prov)]));
  if (placed.length < 10) fail('expected the seeded website drop-offs, got ' + placed.length);
  for (const [id, st, want] of placed) if (st !== want) fail(`${id} should open at stage ${want} for its drop-off, is at ${st}`);
  const late = await page.evaluate(() => ['OP-2145', 'OP-2146'].map(id => webPrio(lineById(id)) + '@' + lineById(id).stage).join(','));
  if (late !== 'P0@9,P0@10') fail('KYC documents submitted and Payment failed should be P0 at stages 9 and 10, got ' + late);
  const prios = await page.$$eval('#h-fresh .row[data-go="line"]', rows => rows.map(r => {   // the Newly assigned card
    const c = [...r.querySelectorAll('.chip')].find(c => /^P[0-3]$/.test(c.innerText.trim()));
    return c ? c.innerText.trim() + ':' + c.className : '';
  }).filter(Boolean));
  if (!prios.length) fail('Newly assigned should carry priority badges');
  const ranks = prios.map(p => +p[1]);
  if (ranks.some((r, i) => i && r < ranks[i - 1])) fail('Newly assigned should be sorted P0 → P3, got ' + prios.map(p => p.split(':')[0]).join(','));
  const colour = { P0: 'red', P1: 'amber', P2: 'violet', P3: 'neutral' };
  await click('[data-nav="pipeline"]');
  prios.push(...await page.$$eval('.row[data-go="line"]', rows => rows.map(r => { const c = [...r.querySelectorAll('.chip')].find(c => /^P[0-3]$/.test(c.innerText.trim())); return c ? c.innerText.trim() + ':' + c.className : ''; }).filter(Boolean)));
  for (const p of prios) { const [lv, cls] = p.split(':'); if (!cls.split(' ').includes(colour[lv])) fail(`${lv} badge should be ${colour[lv]}: ${cls}`); }
  if (!(await has('P0'))) fail('pipeline should show the priority badge');
  const pipeOrder = await page.$$eval('.row[data-go="line"]', rows => rows.map(r => { const l = lineById(r.dataset.id); return l ? [l.stage, webPrioRank(l)] : null; }).filter(Boolean));
  for (let i = 1; i < pipeOrder.length; i++) if (pipeOrder[i][0] === pipeOrder[i-1][0] && pipeOrder[i][1] < pipeOrder[i-1][1]) { fail('pipeline not sorted by priority within a stage at row ' + i); break; }
  log('priority ok');

  // ---- nav ----
  for (const v of ['pipeline', 'accounts', 'tasks', 'tickets', 'home']) await click(`[data-nav="${v}"]`);   // one Opportunities list (pipeline) since v67
  log('nav ok');

  // ---- line screen: no Requirement tab, requirement inline in Overview [v54] ----
  await openLine('OP-2001');
  const tabs = await page.$$eval('[data-uv]', e => e.map(x => x.dataset.uv));
  if (tabs.includes('req')) fail('the Requirement tab should be gone');
  for (const t of ['quotes', 'tickets', 'activity', 'tasks', 'overview']) await click(`[data-uv="${t}"]`);
  log('line tabs ok');

  // ---- WC capture: six questions, SI = workers × monthly salary × 12 [v51]; the rater's quotes decide the route [v74 §6] ----
  const wcToQuotes = async (medical) => {
    await openLine('OP-2001');
    await click('[data-flow="firstCall"]'); await click('[data-pick="ring"]'); await click('[data-commit]');
    await click('[data-flow="disc"]');
    await pick('#f_wcbiz', 'Textile mill'); await fill('#f_wcnw', '10'); await fill('#f_wcsal', '5000');
    if (await page.$('#f_wcmedamt')) fail('medical amount should only show when coverage = Yes');
    await click(`[data-mset="wcmed"][data-mval="${medical ? 'y' : 'n'}"]`);
    if (medical) { if (!(await page.$('#f_wcmedamt'))) fail('medical amount should show when coverage = Yes'); else await pick('#f_wcmedamt', '₹25,000'); }
    await pick('#f_wcten', '1 Year');
    await click('[data-commit]');
    await expectStage('OP-2001', 3, 'WC capture');
    // saving opens "Quotes for this opportunity": the rater is asked, and its answer decides the route
    await page.waitForFunction(() => /Quoted/.test(document.getElementById('ovl').innerText), null, { timeout: 8000 }).catch(() => fail('the rater should return quotes'));
  };
  const sendQcr = async (id) => { await click('[data-commit]'); await click('[data-commit]'); await expectStage(id, 8, 'QCR sent'); };   // quotes → the QCR picker → send
  await wcToQuotes(true);
  const si = await page.evaluate(() => lineById('OP-2001').req.si);
  if (si !== '₹6,00,000 annual wages') fail('WC sum insured should derive to ₹6,00,000 annual wages, got ' + si);
  log('wc capture ok');

  // ---- quote tags Instant vs Assisted, in the quotes and the QCR picker [v58–v59] ----
  await expect('Instant issuance', 'quotes'); await expect('Assisted issuance', 'quotes');
  await click('[data-commit]');
  await expect('Select quotes and send the QCR', 'the QCR picker follows the quotes');
  const picker = await page.$eval('#ovl', o => o.innerText);
  if (!/Cholamandalam[^\n]*\n?[^\n]*Instant issuance/.test(picker)) fail('QCR picker: Cholamandalam should carry Instant issuance');
  if (!picker.includes('Assisted issuance')) fail('QCR picker should tag rater quotes Assisted issuance');
  if (/valid 28 days/.test(picker)) fail('QCR picker should not show the SI · valid 28 days line');
  await click('[data-commit]');
  await expectStage('OP-2001', 8, 'QCR sent');
  if ((await page.evaluate(() => lineById('OP-2001').rate)) !== 1) fail('quotes from the rater should put the line on the DUA route [v74 §6]');
  await expect('DUA — priced by the rater', 'DUA wording [v49]');
  await expectNot('DAU', 'DAU renamed to DUA [v49]');
  log('quote tags ok');

  // ---- Cholamandalam instant purchase, verified account [v50–v55; v74 §3 instant link] ----
  await click('[data-flow="confirm"]'); await click(`[data-pick="${CHOLA}"]`);
  await expect('Instant purchase', 'confirm shows the instant route');
  await click('[data-commit]');
  await expectStage('OP-2001', 10, 'Chola confirmed — a verified account skips KYC Details Requested [v73]');
  await expect('Capture the details Cholamandalam needs to issue', 'stage 10 next action');
  await click('[data-uv="overview"]');
  const phhd = await page.$$eval('#app .phhd .t', e => e.map(x => x.innerText));
  if (!phhd.some(t => /^Payment details/.test(t)) || phhd.some(t => /^Sold\b/.test(t))) fail('Overview: "Sold" is now "Payment details" [29 Oct], got ' + phhd.join(' | '));
  await expect('The insurer’s payment link appears here once it is generated', 'Payment details before the link [29 Oct]');
  await click('[data-flow="cholaKyc"]');
  await click('[data-mset="csole"][data-mval="n"]'); await click('[data-commit]');                       // 1 Details
  await pick('#f_cworker', 'Factory worker'); await pick('#f_criskloc', 'Specific Location');           // 2 Risk
  if (!(await page.$('#f_craddr'))) fail('Specific Location should ask for the risk address');
  await pick('#f_criskloc', 'All India Coverage'); await click('[data-commit]');
  await expect('Place of incorporation', 'wizard step 3'); await click('[data-commit]');                 // 3 Company
  await expect('already on file', 'verified account auto-fills KYC [v52]');                             // 4 KYC
  await click('[data-commit]');
  await expect('Generate & send Cholamandalam’s payment link', 'after the issuance details');
  const sendLink = async (what) => {
    await click('.na [data-flow="instGen"]'); await click('[data-commit]');                               // Generate link
    await page.waitForFunction(() => /Send the payment link/.test(document.getElementById('ovl').innerText), null, { timeout: 5000 }).catch(() => fail(what + ': generating should offer to send the link'));
    await click('[data-commit]');                                                                         // Send link
  };
  await click('.na [data-flow="instGen"]'); await click('[data-commit]');
  await page.waitForFunction(() => /Send the payment link/.test(document.getElementById('ovl').innerText), null, { timeout: 5000 }).catch(() => fail('generating should offer to send the link'));
  await expectStage('OP-2001', 10, 'a generated link waits at Purchase Requested until it is sent');
  if (!(await page.$('#ovl [data-copy]'))) fail('payment link should offer Copy link [v53]');
  if (!(await page.$eval('#ovl', o => [...o.querySelectorAll('input')].some(i => /^https:\/\/pay\.cholams/.test(i.value))))) fail('payment link should be a Cholamandalam link');
  await click('[data-commit]');
  await expectStage('OP-2001', 11, 'link sent');
  if (!(await page.$('#app [data-paycopy^="https://pay.cholams"]'))) fail('Payment details should show the Cholamandalam link that was sent, with Copy [29 Oct]');
  await expect('expires in 24h', 'link valid 24h');
  // the link lapses after 24 hours and is regenerated [v51, v53]
  await click('[data-sim="cholaExpire"]');
  await expect('The payment link expired', 'expired link');
  await sendLink('regenerate');
  await expectNot('The payment link expired', 'regenerated link');
  await expect('expires in 24h', 'regenerated link is valid for 24h');
  await click('[data-v74sim="instPaid"]');
  await expectStage('OP-2001', 12, 'client paid — detected from the insurer');
  await expectNot('Welcome call', 'no welcome call at Payment Completed [v55]');
  const owner = await page.evaluate(() => { const u = userById(lineById('OP-2001').owner); return u ? u.id + ':' + u.role : ''; });
  if (!/:rm$/.test(owner)) fail('at Payment Completed RM allocation should hand the line to an RM [27 Oct], got ' + owner);
  const tix = await page.evaluate(() => ticketsOf(lineById('OP-2001')).length);
  if (tix) fail('an instant purchase should derive no ticket of any kind, got ' + tix);
  const track = await page.$eval('.track', e => e.innerText);
  if (/Docs Pending|Awaiting (Policy )?Copy/.test(track)) fail('Docs Pending and Awaiting Copy should be hidden on an instant line: ' + track.replace(/\s+/g, ' '));
  // Switch person goes straight to the full selector, data kept [v60]; Admin acts on the RM's line [v65]
  await click('[data-switch]');
  if ((await page.evaluate(() => S.route.v)) !== 'signin') fail('Switch person should open the full person selector');
  await click('[data-signin="admin"]');
  await openLine('OP-2001');
  await expectStage('OP-2001', 12, 'data kept across a switch');
  await click('[data-flow="cholaShare"]'); await click('[data-commit]');
  await expectStage('OP-2001', 15, 'policy copy shared');
  await expect('Policy copy shared · issued in real time by Cholamandalam', 'issued');
  await expectNot('Policy explanation', 'no policy-explanation call [v55]');
  // Documents replaces RFQ & quotes once issued [v54]
  if (await page.$('[data-uv="quotes"]')) fail('RFQ & quotes tab should be replaced once issued');
  await click('[data-uv="docs"]');
  for (const d of ['Quote Comparison Report', 'PAN card', 'GST certificate', 'Policy copy']) await expect(d, 'Documents tab');
  log('chola real-time ok');

  // ---- any other insurer raises a payment request to Ops [v50; v74 §3] ----
  await signIn('nikhil'); await reseed();
  await wcToQuotes(false); await sendQcr('OP-2001');
  await click('[data-flow="confirm"]'); await click('[data-pick="ICICI Lombard"]');
  await expectNot('Instant purchase', 'an assisted quote is not instant');
  await click('[data-commit]');
  await expectStage('OP-2001', 10, 'ICICI confirmed — verified account goes straight to Purchase Requested [v73]');
  if (await page.$('[data-flow="cholaKyc"]')) fail('a non-instant insurer should not offer the Chola details');
  if (!(await page.$('[data-flow="pay"]'))) fail('a non-instant insurer should raise a payment request');
  log('wc assisted route ok');

  // ---- provisional account: account KYC (stage 9) applies to the instant route too [v74 §3] ----
  await reseed();
  await click('[data-proto]'); await click('[data-protoprov]'); await click('[data-close]');
  if (!(await page.evaluate(() => acctOf(lineById('OP-2001')).prov))) fail('prototype toggle should make the WC account provisional');
  await wcToQuotes(false); await sendQcr('OP-2001');
  await click('[data-flow="confirm"]'); await click(`[data-pick="${CHOLA}"]`); await click('[data-commit]');
  await expectStage('OP-2001', 9, 'a provisional account waits at KYC Details Requested on the instant route too');
  // v75 leaves this opportunity's next-action card empty at stage 9 (reported); KYC is done from Account 360
  await page.evaluate(() => go('acct', { id: 'A-1001' })); await page.waitForTimeout(80);
  await click('.content [data-flow="kyc"]'); await click('#ovl [data-kycsample]'); await page.waitForTimeout(1200);
  await click('[data-commit]'); await page.waitForTimeout(300);   // read the documents
  await click('[data-commit]'); await page.waitForTimeout(300);   // confirm the name on the PAN
  const acct = await page.evaluate(() => { const a = acctOf(lineById('OP-2001')); return { prov: a.prov, pan: a.pan, gst: a.gst }; });
  if (acct.prov || !acct.pan || !acct.gst) fail('the upload should verify the account: ' + JSON.stringify(acct));
  await expectStage('OP-2001', 10, 'KYC clearing moves the instant line on');
  await openLine('OP-2001');
  await expect('Capture the details Cholamandalam needs to issue', 'the instant purchase continues after KYC');
  log('provisional kyc ok');

  // ---- Cyber: capture, band-chosen RFQ, placement query is a simulation [v56–v57] ----
  const cyberToRfq = async (cov) => {
    await openLine('OP-2002');
    await click('[data-flow="firstCall"]'); await click('[data-pick="ring"]'); await click('[data-commit]');
    await click('[data-flow="disc"]');
    await pick('#f_cybtob', 'EdTech'); await fill('#f_cybcov', cov); await pick('#f_cybto', 'Up to ₹1 Cr'); await pick('#f_cybnat', 'Private Limited');
    for (const k of ['cybsub', 'cybpol', 'cybclm']) await click(`[data-mset="${k}"][data-mval="n"]`);
    await click('[data-commit]');
    await expectStage('OP-2002', 3, 'Cyber capture');
    await page.waitForFunction(() => /No insurer returned a price/.test(document.getElementById('ovl').innerText), null, { timeout: 8000 }).catch(() => fail('Cyber should get no rater quotes and go Non-DUA [v74 §6]'));
    await click('[data-commit]');   // Open the RFQ
    if ((await page.evaluate(() => lineById('OP-2002').rate)) !== 0) fail('no quotes should put the line on the Non-DUA route');
    if (await page.$('[data-uv="quotes"]')) await click('[data-uv="quotes"]');
  };
  await reseed();
  await cyberToRfq('₹5 Cr');
  await expect('Turnover and footprint', '2–10 Cr RFQ form');
  await expect('tick all that apply', 'multi field type');
  await reseed();
  await cyberToRfq('₹1 Cr');
  await expect('Security controls', '0–2 Cr RFQ form');
  await expectNot('Turnover and footprint', '0–2 Cr RFQ form');
  await click('[data-rfqact="send"]');
  await expectStage('OP-2002', 4, 'RFQ sent for client review');
  await click('[data-sim="rfqClient"]');
  await expectStage('OP-2002', 5, 'client approved the RFQ');
  await click('.na [data-flow="float"]'); await click('[data-commit]');
  await expectStage('OP-2002', 6, 'floated to placement');
  await expectNot('Answer the query', 'no query until placement raises one');
  await click('[data-sim="plcQuery"]');
  await expect('Placement has a query for you', 'simulated query');
  if (!(await page.$('[data-flow="answerQ"]'))) fail('Answer the query should appear once placement raises a query');
  log('cyber rfq + placement query ok');

  // ---- one product per opportunity: the container screen redirects [v67] ----
  await page.evaluate(() => go('opp', { id: 'OPP-001001' })); await page.waitForTimeout(80);
  const oppRoute = await page.evaluate(() => S.route);
  if (oppRoute.v !== 'line' || oppRoute.id !== 'OP-2001') fail('the opportunity container should redirect to its product, got ' + JSON.stringify(oppRoute));
  await expectNot('Add product line', 'a second product is a new opportunity');
  log('one product per opportunity ok');

  // ---- the seller keeps sight of what they sold: the Won filter [v72] ----
  await reseed();
  await click('[data-nav="pipeline"]');
  await click('[data-pill="pf"][data-pv="won"]');
  const won0 = await page.$$eval('.content .row[data-go="line"]', r => r.map(x => x.dataset.id).sort().join(','));
  if (won0 !== 'OP-2101,OP-2103') fail('Won should list the opportunities Nikhil sold, got ' + won0);
  log('won filter ok');

  // ---- Multiple payment: one request and one ticket for several opportunities [v68–v69]; same insurer [v74 §1] ----
  await click('[data-pill="pf"][data-pv="open"]');
  await click('[data-paymode="1"]');
  if (!(await page.$eval('[data-payraise]', b => b.disabled))) fail('raising should wait for a selection');
  const greyedNow = async () => page.$$eval('[data-paysel]', e => e.filter(x => x.disabled).map(x => x.dataset.paysel).sort().join(','));
  await click('[data-paysel="OP-2004"]');                         // A-1004: ICICI (OP-2004) and Tata AIG (OP-2005)
  if (!(await greyedNow()).split(',').includes('OP-2005')) fail('the same insurer is the seventh condition: OP-2005 (Tata AIG) should grey out beside OP-2004 (ICICI)');
  await click('[data-paysel="OP-2004"]');                         // clear, and pick on A-1005: both ICICI
  await click('[data-paysel="OP-2006"]');
  const greyed = await greyedNow();
  if (greyed.includes('OP-2007') || !greyed.includes('OP-2004') || !greyed.includes('OP-2005')) fail('the first pick should grey out other accounts and keep the same-insurer one, got ' + greyed);
  await click('[data-paysel="OP-2007"]'); await click('[data-payraise]');
  await expect('2 opportunities selected', 'one request covers both');
  await pick('#f_mode', 'NEFT / RTGS');
  if (await page.$eval('#ovl [data-commit]', b => b.disabled)) { const errs = await page.$$eval('#ovl .err, #ovl .field .lbl', e => e.map(x => x.innerText).filter(Boolean).join(' | ')); fail('the payment request should be ready to raise: ' + errs.slice(0, 300)); }
  await click('[data-commit]');
  const pays = await page.evaluate(() => ['OP-2006', 'OP-2007'].map(id => ticketsOf(lineById(id)).filter(t => /^PAY-/.test(t.id)).map(t => t.id).join('/')));
  if (!pays[0] || pays[0] !== pays[1]) fail('both opportunities should sit on one payment ticket: ' + pays.join(' vs '));
  await openLine('OP-2006');
  await click('[data-sim="extOps"]');                              // Ops closes the ticket: the details go to the client by themselves [29 Oct]
  for (const id of ['OP-2006', 'OP-2007']) await expectStage(id, 11, 'details emailed automatically when Ops closes the ticket [29 Oct]');
  const mails = await page.evaluate(() => ['OP-2006', 'OP-2007'].map(id => (lineById(id).payMails || []).filter(m => !m.resend && m.to).length).join('/'));
  if (mails !== '1/1') fail('one automatic email to the client contact per opportunity, got ' + mails);
  await expect('Emailed automatically when Ops closed the payment ticket', 'stage 11 next action [29 Oct]');
  if (await page.$('[data-flow="share"]')) fail('the manual share step is gone [29 Oct]');
  await click('[data-flow="payResend"]'); await click('[data-commit]');
  if ((await page.evaluate(() => (lineById('OP-2006').payMails || []).filter(m => m.resend).length)) !== 1) fail('a resend at Payment Details Shared should record a new email [29 Oct]');
  await click('[data-sim="extPaid"]'); await click('[data-flow="proof"]'); await click('[data-proofsample]'); await page.waitForTimeout(1200); await click('[data-commit]');
  for (const id of ['OP-2006', 'OP-2007']) await expectStage(id, 12, 'one proof completes each opportunity');
  await expect('Won', 'Won is derived from Payment Completed [v71]');
  if (!/opportunity/i.test(await page.$eval('.topbar', e => e.innerText))) fail('the workspace top bar should read Opportunity [v71]');
  log('multiple payment + won ok');

  // ---- KYC Details Requested: an unverified account waits at stage 9 [v73] ----
  const propToConfirm = async (id) => {
    await openLine(id);
    await click('[data-flow="firstCall"]'); await click('[data-pick="ring"]'); await click('[data-commit]');
    await click('[data-flow="disc"]');
    await pick('#f_tob', 'Trading'); await pick('#f_noc', 'Private limited'); await fill('#f_to', '₹10 Cr'); await fill('#f_si', '₹2 Cr');
    await fill('#f_occ', 'Warehouse'); await pick('#f_clm', 'No claims in 3 years'); await pick('#f_ten', '1 year');
    await click('[data-mset="pol"][data-mval="n"]'); await click('[data-commit]');
    await page.waitForFunction(() => /Quoted/.test(document.getElementById('ovl').innerText), null, { timeout: 8000 }).catch(() => fail(id + ': the rater should return quotes'));
    await sendQcr(id);
    await click('[data-flow="confirm"]'); await click('#ovl [data-pick]'); await click('[data-commit]');
  };
  await reseed();
  // a second opportunity on the same unverified account, created from Account 360 [v67]
  await page.evaluate(() => go('acct', { id: 'A-1201' })); await page.waitForTimeout(80);
  await click('.content [data-flow="newOpp"][data-acct="A-1201"]');
  await expect('On the selected account', 'New opportunity from Account 360 binds the account');
  await pick('#f_product', 'Fire & Special Perils'); await pick('#f_src', 'Referral'); await click('[data-mset="bt"][data-mval="fresh"]');
  await click('[data-commit]'); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  const fireId = await page.evaluate(() => (S.data.lines.find(l => l.acct === 'A-1201' && l.product === 'Fire & Special Perils') || {}).id);
  if (!fireId) fail('New opportunity from Account 360 should add an opportunity on A-1201');
  for (const id of ['OP-2130', fireId]) { await propToConfirm(id); await expectStage(id, 9, 'an unverified account confirms into KYC Details Requested'); }
  await expect('KYC Details Requested', 'stage 9 next action');
  if (await page.$('[data-flow="pay"]')) fail('no payment request before KYC');
  if (!(await page.$eval('.track', e => e.innerText)).includes('KYC Requested')) fail('an unverified track should show KYC Requested');
  await click('[data-flow="kyc"]'); await click('#ovl [data-kycsample]'); await page.waitForTimeout(1200);
  await click('[data-commit]'); await page.waitForTimeout(300);   // read the documents
  await click('[data-commit]'); await page.waitForTimeout(300);   // confirm the name on the PAN
  if (await page.evaluate(() => acctOf(lineById('OP-2130')).prov)) fail('KYC should verify the account');
  for (const id of ['OP-2130', fireId]) await expectStage(id, 10, 'KYC clearing advances every waiting opportunity on the account');
  await openLine('OP-2005');
  if ((await page.$eval('.track', e => e.innerText)).includes('KYC Requested')) fail('a verified account’s track should hide stage 9');
  log('kyc details requested ok');

  // ---- Admin: console, masters, RM allocation, acts directly [v65–v66] ----
  await reseed();
  await signIn('admin');
  for (const s of ['Admin console', 'Everything, across every team', 'Master configuration']) await expect(s, 'admin console');
  await click('[data-nav="masters"]');
  for (const s of ['Task configurator', 'Lead assignment', 'Lead prioritisation', 'RM allocation', 'Working calendar', 'Reference lists',
                   'Users', 'Question Master', 'ABM assignment']) await expect(s, 'masters hub');   // Users, Question Master, ABM [v74–v75]
  await click('[data-nav="rmalloc"]');
  await expect('Test an account', 'RM allocation is editable and testable [27 Oct]');
  await expect('Owners · 13 empty', 'RM allocation flags the uncovered cells');
  await click('.side [data-nav="masters"]'); await click('.content [data-nav="rules"]');
  for (const s of ['Stage tasks', 'After a connected call']) await expect(s, 'the call-task configurator [v74 §4]');
  await click('.side [data-nav="masters"]'); await click('.content [data-nav="masterusers"]');
  for (const s of ['Reports to', 'Pre-sales', 'Post-sales']) await expect(s, 'the Users master and reporting lines [27 Oct]');
  // repo fix (app/repo-fixes.js): Admin opens any account or opportunity, including a renewal
  for (const [v, id] of [['line', 'OP-2001'], ['acct', 'A-1102'], ['line', 'OP-2950']]) {
    await page.evaluate(([v, id]) => go(v, { id }), [v, id]); await page.waitForTimeout(80);
    await expectNot('have access', 'Admin opens ' + id);
  }
  await openLine('OP-2001');
  await click('[data-flow="firstCall"]'); await click('[data-pick="ring"]'); await click('[data-commit]');
  await expectStage('OP-2001', 2, 'Admin acts directly, with no take-ownership step');
  if (!(await page.evaluate(() => lineById('OP-2001').log.slice(0, 3).some(e => /Aditya Verma/.test((e.t || '') + ' ' + (e.m || '')))))) fail('the trail should name Admin as the actor');
  await signIn('nikhil');
  await page.evaluate(() => go('acct', { id: 'A-1102' })); await page.waitForTimeout(80);
  await expect('have access', 'other roles keep their own scope');
  log('admin ok');

  // ---- ABM pre-sales: the prospect journey and the hand-off to Sales [v75] ----
  await reseed();
  await signIn('arjun');
  if ((await page.evaluate(() => S.route.v)) !== 'abhome') fail('an ABM should land on the pre-sales home');
  for (const s of ['Prospect', 'MQL', 'Meeting Set-up', 'Meeting Completed', 'Handed off']) await expect(s, 'the ABM journey stages');
  await page.evaluate(() => go('abpro', { id: 'PR-1005' })); await page.waitForTimeout(80);
  await expect('Meeting Completed', 'PR-1005 is ready to hand off');
  const before = await page.evaluate(() => S.data.lines.length);
  await click('.content [data-flow="ab_handoff"]');
  await page.selectOption('#ovl select[id^="f_o_"]', 'nikhil'); await page.waitForTimeout(80);   // an owner for the product
  await click('[data-commit]');
  const made = await page.evaluate((n) => S.data.lines.slice(n).map(l => l.product + '@' + l.stage + ':' + l.owner).join(','), before);
  if (made !== 'Contractors All Risk@1:nikhil') fail('the hand-off should open one opportunity at New Lead for Nikhil, got ' + (made || 'none'));
  if ((await page.evaluate(() => S.data.pros.find(p => p.id === 'PR-1005').stage)) !== 'handed') fail('the prospect should move to Handed off');
  log('abm hand-off ok');

  // ---- Raise ticket is endorsements and claims only [27 Oct] ----
  await signIn('priya');
  await click('.side [data-nav="tickets"]'); await click('.content [data-flow="pickTicket"]');
  await expect('An endorsement or a claim on an issued policy', 'raise ticket');
  await expect('Placement and payment tickets are raised from the opportunity', 'raise ticket');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  log('raise ticket ok');

  // ---- repo fix (app/repo-fixes.css): Compliance buttons stay inside the panel at 1280px ----
  await signIn('priya');
  await page.evaluate(() => { S.ui['atab_A-1101'] = 'comp'; go('acct', { id: 'A-1101' }); }); await page.waitForTimeout(100);
  const clipped = await page.evaluate(() => { const pr = document.querySelector('.panel').getBoundingClientRect().right; return [...document.querySelectorAll('.content [data-doc]')].filter(b => b.offsetParent && b.getBoundingClientRect().right > pr).length; });
  if (clipped) fail(clipped + ' Compliance document buttons are clipped at 1280px');
  await signIn('nikhil');
  log('compliance layout ok');

  // ---- accounts, new opportunity, inbound, tasks ----
  await reseed();
  await page.evaluate(() => go('acct', { id: 'A-1001' }));
  for (const t of ['opps', 'policies', 'svc', 'profile', 'overview']) { if (await page.$(`[data-uv="${t}"]`)) await click(`[data-uv="${t}"]`); }
  await click('[data-flow="addContact"]');
  await fill('#f_n', 'Test Person'); await fill('#f_m', '9876543210'); await fill('#f_e', 'test.person@example.com'); // email is required since v48
  await click('[data-commit]');
  await expect('Test Person', 'contact added');
  await click('[data-nav="accounts"]');
  await page.fill('#aq', 'meridian'); await page.waitForTimeout(150);   // the finder lists the person's own book
  await expect('Meridian Chemicals', 'finder');
  log('acct ok');
  await click('[data-flow="newOpp"]');
  // two questions first: the customer type decides the id asked for and the KYC documents [30 Oct]
  if (!(await page.$eval('#ovl [data-commit]', b => b.disabled)) || (await page.$('#f_name'))) fail('New opportunity should ask the customer type before anything else [30 Oct]');
  await click('[data-mset="isSole"][data-mval="n"]');
  await expect('KYC will ask for the PAN card and the GST certificate', 'not a sole proprietor → GST [30 Oct]');
  // no GSTIN → a provisional account; contact needs a mobile and an email
  await fill('#f_name', 'Fresh Test Co'); await fill('#f_caddr', 'Plot 4, MIDC Bhosari, Pune');   // a new account needs its address [v74 §7]
  await fill('#f_cn', 'A Person'); await fill('#f_m', '9876543210'); await fill('#f_e', 'a@b.co');
  await pick('#f_product', 'Fire & Special Perils'); await pick('#f_src', 'Referral');
  await click('[data-mset="bt"][data-mval="roll"]');
  await click('[data-commit]');
  await expect('new, provisional', 'newopp provisional');
  const freshAcct = await page.evaluate(() => { const a = S.data.accounts.find(a => a.n === 'Fresh Test Co') || {}; return { prov: a.prov, cust: a.cust }; });
  if (!freshAcct.prov) fail('a new opportunity without a GSTIN should open a provisional account');
  if (freshAcct.cust !== 'co') fail('the customer type should be stored on the account [30 Oct], got ' + freshAcct.cust);
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  // a sole proprietor without GST gives Aadhaar instead, and KYC asks for the PAN card and Aadhaar [30 Oct]
  await click('[data-flow="newOpp"]');
  await click('[data-mset="isSole"][data-mval="y"]'); await click('[data-mset="hasGst"][data-mval="n"]');
  if (!(await page.$('#f_aad')) || (await page.$('#f_gst')) || (await page.$('#f_gaddr'))) fail('a sole proprietor without GST should be asked for Aadhaar, not a GSTIN or GST address [30 Oct]');
  await fill('#f_aad', '1234 5678'); await fill('#f_name', 'Sole Test Traders'); await fill('#f_caddr', 'Shop 2, Market Road, Nashik');
  await fill('#f_cn', 'Ravi Patil'); await fill('#f_m', '9876543210'); await fill('#f_e', 'ravi@soletest.in');
  await pick('#f_product', 'Fire & Special Perils'); await pick('#f_src', 'Referral'); await click('[data-mset="bt"][data-mval="fresh"]');
  await expect('An Aadhaar number is twelve digits', 'Aadhaar check');
  if (!(await page.$eval('#ovl [data-commit]', b => b.disabled))) fail('an Aadhaar number that is not twelve digits should block Create');
  await fill('#f_aad', '1234 5678 9012');
  await click('[data-commit]');
  const soleAcct = await page.evaluate(() => { const a = S.data.accounts.find(a => a.n === 'Sole Test Traders') || {}; return { id: a.id, prov: a.prov, cust: a.cust, aad: a.aad }; });
  if (!soleAcct.prov || soleAcct.cust !== 'sole_nogst' || soleAcct.aad !== '1234 5678 9012') fail('a sole proprietor without GST should get a provisional account with Aadhaar on it: ' + JSON.stringify(soleAcct));
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  await page.evaluate((id) => go('acct', { id }), soleAcct.id); await page.waitForTimeout(80);
  await click('[data-uv="comp"]');
  await expect('Sole proprietor · no GST', 'Customer type on the account [30 Oct]');
  await click('.content [data-flow="kyc"]');
  await expect('Upload the PAN card and Aadhaar.', 'KYC follows the customer type [30 Oct]');
  if (await page.$('#ovl [data-mset="route"]')) fail('KYC should no longer offer a choice of second document [30 Oct]');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  // the customer type can be edited while the account is provisional
  await click('.content [data-flow="custEdit"]'); await click('[data-mset="hasGst"][data-mval="y"]'); await click('[data-commit]');
  const edited = await page.evaluate((id) => { const a = S.data.accounts.find(a => a.id === id); return { cust: a.cust, log: (a.log && a.log[0] || {}).t }; }, soleAcct.id);
  if (edited.cust !== 'sole_gst' || !/Customer type changed/.test(edited.log || '')) fail('Edit should save and log the customer type [30 Oct]: ' + JSON.stringify(edited));
  await click('.content [data-flow="kyc"]');
  await expect('Upload the PAN card and the GST certificate.', 'KYC after the customer type changes [30 Oct]');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  await page.evaluate(() => go('acct', { id: 'A-1001' })); await page.waitForTimeout(80);
  await click('[data-uv="comp"]');
  await expect('Not a sole proprietor', 'Customer type on a verified account');
  if (await page.$('[data-flow="custEdit"]')) fail('a verified account’s customer type should not be editable [30 Oct]');
  log('newopp ok');
  await click('[data-nav="home"]');
  const inbound = await page.$$eval('[data-inbound]', e => e.map(x => x.dataset.inbound));
  if (!inbound.length) fail('home should offer the inbound-enquiry simulations');
  for (const k of inbound.slice(0, 3)) await click(`[data-inbound="${k}"]`);
  log('inbound ok');
  await click('[data-nav="tasks"]');
  await click('[data-flow="addTask"]');
  await page.fill('#f_title', 'Test task');
  await pick('#f_att', 'l:OP-2001');
  await fill('#f_due', '2026-09-25T15:00');   // a due date and time since v48
  await click('[data-commit]');
  await expect('Test task', 'task added');
  await click('[data-taskdone]');
  log('tasks ok');

  // ---- offline: a save fails with a retry ----
  await page.evaluate(() => { S.offline = true; paint(); });
  await openLine('OP-2001');
  await click('[data-uv="overview"]');   // the trail is written by the system and the call form since v48
  await click('[data-flow="firstCall"]'); await click('[data-pick="ring"]'); await click('[data-commit]');
  await expect('Couldn’t save', 'offline toast');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  await click('[data-offline="0"]');
  log('offline ok');

  // ---- tasks are configured by the administrator only [v74 §4] ----
  await signIn('vikram');
  await page.evaluate(() => go('rule', { id: 'TR-01' })); await page.waitForTimeout(80);
  await expect('Tasks are set up by the administrator', 'a manager no longer edits task rules');
  log('task configuration ok');

  // ---- every person, every screen, every tab of the first record ----
  let visits = 0;
  for (const who of ROSTER.split(',')) {
    await signIn(who);
    const navs = await page.$$eval('.side [data-nav]', e => [...new Set(e.map(x => x.dataset.nav))]);
    for (const v of navs) {
      await click(`.side [data-nav="${v}"]`); visits++;
      if (v === 'masters') for (const m of await page.$$eval('.content [data-nav]', e => [...new Set(e.map(x => x.dataset.nav))])) {
        await click(`.side [data-nav="masters"]`); await click(`.content [data-nav="${m}"]`); visits++;   // the masters' own screens
      }
      const row = await page.$('.content .row[data-go]');
      if (!row) continue;
      await row.click(); await page.waitForTimeout(80); visits++;
      if (await has('have access')) fail(`${who}: a row on ${v} opens to a no-access page`);
      for (const t of await page.$$eval('[data-uv]', e => e.map(x => [x.dataset.uv, x.dataset.uiset || '']))) {
        const sel = `[data-uv="${t[0]}"]` + (t[1] ? `[data-uiset="${t[1]}"]` : '');
        const el = await page.$(sel); if (el && await el.isVisible()) { await el.click(); await page.waitForTimeout(30); visits++; }
      }
    }
  }
  log(`walk ok (${visits} screens and tabs)`);

  // ---- time control ----
  await click('[data-proto]'); await click('[data-time="2700"]'); await click('[data-close]');
  await click('[data-nav="pipeline"]');
  log('time ok');

  // ---- mobile viewport, persistence, reset ----
  await page.setViewportSize({ width: 400, height: 800 });
  await openLine('OP-2001');
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  if (sw > 402) fail('horizontal overflow on a line at 400px: ' + sw);
  await page.reload(); await page.waitForTimeout(300);
  await expect('Aditya', 'persisted user');
  await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(100);
  await reseed();
  if ((await stage('OP-2001')) !== 1) fail('reset should return OP-2001 to New Lead');
  log('persist/reset ok');

  if (errors.length) { console.log(errors.join('\n')); process.exitCode = 1; }
  console.log(errors.length ? 'ERRORS' : 'NO JS ERRORS');
  await browser.close();
})().catch(e => { console.log('CRASH', e.message); process.exit(1); });
