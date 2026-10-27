/* ==================================================================== *
 *  ABM pre-sales stages in the task configurator [stated 23 Oct]
 *  The Call tasks configurator gets a third tab, ABM pre-sales: the seven
 *  journey tasks (PR-01…PR-07) plus tasks the admin adds on any ABM stage.
 *  An added task is created for the prospect's ABM when the prospect is in
 *  that stage, and closes when it is done or the prospect leaves the stage.
 * ==================================================================== */
var AB_STAGES=[['prospect','Prospect'],['mql','MQL'],['callsetup','Meeting Set-up'],['sal','Meeting Completed'],['nc','Not Connected (DNP 1–3)']];
function abStageName(k){ var r=AB_STAGES.filter(function(x){return x[0]===k;})[0]; return r?r[1]:k; }
function abPlace(p){ return p.bucket==='nc'?'nc':(p.bucket?'':p.stage); }
/* durations: minutes, hours, days */
var AB_UNITS=[['m','Minutes'],['h','Hours'],['d','Days']];
function abDur(n,u){ return (+n||0)*(u==='m'?60000:(u==='h'?3600000:DAY)); }
function abDue(base,n,u){ return addWork(base,ctMins([+n||0,u||'d'])); }
function abDurTx(n,u){ return plural(+n||0,u==='m'?'minute':(u==='h'?'working hour':'working day')); }
var AB_CLOSE=[['stage','The prospect leaves the stage, or the task is done'],['outreach','The next outreach is logged — call, email or log outreach'],['done','Only when the task is done — even if the prospect moves on']];
function abCloseTx(r){ var k=r.close||'stage'; if(k==='outreach') return 'The next outreach is logged (call, email, log outreach), or the prospect leaves '+abStageName(r.stage);
  if(k==='done') return (r.call!==0?'A call is logged':'It is marked done')+' — it stays open if the prospect moves on';
  return 'It is '+(r.call!==0?'called':'done')+', or the prospect leaves '+abStageName(r.stage); }
function abOutreachSince(p,t){ return p.log.some(function(e){ return e.at>=t&&/^(Outreach|Call placed)/.test(e.t); }); }
/* the engine: the journey's one task, plus the added stage tasks alongside it */
function preSync(){
  if(!S.data||!S.data.pros) return 0;
  if(!S.data.prules2) S.data.prules2=preSeedRules();
  if(!S.data.ptk) S.data.ptk=[];
  if(!S.data.seq.pt) S.data.seq.pt=901;
  var made=0, cus=S.data.prules2.filter(function(r){ return r.k==='custom'; });
  S.data.pros.forEach(function(p){
    var w=wantTask(p), r=w?preRule(w.k):null, off=false; if(r&&!r.on){ r=null; w=null; off=true; }
    var mine=S.data.ptk.filter(function(t){ return t.pro===p.id&&t.k!=='custom'; });
    mine.forEach(function(t){ if(!t.done&&(!w||t.key!==w.key)){ t.done=1; t.doneAt=S.now; t.how=off?'Rule turned off':(p.log[0]?p.log[0].t:'Moved on'); } if(!t.done) t.owner=p.owner; });
    if(w&&!mine.some(function(t){ return t.key===w.key; })){
      var due=r.at?w.at:abDue(w.base,r.n,r.unit);
      S.data.ptk.push({id:'TK-'+(S.data.seq.pt++),key:w.key,pro:p.id,owner:p.owner,rule:r.id,k:r.k,title:preTitle(r,p),createdAt:Math.min(w.base,S.now),dueAt:due,done:0,doneAt:0,how:''}); made++; }
    /* added stage tasks — closes-when, repeat, maximum and daily limit come from the rule */
    var here=active(p)&&!p.rp?abPlace(p):'';
    S.data.ptk.forEach(function(t){ if(t.pro!==p.id||t.k!=='custom'||t.done) return; var cr=by(S.data.prules2,t.rule), how='';
      if(!cr||!cr.on) how='Rule turned off';
      else if(isHanded(p)||isClosed(p)) how=isHanded(p)?'Handed off':'Prospect closed';
      else if((cr.close||'stage')!=='done'&&(cr.stage!==here||t.entry!==p.enteredAt)) how='Left '+abStageName(cr.stage);
      else if(cr.call!==0&&abOutreachSince(p,t.createdAt)) how=cr.close==='outreach'?'Outreach logged':'Call logged';
      else if(cr.close==='outreach'&&abOutreachSince(p,t.createdAt)) how='Outreach logged';
      if(how){ t.done=1; t.doneAt=S.now; t.how=how; } else t.owner=p.owner; });
    cus.forEach(function(cr){ if(!cr.on||cr.stage!==here) return;
      var all=S.data.ptk.filter(function(t){ return t.pro===p.id&&t.rule===cr.id&&t.entry===p.enteredAt; });
      if(all.some(function(t){ return !t.done; })) return;
      if(+cr.max>0&&all.length>=+cr.max) return;
      var last=all.sort(function(a,b){ return b.doneAt-a.doneAt; })[0];
      var base=last?Math.max(last.doneAt,S.now):Math.max(p.enteredAt,cr.made||0), due=abDue(base,last?(cr.again||cr.n):cr.n,last?(cr.againU||cr.unit):cr.unit);
      if(+cr.maxDay>0){ var g=0; while(g++<30&&S.data.ptk.filter(function(t){ return t.pro===p.id&&t.rule===cr.id&&sameDay(t.dueAt,due); }).length>=+cr.maxDay){ var d=new Date(due); d.setDate(d.getDate()+1); d.setHours(10,0,0,0); due=d.getTime(); } }
      S.data.ptk.push({id:'TK-'+(S.data.seq.pt++),key:'cu:'+cr.id+':'+p.enteredAt+':'+(all.length+1),entry:p.enteredAt,pro:p.id,owner:p.owner,rule:cr.id,k:'custom',title:preTitle(cr,p)+(all.length?' · '+(all.length+1):''),createdAt:S.now,dueAt:due,done:0,doneAt:0,how:''}); made++; });
  });
  return made; }

function abRulesBody(canEdit){
  var rs=S.data.prules2||(S.data.prules2=preSeedRules());
  var tog=function(on,id){ return '<button class="tog'+(on?' on':'')+'" data-prtog="'+id+'" aria-pressed="'+(on?'true':'false')+'"'+(canEdit?'':' disabled')+'><i></i>'+(on?'On':'Off')+'</button>'; };
  var whenTx=function(r){ return r.k==='custom'?'<b>'+esc(abStageName(r.stage))+'</b><div class="sub">added task · while the prospect is in this stage</div>':esc(r.when); };
  var closeTx=function(r){ return r.k==='custom'?abCloseTx(r):(PRE_CLOSE[r.k]||''); };
  var dueTx=function(r){ if(r.at) return 'At the meeting time'; var h='Due in '+abDurTx(r.n,r.unit);
    if(r.k==='custom') h+='<div class="sub">'+(+r.max===1?'once per stage':('again in '+abDurTx(r.again||r.n,r.againU||r.unit)+' · '+(+r.max>0?'max '+r.max:'no maximum')))+' · '+(+r.maxDay>0?r.maxDay+' a day':'no daily limit')+'</div>';
    else h+='<div class="sub">after it is created</div>'; return h; };
  return '<div class="card" style="overflow:hidden"><div class="tw"><table class="t ctt"><thead><tr><th>Task for the ABM</th><th>When</th><th>Timing</th><th>Closes when</th><th>Button</th><th>On</th><th></th></tr></thead><tbody>'+
    rs.map(function(r){ return '<tr class="'+(r.on?'':'dim')+'"><td class="nm">'+esc(r.title)+'</td><td>'+whenTx(r)+'</td><td>'+dueTx(r)+'</td><td style="white-space:normal">'+esc(closeTx(r))+'</td>'+
      '<td>'+(r.call!==0?chip('Call','violet',false,true):chip('Mark done','neutral',false,true))+'</td><td>'+tog(r.on,r.id)+'</td>'+
      '<td class="right">'+(canEdit&&!r.at?'<button class="btn sm" data-flow="'+(r.k==='custom'?'ab_preTaskForm':'ab_preRuleEdit')+'" data-id="'+r.id+'">Edit</button>':'')+'</td></tr>'; }).join('')+'</tbody></table></div></div>'+
    '<div class="mt12">'+note('neutral','How it runs','PR-01 to PR-07 follow the journey: one open task per prospect, closing by itself when the ABM does the thing. A task you add runs alongside it, on its stage, closing as you set it. When one closes and the prospect is still in the stage, the next is created after the repeat time — up to the maximum, and no more than the daily limit in a day (the rest move to the next day). {contact} and {customer} are filled in from the prospect. Time Pending, To re-prospect, Not Interested and Handed off create no task.','info')+'</div>'; }
var abNum=function(v,min){ return /^\d+$/.test(String(v==null?'':v).trim())&&+v>=min; };
FLOWS.ab_preTaskForm={t:function(){ return S.sel.id?'Edit ABM task':'Add a task'; }, sub:'A task for the prospect’s ABM, on a pre-sales stage.', wide:true, repaintOn:['max','stage','kind'],
  body:function(){ var r=S.sel.id?by(S.data.prules2,S.sel.id):null;
    if(S.sel._i===undefined){ S.sel._i=1; var d=r||{stage:S.sel.stage||'mql',title:S.sel.title||'',n:1,unit:'d',call:S.sel.kind==='todo'?0:1,close:'stage',max:1,maxDay:0,again:1,againU:'d'}; S.sel.stage=d.stage; S.sel.title=d.title; S.sel.n=String(d.n); S.sel.unit=d.unit; S.sel.kind=d.call===0?'todo':'call';
      S.sel.close=d.close||'stage'; S.sel.max=String(d.max==null?1:d.max); S.sel.maxDay=String(d.maxDay||0); S.sel.again=String(d.again||d.n); S.sel.againU=d.againU||d.unit; }
    var once=S.sel.max==='1', bad=function(k,min){ return S.sel[k]!==undefined&&!abNum(S.sel[k],min)?'Whole number, '+min+' or more':''; };
    return field('Task',input('title',S.sel.title,'Send the capability deck to {contact}'),'What the ABM sees. Use {contact} and {customer}.')+
      '<div class="fgrid">'+field('Stage',select('stage',S.sel.stage,AB_STAGES.map(function(x){ return [x[0],'ABM pre-sales · '+x[1]]; }).concat(S.sel.id?[]:STAGES.map(function(x){ return ['st:'+x.n,x.n+' · '+x.s+(x.n>=SALES_STAGES?' (post-purchase)':'')]; }))),'Created for the prospect’s ABM while a prospect is in this stage.')+field('Task type',seg('kind',[['call','Call'],['todo','To-do']],S.sel.kind),S.sel.kind==='todo'?'Mark done button':'Call button')+'</div>'+
      '<div class="fgrid">'+field('Due after',input('n',S.sel.n,'1','inputmode="numeric"'),'',bad('n',1))+field('Unit',select('unit',S.sel.unit,AB_UNITS))+'</div>'+
      field('Closes when',select('close',S.sel.close,AB_CLOSE),S.sel.kind==='todo'?'A to-do also closes when the ABM marks it done.':'A call task also closes when a call to the prospect is logged.')+
      '<div class="fgrid">'+field('Maximum tasks',input('max',S.sel.max,'1','inputmode="numeric"'),'Per prospect, each time it enters the stage. 1 = once; 0 = no maximum.',bad('max',0))+field('Daily limit',input('maxDay',S.sel.maxDay,'0','inputmode="numeric"'),'Per prospect per day; extra ones move to the next day. 0 = no limit.',bad('maxDay',0))+'</div>'+
      (once?'':'<div class="fgrid">'+field('Next task after one closes',input('again',S.sel.again,'1','inputmode="numeric"'),'While the prospect is still in the stage.',bad('again',1))+field('Unit',select('againU',S.sel.againU,AB_UNITS))+'</div>'); },
  can:function(){ return !!(S.sel.title||'').trim()&&!!S.sel.stage&&abNum(S.sel.n,1)&&abNum(S.sel.max,0)&&abNum(S.sel.maxDay,0)&&(S.sel.max==='1'||abNum(S.sel.again,1)); }, ok:function(){ return S.sel.id?'Save task':'Add task'; },
  run:function(){ var r=S.sel.id?by(S.data.prules2,S.sel.id):null, isNew=!r;
    var ok=write(function(){ if(!r){ S.data.seq.prc=S.data.seq.prc||8; r={id:'PR-'+String(S.data.seq.prc++).padStart(2,'0'),k:'custom',on:true,made:S.now}; S.data.prules2.push(r); }
      r.title=S.sel.title.trim(); r.stage=S.sel.stage; r.n=+S.sel.n; r.unit=S.sel.unit; r.call=S.sel.kind==='todo'?0:1; r.close=S.sel.close; r.max=+S.sel.max; r.maxDay=+S.sel.maxDay; r.again=+S.sel.again||r.n; r.againU=S.sel.againU||r.unit; },'the task');
    if(!ok) return 'fail'; preSync(); save(); var n=S.data.ptk.filter(function(t){ return t.rule===r.id&&!t.done; }).length;
    toast(r.id+(isNew?' added':' saved'),n?plural(n,'open task')+' now, for prospects already in '+abStageName(r.stage)+'.':'It creates tasks as prospects reach '+abStageName(r.stage)+'.'); }};
FLOWS.ab_preRuleEdit={t:function(){ return 'Edit '+S.sel.id; }, sub:function(){ var r=by(S.data.prules2,S.sel.id); return r?r.title:''; },
  body:function(){ var r=by(S.data.prules2,S.sel.id); if(S.sel._i===undefined){ S.sel._i=1; S.sel.n=String(r.n); S.sel.unit=r.unit; }
    return '<div class="fgrid">'+field('Due after',input('n',S.sel.n,'1','inputmode="numeric"'))+field('Unit',select('unit',S.sel.unit,AB_UNITS))+'</div>'+note('neutral','','A journey task: one open per prospect, closing when the ABM does the thing ('+esc(PRE_CLOSE[r.k]||'')+'). Applies to tasks created from now on.','info'); },
  can:function(){ return abNum(S.sel.n,1); }, ok:'Save rule',
  run:function(){ var r=by(S.data.prules2,S.sel.id); r.n=+S.sel.n; r.unit=S.sel.unit; save(); toast(r.id+' saved','Due '+abDurTx(r.n,r.unit)+' after it is created.'); }};
/* the configurator: ABM pre-sales tasks sit inside Stage tasks, as the first section [stated 27 Oct] */
CT_EXTRA_STAGES=AB_STAGES.map(function(x){ return ['ab:'+x[0],'ABM pre-sales · '+x[1]]; });
function abStageRows(){ var rs=S.data.prules2||(S.data.prules2=preSeedRules());
  var dueTx=function(r){ if(r.at) return 'At the meeting time'; var h='Due in '+abDurTx(r.n,r.unit);
    if(r.k==='custom') h+='<div class="sub">'+(+r.max===1?'once per stage':('again in '+abDurTx(r.again||r.n,r.againU||r.unit)+' · '+(+r.max>0?'max '+r.max:'no maximum')))+' · '+(+r.maxDay>0?r.maxDay+' a day':'no daily limit')+'</div>';
    else h+='<div class="sub">after it is created</div>'; return h; };
  var tog=function(on,id){ return '<button class="tog'+(on?' on':'')+'" data-prtog="'+id+'" aria-pressed="'+(on?'true':'false')+'"><i></i>'+(on?'On':'Off')+'</button>'; };
  return '<tr class="ctsec"><td colspan="8">Pre-sales<span>prospect journey · the prospect’s ABM</span></td></tr>'+
    rs.map(function(r){ return '<tr class="'+(r.on?'':'dim')+'"><td class="nm">'+esc(r.title)+'</td><td>'+(r.call!==0?chip('Call','violet',false,true):chip('To-do','neutral',false,true))+'</td>'+
      '<td>'+(r.k==='custom'?esc(abStageName(r.stage))+'<div class="sub">added · while the prospect is in this stage</div>':esc(r.when))+'</td><td>'+dueTx(r)+'</td><td>ABM</td><td><span class="meta">never</span></td><td>'+tog(r.on,r.id)+'</td>'+
      '<td class="right">'+(!r.at?'<button class="btn sm" data-flow="'+(r.k==='custom'?'ab_preTaskForm':'ab_preRuleEdit')+'" data-id="'+r.id+'">Edit</button>':'')+'</td></tr>'; }).join(''); }
SCREENS.rules=(function(r0){ return function(){ if(S.ui.ctTab==='abm') S.ui.ctTab='stage'; var o=r0(); if(!o||!o.html||(S.ui.ctTab||'stage')!=='stage') return o;
  var k=o.html.indexOf('<table class="t ctt cts">'); if(k<0) return o; var b=o.html.indexOf('<tbody>',k); if(b<0) return o; b+=7;
  o.html=o.html.slice(0,b)+abStageRows()+o.html.slice(b);
  o.html=o.html.replace("'Tested at every change on an opportunity","'Tested at every change on an opportunity").replace('Tested at every change on an opportunity','ABM pre-sales tasks run on prospects: the journey’s own tasks one at a time, and added ones alongside them. Sales and post-purchase tasks are tested at every change on an opportunity');
  var on=(S.data.prules2||[]).filter(function(r){return r.on;}).length; o.ctx=(o.ctx||'').replace(/^(\d+)/,function(m){ return String(+m+on); });
  o.html=o.html.replace(/(data-uv="stage"><i class="d"><\/i>Stage tasks <span style="opacity:.75">· )(\d+)( on)/,function(m,a,n,c){ return a+(+n+on)+c; });
  return o; }; })(SCREENS.rules);
/* picking an ABM pre-sales stage in Add task switches to the ABM form, and back */
paintModal=(function(p0){ return function(){
  if(S.flow==='ctForm'&&!S.sel.pre&&/^ab:/.test(S.sel.stage||'')){ var st=S.sel.stage.slice(3), nm=S.sel.name||'', kd=S.sel.kind==='todo'?'todo':'call'; S.flow='ab_preTaskForm'; S.sel={stage:st,title:nm,kind:kd,_from:1}; }
  else if(S.flow==='ab_preTaskForm'&&!S.sel.id&&/^st:/.test(S.sel.stage||'')){ var n=S.sel.stage.slice(3), t=S.sel.title||'', k2=S.sel.kind==='todo'?'todo':'stage'; S.flow='ctForm'; S.sel={}; FLOWS.ctForm.body(); S.sel.stage=n; S.sel.name=t; S.sel.kind=k2; }
  return p0.apply(this,arguments); }; })(paintModal);
/* delete an added ABM task from its edit pop-up */
Object.defineProperty(FLOWS.ab_preTaskForm,'alt',{configurable:true,get:function(){ if(S.flow!=='ab_preTaskForm'||!S.sel.id) return null;
  return {label:S.sel.delArm?'Confirm delete':'Delete task', run:function(){ if(!S.sel.delArm){ S.sel.delArm=1; paintModal(); return; }
    var r=by(S.data.prules2,S.sel.id); if(!r) return; var closed=0;
    var ok=write(function(){ S.data.prules2=S.data.prules2.filter(function(x){ return x.id!==r.id; });
      (S.data.ptk||[]).forEach(function(t){ if(t.rule===r.id&&!t.done){ t.done=1; t.doneAt=S.now; t.how='Task deleted from the configurator'; closed++; } }); },'the deletion');
    if(!ok) return; closeFlow(); save(); paint(); toast('Deleted',r.title+(closed?' · '+plural(closed,'open task')+' closed':' · no open tasks')+'.'); } }; }});
paintModal=(function(p0){ return function(){ var r=p0.apply(this,arguments); if(S.flow==='ab_preTaskForm'){ var b=document.querySelector('#ovl .modf [data-alt]'); if(b){ b.classList.add('ctdel'); if(S.sel.delArm) b.classList.add('arm'); } } return r; }; })(paintModal);
/* the ABM manager's own Task rules screen shows the same list */
SCREENS.abrules=function(){ return {sc:'Task rules',html:empty('settings','Tasks are set up by the administrator','Every task — pre-sales, sales and post-sales — is created and managed in Masters → Task configurator.'),cta:''}; };
SCREENS.abrules_old=function(){ var u=me(); if(!isMgr(u)) return {sc:'Task rules',html:empty('lock','Only the ABM Manager edits task rules',''),cta:''};
  return {sc:'Task rules', html:'<div class="hdrow"><div><div class="h1">Task rules</div><div class="sub">Pre-sales tasks for the prospect’s ABM — the journey’s own, and the ones added on a stage. The same list as the ABM pre-sales tab of the Call tasks configurator.</div></div></div>'+diamonds()+abRulesBody(true),
    cta:'<button class="btn primary sm" data-flow="ab_preTaskForm">'+ic('plus')+'Add task</button>'}; };

/* an ABM flow saves when it commits, so the task engine runs at once */
commit=(function(c0){ return function(){ var f=S.flow; var r=c0.apply(this,arguments); if(f&&f.indexOf('ab_')===0&&S.flow!==f){ save(); paint(); } return r; }; })(commit);
/* the prospect's task card lists every open task — the journey's and any added stage task */
function preTaskCard(p){ var ts=(S.data.ptk||[]).filter(function(t){ return t.pro===p.id; }); if(!ts.length) return '';
  var open=ts.filter(function(t){return !t.done;}).sort(function(a,b){return a.dueAt-b.dueAt;}), last=ts.filter(function(t){return t.done;}).sort(function(a,b){return b.doneAt-a.doneAt;})[0];
  var row=function(o){ var r=by(S.data.prules2,o.rule)||{}; return '<div class="zkv"><span>Open · '+esc(o.rule)+(o.k==='custom'?' · added':'')+'</span><b>'+esc(o.title)+'</b><div class="mt8">'+chip(dueTx(o),dueTone(o),true,true)+' <span class="meta">'+esc(fmt(o.dueAt))+'</span></div>'+
    (canWork(p)?'<div class="flex wrap mt8">'+(r.call!==0?'<button class="btn sm" data-flow="ab_call" data-id="'+p.id+'">'+ic('phone')+'Call</button>':'<button class="btn sm" data-tkdone="'+o.id+'">'+ic('check')+'Mark done</button>')+'</div>':'')+'</div>'; };
  return zc(open.length>1?'Tasks':'Task',(open.length?open.map(row).join(''):'<div class="zkv"><b class="meta" style="font-weight:400">No open task</b></div>')+
    (last?'<div class="zkv"><span>Last done</span><b style="font-weight:500">'+esc(last.title)+'</b><div class="meta">'+esc(fmt(last.doneAt))+' · '+esc(last.how||'')+'</div></div>':''),
    '<button class="link" data-go="abtasks">All tasks</button>'); }
