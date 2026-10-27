/* ==================================================================== *
 *  6 · Quotes decide the route · Question Master · Quote Sent follow-up
 * ==================================================================== */
function nextAction(l){ var a=acctOf(l);
  if(!dead(l)&&l.status==='open'&&l.stage===3&&(l.rate===null||l.rate===undefined)&&!l.renews) return {tone:'amber',lab:'Next action',txt:'Get quotes',why:'The rater’s quotes decide the route: one or more quotes → DUA; none → the RFQ flow.',acts:[['qfetch','Get quotes']]};
  if(!dead(l)&&l.status==='open'&&l.stage===9&&l.webKyc&&a&&a.prov) return {tone:'amber',lab:'Next action',txt:'KYC documents arrived from the website — verify them',why:'The client uploaded PAN and GST on the website before dropping off. They are here for you to check and verify.',acts:[['kyc','Verify the KYC documents']]};
  var na=nextAction0(l);
  if(l.stage<SALES_STAGES&&!dead(l)&&l.status==='open'&&ctLimitHit(l)) na.why=(na.why?na.why+' ':'')+'The missed-call limit for this stage is reached — no more call tasks. Mark it Lost from Manage if it is over.';
  return na; }
function actingParty(l){ if(!dead(l)&&l.status==='open'){ if(l.stage===9&&l.webKyc) return 'Us'; if(issOpenQ(l)) return 'Us'; } return actingParty0(l); }
function qfDefault(l){ return RATEABLE[l.product]?'dua':'none'; }
FLOWS.qfetch={t:'Quotes for this opportunity', wide:true,
  sub:function(){ var l=FL(); return 'Get-quote API · keyed by '+l.id+' · the result decides the route.'; },
  body:function(){ var l=FL(), ph=S.sel.qph||'load';
    if(ph==='load'){ if(!S.sel._qt){ S.sel._qt=setTimeout(function(){ if(S.flow!=='qfetch') return; S.sel._qt=0; S.sel.qph=S.sel.force||qfDefault(FL()); paintModal(); },900); }
      return '<div class="ctc"><div class="ctcst amber"><i class="dot pulse"></i>Fetching quotes from the rater…</div><div class="ctcnote">'+esc(l.product)+' · '+esc(acctName(l))+' · SI '+esc((l.req||{}).si||'—')+'</div></div>'; }
    var sim=simblock('Prototype','The rater is faked here.',simbtn('Run again — the rater returns quotes','data-qforce="dua"')+simbtn('Run again — no insurer quotes','data-qforce="none"')+simbtn('Run again — the get-quote call fails','data-qforce="err"'));
    if(ph==='dua'){ var qs=dauQuotes(l), n=qs.filter(function(q){return q.st==='quoted';}).length, rt=qs.some(function(q){return q.rt;});
      return note('green',n+' insurers quoted — the route is DUA','Pick what goes in the QCR next. No RFQ and no placement.','circlecheck')+
        '<div class="tw"><table class="t"><thead><tr><th>Insurer</th><th>Status</th><th class="num">Premium</th></tr></thead><tbody>'+qs.map(function(q){ return '<tr'+(q.st==='quoted'?'':' class="dim"')+'><td class="nm">'+esc(q.i)+(q.rt?' '+chip('Instant issuance','violet',false,true):(q.st==='quoted'&&rt?' '+chip('Assisted issuance','neutral',false,true):''))+(q.r?'<div class="sub">'+esc(q.r)+'</div>':'')+'</td><td>'+chip(q.st==='quoted'?'Quoted':'Declined',q.st==='quoted'?'green':'red',false,true)+'</td><td class="num">'+(q.p?INR(q.p):'—')+'</td></tr>'; }).join('')+'</tbody></table></div>'+sim; }
    if(ph==='none') return note('amber','No insurer returned a price — the route is Non-DUA','The RFQ flow starts: fill the RFQ, send it for client review or float it to placement.','alert')+sim;
    return note('red','The get-quote call failed','The route stays undecided. Try again — nothing has moved.','alert')+sim; },
  nofoot:function(){ return (S.sel.qph||'load')==='load'; },
  can:function(){ return (S.sel.qph||'load')!=='load'; },
  ok:function(){ var p=S.sel.qph; return p==='dua'?'Select quotes and send QCR':(p==='none'?'Open the RFQ':'Try again'); },
  run:function(){ var l=FL(), p=S.sel.qph;
    if(p==='err'){ S.sel.qph='load'; S.sel.force=''; S.sel._qt=0; return 'stay'; }
    var a=acctOf(l); var ok=write(function(){ if(p==='dua'){ l.rate=1; l.qAt=S.now; logAdd(l,'Quotes fetched — route DUA','System · get-quote API · '+dauQuotes(l).filter(function(q){return q.st==='quoted';}).length+' insurers priced · no RFQ needed','sys',1); }
      else { l.rate=0; rfqOpen(l,a,S.now); logAdd(l,'No quotes — route Non-DUA','System · get-quote API returned no price · RFQ opened on screen','rfq',1); } fireRules(l); },'the route');
    if(!ok) return 'fail';
    if(p==='dua'){ closeFlow(); openFlow('qcr',{line:l.id}); return 'stay'; }
    S.ui['ltab_'+l.id]='quotes'; toast('Route: Non-DUA','The RFQ is open on the RFQ & quotes tab.'); }};
HANDLERS.push(function(t){ var x=t.closest('[data-qforce]'); if(!x) return false; if(S.flow==='qfetch'){ if(S.sel._qt) clearTimeout(S.sel._qt); S.sel._qt=0; S.sel.force=x.dataset.qforce; S.sel.qph='load'; paintModal(); } return true; });
FLOWS.qfollow={t:'Follow up on the quote', sub:'Records the follow-up. The stage does not move.',
  body:function(){ var l=FL(), R=[['still','Still deciding','A next follow-up date'],['changes','Asked for changes',l.rate?'Opens the reject-all form':'Opens the revision form'],['ready','Ready to confirm','Opens the confirmation'],['none','No response','A next follow-up date']];
    return field('Channel',select('fch',S.sel.fch||'Call',[['Call','Call — click to call'],'Email','WhatsApp','Meeting']))+'<div class="lbl">Client’s response</div>'+
      R.map(function(x){ return opt('data-mset="fr" data-mval="'+x[0]+'"',S.sel.fr===x[0],x[1],x[2]); }).join('')+field('Note — optional',input('fn',S.sel.fn,'What they said'))+
      (S.sel.fr==='still'||S.sel.fr==='none'?field('Next follow-up on','<input class="inp" id="f_fd" data-f="fd" type="date" min="'+ymd(S.now)+'" value="'+esc(S.sel.fd||'')+'">','The open quote-sent call task moves to this date.'):''); },
  can:function(){ var r=S.sel.fr; if(!r) return false; if((r==='still'||r==='none')&&!(S.sel.fd&&S.sel.fd>=ymd(S.now))) return false; return true; },
  ok:function(){ var r=S.sel.fr; return r==='ready'?'Save and record confirmation':(r==='changes'?'Save and continue':'Save follow-up'); },
  run:function(){ var l=FL(), r=S.sel.fr, ch=S.sel.fch||'Call', lab={still:'Still deciding',changes:'Asked for changes',ready:'Ready to confirm',none:'No response'}[r];
    var ok=write(function(){ logAdd(l,'Follow up · '+lab,uname(S.user)+' · '+ch+(S.sel.fn?' · '+S.sel.fn:'')+(S.sel.fd&&(r==='still'||r==='none')?' · next '+fmtD(new Date(S.sel.fd+'T11:00:00').getTime()):''),ch==='Email'?'email':(ch==='WhatsApp'?'whatsapp':'call'));
      if(S.sel.fd&&(r==='still'||r==='none')){ var due=new Date(S.sel.fd+'T11:00:00').getTime(), t=tasksOfLine(l.id).filter(function(x){return !x.done&&x.ct;})[0], c=t?ctById(t.ct):ctStageCfg(l);
        if(t){ t.dueAt=due; t.escAt=c&&c.esc&&+c.esc[0]>0?addWork(due,ctMins(c.esc)):0; } else if(c){ l.ctHold=0; ctPush(l,c,due,{title:'Quote sent follow-up'}); } } },'the follow-up');
    if(!ok) return 'fail';
    if(r==='ready'){ closeFlow(); openFlow('confirm',{line:l.id}); return 'stay'; }
    if(r==='changes'){ closeFlow(); openFlow(l.rate?'rejectAll':'objectQcr',{line:l.id}); return 'stay'; }
    toast('Follow-up recorded','Stage unchanged at Quote Sent.'); }};
FLOWS.freshQ={t:'Get fresh quotes', sub:'The quotes expired. A new rater round replaces them; the QCR goes out again as a new version.',
  body:function(){ var l=FL(); return note('amber','','QCR v'+l.round+' expired on '+fmtD(quoteUntil(l))+'. Fresh quotes come back from the rater now; the opportunity goes back to Details Captured to pick them and send QCR v'+(l.round+1)+'.','info'); },
  ok:'Get fresh quotes',
  run:function(){ var l=FL(); var ok=write(function(){ l.round++; l.qAt=S.now; l.qsel=[]; logAdd(l,'Fresh quotes from the rater — round '+l.round,'System · get-quote API · the expired quotes are replaced','sys',1); moveStage(l,3,'Quotes expired — fresh rater round'); },'the new round');
    if(!ok) return 'fail'; toast('Fresh quotes in','Back at Details Captured — select quotes and send QCR v'+l.round+'.'); }};
function qcrCard(l,v,opts){ var h=qcrCard0(l,v,opts); if(l.stage===8&&v===l.round&&canAct(l)&&!(opts&&opts.rej)) h=h.replace('<div class="qc-a">','<div class="qc-a"><button class="btn sm ghost" data-resendqcr="'+l.id+'">Resend</button> '); return h; }

/* ---------- the Question Master (admin) ---------- */
var QM_ACCOUNT={name:1,addr:1,ind:1,to:1,emp:1};
var QM_TYPES=['text','number','select','multi','date'];
function qmSeed(){ var qs=[], seen={}, maps={}, ver={};
  Object.keys(RFQ_FAM).forEach(function(p){ if(p===CYBER_PRODUCT) return; var defs=rfqDefs0({product:p,req:{}},{}), order=0; maps[p]=[]; ver[p]=1;
    defs.forEach(function(s){ s.f.forEach(function(f){ order++; if(!seen[f.k]){ seen[f.k]=1; qs.push({code:f.k,label:f.l,type:f.t==='sel'?'select':(f.t==='multi'?'multi':(f.t==='date'?'date':'text')),opts:f.o||[],scope:QM_ACCOUNT[f.k]?'ACCOUNT':'OPPORTUNITY',on:1}); }
      maps[p].push({code:f.k,sec:s.sec,req:f.req?1:0,order:order}); }); }); });
  return {qs:qs,maps:maps,ver:ver,log:[{at:T0.getTime(),by:'admin',tx:'Seeded from the RFQ sets in use — '+qs.length+' questions across '+Object.keys(maps).length+' products'}]}; }
function qmQ(code){ var qm=S.data&&S.data.qm; return qm?qm.qs.filter(function(q){return q.code===code;})[0]||null:null; }
function qmMap(p){ var qm=S.data&&S.data.qm; return qm&&qm.maps[p]&&qm.maps[p].length?qm.maps[p]:null; }
function rfqDefs(l,a){
  if(l.product===CYBER_PRODUCT) return cyberRfqDefs(l,a||{});
  var base=rfqDefs0(l,a), mp=qmMap(l.product); if(!mp) return base;
  var bf={}; base.forEach(function(s){ s.f.forEach(function(f){ bf[f.k]=f; }); });
  var secs={}, order=[];
  mp.slice().sort(function(x,y){return x.order-y.order;}).forEach(function(m){ var q=qmQ(m.code); if(!q||!q.on) return; var f0=bf[q.code]||{};
    var f={k:q.code,l:q.label,req:m.req?1:0,t:q.type==='select'?'sel':(q.type==='multi'?'multi':(q.type==='date'?'date':undefined)),o:q.opts&&q.opts.length?q.opts:undefined,pre:f0.pre,by:f0.by,s:f0.s||(q.opts&&q.opts.length?q.opts[0]:'')};
    var aa=a&&a.ans&&a.ans[q.code]; if(q.scope==='ACCOUNT'&&aa){ f.pre=aa; f.by='acctAns'; }
    if(!secs[m.sec]){ secs[m.sec]=[]; order.push(m.sec); } secs[m.sec].push(f); });
  return order.map(function(s){ return {sec:s,f:secs[s]}; }); }
function rfqOpen(l,a,at){ rfqOpen0(l,a,at); if(!S.data||!S.data.qm) return; a=a||acctOf(l); var aa=(a&&a.ans)||{};
  rfqFlat(l,a).forEach(function(f){ var q=qmQ(f.k); if(q&&q.scope==='ACCOUNT'&&aa[f.k]) l.rfq.f[f.k]={v:aa[f.k],by:'acctAns',who:'',at:at||S.now}; }); }
function rfqWho(l,x){ if(x&&x.by==='acctAns') return 'From another opportunity on this account'; return rfqWho0(l,x); }
function qmSync(l){ var a=acctOf(l); if(!a||!l.rfq||!l.rfq.f) return; a.ans=a.ans||{}; Object.keys(l.rfq.f).forEach(function(k){ var q=qmQ(k), x=l.rfq.f[k]; if(q&&q.scope==='ACCOUNT'&&x&&x.v) a.ans[k]=x.v; }); }
function rfqPatch(l){ qmSync(l); rfqPatch0(l); }
(function(){ var f0=FLOWS.float.run; FLOWS.float.run=function(){ var l=FL(); if(l) qmSync(l); return f0.apply(this,arguments); }; })();
var QM_HEAD=['code','question','type','options','scope','product','section','required','order'];
var QM_SAMPLE=[
 ['name','Legal name of the insured','text','','ACCOUNT','Fire & Special Perils','The business','Y','1'],
 ['addr','Registered address','text','','ACCOUNT','Fire & Special Perils','The business','Y','2'],
 ['ind','Industry or occupancy','text','','ACCOUNT','Fire & Special Perils','The business','Y','3'],
 ['to','Annual turnover','number','','ACCOUNT','Fire & Special Perils','The business','Y','4'],
 ['si','Sum insured','number','','OPPORTUNITY','Fire & Special Perils','Cover asked for','Y','5'],
 ['ten','Policy period','text','','OPPORTUNITY','Fire & Special Perils','Cover asked for','Y','6'],
 ['start','Cover to start from','date','','OPPORTUNITY','Fire & Special Perils','Cover asked for','Y','7'],
 ['clm','Claims in the last 3 years','text','','OPPORTUNITY','Fire & Special Perils','Cover asked for','Y','8'],
 ['loc','Risk location address','text','','OPPORTUNITY','Fire & Special Perils','The risk','Y','9'],
 ['cons','Construction','select','RCC|Mixed|Steel frame|Kutcha','OPPORTUNITY','Fire & Special Perils','The risk','Y','10'],
 ['prot','Fire protection','select','Hydrant and sprinklers|Hydrant only|Extinguishers only|None','OPPORTUNITY','Fire & Special Perils','The risk','Y','11'],
 ['split','Sum insured break-up — building, plant, stock','text','','OPPORTUNITY','Fire & Special Perils','The risk','Y','12'],
 ['fsaudit','Fire safety audit done in the last 12 months?','select','Yes|No','OPPORTUNITY','Fire & Special Perils','The risk','Y','13'],
 ['fstation','Distance to the nearest fire station','text','','OPPORTUNITY','Fire & Special Perils','The risk','N','14'],
 ['','Number of storeys','number','','OPPORTUNITY','Fire & Special Perils','The risk','N','15']];
function qmValidate(rows){ var out={ok:[],err:[],newQ:0,upd:0,prods:{}}, have={}; (S.data.qm.qs||[]).forEach(function(q){ have[q.code]=q; });
  rows.forEach(function(r,i){ var o={}; QM_HEAD.forEach(function(h,j){ o[h]=String(r[j]==null?'':r[j]).trim(); }); var why='';
    if(!o.code) why='No code'; else if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(o.code)) why='Code has spaces or symbols';
    else if(!o.question) why='No question text'; else if(QM_TYPES.indexOf(o.type)<0) why='Type must be one of '+QM_TYPES.join(', ');
    else if((o.type==='select'||o.type==='multi')&&!o.options) why='A '+o.type+' needs options, separated by |';
    else if(o.scope!=='ACCOUNT'&&o.scope!=='OPPORTUNITY') why='Scope must be ACCOUNT or OPPORTUNITY';
    else if(PRODUCTS.indexOf(o.product)<0) why='Unknown product “'+o.product+'”';
    if(why){ out.err.push({row:i+2,why:why}); return; }
    out.ok.push(o); out.prods[o.product]=1; });
  var codes={}; out.ok.forEach(function(o){ if(codes[o.code]) return; codes[o.code]=1; if(have[o.code]) out.upd++; else out.newQ++; });
  return out; }
function qmCommit(v,file){ var qm=S.data.qm;
  v.ok.forEach(function(o){ var q=qmQ(o.code), opts=o.options?o.options.split('|').map(function(x){return x.trim();}).filter(Boolean):[];
    if(!q){ q={code:o.code,on:1}; qm.qs.push(q); } q.label=o.question; q.type=o.type; q.opts=opts; q.scope=o.scope; });
  Object.keys(v.prods).forEach(function(p){ qm.maps[p]=v.ok.filter(function(o){return o.product===p;}).map(function(o,i){ return {code:o.code,sec:o.section||'Questions',req:/^y/i.test(o.required)?1:0,order:+o.order||i+1}; }); qm.ver[p]=(qm.ver[p]||0)+1; });
  qm.log.unshift({at:S.now,by:S.user,tx:'Bulk upload '+file+' · '+v.newQ+' new, '+v.upd+' updated, '+v.err.length+' rows rejected · mapping replaced for '+Object.keys(v.prods).map(function(p){return p+' (v'+qm.ver[p]+')';}).join(', ')}); }
function qmCsv(rows){ return [QM_HEAD].concat(rows).map(function(r){ return r.map(csvCell).join(','); }).join('\n')+'\n'; }
function qmExportRows(){ var qm=S.data.qm, out=[]; Object.keys(qm.maps).forEach(function(p){ qm.maps[p].forEach(function(m){ var q=qmQ(m.code); if(q) out.push([q.code,q.label,q.type,(q.opts||[]).join('|'),q.scope,p,m.sec,m.req?'Y':'N',m.order]); }); }); return out; }
SCREENS.qmaster=function(){ var u=me(); if(!u||u.role!=='admin') return noAccess('screen'); var qm=S.data.qm, pf=S.ui.qmp||'';
  var prods=Object.keys(qm.maps);
  var rows=qm.qs.filter(function(q){ return !pf||(qm.maps[pf]||[]).some(function(m){return m.code===q.code;}); }).map(function(q){ var ps=prods.filter(function(p){ return qm.maps[p].some(function(m){return m.code===q.code;}); });
    return '<tr'+(q.on?'':' class="dim"')+'><td class="id mono">'+esc(q.code)+'</td><td class="nm" style="white-space:normal;min-width:220px">'+esc(q.label)+'</td><td>'+esc(q.type)+(q.opts&&q.opts.length?'<div class="sub">'+esc(q.opts.join(' · '))+'</div>':'')+'</td><td>'+chip(q.scope==='ACCOUNT'?'Account':'Opportunity',q.scope==='ACCOUNT'?'violet':'neutral',false,true)+'</td><td>'+(ps.length?esc(plural(ps.length,'product'))+'<div class="sub">'+esc(ps.join(', '))+'</div>':'<span class="meta">not mapped</span>')+'</td><td>'+chip(q.on?'Active':'Off',q.on?'green':'neutral',false,true)+'</td><td class="right"><button class="btn sm" data-flow="qmEdit" data-pre="'+esc(q.code)+'">Edit</button></td></tr>'; }).join('');
  var mapTbl=pf&&qm.maps[pf]?'<div class="h4 mt16 mb12">'+esc(pf)+' · mapping v'+(qm.ver[pf]||1)+'</div><section class="card" style="overflow:hidden"><div class="tw"><table class="t"><thead><tr><th class="num">#</th><th>Section</th><th>Question</th><th>Required</th></tr></thead><tbody>'+qm.maps[pf].slice().sort(function(x,y){return x.order-y.order;}).map(function(m){ var q=qmQ(m.code)||{}; return '<tr><td class="num">'+m.order+'</td><td>'+esc(m.sec)+'</td><td>'+esc(q.label||m.code)+' <span class="meta mono">'+esc(m.code)+'</span></td><td>'+(m.req?chip('Required','amber',false,true):'<span class="meta">optional</span>')+'</td></tr>'; }).join('')+'</tbody></table></div></section>':'';
  var html='<div class="crumbs"><button data-go="masters">Masters</button>'+ic('chevright','ic14')+'<b>Question Master</b></div><div class="hdrow"><div><div class="h1">Question Master</div><div class="sub">Every RFQ question is defined once, then mapped to products with its section, order and whether it is required. Account-scoped answers are shared across products for the same company. RFQs already sent or floated keep their snapshot.</div></div><span class="sp"></span><div class="acts"><button class="btn sm" data-qmtpl="1">'+ic('upload','ic14')+'Download template</button><button class="btn sm" data-flow="qmUpload">'+ic('upload','ic14')+'Upload Excel</button><button class="btn sm ghost" data-qmexp="1">Export</button></div></div>'+diamonds()+
    '<div class="flex wrap" style="gap:10px"><select class="sel" data-uisel="qmp" style="max-width:280px"><option value="">All products</option>'+prods.map(function(p){ return '<option'+(pf===p?' selected':'')+'>'+esc(p)+'</option>'; }).join('')+'</select><span class="meta">'+plural(qm.qs.length,'question')+' · '+plural(prods.length,'product')+' mapped · Cyber Liability keeps its band-based digitised forms</span></div>'+
    '<section class="card mt12" style="overflow:hidden"><div class="tw"><table class="t"><thead><tr><th>Code</th><th>Question</th><th>Type</th><th>Scope</th><th>Products</th><th>Status</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'+mapTbl+
    '<div class="h4 mt16 mb12">Change log</div><div class="card"><ul class="tl" style="padding:4px 16px">'+qm.log.slice(0,8).map(function(e){ return '<li><span class="dot sys"></span><div class="bd"><b>'+esc(e.tx)+'</b><div class="m">'+esc(uname(e.by))+' · '+esc(fmt(e.at))+'</div></div></li>'; }).join('')+'</ul></div>';
  return {sc:'Question Master', html:html, cta:'<button class="btn primary sm" data-flow="qmEdit">'+ic('plus')+'Add question</button>'}; };
HANDLERS.push(function(t){
  if(t.closest('[data-qmtpl]')){ fileSave(new Blob([qmCsv([['fsaudit','Fire safety audit done in the last 12 months?','select','Yes|No','OPPORTUNITY','Fire & Special Perils','The risk','Y','13'],['to','Annual turnover','number','','ACCOUNT','Fire & Special Perils','The business','Y','4']])],{type:'text/csv'}),'question-master-template.csv'); return true; }
  if(t.closest('[data-qmexp]')){ fileSave(new Blob([qmCsv(qmExportRows())],{type:'text/csv'}),'question-master-export.csv'); return true; }
  return false; });
FLOWS.qmEdit={t:function(){ return S.sel.pre?'Edit question':'Add a question'; }, sub:'Defined once, mapped to any number of products.', wide:true,
  repaintOn:['type'],
  body:function(){ var s=S.sel, q=s.pre?qmQ(s.pre):null, qm=S.data.qm;
    if(!s._init){ s._init=1; if(q){ s.code=q.code; s.lab=q.label; s.type=q.type; s.opts=(q.opts||[]).join(' | '); s.scope=q.scope; s.on=q.on?'1':'0'; s.mp=Object.keys(qm.maps).filter(function(p){ return qm.maps[p].some(function(m){return m.code===q.code;}); }); var m0=null; s.mp.forEach(function(p){ if(!m0) m0=qm.maps[p].filter(function(m){return m.code===q.code;})[0]; }); s.sec=m0?m0.sec:'Questions'; s.req=m0&&m0.req?'1':'0'; }
      else { s.type='text'; s.scope='OPPORTUNITY'; s.on='1'; s.mp=[]; s.sec='Questions'; s.req='1'; } }
    var e=qmEditErr();
    return '<div class="fgrid">'+field('Code',q?roInp(s.code):input('code',s.code,'fsaudit'),'The key in the RFQ and the Excel. Letters and digits.',e.code)+field('Question',input('lab',s.lab,'Fire safety audit done in the last 12 months?'),'',e.lab)+'</div>'+
      '<div class="fgrid">'+field('Type',select('type',s.type,QM_TYPES))+'<div class="field"><div class="lbl">Scope</div>'+seg('scope',[['OPPORTUNITY','Opportunity'],['ACCOUNT','Account — shared across products']],s.scope)+'</div></div>'+
      (s.type==='select'||s.type==='multi'?field('Options',input('opts',s.opts,'Yes | No'),'Separate with |.',e.opts):'')+
      '<div class="field"><div class="lbl">Products</div><div class="chips">'+PRODUCTS.filter(function(p){return p!==CYBER_PRODUCT;}).map(function(p){ return '<button type="button" data-tog="mp" data-tv="'+esc(p)+'"'+((s.mp||[]).indexOf(p)>=0?' class="on"':'')+'>'+esc(p)+'</button>'; }).join('')+'</div></div>'+
      '<div class="fgrid">'+field('Section',input('sec',s.sec,'The risk'))+'<div class="field"><div class="lbl">Required</div>'+seg('req',[['1','Required'],['0','Optional']],s.req)+'</div></div>'+
      '<div class="field"><div class="lbl">Status</div>'+seg('on',[['1','Active'],['0','Off']],s.on)+'</div>'+
      note('neutral','','Saving adds or removes the question on the products ticked (new mapping versions). RFQs already sent or floated keep their snapshot.','info'); },
  can:function(){ var e=qmEditErr(); for(var k in e) return false; return !!(S.sel.lab||'').trim()&&(!!S.sel.pre||!!(S.sel.code||'').trim()); },
  ok:'Save',
  run:function(){ var s=S.sel, qm=S.data.qm, isNew=!s.pre, code=isNew?s.code.trim():s.pre;
    var ok=write(function(){ var q=qmQ(code); if(!q){ q={code:code}; qm.qs.push(q); } q.label=s.lab.trim(); q.type=s.type; q.opts=(s.type==='select'||s.type==='multi')?String(s.opts||'').split('|').map(function(x){return x.trim();}).filter(Boolean):[]; q.scope=s.scope; q.on=s.on==='0'?0:1;
      var changed=[]; Object.keys(qm.maps).concat((s.mp||[]).filter(function(p){return !qm.maps[p];})).forEach(function(p){ var m=qm.maps[p]||(qm.maps[p]=[]), has=m.filter(function(x){return x.code===code;})[0], want=(s.mp||[]).indexOf(p)>=0;
        if(want&&!has){ m.push({code:code,sec:(s.sec||'Questions').trim(),req:s.req==='1'?1:0,order:m.length+1}); changed.push(p); }
        else if(want&&has){ if(has.sec!==(s.sec||'').trim()||has.req!==(s.req==='1'?1:0)){ has.sec=(s.sec||'Questions').trim(); has.req=s.req==='1'?1:0; changed.push(p); } }
        else if(!want&&has){ qm.maps[p]=m.filter(function(x){return x.code!==code;}); changed.push(p); } });
      changed.forEach(function(p){ qm.ver[p]=(qm.ver[p]||0)+1; });
      qm.log.unshift({at:S.now,by:S.user,tx:(isNew?'Added ':'Edited ')+code+' “'+q.label+'”'+(changed.length?' · mapping updated: '+changed.map(function(p){return p+' v'+qm.ver[p];}).join(', '):'')}); },'the question');
    if(!ok) return 'fail'; toast(isNew?'Question added':'Question saved',code); }};
function qmEditErr(){ var s=S.sel, e={}; if(!s.pre&&s.code!==undefined&&s.code!==''){ var c=String(s.code).trim(); if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(c)) e.code='Letters, digits and _ only, starting with a letter.'; else if(qmQ(c)) e.code='A question with this code exists.'; }
  if((s.type==='select'||s.type==='multi')&&s.opts!==undefined&&!String(s.opts).split('|').filter(function(x){return x.trim();}).length) e.opts='Give at least one option.'; return e; }
FLOWS.qmUpload={t:'Upload questions from Excel', sub:'Validated first (a dry run), then committed. Rows are upserted by code; the mapping is replaced for every product in the file, as a new version.', wide:true,
  body:function(){ var s=S.sel;
    if(!s.rows) return '<label class="pdrop" for="f_qmfile"><input type="file" id="f_qmfile" accept=".xlsx,.xls,.csv" data-qmfile="1" hidden>'+ic('upload','ic20')+'<b>Choose the Excel file</b><span>The template’s columns: '+esc(QM_HEAD.join(', '))+'</span></label>'+
      simblock('Prototype','A .csv is read for real. An .xlsx stands in for the sample file.','<button type="button" class="simbtn" data-qmsample="1">Use the sample file</button>')+
      '<div class="meta mt8">Need the layout? <button class="link" data-qmtpl="1">Download the template</button>.</div>';
    var v=s.v;
    return '<div class="kvgrid">'+kv('File',esc(s.file))+kv('Rows read',String(s.rows.length))+kv('Products in the file',esc(Object.keys(v.prods).join(', ')||'—'))+'</div>'+
      note(v.err.length?'amber':'green','Dry run',v.newQ+' new · '+v.upd+' updated · '+v.err.length+' rejected. Committing replaces the mapping for '+esc(Object.keys(v.prods).join(', ')||'no product')+' with the rows in this file.',v.err.length?'alert':'circlecheck')+
      (v.err.length?'<div class="rowlist doclist">'+v.err.map(function(e){ return '<div><div class="bd"><b>Row '+e.row+'</b><div class="m">'+esc(e.why)+'</div></div><div class="rt">'+chip('Rejected','red',false,true)+'</div></div>'; }).join('')+'</div>':'')+
      '<div class="mt8"><button type="button" class="btn sm ghost" data-qmreset="1">Choose another file</button></div>'; },
  can:function(){ return !!S.sel.v&&S.sel.v.ok.length>0; }, ok:'Commit',
  run:function(){ var s=S.sel; var ok=write(function(){ qmCommit(s.v,s.file); },'the upload'); if(!ok) return 'fail'; toast('Question Master updated',s.v.newQ+' new · '+s.v.upd+' updated · '+s.v.err.length+' rejected'); }};
HANDLERS.push(function(t){ if(!S.flow||S.flow!=='qmUpload') return false;
  if(t.closest('[data-qmsample]')){ S.sel.file='question-master-sample.xlsx'; S.sel.rows=QM_SAMPLE.slice(); S.sel.v=qmValidate(S.sel.rows); paintModal(); return true; }
  if(t.closest('[data-qmreset]')){ S.sel.file=''; S.sel.rows=null; S.sel.v=null; paintModal(); return true; }
  return false; });
document.addEventListener('change',function(ev){ var t=ev.target; if(!(t instanceof Element)||t.dataset.qmfile===undefined) return; var f=t.files&&t.files[0]; if(!f) return;
  if(/\.csv$/i.test(f.name)){ var rd=new FileReader(); rd.onload=function(){ var rows=csvParse(String(rd.result||'')); if(rows.length&&String(rows[0][0]).toLowerCase()==='code') rows.shift(); S.sel.file=f.name; S.sel.rows=rows; S.sel.v=qmValidate(rows); paintModal(); }; rd.readAsText(f); }
  else { S.sel.file=f.name; S.sel.rows=QM_SAMPLE.slice(); S.sel.v=qmValidate(S.sel.rows); paintModal(); } });
