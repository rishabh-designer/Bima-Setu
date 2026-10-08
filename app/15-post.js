/* ==================================================================== *
 *  Post-purchase — the ISS ticket on BimaOps (Customer Success, system-driven),
 *  the RM's part around it, the RM Home and the head-of-RM view.
 *  Source: claude/post-purchase-ticket.md + claude/rm-workflow.md v3.1
 * ==================================================================== */

/* ---------- masters ---------- */
/* [stated 24 Sep · TBD-62] the RHL is required on liability products only. HDFC Ergo and
   Future Generali generate it; every other insurer sends it by email.
   [stated 24 Sep · TBD-63] the proposal form is mandatory on liability products only,
   whatever the insurer. Digitised or offline per insurer is still a stand-in [open].
   The liability product list itself is the stand-in — the product groups are still coming. */
var PF_OFFLINE={'Oriental Insurance':1,'United India':1};   /* [proposed] which insurers have no digital form */
var ISS_STAGE={new:'New / Unassigned',docs:'Document Collection',pf:'Proposal form Pending',await:'Awaiting Policy copy',closed:'Closed'};
var CS_NAME='Radha Iyer', GENERIC_FROM='service@bimakavach.example';
/* [stated 26 Sep · 10.12] a chase escalates on the clock only — there is no count trigger */
function rhlMode(l){ if(!isLiability(l.product)) return 'none'; return RHL_SYS[l.picked||l.ins]?'sys':'ins'; }
function pfMode(l){ if(!isLiability(l.product)) return 'none'; return PF_OFFLINE[l.picked||l.ins]?'off':'dig'; }
/* [stated 24 Sep · TBD-25/27] one mandate covers the whole account, not an account-and-insurer pair */
function mandateOnFile(acctId){ return (S.data.mandates||[]).filter(function(m){return m.acct===acctId&&m.status==='active'&&(!m.until||m.until>S.now);})[0]||null; }
function mdLive(m){ return !!m && m.status==='active' && (!m.until||m.until>S.now); }
/* [stated 26 Sep · 4.4 / 12.1] the account's RM if it has one; otherwise the fallback RM configured for the product */
function rmFor(a,product){ var o=a?userById(a.own):null; if(o&&(o.role==='rm'||o.role==='rmhead')) return o.id; return FALLBACK_RM[product]||'priya'; }
function polOfLine(l){ var a=acctOf(l); return a?a.pols.filter(function(p){return p.line===l.id;})[0]:null; }
function polCode(p){ return 'POL-'+p.split(' ')[0].toUpperCase().replace(/[^A-Z]/g,'').slice(0,3); }

/* ---------- the ticket: create, assign, move ---------- */
function issMail(l,th,from,to,subj,body){ l.iss.mail.push({th:th,at:S.now,from:from,to:to,subj:subj,body:body}); }
function issCreate(l){
  var a=acctOf(l), ins=l.picked||l.ins||'—', md=mandateOnFile(a.id);
  var rhl=rhlMode(l), pf=pfMode(l);
  l.iss={id:'ISS-'+String(S.data.seq.iss++).padStart(4,'0'),owner:'radha',createdAt:S.now,assignedAt:0,stage:'new',mail:[],
    rows:{rhl:{mode:rhl,st:rhl==='none'?'na':'wait',fu:0,at:0}, pf:{mode:pf,st:pf==='none'?'na':'wait',fu:0,recv:0,at:0}, md:{mode:md?'file':'dig',st:md?'na':'wait',fu:0,at:0,ref:md?md.id:''}, pol:{st:'na',fu:0,esc:0,copy:0,inv:0,at:0}}};
  l.iss.skip12 = rhl==='none' && pf==='none' && !!md;
  /* [stated 23 Sep] the type is decided once, at booking: first on the account is Fresh,
     every one after it Cross-sell, and a policy from a renewal line is Renewal */
  /* [stated 24 Sep · TBD-34] two numbers, never one. The BK internal policy number is generated
     here, the moment the policy record is written; the insurer's policy number is empty until the
     copy arrives and QC reads it off. Nothing on screen invents a provisional insurer number. */
  if(a && !polOfLine(l)) a.pols.push({id:polCode(l.product)+'-2026-'+l.id.slice(3),bkno:bkPolNo(),pno:'',ins:ins,p:l.product,si:(l.req||{}).si||'—',pr:premOf(l),start:S.now,exp:S.now+365*86400000,endo:0,issuing:1,line:l.id,ptype:polTypeFor(a,l),prev:l.renews||''});
  logAdd(l,'Post-purchase ticket '+l.iss.id+' created','System · BimaOps · Customer Success · '+(l.iss.skip12?'nothing to collect — straight to the policy copy':[rhl==='none'?'':'RHL',pf==='none'?'':'proposal form',md?'':'mandate'].filter(Boolean).join(', ')+' to collect')+(md?' · mandate on file ('+md.id+')':''),'sys',1);
}
function issAssign(l){
  var a=acctOf(l), r=l.iss.rows, rm=uname(l.owner), c=l.contact;
  l.iss.assignedAt=S.now; l.iss.owner='radha';
  logAdd(l,'Ticket assigned to '+CS_NAME,'System · every applicable track starts now','sys',1);
  if(r.rhl.mode==='sys'){ r.rhl.st='sent'; r.rhl.at=S.now; issMail(l,'client',GENERIC_FROM,c.e||c.n,'Your risk-held letter — '+a.n+' · '+l.product,'The insurer has held the risk from today. The letter is attached, and on Bimakendra. Your relationship manager is '+rm+'.'); logAdd(l,'RHL generated and sent to the client','System · three rails: email, Bimakendra, RM interface','post',1); }
  if(r.rhl.mode==='ins'){ r.rhl.st='pending'; r.rhl.at=S.now; issMail(l,'insurer','Customer Success',(l.picked||l.ins)+' · POC','RHL request — '+a.n+' · '+l.product,'Payment received on '+fmtD(l.paidAt||S.now)+'. Please issue the risk-held letter.'); logAdd(l,'RHL requested from '+(l.picked||l.ins),'System · target 2 working days · follow-ups day 3, 4, 5 · after that the desk handles it by hand','sys',1); }
  if(r.pf.mode==='dig'){ r.pf.st='pending'; r.pf.at=S.now; issMail(l,'client',GENERIC_FROM,c.e||c.n,'Proposal form to fill — '+a.n+' · '+l.product,'Please fill the proposal form on Bimakendra: bimakendra.in/forms/'+l.id.toLowerCase()+'. Your relationship manager is '+rm+'.'); logAdd(l,'Proposal form link shared with the client','System · three rails · Shared with client · Pending','post',1); }
  if(r.pf.mode==='off'){ r.pf.st='pending'; r.pf.at=S.now; issMail(l,'client',GENERIC_FROM,c.e||c.n,'Proposal form to fill and sign — '+a.n+' · '+l.product,(l.picked||l.ins)+' does not have a digital form for this product. The PDF is attached; please fill and sign it and send it to '+rm+', your relationship manager.'); logAdd(l,'Offline proposal form PDF sent to the client','System · three rails · the filled copy comes back to the RM','post',1); }
  if(r.md.mode==='dig'){ r.md.st='pending'; r.md.at=S.now; issMail(l,'client',GENERIC_FROM,c.e||c.n,'Mandate letter to sign — '+a.n,'Please sign the mandate letter on Bimakendra: bimakendra.in/sign/'+l.id.toLowerCase()+'. Your relationship manager is '+rm+'.'); logAdd(l,'Mandate letter link shared with the client','System · three rails · Shared with client · Pending','post',1); }
  if(l.iss.skip12){ issRequestPolicy(l); return; }
  l.iss.stage = r.rhl.mode==='none' ? 'pf' : 'docs';
  moveStage(l,12,'Ticket assigned · tracks started');
}
function issAllDocsIn(l){ var r=l.iss.rows; return (r.rhl.st==='na'||r.rhl.st==='sent') && (r.pf.st==='na'||r.pf.st==='done') && (r.md.st==='na'||r.md.st==='done'); }
function issCheckDocs(l){ if(l.stage===12 && l.iss.stage!=='await' && issAllDocsIn(l)) issRequestPolicy(l); }
function issRequestPolicy(l){
  var a=acctOf(l), r=l.iss.rows; r.pol.st='pending'; r.pol.at=S.now; l.iss.stage='await';
  issMail(l,'insurer','Customer Success',(l.picked||l.ins)+' · POC','Policy copy and tax invoice — '+a.n+' · '+l.product,'All documents are in'+(r.pf.st==='done'?' (proposal form attached)':'')+(r.md.st==='done'?' (mandate attached)':'')+'. Please issue the policy copy and tax invoice.');
  logAdd(l,'Policy copy and tax invoice requested from '+(l.picked||l.ins),'System · automatic once every requirement is complete · 3 follow-ups, then 3 escalations','sys',1);
  moveStage(l,13,'Every requirement complete · policy copy requested');
}
function issPolicyArrived(l,how,only){ var r=l.iss.rows, p=polOfLine(l); r.pol.copy=1; r.pol.inv=only?0:1; r.pol.st='qc';
  /* the desk captures these off the copy; the RM compares them with the confirmed quote */
  r.pol.cap={pno:p?insPolNo(p):'',period:fmtD(S.now)+' – '+fmtD(S.now+365*86400000-86400000),si:(l.req||{}).si||'—',pr:premOf(l),ins:l.picked||l.ins};
  logAdd(l,only?'Policy copy received · tax invoice awaited':'Policy copy and tax invoice received','System · '+(how==='bot'?'extracted from the insurer’s reply by the email bot':'uploaded by the desk')+' · waiting for the RM’s check','sys',1); }
FLOWS.qcApprove={t:'Check the policy copy', sub:'Before it goes to the client. Compare what the desk read off the copy with what the client confirmed.', wide:true,
  body:function(){ var l=FL(), c=l.iss.rows.pol.cap||{}, inv=l.iss.rows.pol.inv, ok=function(a,b){ return String(a)===String(b)?chip('Matches','green',false,true):chip('Check','amber',false,true); };
    return '<div class="flex" style="gap:8px">'+docBtns('Policy copy',{line:l.id})+(inv?docBtns('Tax invoice',{line:l.id}):chip('Tax invoice · awaited','amber',false,true))+'</div>'+
      '<div class="tw mt12"><table class="t"><thead><tr><th></th><th>Confirmed quote</th><th>Read off the copy</th><th></th></tr></thead><tbody>'+
      '<tr><td>Insurer</td><td>'+esc(l.picked||l.ins)+'</td><td>'+esc(c.ins||'—')+'</td><td>'+ok(l.picked||l.ins,c.ins)+'</td></tr>'+
      '<tr><td>Premium</td><td>'+INR(premOf(l))+'</td><td>'+INR(c.pr||0)+'</td><td>'+ok(premOf(l),c.pr)+'</td></tr>'+
      '<tr><td>Sum insured</td><td>'+esc((l.req||{}).si||'—')+'</td><td>'+esc(c.si||'—')+'</td><td>'+ok((l.req||{}).si||'—',c.si)+'</td></tr>'+
      '<tr><td>Insurer policy number</td><td class="meta">—</td><td class="mono">'+esc(c.pno||'—')+'</td><td></td></tr>'+
      '<tr><td>Policy period</td><td class="meta">—</td><td>'+esc(c.period||'—')+'</td><td></td></tr></tbody></table></div>'+
      (inv?note('blue','','Approving sends the policy copy and the tax invoice to '+esc(l.contact.n||'the client')+' on the three rails and issues the line.','info'):note('amber','The tax invoice has not arrived','You can check the copy now; it goes out once the invoice is in.','alert')); },
  can:function(){ return !!FL().iss.rows.pol.inv; }, ok:'Approve and send',
  run:function(){ var l=FL(); var ok=write(function(){ logAdd(l,'Policy copy checked and approved',uname(S.user)+' · matches the confirmed quote','post'); issSend(l); },'the approval'); if(!ok) return 'fail'; toast('Issued','Policy copy and tax invoice sent to the client. Your policy explanation call is set.'); }};
function issSend(l){
  var a=acctOf(l), r=l.iss.rows, p=polOfLine(l), c=l.contact;
  r.pol.st='sent'; r.pol.at=S.now; l.iss.stage='closed';
  /* [stated 24 Sep · TBD-34] QC reads the insurer's policy number off the copy and writes it here.
     Until this moment the policy carried only the BK internal number. */
  if(p){ p.issuing=0; p.pno=insPolNo(p); p.period=fmtD(S.now)+' – '+fmtD(S.now+365*86400000-86400000); p.start=S.now; p.exp=S.now+365*86400000-86400000; p.issuedAt=S.now; }
  issMail(l,'client',GENERIC_FROM,c.e||c.n,'Your policy — '+a.n+' · '+l.product,'Policy '+(p?p.pno:'')+' and the tax invoice are attached, and on Bimakendra. '+uname(l.owner)+', your relationship manager, will walk you through the cover.');
  logAdd(l,'Policy copy and tax invoice sent to the client','System · QC passed · three rails · insurer policy number read from the copy'+(p?' · '+p.pno+' · BK '+(p.bkno||'—'):''),'post',1);
  moveStage(l,14,'Policy copy sent to the client');
}
/* [stated 26 Sep · 10.1] nothing after payment withdraws, and the line never goes back from 13 to 12 */
/* ---------- derived: who must act, rows text, ticket object ---------- */
function issWaiting(l){
  if(dead(l)||l.stage===14) return '—';
  if(l.stage===11||!l.iss) return 'Post-purchase';
  var r=l.iss.rows;
  if(l.stage===12){ if(r.pf.mode==='off'&&r.pf.st==='pending'&&r.pf.recv) return 'Us'; if(r.pf.st==='pending'||r.md.st==='pending') return 'Client'; if(r.rhl.st==='pending') return 'Insurer'; return 'Post-purchase'; }
  if(l.stage===13) return r.pol.st==='qc'?'Us':'Insurer';
  return 'Post-purchase';
}
function rowTx(k,r){
  if(k==='rhl'){ return r.st==='na'?'':(r.st==='wait'?'RHL starts at assignment':(r.st==='sent'?'RHL sent to client':'RHL pending on the insurer'+(r.fu?' · '+r.fu+' follow-ups':''))); }
  if(k==='pf'){ return r.st==='na'?'':(r.st==='wait'?'proposal form starts at assignment':(r.st==='done'?'proposal form completed':(r.recv?'filled form with the RM — upload it':'proposal form pending'+(r.fu?' · '+r.fu+' follow-ups':'')))); }
  if(k==='md'){ return r.st==='na'?(r.mode==='file'?'mandate on file':''):(r.st==='wait'?'mandate starts at assignment':(r.st==='done'?'mandate signed':'mandate pending'+(r.fu?' · '+r.fu+' follow-ups':''))); }
  if(k==='pol'){ return r.st==='na'?'':(r.st==='pending'?'policy copy pending on the insurer'+(r.fu||r.esc?' · '+r.fu+' follow-ups, '+r.esc+' escalations':''):(r.st==='qc'?'policy copy in QC':'policy copy sent')); }
  return '';
}
function postRowsTx(l){ if(!l.iss) return ''; var r=l.iss.rows; return ['rhl','pf','md','pol'].map(function(k){return rowTx(k,r[k]);}).filter(Boolean).join(' · ')||ISS_STAGE[l.iss.stage]; }
function issTicket(l){
  var i=l.iss, w=issWaiting(l), tone=i.stage==='closed'?'green':(i.stage==='withdrawn'?'red':(w==='Us'?'amber':'violet'));
  return {id:i.id, ty:'Post-purchase', label:'Issuance', desk:'BimaOps · Customer Success', line:l, st:ISS_STAGE[i.stage], tone:tone, raised:i.createdAt, who:'System',
    pend: w==='Us'?'The client sent the filled proposal form. Upload it to the ticket.':(w==='Client'?'Proposal form or mandate still with the client — the RM chases.':''), act: w==='Us'?'uploadPf':'', actLbl:'Upload proposal form'};
}
function openRuleTask(l,rule){ return tasksOfLine(l.id).filter(function(t){return !t.done&&t.rule===rule;})[0]||null; }
function postNextAction(l){
  var i=l.iss, r=i?i.rows:null, w=issWaiting(l), welcome=openRuleTask(l,'TR-08');
  if(isChola(l)) return cholaPostNext(l);
  if(l.stage===11) return welcome
    ? {tone:'amber',lab:'Next action',txt:'Paid. Handed over from '+uname(l.soldBy||'sales'),why:'The proposal form and mandate links go out from a generic BimaKavach address the moment Customer Success assigns '+(i?i.id:'the ticket')+' — often before you have called. The email names you.',acts:[['welcome','Welcome call']]}
    : {tone:'violet',lab:'Waiting on post-purchase',txt:(i?i.id:'The ticket')+' created · Customer Success has not assigned it yet',why:'Nothing is needed from you until the document tracks start.',acts:[]};
  if(l.stage===12){
    if(w==='Us') return {tone:'amber',lab:'Next action',txt:'The client sent the filled proposal form. Upload it to the ticket',why:'Only you can — the client sends it to you, not to the desk. If it was the last document outstanding the line moves on by itself.',acts:[['uploadPf','Upload proposal form'],['chase2','Log chase']]};
    if(w==='Client'){ var pend=[r.pf.st==='pending'?'proposal form':'',r.md.st==='pending'?'mandate':''].filter(Boolean).join(' and '); return {tone:'blue',lab:'Waiting on the client',txt:pend.charAt(0).toUpperCase()+pend.slice(1)+' shared · not yet '+(r.pf.st==='pending'?'filled':'signed')+(r.rhl.st==='pending'?' · RHL still with the insurer':''),why:'One chase for both — two rows on the ticket, one ask of the client. Customer Success reminders land on your task, not in a second queue.'+(welcome?' The welcome call is still open.':''),acts:[['chase2','Log chase']].concat(welcome?[['welcome','Log welcome call']]:[['reshare','Re-share a link']])}; }
    if(w==='Insurer') return {tone:'violet',lab:'Waiting on the insurer',txt:'RHL requested by Customer Success'+(r.rhl.fu?' · '+r.rhl.fu+' follow-ups sent':''),why:'Nothing is needed from you. The desk chases the insurer; the forms are done.',acts:[]};
    return {tone:'violet',lab:'Waiting on post-purchase',txt:'Documents in · the desk is moving it on',why:'',acts:[]};
  }
  if(l.stage===13) return r.pol.st==='qc'
    ? {tone:'amber',lab:'Next action',txt:'Policy copy received — check it before it goes to the client',why:r.pol.inv?'Compare it with the confirmed quote, then approve. It goes out on the three rails.':'Tax invoice · awaited. You can check the copy now; it goes out once the invoice is in.',acts:[['qcApprove','Check and approve']]}
    : {tone:'violet',lab:'Waiting on the insurer',txt:'Copy requested from '+(l.picked||l.ins)+' '+plural(daysBetween(r.pol.at||l.enteredAt,S.now),'day')+' ago'+(r.pol.fu||r.pol.esc?' · '+r.pol.fu+' follow-ups, '+r.pol.esc+' escalations':''),why:'Three follow-ups, then three escalations. When all six are exhausted, Ops contacts the insurer outside the ticket. Watch only.',acts:[['go:ticket:'+i.id,'Open ticket']]};
  if(l.stage===14){ var ex=openRuleTask(l,'TR-10'); return ex
    ? {tone:'green',lab:'Issued — one call left',txt:'Policy copy and tax invoice sent to the client. Walk them through the cover',why:'The client already has the documents on the three rails. The policy explanation call is yours.',acts:[['explain','Log policy explanation call']]}
    : {tone:'green',lab:'Issued',txt:'Steady state',why:'Endorsements and claims from the account’s Policies tab; renewal as a new opportunity linked to this policy.',acts:[]}; }
  return {tone:'neutral',lab:'',txt:'',why:'',acts:[]};
}

/* ---------- simulated events on a post-purchase line (amber dashed) ---------- */
function postSims(l){
  var b=[], i=l.iss; if(!i) return b; var r=i.rows, at=function(lab,k){ b.push(simbtn(lab,'data-psim="'+k+'" data-line="'+l.id+'"')); };
  if(l.stage===11&&i.stage==='new') at('Customer Success assigns the ticket — tracks start','assign');
  if(l.stage===12){ if(r.rhl.st==='pending'){ at('Insurer sends the RHL (email bot)','rhl'); at('Desk follow-up to the insurer','csfu'); } if(r.pf.st==='pending'&&r.pf.mode==='dig') at('Client fills the proposal form on Bimakendra','pf'); if(r.pf.st==='pending'&&r.pf.mode==='off'&&!r.pf.recv) at('Client sends the filled offline form to you','pfrecv'); if(r.md.st==='pending') at('Client signs the mandate on Bimakendra','md'); }
  /* [stated 26 Sep · 10.7] the copy and the invoice can arrive separately; the RM checks the copy before it goes out */
  if(l.stage===13){ if(!r.pol.copy){ at('Insurer sends the policy copy and tax invoice (bot)','pol'); at('Insurer sends the policy copy only','polonly'); at('Desk follow-up or escalation to the insurer','polfu'); } else if(!r.pol.inv) at('Insurer sends the tax invoice','inv'); }
  return b;
}
function postSim(k,l){
  var msg='';
  var ok=write(function(){ var r=l.iss.rows, a=acctOf(l);
    if(k==='assign'){ issAssign(l); msg=l.iss.skip12?'Nothing to collect — policy copy requested, line at Awaiting Policy Copy':'Tracks started · line at Policy Documents Pending · waiting on '+issWaiting(l); }
    if(k==='rhl'){ r.rhl.st='sent'; r.rhl.at=S.now; issMail(l,'insurer',(l.picked||l.ins)+' · POC','Customer Success','RE: RHL request — '+a.n,'Risk-held letter attached.'); issMail(l,'client',GENERIC_FROM,l.contact.e||l.contact.n,'Your risk-held letter — '+a.n+' · '+l.product,'The insurer has held the risk. The letter is attached, and on Bimakendra.'); logAdd(l,'RHL received from the insurer and sent to the client','System · email bot parsed and attached it · three rails','post',1); issCheckDocs(l); msg='RHL in and forwarded to the client'; }
    if(k==='csfu'){ r.rhl.fu++; issMail(l,'insurer','Customer Success',(l.picked||l.ins)+' · POC','Reminder '+r.rhl.fu+': RHL — '+a.n,'Following up on the risk-held letter.'); logAdd(l,'Desk follow-up '+r.rhl.fu+' to the insurer on the RHL','System · Customer Success','sys',1); msg=r.rhl.fu>3?'Follow-up '+r.rhl.fu+' — past the ladder, the desk now handles it by hand':'Follow-up '+r.rhl.fu+' sent — chased with the insurer only'; }
    if(k==='pf'){ r.pf.st='done'; r.pf.at=S.now; logAdd(l,'Proposal form filled by the client on Bimakendra','System · row Completed · form can be previewed and downloaded','post',1); issCheckDocs(l); msg='Proposal form completed'; }
    if(k==='pfrecv'){ r.pf.recv=1; logAdd(l,'Client sent the filled offline proposal form to '+uname(l.owner),'System · waiting on the RM to upload it','post',1); msg='The filled form is with you — upload it'; }
    /* [stated 24 Sep · TBD-25/26/27] one mandate per account, signed at account level, valid a year */
    if(k==='md'){ r.md.st='done'; r.md.at=S.now; var m={id:'MD-'+String(S.data.seq.md++).padStart(3,'0'),acct:a.id,scope:'Account',signedAt:S.now,by:l.contact.n,until:S.now+MD_YEAR,status:'active',doc:'Mandate_'+shortName(a.n).replace(/\s+/g,'')+'.pdf'}; S.data.mandates.push(m); r.md.ref=m.id; logAdd(l,'Mandate signed by the client on Bimakendra','System · row Completed · mandate register written '+m.id+' · account level · valid until '+fmtD(m.until),'post',1); issCheckDocs(l); msg='Mandate signed · register entry '+m.id+' · valid one year'; }
    if(k==='pol'){ issPolicyArrived(l,'bot'); msg='Policy copy and tax invoice in · QC before they go out'; }
    if(k==='polfu'){ if(r.pol.fu<3) r.pol.fu++; else r.pol.esc=Math.min(3,r.pol.esc+1); issMail(l,'insurer','Customer Success',(l.picked||l.ins)+' · POC',(r.pol.esc?'Escalation '+r.pol.esc:'Reminder '+r.pol.fu)+': policy copy — '+a.n,'Following up on the policy copy and tax invoice.'); logAdd(l,(r.pol.esc?'Escalation '+r.pol.esc:'Follow-up '+r.pol.fu)+' to the insurer on the policy copy','System · Customer Success','sys',1); msg=r.pol.fu===3&&r.pol.esc===3?'All six exhausted — Ops contacts the insurer outside the ticket':'Chased with the insurer'; }
    if(k==='polonly'){ issPolicyArrived(l,'bot',true); msg='Policy copy in · tax invoice still awaited'; }
    if(k==='inv'){ r.pol.inv=1; logAdd(l,'Tax invoice received','System · email bot · from '+(l.picked||l.ins),'sys',1); msg='Tax invoice in · the copy is ready for your check'; }
  },'the simulated event');
  if(!ok) return; paint(); toast('Post-purchase update',msg);
}
HANDLERS.push(function(t){ var x=t.closest('[data-psim]'); if(!x) return false; var l=lineById(x.dataset.line); if(l) postSim(x.dataset.psim,l); return true; });
/* [stated 24 Sep] every document is viewable and downloadable — the handler is in 22-docs.js */

/* ---------- the RM's actions ---------- */
function completeRuleTasks(l,rule){ tasksOfLine(l.id).forEach(function(t){ if(!t.done&&t.rule===rule){ t.done=1; t.doneAt=S.now; t.doneBy=S.user; } }); }
FLOWS.welcome={t:'Welcome call', sub:'You are the client’s single point of contact from here. The links are already out from a generic BimaKavach address — this call makes the name on that email a person.',
  body:function(){ var l=FL(), r=l.iss?l.iss.rows:null;
    return ctcStrip(S.sel.ctc)+[['ok','Reached — introduced myself, explained what is arriving','Links on Bimakendra for the form and mandate'+(r&&r.rhl.mode!=='none'?', the RHL':'')+', then the policy copy and tax invoice'],['date','Reached — will complete by a date','The follow-up moves to that date'],['sig','Reached — authorised signatory named','Who signs, and whether they can get into Bimakendra'],['off','Reached — offline form explained','They will send the filled proposal form to you'],['acc','Reached — cannot get into Bimakendra','Access has to be provisioned. Urgent, the links are out'],['ring','Ringing, no answer','No connect — try again'],['busy','Busy, call cut','No connect — try again'],['swoff','Switched off or unreachable','No connect — try again']].filter(function(x){ var cc=S.sel.ctc; if(!cc) return true; var nc=x[0]==='ring'||x[0]==='busy'||x[0]==='swoff'; return cc.con?!nc:nc; }).map(function(x){ return opt('data-pick="'+x[0]+'"',S.sel.d===x[0],x[1],x[2]); }).join('')+
      (S.sel.d==='sig'?'<div class="fgrid">'+field('Signatory name',input('sig',S.sel.sig,'Sunita Rane'))+field('Designation',input('sigd',S.sel.sigd,'Director'))+'</div>':'')+
      (S.sel.d==='date'?field('Will complete by','<input class="inp" id="f_dt" data-f="dt" type="date" min="'+ymd(S.now)+'" value="'+esc(S.sel.dt||'')+'">'):'')+field('Note — optional',input('x',S.sel.x,'Anything the desk should know')); },
  can:function(){ var d=S.sel.d; return !!d && (d!=='sig'||(!!(S.sel.sig||'').trim()&&!!(S.sel.sigd||'').trim())) && (d!=='date'||(!!S.sel.dt&&S.sel.dt>=ymd(S.now))); }, ok:'Log the call',
  run:function(){ var l=FL(), d=S.sel.d; var ok=write(function(){ var nc=d==='ring'||d==='busy'||d==='swoff', tx={ok:'reached · introduced',date:'reached · will complete by '+(S.sel.dt?fmtD(new Date(S.sel.dt+'T11:00:00').getTime()):''),sig:'reached · signatory '+(S.sel.sig||'')+', '+(S.sel.sigd||''),off:'reached · offline form explained',acc:'reached · cannot access Bimakendra',ring:'ringing, no answer',busy:'busy, call cut',swoff:'switched off or unreachable'}[d]; logAdd(l,'Welcome call · '+tx,uname(S.user)+(S.sel.ctc?ctcMeta(S.sel.ctc):' · manual')+(S.sel.x?' · '+S.sel.x:''),'call'); if(!nc) completeRuleTasks(l,'TR-08'); if(d==='sig'&&l.iss) l.iss.signatory=S.sel.sig.trim()+', '+S.sel.sigd.trim(); if(d==='date'){ var t9=openRuleTask(l,'TR-09'); if(t9) t9.dueAt=new Date(S.sel.dt+'T11:00:00').getTime(); } if(d==='acc'&&l.iss){ l.iss.access=1; issMail(l,'rm',uname(S.user),'Customer Success','Bimakendra access — '+acctName(l),'Client cannot get in. Please provision access today; the links are already out.'); } },'the welcome call'); if(!ok) return 'fail'; toast('Welcome call logged',(d==='ring'||d==='busy'||d==='swoff')?'The task stays open.':(d==='acc'?'Access request sent to the desk on the ticket. Urgent.':'The welcome-call task is complete. Stage unchanged — the ticket moves the line.')); }};

var CHASE_OUT=[['date','Client will complete by a date','Follow-up moves to that date'],['q','Client has a question','Answered, or relayed to the desk on the ticket'],['sig','Signatory unavailable','Follow-up date, signatory noted'],['acc','Can’t access Bimakendra','Access provisioned — urgent'],['recv','Offline form received','You upload it next'],['no','No response','The chase task stays open — its clock escalates it, not a count']];
FLOWS.chase2={t:'Chase the proposal form and mandate', sub:'One chase for both. They are two rows on the ticket but one ask of the client.',
  body:function(){ var l=FL(), r=l.iss.rows, pend=[r.pf.st==='pending'?'proposal form ('+(r.pf.mode==='off'?'offline PDF':'Bimakendra link')+')':'',r.md.st==='pending'?'mandate (Bimakendra link)':''].filter(Boolean);
    return note('blue','Still pending',pend.join(' · ')+' · shared '+esc(fmt(r.pf.at||r.md.at))+(r.pf.fu||r.md.fu?' · '+Math.max(r.pf.fu,r.md.fu)+' chases so far':''),'info')+
      field('Channel',select('ch',S.sel.ch||'Call',['Call','WhatsApp','Email']))+
      CHASE_OUT.filter(function(x){ return !(x[0]==='recv'&&r.pf.mode!=='off'); }).map(function(x){ return opt('data-pick="'+x[0]+'"',S.sel.d===x[0],x[1],x[2]); }).join('')+
      (S.sel.d==='date'||S.sel.d==='sig'?field('Follow up on','<input class="inp" id="f_dt" data-f="dt" type="date" min="'+ymd(S.now)+'" value="'+esc(S.sel.dt||'')+'">','',S.sel.dt&&S.sel.dt<ymd(S.now)?'Cannot be in the past.':''):'')+
      (S.sel.d==='q'?field('The question',input('x',S.sel.x,'What the client asked')):'')+
      (S.sel.d==='sig'?field('Signatory',input('sig',S.sel.sig,'Who has to sign, and when they are back')):''); },
  can:function(){ var d=S.sel.d; if(!d) return false; if((d==='date'||d==='sig')&&!(S.sel.dt&&S.sel.dt>=ymd(S.now))) return false; if(d==='q'&&!(S.sel.x||'').trim()) return false; return true; }, ok:'Log the chase',
  run:function(){ var l=FL(), d=S.sel.d, r=l.iss.rows, ch=S.sel.ch||'Call'; var ok=write(function(){
      if(r.pf.st==='pending') r.pf.fu++; if(r.md.st==='pending') r.md.fu++;
      var lab=CHASE_OUT.filter(function(x){return x[0]===d;})[0][1];
      logAdd(l,'Chase · '+lab,uname(S.user)+' · '+ch+(S.sel.x?' · '+S.sel.x:'')+(S.sel.sig?' · '+S.sel.sig:''),ch==='Email'?'email':(ch==='WhatsApp'?'whatsapp':'call'));
      if(d==='date'||d==='sig'){ var due=new Date(S.sel.dt+'T11:00:00').getTime(), t=openRuleTask(l,'TR-09'); if(t){ t.dueAt=due; } else S.data.tasks.push({id:'T-'+(S.data.seq.task++),line:l.id,acct:null,owner:S.user,title:'Chase the proposal form and mandate',cls:'Follow-up',createdAt:S.now,dueAt:due,escAt:0,done:0,doneAt:0,doneBy:'',rule:'TR-09'}); if(d==='sig') l.iss.signatory=(S.sel.sig||'').trim(); }
      if(d==='q'){ issMail(l,'rm',uname(S.user),'Customer Success','Client question — '+acctName(l)+' · '+l.product,S.sel.x.trim()); }
      if(d==='acc'){ l.iss.access=1; issMail(l,'rm',uname(S.user),'Customer Success','Bimakendra access — '+acctName(l),'Client cannot get in. Please provision access today; the links are already out.'); }
      if(d==='recv'){ r.pf.recv=1; }
      if(d==='no'){ l.iss.noresp=(l.iss.noresp||0)+1; }
    },'the chase'); if(!ok) return 'fail';
    /* [stated 24 Sep · TBD-23] three missed follow-ups, then it escalates to the RM's manager */
    toast('Chase logged',d==='date'||d==='sig'?'Follow-up set for '+fmtD(new Date(S.sel.dt+'T11:00:00').getTime())+'. Stage unchanged.':(d==='q'?'Relayed to the desk on the ticket’s RM thread.':(d==='recv'?'Upload the form next — it is the one thing only you can do.':(d==='no'?'No response. The chase task stays open; if it runs past its time it escalates to your manager.':'Stage unchanged — the ticket moves the line.')))); }};

FLOWS.uploadPf={t:'Upload the filled proposal form', sub:'The client filled the insurer’s PDF and sent it to you. Uploading it completes the row — if it was the last document outstanding, the line moves on by itself.',
  body:function(){ var l=FL(); return field('File','<div class="chip neutral" style="width:100%;justify-content:flex-start">'+ic('file','ic14')+'ProposalForm_'+esc(shortName(acctName(l)).replace(/\s+/g,''))+'_'+esc(l.product.split(' ')[0])+'_signed.pdf · 1.4 MB</div>')+
    (S.sel.inc?note('red','Incomplete','The form is not fully filled — page 3 has no signatory. Back to the client before uploading; once uploaded the row is Completed.','alert'):'')+
    note('blue','','Check it first: signatory, date, every section. Once uploaded, Customer Success takes it to the insurer with the policy request.')+
    simblock('Simulate','','<button class="simbtn" data-mset="inc" data-mval="1">Pretend it is incomplete</button><button class="simbtn" data-mset="inc" data-mval="">It is complete</button>'); },
  can:function(){ return !S.sel.inc; }, ok:'Upload to the ticket',
  run:function(){ var l=FL(); var ok=write(function(){ var r=l.iss.rows; r.pf.st='done'; r.pf.recv=0; r.pf.at=S.now; logAdd(l,'Filled proposal form uploaded to the ticket',uname(S.user)+' · row Completed','post'); completeRuleTasks(l,'TR-09'); issCheckDocs(l); },'the upload'); if(!ok) return 'fail'; toast('Proposal form uploaded',l.stage===13?'That was the last document — policy copy requested, line at Awaiting Policy Copy.':'Row Completed. '+(l.iss.rows.md.st==='pending'?'The mandate is still with the client.':(l.iss.rows.rhl.st==='pending'?'The RHL is still with the insurer.':''))); }};

FLOWS.reshare={t:'Ask the desk to resend', sub:'The client says it never arrived. The desk resends it from the generic address; your ask is on the RM ↔ desk thread.',
  body:function(){ var l=FL(), r=l.iss.rows, items=[]; if(r.pf.st==='pending') items.push(['pf',r.pf.mode==='off'?'Proposal form PDF':'Proposal form link']); if(r.md.st==='pending') items.push(['md','Mandate letter link']); if(r.rhl.st==='sent') items.push(['rhl','Risk-held letter']); if(r.pol.st==='sent') items.push(['pol','Policy copy and tax invoice']);
    return items.length?items.map(function(x){ return opt('data-pick="'+x[0]+'"',S.sel.d===x[0],x[1],''); }).join('')+field('Channel',select('ch',S.sel.ch||'Email',['Email','WhatsApp'])):note('neutral','','Nothing is pending with the client on this line.'); },
  can:function(){ return !!S.sel.d; }, ok:'Ask the desk',
  run:function(){ var l=FL(); var ok=write(function(){ var nm={pf:'proposal form',md:'mandate letter',rhl:'RHL',pol:'policy copy and tax invoice'}[S.sel.d]; issMail(l,'rm',uname(S.user),'Customer Success','Please resend: '+nm+' — '+acctName(l),'The client says it never arrived. Please resend by '+(S.sel.ch||'Email')+'.'); logAdd(l,'Asked the desk to resend the '+nm,uname(S.user)+' · on the RM ↔ desk thread','desk'); },'the ask'); if(!ok) return 'fail'; toast('Asked the desk to resend','On the RM ↔ desk thread.'); }};

FLOWS.explain={t:'Policy explanation call', sub:'The client has the policy copy and tax invoice. Walk them through the cover, exclusions and how to claim.',
  body:function(){ return [['ok','Done — cover explained','Steady state from here'],['later','Client asked for another time','Follow-up date'],['no','Not reached','The clock keeps running']].map(function(x){ return opt('data-pick="'+x[0]+'"',S.sel.d===x[0],x[1],x[2]); }).join('')+(S.sel.d==='later'?field('Call again on','<input class="inp" id="f_dt" data-f="dt" type="date" min="'+ymd(S.now)+'" value="'+esc(S.sel.dt||'')+'">'):'')+field('Note — optional',input('x',S.sel.x,'Questions the client raised')); },
  can:function(){ return !!S.sel.d && (S.sel.d!=='later'||!!S.sel.dt); }, ok:'Log the call',
  run:function(){ var l=FL(), d=S.sel.d; var ok=write(function(){ logAdd(l,'Policy explanation call · '+(d==='ok'?'done':(d==='later'?'rescheduled':'not reached')),uname(S.user)+(S.sel.x?' · '+S.sel.x:''),'call'); if(d==='ok') completeRuleTasks(l,'TR-10'); if(d==='later'){ var t=openRuleTask(l,'TR-10'); if(t) t.dueAt=new Date(S.sel.dt+'T11:00:00').getTime(); } },'the call'); if(!ok) return 'fail'; toast('Logged',d==='ok'?'The line is in its steady state. Endorsements and claims from the account; renewal as a new opportunity.':''); }};

/* ---------- the post-purchase tab on the line ---------- */
/* [stated 23 Sep] the handover packet is gone from the post-purchase tab — every field on it
   already reads off the line, the account or the ticket, so it was the same facts twice. */
function postRowsTable(l,can){
  var i=l.iss, r=i.rows, rows=[];
  var stChip=function(st,mode){ return st==='na'?chip(mode==='file'?'On file':'—','neutral',false,true):(st==='wait'?chip('Starts at assignment','neutral',false,true):(st==='pending'?chip(mode==='ins'?'Pending':'Shared with client','blue',true,true):(st==='sent'||st==='done'?chip(st==='sent'?'Sent to client':'Completed','green',true,true):(st==='qc'?chip('Received · in QC','violet',true,true):chip(st,'neutral',false,true))))); };
  var dc={line:l.id,acct:acctOf(l)?acctOf(l).id:''};
  if(r.rhl.st!=='na') rows.push(['Risk-held letter',r.rhl.mode==='sys'?'System-generated':'From '+esc(l.picked||l.ins)+' by email',stChip(r.rhl.st,r.rhl.mode),r.rhl.st==='pending'?'Pending on the insurer':'', r.rhl.fu, r.rhl.st==='sent'?docView1('Risk-held letter',dc):(r.rhl.st==='pending'?'<span class="meta" style="white-space:nowrap">chased by the desk</span>':'')]);
  if(r.pf.st!=='na') rows.push(['Proposal form',r.pf.mode==='dig'?'Digitised · Bimakendra':'Offline · insurer PDF',stChip(r.pf.st,r.pf.mode),r.pf.st==='pending'?(r.pf.recv?'<span class="amber">Filled copy with the RM</span>':'Pending'):(r.pf.st==='done'?'Completed':''), r.pf.fu, r.pf.st==='pending'?(r.pf.mode==='off'&&can?'<button class="btn sm'+(r.pf.recv?' primary':'')+'" data-flow="uploadPf" data-line="'+l.id+'">Upload</button> ':'')+docView1(r.pf.mode==='dig'?'Proposal form':'Proposal form PDF',dc):(r.pf.st==='done'?docView1('Filled proposal form',dc):'')]);
  if(r.md.mode!=='file') rows.push(['Mandate letter','Digitised · Bimakendra',stChip(r.md.st,r.md.mode),r.md.st==='pending'?'Pending':(r.md.st==='done'?'Completed':(r.md.mode==='file'?'Not asked again':'')), r.md.fu, (r.md.st==='done'||r.md.mode==='file')?docView1('Mandate letter',{line:dc.line,acct:dc.acct,ref:r.md.ref}):(r.md.st==='pending'?docView1('Mandate letter',dc):'')]);
  rows.push(['Policy copy and tax invoice',esc(l.picked||l.ins||'—'),r.pol.st==='na'?chip('After the documents','neutral',false,true):(r.pol.st==='pending'?chip('Pending on insurer','violet',true,true):(r.pol.st==='qc'?chip('Received · in QC','violet',true,true):chip('Sent to client','green',true,true))),r.pol.st==='pending'?'Requested from '+esc(l.picked||l.ins)+' · '+esc(fmtD(r.pol.at)):(r.pol.st==='qc'?(r.pol.inv?'Waiting for your check':'Copy in · tax invoice awaited'):''), r.pol.fu+(r.pol.esc?' + '+r.pol.esc+' esc.':''), r.pol.st==='sent'?docView1('Policy copy',dc,'Policy copy')+' '+docView1('Tax invoice',dc,'Tax invoice'):'']);
  var withWhom={'Risk-held letter':r.rhl.st==='pending'?'Insurer':'','Proposal form':r.pf.st==='pending'?(r.pf.recv?'You':'Client'):'','Mandate letter':r.md.st==='pending'?'Client':'','Policy copy and tax invoice':r.pol.st==='pending'?'Insurer':(r.pol.st==='qc'?'You':'')};
  var lastAt={'Risk-held letter':r.rhl.at,'Proposal form':r.pf.at,'Mandate letter':r.md.at,'Policy copy and tax invoice':r.pol.at};
  return '<div class="tw"><table class="t"><thead><tr><th>Requirement</th><th>Status</th><th>With</th><th>Last action</th></tr></thead><tbody>'+rows.map(function(x){ var k=String(x[0]); return '<tr><td class="nm" style="white-space:nowrap">'+x[0]+'<div class="sub" title="'+esc(String(x[1]).replace(/<[^>]+>/g,''))+'">'+x[1]+'</div></td><td>'+x[2]+'</td><td>'+(withWhom[k]?esc(withWhom[k]):'<span class="meta">—</span>')+'</td><td style="white-space:nowrap">'+(x[3]?x[3]+(lastAt[k]?' <span class="meta">· '+esc(fmtDs(lastAt[k]))+'</span>':''):(lastAt[k]?esc(fmtD(lastAt[k])):'<span class="meta">—</span>'))+'</td></tr>'; }).join('')+'</tbody></table></div>'+
    (r.md.mode==='file'?'<div class="meta mt8">No mandate row — one is on file for the account ('+esc(r.md.ref)+').</div>':'')+
    '';
}
function mailTrail(l){
  var i=l.iss, th=S.ui['mth_'+l.id]||'all', q=(S.ui['mq_'+l.id]||'').toLowerCase(), ms=i.mail.filter(function(m){return (th==='all'||m.th===th)&&(!q||(m.subj+' '+m.body+' '+m.from+' '+m.to).toLowerCase().indexOf(q)>=0);}).slice().sort(function(x,y){return y.at-x.at;});
  var cnt=function(k){ return i.mail.filter(function(m){return m.th===k;}).length; };
  return '<div class="flex wrap" style="gap:10px"><div class="h3">Mail trail</div><span class="sp"></span><input class="inp" style="max-width:200px" id="mq_'+l.id+'" data-ui="mq_'+l.id+'" placeholder="Search the mail" value="'+esc(S.ui['mq_'+l.id]||'')+'">'+pills('mth_'+l.id,th,[['all','All',i.mail.length],['client','Client',cnt('client')],['rm','RM ↔ desk',cnt('rm')],['insurer','Insurer',cnt('insurer')]])+(canAct(l)?'<button class="btn sm" data-flow="deskMail" data-line="'+l.id+'">Write to the desk</button>':'')+'</div>'+
    '<div class="meta mt8">Three conversations, one thread each. The client thread goes out from a generic BimaKavach address and names '+esc(uname(l.owner))+'; the desk writes to the RM and to the insurer as Customer Success.</div>'+
    (ms.length?'<div class="msgs mt12">'+ms.map(function(m){ var out=m.from===uname(S.user)||m.from===GENERIC_FROM||m.from==='Customer Success'; return '<div class="msg '+(m.th==='client'?'out':(m.from==='Customer Success'||m.from===GENERIC_FROM||m.from===uname(S.user)?'out':'in'))+'"><div class="w"><b>'+esc(m.from)+'</b> → '+esc(m.to)+' · '+chip(m.th==='client'?'Client':(m.th==='rm'?'RM':'Insurer'),'neutral',false,true)+' · '+esc(fmt(m.at))+'</div><b>'+esc(m.subj)+'</b><div class="mt8" style="font-size:var(--fs-base)">'+esc(m.body)+'</div></div>'; }).join('')+'</div>':'<div class="mt12">'+empty('mail','Nothing sent yet','Mail starts when the desk assigns the ticket and the tracks begin.')+'</div>');
}
/* [stated 24 Sep] the post-purchase line carries a Documents section of its own:
   proposal form, mandate letter, RHL, policy copy and tax invoice, each to view
   and download. The requirements table above is the chase; this is the shelf. */
function postDocs(l){
  var i=l.iss, r=i.rows, a=acctOf(l), dc={line:l.id,acct:a?a.id:''}, rows=[], md=r.md.ref?(S.data.mandates||[]).filter(function(m){return m.id===r.md.ref;})[0]:null;
  var pol=(a&&a.pols||[]).filter(function(p){return p.line===l.id;})[0], NR='Not required for this product';
  /* [stated 26 Sep · 10.13] always five documents; one that does not apply says so */
  rows.push(['Proposal form', r.pf.st==='done', r.pf.st==='na'?NR:(r.pf.recv?'With the RM — the client sent the filled form; upload it':(r.pf.mode==='dig'?'With the client on Bimakendra':'With the client — the insurer’s PDF, to be filled and signed')),
    r.pf.st==='done'?(r.pf.mode==='dig'?'Filled on Bimakendra · '+fmtD(r.pf.at):'Filled offline, uploaded by the RM · '+fmtD(r.pf.at)):'', dc, r.pf.st==='na']);
  rows.push(['Mandate letter', r.md.st==='done'||r.md.mode==='file', 'With the client on Bimakendra',
    r.md.mode==='file'?'Mandate on file — signed '+(md?fmtD(md.signedAt)+(md.by?' by '+md.by:''):'earlier')+' · '+esc(r.md.ref):(r.md.st==='done'?'Signed '+fmtD(r.md.at)+(md&&md.by?' by '+md.by:'')+' · register entry '+esc(r.md.ref):''),
    {line:dc.line,acct:dc.acct,ref:r.md.ref}, false]);
  rows.push(['Risk-held letter', r.rhl.st==='sent', r.rhl.st==='na'?NR:'With '+((l.picked||l.ins)||'the insurer')+' — the desk is chasing it',
    r.rhl.st==='sent'?(r.rhl.mode==='sys'?'System-generated · '+fmtD(r.rhl.at):'From '+esc(l.picked||l.ins)+' by email · '+fmtD(r.rhl.at)):'', dc, r.rhl.st==='na']);
  rows.push(['Policy copy', r.pol.st==='sent', r.pol.st==='qc'?'Received — waiting for the RM’s check':'With the insurer — the desk is chasing it',
    r.pol.st==='sent'?'Sent to the client'+(pol&&pol.pno?' · '+esc(pol.pno):''):'', pol?{line:dc.line,acct:dc.acct,pol:pol.id}:dc, false]);
  rows.push(['Tax invoice', r.pol.st==='sent', r.pol.copy&&!r.pol.inv?'Awaited from the insurer':'With the insurer', r.pol.st==='sent'?'Sent to the client with the copy':'', pol?{line:dc.line,acct:dc.acct,pol:pol.id}:dc, false]);
  var need=rows.filter(function(x){return !x[5];}), held=need.filter(function(x){return x[1];}).length;
  return '<div class="phhd"><div class="t">Documents</div><div class="a">'+held+' of '+need.length+' on file</div></div>'+
    '<div class="rowlist doclist mt12">'+rows.map(function(x){ return x[5]?'<div class="row dim"><div class="bd"><b>'+esc(x[0])+'</b><div class="m">'+NR+'</div></div></div>':docRow(x[0],x[1],x[2],x[4],x[3]?esc(x[3]):''); }).join('')+'</div>'+
    '<div class="meta mt8">PAN, GST and mandates are under <button class="link" data-uiset="atab_'+dc.acct+'" data-uv="comp" data-go="acct" data-id="'+dc.acct+'">Compliance</button>.</div>';
}
function postTab(l){
  var can=canAct(l), i=l.iss;
  return '<div class="phhd"><div class="t">Post-purchase</div><div class="a">'+esc(i.id)+' · '+esc(ISS_STAGE[i.stage])+' · desk owner '+esc(CS_NAME)+' · '+(i.assignedAt?'assigned '+esc(fmt(i.assignedAt)):'created '+esc(fmt(i.createdAt))+', not assigned yet')+'</div></div>'+
    '<div class="mt12">'+postRowsTable(l,can)+'</div>'+
    (i.signatory?'<div class="meta mt8">Authorised signatory: <b>'+esc(i.signatory)+'</b></div>':'')+(i.access?'<div class="mt8">'+note('red','Bimakendra access','The client cannot get in. Access provisioning has been asked of the desk — urgent, the links are out.','alert')+'</div>':'')+
    diamonds(true)+postDocs(l)+
    '';
}
/* [stated 23 Sep] the ticket's record actions live on the line's Manage tab, beside the line's own */
function manageTicketBlock(l){
  return '<div class="h3">Manage ticket</div><div class="meta">'+esc(l.iss.id)+' · '+esc(ISS_STAGE[l.iss.stage])+' — the desk works these, not you.</div><div class="rowlist mt8" style="border:1px solid var(--border);border-radius:12px">'+
    '<div><div class="bd"><b>Reminders and escalations</b><div class="m">By section: forms with the RM, RHL with the insurer, policy copy with the insurer. Each has its own reminder.</div></div><div class="rt">'+chip('Customer Success','neutral',false,true)+'</div></div>'+
    '<div><div class="bd"><b>Reassign ticket</b><div class="m">The desk’s record action, not yours. Nothing after payment withdraws — a policy is never deleted.</div></div><div class="rt">'+chip('Customer Success','neutral',false,true)+'</div></div>'+
    '<div><div class="bd"><b>Manual review queue</b><div class="m">An insurer reply the bot tied to this ticket but would not attach on its own — a policy-number mismatch, say — waits there to be attached by hand.</div></div><div class="rt">'+chip('Desk','neutral',false,true)+'</div></div></div>';
}

/* ---------- the ISS ticket screen (Tickets → ticket flow) ---------- */
function issTicketScreen(t){
  var l=t.line, a=acctOf(l), i=l.iss, u=me(), can=canAct(l), na=postNextAction(l), w=issWaiting(l);
  var steps=[['new','Created at Payment Completed',i.createdAt],['assigned','Assigned · tracks started',i.assignedAt],['docs',i.skip12?'Nothing to collect':'Documents collected',issAllDocsIn(l)&&i.assignedAt?1:0],['await','Policy copy requested',i.rows.pol.st!=='na'?1:0],['closed','Policy copy and tax invoice sent · closed',i.stage==='closed'?1:0]];
  var cur=-1; steps.forEach(function(s,k){ if(s[2]) cur=k; });
  var html='<div class="crumbs"><button data-back="1">'+ic('arrowleft','ic14')+' Back</button></div>'+
    '<div class="hdrow"><div><div class="h1">'+esc(i.id)+'</div><div class="metaline"><span class="b">'+esc(a.n)+'</span><span class="sep">·</span><span>'+esc(l.product)+'</span><span class="sep">·</span><span>Raised by the system at Payment Completed</span><span class="sep">·</span>'+chip('Issuance · BimaOps','neutral',false,true)+chip(ISS_STAGE[i.stage],t.tone,true,true)+chip('Waiting on '+w,waitTone(w),false,true)+'</div></div><span class="sp"></span>'+
      '<div class="acts"></div></div>'+
    (t.pend?'<div class="banner amber mt12">'+ic('alert','ic14')+'<span>'+esc(t.pend)+'</span></div>':'')+
    (!can&&i.stage!=='closed'?'<div class="banner neutral mt12">'+ic('eye','ic14')+'<span>Read-only. '+esc(readOnlyWhy(l)||'The desk works the ticket; the RM chases the client.')+'</span></div>':'')+
    diamonds()+
    '<div class="two"><div class="rail">'+
      '<div class="clock '+(i.stage==='closed'?'green':(w==='Us'?'red':'blue'))+'"><div class="top"><span>Ticket clock</span><span class="own">'+esc(CS_NAME)+'</span></div><div class="hl">'+(i.stage==='closed'?ISS_STAGE[i.stage]:plural(daysBetween(l.enteredAt,S.now),'day')+' at this stage')+'</div><div class="bar"><i style="width:'+Math.round((cur+1)/steps.length*100)+'%"></i></div><div class="l1">'+esc(ISS_STAGE[i.stage])+'<span> · line at '+esc(stageName(l.stage))+'</span></div><div class="l2">'+ic('clock','ic14')+'Created '+esc(fmt(i.createdAt))+'</div></div>'+
      '<div class="na '+na.tone+'"><div class="k">'+esc(na.lab||'Next action')+'</div><div class="i">'+esc(na.txt)+'</div>'+(na.why?'<div class="w">'+esc(na.why)+'</div>':'')+(can&&na.acts.length?'<div class="acts"><button class="btn primary lg full" data-flow="'+na.acts[0][0]+'" data-line="'+l.id+'">'+esc(na.acts[0][1])+'</button>'+(na.acts.length>1?'<div class="sec">'+na.acts.slice(1).map(function(x){return '<button class="btn sm" data-flow="'+x[0]+'" data-line="'+l.id+'">'+esc(x[1])+'</button>';}).join('')+'</div>':'')+'</div>':'')+'</div>'+
      (can&&postSims(l).length?simblock('Simulate the desk, the client or the insurer','What happens off this screen — on BimaOps, Bimakendra or in the insurer’s inbox.',postSims(l).join('')):'')+
    '</div><div class="pane"><div class="pb">'+
      '<div class="phhd"><div class="t">Flow</div><div class="a">one ISS ticket per product line</div></div>'+
      '<ul class="tl mt12">'+steps.map(function(s,k){ var done=k<=cur, now=k===cur+1&&i.stage!=='closed'&&i.stage!=='withdrawn'; return '<li><span class="dot'+(done?'':(now?' them':' sys'))+'"'+(!done&&!now?' style="opacity:.35"':'')+'></span><div class="bd"><b'+(!done&&!now?' style="color:var(--ink3);font-weight:500"':'')+'>'+esc(s[1])+'</b>'+(now?' '+chip('Now','amber',true,true):'')+(done&&s[2]>1?'<div class="m">'+esc(fmt(s[2]))+'</div>':'')+'</div></li>'; }).join('')+'</ul>'+
      diamonds(true)+'<div class="h3">Requirements</div><div class="mt8">'+postRowsTable(l,can)+'</div>'+
      diamonds(true)+'<div class="h3">Document vault</div><div class="meta">Only documents actually held on the ticket — each one to view or download.</div>'+
      '<div class="rowlist doclist mt8">'+[i.rows.rhl.st==='sent'?'Risk-held letter':'',i.rows.pf.st==='done'?'Filled proposal form':'',i.rows.md.st==='done'?'Mandate letter':'',i.rows.pol.copy?'Policy copy':'',i.rows.pol.inv?'Tax invoice':'','PAN card','GST certificate','Payment proof'].filter(Boolean).map(function(d){ return docRow(d,true,'',{line:l.id,acct:a.id,ref:d==='Mandate letter'?i.rows.md.ref:''}); }).join('')+'</div>'+
      diamonds(true)+mailTrail(l)+
    '</div></div></div>';
  return {sc:'Post-purchase ticket', ctx:i.id, html:html, cta: raiseLines().length?'<button class="btn primary sm" data-flow="pickTicket">'+ic('plus')+'Raise ticket</button>':''};
}

/* ---------- RM Home ---------- */
function rmAccounts(uid){ return S.data.accounts.filter(function(a){return a.own===uid;}); }
function nextFollowUp(l){ var ts=tasksOfLine(l.id).filter(function(t){return !t.done&&(t.rule==='TR-09'||t.cls==='Manual'||t.cls==='Follow-up');}).sort(function(x,y){return x.dueAt-y.dueAt;}); return ts[0]?ts[0].dueAt:0; }
/* [stated 24 Sep] contractual policies are out of every renewal view — they never renew */
function renewalsFor(accts,days){ var out=[]; accts.forEach(function(a){ a.pols.forEach(function(p){ if(p.issuing||p.expired||isContractual(p.p)) return; var d=daysBetween(S.now,p.exp); if(d>=0&&d<=days) out.push({a:a,p:p,d:d,pr:d<=30?'P1':(d<=60?'P2':(d<=90?'P3':'P4'))}); }); }); return out.sort(function(x,y){return x.d-y.d;}); }
/* [stated 23 Sep] the renewal line for a policy is the one that carries that policy id */
function rmHome(uid){
  var mine=S.data.lines.filter(function(l){return l.owner===uid&&!dead(l);}), accts=rmAccounts(uid), b={fresh:[],ren:[],late:[]};
  mine.forEach(function(l){ if(isNewly(l)) b.fresh.push({l:l,k:'sale',at:l.reAt||l.assignedAt}); else if(postLine(l)&&openRuleTask(l,'TR-08')) b.fresh.push({l:l,k:'post',at:l.paidAt||l.enteredAt}); });
  b.fresh.sort(function(x,y){return x.at-y.at;});
  b.ren=renewalsFor(accts,90);
  var order={esc:0,over:1,today:2}; myTasks(uid).forEach(function(t){ var st=taskState(t); if(order[st]!==undefined) b.late.push(t); });
  b.late.sort(function(x,y){ return (order[taskState(x)]-order[taskState(y)])||(x.dueAt-y.dueAt); });
  return b;
}
function renewalLineFor(a,p){ return linesOfAcct(a.id).filter(function(l){ return l.renews===p.id&&!dead(l)&&l.stage<14; })[0]||null; }
function rmBuckets(uid){
  var mine=S.data.lines.filter(function(l){return l.owner===uid;}), accts=rmAccounts(uid), b={fresh:[],ren:[],late:[],move:[],quiet:[]}, used={};
  var order={esc:0,over:1,today:2};
  /* 1 · newly assigned: handed over at payment with no welcome call yet, or a sales line nobody has called */
  mine.forEach(function(l){ if(dead(l)) return;
    if(l.stage===11 && openRuleTask(l,'TR-08')){ b.fresh.push({l:l,k:'post'}); used[l.id]=1; }
    else if(isNewly(l)){ b.fresh.push({l:l,k:'sale'}); used[l.id]=1; } });
  b.fresh.sort(function(x,y){return (y.l.reAt||y.l.paidAt||y.l.assignedAt)-(x.l.reAt||x.l.paidAt||x.l.assignedAt);});
  /* 2 · renewals: my renewal lines still to renew, soonest expiry first — the system opens one 90 days out */
  b.ren=renLines(uid).filter(renDue).sort(function(x,y){ var a=renPolHit(x), c=renPolHit(y); return (a?a.p.exp:0)-(c?c.p.exp:0); }); b.ren.forEach(function(l){ used[l.id]=1; });
  /* 3 · overdue tasks */
  myTasks(uid).forEach(function(t){ var st=taskState(t); if(order[st]!==undefined) b.late.push(t); });
  b.late.sort(function(x,y){ return (order[taskState(x)]-order[taskState(y)]) || (x.dueAt-y.dueAt); });
  /* 4 · action required: the stage or the ticket needs me */
  /* [stated 26 Sep · 17.3] also: a chase past its follow-up date, the QC check, the policy explanation call */
  mine.forEach(function(l){ if(used[l.id]||dead(l)) return; if(l.stage===14){ if(openRuleTask(l,'TR-10')){ b.move.push({l:l}); used[l.id]=1; } return; } if(l.status==='park'){ if(l.revisit<=S.now){ b.move.push({l:l}); used[l.id]=1; } return; }
    var fu=l.stage===12?nextFollowUp(l):0; if(actingParty(l)==='Us'||(fu&&fu<S.now)){ b.move.push({l:l}); used[l.id]=1; } });
  S.data.svc.forEach(function(t){ var a=acctOf(t.acct); if(a&&a.own===uid&&!svcClosed(t)&&svcNeed(t)) b.move.push({t:t}); });
  /* 5 · quiet: with someone else and silent for 30 days */
  mine.forEach(function(l){ if(used[l.id]||dead(l)||l.stage===14||l.status==='park') return; if(daysQuiet(l)>=QUIET_DAYS) b.quiet.push(l); });
  b.quiet.sort(function(x,y){return daysQuiet(y)-daysQuiet(x);});
  b.onme=b.fresh.concat(b.late,b.move);
  return b;
}
SCREENS.rmhome=function(){
  /* [stated 23 Sep] same shape as the sales home — newly assigned · renewals · tasks · action
     required · no activity — with renewal management bucketed by how soon the policy expires. */
  var u=me(), b=rmBuckets(u.id), tk=hTasks(u.id);

  /* newly assigned: a sales line nobody has called, or an account handed over at payment */
  /* [stated 23 Sep] two cases, each chipped: a line the assignment rule gave you, and a line handed over at payment */
  var fresh=b.fresh.map(function(x){ var l=x.l;
    return x.k==='post'
      ? {l:l, at:(l.paidAt||l.enteredAt), meta:chip('Handed over','amber',true,true)+'<span>paid '+esc(hWhen(l.paidAt||l.enteredAt))+(l.soldBy?' · sold by '+esc(uname(l.soldBy)):'')+'</span>'}
      : {l:l, at:l.assignedAt, meta:chip('New lead','violet',true,true)+'<span>assigned '+esc(hWhen(l.assignedAt))+(l.src?' · '+esc(l.src):'')+'</span>'}; });

  /* renewal management — buckets by days to expiry; overdue sits in the first one */
  var RB=[['r7','Next 7 days',function(d){return d<=7;}],['r30','8–30 days',function(d){return d>7&&d<=30;}],
          ['r60','31–60 days',function(d){return d>30&&d<=60;}],['r90','61–90 days',function(d){return d>60&&d<=90;}]];
  var renBucket=function(k){ var f=null; RB.forEach(function(x){ if(x[0]===k) f=x[2]; }); return b.ren.filter(function(l){ return f(renDays(l)); }); };
  var rb=S.ui.rmb||''; if(!rb||!renBucket(rb).length){ rb=''; RB.forEach(function(x){ if(!rb && renBucket(x[0]).length) rb=x[0]; }); if(!rb) rb='r7'; }
  var renRows=renBucket(rb).map(function(l){ var d=renDays(l), h=renPolHit(l);
    /* [stated 23 Sep] show the date the renewal is due, not how long ago it lapsed */
    var due='<span'+(d<=7?' class="red"':'')+'>Due '+esc(h?fmtD(h.p.exp):'—')+'</span>';
    return hLineRow(l, chip(stageName(l.stage),l.stage>=SALES_STAGES?'green':'neutral',true,true)+due); });

  var n=fresh.length+b.ren.length+tk.over.length+tk.today.length+b.move.length+b.quiet.length;
  var html='<div class="hhero"><div class="h1">'+esc(greetTx())+', '+esc(u.n.split(' ')[0])+'</div><span class="hday">'+ic('calendar')+esc(fmt(S.now).replace(/^today, /,'Today · '))+'</span></div>'+
    '<div class="sub">Everything that needs you today. Your accounts and policies are on <button class="link" data-go="accounts">Accounts</button>, the full renewal list on <button class="link" data-go="renewals">Renewals</button>.</div>'+diamonds()+
    (n?'':'<div class="mt16">'+empty('circlecheck','Nothing needs you today','No task is due or overdue, nothing is newly handed over, nothing renews in the next 90 days and no line is sitting on you.','<button class="btn" data-go="pipeline">Open Pipeline</button>')+'</div>')+
    '<div class="hgap">'+
    hFreshCard(fresh)+
    (1?hCard('ren','amber','refresh','Renewal management', renRows,
      hSeg('rmb',rb,RB.map(function(x){ return [x[0],x[1],renBucket(x[0]).length]; })), 'Nothing in this window.'):'')+
    hTaskCard(tk)+
    (1?hCard('move','amber','zap','Action required', b.move.map(function(x){
        if(x.t){ var t=x.t, a=acctOf(t.acct); return '<div class="hrow row" data-go="svctix" data-id="'+t.id+'"><div class="bd"><div class="tt">'+esc(t.id)+' <span class="pr">· '+esc(t.sub)+'</span></div><div class="mt">'+chip('Needs your reply','amber',true,true)+'<span>'+esc(a?shortName(a.n):'')+' · '+esc(t.prod)+'</span></div></div><div class="rt">'+ic('chevright')+'</div></div>'; }
        return hLineRow(x.l,'<span>'+esc(nextAction(x.l).txt)+'</span>'); }), chip(b.move.length,'amber',false,true)):'')+
    (1?hCard('quiet','blue','clock','No activity in '+QUIET_DAYS+' days', b.quiet.map(function(l){ return hLineRow(l,'<span class="red">'+daysQuiet(l)+' days</span><span>since the last activity · waiting on '+esc(actingParty(l))+'</span>'); }), chip(b.quiet.length,'blue',false,true)):'')+
    '</div>';
  return {sc:'Home', html:html};
};
function rmStats(u){
  var ls=S.data.lines.filter(function(l){return l.owner===u.id;}), accts=rmAccounts(u.id), post=ls.filter(postLine), tk=myTasks(u.id);
  return {u:u, accts:accts.length, post:post.length, client:post.filter(function(l){return actingParty(l)==='Client';}).length, await:post.filter(function(l){return l.stage===13;}).length, onme:post.filter(function(l){return actingParty(l)==='Us';}).length,
    issued:ls.filter(function(l){return l.stage===14&&l.paidAt&&daysBetween(l.paidAt,S.now)<=30;}).length, selling:ls.filter(openLine).length, svc:S.data.svc.filter(function(t){var a=acctOf(t.acct);return a&&a.own===u.id&&!svcClosed(t);}).length,
    ren:renewalsFor(accts,60).length, esc:tk.filter(function(t){return taskState(t)==='esc';}).length, over:tk.filter(function(t){return taskState(t)==='over';}).length, force:accts.reduce(function(s,a){return s+premInForce(a);},0)};
}
SCREENS.rmteam=function(){
  var u=me(); if(u.role!=='rmhead') return noAccess('screen');
  /* [stated 23 Sep] escalated tasks first, then the stalled lines, then renewals with nothing started. */
  var team=rmTeam(u.id), ids=team.map(function(x){return x.id;});
  var post=S.data.lines.filter(function(l){return ids.indexOf(l.owner)>=0&&postLine(l);});
  var accts=S.data.accounts.filter(function(a){return ids.indexOf(a.own)>=0;});
  var esc_=escalatedTo(u.id).sort(function(x,y){return (x.escAt||x.dueAt)-(y.escAt||y.dueAt);});
  /* a post-purchase line past its clock, or a client-pending line whose follow-up date has gone */
  var slip=[];
  post.forEach(function(l){
    /* [stated 24 Sep · TBD-53] working days, not calendar days */
    if(l.stage===11&&l.iss&&!l.iss.assignedAt&&workDaysInStage(l)>=1){ slip.push({l:l,k:'unas',d:workDaysInStage(l)}); return; }
    if(stalledPost(l)){ slip.push({l:l,k:'stuck',d:workDaysInStage(l)}); return; }
    var fu=nextFollowUp(l); if(actingParty(l)==='Client'&&fu&&fu<S.now) slip.push({l:l,k:'chase',d:daysBetween(fu,S.now)});
  });
  slip.sort(function(x,y){return y.d-x.d;});
  /* renewals with nothing started: the policy expires soon and no renewal line exists for it */
  var risk=[];
  accts.forEach(function(a){ (a.pols||[]).forEach(function(p){
    /* [stated 24 Sep] a contractual policy is not at risk — it never renews */
    if(p.issuing||p.expired||isContractual(p.p)) return; var d=calDays(S.now,p.exp); if(d<0||d>REN_WINDOW) return;
    var rl=renewalLineFor(a,p);
    if(!rl) risk.push({a:a,p:p,d:d,l:null});
    else if(d<=30&&rl.stage<=3) risk.push({a:a,p:p,d:d,l:rl});
  }); });
  risk.sort(function(x,y){return x.d-y.d;});
  var html=hMgrHero(u,'Your team\u2019s escalated tasks, what has stalled, and the renewals at risk. '+esc(team.map(function(x){return x.n.split(' ')[0];}).join(', '))+' \u00b7 '+plural(accts.length,'account')+'.')+
    (esc_.length+slip.length+risk.length?'':hMgrClear('Every RM clock is inside its limit, every client chase is on time, and every renewal inside the window has been started.'))+
    '<div class="hgap">'+
    (esc_.length?hCard('esc','red','alert','Escalated tasks',hCut('resc',esc_.map(hMgrTaskRow)),chip(esc_.length,'red',true,true),''):'')+
    (slip.length?hCard('slip','amber','clock','Stalled',hCut('rslip',slip.map(function(x){
        var lab=x.k==='unas'?'Unassigned':(x.k==='chase'?'Documents pending':(x.l.stage===12?'Documents pending':(x.l.stage===13?'Awaiting copy':'Unassigned')));
        var meta=chip(lab,x.k==='chase'?'amber':'red',true,true)+'<span>'+esc(uname(x.l.owner))+' \u00b7 '+esc(stageName(x.l.stage))+' \u00b7 waiting on '+esc(actingParty(x.l))+' \u00b7 '+plural(x.d,x.k==='chase'?'day':'working day')+(x.k==='chase'?' past the follow-up':' at this stage')+'</span>';
        return hSlipRow(x.l,meta); })),
      chip(slip.length,'amber',true,true),''):'')+
    (risk.length?hCard('ren','violet','refresh','Renewals at risk',hCut('rrisk',risk.map(function(r){
        var late=r.d<=30;
        return '<div class="hrow row" data-go="'+(r.l?'line':'policy')+'" data-id="'+(r.l?r.l.id:r.p.id)+'"><div class="bd">'+
          '<div class="tt">'+esc(shortName(r.a.n))+' <span class="pr">\u00b7 '+esc(r.p.p)+'</span></div>'+
          '<div class="mt">'+chip('Due '+fmtD(r.p.exp),late?'red':'amber',true,true)+'<span>'+esc(uname(r.a.own))+' \u00b7 '+(r.l?'still at '+esc(stageName(r.l.stage)):'not started')+'</span></div></div>'+
          '<div class="rt">'+(r.l&&canTakeOver(r.l)?'<button class="btn sm" data-flow="takeover" data-line="'+r.l.id+'">Take ownership</button>':'')+ic('chevright')+'</div></div>'; })),
      chip(risk.length,'violet',true,true),''):'')+
    '</div>'+
    '<div class="meta mt16">Closing an escalated task closes it for the RM too, and the line does not move. Taking a line over is the fallback for when the RM is away \u2014 it is audited. The full book is on <button class="link" data-go="renewals">Renewals</button> and <button class="link" data-go="tickets">Tickets</button>.</div>';
  return {sc:'Home', html:html};
};

/* ---------- seed: paid lines inside the ticket ---------- */
function postSeed(lines,accounts){
  var L=function(id){ return lines.filter(function(l){return l.id===id;})[0]; }, A=function(id){ return accounts.filter(function(a){return a.id===id;})[0]; };
  function paid(l,o){ l.paidAt=o.paidAt; l.soldBy=o.soldBy; l.hand={note:o.note,by:o.soldBy,at:o.paidAt,utr:o.utr||'',proof:'Payment screenshot'}; l.iss=o.iss; l.iss.mail=o.mail||[]; l.att=o.att||3;
    l.log.push({at:o.paidAt,t:'Payment confirmed',m:o.soldName+' · '+INR(l.prem)+' matched'+(o.utr?' · UTR '+o.utr:''),sys:0,kind:'pay'});
    l.log.push({at:o.paidAt,t:'Owner changed from '+o.soldName+' to '+o.rmName+' — Transfer at payment',m:'by the system · Sold by '+o.soldName,sys:1,kind:'sys'});
    l.log.push({at:o.paidAt,t:'Post-purchase ticket '+o.iss.id+' created',m:'System · BimaOps · Customer Success',sys:1,kind:'sys'});
    if(o.iss.assignedAt){ l.log.push({at:o.iss.assignedAt,t:'Ticket assigned to '+CS_NAME,m:'System · every applicable track starts now',sys:1,kind:'sys'}); }
    (o.log||[]).forEach(function(e){ l.log.push(e); });
    if(o.pol){ var a=A(l.acct); a.pols.push(o.pol); }
  }
  var M=function(th,at,from,to,subj,body){ return {th:th,at:at,from:from,to:to,subj:subj,body:body}; };
  /* Sharma · D&O · paid an hour ago · ticket created, not assigned */
  paid(L('OP-2925'),{paidAt:ago(0,1),soldBy:'nikhil',soldName:'Nikhil Sharma',rmName:'Priya Nair',utr:'HDFC22630541',note:'Rahul Mehta wants the policy copy before their board meets on 30 Sep. Prefers WhatsApp after 6 pm.',
    iss:{id:'ISS-0431',owner:'radha',createdAt:ago(0,1),assignedAt:0,stage:'new',skip12:false,rows:{rhl:{mode:'none',st:'na',fu:0,at:0},pf:{mode:'dig',st:'wait',fu:0,recv:0,at:0},md:{mode:'dig',st:'wait',fu:0,at:0,ref:''},pol:{st:'na',fu:0,esc:0,copy:0,inv:0,at:0}}},
    pol:{id:'POL-DO-2026-2925',ins:'HDFC Ergo',p:'Directors & Officers',si:'₹10 Cr',pr:156000,exp:ago(0,1)+365*86400000,endo:0,issuing:1,line:'OP-2925'}});
  /* Kalyan · CGL · paid 4 days ago · collecting: RHL with Oriental, form and mandate with the client */
  paid(L('OP-2921'),{paidAt:ago(4,2),soldBy:'anand',soldName:'Anand Kulkarni',rmName:'Priya Nair',utr:'ICIC2262908812',note:'Rahul Nair signs. Sunita Rane handles documents day to day.',
    iss:{id:'ISS-0427',owner:'radha',createdAt:ago(4,2),assignedAt:ago(4,1),stage:'docs',skip12:false,rows:{rhl:{mode:'ins',st:'pending',fu:2,at:ago(4,1)},pf:{mode:'dig',st:'pending',fu:1,recv:0,at:ago(4,1)},md:{mode:'dig',st:'pending',fu:1,at:ago(4,1),ref:''},pol:{st:'na',fu:0,esc:0,copy:0,inv:0,at:0}}},
    mail:[M('client',ago(4,1),GENERIC_FROM,'rahul.nair@kalyanlog.in','Proposal form to fill — Kalyan Logistics Pvt Ltd · Commercial General Liability','Please fill the proposal form on Bimakendra. Your relationship manager is Priya Nair.'),M('client',ago(4,1),GENERIC_FROM,'rahul.nair@kalyanlog.in','Mandate letter to sign — Kalyan Logistics Pvt Ltd','Please sign the mandate letter on Bimakendra. Your relationship manager is Priya Nair.'),M('insurer',ago(4,1),'Customer Success','Oriental Insurance · POC','RHL request — Kalyan Logistics · CGL','Payment received. Please issue the risk-held letter.'),M('insurer',ago(2),'Customer Success','Oriental Insurance · POC','Reminder 1: RHL — Kalyan Logistics','Following up on the risk-held letter.'),M('insurer',ago(1),'Customer Success','Oriental Insurance · POC','Reminder 2: RHL — Kalyan Logistics','Following up again.'),M('rm',ago(1),'Customer Success','Priya Nair','Reminder: proposal form and mandate pending — Kalyan Logistics','Both rows are still Shared with client · Pending after 3 days.')],
    log:[{at:ago(4,1),t:'Proposal form link shared with the client',m:'System · three rails · Shared with client · Pending',sys:1,kind:'post'},{at:ago(4,1),t:'Mandate letter link shared with the client',m:'System · three rails · Shared with client · Pending',sys:1,kind:'post'},{at:ago(4,1),t:'RHL requested from Oriental Insurance',m:'System · target 2 working days',sys:1,kind:'sys'},{at:ago(3),t:'Welcome call · reached · introduced',m:'Priya Nair · links explained, Rahul Nair signs',sys:0,kind:'call'},{at:ago(2),t:'Chase · Client will complete by a date',m:'Priya Nair · Call · promised by Friday',sys:0,kind:'call'}],
    pol:{id:'POL-CGL-2026-2921',ins:'Oriental Insurance',p:'Commercial General Liability',si:'₹5 Cr',pr:142000,exp:ago(4,2)+365*86400000,endo:0,issuing:1,line:'OP-2921'}});
  /* Meridian · Group Health · paid 9 days ago · everything in · policy copy with ICICI */
  paid(L('OP-2922'),{paidAt:ago(9,1),soldBy:'divya',soldName:'Divya Shah',rmName:'Priya Nair',utr:'ICIC2262104471',note:'HR head Devang Shah wants the e-cards for staff the day the policy issues.',
    iss:{id:'ISS-0421',owner:'radha',createdAt:ago(9,1),assignedAt:ago(9),stage:'await',skip12:false,rows:{rhl:{mode:'none',st:'na',fu:0,at:0},pf:{mode:'dig',st:'done',fu:0,recv:0,at:ago(6,2)},md:{mode:'dig',st:'done',fu:0,at:ago(6),ref:'MD-001'},pol:{st:'pending',fu:2,esc:0,copy:0,inv:0,at:ago(5,2)}}},
    mail:[M('client',ago(9),GENERIC_FROM,'devang.shah@meridianchem.com','Proposal form to fill — Meridian Chemicals Ltd · Group Health','Please fill the proposal form on Bimakendra. Your relationship manager is Priya Nair.'),M('client',ago(9),GENERIC_FROM,'devang.shah@meridianchem.com','Mandate letter to sign — Meridian Chemicals Ltd','Please sign the mandate letter on Bimakendra.'),M('insurer',ago(5,2),'Customer Success','ICICI Lombard · POC','Policy copy and tax invoice — Meridian Chemicals · Group Health','All documents are in (proposal form and mandate attached). Please issue the policy copy and tax invoice.'),M('insurer',ago(3),'Customer Success','ICICI Lombard · POC','Reminder 1: policy copy — Meridian Chemicals','Following up.'),M('insurer',ago(1),'Customer Success','ICICI Lombard · POC','Reminder 2: policy copy — Meridian Chemicals','Following up again.')],
    log:[{at:ago(9),t:'Proposal form link shared with the client',m:'System · three rails',sys:1,kind:'post'},{at:ago(9),t:'Mandate letter link shared with the client',m:'System · three rails',sys:1,kind:'post'},{at:ago(8),t:'Welcome call · reached · introduced',m:'Priya Nair',sys:0,kind:'call'},{at:ago(6,2),t:'Proposal form filled by the client on Bimakendra',m:'System · row Completed',sys:1,kind:'post'},{at:ago(6),t:'Mandate signed by the client on Bimakendra',m:'System · row Completed · mandate register written MD-001',sys:1,kind:'post'},{at:ago(5,2),t:'Policy copy and tax invoice requested from ICICI Lombard',m:'System · automatic once every requirement is complete',sys:1,kind:'sys'},{at:ago(5,2),t:'Stage: Awaiting Policy Copy',m:'System · every requirement complete · from Policy Documents Pending',sys:1,kind:'stage'}],
    pol:{id:'POL-GH-2026-2922',ins:'ICICI Lombard',p:'Group Health',si:'₹5 L per employee',pr:640000,exp:ago(9,1)+365*86400000,endo:0,issuing:1,line:'OP-2922'}});
  /* Novacast · Marine · paid 2 days ago · offline form came back to the RM, RHL with Oriental, mandate on file */
  paid(L('OP-2923'),{paidAt:ago(2,3),soldBy:'anand',soldName:'Anand Kulkarni',rmName:'Rohan Desai',utr:'SBIN2263011209',note:'Balaji is travelling till Wednesday; Meena Iyer left the company — do not call her.',
    iss:{id:'ISS-0433',owner:'radha',createdAt:ago(2,3),assignedAt:ago(2,2),stage:'docs',skip12:false,rows:{rhl:{mode:'ins',st:'pending',fu:0,at:ago(2,2)},pf:{mode:'off',st:'pending',fu:1,recv:1,at:ago(2,2)},md:{mode:'file',st:'na',fu:0,at:0,ref:'MD-002'},pol:{st:'na',fu:0,esc:0,copy:0,inv:0,at:0}}},
    mail:[M('client',ago(2,2),GENERIC_FROM,'balaji@novacast.co.in','Proposal form to fill and sign — Novacast Foundry Pvt Ltd · Marine Cargo','Oriental Insurance does not have a digital form for this product. The PDF is attached; please fill and sign it and send it to Rohan Desai, your relationship manager.'),M('insurer',ago(2,2),'Customer Success','Oriental Insurance · POC','RHL request — Novacast Foundry · Marine Cargo','Payment received. Please issue the risk-held letter.')],
    log:[{at:ago(2,2),t:'Offline proposal form PDF sent to the client',m:'System · three rails · the filled copy comes back to the RM',sys:1,kind:'post'},{at:ago(2,2),t:'RHL requested from Oriental Insurance',m:'System · target 2 working days',sys:1,kind:'sys'},{at:ago(2),t:'Welcome call · reached · offline form explained',m:'Rohan Desai',sys:0,kind:'call'},{at:ago(1),t:'Client sent the filled offline proposal form to Rohan Desai',m:'System · waiting on the RM to upload it',sys:1,kind:'post'}],
    pol:{id:'POL-MC-2026-2923',ins:'Oriental Insurance',p:'Marine Cargo',si:'₹6 Cr',pr:84000,exp:ago(2,3)+365*86400000,endo:0,issuing:1,line:'OP-2923'}});
  /* Blue Harbour · CGL · issued yesterday */
  paid(L('OP-2924'),{paidAt:ago(12),soldBy:'sameer',soldName:'Sameer Joshi',rmName:'Rohan Desai',utr:'HDFC22624410',note:'Joseph Mathew is the only contact. Likes a call before any email.',
    iss:{id:'ISS-0417',owner:'radha',createdAt:ago(12),assignedAt:ago(12,-1),stage:'closed',skip12:false,rows:{rhl:{mode:'sys',st:'sent',fu:0,at:ago(12,-1)},pf:{mode:'dig',st:'done',fu:1,recv:0,at:ago(10)},md:{mode:'dig',st:'done',fu:1,at:ago(9),ref:'MD-003'},pol:{st:'sent',fu:1,esc:0,copy:1,inv:1,at:ago(1)}}},
    mail:[M('client',ago(12,-1),GENERIC_FROM,'joseph@blueharbour.in','Your risk-held letter — Blue Harbour Shipping · CGL','The insurer has held the risk from today.'),M('client',ago(12,-1),GENERIC_FROM,'joseph@blueharbour.in','Proposal form to fill — Blue Harbour Shipping','Please fill the proposal form on Bimakendra. Your relationship manager is Rohan Desai.'),M('client',ago(12,-1),GENERIC_FROM,'joseph@blueharbour.in','Mandate letter to sign — Blue Harbour Shipping','Please sign the mandate letter on Bimakendra.'),M('insurer',ago(9),'Customer Success','Bajaj Allianz · POC','Policy copy and tax invoice — Blue Harbour Shipping · CGL','All documents are in. Please issue the policy copy and tax invoice.'),M('insurer',ago(5),'Customer Success','Bajaj Allianz · POC','Reminder 1: policy copy — Blue Harbour','Following up.'),M('client',ago(1),GENERIC_FROM,'joseph@blueharbour.in','Your policy — Blue Harbour Shipping · CGL','Policy POL-CGL-2026-2924 and the tax invoice are attached, and on Bimakendra. Rohan Desai, your relationship manager, will walk you through the cover.')],
    log:[{at:ago(12,-1),t:'RHL generated and sent to the client',m:'System · three rails',sys:1,kind:'post'},{at:ago(12,-1),t:'Proposal form link shared with the client',m:'System · three rails',sys:1,kind:'post'},{at:ago(12,-1),t:'Mandate letter link shared with the client',m:'System · three rails',sys:1,kind:'post'},{at:ago(11),t:'Welcome call · reached · introduced',m:'Rohan Desai',sys:0,kind:'call'},{at:ago(10),t:'Proposal form filled by the client on Bimakendra',m:'System · row Completed',sys:1,kind:'post'},{at:ago(9),t:'Mandate signed by the client on Bimakendra',m:'System · mandate register written MD-003',sys:1,kind:'post'},{at:ago(9),t:'Stage: Awaiting Policy Copy',m:'System · every requirement complete',sys:1,kind:'stage'},{at:ago(2),t:'Policy copy and tax invoice received',m:'System · email bot · in QC',sys:1,kind:'sys'},{at:ago(1),t:'Policy copy and tax invoice sent to the client',m:'System · QC passed · three rails · policy record written · POL-CGL-2026-2924',sys:1,kind:'post'},{at:ago(1),t:'Stage: Policy Copy Sent to Client',m:'System · from Awaiting Policy Copy',sys:1,kind:'stage'}]});
  /* [stated 23 Sep] the head of RM's own book — Marigold · Cyber · paid two hours ago · ticket created, not assigned */
  paid(L('OP-2934'),{paidAt:ago(0,2),soldBy:'anand',soldName:'Anand Kulkarni',rmName:'Meera Pillai',utr:'ICIC2263118842',note:'Devika Rao signs. Imran Qureshi is the day-to-day contact across the nine properties.',
    iss:{id:'ISS-0441',owner:'radha',createdAt:ago(0,2),assignedAt:0,stage:'new',skip12:false,rows:{rhl:{mode:'none',st:'na',fu:0,at:0},pf:{mode:'dig',st:'wait',fu:0,recv:0,at:0},md:{mode:'dig',st:'wait',fu:0,at:0,ref:''},pol:{st:'na',fu:0,esc:0,copy:0,inv:0,at:0}}},
    pol:{id:'POL-CYB-2026-2934',ins:'ICICI Lombard',p:'Cyber Liability',si:'₹5 Cr',pr:214000,exp:ago(0,2)+365*86400000,endo:0,issuing:1,line:'OP-2934'}});
  /* Northgate · Group Health · paid five days ago · form and mandate still with the client */
  paid(L('OP-2935'),{paidAt:ago(5,2),soldBy:'divya',soldName:'Divya Shah',rmName:'Meera Pillai',utr:'HDFC22631770',note:'Sanjay Bhatt wants the e-cards live before the quarter closes.',
    iss:{id:'ISS-0442',owner:'radha',createdAt:ago(5,2),assignedAt:ago(5,1),stage:'docs',skip12:false,rows:{rhl:{mode:'none',st:'na',fu:0,at:0},pf:{mode:'dig',st:'pending',fu:2,recv:0,at:ago(5,1)},md:{mode:'dig',st:'pending',fu:1,at:ago(5,1),ref:''},pol:{st:'na',fu:0,esc:0,copy:0,inv:0,at:0}}},
    mail:[M('client',ago(5,1),GENERIC_FROM,'sanjay.bhatt@northgate.co.in','Proposal form to fill — Northgate Systems Pvt Ltd · Group Health','Please fill the proposal form on Bimakendra. Your relationship manager is Meera Pillai.'),M('client',ago(5,1),GENERIC_FROM,'sanjay.bhatt@northgate.co.in','Mandate letter to sign — Northgate Systems Pvt Ltd','Please sign the mandate letter on Bimakendra.'),M('rm',ago(2),'Customer Success','Meera Pillai','Reminder: proposal form and mandate pending — Northgate Systems','Both rows are still Shared with client · Pending after 3 days.')],
    log:[{at:ago(5,1),t:'Proposal form link shared with the client',m:'System · three rails · Shared with client · Pending',sys:1,kind:'post'},{at:ago(5,1),t:'Mandate letter link shared with the client',m:'System · three rails · Shared with client · Pending',sys:1,kind:'post'},{at:ago(4),t:'Welcome call · reached · introduced',m:'Meera Pillai · links explained, Sanjay Bhatt signs',sys:0,kind:'call'}],
    pol:{id:'POL-GH-2026-2935',ins:'HDFC Ergo',p:'Group Health',si:'₹5 L per employee',pr:1240000,exp:ago(5,2)+365*86400000,endo:0,issuing:1,line:'OP-2935'}});
}
