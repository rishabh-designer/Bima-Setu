/* ==================================================================== *
 *  Task rules — the configurator (spec 07 v3). Admin here is the sales
 *  manager or the RM head. A rule is a condition set, not a trigger:
 *    rule = { id, n, when:[[cond]], pf, rt, ot, ap, pp, gp,
 *             waitN, waitU, recheck:'off'|'hourly'|'daily',
 *             ti, cl:'sla'|'fu', du, duu, ec, ecu, repeat, max,
 *             closeWhen:[[cond]], from, until, sea, act, fd }
 *    cond = { type:'stage'|'status'|'disp'|'task', op:'is'|'isnot', value, task }
 *  AND inside a group, OR between groups. The engine runs on every
 *  event on a line and at the hourly / daily checks when the clock moves.
 * ==================================================================== */
/* [stated 24 Sep · TBD-05] Unreachable joins the list — rules can be written against it */
var STATUS_OPTS=[['open','Open'],['park','Time Pending'],['lost','Lost'],['disq','Disqualified'],['noapp','No Appetite'],['unreach','Unreachable'],['withdrawn','Withdrawn']];
var TSTATE_OPTS=[['pending','Pending'],['over','Overdue'],['esc','Escalated'],['done','Done']];
var RECHECK_OPTS=[['off','Off'],['hourly','Hourly'],['daily','Daily']];
function C(type,op,value,task){ return {type:type,op:op,value:String(value),task:task||''}; }
function statusLabel(v){ for(var i=0;i<STATUS_OPTS.length;i++) if(STATUS_OPTS[i][0]===v) return STATUS_OPTS[i][1]; return v; }
function tstateLabel(v){ for(var i=0;i<TSTATE_OPTS.length;i++) if(TSTATE_OPTS[i][0]===v) return TSTATE_OPTS[i][1]; return v; }

/* ---------- the working calendar, held in S.data.cfg ---------- */
function cfg(){ if(!S.data.cfg) S.data.cfg={ws:10,we:19,dailyH:10,hol:HOL.slice()}; return S.data.cfg; }
function applyCfg(){ var c=cfg(); WH.start=c.ws; WH.end=c.we; HOL.length=0; c.hol.forEach(function(h){ HOL.push(h); }); }
function nextCheck(after,kind){
  var c=cfg(), d=new Date(after); d.setMinutes(0,0,0); d=new Date(d.getTime()+3600000); var g=0;
  while(g++<24*60){ var h=d.getHours();
    if(isWorkDay(d) && (kind==='hourly' ? (h>=c.ws && h<c.we) : h===c.dailyH)) return d.getTime();
    d=new Date(d.getTime()+3600000); }
  return after+3600000;
}

/* ---------- reading a line for the conditions ---------- */
function lastDisp(l){ if(l.lastDisp) return l.lastDisp; for(var i=0;i<(l.log||[]).length;i++){ var e=l.log[i]; if(e.kind==='call'){ var m=/^Call · (.+)$/.exec(e.t); if(m) return m[1]; } } return ''; }
function dispGroupOf(name){ var d=DISP.filter(function(x){return x.n===name;})[0]; return d?(d.g==='A'?'nc':'c'):''; }
function taskStateOf(t){ var s=taskState(t); return s==='today'?'pending':s; }
function latestTaskTitled(l,title){ var ts=tasksOfLine(l.id).filter(function(t){return t.title===title;}); return ts.length?ts[ts.length-1]:null; }
/* which other rules point at a task title in their conditions — a rename is refused while any do */
function titleRefs(title,skipId){ var out=[]; S.data.rules.forEach(function(q){ if(q.id===skipId) return;
  [q.when,q.closeWhen].forEach(function(gs){ (gs||[]).forEach(function(g){ g.forEach(function(c){ if(c.type==='task'&&c.task===title&&out.indexOf(q.id)<0) out.push(q.id); }); }); }); }); return out; }
function evalCond(c,l){
  var v=false;
  if(c.type==='stage') v= l.stage===+c.value;
  else if(c.type==='status') v= l.status===c.value;
  else if(c.type==='disp'){ var d=lastDisp(l); if(!d) v=false; else if(String(c.value).indexOf('group:')===0) v= dispGroupOf(d)===c.value.slice(6); else v= d===c.value; }
  /* [stated 24 Sep · TBD-42] a task the SYSTEM closed does not count as Done. Only a person
     finishing the work satisfies a Done condition, so a chained rule does not fire off a
     self-closing task. */
  else if(c.type==='ident'){ var a=acctOf(l); v= !!a && (c.value==='verified'?!a.prov:!!a.prov); }
  else if(c.type==='payreq'){ var ps=l.pay==='pre'?'none':(l.pay==='ticket'?'ops':(l.pay==='back'?'back':(l.pay==='shared'?'shared':'paid'))); v= ps===c.value; }
  else if(c.type==='task'){ var t=latestTaskTitled(l,c.task); v= !!t && taskStateOf(t)===c.value && !(c.value==='done'&&t.doneBy==='system'); }
  return c.op==='isnot' ? !v : v;
}
function hasConds(gs){ return !!gs && gs.some(function(g){ return g.length>0; }); }
function evalGroups(gs,l){ return hasConds(gs) && gs.some(function(g){ return g.length>0 && g.every(function(c){ return evalCond(c,l); }); }); }
function ruleFilters(r,l){
  if(r.pc&&r.pc.length&&r.pc.indexOf(CATOF[l.product]||'')<0) return false;
  if(r.pf&&r.pf.length&&r.pf.indexOf(l.product)<0) return false;
  if(r.tm){ var ow=userById(l.owner); if(!ow||(ow.mgr!==r.tm&&l.owner!==r.tm)) return false; }
  if(r.rt==='dau'&&l.rate!==1) return false; if(r.rt==='plc'&&l.rate!==0) return false;
  /* [stated 23 Sep] a renewal is a line, not an opportunity — read the line */
  if(r.ot==='ren'&&!isRen(l)) return false; if(r.ot==='new'&&isRen(l)) return false;
  if(r.ap==='ppl'&&(r.pp||[]).indexOf(l.owner)<0) return false;
  if(r.ap==='grp'&&!(GROUPS[r.gp]||[]).some(function(u){return u===l.owner;})) return false;
  return true;
}
function ruleLive(r){ if(!r.act) return false; var d=ymd(S.now); if(r.from&&d<r.from) return false; if(r.until&&d>r.until) return false; if(r.seaF&&r.seaT){ var md=d.slice(5); if(r.seaF<=r.seaT?(md<r.seaF||md>r.seaT):(md<r.seaF&&md>r.seaT)) return false; } return true; }
function ruleApplies(r,l){ return ruleLive(r) && ruleFilters(r,l); }

/* ---------- per line, per rule: the turn ---------- */
function rtOf(l,id){ if(!l.rt) l.rt={}; if(!l.rt[id]) l.rt[id]={wasTrue:false,since:0,turnMade:false,count:0}; return l.rt[id]; }
function openTasksOf(l,rid){ return tasksOfLine(l.id).filter(function(t){ return !t.done && t.rule===rid; }); }
function lastDoneAt(l,rid){ var m=0; tasksOfLine(l.id).forEach(function(t){ if(t.done&&t.rule===rid&&t.doneAt>m) m=t.doneAt; }); return m; }
function waitEnd(r,l,rs){ if(!(+r.waitN>0)) return 0; var ld=lastDoneAt(l,r.id), base=(r.repeat&&rs.turnMade&&ld)?ld:(rs.since||S.now); return addWork(base,durMins(+r.waitN,r.waitU)); }
function blockReason(r,l,rs){
  if(!r.repeat && rs.turnMade) return {k:'turn',tx:'Already created for this turn'};
  if(openTasksOf(l,r.id).length) return {k:'open',tx:'Its last task is still open'};
  if(r.repeat && +r.max>0 && rs.count>=+r.max) return {k:'max',tx:'Maximum of '+r.max+' reached'};
  var we=waitEnd(r,l,rs); if(we && S.now<we) return {k:'wait',tx:'Waiting until '+fmt(we)};
  return null;
}
function rlog(kind,l,t,m){ if(!S.data.rlog) S.data.rlog=[]; S.data.rlog.unshift({at:S.now,kind:kind,line:l?l.id:'',t:t,m:m||''}); if(S.data.rlog.length>240) S.data.rlog.length=240; }
var RUN={closed:0};
function closeBySystem(t,l,r){ t.done=1; t.doneAt=S.now; t.doneBy='system'; t.closeWhy=plainGroups(r.closeWhen); RUN.closed++; rlog('close',l,'Closed by the system · “'+t.title+'”',r.id+' · close when '+t.closeWhy); }
function runRules(kind,lines){
  var made=[], via= kind==='event' ? 'at once' : (kind+' check');
  lines.forEach(function(l){
    for(var pass=0; pass<10; pass++){
      var changed=false;
      S.data.rules.forEach(function(r){
        if(!ruleLive(r)) return;
        if(kind!=='event' && r.recheck!==kind) return;
        var rs=rtOf(l,r.id);
        if(hasConds(r.closeWhen) && evalGroups(r.closeWhen,l)){ openTasksOf(l,r.id).forEach(function(t){ closeBySystem(t,l,r); changed=true; }); }
        var cur= ruleFilters(r,l) && evalGroups(r.when,l);
        if(!cur){ rs.wasTrue=false; rs.since=0; rs.turnMade=false; return; }
        if(!rs.wasTrue){ rs.wasTrue=true; rs.since=S.now; rs.turnMade=false; }
        if(blockReason(r,l,rs)) return;
        if(hasConds(r.closeWhen) && evalGroups(r.closeWhen,l)) return; /* would close the moment it appears */
        var due=addWork(S.now,durMins(+r.du,r.duu)), escAt= r.cl==='sla' ? addWork(due,durMins(+r.ec,r.ecu)) : 0;
        var t={id:'T-'+(S.data.seq.task++),line:l.id,acct:null,owner:l.owner,title:r.ti,desc:r.desc||'',cls:r.cl==='sla'?'SLA':'Follow-up',createdAt:S.now,dueAt:due,escAt:escAt,done:0,doneAt:0,doneBy:'',rule:r.id,seen:'pending'};
        S.data.tasks.push(t); rs.turnMade=true; rs.count++; r.fd=(r.fd||0)+1; made.push(t); changed=true;
        rlog('make',l,'Task created · “'+r.ti+'”',r.id+' · '+via+' · for '+uname(l.owner)+' · due '+fmt(due)+(escAt?' · escalates '+fmt(escAt):' · never escalates'));
      });
      if(!changed) break;
    }
  });
  return made;
}
/* at seed time the lines already carry the tasks their rules made — mark those turns as made */
function primeRules(){ liveLines().forEach(function(l){ S.data.rules.forEach(function(r){ if(ruleFilters(r,l)&&evalGroups(r.when,l)){ var rs=rtOf(l,r.id); rs.wasTrue=true; rs.since=l.enteredAt||l.createdAt||S.now; rs.turnMade=true; rs.count=tasksOfLine(l.id).filter(function(t){return t.rule===r.id;}).length; } }); }); }
/* every event on a line ends here; the old (l,on,at) callers still work */
function fireRules(l){ return runRules('event',[l]); }
function liveLines(){ return S.data.lines.filter(function(l){ return !dead(l); }); }
function sweepStates(){
  parkSweep();
  S.data.tasks.forEach(function(t){ if(t.done) return; var s=taskStateOf(t); if(s!==(t.seen||'pending')){ var l=lineById(t.line);
    if(s==='over') rlog('esc',l,'Overdue · “'+t.title+'”','Shown to '+uname(t.owner)+' only');
    if(s==='esc'){ var u=userById(t.owner); rlog('esc',l,'Escalated · “'+t.title+'”','Now with '+uname(u&&u.mgr?u.mgr:'vikram')+', the owner’s manager'); }
    t.seen=s; } });
}
/* the prototype clock: every scheduled check between now and the target runs */
function advanceClock(target){
  var n={h:0,d:0,made:0}, guard=0; RUN.closed=0;
  while(guard++<3000){
    var th=nextCheck(S.now,'hourly'), td=nextCheck(S.now,'daily'), t=Math.min(th,td);
    if(t>target) break;
    S.now=t; sweepStates();
    if(td===t){ n.d++; n.made+=runRules('daily',liveLines()).length; }
    if(th===t){ n.h++; n.made+=runRules('hourly',liveLines()).length; }
  }
  if(target>S.now) S.now=target; sweepStates();
  n.ren=renSweep(true).length;
  rlog('time',null,'Clock moved to '+fmt(S.now), plural(n.h,'hourly check')+' and '+plural(n.d,'daily check')+' ran · '+n.made+' created · '+RUN.closed+' closed');
  return n;
}

/* ---------- sentences ---------- */
function dispLabel(v){ v=String(v); if(v==='group:nc') return 'any No connect'; if(v==='group:c') return 'any Connected'; return v; }
function condPlain(c){ var op=c.op==='isnot'?' is not ':' is ';
  if(c.type==='stage') return 'stage'+op+c.value+' · '+stageName(+c.value);
  if(c.type==='status') return 'status'+op+statusLabel(c.value);
  if(c.type==='disp') return 'latest call'+op+(String(c.value).indexOf('group:')===0?dispLabel(c.value):'“'+c.value+'”');
  if(c.type==='ident') return 'account identity'+op+(c.value==='verified'?'Verified':'Provisional');
  if(c.type==='payreq') return 'payment request'+op+PAYREQ_LBL[c.value];
  return '“'+(c.task||'…')+'”'+op+tstateLabel(c.value); }
var PAYREQ_LBL={none:'not raised',ops:'with Ops',back:'details returned',shared:'shared',paid:'paid'};
function condHtml(c){ var op=c.op==='isnot'?' is not ':' is ';
  if(c.type==='stage') return 'stage'+op+'<b>'+esc(c.value+' · '+stageName(+c.value))+'</b>';
  if(c.type==='status') return 'status'+op+'<b>'+esc(statusLabel(c.value))+'</b>';
  if(c.type==='disp') return 'latest call'+op+'<b>'+esc(dispLabel(c.value))+'</b>';
  if(c.type==='ident') return 'account identity'+op+'<b>'+(c.value==='verified'?'Verified':'Provisional')+'</b>';
  if(c.type==='payreq') return 'payment request'+op+'<b>'+esc(PAYREQ_LBL[c.value])+'</b>';
  return '<b>“'+esc(c.task||'…')+'”</b>'+op+'<b>'+esc(tstateLabel(c.value))+'</b>'; }
function liveGroups(gs){ return (gs||[]).filter(function(g){ return g.length; }); }
function plainGroups(gs){ var g=liveGroups(gs); return g.map(function(x){ var s=x.map(condPlain).join(' AND '); return g.length>1?'('+s+')':s; }).join(' OR '); }
function htmlGroups(gs){ var g=liveGroups(gs); if(!g.length) return '<span class="meta">no conditions yet</span>'; return g.map(function(x){ var s=x.map(condHtml).join(' and '); return g.length>1?'('+s+')':s; }).join(' <i>or</i> '); }
function ruleScope(r){ var p=[]; if(r.pc&&r.pc.length) p.push(r.pc.join(', ')); if(r.tm) p.push(uname(r.tm)+'’s team'); if(r.pf&&r.pf.length) p.push(r.pf.join(', ')); if(r.rt==='dau') p.push('DUA only'); if(r.rt==='plc') p.push('placement only'); if(r.ot==='ren') p.push('renewals'); if(r.ot==='new') p.push('new business'); if(r.ap==='ppl') p.push('owned by '+(r.pp||[]).map(uname).join(', ')); if(r.ap==='grp') p.push(r.gp); return p.join(' · '); }
function ruleSentence(r){
  var s='When '+htmlGroups(r.when);
  var sc=ruleScope(r); s+=sc?', only if <b>'+esc(sc)+'</b>':', <b>for all lines</b>';
  if(+r.waitN>0) s+=', wait <b>'+esc(durTx(+r.waitN,r.waitU))+'</b>, then'; else s+=',';
  s+=' create '+(r.cl==='sla'?'an <b>SLA</b>':'a <b>Follow-up</b>')+' task <b>“'+esc(r.ti||'…')+'”</b> for <b>the line owner</b>, due in <b>'+esc(durTx(+r.du||0,r.duu))+'</b>';
  s+= r.cl==='sla' ? ', escalating to their manager <b>'+esc(durTx(+r.ec||0,r.ecu))+'</b> after that.' : '. It stops at Overdue and never escalates.';
  s+=' Re-checked <b>'+(r.recheck==='off'?'never':r.recheck)+'</b>.';
  if(r.repeat) s+=' Repeats while the conditions stay true, '+(+r.max>0?'stopping after <b>'+esc(r.max)+'</b>.':'with <b>no maximum</b>.');
  s+= hasConds(r.closeWhen) ? ' Closes itself when '+htmlGroups(r.closeWhen)+'.' : ' Closed by hand.';
  var w=(r.from?'Active from '+esc(fmtD(new Date(r.from+'T00:00:00').getTime())):'')+(r.until?' until '+esc(fmtD(new Date(r.until+'T00:00:00').getTime())):'')+(r.seaF&&r.seaT?' · each year '+esc(r.seaF.split('-').reverse().join('/'))+' to '+esc(r.seaT.split('-').reverse().join('/')):'');
  return s+(w?' <span class="meta">'+w+'</span>':'');
}

/* ---------- validation ---------- */
function ruleErrors(b,id){
  var e={};
  if(!(b.n||'').trim()) e.n='Name the rule.';
  if(!(b.ti||'').trim()) e.ti='The task needs a title — it is what the owner sees.';
  else if(S.data.rules.some(function(r){ return r.id!==id && r.ti.trim().toLowerCase()===b.ti.trim().toLowerCase(); })) e.ti='Another rule already creates a task with this title. Titles must be unique, because conditions point at them.';
  /* [stated 24 Sep · TBD-43] a rename is REFUSED, not carried through: a title other rules point
     at cannot be changed here. Repoint those conditions first, or duplicate the rule. */
  else if(id!=='new'){ var was=by(S.data.rules,id); if(was && was.ti && was.ti!==b.ti.trim()){ var ptr=titleRefs(was.ti,id); if(ptr.length) e.ti='Cannot rename: '+ptr.join(', ')+' '+(ptr.length===1?'points':'point')+' at \u201c'+was.ti+'\u201d in '+(ptr.length===1?'its':'their')+' conditions. Change those first.'; } }
  if(!hasConds(b.when)) e.when='Add at least one condition.';
  var bad=false; [b.when,b.closeWhen].forEach(function(gs){ (gs||[]).forEach(function(g){ g.forEach(function(c){ if(c.type==='task'&&!c.task) bad=true; }); }); });
  if(bad) e.cond='Pick a task name for every Task condition.';
  if(!(+b.du>0)) e.du='Due in needs at least 1.';
  if(b.cl==='sla' && !(+b.ec>0)) e.ec='An SLA task needs an escalation clock — or make it a Follow-up.';
  if(b.repeat && +b.max<0) e.max='Maximum cannot be negative.';
  if(b.ap==='ppl' && !(b.pp||[]).length) e.pp='Pick at least one person.';
  if(b.ap==='grp' && !b.gp) e.gp='Pick a group.';
  if(b.until && b.from && b.until<b.from) e.until='Ends before it starts.';
  if((b.seaF&&!b.seaT)||(!b.seaF&&b.seaT)) e.sea='A season needs both a start and an end.';
  return e;
}
function ruleWarnings(b){
  var w=[], c=cfg();
  liveGroups(b.when).forEach(function(g,i){ var sv={}; g.forEach(function(x){ if(x.type==='stage'&&x.op==='is') sv[x.value]=1; }); if(Object.keys(sv).length>1) w.push('Group '+(i+1)+' can never be true: a line is at one stage at a time. Put the second stage in its own OR group.'); });
  if(+b.waitN>0 && b.recheck==='off') w.push('A wait needs a check to serve it. With Re-check off, the task appears only when something else changes on the line after the wait.');
  if(+b.waitN>0 && b.waitU==='h' && b.recheck==='daily') w.push('A wait in hours on a daily check lands on the next '+p2(c.dailyH)+':00. Use Hourly to serve it within the hour.');
  if(b.repeat && !(+b.max>0)) w.push('Repeats with no maximum. It keeps creating a task each time the last one is done, for as long as the conditions hold.');
  if(b.repeat && b.recheck==='off' && !(+b.waitN>0)) w.push('Repeat with no wait and no check: the next task appears the moment the last one is ticked.');
  if((b.rt==='dau'||b.rt==='plc') && liveGroups(b.when).some(function(g){ return g.some(function(x){ return x.type==='stage'&&x.op==='is'&&+x.value<3; }); })) w.push('DUA or placement is known only once the requirement is captured (stage 3). At stage 1 or 2 this filter never matches.');
  return w;
}

/* ---------- small ui ---------- */
function p2(n){ return (n<10?'0':'')+n; }
function rsel(id,attrs,opts,cur,cls){ return '<select class="sel'+(cls?' '+cls:'')+'" id="'+id+'" '+attrs+'>'+opts.map(function(o){ var v=Array.isArray(o)?o[0]:o, l=Array.isArray(o)?o[1]:o; return '<option value="'+esc(v)+'"'+(String(v)===String(cur)?' selected':'')+'>'+esc(l)+'</option>'; }).join('')+'</select>'; }
function rseg(key,opts,cur){ return '<div class="seg">'+opts.map(function(o){ return '<button type="button" data-rbset="'+key+'" data-rv="'+esc(o[0])+'"'+(String(cur)===String(o[0])?' class="on"':'')+'>'+esc(o[1])+'</button>'; }).join('')+'</div>'; }
function rfield(label,inner,hint,err){ return '<div class="field"><div class="lbl">'+esc(label)+'</div>'+inner+(err?'<div class="err">'+esc(err)+'</div>':(hint?'<div class="hint">'+esc(hint)+'</div>':''))+'</div>'; }
function rulesTabs(cur){ var open=S.data.tasks.filter(function(t){return !t.done&&t.rule;}).length; return '<div class="tabs atabs" style="justify-content:flex-start;margin:0 0 16px">'+[['rules','Rules',S.data.rules.filter(function(r){return r.act;}).length+' active'],['rulesim','Simulator',open+' open by rule'],['rulecfg','Task settings','Mon–Fri '+p2(cfg().ws)+':00–'+p2(cfg().we)+':00']].map(function(t){ return '<button data-go="'+t[0]+'"'+(cur===t[0]?' class="on"':'')+'>'+esc(t[1])+' <span class="meta">'+esc(t[2])+'</span></button>'; }).join('')+'</div>'; }
function rulesLock(){ return noAccess('screen'); }
function fired30(r){ var since=S.now-30*86400000; var n=S.data.tasks.filter(function(t){ return t.rule===r.id&&t.createdAt>=since; }).length; return n||(r.fd&&!S.data.tasks.some(function(t){return t.rule===r.id;})?r.fd:n); }

/* ---------- R1 · the list ---------- */
SCREENS.rules=function(){
  var u=me(); if(!isMgrRole(u)) return rulesLock();
  var rs=S.data.rules; S.ui.rb=null; S.ui.rb_id=''; S.ui.rb_touch=0;
  var sk=S.ui.rsort||'fd', dir=S.ui.rdir||'desc', appl=function(r){ return S.data.lines.filter(function(l){ return !dead(l)&&ruleFilters(r,l); }).length; };
  var sorted=rs.slice().sort(function(a,b){ var va=sk==='fd'?(a.fd||0):(sk==='n'?a.n:(sk==='ap'?appl(a):(a.act?1:0))), vb=sk==='fd'?(b.fd||0):(sk==='n'?b.n:(sk==='ap'?appl(b):(b.act?1:0))); var c=va<vb?-1:(va>vb?1:0); return dir==='desc'?-c:c; });
  var th=function(k,lbl){ return '<th><button class="link" data-rsort="'+k+'">'+esc(lbl)+(sk===k?(dir==='desc'?' ↓':' ↑'):'')+'</button></th>'; };
  var rows=sorted.map(function(r){
    var sc=ruleScope(r), openN=S.data.tasks.filter(function(t){return !t.done&&t.rule===r.id;}).length, ap=appl(r);
    return '<tr class="row'+(r.act?'':' dim')+'" data-go="rule" data-id="'+r.id+'"><td class="id">'+esc(r.id)+'<span class="nm">'+esc(r.n)+'</span>'+(!(r.fd>0)?' '+chip('Never fired','amber',false,true):'')+(!r.act&&openN?'<span class="meta" style="display:block;font-weight:400">'+plural(openN,'task')+' still open</span>':'')+'</td>'+
      '<td class="when">'+htmlGroups(r.when)+'<div class="cw">'+(hasConds(r.closeWhen)?'<span class="meta">closes when</span> '+htmlGroups(r.closeWhen):'<span class="meta">closed by hand</span>')+'</div></td>'+
      '<td>'+(sc?esc(sc):'<span class="meta">all lines</span>')+'</td>'+
      '<td>'+(r.ap==='grp'?esc(r.gp)+' <span class="meta">· '+((GROUPS[r.gp]||[]).length===1?'1 person':(GROUPS[r.gp]||[]).length+' people')+'</span>':(r.ap==='ppl'?((r.pp||[]).length===1?'1 person':(r.pp||[]).length+' people'):'Line owner'))+'<div class="meta">'+plural(ap,'live line')+' now</div></td>'+
      '<td><span class="tt">'+esc(r.ti)+'</span><div>'+chip(r.cl==='sla'?'SLA':'Follow-up',r.cl==='sla'?'violet':'neutral',false,true)+'</div><div class="meta">due in '+esc(durTx(+r.du,r.duu))+'</div></td>'+
      '<td class="num">'+fired30(r)+'<div class="meta">last 30 days</div></td>'+
      '<td><button class="btn xs'+(r.act?'':' outline')+'" data-ruletoggle="'+r.id+'">'+(r.act?'On':'Off')+'</button></td></tr>';
  }).join('');
  var html='<div class="hdrow"><div><div class="h1">Task rules</div><div class="sub">Every task that is not typed by hand comes from one of these. A rule fires when its conditions are true: built from stages, statuses, the latest call and task names, joined with AND inside a group and OR between groups. Nothing here moves a stage or a status.</div></div><span class="sp"></span><div class="acts"><button class="btn sm" data-go="rulesim">Try them in the simulator</button></div></div>'+diamonds()+rulesTabs('rules')+
    '<div class="card" style="overflow:hidden">'+(rs.length?'<div class="tw"><table class="t rules"><thead><tr>'+th('n','Rule')+'<th>When · closes when</th><th>Only if</th>'+th('ap','Applies to')+'<th>Task</th>'+th('fd','Fired')+th('act','Active')+'</tr></thead><tbody>'+rows+'</tbody></table></div>':empty('settings','No rules yet','Every task that is not typed by hand comes from a rule. Create the first one.','<button class="btn" data-go="rule" data-id="new">'+ic('plus')+'Create a task rule</button>'))+'</div>'+
    '<div class="gap12 mt16">'+note('neutral','How a rule fires','It is tested the moment something changes on a line, and again at its hourly or daily check when the clock moves — never at the moment it is saved. It creates its task once each time its conditions turn from false to true; with Repeat on, it creates again once the last task is done and the wait has passed. A task the owner leaves open blocks the next one from the same rule. Turning a rule off keeps its history and its tasks; deleting is not offered.','info')+'</div>';
  return {sc:'Task rules', ctx:plural(rs.filter(function(r){return r.act;}).length,'active rule'), html:html, cta:'<button class="btn primary" data-go="rule" data-id="new">'+ic('plus')+'Create a task rule</button>'};
};
HANDLERS.push(function(t){ var x=t.closest('[data-rsort]'); if(!x) return false; var k=x.dataset.rsort; if(S.ui.rsort===k||(!S.ui.rsort&&k==='fd')) S.ui.rdir=(S.ui.rdir||'desc')==='desc'?'asc':'desc'; else { S.ui.rsort=k; S.ui.rdir='desc'; } paint(); return true; });
HANDLERS.push(function(t){ var x=t.closest('[data-ruletoggle]'); if(!x) return false; var r=by(S.data.rules,x.dataset.ruletoggle); if(!r) return true; var ok=write(function(){ r.act=r.act?0:1; },'the rule'); if(ok){ paint(); toast(r.act?'Rule on':'Rule off',r.act?r.n+' fires from now on.':r.n+' will not create or close tasks. Existing tasks stay.'); } return true; });

/* ---------- R2 · the builder ---------- */
function newRule(){ return {id:'new',n:'',when:[[C('stage','is',1),C('status','is','open')]],pf:[],rt:'',ot:'',ap:'all',pp:[],gp:'',waitN:0,waitU:'h',recheck:'daily',ti:'',cl:'sla',du:1,duu:'d',ec:1,ecu:'d',repeat:false,max:0,closeWhen:[],from:ymd(S.now),until:'',sea:'',act:1,fd:0}; }
function rbLoad(id){
  var r= id==='new' ? newRule() : by(S.data.rules,id); if(!r) return null;
  if(S.ui.rb_id!==id){ S.ui.rb_id=id; S.ui.rb=JSON.parse(JSON.stringify(r)); S.ui.rb.when=liveGroups(S.ui.rb.when); if(!S.ui.rb.when.length) S.ui.rb.when=[[]]; S.ui.rb.closeWhen=liveGroups(S.ui.rb.closeWhen); S.ui.rb.repeat=!!S.ui.rb.repeat; S.ui.rb_touch=0; }
  return r;
}
function taskNames(){ var out=[]; S.data.rules.forEach(function(r){ if(r.ti&&out.indexOf(r.ti)<0) out.push(r.ti); }); var d=S.ui.rb; if(d&&d.ti&&out.indexOf(d.ti)<0) out.push(d.ti); return out; }
function condRow(cw,g,ci,c){
  var idp='c_'+cw+'_'+g+'_'+ci+'_', da=' data-cw="'+cw+'" data-g="'+g+'" data-c="'+ci+'"';
  var typeSel=rsel(idp+'type','data-ck="type"'+da+' aria-label="Condition on"',[['stage','Stage'],['status','Line status'],['disp','Latest call'],['task','Task'],['ident','Account identity'],['payreq','Payment request']],c.type);
  var opSel=rsel(idp+'op','data-ck="op"'+da+' aria-label="is or is not"',[['is','is'],['isnot','is not']],c.op,'op');
  var rest;
  if(c.type==='stage') rest=opSel+rsel(idp+'value','data-ck="value"'+da+' aria-label="Stage"',STAGES.map(function(s){ return [s.n,s.n+' · '+s.s]; }),c.value);
  else if(c.type==='status') rest=opSel+rsel(idp+'value','data-ck="value"'+da+' aria-label="Status"',STATUS_OPTS,c.value);
  else if(c.type==='disp') rest=opSel+rsel(idp+'value','data-ck="value"'+da+' aria-label="Disposition"',[['group:nc','any No connect'],['group:c','any Connected']].concat(DISP.map(function(d){ return [d.n,d.n]; })),c.value);
  else if(c.type==='ident') rest=opSel+rsel(idp+'value','data-ck="value"'+da+' aria-label="Identity"',[['prov','Provisional'],['verified','Verified']],c.value);
  else if(c.type==='payreq') rest=opSel+rsel(idp+'value','data-ck="value"'+da+' aria-label="Payment request"',Object.keys(PAYREQ_LBL).map(function(k){return [k,PAYREQ_LBL[k]];}),c.value);
  else rest=rsel(idp+'task','data-ck="task"'+da+' aria-label="Task name"',[['','Choose a task…']].concat(taskNames().map(function(n){ return [n,n]; })),c.task)+opSel+rsel(idp+'value','data-ck="value"'+da+' aria-label="Task state"',TSTATE_OPTS,c.value);
  return '<div class="crow">'+typeSel+rest+'<button type="button" class="x" title="Remove condition" aria-label="Remove condition" data-rcond="del"'+da+'>×</button></div>';
}
function condBuilder(cw,gs,optional){
  if(optional && !gs.length) return note('neutral','','Closed by hand. Add a condition to let this rule close its own tasks — for example when the line leaves the stage.')+'<div class="mt12"><button type="button" class="btn sm" data-rcond="gadd" data-cw="'+cw+'">'+ic('plus')+'Add a Close when condition</button></div>';
  var h=gs.map(function(g,gi){
    var rows=g.map(function(c,ci){ return (ci?'<div class="joiner">AND</div>':'')+condRow(cw,gi,ci,c); }).join('');
    return (gi?'<div class="orline">OR</div>':'')+'<div class="grp"><div class="grph"><span>Group '+(gi+1)+' · all of these</span><span class="sp"></span>'+((gs.length>1||optional)?'<button type="button" class="btn xs ghost" data-rcond="gdel" data-cw="'+cw+'" data-g="'+gi+'">Remove group</button>':'')+'</div>'+(rows||'<div class="meta" style="padding:4px 2px 8px">No conditions in this group yet.</div>')+'<div style="margin-top:8px"><button type="button" class="btn xs" data-rcond="cadd" data-cw="'+cw+'" data-g="'+gi+'">+ AND condition</button></div></div>';
  }).join('');
  return h+'<div class="mt12"><button type="button" class="btn sm" data-rcond="gadd" data-cw="'+cw+'">+ OR group</button></div>';
}
function workedExample(b){
  var ex=S.data.lines.filter(function(l){ return openLine(l)&&ruleFilters(b,l); })[0]||S.data.lines.filter(function(l){return !dead(l);})[0]||S.data.lines[0];
  var now=S.now, created, tx='';
  if(+b.waitN>0){ var end=addWork(now,durMins(+b.waitN,b.waitU));
    if(b.recheck==='off'){ created=end; tx='Wait ends '+fmt(end)+'. With Re-check off, it appears at the next change on the line after that.'; }
    else { created=nextCheck(end-1,b.recheck); tx='Wait ends '+fmt(end)+'; served by the '+b.recheck+' check.'; } }
  else { created=now; tx='No wait, so it is created at once.'; }
  var due=addWork(created,durMins(+b.du||0,b.duu)), escAt=b.cl==='sla'?addWork(due,durMins(+b.ec||0,b.ecu)):0, mg=ex?userById(ex.owner):null;
  return '<div class="meta">If the conditions turned true now, '+esc(fmt(now))+', on <b>'+esc(ex?ex.id:'a line')+'</b>'+(ex?' ('+esc(uname(ex.owner))+')':'')+':</div><dl class="kvlist mt12"><dt>Created</dt><dd>'+esc(fmt(created))+'</dd><dt>Due</dt><dd>'+esc(fmt(due))+'</dd><dt>Escalates</dt><dd>'+(escAt?esc(fmt(escAt))+' → '+esc(uname(mg&&mg.mgr?mg.mgr:'vikram')):'Never')+'</dd></dl><div class="meta mt12">'+esc(tx)+' Weekends and the '+HOL.length+' listed holidays are skipped.</div>';
}
SCREENS.rule=function(){
  var u=me(); if(!isMgrRole(u)) return rulesLock();
  var id=S.route.id||'new', r=rbLoad(id); if(!r) return SCREENS.notfound();
  var b=S.ui.rb, e=ruleErrors(b,id), w=ruleWarnings(b), t=S.ui.rb_touch, isNew=id==='new', nerr=Object.keys(e).length, c=cfg();
  var html='<div class="crumbs"><button data-go="rules">Task rules</button>'+ic('chevright','ic14')+'<b>'+(isNew?'Create a task rule':esc(id))+'</b></div>'+
    '<div class="hdrow"><div><div class="h1">'+(isNew?'Create a task rule':esc(b.n||id))+'</div><div class="sub">'+(isNew?'Say when the task should appear, then what it is. The sentence alongside is what the rule means, in plain words.':esc(id)+' · fired '+(r.fd||0)+' times · '+(r.act?'on':'off'))+'</div></div><span class="sp"></span><div class="acts">'+'<button class="btn sm ghost" data-go="rules">Cancel</button><button class="btn primary sm" data-rbsave="1"'+(nerr?' disabled':'')+'>'+(isNew?'Create rule':'Save changes')+'</button></div></div>'+diamonds()+
    '<div class="two"><div class="pane"><div class="pb">'+
      '<div class="fgrid">'+rfield('Rule name','<input class="inp" id="rb_n" data-rb="n" value="'+esc(b.n)+'" placeholder="Quote sent · follow-up" autocomplete="off">','What the admin calls it. Not what the owner sees.',t?e.n:'')+'<div></div></div>'+
      rfield('Task description — optional','<input class="inp" id="rb_desc" data-rb="desc" value="'+esc(b.desc||'')+'" placeholder="Call the client, confirm they have seen the QCR, ask which quote">','Shown to the owner under the task title.')+
      diamonds(true)+'<div class="sect">When<small>AND inside a group · OR between groups</small></div><div class="mt12">'+condBuilder('when',b.when,false)+'</div>'+((t&&e.when)?'<div class="err mt8">'+esc(e.when)+'</div>':'')+(e.cond?'<div class="err mt8">'+esc(e.cond)+'</div>':'')+
      diamonds(true)+'<div class="sect">Only for<small>optional filters</small></div>'+
      '<div class="field mt12"><div class="lbl">Product category — none selected means all</div><div class="chips">'+['Property & casualty','Marine & liability','Employee benefits'].map(function(p){ return '<button type="button" data-rbpc="'+esc(p)+'"'+((b.pc||[]).indexOf(p)>=0?' class="on"':'')+'>'+esc(p)+'</button>'; }).join('')+'</div></div>'+
      rfield('Owner’s team',rsel('rb_tm','data-rbsel="tm"',[['','Any team']].concat(S.data.users.filter(function(x){return x.role==='mgr'||x.role==='rmhead';}).map(function(x){ return [x.id,uname(x.id)+'’s team']; })),b.tm||''))+
      '<div class="field mt12"><div class="lbl">Products — none selected means all</div><div class="chips">'+PRODUCTS.map(function(p){ return '<button type="button" data-rbpf="'+esc(p)+'"'+(b.pf.indexOf(p)>=0?' class="on"':'')+'>'+esc(p)+'</button>'; }).join('')+'</div></div>'+
      '<div class="fgrid mt12">'+rfield('Rateable',rsel('rb_rt','data-rbsel="rt"',[['','Either'],['dau','DUA only'],['plc','Placement only']],b.rt),'Known only once the requirement is captured — before that, a DUA-only or placement-only rule does not fire.')+rfield('Opportunity type',rsel('rb_ot','data-rbsel="ot"',[['','Either'],['new','New business'],['ren','Renewal']],b.ot))+'</div>'+
      '<div class="field mt12"><div class="lbl">Owned by</div>'+rseg('ap',[['all','Anyone'],['ppl','Named people'],['grp','A group']],b.ap)+'</div>'+
      (b.ap==='ppl'?'<div class="field"><div class="chips">'+S.data.users.filter(function(x){ return x.role==='exec'||x.role==='rm'; }).map(function(x){ return '<button type="button" data-rbpp="'+x.id+'"'+(b.pp.indexOf(x.id)>=0?' class="on"':'')+'>'+esc(x.n)+'</button>'; }).join('')+'</div>'+(e.pp?'<div class="err">'+esc(e.pp)+'</div>':'')+'</div>':'')+
      (b.ap==='grp'?rfield('Group',rsel('rb_gp','data-rbsel="gp"',[['','Choose…']].concat(Object.keys(GROUPS).map(function(g){ return [g,g+' · '+GROUPS[g].map(uname).join(', ')]; })),b.gp),'',t?e.gp:''):'')+
      diamonds(true)+'<div class="sect">Then create</div>'+
      '<div class="fgrid mt12">'+rfield('Wait before creating — optional','<div class="numunit"><input class="inp" id="rb_waitN" data-rb="waitN" type="number" min="0" value="'+esc(b.waitN)+'">'+rsel('rb_waitU','data-rbsel="waitU"',[['h','working hours'],['d','working days']],b.waitU)+'</div>','Counted from the moment the conditions turned true. For a repeat, from when the last task was done.')+
        '<div class="field"><div class="lbl">Re-check</div>'+rseg('recheck',RECHECK_OPTS,b.recheck)+'<div class="hint">Hourly runs on the hour in working hours. Daily runs at '+p2(c.dailyH)+':00. Both skip weekends and holidays.</div></div></div>'+
      '<div class="fgrid mt12">'+rfield('Assign to','<input class="inp" value="The line owner" disabled>','Every rule task goes to whoever owns the line.')+'<div></div></div>'+
      '<div class="fgrid mt12">'+rfield('Task title','<input class="inp" id="rb_ti" data-rb="ti" value="'+esc(b.ti)+'" placeholder="Quote sent follow-up" autocomplete="off">','What the owner sees. Also the task name other rules use in their conditions.',(t||b.ti)?e.ti:'')+
        '<div class="field"><div class="lbl">Class</div>'+rseg('cl',[['sla','SLA'],['fu','Follow-up']],b.cl)+'<div class="hint">Only SLA tasks escalate. A Follow-up stops at Overdue.</div></div></div>'+
      '<div class="fgrid mt12">'+rfield('Due in','<div class="numunit"><input class="inp" id="rb_du" data-rb="du" type="number" min="1" value="'+esc(b.du)+'">'+rsel('rb_duu','data-rbsel="duu"',[['h','working hours'],['d','working days']],b.duu)+'</div>','',e.du)+
        (b.cl==='sla'?rfield('Escalate after a further','<div class="numunit"><input class="inp" id="rb_ec" data-rb="ec" type="number" min="1" value="'+esc(b.ec)+'">'+rsel('rb_ecu','data-rbsel="ecu"',[['h','working hours'],['d','working days']],b.ecu)+'</div>','To the owner’s manager. Displayed, never chosen.',e.ec):'<div class="field"><div class="lbl">Escalation</div><div class="meta" style="padding-top:8px">None. Nobody is escalated for a Follow-up.</div></div>')+'</div>'+
      '<div class="fgrid mt12"><div class="field"><div class="lbl">Repeat</div>'+rseg('repeat',[['0','Once per turn'],['1','Repeat']],b.repeat?'1':'0')+'<div class="hint">Repeat creates the task again while the conditions stay true, each time the last one is done and the wait has passed.</div></div>'+
        (b.repeat?rfield('Maximum tasks — optional','<input class="inp" id="rb_max" data-rb="max" type="number" min="0" value="'+esc(b.max)+'" style="max-width:120px">','0 means no maximum. At the maximum the rule just stops. Nothing else happens.',e.max):'<div></div>')+'</div>'+
      diamonds(true)+'<div class="sect">Close when<small>optional auto-close</small></div><div class="mt12">'+condBuilder('closeWhen',b.closeWhen,true)+'</div>'+
      diamonds(true)+'<div class="sect">When it is active</div>'+
      '<div class="fgrid mt12">'+rfield('From','<input class="inp" id="rb_from" data-rb="from" type="date" value="'+esc(b.from)+'">')+rfield('Until — optional','<input class="inp" id="rb_until" data-rb="until" type="date" value="'+esc(b.until)+'">','Leave blank for no end.',e.until)+'</div>'+
      '<div class="fgrid mt12">'+rfield('Season from — optional','<input class="inp" id="rb_seaF" data-rb="seaF" value="'+esc(b.seaF||'')+'" placeholder="MM-DD, e.g. 01-01">','The rule is live only inside this date range, every year.',t?e.sea:'')+rfield('Season to','<input class="inp" id="rb_seaT" data-rb="seaT" value="'+esc(b.seaT||'')+'" placeholder="MM-DD, e.g. 03-31">')+'</div>'+
    '</div></div><div class="rail">'+
      '<div class="sentence">'+ruleSentence(b)+'</div>'+
      card('Worked example',workedExample(b))+
      (nerr?note('red','Before it can be saved','<ul class="ul">'+Object.keys(e).map(function(k){ return '<li>'+esc(e[k])+'</li>'; }).join('')+'</ul>'):note('green','','<b>Complete.</b> '+(isNew?'Creating it does not fire it. It is first tested at the next change on a line'+(b.recheck==='off'?'':' or its next '+b.recheck+' check')+'.':'Saving does not fire it. Future firings use the new settings; tasks already created keep their clocks.')))+
    '</div></div>';
  return {sc:isNew?'Create task rule':'Task rule', ctx:isNew?'New rule':r.id, html:html, cta:''};
};
function rbPaintKeep(id){ paint(); var n=id?document.getElementById(id):null; if(n){ try{ n.focus({preventScroll:true}); if(n.type!=='date'&&n.type!=='number') n.setSelectionRange(n.value.length,n.value.length); }catch(err){} } }
document.addEventListener('input',function(ev){ var t=ev.target; if(!(t instanceof Element)||t.dataset.rb===undefined||!S.ui.rb) return; S.ui.rb[t.dataset.rb]=t.value; rbPaintKeep(t.id); });
document.addEventListener('change',function(ev){
  var t=ev.target; if(!(t instanceof Element)) return; var d=S.ui.rb;
  if(t.dataset.rbsel!==undefined && d){ d[t.dataset.rbsel]=t.value; paint(); }
  else if(t.dataset.ck!==undefined && d){
    var c=d[t.dataset.cw][+t.dataset.g][+t.dataset.c], k=t.dataset.ck;
    if(k==='type'){ c.type=t.value; c.op='is'; c.task=''; c.value= t.value==='stage'?'1':(t.value==='status'?'open':(t.value==='disp'?'group:nc':(t.value==='ident'?'prov':(t.value==='payreq'?'none':'done')))); }
    else c[k]=t.value;
    paint();
  }
  else if(t.dataset.simline!==undefined){ S.ui.simLine=t.value; S.ui.simDisp=''; paint(); }
  else if(t.dataset.simdisp!==undefined){ S.ui.simDisp=t.value; paint(); }
  else if(t.dataset.holdraft!==undefined){ S.ui.holDraft=t.value; paint(); }
  else if(t.dataset.cfg!==undefined){ var kc=t.dataset.cfg, v=parseInt(t.value,10); if(isNaN(v)) return; var c2=cfg();
    var ok=write(function(){ if(kc==='ws') c2.ws=Math.max(0,Math.min(v,c2.we-1)); else if(kc==='we') c2.we=Math.min(24,Math.max(v,c2.ws+1)); else c2.dailyH=v; if(c2.dailyH<c2.ws||c2.dailyH>=c2.we) c2.dailyH=c2.ws; applyCfg(); },'the calendar');
    if(ok) paint(); }
});
HANDLERS.push(function(t){
  var x, d=S.ui.rb;
  if(x=t.closest('[data-rcond]')){ if(!d) return true; var cw=x.dataset.cw, a=x.dataset.rcond, gs=d[cw];
    if(a==='cadd') gs[+x.dataset.g].push(C('stage','is',1));
    else if(a==='del') gs[+x.dataset.g].splice(+x.dataset.c,1);
    else if(a==='gadd'){ var ex=S.data.lines.filter(function(l){return openLine(l);})[0]; gs.push([ cw==='closeWhen' ? C('stage','isnot',firstStageOf(d)||(ex?ex.stage:1)) : C('stage','is',1) ]); }
    else if(a==='gdel'){ gs.splice(+x.dataset.g,1); if(cw==='when'&&!gs.length) gs.push([]); }
    paint(); return true; }
  if(!d) return false;
  if(x=t.closest('[data-rbset]')){ var k=x.dataset.rbset; d[k]= k==='repeat' ? x.dataset.rv==='1' : x.dataset.rv; paint(); return true; }
  if(x=t.closest('[data-rbpc]')){ if(!d.pc) d.pc=[]; var ip=d.pc.indexOf(x.dataset.rbpc); if(ip>=0) d.pc.splice(ip,1); else d.pc.push(x.dataset.rbpc); paint(); return true; }
  if(x=t.closest('[data-rbpf]')){ var i=d.pf.indexOf(x.dataset.rbpf); if(i>=0) d.pf.splice(i,1); else d.pf.push(x.dataset.rbpf); paint(); return true; }
  if(x=t.closest('[data-rbpp]')){ var j=d.pp.indexOf(x.dataset.rbpp); if(j>=0) d.pp.splice(j,1); else d.pp.push(x.dataset.rbpp); paint(); return true; }
  if(x=t.closest('[data-rbdup]')){ var cpy=JSON.parse(JSON.stringify(d)); cpy.id='new'; cpy.n=(cpy.n||'Rule')+' copy'; cpy.ti=(cpy.ti||'Task')+' copy'; cpy.fd=0; S.ui.rb_id='new'; S.ui.rb=cpy; S.ui.rb_touch=0; go('rule',{id:'new'}); toast('Duplicated','Rename the task title, then create it.'); return true; }
  if(x=t.closest('[data-rbsave]')){ if(x.disabled) return true; var id=S.ui.rb_id, e=ruleErrors(d,id); if(Object.keys(e).length){ S.ui.rb_touch=1; paint(); return true; }
    var r, renamed=0;
    var ok=write(function(){
      if(id==='new'){ var mx=0; S.data.rules.forEach(function(q){ var m=q.id.match(/(\d+)$/); if(m) mx=Math.max(mx,+m[1]); }); r={id:'TR-'+p2(mx+1),act:1,fd:0}; S.data.rules.push(r); } else r=by(S.data.rules,id);
      var oldTi=r.ti;
      r.n=d.n.trim(); r.when=liveGroups(d.when); r.pf=d.pf.slice(); r.rt=d.rt; r.ot=d.ot; r.ap=d.ap; r.pp=d.pp.slice(); r.gp=d.gp; r.waitN=+d.waitN||0; r.waitU=d.waitU; r.recheck=d.recheck;
      r.ti=d.ti.trim(); r.cl=d.cl; r.du=+d.du||1; r.duu=d.duu; r.ec=d.cl==='sla'?(+d.ec||1):0; r.ecu=d.ecu; r.repeat=!!d.repeat; r.max=d.repeat?(+d.max||0):0; r.closeWhen=liveGroups(d.closeWhen); r.from=d.from; r.until=d.until; r.sea=d.sea;
      /* [stated 24 Sep · TBD-43] nothing carries through — a referenced title cannot be renamed
         at all, so the only titles that change here are ones no condition points at. */
      if(oldTi && oldTi!==r.ti){ S.data.tasks.forEach(function(tk){ if(tk.rule===r.id&&!tk.done) tk.title=r.ti; }); }
      /* saving does not fire the rule: it is tested from the next change on a line or its next scheduled check */
    },'the rule');
    if(!ok) return true;
    S.ui.rb=null; S.ui.rb_id=''; S.ui.rb_touch=0; go('rules');
    toast(id==='new'?'Rule created — '+r.id:'Rule saved',(id==='new'?'Nothing is created now. It fires from the next change on a line or its next '+(r.recheck==='off'?'change':r.recheck+' check')+'.':'Nothing changes now. Future firings use the new settings.')); return true; }
  return false;
});
function firstStageOf(b){ var s=0; liveGroups(b.when).forEach(function(g){ g.forEach(function(c){ if(!s&&c.type==='stage'&&c.op==='is') s=+c.value; }); }); return s; }

/* ---------- R3 · the simulator: the prototype's own lines and clock ---------- */
function simLine(){ var id=S.ui.simLine||S.route.id, l=id?lineById(id):null; if(!l){ l=S.data.lines.filter(function(x){return openLine(x);})[0]||S.data.lines[0]; } return l; }
function ruleView(r,l){
  var f=ruleFilters(r,l), gs=liveGroups(r.when).map(function(g){ return g.map(function(c){ return {c:c,ok:evalCond(c,l)}; }); });
  var cur=f && gs.some(function(g){ return g.every(function(x){return x.ok;}); }), rs=rtOf(l,r.id), chipH, rank=5;
  if(!ruleLive(r)){ chipH=chip(r.act?'Outside its active window':'Off','neutral',false,true); rank=6; }
  else if(!f){ chipH=chip('Not for this line','neutral',false,true); }
  else if(!cur){ chipH=chip('Conditions false','neutral',false,true); }
  else if(openTasksOf(l,r.id).length){ chipH=chip('Task open','violet',false,true); rank=1; }
  else { var br=blockReason(r,l,rs.wasTrue?rs:{turnMade:false,since:S.now,count:rs.count});
    if(!br){ chipH=chip('Ready — created at its next test','green',false,true); rank=0; }
    else if(br.k==='wait'){ chipH=chip(br.tx,'amber',false,true); rank=2; }
    else { chipH=chip(br.tx,'neutral',false,true); rank=3; } }
  var body=gs.map(function(g,i){ return '<div class="g">'+(gs.length>1?'<b>Group '+(i+1)+':</b> ':'')+g.map(function(x){ return '<span class="'+(x.ok?'ok':'no')+'">'+(x.ok?'✓':'✗')+'</span> '+esc(condPlain(x.c)); }).join(' &nbsp;·&nbsp; ')+'</div>'; }).join('')+
    (ruleScope(r)?'<div class="g"><span class="'+(f?'ok':'no')+'">'+(f?'✓':'✗')+'</span> only for '+esc(ruleScope(r))+'</div>':'')+
    (hasConds(r.closeWhen)?'<div class="g meta">Closes when: '+esc(plainGroups(r.closeWhen))+'</div>':'')+
    '<div class="g"><button class="btn xs" data-go="rule" data-id="'+r.id+'">Open rule</button></div>';
  return {rank:rank, html:'<details class="rv"'+(S.ui['rv_'+r.id]?' open':'')+' data-rv="'+r.id+'"><summary><span class="id">'+esc(r.id)+'</span><span class="tt">'+esc(r.ti)+'</span>'+chip(r.recheck==='off'?'no check':r.recheck,r.recheck==='hourly'?'blue':(r.recheck==='daily'?'green':'neutral'),false,true)+chipH+'</summary><div class="body">'+body+'</div></details>'};
}
function simTaskRow(t,l){
  var s=taskStateOf(t), tone=s==='pending'?'neutral':(s==='done'?'green':'red'), m;
  if(t.done) m='<span>'+(t.doneBy==='system'?'Closed by the system · '+esc(t.closeWhy||''):'Done by '+esc(uname(t.doneBy)))+' · '+esc(fmt(t.doneAt))+'</span>';
  else m='<span>Due '+esc(fmt(t.dueAt))+'</span>'+(t.escAt?'<span>'+(s==='esc'?'Escalated to '+esc(uname((userById(t.owner)||{}).mgr||'vikram')):'Escalates '+esc(fmt(t.escAt)))+'</span>':'<span>Never escalates</span>');
  return '<div class="rtask'+(t.done?' done':'')+'"><span class="tick">'+(t.done?'✓':'')+'</span><div class="bd"><b>'+esc(t.title)+'</b><div class="m">'+chip(tstateLabel(s),tone,false,true)+chip(t.cls,t.cls==='SLA'?'violet':'neutral',false,true)+m+(t.rule?'<button class="rl" data-go="rule" data-id="'+t.rule+'">'+esc(t.rule)+'</button>':'<span class="meta">by hand</span>')+'</div></div></div>';
}
SCREENS.rulesim=function(){
  var u=me(); if(!isMgrRole(u)) return rulesLock();
  var l=simLine(); if(!l) return {sc:'Simulator', html:empty('inbox','No lines yet','Create an opportunity first.'), cta:''};
  var a=acctOf(l), o=oppOf(l), now=S.now, c=cfg();
  var lts=tasksOfLine(l.id), open=lts.filter(function(t){return !t.done;}).sort(function(x,y){return x.dueAt-y.dueAt;}), dn=lts.filter(function(t){return t.done;}).sort(function(x,y){return y.doneAt-x.doneAt;}).slice(0,8);
  var views=S.data.rules.map(function(r){ return ruleView(r,l); }).sort(function(x,y){ return x.rank-y.rank; });
  var inHours=isWorkDay(now)&&new Date(now).getHours()>=c.ws&&new Date(now).getHours()<c.we;
  var log=(S.data.rlog||[]).filter(function(e){ return S.ui.simAll ? true : (!e.line || e.line===l.id); }).slice(0,60);
  var lineOpts=S.data.lines.slice().sort(function(x,y){ return (dead(x)?1:0)-(dead(y)?1:0) || x.id.localeCompare(y.id); }).map(function(x){ var ax=acctOf(x); return [x.id, x.id+' · '+shortName(ax?ax.n:'')+' · '+x.product+' · '+x.stage+' · '+stageName(x.stage)+(dead(x)?' · '+statusTx(x):'')]; });
  var mgr=userById(l.owner), disp=S.ui.simDisp||'';
  var html='<div class="hdrow"><div><div class="h1">Simulator</div><div class="sub">The prototype’s own lines and clock — nothing here is a stand-in. Pick a line, move the clock, act as its owner, and watch the rules create, escalate and close tasks. What you do here is real in this prototype: the tasks land on the owner’s list.</div></div><span class="sp"></span><div class="acts"><button class="btn sm" data-go="line" data-id="'+l.id+'">Open the line</button><button class="btn sm ghost" data-go="rules">Back to the rules</button></div></div>'+diamonds()+rulesTabs('rulesim')+
    '<div class="linehd"><div style="flex:1 1 320px;min-width:0"><div class="lbl">Product line</div>'+rsel('sim_line','data-simline="1"',lineOpts,l.id)+'<div class="meta mt8">'+esc(a?a.n:'')+' · owner <b>'+esc(uname(l.owner))+'</b> · manager '+esc(uname(mgr&&mgr.mgr?mgr.mgr:'vikram'))+' · '+esc(o?o.type:'Renewal')+' · '+(l.rate===1?'DUA':(l.rate===0?'Placement':'route not known yet'))+' · latest call: '+esc(lastDisp(l)||'none yet')+'</div></div>'+
      '<div class="rclock"><span class="meta">Prototype clock'+(inHours?'':' · outside working hours')+'</span><b>'+esc(fmt(now))+'</b><span class="meta">'+esc(fmtD(now))+'</span></div></div>'+
    timeblock('Every scheduled check between now and the target runs. Hourly on the hour '+p2(c.ws)+':00–'+p2(c.we-1)+':00, daily at '+p2(c.dailyH)+':00, working days only.',
      '<button class="timebtn" data-time="30">+30 min</button><button class="timebtn" data-time="next:hourly">Next hourly check · '+esc(fmt(nextCheck(now,'hourly')))+'</button><button class="timebtn" data-time="next:daily">Next daily check · '+esc(fmt(nextCheck(now,'daily')))+'</button><button class="timebtn" data-time="540">+1 working day</button><button class="timebtn" data-time="2700">+1 working week</button><button class="timebtn" data-time="0">Back to the seed clock</button>')+
    '<div class="simgrid mt16">'+
     '<div class="gap12">'+
      '<div class="sim"><div class="st">'+ic('zap','ic14')+'Act as '+esc(uname(l.owner))+'<span class="tag">Prototype only</span></div><div class="sn">What the owner would do on the line, without switching chairs. Stage moves and calls here are logged on the line like the real thing.</div>'+
        (dead(l)?'<div class="meta">The line is '+esc(statusTx(l))+' — nothing more happens on it.</div>':
        '<div class="lbl" style="margin-bottom:6px">Move the stage</div><div class="stagebar rs">'+STAGES.map(function(s){ var n=s.n; return '<button class="'+(n<l.stage?'done':(n===l.stage?'now':''))+'" data-simstage="'+n+'" title="'+esc(s.s)+'">'+n+'</button>'; }).join('')+'</div><div class="meta" style="margin:-6px 0 10px">Now at '+l.stage+' · '+esc(stageName(l.stage))+'</div>'+
        '<div class="lbl" style="margin-bottom:6px">Log a call</div>'+rsel('sim_disp','data-simdisp="1"',[['','Pick the outcome…']].concat(DISP.map(function(d){ return [d.n,(d.g==='A'?'No connect':'Connected')+' · '+d.n]; })),disp)+'<div class="mt8"><button class="btn sm primary" data-simcall="1"'+(disp?'':' disabled')+'>Log disposition</button></div>'+
        '<div class="lbl" style="margin:12px 0 6px">Status</div>'+rsel('sim_status','data-simstatus="1"',STATUS_OPTS.filter(function(s){return s[0]!=='withdrawn'&&s[0]!=='unreach';}),l.status)+'<div class="meta mt8">Parking keeps the stage. Closing preserves how far it got.</div>')+'</div>'+
      card('What kind of line','<div class="kvgrid" style="grid-template-columns:1fr">'+kv('Product',esc(l.product))+kv('Route',l.rate===1?'DUA (rateable)':(l.rate===0?'Placement':'<span class="meta">not known until the requirement is captured</span>'))+kv('Business type',esc(o?o.type:'Renewal'))+kv('Owner',esc(uname(l.owner))+' · '+esc((userById(l.owner)||{}).role==='rm'?'RM':'Sales'))+'</div>',null,{sub:'for the filters'})+
     '</div>'+
     '<div class="gap12"><div class="card" style="overflow:hidden"><div class="cardh"><span class="t">Tasks on this line</span><span class="s">'+plural(open.length,'open task')+'</span></div>'+(open.length?open.map(function(t){return simTaskRow(t,l);}).join(''):'<div class="empty" style="padding:28px 16px">'+'<div class="b">No open tasks. Move the stage, log a call, or run a check.</div></div>')+'</div>'+
       (dn.length?'<div class="card" style="overflow:hidden"><div class="cardh"><span class="t">Done</span><span class="s">latest '+dn.length+'</span></div>'+dn.map(function(t){return simTaskRow(t,l);}).join('')+'</div>':'')+'</div>'+
     '<div class="c3"><div class="card" style="overflow:hidden"><div class="cardh"><span class="t">What happened</span><span class="s">newest first</span><span class="sp"></span><button class="btn xs'+(S.ui.simAll?' outline':'')+'" data-simall="'+(S.ui.simAll?'0':'1')+'">'+(S.ui.simAll?'This line only':'All lines')+'</button></div><ul class="rlog">'+(log.length?log.map(function(e){ return '<li><span class="dot '+esc(e.kind)+'"></span><span><b>'+esc(e.t)+'</b><span class="m">'+esc(fmt(e.at))+(e.line&&S.ui.simAll?' · '+esc(e.line):'')+(e.m?' · '+esc(e.m):'')+'</span></span></li>'; }).join(''):'<li><span class="dot"></span><span class="meta">Nothing yet. The engine writes here each time a rule creates, closes or escalates a task, and each time the clock moves.</span></li>')+'</ul></div></div>'+
    '</div>'+
    '<div class="card mt16" style="overflow:hidden"><div class="cardh"><span class="t">Every rule, against this line</span><span class="s">open a row to see which conditions hold and why a task was or was not created</span></div>'+views.map(function(v){return v.html;}).join('')+'</div>';
  return {sc:'Simulator', ctx:l.id+' · '+l.stage+' · '+stageName(l.stage)+' · '+statusTx(l), html:html, cta:''};
};
HANDLERS.push(function(t){
  var x, l;
  if(x=t.closest('[data-simall]')){ S.ui.simAll=x.dataset.simall==='1'; paint(); return true; }
  if(x=t.closest('[data-simstage]')){ l=simLine(); var n=+x.dataset.simstage; if(!l||n===l.stage||dead(l)) return true; var made=[]; var ok=write(function(){ var back=n<l.stage; if(n>=3&&l.rate==null) l.rate=RATEABLE[l.product]?1:0; made=moveStage(l,n,'Simulator · as '+uname(l.owner)+(back?' · moved back':'')); },'the stage'); if(ok){ paint(); toast('Stage moved to '+n+' · '+stageName(n),plural(made.length,'task')+' created by rule'); } return true; }
  if(x=t.closest('[data-simcall]')){ if(x.disabled) return true; l=simLine(); var d=DISP.filter(function(q){return q.n===S.ui.simDisp;})[0]; if(!l||!d||dead(l)) return true; var made2=[];
    var ok2=write(function(){ var n=bumpCall(l,d.g!=='A'); l.lastDisp=d.n; logAdd(l,'Call · '+d.n,uname(l.owner)+' · call '+n+(d.g==='A'?' · no connect':' · connected')+' · simulator','call'); made2=fireRules(l); if(l.stage===1){ made2=made2.concat(moveStage(l,2,'First contact logged')); } },'the call');
    if(ok2){ S.ui.simDisp=''; paint(); toast('Disposition logged — '+d.n,plural(made2.length,'task')+' created by rule'); } return true; }
  return false;
});
document.addEventListener('change',function(ev){ var t=ev.target; if(!(t instanceof Element)||t.dataset.simstatus===undefined) return; var l=simLine(); if(!l||l.status===t.value) return; var nm=statusLabel(t.value), made=[];
  var ok=write(function(){ l.status=t.value; if(t.value==='park'){ l.reason='Simulator'; l.revisit=addWork(S.now,durMins(5,'d')); } else { l.reason=t.value==='open'?'':'Simulator'; } logAdd(l,'Status set to '+nm,uname(l.owner)+' · simulator','sys'); made=fireRules(l); },'the status');
  if(ok){ paint(); toast('Status set to '+nm,plural(made.length,'task')+' created by rule'+(RUN.closed?' · closed by rule where a Close when says so':'')); } });
document.addEventListener('toggle',function(ev){ var t=ev.target; if(t instanceof Element && t.dataset && t.dataset.rv) S.ui['rv_'+t.dataset.rv]=t.open; },true);

/* ---------- R4 · task settings ---------- */
SCREENS.rulecfg=function(){
  var u=me(); if(!isMgrRole(u)) return rulesLock();
  var c=cfg(), hrs=[]; for(var h=c.ws;h<c.we;h++) hrs.push([h,p2(h)+':00']);
  var html='<div class="hdrow"><div><div class="h1">Task settings</div><div class="sub">One calendar, held centrally. Every clock, every wait and both scheduled checks run on it. There are no per-rule working hours.</div></div></div>'+diamonds()+rulesTabs('rulecfg')+
    '<div class="gap12" style="max-width:860px">'+
    card('Working calendar','<div class="fgrid">'+rfield('Working days','<div class="chips">'+['Mon','Tue','Wed','Thu','Fri'].map(function(d){ return '<button type="button" class="on" disabled>'+d+'</button>'; }).join('')+['Sat','Sun'].map(function(d){ return '<button type="button" disabled>'+d+'</button>'; }).join('')+'</div>','Monday to Friday. Fixed in this prototype.')+
      rfield('Working hours','<div class="numunit" style="align-items:center"><input class="inp" id="cfg_ws" data-cfg="ws" type="number" min="0" max="22" value="'+c.ws+'"><span class="meta">to</span><input class="inp" id="cfg_we" data-cfg="we" type="number" min="1" max="24" value="'+c.we+'"></div>',plural(c.we-c.ws,'hour')+' a day. A clock that would end outside them ends at the next working moment.')+'</div>')+
    card('Scheduled checks','<div class="fgrid">'+rfield('Hourly check','<div class="inp" style="background:var(--greySoft)">On the hour, '+p2(c.ws)+':00 to '+p2(c.we-1)+':00</div>','Working days only. For rules with waits or clocks in hours.')+rfield('Daily check',rsel('cfg_daily','data-cfg="dailyH"',hrs,c.dailyH),'Working days only. For rules with waits in days, and repeating follow-ups.')+'</div>',null,{sub:'each rule picks one in its Re-check field'})+
    card('Holidays','<div class="chips">'+c.hol.slice().sort().map(function(h){ return '<button type="button" class="on" data-holdel="'+esc(h)+'" title="Remove">'+esc(fmtD(new Date(h+'T00:00:00').getTime()))+' ×</button>'; }).join('')+'</div>'+
      '<div class="numunit mt12" style="align-items:center;flex-wrap:wrap"><input class="inp" id="cfg_hol" type="date" style="max-width:180px;flex:0 0 180px" value="'+esc(S.ui.holDraft||'')+'" data-holdraft="1"><button class="btn sm" data-holadd="1"'+(S.ui.holDraft?'':' disabled')+'>Add holiday</button></div>'+
      (function(){ var last=c.hol.slice().sort().slice(-1)[0], lt=last?new Date(last+'T00:00:00').getTime():0, short=!lt||lt-S.now<120*86400000; return '<div class="mt12">'+note(short?'amber':'neutral','Holidays entered up to '+(lt?MONN[new Date(lt).getMonth()]+' '+new Date(lt).getFullYear():'—'),short?'The list runs out soon. Add next year’s dates before then, or every clock after it will count those days as working days.':'Keep the calendar populated in advance.',short?'alert':'info')+'</div>'; })()+
      '<div class="meta mt12">A holiday added late does not un-breach tasks that already escalated.</div>',null,{sub:'excluded from every clock and check'})+
    note('neutral','Carried from the task spec','A task created outside working hours starts its clock at the next opening. Escalation goes to the owner’s manager, once. On reassignment, open tasks move with the line and their clocks continue.','info')+'</div>';
  return {sc:'Task settings', ctx:'Mon–Fri · '+p2(c.ws)+':00–'+p2(c.we)+':00', html:html, cta:''};
};
HANDLERS.push(function(t){
  var x;
  if(x=t.closest('[data-holadd]')){ if(x.disabled) return true; var h=S.ui.holDraft; var ok=write(function(){ if(h&&cfg().hol.indexOf(h)<0) cfg().hol.push(h); applyCfg(); },'the holiday'); if(ok){ S.ui.holDraft=''; paint(); } return true; }
  if(x=t.closest('[data-holdel]')){ var v=x.dataset.holdel; var ok2=write(function(){ var i=cfg().hol.indexOf(v); if(i>=0) cfg().hol.splice(i,1); applyCfg(); },'the holiday'); if(ok2) paint(); return true; }
  return false;
});
