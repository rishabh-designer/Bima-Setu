const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  await page.goto('file://' + require('path').resolve(__dirname, '../public/index.html') + ''); await page.waitForTimeout(300);
  const shot = async (n) => { await page.waitForTimeout(150); await page.screenshot({ path: require('path').resolve(__dirname, '../shots/') + '/' + n + '.png', fullPage: false }); };
  await shot('00-signin');
  await page.click('[data-signin="nikhil"]'); await shot('01-home');
  await page.evaluate(() => go('line', { id: 'OP-2001' })); await shot('02-line');
  await page.evaluate(() => go('opp', { id: 'OPP-001001' })); await shot('03-opp');
  await page.evaluate(() => go('acct', { id: 'A-1001' })); await shot('04-acct');
  await page.click('[data-flow="newOpp"]'); await page.fill('#f_gst', '27AABCS1234F1Z5'); await page.waitForTimeout(100); await shot('05-newopp');
  await page.keyboard.press('Escape');
  await page.evaluate(() => go('pipeline')); await shot('06-pipeline');
  await page.evaluate(() => go('tasks')); await shot('07-tasks');
  await page.evaluate(() => go('ticket', { id: 'PAY-2101' })); await shot('08-ticket');
  await page.click('[data-switch]'); await page.click('[data-signin="vikram"]'); await shot('09-team');
  await page.evaluate(() => go('rule', { id: 'TR-02' })); await shot('10-rule');
  await page.click('[data-switch]'); await page.click('[data-signin="priya"]'); await shot('11-rmhome');
  await page.evaluate(() => go('tickets')); await shot('12-tickets');   // v61: the RM book has no open service tickets
  await page.evaluate(() => go('svcnew')); await page.click('[data-uv="end"]'); await page.selectOption('[data-uisel="sn_acct"]','A-1101'); await page.selectOption('[data-uisel="sn_pol"]','POL-FIR-2026-2101'); await page.selectOption('[data-uisel="sn_type"]','Addition of location'); await shot('13-svcnew');
  await page.keyboard.press('Escape');
  // [24 Sep] the new surfaces
  await page.evaluate(() => { S.user='priya'; S.ui['atab_A-1101']='comp'; go('acct', { id: 'A-1101' }); }); await shot('16-compliance');
  // v64 seeds no mandate letters, so the GST certificate stands in. Below ~1400px wide the v64
  // compliance rows push their View/Download buttons outside the panel, so these clicks are scripted.
  await page.$eval('[data-doc="GST certificate"]', b => b.click()); await page.waitForTimeout(200); await shot('17-doc-gst');
  await page.click('[data-docclose]');
  await page.evaluate(() => { S.ui['atab_A-1102']='comp'; go('acct', { id: 'A-1102' }); });
  await page.$eval('[data-doc="PAN card"]', b => b.click()); await page.waitForTimeout(200); await shot('18-doc-pan');
  await page.click('[data-docclose]');
  await page.evaluate(() => { S.ui['ltab_OP-2101']='post'; go('line', { id: 'OP-2101' }); }); await shot('19-post-docs');
  await page.evaluate(() => { S.ui['ptab_POL-FIR-2026-2101']='docs'; go('policy', { id: 'POL-FIR-2026-2101' }); }); await shot('20-policy-docs');
  await page.evaluate(() => { S.user='nikhil'; go('acct', { id: 'A-1201' }); });   // a provisional account in Nikhil's book
  await page.click('[data-flow="kyc"]'); await page.waitForTimeout(150); await shot('21-kyc-upload');
  await page.click('[data-kycsample]'); await page.waitForTimeout(150);
  await page.click('[data-commit]'); await page.waitForTimeout(250); await shot('22-kyc-ocr-name');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { S.user='priya'; go('renewals'); }); await shot('23-renewals');
  await page.evaluate(() => { S.ui['ltab_OP-2950']='quotes'; go('line', { id: 'OP-2950' }); }); await shot('24-renewal-rfq');
  await page.evaluate(() => { var l=lineById('OP-2002'); l.rate=0; l.status='open'; l.stage=7; l.round=1; l.owner='priya'; S.user='priya'; go('line', { id: 'OP-2002' }); });
  await page.click('#nacard [data-flow="shareQcr"]'); await page.waitForTimeout(200); await shot('25-share-by-hand');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 400, height: 800 });
  await page.evaluate(() => { S.user='nikhil'; go('home'); }); await shot('14-home-mobile');
  await page.evaluate(() => go('line', { id: 'OP-2001' })); await shot('15-line-mobile');
  await page.evaluate(() => { S.ui['atab_A-1101']='comp'; go('acct', { id: 'A-1101' }); }); await shot('26-compliance-mobile');
  await browser.close();
})();
