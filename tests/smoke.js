const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + ' @ ' + String(e.stack||'').split('\n').slice(0,3).join(' / ')));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(...a);
  const fail = (m) => { console.log('FAIL', m); process.exitCode = 1; };
  const wrap = process.argv[2] === 'wrap';
  await page.goto('file://' + require('path').resolve(__dirname, '../public/index.html'));
  await page.waitForTimeout(300);
  const txt = async () => page.evaluate(() => ['app','ovl','toasts','cpage','qview','docv'].map(id => (document.getElementById(id)||{}).innerText||'').join(' '));
  const click = async (sel) => { const el = await page.$(sel); if (!el) { fail('missing ' + sel); return false; } try { await el.click({ timeout: 4000 }); } catch (e) { fail('click ' + sel + ': ' + e.message.replace(/\n/g,' | ')); return false; } await page.waitForTimeout(120); return true; };
  const has = async (s) => (await txt()).includes(s);
  const expect = async (s, ctx) => { if (!(await has(s))) fail((ctx || '') + ' expected text: ' + s); };

  // sign in as Nikhil
  await click('[data-signin="nikhil"]');
  await expect('Good morning', 'home');
  await expect('Newly assigned', 'home');
  log('home ok');
  // nav
  for (const v of ['pipeline', 'opps', 'accounts', 'tasks', 'tickets', 'home']) { await click(`[data-nav="${v}"]`); }
  log('nav ok');
  // open a line from home
  await click('[data-nav="home"]');
  await click('.row[data-go="line"]');
  await expect('Stage clock', 'line');
  // tabs
  for (const t of ['req', 'quotes', 'tickets', 'activity', 'tasks', 'manage', 'overview']) { await click(`[data-uv="${t}"]`); }
  log('line tabs ok');
  // click to call on OP-2329 (new lead): dial -> ring -> answer -> live timer -> end ->
  // the outcome form opens by itself, pre-selects nothing, and cannot be escaped
  await page.evaluate(() => go('line', { id: 'OP-2329' }));
  await click('[data-flow="ctc"]');
  await expect('Dialling', 'click to call dials');
  await page.waitForTimeout(1900);
  await expect('Ringing', 'click to call rings');
  await click('[data-mset="ph"][data-mval="live"]');
  await expect('Connected', 'click to call connects');
  if (!(await page.$('#ctcT'))) fail('no live call timer');
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  if (!(await page.evaluate(() => S.flow === 'ctc'))) fail('a live call could be dismissed with Escape');
  await click('[data-mset="ph"][data-mval="e_done"]');
  await page.waitForTimeout(1400);
  await expect('Call outcome', 'the outcome form opens by itself when the call ends');
  await expect('Click to call', 'the outcome form carries what the switch reported');
  if (await page.evaluate(() => !!S.sel.d)) fail('the outcome form pre-selected a disposition');
  if (await page.$('#ovl .x')) fail('the mandatory disposition still offers a close button');
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  if (!(await page.evaluate(() => S.flow === 'call' && !!S.sel.ctc))) fail('the mandatory disposition could be dismissed without an outcome');
  await click('[data-pick="ring"]');
  await click('[data-commit]');
  await expect('Consultation Setup', 'after the click-to-call disposition');
  await click('[data-uv="activity"]');
  await expect('click to call', 'the activity records the call itself, not only the outcome');
  await click('[data-uv="overview"]');
  // the manual route opens the same form, unbound to a call, and that one closes
  await click('[data-flow="call"]');
  if (!(await page.evaluate(() => S.flow === 'call' && !S.sel.ctc))) fail('the manual route did not open the same form, unbound to a call');
  await expect('Pick the outcome', 'a manually logged call is the same form');
  if (!(await page.$('#ovl .x'))) fail('a manually logged call should be closable');
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  if (await page.evaluate(() => S.flow)) fail('a manually logged call could not be closed');
  log('click to call ok');
  // discovery
  await click('[data-flow="disc"]');
  await page.fill('#f_si', '₹18 Cr'); await page.fill('#f_tp', '₹3,40,000');
  log(await page.evaluate(() => JSON.stringify({dis:document.querySelector('#ovl [data-commit]').disabled, sel:S.sel, can:FLOWS[S.flow].can(), flow:S.flow, stage:FL().stage})));
  await click('[data-commit]');
  await expect('Details Captured', 'after disc');
  // DAU: no RFQ — the rater's quotes are there at stage 3, QCR jumps to 8
  await expect('Pick what to send', 'DAU next action at 3');
  await click('[data-uv="quotes"]');
  await expect('Quotes from the rater', 'rater quotes on the tab');
  if (await has('Send for client review')) fail('DAU line should have no RFQ');
  await click('[data-flow="qcr"]'); await click('[data-commit]');
  await expect('Quote Sent', 'after qcr');
  await expect('Quote Sent · waiting on', 'DAU 3 → 8');
  if (/Stage \d+ ·/.test(await txt())) fail('stage numbers still shown on the line');
  // confirm
  await click('[data-flow="confirm"]'); await click('[data-pick="ICICI Lombard"]'); await click('[data-commit]');
  await expect('Purchase Requested', 'after confirm');
  // pay
  await click('[data-flow="pay"]'); await click('[data-commit]');
  await expect('PAY-2329', 'after pay');
  await click('[data-sim="extOps"]');
  await expect('Check them and send them to the client', 'share next action');
  await click('[data-flow="share"]');
  await expect('Payment mode', 'mode shown before sending');
  await expect('NEFT / RTGS', 'the mode chosen at the request');
  await click('[data-commit]');
  await expect('Payment Details Shared', 'after share');
  await expect('Waiting for the payment screenshot', 'stage 10 next action');
  await click('[data-sim="extPaid"]');
  await click('[data-flow="proof"]');
  if (!(await page.$eval('#ovl [data-commit]', b => b.disabled))) fail('proof: confirm should be disabled before a screenshot');
  await page.setInputFiles('#f_proofimg', { name: 'proof.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
  await page.waitForTimeout(150);
  await expect('Only a payment screenshot is accepted', 'non-image rejected');
  await click('[data-prooffail]'); await click('[data-proofsample]'); await page.waitForTimeout(1100);
  await expect('Couldn’t read the amount', 'unreadable screenshot');
  await page.fill('#f_amt', '1000'); await page.waitForTimeout(150);
  await expect('Amount does not match', 'typed amount mismatch');
  await page.fill('#f_pnote', 'Wants the copy before month end'); await page.waitForTimeout(100);
  if (!(await page.$eval('#ovl [data-commit]', b => b.disabled))) fail('proof: mismatch should block');
  await click('[data-proofclear]'); await click('[data-prooffail]'); await click('[data-proofsample]'); await page.waitForTimeout(1100);
  await expect('Amount and UTR read from the screenshot', 'amount read');
  await click('[data-commit]');
  await expect('Payment Completed', 'after proof');
  await expect('ISS-', 'iss created');
  await expect('Sold by you', 'sold-by banner');
  log('full line flow ok');
  // non-DAU: RFQ on screen at 3 (OP-2244 · Cyber) with a required detail missing → only Send for client review
  await page.evaluate(() => { S.ui['ltab_OP-2244']='quotes'; go('line', { id: 'OP-2244' }); });
  await expect('Fill the RFQ', 'non-DAU next action at 3');
  await expect('required details filled', 'footer progress');
  if (await page.$eval('#rfoot_OP-2244 [data-flow="float"]', b => b.offsetParent !== null)) fail('float should not be visible with required fields empty');
  if ((await page.$eval('#rfoot_OP-2244 [data-rfqact="send"]', b => b.className)).indexOf('primary') >= 0) fail('send should be secondary while incomplete');
  if (await has('Fill from an Excel')) fail('Excel option should be gone');
  if (await page.$('.src')) fail('who-filled marks should be gone');
  await page.fill('#rf_lim', '₹2 Cr any one claim'); await page.dispatchEvent('#rf_lim', 'change');
  if (!(await page.evaluate(() => lineById('OP-2244').rfq.f.lim.by === 'owner'))) fail('owner attribution in data');
  await click('#rfoot_OP-2244 [data-rfqact="send"]');
  await expect('RFQ emailed to', 'one-click email');
  await expect('RFQ Shared for Client Review', 'stage 4');
  await expect('Copy link', 'copy link offered');
  await click('[data-rfqact="client"]');
  await expect('We need 1 detail from you', 'client page asks for the missing detail');
  if (!(await page.$eval('[data-cpapprove]', b => b.disabled))) fail('approve locked while details missing');
  await page.selectOption('#rfc_geo', 'Under 10%');
  await page.fill('#rfc_emp', '14'); await page.dispatchEvent('#rfc_emp', 'change');
  if (await page.$eval('[data-cpapprove]', b => b.disabled)) fail('approve should unlock');
  await click('[data-cpapprove]');
  await expect('Approved — thank you', 'client success');
  await click('[data-cpclose]');
  await expect('RFQ Verified by Client', 'stage 5');
  await expect('Approved by', 'rbar approved');
  if (!(await page.evaluate(() => lineById('OP-2244').rfq.f.emp.by === 'client'))) fail('client edit of an RM field should be attributed to the client');
  await click('#rfoot_OP-2244 [data-flow="float"]'); await click('[data-commit]');
  await expect('Quote Requested', 'floated to 6');
  await expect('after the client approved', 'rfq folded after floating');
  log('non-DAU rfq via client ok');
  // QCR is a report: review it → send back for revision (OP-2244), and review → send to contact (OP-2260)
  await click('[data-flow="answerQ"][data-line="OP-2244"]'); await page.fill('#f_q', 'Limit is ₹2 Cr AOC; no USA exposure.'); await click('[data-commit]');
  await click('[data-sim="extPlc"][data-line="OP-2244"]');
  await expect('Quotes Received', 'placement returned the QCR');
  await click('#nacard [data-rfqact="qcr"]');
  if (!(await page.evaluate(() => { var q=document.getElementById('qview'); return q && !q.hidden && /Quote Comparison Report/.test(q.innerText); }))) fail('QCR report viewer should open');
  if (!(await page.$('#qview [data-qvsend]'))) fail('send to contact CTA');
  await click('#qview [data-qvback]');
  await click('[data-pick="us"]'); await page.fill('#f_x', 'Ask for a lower deductible'); await click('[data-commit]');
  await expect('Quote Requested', 'sent back → 6');
  await click('[data-uv="quotes"]');
  await expect('Placement is preparing it', 'v2 in preparation');
  await page.evaluate(() => { go('line', { id: 'OP-2260' }); });
  await click('[data-sim="extPlc"][data-line="OP-2260"]');
  await click('[data-uv="quotes"]');
  if (await page.$('#app table.t td.nm')) fail('QCR should be a report card, not a list of quotes');
  await click('.qcard [data-qcrview]');
  await click('#qview [data-qvsend]');
  await expect('Quote Sent', 'QCR sent → 8');
  if (await page.evaluate(() => { var q=document.getElementById('qview'); return q && !q.hidden; })) fail('viewer should close after sending');
  await click('.qcard [data-qcrview]');
  if (await page.$('#qview [data-qvsend]')) fail('a sent QCR opens read-only');
  await click('#qview [data-qvclose]');
  log('qcr report review ok');
  // non-DAU direct float: OP-2150 is DAU — use the rater-empty switch, then fill and float directly
  await page.evaluate(() => { S.ui['ltab_OP-2150']='quotes'; go('line', { id: 'OP-2150' }); });
  await click('[data-sim="raterNone"]');
  await expect('switched from DAU', 'rater empty → switch');
  // fill the remaining required fields the way the owner would (last one typed, to exercise the in-place footer)
  await page.evaluate(() => { var l=lineById('OP-2150'), fs=rfqFlat(l).filter(f=>f.req&&!rfqVal(l,f.k)); fs.slice(0,-1).forEach(f=>{ l.rfq.f[f.k]={v:f.s||'x',by:'owner',who:S.user,at:S.now}; }); save(); paint(); });
  const lastK = await page.evaluate(() => { var l=lineById('OP-2150'); return rfqFlat(l).filter(f=>f.req&&!rfqVal(l,f.k))[0].k; });
  const tag = await page.$eval('#rf_' + lastK, e => e.tagName);
  if (tag === 'SELECT') await page.selectOption('#rf_' + lastK, { index: 1 }); else { await page.fill('#rf_' + lastK, 'Filled'); await page.dispatchEvent('#rf_' + lastK, 'change'); }
  await expect('All required details are filled', 'complete → both options');
  if ((await page.$eval('#rfoot_OP-2150 [data-rfqact="send"]', b => b.className)).indexOf('primary') < 0) fail('send should be primary when complete');
  if (await page.$eval('#rfoot_OP-2150 [data-flow="float"]', b => b.offsetParent === null)) fail('float should be visible when complete');
  await click('#rfoot_OP-2150 [data-flow="float"]'); await click('[data-commit]');
  await expect('Quote Requested', 'direct float to 6');
  if (!(await page.evaluate(() => skipped(lineById('OP-2150'),4) && skipped(lineById('OP-2150'),5)))) fail('direct float should skip 4 and 5');
  log('direct float ok');
  // DAU at 8: client rejects every quote → back to 3 as non-DAU with the RFQ open
  await page.evaluate(() => { go('line', { id: 'OP-2290' }); });
  await click('[data-flow="rejectAll"]'); await page.fill('#f_why', 'Premiums too high'); await click('[data-commit]');
  await expect('Switched to the RFQ route', 'reject all');
  await expect('Details Captured', 'back to 3');
  await click('[data-uv="quotes"]');
  await expect('Rejected by the client', 'rejected DAU QCR kept');
  log('dau reject-all ok');
  // the seeded non-DAU new lead: Kaveri Polymers · CGL at New Lead → capture → non-DAU RFQ
  await click('[data-nav="pipeline"]');
  await expect('Kaveri Polymers', 'new CGL lead in the pipeline');
  await page.evaluate(() => go('line', { id: 'OP-2335' }));
  await expect('New Lead · waiting on', 'new lead');
  await expect('Route not known yet', 'route unknown before capture');
  await click('[data-flow="call"]'); await click('[data-pick="disc"]'); await click('[data-commit]');
  await page.fill('#f_si', '₹10 Cr'); await page.fill('#f_tp', '₹1,20,000'); await click('[data-commit]');
  await expect('Discovery complete — Non-DAU', 'classified non-DAU');
  await expect('Details Captured · waiting on', 'first contact → 3');
  await click('[data-uv="quotes"]');
  await expect('Limit of liability asked for', 'CGL RFQ opened on screen');
  await expect('Send for client review', 'rfq action');
  if (await page.$('[data-flow="qcr"]')) fail('non-DAU line should not offer the rater QCR');
  log('kaveri non-DAU new lead ok');
  // first contact straight to discovery on OP-2331 (route unknown until then)
  await page.evaluate(() => go('line', { id: 'OP-2331' }));
  await expect('Route not known yet', 'route unknown');
  await click('[data-flow="call"]');
  await expect('First Contact', 'first contact title');
  await click('[data-pick="disc"]'); await click('[data-commit]');
  await page.fill('#f_si', '₹4 Cr'); await page.fill('#f_tp', '₹28,000'); await click('[data-commit]');
  await expect('Details Captured', 'first contact → stage 3');
  await expect('Details Captured · waiting on', 'stepper caption');
  if (await has('Route not known yet')) fail('route should be classified after discovery: ' + await page.evaluate(() => JSON.stringify({l:lineById('OP-2331').rate, st:lineById('OP-2331').stage, req:!!lineById('OP-2331').req, where:(document.body.textContent.match(/.{80}Route not known yet.{40}/)||[''])[0]})));
  await click('[data-nav="opps"]');
  await expect('Opportunities', 'opps list');
  await click('[data-pill="ost"][data-pv="all"]');
  await click('.row[data-go="opp"]');
  await expect('Product lines', 'opp from list');
  log('first contact + opps ok');
  // ticket flow screen
  await page.evaluate(() => go('ticket', { id: 'PAY-2329' }));
  await expect('Payment proof', 'pay ticket after payment');
  await expect('NEFT / RTGS', 'pay ticket shows the mode');
  await expect('Paid —', 'pay ticket closed');
  await page.evaluate(() => go('ticket', { id: 'PLC-2260' }));
  await expect('Query from placement', 'plc ticket');
  await expect('QCR v1 is with', 'plc ticket at quote sent');
  await page.evaluate(() => go('ticket', { id: 'PLC-2244' }));
  await expect('Placement is reworking the QCR — v2', 'plc ticket in revision');
  await expect('Sent back', 'revision step on the track');
  await expect('What went to placement', 'plc ticket details');
  await page.evaluate(() => go('ticket', { id: 'PLC-2204' }));
  await expect('Closed with the line', 'plc ticket on a closed line');
  await page.evaluate(() => go('ticket', { id: 'PLC-2102' }));
  await expect('QCR v1 is with', 'plc ticket open at quote sent');
  await page.evaluate(() => go('ticket', { id: 'PAY-2233' }));
  await expect('Ops is preparing the NEFT / RTGS details', 'pay ticket with ops');
  await click('[data-sim="extOps"]');
  await expect('Check them and send them to', 'pay ticket back from ops');
  await expect('Not sent yet', 'pay ticket not sent');
  log('ticket ok');
  // opportunity
  await page.evaluate(() => go('opp', { id: 'O-1042' }));
  await expect('Product lines', 'opp');
  await click('[data-flow="addLine"]');
  await page.selectOption('#f_product', 'Directors & Officers');
  await click('[data-commit]');
  await expect('Directors & Officers', 'added line');
  log('opp + addLine ok');
  // [stated 23 Sep] Add product line only while the opportunity is Open; no Empty status
  await page.evaluate(() => go('opp', { id: 'O-1083' }));
  await expect('Product lines', 'won opp');
  const addState = await page.evaluate(() => { const bs = [...document.querySelectorAll('#app button')].filter(x => x.innerText.trim() === 'Add product line'); return { n: bs.length, disabled: bs.every(x => x.disabled), flow: bs.some(x => x.dataset.flow) }; });
  if (!(addState.n === 1 && addState.disabled && !addState.flow)) fail('add product line should be disabled on a won opportunity: ' + JSON.stringify(addState));
  const emptyStatus = await page.evaluate(() => S.data.opps.some(o => oppStatus(o).tx === 'Empty'));
  if (emptyStatus) fail('Empty opportunity status still exists');
  log('opp add-line gate ok');
  // account 360
  await page.evaluate(() => go('acct', { id: 'A-1001' }));
  for (const t of ['opps', 'policies', 'svc', 'profile', 'group', 'overview']) { await click(`[data-uv="${t}"]`); }
  await click('[data-flow="addContact"]');
  await page.fill('#f_n', 'Test Person'); await page.fill('#f_m', '9876543210');
  await click('[data-commit]');
  await expect('Test Person', 'contact added');
  log('acct ok');
  // accounts finder
  await click('[data-nav="accounts"]');
  await page.fill('#aq', 'kalyan'); await page.waitForTimeout(150);
  await expect('Kalyan Logistics', 'finder');
  await click('[data-clearaf]');
  // new opportunity: existing PAN
  await click('[data-flow="newOpp"]');
  await page.fill('#f_pan', 'AAECK9912J'); await page.waitForTimeout(100);
  await page.fill('#f_cn', 'Someone'); await page.fill('#f_m', '9876543210');
  await page.selectOption('#f_product', 'Cyber Liability');
  await page.selectOption('#f_src', 'Referral');
  await click('[data-mset="bt"][data-mval="fresh"]');
  await expect('Matched on PAN', 'newopp match');
  await click('[data-commit]');
  await expect('Created', 'newopp created');
  await click('[data-close]');
  // new opportunity: no PAN → provisional
  await click('[data-flow="newOpp"]');
  await page.fill('#f_name', 'Fresh Test Co'); await page.fill('#f_cn', 'A Person'); await page.fill('#f_e', 'a@b.co');
  await page.selectOption('#f_product', 'Marine Cargo'); await page.selectOption('#f_src', 'Partner');
  await click('[data-mset="bt"][data-mval="roll"]');
  await click('[data-commit]');
  await expect('provisional account', 'newopp provisional');
  await click('[data-go="line"]');
  await expect('Provisional', 'line on provisional');
  log('newopp ok');
  // inbound sims
  await click('[data-nav="home"]');
  await click('[data-inbound="fire"]'); await click('[data-inbound="marine"]'); await click('[data-inbound="gh"]');
  log('inbound ok');
  // tasks: add + complete
  await click('[data-nav="tasks"]');
  await click('[data-flow="addTask"]');
  await page.fill('#f_title', 'Test task');
  await page.selectOption('#f_lineId', 'OP-2203');
  await page.fill('#f_due', '2026-09-25');
  await click('[data-commit]');
  await expect('Test task', 'task added');
  await click('[data-taskdone]');
  log('tasks ok');
  // offline
  await page.evaluate(() => { S.offline = true; paint(); });
  await page.evaluate(() => go('line', { id: 'OP-2203' }));
  await click('[data-uv="activity"]');   // Log activity lives on the Activity tab, not the next-action card
  await click('[data-flow="logAct"]'); await page.fill('#f_x', 'hello'); await click('[data-commit]');
  await expect('Couldn’t save', 'offline toast');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  await click('[data-offline="0"]');
  await page.waitForTimeout(200);
  log('offline ok');
  // time control
  await click('[data-proto]'); await click('[data-time="2700"]'); await click('[data-close]');
  await click('[data-nav="home"]');
  log('time ok');
  // search
  await page.fill('#gsearch', 'sharma'); await page.press('#gsearch', 'Enter'); await page.waitForTimeout(150);
  await expect('Results for', 'search');
  await page.evaluate(() => go('line', { id: 'OP-9999' }));
  await expect('isn’t here', 'notfound');
  // switch to Vikram
  await click('[data-switch]'); await click('[data-signin="vikram"]');
  await expect('Good morning, Vikram', 'sales head home');
  await expect('escalated tasks and the lines that have stalled', 'sales head purpose line');
  if (await page.$('#app table.t')) fail('no table belongs on the sales head home');
  if (!(await has('Escalated tasks')) && !(await has('Nothing needs you right now'))) fail('sales head home shows escalated tasks or a clear state');
  // the view switcher: a head works either their own book or the team's
  if (!(await page.$('.vsw [data-vw="mine"]'))) fail('no view switcher on a head');
  await click('.vsw [data-vw="mine"]');
  await expect('Good morning, Vikram', 'sales head in My view lands on the executive home');
  if (await has('escalated tasks and the lines that have stalled')) fail('My view still shows the team home');
  if (!(await page.$('[data-nav="pipeline"]'))) fail('My view nav has no Pipeline');
  await click('[data-nav="pipeline"]');
  await expect('Every product line you own', 'My view pipeline is the head\u2019s own book');
  await click('.vsw [data-vw="team"]');
  await expect('Every product line your team owns', 'Team view keeps you on Pipeline, scoped to the team');
  await click('[data-nav="team"]');
  await expect('escalated tasks and the lines that have stalled', 'Team view home');
  await click('[data-nav="rules"]');
  await expect('Task rules', 'rules');
  await expect('TR-13', 'rules list has the condition-set seeds');
  await expect('or', 'rules list shows OR');
  // builder: condition groups, filters, wait, re-check, repeat, close when
  await click('[data-go="rule"][data-id="new"]');
  await expect('Create a task rule', 'builder');
  await page.fill('#rb_n', 'Test rule');
  await page.selectOption('#c_when_0_0_value', '3');
  await expect('3 · Details Captured', 'sentence follows the condition');
  await click('[data-rcond="cadd"][data-cw="when"][data-g="0"]');
  await page.selectOption('#c_when_0_2_type', 'task');
  await expect('Pick a task name for every Task condition', 'task cond needs a name');
  await page.selectOption('#c_when_0_2_task', 'Call the new lead');
  await page.selectOption('#c_when_0_2_value', 'done');
  await click('[data-rcond="gadd"][data-cw="when"]');
  await expect('Group 2', 'OR group added');
  await click('[data-rcond="gdel"][data-cw="when"][data-g="1"]');
  await page.fill('#rb_ti', 'Do the thing');
  await click('[data-rbpf="Marine Cargo"]');
  await page.fill('#rb_waitN', '2');
  await expect('A wait in hours on a daily check', 'warning: hours on daily');
  await click('[data-rbset="recheck"][data-rv="hourly"]');
  await click('[data-rbset="repeat"][data-rv="1"]');
  await page.fill('#rb_max', '3');
  await click('[data-rcond="gadd"][data-cw="closeWhen"]');
  await expect('Closes itself when', 'close when in sentence');
  await expect('Complete.', 'builder complete');
  await click('[data-rbsave]');
  await expect('TR-14', 'rule created');
  await expect('Do the thing', 'new rule in list');
  await click('[data-ruletoggle="TR-07"]');
  // duplicate title is refused
  await click('[data-go="rule"][data-id="new"]');
  await page.fill('#rb_n', 'Dup'); await page.fill('#rb_ti', 'do the thing');
  await expect('Titles must be unique', 'unique title');
  await click('[data-go="rules"]');
  // simulator on a real line
  await click('[data-go="rulesim"]');
  await expect('Every rule, against this line', 'simulator');
  await page.selectOption('#sim_line', 'OP-2310');
  await expect('OP-2310', 'sim line picked');
  await page.selectOption('#sim_disp', 'Ringing, no answer');
  await click('[data-simcall]');
  await expect('Disposition logged', 'sim call');
  await expect('2 · Consultation Setup', 'sim: first contact moved the stage');
  await click('[data-time="next:hourly"]');
  await expect('Clock moved', 'sim clock');
  await click('[data-time="540"]');
  await expect('Follow-up call', 'TR-11 fired after the no-connect wait');
  await click('[data-simstage="8"]');
  await expect('Stage moved to 8', 'sim stage');
  await expect('Closed by the system', 'TR-11 closed when the line left stage 2');
  await page.selectOption('#sim_status', 'park');
  await expect('Status set to Time Pending', 'sim status');
  await page.selectOption('#sim_status', 'open');
  await click('[data-simall="1"]');
  await expect('This line only', 'log toggle');
  // settings
  await click('[data-go="rulecfg"]');
  await expect('Working calendar', 'settings');
  await page.fill('#cfg_hol', '2026-11-11'); await page.dispatchEvent('#cfg_hol', 'change');
  await click('[data-holadd]');
  await expect('11 Nov 2026', 'holiday added');
  await click('[data-holdel="2026-11-11"]');
  if (await has('11 Nov 2026')) fail('holiday not removed');
  await page.selectOption('#cfg_daily', '11');
  await expect('11:00', 'daily check hour changed');
  await click('[data-go="rules"]');
  // takeover
  await page.evaluate(() => go('line', { id: 'OP-2203' }));
  await expect('Read-only', 'mgr readonly');
  await click('[data-flow="takeover"]'); await page.selectOption('#f_rs', 'Owner on leave'); await click('[data-commit]');
  await expect('Hand back', 'took over');
  await click('[data-flow="handback"]'); await click('[data-commit]');
  await click('[data-nav="pipeline"]'); await click('[data-nav="tasks"]'); await click('[data-nav="tickets"]'); await click('[data-nav="accounts"]');
  log('manager ok');
  // Priya
  await click('[data-switch]'); await click('[data-signin="priya"]');
  await expect('Newly assigned', 'rm home');
  await click('[data-nav="tickets"]');
  await click('.row[data-go="svctix"]');
  await expect('Thread', 'svctix');
  await page.evaluate(() => go('svctix', { id: 'END-RM-000406' }));
  await click('[data-flow="svcReply"]'); await page.fill('#f_x', 'Here is a clearer copy'); await click('[data-commit]');
  await expect('Back with the desk', 'reply');
  await page.evaluate(() => go('svctix', { id: 'CLM-0912' }));
  await click('[data-svcdoc="0"]');
  await click('[data-flow="svcAsk"]'); await page.fill('#f_x', 'Question?'); await click('[data-commit]');
  // raise endorsement (Priya owns Sharma Industries now)
  await page.evaluate(() => go('acct', { id: 'A-1001' }));
  await click('[data-uv="policies"]');
  await click('[data-go="svcnew"][data-pol="POL-FSP-2025-8841"][data-kind="end"]');
  await expect('Which policy', 'svcnew');
  await page.selectOption('[data-uisel="sn_type"]', 'Change in bank details');
  await page.fill('#sn_f0', 'HDFC'); await page.fill('#sn_f1', '1234'); await page.fill('#sn_f2', 'HDFC0000123');
  await click('[data-sndoc="Cancelled cheque"]');
  await click('[data-svcsubmit]');
  await expect('END-RM-000419', 'endorsement raised');
  await click('[data-svcsim="next"]');
  await click('[data-svcsim="query"]');
  // raise a claim on expired policy with loss after expiry → error (Novacast is Rohan's)
  await click('[data-switch]'); await click('[data-signin="rohan"]');
  await page.evaluate(() => go('svcnew'));
  await click('[data-uv="clm"]');
  await page.selectOption('[data-uisel="sn_acct"]', 'A-1007');
  await page.selectOption('[data-uisel="sn_pol"]', 'POL-LIA-2025-2019');
  await page.selectOption('[data-uisel="sn_cause"]', 'Fire');
  await page.fill('#sn_dol', '2026-09-10'); await page.waitForTimeout(150);
  await expect('not covered', 'claim after expiry');
  await page.fill('#sn_dol', '2026-08-10'); await page.waitForTimeout(150);
  await page.fill('#sn_est', '₹1,00,000'); await page.fill('#sn_desc', 'Fire in godown');
  await click('[data-sndoc="Claim intimation letter"]'); await click('[data-sndoc="Photographs of the loss"]');
  await click('[data-svcsubmit]');
  await expect('CLM-0920', 'claim raised');
  await click('[data-svcsim="srv"]'); await click('[data-svcsim="repud"]'); await click('[data-svcsim="approve"]'); await click('[data-svcsim="settle"]');
  await expect('Settled', 'claim settled');
  // endorsement on expired policy blocked
  await page.evaluate(() => go('svcnew'));
  await click('[data-uv="end"]');
  await page.selectOption('[data-uisel="sn_acct"]', 'A-1007');
  await page.selectOption('[data-uisel="sn_pol"]', 'POL-LIA-2025-2019');
  await expect('cannot be raised on an expired policy', 'endo expired');
  // [stated 23 Sep] policies: Fresh / Cross-sell / Renewal, and Policy 360
  await page.evaluate(() => { S.ui['atab_A-1001']='policies'; go('acct', { id: 'A-1001' }); });
  for (const t of ['Policy number','Sum insured','Start','End','Status','Type']) await expect(t, 'policy columns');
  const ptypes = await page.evaluate(() => {
    const a = S.data.accounts.filter(x => x.id === 'A-1001')[0];
    return a.pols.map(p => p.id + '=' + polType(p)).join(',');
  });
  if (!/POL-BUR-2024-3310=Fresh/.test(ptypes)) fail('first policy booked should be Fresh: ' + ptypes);
  if (!/POL-BUR-2025-7702=Renewal/.test(ptypes)) fail('a renewed policy should be Renewal: ' + ptypes);
  if (/POL-FSP-2025-8841=Fresh/.test(ptypes)) fail('only the first policy is Fresh: ' + ptypes);
  await click('[data-pill="apf_A-1001"][data-pv="Renewal"]');
  if (await has('POL-FSP-2025-8841')) fail('the Renewal filter should hide cross-sell policies');
  await click('[data-pill="apf_A-1001"][data-pv="all"]');
  await click('[data-go="policy"][data-id="POL-BUR-2025-7702"]');
  await expect('Policy details', 'policy 360');
  await expect('Renewed from POL-BUR-2024-3310', 'policy provenance');
  await expect('Renewal open', 'the open renewal line is linked');
  for (const t of ['quotes', 'docs', 'svc']) await click(`[data-uv="${t}"][data-uiset="ptab_POL-BUR-2025-7702"]`);
  await expect('Endorsements (', 'policy 360 servicing tab');
  // a sales executive can open Policy 360 too
  await click('[data-switch]'); await click('[data-signin="nikhil"]');
  await page.evaluate(() => go('policy', { id: 'POL-FSP-2025-8841' }));
  await expect('Policy details', 'sales can open policy 360');
  await click('[data-switch]'); await click('[data-signin="priya"]');
  log('policies + policy 360 ok');
  log('rm ok');
  // RM home buckets + post-purchase line flow (back to Priya)
  await click('[data-switch]'); await click('[data-signin="priya"]');
  await click('[data-nav="rmhome"]');
  await expect('Newly assigned', 'rm home');
  await expect('Renewal management', 'rm home renewals');
  await expect('Tasks', 'rm home tasks');
  // renewals pipeline (RMs only): bands, the carried-over RFQ, client review, float — from the seed clock
  await page.evaluate(() => reset()); await page.waitForTimeout(100);
  await click('[data-nav="renewals"]');
  for (const t of ['Due today', '1–7 days', '31–60 days', 'POL-MC-2026-4417', 'endorsed 3 times']) await expect(t, 'renewals pipeline');
  await click('[data-uiset="rnb"][data-uv="d7"]'); await expect('POL-BUR-2025-7702', 'band filter');
  if (await has('POL-MC-2026-4417')) fail('band filter should hide 31–60');
  await click('[data-pill="rnf"][data-pv="due"]');
  await page.evaluate(() => { S.ui.rnb=''; S.ui['ltab_OP-2942']='quotes'; go('line', { id: 'OP-2942' }); });
  await expect('Carried over from', 'renewal rfq note');
  await expect('Check last year’s RFQ', 'renewal next action');
  if (await has('New Lead')) fail('renewal line should hide New Lead');
  const v1 = await page.evaluate(() => rfqVal(lineById('OP-2942'),'ins')+'|'+rfqVal(lineById('OP-2942'),'start')+'|'+rfqVal(lineById('OP-2942'),'com'));
  if (v1 !== 'Tata AIG|2026-11-03|Packaged auto parts') fail('carried-over rfq values: '+v1);
  await page.fill('#rf_com', 'Bulk polymer granules'); await page.dispatchEvent('#rf_com', 'change');
  if (await page.evaluate(() => rfqVal(lineById('OP-2942'),'com')) !== 'Bulk polymer granules') fail('RM edit on renewal RFQ');
  await click('.rfoot [data-rfqact="send"]');
  await expect('RFQ Shared for Client Review', 'renewal sent for review');
  await click('[data-rfqact="client"]');
  await expect('Renewal of your Marine Cargo policy', 'client page renewal copy');
  await click('[data-cpapprove]'); await click('[data-cpclose]');
  await expect('RFQ Verified by Client', 'renewal approved');
  await click('[data-flow="float"]'); await click('[data-commit]');
  await expect('Quote Requested', 'renewal floated');
  // [24 Sep] a renewal is never DAU. A previously-DAU policy has no RFQ to carry over,
  // so a new one opens pre-filled from the policy and the account, for the RM to fill.
  await page.evaluate(() => go('line', { id: 'OP-2944' }));
  if (await page.evaluate(() => lineById('OP-2944').rate) !== 0) fail('renewal of a DAU policy must be an RFQ line');
  if (await page.evaluate(() => renRfqSrc(lineById('OP-2944'))) !== 'dau') fail('renewal rfq source should be dau');
  await expect('there is none to carry over', 'dau-at-fresh renewal asks for the RFQ');
  await expect('Placement · renewal', 'renewal route chip');
  if (await has('Renewal prices are in')) fail('no rater quotes on a renewal');
  await page.evaluate(() => { S.ui['ltab_OP-2944']='quotes'; paint(); });
  await expect('There is no RFQ to carry over', 'renewal rfq note explains why it is empty');
  // a policy never bought through the CRM: pre-filled from the policy record
  if (await page.evaluate(() => renRfqSrc(lineById('OP-2941'))) !== 'outside') fail('renewal rfq source should be outside');
  // a renewal whose fresh buy was non-DAU still carries last year's RFQ over
  await page.evaluate(() => go('line', { id: 'OP-2912' }));
  if (await page.evaluate(() => lineById('OP-2912').rate) !== 0) fail('non-dau renewal rate');
  // editing the renewal details never re-routes it
  await page.evaluate(() => { S.ui['ltab_OP-2944']='overview'; go('line', { id: 'OP-2944' }); });
  await click('#nacard [data-flow="disc"]');
  await expect('Update the renewal details', 'renewal update form');
  if (await has('Stays DAU')) fail('no DAU re-check at renewal any more');
  await page.fill('#f_si', '₹30 Cr'); await page.waitForTimeout(80);
  await click('[data-commit]');
  await expect('Details Captured · waiting on', 'still at details captured');
  if (await page.evaluate(() => lineById('OP-2944').rate) !== 0) fail('renewal stays an RFQ line after an edit');
  // contractual policies never renew
  if (await page.evaluate(() => S.data.lines.some(l => l.renews && isContractual(l.product)))) fail('a contractual renewal line exists');
  if (await page.evaluate(() => !!renLineOf('POL-WC-2025-3310'))) fail('WC policy must not get a renewal line');
  // the system opens a renewal line when a policy crosses 90 days
  if (await page.evaluate(() => !!renLineOf('POL-FIRE-2025-3318'))) fail('renewal opened too early');
  await page.evaluate(() => { advanceClock(addWork(S.now, 2700)); paint(); });
  if (!(await page.evaluate(() => { var l=renLineOf('POL-FIRE-2025-3318'); return l && l.stage===3 && l.owner==='rohan' && l.rate===0 && l.rfq && l.rfq.st==='draft'; }))) fail('renewal auto-created at 90 days as an RFQ line');
  await page.evaluate(() => { S.now=T0.getTime(); paint(); });
  await click('[data-nav="pipeline"]');
  await click('[data-pill="pf"][data-pv="post"]');
  await expect('Policy Documents Pending', 'rm pipeline post');
  // OP-2925: stage 11 → welcome call → assign → chase → client fills → mandate → policy → qc → 14
  await page.evaluate(() => go('line', { id: 'OP-2925' }));
  await expect('Payment Completed', 'stage 11');
  await click('[data-flow="welcome"]'); await click('[data-pick="ok"]'); await click('[data-commit]');
  await expect('Welcome call logged', 'welcome logged');
  await click('[data-psim="assign"]');
  await expect('Policy Documents Pending · waiting on', 'assigned → 12');
  await expect('Waiting on Client', 'waiting on client');
  await click('[data-flow="chase2"]'); await click('[data-pick="date"]'); await page.fill('#f_dt', '2026-10-15'); await click('[data-commit]');
  await expect('Chase logged', 'chase logged');
  await click('[data-psim="pf"]'); await click('[data-psim="md"]');
  await expect('Awaiting Policy Copy · waiting on', 'docs in → 13');
  await click('[data-psim="polfu"]'); await click('[data-psim="pol"]');
  await expect('in QC', 'qc');
  await click('[data-psim="qc"]');
  await expect('Issued — Policy Copy Sent to Client', 'issued 14');
  await click('[data-flow="explain"]'); await click('[data-pick="ok"]'); await click('[data-commit]');
  await expect('Steady state', 'steady');
  // OP-2923 offline form upload (Rohan's line — switch)
  await click('[data-switch]'); await click('[data-signin="rohan"]');
  await page.evaluate(() => go('line', { id: 'OP-2923' }));
  await expect('Upload it to the ticket', 'offline recv');
  await click('[data-flow="uploadPf"]'); await click('[data-commit]');
  await expect('Row Completed', 'uploaded toast');
  // [stated 23 Sep] the line's post-purchase tab no longer carries the packet, the mail or the ticket actions
  await page.evaluate(() => { S.ui['ltab_OP-2923']='post'; go('line', { id: 'OP-2923' }); });
  if (await has('Handover packet')) fail('handover packet should be gone from the post-purchase tab');
  if (await has('Manual review queue')) fail('manage-ticket block should have left the post-purchase tab');
  if (await has('RM \u2194 desk')) fail('mail trail should have left the post-purchase tab');
  await click('[data-uv="mail"]');
  await expect('Three conversations, one thread each', 'mail trail is its own tab');
  await click('[data-uv="manage"]');
  await expect('Manual review queue', 'manage ticket moved to Manage');
  await click('[data-uv="overview"]');
  await expect('Captured at creation', 'overview intact');
  await expect('Sold', 'quotes content folded into overview on a handed-over line');
  if (await page.$('[data-uv="quotes"]')) fail('a handed-over line should have no RFQ & quotes tab');
  // a line still being sold keeps its RFQ & quotes tab and a plain Overview
  await click('[data-switch]'); await click('[data-signin="nikhil"]');
  await page.evaluate(() => { S.ui['ltab_OP-2244']='overview'; go('line', { id: 'OP-2244' }); });
  if (!(await page.$('[data-uv="quotes"]'))) fail('a selling line should keep its RFQ & quotes tab');
  if (await has('The business')) fail('the RFQ should not be on a selling line\u2019s Overview');
  if (await page.$('[data-uv="mail"]')) fail('no mail trail tab before the ticket exists');
  await click('[data-switch]'); await click('[data-signin="rohan"]');
  await page.evaluate(() => go('ticket', { id: 'ISS-0433' }));
  await expect('Document vault', 'iss ticket screen');
  await click('[data-pill="mth_OP-2923"][data-pv="insurer"]');
  // withdraw sim on a fresh post line? use OP-2921 as priya
  await click('[data-switch]'); await click('[data-signin="priya"]');
  await page.evaluate(() => go('line', { id: 'OP-2921' }));
  await click('[data-psim="withdraw"]');
  await expect('Withdrawn', 'withdrawn');
  // RM sells: New opportunity as RM
  await click('[data-flow="newOpp"]');
  await page.fill('#f_pan', 'AAECK9912J'); await page.waitForTimeout(100);
  await page.fill('#f_cn', 'Sunita Rane'); await page.fill('#f_m', '9930055210');
  await page.selectOption('#f_product', 'Burglary'); await page.selectOption('#f_src', 'Existing client');
  await click('[data-mset="bt"][data-mval="fresh"]'); await click('[data-commit]');
  await expect('Created', 'rm newopp');
  await click('[data-close]');
  // RM head
  await click('[data-switch]'); await click('[data-signin="meera"]');
  await expect('Good morning, Meera', 'rm head home');
  await expect('renewals at risk', 'rm head purpose line');
  if (!(await page.$('.vsw [data-vw="mine"]'))) fail('no view switcher on the RM head');
  await click('.vsw [data-vw="mine"]');
  if (await has('renewals at risk')) fail('RM head My view still shows the team home');
  await click('[data-nav="renewals"]');
  await expect('Renewals', 'RM head reaches the renewals pipeline in My view');
  await click('.vsw [data-vw="team"]');
  await click('[data-nav="rmteam"]');
  await expect('renewals at risk', 'RM head Team view home');
  if (await page.$('#app table.t')) fail('no table belongs on the RM head home');
  {
    const cards = [];
    for (const t of ['Escalated tasks', 'Stalled', 'Renewals at risk']) if (await has(t)) cards.push(t);
    if (!cards.length && !(await has('Nothing needs you right now'))) fail('rm head home shows no card and no clear state');
    if (cards.length && await has('Post-purchase by who must act')) fail('the old table card is still on the RM head home');
  }
  await click('[data-nav="tickets"]'); await click('[data-nav="accounts"]'); await click('[data-nav="opps"]'); await click('[data-nav="rules"]');
  await expect('TR-08', 'rm rules visible');
  await page.evaluate(() => go('line', { id: 'OP-2922' }));
  await expect('Read-only', 'head read-only');
  await click('[data-flow="takeover"]'); await page.selectOption('#f_rs', 'Owner on leave'); await click('[data-commit]');
  await expect('Hand back', 'head took over');
  await click('[data-flow="handback"]'); await click('[data-commit]');
  log('post-purchase ok');
  // ---- [24 Sep] documents: one viewer, view and download everywhere ----
  await click('[data-switch]'); await click('[data-signin="priya"]');
  await page.evaluate(() => { S.ui['atab_A-1001']='comp'; go('acct', { id: 'A-1001' }); });
  await expect('Compliance documents', 'account compliance tab');
  await expect('PAN card', 'compliance lists PAN');
  await expect('Mandate letter', 'compliance lists the mandate');
  await click('[data-doc="PAN card"]');
  await expect('Permanent Account Number', 'PAN sheet renders');
  await expect('INCOME TAX DEPARTMENT', 'PAN sheet header');
  await click('[data-docclose]');
  await page.evaluate(() => { S.ui['atab_A-1008']='comp'; go('acct', { id: 'A-1008' }); });
  await click('[data-doc="Mandate letter"]');
  await expect('Letter of Mandate', 'mandate sheet renders');
  await expect('Account level', 'mandate is account level');
  await click('[data-docclose]');
  // a policy document, from Policy 360
  await page.evaluate(() => { S.ui['ptab_POL-CGL-2026-2924']='docs'; go('policy', { id: 'POL-CGL-2026-2924' }); });
  await expect('Documents', 'policy documents tab');
  await click('[data-doc="Policy copy"]');
  await expect('Policy Schedule', 'policy copy sheet');
  await expect('INTERNAL POLICY NUMBER', 'policy sheet shows both numbers');
  await click('[data-docclose]');
  // the post-purchase Documents section on the line
  await page.evaluate(() => { S.ui['ltab_OP-2924']='post'; go('line', { id: 'OP-2924' }); });
  await expect('Documents', 'post-purchase documents section');
  await expect('on file', 'post-purchase documents count');
  log('documents ok');
  // ---- [24 Sep] a provisional account is verified from the account, and OCR fixes the name ----
  await click('[data-switch]'); await click('[data-signin="nikhil"]');
  await page.evaluate(() => go('acct', { id: 'A-1009' }));
  const nameWas = await page.evaluate(() => by(S.data.accounts, 'A-1009').n);
  await click('[data-flow="kyc"]');
  await expect('Upload the PAN card', 'kyc asks for an upload');
  await click('[data-kycsample]');
  await expect('Uploaded', 'kyc documents uploaded');
  await click('[data-commit]');
  await expect('Legal name as per PAN', 'kyc read the legal name');
  await expect('RAVI STEEL TRADERS PRIVATE LIMITED', 'ocr expands the legal name');
  await expect('The name on the account will change', 'kyc shows the rename');
  await click('[data-commit]');
  const nameNow = await page.evaluate(() => by(S.data.accounts, 'A-1009').n);
  if (nameNow !== 'RAVI STEEL TRADERS PRIVATE LIMITED') fail('account not renamed from the PAN: ' + nameNow);
  if (nameWas === nameNow) fail('the OCR name should differ from what was typed');
  if (await page.evaluate(() => by(S.data.accounts, 'A-1009').prov)) fail('account should be verified');
  log('kyc + ocr name ok');
  // Aadhaar route for a proprietor with no GST
  await page.evaluate(() => go('acct', { id: 'A-1004' }));
  await click('[data-flow="kyc"]');
  await click('[data-mset="route"][data-mval="aad"]');
  await expect('stands in for the registration certificate', 'aadhaar route copy');
  await click('[data-kycsample]'); await click('[data-commit]');
  await expect('No GST on a proprietorship', 'aadhaar route validated');
  await click('[data-commit]');
  if (await page.evaluate(() => by(S.data.accounts, 'A-1004').prov)) fail('aadhaar route should verify');
  log('aadhaar route ok');
  // ---- [24 Sep] sharing the QCR by hand ----
  await page.evaluate(() => { var l=lineById('OP-2202'); l.rate=0; l.status='open'; l.stage=7; l.round=1; l.owner=S.user; go('line', { id: 'OP-2202' }); });
  await expect('Download and share myself', 'manual share offered at stage 7');
  await click('#nacard [data-flow="shareQcr"]');
  await expect('Share QCR v1 yourself', 'manual share flow');
  await click('[data-commit]');
  await expect('Quote Sent', 'manual share moves the stage');
  if (!(await page.evaluate(() => lineById('OP-2202').log.some(e => /by hand/.test(e.t))))) fail('manual share not on the trail');
  log('manual qcr share ok');
  // ---- [24 Sep] the attempt ladder caps at 10 and closes the line as Unreachable ----
  await page.evaluate(() => { var l=lineById('OP-2310'); l.stage=2; l.att=9; l.status='open'; paint(); });
  await page.evaluate(() => go('line', { id: 'OP-2310' }));
  await expect('attempts left', 'attempt cap shown on the card');
  await click('#nacard [data-flow="call"]');
  await click('[data-pick="ring"]');
  await click('[data-commit]');
  await expect('Closed as Unreachable', 'tenth no-connect closes the line');
  if (await page.evaluate(() => lineById('OP-2310').status) !== 'unreach') fail('status should be unreach');
  log('unreachable ok');
  // ---- [24 Sep] a referenced task title cannot be renamed ----
  await click('[data-switch]'); await click('[data-signin="vikram"]');
  await page.evaluate(() => go('rule', { id: 'TR-01' }));
  const refd = await page.evaluate(() => titleRefs(by(S.data.rules,'TR-01').ti,'TR-01').length);
  await page.fill('#rb_ti', 'Chase the new lead — renamed');
  await page.waitForTimeout(120);
  if (refd > 0) { await expect('Cannot rename', 'referenced rename refused'); }
  await page.evaluate(() => { S.ui.rb=null; S.ui.rb_id=''; go('rules'); });
  log('rule rename ok');
  // mobile viewport render check
  await page.setViewportSize({ width: 400, height: 800 });
  await page.evaluate(() => go('home'));
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  if (sw > 402) fail('horizontal overflow at 400px: ' + sw);
  await page.evaluate(() => go('line', { id: 'OP-2203' }));
  const sw2 = await page.evaluate(() => document.documentElement.scrollWidth);
  if (sw2 > 402) fail('horizontal overflow line at 400px: ' + sw2);
  // reload persistence
  await page.reload(); await page.waitForTimeout(300);
  await expect('Vikram', 'persisted user');
  await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(100);
  await click('[data-reset]');
  await page.waitForTimeout(200);
  log('persist/reset ok');
  if (errors.length) { console.log(errors.join('\n')); process.exitCode = 1; }
  console.log(errors.length ? 'ERRORS' : 'NO JS ERRORS');
  await browser.close();
})().catch(e => { console.log('CRASH', e.message); process.exit(1); });
