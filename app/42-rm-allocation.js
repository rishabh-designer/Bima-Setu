/* ==================================================================== *
 *  RM allocation master — editable, and live at Payment Completed
 *  [stated 27 Oct: make it editable like the other masters]
 *  Ported from the standalone RM Allocation prototype: Bands · Owners ·
 *  Regions, plus Test an account. Owners are BimaSetu RM users.
 *  At Payment Completed, an account with no RM yet goes to the next owner
 *  (round robin) at the highest band any parameter reaches, in the
 *  account's region. Nobody there → the Post-sales fallback user.
 * ==================================================================== */
(function(){
var LV=['RM','SRM','AVP','VP'], RG=['North','South','West','East','Central','Northeast'];
var PR=[['gwp','Active GWP'],['rev','Net revenue'],['ins','Insurance expense'],['eb','EB expense']];
var LK=1e5, CR=1e7;
var ROSTER=[['Chaitali Bhattacharya','VP',['North','South']],['Manoj Jha','VP',['West']],['Prashant Timothy','AVP',['West']],['Shubh Bangar','AVP',['North','South']],
  ['Gaurav Mishra','SRM',['North','South']],['Narain Kataria','RM',['West']],['Prithvi Madhusudhanan','RM',['South']],['Sumit Chand','RM',['North']]];
var STATES={North:'Jammu & Kashmir, Ladakh, Himachal Pradesh, Punjab, Chandigarh, Uttarakhand, Haryana, Delhi (NCT), Uttar Pradesh',
  West:'Rajasthan, Gujarat, Goa, Maharashtra, Dadra & Nagar Haveli and Daman & Diu',South:'Andhra Pradesh, Karnataka, Kerala, Tamil Nadu, Telangana, Puducherry, Lakshadweep',
  East:'Bihar, Jharkhand, Odisha, West Bengal, Andaman & Nicobar Islands',Central:'Madhya Pradesh, Chhattisgarh',
  Northeast:'Assam, Arunachal Pradesh, Meghalaya, Manipur, Mizoram, Nagaland, Tripura, Sikkim'};
function slug(n,users){ var b=String(n).trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g,'')||'rm', id=b, k=2; while(users.some(function(u){return u.id===id;})) id=b+(k++); return id; }
function seedRma(d){ var st={}; Object.keys(STATES).forEach(function(r){ STATES[r].split(', ').forEach(function(s){ st[s]=r; }); });
  var owners=ROSTER.map(function(o){ var u=d.users.filter(function(x){ return x.n===o[0]; })[0];
    if(!u){ u={id:slug(o[0],d.users),n:o[0],role:'rm',cat:'',mgr:'meera',title:'Relationship manager · '+o[1]}; d.users.push(u); }
    return {u:u.id,level:o[1],regions:o[2].slice()}; });
  /* [stated 27 Oct] Priya stays in the roster so she keeps receiving new customers */
  if(d.users.some(function(x){ return x.id==='priya'; })) owners.push({u:'priya',level:'RM',regions:['West']});
  return {cuts:{gwp:[1*LK,3*LK,7*LK],rev:[2*CR,15*CR,75*CR],ins:[1*LK,3*LK,7*LK],eb:[10*CR,20*CR,40*CR]},owners:owners,states:st,rr:{}}; }
seedFill=(function(f0){ return function(d){ var r=f0(d)||d; if(!r.rma) r.rma=seedRma(r); return r; }; })(seedFill);
function D(){ if(!S.data.rma) S.data.rma=seedRma(S.data); return S.data.rma; }
function inr(n){ return Number(n).toLocaleString('en-IN',{maximumFractionDigits:2}); }
function num(v){ var t=String(v==null?'':v).replace(/[,₹\s]/g,''); return t===''||isNaN(+t)?null:+t; }
/* '₹5 Cr to ₹25 Cr', '₹40 Cr', '₹3 Lakh' → rupees (the first amount) */
function amt(v){ var m=String(v||'').replace(/,/g,'').match(/([\d.]+)\s*(cr|crore|l|lakh|lakhs|k)?/i); if(!m) return null; var n=+m[1], u=(m[2]||'').toLowerCase(); if(u==='cr'||u==='crore') n*=CR; else if(u[0]==='l') n*=LK; else if(u==='k') n*=1e3; return Math.round(n); }
var ONES=['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'], TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function two(n){ return n<20?ONES[n]:TENS[Math.floor(n/10)]+(n%10?'-'+ONES[n%10]:''); }
function three(n){ var h=Math.floor(n/100), r=n%100; return [h?ONES[h]+' hundred':'',r?two(r):''].filter(Boolean).join(' '); }
function words(v){ if(v===null||v===undefined) return ''; var n=Math.floor(v); if(n===0) return 'Zero'; var p=[], cr=Math.floor(n/CR); n%=CR; if(cr) p.push((cr>=1000?words(cr).toLowerCase():three(cr))+' crore');
  var lk=Math.floor(n/LK); n%=LK; if(lk) p.push(two(lk)+' lakh'); var th=Math.floor(n/1000); n%=1000; if(th) p.push(two(th)+' thousand'); if(n) p.push(three(n)); var s=p.join(' '); return s.charAt(0).toUpperCase()+s.slice(1); }
function levelFor(k,v){ var c=D().cuts[k], i=0; while(i<3&&v>=c[i]) i++; return i; }
function ownersAt(level,region){ return D().owners.filter(function(o){ var u=userById(o.u); return o.level===level&&o.regions.indexOf(region)>=0&&u&&u.active!==0; }); }
function compute(vals,state){ var region=D().states[state]||'';
  var rows=PR.map(function(p){ var v=vals[p[0]], has=v!==null&&v!==undefined&&v>=0; return {k:p[0],label:p[1],v:v,has:has,li:has?levelFor(p[0],v):-1}; });
  if(!rows[0].has) return {kind:'need',rows:rows,region:region};
  if(!region) return {kind:'noregion',rows:rows,region:''};
  var top=Math.max.apply(null,rows.map(function(r){return r.li;})), level=LV[top], pool=ownersAt(level,region);
  if(!pool.length) return {kind:'miss',rows:rows,region:region,level:level,top:top};
  var k=level+'|'+region, idx=(D().rr[k]||0)%pool.length; return {kind:'ok',rows:rows,region:region,level:level,top:top,owner:pool[idx],pool:pool,idx:idx,k:k}; }
/* live: called by rmFor when the account has no RM yet. One decision per account. */
window.rmAllocPick=function(a,product){ if(!a||!S.data) return ''; if(a.rmPick) return a.rmPick.u&&userById(a.rmPick.u)?a.rmPick.u:'';
  var ls=linesOfAcct(a.id).filter(function(x){ return x.product===product&&!dead(x); }), l=ls.sort(function(x,y){ return y.stage-x.stage; })[0]||null;
  var gwp=l?(+premOf(l)||null):null, rev=amt(((l&&l.req)||{}).to)||amt(a.to)||null;
  var r=compute({gwp:gwp,rev:rev,ins:null,eb:null},a.st);
  /* [stated 27 Oct] a peek only: nothing is booked until the payment completes */
  if(r.kind==='ok'){ a._rmPeek={u:r.owner.u,k:r.k,how:'RM allocation · '+r.level+' · '+r.region+(r.pool.length>1?' · '+(r.idx+1)+' of '+r.pool.length+' in turn':''),m:'GWP ₹'+inr(gwp)+(rev?' · revenue ₹'+inr(rev):'')}; return r.owner.u; }
  var why=r.kind==='need'?'no payment premium':(r.kind==='noregion'?'the account’s state ('+(a.st||'not set')+') is in no region':'no owner for '+r.level+' · '+r.region);
  a._rmPeek={u:'',how:'RM allocation found nobody — '+why,why:why}; return ''; };
function rmCommit(a){ var pk=a&&a._rmPeek; if(!pk||a.rmPick) return; delete a._rmPeek;
  if(pk.u){ D().rr[pk.k]=(D().rr[pk.k]||0)+1; a.rmPick={u:pk.u,how:pk.how}; acctLog(a,'RM allocated · '+uname(pk.u),pk.how+' · '+pk.m,'sys'); }
  else { a.rmPick={u:'',how:pk.how}; acctLog(a,'RM allocation found nobody',pk.why+' · the Post-sales fallback user, '+uname(fbUser('post')||'priya')+', takes it','sys'); } }
moveStage=(function(m0){ return function(l,n,why){ var r=m0.apply(this,arguments); try{ if(n===12) rmCommit(acctOf(l)); }catch(e){ console.error(e); } return r; }; })(moveStage);
/* ---------- the screen ---------- */
var lvChip=function(l){ return chip(l,l==='VP'?'violet':(l==='AVP'?'amber':(l==='SRM'?'blue':'neutral')),false,true); };
SCREENS.rmalloc=function(){ var u=me(), admin=u&&u.role==='admin', d=D(), tab=S.ui.rmaTab||'bands';
  var miss=0; RG.forEach(function(r){ LV.forEach(function(l){ if(!ownersAt(l,r).length) miss++; }); });
  var tabs='<div class="tabs atabs" style="justify-content:flex-start;margin:0 0 16px">'+[['bands','Bands'],['owners','Owners'+(miss?' · '+miss+' empty':'')],['regions','Regions']].map(function(t){ return '<button data-uiset="rmaTab" data-uv="'+t[0]+'"'+(tab===t[0]?' class="on"':'')+'>'+esc(t[1])+'</button>'; }).join('')+'</div>';
  var body='';
  if(tab==='bands'){
    body='<section class="card" style="overflow:hidden"><div class="tw"><table class="t rmab"><thead><tr><th>Level</th>'+PR.map(function(p){return '<th>'+esc(p[1])+'</th>';}).join('')+'</tr></thead><tbody>'+
      LV.map(function(l,i){ return '<tr><td>'+lvChip(l)+'</td>'+PR.map(function(p){ var c=d.cuts[p[0]];
        if(i===0) return '<td><div>Below ₹'+inr(c[0])+'</div><div class="meta">'+esc(words(c[0]))+'</div></td>';
        return '<td><div class="rmamt"><b>₹</b><input class="inp" data-rmacut="'+p[0]+'|'+(i-1)+'" value="'+inr(c[i-1])+'" inputmode="numeric"'+(admin?'':' disabled')+' aria-label="'+esc(p[1])+' '+l+' from"></div><div class="meta" id="rmaw-'+p[0]+'-'+(i-1)+'">'+esc(words(c[i-1]))+'</div></td>'; }).join('')+'</tr>'; }).join('')+
      '</tbody></table></div></section><div class="meta mt8">Each level starts at the amount shown. A band edge falls in the next band — exactly ₹1 Lakh GWP is SRM. Change an amount and press Enter or leave the field to save.</div>';
  } else if(tab==='owners'){
    var grid='<section class="card" style="overflow:hidden"><div class="tw"><table class="t"><thead><tr><th>Region</th>'+LV.map(function(l){return '<th>'+lvChip(l)+'</th>';}).join('')+'</tr></thead><tbody>'+
      RG.map(function(r){ return '<tr><td class="nm">'+esc(r)+'</td>'+LV.map(function(l){ var p=ownersAt(l,r);
        if(!p.length) return '<td class="rmamiss">'+(admin?'<button class="link" data-rmaadd="'+l+'|'+r+'">+ Add</button>':'— none')+'</td>';
        var n=(d.rr[l+'|'+r]||0)%p.length; return '<td>'+p.map(function(o,i){ return esc(uname(o.u))+(p.length>1&&i===n?' <b class="amber">· next</b>':''); }).join('<br>')+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table></div></section>';
    var held=function(id){ return S.data.accounts.filter(function(a){ return a.own===id; }).length; };
    var rows=d.owners.map(function(o,i){ return '<tr><td class="nm">'+esc(uname(o.u))+'</td><td>'+lvChip(o.level)+'</td><td>'+esc(o.regions.join(', ')||'—')+'</td><td class="num">'+held(o.u)+'</td><td class="right">'+(admin?'<button class="btn sm" data-rmaedit="'+i+'">Edit</button>':'')+'</td></tr>'; }).join('');
    body='<div class="h4 mb12">Coverage · region × designation'+(miss?' '+chip(miss+' empty','red',false,true):'')+'</div>'+grid+
      '<div class="flex mt16 mb12" style="align-items:center"><div class="h4">Owners</div><span class="sp"></span>'+(admin?'<button class="btn sm primary" data-rmaadd="">'+ic('plus')+'Add owner</button>':'')+'</div>'+
      '<section class="card" style="overflow:hidden"><div class="tw"><table class="t"><thead><tr><th>Name</th><th>Designation</th><th>Regions</th><th class="num">Accounts held</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'+
      '<div class="meta mt8">An empty cell means an account that lands there goes to the Post-sales fallback user ('+esc(uname(fbUser('post')||'priya'))+'), set in Masters.</div>';
  } else {
    body='<div class="rmareg">'+RG.map(function(r){ var sts=Object.keys(d.states).filter(function(s){ return d.states[s]===r; }).sort();
      return '<section class="card pad"><div class="h4 mb12">'+esc(r)+' <span class="meta">· '+sts.length+'</span></div>'+sts.map(function(s){ return '<div class="rmast"><span>'+esc(s)+'</span>'+(admin?'<select class="sel" data-rmast="'+esc(s)+'" aria-label="Region for '+esc(s)+'">'+RG.map(function(x){ return '<option'+(x===r?' selected':'')+'>'+x+'</option>'; }).join('')+'</select>':'')+'</div>'; }).join('')+'</section>'; }).join('')+'</div>';
  }
  var html='<div class="crumbs"><button data-go="masters">Masters</button>'+ic('chevright','ic14')+'<b>RM allocation</b></div>'+
    '<div class="hdrow"><div><div class="h1">RM allocation</div><div class="sub">Which relationship manager owns an account after the sale. It runs at Payment Completed, on an account’s first policy only — once an account has an RM it stays with them.</div></div><span class="sp"></span><div class="acts">'+(admin?'<button class="btn primary" data-flow="rmaTest">Test an account</button>':'<span class="chip sm">View only</span>')+'</div></div>'+diamonds()+
    note('neutral','How the owner is decided','Each parameter that is present — the payment premium (GWP), net revenue, insurance expense and EB expense — maps to a designation. The highest one wins. The account’s state gives the region. The owners at that designation and region take turns; nobody there → the Post-sales fallback user. In the prototype, GWP is the opportunity’s premium and net revenue is the turnover the customer gave.','info')+
    '<div class="mt16">'+tabs+body+'</div>';
  return {sc:'RM allocation', html:html, cta:''}; };

/* bands: save on change */
document.addEventListener('input',function(e){ var t=e.target; if(!t||!t.dataset||!t.dataset.rmacut) return; var k=t.dataset.rmacut.split('|'), w=document.getElementById('rmaw-'+k[0]+'-'+k[1]); if(w) w.textContent=words(num(t.value)); });
document.addEventListener('change',function(e){ var t=e.target; if(!t||!t.dataset) return;
  if(t.dataset.rmacut){ var k=t.dataset.rmacut.split('|'), d=D(), c=d.cuts[k[0]].slice(), v=num(t.value), old=c[+k[1]]; c[+k[1]]=v;
    if(v===null||v<=0||!(c[0]<c[1]&&c[1]<c[2])){ toast('Not saved',v===null||v<=0?'Enter an amount.':'Each level must start above the one before.',{red:1}); t.value=inr(old); return; }
    if(write(function(){ d.cuts[k[0]]=c; },'the band')){ paint(); toast('Saved',PR.filter(function(p){return p[0]===k[0];})[0][1]+' · '+LV[+k[1]+1]+' from ₹'+inr(v)); } return; }
  if(t.dataset.rmast){ var s=t.dataset.rmast, r=t.value; if(write(function(){ D().states[s]=r; },'the region')){ paint(); toast('Saved',s+' → '+r); } } });
HANDLERS.push(function(t){ var x=t.closest('[data-rmaadd]'); if(x){ var p=(x.dataset.rmaadd||'').split('|'); openFlow('rmaOwner',{i:'',lvl:p[0]||'RM',regs:p[1]?[p[1]]:[]}); return true; }
  x=t.closest('[data-rmaedit]'); if(x){ var o=D().owners[+x.dataset.rmaedit]; openFlow('rmaOwner',{i:x.dataset.rmaedit,lvl:o.level,regs:o.regions.slice(),who:o.u,n:uname(o.u)}); return true; }
  x=t.closest('#ovl [data-rmareg]'); if(x){ var r=x.dataset.rmareg, a=S.sel.regs||(S.sel.regs=[]), i=a.indexOf(r); if(i>=0) a.splice(i,1); else a.push(r); paintModal(); return true; }
  return false; });

/* owner: an existing RM user or a new one; designation and regions */
FLOWS.rmaOwner={t:function(){ return S.sel.i!==''?'Edit owner':'Add owner'; }, sub:'An RM in the allocation roster — their designation and the regions they cover.', repaintOn:['who','lvl'],
  body:function(){ var editing=S.sel.i!=='', taken=D().owners.map(function(o){return o.u;}), rms=S.data.users.filter(function(u){ return (u.role==='rm'||u.role==='rmhead')&&(u.id===S.sel.who||taken.indexOf(u.id)<0); });
    if(S.sel.who===undefined) S.sel.who='';
    return (editing?field('RM',input('n',S.sel.n,''),'Renames the user everywhere.'):field('RM',select('who',S.sel.who,[['','+ A new RM']].concat(rms.map(function(u){ return [u.id,u.n]; }))),'Pick an existing RM, or add a new one — they can sign in straight away.')+(S.sel.who?'':field('Full name',input('n',S.sel.n||'','e.g. Ritu Sharma'))))+
      field('Designation',select('lvl',S.sel.lvl,LV.map(function(l){return [l,l];})),'The band of accounts they take.')+
      '<div class="field"><div class="lbl">Regions</div><div class="chips">'+RG.map(function(r){ return '<button type="button" data-rmareg="'+r+'"'+((S.sel.regs||[]).indexOf(r)>=0?' class="on"':'')+'>'+r+'</button>'; }).join('')+'</div><div class="hint">Accounts in these regions at this designation come to them in turn.</div></div>'; },
  can:function(){ var nm=String(S.sel.n||'').trim(); if(S.sel.i===''&&!S.sel.who&&!nm) return false; if(S.sel.i!==''&&!nm) return false; return (S.sel.regs||[]).length>0; },
  ok:function(){ return S.sel.i!==''?'Save':'Add owner'; },
  run:function(){ var d=D(), editing=S.sel.i!=='', id=S.sel.who, nm=String(S.sel.n||'').trim();
    var ok=write(function(){ if(!editing&&!id){ id=slug(nm,S.data.users); S.data.users.push({id:id,n:nm,role:'rm',cat:'',mgr:'meera',title:'Relationship manager · '+S.sel.lvl}); }
      if(editing){ var o=d.owners[+S.sel.i], u=userById(o.u); if(u&&nm) u.n=nm; o.level=S.sel.lvl; o.regions=S.sel.regs.slice(); }
      else d.owners.push({u:id,level:S.sel.lvl,regions:S.sel.regs.slice()}); },'the owner');
    if(!ok) return 'fail'; S.ui.rmaTab='owners'; toast(editing?'Saved':uname(id)+' added',S.sel.lvl+' · '+S.sel.regs.join(', ')); }};
Object.defineProperty(FLOWS.rmaOwner,'alt',{configurable:true,get:function(){ if(S.flow!=='rmaOwner'||S.sel.i==='') return null;
  return {label:S.sel.delArm?'Confirm remove':'Remove from roster', run:function(){ if(!S.sel.delArm){ S.sel.delArm=1; paintModal(); return; }
    var d=D(), o=d.owners[+S.sel.i]; if(!o) return; var ok=write(function(){ d.owners.splice(+S.sel.i,1); },'the roster');
    if(ok){ closeFlow(); paint(); toast('Removed from the roster',uname(o.u)+' keeps the accounts they hold, but gets no new ones from allocation.'); } } }; }});

/* test an account — the same logic, nothing saved unless you assign */
FLOWS.rmaTest={t:'Test an account', sub:'Enter what is known about the account. Nothing changes until you press Assign test.', wide:true, repaintOn:['st','has'],
  live:function(){ var w=document.getElementById('rmat-res'); if(w) w.innerHTML=FLOWS.rmaTest.res(); ['tg','tr','ti','te'].forEach(function(k){ var x=document.getElementById('rmat-w-'+k); if(x) x.textContent=words(num(S.sel[k])); }); },
  res:function(){ var s=S.sel; if(s.has==='1') return note('neutral','Stays with the current RM','Allocation runs only on an account’s first policy.','info');
    var r=compute({gwp:num(s.tg),rev:num(s.tr),ins:num(s.ti),eb:num(s.te)},s.st);
    if(r.kind==='need') return note('amber','Enter the GWP','The payment premium is required.','info');
    var why='<table class="t mt8"><tbody>'+r.rows.map(function(p){ return '<tr'+(p.has&&p.li===r.top?' style="font-weight:700"':'')+'><td>'+esc(p.label)+'</td><td>'+(p.has?'₹'+inr(p.v):'<span class="meta">Not available</span>')+'</td><td class="right">'+(p.has?lvChip(LV[p.li]):'')+'</td></tr>'; }).join('')+'</tbody></table>';
    if(r.kind==='ok') return '<div class="rmares ok"><div class="meta">Assigned to</div><div class="who">'+esc(uname(r.owner.u))+'</div><div>'+lvChip(r.level)+' '+esc(r.region)+(r.pool.length>1?' · '+(r.idx+1)+' of '+r.pool.length+' in turn':'')+'</div>'+why+'</div>';
    return '<div class="rmares bad"><div class="meta">No owner for</div><div class="who">'+esc(r.level+' · '+r.region)+'</div><div class="meta">It would go to the Post-sales fallback user, '+esc(uname(fbUser('post')||'priya'))+'.</div>'+why+'</div>'; },
  body:function(){ var s=S.sel; if(!s._i){ s._i=1; s.st='Maharashtra'; s.tg=inr(2.5*LK); s.tr=inr(20*CR); s.ti=''; s.te=''; s.has='0'; }
    var money=function(k,lab,req){ return '<div>'+field(lab+(req?' *':''),input(k,s[k],'₹','inputmode="numeric"'))+'<div class="meta rmaw" id="rmat-w-'+k+'">'+esc(words(num(s[k])))+'</div></div>'; };
    return '<div class="fgrid">'+field('State *',select('st',s.st,Object.keys(D().states).sort().map(function(x){return [x,x];})))+field('Account already has an RM',select('has',s.has,[['0','No — first policy'],['1','Yes']]))+'</div>'+
      '<div class="fgrid">'+money('tg','Payment premium (GWP)',1)+money('tr','Net revenue')+'</div><div class="fgrid">'+money('ti','Insurance expense')+money('te','EB expense')+'</div>'+
      '<div id="rmat-res" class="mt12">'+FLOWS.rmaTest.res()+'</div>'; },
  can:function(){ var s=S.sel; return s.has!=='1'&&compute({gwp:num(s.tg),rev:num(s.tr),ins:num(s.ti),eb:num(s.te)},s.st).kind==='ok'; }, ok:'Assign test',
  run:function(){ var s=S.sel, r=compute({gwp:num(s.tg),rev:num(s.tr),ins:num(s.ti),eb:num(s.te)},s.st); if(r.kind!=='ok') return 'fail';
    write(function(){ D().rr[r.k]=(D().rr[r.k]||0)+1; },'the rotation'); toast('Test assigned to '+uname(r.owner.u),r.level+' · '+r.region+' · the next one in this cell goes to the next owner.'); }};
})();


/* ==== Users master (v75.23) ==== */
