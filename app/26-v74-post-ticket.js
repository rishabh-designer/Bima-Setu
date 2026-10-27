/* ==================================================================== *
 *  2 · Post-purchase — the issuance ticket on BimaOps
 *  [FR-8.05] no provisional policy id or period: the opportunity id shows
 *  until QC, then the insurer's number and the real period. QC is the copy
 *  and one approve. Queries on the ticket; the escalation after three
 *  follow-ups runs here; the ticket carries what was bought at creation.
 * ==================================================================== */
function polNoDisp(p){ if(p.pno) return p.pno; if(p.issuing&&p.line) return p.line; return 'awaited'; }
function issCreate(l){
  var a=acctOf(l), ins=l.picked||l.ins||'—', md=mandateOnFile(a.id), rhl=rhlMode(l), pf=pfMode(l);
  l.iss={id:'ISS-'+String(S.data.seq.iss++).padStart(4,'0'),owner:'radha',createdAt:S.now,assignedAt:0,stage:'new',mail:[],qs:[],cliFu:0,
    rows:{rhl:{mode:rhl,st:rhl==='none'?'na':'wait',fu:0,at:0}, pf:{mode:pf,st:pf==='none'?'na':'wait',fu:0,recv:0,at:0}, md:{mode:md?'file':'dig',st:md?'na':'wait',fu:0,at:0,ref:md?md.id:''}, pol:{st:'na',fu:0,esc:0,copy:0,inv:0,at:0}}};
  l.iss.skip12 = rhl==='none' && pf==='none' && !!md;
  var held=(a.pols||[]).filter(function(p){return p.line!==l.id;});
  l.iss.carry={acct:{n:a.n,gst:a.gst||'',pan:a.pan||'',addr:a.commAddr||((a.city||'')+(a.st?', '+a.st:'')),gstAddr:a.gstAddr||''},rm:l.owner,
    pols:held.map(function(p){return {id:p.id,no:polNoDisp(p),p:p.p,ins:p.ins};}),
    mandate:md?{id:md.id,until:md.until}:null,
    quote:{ref:'Q-'+l.id.slice(3)+'-26',ins:ins,pr:premOf(l),si:(l.req||{}).si||'—'},
    docs:((l.rate===0&&l.rfq&&l.rfq.st==='floated')?['RFQ as sent to placement']:[]).concat(['Quote · '+ins])};
  /* the policy record: no generated number and no period until QC */
  if(a && !polOfLine(l)) a.pols.push({id:polCode(l.product)+'-2026-'+l.id.slice(3),bkno:'',pno:'',ins:ins,p:l.product,si:(l.req||{}).si||'—',pr:premOf(l),start:S.now,exp:S.now+365*86400000,endo:0,issuing:1,line:l.id,ptype:polTypeFor(a,l),prev:l.renews||''});
  logAdd(l,'Post-purchase ticket '+l.iss.id+' created','System · BimaOps · Customer Success · carries the account, the RM, '+held.length+' '+(held.length===1?'policy':'policies')+' already held, the mandate status, the chosen quote, the RFQ and the quote PDF · mandate register read: '+(md?md.id+' on file — no mandate letter asked':'none on file')+' · '+(l.iss.skip12?'nothing to collect':[rhl==='none'?'':'RHL',pf==='none'?'':'proposal form',md?'':'mandate'].filter(Boolean).join(', ')+' to collect'),'sys',1);
}
function issSend(l){
  var a=acctOf(l), r=l.iss.rows, p=polOfLine(l), c=l.contact;
  r.pol.st='sent'; r.pol.at=S.now; l.iss.stage='closed';
  if(p){ p.issuing=0; p.pno=insPolNo(p); if(!p.bkno) p.bkno=bkPolNo(); p.period=fmtD(S.now)+' – '+fmtD(S.now+365*86400000-86400000); p.start=S.now; p.exp=S.now+365*86400000-86400000; p.issuedAt=S.now; }
  issMail(l,'client',GENERIC_FROM,c.e||c.n,'Your policy — '+a.n+' · '+l.product,'Policy '+(p?p.pno:'')+' and the tax invoice are attached, and on Bimakendra. Your contact for this policy is '+uname(l.owner)+', your relationship manager.');
  logAdd(l,'Policy copy and tax invoice sent to the client','System · QC approved · three rails: system email from '+GENERIC_FROM+', Bimakendra, the RM interface · the insurer’s number and period written from the document'+(p?' · '+p.pno:''),'post',1);
  moveStage(l,15,'Policy copy sent to the client');
}
FLOWS.qcApprove={t:'QC the policy copy', sub:'Open the copy. Approving sends it and the tax invoice to the client.', wide:true,
  body:function(){ var l=FL(), r=l.iss.rows, inv=r.pol.inv;
    var doc=function(name,sub){ return '<div class="qcard"><div class="qc-ic">'+ic('file','ic20')+'</div><div class="qc-bd"><b>'+esc(name)+'</b><div class="qc-m">'+esc(sub)+'</div></div><div class="qc-a">'+docBtns(name,{line:l.id})+'</div></div>'; };
    return '<div class="qcards">'+doc('Policy copy','From '+(l.picked||l.ins)+' · received '+fmt(r.pol.at||S.now))+(inv?doc('Tax invoice','From '+(l.picked||l.ins)):'')+'</div>'+
      (inv?'':note('amber','The tax invoice has not arrived','You can open the copy now; it goes out once the invoice is in.','alert'))+
      note('blue','','QC approve sends the policy copy and the tax invoice to '+esc(l.contact.n||'the client')+' on the three rails — system email from '+GENERIC_FROM+', Bimakendra and here — and writes the insurer’s policy number and period onto the policy record. Nothing is extracted on this screen.','info'); },
  can:function(){ return !!FL().iss.rows.pol.inv; }, ok:'QC approve and send to client',
  run:function(){ var l=FL(); var ok=write(function(){ logAdd(l,'Policy copy QC approved',uname(S.user),'post'); issSend(l); },'the approval'); if(!ok) return 'fail'; toast('QC approved · sent to the client','Policy copy and tax invoice on the three rails. The policy now carries the insurer’s number.'); }};

var ISS_QUERIES=[['Proposal form','The insurer wants the occupancy described per building in the proposal form. Can the client confirm which buildings are covered?'],['Address','The insurer’s receipt shows a different GSTIN address. Which address should the policy carry?'],['Policy start','The insurer asks whether the policy should start from the payment date or from the 1st of next month. Please confirm with the client.']];
function issOpenQ(l){ return l&&l.iss?((l.iss.qs||[]).filter(function(q){return !q.ans;})[0]||null):null; }
FLOWS.issAnswer={t:'Answer the desk’s query', sub:'On the post-purchase ticket. Your answer goes back to BimaOps.',
  body:function(){ var l=FL(), q=issOpenQ(l); if(!q) return note('neutral','','No open query on this ticket.');
    return note('amber',q.topic+' · '+q.by+', Customer Success','“'+esc(q.q)+'”','mail')+field('Your answer',input('x',S.sel.x,'What the client said'))+field('Attach a document — optional',select('doc',S.sel.doc||'',[['','Nothing attached'],'Client email','Revised proposal form','Address proof'])); },
  can:function(){ return !!issOpenQ(FL())&&!!(S.sel.x||'').trim(); }, ok:'Send the answer',
  run:function(){ var l=FL(), q=issOpenQ(l); var ok=write(function(){ q.ans=S.sel.x.trim()+(S.sel.doc?' · attached: '+S.sel.doc:''); q.ansAt=S.now; q.ansBy=S.user; issMail(l,'rm',uname(S.user),'Customer Success','RE: '+q.topic+' — '+l.iss.id,q.ans); logAdd(l,'Answered the desk’s query · '+q.topic,uname(S.user)+' · '+q.ans+' · sent back to BimaOps','desk'); },'the answer');
    if(!ok) return 'fail'; toast('Answer sent to BimaOps','The query is closed on the ticket.'); }};
/* [stated 23 Oct · new behaviour 7] BimaOps raises the signal after three follow-ups with nothing back; the escalation runs here */
function issEscalate(l){ var u=userById(l.owner), mgr=u&&u.mgr?u.mgr:'';
  l.iss.esc=S.now;
  S.data.tasks.push({id:'T-'+(S.data.seq.task++),line:l.id,acct:null,owner:l.owner,title:'BimaOps escalation · documents not back after 3 follow-ups',desc:'Proposal form / mandate still with the client. Call them, or ask your manager to.',cls:'Escalation',createdAt:S.now,dueAt:S.now-1,escAt:S.now-1,done:0,doneAt:0,doneBy:'',rule:'',seen:'esc'});
  logAdd(l,'Escalated by BimaOps — three follow-ups, nothing back','System · signal on '+l.iss.id+' · the escalation runs in BimaSetu: '+uname(l.owner)+' → '+(mgr?uname(mgr):'no manager'),'sys',1); }
function postSims(l){ var b=postSims0(l), i=l.iss; if(!i||i.stage==='closed') return b; var r=i.rows;
  if(l.stage===13&&(r.pf.st==='pending'||r.md.st==='pending')&&!i.esc) b.push(simbtn('BimaOps follow-up to the client on the form / mandate ('+((i.cliFu||0)+1)+' of 3)','data-v74sim="issCliFu" data-line="'+l.id+'"'));
  if(!issOpenQ(l)) b.push(simbtn('Customer Success raises a query on the ticket','data-v74sim="issQuery" data-line="'+l.id+'"'));
  return b; }
function postNextAction(l){ var q=issOpenQ(l);
  if(q&&!dead(l)&&l.stage<15) return {tone:'amber',lab:'Needs your answer',txt:'Customer Success has a query · '+q.topic,why:'“'+q.q+'” Answer it here — it goes back to BimaOps on the ticket.',acts:[['issAnswer','Answer the query']]};
  var na=postNextAction0(l);
  if(l.iss&&l.iss.esc&&l.stage===13){ var u=userById(l.owner); na.why=(na.why?na.why+' ':'')+'BimaOps escalated after three follow-ups with nothing back — '+(u&&u.mgr?uname(u.mgr)+' sees it too.':'there is no manager to escalate to.'); }
  return na; }
function issTicket(l){ var t=issTicket0(l), q=issOpenQ(l);
  if(q){ t.pend='Customer Success has a query · '+q.topic; t.act='issAnswer'; t.actLbl='Answer the query'; t.tone='amber'; }
  if(l.iss.esc&&l.iss.stage!=='closed') t.pend=(t.pend?t.pend+' · ':'')+'Escalated by BimaOps';
  return t; }
function issQueriesBlock(l,can){ if(!l.iss) return ''; var qs=l.iss.qs||[];
  return diamonds(true)+'<div class="flex"><div class="h3">Queries from the desk</div><span class="sp"></span>'+(l.iss.esc?chip('Escalated','red',true,true):'')+'</div><div class="meta">Customer Success raises a query with a topic and a question; you answer it here and the answer goes back to BimaOps.</div>'+
    (qs.length?'<div class="mt8">'+qs.map(function(q){ return '<div class="tk-q"><div class="tk-qh">'+esc(q.topic)+' · '+esc(q.by)+' · '+esc(fmt(q.at))+' '+(q.ans?chip('Answered','green',true,true):chip('Open','amber',true,true))+'</div><div class="tk-qt">'+esc(q.q)+'</div></div>'+
      (q.ans?'<div class="tk-q you"><div class="tk-qh">Your answer · '+esc(fmt(q.ansAt))+'</div><div class="tk-qt">'+esc(q.ans)+'</div></div>':(can?'<div class="mt8"><button class="btn sm primary" data-flow="issAnswer" data-line="'+l.id+'">Answer the query</button></div>':'')); }).join('<div class="mt8"></div>')+'</div>'
      :'<div class="meta mt8">No queries on this ticket.</div>'); }
function issCarryBlock(l){ var c=l.iss&&l.iss.carry; if(!c) return '';
  return diamonds(true)+'<div class="h3">Carried to BimaOps at creation</div><div class="meta">So the desk can answer an insurer asking what was bought without opening BimaSetu.</div><div class="kvgrid mt12">'+
    kv('Account',esc(c.acct.n)+'<div class="meta">'+esc(c.acct.gst||'no GSTIN')+' · '+esc(c.acct.addr||'—')+'</div>')+kv('RM',esc(uname(c.rm)))+
    kv('Policies already held',c.pols.length?c.pols.map(function(p){return esc(p.p)+' · '+esc(p.ins);}).join('<br>'):'<span class="meta">None — first policy</span>')+
    kv('Mandate',c.mandate?esc(c.mandate.id)+' · valid until '+esc(fmtD(c.mandate.until)):'<span class="meta">None on file — asked on this ticket</span>')+
    kv('Final quote',esc(c.quote.ref)+'<div class="meta">'+esc(c.quote.ins)+' · '+INR(c.quote.pr)+' · SI '+esc(c.quote.si)+'</div>')+
    kv('Documents',c.docs.map(function(d){ return docView1(d,{line:l.id},d); }).join(' '))+'</div>'; }
function postTab(l){ return postTab0(l)+issQueriesBlock(l,canAct(l))+issCarryBlock(l); }
