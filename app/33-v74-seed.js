/* ==================================================================== *
 *  Seed — v74 additions on top of the v73 seed
 * ==================================================================== */
function v74MkAcct(d,o){ var a={id:o.id,n:o.n,trade:'',pan:o.pan||'',gst:o.gst||'',city:o.city,st:o.st,ind:o.ind||'',emp:o.emp||'',to:o.to||'',grp:'—',own:o.own,prov:o.prov?1:0,con:[o.con],pols:[],recs:[],prof:null,fin:null,sis:[],createdAt:o.at,createdBy:'Inbound automation',log:[]};
  if(!a.prov){ a.kycBy=o.own; a.kycAt=o.at; a.kycHow='PAN card and GST certificate uploaded · PAN matched the PAN inside the GSTIN'; } d.accounts.push(a); return a; }
function v74MkLine(d,o){ var c=o.con||{n:'',e:'',m:''};
  var l={id:o.id,opp:'OPP-'+o.id.slice(3),acct:o.acct,product:o.product,owner:o.owner,stage:o.stage||1,status:'open',reason:'',revisit:0,att:0,rate:null,rfq:{st:'none',f:{}},req:null,round:1,qAns:0,obj:'',qsel:[],picked:'',prem:o.prem||0,ins:'',pay:'pre',payMode:'',amt:0,payLines:[],renews:'',
    enteredAt:o.at,createdAt:o.at,assignedAt:o.at,src:o.src||'Website',contact:{n:c.n,e:c.e||'',m:c.m||''},log:[{at:o.at,t:'Product line created',m:'System',sys:1,kind:'sys'}]};
  d.lines.push(l); d.opps.push({id:l.opp,acct:o.acct,type:'New Business',bt:'Fresh',src:l.src,created:o.at,by:o.src==='Website'?'system':o.owner}); return l; }
function v74WebPlace(d,l){ var a=d.accounts.filter(function(x){return x.id===l.acct;})[0], m=WEB_DROP_MAP[l.drop]; if(!a||!m) return; var st=webDropStage(l.drop,a.prov); if(st<=1) return;
  var t=reqTpl(l.product), first=t?t[0][1].map(function(x){return Array.isArray(x)?x[0]:x;}):[], SMP={tob:'Manufacturing',noc:'Private limited',to:a.to||'₹40 Cr',si:'₹10 Cr',cybtob:'IT / ITES: Consulting',cybcov:'₹2 Cr',cybto:'₹5 Cr to ₹25 Cr',cybnat:'Private Limited',wcbiz:'Engineering workshop',wcnw:'40',wcsal:'₹18,000'};
  l.req={}; l.reqOnline={}; first.forEach(function(k){ var q=RQ[k]; if(!q||q.when) return; var v=SMP[k]||(q.k==='pick'?q.o[0]:''); if(v){ l.req[k]=v; l.reqOnline[k]=1; } });
  if(!l.req.si&&first.indexOf('si')<0) l.req.si=SMP.si;
  l.webPlaced=1; l.stage=st; l.enteredAt=l.assignedAt; l.visits=[{n:st,in:l.assignedAt}];
  l.rate=(m.non||!RATEABLE[l.product])?0:1; l.qAt=l.assignedAt;
  if(l.rate===1) l.webQuotes=dauQuotes(l).filter(function(q){return q.st==='quoted'&&!q.rt;}).map(function(q,i){ return {i:q.i,sel:(st>=9&&i===0)?1:0}; });
  else l.rfq={st:'draft',f:{},openedAt:l.assignedAt,sharedAt:0,verifiedAt:0,floatedAt:0,direct:0};
  if(st>=9){ var pick=l.webQuotes[0].i; l.picked=pick; l.ins=pick; l.route='OPS'; l.insBranch=(a.city||'Head office')+' branch'; l.qsel=l.webQuotes.map(function(w){return w.i;}); l.log.unshift({at:l.assignedAt,t:'Quote selected on the website',m:'System · '+pick+' · set as the confirmed quote',sys:1,kind:'web'}); }
  if(m.us) l.webKyc=1;
  l.log.unshift({at:l.assignedAt,t:'Landed at '+stageName(st)+' — website drop-off',m:'System · dropped at “'+l.drop+'” · '+(WEB_PRIO[l.drop]||'')+(l.webKyc?' · the KYC documents uploaded on the website are here to verify':'')+(st===3?' · the capture form is pre-filled from the L1 answers':''),sys:1,kind:'stage'}); }
function v74SeedPre(d){
  d.ctasks=ctSeed(); d.otasks=otSeed();
  var LN=function(id){ return d.lines.filter(function(l){return l.id===id;})[0]; }, AC=function(id){ return d.accounts.filter(function(a){return a.id===id;})[0]; };
  /* the three demo flows stay at New Lead */
  if(LN('OP-2001')) LN('OP-2001').drop='L1 Visited'; if(LN('OP-2002')) LN('OP-2002').drop='Company name filled'; if(LN('OP-2003')) LN('OP-2003').drop='Name phone email filled';
  /* the payment multi-select: Vantage pair on one insurer; Crestline shows the seventh condition */
  if(LN('OP-2007')){ LN('OP-2007').picked='ICICI Lombard'; LN('OP-2007').ins='ICICI Lombard'; }
  ['OP-2004','OP-2005','OP-2006','OP-2007'].forEach(function(id){ var l=LN(id); if(l){ l.route='OPS'; l.insBranch=((AC(l.acct)||{}).city||'Head office')+' branch'; } });
  /* website drop-offs, remapped to where the customer stopped */
  var remap={'OP-2140':'View all the available quotes','OP-2142':'Entered offline flow (thank you page)'}; Object.keys(remap).forEach(function(id){ if(LN(id)) LN(id).drop=remap[id]; });
  var ph={'OP-2130':'+91 98220 41190','OP-2140':'+91 98450 11273','OP-2141':'+91 98260 77341','OP-2142':'+91 99890 22014','OP-2143':'+91 98190 66218','OP-2144':'+91 98290 31407'};
  Object.keys(ph).forEach(function(id){ var l=LN(id); if(l){ l.contact.m=ph[id]; var a=AC(l.acct); if(a&&a.con[0]) a.con[0].m=ph[id]; } });
  var at=function(h){ return ago(0,h); };
  v74MkAcct(d,{id:'A-1207',n:'Orbit Packaging Pvt Ltd',city:'Pune',st:'Maharashtra',ind:'Packaging',own:'nikhil',prov:1,at:at(3),con:{n:'Kiran Patil',d:'Accounts Head',m:'+91 98500 22719',e:'kiran@orbitpack.in',dm:1}});
  v74MkLine(d,{id:'OP-2145',acct:'A-1207',product:'Fire & Special Perils',owner:'nikhil',prem:68000,at:at(2),con:{n:'Kiran Patil',m:'+91 98500 22719',e:'kiran@orbitpack.in'}}).drop='KYC documents submitted';
  v74MkAcct(d,{id:'A-1208',n:'Saffron Hotels Pvt Ltd',pan:'AAKCS7712Q',gst:'27AAKCS7712Q1Z3',city:'Mumbai',st:'Maharashtra',ind:'Hospitality',to:'₹58 Cr',own:'nikhil',prov:0,at:at(5),con:{n:'Meher Khanna',d:'CFO',m:'+91 98201 55318',e:'meher@saffronhotels.in',dm:1}});
  v74MkLine(d,{id:'OP-2146',acct:'A-1208',product:'Burglary',owner:'nikhil',prem:52000,at:at(1),con:{n:'Meher Khanna',m:'+91 98201 55318',e:'meher@saffronhotels.in'}}).drop='Payment failed';
  v74MkAcct(d,{id:'A-1209',n:'Lotus Ceramics',city:'Morbi',st:'Gujarat',ind:'Ceramics',own:'nikhil',prov:1,at:at(6),con:{n:'Hitesh Patel',d:'Proprietor',m:'+91 98250 40116',e:'hitesh@lotusceramics.in',dm:1}});
  v74MkLine(d,{id:'OP-2147',acct:'A-1209',product:'Fire & Special Perils',owner:'nikhil',prem:91000,at:at(4),con:{n:'Hitesh Patel',m:'+91 98250 40116',e:'hitesh@lotusceramics.in'}}).drop='Quote selected by user';
  d.lines.forEach(function(l){ if(l.drop&&l.src==='Website') v74WebPlace(d,l); });
  /* the instant route, ready to try: a Burglary QCR with Go Digit on it, at Quote Sent */
  var a3=AC('A-1003'); var l8=v74MkLine(d,{id:'OP-2008',acct:'A-1003',product:'Burglary',owner:'nikhil',prem:96000,at:ago(6),src:'Referral',con:a3&&a3.con[0]?a3.con[0]:{}});
  l8.stage=8; l8.rate=1; l8.enteredAt=ago(2); l8.qAt=ago(3); l8.qsel=dauQuotes(l8).filter(function(q){return q.st==='quoted';}).map(function(q){return q.i;}); l8.visits=[{n:8,in:ago(2)}]; l8.conn=1;
  l8.req={si:'₹8 Cr',tp:'₹1,00,000'}; l8.log.push({at:ago(5),t:'Call · Customer decided — update stage',m:'Nikhil Sharma · call 1 · connected · Ozonetel click-to-call',sys:0,kind:'call'},{at:ago(3),t:'Quotes fetched — route DUA',m:'System · get-quote API · 5 insurers priced',sys:1,kind:'sys'},{at:ago(2),t:'QCR v1 sent to client',m:'Nikhil Sharma · 5 quotes · assembled here · includes Go Digit (instant purchase)',sys:0,kind:'qcr'});
  l8.att=1; l8.calls=1;
  /* addresses on every account */
  d.accounts.forEach(function(a){ var base=(a.city||'')+(a.st?', '+a.st:''); if(!a.commAddr) a.commAddr='Registered office, '+base; if(!a.gstAddr&&!a.prov) a.gstAddr=a.commAddr; });
}
function seedFill(d){ v74SeedPre(d);
  var SMP={tob:'Manufacturing',noc:'Private limited',to:'₹40 Cr',si:'₹10 Cr',occ:'Manufacturing unit with an attached godown',com:'Finished goods',mode:'Road',act:'Manufacturing and trading',hc:'180',fam:'Employee, spouse and children',pol:'n',clm:'No claims in 3 years',ten:'1 year'};
  d.lines.forEach(function(l){ if(l.webPlaced||l.stage<3||!l.req) return; var t=reqTpl(l.product); if(!t) return; t.forEach(function(g){ g[1].forEach(function(x){ var k=Array.isArray(x)?x[0]:x; if(!l.req[k]) l.req[k]=k==='to'?((d.accounts.filter(function(a){return a.id===l.acct;})[0]||{}).to||SMP.to):SMP[k]; }); }); if(l.req.pol==='y'&&!l.req.ins){ l.req.ins='New India Assurance'; } if(l.req.pol==='y'&&!l.req.exp) l.req.exp='2026-12-31'; });
  return d; }
/* the Question Master is seeded once S.data exists (it reads the RFQ defaults) */
(function(){ var p0=primeRules; primeRules=function(){ if(S.data&&!S.data.qm) S.data.qm=qmSeed(); return p0(); }; })();

/* [stated 23 Oct] a quick call from the line's contact card: Ozonetel click-to-call, no disposition,
   no task closed or created — just a way to reach the customer whenever needed */
HANDLERS.push(function(t){ var x=t.closest('[data-qcall]'); if(!x) return false; var l=lineById(x.dataset.qcall), c=l&&l.contact; if(!c||!c.m) return true;
  var ok=write(function(){ logAdd(l,'Quick call · '+(c.n||'contact'),uname(S.user)+' · '+c.m+' · Ozonetel click-to-call from the contact card · no disposition','call'); },'the call');
  if(ok){ paint(); toast('Calling '+(c.n||'the contact'),'Placed from your BimaKavach number via Ozonetel. No outcome form for this call — it is on the activity.'); } return true; });

/* [stated 23 Oct] at New Lead, First Contact works as in v73: the v73 disposition list and
   form (Discovery complete opens the requirement, call back sets a time, referred POC, the
   not-connected outcomes). The v74 call task on the line closes with the call. */
(function(){ var F=FLOWS.firstCall, G={};
  Object.keys(F).forEach(function(k){ var v=F[k]; G[k]=typeof v==='function'?function(){ var keep=DISP; DISP=DISP0; try{ return v.apply(this,arguments); } finally{ DISP=keep; } }:v; });
  var r0=G.run; G.run=function(){ var l=FL(), d=S.sel.d, cbat=S.sel.cbat, open=l?tasksOfLine(l.id).filter(function(x){return !x.done&&x.ct;}).map(function(x){return x.id;}):[], res=r0.apply(this,arguments);
    if(res!=='fail'&&l){
      /* the call closes the New Lead call task it was made for — say so, not "closed by itself" */
      open.forEach(function(id){ var t=by(S.data.tasks,id); if(t&&(!t.done||/^Closed by itself/.test(t.closeWhy||''))){ t.done=1; t.doneAt=S.now; t.doneBy=S.user; t.closeWhy='First contact logged'; } });
      /* a call back becomes the v74 outcome call task (Call Now on the card), replacing the stage task */
      if(d==='cb'&&cbat){ var due=new Date(cbat).getTime();
        S.data.tasks=S.data.tasks.filter(function(t){ return !(t.line===l.id&&!t.done&&!t.ct&&t.cls==='Follow-up'&&t.createdAt===S.now&&t.dueAt===due); });
        otMake(l,'cb',due); }
      else ctRun(l);
      save(); paint(); }
    return res; };
  FLOWS.firstCall=G; })();
