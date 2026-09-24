/* ==================================================================== *
 *  Shell: sign-in, sidebar, top bar, routing, global event delegation
 * ==================================================================== */
var SCREENS={}, HANDLERS=[];
var PERSONAS=[
 {id:'nikhil', d:'Owns a book of product lines. Home says what needs him. Works lines, raises tickets, creates opportunities.'},
 {id:'vikram', d:'Sees the whole team and acts on none of it. Closes escalated tasks, takes a line over when someone is away, edits task rules.'},
 {id:'priya',  d:'Owns accounts after the sale: chases the client for the proposal form and mandate, holds the relationship through issuance, raises endorsements and claims — and sells on her own accounts.'},
 {id:'rohan',  d:'The second RM. Same chair as Priya, a different book — so the head of RM has a team to look at.'},
 {id:'meera',  d:'Head of relationship management. Sees every RM’s post-purchase lines, renewals and service tickets; closes escalations, takes a line over, sets the RM clocks.'}
];
/* [stated 23 Sep] a call that has been placed must be dispositioned — its modal has no way out */
function flowLocked(){ var f=FLOWS[S.flow]; return !!(f&&f.locked&&f.locked()); }
function navFor(u){
  /* [stated 23 Sep] My view works the way the executive's does, nav included */
  if(hasViews(u)&&!teamView(u)) return u.role==='rmhead'
    ? [['rmhome','Home',ic('home','ic22')],['pipeline','Pipeline',ic('list','ic22')],['renewals','Renewals',ic('refresh','ic22')],['opps','Opportunities',ic('handshake','ic22')],['accounts','Accounts',ic('building','ic22')],['tasks','Tasks',ic('checks','ic22')],['tickets','Tickets',ic('ticket','ic22')],['rules','Task rules',ic('settings','ic22')]]
    : [['home','Home',ic('home','ic22')],['pipeline','Pipeline',ic('list','ic22')],['opps','Opportunities',ic('handshake','ic22')],['accounts','Accounts',ic('building','ic22')],['tasks','Tasks',ic('checks','ic22')],['tickets','Tickets',ic('ticket','ic22')],['rules','Task rules',ic('settings','ic22')]];
  if(u.role==='mgr') return [['team','Home',ic('home','ic22')],['pipeline','Pipeline',ic('list','ic22')],['opps','Opportunities',ic('handshake','ic22')],['accounts','Accounts',ic('building','ic22')],['tasks','My tasks',ic('checks','ic22')],['tickets','Tickets',ic('ticket','ic22')],['rules','Task rules',ic('settings','ic22')]];
  if(u.role==='rm') return [['rmhome','Home',ic('home','ic22')],['pipeline','Pipeline',ic('list','ic22')],['renewals','Renewals',ic('refresh','ic22')],['opps','Opportunities',ic('handshake','ic22')],['accounts','Accounts',ic('building','ic22')],['tickets','Tickets',ic('ticket','ic22')],['tasks','Tasks',ic('checks','ic22')]];
  /* [stated 24 Sep · TBD-54] the head of RM gets Pipeline in Team view too — her team's
     post-purchase lines were otherwise reachable only through home cards and Tickets */
  if(u.role==='rmhead') return [['rmteam','Home',ic('home','ic22')],['pipeline','Pipeline',ic('list','ic22')],['renewals','Renewals',ic('refresh','ic22')],['opps','Opportunities',ic('handshake','ic22')],['accounts','Accounts',ic('building','ic22')],['tickets','Tickets',ic('ticket','ic22')],['tasks','My tasks',ic('checks','ic22')],['rules','Task rules',ic('settings','ic22')]];
  return [['home','Home',ic('home','ic22')],['pipeline','Pipeline',ic('list','ic22')],['opps','Opportunities',ic('handshake','ic22')],['accounts','Accounts',ic('building','ic22')],['tasks','Tasks',ic('checks','ic22')],['tickets','Tickets',ic('ticket','ic22')]];
}
function navBadge(v,u){
  if(v==='renewals'){ return renLines(u.id).filter(function(l){ return renDue(l)&&renDays(l)<=7; }).length; }
  if(v==='home'){ var b=homeBuckets(u.id); return b.fresh.length+b.late.length+b.move.length+b.quiet.length; }
  if(v==='tasks'){ return myTasks(u.id).filter(function(t){var s=taskState(t);return s==='esc'||s==='over'||s==='today';}).length; }
  if(v==='team'||v==='rmteam'){ return escalatedTo(u.id).length; }
  if(v==='rmhome'){ var r=rmBuckets(u.id); return r.onme.length; }
  if(v==='tickets'){ return ticketRows(u).filter(function(r){return r.need;}).length; }
  return 0;
}
function activeNav(){ var v=S.route.v, u=me(); if(v==='opp'||v==='opps') return 'opps'; if(v==='home'||v==='rmhome'||v==='team'||v==='rmteam') return homeRoute(u); if(v==='line'||v==='pipeline'){ if(hasViews(u)&&teamView(u)) return homeRoute(u); return 'pipeline'; } if(v==='acct'||v==='accounts'||v==='policy') return 'accounts'; if(v==='ticket'||v==='tickets'||v==='svctix'||v==='svcnew'||v==='svc') return 'tickets'; if(v==='rule'||v==='rules'||v==='rulesim'||v==='rulecfg') return 'rules'; return v; }

function paint(){
  var root=document.getElementById('app');
  if(!S.user){ root.innerHTML=renderSignin(); paintModal(); return; }
  var u=me(), scr=SCREENS[S.route.v] ? SCREENS[S.route.v]() : SCREENS.notfound();
  var nav=navFor(u), an=activeNav();
  root.innerHTML='<div class="app">'+
    '<aside class="side'+(S.side?' open':'')+'" id="side">'+
      '<div class="wm">Bima<i>Setu</i></div><div class="wmsub">'+(u.role==='rm'||u.role==='rmhead'?'Relationship management':(u.role==='mgr'?'Sales management':'Sales'))+' · prototype</div>'+
      (hasViews(u)?'<div class="vsw" role="group" aria-label="View">'+
          '<button data-vw="mine"'+(teamView(u)?'':' class="on"')+'>'+ic('user','ic14')+'My view</button>'+
          '<button data-vw="team"'+(teamView(u)?' class="on"':'')+'>'+ic('users','ic14')+'Team view</button></div>':'')+
      '<label class="ssearch">'+ic('search','ic16')+'<input id="gsearch" placeholder="Search anything" value="'+esc(S.ui.gq||'')+'" autocomplete="off"></label>'+
      '<div class="menu-l">Menu</div><nav class="nav">'+nav.map(function(n){ var c=navBadge(n[0],u);
        return '<button data-nav="'+n[0]+'"'+(an===n[0]?' class="on"':'')+'>'+n[2]+esc(n[1])+(c?'<span class="cnt">'+c+'</span>':'')+'</button>'; }).join('')+'</nav>'+
      '<div class="persona"><div class="row">'+avatar(u.n)+'<div style="min-width:0"><div class="nm">'+esc(u.n)+'<i></i></div><div class="rl">'+esc(u.title)+'</div></div></div>'+
        '<button class="sw" data-switch="1">'+ic('refresh','ic14')+'Switch person</button>'+
        '<div class="more"><button data-proto="1">'+ic('clock','ic14')+' Prototype controls</button><button data-reset="1">Reset</button></div></div>'+
    '</aside>'+
    '<div class="main"><div class="panel">'+
      (S.offline?'<div class="offline">'+ic('wifioff','ic14')+'You are offline — nothing you do will save until you reconnect. <button data-offline="0">Reconnect</button></div>':'')+
      '<div class="topbar"><div class="flex" style="min-width:0"><button class="burger btn ghost sm" data-burger="1" aria-label="Menu">'+ic('menu')+'</button><span class="sc">'+esc(scr.sc||'')+'</span></div>'+
      '<div class="rt">'+(scr.ctx?'<span class="ctx">'+esc(scr.ctx)+'</span>':'')+(scr.cta!==undefined?scr.cta:'<button class="btn primary sm" data-flow="newOpp">'+ic('plus')+'New opportunity</button>')+'</div></div>'+
      '<div class="content">'+scr.html+'</div>'+
    '</div></div>'+
  '</div>';
  paintModal();
  var cur=document.querySelector('.track .step.now'); if(cur){ ['.phase','.track'].forEach(function(sel){ var sc=cur.closest(sel); if(sc&&sc.scrollWidth>sc.clientWidth+2){ var r=cur.getBoundingClientRect(), b=sc.getBoundingClientRect(); sc.scrollLeft+= (r.left-b.left) - sc.clientWidth/2 + r.width/2; } }); }
}
function renderSignin(){
  return '<div class="signin"><div class="box"><div class="wm" style="font-size:var(--fs-4xl)">Bima<i>Setu</i></div><div class="sub">The sales side of the CRM — accounts, opportunities, product lines, tasks and the tickets that carry a line through placement and payment. Pick who you are; everything you do is remembered in this browser until you reset it.</div>'+
    '<div class="personas">'+PERSONAS.map(function(p){ var u=by(seedUsers(),p.id); return '<button class="pcard" data-signin="'+p.id+'">'+avatar(u.n)+'<div><div class="nm">'+esc(u.n)+'</div><div class="rl">'+esc(u.title)+'</div></div><div class="d">'+esc(p.d)+'</div><div class="flex" style="color:var(--violet);font-weight:600;font-size:var(--fs-base)">Sign in '+ic('arrowright','ic14')+'</div></button>'; }).join('')+'</div>'+
    '<div class="mt20">'+note('neutral','Prototype','Every record here is synthetic. Amber dashed blocks simulate something arriving from outside the CRM; dotted grey blocks move the prototype’s clock. Real actions are solid-bordered and never dashed.','info')+'</div></div></div>';
}
var _seedUsers=null; function seedUsers(){ if(S.data) return S.data.users; if(!_seedUsers) _seedUsers=seed().users; return _seedUsers; }

/* prototype controls: time and connectivity, dotted grey by rule */
FLOWS.proto={t:'Prototype controls', sub:'Not part of the product. Time passing and losing the network are simulated here so the states they cause can be seen.',
  nofoot:function(){return true;},
  body:function(){ return timeblock('The clock is fixed at '+fmt(S.now)+' ('+fmtD(S.now)+'). Advance it to see tasks cross into Overdue and Escalated, and lines cross the 30-day quiet line. It never runs on its own.',
      '<button class="timebtn" data-time="60">+1 working hour</button><button class="timebtn" data-time="540">+1 working day</button><button class="timebtn" data-time="2700">+1 working week</button><button class="timebtn" data-time="0">Back to the seed clock</button>')+
    '<div class="mt12">'+note('neutral','Connectivity','The app is '+(S.offline?'<b>offline</b>':'<b>online</b>')+'. Offline, every save fails with a retry, so you can see how a rep is told and what happens when the network returns.<div class="mt8"><button class="btn sm" data-offline="'+(S.offline?'0':'1')+'">'+ic(S.offline?'wifi':'wifioff')+(S.offline?'Reconnect':'Go offline')+'</button></div>','info')+'</div>'+
    '<div class="mt12">'+note('amber','Reset','Wipes every change you made in this browser and returns to the seed. Cannot be undone.<div class="mt8"><button class="btn danger sm" data-reset="1">Reset to seed</button></div>')+'</div>'; }};
FLOWS.switchUser={t:'Switch person', sub:'Same data, another chair. Nothing is lost.', nofoot:function(){return true;},
  body:function(){ return PERSONAS.map(function(p){ var u=userById(p.id); return '<button class="opt" data-signin="'+p.id+'"><span class="mk'+(S.user===p.id?' on':'')+'"></span><span class="bd"><b>'+esc(u.n)+'</b><span>'+esc(u.title)+'</span></span></button>'; }).join('')+'<div class="mt8"><button class="btn ghost sm" data-signout="1">'+ic('logout')+'Sign out</button></div>'; }};

/* ---------- global events ---------- */
document.addEventListener('click',function(e){
  var t=e.target; if(!(t instanceof Element)) return;
  var x;
  if(x=t.closest('[data-signin]')){ S.user=x.dataset.signin; S.flow=null; S.sel={}; S.hist=[]; delete S.ui.vw; /* [stated 23 Sep] each person starts in their own default view */ var u=me(); S.route={v:homeRoute(u)}; save(); paint(); return; }
  if(t.closest('[data-signout]')){ S.user=null; S.flow=null; S.route={v:'signin'}; save(); paint(); return; }
  if(t.closest('[data-switch]')){ openFlow('switchUser'); return; }
  if(t.closest('[data-proto]')){ openFlow('proto'); return; }
  if(t.closest('[data-reset]')){ reset(); return; }
  if(x=t.closest('[data-offline]')){ S.offline=x.dataset.offline==='1'; if(!S.offline && S.pending){ retry(); } paint(); if(S.flow==='proto') paintModal(); toast(S.offline?'Offline':'Back online',S.offline?'Saves will fail until you reconnect.':'Saving works again.'); return; }
  if(x=t.closest('[data-time]')){ var tv=x.dataset.time, n=null; if(tv==='0'){ S.now=T0.getTime(); } else if(tv.indexOf('next:')===0){ n=advanceClock(nextCheck(S.now,tv.slice(5))); } else { n=advanceClock(addWork(S.now,+tv)); } save(); paint(); if(S.flow==='proto') paintModal(); toast('Clock moved', tv==='0'?'Back to '+fmt(S.now):'Now '+fmt(S.now)+(n?' · '+plural(n.h,'hourly check')+', '+plural(n.d,'daily check')+' ran · '+plural(n.made,'task')+' created by rule'+(n.ren?' · '+plural(n.ren,'renewal line')+' opened':''):'')); return; }
  if(x=t.closest('[data-toastact]')){ if(x.dataset.toastact==='retry') retry(); var tt=x.closest('.toast'); if(tt) tt.remove(); if(x.dataset.toastact==='copyrfq') toast('Link copied'); return; }
  if(t.closest('[data-burger]')){ S.side=!S.side; document.getElementById('side').classList.toggle('open',S.side); return; }
  if(x=t.closest('[data-nav]')){ go(x.dataset.nav); return; }
  if(t.closest('[data-back]')){ back(); return; }
  /* screen handlers run before generic navigation so a control inside a clickable row wins */
  for(var i=0;i<HANDLERS.length;i++){ if(HANDLERS[i](t,e)) return; }
  if(x=t.closest('[data-go]')){ var p={}; if(x.dataset.id) p.id=x.dataset.id; if(x.dataset.tab) p.tab=x.dataset.tab; if(x.dataset.q!==undefined) p.q=x.dataset.q; go(x.dataset.go,p); return; }
  if(x=t.closest('[data-fold]')){ S.ui['fold_'+x.dataset.fold]=!x.closest('.fold').classList.contains('open'); x.closest('.fold').classList.toggle('open'); return; }
  if(x=t.closest('[data-pill]')){ S.ui[x.dataset.pill]=x.dataset.pv; paint(); return; }
  if(x=t.closest('[data-uiset]')){ S.ui[x.dataset.uiset]=x.dataset.uv; paint(); return; }
  /* modal */
  if(x=t.closest('[data-mset]')){ if(S.flow){ S.sel[x.dataset.mset]=x.dataset.mval; paintModal(); } return; }
  if(x=t.closest('[data-pick]')){ if(S.flow){ if(x.getAttribute('aria-disabled')==='true') return; S.sel.d=x.dataset.pick; paintModal(); } return; }
  if(x=t.closest('[data-tog]')){ if(S.flow){ var arr=S.sel[x.dataset.tog]=S.sel[x.dataset.tog]||[], v=x.dataset.tv, i=arr.indexOf(v); if(i>=0) arr.splice(i,1); else arr.push(v); paintModal(); } return; }
  if(x=t.closest('[data-vw]')){ var want=x.dataset.vw; if((want==='team')!==teamView()){ S.ui.vw=want; var v=S.route.v;
      if(v==='home'||v==='rmhome'||v==='team'||v==='rmteam'){ S.route={v:homeRoute()}; }
      S.flow=null; S.sel={}; save(); paint(); } return; }
  if(t.closest('[data-close]')){ if(flowLocked()) return; closeFlow(); return; }
  if(t.closest('[data-commit]')){ commit(); return; }
  if(t.closest('[data-alt]')){ var f=FLOWS[S.flow]; if(f&&f.alt){ if(typeof f.alt.run==='function'){ f.alt.run(); } else openFlow(f.alt.flow,{line:S.sel.line}); } return; }
  if(t.classList.contains('ovl')){ if(flowLocked()) return; closeFlow(); return; }
  if(x=t.closest('[data-flow]')){ if(x.disabled) return; openFlow(x.dataset.flow,{line:x.dataset.line||(S.route.id||''),acct:x.dataset.acct||''}); return; }
});
document.addEventListener('input',function(e){
  var t=e.target; if(!(t instanceof Element)) return;
  if(t.dataset.f!==undefined){ S.sel[t.dataset.f]=t.value; flowLive(); var lf=FLOWS[S.flow]; if(lf&&lf.onInput) lf.onInput(t.dataset.f); return; }
  if(t.id==='gsearch'){ S.ui.gq=t.value; return; }
  if(t.dataset.ui!==undefined){ S.ui[t.dataset.ui]=t.value; var id=t.id; paint(); var n=document.getElementById(id); if(n){ n.focus(); try{ n.setSelectionRange(n.value.length,n.value.length); }catch(err){} } return; }
});
document.addEventListener('change',function(e){
  var t=e.target; if(!(t instanceof Element)) return;
  if(t.dataset.f!==undefined){ S.sel[t.dataset.f]=t.value; if(t.tagName==='SELECT'){ var f=FLOWS[S.flow]; if(f&&f.repaintOn&&f.repaintOn.indexOf(t.dataset.f)>=0) paintModal(); else flowLive(); } return; }
  if(t.dataset.uisel!==undefined){ S.ui[t.dataset.uisel]=t.value; paint(); return; }
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&S.flow){ if(flowLocked()) return; closeFlow(); return; }
  if(e.key==='Enter'&&e.target&&e.target.id==='gsearch'){ var q=e.target.value.trim(); if(q){ go('search',{q:q}); } }
});
