/* ==================================================================== *
 *  ABM inside BimaSetu v75 — glue [stated 23 Oct: add the ABM flow to v74]
 *  · ABM users (executives + manager) sign in to BimaSetu itself and switch
 *    between Pre-sales (the prospect journey) and Post-sales (the RM's own
 *    screens, scoped to the customers the ABM is assigned to).
 *  · A handoff creates real BimaSetu opportunities at New Lead.
 *  · At Payment Completed an ABM is assigned to the account with the RM:
 *    the ABM who sourced it, else round robin across the ABM executives.
 *    Once per company, for life.
 *  · The ABM is co-owner: every RM action on the customer's opportunities.
 *    The RM's tasks stay the RM's; the ABM gets own tasks (manual + rules).
 * ==================================================================== */
var ABM_USERS=[
 {id:'arjun', n:'Arjun Mehta',  role:'abm',    cat:'', mgr:'kavya', title:'ABM executive'},
 {id:'sneha', n:'Sneha Kapoor', role:'abm',    cat:'', mgr:'kavya', title:'ABM executive'},
 {id:'rahul', n:'Rahul Bhatt',  role:'abm',    cat:'', mgr:'kavya', title:'ABM executive'},
 {id:'kavya', n:'Kavya Reddy',  role:'abmmgr', cat:'', mgr:'',      title:'ABM manager'}];
function isAbm(u){ return !!u&&(u.role==='abm'||u.role==='abmmgr'); }
function isMgr(u){ u=u||me(); return !!u&&u.role==='abmmgr'; }
function abmUsers(){ return S.data.users.filter(function(u){ return u.role==='abm'&&u.active!==0; }); }
function sellers(){ return S.data.users.filter(function(u){ return u.role==='exec'||u.role==='rm'; }); }
function abMode(uid){ var m=S.data&&S.data.abmMode; return (m&&m[uid||S.user])||'pre'; }
var lineLog=window.logAdd;

/* ---------- companies: one company, one ABM ---------- */
function coKey(s){ return String(s||'').toLowerCase().replace(/\b(private|pvt|limited|ltd|llp|co|company|the)\b/g,'').replace(/[^a-z0-9]/g,''); }
function anyAcctOfCo(co){ var k=coKey(co), hit=null; S.data.accounts.forEach(function(a){ if(!a.merged&&coKey(a.n)===k) hit=a; }); return hit; }
function acctOfCo(co){ var a=anyAcctOfCo(co); return a&&a.abm?a:null; }   /* a customer, with its ABM */
function abmOfCo(co,exceptPro){ var a=acctOfCo(co); if(a) return {id:a.abm,why:'customer'}; var k=coKey(co), hit=null;
  S.data.pros.forEach(function(p){ if(p.id!==exceptPro&&coKey(p.co)===k) hit={id:p.owner,why:'prospect',pid:p.id}; }); return hit; }
/* [stated 23 Oct] the ABM assignment master: an ordered round-robin pool of ABM executives */
function abPool(){ var d=S.data; if(!d.abmPool) d.abmPool=abmUsers().map(function(u){ return {id:u.id,on:true}; });
  abmUsers().forEach(function(u){ if(!d.abmPool.some(function(x){return x.id===u.id;})) d.abmPool.push({id:u.id,on:true}); });
  for(var i=d.abmPool.length-1;i>=0;i--){ if((userById(d.abmPool[i].id)||{}).role!=='abm') d.abmPool.splice(i,1); } return d.abmPool; }
function rrNextIdx(){ var pool=abPool(), n=pool.length; if(!n) return -1; var st=(S.data.abmRR||0)%n; for(var k=0;k<n;k++){ var i=(st+k)%n; if(pool[i].on) return i; } return -1; }
function rrNext(){ var i=rrNextIdx(); return i<0?null:userById(abPool()[i].id); }
function rrTake(){ var i=rrNextIdx(); if(i<0) return ''; var pool=abPool(); S.data.abmRR=(i+1)%pool.length; return pool[i].id; }

/* ---------- co-ownership: read by BimaSetu's own scoping ---------- */
window.abCoA=function(a,u){ if(typeof u==='string') u=userById(u); if(!a||!u||!a.abm) return false; return u.role==='abmmgr'||(u.role==='abm'&&(a.abm===u.id||(window.isAnc&&isAnc(u.id,a.abm)))); };
window.abCo=function(l,u){ return !!l&&abCoA(acctOf(l),u); };
window.abOwnsOrCo=function(l,uid){ return l.owner===uid||abCo(l,uid); };
/* ---------- the account's RM and ABM, clearly visible [stated 23 Oct] ---------- */
function abIsRm(id){ var r=(userById(id)||{}).role; return r==='rm'||r==='rmhead'; }
window.abOwnRole=function(a){ return a&&abIsRm(a.own)?'RM':'Account owner · Sales'; };
function abAbmTx(a){ return a&&a.abm?(a.abmHow||'Assigned')+(a.abmAt?' · since '+fmtD(a.abmAt):''):'Assigned at Payment Completed — the sourcing ABM, else round robin'; }
window.abZkv=function(l,a){
  var h='<div class="zkv"><span>'+(abIsRm(a.own)?'RM · account owner':'Account owner · Sales')+'</span><b>'+esc(uname(a.own))+'</b>'+(abIsRm(a.own)?'':'<div class="meta">The RM is assigned at Payment Completed</div>')+'</div>';
  h+='<div class="zkv"><span>ABM · co-owner</span>'+(a.abm?'<b>'+esc(uname(a.abm))+'</b>':'<b class="meta" style="font-weight:500">Not assigned yet</b>')+'<div class="meta">'+esc(a.abm?abAbmTx(a):'Assigned at Payment Completed')+'</div></div>';
  if(l&&l.srcAbm&&l.srcAbm!==a.abm) h+='<div class="zkv"><span>Sourced by ABM</span><b>'+esc(uname(l.srcAbm))+'</b><div class="meta">Handed off from '+esc(l.abmPro||'a prospect')+'</div></div>';
  return h; };
window.abAbmCell=function(a){ return '<td class="one">'+(a.abm?esc(uname(a.abm))+'<div class="sub">'+esc(a.abmHow||'')+'</div>':'<span class="meta">Not assigned</span>')+'</td>'; };
window.abOwnerTag=function(l){ var r=(userById(l.owner)||{}).role; return r==='rm'||r==='rmhead'?' · RM':(r==='exec'?' · Sales':''); };
window.abLineChips=function(l){ var a=acctOf(l); if(!a) return ''; var h='';
  if(a.own&&a.own!==l.owner) h+='<span class="ownchip" title="'+esc(abOwnRole(a))+'">'+avatar(uname(a.own),true)+esc(uname(a.own))+' · '+(abIsRm(a.own)?'RM':'Account owner')+'</span>';
  h+=a.abm?'<span class="ownchip" title="ABM · co-owner">'+avatar(uname(a.abm),true)+esc(uname(a.abm))+' · ABM</span>':'<span class="ownchip team" title="Assigned at Payment Completed">No ABM yet</span>';
  return h; };
window.abTeam=function(a){ var u=me(), canRe=a.abm&&u&&(u.role==='abmmgr'||u.role==='admin');
  var card=function(lab,name,sub,act){ return '<div class="tmc">'+(name?avatar(name):'<span class="avatar tmnone">—</span>')+'<div class="tmb"><span class="lbl">'+esc(lab)+'</span><b>'+esc(name||'Not assigned yet')+'</b><div class="meta">'+esc(sub)+'</div></div>'+(act||'')+'</div>'; };
  return '<div class="tmstrip mt12">'+card(abIsRm(a.own)?'RM · account owner':'Account owner · Sales',uname(a.own),abIsRm(a.own)?'Owns this customer and its opportunities':'The RM is assigned at Payment Completed')+
    card('ABM · co-owner',a.abm?uname(a.abm):'',abAbmTx(a),canRe?'<button class="btn sm" data-flow="ab_reassignAbm" data-id="'+a.id+'">Reassign ABM</button>':'')+'</div>'; };
var irr0=isRmRole; isRmRole=function(u){ return irr0(u)||isAbm(u); };   /* the ABM's post-sales view is the RM's view */

/* ---------- the handed-off list reads the live opportunity ---------- */
function abLiveStage(o){ var l=lineById(o.id); if(!l) return chip(o.stage||'—','neutral',true,true);
  return chip(dead(l)?statusTx(l):stageName(l.stage),dead(l)?'red':(l.stage>=12?'green':(l.stage===1?'neutral':'violet')),true,true); }
function abLiveOwner(o){ var l=lineById(o.id), id=l?l.owner:o.owner, r=(userById(id)||{}).role; return esc(uname(id))+'<div class="sub">'+esc(r==='rm'?'RM':'Sales')+'</div>'; }

/* ---------- handoff → real BimaSetu opportunities at New Lead ---------- */
FLOWS.ab_handoff.run=function(){ var p=cur(), u=me(), ex=acctOfCo(p.co), a=ex||anyAcctOfCo(p.co), mom=(S.sel.mom||'').trim(), opps=[];
  var poc={n:S.sel.pn.trim(),m:String(S.sel.pm).replace(/\s+/g,''),e:S.sel.pe.trim(),d:p.poc1.d||''};
  var ok=write(function(){
    var first=ex?ex.own:S.sel['o_'+PRODUCTS.indexOf((S.sel.prods||[])[0])];
    if(!a){ a=newAccount({n:p.co,gst:'',own:first,prov:1,createdBy:S.user}); a.ind=p.ind||''; acctLog(a,'Account created at ABM handoff',uname(S.user)+' · from '+p.id+' · provisional until KYC'); }
    if(!a.own) a.own=first;
    var c=a.con.filter(function(x){ return digits(x.m).slice(-10)===digits(poc.m).slice(-10); })[0];
    if(!c){ c={n:poc.n,d:poc.d,m:poc.m,e:poc.e}; a.con.push(c); }
    if(S.sel.c2&&p.poc2&&!a.con.some(function(x){ return digits(x.m).slice(-10)===digits(p.poc2.m).slice(-10); })) a.con.push({n:p.poc2.n,d:p.poc2.d||'',m:p.poc2.m,e:p.poc2.e||''});
    (S.sel.prods||[]).forEach(function(x){ var i=PRODUCTS.indexOf(x), own=ex?ex.own:S.sel['o_'+i], renew=dParse(S.sel['r_'+i]), doc=S.sel['doc_'+i]||'';
      var o={id:newOppId(),acct:a.id,type:'New Business',bt:'Fresh',src:'ABM',created:S.now,by:S.user,log:[]}; S.data.opps.push(o);
      oppLog(o,'Opportunity created','ABM handoff · '+uname(S.user)+' · sourced by ABM '+uname(p.owner));
      var l=newLine({opp:o.id,acct:a.id,product:x,owner:own,src:'ABM',contact:c,how:'ABM handoff · '+uname(S.user)});
      l.srcAbm=p.owner; l.abmPro=p.id; if(renew) l.extRenew=renew; if(doc) l.extDoc=doc; if(mom) l.mom=mom;
      lineLog(l,'Handed off by the ABM','System · '+uname(S.user)+' · from prospect '+p.id+' · owner '+uname(own)+(ex?' — the customer’s RM':'')+(doc?' · existing policy '+doc:'')+(renew?' · renewal of the existing policy '+fmtD(renew):''),'sys',1);
      if(mom) lineLog(l,'Meeting notes from the ABM',mom,'note',1);
      fireRules(l);
      opps.push({id:l.id,prod:x,owner:own,renew:renew,doc:doc,stage:'New Lead'}); });
    p.mom=mom;
    p.handoff={at:S.now,by:u.id,opps:opps,acct:a.id,poc:{n:poc.n,m:poc.m,e:poc.e},poc2:S.sel.c2&&p.poc2?p.poc2:null};
    logAdd(p,'Handed off to Sales / RM',opps.map(function(o){ return o.id+' '+o.prod+' → '+uname(o.owner); }).join(' · '),'',1); moveTo(p,'handed');
  },'the handoff');
  if(!ok) return 'fail';
  S.ui['abptab_'+p.id]='handoff'; toast(plural(opps.length,'opportunity')+' created in BimaSetu','Each is at New Lead with its owner, marked “Sourced by ABM: '+uname(p.owner)+'”.'); };

/* ---------- ABM assigned at Payment Completed ---------- */
function abAssign(l){ var a=acctOf(l); if(!a) return;
  if(a.abm){ lineLog(l,'Existing customer · same RM and ABM','System · ABM '+uname(a.abm)+' stays · no new assignment','sys',1); abFireStage(l); return; }
  var src=''; linesOfAcct(a.id).forEach(function(x){ var su=x.srcAbm&&userById(x.srcAbm); if(su&&su.role==='abm') src=x.srcAbm; });
  var pick=src||rrTake(), fb=false; if(!pick){ pick=fbUser('abm'); fb=true; }
  if(!pick){ acctLog(a,'No ABM assigned','The round-robin pool is empty and no ABM fallback user is set','sys'); lineLog(l,'No ABM assigned','System · the ABM pool is empty and there is no ABM fallback user','sys',1); return; }
  a.abm=pick; a.abmHow=src?'Sourced by ABM':(fb?'Fallback · the ABM pool is empty':'Round robin'); a.abmAt=S.now;
  /* [stated 23 Oct] an RM's own manual opportunity on an account with no ABM: round robin at payment */
  var rmOwn=!src&&!fb&&(userById(l.soldBy)||{}).role==='rm'; if(rmOwn) a.abmHow='Round robin · RM’s own opportunity';
  acctLog(a,'ABM assigned · '+uname(a.abm),(src?'Sourced this customer':fb?'The round-robin pool is empty — the ABM fallback user from Masters':(rmOwn?'The RM’s own manual opportunity, no ABM on the account — round robin':'Round robin across the ABM executives'))+' · at Payment Completed, with the RM','sys');
  lineLog(l,'ABM assigned · '+uname(a.abm),'System · '+a.abmHow+' · co-owner with the RM for this customer, for good','sys',1);
  abFireAssign(a,l); abFireStage(l); }
moveStage=(function(m0){ return function(l,n,why){ try{ if(n===12&&l.stage!==12) abAssign(l); }catch(e){ if(window.console) console.error(e); } return m0(l,n,why); }; })(moveStage);

/* ---------- ABM task rules — the ABM's own tasks, never the RM's ---------- */
var TRIG={assign:'A customer is newly assigned to the ABM',stage:'An opportunity enters a stage',renew:'A policy is due to expire'};
function abSeedRules(){ return [
  {id:'AR-01',trig:'assign',stage:12,days:60,title:'Introduce yourself to {contact} as {customer}’s ABM',n:1,unit:'d',on:true},
  {id:'AR-02',trig:'stage',stage:13,days:60,title:'Follow up with {contact} on the proposal form and mandate for {product}',n:2,unit:'d',on:true},
  {id:'AR-03',trig:'stage',stage:15,days:60,title:'Check {contact} received the {product} policy copy',n:1,unit:'d',on:true},
  {id:'AR-04',trig:'renew',stage:12,days:60,title:'Plan the {product} renewal for {customer} with the RM',n:1,unit:'d',on:true}]; }
function ruleWhen(r){ return r.trig==='stage'?'Opportunity enters <b>'+esc(stageName(+r.stage))+'</b>':(r.trig==='renew'?'Policy expires in <b>'+r.days+' days</b>':'Customer <b>newly assigned</b> to the ABM'); }
function abFill(tx,a,l,p){ var c=(a.con||[])[0]||{}; return String(tx).replace(/\{customer\}/g,shortName(a.n)).replace(/\{contact\}/g,c.n||'the client').replace(/\{product\}/g,l?l.product:(p?p.p:'')); }
function abMakeTask(r,a,l,p){ var key=r.id+':'+a.id+':'+(l?l.id:(p?p.id:'')); if(S.data.tasks.some(function(t){ return t.abKey===key; })) return 0;
  S.data.tasks.push({id:'T-'+(S.data.seq.task++),line:l?l.id:null,acct:l?null:a.id,owner:a.abm,title:abFill(r.title,a,l,p),desc:'',cls:'ABM',src:'ABM task rule · '+r.id,by:'system',
    createdAt:S.now,dueAt:addWork(S.now,r.unit==='h'?r.n*60:r.n*540),escAt:0,done:0,doneAt:0,doneBy:'',rule:'',abKey:key}); return 1; }
/* [stated 27 Oct] retired: these rules now live in the task configurator's Post-sales section (Role = ABM) */
function abFireStage(l){ return 0; var a=acctOf(l), n=0; if(!a||!a.abm) return 0; (S.data.arules||[]).forEach(function(r){ if(r.on&&r.trig==='stage'&&+r.stage===l.stage) n+=abMakeTask(r,a,l); }); return n; }
function abFireAssign(a,l){ return 0; var n=0; (S.data.arules||[]).forEach(function(r){ if(r.on&&r.trig==='assign') n+=abMakeTask(r,a,l); }); return n; }
function abRenewSweep(){ return 0; var n=0; if(!S.data||!S.data.arules) return 0; S.data.accounts.forEach(function(a){ if(!a.abm) return; (a.pols||[]).forEach(function(p){ if(p.issuing||p.expired) return; var d=daysBetween(S.now,p.exp);
    S.data.arules.forEach(function(r){ if(r.on&&r.trig==='renew'&&d>=0&&d<=+r.days) n+=abMakeTask(r,a,null,p); }); }); }); return n; }
SCREENS.abprules=function(){ return SCREENS.abrules(); };
SCREENS.abprules_old=function(){
  var u=me(); if(!isMgr(u)&&!(u&&u.role==='admin')) return {sc:'ABM task rules',html:empty('lock','Only the ABM Manager edits ABM task rules',''),cta:''};
  var rs=S.data.arules||[];
  var html='<div class="hdrow"><div><div class="h1">ABM task rules</div><div class="sub">Tasks the system creates for a customer’s ABM. They land on the ABM’s own task list, never the RM’s.</div></div></div>'+diamonds()+
    note('amber','Example rules','These four show how the configurator works. The real list comes from the business.','info')+
    '<div class="card mt16" style="overflow:hidden"><div class="tw"><table class="t rules"><thead><tr><th>Rule</th><th>When</th><th>Task for the ABM</th><th>Due</th><th>Active</th><th></th></tr></thead><tbody>'+
    rs.map(function(r){ return '<tr><td class="id">'+esc(r.id)+'</td><td class="when">'+ruleWhen(r)+'</td><td><span class="tt">'+esc(r.title)+'</span></td><td class="due">'+plural(r.n,r.unit==='h'?'working hour':'working day')+'<div class="sub">after it fires</div></td><td><button class="btn xs'+(r.on?' primary':'')+'" data-abrtog="'+r.id+'">'+(r.on?'On':'Off')+'</button></td><td><button class="btn sm" data-flow="ab_ruleEdit" data-id="'+r.id+'">Edit</button></td></tr>'; }).join('')+'</tbody></table></div></div>'+
    '<div class="mt12 meta">In the task text, {customer}, {contact} and {product} are filled in when the task is created.</div>';
  return {sc:'ABM task rules', html:html, cta:'<button class="btn primary sm" data-flow="ab_ruleEdit">'+ic('plus')+'Add rule</button>'};
};
HANDLERS.push(function(t){ var x=t.closest('[data-abrtog]'); if(!x) return false; var r=by(S.data.arules,x.dataset.abrtog); r.on=!r.on; save(); paint(); toast(r.id+(r.on?' is on':' is off'),''); return true; });
FLOWS.ab_ruleEdit={t:function(){ return S.sel.id?'Edit '+S.sel.id:'Add an ABM task rule'; }, sub:'A task for the customer’s ABM.', repaintOn:['trig'],
  body:function(){ var r=S.sel.id?by(S.data.arules,S.sel.id):null; if(S.sel._i===undefined){ S.sel._i=1; var d=r||{trig:'stage',stage:13,days:60,title:'',n:1,unit:'d'}; S.sel.trig=d.trig; S.sel.stage=String(d.stage); S.sel.days=String(d.days); S.sel.title=d.title; S.sel.n=String(d.n); S.sel.unit=d.unit; }
    var sts=[]; for(var i=1;i<=15;i++) sts.push([String(i),i+' · '+stageName(i)]);
    return field('When',select('trig',S.sel.trig,[['assign',TRIG.assign],['stage',TRIG.stage],['renew',TRIG.renew]]))+
      (S.sel.trig==='stage'?field('Stage',select('stage',S.sel.stage,sts)):'')+
      (S.sel.trig==='renew'?field('Days before expiry',input('days',S.sel.days,'60','inputmode="numeric"')):'')+
      field('Task for the ABM',input('title',S.sel.title,'Follow up with {contact} on …'),'Use {customer}, {contact} and {product}.')+
      '<div class="fgrid">'+field('Due after',input('n',S.sel.n,'1','inputmode="numeric"'))+field('Unit',select('unit',S.sel.unit,[['h','Working hours'],['d','Working days']]))+'</div>'; },
  can:function(){ return !!(S.sel.title||'').trim()&&+S.sel.n>0&&(S.sel.trig!=='renew'||+S.sel.days>0); }, ok:function(){ return S.sel.id?'Save rule':'Add rule'; },
  run:function(){ var r=S.sel.id?by(S.data.arules,S.sel.id):null; if(!r){ r={id:'AR-'+String(S.data.seq.ar++).padStart(2,'0'),on:true}; S.data.arules.push(r); }
    r.trig=S.sel.trig; r.stage=+S.sel.stage; r.days=+S.sel.days||60; r.title=S.sel.title.trim(); r.n=+S.sel.n; r.unit=S.sel.unit; var n=r.trig==='renew'?abRenewSweep():0; save();
    toast(r.id+' saved',n?plural(n,'task')+' created for ABMs now':'It creates tasks from the next time it fires.'); }};

/* ---------- manager: reassign a customer's ABM ---------- */
FLOWS.ab_reassignAbm={t:'Reassign the ABM', sub:function(){ var a=by(S.data.accounts,S.sel.id); return a?a.n+' · ABM now '+uname(a.abm):''; }, repaintOn:['to'],
  body:function(){ var a=by(S.data.accounts,S.sel.id); return field('New ABM',select('to',S.sel.to||'',[['','Pick an ABM executive']].concat(abmUsers().filter(function(x){return x.id!==a.abm;}).map(function(x){return [x.id,x.n];}))))+
    note('neutral','','The RM stays the owner. The new ABM takes this customer for good, with its open ABM tasks; every later opportunity on it goes to them.','info'); },
  can:function(){ return !!S.sel.to; }, ok:'Reassign',
  run:function(){ var a=by(S.data.accounts,S.sel.id), was=a.abm, moved=0;
    var ok=write(function(){ a.abm=S.sel.to; a.abmHow='Reassigned by the ABM Manager'; a.abmAt=S.now;
      S.data.tasks.forEach(function(t){ if(!t.done&&t.cls==='ABM'&&t.owner===was&&(t.acct===a.id||(t.line&&(lineById(t.line)||{}).acct===a.id))){ t.owner=a.abm; moved++; } });
      acctLog(a,'ABM reassigned · '+uname(was)+' → '+uname(a.abm),'By '+uname(S.user)+' · '+plural(moved,'open ABM task')+' moved'); },'the reassignment');
    if(!ok) return 'fail'; toast('ABM is now '+uname(a.abm),plural(moved,'open task')+' moved with the customer.'); }};
/* the account page shows the RM and ABM in its header strip (abTeam) */

/* ---------- an existing customer's new opportunity goes to its RM and ABM ---------- */
(function(){ var F=FLOWS.newOpp, r0=F.run; F.run=function(){ var res=r0.apply(this,arguments);
  try{ var d=S.sel&&S.sel.done, l=d&&d.line?lineById(d.line):null, a=l?acctOf(l):null;
    if(a&&a.abm&&a.own&&l.owner!==a.own&&(userById(a.own)||{}).role==='rm'){ var was=l.owner; l.owner=a.own; tasksOfLine(l.id).forEach(function(t){ if(!t.done) t.owner=a.own; });
      lineLog(l,'Existing customer · goes to its RM and ABM','System · owner '+uname(a.own)+' (RM) with '+uname(a.abm)+' (ABM)'+(was!==a.own?' · created by '+uname(was):''),'sys',1); save(); paint(); } }catch(e){}
  return res; }; })();

/* ---------- sign-in, nav, mode switch ---------- */
PERSONAS.push({id:'arjun', d:'ABM executive. Pre-sales: adds and works his own prospects, books the consultation and hands interested prospects to Sales or an RM. Post-sales: the RM’s view of the customers he is ABM for, with the RM’s actions.'},
  {id:'kavya', d:'ABM manager. Sees every ABM prospect and customer, uploads files with an owner per row, reassigns prospects and a customer’s ABM, '});
homeRoute=(function(h0){ return function(u){ u=u||me(); if(isAbm(u)) return abMode(u.id)==='post'?'rmhome':'abhome'; return h0(u); }; })(homeRoute);
navFor=(function(n0){ return function(u){ if(!isAbm(u)) return n0(u); var m=isMgr(u)||!!u.lead;
  if(abMode(u.id)==='post') return [['rmhome','Home',ic('home','ic22')],['pipeline','Opportunities',ic('list','ic22')],['renewals','Renewals',ic('refresh','ic22')],['accounts','Accounts',ic('building','ic22')],['tasks','Tasks',ic('checks','ic22')],['tickets','Tickets',ic('ticket','ic22')]];
  return [['abhome','Home',ic('home','ic22')],['abpros',m?'Team prospects':'Prospects',ic('list','ic22')],['abtasks','Tasks',ic('checks','ic22')],['abhanded','Handed off',ic('handshake','ic22')]]; }; })(navFor);
navBadge=(function(b0){ return function(v,u){
  if(v==='abtasks') return preTasks(u).filter(function(t){ var s=ptState(t); return s==='over'||s==='today'; }).length;
  if(v==='abhome') return myPros(u).filter(function(p){ return !p.bucket&&(p.stage==='sal'||(p.stage==='callsetup'&&(!p.meet||sameDay(p.meet.at,S.now)))); }).length;
  if(v.indexOf('ab')===0) return 0; return b0(v,u); }; })(navBadge);
activeNav=(function(a0){ return function(){ var v=S.route.v; if(v==='abpro') return 'abpros'; if(v.indexOf('ab')===0) return v; return a0(); }; })(activeNav);
['abhome','abpros','abhanded','abpro','abtasks','abrules'].forEach(function(k){ var f=SCREENS[k]; SCREENS[k]=function(){ var o=f(); if(o.cta===undefined) o.cta=(k==='abtasks'||k==='abrules')?'':'<button class="btn sm" data-flow="ab_bulk">'+ic('upload')+'Bulk upload</button><button class="btn primary sm" data-flow="ab_addPro">'+ic('plus')+'Add prospect</button>'; return o; }; });
paint=(function(p0){ return function(){ var u=S.user&&S.data?me():null, abu=isAbm(u), pre=abu&&abMode(u.id)!=='post';
  if(abu){ var v=S.route.v||'', abv=v.indexOf('ab')===0&&v!=='abprules'; if(pre&&!abv) S.route={v:'abhome'}; if(!pre&&abv) S.route={v:'rmhome'}; }
  p0();
  if(abu){ var ws=document.querySelector('.side .wmsub'); if(ws){ ws.textContent=(isMgr(u)?'ABM management':'ABM')+' · '+(pre?'pre-sales':'post-sales')+' · prototype';
      ws.insertAdjacentHTML('afterend','<div class="vsw" role="group" aria-label="Journey"><button data-abmode="pre"'+(pre?' class="on"':'')+'>'+ic('sparkles','ic14')+'Pre-sales</button><button data-abmode="post"'+(pre?'':' class="on"')+'>'+ic('building','ic14')+'Post-sales</button></div>'); }
    if(!pre){ var nb=document.querySelector('.topbar .rt > [data-flow="newOpp"]:not([data-acct])'); if(nb) nb.remove(); } } }; })(paint);
HANDLERS.push(function(t){ var x=t.closest('[data-abmode]'); if(!x) return false; S.data.abmMode=S.data.abmMode||{}; S.data.abmMode[S.user]=x.dataset.abmode; S.hist=[]; go(homeRoute(),null,true); return true; });
/* ABM flows open on a prospect id; a choice resets the disposition under it */
HANDLERS.push(function(t){ if(!S.flow||S.flow.indexOf('ab_')!==0) return false; var x=t.closest('#ovl [data-mset]'); if(!x) return false; S.sel[x.dataset.mset]=x.dataset.mval; if(x.dataset.mset==='oc') S.sel.d=''; paintModal(); return true; });
HANDLERS.push(function(t){ var x=t.closest('[data-flow^="ab_"]'); if(!x||x.disabled) return false; openFlow(x.dataset.flow,{id:x.dataset.id||'',opp:x.dataset.opp||''}); return true; });
HANDLERS.push(function(t){ if(t.closest('[data-abclearpf]')){ S.ui.abpq='';S.ui.abpown='';S.ui.abpdnp='';S.ui.abpsrc=''; paint(); return true; } return false; });

/* ---------- the clock: Time Pending comes due, renewal rules fire ---------- */
advanceClock=(function(c0){ return function(t){ var r=c0(t); try{ var n=sweep(), m=abRenewSweep(); preSync(); if(n||m) setTimeout(function(){ toast('ABM',(n?plural(n,'prospect')+' moved from Time Pending to Meeting Set-up':'')+(n&&m?' · ':'')+(m?plural(m,'ABM task')+' created by rule':'')); },60); }catch(e){} return r; }; })(advanceClock);
primeRules=(function(r0){ return function(){ var r=r0.apply(this,arguments); try{ abRenewSweep(); preSync(); }catch(e){} return r; }; })(primeRules);

/* ---------- seed ---------- */
function abSeed(d){
  ABM_USERS.forEach(function(u){ if(!d.users.some(function(x){return x.id===u.id;})) d.users.push(JSON.parse(JSON.stringify(u))); });
  var s=abSeedPros(); d.pros=s.pros; d.seq.pr=1021; d.seq.ar=5; d.arules=abSeedRules(); d.abmMode={}; d.abmRR=0; d.abmPool=ABM_USERS.filter(function(u){return u.role==='abm';}).map(function(u){ return {id:u.id,on:true}; });
  /* PR-1012 was handed off 16 days ago: its opportunity is a real BimaSetu line, worked by Anand */
  var bw=v74MkAcct(d,{id:'A-1301',n:'Bluewave Aquaculture',city:'Kochi',st:'Kerala',ind:'Aquaculture',own:'anand',prov:1,at:ago(16),con:{n:'Joseph Thomas',d:'Managing partner',m:'+91 94470 11876',e:'joseph@bluewave.in',dm:1}});
  var l=v74MkLine(d,{id:'OP-3101',acct:bw.id,product:'Marine Cargo',owner:'anand',at:ago(16),src:'ABM',con:{n:'Joseph Thomas',m:'+91 94470 11876',e:'joseph@bluewave.in'}});
  l.srcAbm='arjun'; l.abmPro='PR-1012'; l.extRenew=at(12,31); l.extDoc='Bluewave_marine_policy_2025.pdf'; l.mom='Exports shrimp to the EU, ~40 shipments a year. Wants an annual open cover.';
  l.stage=2; l.conn=1; l.calls=1; l.enteredAt=ago(15); l.visits=[{n:1,in:ago(16),out:ago(15)},{n:2,in:ago(15)}];
  l.log.unshift({at:ago(16),t:'Handed off by the ABM',m:'System · Arjun Mehta · from prospect PR-1012 · owner Anand Kulkarni · existing policy Bluewave_marine_policy_2025.pdf',sys:1,kind:'sys'},
    {at:ago(16),t:'Meeting notes from the ABM',m:l.mom,sys:1,kind:'note'},{at:ago(15),t:'Call · Customer decided — update stage',m:'Anand Kulkarni · call 1 · connected · Ozonetel click-to-call',sys:0,kind:'call'});
  d.pros.forEach(function(p){ if(p.id==='PR-1012'&&p.handoff){ p.handoff.opps[0].id=l.id; p.handoff.acct=bw.id; } });
  d.seq.acct=Math.max(d.seq.acct||0,1302);
  /* the RM's existing customers each have an ABM already (round robin, months ago) */
  var pool=['arjun','sneha','rahul'], i=0;
  d.accounts.forEach(function(a){ var paid=(a.pols||[]).length||d.lines.some(function(x){ return x.acct===a.id&&x.stage>=12; }); if(a.own==='priya'&&paid&&!a.abm){ a.abm=pool[i%3]; a.abmHow=i===1?'Sourced by ABM':'Round robin'; a.abmAt=a.createdAt||ago(120); i++;
    a.log=a.log||[]; a.log.unshift({at:a.abmAt,t:'ABM assigned · '+(d.users.filter(function(u){return u.id===a.abm;})[0]||{}).n,m:a.abmHow+' · at Payment Completed',kind:'sys'}); } });
  d.abmRR=i%3;
  var arj=d.accounts.filter(function(a){ return a.abm==='arjun'; })[0];
  if(arj){ d.tasks.push({id:'T-'+(d.seq.task++),line:null,acct:arj.id,owner:'arjun',title:'Quarterly check-in with '+(((arj.con||[])[0]||{}).n||'the client')+' on '+arj.n,desc:'',cls:'ABM',src:'Added by Arjun Mehta',by:'arjun',createdAt:ago(2),dueAt:T0L+3*3600000,escAt:0,done:0,doneAt:0,doneBy:'',rule:''}); }
  return d; }
seedFill=(function(f0){ return function(d){ var r=f0(d); abSeed(r||d); return r||d; }; })(seedFill);

/* ---------- sign-in grouped by journey [stated 23 Oct] ---------- */
renderSignin=(function(r0){ return function(){ var h=r0(), i=h.indexOf('<div class="personas">'), j=h.indexOf('<div class="mt20">',i); if(i<0||j<0) return h;
  var cards={}; h.slice(i,j).split('<button class="pcard"').slice(1).forEach(function(c){ var m=c.match(/data-signin="([^"]+)"/); if(m) cards[m[1]]='<button class="pcard"'+c.replace(/<\/div>\s*$/,''); });
  var grp=function(t,sub,ids){ var cs=ids.filter(function(id){return cards[id];}).map(function(id){return cards[id];}).join(''); return cs?'<div class="pgrp"><div class="pgh"><b>'+esc(t)+'</b><span>'+esc(sub)+'</span></div><div class="personas">'+cs+'</div></div>':''; };
  var abIds=(S.data?abAllUsers():[]).map(function(u){return u.id;}).filter(function(id){return id!=='arjun'&&id!=='kavya';}), known=['arjun','kavya','nikhil','vikram','priya','meera','admin'].concat(abIds), rest=Object.keys(cards).filter(function(id){return known.indexOf(id)<0;});
  var body=grp('Pre-sales','The ABM team — prospects, outreach, the consultation meeting and the handoff.',['arjun','kavya'].concat(abIds))+
    grp('Sales','Opportunities from New Lead to Payment Completed.',['nikhil','vikram'].concat(rest))+
    grp('Post-sales','Customers after payment — issuance, renewals and servicing.',['priya','meera'])+
    grp('Administration','Full access across every team, and the masters.',['admin']);
  return h.slice(0,i)+body+h.slice(j); }; })(renderSignin);
