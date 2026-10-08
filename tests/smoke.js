const { chromium } = require('playwright');
/*
 * Smoke tests for the v64 prototype. Drives the built page in a real browser:
 * every person, every screen and tab, and the flows v48–v64 added or changed
 * (docs/changelog-v48-v64.md). The seed is reset between scenarios, so each one
 * starts from the same records.
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

  // ---- sign-in: four people, Rohan gone [v64] ----
  const personas = await page.$$eval('[data-signin]', e => e.map(x => x.dataset.signin).join(','));
  if (personas !== 'nikhil,vikram,priya,meera') fail('sign-in should offer nikhil,vikram,priya,meera, got ' + personas);
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
  for (const v of ['pipeline', 'opps', 'accounts', 'tasks', 'tickets', 'home']) await click(`[data-nav="${v}"]`);
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
  await expectStage('OP-2001', 9, 'Chola confirmed');
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
  await expectStage('OP-2001', 10, 'link sent');
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
  await expectStage('OP-2001', 11, 'client paid');
  await expectNot('Welcome call', 'no welcome call at Payment Completed [v55]');
  const owner = await page.evaluate(() => lineById('OP-2001').owner);
  if (owner !== 'priya') fail('a paid Chola line should hand over to the RM, got ' + owner);
  const tix = await page.evaluate(() => ticketsOf(lineById('OP-2001')).length);
  if (tix) fail('a Chola line should derive no ticket of any kind, got ' + tix);
  const track = await page.$eval('.track', e => e.innerText);
  if (/Docs Pending|Awaiting Policy Copy/.test(track)) fail('stages 12–13 should be hidden on a Chola line: ' + track.replace(/\s+/g, ' '));
  // Switch person goes straight to the full selector, data kept [v60]
  await click('[data-switch]');
  if ((await page.evaluate(() => S.route.v)) !== 'signin') fail('Switch person should open the full person selector');
  await click('[data-signin="priya"]');
  await openLine('OP-2001');
  await expectStage('OP-2001', 11, 'data kept across a switch');
  await click('[data-flow="cholaShare"]'); await click('[data-commit]');
  await expectStage('OP-2001', 14, 'policy copy shared');
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
  await expectStage('OP-2001', 9, 'ICICI confirmed');
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
  for (const who of ['nikhil', 'vikram', 'priya', 'meera']) {
    await signIn(who);
    const navs = await page.$$eval('[data-nav]', e => [...new Set(e.map(x => x.dataset.nav))]);
    for (const v of navs) {
      await click(`[data-nav="${v}"]`); visits++;
      const row = await page.$('.content .row[data-go]');
      if (!row) continue;
      await row.click(); await page.waitForTimeout(80); visits++;
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
  await expect('Meera', 'persisted user');
  await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(100);
  await reseed();
  if ((await stage('OP-2001')) !== 1) fail('reset should return OP-2001 to New Lead');
  log('persist/reset ok');

  if (errors.length) { console.log(errors.join('\n')); process.exitCode = 1; }
  console.log(errors.length ? 'ERRORS' : 'NO JS ERRORS');
  await browser.close();
})().catch(e => { console.log('CRASH', e.message); process.exit(1); });
