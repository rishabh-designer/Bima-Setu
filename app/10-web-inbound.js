/* ==================================================================== *
 *  Inbound enquiries — [stated 26 Sep · 3.2, 3.4, 3.5]
 *  A website or embedded enquiry lands at the stage the customer reached,
 *  with everything they entered on the record. On an account already here
 *  the attach rules decide: join the open line, add a line to the open
 *  opportunity, or start a new opportunity. Only an Open opportunity absorbs.
 * ==================================================================== */
var INBOUND={
 lead:  {label:'New company · contact details only', n:'Lakshmi Polymers Pvt Ltd', gst:'27AAECL8812K1Z2', city:'Aurangabad', st:'Maharashtra', ind:'Plastics', product:'Fire & Special Perils', con:{n:'Girish Lakshmi',d:'Director',m:'+91 98600 41122',e:'girish@lakshmipoly.in'}, src:'Website', step:'start'},
 legs:  {label:'Answered two discovery steps online · no GSTIN', n:'Coastal Exports LLP', gst:'', city:'Mangaluru', st:'Karnataka', ind:'Seafood exports', product:'Marine Cargo', con:{n:'Fathima Sheikh',d:'Partner',m:'+91 98440 20311',e:'fathima@coastalexports.in'}, src:'Website', step:'legs', legs:2,
        req:{tob:'Trading',noc:'Partnership',to:'₹22 Cr',si:'₹6 Cr',pol:'y',ins:'Oriental Insurance',exp:'2026-11-30'}},
 dau:   {label:'Saw DUA quotes online · picked none', n:'Zenith Retail Pvt Ltd', gst:'29AAACZ3301P1ZK', city:'Bengaluru', st:'Karnataka', ind:'Retail', product:'Burglary', con:{n:'Neha Reddy',d:'Store Operations Head',m:'+91 98860 77015',e:'neha@zenithretail.in'}, src:'Embedded', step:'rated',
        req:{tob:'Trading',noc:'Private limited',to:'₹14 Cr',si:'₹3 Cr',pol:'n',ten:'1 year',clm:'No claims in 3 years'}},
 sel:   {label:'Picked a quote online · stopped before KYC', n:'Harbour Foods LLP', gst:'', city:'Kochi', st:'Kerala', ind:'Food processing', product:'Fire & Special Perils', con:{n:'Anil Varghese',d:'Partner',m:'+91 98470 55210',e:'anil@harbourfoods.in'}, src:'Website', step:'selected', pick:'Tata AIG',
        req:{tob:'Manufacturing',noc:'Partnership',to:'₹31 Cr',si:'₹9 Cr',pol:'n',ten:'1 year',clm:'No claims in 3 years'}},
 repeat:{label:'Repeat enquiry · Sharma · Burglary (already open)', gst:'27AABCS1234F1Z5', product:'Burglary', con:{n:'Suresh Iyer',d:'Plant Head',m:'+91 98200 60415',e:'suresh.iyer@sharmaind.in'}, src:'Website', step:'start'},
 addon: {label:'Different product · Sharma · Professional Indemnity', gst:'27AABCS1234F1Z5', product:'Professional Indemnity', con:{n:'Rahul Mehta',d:'Finance Head',m:'+91 98200 44112',e:'rahul.mehta@sharmaind.in'}, src:'Website', step:'start'},
 rmacct:{label:'Enquiry on an RM’s account · Kalyan · Burglary', gst:'27AAECK9912J1ZR', product:'Burglary', con:{n:'Sunita Rane',d:'Admin Head',m:'+91 99300 55210',e:'sunita.rane@kalyanlog.in'}, src:'Embedded', step:'start'}
};
var WEB_LEGS=[['L1','tob','noc','to','si'],['L2','pol','ins','exp'],['L3','clm'],['L4','ten']];
/* the attach decision on an account that is already here */
function attachFor(a,product){
  var opps=oppsOfAcct(a.id).map(function(o){ return {o:o,s:oppStatus(o).tx,ls:linesOfOpp(o.id)}; });
  var carry=opps.filter(function(x){ return x.ls.some(function(l){ return l.product===product&&!dead(l)&&l.stage<SALES_STAGES; }); });
  var liveCarry=carry.filter(function(x){ return x.s==='Open'&&x.ls.some(function(l){ return l.product===product&&openLine(l); }); });
  if(liveCarry.length){ var best=liveCarry.map(function(x){ return x.ls.filter(function(l){return l.product===product&&openLine(l);}).sort(function(p,q){return q.stage-p.stage;})[0]; }).sort(function(p,q){return q.stage-p.stage;})[0];
    return {k:'join',line:best,tx:'joined the open '+product+' line on '+best.opp}; }
  var openOpps=opps.filter(function(x){ return x.s==='Open'&&x.ls.some(openLine); }).sort(function(p,q){return q.o.created-p.o.created;});
  if(openOpps.length) return {k:'addline',opp:openOpps[0].o,tx:'a new '+product+' line on the open opportunity '+openOpps[0].o.id};
  return {k:'newopp',tx:carry.length?'a new opportunity — the one carrying '+product+' is not open':'a new opportunity'};
}
function inboundOwner(a,product,forNewLine){
  if(a){ var o=userById(a.own); if(o&&(o.role==='rm'||o.role==='rmhead')) return {u:a.own,how:'the account is owned by its RM, '+o.n}; if(o&&!forNewLine) return {u:a.own,how:'the account’s owner, '+o.n}; }
  var p=assignPick(product); return {u:p.u,how:p.how};
}
function runInbound(k){
  var res={};
  var ok=write(function(){
    var m=matchAcct('',k.gst), a=m&&m.a?m.a:null, att=a?attachFor(a,k.product):{k:'newopp',tx:'a new opportunity'};
    if(att.k==='join'){ var l=att.line, c=conMatch(a,k.con), added=false;
      if(!c){ c={n:k.con.n,d:k.con.d||'',m:k.con.m,e:k.con.e}; a.con.push(c); added=true; }
      /* [stated 26 Sep · 3.5] one activity entry, a contact if new, the current source — and nothing else */
      l.log.unshift({at:S.now,t:'Repeat enquiry on this product line',m:k.src+' — '+c.n+(c.d?' ('+c.d+')':'')+(added?' · added to the account’s contacts':''),sys:1,kind:'enq'});
      l.curSrc=k.src; auditLog('attach',{rule:'join',line:l.id,acct:a.id});
      res={line:l.id,acct:a.id,kind:'join',owner:l.owner,tx:att.tx}; return; }
    var own=inboundOwner(a,k.product,att.k==='addline'), newAcct=!a;
    if(!a){ a=newAccount({n:k.n,gst:k.gst,city:k.city,st:k.st,ind:k.ind,own:own.u,prov:k.gst?0:1,createdBy:'Inbound automation',kycHow:'GSTIN on the enquiry · PAN derived from it'}); }
    if(!a.own) a.own=own.u;
    var c=conMatch(a,k.con); if(!c){ c={n:k.con.n,d:k.con.d||'',m:k.con.m,e:k.con.e}; a.con.push(c); }
    var o=att.k==='addline'?att.opp:null;
    if(!o){ o={id:newOppId(),acct:a.id,type:'New Business',bt:'Fresh',src:k.src,created:S.now,by:'system',log:[]}; S.data.opps.push(o); oppLog(o,'Opportunity created','Inbound automation · '+k.src); }
    /* where the line lands — the last step the customer completed */
    var stage=1, req=null, rate=null, online={}, legsDone=0;
    if(k.req){ req={si:'',tp:'',to:'',tob:'',noc:'',pol:'',ins:'',exp:'',ten:'',clm:'',pan:'',note:''}; WEB_LEGS.forEach(function(g,i){ if(k.step==='legs'&&i>=k.legs) return; var any=false; g.slice(1).forEach(function(f){ if(k.req[f]!==undefined){ req[f]=k.req[f]; online[f]=1; any=true; } }); if(any) legsDone++; }); }
    if(k.step==='legs') stage=2; if(k.step==='rated'){ stage=3; rate=1; } if(k.step==='selected'){ stage=9; rate=1; }
    var l=newLine({opp:o.id,acct:a.id,product:k.product,owner:own.u,stage:stage,rate:rate,req:stage>=3||k.step==='legs'?req:null,src:k.src,contact:c,sys:1,
      how:'Inbound automation · '+k.src+' · assigned to '+uname(own.u)+' · '+own.how});
    l.inbound={step:k.step,legs:legsDone,at:S.now}; l.reqOnline=online;
    if(k.step==='rated'||k.step==='selected'){ l.webQuotes=QUOTES.dau.filter(function(q){return q.st==='quoted';}).map(function(q){ return {i:q.i,sel:k.pick===q.i?1:0}; }); }
    if(k.step==='selected'){ l.picked=k.pick; l.ins=k.pick; l.prem=(QUOTES.dau.filter(function(q){return q.i===k.pick;})[0]||{}).p||0;
      logAdd(l,'Quote selected on the website','System · '+k.pick+' · '+INR(l.prem)+' · set as the confirmed quote','web',1); }
    if(stage>1) logAdd(l,'Landed at '+stageName(stage),'System · the customer reached '+({legs:'the discovery questions — '+plural(legsDone,'step')+' of 4 answered',rated:'the rater’s quotes and picked none',selected:'a quote selection and stopped before paying'}[k.step]),'stage',1);
    if(att.k==='addline') oppLog(o,'Product line added: '+k.product,'Inbound automation · '+k.src);
    fireRules(l);
    auditLog('attach',{rule:att.k,line:l.id,acct:a.id,opp:o.id});
    res={line:l.id,acct:a.id,newAcct:newAcct,kind:att.k,owner:own.u,how:own.how,tx:att.tx,stage:stage};
  },'the inbound enquiry');
  if(!ok) return; paint();
  var mine=res.owner===S.user;
  if(res.kind==='join') toast('Repeat enquiry — joined the open line','Written on the line’s activity only. No task, no stage move, no reassignment'+(mine?'.':' — it is '+uname(res.owner)+'’s line.'));
  else toast('Inbound enquiry — '+(res.kind==='addline'?'new line on the open opportunity':'new opportunity'),'Landed at '+stageName(res.stage)+' · '+(mine?'assigned to you — it is in Newly assigned':'assigned to '+uname(res.owner))+' · '+res.how+'.');
}
HANDLERS.push(function(t){ var x=t.closest('[data-inbound]'); if(!x) return false; var k=INBOUND[x.dataset.inbound]; if(k) runInbound(k); return true; });
function inboundSim(){ return simblock('Simulate an inbound enquiry','Stands in for the website form and embedded partner journeys. Each lands where the customer stopped; on an account already here the attach rules decide what it joins.',
  Object.keys(INBOUND).map(function(k){ return simbtn(INBOUND[k].label,'data-inbound="'+k+'"'); }).join('')); }
/* a small audit trail the prototype keeps for the record — no screen reads it (19.4) */
function auditLog(kind,o){ if(!S.data.audit) S.data.audit=[]; S.data.audit.unshift({at:S.now,kind:kind,by:S.user,o:o}); if(S.data.audit.length>400) S.data.audit.length=400; }
