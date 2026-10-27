/* ==================================================================== *
 *  v74 simulated events (amber dashed) — one handler
 * ==================================================================== */
function v74Sim(k,l){ var msg=['',''];
  var ok=write(function(){
    var each=function(fn){ (l.payLines&&l.payLines.length?l.payLines:[l.id]).forEach(function(id){ var x=lineById(id); if(x&&x.pay==='ticket') fn(x); }); };
    if(k==='payRoute'){ each(function(x){ x.payDesk=1; x.payDeskAt=S.now; logAdd(x,'Desk stage → Link generation','System · BimaOps · picked up by '+OPS_OWNER+' · '+payRef(x),'sys',1); }); msg=['Ops picked it up','Desk stage Link generation.']; }
    if(k==='payAwait'){ each(function(x){ x.payDesk=2; x.payDeskAt=S.now; logAdd(x,'Desk stage → Awaiting payment details','System · BimaOps · link requested from '+payIns(x)+' · '+payRef(x),'sys',1); }); msg=['Link requested from the insurer','Desk stage Awaiting payment details.']; }
    if(k==='issCliFu'){ var i=l.iss; i.cliFu=(i.cliFu||0)+1; issMail(l,'client',GENERIC_FROM,l.contact.e||l.contact.n,'Reminder '+i.cliFu+': documents pending — '+acctName(l),'Your proposal form and/or mandate letter are still pending on Bimakendra. Your contact is '+uname(l.owner)+', your relationship manager.');
      logAdd(l,'BimaOps follow-up '+i.cliFu+' to the client','System · Customer Success · proposal form / mandate still pending','sys',1);
      if(i.cliFu>=3&&!i.esc){ issEscalate(l); msg=['BimaOps escalated','Three follow-ups with nothing back. The escalation runs here — it is on '+uname(l.owner)+'’s list and with their manager.']; }
      else msg=['Follow-up '+i.cliFu+' sent',i.cliFu===2?'One more with nothing back and BimaOps raises the escalation signal.':'']; }
    if(k==='issQuery'){ var qs=l.iss.qs=l.iss.qs||[], qq=ISS_QUERIES[qs.length%ISS_QUERIES.length]; qs.push({id:'Q-'+(qs.length+1),topic:qq[0],q:qq[1],at:S.now,by:CS_NAME,ans:'',ansAt:0});
      logAdd(l,'Query from Customer Success · '+qq[0],'System · BimaOps · '+l.iss.id+' · '+qq[1],'sys',1); msg=['Customer Success raised a query','Answer it on the post-purchase ticket — the answer goes back to BimaOps.']; }
    if(k==='instPaid'){ if(cholaLinkExpired(l)) return; var cfg=instCfg(l), a=acctOf(l), rm=rmFor(a,l.product), ins=shortIns(l.picked);
      l.pay='paid'; l.soldBy=l.owner; l.paidAt=S.now; l.amt=premOf(l);
      l.hand={note:'',by:l.owner,at:S.now,utr:cholaUtr(l),proof:ins+' payment link',read:'detected from the insurer ('+cfg.detect+')'};
      l.chola.paid=S.now;
      logAdd(l,'Client paid on '+ins+'’s link','System · '+INR(premOf(l))+' · amount matches · detected by the insurer '+cfg.detect+' · no payment ticket','pay',1);
      logAdd(l,'Sold by '+uname(l.owner),'System · '+l.picked+' · '+INR(premOf(l)),'sys',1);
      logAdd(l,'Owner changed from '+uname(l.owner)+' to '+uname(rm)+' — Transfer at payment','by the system · instant purchase','sys',1);
      l.owner=rm; tasksOfLine(l.id).forEach(function(t){ if(!t.done) t.owner=rm; }); if(a) a.own=rm;
      if(cfg.policy){ cholaIssue(l); logAdd(l,'Policy number and PDF returned by '+ins,'System · issued on payment · no post-purchase ticket','post',1); moveStage(l,12,'Paid on the insurer’s link'); msg=['Paid on '+ins+'’s link','The policy number and PDF came back — share the copy. No ticket.']; }
      else { moveStage(l,12,'Paid on the insurer’s link'); logAdd(l,'No policy PDF from '+ins,'System · the policy copy did not come back — the normal post-purchase ticket opens','sys',1); issCreate(l); msg=['Paid on '+ins+'’s link','No policy PDF came back, so the post-purchase ticket opened.']; } }
  },'the simulated event');
  if(!ok) return; paint(); if(msg[0]) toast(msg[0],msg[1]); }
HANDLERS.push(function(t){ var x=t.closest('[data-v74sim]'); if(!x) return false; var l=lineById(x.dataset.line); if(l) v74Sim(x.dataset.v74sim,l); return true; });

/* KYC documents that came from the website are on the opportunity already */
(function(){ var b0=FLOWS.kyc.body; FLOWS.kyc.body=function(){ var l=lineById(S.sel.line||''); if(l&&l.webKyc&&!S.sel.panimg&&!S.sel.read){ var a=acctOf(l); S.sel.panimg=kycDoc('pan',a); S.sel.panname='PAN_from_website.pdf'; S.sel.docimg=kycDoc('gst',a); S.sel.docname='GST_from_website.pdf'; } return b0(); }; })();
