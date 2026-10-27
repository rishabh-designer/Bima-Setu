/* ==================================================================== *
 *  4 · Call tasks + click-to-call (v1, instead of the Ozonetel auto-dialer)
 *  Every required call is a task with Call Now. Not connected → the task
 *  closes and the next is created. Connected → one of six outcomes. Tasks
 *  close themselves when the opportunity leaves the stage or the status
 *  changes. Pending → Overdue → Escalated. LSQ tasks and advanced rules
 *  are the next build.
 * ==================================================================== */
var OUTCOMES=[
 {k:'decided',n:'Customer decided — update stage',d:'The customer decided on the call. You move the stage with the stage actions. No new call task.'},
 {k:'cb',n:'Call back later',d:'Date and time · a call task on that date'},
 {k:'act',n:'Customer to act',d:'Date and time, and a note · a call task on that date'},
 {k:'poc',n:'New POC',d:'Name, number, designation · the contact is updated · a call task to the new contact'},
 {k:'notint',n:'Not interested',d:'Lost reason · the status goes to Lost from the call'},
 {k:'def',n:'Deferred',d:'Revisit date · Time Pending from the call, and a call task on the revisit date'}];
var DISP0=DISP;
DISP=[{k:'nc',g:'A',n:'Not connected',d:'No connect'}].concat(OUTCOMES.map(function(o){ return {k:o.k,g:'B',n:o.n,d:o.d}; }));
var CT_UNITS=[['m','Minutes'],['h','Hours'],['d','Days']];
function ctMins(x){ x=x||[0,'m']; var n=+x[0]||0; return x[1]==='m'?n:(x[1]==='h'?n*60:n*(WH.end-WH.start)*60); }
function durU(x){ x=x||[0,'m']; var n=+x[0]||0, u=x[1]; return n+' '+(u==='m'?'min':(u==='h'?(n===1?'working hour':'working hours'):(n===1?'working day':'working days'))); }
function ctSeed(){ return [
  {id:'CT-WEB',kind:'web',stage:0,name:'First call · website drop-off',prod:[],route:'both',due:[5,'m'],again:[2,'h'],maxDay:3,stop:{mode:'leave'},esc:[1,'h'],on:1},
  {id:'CT-01',kind:'stage',stage:1,name:'New Lead · call',prod:[],route:'both',due:[15,'m'],again:[2,'h'],maxDay:3,stop:{mode:'afterN',n:15},esc:[4,'h'],on:1},
  {id:'CT-02',kind:'stage',stage:2,name:'Consultation Setup · call',prod:[],route:'both',due:[2,'h'],again:[4,'h'],maxDay:3,stop:{mode:'afterN',n:10},esc:[1,'d'],on:1},
  {id:'CT-03',kind:'stage',stage:3,name:'Details Captured · call',prod:[],route:'both',due:[1,'d'],again:[1,'d'],maxDay:2,stop:{mode:'afterN',n:6},esc:[1,'d'],on:1},
  {id:'CT-04',kind:'stage',stage:4,name:'RFQ with the client · chase call',prod:[],route:'NONDUA',due:[1,'d'],again:[2,'d'],maxDay:1,stop:{mode:'afterN',n:5},esc:[1,'d'],on:1},
  {id:'CT-05',kind:'stage',stage:8,name:'Quote Sent · follow-up call',prod:[],route:'both',due:[48,'h'],again:[48,'h'],maxDay:0,stop:{mode:'afterN',n:5},esc:[1,'d'],on:1},
  {id:'CT-06',kind:'stage',stage:9,name:'KYC Details Requested · call',prod:[],route:'both',due:[4,'h'],again:[1,'d'],maxDay:2,stop:{mode:'afterN',n:6},esc:[1,'d'],on:1},
  {id:'CT-07',kind:'stage',stage:11,name:'Payment details shared · payment chase',prod:[],route:'both',due:[6,'h'],again:[1,'d'],maxDay:2,stop:{mode:'afterN',n:5},esc:[1,'d'],on:1},
  {id:'CT-08',kind:'stage',stage:12,name:'Payment Completed · RM introduction call',prod:[],route:'both',due:[4,'h'],again:[1,'d'],maxDay:2,stop:{mode:'afterN',n:3},esc:[1,'d'],on:1},
  {id:'CT-09',kind:'stage',stage:13,name:'Policy Documents Pending · document call',prod:[],route:'both',due:[1,'d'],again:[2,'d'],maxDay:1,stop:{mode:'afterN',n:5},esc:[2,'d'],on:1},
  /* [stated 27 Oct] the ABM's post-sales task rules (were AR-01…AR-04) now live here, Role = ABM */
  {id:'CT-10',kind:'todo',stage:12,name:'Introduce yourself to {contact} as {customer}’s ABM',prod:[],route:'both',due:[1,'d'],again:[1,'d'],maxDay:0,max:1,close:'done',esc:[0,'h'],team:'abm',on:1},
  {id:'CT-11',kind:'todo',stage:13,name:'Follow up with {contact} on the proposal form and mandate for {product}',prod:[],route:'both',due:[2,'d'],again:[1,'d'],maxDay:0,max:1,close:'done',esc:[0,'h'],team:'abm',on:1},
  {id:'CT-12',kind:'todo',stage:15,name:'Check {contact} received the {product} policy copy',prod:[],route:'both',due:[1,'d'],again:[1,'d'],maxDay:0,max:1,close:'done',esc:[0,'h'],team:'abm',on:1},
  {id:'CT-13',kind:'renew',stage:12,days:60,name:'Plan the {product} renewal for {customer} with the RM',prod:[],route:'both',due:[1,'d'],again:[1,'d'],maxDay:0,max:1,close:'done',esc:[0,'h'],team:'abm',on:1}]; }
function otSeed(){ return [
  {id:'OT-DEC',out:'decided',name:'',task:0},
  {id:'OT-CB',out:'cb',name:'Call back',task:1,on:1,esc:[2,'h'],prod:[],route:'both'},
  {id:'OT-CA',out:'act',name:'Customer to act · follow-up call',task:1,on:1,esc:[4,'h'],prod:[],route:'both'},
  {id:'OT-NP',out:'poc',name:'Call the new POC',task:1,on:1,due:[15,'m'],esc:[2,'h'],prod:[],route:'both'},
  {id:'OT-NI',out:'notint',name:'',task:0},
  {id:'OT-DF',out:'def',name:'Deferred · revisit call',task:1,on:1,esc:[1,'d'],prod:[],route:'both'}]; }
function ctById(id){ return by(S.data.ctasks||[],id)||by(S.data.otasks||[],id); }
function isWebLine(l){ return !!l&&(l.src==='Website'||!!l.inbound); }
function isConn(l){ return !!l.conn||everConnected(l); }
function ctApplies(c,l){ if(c.prod&&c.prod.length&&c.prod.indexOf(l.product)<0) return false; if(c.route==='DUA'&&l.rate!==1) return false; if(c.route==='NONDUA'&&l.rate!==0) return false; return true; }
function ctStageCfg(l){ return (S.data.ctasks||[]).filter(function(c){ return c.kind==='stage'&&c.on&&c.stage===l.stage&&ctApplies(c,l); })[0]||null; }
function ctLastDone(l){ var ts=tasksOfLine(l.id).filter(function(t){ return t.ct&&t.done; }).sort(function(a,b){return b.doneAt-a.doneAt;}); return ts[0]||null; }
function ctStopped(c,l){ var s=c.stop||{mode:'leave'};
  if(s.mode==='afterN'&&(l.miss||0)>=(+s.n||0)) return 'limit';
  if(s.mode==='afterPeriod'){ var first=tasksOfLine(l.id).filter(function(t){return t.ct===c.id&&t.ctStage===l.stage;}).sort(function(a,b){return a.createdAt-b.createdAt;})[0]; if(first&&S.now>addWork(first.createdAt,ctMins(s.period))) return 'period'; }
  if(s.mode==='whenTask'&&s.task&&tasksOfLine(l.id).some(function(t){ return t.ct===s.task&&t.done&&t.doneBy!=='system'; })) return 'task';
  return ''; }
function ctLimitHit(l){ if(!S.data.ctasks) return false; var c=ctStageCfg(l); return !!c&&ctStopped(c,l)==='limit'&&!tasksOfLine(l.id).some(function(t){return !t.done&&t.ct;}); }
/* [stated 27 Oct] post-purchase tasks (stage 12+) go to the RM, the ABM, or both.
   Both = one task each, linked: when either is done the other closes too. */
function ctFill(tx,l,a,p){ a=a||(l?acctOf(l):null); var c=(l&&l.contact&&l.contact.n)||(((a&&a.con)||[])[0]||{}).n||'the client';
  return String(tx||'').replace(/\{customer\}/g,a?shortName(a.n):'the customer').replace(/\{contact\}/g,c).replace(/\{product\}/g,l?l.product:(p?p.p:'')); }
var CT_TEAM=[['rm','RM'],['abm','ABM'],['both','ABM and RM']];
function ctSecOf(c){ return c.kind!=='web'&&(c.kind==='renew'||c.stage>=SALES_STAGES)?'Post-sales':'Sales'; }
function ctSecRow(c,prev){ var k=ctSecOf(c); if(prev&&ctSecOf(prev)===k) return ''; return '<tr class="ctsec"><td colspan="8">'+esc(k)+'<span>'+(k==='Sales'?'website drop-off and stages 1–11 · the opportunity’s owner':'stage 12 onwards · the RM, the ABM or both')+'</span></td></tr>'; }
/* extra stage options the ABM glue adds (ABM pre-sales stages) — only when adding a task */
var CT_EXTRA_STAGES=[];
function ctRoleTx(c){ if(c.kind==='web'||(c.kind!=='renew'&&c.stage<SALES_STAGES)) return 'Sales or RM'; var k=c.team||'rm'; return k==='abm'?'ABM':(k==='both'?'ABM and RM':'RM'); }
function ctTeamTx(c){ var k=c.stage>=SALES_STAGES?(c.team||'rm'):''; return k==='abm'?'the ABM':(k==='both'?'the RM and the ABM':(k==='rm'?'the RM':'the owner')); }
function ctOwners(c,l){ return ctOwnersA(c,acctOf(l),l.owner); }
function ctOwnersA(c,a,own){ var l={owner:own}, k=(c.stage>=SALES_STAGES&&c.kind!=='web')?(c.team||'rm'):'rm', abm=a&&a.abm&&userById(a.abm)?a.abm:'';
  if(k==='abm') return abm?[{u:abm,role:'ABM'}]:[{u:l.owner,role:'RM',note:'No ABM on the account yet — given to the RM'}];
  if(k==='both') return abm&&abm!==l.owner?[{u:l.owner,role:'RM'},{u:abm,role:'ABM'}]:[{u:l.owner,role:'RM',note:abm?'':'No ABM on the account yet — RM only'}];
  return [{u:l.owner,role:'RM'}]; }
function ctPairSweep(l){ S.data.tasks.forEach(function(t){ if(t.done||!(t.pair||t.pairOf)) return; var o=by(S.data.tasks,t.pair||t.pairOf); if(!o||!o.done) return;
  t.done=1; t.doneAt=o.doneAt; t.doneBy=o.doneBy==='system'?'system':o.doneBy; t.missed=o.missed; t.closeWhy=o.doneBy==='system'?(o.closeWhy||'Closed by itself'):((o.ct?'Handled':'Done')+' by '+uname(o.doneBy)+' · shared task'+(o.closeWhy?' · '+o.closeWhy:'')); }); }
/* renewal to-do: when a policy is within N days of expiry, once per policy */
function ctRenewSweep(){ var n=0; if(!S.data||!S.data.ctasks||!S.data.accounts) return 0;
  S.data.ctasks.forEach(function(c){ if(c.kind!=='renew'||!c.on) return;
    S.data.accounts.forEach(function(a){ (a.pols||[]).forEach(function(p){ if(p.issuing||p.expired||!p.exp) return; var d=daysBetween(S.now,p.exp); if(d<0||d>(+c.days||60)) return;
      var key=c.id+':'+p.id; if(S.data.tasks.some(function(t){ return t.rk===key; })) return; var l=p.line?lineById(p.line):null; if(l&&!ctApplies(c,l)) return;
      var own=ctOwnersA(c,a,a.own), first=null, due=addWork(S.now,ctMins(c.due));
      own.forEach(function(x,i){ var t={id:'T-'+(S.data.seq.task++),line:l?l.id:null,acct:l?null:a.id,owner:x.u,title:ctFill(c.name,l,a,p),desc:[x.note,own.length>1?'Shared with '+uname(own[1-i].u)+' ('+own[1-i].role+')':''].filter(Boolean).join(' · ')+(p.exp?(x.note||own.length>1?' · ':'')+'Policy expires '+fmtD(p.exp):''),cls:'To-do',createdAt:S.now,dueAt:due,escAt:(c.esc&&+c.esc[0]>0)?addWork(due,ctMins(c.esc)):0,done:0,doneAt:0,doneBy:'',rule:'',td:c.id,rk:key,ctStage:l?l.stage:0,seen:'pending'};
        S.data.tasks.push(t); if(!first) first=t; else { first.pair=t.id; t.pairOf=first.id; } n++; }); }); }); });
  return n; }
function ctPushTeam(l,c,mk){ var own=ctOwners(c,l), first=null, tk=(c.stage>=SALES_STAGES&&c.kind!=='web')?(c.team||'rm'):'';
  own.forEach(function(x,i){ var t=mk(x); if(tk) t.team=tk; if(x.note) t.desc=(t.desc?t.desc+' · ':'')+x.note; if(own.length>1) t.desc=(t.desc?t.desc+' · ':'')+'Shared with '+uname(own[1-i].u)+' ('+own[1-i].role+')';
    if(!first) first=t; else { first.pair=t.id; t.pairOf=first.id; } }); return first; }
/* [stated 27 Oct] a follow-up from a call goes to the same people as the call task it came from:
   RM → RM, ABM → ABM, ABM and RM → both. No call task behind it → the opportunity's owner. */
var CT_OUT_TEAM='';
function ctPush(l,c,due,o){ o=o||{}; if(o.kind!=='outcome') return ctPushTeam(l,c,function(x){ return ctPush1(l,c,due,o,x.u); });
  if(CT_OUT_TEAM&&l.stage>=SALES_STAGES) return ctPushTeam(l,{stage:l.stage,kind:'stage',team:CT_OUT_TEAM},function(x){ return ctPush1(l,c,due,o,x.u); });
  return ctPush1(l,c,due,o,l.owner); }
function ctPush1(l,c,due,o,owner){
  var t={id:'T-'+(S.data.seq.task++),line:l.id,acct:null,owner:owner,title:o.title||ctFill(c.name,l),desc:o.desc||'',cls:'Call',createdAt:S.now,dueAt:due,escAt:(c.esc&&+c.esc[0]>0)?addWork(due,ctMins(c.esc)):0,done:0,doneAt:0,doneBy:'',rule:'',ct:c.id,ctKind:o.kind||c.kind,ctStage:l.stage,ctStatus:o.status||'open',seen:'pending'};
  S.data.tasks.push(t); rlog('make',l,'Call task created · “'+t.title+'”',c.id+' · for '+uname(owner)+' · due '+fmt(due)); return t; }
function ctMake(l,c){ var last=ctLastDone(l), missed=!!(last&&last.missed&&last.ctStage===l.stage);
  var due=addWork(S.now,ctMins(missed?(c.again||c.due):c.due));
  if(+c.maxDay>0){ var n=tasksOfLine(l.id).filter(function(t){ return t.ct===c.id&&!t.pairOf&&sameDay(t.dueAt,due); }).length;
    if(n>=+c.maxDay){ var d=new Date(due); do{ d.setDate(d.getDate()+1); }while(!isWorkDay(d)); due=atH(d,WH.start).getTime(); } }
  return ctPush(l,c,due); }
/* the engine: every event on an opportunity, and the hourly / daily checks, end here */
/* [stated 27 Oct] to-do tasks: a stage task closed by Mark done, beside the call task.
   Its own task (t.td), not a call task (t.ct), so the call engine never touches it. */
var TD_CLOSE=[['stage','Marked done, or the opportunity leaves the stage'],['done','Only when marked done — even if the opportunity moves on']];
function tdCloseTx(c){ return c.close==='done'?'Only when marked done':'Marked done, or it leaves the stage'; }
function tdRun(l){ if(!l||!S.data||!S.data.ctasks) return;
  tasksOfLine(l.id).forEach(function(t){ if(t.done||!t.td) return; var c=ctById(t.td)||{}, why='';
    if(dead(l)) why='the opportunity closed';
    else if(c.close!=='done'){ if(t.ctStage!==l.stage) why='the opportunity left '+stageName(t.ctStage); else if(l.status!=='open') why='the status changed'; }
    if(why){ t.done=1; t.doneAt=S.now; t.doneBy='system'; t.closeWhy='Closed by itself — '+why; } });
  if(dead(l)||l.status!=='open') return;
  (S.data.ctasks||[]).forEach(function(c){ if(c.kind!=='todo'||!c.on||c.stage!==l.stage||!ctApplies(c,l)) return;
    var since=l.enteredAt||0, mine=tasksOfLine(l.id).filter(function(t){ return t.td===c.id&&!t.pairOf&&t.ctStage===l.stage&&t.createdAt>=since; });
    if(mine.some(function(t){ return !t.done; })) return;
    if(+c.max>0&&mine.length>=+c.max) return;
    var last=mine.filter(function(t){return t.done;}).sort(function(a,b){return b.doneAt-a.doneAt;})[0];
    var due=last?addWork(last.doneAt,ctMins(c.again)):addWork(S.now,ctMins(c.due));
    ctPushTeam(l,c,function(x){ var t={id:'T-'+(S.data.seq.task++),line:l.id,acct:null,owner:x.u,title:ctFill(c.name,l),desc:'',cls:'To-do',createdAt:S.now,dueAt:due,escAt:(c.esc&&+c.esc[0]>0)?addWork(due,ctMins(c.esc)):0,done:0,doneAt:0,doneBy:'',rule:'',td:c.id,ctStage:l.stage,seen:'pending'};
      S.data.tasks.push(t); rlog('make',l,'To-do created · “'+t.title+'”',c.id+' · for '+uname(x.u)+' · due '+fmt(due)); return t; }); }); }
function ctRun(l){ var made=[]; if(!l||!S.data||!S.data.ctasks) return made; ctPairSweep(l); tdRun(l);
  tasksOfLine(l.id).forEach(function(t){ if(t.done||!t.ct) return; var why='';
    if(dead(l)) why='the opportunity closed'; else if(t.ctStage!==l.stage) why='the opportunity left '+stageName(t.ctStage); else if(t.ctStatus!=='any'&&l.status!==t.ctStatus) why='the status changed';
    if(why){ t.done=1; t.doneAt=S.now; t.doneBy='system'; t.closeWhy='Closed by itself — '+why; } });
  if(dead(l)||l.status!=='open') return made;
  if(tasksOfLine(l.id).some(function(t){ return !t.done&&t.ct; })) return made;
  if(l.ctHold===l.stage) return made;
  var c=null;
  if(isWebLine(l)&&!isConn(l)&&l.stage<SALES_STAGES){ c=(S.data.ctasks||[]).filter(function(x){return x.kind==='web';})[0]||null; }
  else { c=ctStageCfg(l); if(c&&l.stage===1&&!isWebLine(l)) c=null; /* a line created by hand gets no first-call task — the First call button does it */ }
  if(!c||!c.on) return made;
  if(ctStopped(c,l)) return made;
  made.push(ctMake(l,c)); return made; }
function otCfg(out){ return (S.data.otasks||[]).filter(function(x){return x.out===out;})[0]||null; }
function otMake(l,out,due,desc){ var c=otCfg(out); if(!c||!c.task||!c.on||!ctApplies(c,l)) return null;
  /* the outcome task takes priority: an open stage task on the line closes */
  tasksOfLine(l.id).forEach(function(t){ if(!t.done&&t.ct&&t.ctKind!=='outcome'){ t.done=1; t.doneAt=S.now; t.doneBy='system'; t.closeWhy='Replaced by the call outcome task'; } });
  return ctPush(l,c,due,{title:c.name+(out==='poc'?' · '+(l.contact.n||''):''),desc:desc||'',kind:'outcome',status:out==='def'?'any':'open'}); }
/* the old rule engine hands every event to the call-task engine */
function runRules(kind,lines){ var made=[]; (lines||[]).forEach(function(l){ made=made.concat(ctRun(l)); }); return made; }
function primeRules(){ if(!S.data.ctasks) S.data.ctasks=ctSeed(); if(!S.data.otasks) S.data.otasks=otSeed(); S.data.tasks=S.data.tasks.filter(function(t){ return !t.rule; }); liveLines().forEach(function(l){ ctRun(l); }); }
function reachedOnce(l){ return everConnected(l)||!!l.req||l.stage>=3||callsMade(l)>0; }

/* ---------- the call: not connected closes the task; connected asks for the outcome ---------- */
function ctcIds(l,taskId){ return 'Ozonetel click-to-call from your DID · rings '+esc((l.contact||{}).m||'the number on file')+' directly · sends '+(taskId?'task '+esc(taskId)+' and ':'')+esc(l.id)+' so the result comes back to '+(taskId?'the task':'the opportunity'); }
function ctOpenTask(l,taskId){ var t=taskId?by(S.data.tasks,taskId):null; if(!t||t.done) t=tasksOfLine(l.id).filter(function(x){return !x.done&&x.ct;})[0]||null; return t; }
function callMissed(l,res,taskId){ var made=[];
  var ok=write(function(){ var n=bumpCall(l,false); l.miss=(l.miss||0)+1; var lab=(CTC_END[res.k]||{lab:'No answer'}).lab;
    var t=ctOpenTask(l,taskId);
    logAdd(l,'Call · Not connected',uname(S.user)+' · call '+n+' · not connected · '+lab.toLowerCase()+' · Ozonetel click-to-call'+(t?' · task '+t.id:''),'call');
    if(t){ t.done=1; t.doneAt=S.now; t.doneBy='system'; t.closeWhy='Not connected — the next call task is created'; t.missed=1; }
    if(l.stage===1) made=made.concat(moveStage(l,2,'First call attempt — not connected'));
    made=made.concat(ctRun(l)); },'the call');
  return ok?made:null; }
function ctcAfter(l,res,taskId){ if(l.stage===1){ openFlow('firstCall',{line:l.id,ctc:res,task:taskId}); return; } if(res&&res.con){ openFlow('call',{line:l.id,ctc:res,task:taskId}); return; }
  var made=callMissed(l,res||{},taskId); closeFlow(); paint();
  if(made) toast('Not connected — logged',made.length?'The task closed. Next call due '+fmt(made[made.length-1].dueAt)+'.':(ctLimitHit(l)?'The missed-call limit is reached — no new call task. Mark it Lost if it is over.':'The task closed.')); }
function outErr(){ var e={}, d=S.sel.d, was=function(k){ return S.sel[k]!==undefined; };
  if(d==='cb'||d==='act'){ if(was('ot')&&S.sel.ot){ var t=new Date(S.sel.ot).getTime(), dd=new Date(t); if(t<=S.now) e.ot='Pick a future time.'; else if(!isWorkDay(dd)||dd.getHours()<WH.start||dd.getHours()>=WH.end) e.ot='Pick a time within working hours ('+WH.start+':00–'+WH.end+':00, working days).'; } }
  if(d==='poc'){ if(was('pm')&&(S.sel.pm||'').trim()&&digits(S.sel.pm).length<10) e.pm='That does not look like a phone number.'; }
  if(d==='def'){ if(was('rv')&&S.sel.rv&&S.sel.rv<=ymd(S.now)) e.rv='Pick a date after today.'; }
  return e; }
function outReady(){ var d=S.sel.d; if(!d) return false; var e=outErr(); for(var k in e) return false;
  if(d==='cb'||d==='act'){ if(!S.sel.ot) return false; if(d==='act'&&!(S.sel.on||'').trim()) return false; }
  if(d==='poc'&&(!(S.sel.pn||'').trim()||digits(S.sel.pm).length<10||!(S.sel.pd||'').trim())) return false;
  if(d==='notint'&&!S.sel.nrs) return false;
  if(d==='def'&&!S.sel.rv) return false;
  return true; }
FLOWS.call={t:'Call outcome', sub:'The call connected and is on the record. Pick what happened — this cannot be skipped.',
  locked:function(){ return true; }, nocancel:function(){ return true; }, repaintOn:['nrs'],
  body:function(){ var l=FL(), e=outErr();
    var sub=function(k){
      if(k==='cb'||k==='act') return '<div class="subform">'+field(k==='cb'?'Call back on':'Next call on','<input class="inp" id="f_ot" data-f="ot" type="datetime-local" min="'+esc(dtLocal(S.now))+'" value="'+esc(S.sel.ot||'')+'">','A future time within working hours. The call task is due exactly then.',e.ot)+(k==='act'?field('What the customer has to do',input('on',S.sel.on,'Send the signed proposal form · pay by Friday · share the KYC documents')):'')+'</div>';
      if(k==='poc') return '<div class="subform"><div class="fgrid">'+field('Name',input('pn',S.sel.pn,'Rahul Mehta'))+field('Number',input('pm',S.sel.pm,'+91 98200 44112'),'',e.pm)+'</div>'+field('Designation',input('pd',S.sel.pd,'Finance Head'))+'</div>';
      if(k==='notint') return '<div class="subform">'+field('Lost reason',select('nrs',S.sel.nrs||'',[['','Choose a reason']].concat(LOSS)),'The status goes to Lost from the call. The stage is kept.')+'</div>';
      if(k==='def') return '<div class="subform">'+field('Revisit on','<input class="inp" id="f_rv" data-f="rv" type="date" min="'+ymd(S.now+86400000)+'" value="'+esc(S.sel.rv||'')+'">','Time Pending until then, with a call task on that date.',e.rv)+'</div>';
      return ''; };
    return ctcStrip(S.sel.ctc)+OUTCOMES.map(function(o){ return opt('data-pick="'+o.k+'"',S.sel.d===o.k,o.n,esc(o.d))+(S.sel.d===o.k?sub(o.k):''); }).join(''); },
  can:outReady, ok:'Log the outcome',
  run:function(){ var l=FL(), d=S.sel.d, o=OUTCOMES.filter(function(x){return x.k===d;})[0], res=S.sel.ctc||{}, a=acctOf(l), msg='';
    var ok=write(function(){ var n=bumpCall(l,true); l.miss=0; l.conn=1; l.lastDisp=o.n; var t=ctOpenTask(l,S.sel.task), extra='';
      if(d==='cb'||d==='act') extra=' · next call '+fmt(new Date(S.sel.ot).getTime())+(d==='act'?' · '+S.sel.on.trim():'');
      if(d==='poc') extra=' · new POC '+S.sel.pn.trim()+', '+S.sel.pd.trim()+' · '+S.sel.pm.trim();
      if(d==='notint') extra=' · '+S.sel.nrs; if(d==='def') extra=' · revisit '+fmtD(new Date(S.sel.rv+'T10:00:00').getTime());
      logAdd(l,'Call · '+o.n,uname(S.user)+' · call '+n+' · connected · '+durTx(res.dur||0)+' · Ozonetel click-to-call'+(t?' · task '+t.id:'')+extra,'call');
      if(t){ t.done=1; t.doneAt=S.now; t.doneBy=S.user; t.closeWhy='Connected · '+o.n; }
      reopenOnCall(l);
      if(l.stage===1) moveStage(l,2,'First call attempt — connected');
      l.ctHold=0;
      if(d==='decided'){ l.ctHold=l.stage; msg='No new call task. Move the stage with the stage actions — the new stage’s tasks start then.'; }
      if(d==='cb'||d==='act'){ var due=new Date(S.sel.ot).getTime(); otMake(l,d,due,d==='act'?S.sel.on.trim():''); msg='Call task due '+fmt(due)+'.'; }
      if(d==='poc'){ var c={n:S.sel.pn.trim(),d:S.sel.pd.trim(),m:S.sel.pm.trim(),e:''}; if(!a.con.some(function(x){return digits(x.m).slice(-10)===digits(c.m).slice(-10);})){ a.con.push(c); acctLog(a,'Contact added: '+c.n,uname(S.user)+' · new POC on a call · '+l.product); }
        var was=l.contact.n; l.contact={n:c.n,e:'',m:c.m}; logAdd(l,'Contact on this opportunity changed to '+c.n,'System · '+c.d+' · '+c.m+(was?' · was '+was:''),'sys',1);
        var oc=otCfg('poc'); otMake(l,'poc',addWork(S.now,ctMins((oc&&oc.due)||[15,'m']))); msg='A call task to '+c.n+' is set.'; }
      if(d==='notint'){ l.status='lost'; l.reason=S.sel.nrs; l.closedAt=S.now; l.closedBy=S.user; logAdd(l,'Status → Lost',uname(S.user)+' · from the call · '+S.sel.nrs,'sys'); var op=oppOf(l); if(op) oppLog(op,'Opportunity closed · Lost',uname(S.user)+' · '+S.sel.nrs); msg='Lost · '+S.sel.nrs+'. The stage is kept at '+stageName(l.stage)+'.'; }
      if(d==='def'){ var rv=new Date(S.sel.rv+'T10:00:00').getTime(); l.status='park'; l.reason='Deferred on the call'; l.revisit=rv; logAdd(l,'Status → Time Pending',uname(S.user)+' · from the call · revisit '+fmtD(rv),'sys'); otMake(l,'def',rv); msg='Time Pending until '+fmtD(rv)+' · a call task on that date.'; }
      ctRun(l); },'the call');
    if(!ok) return 'fail'; toast('Call logged — '+o.n,msg); }};
HANDLERS.push(function(t){ var x=t.closest('[data-flow="ctc"][data-task]'); if(!x) return false; if(x.disabled) return true; openFlow('ctc',{line:x.dataset.line,task:x.dataset.task}); return true; });

/* ---------- the task card: name, account, opportunity, POC, status, escalates in, Call Now ---------- */
function ctStatusOf(t){ var st=taskState(t); return t.done?['Done','green']:(st==='esc'?['Escalated','red']:(st==='over'?['Overdue','red']:['Pending','neutral'])); }
function ctEscTx(t){ if(t.done) return ''; var st=taskState(t); if(st==='esc'){ var u=userById(t.owner); return 'escalated to '+uname(u&&u.mgr); } if(!t.escAt) return 'never escalates'; return 'escalates in '+whTx(workMins(S.now,t.escAt)); }
function ctCard(t,opts){ opts=opts||{}; var l=t.line?lineById(t.line):null; if(!l) return taskRow0(t,opts); var a=acctOf(l), c=l.contact||{}, s=ctStatusOf(t), mine=t.owner===S.user&&!t.done;
  return '<div class="ctrow"><div class="bd"><b>'+esc(t.title)+'</b> <span class="meta mono">'+esc(t.id)+'</span>'+(opts.who||t.owner!==S.user?' <span class="meta">· '+esc(uname(t.owner))+'</span>':'')+
    '<div class="m"><button class="link" data-go="acct" data-id="'+a.id+'">'+esc(shortName(a.n))+'</button> · <button class="link" data-go="line" data-id="'+l.id+'">'+esc(l.id)+'</button> · '+esc(c.n||'—')+' <span class="mono">'+esc(c.m||'')+'</span></div>'+
    '<div class="m2">'+chip(s[0],s[1],true,true)+' <span class="meta">'+esc(t.done?((t.closeWhy||'')+' · '+fmt(t.doneAt)):('due '+fmt(t.dueAt)+' · '+ctEscTx(t)))+'</span></div>'+(t.desc?'<div class="m2">'+esc(t.desc)+'</div>':'')+'</div>'+
    '<div class="rt">'+(mine?'<button class="btn sm primary" data-flow="ctc" data-line="'+l.id+'" data-task="'+t.id+'">'+ic('phone')+'Call Now</button>':'')+'</div></div>'; }
function tdCard(t,opts){ opts=opts||{}; var l=lineById(t.line); if(!l) return taskRow0(t,opts); var a=acctOf(l), c=l.contact||{}, s=ctStatusOf(t), mine=t.owner===S.user&&!t.done;
  return '<div class="ctrow"><div class="bd"><b>'+esc(t.title)+'</b> <span class="meta mono">'+esc(t.id)+'</span>'+(opts.who||t.owner!==S.user?' <span class="meta">· '+esc(uname(t.owner))+'</span>':'')+
    '<div class="m"><button class="link" data-go="acct" data-id="'+a.id+'">'+esc(shortName(a.n))+'</button> · <button class="link" data-go="line" data-id="'+l.id+'">'+esc(l.id)+'</button> · '+esc(c.n||'—')+'</div>'+
    '<div class="m2">'+chip(s[0],s[1],true,true)+' '+chip('To-do','neutral',false,true)+' <span class="meta">'+esc(t.done?((t.closeWhy||(t.doneBy&&t.doneBy!=='system'?'Marked done by '+uname(t.doneBy):''))+' · '+fmt(t.doneAt)):('due '+fmt(t.dueAt)+' · '+ctEscTx(t)))+'</span></div></div>'+
    '<div class="rt">'+(mine?'<button class="btn sm primary" data-taskdone="'+t.id+'">'+ic('check')+'Mark done</button>':'')+'</div></div>'; }
function taskRow(t,opts){ return t.ct?ctCard(t,opts):(t.td?tdCard(t,opts):taskRow0(t,opts)); }
function hTaskRow(t){ if(t.td){ var l0=lineById(t.line), a0=l0?acctOf(l0):null, st0=taskState(t);
    var state0=st0==='esc'?chip('Escalated','red',true,true):(st0==='over'?chip('Overdue','red',true,true):chip('Pending · due '+fmt(t.dueAt).replace(/^today, /,''),'amber',true,true));
    return '<div class="hrow row" data-go="line" data-id="'+(l0?l0.id:'')+'"><div class="bd"><div class="tt">'+esc(t.title)+' <span class="pr">· '+esc(a0?shortName(a0.n):'')+' · '+esc(l0?l0.id:'')+'</span></div><div class="mt">'+state0+'<span>To-do</span><span>'+esc(ctEscTx(t))+'</span></div></div>'+
      '<div class="rt">'+(t.owner===S.user?'<button class="done" data-taskdone="'+t.id+'">'+ic('check')+'Mark done</button>':'')+'</div></div>'; }
  if(!t.ct) return hTaskRow0(t); var l=lineById(t.line), a=l?acctOf(l):null, st=taskState(t), c=(l&&l.contact)||{};
  var state=st==='esc'?chip('Escalated','red',true,true):(st==='over'?chip('Overdue','red',true,true):chip('Pending · due '+fmt(t.dueAt).replace(/^today, /,''),'amber',true,true));
  return '<div class="hrow row" data-go="line" data-id="'+(l?l.id:'')+'"><div class="bd"><div class="tt">'+esc(t.title)+' <span class="pr">· '+esc(a?shortName(a.n):'')+' · '+esc(l?l.id:'')+'</span></div><div class="mt">'+state+'<span>'+esc(c.n||'')+' '+esc(c.m||'')+'</span><span>'+esc(ctEscTx(t))+'</span></div></div>'+
    '<div class="rt">'+(t.owner===S.user?'<button class="done" data-flow="ctc" data-line="'+(l?l.id:'')+'" data-task="'+t.id+'">'+ic('phone')+'Call Now</button>':'')+'</div></div>'; }
function taskSrc(t){ if(t.td){ var d=ctById(t.td); return 'To-do · '+(d?d.id:t.td); } if(t.ct){ var c=ctById(t.ct); return 'Call task · '+(c?c.id:t.ct); } if(t.cls==='Escalation') return 'BimaOps escalation'; return taskSrc0(t); }
SCREENS.tasks=function(){ return SCREENS.tasks0(); };

/* ---------- the configurator: a list, a pop-up form, an (i), an on/off switch ---------- */
function rulesTabs(cur){ return '<div class="tabs atabs" style="justify-content:flex-start;margin:0 0 16px">'+[['rules','Tasks'],['rulecfg','Task settings']].map(function(t){ return '<button data-go="'+t[0]+'"'+(cur===t[0]?' class="on"':'')+'>'+esc(t[1])+'</button>'; }).join('')+'</div>'; }
SCREENS.rule=function(){ return SCREENS.rules(); };
SCREENS.rulesim=function(){ return SCREENS.rules(); };
function ctOnlyTx(c){ var p=[]; if(c.prod&&c.prod.length) p.push(c.prod.join(', ')); if(c.route==='DUA') p.push('DUA only'); if(c.route==='NONDUA') p.push('Non-DUA only'); return p.join(' · '); }
function ctStopTx(c){ if(c.kind==='web') return 'when someone answers, or when the opportunity closes'; var s=c.stop||{mode:'leave'}, tx='when the opportunity leaves the stage';
  if(s.mode==='afterN') tx+=', or after '+plural(+s.n||0,'missed call')+' since the last connected call';
  if(s.mode==='afterPeriod') tx+=', or '+durU(s.period)+' after its first task';
  if(s.mode==='whenTask') tx+=', or when “'+((ctById(s.task)||{}).name||s.task)+'” is done';
  return tx; }
function ctExplain(c){
  var st=c.kind==='web'?'an opportunity came from a website drop-off and nobody has reached the customer yet — at whatever stage it opened at':('an opportunity is at '+c.stage+' · '+stageName(c.stage)), only=ctOnlyTx(c);
  if(c.kind==='todo') return tdExplain(c);
  return 'When '+st+(only?', for '+esc(only):'')+', a call task <b>“'+esc(c.name)+'”</b> is created for '+(c.stage>=SALES_STAGES?ctTeamTx(c)+(c.team==='both'?' — one each; when either makes the call, the other’s closes too':'')+(c.team==='abm'?' (the RM if the account has no ABM yet)':''):'Sales or RM — whoever owns the opportunity')+', due in <b>'+durU(c.due)+'</b>'+(c.kind==='stage'&&c.stage===1?' — website and inbound leads only; a line created by hand gets no first-call task':'')+'. '+
    'Call Now places an Ozonetel click-to-call. If the customer does not pick up, the task closes and the next one is due in <b>'+durU(c.again)+'</b>'+(+c.maxDay>0?', at most <b>'+c.maxDay+'</b> a day':', with no daily limit')+'. A connected call closes it and asks for the outcome. '+
    'It stops '+esc(ctStopTx(c))+'. '+(c.esc&&+c.esc[0]>0?'If the call is not made it escalates to the owner’s manager <b>'+durU(c.esc)+'</b> after it is due.':'It never escalates.'); }
function tdExplain(c){ var only=ctOnlyTx(c);
  if(c.kind==='renew') return 'When a customer’s policy is <b>'+plural(+c.days||60,'day')+'</b> or less from expiry'+(only?', for '+esc(only):'')+', a to-do <b>“'+esc(c.name)+'”</b> is created for '+ctTeamTx(c)+(c.team==='both'?' — one each; when either marks it done, the other’s closes too':'')+(c.team==='abm'?' (the RM if the account has no ABM yet)':'')+', due in <b>'+durU(c.due)+'</b>. Once per policy. It has a <b>Mark done</b> button and closes only when marked done. '+(c.esc&&+c.esc[0]>0?'If it is not done it escalates to the owner’s manager <b>'+durU(c.esc)+'</b> after it is due.':'It never escalates.');
  return 'When an opportunity is at '+c.stage+' · '+esc(stageName(c.stage))+(only?', for '+esc(only):'')+', a to-do <b>“'+esc(c.name)+'”</b> is created for '+(c.stage>=SALES_STAGES?ctTeamTx(c)+(c.team==='both'?' — one each; when either marks it done, the other’s closes too':'')+(c.team==='abm'?' (the RM if the account has no ABM yet)':''):'Sales or RM — whoever owns the opportunity')+', due in <b>'+durU(c.due)+'</b>. '+
    'It has a <b>Mark done</b> button — no call. It closes '+(c.close==='done'?'<b>only when marked done</b>, even if the opportunity moves on':'when it is <b>marked done</b>, or by itself when the opportunity <b>leaves the stage</b> or its status changes')+'. '+
    (+c.max===1?'It is created once each time the opportunity enters the stage. ':'When one is done and the opportunity is still in the stage, the next is due <b>'+durU(c.again)+'</b> later'+(+c.max>0?', up to <b>'+c.max+'</b> each time it enters the stage':', with no maximum')+'. ')+
    'It runs alongside the stage’s call task. '+(c.esc&&+c.esc[0]>0?'If it is not done it escalates to the owner’s manager <b>'+durU(c.esc)+'</b> after it is due.':'It never escalates.'); }
function otExplain(o){ if(!o.task) return o.out==='decided'?'No call task. The customer decided on the call; the owner moves the stage, and the new stage’s call task starts.':'No call task. The status goes to Lost from the call, with the reason.';
  return 'Creates <b>“'+esc(o.name)+'”</b> for the same people as the call task it came from — after payment the RM, the ABM, or both; otherwise the owner'+(o.out==='poc'?', due <b>'+durU(o.due||[15,'m'])+'</b> after the call, to the new contact':', due at the date and time the owner enters on the outcome')+(ctOnlyTx(o)?', for '+esc(ctOnlyTx(o)):'')+'. While it is open the stage’s own call task waits. If it is not answered, the stage’s call-again setting takes over. '+(o.esc&&+o.esc[0]>0?'It escalates to the owner’s manager <b>'+durU(o.esc)+'</b> after it is due.':'It never escalates.'); }
SCREENS.rules=function(){
  var u=me(); if(!isMgrRole(u)&&!(u&&u.role==='admin')) return rulesLock();
  var tab=S.ui.ctTab||'stage', cs=S.data.ctasks||[], os=S.data.otasks||[];
  var togBtn=function(on,attr){ return '<button class="tog'+(on?' on':'')+'" '+attr+' aria-pressed="'+(on?'true':'false')+'"><i></i>'+(on?'On':'Off')+'</button>'; };
  var info=function(id){ return '<button class="infob" data-ctinfo="'+id+'" title="What this task will do" aria-label="What this task will do">i</button>'; };
  var head='<div class="hdrow"><div><div class="h1">Tasks</div><div class="sub">Two kinds of task, owned by the opportunity’s owner. A <b>call task</b> has a Call Now button and closes through the call. A <b>to-do</b> has a Mark done button and closes when the owner marks it done. Add or edit a task in the pop-up and switch it on or off. LSQ to-do chains and advanced rules (AND/OR conditions, tasks that depend on other tasks) are the next build.</div></div></div>'+diamonds()+rulesTabs('rules')+
    '<div class="pills" style="margin:0 0 14px">'+[['stage','Stage tasks',cs.filter(function(c){return c.on;}).length+' on'],['outcome','After a connected call',os.filter(function(o){return o.task&&o.on;}).length+' on']].map(function(t){ return '<button class="pill'+(tab===t[0]?' on':'')+'" data-uiset="ctTab" data-uv="'+t[0]+'"><i class="d"></i>'+esc(t[1])+' <span style="opacity:.75">· '+esc(t[2])+'</span></button>'; }).join('')+'</div>';
  var body;
  if(tab==='stage'){
    body='<div class="card" style="overflow:hidden"><div class="tw"><table class="t ctt cts"><thead><tr><th>Task</th><th>Type</th><th>When</th><th>Timing</th><th>Role</th><th>Escalates after</th><th>On</th><th></th></tr></thead><tbody>'+
      cs.slice().sort(function(a,b){ var k=function(x){ return x.kind==='web'?0:(x.kind==='renew'?99:x.stage); }; return k(a)-k(b); }).map(function(c,i,arr){ var open=S.ui['cti_'+c.id], sec=ctSecRow(c,arr[i-1]);
        var td=c.kind==='todo'||c.kind==='renew';
        return sec+'<tr class="'+(c.on?'':'dim')+'"><td class="nm">'+esc(c.name)+' '+info(c.id)+'</td><td>'+chip(td?'To-do':'Call',td?'neutral':'violet',false,true)+'</td><td>'+(c.kind==='web'?'Website drop-off<div class="sub">any stage · until someone answers</div>':(c.kind==='renew'?'Policy expiring<div class="sub">'+esc(plural(+c.days||60,'day'))+' before expiry</div>':esc(c.stage+' · '+stageName(c.stage))))+'</td>'+
          '<td>Due in '+esc(durU(c.due))+'<div class="sub">'+(td?(c.kind==='renew'?'once per policy':+c.max===1?'once per stage entry':'next '+esc(durU(c.again))+' after done · '+(+c.max>0?'up to '+c.max:'no maximum')):'again in '+esc(durU(c.again))+' · '+(+c.maxDay>0?c.maxDay+' a day':'no daily limit'))+'</div></td>'+
          '<td>'+esc(ctRoleTx(c))+'</td>'+
          '<td>'+(c.esc&&+c.esc[0]>0?esc(durU(c.esc)):'<span class="meta">never</span>')+'</td>'+
          '<td>'+togBtn(c.on,'data-cttog="'+c.id+'"')+'</td><td class="right"><button class="btn sm" data-flow="ctForm" data-pre="'+c.id+'">Edit</button></td></tr>'+
          (open?'<tr class="ctinfo"><td colspan="8">'+ctExplain(c)+'</td></tr>':''); }).join('')+'</tbody></table></div></div>'+
      '<div class="mt12">'+note('neutral','How it runs','Tested at every change on an opportunity and at the hourly and daily checks. To-dos run alongside the call task and close through Mark done. One open call task per opportunity: a task from a call outcome holds the stage’s task until it is done. Missed calls are counted since the last connected call — a connected call resets the count — and they carry across New Lead → Consultation Setup. When a limit is reached nothing more is created; the owner can mark the opportunity Lost.','info')+'</div>';
  } else {
    body='<div class="card" style="overflow:hidden"><div class="tw"><table class="t ctt"><thead><tr><th>Outcome</th><th>Creates</th><th>Due</th><th>Only for</th><th>Escalates after</th><th>On</th><th></th></tr></thead><tbody>'+
      os.map(function(o){ var out=OUTCOMES.filter(function(x){return x.k===o.out;})[0], open=S.ui['cti_'+o.id];
        return '<tr class="'+(o.task&&!o.on?'dim':'')+'"><td class="nm">'+esc(out.n)+' '+info(o.id)+'<div class="sub">'+esc(out.d)+'</div></td><td>'+(o.task?esc(o.name):'<span class="meta">no task</span>')+'</td>'+
          '<td>'+(o.task?(o.out==='poc'?'in '+esc(durU(o.due||[15,'m'])):'<span class="meta">from the RM on the outcome</span>'):'—')+'</td><td>'+(o.task?(ctOnlyTx(o)?esc(ctOnlyTx(o)):'<span class="meta">all</span>'):'—')+'</td>'+
          '<td>'+(o.task?(o.esc&&+o.esc[0]>0?esc(durU(o.esc)):'<span class="meta">never</span>'):'—')+'</td><td>'+(o.task?togBtn(o.on,'data-ottog="'+o.id+'"'):'')+'</td><td class="right">'+(o.task?'<button class="btn sm" data-flow="otForm" data-pre="'+o.id+'">Edit</button>':'')+'</td></tr>'+
          (open?'<tr class="ctinfo"><td colspan="7">'+otExplain(o)+'</td></tr>':''); }).join('')+'</tbody></table></div></div>'+
      '<div class="mt12">'+note('neutral','Six outcomes, the same at every call stage','A call outcome never moves the stage — the one exception is New Lead → Consultation Setup on the first attempt, missed or not. Not interested and Deferred change the status straight from the call.','info')+'</div>';
  }
  return {sc:'Tasks', ctx:cs.filter(function(c){return c.on;}).length+' stage tasks on', html:head+body, cta:tab==='stage'?'<button class="btn primary" data-flow="ctForm">'+ic('plus')+'Add task</button>':''}; };
HANDLERS.push(function(t){ var x=t.closest('[data-ctinfo]'); if(x){ var k='cti_'+x.dataset.ctinfo; S.ui[k]=!S.ui[k]; paint(); return true; }
  x=t.closest('[data-cttog]'); if(x){ var c=by(S.data.ctasks,x.dataset.cttog); if(c&&write(function(){ c.on=c.on?0:1; },'the task')){ paint(); toast(c.on?'On':'Off',c.name+(c.on?' creates tasks from the next change or check.':' creates no new tasks. Open ones stay.')); } return true; }
  x=t.closest('[data-ottog]'); if(x){ var o=by(S.data.otasks,x.dataset.ottog); if(o&&write(function(){ o.on=o.on?0:1; },'the task')){ paint(); toast(o.on?'On':'Off',o.name); } return true; }
  return false; });
function ctNumUnit(kn,ku,n,u){ return '<div class="numunit"><input class="inp" id="f_'+kn+'" data-f="'+kn+'" type="number" min="0" value="'+esc(n)+'">'+select(ku,u,CT_UNITS)+'</div>'; }
function ctPost(s){ return s.stage==='renew'||+s.stage>=SALES_STAGES; }
function ctDraft(){ var s=S.sel, rn=s.stage==='renew'; return {id:s.pre||'new',kind:rn?'renew':(s.kind||'stage'),days:+s.days||60,team:ctPost(s)?(s.team||'rm'):'',max:rn?1:(s.max===undefined?1:+s.max||0),close:rn?'done':(s.close||'stage'),stage:rn?SALES_STAGES:(+s.stage||1),name:(s.name||'').trim(),prod:s.pmode==='sel'?(s.pp||[]).slice():[],route:s.route||'both',due:[+s.dueN||0,s.dueU||'h'],again:[+s.agN||0,s.agU||'h'],maxDay:+s.maxDay||0,
  stop:{mode:s.stopMode||'leave',n:+s.stopN||0,period:[+s.stopPN||0,s.stopPU||'d'],task:s.stopTask||''},esc:[+s.escN||0,s.escU||'h'],on:s.on==='0'?0:1}; }
FLOWS.ctForm={t:function(){ return S.sel.pre?(S.sel.kind==='todo'||S.sel.stage==='renew'?'Edit to-do':'Edit call task'):'Add a task'; }, sub:function(){ return S.sel.kind==='todo'?'Who it goes to, when it is due, when it closes, how often it repeats and when it escalates.':'Who it goes to, when it is due, how often it calls again, when it stops and when it escalates.'; }, wide:true,
  repaintOn:['stage','stopMode','dueU','agU','escU','stopPU','stopTask','pmode','route','kind','max','close','team'],
  body:function(){ var s=S.sel;
    if(!s._init){ s._init=1; var c=s.pre?by(S.data.ctasks,s.pre):null;
      if(c){ s.kind=c.kind; s.stage=String(c.stage); s.name=c.name; s.pmode=c.prod&&c.prod.length?'sel':'all'; s.pp=(c.prod||[]).slice(); s.route=c.route; s.dueN=String(c.due[0]); s.dueU=c.due[1]; s.agN=String(c.again[0]); s.agU=c.again[1]; s.maxDay=String(c.maxDay||0); s.stopMode=(c.stop||{}).mode||'leave'; s.stopN=String((c.stop||{}).n||''); s.stopPN=String(((c.stop||{}).period||[1])[0]); s.stopPU=((c.stop||{}).period||[1,'d'])[1]; s.stopTask=(c.stop||{}).task||''; s.escN=String(c.esc[0]); s.escU=c.esc[1]; s.on=c.on?'1':'0'; s.max=String(c.max===undefined?1:c.max); s.close=c.close||'stage'; s.team=c.team||'rm'; if(c.kind==='renew'){ s.kind='todo'; s.stage='renew'; s.days=String(c.days||60); } }
      else { s.team='rm'; s.max='1'; s.close='stage'; s.kind='stage'; s.stage='2'; s.name=''; s.pmode='all'; s.pp=[]; s.route='both'; s.dueN='2'; s.dueU='h'; s.agN='4'; s.agU='h'; s.maxDay='3'; s.stopMode='afterN'; s.stopN='10'; s.stopPN='5'; s.stopPU='d'; s.escN='1'; s.escU='d'; s.on='1'; } }
    if(s.stage==='renew') s.kind='todo'; if(!s.days) s.days='60';
    var d=ctDraft(), others=(S.data.ctasks||[]).filter(function(c){return c.id!==s.pre&&c.kind!=='todo'&&c.kind!=='renew';});
    var renOpt=(!s.pre||s.kind==='todo')?[['renew','Renewal · policy expiring (post-sales)']]:[];
    var teamF=(s.kind==='web'||!ctPost(s))?'<div class="field"><div class="lbl">Role</div><input class="inp" value="Sales or RM" disabled><div class="hint">Before Payment Completed the task goes to whoever owns the opportunity — Sales, or the RM on an opportunity the RM owns. Pick stage 12 or later to choose RM, ABM or both.</div></div>':'<div class="field"><div class="lbl">Role</div>'+seg('team',CT_TEAM,s.team||'rm')+'<div class="hint">Post-sales: who gets the task. Both = the RM and the ABM each get it; when either completes it, the other’s closes too. If the account has no ABM yet, the RM gets it.</div></div>';
    var typ=s.kind==='web'?'':'<div class="field"><div class="lbl">Task type</div>'+(s.pre?'<input class="inp" value="'+(s.kind==='todo'?'To-do · Mark done':'Call task · Call Now')+'" disabled>':seg('kind',[['stage','Call task · Call Now'],['todo','To-do · Mark done']],s.kind))+'<div class="hint">'+(s.kind==='todo'?'No call: the owner does it and marks it done.':'Closes through the call: Call Now places a click-to-call.')+'</div></div>';
    if(s.kind==='todo') return typ+'<div class="fgrid">'+field('Task name',input('name',s.name,'Collect the signed proposal form'),'What the owner sees on the task card.')+
        field('Stage',select('stage',s.stage,(s.pre?[]:CT_EXTRA_STAGES).concat(STAGES.map(function(x){ return [String(x.n),x.n+' · '+x.s+(x.n>=SALES_STAGES?' (post-sales)':'')]; })).concat(renOpt)),ctPost(s)?'Post-sales — choose the role below.':'The task goes to the opportunity’s owner.')+'</div>'+teamF+
      '<div class="fgrid">'+'<div class="field"><div class="lbl">Products</div>'+seg('pmode',[['all','All products'],['sel','Selected products']],s.pmode)+'</div>'+'<div class="field"><div class="lbl">Route</div>'+seg('route',[['both','DUA and Non-DUA'],['DUA','DUA'],['NONDUA','Non-DUA']],s.route)+'</div></div>'+
      (s.pmode==='sel'?'<div class="chips">'+PRODUCTS.map(function(p){ return '<button type="button" data-tog="pp" data-tv="'+esc(p)+'"'+((s.pp||[]).indexOf(p)>=0?' class="on"':'')+'>'+esc(p)+'</button>'; }).join('')+'</div>':'')+
      (s.stage==='renew'?'<div class="fgrid">'+field('Days before expiry',input('days',s.days,'60','inputmode="numeric"'),'Created once per policy, when it is this close to expiry.')+field('Due in',ctNumUnit('dueN','dueU',s.dueN,s.dueU),'From when it is created.')+'</div>'+
        '<div class="fgrid">'+field('Escalate after',ctNumUnit('escN','escU',s.escN,s.escU),'To the owner’s manager if it is not done after it is due. 0 = never.')+'<div class="field"><div class="lbl">Status</div>'+seg('on',[['1','On'],['0','Off']],s.on)+'</div></div>'+
        note('violet','What this task will do',tdExplain(d),'info'):'')+
      (s.stage==='renew'?'':'<div class="fgrid three">'+field('Due in',ctNumUnit('dueN','dueU',s.dueN,s.dueU),'From when the opportunity reaches the stage.')+field('Maximum tasks',select('max',s.max,[['1','1 · once']].concat([2,3,4,5,6,8,10].map(function(n){return [String(n),String(n)];})).concat([['0','No maximum']])),'Each time the opportunity enters the stage.')+
        (s.max!=='1'?field('Next task after one is done',ctNumUnit('agN','agU',s.agN,s.agU),'While the opportunity is still in the stage.'):'<div></div>')+'</div>'+
      '<div class="fgrid">'+field('Closes when',select('close',s.close,TD_CLOSE),'Mark done always closes it.')+field('Escalate after',ctNumUnit('escN','escU',s.escN,s.escU),'To the owner’s manager if it is not done after it is due. 0 = never.')+'</div>'+
      '<div class="field"><div class="lbl">Status</div>'+seg('on',[['1','On'],['0','Off']],s.on)+'</div>'+
      note('violet','What this task will do',tdExplain(d),'info'));
    return typ+'<div class="fgrid">'+field('Task name',input('name',s.name,'Consultation Setup · call'),'What the owner sees on the task card.')+
        (s.kind==='web'?field('When','<input class="inp" value="Website drop-off · any stage, until someone answers" disabled>'):field('Stage',select('stage',s.stage,(s.pre?[]:CT_EXTRA_STAGES).concat(STAGES.map(function(x){ return [String(x.n),x.n+' · '+x.s+(x.n>=SALES_STAGES?' (post-sales)':'')]; })).concat(renOpt)),ctPost(s)?'Post-sales — choose the role below.':'The task goes to the opportunity’s owner.'))+'</div>'+teamF+
      '<div class="fgrid">'+'<div class="field"><div class="lbl">Products</div>'+seg('pmode',[['all','All products'],['sel','Selected products']],s.pmode)+'</div>'+'<div class="field"><div class="lbl">Route</div>'+seg('route',[['both','DUA and Non-DUA'],['DUA','DUA'],['NONDUA','Non-DUA']],s.route)+'</div></div>'+
      (s.pmode==='sel'?'<div class="chips">'+PRODUCTS.map(function(p){ return '<button type="button" data-tog="pp" data-tv="'+esc(p)+'"'+((s.pp||[]).indexOf(p)>=0?' class="on"':'')+'>'+esc(p)+'</button>'; }).join('')+'</div>':'')+
      '<div class="fgrid three">'+field('Due in',ctNumUnit('dueN','dueU',s.dueN,s.dueU),'From when the opportunity reaches the stage.')+field('Call again in',ctNumUnit('agN','agU',s.agN,s.agU),'After a call that does not connect.')+field('Max calls a day',input('maxDay',s.maxDay,'0'),'0 = no daily limit.')+'</div>'+
      '<div class="fgrid">'+field('Stops',select('stopMode',s.stopMode,[['leave','When the opportunity leaves the stage'],['afterN','…or after N missed calls'],['afterPeriod','…or a period after the first task'],['whenTask','…or when another task is done']]),'It always stops when the opportunity leaves the stage or its status changes.')+
        (s.stopMode==='afterN'?field('Missed calls',input('stopN',s.stopN,'10'),'Counted since the last connected call.'):(s.stopMode==='afterPeriod'?field('Period',ctNumUnit('stopPN','stopPU',s.stopPN,s.stopPU)):(s.stopMode==='whenTask'?field('Task',select('stopTask',s.stopTask,[['','Choose a task']].concat(others.map(function(c){return [c.id,c.id+' · '+c.name];})))):'<div></div>')))+'</div>'+
      '<div class="fgrid">'+field('Escalate after',ctNumUnit('escN','escU',s.escN,s.escU),'To the owner’s manager if the call is not made after it is due. 0 = never.')+'<div class="field"><div class="lbl">Status</div>'+seg('on',[['1','On'],['0','Off']],s.on)+'</div></div>'+
      note('violet','What this task will do',ctExplain(d),'info'); },
  can:function(){ var d=ctDraft(); if(!d.name) return false; if(S.sel.pmode==='sel'&&!(S.sel.pp||[]).length) return false;
    if(d.kind==='renew') return /^\d+$/.test(String(S.sel.days||''))&&+S.sel.days>0&&String(S.sel.dueN||'')!=='';
    if(d.kind==='todo') return +d.due[0]>=0&&String(S.sel.dueN||'')!==''&&(d.max===1||+d.again[0]>0)&&/^\d+$/.test(String(S.sel.max||''));
    if(!(+d.due[0]>0)||!(+d.again[0]>0)) return false; if(d.stop.mode==='afterN'&&!(d.stop.n>0)) return false; if(d.stop.mode==='afterPeriod'&&!(+d.stop.period[0]>0)) return false; if(d.stop.mode==='whenTask'&&!d.stop.task) return false; if(S.sel.pmode==='sel'&&!(S.sel.pp||[]).length) return false; return true; },
  ok:function(){ return S.sel.pre?'Save':'Add task'; },
  run:function(){ var d=ctDraft(), isNew=!S.sel.pre, c;
    var ok=write(function(){ if(isNew){ var mx=0; S.data.ctasks.forEach(function(x){ var m=String(x.id).match(/(\d+)$/); if(m) mx=Math.max(mx,+m[1]); }); d.id='CT-'+p2(mx+1); S.data.ctasks.push(d); c=d; }
      else { c=by(S.data.ctasks,S.sel.pre); ['stage','name','prod','route','due','again','maxDay','stop','esc','on','max','close','team','days'].forEach(function(k){ c[k]=d[k]; }); if(c.kind==='todo'||c.kind==='renew') c.kind=d.kind; }
      var tdk=c.kind==='todo'||c.kind==='renew'; if(!tdk){ delete c.max; delete c.close; } else { delete c.stop; c.maxDay=0; } if(c.kind!=='renew') delete c.days;
      if(c.kind==='renew'){ c._made=ctRenewSweep(); }
      if(c.kind==='todo'){ var n0=S.data.tasks.length; liveLines().forEach(function(l){ tdRun(l); }); c._made=S.data.tasks.length-n0; } },'the task');
    if(!ok) return 'fail'; toast(isNew?(c.kind!=='stage'&&c.kind!=='web'?'To-do added — ':'Task added — ')+c.id:'Saved',c.kind==='renew'?(c._made?plural(c._made,'to-do')+' created now for policies already within '+plural(c.days,'day')+' of expiry.':'Policies get it as they come within '+plural(c.days,'day')+' of expiry.'):c.kind==='todo'?(c._made?plural(c._made,'to-do')+' created now for opportunities already at '+stageName(c.stage)+'.':'Opportunities that reach '+stageName(c.stage)+' get it.')+(isNew?'':' Open ones keep their dates.'):'It applies from the next change on an opportunity or the next check. Tasks already open keep their dates.'); delete c._made; }};
/* [stated 27 Oct] delete a task from its edit pop-up — two clicks: Delete task, then Confirm delete */
Object.defineProperty(FLOWS.ctForm,'alt',{configurable:true,get:function(){ if(S.flow!=='ctForm'||!S.sel.pre) return null;
  return {label:S.sel.delArm?'Confirm delete':'Delete task', run:function(){ if(!S.sel.delArm){ S.sel.delArm=1; paintModal(); return; }
    var c=by(S.data.ctasks,S.sel.pre); if(!c) return; var closed=0;
    var ok=write(function(){ S.data.ctasks=S.data.ctasks.filter(function(x){ return x.id!==c.id; });
      S.data.tasks.forEach(function(t){ if(!t.done&&(t.ct===c.id||t.td===c.id)){ t.done=1; t.doneAt=S.now; t.doneBy='system'; t.closeWhy='Closed — the task was deleted from the configurator'; closed++; } });
      S.data.ctasks.forEach(function(x){ if(x.stop&&x.stop.mode==='whenTask'&&x.stop.task===c.id) x.stop={mode:'leave'}; });
      liveLines().forEach(function(l){ ctRun(l); }); },'the deletion');
    if(!ok) return; closeFlow(); paint(); toast('Deleted — '+c.id,c.name+(closed?' · '+plural(closed,'open task')+' closed':' · no open tasks')+'.'); } }; }});
paintModal=(function(p0){ return function(){ var r=p0.apply(this,arguments); if(S.flow==='ctForm'){ var b=document.querySelector('#ovl .modf [data-alt]'); if(b){ b.classList.add('ctdel'); if(S.sel.delArm) b.classList.add('arm'); } } return r; }; })(paintModal);
FLOWS.otForm={t:'Edit outcome task', sub:'The due date comes from the owner on the outcome. If it is not answered, the stage’s own call-again setting takes over.',
  repaintOn:['pmode','escU','dueU'],
  body:function(){ var s=S.sel, o=by(S.data.otasks,s.pre);
    if(!s._init){ s._init=1; s.name=o.name; s.on=o.on?'1':'0'; s.escN=String(o.esc[0]); s.escU=o.esc[1]; s.pmode=o.prod&&o.prod.length?'sel':'all'; s.pp=(o.prod||[]).slice(); s.route=o.route||'both'; if(o.due){ s.dueN=String(o.due[0]); s.dueU=o.due[1]; } }
    var out=OUTCOMES.filter(function(x){return x.k===o.out;})[0];
    return note('neutral',out.n,esc(out.d),'info')+'<div class="fgrid">'+field('Task name',input('name',s.name,''))+'<div class="field"><div class="lbl">Status</div>'+seg('on',[['1','On'],['0','Off']],s.on)+'</div></div>'+
      (o.out==='poc'?field('Due in',ctNumUnit('dueN','dueU',s.dueN,s.dueU),'After the call that named the new contact.'):'')+
      '<div class="fgrid">'+field('Escalate after',ctNumUnit('escN','escU',s.escN,s.escU),'0 = never.')+'<div class="field"><div class="lbl">Route</div>'+seg('route',[['both','DUA and Non-DUA'],['DUA','DUA'],['NONDUA','Non-DUA']],s.route)+'</div></div>'+
      '<div class="field"><div class="lbl">Products</div>'+seg('pmode',[['all','All products'],['sel','Selected products']],s.pmode)+'</div>'+
      (s.pmode==='sel'?'<div class="chips">'+PRODUCTS.map(function(p){ return '<button type="button" data-tog="pp" data-tv="'+esc(p)+'"'+((s.pp||[]).indexOf(p)>=0?' class="on"':'')+'>'+esc(p)+'</button>'; }).join('')+'</div>':''); },
  can:function(){ return !!(S.sel.name||'').trim()&&(S.sel.pmode!=='sel'||(S.sel.pp||[]).length>0); }, ok:'Save',
  run:function(){ var o=by(S.data.otasks,S.sel.pre), s=S.sel; var ok=write(function(){ o.name=s.name.trim(); o.on=s.on==='0'?0:1; o.esc=[+s.escN||0,s.escU||'h']; o.prod=s.pmode==='sel'?(s.pp||[]).slice():[]; o.route=s.route||'both'; if(o.out==='poc') o.due=[+s.dueN||15,s.dueU||'m']; },'the task'); if(!ok) return 'fail'; toast('Saved',o.name); }};
