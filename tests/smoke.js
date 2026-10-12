const { chromium } = require('playwright');
/*
 * Smoke tests for the v73 prototype. Drives the built page in a real browser:
 * every person, every screen and tab, and the flows v48–v73 added or changed
 * (docs/changelog-v48-v64.md, docs/changelog-v64-v73.md), plus the repo fixes in
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

  // ---- sign-in: five people — Admin joins [v65], Rohan gone [v64] ----
  const personas = await page.$$eval('[data-signin]', e => e.map(x => x.dataset.signin).join(','));
  if (personas !== 'nikhil,vikram,priya,meera,admin') fail('sign-in should offer nikhil,vikram,priya,meera,admin, got ' + personas);
  await expectNot('Rohan', 'sign-in');
  await click('[data-signin="nikhil"]');
  await expect('Good morning', 'home');
  await expect('Newly assigned', 'home');
  log('sign-in ok');

  // ---- website-lead priority P0–P3: badge, colour, order [v62] ----
  const prios = await page.$$eval('.row[data-go="line"]', rows => rows.map(r => {
    const c = [...r.querySelectorAll('.chip')].find(c => /^P[0-3]$/.test(c.innerText.trim()));
    return c ? c.innerText.trim() + ':' + c.className : '';
  }).filter(Boolean));
  if (prios.slice(0, 4).map(p => p.split(':')[0]).join() !== 'P0,P1,P2,P3') fail('Newly assigned should lead with P0,P1,P2,P3, got ' + prios.slice(0, 4).join(' | '));
  const colour = { P0: 'red', P1: 'amber', P2: 'violet', P3: 'neutral' };
  for (const p of prios) { const [lv, cls] = p.split(':'); if (!cls.split(' ').includes(colour[lv])) fail(`${lv} badge should be ${colour[lv]}: ${cls}`); }
  await click('[data-nav="pipeline"]');
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

  // ---- WC capture: six questions, SI = workers × monthly salary × 12 [v51] ----
  const wcToQuotes = async (medical) => {
    await openLine('OP-2001');
    await click('[data-flow="call"]'); await click('[data-pick="ring"]'); await click('[data-commit]');
    await click('[data-flow="disc"]');
    await pick('#f_wcbiz', 'Textile mill'); await fill('#f_wcnw', '10'); await fill('#f_wcsal', '5000');
    if (await page.$('#f_wcmedamt')) fail('medical amount should only show when coverage = Yes');
    await click(`[data-mset="wcmed"][data-mval="${medical ? 'y' : 'n'}"]`);
    if (medical) { if (!(await page.$('#f_wcmedamt'))) fail('medical amount should show when coverage = Yes'); else await pick('#f_wcmedamt', '₹25,000'); }
    await pick('#f_wcten', '1 Year');
    await click('[data-commit]');
    await expectStage('OP-2001', 3, 'WC capture');
  };
  await wcToQuotes(true);
  const si = await page.evaluate(() => lineById('OP-2001').req.si);
  if (si !== '₹6,00,000 annual wages') fail('WC sum insured should derive to ₹6,00,000 annual wages, got ' + si);
  await expect('DUA line', 'DUA wording [v49]');
  await expectNot('DAU', 'DAU renamed to DUA [v49]');
  log('wc capture ok');

  // ---- quote tags Instant vs Assisted, in the table and the QCR picker [v58–v59] ----
  await click('[data-uv="quotes"]');
  await expect('Instant issuance', 'quote table');
  await expect('Assisted issuance', 'quote table');
  await click('[data-flow="qcr"]');
  const picker = await page.$eval('#ovl', o => o.innerText);
  if (!/Cholamandalam[^\n]*\n?[^\n]*Instant issuance/.test(picker)) fail('QCR picker: Cholamandalam should carry Instant issuance');
  if (!picker.includes('Assisted issuance')) fail('QCR picker should tag rater quotes Assisted issuance');
  if (/valid 28 days/.test(picker)) fail('QCR picker should not show the SI · valid 28 days line');
  await click('[data-commit]');
  await expectStage('OP-2001', 8, 'QCR sent');
  log('quote tags ok');

  // ---- Cholamandalam real-time issuance, verified account [v50–v55] ----
  await click('[data-flow="confirm"]');
  await expect('instant issuance — no payment ticket', 'confirm shows the instant route');
  await click(`[data-pick="${CHOLA}"]`); await click('[data-commit]');
  await expectStage('OP-2001', 10, 'Chola confirmed — bypasses KYC Details Requested [v73]');
  await expect('Run real-time KYC with Cholamandalam', 'stage 9 next action');
  await click('[data-uv="overview"]');
  await expect('Sold', 'Sold block in Overview [v54]');
  await expect('In KYC', 'Sold block payment status');
  await click('[data-flow="cholaKyc"]');
  await click('[data-mset="csole"][data-mval="n"]'); await click('[data-commit]');                       // 1 Details
  await pick('#f_cworker', 'Factory worker'); await pick('#f_criskloc', 'Specific Location');           // 2 Risk
  if (!(await page.$('#f_craddr'))) fail('Specific Location should ask for the risk address');
  await pick('#f_criskloc', 'All India Coverage'); await click('[data-commit]');
  await expect('Place of incorporation', 'wizard step 3'); await click('[data-commit]');                 // 3 Company
  await expect('already on file', 'verified account auto-fills KYC [v52]');                             // 4 KYC
  await click('[data-commit]');
  await expect('KYC cleared — generate the payment link', 'after KYC');
  await click('[data-flow="cholaLink"]');
  if (!(await page.$('#ovl [data-copy]'))) fail('payment link should offer Copy link [v53]');
  if (!(await page.$eval('#ovl', o => [...o.querySelectorAll('input')].some(i => i.value.startsWith('https://pay.cholamsgeneral.com/wc/'))))) fail('payment link should be a Chola link');
  await click('[data-commit]');
  await expectStage('OP-2001', 11, 'link sent');
  await expect('expires in 24h', 'link valid 24h');
  // the link lapses after 24 hours and is regenerated [v51, v53]
  await click('[data-sim="cholaExpire"]');
  await expect('The payment link expired', 'expired link');
  await click('[data-flow="cholaLink"]');
  await expect('The previous link expired', 'regenerate modal');
  await click('[data-commit]');
  await expectNot('The payment link expired', 'regenerated link');
  await expect('expires in 24h', 'regenerated link is valid for 24h');
  await click('[data-sim="cholaPaid"]');
  await expectStage('OP-2001', 12, 'client paid');
  await expectNot('Welcome call', 'no welcome call at Payment Completed [v55]');
  const owner = await page.evaluate(() => lineById('OP-2001').owner);
  if (owner !== 'priya') fail('a paid Chola line should hand over to the RM, got ' + owner);
  const tix = await page.evaluate(() => ticketsOf(lineById('OP-2001')).length);
  if (tix) fail('a Chola line should derive no ticket of any kind, got ' + tix);
  const track = await page.$eval('.track', e => e.innerText);
  if (/Docs Pending|Awaiting (Policy )?Copy/.test(track)) fail('Docs Pending and Awaiting Copy should be hidden on a Chola line: ' + track.replace(/\s+/g, ' '));
  // Switch person goes straight to the full selector, data kept [v60]
  await click('[data-switch]');
  if ((await page.evaluate(() => S.route.v)) !== 'signin') fail('Switch person should open the full person selector');
  await click('[data-signin="priya"]');
  await openLine('OP-2001');
  await expectStage('OP-2001', 12, 'data kept across a switch');
  await click('[data-flow="cholaShare"]'); await click('[data-commit]');
  await expectStage('OP-2001', 15, 'policy copy shared');
  await expect('Policy copy shared · issued in real time via Cholamandalam', 'issued');
  await expectNot('Policy explanation', 'no policy-explanation call [v55]');
  // Documents replaces RFQ & quotes once issued [v54]
  if (await page.$('[data-uv="quotes"]')) fail('RFQ & quotes tab should be replaced once issued');
  await click('[data-uv="docs"]');
  for (const d of ['Quote Comparison Report', 'PAN card', 'GST certificate', 'Policy copy']) await expect(d, 'Documents tab');
  log('chola real-time ok');

  // ---- any other insurer keeps the payment-ticket path [v50] ----
  await signIn('nikhil'); await reseed();
  await wcToQuotes(false);
  await click('[data-flow="qcr"]'); await click('[data-commit]');
  await click('[data-flow="confirm"]'); await click('[data-pick="ICICI Lombard"]'); await click('[data-commit]');
  await expectStage('OP-2001', 10, 'ICICI confirmed — verified account goes straight to Purchase Requested [v73]');
  if (await page.$('[data-flow="cholaKyc"]')) fail('a non-Chola insurer should not offer the Chola KYC');
  if (!(await page.$('[data-flow="pay"]'))) fail('a non-Chola insurer should raise a payment request');
  log('wc assisted route ok');

  // ---- provisional account: upload + OCR verifies it [v52] ----
  await reseed();
  await click('[data-proto]'); await click('[data-protoprov]'); await click('[data-close]');
  if (!(await page.evaluate(() => acctOf(lineById('OP-2001')).prov))) fail('prototype toggle should make the WC account provisional');
  await wcToQuotes(false);
  await click('[data-flow="qcr"]'); await click('[data-commit]');
  await click('[data-flow="confirm"]'); await click(`[data-pick="${CHOLA}"]`); await click('[data-commit]');
  await click('[data-flow="cholaKyc"]');
  await click('[data-mset="csole"][data-mval="n"]'); await click('[data-commit]');
  await pick('#f_cworker', 'Factory worker'); await pick('#f_criskloc', 'All India Coverage'); await click('[data-commit]');
  await click('[data-commit]');
  await expect('Provisional account — documents not on file', 'provisional KYC step');
  if (!(await page.$eval('#ovl [data-commit]', b => b.disabled))) fail('Complete KYC should wait for the uploads');
  await click('[data-cholasample]'); await page.waitForTimeout(1200);
  await expect('account KYC complete', 'OCR read');
  await click('[data-commit]');
  const acct = await page.evaluate(() => { const a = acctOf(lineById('OP-2001')); return { prov: a.prov, pan: a.pan, gst: a.gst }; });
  if (acct.prov || !acct.pan || !acct.gst) fail('the upload should verify the account: ' + JSON.stringify(acct));
  await expect('KYC cleared — generate the payment link', 'provisional KYC cleared');
  log('provisional kyc ok');

  // ---- Cyber: capture, band-chosen RFQ, placement query is a simulation [v56–v57] ----
  const cyberToRfq = async (cov) => {
    await openLine('OP-2002');
    await click('[data-flow="call"]'); await click('[data-pick="ring"]'); await click('[data-commit]');
    await click('[data-flow="disc"]');
    await pick('#f_cybtob', 'EdTech'); await fill('#f_cybcov', cov); await pick('#f_cybto', 'Up to ₹1 Cr'); await pick('#f_cybnat', 'Private Limited');
    for (const k of ['cybsub', 'cybpol', 'cybclm']) await click(`[data-mset="${k}"][data-mval="n"]`);
    await click('[data-commit]');
    await expectStage('OP-2002', 3, 'Cyber capture');
    await click('[data-uv="quotes"]');
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

  // ---- Multiple payment: one request and one ticket for several opportunities [v68–v69] ----
  await click('[data-pill="pf"][data-pv="open"]');
  await click('[data-paymode="1"]');
  if (!(await page.$eval('[data-payraise]', b => b.disabled))) fail('raising should wait for a selection');
  await click('[data-paysel="OP-2004"]');
  const greyed = await page.$$eval('[data-paysel]', e => e.filter(x => x.disabled).map(x => x.dataset.paysel).sort().join(','));
  if (greyed !== 'OP-2006,OP-2007') fail('the first pick should grey out the other account, got ' + greyed);
  await click('[data-paysel="OP-2005"]'); await click('[data-payraise]');
  await expect('2 opportunities selected', 'one request covers both');
  await pick('#f_mode', 'NEFT / RTGS'); await click('[data-commit]');
  const pays = await page.evaluate(() => ['OP-2004', 'OP-2005'].map(id => ticketsOf(lineById(id)).filter(t => /^PAY-/.test(t.id)).map(t => t.id).join('/')));
  if (!pays[0] || pays[0] !== pays[1]) fail('both opportunities should sit on one payment ticket: ' + pays.join(' vs '));
  await openLine('OP-2004');
  await click('[data-sim="extOps"]'); await click('[data-flow="share"]'); await click('[data-commit]');
  for (const id of ['OP-2004', 'OP-2005']) await expectStage(id, 11, 'details shared once for both');
  await click('[data-sim="extPaid"]'); await click('[data-flow="proof"]'); await click('[data-proofsample]'); await page.waitForTimeout(1200); await click('[data-commit]');
  for (const id of ['OP-2004', 'OP-2005']) await expectStage(id, 12, 'one proof completes each opportunity');
  await expect('Won', 'Won is derived from Payment Completed [v71]');
  if (!/opportunity/i.test(await page.$eval('.topbar', e => e.innerText))) fail('the workspace top bar should read Opportunity [v71]');
  log('multiple payment + won ok');

  // ---- KYC Details Requested: an unverified account waits at stage 9 [v73] ----
  const propToConfirm = async (id) => {
    await openLine(id);
    await click('[data-flow="call"]'); await click('[data-pick="ring"]'); await click('[data-commit]');
    await click('[data-flow="disc"]');
    await pick('#f_tob', 'Trading'); await pick('#f_noc', 'Private limited'); await fill('#f_to', '₹10 Cr'); await fill('#f_si', '₹2 Cr');
    await fill('#f_occ', 'Warehouse'); await pick('#f_clm', 'No claims in 3 years'); await pick('#f_ten', '1 year');
    await click('[data-mset="pol"][data-mval="n"]'); await click('[data-commit]');
    await click('[data-flow="qcr"]'); await click('[data-commit]');
    await expectStage(id, 8, 'QCR sent');
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
  for (const s of ['Task configurator', 'Lead assignment', 'Lead prioritisation', 'RM allocation', 'Working calendar', 'Reference lists']) await expect(s, 'masters hub');
  await click('[data-nav="rmalloc"]');
  await expect('leaves 13 designation × region cells empty', 'RM allocation flags the uncovered cells');
  // repo fix (app/repo-fixes.js): Admin opens any account or opportunity, including a renewal
  for (const [v, id] of [['line', 'OP-2001'], ['acct', 'A-1102'], ['line', 'OP-2950']]) {
    await page.evaluate(([v, id]) => go(v, { id }), [v, id]); await page.waitForTimeout(80);
    await expectNot('have access', 'Admin opens ' + id);
  }
  await openLine('OP-2001');
  await click('[data-flow="call"]'); await click('[data-pick="ring"]'); await click('[data-commit]');
  await expectStage('OP-2001', 2, 'Admin acts directly, with no take-ownership step');
  if (!(await page.evaluate(() => lineById('OP-2001').log.slice(0, 3).some(e => /Aditya Verma/.test((e.t || '') + ' ' + (e.m || '')))))) fail('the trail should name Admin as the actor');
  await signIn('nikhil');
  await page.evaluate(() => go('acct', { id: 'A-1102' })); await page.waitForTimeout(80);
  await expect('have access', 'other roles keep their own scope');
  log('admin ok');

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
  // no GSTIN → a provisional account; contact needs a mobile and an email
  await fill('#f_name', 'Fresh Test Co'); await fill('#f_cn', 'A Person'); await fill('#f_m', '9876543210'); await fill('#f_e', 'a@b.co');
  await pick('#f_product', 'Fire & Special Perils'); await pick('#f_src', 'Referral');
  await click('[data-mset="bt"][data-mval="roll"]');
  await click('[data-commit]');
  await expect('new, provisional', 'newopp provisional');
  if (!(await page.evaluate(() => (S.data.accounts.find(a => a.n === 'Fresh Test Co') || {}).prov))) fail('a new opportunity without a GSTIN should open a provisional account');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
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
  await click('[data-flow="call"]'); await click('[data-pick="ring"]'); await click('[data-commit]');
  await expect('Couldn’t save', 'offline toast');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  await click('[data-offline="0"]');
  log('offline ok');

  // ---- a referenced task title cannot be renamed ----
  await signIn('vikram');
  await page.evaluate(() => go('rule', { id: 'TR-01' }));
  const refd = await page.evaluate(() => titleRefs(by(S.data.rules, 'TR-01').ti, 'TR-01').length);
  await page.fill('#rb_ti', 'Chase the new lead — renamed'); await page.waitForTimeout(120);
  if (refd > 0) await expect('Cannot rename', 'referenced rename refused');
  await page.evaluate(() => { S.ui.rb = null; S.ui.rb_id = ''; go('rules'); });
  log('rule rename ok');

  // ---- every person, every screen, every tab of the first record ----
  let visits = 0;
  for (const who of ['nikhil', 'vikram', 'priya', 'meera', 'admin']) {
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
