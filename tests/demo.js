const { chromium } = require('playwright');
/*
 * The investor demo (v76) on the deployed page, public/index.html. Walks both
 * cases live from pre-sales to an issued policy, the way a presenter would:
 *   Sharma Industries — Workmen's Compensation (DUA, Cholamandalam instant)
 *   Northgate Systems — Cyber Liability (Non-DUA: RFQ → placement → Ops)
 * Every typed pop-up on the way is filled with its "Fill sample data" button,
 * and the exception simulators the demo hides must stay hidden. The full
 * prototype underneath is covered by smoke.js (node build.mjs --full).
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
  const pick = async (sel, v) => { await page.selectOption(sel, v); await page.waitForTimeout(60); };
  const has = async (s) => (await txt()).includes(s);
  const expect = async (s, ctx) => { if (!(await has(s))) fail((ctx || '') + ' expected text: ' + s); };
  const stage = async (id) => page.evaluate((id) => lineById(id).stage, id);
  const expectStage = async (id, n, ctx) => { const s = await stage(id); if (s !== n) fail(`${ctx}: ${id} at stage ${s}, expected ${n}`); };
  const signIn = async (who) => { if (await page.$('[data-switch]')) await click('[data-switch]'); await click(`[data-signin="${who}"]`); };
  const openLine = async (id) => { await page.evaluate((id) => go('line', { id }), id); await page.waitForTimeout(100); };
  const commit = () => click('#ovl [data-commit]');
  const waitOvl = async (re, ctx) => page.waitForFunction((s) => new RegExp(s).test(document.getElementById('ovl').innerText), re, { timeout: 5000 }).catch(() => fail(ctx));
  const shot = async (n) => { const dir = require('path').resolve(__dirname, '../shots'); require('fs').mkdirSync(dir, { recursive: true }); await page.screenshot({ path: dir + '/' + n + '.png' }); };
  // the pop-up's own "Fill sample data" button must exist and must make the form ready to submit
  const sample = async (ctx, wait) => {
    if (!(await page.$('#ovl [data-simfill]'))) { fail(ctx + ': the pop-up should offer Fill sample data'); return; }
    await click('#ovl [data-simfill]'); if (wait) await page.waitForTimeout(wait);
    if (await page.$eval('#ovl [data-commit]', b => b.disabled)) fail(ctx + ': Fill sample data should leave the form ready to submit');
  };
  // the exception simulators (queries, declines, no-answer calls …) are hidden in the demo
  const noHidden = async (ctx) => {
    const shown = await page.evaluate(() => [...document.querySelectorAll('.simbtn, #ovl [data-callsim]')].map(b => b.textContent.trim()).filter(t => DM_HIDE.some(r => r.test(t))));
    if (shown.length) fail(ctx + ': the demo should hide the exception simulators, saw ' + shown.join(' | '));
  };
  const acctNamed = (n) => page.evaluate((n) => { const a = S.data.accounts.find(a => a.n === n || a.nWas === n) || {}; return { id: a.id, prov: a.prov, trade: a.trade, city: a.city, fin: !!a.fin, own: a.own }; }, n);
  const lineOn = (acct, product) => page.evaluate(([a, p]) => { const l = S.data.lines.find(l => l.acct === a && l.product === p) || {}; return { id: l.id, stage: l.stage, owner: l.owner }; }, [acct, product]);
  const rmByRule = async (acct, ctx) => {
    const m = await page.evaluate((id) => { const a = S.data.accounts.find(a => a.id === id); const e = (a.log || []).find(x => /^RM allocated/.test(x.t)); return e ? e.t + ' | ' + e.m : ''; }, acct);
    if (!/^RM allocated · Priya Nair \| RM allocation · RM ·/.test(m) || /fallback/i.test(m)) fail(ctx + ': Priya should be allocated by the RM rule, not the fallback, got ' + (m || 'no allocation'));
  };
  const verifyKyc = async () => {
    await click('#ovl [data-kycsample]'); await page.waitForTimeout(1200);
    await commit(); await page.waitForTimeout(300);   // read the documents
    await commit(); await page.waitForTimeout(300);   // confirm the legal name
  };
  const CAST = 'arjun,kavya,nikhil,vikram,priya,meera,admin';
  const startState = async (ctx) => {
    const s = await page.evaluate(() => ({ accts: S.data.accounts.length, lines: S.data.lines.length, pros: S.data.pros.map(p => p.id + ':' + p.stage).join(',') }));
    if (s.accts || s.lines || s.pros !== 'PR-1001:prospect,PR-1002:prospect') fail(ctx + ': the demo should start with no accounts or opportunities and two prospects, got ' + JSON.stringify(s));
  };

  // ---- the start: a cast of seven, an empty book, two prospects ----
  const personas = await page.$$eval('[data-signin]', e => e.map(x => x.dataset.signin).join(','));
  if (personas !== CAST) fail('sign-in should offer the demo cast ' + CAST + ', got ' + personas);
  await startState('start');
  await signIn('arjun');
  await expect('Sharma Industries Pvt Ltd', 'Arjun’s home'); await expect('Northgate Systems Pvt Ltd', 'Arjun’s home');
  await shot('demo-01-arjun-home');
  log('start ok');

  // ---- pre-sales: Arjun takes a prospect from the first call to the hand-off ----
  const prospectToHandoff = async (id, ctx) => {
    await signIn('arjun'); await page.evaluate((id) => go('abpro', { id }), id); await page.waitForTimeout(100);
    const pstage = () => page.evaluate((id) => S.data.pros.find(p => p.id === id).stage, id);
    await click('.content [data-flow="ab_call"]'); await noHidden(ctx + ' call');
    await click('#ovl [data-callsim="up"]'); await click('#ovl [data-callend]');
    await click('#ovl [data-mset="oc"][data-mval="contacted"]'); await click('#ovl [data-mset="d"][data-mval="mql"]'); await commit();
    if ((await pstage()) !== 'mql') fail(ctx + ': a contacted, qualified call should move the prospect to MQL');
    await click('.content [data-flow="ab_book"]'); await sample(ctx + ' consultation'); await commit();
    if ((await pstage()) !== 'callsetup') fail(ctx + ': booking should move the prospect to Meeting Set-up');
    await click('.content [data-flow="ab_callout"]'); await sample(ctx + ' call outcome'); await commit();
    if ((await pstage()) !== 'sal') fail(ctx + ': the consultation should move the prospect to Meeting Completed');
    await click('.content [data-flow="ab_handoff"]'); await sample(ctx + ' hand-off');
    if (id === 'PR-1001') await shot('demo-02-fill-sample-data');
    await commit(); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
    if ((await pstage()) !== 'handed') fail(ctx + ': the hand-off should move the prospect to Handed off');
  };

  // ---- case 1: Sharma Industries, Workmen's Compensation — DUA, Cholamandalam instant ----
  await prospectToHandoff('PR-1001', 'Sharma');
  const sharma = await acctNamed('Sharma Industries Pvt Ltd');
  if (!sharma.id || !sharma.prov || sharma.trade !== 'Sharma Steel' || !sharma.fin) fail('the hand-off should open Sharma Industries with its profile filled in: ' + JSON.stringify(sharma));
  const wc = await lineOn(sharma.id, 'Workmen’s Compensation');
  if (wc.stage !== 1 || wc.owner !== 'nikhil') fail('the hand-off should open a WC opportunity at New Lead for Nikhil: ' + JSON.stringify(wc));
  await signIn('nikhil'); await openLine(wc.id);
  await click('.na [data-flow="firstCall"]'); await click('#ovl [data-pick="disc"]'); await commit();   // ready for discovery → the requirement opens
  await sample('WC requirement');
  if (!/complete discovery/.test(await page.$eval('#ovl [data-commit]', b => b.innerText))) fail('WC requirement: Fill sample data should answer every question');
  await commit();
  await waitOvl('the route is DUA', 'WC: the rater should quote, so the route is DUA'); await noHidden('WC quotes');
  await commit(); await commit();                                                                        // the QCR picker, then send
  await expectStage(wc.id, 8, 'WC QCR sent');
  await click('.na [data-flow="confirm"]'); await click('#ovl [data-pick*="Cholamandalam"]'); await commit();
  await expectStage(wc.id, 9, 'WC confirmed on a provisional account → KYC Details Requested');
  // the instant route's stage-9 card is empty in the prototype (reported); KYC is done from the account
  if (!(await page.$('.na [data-flow="kyc"]'))) log('  note: the instant route has no Get verified at KYC Details Requested — verified from the account (reported)');
  await page.evaluate((id) => go('acct', { id }), sharma.id); await page.waitForTimeout(80);
  await click('.content [data-flow="kyc"]'); await verifyKyc();
  await openLine(wc.id);
  await expectStage(wc.id, 10, 'WC: KYC verified → Purchase Requested');
  await click('.na [data-flow="cholaKyc"]');
  await click('#ovl [data-mset="csole"][data-mval="n"]'); await commit();                                // 1 Details
  await pick('#f_cworker', 'Factory worker'); await pick('#f_criskloc', 'All India Coverage'); await commit();   // 2 Risk
  await commit();                                                                                        // 3 Company — read from the account
  await commit();                                                                                        // 4 KYC — already on file
  await click('.na [data-flow="instGen"]'); await commit();
  await waitOvl('Send the payment link', 'WC: generating should offer to send the link');
  await commit();
  await expectStage(wc.id, 11, 'WC link sent');
  await click('[data-v74sim="instPaid"]');
  await expectStage(wc.id, 12, 'WC paid on Cholamandalam’s link');
  if ((await lineOn(sharma.id, 'Workmen’s Compensation')).owner !== 'priya') fail('WC: at Payment Completed the opportunity should go to Priya');
  await rmByRule(sharma.id, 'WC');
  await signIn('priya'); await openLine(wc.id);
  await click('.na [data-flow="cholaShare"]'); await commit();
  await expectStage(wc.id, 15, 'WC policy shared');
  await expect('issued in real time by Cholamandalam', 'WC issued');
  await shot('demo-03-wc-issued');
  log('case 1 (Sharma · WC · DUA) ok');

  // ---- case 2: Northgate Systems, Cyber Liability — Non-DUA ----
  await prospectToHandoff('PR-1002', 'Northgate');
  const north = await acctNamed('Northgate Systems Pvt Ltd');
  if (!north.id || !north.prov || north.city !== 'Mumbai' || !north.fin) fail('the hand-off should open Northgate Systems with its profile filled in: ' + JSON.stringify(north));
  const cy = await lineOn(north.id, 'Cyber Liability');
  if (cy.stage !== 1 || cy.owner !== 'nikhil') fail('the hand-off should open a Cyber opportunity at New Lead for Nikhil: ' + JSON.stringify(cy));
  await signIn('nikhil'); await openLine(cy.id);
  await click('.na [data-flow="firstCall"]'); await click('#ovl [data-pick="disc"]'); await commit();
  await sample('Cyber requirement'); await commit();
  await waitOvl('No insurer returned a price', 'Cyber: no rater quotes, so the route is Non-DUA'); await noHidden('Cyber quotes');
  await commit();                                                                                        // Open the RFQ
  await click('[data-uv="quotes"]'); await click(`[data-rfdemo="${cy.id}"]`);
  const rfq = await page.evaluate((id) => rfqCount(lineById(id)), cy.id);
  if (rfq.missing) fail('Cyber RFQ: Fill sample data should fill every required field, ' + rfq.missing + ' missing');
  await click('.na [data-flow="float"]'); await sample('float to placement'); await commit();
  await expectStage(cy.id, 6, 'Cyber floated to placement'); await noHidden('placement');
  await click('[data-sim="extPlc"]');
  await expectStage(cy.id, 7, 'Cyber quotes in');
  await click('.na [data-rfqact="qcr"]');
  const qv = await page.$eval('#qview', e => e.innerText).catch(() => '');
  for (const s of ['First-party and third-party cyber loss', 'Ransomware']) if (!qv.includes(s)) fail('Cyber QCR should carry cyber cover terms: missing ' + s);
  await click('#qview [data-qvsend]');
  await expectStage(cy.id, 8, 'Cyber QCR sent');
  await click('.na [data-flow="confirm"]'); await click('#ovl [data-pick="New India Assurance"]'); await commit();
  await expectStage(cy.id, 9, 'Cyber confirmed on a provisional account → KYC Details Requested');
  await click('.na [data-flow="kyc"]'); await verifyKyc();
  await expectStage(cy.id, 10, 'Cyber: KYC verified → Purchase Requested');
  await click('.na [data-flow="pay"]'); await sample('payment request'); await commit();
  await click('[data-sim="extOps"]');
  await expectStage(cy.id, 11, 'Cyber: Ops closed the ticket → details emailed automatically');
  const mails = await page.evaluate((id) => (lineById(id).payMails || []).map(m => m.to + ':' + m.by).join(','), cy.id);
  if (mails !== 'sanjay.bhatt@northgate.co.in:system') fail('Cyber: one automatic email to Sanjay Bhatt, got ' + mails);
  await click('.na [data-flow="proof"]'); await sample('payment proof', 1200); await commit();
  await expectStage(cy.id, 12, 'Cyber payment confirmed');
  await rmByRule(north.id, 'Cyber');
  await signIn('priya'); await openLine(cy.id);
  await click('[data-psim="assign"]');
  await expectStage(cy.id, 13, 'Cyber issuance ticket assigned'); await noHidden('post-purchase');
  for (const s of ['rhl', 'pf', 'md']) await click(`[data-psim="${s}"]`);
  await expectStage(cy.id, 14, 'Cyber documents in'); await noHidden('awaiting the copy');
  await click('[data-psim="pol"]'); await click('.na [data-flow="qcApprove"]'); await commit();
  await expectStage(cy.id, 15, 'Cyber policy QC-approved and sent');
  await shot('demo-04-cyber-issued');
  log('case 2 (Northgate · Cyber · Non-DUA) ok');

  // ---- Raise a request: an endorsement on an issued policy, filled with sample data ----
  await page.evaluate(() => go('svcnew')); await page.waitForTimeout(100);
  const svc0 = await page.evaluate(() => S.data.svc.length);
  await click('[data-svcdemo]'); await click('[data-svcsubmit]');
  if ((await page.evaluate(() => S.data.svc.length)) !== svc0 + 1) fail('Raise a request with sample data should submit one request');
  log('raise a request ok');

  // ---- every person in the cast, every screen, every tab of the first record ----
  let visits = 0;
  for (const who of CAST.split(',')) {
    await signIn(who);
    for (const v of await page.$$eval('.side [data-nav]', e => [...new Set(e.map(x => x.dataset.nav))])) {
      await click(`.side [data-nav="${v}"]`); visits++;
      const row = await page.$('.content .row[data-go]');
      if (!row) continue;
      await row.click(); await page.waitForTimeout(80); visits++;
      for (const t of await page.$$eval('[data-uv]', e => e.map(x => [x.dataset.uv, x.dataset.uiset || '']))) {
        const sel = `[data-uv="${t[0]}"]` + (t[1] ? `[data-uiset="${t[1]}"]` : '');
        const el = await page.$(sel); if (el && await el.isVisible()) { await el.click(); await page.waitForTimeout(30); visits++; }
      }
      await noHidden(`${who} on ${v}`);
    }
  }
  log(`walk ok (${visits} screens and tabs)`);

  // ---- Reset returns to the start ----
  await click('[data-reset]'); await page.waitForTimeout(150);
  await startState('after Reset');
  log('reset ok');

  if (errors.length) { console.log(errors.join('\n')); process.exitCode = 1; }
  console.log(errors.length ? 'ERRORS' : 'NO JS ERRORS');
  await browser.close();
})().catch(e => { console.log('CRASH', e.message); process.exit(1); });
