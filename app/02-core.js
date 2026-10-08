/* ==================================================================== *
 *  BimaSetu CRM — clickable prototype
 *  Vanilla JS, single file. Kit rules: derive, never store, what two
 *  places could disagree about; amber dashed = simulated inbound event;
 *  dotted grey = prototype time control; one primary action per screen.
 * ==================================================================== */

/* ---------- icons (lucide-style, 24 grid, stroke) ---------- */
var ICONS={
 home:'<path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
 list:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>',
 building:'<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>',
 check:'<path d="M20 6L9 17l-5-5"/>',
 checks:'<path d="M3 7l2 2 4-4M3 15l2 2 4-4M13 6h8M13 14h8"/>',
 x:'<path d="M18 6L6 18M6 6l12 12"/>',
 chevdown:'<path d="M6 9l6 6 6-6"/>',
 chevright:'<path d="M9 6l6 6-6 6"/>',
 chevleft:'<path d="M15 6l-6 6 6 6"/>',
 arrowright:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 arrowleft:'<path d="M19 12H5M11 18l-6-6 6-6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
 zap:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
 alert:'<path d="M7.9 3h8.2l4.9 4.9v8.2L16.1 21H7.9L3 16.1V7.9z"/><path d="M12 8v5M12 16h.01"/>',
 refresh:'<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
 send:'<path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4z"/>',
 upload:'<path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/>',
 inbox:'<path d="M3 13l2.5-8h13L21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 13h5l2 3h4l2-3h5"/>',
 circlecheck:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
 more:'<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
 panel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
 logout:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M13 3h6v18h-6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 filter:'<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
 phoneoff:'<path d="M10.7 13.3a16 16 0 0 0 4.6 3.4l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2v2.2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-3.9-3.4M6.5 6.5A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9"/><path d="M2 2l20 20"/>',
 phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z"/>',
 users:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7"/>',
 ticket:'<path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M13 5v14"/>',
 wifi:'<path d="M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0M12 20h.01"/>',
 wifioff:'<path d="M2 9a15 15 0 0 1 4.5-3M9 16a5 5 0 0 1 6 0M12 20h.01M22 9a15 15 0 0 0-11.3-4M5.5 12.5A10 10 0 0 1 8 11M18.5 12.5a10 10 0 0 0-5-2.4M2 2l20 20"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 shield:'<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/>',
 lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
 wallet:'<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M4 5v14a2 2 0 0 0 2 2h14V7"/><path d="M16 14h4"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 handshake:'<path d="M11 17l-1-1M13 19l-1-1M15 17l-1-1"/><path d="M2 8l4-4 5 1 3-1 4 4 4 1-3 3-2 2-2 2-2 2-3-3-4-1-2-2z"/>',
 sparkles:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z"/>'
};
function ic(n,cls){ return '<svg class="'+(cls||'ic16')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICONS[n]||'')+'</svg>'; }

/* ---------- helpers ---------- */
function esc(x){ return String(x==null?'':x).replace(/[&<>"]/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];}); }
function INR(n){ n=+n||0; return '₹'+n.toLocaleString('en-IN'); }
function CR(n){ n=+n||0; if(n>=10000000) return '₹'+(n/10000000).toFixed(2)+' Cr'; if(n>=100000) return '₹'+(n/100000).toFixed(1)+' L'; return '₹'+Math.round(n/1000)+'K'; }
function initials(n){ return String(n||'').split(' ').map(function(p){return p[0];}).join('').slice(0,2).toUpperCase(); }
function by(arr,id){ for(var i=0;i<arr.length;i++) if(arr[i].id===id) return arr[i]; return null; }
function uid(prefix,list){ var mx=0; list.forEach(function(x){ var m=String(x.id).match(/(\d+)$/); if(m) mx=Math.max(mx,+m[1]); }); return prefix+(mx+1); }
function plural(n,w){ return n+' '+w+(n===1?'':'s'); }

/* ---------- time: a fixed prototype clock ---------- */
var T0=new Date(2026,8,21,11,0,0,0);              /* Mon 21 Sep 2026, 11:00 — the seed "now" */
function at(y,mo,d,h,mi){ return new Date(y,mo-1,d,h||0,mi||0,0,0).getTime(); }
function ago(days,hours){ return T0.getTime()-((days||0)*24+(hours||0))*3600000; }
function NOW(){ return new Date(S.now); }
var DAYN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MONN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function sameDay(a,b){ a=new Date(a); b=new Date(b); return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
function fmtD(t){ var d=new Date(t); return d.getDate()+' '+MONN[d.getMonth()]+' '+d.getFullYear(); }
function fmtDs(t){ var d=new Date(t); return d.getDate()+' '+MONN[d.getMonth()]; }
function fmtT(t){ var d=new Date(t); return (d.getHours()<10?'0':'')+d.getHours()+':'+(d.getMinutes()<10?'0':'')+d.getMinutes(); }
function fmt(t){ var d=new Date(t), n=NOW(), y=new Date(n.getTime()-86400000), tm=new Date(n.getTime()+86400000);
  if(sameDay(d,n)) return 'today, '+fmtT(t); if(sameDay(d,y)) return 'yesterday, '+fmtT(t); if(sameDay(d,tm)) return 'tomorrow, '+fmtT(t);
  return DAYN[d.getDay()]+' '+d.getDate()+' '+MONN[d.getMonth()]+', '+fmtT(t); }
function daysBetween(a,b){ return Math.floor((b-a)/86400000); }
function daysAgo(t){ return daysBetween(t,S.now); }
function agoTx(t){ var d=daysAgo(t); if(d<=0){ var h=Math.floor((S.now-t)/3600000); return h<=0?'just now':h+' h ago'; } return d===1?'1 day ago':d+' days ago'; }

/* working calendar: Mon–Fri 10:00–19:00, company holidays out */
var WH={start:10,end:19};
/* [stated 26 Sep · 19.1] the supplied 2026 company holiday list */
var HOL=['2026-01-01','2026-01-14','2026-01-26','2026-03-04','2026-03-31','2026-05-28','2026-09-14','2026-10-02','2026-10-20','2026-11-09','2026-12-25'];
function ymd(d){ d=new Date(d); var m=d.getMonth()+1,q=d.getDate(); return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(q<10?'0':'')+q; }
function dtLocal(t){ var d=new Date(t), p=function(n){return (n<10?'0':'')+n;}; return ymd(d)+'T'+p(d.getHours())+':'+p(d.getMinutes()); }   /* for <input type="datetime-local"> */
function isWorkDay(d){ d=new Date(d); var g=d.getDay(); if(g===0||g===6) return false; return HOL.indexOf(ymd(d))<0; }
function atH(d,h){ var y=new Date(d); y.setHours(h,0,0,0); return y; }
function addWork(start,mins){
  var d=new Date(start), guard=0;
  while(mins>0 && guard++<5000){
    if(!isWorkDay(d)){ d.setDate(d.getDate()+1); d=atH(d,WH.start); continue; }
    if(d<atH(d,WH.start)) d=atH(d,WH.start);
    if(d>=atH(d,WH.end)){ d.setDate(d.getDate()+1); d=atH(d,WH.start); continue; }
    var avail=(atH(d,WH.end)-d)/60000;
    if(avail>=mins){ d=new Date(d.getTime()+mins*60000); mins=0; }
    else { mins-=avail; d.setDate(d.getDate()+1); d=atH(d,WH.start); }
  }
  return d.getTime();
}
function workMins(a,b){ /* working minutes from a to b */
  if(b<=a) return 0; var d=new Date(a), tot=0, guard=0;
  while(d.getTime()<b && guard++<5000){
    var s=atH(d,WH.start), e=atH(d,WH.end);
    if(isWorkDay(d)){ var from=Math.max(d.getTime(),s.getTime()), to=Math.min(b,e.getTime()); if(to>from) tot+=(to-from)/60000; }
    d.setDate(d.getDate()+1); d=atH(d,0);
  }
  return Math.round(tot);
}
function whTx(mins){ var h=Math.round(mins/60); if(h<1) return mins+' working min'; if(h<9) return h+' working h'; var d=(h/9); return (Math.round(d*10)/10)+' working d'; }
function workDate(t){ var d=new Date(t); if(!isWorkDay(d) || d>=atH(d,WH.end)){ do{ d.setDate(d.getDate()+1); }while(!isWorkDay(d)); return atH(d,WH.start).getTime(); } return t; }
function durMins(n,u){ return u==='h' ? n*60 : n*(WH.end-WH.start)*60; }
function durTx(n,u){ return n+' working '+(u==='h'?(n==1?'hour':'hours'):(n==1?'day':'days')); }

/* ---------- state ---------- */
var KEY='bksales.v16';
var S={user:null, now:T0.getTime(), route:{v:'signin'}, hist:[], data:null, flow:null, sel:{}, ui:{}, offline:false, pending:null, side:false};
function save(){ try{ localStorage.setItem(KEY, JSON.stringify({user:S.user, now:S.now, data:S.data, route:S.route})); }catch(e){} }
function load(){ try{ var raw=localStorage.getItem(KEY); if(!raw) return false; var o=JSON.parse(raw); if(!o||!o.data||!o.data.lines) return false; S.user=o.user; S.now=o.now||T0.getTime(); S.data=o.data; S.route=o.route&&o.route.v!=='signin'?o.route:{v:'home'}; return true; }catch(e){ return false; } }
function reset(){ try{ localStorage.removeItem(KEY); }catch(e){} S.data=seedFill(seed()); S.now=T0.getTime(); applyCfg(); renSweep(false); primeRules(); S.hist=[]; S.route={v:'home'}; S.flow=null; S.sel={}; S.ui={}; S.offline=false; save(); paint(); toast('Reset to seed','Every record, task and the clock are back where they started.'); }
function me(){ return S.user ? by(S.data.users,S.user) : null; }
function isRole(r){ var u=me(); return !!u && u.role===r; }

/* ---------- writes, and the offline simulation ---------- */
function write(fn,label){
  if(S.offline){ S.pending={fn:fn,label:label||'that change',sel:JSON.parse(JSON.stringify(S.sel||{})),route:S.route}; toast('Couldn’t save','You’re offline. Nothing was changed. Reconnect and retry '+(label||'it')+'.',{red:1,act:'Retry',on:'retry'}); return false; }
  fn(); save(); return true;
}
function retry(){ if(S.offline){ toast('Still offline','Reconnect from the sidebar first.',{red:1}); return; } var p=S.pending; S.pending=null; if(p){ var keepSel=S.sel, keepRoute=S.route; S.sel=p.sel; S.route=p.route; try{ p.fn(); } finally { S.sel=keepSel; S.route=keepRoute; } save(); paint(); toast('Saved','Retried '+p.label+' — done.'); } }

/* ---------- router ---------- */
function go(v,p,replace){
  var r={v:v}; if(p) for(var k in p) r[k]=p[k];
  if(!replace && S.route && S.route.v!=='signin'){ S.hist.push(S.route); if(S.hist.length>40) S.hist.shift(); }
  S.route=r; S.flow=null; S.sel={}; S.side=false; window.scrollTo(0,0); save(); paint();
}
function back(){ var r=S.hist.pop(); if(r){ S.route=r; S.flow=null; S.sel={}; window.scrollTo(0,0); save(); paint(); } else go('home',null,true); }

/* ---------- toasts ---------- */
function toast(t,d,o){ o=o||{}; var box=document.getElementById('toasts'); var el=document.createElement('div'); el.className='toast'+(o.red?' red':'');
  el.innerHTML='<div><b>'+esc(t)+'</b>'+(d?'<div class="d">'+esc(d)+'</div>':'')+'</div>'+(o.act?'<button class="act" data-toastact="'+esc(o.on)+'">'+esc(o.act)+'</button>':'');
  while(box.children.length>=2) box.removeChild(box.firstChild);
  box.appendChild(el); setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, o.red?7000:4500); }

/* ---------- modal plumbing ---------- */
var FLOWS={};
function openFlow(id,init){ S.flow=id; S.sel=init||{}; paintModal(); }
function closeFlow(){ ctcReset(); S.flow=null; S.sel={}; document.getElementById('ovl').hidden=true; }
function paintModal(){
  var o=document.getElementById('ovl'); if(!S.flow){ o.hidden=true; return; }
  var f=FLOWS[S.flow]; if(!f){ S.flow=null; o.hidden=true; return; }
  var bodyHtml=f.body(); /* body first: a body may seed S.sel defaults that can() reads */
  var sub=typeof f.sub==='function'?f.sub():f.sub, okl=typeof f.ok==='function'?f.ok():(f.ok||'Confirm'), can=f.can?f.can():true;
  o.innerHTML='<div class="mod'+(f.wide?' wide':'')+'" role="dialog" aria-modal="true"><div class="modh"><div><div class="t">'+esc(typeof f.t==='function'?f.t():f.t)+'</div>'+
    (sub?'<div class="s">'+esc(sub)+'</div>':'')+'</div>'+(f.locked&&f.locked()?'':'<button class="x" data-close="1" aria-label="Close">'+ic('x')+'</button>')+'</div>'+
    '<div class="modb">'+bodyHtml+'</div>'+
    (f.nofoot&&f.nofoot()?'':'<div class="modf">'+(f.alt?'<button class="btn" data-alt="1">'+esc(f.alt.label)+'</button>':'')+'<span class="sp"></span>'+
      (f.nocancel&&f.nocancel()?'':'<button class="cancel" data-close="1">Cancel</button>')+
      '<button class="btn primary lg" data-commit="1"'+(can?'':' disabled')+'>'+esc(okl)+'</button></div>')+'</div>';
  o.hidden=false;
}
function flowLive(){ var f=FLOWS[S.flow]; if(!f) return; if(f.live){ f.live(); } var b=document.querySelector('#ovl [data-commit]'); if(b&&f.can){ b.disabled=!f.can(); var okl=typeof f.ok==='function'?f.ok():(f.ok||'Confirm'); b.textContent=okl; } }
function commit(){
  var f=FLOWS[S.flow]; if(!f||(f.can&&!f.can())) return;
  var keep=f.run();
  if(keep==='stay'){ paintModal(); return; }
  if(keep===true){ paintModal(); paint(); return; }
  if(keep==='fail'){ return; }
  closeFlow(); paint();
}
/* segmented control inside a modal — value lives in S.sel[key] */
function seg(key,opts,dflt){ var cur=S.sel[key]===undefined?dflt:S.sel[key];
  return '<div class="seg">'+opts.map(function(o){ return '<button type="button" data-mset="'+key+'" data-mval="'+esc(o[0])+'"'+(String(cur)===String(o[0])?' class="on"':'')+'>'+esc(o[1])+'</button>'; }).join('')+'</div>'; }
function selOf(k,d){ return S.sel[k]===undefined?d:S.sel[k]; }

/* ---------- ui primitives ---------- */
function chip(tx,tone,dot,sm){ return '<span class="chip'+(tone?' '+tone:'')+(sm?' sm':'')+'">'+(dot?'<i class="d"></i>':'')+esc(tx)+'</span>'; }
function btn(label,attrs,cls,icon){ return '<button class="btn'+(cls?' '+cls:'')+'" '+(attrs||'')+'>'+(icon?ic(icon):'')+esc(label)+'</button>'; }
function card(title,body,extra,opts){ opts=opts||{}; return '<section class="card'+(opts.cls?' '+opts.cls:'')+'">'+(title?'<div class="cardh"><span class="t">'+title+'</span>'+(opts.sub?'<span class="s">'+esc(opts.sub)+'</span>':'')+'<span class="sp"></span>'+(extra||'')+'</div>':'')+'<div class="cardb'+(opts.flush?' flush':'')+'"'+(opts.flush?' style="padding:0"':'')+'>'+body+'</div></section>'; }
function kv(k,v){ return '<div class="kv"><div class="lbl">'+esc(k)+'</div><div class="v">'+v+'</div></div>'; }
function field(label,inner,hint,err){ return '<label class="field"><div class="lbl">'+esc(label)+'</div>'+inner+(err?'<div class="err">'+esc(err)+'</div>':(hint?'<div class="hint">'+esc(hint)+'</div>':''))+'</label>'; }
function input(key,val,ph,extra){ return '<input class="inp" id="f_'+key+'" data-f="'+key+'" value="'+esc(val==null?'':val)+'" placeholder="'+esc(ph||'')+'" autocomplete="off" '+(extra||'')+'>'; }
function select(key,val,opts,extra){ return '<select class="sel" id="f_'+key+'" data-f="'+key+'" '+(extra||'')+'>'+opts.map(function(o){ var v=Array.isArray(o)?o[0]:o, l=Array.isArray(o)?o[1]:o; return '<option value="'+esc(v)+'"'+(String(v)===String(val)?' selected':'')+'>'+esc(l)+'</option>'; }).join('')+'</select>'; }
function note(tone,title,body,icon){ return '<div class="note '+tone+'">'+(title?'<div class="nt">'+ic(icon||(tone==='amber'?'alert':'zap'))+esc(title)+'</div>':'')+body+'</div>'; }
function empty(icon,title,body,action){ return '<div class="empty"><div class="ic">'+ic(icon||'inbox')+'</div><div class="t">'+esc(title)+'</div>'+(body?'<div class="b">'+body+'</div>':'')+(action?'<div class="a">'+action+'</div>':'')+'</div>'; }
function diamonds(grey){ return '<div class="diamonds'+(grey?' grey':'')+'"></div>'; }
function simblock(title,noteTx,btns){ return '<div class="sim"><div class="st">'+ic('zap','ic14')+esc(title||'Simulate an inbound event')+'<span class="tag">Prototype only</span></div>'+(noteTx?'<div class="sn">'+esc(noteTx)+'</div>':'')+'<div class="sb">'+btns+'</div></div>'; }
function simbtn(label,attr){ return '<button class="simbtn" '+attr+'>'+esc(label)+'</button>'; }
function timeblock(noteTx,btns){ return '<div class="timeb"><div class="st">'+ic('clock','ic14')+'Prototype time control</div>'+(noteTx?'<div class="sn">'+esc(noteTx)+'</div>':'')+'<div class="sb">'+btns+'</div></div>'; }
function opt(attr,on,title,sub,amt,sq,off){ return '<button type="button" class="opt'+(on?' on':'')+(sq?' sq':'')+(off?' off':'')+'" '+attr+(off?' aria-disabled="true"':'')+'><span class="mk"></span><span class="bd"><b>'+esc(title)+'</b>'+(sub?'<span>'+sub+'</span>':'')+'</span>'+(amt?'<span class="amt">'+esc(amt)+'</span>':'')+'</button>'; }
function pills(key,cur,opts){ return '<div class="pills">'+opts.map(function(o){ return '<button class="pill'+(cur===o[0]?' on':'')+'" data-pill="'+key+'" data-pv="'+esc(o[0])+'"><i class="d"></i>'+esc(o[1])+(o[2]!==undefined?' ('+o[2]+')':'')+'</button>'; }).join('')+'</div>'; }
function fold(id,title,sub,body,open){ var on=S.ui['fold_'+id]===undefined?!!open:S.ui['fold_'+id]; return '<div class="fold'+(on?' open':'')+'"><button data-fold="'+id+'">'+ic('checks','ic')+'<span class="t">'+esc(title)+'</span>'+(sub?'<span class="s">'+esc(sub)+'</span>':'')+ic('chevdown','cv')+'</button><div class="fb">'+body+'</div></div>'; }
function avatar(name,sm){ return '<span class="avatar'+(sm?' sm':'')+'" aria-hidden="true">'+esc(initials(name))+'</span>'; }
