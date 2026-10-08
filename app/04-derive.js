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
  /* [stated 26 Sep · 17.5] Team view is the team, not the head's own book */
  return (u.role==='mgr'?teamOf(u.id):rmTeam(u.id)).map(function(x){return x.id;}); }
function inScope(uid,u){ return scopeIds(u).indexOf(uid)>=0; }
function homeRoute(u){ u=u||me(); if(!u) return 'home';
  if(u.role==='mgr') return teamView(u)?'team':'home';
  if(u.role==='rmhead') return teamView(u)?'rmteam':'rmhome';
  return u.role==='rm'?'rmhome':'home'; }
function stageName(n){ return STAGES[n-1]?STAGES[n-1].s:'?'; }
function skipped(l,n){ if(l.renews&&n<=2) return true; if(l.rate===1) return n>=4&&n<=7; if(l.rate===0&&l.rfq&&l.rfq.direct) return n===4||n===5; return false; } /* DUA: 3 → 8 · non-DUA floated directly: 3 → 6 */
function routeTx(l){ if(l.renews) return 'Non-DUA · renewal'; return l.rate===null||l.rate===undefined?'Route not known yet':(l.rate?'DUA':(l.routeSwitch?'Non-DUA · switched from DUA':'Non-DUA')); }
function statusTx(l){ return {open:'Open',park:'Time Pending',lost:'Lost',noapp:'No Appetite',disq:'Disqualified',withdrawn:'Withdrawn',unreach:'Unreachable'}[l.status]||l.status; }
function statusTone(l){ return l.status==='open'?'green':(l.status==='park'?'amber':'red'); }
/* [stated 26 Sep · 2.9] the opportunity name is <account legal name>_<opportunity id>, rendered at read time
   and never stored — so it follows the account's legal name, the rename on verification included. */
function oName(o){ if(!o) return ''; var a=by(S.data.accounts,o.acct); return (a?a.n:'')+'_'+o.id; }
function newOppId(){ return 'OPP-'+String(S.data.seq.opp++).padStart(6,'0'); }
function oppName(l){ var o=oppOf(l); if(o) return oName(o); return isRen(l)?'Renewal · '+(l.renews||''):(l.opp||'—'); }
function acctName(l){ var a=acctOf(l); return a?a.n:l.acct; }
function verified(a){ return !a.prov; }
function quotesFor(l){ return l.rate?dauQuotes(l):QUOTES.plc; }
function premOf(l){ if(l.picked){ var q=quotesFor(l).filter(function(x){return x.i===l.picked;})[0]; if(q&&q.p) return q.p; } return l.prem; }
function confirmed(l){ return l.stage>=9 && l.status==='open'; }

/* who must act on this line right now */
function actingParty(l){
  /* [stated 26 Sep · 2.1] waiting-on has three values only — Us, Client, Insurer. Placement, Ops
     and the post-purchase desk are internal, so a line waiting on them waits on Us. */
  if(dead(l)||l.stage===14) return '—';
  if(l.status==='park') return 'Client';
  if(l.stage>=SALES_STAGES){ var w=issWaiting(l); return (w==='Client'||w==='Insurer')?w:'Us'; }
  return STAGES[l.stage-1].w;
}
/* the hover on the waiting-on chip — how the value was derived */
function waitHow(l){ var w=actingParty(l);
  if(w==='—') return dead(l)?'Closed — nobody is waiting.':'Issued — nothing is outstanding.';
  if(l.status==='park') return 'Time Pending: the client asked us to come back on '+fmtD(l.revisit)+'.';
  if(l.stage===6) return 'Quote Requested: placement is an internal team, so the line waits on Us'+(l.plcQ&&!l.qAns&&l.round===1?' — and placement has a query for you':'')+'.';
  if(l.stage===9) return l.pay==='ticket'?'Purchase Requested: the payment ticket is with Ops, an internal team — so Us.':(l.pay==='back'?'Purchase Requested: the payment details are back and ours to send.':'Purchase Requested: the payment request is ours to raise.');
  if(l.stage>=SALES_STAGES) return 'Read from the post-purchase ticket'+(l.iss?' '+l.iss.id:'')+': '+(w==='Client'?'a document is with the client.':(w==='Insurer'?'the insurer owes a document.':'the next step is ours — the RM or the desk.'));
  return stageName(l.stage)+' waits on '+w+' by definition.';
}
function waitTone(w){ return w==='Us'?'amber':(w==='Client'?'blue':(w==='Placement'||w==='Ops'||w==='Insurer'||w==='Post-purchase'?'violet':'neutral')); }

/* activity clock: client-facing activity or a stage move */
/* [stated 27 Sep · 19.5 §7] calls, documents sent to the client, the client returning the RFQ, payment proof and stage moves */
var CLIENT_KINDS={call:1,email:1,rfq:1,qcr:1,pay:1,stage:1};
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
/* [stated 26 Sep · 5.5] every call is counted; only a no-connect counts as an attempt on the ladder */
function callsMade(l){ return l.calls!==undefined?l.calls:(l.att||0); }
function bumpCall(l,connected){ l.calls=callsMade(l)+1; if(!connected) l.att=(l.att||0)+1; return l.calls; }

/* tasks */
function taskState(t){
  if(t.done) return 'done';
  if(t.escAt && S.now>t.escAt && hasMgr(t.owner)) return 'esc';
  if(S.now>t.dueAt) return 'over';
  if(sameDay(workDate(S.now),t.dueAt) || (t.dueAt<=atH(workDate(S.now),WH.end).getTime() && t.dueAt>=S.now)) return 'today';
  return 'pending';
}
/* [stated 26 Sep · PD-069] an owner with no manager: the task stays Overdue, nobody is escalated to */
function hasMgr(uid){ var u=userById(uid); return !!(u&&u.mgr&&userById(u.mgr)); }
function taskTone(st){ return st==='esc'?'red':(st==='over'?'red':(st==='today'?'amber':(st==='done'?'green':'neutral'))); }
function taskStateTx(t){ var st=taskState(t);
  if(st==='esc'){ var u=userById(t.owner); return 'Escalated to '+uname(u.mgr)+' · '+fmt(t.escAt); }
  if(st==='over') return 'Overdue '+whTx(workMins(t.dueAt,S.now))+(t.escAt&&S.now>t.escAt&&!hasMgr(t.owner)?' · no manager to escalate to':'');
  if(st==='today') return 'Due '+fmt(t.dueAt);
  if(st==='done') return 'Done '+fmt(t.doneAt);
  return 'Due '+fmt(t.dueAt);
}
function myTasks(uid){ return S.data.tasks.filter(function(t){return t.owner===uid && !t.done;}); }
function escalatedTo(mgrId){ return S.data.tasks.filter(function(t){ if(t.done||taskState(t)!=='esc') return false; var u=userById(t.owner); return u && u.mgr===mgrId; }); }

/* the task engine lives in 14-rules.js: fireRules(l) runs every rule against the line */
function logAdd(l,t,m,kind,sys){ l.log.unshift({at:S.now,t:t,m:m||uname(S.user),sys:sys?1:0,kind:kind||'note'}); }
function moveStage(l,n,why){
  var from=l.stage; visitsOf(l);
  var cur=l.visits[l.visits.length-1]; if(cur&&!cur.out) cur.out=S.now;
  l.stage=n; l.enteredAt=S.now; l.visits.push({n:n,in:S.now});
  /* [stated 26 Sep · 2.1] every move is an activity entry: which stage, what caused it */
  logAdd(l,'Stage → '+stageName(n),'System · caused by '+(why||'a stage move')+' · from '+stageName(from),'stage',1);
  return fireRules(l,'stage',n);
}
/* entered-on / left-on for each stage the line has been in. Seed lines start with the current stage only. */
function visitsOf(l){ if(!l.visits) l.visits=[{n:l.stage,in:l.enteredAt||l.createdAt}]; return l.visits; }
function stageHover(l,s){ var v=visitsOf(l).filter(function(x){return x.n===s.n;});
  if(!v.length) return s.s+(s.n<l.stage?' · passed':' · not reached yet');
  return s.s+' · '+v.map(function(x){ return 'entered '+fmt(x.in)+(x.out?' · left '+fmt(x.out):' · here now'); }).join(' · '); }
/* [stated 26 Sep · 2.3] Time Pending returns to Open by itself on the revisit date */
function parkSweep(){ (S.data.lines||[]).forEach(function(l){ if(l.status==='park'&&l.revisit&&l.revisit<=S.now){ l.status='open'; var r=l.reason; l.reason=''; l.revisit=0; logAdd(l,'Status → Open','System · the revisit date came · was Time Pending ('+r+')','sys',1); fireRules(l); } }); }
function reopenOnCall(l){ if(l.status!=='park') return; var r=l.reason; l.status='open'; l.reason=''; l.revisit=0; logAdd(l,'Status → Open','System · a connected call on a Time Pending line · was '+r,'sys',1); }

/* [stated 26 Sep · 4.2] assignment runs on inbound only: a pool per product, round robin with a stored
   pointer, and a fallback user per product when the pool is empty. Provisional — the business has not
   confirmed the rule yet — so it is one replaceable function. Pools and fallbacks are configuration
   (19.2); the prototype has no screen for them. */
function poolFor(product){ var cat=CATOF[product]||'Property & casualty'; return (CAT_ROUTE[cat]||[]).filter(function(u){ var x=userById(u); return x&&x.active!==0; }); }
function assignPick(product){
  var pool=poolFor(product); if(!S.data.rr) S.data.rr={};
  if(!pool.length){ var fb=FALLBACK_USER[product]||'nikhil'; return {u:fb,how:'the '+product+' pool is empty, so the product’s fallback user'}; }
  var i=(S.data.rr[product]||0)%pool.length; S.data.rr[product]=i+1;
  return {u:pool[i],how:'next in rotation for '+product+' ('+(i+1)+' of '+pool.length+')'};
}
function assignFor(product){ return assignPick(product).u; }

/* [stated 26 Sep · 4.5 · 3.2] Newly assigned: a line nobody has called yet, an inbound line whatever stage it
   landed at, or a line reassigned to you — whatever its stage — until you do something on it */
function freshReassign(l){ if(!l.reAt||dead(l)) return false; var who=uname(l.owner); return !(l.log||[]).some(function(e){ return e.at>l.reAt&&String(e.m||'').indexOf(who)===0; }); }
function isNewly(l){ return (openLine(l)&&l.stage===1&&!attempts(l)&&!callsMade(l))||(l.inbound&&openLine(l)&&!callsMade(l))||freshReassign(l); }
function myTeam(u){ u=u||me(); return S.data.users.filter(function(x){ return x.mgr===u.id&&x.active!==0; }); }
function inMyTeam(uid,u){ var x=userById(uid); u=u||me(); return !!x&&x.mgr===u.id; }
/* permissions */
function canTakeOver(l){ var u=me(), o=userById(l.owner); return !!u&&!!o&&o.mgr===u.id&&l.owner!==u.id&&(openLine(l)||postLine(l)||l.status==='park'); }
function canAct(l){ var u=me(); return !!u && l.owner===u.id && !dead(l); }
function isMine(l){ var u=me(); return !!u && l.owner===u.id; }
function readOnlyWhy(l){ var u=me(); if(!u) return '';
  if(l.owner!==u.id){
    if(l.soldBy===u.id) return 'Sold by you. Owned by '+uname(l.owner)+' since payment — you keep read access.';
    return 'Owned by '+uname(l.owner)+'.'+(canTakeOver(l)?' You can see everything here; to work it, take ownership.':''); }
  if(dead(l)) return closedTx(l)+'. Closed at '+stageName(l.stage)+' — how far it got is preserved.';
  if(l.stage===14) return 'Issued. The policy copy and tax invoice went to the client on the three rails. Renewal is a separate opportunity.'; return ''; }
/* placement and payment tickets are derived from the line */
function ticketsOf(l){
  var out=[];
  if(!l.rate && l.stage>=6 && l.status!=='disq'){
    var closed=l.stage>=9||dead(l), q=(l.stage===6 && l.plcQ && !l.qAns && l.round===1 && !dead(l));
    out.push({id:'PLC-'+l.id.slice(3), ty:'Placement', desk:'BimaPlacement', line:l,
      st: closed?(l.stage>=9?'Closed · Quote selected':(l.status==='noapp'?'Closed · No appetite':'Closed · Lost')):(l.stage===7?'Response received':'Open'), tone: closed?(dead(l)&&l.stage<9?'neutral':'green'):(l.stage===7?'amber':'violet'),
      raised:plcRaisedAt(l), who:uname(l.owner),
      pend: q?'Placement has raised a query. Nothing moves until you answer it.':(l.stage===7&&!dead(l)?'QCR v'+l.round+' is back from placement. Review it.':''),
      act: q?'answerQ':(l.stage===7&&!dead(l)?'qcrPlc':''), actLbl: q?'Answer the query':(l.stage===7?'Review the QCR':'')});
  }
  if(l.iss) out.push(issTicket(l));
  if(l.pay!=='pre' && l.stage>=9 && !isChola(l)){
    out.push({id:payRef(l), ty:'Payment', desk:'BimaOps', line:l,
      st: l.pay==='back'?'Details returned':(l.stage>=SALES_STAGES?'Paid':(l.pay==='shared'?'Shared':'With Ops')), tone: l.pay==='back'?'amber':(l.stage>=SALES_STAGES?'green':'violet'),
      raised:payRaisedAt(l), who:uname(l.soldBy||l.owner),
      pend: l.payQ&&!l.payQ.ans?'Ops has a query for you.':(l.pay==='back'?'Payment details are in but the client has not been sent them yet.':''),
      act: l.payQ&&!l.payQ.ans?'payAnswer':(l.pay==='back'?'share':''), actLbl:l.payQ&&!l.payQ.ans?'Answer the query':'Share with client'});
  }
  return out;
}
function allTickets(uid){ var out=[]; S.data.lines.forEach(function(l){ if(uid && l.owner!==uid) return; ticketsOf(l).forEach(function(t){out.push(t);}); }); return out; }
function ticketById(id){ var out=null; S.data.lines.forEach(function(l){ ticketsOf(l).forEach(function(t){ if(t.id===id) out=t; }); }); return out; }

var QUOTE_VALID=30;
function payRef(l){ return l.payRef||('PAY-'+l.id.slice(3)); }
/* [stated 26 Sep · 2.3] terminal statement: <Status> · <reason> · <date> · <who> */
function closedTx(l){ var e=(l.log||[]).filter(function(x){ return /^Status (set to|→) /.test(x.t)&&!/Open$/.test(x.t); })[0];
  var when=l.closedAt||(e?e.at:0), who=l.closedBy?uname(l.closedBy):(e?String(e.m||'').split(' · ')[0]:'');
  return [statusTx(l),l.reason,when?fmtD(when):'',who].filter(Boolean).join(' · '); }
/* the next action on a line — the S3 sentence, used by the line screen and by Home */
function nextAction(l){
  var st=l.stage, a=acctOf(l);
  if(dead(l)) return {tone:'neutral',lab:'Closed',txt:closedTx(l),why:'Closed at '+stageName(st)+'. How far it got is preserved. A closed line is not reopened.',acts:[]};
  if(st>=SALES_STAGES) return postNextAction(l);
  if(l.status==='park') return {tone:'neutral',lab:'Time Pending',txt:'Time Pending — revisit on '+fmtD(l.revisit)+' · '+(l.reason||''),why:'The stage is unchanged — still at '+stageName(st)+'. It comes back to Open by itself on the revisit date, or when a call connects.',acts:[['resume','Resume']]};
  if(isChola(l)) return cholaSalesNext(l);
  switch((st===10&&l.pay!=='shared'&&l.pay!=='paid')?9:st){
    case 1: return {tone:'amber',lab:'Next action',txt:'Nobody has spoken to them yet',why:l.inbound?'They came in from the '+(l.src||'website')+' — call them while it is fresh.':'First contact can go straight to discovery if they are ready.',acts:[['ctc',l.inbound?'Call':'First contact'],['call','Log a call manually']]};
    /* [stated 24 Sep · TBD-06] 10 calls is the cap; the tenth no-connect closes the line as Unreachable */
    case 2: var rq2=reqCount(l), on2=reqOnlineN(l); return {tone:'amber',lab:'Next action',txt:on2&&!callsMade(l)?'Answered '+rq2.n+' of '+rq2.m+' online':(rq2.n&&rq2.miss.length?plural(rq2.miss.length,'discovery question')+' left. Call to complete':plural(callsMade(l),'call')+' logged. Reach the decision maker and capture the requirement'),why:(l.inbound&&!callsMade(l)?'Came in from the '+(l.src||'website')+' with the first steps done online — confirm them on the call. ':'')+'Calls are counted per product line. '+(everConnected(l)?'This line has been reached, so the attempt ladder does not apply.':(ATTEMPT_CAP-l.att)+' attempts left before this line closes as Unreachable.'),acts:[['ctc','Call'],['disc','Capture requirement'],['call','Log a call manually']]};
    case 3:
      /* [stated 24 Sep] a renewal is always an RFQ line. What it asks depends on whether there
         was an RFQ to carry over — there is none when the fresh buy was priced by the rater. */
      if(l.renews){ var rh=renPolHit(l), rwhy=rh?'Renewal due '+fmtD(rh.p.exp)+' · '+(rh.p.pno||rh.p.id)+' with '+rh.p.ins+'.':'';
        var src=renRfqSrc(l), rr=l.rfq&&l.rfq.f?rfqCount(l):{missing:0};
        if(rr.missing) return src==='carry'
          ? {tone:'amber',lab:'Next action',txt:'Complete the carried-over RFQ',why:rwhy+' Fill what is missing, or send it to the client to fill and confirm.',acts:[['tab:quotes','Open the RFQ']]}
          : {tone:'amber',lab:'Next action',txt:'Fill the renewal RFQ — there is none to carry over',why:rwhy+(src==='dau'?' It was priced by the rater at the fresh buy, so no RFQ was ever raised. A renewal always goes to placement.':' It was not bought through the CRM, so there is no RFQ on record.')+' Fill it, or send it to the client to fill and confirm.',acts:[['tab:quotes','Open the RFQ']]};
        return {tone:'amber',lab:'Next action',txt:src==='carry'?'Check last year’s RFQ, then send it for the renewal':'The renewal RFQ is complete',why:rwhy+' Change what has changed. Send it to the client to confirm or change, or float it to placement.',acts:[['act:send','Send for client review'],['float','Float to placement'],['tab:quotes','Open the RFQ']]}; }
      if(l.rate===1) return {tone:'amber',lab:'Next action',txt:l.webQuotes&&!callsMade(l)?'Saw '+l.webQuotes.length+' quotes online and stopped':'Prices are in from '+dauQuotes(l).filter(function(q){return q.st==='quoted';}).length+' insurers. Pick what to send',why:'DUA line — the rater priced it from the requirement. No RFQ and no placement; the QCR is assembled here.',acts:[['qcr','Select quotes and send QCR'],['tab:quotes','See the rater’s quotes']]};
      var rc=l.rfq&&l.rfq.f?rfqCount(l):{missing:0};
      /* [stated 26 Sep · 2.8] Float is shown disabled with the reason, not hidden */
      return {tone:'amber',lab:'Next action',txt:rc.missing?'Fill the RFQ':'The RFQ is complete',why:(l.routeSwitch&&/rater/i.test(l.routeSwitch.why)?'The rater returned no price for this risk — continue through placement. ':'')+(rc.missing?'Fill in what you know. Send it to the client to complete the rest, or fill it all and float it yourself.':'Send it to the client to review, or float it to placement.'),
        acts:[['tab:quotes','Open the RFQ'],['act:send','Send for client review'],['float','Float to placement',rc.missing?plural(rc.missing,'required field')+' still empty':'']]};
    case 4: var rc4=l.rfq&&l.rfq.f?rfqCount(l):{missing:0}, d4=daysInStage(l); return {tone:'blue',lab:'Waiting on the client',txt:'RFQ sent '+(d4?plural(d4,'day')+' ago':'today')+', not filled',why:'Sent to '+(l.contact.n||'the client')+'. '+(rc4.missing?plural(rc4.missing,'required detail')+' left for them to fill, then they approve.':'Everything is filled — waiting for their approval.'),acts:[['ctc','Chase'],['copylink','Copy link'],['resendRfq','Resend']]};
    case 5: return l.rate
      ? {tone:'amber',lab:'Next action',txt:'Prices are in from 3 insurers. Pick what to send',why:'No placement team on a rateable line, so the comparison is assembled here.',acts:[['qcr','Select quotes and send QCR']]}
      : {tone:'amber',lab:'Next action',txt:'Client approved the RFQ',why:'Float it to placement for quotes.',acts:[['float','Float to placement']]};
    case 6:
      var plc='PLC-'+l.id.slice(3), d6=daysBetween(plcRaisedAt(l),S.now);
      if(l.plcQ&&!l.qAns&&l.round===1) return {tone:'amber',lab:'Next action',txt:'Placement has a query for you',why:'Ticket '+plc+'. It cannot move until it is answered.',acts:[['answerQ','Answer the query']]};
      if(l.round>1) return {tone:'violet',lab:'With placement',txt:'Objection raised — revision v'+l.round+' with placement',why:(l.obj?'What was asked: '+l.obj+'. ':'')+'Same ticket '+plc+', new round.',acts:[['go:ticket:'+plc,'Open ticket']]};
      return {tone:'violet',lab:'With placement',txt:'Placement ticket '+plc+', open '+plural(d6,'day'),why:'Quotes land here when the ticket responds.',acts:[['go:ticket:'+plc,'Open ticket']]};
    /* [stated 24 Sep] sending it on is not the only route — the owner can download it and send it themselves */
    case 7: if(l.allDecl) return {tone:'red',lab:'Every insurer declined',txt:'No quotes came back on round '+l.round,why:'Nobody would write the risk. That is No Appetite — a supply failure — not Lost.',acts:[['noapp','Close as No Appetite']]};
      return {tone:'amber',lab:'Next action',txt:'Quotes are in',why:'QCR v'+l.round+' from placement. Send it from here, download it and send it yourself, or send it back — you do not edit it.',acts:[['act:qcr','Review and share the QCR'],['shareQcr','Download and share myself']]};
    case 8: var d8=daysInStage(l);
      /* [stated 26 Sep · 8.6] quotes are valid 30 days from delivery */
      if(d8>=QUOTE_VALID) return {tone:'red',lab:'Quotes expired',txt:'The quotes on QCR v'+l.round+' expired '+plural(d8-QUOTE_VALID,'day')+' ago',why:'An expired quote cannot be confirmed. '+(l.rate?'Ask the client whether to re-rate.':'Send the QCR back for fresh quotes.'),acts:l.rate?[['rejectAll','Client rejected every quote']]:[['objectQcr','Send the QCR back for revision']]};
      return {tone:'blue',lab:'Waiting on the client',txt:'Shared '+(d8?plural(d8,'day')+' ago':'today'),why:'QCR v'+l.round+' is with '+(l.contact.n||'the client')+'.'+(l.rate?' If they reject every quote, the line switches to the RFQ route.':''),acts:l.rate?[['confirm','Record client confirmation'],['rejectAll','Client rejected every quote'],['resendQcr','Resend']]:[['confirm','Record client confirmation'],['objectQcr','Send the QCR back for revision'],['resendQcr','Resend']]};
    case 9:
      if(a && a.prov) return {tone:'red',lab:'Blocked',txt:'The account is not KYC verified',why:'PAN and GST are needed before a payment request.',acts:[['kyc','Get verified']]};
      if(l.payQ&&!l.payQ.ans) return {tone:'amber',lab:'Next action',txt:'Ops has a query on '+payRef(l),why:'The ticket is on hold until you answer. The stage does not move.',acts:[['payAnswer','Answer the query'],['go:ticket:'+payRef(l),'Open ticket']]};
      if(l.pay==='pre'&&(l.payOld||[]).length&&!(a&&a.prov)) return {tone:'amber',lab:'Next action',txt:'The payment link expired unpaid',why:(l.payOld||[]).slice(-1)[0]+' was closed by Ops. Raise a new request — a ticket is never reopened.',acts:[['pay','Raise a new payment request']]};
      if(l.pay==='ticket') return {tone:'violet',lab:'With Ops',txt:'Payment ticket '+payRef(l)+' with ops',why:'Ops prepares the payment details. They come back here.',acts:[['go:ticket:'+payRef(l),'Open ticket']]};
      if(l.pay==='back') return {tone:'amber',lab:'Next action',txt:'Payment details received, not yet sent to the client',why:'Payment mode: '+payModeOf(l)+'.',acts:[['share','Share with client']]};
      return {tone:'amber',lab:'Next action',txt:'Ready for a payment request',why:'One request can cover several of your lines on the opportunity.',acts:[['pay','Raise payment request']]};
    case 10: var d10=daysInStage(l); return {tone:'blue',lab:'Waiting on the client',txt:'Shared '+(d10?plural(d10,'day')+' ago':'today')+'. Waiting for the payment screenshot',why:'Payment mode: '+payModeOf(l)+'. When the client sends the screenshot, upload it to confirm.',acts:[['proof','Confirm payment']]};
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
  lines.forEach(function(l){ if(isNewly(l)){ b.fresh.push(l); used[l.id]=1; } });
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
  /* [stated 26 Sep · 17.7] only what the user can open; trade name and contact email match too; each hit says what matched */
  var u=me(), why={};
  var accounts=S.data.accounts.filter(function(a){ if(a.merged||!canSeeAcct(a,u)) return false; var m=pl(a.n).indexOf(q)>=0?'name':(pl(a.trade).indexOf(q)>=0?'trade name':(pl(a.pan).indexOf(q)>=0?'PAN':(pl(a.gst).indexOf(q)>=0?'GSTIN':'')));
    if(!m) a.con.some(function(c){ if(pl(c.n).indexOf(q)>=0){ m='contact '+c.n; return true; } if(pl(c.m).replace(/\D/g,'').indexOf(q.replace(/\D/g,''))>=0&&q.replace(/\D/g,'').length>=4){ m='contact phone · '+c.n; return true; } if(pl(c.e).indexOf(q)>=0){ m='contact email · '+c.n; return true; } return false; });
    if(m) why[a.id]='matched on '+m; return !!m; });
  var lines=S.data.lines.filter(function(l){ return canSeeLine(l,u)&&(pl(l.id).indexOf(q)>=0||pl(l.product).indexOf(q)>=0||pl(acctName(l)).indexOf(q)>=0); });
  var opps=S.data.opps.filter(function(o){ return canSeeAcct(acctOf(o.acct),u)&&(pl(o.id).indexOf(q)>=0||pl(oName(o)).indexOf(q)>=0); });
  var tickets=allTickets().filter(function(t){ return canSeeLine(t.line,u)&&pl(t.id).indexOf(q)>=0; }).concat(S.data.svc.filter(function(t){ return canSeeAcct(acctOf(t.acct),u)&&(pl(t.id).indexOf(q)>=0||pl(t.pol).indexOf(q)>=0); }));
  var tasks=S.data.tasks.filter(function(t){ return !t.done && t.owner===u.id && pl(t.title).indexOf(q)>=0; });
  /* [stated 24 Sep · TBD-36] a policy is reachable from global search, on either of its numbers */
  var pols=[]; S.data.accounts.forEach(function(a){ (a.pols||[]).forEach(function(p){
    if(canSeeAcct(a,u)&&(pl(p.id).indexOf(q)>=0||pl(p.pno).indexOf(q)>=0||pl(p.bkno).indexOf(q)>=0||pl(p.p).indexOf(q)>=0||pl(p.ins).indexOf(q)>=0||pl(a.n).indexOf(q)>=0)) pols.push({a:a,p:p}); }); });
  return {why:why,accounts:accounts.slice(0,8),lines:lines.slice(0,12),opps:opps.slice(0,8),policies:pols.slice(0,8),tickets:tickets.slice(0,8),tasks:tasks.slice(0,8)};
}
