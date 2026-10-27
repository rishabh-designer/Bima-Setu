/* ==================================================================== *
 *  Admin master · ABM assignment — the ABM team [stated 23 Oct: add ABM
 *  users, create an ABM manager]. An executive joins the end of the
 *  round-robin pool; a manager is never in it. Every ABM user can sign in.
 * ==================================================================== */
function abAllUsers(){ return S.data.users.filter(function(u){ return u.role==='abm'||u.role==='abmmgr'; }); }
function abMgrs(){ return S.data.users.filter(function(u){ return u.role==='abmmgr'; }); }
function abSyncPersonas(){ var us=S.data?abAllUsers():ABM_USERS;
  us.forEach(function(u){ if(!PERSONAS.some(function(p){ return p.id===u.id; }))
    PERSONAS.push({id:u.id, d:u.role==='abmmgr'?'ABM manager. Sees every ABM prospect and customer, reassigns prospects and a customer’s ABM, ':'ABM executive. Pre-sales: works own prospects and hands them to Sales or an RM. Post-sales: the customers they are ABM for.'}); }); }
function abUserSlug(n){ var b=String(n||'').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g,'')||'abm', id=b, k=2; while(userById(id)) id=b+(k++); return id; }
FLOWS.ab_userForm={
  t:function(){ return S.sel.uid?'Edit ABM user':'Add ABM user'; },
  sub:function(){ return S.sel.uid?uname(S.sel.uid):'An ABM executive or an ABM manager. They can sign in straight away.'; },
  init:function(){ var u=S.sel.uid?userById(S.sel.uid):null, m=abMgrs()[0];
    if(S.sel._init) return; S.sel._init=1;
    S.sel.n=u?u.n:''; S.sel.mob=u?(u.m||''):''; S.sel.em=u?(u.e||''):''; S.sel.role=u?u.role:'abm'; S.sel.mgr=u?(u.mgr||''):(m?m.id:''); S.sel.pool='1'; },
  repaintOn:['role'],
  body:function(){ FLOWS.ab_userForm.init(); var u=S.sel.uid?userById(S.sel.uid):null, ex=S.sel.role==='abm', mgrs=abMgrs().filter(function(x){ return x.id!==S.sel.uid; });
    var reports=u?S.data.users.filter(function(x){ return x.role==='abm'&&x.mgr===u.id; }):[];
    var dup=abDupName();
    return field('Full name',input('n',S.sel.n,'e.g. Neha Iyer'),'',dup?'There is already a user called '+dup+'.':'')+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0 12px">'+field('Mobile',input('mob',S.sel.mob,'+91 98xxx xxxxx'),'Optional')+field('Work email',input('em',S.sel.em,'name@bimakavach.com'),'Optional')+'</div>'+
      field('Role',select('role',S.sel.role,[['abm','ABM executive'],['abmmgr','ABM manager']]),
        ex?'Works their own prospects and the customers they are ABM for.':'Sees every ABM prospect and customer, reassigns them  Never in the round-robin pool.',
        (u&&u.role==='abmmgr'&&ex&&reports.length)?'Move '+plural(reports.length,'executive')+' reporting to '+u.n+' to another manager first.':'')+
      (ex?field('Reports to',select('mgr',S.sel.mgr||'',[['','Pick an ABM manager']].concat(mgrs.map(function(x){ return [x.id,x.n]; }))),mgrs.length?'':'There is no ABM manager yet — add one first, or save without one.'):'')+
      (ex&&!(u&&u.role==='abm')?field('Round-robin pool',select('pool',S.sel.pool,[['1','In — joins the end of the pool'],['0','Out for now — can be switched In later']])):'')+
      (u&&u.role==='abm'&&!ex?note('amber','Leaving the pool','As a manager, '+u.n+' leaves the round-robin pool. Customers they already hold stay with them until reassigned.'):''); },
  can:function(){ var u=S.sel.uid?userById(S.sel.uid):null; if(!String(S.sel.n||'').trim()||abDupName()) return false;
    if(u&&u.role==='abmmgr'&&S.sel.role==='abm'&&S.data.users.some(function(x){ return x.role==='abm'&&x.mgr===u.id; })) return false; return true; },
  ok:function(){ return S.sel.uid?'Save':'Add user'; },
  run:function(){ var u=S.sel.uid?userById(S.sel.uid):null, n=String(S.sel.n).trim(), role=S.sel.role, id=u?u.id:abUserSlug(n), wasAbm=u&&u.role==='abm';
    var ok=write(function(){
      if(!u){ u={id:id,n:n,role:role,cat:'',mgr:'',title:''}; S.data.users.push(u); }
      u.n=n; u.m=String(S.sel.mob||'').trim(); u.e=String(S.sel.em||'').trim(); u.role=role; u.title=role==='abmmgr'?'ABM manager':'ABM executive'; u.mgr=role==='abm'?(S.sel.mgr||''):'';
      var pool=abPool();
      if(role==='abm'&&!wasAbm){ var x=pool.filter(function(p){ return p.id===id; })[0]; if(x) x.on=S.sel.pool!=='0'; } },'the ABM user');
    if(!ok) return 'fail'; abSyncPersonas();
    toast(S.sel.uid?'Saved':n+' added', role==='abmmgr'?'ABM manager · can sign in now':'ABM executive'+(wasAbm?'':' · '+(S.sel.pool==='0'?'out of the pool for now':'joins the end of the round-robin pool'))); }};
function abDupName(){ var n=String(S.sel.n||'').trim().toLowerCase(); if(!n) return ''; var d=S.data.users.filter(function(x){ return x.id!==S.sel.uid&&String(x.n||'').toLowerCase()===n; })[0]; return d?d.n:''; }
HANDLERS.push(function(t){ var x=t.closest('[data-abuser]'); if(!x) return false; openFlow('ab_userForm',{uid:x.dataset.abuser||''}); return true; });
SCREENS.masterabm=(function(s0){ return function(){ var o=s0(); if(!me()||me().role!=='admin') return o;
  var cust=function(id){ return S.data.accounts.filter(function(a){ return a.abm===id; }).length; }, pros=function(id){ return (S.data.pros||[]).filter(function(p){ return p.owner===id; }).length; };
  var us=abAllUsers().slice().sort(function(a,b){ return (a.role==='abmmgr'?0:1)-(b.role==='abmmgr'?0:1); });
  var rows=us.map(function(u){ var mg=u.role==='abmmgr', reps=S.data.users.filter(function(x){ return x.role==='abm'&&x.mgr===u.id; }).length;
    return '<tr><td class="nm"><span class="flex">'+avatar(u.n,true)+esc(u.n)+'</span>'+(u.e||u.m?'<div class="meta">'+esc([u.m,u.e].filter(Boolean).join(' · '))+'</div>':'')+'</td>'+
      '<td>'+chip(mg?'ABM manager':'ABM executive',mg?'violet':'blue',true,true)+'</td>'+
      '<td>'+(mg?'<span class="meta">'+plural(reps,'executive')+'</span>':(u.mgr?esc(uname(u.mgr)):'<span class="meta">—</span>'))+'</td>'+
      '<td class="num">'+pros(u.id)+'</td><td class="num">'+cust(u.id)+'</td>'+
      '<td class="right"><button class="btn sm" data-abuser="'+u.id+'">Edit</button></td></tr>'; }).join('');
  var team='<div class="flex mt16 mb12" style="align-items:center"><div class="h4">ABM team</div><span class="sp"></span><button class="btn sm pri" data-abuser="">'+ic('plus')+'Add ABM user</button></div>'+
    '<section class="card" style="overflow:hidden"><div class="tw"><table class="t"><thead><tr><th>Name</th><th>Role</th><th>Reports to · team</th><th class="num">Prospects</th><th class="num">Customers</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></section>';
  var k=o.html.indexOf('<div class="h4 mt16 mb12">Round-robin pool</div>'); if(k>=0) o.html=o.html.slice(0,k)+team+o.html.slice(k);
  return o; }; })(SCREENS.masterabm);
renderSignin=(function(r0){ return function(){ abSyncPersonas(); return r0(); }; })(renderSignin);
/* [stated 27 Oct] an ABM team lead sees and works their own team's prospects (later declarations win in this scope) */
function inScope(p,u){ u=u||me(); return isMgr(u)||p.owner===u.id||(!!window.isAnc&&isAnc(u.id,p.owner)); }
function canWork(p,u){ u=u||me(); return !!u&&(p.owner===u.id||(!!window.isAnc&&isAnc(u.id,p.owner)))&&!isHanded(p); }

})();

/* ==== Lead Masters (v75.7) ==== */

(function(){
let PRODUCTS=[], NAMES={};
const OUTCOMES={rr:"Sales person (round robin)",mgr:"Sales Manager",mgr_notify:"Sales Manager"};
const OUTCOME_OPTS={rr:"Sales person (round robin)",mgr:"Sales Manager",mgr_notify:"Sales Manager + notify"};
const ROLE_LBL={user:"Sales user",mgr:"Sales Manager",both:"Sales user + Manager"};

/* Location routing is built but hidden. Set to true to show the Locations tab and the State field when testing. */
const SHOW_GEO=false;
const ZONE_SEED={north:["Chandigarh","Delhi","Haryana","Himachal Pradesh","Jammu and Kashmir","Ladakh","Punjab","Rajasthan","Uttar Pradesh","Uttarakhand"],
 south:["Andaman and Nicobar Islands","Andhra Pradesh","Karnataka","Kerala","Lakshadweep","Puducherry","Tamil Nadu","Telangana"],
 east:["Arunachal Pradesh","Assam","Bihar","Jharkhand","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Sikkim","Tripura","West Bengal"],
 west:["Chhattisgarh","Dadra and Nagar Haveli and Daman and Diu","Goa","Gujarat","Madhya Pradesh","Maharashtra"]};
const STATES=Object.values(ZONE_SEED).flat().sort();
function geoDefaults(){const stateZone={}; Object.entries(ZONE_SEED).forEach(([z,l])=>l.forEach(st=>stateZone[st]=z));
  return {on:false,zones:[{id:"north",name:"North"},{id:"south",name:"South"},{id:"east",name:"East"},{id:"west",name:"West"}],stateZone}}
const uid=p=>p+Math.random().toString(36).slice(2,8);
function lmNum(v){ v=String(v||'').replace(/[₹,\s]/g,''); const m=v.match(/^([\d.]+)(cr|crore|l|lakh|lakhs|k)?$/i); if(!m) return ''; let n=+m[1]; const u=(m[2]||'').toLowerCase(); if(u==='cr'||u==='crore') n*=1e7; else if(u[0]==='l') n*=1e5; else if(u==='k') n*=1e3; return String(Math.round(n)); }

function defaults(){
  /* seeded from BimaSetu so routing is unchanged until an admin edits it: one group per product category */
  const users=S.data.users, P=u=>({id:u.id,name:u.n,user:u.role==='exec'?1:0,mgr:u.role==='mgr'?1:0,bk:1});
  const people=users.filter(u=>u.role==='exec'||u.role==='mgr').map(P);
  const cats={}; Object.keys(CATOF).forEach(p=>{(cats[CATOF[p]]=cats[CATOF[p]]||[]).push(p)});
  const teams=Object.keys(cats).map((c,i)=>({id:"t_"+(i+1),name:c+" team",active:true,products:cats[c],users:(CAT_ROUTE[c]||[]).slice(),manager:"vikram",zones:{}}));
  const grp={"Directors & Officers":"liab","Professional Indemnity":"liab","Commercial General Liability":"liab","Cyber Liability":"liab","Workmen’s Compensation":"liab",
    "Fire & Special Perils":"fire","Industrial All Risk":"fire","Burglary":"fire","Marine Cargo":"marine"};
  const groupOf={}; Object.keys(CATOF).forEach(p=>groupOf[p]=grp[p]||"");
  return {products:Object.keys(CATOF).map(p=>[p,p]),people,teams,groupOf,geo:geoDefaults(),
    groups:[{id:"liab",name:"Liability"},{id:"fire",name:"Fire group"},{id:"marine",name:"Marine"}],
    params:[{id:"si",label:"Sum insured / LOI"},{id:"rev",label:"Annual turnover"}],
    thr:{liab:{si:100000000,rev:300000000},fire:{si:250000000,rev:300000000},marine:{si:500000000,rev:300000000}},
    rules:{"si:L|rev:L":"rr","si:L|rev:H":"mgr_notify","si:H|rev:H":"mgr","si:H|rev:L":"mgr_notify"}};
}
const clone=o=>JSON.parse(JSON.stringify(o));
const PRIO=["P0","P1","P2","P3"];
function priorityDefaults(){
  /* the live drop-off events and their live priorities */
  const stages=Object.keys(WEB_DROP_MAP).map((name,i)=>({id:"s"+(i+1),name,p:Math.max(0,PRIO.indexOf(WEB_PRIO[name]||"P1"))}));
  return {stages,rules:[],fields:[]};
}
let cfg=null, rr={};
function init(){ if(!S.data) return; if(!S.data.lm) S.data.lm=defaults(); cfg=S.data.lm;
  if(!cfg.geo) cfg.geo=geoDefaults(); cfg.teams.forEach(t=>{t.zones=t.zones||{}});
  if(!cfg.priority) cfg.priority=priorityDefaults();
  if(!S.data.lmrr) S.data.lmrr={}; rr=S.data.lmrr; syncProducts(); }
function syncProducts(){PRODUCTS=cfg.products; NAMES=Object.fromEntries(PRODUCTS)}
let page="assign", tab="groups", ed=null, edKind=null, armed=false;
let simVals={stage:"s5",prod:"Directors & Officers",si:"120000000",rev:"180000000",state:"Karnataka"};
function persist(){ syncLive(); save(); }
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const isAdmin=()=>{ const u=me(); return !!u&&u.role==="admin"; };
const pname=id=>(cfg.people.find(p=>p.id===id)||{}).name||"";
const gname=id=>(cfg.groups.find(g=>g.id===id)||{}).name||"";
const zname=id=>(cfg.geo.zones.find(z=>z.id===id)||{}).name||"";
const teamFor=(c,pid)=>c.teams.find(t=>t.products.includes(pid));
const rrKey=(tid,z)=>z?tid+"@"+z:tid;
const HL=c=>c==="H"?"High":"Low";
const initials=n=>n.split(" ").map(w=>w[0]).join("").slice(0,2);
const roleOf=p=>p.user&&p.mgr?"both":p.mgr?"mgr":"user";
function combos(params){let out=[[]];params.forEach(p=>{out=out.flatMap(c=>[[...c,[p.id,"L"]],[...c,[p.id,"H"]]])});return out}
const ckey=c=>c.map(([id,v])=>id+":"+v).join("|");

/* Indian-system number in words: 20000000 -> "Two Crore" */
const ONES=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const TENS=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
function w99(n){return n<20?ONES[n]:TENS[Math.floor(n/10)]+(n%10?" "+ONES[n%10]:"")}
function w999(n){const h=Math.floor(n/100), r=n%100; return [h?ONES[h]+" Hundred":"",r?w99(r):""].filter(Boolean).join(" ")}
function inWords(v){
  const s=String(v??"").replace(/,/g,"").trim(); if(s===""||isNaN(+s)||+s<0) return "";
  let n=Math.floor(+s); const paise=Math.round((+s-n)*100); if(n===0&&!paise) return "Zero";
  const parts=[]; const cr=Math.floor(n/1e7); n%=1e7;
  if(cr) parts.push((cr>999?inWords(cr):w999(cr))+" Crore");
  const lk=Math.floor(n/1e5); n%=1e5; if(lk) parts.push(w99(lk)+" Lakh");
  const th=Math.floor(n/1e3); n%=1e3; if(th) parts.push(w99(th)+" Thousand");
  if(n) parts.push(w999(n));
  let out=parts.join(" "); if(paise) out+=(out?" and ":"")+w99(paise)+" Paise";
  return out;
}
/* short Indian amount: 100000000 -> ₹10 Cr */
function short(v){const n=+v; if(!(n>0)) return ""; const f=x=>(+x.toFixed(2)).toLocaleString("en-IN");
  return n>=1e7?`₹${f(n/1e7)} Cr`:n>=1e5?`₹${f(n/1e5)} L`:`₹${n.toLocaleString("en-IN")}`}

/* ---------- assignment engine ---------- */
function num(v){v=String(v??"").trim(); if(v==="") return null; const n=Number(v.replace(/,/g,"")); return isFinite(n)&&n>=0?n:NaN}
function assign(pid,vals,commit){
  const g=cfg.groupOf[pid], tm=teamFor(cfg,pid), given={};
  for(const p of cfg.params){const n=num(vals[p.id]); if(Number.isNaN(n)) return {error:`${p.label} must be a number.`}; given[p.id]=n}
  const missing=cfg.params.filter(p=>given[p.id]===null), t=g&&cfg.thr[g];
  const cutsSet=t&&cfg.params.every(p=>t[p.id]>0);
  let logic=1,outcome="rr",cls=null,reason="";
  if(!missing.length&&g&&cutsSet){logic=2; cls=cfg.params.map(p=>[p.id,given[p.id]>=t[p.id]?"H":"L"]); outcome=cfg.rules[ckey(cls)]||"rr"}
  else reason=missing.length?`${missing.map(p=>p.label).join(" and ")} not given`:!g?"Product has no Logic 2 group":"Cut-offs not set";
  let team=tm, z=null, loc="";
  if(tm&&SHOW_GEO&&cfg.geo.on&&vals.state){const zz=cfg.geo.stateZone[vals.state], zt=zz&&(tm.zones||{})[zz]; if(zt){team=zt; z=zz; loc=zname(zz)+" team"} else loc="All India team"}
  let who="",whoId="",sub="",note="";
  if(!tm) note="Product is not in any assignment group";
  else if(!tm.active) note=`${tm.name} is paused`;
  else if(outcome==="rr"){const users=team.users.filter(Boolean), k=rrKey(tm.id,z);
    if(!users.length) note="No sales users in "+tm.name;
    else{const i=(rr[k]||0)%users.length; who=pname(users[i]); whoId=users[i]; sub=`Sales person · ${tm.name}`; if(commit) rr[k]=i+1}}
  else{if(team.manager){who=pname(team.manager); whoId=team.manager; sub="Sales Manager · "+tm.name} else note="No Sales Manager in "+tm.name}
  return {logic,who,whoId,team:tm?tm.name:"",sub,note,outcome,cls,reason,group:gname(g),loc};
}

/* ---------- page ---------- */
const TABS=[["groups","Assignment groups","Logic 1"],["rules","Value rules","Logic 2"],["team","Sales team",""],["geo","Locations",""]];
function renderTabs(){
  $("#lm-tabs").innerHTML=TABS.filter(([k])=>k!=="geo"||SHOW_GEO).map(([k,l,s])=>`<button class="tab" role="tab" data-tab="${k}" aria-selected="${tab===k}">${l}${s?`<small>${s}</small>`:""}</button>`).join("");
}
const editBtn=(kind,id,label="Edit")=>isAdmin()?`<button class="btn small" type="button" data-edit="${kind}" data-id="${id||""}">${label}</button>`:"";
const status=(cls,t)=>`<span class="st ${cls}">${t}</span>`;

function prodLine(ids){const names=ids.map(p=>NAMES[p]).filter(Boolean);
  return names.length?`<div class="plist" title="${esc(names.join(", "))}"><span class="pc">${names.length} product${names.length>1?"s":""}</span> · ${esc(names.join(", "))}</div>`:`<div class="plist">No products</div>`}
function renderGroups(){
  let rows=cfg.teams.map(tm=>{
    const u=tm.users.filter(Boolean);
    const next=tm.active&&u.length?pname(u[(rr[tm.id]||0)%u.length]):"—";
    const st=!tm.active?status("off","Paused"):(!u.length||!tm.manager)&&tm.products.length?status("warn","Incomplete"):status("on","Active");
    return `<tr><td class="gcell"><div class="gname">${esc(tm.name)}</div>${prodLine(tm.products)}</td>
      <td><div class="order">${u.map((id,k)=>`<span><b>${k+1}</b>${esc(pname(id))}</span>`).join("")||'<span class="muted">None</span>'}</div></td>
      <td>${esc(pname(tm.manager))||'<span class="muted">—</span>'}</td>
      <td>${esc(next)}</td><td>${st}</td><td class="edit">${editBtn("group",tm.id)}</td></tr>`}).join("");
  const loose=PRODUCTS.filter(([id])=>!teamFor(cfg,id)).map(([id])=>id);
  if(loose.length) rows+=`<tr class="ghost"><td class="gcell"><div class="gname">Not in any group</div>${prodLine(loose)}</td><td colspan="4"><span class="muted">Leads stay unassigned</span></td><td></td></tr>`;
  return `<section class="card"><div class="card-h"><h2>Assignment groups</h2><div class="acts">${isAdmin()?`<button class="btn small primary" type="button" data-edit="group" data-id="">+ New group</button>`:""}</div></div>
    <div class="tw"><table class="gt" style="min-width:860px"><thead><tr><th>Group</th><th>Sales users (in turn)</th><th>Sales Manager</th><th>Next lead</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function renderRules(){
  const P=cfg.params;
  const grows=cfg.groups.map(g=>{const prods=PRODUCTS.filter(([id])=>cfg.groupOf[id]===g.id).map(([id])=>id);
    return `<tr><td class="gcell"><div class="gname">${esc(g.name)}</div>${prodLine(prods)}</td>
      ${P.map(p=>{const v=cfg.thr[g.id][p.id]; return `<td class="cutc">${v>0?`<div class="amt">${short(v)}</div><div class="w">${esc(inWords(v))}</div>`:status("warn","Not set")}</td>`}).join("")}
      <td class="edit">${editBtn("pgroup",g.id)}</td></tr>`}).join("");
  const ungrouped=PRODUCTS.filter(([id])=>!cfg.groupOf[id]).map(([id])=>id);
  const ghost=ungrouped.length?`<tr class="ghost"><td class="gcell"><div class="gname">No group</div>${prodLine(ungrouped)}</td><td colspan="${P.length}"><span class="muted">Always Logic 1</span></td><td></td></tr>`:"";
  const legend=`<span class="legend"><span class="lv Low">Low</span> below cut-off <span class="lv High">High</span> cut-off and above</span>`;
  let who;
  if(P.length===2){
    const cell=(a,b)=>{const v=cfg.rules[ckey([[P[0].id,a],[P[1].id,b]])]||"rr"; return `<div class="mx ${v}"><span class="ico"></span><div><div class="mt">${v==="rr"?"Sales person":"Sales Manager"}</div><div class="ms">${v==="rr"?"Round robin":v==="mgr_notify"?"Discuss + notify":"Direct"}</div></div></div>`};
    who=`<div class="matrix"><div></div><div class="mh">${esc(P[1].label)} <span class="lv Low">Low</span></div><div class="mh">${esc(P[1].label)} <span class="lv High">High</span></div>
      <div class="mh row">${esc(P[0].label)} <span class="lv Low">Low</span></div>${cell("L","L")}${cell("L","H")}
      <div class="mh row">${esc(P[0].label)} <span class="lv High">High</span></div>${cell("H","L")}${cell("H","H")}</div>`;
  }else{
    who=`<div class="tw"><table style="min-width:${260+P.length*160}px"><thead><tr>${P.map(p=>`<th>${esc(p.label)}</th>`).join("")}<th>Assigned to</th></tr></thead><tbody>${combos(P).map(c=>{const v=cfg.rules[ckey(c)]||"rr"; return `<tr>${c.map(([,lv])=>`<td><span class="lv ${HL(lv)}">${HL(lv)}</span></td>`).join("")}<td><span class="oc ${v}">${OUTCOMES[v]}</span></td></tr>`}).join("")}</tbody></table></div>`;
  }
  return `<section class="card"><div class="card-h"><h2>Cut-offs by product group</h2><div class="acts">${legend}${isAdmin()?`<button class="btn small" type="button" data-edit="params">Parameters</button><button class="btn small primary" type="button" data-edit="pgroup" data-id="">+ New group</button>`:""}</div></div>
    <div class="tw"><table class="gt" style="min-width:${380+P.length*200}px"><thead><tr><th>Product group</th>${P.map(p=>`<th>${esc(p.label)} cut-off</th>`).join("")}<th></th></tr></thead><tbody>${grows}${ghost}</tbody></table></div></section>
    <section class="card"><div class="card-h"><h2>Who gets the lead</h2><div class="acts">${editBtn("rules","")}</div></div>${who}</section>`;
}
function renderTeam(){
  const rows=cfg.people.map(p=>{const gs=cfg.teams.filter(t=>t.users.includes(p.id)||t.manager===p.id).map(t=>t.name);
    return `<tr><td class="name">${esc(p.name)}</td><td>${ROLE_LBL[roleOf(p)]}</td><td><div class="list">${gs.map(g=>`<span>${esc(g)}</span>`).join("")||'<span class="muted">None</span>'}</div></td><td class="edit">${editBtn("person",p.id)}</td></tr>`}).join("");
  return `<section class="card"><div class="card-h"><h2>Sales team</h2><div class="acts">${isAdmin()?`<button class="btn small primary" type="button" data-edit="person" data-id="">+ Add person</button>`:""}</div></div>
    <div class="tw"><table style="min-width:560px"><thead><tr><th>Name</th><th>Role</th><th>Assignment groups</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function renderGeo(){
  const rows=cfg.geo.zones.map(z=>`<tr><td class="name">${esc(z.name)}</td><td><div class="list">${STATES.filter(s=>cfg.geo.stateZone[s]===z.id).map(s=>`<span>${esc(s)}</span>`).join("")}</div></td></tr>`).join("");
  return `<section class="card"><div class="card-h"><h2>Locations</h2><div class="acts">${status(cfg.geo.on?"on":"off",cfg.geo.on?"On":"Off")}</div></div>
    <div class="tw"><table style="min-width:520px"><thead><tr><th>Zone</th><th>States</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
/* ---------- Lead priority ---------- */
const pill=p=>`<span class="pp p${p}">${PRIO[p]}</span>`;
function allFields(){
  return [...cfg.params.map(p=>({id:p.id,label:p.label,type:"number"})),
    {id:"product",label:"Product",type:"list",options:PRODUCTS.map(([id,n])=>[id,n])},
    {id:"pgroup",label:"Product group",type:"list",options:cfg.groups.map(g=>[g.id,g.name])},
    ...cfg.priority.fields.map(f=>({...f,custom:true,options:(f.options||[]).map(o=>[o,o])}))];
}
const fieldById=id=>allFields().find(f=>f.id===id);
const OPS={number:{gte:"is at least",lt:"is below"},list:{in:"is",notin:"is not"}};
function ruleText(r){const f=fieldById(r.field); if(!f) return "Parameter removed";
  const val=f.type==="number"?short(r.value)||"—":(r.values||[]).map(v=>(f.options.find(o=>o[0]===v)||[,v])[1]).join(" or ")||"—";
  return `<b>${esc(f.label)}</b> ${OPS[f.type][r.op]||""} <b>${esc(val)}</b>`}
const effectText=r=>r.effect==="raise"?"Raise by one level":`Make it at least ${PRIO[r.target]}`;
function priorityOf(vals){
  const st=cfg.priority.stages.find(s=>s.id===vals.stage);
  if(!st) return {none:true};
  let p=st.p; const steps=[];
  const ctx={...vals,product:vals.prod,pgroup:cfg.groupOf[vals.prod]||""};
  cfg.priority.rules.filter(r=>r.active).forEach(r=>{const f=fieldById(r.field); if(!f) return;
    let hit=false;
    if(f.type==="number"){const v=num(ctx[f.id]); if(v!==null&&!Number.isNaN(v)&&+r.value>0) hit=r.op==="gte"?v>=+r.value:v<+r.value}
    else{const v=ctx[f.id]; if(v) hit=r.op==="in"?(r.values||[]).includes(v):!(r.values||[]).includes(v)}
    if(!hit) return;
    const before=p; p=r.effect==="raise"?Math.max(0,p-1):Math.min(p,r.target);
    steps.push({r,before,after:p})});
  return {p,base:st.p,stage:st.name,steps};
}
function renderPrio(){
  const P=cfg.priority;
  const legend=`<span class="legend">${pill(0)} highest ${pill(3)} lowest</span>`;
  const srows=P.stages.map((st,i)=>`<tr><td class="num muted" style="width:48px">${i+1}</td><td>${esc(st.name)}</td><td>${pill(st.p)}</td><td class="small">${esc(opensAt(st.name))}</td><td class="edit">${editBtn("stage",st.id)}</td></tr>`).join("");
  const rrows=P.rules.map(r=>`<tr><td>If ${ruleText(r)}</td><td>${effectText(r)}</td><td>${r.active?status("on","Active"):status("off","Paused")}</td><td class="edit">${editBtn("prule",r.id)}</td></tr>`).join("");
  return `<section class="card"><div class="card-h"><h2>Priority by drop-off stage <span class="scope">Website leads only</span></h2><div class="acts">${legend}${isAdmin()?`<button class="btn small primary" type="button" data-edit="stage" data-id="">+ Add stage</button>`:""}</div></div>
    <div class="tw"><table style="min-width:520px"><thead><tr><th>#</th><th>Stage the customer dropped at</th><th>Priority</th><th>Opens at</th><th></th></tr></thead><tbody>${srows}</tbody></table></div></section>
    <section class="card"><div class="card-h"><h2>Additional rules</h2><div class="acts">${isAdmin()?`<button class="btn small" type="button" data-edit="pfields">Parameters</button><button class="btn small primary" type="button" data-edit="prule" data-id="">+ New rule</button>`:""}</div></div>
    ${P.rules.length?`<div class="tw"><table style="min-width:620px"><thead><tr><th>Condition</th><th>Then</th><th>Status</th><th></th></tr></thead><tbody>${rrows}</tbody></table></div>`
      :`<div class="emptybox"><b>No additional rules yet</b><span>Add a rule to change a lead's priority using another parameter, such as sum insured or product.</span></div>`}</section>`;
}
function renderPane(){
  if(tab==="geo"&&!SHOW_GEO) tab="groups";
  $("#lm-pane").innerHTML=page==="prio"?renderPrio():{groups:renderGroups,rules:renderRules,team:renderTeam,geo:renderGeo}[tab]();
  $("#lm-viewonly").hidden=isAdmin();
}
const PAGES=[["assign","Lead assignment"],["prio","Lead priority"]];
function renderNav(){
  $("#lm-mnav").innerHTML=PAGES.map(([k,l])=>`<button type="button" class="mlink" data-page="${k}" aria-current="${page===k?"page":"false"}">${l}</button>`).join("");
  const name=PAGES.find(p=>p[0]===page)[1]; $("#lm-ptitle").textContent=name==="Lead priority"?"Lead prioritisation":name;
  $("#lm-tabs").hidden=page!=="assign"; $("#lm-open-test").textContent=page==="prio"?"Test priority":"Test a lead";
}
function renderAll(){renderNav();renderTabs();renderPane()}

/* ---------- drawer ---------- */
function openDrawer(kind,id){
  edKind=kind; armed=false;
  if(kind==="group") ed=id?clone(cfg.teams.find(t=>t.id===id)):{id:"",name:"",active:true,products:[],users:[],manager:"",zones:{}};
  if(kind==="person"){const p=id&&cfg.people.find(x=>x.id===id); ed=p?{...p,role:roleOf(p)}:{id:"",name:"",role:"user"}}
  if(kind==="pgroup"){const g=id&&cfg.groups.find(x=>x.id===id);
    ed=g?{id:g.id,name:g.name,products:PRODUCTS.filter(([p])=>cfg.groupOf[p]===g.id).map(([p])=>p),thr:{...cfg.thr[g.id]}}
        :{id:"",name:"",products:[],thr:Object.fromEntries(cfg.params.map(p=>[p.id,""]))}}
  if(kind==="rules") ed=clone(cfg.rules);
  if(kind==="params") ed={params:clone(cfg.params),add:""};
  if(kind==="test") ed={};
  if(kind==="stage"){const S=cfg.priority.stages, i=S.findIndex(x=>x.id===id); ed=i>=0?{...S[i],after:i>0?S[i-1].id:""}:{id:"",name:"",p:3,after:S.length?S[S.length-1].id:""}}
  if(kind==="prule"){const r=id&&cfg.priority.rules.find(x=>x.id===id); ed=r?clone(r):{id:"",active:true,field:cfg.params[0]?cfg.params[0].id:"product",op:"gte",value:"",values:[],effect:"atleast",target:1}}
  if(kind==="pfields") ed={fields:clone(cfg.priority.fields),nl:"",nt:"number",no:""};
  if(ed&&(kind==="group"||kind==="pgroup")){ed.newProducts=[]; ed.newName=""}
  $("#lm-scrim").hidden=false; $("#lm-drawer").hidden=false; drawDrawer();
  setTimeout(()=>{const f=$("#drawer .in"); if(f&&kind!=="test") f.focus()},30);
}
function closeDrawer(){$("#lm-scrim").hidden=true; $("#lm-drawer").hidden=true; ed=null; edKind=null}
function errorsFor(){
  const e=[];
  if(edKind==="group"){
    if(!ed.name.trim()) e.push("Enter a group name.");
    else if(cfg.teams.some(t=>t.id!==ed.id&&t.name.toLowerCase()===ed.name.trim().toLowerCase())) e.push("A group with this name already exists.");
    if(ed.active&&ed.products.length&&!ed.users.length) e.push("Add at least one sales user.");
    if(ed.active&&ed.products.length&&!ed.manager) e.push("Choose a Sales Manager.");
  }
  if(edKind==="person"){
    if(!ed.name.trim()) e.push("Enter a name.");
    else if(cfg.people.some(p=>p.id!==ed.id&&p.name.toLowerCase()===ed.name.trim().toLowerCase())) e.push("This person is already in the team.");
    if(ed.id){const inUse=cfg.teams.filter(t=>(ed.role==="mgr"&&t.users.includes(ed.id))||(ed.role==="user"&&t.manager===ed.id));
      if(inUse.length) e.push(`${ed.name} is still ${ed.role==="mgr"?"a sales user":"the Sales Manager"} in ${inUse.map(t=>t.name).join(", ")}. Change that group first.`)}
  }
  if(edKind==="pgroup"){
    if(!ed.name.trim()) e.push("Enter a group name.");
    else if(cfg.groups.some(g=>g.id!==ed.id&&g.name.toLowerCase()===ed.name.trim().toLowerCase())) e.push("A group with this name already exists.");
    cfg.params.forEach(p=>{if(!(+ed.thr[p.id]>0)) e.push(`Enter the ${p.label} cut-off.`)});
  }
  if(edKind==="params"){if(ed.params.some(p=>!p.label.trim())) e.push("Every parameter needs a name.")}
  if(edKind==="stage"){if(!ed.name.trim()) e.push("Enter the stage name.");
    else if(cfg.priority.stages.some(x=>x.id!==ed.id&&x.name.toLowerCase()===ed.name.trim().toLowerCase())) e.push("This stage already exists.")}
  if(edKind==="prule"){const f=fieldById(ed.field);
    if(!f) e.push("Choose a parameter.");
    else if(f.type==="number"&&!(+ed.value>0)) e.push("Enter an amount for the condition.");
    else if(f.type==="list"&&!(ed.values||[]).length) e.push("Pick at least one value.")}
  if(edKind==="pfields"){if(ed.fields.some(f=>!f.label.trim())) e.push("Every parameter needs a name.");
    if(ed.fields.some(f=>f.type==="list"&&!(f.options||[]).length)) e.push("A list parameter needs at least one option.")}
  return e;
}
function drawDrawer(){
  const d=$("#lm-drawer"); let title="", body="", foot="", del="";
  if(edKind==="group"){
    title=ed.id?"Edit assignment group":"New assignment group";
    const users=cfg.people.filter(p=>p.user&&!ed.users.includes(p.id)), mgrs=cfg.people.filter(p=>p.mgr);
    body=`<div class="f"><label for="e-name">Group name</label><input id="e-name" class="in" data-ed="name" value="${esc(ed.name)}" placeholder="e.g. Liability team"></div>
      <div class="f"><span class="lbl">Status</span><div class="seg"><button type="button" data-active="1" aria-pressed="${ed.active}">Active</button><button type="button" data-active="0" aria-pressed="${!ed.active}">Paused</button></div></div>
      <div class="f"><span class="lbl">Products</span><div class="checks">${[...PRODUCTS,...ed.newProducts].map(([id,n])=>{const o=teamFor(cfg,id); const other=o&&o.id!==ed.id?o.name:"";
        return `<label class="ck"><input type="checkbox" data-prod="${id}"${ed.products.includes(id)?" checked":""}><span>${esc(n)}</span>${other?`<small>in ${esc(other)}</small>`:ed.newProducts.some(p=>p[0]===id)?`<small class="newtag">New</small>`:""}</label>`}).join("")}</div>${newProdRow()}</div>
      <div class="f"><span class="lbl">Sales users (in turn)</span>
        <div class="olist">${ed.users.length?ed.users.map((id,k)=>`<div class="orow"><span class="n">${k+1}</span><span class="nm">${esc(pname(id))}</span>
          <button type="button" class="icon" data-up="${k}" aria-label="Move up"${k?"":" disabled"}>↑</button><button type="button" class="icon" data-down="${k}" aria-label="Move down"${k<ed.users.length-1?"":" disabled"}>↓</button><button type="button" class="icon" data-rm="${k}" aria-label="Remove ${esc(pname(id))}">✕</button></div>`).join(""):`<div class="empty">No sales users yet</div>`}</div>
        ${users.length?`<div class="addrow"><select id="e-adduser" class="in"><option value="">Choose a sales user</option>${users.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select><button type="button" class="btn" data-adduser>Add</button></div>`:""}</div>
      <div class="f"><label for="e-mgr">Sales Manager</label><select id="e-mgr" class="in" data-ed="manager"><option value="">Choose</option>${mgrs.map(p=>`<option value="${p.id}"${p.id===ed.manager?" selected":""}>${esc(p.name)}</option>`).join("")}</select></div>`;
    if(ed.id) del="Delete group";
  }
  if(edKind==="person"){
    title=ed.id?"Edit person":"Add person";
    body=(ed.id?`<div class="f"><label for="e-name">Name</label><input id="e-name" class="in" value="${esc(ed.name)}" disabled></div>`:`<div class="f"><label for="e-name">Person</label><select id="e-name" class="in" data-ed="name"><option value="">Choose a sales person</option>${S.data.users.filter(u=>u.fn==="sales"&&u.active!==0&&!cfg.people.some(p=>p.id===u.id)).map(u=>`<option${ed.name===u.n?" selected":""}>${esc(u.n)}</option>`).join("")}</select><p class="muted" style="margin:6px 0 0">People are added in Masters → Users.</p></div>`)+`
      <div class="f"><span class="lbl">Role</span><div class="seg">${Object.entries(ROLE_LBL).map(([k,l])=>`<button type="button" data-role="${k}" aria-pressed="${ed.role===k}">${l}</button>`).join("")}</div></div>`;
    if(ed.id){const used=cfg.teams.filter(t=>t.users.includes(ed.id)||t.manager===ed.id), owns=S.data.lines.some(l=>l.owner===ed.id); if(!used.length&&!owns) del="Remove person"; else if(!used.length) body+=`<p class="muted" style="margin:0">Owns opportunities in BimaSetu, so stays in the team. Take them out of every group to stop new leads.</p>`;
      else body+=`<p class="muted" style="margin:0">In ${used.map(t=>esc(t.name)).join(", ")}. Remove them from ${used.length>1?"those groups":"that group"} before deleting.</p>`}
  }
  if(edKind==="pgroup"){
    title=ed.id?"Edit product group":"New product group";
    body=`<div class="f"><label for="e-name">Group name</label><input id="e-name" class="in" data-ed="name" value="${esc(ed.name)}" placeholder="e.g. Engineering"></div>
      <div class="f"><span class="lbl">Products</span><div class="checks">${[...PRODUCTS,...ed.newProducts].map(([id,n])=>{const o=cfg.groupOf[id]; const other=o&&o!==ed.id?gname(o):"";
        return `<label class="ck"><input type="checkbox" data-prod="${id}"${ed.products.includes(id)?" checked":""}><span>${esc(n)}</span>${other?`<small>in ${esc(other)}</small>`:ed.newProducts.some(p=>p[0]===id)?`<small class="newtag">New</small>`:""}</label>`}).join("")}</div>${newProdRow()}</div>
      <div class="f"><span class="lbl">Cut-offs (₹)</span>${cfg.params.map(p=>`<div class="cutrow"><label class="t" for="e-thr-${p.id}">${esc(p.label)}</label>
        <input id="e-thr-${p.id}" class="in num" type="number" min="0" step="any" data-thr="${p.id}" value="${ed.thr[p.id]??""}" placeholder="Amount in rupees">
        <div class="sum" id="sum-${p.id}">${cutSummary(ed.thr[p.id])}</div></div>`).join("")}</div>`;
    if(ed.id) del="Delete group";
  }
  if(edKind==="rules"){
    title="Who gets the lead";
    body=`<div class="tw" style="border:1px solid var(--line);border-radius:10px"><table><thead><tr>${cfg.params.map(p=>`<th>${esc(p.label)}</th>`).join("")}<th>Assigned to</th></tr></thead><tbody>
      ${combos(cfg.params).map(c=>{const k=ckey(c); return `<tr>${c.map(([,lv])=>`<td><span class="lv ${HL(lv)}">${HL(lv)}</span></td>`).join("")}<td><select class="in" data-rule="${k}" aria-label="Assigned to">${Object.entries(OUTCOME_OPTS).map(([v,l])=>`<option value="${v}"${(ed[k]||"rr")===v?" selected":""}>${l}</option>`).join("")}</select></td></tr>`}).join("")}</tbody></table></div>`;
  }
  if(edKind==="params"){
    title="Parameters";
    body=`<div class="f"><span class="lbl">Values the customer gives</span>${ed.params.map((p,i)=>`<div class="prow"><input class="in" data-plabel="${i}" value="${esc(p.label)}" aria-label="Parameter name">${ed.params.length>1?`<button type="button" class="icon" data-prm="${i}" aria-label="Remove ${esc(p.label)}">✕</button>`:""}</div>`).join("")}</div>
      <div class="f"><label for="e-newp">Add a parameter</label><div class="addrow"><input id="e-newp" class="in" placeholder="e.g. Employee count" value="${esc(ed.add)}"><button type="button" class="btn" data-padd>Add</button></div></div>`;
  }
  if(edKind==="stage"){
    title=ed.id?"Edit drop-off stage":"Add drop-off stage";
    const others=cfg.priority.stages.filter(x=>x.id!==ed.id);
    body=`<div class="f"><label for="e-name">Stage name</label><input id="e-name" class="in" data-ed="name" value="${esc(ed.name)}" placeholder="e.g. Proposal form opened"></div>
      <div class="f"><span class="lbl">Priority</span><div class="seg pseg">${PRIO.map((l,i)=>`<button type="button" data-pset="${i}" aria-pressed="${ed.p===i}">${l}</button>`).join("")}</div></div>
      <div class="f"><label for="e-after">Position in the journey</label><select id="e-after" class="in" data-ed="after"><option value="">First stage</option>${others.map((x,i)=>`<option value="${x.id}"${ed.after===x.id?" selected":""}>After ${i+1}. ${esc(x.name)}</option>`).join("")}</select></div>`;
    if(ed.id) del="Delete stage";
  }
  if(edKind==="prule"){
    title=ed.id?"Edit rule":"New rule";
    const F=allFields(), f=fieldById(ed.field)||F[0];
    if(f&&!OPS[f.type][ed.op]) ed.op=Object.keys(OPS[f.type])[0];
    body=`<div class="f"><label for="e-field">If</label><select id="e-field" class="in" data-rfield>${F.map(x=>`<option value="${x.id}"${x.id===ed.field?" selected":""}>${esc(x.label)}</option>`).join("")}</select></div>
      <div class="f"><label for="e-op">Condition</label><select id="e-op" class="in" data-ed="op">${Object.entries(OPS[f.type]).map(([k,l])=>`<option value="${k}"${k===ed.op?" selected":""}>${l}</option>`).join("")}</select></div>
      ${f.type==="number"?`<div class="f"><label for="e-val">Amount</label><input id="e-val" class="in num" type="number" min="0" step="any" data-rval value="${esc(ed.value)}" placeholder="Amount"><div class="words" id="e-valw">${esc(inWords(ed.value))}</div></div>`
        :`<div class="f"><span class="lbl">Values</span><div class="checks">${f.options.map(([v,l])=>`<label class="ck"><input type="checkbox" data-rv="${esc(v)}"${(ed.values||[]).includes(v)?" checked":""}><span>${esc(l)}</span></label>`).join("")}</div></div>`}
      <div class="f"><span class="lbl">Then</span><div class="seg">${[["atleast","Make it at least"],["raise","Raise by one level"]].map(([k,l])=>`<button type="button" data-eff="${k}" aria-pressed="${ed.effect===k}">${l}</button>`).join("")}</div>
        ${ed.effect==="atleast"?`<div class="seg pseg">${PRIO.map((l,i)=>`<button type="button" data-tgt="${i}" aria-pressed="${ed.target===i}">${l}</button>`).join("")}</div>`:""}</div>
      <div class="f"><span class="lbl">Status</span><div class="seg"><button type="button" data-active="1" aria-pressed="${ed.active}">Active</button><button type="button" data-active="0" aria-pressed="${!ed.active}">Paused</button></div></div>`;
    if(ed.id) del="Delete rule";
  }
  if(edKind==="pfields"){
    title="Priority parameters";
    const used=id=>cfg.priority.rules.some(r=>r.field===id);
    body=`<div class="f"><span class="lbl">Already available</span><div class="muted">${allFields().filter(f=>!f.custom).map(f=>esc(f.label)).join(", ")}</div></div>
      <div class="f"><span class="lbl">Your parameters</span>${ed.fields.length?`<div class="olist">${ed.fields.map((f,i)=>`<div class="orow"><span class="nm">${esc(f.label)} <span class="muted" style="font-weight:500">· ${f.type==="number"?"Number":"List: "+esc((f.options||[]).join(", "))}</span></span>${used(f.id)?`<span class="muted" style="font-size:12px">Used in a rule</span>`:`<button type="button" class="icon" data-frm="${i}" aria-label="Remove ${esc(f.label)}">✕</button>`}</div>`).join("")}</div>`:`<div class="empty" style="padding:0">None yet</div>`}</div>
      <div class="f"><span class="lbl">Add a parameter</span>
        <input id="e-fname" class="in" placeholder="Name, e.g. Lead source" value="${esc(ed.nl)}">
        <div class="seg">${[["number","Number"],["list","List of options"]].map(([k,l])=>`<button type="button" data-ftype="${k}" aria-pressed="${ed.nt===k}">${l}</button>`).join("")}</div>
        ${ed.nt==="list"?`<input id="e-fopts" class="in" placeholder="Options, separated by commas" value="${esc(ed.no)}">`:""}
        <div><button type="button" class="btn" data-fadd>Add parameter</button></div></div>`;
  }
  if(edKind==="test"){
    title="Test a lead";
    const prioMode=page==="prio"; title=prioMode?"Test priority":"Test a lead";
    body=`${prioMode?`<div class="f"><label for="t-stage">Dropped at stage</label><select id="t-stage" class="in" data-lsim="stage"><option value="">Not a website drop-off</option>${cfg.priority.stages.map(x=>`<option value="${x.id}"${simVals.stage===x.id?" selected":""}>${esc(x.name)}</option>`).join("")}</select></div>`:""}
      <div class="f"><label for="t-prod">Product</label><select id="t-prod" class="in" data-lsim="prod">${PRODUCTS.map(([id,n])=>`<option value="${id}"${simVals.prod===id?" selected":""}>${esc(n)}</option>`).join("")}</select></div>
      ${SHOW_GEO&&!prioMode?`<div class="f"><label for="t-state">State</label><select id="t-state" class="in" data-lsim="state"><option value="">Not given</option>${STATES.map(s=>`<option${simVals.state===s?" selected":""}>${esc(s)}</option>`).join("")}</select></div>`:""}
      <div class="two">${cfg.params.map(p=>`<div class="f"><label for="t-${p.id}">${esc(p.label)}</label><input id="t-${p.id}" class="in num" data-lsim="${p.id}" inputmode="decimal" placeholder="Not given" value="${esc(simVals[p.id]??"")}"><div class="words" id="tw-${p.id}">${esc(inWords(simVals[p.id]))}</div></div>`).join("")}
      ${!prioMode?"":cfg.priority.fields.map(f=>f.type==="number"?`<div class="f"><label for="t-${f.id}">${esc(f.label)}</label><input id="t-${f.id}" class="in num" data-lsim="${f.id}" inputmode="decimal" placeholder="Not given" value="${esc(simVals[f.id]??"")}"><div class="words" id="tw-${f.id}">${esc(inWords(simVals[f.id]))}</div></div>`
        :`<div class="f"><label for="t-${f.id}">${esc(f.label)}</label><select id="t-${f.id}" class="in" data-lsim="${f.id}"><option value="">Not given</option>${(f.options||[]).map(o=>`<option${simVals[f.id]===o?" selected":""}>${esc(o)}</option>`).join("")}</select></div>`).join("")}</div>
      <div id="t-res"></div>`;
  }
  foot=edKind==="test"
    ?(page==="prio"?`<span class="sp"></span><button class="btn" type="button" data-close>Close</button>`:`<button class="btn" type="button" data-resetrr>Reset rotation</button><span class="sp"></span><button class="btn" type="button" data-close>Close</button><button class="btn cta" type="button" data-run>Assign test lead</button>`)
    :`${del?`<button class="btn danger${armed?" armed":""}" type="button" data-del>${armed?"Click again to confirm":del}</button>`:""}<span class="sp"></span><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-save>Save</button>`;
  d.innerHTML=`<div class="dh"><h2 id="dtitle">${title}</h2><button class="icon" type="button" data-close aria-label="Close">✕</button></div>
    <div class="db">${body}</div><div class="derr" id="derr" hidden></div><div class="df">${foot}</div>`;
  if(edKind==="test") runTest(false);
}
function newProdRow(){return `<div class="addrow"><input id="e-newprod" class="in" placeholder="New product name" value="${esc(ed.newName||"")}"><button type="button" class="btn" data-newprod>Add product</button></div>`}
function cutSummary(v){return +v>0?`<span class="lv Low">Low</span> below <b>${esc(inWords(v))}</b> <span class="lv High">High</span> ${esc(short(v))} and above`:`<span class="muted">Enter an amount</span>`}
function runTest(commit){
  const box=$("#t-res"); if(!box) return;
  if(page==="prio"){
    const pr=priorityOf(simVals);
    box.innerHTML=pr.none?`<div class="res"><div class="who"><div class="pbig p-none">—</div><div><div class="nm">No priority</div><div class="rl">Not a website drop-off</div></div></div></div>`
      :`<div class="res" aria-live="polite"><div class="who"><div class="pbig p${pr.p}">${PRIO[pr.p]}</div><div><div class="nm">Priority ${PRIO[pr.p]}</div><div class="rl">${pr.steps.length?`Raised by ${pr.steps.length} rule${pr.steps.length>1?"s":""}`:"From drop-off stage"}</div></div></div>
        <div class="why"><div><span class="k">Drop-off stage</span><span>${esc(pr.stage)} → ${pill(pr.base)}</span></div>${pr.steps.map(s=>`<div><span class="k">Rule</span><span>If ${ruleText(s.r)} → ${pill(s.after)}</span></div>`).join("")}</div></div>`;
    return;
  }
  const r=assign(simVals.prod,simVals,commit);
  if(r.error){box.innerHTML=`<div class="res"><b style="color:var(--err)">${esc(r.error)}</b></div>`;return}
  const why=r.logic===2?`<div><span class="k">Rule</span>Logic 2 · ${esc(r.group)}</div>${cfg.params.map((p,i)=>`<div><span class="k">${esc(p.label)}</span><span class="lv ${HL(r.cls[i][1])}">${HL(r.cls[i][1])}</span></div>`).join("")}`
    :`<div><span class="k">Rule</span>Logic 1 · ${esc(r.reason)}</div>`;
  box.innerHTML=`<div class="res" aria-live="polite"><div class="who">${r.who?`<div class="av">${initials(r.who)}</div><div><div class="nm">${esc(r.who)}</div><div class="rl">${commit?"Assigned · ":""}${esc(r.sub)}</div></div>`
    :`<div class="av none">—</div><div><div class="nm">Unassigned</div><div class="rl">${esc(r.note)}</div></div>`}</div>
    <div class="why">${why}${r.outcome==="mgr_notify"&&r.who?`<div><span class="k"></span><span class="notify">Manager notified</span></div>`:""}${r.loc?`<div><span class="k">Location</span>${esc(r.loc)}</div>`:""}</div></div>`;
}
function saveDrawer(){
  const errs=errorsFor();
  if(errs.length){const el=$("#derr"); if(el){el.hidden=false; el.textContent=errs[0]} return}
  if(ed.newProducts&&ed.newProducts.length){ed.newProducts.forEach(p=>{cfg.products.push(p); if(cfg.groupOf[p[0]]===undefined) cfg.groupOf[p[0]]=""}); syncProducts()}
  const pend=ed.newProducts; delete ed.newProducts; delete ed.newName;
  if(edKind==="group"){
    const t={...ed,name:ed.name.trim()}; if(!t.id) t.id=uid("t_");
    cfg.teams.forEach(o=>{if(o.id!==t.id) o.products=o.products.filter(p=>!t.products.includes(p))});
    const i=cfg.teams.findIndex(o=>o.id===t.id); if(i<0) cfg.teams.push(t); else cfg.teams[i]=t;
  }
  if(edKind==="person"){
    const pick=!ed.id&&S.data.users.find(u=>u.n===ed.name.trim()); const p={id:ed.id||(pick?pick.id:uid("u_")),name:ed.name.trim(),user:ed.role!=="mgr"?1:0,mgr:ed.role!=="user"?1:0,bk:ed.bk||0};
    p.bk=1;
    const i=cfg.people.findIndex(o=>o.id===p.id); if(i<0) cfg.people.push(p); else cfg.people[i]=p;
  }
  if(edKind==="pgroup"){
    const id=ed.id||uid("g_");
    if(!ed.id) cfg.groups.push({id,name:ed.name.trim()}); else cfg.groups.find(g=>g.id===id).name=ed.name.trim();
    PRODUCTS.forEach(([p])=>{if(ed.products.includes(p)) cfg.groupOf[p]=id; else if(cfg.groupOf[p]===id) cfg.groupOf[p]=""});
    cfg.thr[id]=Object.fromEntries(cfg.params.map(p=>[p.id,+ed.thr[p.id]]));
  }
  if(edKind==="rules") cfg.rules=ed;
  if(edKind==="stage"){const S=cfg.priority.stages; const st={id:ed.id||uid("s_"),name:ed.name.trim(),p:ed.p};
    const rest=S.filter(x=>x.id!==st.id); const at=ed.after?rest.findIndex(x=>x.id===ed.after)+1:0; rest.splice(at,0,st); cfg.priority.stages=rest}
  if(edKind==="prule"){const f=fieldById(ed.field), r={id:ed.id||uid("r_"),active:ed.active,field:ed.field,op:ed.op,value:f.type==="number"?+ed.value:"",values:f.type==="list"?ed.values:[],effect:ed.effect,target:ed.target};
    const R=cfg.priority.rules, i=R.findIndex(x=>x.id===r.id); if(i<0) R.push(r); else R[i]=r}
  if(edKind==="pfields") cfg.priority.fields=ed.fields.map(f=>({id:f.id,label:f.label.trim(),type:f.type,options:f.options||[]}));
  if(edKind==="params"){
    const keep=ed.params.filter(p=>!p.isNew), removed=cfg.params.filter(p=>!keep.some(k=>k.id===p.id));
    let rules=cfg.rules;
    removed.forEach(rp=>{const old=cfg.params, rest=old.filter(p=>p.id!==rp.id), nr={};
      combos(rest).forEach(c=>{const full=old.map(p=>p.id===rp.id?[rp.id,"L"]:c.find(x=>x[0]===p.id)); nr[ckey(c)]=rules[ckey(full)]||"rr"});
      rules=nr; cfg.params=rest; Object.values(cfg.thr).forEach(t=>delete t[rp.id])});
    ed.params.filter(p=>p.isNew).forEach(np=>{const nr={}; Object.entries(rules).forEach(([k,v])=>{nr[k+"|"+np.id+":L"]=v; nr[k+"|"+np.id+":H"]=v}); rules=nr; Object.values(cfg.thr).forEach(t=>t[np.id]="")});
    cfg.params=ed.params.map(p=>({id:p.id,label:p.label.trim()})); cfg.rules=rules;
  }
  persist(); closeDrawer(); renderAll(); toast("Saved");
}
function deleteFromDrawer(){
  if(!armed){armed=true; drawDrawer(); return}
  if(edKind==="group") cfg.teams=cfg.teams.filter(t=>t.id!==ed.id);
  if(edKind==="person"){ cfg.people=cfg.people.filter(p=>p.id!==ed.id);  }
  if(edKind==="stage"){cfg.priority.stages=cfg.priority.stages.filter(x=>x.id!==ed.id); if(simVals.stage===ed.id) simVals.stage=""}
  if(edKind==="prule") cfg.priority.rules=cfg.priority.rules.filter(x=>x.id!==ed.id);
  if(edKind==="pgroup"){cfg.groups=cfg.groups.filter(g=>g.id!==ed.id); delete cfg.thr[ed.id]; PRODUCTS.forEach(([p])=>{if(cfg.groupOf[p]===ed.id) cfg.groupOf[p]=""})}
  persist(); closeDrawer(); renderAll(); toast("Deleted");
}

/* ---------- events ---------- */
on("click","#lm-tabs",e=>{const t=e.target.closest(".tab"); if(t){tab=t.dataset.tab; renderAll()}});
on("click","#lm-pane",e=>{const b=e.target.closest("[data-edit]"); if(b&&isAdmin()) openDrawer(b.dataset.edit,b.dataset.id)});
on("click","#lm-open-test",()=>openDrawer("test"));
on("click","#lm-mnav",e=>{const b=e.target.closest("[data-page]"); if(b) go(b.dataset.page==="prio"?"leadprio":"leadassign");});
on("click","#lm-scrim",closeDrawer);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&edKind&&$("#lm-drawer")){ e.stopPropagation(); closeDrawer(); }},true);

on("click","#lm-drawer",e=>{
  const t=e.target, q=s=>t.closest(s);
  if(q("[data-close]")) return closeDrawer();
  if(q("[data-save]")) return saveDrawer();
  if(q("[data-del]")) return deleteFromDrawer();
  if(q("[data-run]")){runTest(true); persist(); renderPane(); return}
  if(q("[data-resetrr]")){for(const k in rr) delete rr[k]; persist(); runTest(false); renderPane(); toast("Rotation reset"); return}
  let b;
  if(b=q("[data-active]")){ed.active=b.dataset.active==="1"; return drawDrawer()}
  if(b=q("[data-role]")){ed.role=b.dataset.role; return drawDrawer()}
  if(b=q("[data-up]")){const k=+b.dataset.up; [ed.users[k-1],ed.users[k]]=[ed.users[k],ed.users[k-1]]; return drawDrawer()}
  if(b=q("[data-down]")){const k=+b.dataset.down; [ed.users[k+1],ed.users[k]]=[ed.users[k],ed.users[k+1]]; return drawDrawer()}
  if(b=q("[data-rm]")){ed.users.splice(+b.dataset.rm,1); return drawDrawer()}
  if(q("[data-adduser]")){const v=$("#e-adduser").value; if(v){ed.users.push(v); drawDrawer()} return}
  if(b=q("[data-pset]")){ed.p=+b.dataset.pset; return drawDrawer()}
  if(b=q("[data-tgt]")){ed.target=+b.dataset.tgt; return drawDrawer()}
  if(b=q("[data-eff]")){ed.effect=b.dataset.eff; return drawDrawer()}
  if(b=q("[data-ftype]")){ed.nt=b.dataset.ftype; return drawDrawer()}
  if(b=q("[data-frm]")){ed.fields.splice(+b.dataset.frm,1); return drawDrawer()}
  if(q("[data-fadd]")){const n=ed.nl.trim(), er=$("#derr"); if(!n) return;
    if(allFields().some(f=>f.label.toLowerCase()===n.toLowerCase())||ed.fields.some(f=>f.label.toLowerCase()===n.toLowerCase())){er.hidden=false; er.textContent=n+" already exists."; return}
    const opts=ed.no.split(",").map(x=>x.trim()).filter(Boolean);
    if(ed.nt==="list"&&!opts.length){er.hidden=false; er.textContent="Add at least one option, separated by commas."; return}
    ed.fields.push({id:uid("f_"),label:n,type:ed.nt,options:ed.nt==="list"?opts:[]}); ed.nl=""; ed.no=""; return drawDrawer()}
  if(b=q("[data-prm]")){ed.params.splice(+b.dataset.prm,1); return drawDrawer()}
  if(q("[data-newprod]")){const v=$("#e-newprod").value.trim(); if(!v) return;
    if([...PRODUCTS,...ed.newProducts].some(([,n])=>n.toLowerCase()===v.toLowerCase())){const er=$("#derr"); er.hidden=false; er.textContent=v+" already exists."; return}
    const id=uid("pr_"); ed.newProducts.push([id,v]); ed.products.push(id); ed.newName=""; return drawDrawer()}
  if(q("[data-padd]")){const v=$("#e-newp").value.trim(); if(!v) return; ed.params.push({id:uid("p_"),label:v,isNew:true}); ed.add=""; return drawDrawer()}
});
on("input","#lm-drawer",e=>{
  const el=e.target, d=el.dataset;
  if(d.ed) ed[d.ed]=el.value;
  else if(d.thr!==undefined){ed.thr[d.thr]=el.value; const s=$("#sum-"+d.thr); if(s) s.innerHTML=cutSummary(el.value)}
  else if(d.plabel!==undefined) ed.params[+d.plabel].label=el.value;
  else if(d.lsim){simVals[d.lsim]=el.value; const w=$("#tw-"+d.lsim); if(w) w.textContent=inWords(el.value); runTest(false)}
  else if(el.id==="e-newp") ed.add=el.value;
  else if(el.id==="e-newprod") ed.newName=el.value;
  else if(el.id==="e-fname") ed.nl=el.value;
  else if(el.id==="e-fopts") ed.no=el.value;
  else if(d.rval!==undefined){ed.value=el.value; const w=$("#e-valw"); if(w) w.textContent=inWords(el.value)}
  const er=$("#derr"); if(er) er.hidden=true;
});
on("change","#lm-drawer",e=>{
  const el=e.target, d=el.dataset;
  if(d.prod){if(el.checked) ed.products.push(d.prod); else ed.products=ed.products.filter(p=>p!==d.prod)}
  else if(d.rule) ed[d.rule]=el.value;
  else if(d.ed==="manager") ed.manager=el.value;
  else if(d.ed==="op"||d.ed==="after") ed[d.ed]=el.value;
  else if(d.rfield!==undefined){ed.field=el.value; ed.values=[]; ed.value=""; ed.op=""; drawDrawer()}
  else if(d.rv!==undefined){ed.values=ed.values||[]; if(el.checked) ed.values.push(d.rv); else ed.values=ed.values.filter(v=>v!==d.rv)}
  else if(d.lsim){simVals[d.lsim]=el.value; runTest(false)}
});
on("keydown","#lm-drawer",e=>{const D=$("#lm-drawer"); if(e.key==="Enter"&&e.target.id==="e-newp"){e.preventDefault(); D.querySelector("[data-padd]").click()}
  if(e.key==="Enter"&&e.target.id==="e-newprod"){e.preventDefault(); D.querySelector("[data-newprod]").click()}});
function toast(m){ window.toast(m,''); }

function on(type,sel,fn){ document.addEventListener(type,e=>{ const t=e.target; if(!(t instanceof Element)) return; if(!t.closest(sel)) return; if(type!=="keydown") e.stopPropagation(); fn(e); },true); }
function opensAt(name){ const m=WEB_DROP_MAP[name]; if(!m||m.st===1) return "New Lead"; if(m.st===3) return "Details Captured"+(m.non?" · Non-DUA":""); if(m.us) return "KYC Details Requested · documents to verify"; return "Purchase Requested (verified) · KYC Details Requested (provisional)"; }
/* the live map BimaSetu reads (WEB_PRIO) follows the master */
function syncLive(){ if(!cfg) return; Object.keys(WEB_PRIO).forEach(k=>delete WEB_PRIO[k]); cfg.priority.stages.forEach(s=>WEB_PRIO[s.name]=PRIO[s.p]); }
function mount(pg){ init(); if(!cfg) return; page=pg; if(pg==="prio") tab="groups"; renderAll(); if(edKind) drawDrawer(); }
window.LM={
  init, mount, syncLive,
  html:pg=>`<div class="lmx" id="lm-wrap"><nav class="masters" aria-label="Masters"><div class="mnav" id="lm-mnav"></div></nav>
    <div class="head"><h1 id="lm-ptitle"></h1><div class="acts"><span id="lm-viewonly" class="viewonly" hidden>View only</span><button class="btn cta" id="lm-open-test" type="button">Test</button></div></div>
    <div class="tabs" role="tablist" id="lm-tabs"></div><div class="stack" id="lm-pane"></div>
    <div class="scrim" id="lm-scrim"${edKind?"":" hidden"}></div><aside class="drawer" id="lm-drawer" role="dialog" aria-modal="true" aria-labelledby="dtitle"${edKind?"":" hidden"}></aside></div>`,
  /* live routing for a website lead: Logic 1 group round robin, Logic 2 value rules when both values are given */
  pick(product,vals){ init(); if(!cfg) return null; const v={}; cfg.params.forEach(p=>{ v[p.id]=vals&&vals[p.id]!=null&&vals[p.id]!==""?String(vals[p.id]):""; });
    const r=assign(product,v,true); if(!r||r.error||!r.whoId) return {none:true,note:r?(r.error||r.note):""}; persist(); return r; },
  priority(l){ init(); if(!cfg) return ""; const st=cfg.priority.stages.find(s=>s.name===l.drop); if(!st) return "";
    const pr=priorityOf({stage:st.id,prod:l.product,si:lmNum((l.req||{}).si),rev:lmNum((l.req||{}).to)}); return pr.none?"":PRIO[pr.p]; }
};

/* ---- BimaSetu glue: the Lead Masters screens and the live hooks ---- */
SCREENS.leadassign=function(){ return {sc:'Lead assignment', html:'<div class="crumbs"><button data-go="masters">Masters</button><span>/</span><span>Lead assignment</span></div>'+LM.html('assign')}; };
SCREENS.leadprio=function(){ return {sc:'Lead prioritisation', html:'<div class="crumbs"><button data-go="masters">Masters</button><span>/</span><span>Lead prioritisation</span></div>'+LM.html('prio')}; };
var _lmSynced=null;
paint=(function(p0){ return function(){
  try{ if(S.data&&(!S.data.lm||S.data.lm!==_lmSynced)){ LM.init(); LM.syncLive(); _lmSynced=S.data.lm; } }catch(e){ console.error(e); }
  var r=p0.apply(this,arguments);
  try{ if(S.route&&(S.route.v==='leadassign'||S.route.v==='leadprio')&&document.getElementById('lm-wrap')) LM.mount(S.route.v==='leadprio'?'prio':'assign'); }catch(e){ console.error(e); }
  /* [stated 27 Oct] no New opportunity on masters and configuration screens */
  try{ if(S.route&&CFG_ROUTES.indexOf(S.route.v)>=0){ var nb=document.querySelector('.topbar .rt > [data-flow="newOpp"]'); if(nb) nb.remove(); } }catch(e){}
  return r; }; })(paint);
var CFG_ROUTES=['masterusers','masters','leadassign','leadprio','rmalloc','qmaster','masterabm','rule','rules','rulesim','rulecfg','abrules','abprules'];
/* the inbound enquiry's sum insured and turnover feed Logic 2 */
var _lmVals=null;
runInbound=(function(r0){ return function(k){ _lmVals=k&&k.req?{si:lmNum(k.req.si),rev:lmNum(k.req.to)}:{}; try{ return r0.apply(this,arguments); } finally { _lmVals=null; } }; })(runInbound);
assignPick=(function(a0){ return function(product){
  var r=null; try{ r=LM.pick(product,_lmVals||{}); }catch(e){ console.error(e); }
  if(r&&r.whoId&&userById(r.whoId)&&userById(r.whoId).active!==0) return {u:r.whoId,how:'Lead assignment master · '+(r.logic===2?'Logic 2 · '+(r.group||'value rule'):'round robin in '+(r.team||'the product’s group'))};
  var fb=fbUser('sales'); if(fb) return {u:fb,how:'Lead assignment found nobody for '+product+' — the Sales fallback user'}; return a0(product); }; })(assignPick);
webPrio=function(l){ if(!webLead(l)) return ''; var p=''; try{ p=LM.priority(l); }catch(e){} return p||WEB_PRIO[l.drop]||''; };

})();

/* ==== RM allocation (v75.21) ==== */
