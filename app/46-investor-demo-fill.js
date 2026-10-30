/* ==================================================================== *
 *  Fill sample data — every pop-up that needs typing or an upload gets
 *  one button that fills it with demo values. The presenter reviews it
 *  and presses the pop-up's own button to move ahead.
 * ==================================================================== */
var SIMFILL={};
function dmLocal(t){ var d=new Date(t), p=function(n){ return (n<10?'0':'')+n; }; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes()); }
function dmDate(t){ return dmLocal(t).slice(0,10); }
function dmNextSlot(days,h){ var d=new Date(S.now); d.setDate(d.getDate()+(days||1)); d.setHours(h||11,0,0,0); if(d.getDay()===0) d.setDate(d.getDate()+1); return d.getTime(); }
function dmLine(){ return (typeof FL==='function'&&FL())||lineById(S.sel.line||'')||null; }
function dmIsDemo(){ return true; }
paintModal=(function(p0){ return function(){ var r=p0.apply(this,arguments);
  try{ var f=S.flow&&SIMFILL[S.flow], b=document.querySelector('#ovl .modb');
    if(f&&b&&!b.querySelector('.demofill')&&(!f.when||f.when())){
      var d=document.createElement('div'); d.className='demofill';
      d.innerHTML='<button type="button" class="btn sm" data-simfill="1">'+ic('zap','ic14')+'Fill sample data</button><span class="meta">'+esc(f.hint||'Prototype only — fills this form with demo values. Check it, then continue.')+'</span>';
      b.insertBefore(d,b.firstChild); } }catch(e){}
  return r; }; })(paintModal);
HANDLERS.unshift(function(t){ var x=t.closest('#ovl [data-simfill]'); if(!x) return false; var f=S.flow&&SIMFILL[S.flow]; if(!f) return true;
  f.fill(); paintModal(); try{ if(FLOWS[S.flow]&&FLOWS[S.flow].live) FLOWS[S.flow].live(); }catch(e){}
  toast('Sample data filled','Check it, then press '+(function(){ var c=document.querySelector('#ovl [data-commit]'); return c?'“'+c.textContent.trim()+'”':'the button'; })()+'.'); return true; });

/* ---------- pre-sales (ABM) ---------- */
SIMFILL.ab_book={fill:function(){ S.sel.mt=dmLocal(dmNextSlot(1,11)); S.sel.mode=S.sel.mode||'Virtual'; S.sel.where=S.sel.where||'Google Meet — link shared on email'; S.sel.x=S.sel.x||'Finance head and plant HR will join.'; }};
function dmPro(){ return by(S.data.pros,S.sel.pro||S.sel.id||(S.route&&S.route.id)||'')||null; }
var DM_MOM={'PR-1001':'Two plants, Pune and Chakan, about 420 workers on the shop floor. Current Workmen’s Compensation is with a local agent and renews in December. Wants quotes from at least three insurers. Rahul Mehta decides.',
  'PR-1002':'Builds data centres and runs managed services for 60+ clients. No cyber cover today; a large client contract now asks for ₹10 Cr of cyber cover. Wants options before the board meeting.'};
SIMFILL.ab_callout={fill:function(){ var p=dmPro(); S.sel.d='done'; S.sel.mom=DM_MOM[p&&p.id]||'Consultation done. The client wants quotes for the product discussed.'; }};
SIMFILL.ab_handoff={fill:function(){ var p=dmPro(); (S.sel.prods||[]).forEach(function(x){ var i=PRODUCTS.indexOf(x); if(!S.sel['o_'+i]) S.sel['o_'+i]='nikhil';
    if(p&&p.id==='PR-1001'){ S.sel['r_'+i]=S.sel['r_'+i]||dmDate(S.now+45*86400000); S.sel['doc_'+i]=S.sel['doc_'+i]||'Sharma_WC_policy_2025.pdf'; } });
  if(p){ S.sel.pn=S.sel.pn||p.poc1.n; S.sel.pm=S.sel.pm||p.poc1.m; S.sel.pe=S.sel.pe||p.poc1.e; if(!S.sel.mom) S.sel.mom=p.mom||DM_MOM[p.id]||''; } }};

/* ---------- sales ---------- */
var DM_REQ={
  'Workmen’s Compensation':{wcbiz:'Auto components manufacturing',wcnw:'420',wcsal:'₹22,000',wcmed:'y',wcmedamt:'₹50,000',wcten:'1 Year',tp:'₹3,50,000',note:'Two plants — Pune and Chakan. Existing cover renews in December.'},
  'Cyber Liability':{cybtob:'IT / ITES: Consulting',cybcov:'₹10 Cr',cybto:'₹25 Cr to ₹100 Cr',cybnat:'Private Limited',cybsub:'n',cybpol:'n',cybclm:'n',tp:'₹2,50,000',note:'A large client contract asks for ₹10 Cr of cyber cover.'}
};
SIMFILL.disc={fill:function(){ var l=dmLine(); if(!l) return; var a=acctOf(l), smp=DM_REQ[l.product]||{};
  reqQs(l,true).forEach(function(x){ if(smp[x.k]!==undefined){ S.sel[x.k]=smp[x.k]; return; } var q=x.q||{};
    S.sel[x.k]=q.k==='pick'?(q.o&&q.o[0]||''):(q.k==='yn'?'n':(q.k==='date'?dmDate(S.now+60*86400000):(q.k==='num'?'10':'—'))); });
  /* answering a yes/no can open follow-up questions: fill those too */
  reqQs(l,true).forEach(function(x){ if(S.sel[x.k]===undefined||S.sel[x.k]===''){ var q=x.q||{}; S.sel[x.k]=smp[x.k]!==undefined?smp[x.k]:(q.k==='pick'?(q.o&&q.o[0]||''):(q.k==='yn'?'n':(q.k==='num'?'10':'—'))); } });
  if(smp.tp) S.sel.tp=smp.tp; if(smp.note) S.sel.note=smp.note;
  if(a&&a.prov&&a.demoKyc&&!a.gst) S.sel.gst=a.demoKyc.gst; }};
SIMFILL.pay={fill:function(){ S.sel.mode=S.sel.mode||'NEFT / RTGS'; }};
SIMFILL.proof={fill:function(){ var l=dmLine(); if(typeof proofTake==='function'&&l&&!S.sel.proofimg) proofTake('payment-screenshot.png',proofSample(l));
  S.sel.pnote=S.sel.pnote||'Client paid by NEFT. Rahul Mehta is the decision maker; plant HR handles worker additions.'; }};

/* ---------- happy flow only: the exception simulators are hidden ---------- */
var DM_HIDE=[/raises a query/i,/manager takes this line over/i,/BimaOps follow-up to the client/i,/policy copy only/i,/Desk follow-up/i,/amount unreadable/i,/can’t be read/i,/PAN mismatch/i,/PAN will not match/i,
  /no insurer quotes/i,/every insurer declined/i,/rater returns quotes/i,/get-quote call fails/i,/does not pick up/i,/Nobody picks up/i,/^Busy$/i,/Switched off/i];
function dmHideSims(root){ if(!root) return; root.querySelectorAll('.simbtn').forEach(function(b){ var t=b.textContent.trim(); if(DM_HIDE.some(function(r){ return r.test(t); })) b.remove(); });
  root.querySelectorAll('.sim').forEach(function(s){ var sb=s.querySelector('.sb'); if(sb&&!sb.querySelector('button')&&!sb.textContent.trim()) s.remove(); }); }
paint=(function(p0){ return function(){ var r=p0.apply(this,arguments); try{ dmHideSims(document.getElementById('app')); }catch(e){} return r; }; })(paint);
paintModal=(function(p0){ return function(){ var r=p0.apply(this,arguments); try{ dmHideSims(document.getElementById('ovl')); }catch(e){} return r; }; })(paintModal);

/* ---------- the RFQ form (inline on RFQ & quotes) ---------- */
rfqBlock=(function(r0){ return function(l){ var h=r0.apply(this,arguments);
  try{ if(h&&l.rfq&&l.rfq.st==='draft'&&rfqEditable(l,false)&&rfqCount(l).filled<rfqCount(l).total){
    var i=h.indexOf('<div class="rform">'); if(i>0) h=h.slice(0,i)+'<div class="demofill mt12"><button type="button" class="btn sm" data-rfdemo="'+l.id+'">'+ic('zap','ic14')+'Fill sample data</button><span class="meta">Prototype only — fills every RFQ field with demo values.</span></div>'+h.slice(i); } }catch(e){}
  return h; }; })(rfqBlock);
HANDLERS.unshift(function(t){ var x=t.closest('[data-rfdemo]'); if(!x) return false; var l=lineById(x.dataset.rfdemo); if(!l||!l.rfq) return true;
  var ok=write(function(){ var a=acctOf(l); rfqFillRest(l,'owner',S.user,S.now,a);
    rfqFlat(l,a).forEach(function(f){ if(rfqVal(l,f.k)) return; var v=f.t==='sel'||f.t==='multi'?(f.o&&f.o[0]||''):(f.t==='date'?dmDate(S.now+60*86400000):(f.k==='name'?a.n:'—')); if(v) l.rfq.f[f.k]={v:v,by:'owner',who:S.user,at:S.now}; }); },'the RFQ');
  if(ok){ paint(); toast('RFQ filled with sample data','Check it, then send it for client review or float it to placement.'); } return true; });
SIMFILL.float={fill:function(){ S.sel.excl=S.sel.excl||'n'; S.sel.note=S.sel.note||'Client needs ₹10 Cr limit for a large client contract. Board meeting in two weeks — please aim for three quotes.'; }};

/* ---------- the other forms a presenter might open ---------- */
SIMFILL.ab_addPro={fill:function(){ if(!S.sel.co) S.sel.co='Kaveri Foods Pvt Ltd'; S.sel.an=S.sel.an||'Anita Rao'; S.sel.am=S.sel.am||'9845012345'; S.sel.ad=S.sel.ad||'CFO'; S.sel.ae=S.sel.ae||'anita.rao@kaverifoods.in';
  S.sel.src=S.sel.src||'Event'; S.sel.prod=S.sel.prod||'Fire & Special Perils'; if(!S.sel.own&&(me()||{}).role==='abmmgr') S.sel.own='arjun'; }};
SIMFILL.ab_newPoc={fill:function(){ S.sel.an=S.sel.an||'Neha Kulkarni'; S.sel.am=S.sel.am||'9822045678'; S.sel.ad=S.sel.ad||'HR head'; S.sel.ae=S.sel.ae||'neha.k@example.in'; }};
SIMFILL.ab_editPoc=SIMFILL.ab_newPoc;
SIMFILL.ab_resched={fill:function(){ S.sel.mt=dmLocal(dmNextSlot(2,15)); S.sel.x=S.sel.x||'Client travelling'; }};
SIMFILL.newOpp={when:function(){ return !S.sel.done; }, fill:function(){
  if(S.sel.acct){ S.sel.product=S.sel.product||'Fire & Special Perils'; S.sel.bt=S.sel.bt||'fresh'; S.sel.src=S.sel.src||(SRCS[0]&&(SRCS[0][0]||SRCS[0])); return; }
  S.sel.isSole=S.sel.isSole||'n'; if(S.sel.isSole==='y'&&!S.sel.hasGst) S.sel.hasGst='y';
  if(S.sel.isSole==='y'&&S.sel.hasGst==='n') S.sel.aad=S.sel.aad||'4521 8890 1123'; else S.sel.gst=S.sel.gst||'29AAGCK5521M1Z3';
  S.sel.name=S.sel.name||'Kaveri Foods Pvt Ltd'; S.sel.caddr=S.sel.caddr||'Peenya Industrial Area, Bengaluru 560058';
  S.sel.cn=S.sel.cn||'Anita Rao'; S.sel.m=S.sel.m||'+91 98450 12345'; S.sel.e=S.sel.e||'anita.rao@kaverifoods.in';
  S.sel.product=S.sel.product||'Fire & Special Perils'; S.sel.bt=S.sel.bt||'fresh'; S.sel.src=S.sel.src||(SRCS[0]&&(SRCS[0][0]||SRCS[0])); }};
SIMFILL.addTask={fill:function(){ var u=me(), l=S.data.lines.filter(function(x){ return x.owner===u.id&&(openLine(x)||postLine(x)); })[0];
  S.sel.title=S.sel.title||'Share the claim process note with the client'; S.sel.desc=S.sel.desc||'One page — who to call and what to send.';
  if(!S.sel.att&&!S.sel.line&&l) S.sel.att='l:'+l.id; S.sel.due=S.sel.due||dmLocal(dmNextSlot(1,12)); }};
SIMFILL.logAct={fill:function(){ S.sel.k=S.sel.k||'call'; S.sel.x=S.sel.x||'Spoke to the client — confirmed the timeline for the decision.'; }};
SIMFILL.addContact={fill:function(){ S.sel.n=S.sel.n||'Priyanka Desai'; S.sel.d=S.sel.d||'HR manager'; S.sel.m=S.sel.m||'+91 98220 45678'; S.sel.e=S.sel.e||'priyanka.desai@example.in'; }};
SIMFILL.call={when:function(){ return ['cb','act','poc','def'].indexOf(S.sel.d)>=0; }, hint:'Prototype only — fills the details for the outcome you picked.', fill:function(){
  if(S.sel.d==='cb'||S.sel.d==='act'){ S.sel.ot=dmLocal(dmNextSlot(1,11)); if(S.sel.d==='act') S.sel.on=S.sel.on||'Send the signed proposal form and the KYC documents'; }
  if(S.sel.d==='poc'){ S.sel.pn=S.sel.pn||'Neha Kulkarni'; S.sel.pm=S.sel.pm||'+91 98220 45678'; S.sel.pd=S.sel.pd||'HR head'; }
  if(S.sel.d==='def') S.sel.rv=dmDate(S.now+30*86400000); }};
SIMFILL.custEdit={fill:function(){ S.sel.isSole=S.sel.isSole||'n'; }};

/* ---------- Raise a request (endorsement or claim) — a screen, not a pop-up ---------- */
SCREENS.svcnew=(function(s0){ return function(){ var r=s0.apply(this,arguments), h=r&&r.html;
  if(typeof h==='string'){ var i=h.indexOf('<div class="gap12">'); if(i>0) r.html=h.slice(0,i)+'<div class="demofill mt12"><button type="button" class="btn sm" data-svcdemo="1">'+ic('zap','ic14')+'Fill sample data</button><span class="meta">Prototype only — picks a policy and fills the request with demo values.</span></div>'+h.slice(i); }
  return r; }; })(SCREENS.svcnew);
HANDLERS.unshift(function(t){ if(!t.closest('[data-svcdemo]')) return false; var u=me();
  var accts=S.data.accounts.filter(function(a){ return a.pols.some(function(p){ return !p.issuing; })&&a.own===u.id; });
  if(!accts.length){ toast('No policy yet','Walk an opportunity to Policy Copy Sent to Client first.',{red:1}); return true; }
  var a=accts.filter(function(x){ return x.id===S.ui.sn_acct; })[0]||accts[0], p=a.pols.filter(function(x){ return !x.issuing; })[0];
  S.ui.sn_k=S.ui.sn_k||'end'; S.ui.sn_acct=a.id; S.ui.sn_pol=p.id;
  if(S.ui.sn_k==='end'){ var ty=endoTypes(p); S.ui.sn_type=ty.indexOf(S.ui.sn_type)>=0?S.ui.sn_type:(ty[0]||''); var d=ENDO[S.ui.sn_type];
    if(d) d.f.forEach(function(f,i){ var k='sn_f'+i; if(S.ui[k]) return; S.ui[k]=f[1]==='sel'?(f[3]&&f[3][0]||''):(f[1]==='date'?ymd(S.now+7*86400000):(f[1]==='cur'?'₹12 Cr':(f[1]==='pin'?'411019':(/name/i.test(f[0])?'Sharma Industries Private Limited':(/address/i.test(f[0])?'Plot 14, MIDC Chakan, Pune':'As discussed with the client'))))); }); }
  else { S.ui.sn_cause=S.ui.sn_cause||(CAUSES[0]||''); var lossAt=Math.max((p.start||0)+86400000,S.now-86400000); if(lossAt<=S.now-3600000) S.ui.sn_dol=S.ui.sn_dol||ymd(lossAt); else toast('Loss date left blank','This policy started today. Move the clock forward in Prototype controls to raise a claim on it.',{red:1}); S.ui.sn_est=S.ui.sn_est||'₹6,20,000'; S.ui.sn_chan=S.ui.sn_chan||'RM Interface'; S.ui.sn_desc=S.ui.sn_desc||'Short circuit in the paint shop, contained in 40 minutes. No injuries.'; }
  S.ui.sn_docs=snDocs().map(function(d){ return d[0]; }).join('|'); paint(); toast('Sample data filled','Check it, then press Submit to the desk.'); return true; });

/* the QCR's cover terms for Cyber read as cyber, not general liability */
var DM_CYBER_TERMS={cov:'First-party and third-party cyber loss — breach response, business interruption, network security and privacy liability',
  add:['Ransomware and cyber extortion','Regulatory fines and penalties where insurable','Social engineering fraud'],
  exc:['Prior known incidents','Infrastructure (power, telecom) failure','Bodily injury and property damage'],
  ded:['₹5,00,000 each claim','₹7,50,000 each claim','₹10,00,000 each claim']};
qvHtml=(function(q0){ return function(l){ if(l&&l.product==='Cyber Liability'){ var was=QCR_TERMS.liab; QCR_TERMS.liab=DM_CYBER_TERMS; try{ return q0.apply(this,arguments); } finally { QCR_TERMS.liab=was; } } return q0.apply(this,arguments); }; })(qvHtml);

