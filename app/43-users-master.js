/* ==================================================================== *
 *  Users master + reporting-line hierarchy  [stated 27 Oct]
 *  · Every person has a function (Pre-sales, Sales, Post-sales), a role
 *    (Manager or Executive) and Reports to.
 *  · You see yourself and everyone below you, at any depth.
 *  · An Executive with people under them works their team too (team view,
 *    take over, reassign) — they run with the manager screens.
 *  · Escalation is one level: an overdue task goes to the owner's reporting
 *    manager (Reports to) — for Gaurav, Shubh. [stated 27 Oct]
 *  · Users are added only here. The admin never sees a password: the
 *    person gets an email invite and sets their own.
 *  · Lead assignment, RM allocation and the ABM pool pick from these users.
 * ==================================================================== */
(function(){
var FN=[['pre','Pre-sales'],['sales','Sales'],['post','Post-sales']];
var CODE={pre:['abm','abmmgr'],sales:['exec','mgr'],post:['rm','rmhead']};
var FROM={exec:['sales','exec'],mgr:['sales','manager'],rm:['post','exec'],rmhead:['post','manager'],abm:['pre','exec'],abmmgr:['pre','manager'],admin:['admin','manager']};
function fnName(k){ return k==='admin'?'Administration':((FN.filter(function(x){return x[0]===k;})[0]||[,''])[1]); }
function ensureMeta(){ (S.data.users||[]).forEach(function(u){ if(!u.fn){ var f=FROM[u.role]||['ops','exec']; u.fn=f[0]; u.lvl=f[1]; } if(u.active===undefined) u.active=1; }); }
/* the walk up the reporting line */
window.isAnc=function(anc,uid){ var u=userById(uid), n=0; while(u&&u.mgr&&n++<30){ if(u.mgr===anc) return true; u=userById(u.mgr); } return false; };
window.below=function(uid){ return S.data.users.filter(function(x){ return x.active!==0&&x.id!==uid&&isAnc(uid,x.id); }); };
window.hasReports=function(uid){ return S.data.users.some(function(x){ return x.active!==0&&x.mgr===uid; }); };
window.escTarget=function(uid){ var u=userById(uid), n=0; while(u&&u.mgr&&n++<30){ var m=userById(u.mgr); if(!m) return ''; if(m.active!==0) return m.id; u=m; } return ''; };
/* the role the screens run with: Manager, or an Executive who has a team */
function applyRoles(){ if(!S.data||!S.data.users) return; ensureMeta();
  S.data.users.forEach(function(u){ if(u.role==='admin'||!CODE[u.fn]) return; if(u.role==='cs') return; var lead=u.lvl!=='manager'&&hasReports(u.id); u.lead=lead?1:0; /* [stated 27 Oct] an ABM team lead stays an ABM executive: in the pool, sees only their own team */ u.role=CODE[u.fn][u.lvl==='manager'||(lead&&u.fn!=='pre')?1:0]; }); }
window.applyRoles=applyRoles;

/* hierarchy-aware versions of the base helpers */
rmTeam=function(headId){ return below(headId).filter(function(u){ return u.fn==='post'; }); };
teamOf=function(mgrId){ return below(mgrId).filter(function(u){ return u.fn==='sales'; }); };
myTeam=function(u){ u=u||me(); return below(u.id); };
inMyTeam=function(uid,u){ u=u||me(); return !!u&&isAnc(u.id,uid); };
canTakeOver=function(l){ var u=me(); return !!u&&isAnc(u.id,l.owner)&&l.owner!==u.id&&(openLine(l)||postLine(l)||l.status==='park'); };
hasMgr=function(uid){ return !!escTarget(uid); };
escalatedTo=function(mgrId){ return S.data.tasks.filter(function(t){ if(t.done||taskState(t)!=='esc') return false; return escTarget(t.owner)===mgrId; }); };
teamIds=function(u){ if(!u) return []; return below(u.id).map(function(x){ return x.id; }); };

/* seed: the example from 27 Oct — Chaitali heads it; Shubh leads Gaurav and Sumit; Pranay reports to Chaitali */
seedFill=(function(f0){ return function(d){ var r=f0(d)||d; var by_=function(n){ return r.users.filter(function(u){ return u.n===n; })[0]; };
  r.users.forEach(function(u){ if(!u.fn){ var f=FROM[u.role]||['ops','exec']; u.fn=f[0]; u.lvl=f[1]; } u.active=1; });
  var ch=by_('Chaitali Bhattacharya'), sh=by_('Shubh Bangar'), ga=by_('Gaurav Mishra'), su=by_('Sumit Chand');
  if(ch&&sh&&ga&&su){ ch.lvl='manager'; ch.mgr='meera'; sh.mgr=ch.id; ga.mgr=sh.id; su.mgr=sh.id;
    if(!by_('Pranay Kulkarni')) r.users.push({id:'pranay',n:'Pranay Kulkarni',role:'rm',fn:'post',lvl:'exec',active:1,cat:'',mgr:ch.id,title:'Relationship manager',e:'pranay@bimakavach.com'});
    ch.title='Relationship manager · head'; }
  r.users.forEach(function(u){ if(!u.e&&u.role!=='admin'&&CODE[u.fn]) u.e=u.n.split(' ')[0].toLowerCase()+'@bimakavach.com'; });
  return r; }; })(seedFill);

/* the role is worked out before every paint, so a change in Users shows at once */
paint=(function(p0){ return function(){ try{ applyRoles(); }catch(e){ console.error(e); } var r=p0.apply(this,arguments);
  try{ if(S.route&&S.route.v==='signin') signinMore(); }catch(e){} return r; }; })(paint);

/* ---------- Users screen ---------- */
function statusChip(u){ return u.active===0?chip('Inactive','neutral',false,true):(u.invited&&!u.joined?chip('Invite sent','amber',false,true):chip('Active','green',false,true)); }
function roleTx(u){ if(u.role==='admin') return 'Administrator'; return (u.lvl==='manager'?'Manager':'Executive')+(u.lead?' · team lead':''); }
SCREENS.masterusers=function(){ var me_=me(); if(!me_||me_.role!=='admin') return {sc:'Users',html:empty('lock','Only the administrator manages users',''),cta:''};
  var f=S.ui.usf||'all', q=String(S.ui.usq||'').toLowerCase();
  var all=S.data.users.filter(function(u){ return u.role!=='admin'&&!!CODE[u.fn]; });
  var cnt=function(k){ return all.filter(function(u){ return u.fn===k; }).length; };
  var rows=all.filter(function(u){ return (f==='all'||u.fn===f||(f==='off'&&u.active===0))&&(!q||(u.n+' '+(u.e||'')).toLowerCase().indexOf(q)>=0); })
    .sort(function(a,b){ return FN.map(function(x){return x[0];}).indexOf(a.fn)-FN.map(function(x){return x[0];}).indexOf(b.fn)||(a.lvl==='manager'?0:1)-(b.lvl==='manager'?0:1)||a.n.localeCompare(b.n); });
  var tr=rows.map(function(u){ var team=below(u.id).length, esc_=escTarget(u.id);
    return '<tr class="'+(u.active===0?'dim':'')+'"><td class="nm"><span class="flex">'+avatar(u.n,true)+esc(u.n)+'</span><div class="meta">'+esc([u.e,u.m].filter(Boolean).join(' · '))+'</div></td>'+
      '<td>'+esc(fnName(u.fn))+'</td><td>'+esc(roleTx(u))+'</td><td>'+(u.mgr?esc(uname(u.mgr)):'<span class="meta">—</span>')+'</td>'+
      '<td class="num">'+(team?team:'<span class="meta">—</span>')+'</td><td>'+statusChip(u)+'</td>'+
      '<td class="right"><button class="btn sm" data-flow="userForm" data-id="'+u.id+'">Edit</button></td></tr>'; }).join('');
  var html='<div class="crumbs"><button data-go="masters">Masters</button>'+ic('chevright','ic14')+'<b>Users</b></div>'+
    '<div class="hdrow"><div><div class="h1">Users</div><div class="sub">Everyone who signs in. Each person has a function, a role and who they report to. They see their own work and everyone below them; an overdue task escalates to the person they report to.</div></div><span class="sp"></span><div class="acts"><button class="btn primary" data-flow="userForm" data-id="">'+ic('plus')+'Add user</button></div></div>'+diamonds()+
    '<div class="flex wrap" style="gap:10px">'+pills('usf',f,[['all','All',all.length]].concat(FN.map(function(x){ return [x[0],x[1],cnt(x[0])]; })).concat([['off','Inactive',all.filter(function(u){return u.active===0;}).length]]))+'<span class="sp"></span><input class="inp" style="max-width:240px" data-uisel="usq" placeholder="Search name or email" value="'+esc(S.ui.usq||'')+'"></div>'+
    '<section class="card mt16" style="overflow:hidden"><div class="tw"><table class="t usrt"><thead><tr><th>Name</th><th>Function</th><th>Role</th><th>Reports to</th><th class="num">Team</th><th>Status</th><th></th></tr></thead><tbody>'+(tr||'<tr><td colspan="7">'+empty('users','Nobody matches','Try another filter.')+'</td></tr>')+'</tbody></table></div></section>'+
    '<div class="mt12">'+note('neutral','How the hierarchy works','“Team” counts everyone below the person, at any depth — they see and can work all of it. An Executive with people under them is a team lead: they get the team view and can take over and reassign within their team, and their team’s overdue tasks escalate to them. Lead assignment, RM allocation and the ABM pool pick from these users.','info')+'</div>';
  return {sc:'Users', ctx:all.filter(function(u){return u.active!==0;}).length+' active', html:html, cta:''}; };
document.addEventListener('input',function(e){ var t=e.target; if(t&&t.dataset&&t.dataset.uisel==='usq'&&S.route&&S.route.v==='masterusers'){ S.ui.usq=t.value; var pos=t.selectionStart; paint(); var n=document.querySelector('[data-uisel="usq"]'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(x){} } } });

/* ---------- add / edit ---------- */
function slugId(n){ var b=String(n).trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g,'')||'user', id=b, k=2; while(userById(id)) id=b+(k++); return id; }
function emailOk(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e||'').trim()); }
function emailTaken(e,id){ e=String(e||'').trim().toLowerCase(); return !!e&&S.data.users.some(function(u){ return u.id!==id&&String(u.e||'').toLowerCase()===e; }); }
function nameTaken(n,id){ n=String(n||'').trim().toLowerCase(); return !!n&&S.data.users.some(function(u){ return u.id!==id&&String(u.n||'').toLowerCase()===n; }); }
function openWork(id){ var l=S.data.lines.filter(function(x){ return x.owner===id&&!dead(x)&&x.stage<15; }).length, t=S.data.tasks.filter(function(x){ return x.owner===id&&!x.done; }).length, a=S.data.accounts.filter(function(x){ return x.own===id||x.abm===id; }).length; return {l:l,t:t,a:a}; }
FLOWS.userForm={t:function(){ return S.sel.id?'Edit user':'Add user'; }, sub:function(){ return S.sel.id?uname(S.sel.id):'They get an email invite and set their own password. You never see it.'; }, wide:true, repaintOn:['fn','lvl','act','mgr'],
  body:function(){ var s=S.sel, u=s.id?userById(s.id):null;
    if(!s._i){ s._i=1; s.n=u?u.n:''; s.e=u?(u.e||''):''; s.m=u?(u.m||''):''; s.fn=u?u.fn:'sales'; s.lvl=u?(u.lvl==='manager'?'manager':'exec'):'exec'; s.mgr=u?(u.mgr||''):''; s.act=u&&u.active===0?'0':'1'; }
    var opts=S.data.users.filter(function(x){ return x.active!==0&&x.role!=='admin'&&x.id!==s.id&&!(s.id&&isAnc(s.id,x.id)); })
      .sort(function(a,b){ return (a.fn===s.fn?0:1)-(b.fn===s.fn?0:1)||(a.lvl==='manager'?0:1)-(b.lvl==='manager'?0:1)||a.n.localeCompare(b.n); });
    var reps=u?S.data.users.filter(function(x){ return x.mgr===u.id&&x.active!==0; }):[], w=u?openWork(u.id):null;
    var et=s.mgr&&userById(s.mgr)?s.mgr:'';
    var h='<div class="fgrid">'+field('Full name',input('n',s.n,'e.g. Pranay Kulkarni'),'',nameTaken(s.n,s.id)?'Someone already has this name.':'')+field('Work email',input('e',s.e,'name@bimakavach.com'),'The invite goes here. It is also how they sign in.',s.e&&!emailOk(s.e)?'That does not look like an email.':(emailTaken(s.e,s.id)?'Another user has this email.':''))+'</div>'+
      '<div class="fgrid">'+field('Mobile',input('m',s.m,'+91 98xxx xxxxx'),'Optional')+field('Function',u?'<input class="inp" value="'+esc(fnName(u.fn))+'" disabled>':select('fn',s.fn,FN),u?'Set when the user is added — their records belong to it.':'Pre-sales is the ABM team; Post-sales is the RMs.')+'</div>'+
      '<div class="fgrid">'+'<div class="field"><div class="lbl">Role</div>'+seg('lvl',[['exec','Executive'],['manager','Manager']],s.lvl)+'<div class="hint">'+(s.lvl==='manager'?'Overdue tasks of the people who report to them escalate here.':'With people under them, an Executive becomes a team lead: they see and work their team, and their reportees’ overdue tasks escalate to them.')+'</div></div>'+
        field('Reports to',select('mgr',s.mgr,[['','Nobody (top of the line)']].concat(opts.map(function(x){ return [x.id,x.n+' · '+fnName(x.fn)+' '+(x.lvl==='manager'?'manager':'executive')]; }))),et?'Their tasks escalate to '+uname(et)+'.':'Nobody above them — their tasks do not escalate.')+'</div>';
    if(u){ h+='<div class="field"><div class="lbl">Status</div>'+seg('act',[['1','Active'],['0','Inactive']],s.act)+'</div>';
      if(s.act==='0'&&u.active!==0) h+=note('amber','Deactivating '+u.n,'They can no longer sign in and leave every rotation (lead assignment, RM allocation, the ABM pool) and any fallback.'+(reps.length?' '+reps.map(function(x){return x.n;}).join(', ')+' will report to '+(u.mgr?uname(u.mgr):'nobody')+' instead.':'')+' They still hold '+w.l+' open '+(w.l===1?'opportunity':'opportunities')+', '+plural(w.a,'account')+' and '+plural(w.t,'open task')+' — reassign those from the team view.'); }
    else h+=note('neutral','Invite','On Add, '+(s.e&&emailOk(s.e)?esc(s.e):'their email')+' gets a link to set a password. Until they sign in for the first time they show as “Invite sent”.','info');
    return h; },
  can:function(){ var s=S.sel; return !!String(s.n||'').trim()&&emailOk(s.e)&&!emailTaken(s.e,s.id)&&!nameTaken(s.n,s.id); },
  ok:function(){ return S.sel.id?'Save':'Add and send invite'; },
  run:function(){ var s=S.sel, u=s.id?userById(s.id):null, isNew=!u, moved=[];
    var ok=write(function(){ if(!u){ u={id:slugId(s.n),cat:'',active:1,invited:S.now,fn:s.fn}; S.data.users.push(u); }
      u.n=String(s.n).trim(); u.e=String(s.e).trim(); u.m=String(s.m||'').trim(); u.lvl=s.lvl==='manager'?'manager':'exec'; u.mgr=s.mgr||'';
      if(isNew){ u.role=CODE[u.fn][u.lvl==='manager'?1:0]; u.title=fnName(u.fn)+' '+(u.lvl==='manager'?'manager':'executive'); if(u.fn==='pre'&&u.role==='abm'&&S.data.abmPool) S.data.abmPool.push({id:u.id,on:true}); }
      if(!isNew&&s.act==='0'&&u.active!==0){ u.active=0; S.data.users.forEach(function(x){ if(x.mgr===u.id&&x.active!==0){ x.mgr=u.mgr||''; moved.push(x.n); } });
        if(S.data.abmPool) S.data.abmPool.forEach(function(p){ if(p.id===u.id) p.on=false; }); if(S.data.fb) Object.keys(S.data.fb).forEach(function(k){ if(S.data.fb[k]===u.id) S.data.fb[k]=''; }); }
      if(!isNew&&s.act==='1') u.active=1;
      applyRoles(); },'the user');
    if(!ok) return 'fail';
    toast(isNew?'Invite sent to '+u.e:'Saved',isNew?u.n+' is added as '+fnName(u.fn)+' '+(u.lvl==='manager'?'manager':'executive')+(u.mgr?', reporting to '+uname(u.mgr):'')+'.':(u.active===0?u.n+' is inactive'+(moved.length?' · '+moved.join(', ')+' now report to '+(u.mgr?uname(u.mgr):'nobody'):''):roleTx(u)+(u.mgr?' · reports to '+uname(u.mgr):''))); }};

HANDLERS.unshift(function(t){ var x=t.closest('[data-flow="userForm"]'); if(!x) return false; openFlow('userForm',{id:x.dataset.id||''}); return true; });
/* sign in marks the invite as accepted; inactive users cannot sign in */
HANDLERS.unshift(function(t){ var x=t.closest('[data-signin]'); if(!x) return false; var u=userById(x.dataset.signin); if(u&&u.active===0){ toast('Inactive user',u.n+' was deactivated in Users.',{red:1}); return true; } if(u&&u.invited&&!u.joined) u.joined=S.now; return false; });

/* sign-in and Switch person: everyone else who is active, under their function */
function signinMore(){ var groups={'Pre-sales':'pre','Sales':'sales','Post-sales':'post'}, shown={};
  document.querySelectorAll('.signin [data-signin]').forEach(function(b){ shown[b.dataset.signin]=1; });
  document.querySelectorAll('.signin .pgrp').forEach(function(g){ var b=g.querySelector('.pgh b'); if(!b||g.querySelector('.pmore')) return; var k=groups[b.textContent.trim()]; if(!k) return;
    var rest=S.data.users.filter(function(u){ return u.fn===k&&u.active!==0&&!shown[u.id]; }).sort(function(a,b){ return (a.lvl==='manager'?0:1)-(b.lvl==='manager'?0:1)||a.n.localeCompare(b.n); });
    if(!rest.length) return; g.insertAdjacentHTML('beforeend','<div class="pmore"><span class="meta">Also</span>'+rest.map(function(u){ return '<button class="pchip" data-signin="'+u.id+'">'+esc(u.n)+'<span>'+esc(roleTx(u))+(u.mgr?' · reports to '+esc(uname(u.mgr).split(' ')[0]):'')+'</span></button>'; }).join('')+'</div>'); }); }
(function(){ var F=FLOWS.switchUser, b0=F.body; F.body=function(){ var h=b0(), ids={}; PERSONAS.forEach(function(p){ ids[p.id]=1; });
  var rest=S.data.users.filter(function(u){ return u.active!==0&&!ids[u.id]&&u.role!=='admin'&&!!CODE[u.fn]; }); if(!rest.length) return h;
  return h+'<div class="h4 mt16 mb12">Everyone else</div>'+FN.map(function(f){ var us=rest.filter(function(u){ return u.fn===f[0]; }); if(!us.length) return '';
    return '<div class="meta mt8 mb8">'+esc(f[1])+'</div>'+us.map(function(u){ return '<button class="opt" data-signin="'+u.id+'"><span class="mk'+(S.user===u.id?' on':'')+'"></span><span class="bd"><b>'+esc(u.n)+'</b><span>'+esc(roleTx(u))+(u.mgr?' · reports to '+esc(uname(u.mgr)):'')+'</span></span></button>'; }).join(''); }).join(''); }; })();

/* masters pick from Users: ABM team and RM roster no longer create people */
(function(){ var s0=SCREENS.masterabm; if(s0) SCREENS.masterabm=function(){ var o=s0(); if(o&&o.html){ o.html=o.html.replace(/<button class="btn sm pri" data-abuser="">[\s\S]*?<\/button>/,'<button class="btn sm" data-go="masterusers">'+ic('users')+'Manage in Users</button>').replace(/<button class="btn sm" data-abuser="[^"]+">Edit<\/button>/g,''); } return o; }; })();
(function(){ var F=FLOWS.rmaOwner; if(!F) return; var b0=F.body; F.body=function(){ return b0().replace('>+ A new RM<','>Choose an RM<').replace(/Pick an existing RM, or add a new one — they can sign in straight away\./,'RMs are added in Masters → Users.').replace(/<label class="field"><div class="lbl">Full name<\/div>[\s\S]*?<\/label>/,''); };
  var c0=F.can; F.can=function(){ if(S.sel.i===''&&!S.sel.who) return false; return c0(); }; })();

navFor=(function(n0){ return function(u){ var r=n0(u)||[]; if(u&&u.role!=='admin') r=r.filter(function(x){ return ['rules','rulecfg','rulesim','rule'].indexOf(x[0])<0; }); return r; }; })(navFor);
['rules','rulecfg','rulesim','rule'].forEach(function(k){ var f=SCREENS[k]; if(!f) return; SCREENS[k]=function(){ var u=me(); if(!u||u.role!=='admin') return {sc:'Tasks',html:empty('settings','Tasks are set up by the administrator','Every task — pre-sales, sales and post-sales — is created and managed in Masters → Task configurator.'),cta:''}; return f.apply(this,arguments); }; });
})();

