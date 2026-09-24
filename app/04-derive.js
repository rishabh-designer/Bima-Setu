/* ==================================================================== *
 *  Domain logic — everything computed from the record, nothing stored twice.
 * ==================================================================== */
var D=function(){ return S.data; };
function userById(id){ return by(S.data.users,id); }
function uname(id){ var u=userById(id); return u?u.n:(id||'—'); }
function acctOf(x){ return by(S.data.accounts, typeof x==='string'?x:x.acct); }
function oppOf(l){ return l&&l.opp?by(S.data.opps,l.opp):null; }
/* [stated 23 Sep] a renewal never creates an opportunity — it is a product line on the account,
   carrying the policy it renews. Every other line belongs to an opportunity, as before. */
function isRen(l){ return !!(l&&l.renews); }
function renLinesOfAcct(aid){ return S.data.lines.filter(function(l){return l.acct===aid&&isRen(l);}); }
function lineById(id){ return by(S.data.lines,id); }
function linesOfOpp(oid){ return S.data.lines.filter(function(l){return l.opp===oid;}); }
function linesOfAcct(aid){ return S.data.lines.filter(function(l){return l.acct===aid;}); }
function oppsOfAcct(aid){ return S.data.opps.filter(function(o){return o.acct===aid;}); }
function tasksOfLine(id){ return S.data.tasks.filter(function(t){return t.line===id;}); }
/* [stated 24 Sep · TBD-05] Unreachable is the sixth status, and only the system sets it —
   when the attempt ladder runs out (TBD-06: 10 calls, no timing rule, no channel rule). */
function dead(l){ return l.status==='lost'||l.status==='noapp'||l.status==='disq'||l.status==='withdrawn'||l.status==='unreach'; }
function openLine(l){ return l.status==='open' && l.stage<SALES_STAGES; }           /* still selling */
function postLine(l){ return l.status==='open' && l.stage>=SALES_STAGES && l.stage<14; } /* paid, inside the post-purchase ticket */
function issuedLine(l){ return l.stage===14; }
function isMgrRole(u){ u=u||me(); return !!u && (u.role==='mgr'||u.role==='rmhead'); }
function rmTeam(headId){ return S.data.users.filter(function(u){return u.role==='rm'&&u.mgr===headId;}); }
/* [stated 23 Sep] a head works in two views — their own book, or the team's. The switch is global:
   it scopes Home, Pipeline, Accounts, Opportunities and Tickets. Inside a product line it does not
   apply — a line is one record with one owner, whoever is looking at it. */
function hasViews(u){ u=u||me(); return !!u&&(u.role==='mgr'||u.role==='rmhead'); }
function teamView(u){ u=u||me(); return hasViews(u)&&S.ui.vw!=='mine'; }
function scopeIds(u){ u=u||me(); if(!u) return [];
  if(!teamView(u)) return [u.id];
  var t=(u.role==='mgr'?teamOf(u.id):rmTeam(u.id)).map(function(x){return x.id;}); t.push(u.id); return t; }
function inScope(uid,u){ return scopeIds(u).indexOf(uid)>=0; }
function homeRoute(u){ u=u||me(); if(!u) return 'home';
  if(u.role==='mgr') return teamView(u)?'team':'home';
  if(u.role==='rmhead') return teamView(u)?'rmteam':'rmhome';
  return u.role==='rm'?'rmhome':'home'; }
function stageName(n){ return STAGES[n-1]?STAGES[n-1].s:'?'; }
function skipped(l,n){ if(l.renews&&n<=2) return true; if(l.rate===1) return n>=4&&n<=7; if(l.rate===0&&l.rfq&&l.rfq.direct) return n===4||n===5; return false; } /* DAU: 3 → 8 · non-DAU floated directly: 3 → 6 */
function routeTx(l){ if(l.renews) return 'Placement · renewal'; return l.rate===null||l.rate===undefined?'Route not known yet':(l.rate?'DAU':(l.routeSwitch?'Placement · switched from DAU':'Placement')); }
function statusTx(l){ return {open:'Open',park:'Time Pending',lost:'Lost',noapp:'No Appetite',disq:'Disqualified',withdrawn:'Withdrawn',unreach:'Unreachable'}[l.status]||l.status; }
function statusTone(l){ return l.status==='open'?'green':(l.status==='park'?'amber':'red'); }
function oppName(l){ var o=oppOf(l); if(o) return o.name; return isRen(l)?'Renewal · '+(l.renews||''):(l.opp||'—'); }
function acctName(l){ var a=acctOf(l); return a?a.n:l.acct; }
function verified(a){ return !a.prov; }
function quotesFor(l){ return l.rate?QUOTES.dau:QUOTES.plc; }
function premOf(l){ if(l.picked){ var q=quotesFor(l).filter(function(x){return x.i===l.picked;})[0]; if(q&&q.p) return q.p; } return l.prem; }
function confirmed(l){ return l.stage>=9 && l.status==='open'; }

/* who must act on this line right now */
function actingParty(l){
  if(dead(l)) return '—';
  if(l.status==='park') return 'Parked';
  if(l.stage>=SALES_STAGES) return issWaiting(l);
  if(l.stage===6) return (!l.qAns && l.round===1) ? 'Us' : 'Placement';
  if(l.stage===9) return l.pay==='ticket' ? 'Ops' : 'Us';
  var w=STAGES[l.stage-1].w; return w==='Us / Ops'?'Us':w;
}
function waitTone(w){ return w==='Us'?'amber':(w==='Client'?'blue':(w==='Placement'||w==='Ops'||w==='Insurer'||w==='Post-purchase'?'violet':'neutral')); }

/* activity clock: client-facing activity or a stage move */
var CLIENT_KINDS={call:1,email:1,whatsapp:1,meeting:1,rfq:1,qcr:1,pay:1,stage:1,post:1};
function lastActivity(l){ var mx=l.createdAt; (l.log||[]).forEach(function(e){ if(CLIENT_KINDS[e.kind] && e.at>mx) mx=e.at; }); return mx; }
/* [stated 24 Sep · TBD-53] the stalled clocks run on WORKING days; the 30-day quiet clock on
   calendar days. Thresholds: Payment Completed 1 · Policy Documents Pending 5 · Awaiting Policy
   Copy 3 · a new lead nobody has called 3 · an open line with no activity 30 (calendar). */
function daysQuiet(l){ return daysBetween(lastActivity(l),S.now); }
function daysInStage(l){ return daysBetween(l.enteredAt,S.now); }
function workDays(a,b){ return Math.floor(workMins(a,b)/((WH.end-WH.start)*60)); }
function workDaysInStage(l){ return workDays(l.enteredAt,S.now); }
var STALL={11:1, 12:5, 13:3};              /* working days in stage */
var UNCALLED_DAYS=3;                        /* working days a new lead may sit uncalled */
function stalledPost(l){ var t=STALL[l.stage]; return t!==undefined && workDaysInStage(l)>t; }
function uncalledLate(l){ return openLine(l) && l.stage===1 && !attempts(l) && workDays(l.assignedAt||l.createdAt,S.now)>=UNCALLED_DAYS; }
function attempts(l){ return l.att||0; }

/* tasks */
function taskState(t){
  if(t.done) return 'done';
  if(t.escAt && S.now>t.escAt) return 'esc';
  if(S.now>t.dueAt) return 'over';
  if(sameDay(workDate(S.now),t.dueAt) || (t.dueAt<=atH(workDate(S.now),WH.end).getTime() && t.dueAt>=S.now)) return 'today';
  return 'pending';
}
function taskTone(st){ return st==='esc'?'red':(st==='over'?'red':(st==='today'?'amber':(st==='done'?'green':'neutral'))); }
function taskStateTx(t){ var st=taskState(t);
  if(st==='esc'){ var u=userById(t.owner); return 'Escalated to '+uname(u&&u.mgr?u.mgr:'vikram')+' · '+whTx(workMins(t.escAt,S.now))+' ago'; }
  if(st==='over') return 'Overdue '+whTx(workMins(t.dueAt,S.now));
  if(st==='today') return 'Due '+fmt(t.dueAt);
  if(st==='done') return 'Done '+fmt(t.doneAt);
  return 'Due '+fmt(t.dueAt);
}
function myTasks(uid){ return S.data.tasks.filter(function(t){return t.owner===uid && !t.done;}); }
function escalatedTo(mgrId){ return S.data.tasks.filter(function(t){ if(t.done||taskState(t)!=='esc') return false; var u=userById(t.owner); return u && u.mgr===mgrId; }); }

/* the task engine lives in 14-rules.js: fireRules(l) runs every rule against the line */
function logAdd(l,t,m,kind,sys){ l.log.unshift({at:S.now,t:t,m:m||uname(S.user),sys:sys?1:0,kind:kind||'note'}); }
function moveStage(l,n,why){
  var from=l.stage; l.stage=n; l.enteredAt=S.now;
  logAdd(l,'Stage: '+stageName(n),'System · '+(why||'')+' · from '+stageName(from),'stage',1);
  var made=fireRules(l,'stage',n);
  return made;
}

/* assignment: inbound only, by product category, round robin */
function assignFor(product){
  var cat=CATOF[product]||'Property & casualty', pool=CAT_ROUTE[cat]||['nikhil'];
  var counts=pool.map(function(u){ return S.data.lines.filter(function(l){return l.owner===u&&openLine(l);}).length; });
  var min=Math.min.apply(null,counts); return pool[counts.indexOf(min)];
}

/* permissions */
function canAct(l){ var u=me(); return !!u && l.owner===u.id && !dead(l); }
function isMine(l){ var u=me(); return !!u && l.owner===u.id; }
function readOnlyWhy(l){ var u=me(); if(!u) return '';
  if(l.owner!==u.id){ if(l.soldBy===u.id) return 'Sold by you. Ownership passed to '+uname(l.owner)+' at payment; the post-purchase ticket '+(l.iss?l.iss.id:'')+' carries it from here.'; if(isMgrRole(u)) return 'Read-only. '+uname(l.owner)+' owns this line — a manager sees everything and acts on nothing. To work it, take it over.'; if(u.role==='rm') return 'Read-only. '+uname(l.owner)+' owns this line. The RM sees it, the owner works it.'; return 'Read-only. '+uname(l.owner)+' owns this product line.'; }
  if(dead(l)) return (l.status==='withdrawn'?'Withdrawn by the client — Customer Success closed the ticket. The stage is frozen where it was.':'Closed — '+statusTx(l)+(l.reason?' · '+l.reason:'')+'. How far it got is preserved.');
  if(l.stage===14) return 'Issued. The policy copy and tax invoice went to the client on the three rails. Renewal is a separate opportunity.'; return ''; }

/* placement and payment tickets are derived from the line */
function ticketsOf(l){
  var out=[];
  if(!l.rate && l.stage>=6 && l.status!=='disq'){
    var closed=l.stage>=9||dead(l), q=(l.stage===6 && !l.qAns && l.round===1 && !dead(l));
    out.push({id:'PLC-'+l.id.slice(3), ty:'Placement', desk:'BimaPlacement', line:l,
      st: closed?'Closed':(l.stage===7?'Response received':'Open'), tone: closed?(dead(l)&&l.stage<9?'neutral':'green'):(l.stage===7?'amber':'violet'),
      raised:plcRaisedAt(l), who:uname(l.owner),
      pend: q?'Placement has raised a query. Nothing moves until you answer it.':(l.stage===7&&!dead(l)?'QCR v'+l.round+' is back from placement. Review it.':''),
      act: q?'answerQ':(l.stage===7&&!dead(l)?'qcrPlc':''), actLbl: q?'Answer the query':(l.stage===7?'Review the QCR':'')});
  }
  if(l.iss) out.push(issTicket(l));
  if(l.pay!=='pre' && l.stage>=9){
    out.push({id:'PAY-'+l.id.slice(3), ty:'Payment', desk:'BimaOps', line:l,
      st: l.pay==='back'?'Details returned':(l.stage>=SALES_STAGES?'Closed':(l.pay==='shared'?'Shared with client':'With Ops')), tone: l.pay==='back'?'amber':(l.stage>=SALES_STAGES?'green':'violet'),
      raised:payRaisedAt(l), who:uname(l.soldBy||l.owner),
      pend: l.pay==='back'?'Payment details are in but the client has not been sent them yet.':'',
      act: l.pay==='back'?'share':'', actLbl:'Share with client'});
  }
  return out;
}
function allTickets(uid){ var out=[]; S.data.lines.forEach(function(l){ if(uid && l.owner!==uid) return; ticketsOf(l).forEach(function(t){out.push(t);}); }); return out; }
function ticketById(id){ var out=null; S.data.lines.forEach(function(l){ ticketsOf(l).forEach(function(t){ if(t.id===id) out=t; }); }); return out; }

/* the next action on a line — the S3 sentence, used by the line screen and by Home */
function nextAction(l){
  var st=l.stage, a=acctOf(l);
  if(dead(l)) return {tone:'neutral',lab:'Closed',txt:statusTx(l)+' at '+stageName(st),why:l.reason||'How far it got is preserved.',acts:[]};
  if(st>=SALES_STAGES) return postNextAction(l);
  if(l.status==='park') return {tone:'neutral',lab:'Parked',txt:'Revisit on '+fmtD(l.revisit),why:'The stage is unchanged — still at '+stageName(st)+'.',acts:[['resume','Resume']]};
  switch(st){
    case 1: return {tone:'amber',lab:'Next action',txt:'Nobody has spoken to them yet',why:'First contact can go straight to discovery if they are ready.',acts:[['ctc','First contact'],['call','Log a call manually']]};
    /* [stated 24 Sep · TBD-06] 10 calls is the cap; the tenth no-connect closes the line as Unreachable */
    case 2: return {tone:'amber',lab:'Next action',txt:plural(l.att,'call')+' logged. Reach the decision maker and capture the requirement',why:'Calls are counted per product line. '+(everConnected(l)?'This line has been reached, so the attempt ladder does not apply.':(ATTEMPT_CAP-l.att)+' of '+ATTEMPT_CAP+' attempts left — at '+ATTEMPT_CAP+' with no connect the system closes it as Unreachable.'),acts:[['ctc','Call'],['disc','Capture requirement'],['call','Log a call manually']]};
    case 3:
      /* [stated 24 Sep] a renewal is always an RFQ line. What it asks depends on whether there
         was an RFQ to carry over — there is none when the fresh buy was priced by the rater. */
      if(l.renews){ var rh=renPolHit(l), rwhy=rh?'Renewal of '+rh.p.id+' ('+rh.p.ins+') — '+renInTx(renDays(l))+'.':'';
        var src=renRfqSrc(l), rr=l.rfq&&l.rfq.f?rfqCount(l):{missing:0};
        if(rr.missing) return src==='carry'
          ? {tone:'amber',lab:'Next action',txt:'Complete the carried-over RFQ',why:rwhy+' Fill what is missing, or send it to the client to fill and confirm.',acts:[['tab:quotes','Open the RFQ'],['act:send','Send for client review'],['disc','Update details']]}
          : {tone:'amber',lab:'Next action',txt:'Fill the renewal RFQ — there is none to carry over',why:rwhy+(src==='dau'?' It was priced by the rater at the fresh buy, so no RFQ was ever raised. A renewal always goes to placement.':' It was not bought through the CRM, so there is no RFQ on record.')+' Fill it, or send it to the client to fill and confirm.',acts:[['tab:quotes','Fill the RFQ'],['act:send','Send for client review'],['disc','Update details']]};
        return {tone:'amber',lab:'Next action',txt:src==='carry'?'Check last year’s RFQ, then send it for the renewal':'The renewal RFQ is complete',why:rwhy+' Change what has changed. Send it to the client to confirm or change, or float it to placement.',acts:[['act:send','Send for client review'],['float','Float to placement'],['tab:quotes','Open the RFQ']]}; }
      if(l.rate===1) return {tone:'amber',lab:'Next action',txt:'Prices are in from '+QUOTES.dau.filter(function(q){return q.st==='quoted';}).length+' insurers. Pick what to send',why:'DAU line — the rater priced it from the requirement. No RFQ and no placement; the QCR is assembled here.',acts:[['qcr','Select quotes and send QCR'],['tab:quotes','See the rater’s quotes']]};
      var rc=l.rfq&&l.rfq.f?rfqCount(l):{missing:0};
      return rc.missing
        ? {tone:'amber',lab:'Next action',txt:'Fill the RFQ',why:'Fill in what you know. Send it to the client to complete the rest, or fill it all and float it yourself.',acts:[['tab:quotes','Fill the RFQ'],['act:send','Send for client review']]}
        : {tone:'amber',lab:'Next action',txt:'The RFQ is complete',why:'Send it to the client to review, or float it to placement.',acts:[['act:send','Send for client review'],['float','Float to placement']]};
    case 4: var rc4=l.rfq&&l.rfq.f?rfqCount(l):{missing:0}; return {tone:'blue',lab:'Waiting on the client',txt:'RFQ emailed to '+(l.contact.n||'the client')+' for review',why:rc4.missing?plural(rc4.missing,'required detail')+' left for them to fill, then they approve.':'Everything is filled — waiting for their approval.',acts:[['chase','Chase '+(l.contact.n||'the client')],['tab:quotes','Open the RFQ']]};
    case 5: return l.rate
      ? {tone:'amber',lab:'Next action',txt:'Prices are in from 3 insurers. Pick what to send',why:'No placement team on a rateable line, so the comparison is assembled here.',acts:[['qcr','Select quotes and send QCR']]}
      : {tone:'amber',lab:'Next action',txt:'The client approved the RFQ. Float it to placement',why:'',acts:[['float','Float to placement'],['tab:quotes','Review the RFQ']]};
    case 6:
      if(l.round>1) return {tone:'violet',lab:'Waiting on placement',txt:'Revision v'+l.round+' requested. Placement is reworking it',why:'Same ticket, new round.',acts:[]};
      return l.qAns ? {tone:'violet',lab:'Waiting on placement',txt:'Query answered. Placement is working the ticket',why:'',acts:[]}
                    : {tone:'amber',lab:'Next action',txt:'Placement has a query for you',why:'The ticket cannot move until it is answered.',acts:[['answerQ','Answer the query']]};
    /* [stated 24 Sep] sending it on is not the only route — the owner can download it and send it themselves */
    case 7: return {tone:'amber',lab:'Next action',txt:'QCR v'+l.round+' is back from placement. Review it',why:'Placement built it. You send it from here, download it and send it yourself, or send it back — you do not edit it.',acts:[['act:qcr','Review the QCR'],['shareQcr','Download and share myself']]};
    case 8: return {tone:'blue',lab:'Waiting on the client',txt:'QCR v'+l.round+' shared. Waiting for a decision',why:l.rate?'If they reject every quote, the line switches to the RFQ route.':'',acts:l.rate?[['confirm','Record client confirmation'],['rejectAll','Client rejected every quote'],['chase','Log follow-up']]:[['confirm','Record client confirmation'],['objectQcr','Client wants changes']]};
    case 9:
      if(a && a.prov) return {tone:'red',lab:'Blocked',txt:'PAN and GST are needed before a payment request',why:'Get the account verified.',acts:[['kyc','Get verified']]};
      if(l.pay==='ticket') return {tone:'violet',lab:'Waiting on Ops',txt:'PAY-'+l.id.slice(3)+' is with Ops',why:'',acts:[]};
      if(l.pay==='back') return {tone:'amber',lab:'Next action',txt:'Payment details are in. Check them and send them to the client',why:'Payment mode: '+payModeOf(l)+'.',acts:[['share','Share with client']]};
      return {tone:'amber',lab:'Next action',txt:'Client confirmed. Raise the payment request',why:'One request can cover several lines on the opportunity.',acts:[['pay','Raise payment request']]};
    case 10: return {tone:'blue',lab:'Waiting on the client',txt:'Payment details shared. Waiting for the payment screenshot',why:'Payment mode: '+payModeOf(l)+'. When the client sends the screenshot, upload it to confirm.',acts:[['proof','Confirm payment'],['share','Resend']]};
  }
  return {tone:'neutral',lab:'',txt:'',why:'',acts:[]};
}

/* home buckets — 11b-sales-home-logic.md */
var QUIET_DAYS=30;
function homeBuckets(uid){
  var lines=S.data.lines.filter(function(l){return l.owner===uid;}), used={}, b={fresh:[],late:[],move:[],quiet:[],rest:[]};
  var order={esc:0,over:1,today:2};
  myTasks(uid).forEach(function(t){ var st=taskState(t); if(order[st]!==undefined) b.late.push(t); });
  b.late.sort(function(x,y){ return (order[taskState(x)]-order[taskState(y)]) || (x.dueAt-y.dueAt); });
  lines.forEach(function(l){ if(openLine(l) && l.stage===1 && !attempts(l)){ b.fresh.push(l); used[l.id]=1; } });
  b.fresh.sort(function(x,y){return x.assignedAt-y.assignedAt;});
  lines.forEach(function(l){ if(used[l.id]||dead(l)||l.stage>=SALES_STAGES) return;
    if(l.status==='park'){ if(l.revisit<=S.now){ b.move.push(l); used[l.id]=1; } else b.rest.push(l); return; }
    if(actingParty(l)==='Us'){ b.move.push(l); used[l.id]=1; return; }
    if(daysQuiet(l)>=QUIET_DAYS){ b.quiet.push(l); used[l.id]=1; return; }
    b.rest.push(l); });
  b.move.sort(function(x,y){return daysInStage(y)-daysInStage(x);});
  b.quiet.sort(function(x,y){return daysQuiet(y)-daysQuiet(x);});
  return b;
}

/* search */
function search(q){
  q=(q||'').toLowerCase().replace(/\s+/g,''); if(!q) return {accounts:[],lines:[],opps:[],tickets:[],tasks:[]};
  var pl=function(x){return String(x||'').toLowerCase().replace(/\s+/g,'');};
  var accounts=S.data.accounts.filter(function(a){ return pl(a.n).indexOf(q)>=0||pl(a.pan).indexOf(q)>=0||pl(a.gst).indexOf(q)>=0||a.con.some(function(c){return pl(c.n).indexOf(q)>=0||pl(c.m).indexOf(q)>=0;}); });
  var lines=S.data.lines.filter(function(l){ return pl(l.id).indexOf(q)>=0||pl(l.product).indexOf(q)>=0||pl(acctName(l)).indexOf(q)>=0; });
  var opps=S.data.opps.filter(function(o){ return pl(o.id).indexOf(q)>=0||pl(o.name).indexOf(q)>=0; });
  var tickets=allTickets().filter(function(t){ return pl(t.id).indexOf(q)>=0; }).concat(S.data.svc.filter(function(t){ return pl(t.id).indexOf(q)>=0||pl(t.pol).indexOf(q)>=0; }));
  var tasks=S.data.tasks.filter(function(t){ return !t.done && pl(t.title).indexOf(q)>=0; });
  /* [stated 24 Sep · TBD-36] a policy is reachable from global search, on either of its numbers */
  var pols=[]; S.data.accounts.forEach(function(a){ (a.pols||[]).forEach(function(p){
    if(pl(p.id).indexOf(q)>=0||pl(p.pno).indexOf(q)>=0||pl(p.bkno).indexOf(q)>=0||pl(p.p).indexOf(q)>=0||pl(p.ins).indexOf(q)>=0||pl(a.n).indexOf(q)>=0) pols.push({a:a,p:p}); }); });
  return {accounts:accounts.slice(0,8),lines:lines.slice(0,12),opps:opps.slice(0,8),policies:pols.slice(0,8),tickets:tickets.slice(0,8),tasks:tasks.slice(0,8)};
}
