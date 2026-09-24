/* ==================================================================== *
 *  The RFQ — one shared form (decided 22 Sep 2026).
 *  DAU:     requirement captured → the rater prices it → QCR from stage 3
 *           straight to 8. No RFQ. No quotes → the line switches to this.
 *  Non-DAU: the form opens on screen at stage 3, pre-filled. The owner fills
 *           what they know, then either floats it straight to placement
 *           (every required field filled; 3 → 6) or shares it with the client,
 *           who sees the same form, fills the gaps and sends it back
 *           (3 → 4 RFQ Shared for Client Review → 5 RFQ Verified by Client → 6).
 *  l.rfq = { st:'none'|'draft'|'shared'|'verified'|'floated', f:{k:{v,by,who,at}},
 *            openedAt, sharedAt, verifiedAt, floatedAt, direct }
 *  by: 'acct' · 'req' (pre-filled) · 'owner' · 'client' · 'excel'
 *  The field set per product is a [proposed] stand-in.
 * ==================================================================== */
var RFQ_FAM={'Fire & Special Perils':'prop','Burglary':'prop','Industrial All Risk':'prop','Contractors All Risk':'prop','Marine Cargo':'marine','Commercial General Liability':'liab','Cyber Liability':'liab','Directors & Officers':'liab','Professional Indemnity':'liab','Group Health':'gh','Workmen’s Compensation':'wc'};
function rfqDefs(l,a){
  var r=l.req||{}; a=a||{};
  var common=[
   {sec:'The business', f:[
    {k:'name', l:'Legal name of the insured', req:1, pre:a.n, by:'acct'},
    {k:'addr', l:'Registered address', req:1, pre:a.city?a.city+', '+a.st:'', by:'acct', s:'Plot 14, MIDC Bhosari, Pune 411026'},
    {k:'ind',  l:'Industry or occupancy', req:1, pre:a.ind, by:'acct', s:'Manufacturing'},
    {k:'tob',  l:'Type of business', req:0, pre:r.tob, by:'req', s:'Manufacturing'},
    {k:'to',   l:'Annual turnover', req:1, pre:(r.to&&r.to!=='—')?r.to:a.to, by:(r.to&&r.to!=='—')?'req':'acct', s:'₹36 Cr'}]},
   {sec:'Cover asked for', f:[
    {k:'si',   l:'Sum insured', req:1, pre:r.si, by:'req', s:'₹12 Cr'},
    {k:'ten',  l:'Policy period', req:1, pre:r.ten, by:'req', s:'1 year'},
    {k:'start',l:'Cover to start from', req:1, t:'date', s:'2026-10-15'},
    {k:'ins',  l:'Current insurer', req:0, pre:r.pol==='n'?'None — first-time buyer':r.ins, by:'req', s:'None — first-time buyer'},
    {k:'exp',  l:'Current policy expires', req:0, t:'date', pre:r.pol==='y'?r.exp:'', by:'req', s:''},
    {k:'clm',  l:'Claims in the last 3 years', req:1, pre:r.clm, by:'req', s:'No claims in 3 years'}]}
  ];
  var fam={
   prop:{sec:'The risk', f:[
    {k:'loc',  l:'Risk location address', req:1, s:'Plot 14, MIDC Bhosari, Pune 411026'},
    {k:'cons', l:'Construction', req:1, t:'sel', o:['RCC','Mixed','Steel frame','Kutcha'], s:'RCC'},
    {k:'prot', l:'Fire protection', req:1, t:'sel', o:['Hydrant and sprinklers','Hydrant only','Extinguishers only','None'], s:'Hydrant only'},
    {k:'split',l:'Sum insured break-up — building, plant, stock', req:1, s:'Building ₹6 Cr · Plant ₹4 Cr · Stock ₹2 Cr'}]},
   marine:{sec:'The transit', f:[
    {k:'com',  l:'Commodity', req:1, s:'Packaged auto parts'},
    {k:'tit',  l:'Annual turnover in transit', req:1, s:'₹42 Cr'},
    {k:'mode', l:'Mode of transit', req:1, t:'sel', o:['Road','Rail','Sea','Air','Multimodal'], s:'Road'},
    {k:'pack', l:'Packing', req:0, s:'Wooden crates, shrink-wrapped'}]},
   liab:{sec:'The exposure', f:[
    {k:'emp',  l:'Number of employees', req:1, pre:a.emp, by:'acct', s:'95'},
    {k:'lim',  l:'Limit of liability asked for', req:1, s:'₹5 Cr any one claim'},
    {k:'geo',  l:'Revenue from outside India', req:1, t:'sel', o:['None','Under 10%','10–50%','Over 50%'], s:'Under 10%'},
    {k:'inc',  l:'Incidents or notices in the last 5 years', req:0, s:'None'}]},
   gh:{sec:'The group', f:[
    {k:'emp',  l:'Employees to cover', req:1, pre:a.emp, by:'acct', s:'240'},
    {k:'fam',  l:'Family definition', req:1, t:'sel', o:['Employee only','Employee, spouse, 2 children','Employee, spouse, 2 children, parents'], s:'Employee, spouse, 2 children'},
    {k:'census',l:'Employee census', req:1, s:'Census_Sep2026.xlsx — 240 rows'},
    {k:'mat',  l:'Maternity cover', req:0, t:'sel', o:['Yes','No'], s:'Yes'}]},
   wc:{sec:'The workforce', f:[
    {k:'wk',   l:'Number of workers', req:1, pre:a.emp, by:'acct', s:'60'},
    {k:'wages',l:'Annual wages', req:1, s:'₹1.8 Cr'},
    {k:'work', l:'Nature of work', req:1, s:'Machine shop and assembly'}]}
  }[RFQ_FAM[l.product]||'prop'];
  return common.concat([fam]);
}
function rfqFlat(l,a){ var out=[]; rfqDefs(l,a||acctOf(l)).forEach(function(s){ s.f.forEach(function(f){ out.push(f); }); }); return out; }
function rfqVal(l,k){ var x=l.rfq&&l.rfq.f&&l.rfq.f[k]; return x&&x.v?x.v:''; }
function rfqCount(l){ var fs=rfqFlat(l), c={total:fs.length,filled:0,req:0,missing:0,list:[]}; fs.forEach(function(f){ var v=rfqVal(l,f.k); if(v) c.filled++; if(f.req){ c.req++; if(!v){ c.missing++; c.list.push(f.l); } } }); return c; }
function rfqOpen(l,a,at){ l.rfq={st:'draft',f:{},openedAt:at||S.now,sharedAt:0,verifiedAt:0,floatedAt:0,direct:0}; rfqFlat(l,a).forEach(function(f){ if(f.pre) l.rfq.f[f.k]={v:f.pre,by:f.by,who:'',at:at||S.now}; }); }
function rfqFillRest(l,by,who,at,a,onlySome){ var n=0; rfqFlat(l,a).forEach(function(f,i){ if(rfqVal(l,f.k)||!f.s) return; if(onlySome&&i%onlySome) return; l.rfq.f[f.k]={v:f.s,by:by,who:who||'',at:at||S.now}; n++; }); return n; }
function rfqWho(l,x){ if(!x) return ''; if(x.by==='acct') return 'From the account'; if(x.by==='req') return 'From the requirement'; if(x.by==='excel') return 'From Excel · '+uname(x.who); if(x.by==='carry') return 'Carried over from '+x.who; if(x.by==='client') return (l.contact&&l.contact.n?l.contact.n:'Client')+' · client'; return uname(x.who); }
function rfqTone(x){ return !x?'':(x.by==='client'?'client':(x.by==='owner'||x.by==='excel'?'owner':'pre')); }
function rfqStTx(l){ var s=l.rfq&&l.rfq.st; return s==='draft'?['Draft — with '+uname(l.owner).split(' ')[0],'neutral']:(s==='shared'?['Shared for client review','blue']:(s==='verified'?['Approved by the client','green']:(s==='floated'?[(l.rfq.direct?'Floated directly':'Floated after client review'),'violet']:['No RFQ','neutral']))); }
function rfqEditable(l,client){ if(!l.rfq||l.rate!==0||dead(l)) return false; if(client) return l.rfq.st==='shared'; return canAct(l)&&(l.rfq.st==='draft'||l.rfq.st==='shared'||l.rfq.st==='verified'); }
function rfqLink(l){ return 'bimakavach.in/rfq/'+l.id.toLowerCase(); }

/* ---------- the form: one field renderer for the RM's panel and the client's page ---------- */
function rfqField(l,f,client){
  var x=l.rfq.f[f.k], v=x?x.v:'', ed=rfqEditable(l,client), id=(client?'rfc_':'rf_')+f.k, attr=(client?'data-rfc="':'data-rf="')+f.k+'" data-line="'+l.id+'"', ctl;
  if(!ed) ctl='<div class="rfro">'+(v?esc(f.t==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?fmtD(new Date(v+'T00:00:00').getTime()):v):'<span class="meta">—</span>')+'</div>';
  else if(f.t==='sel') ctl='<select class="sel" id="'+id+'" '+attr+'><option value="">Choose…</option>'+f.o.map(function(o){ return '<option'+(o===v?' selected':'')+'>'+esc(o)+'</option>'; }).join('')+'</select>';
  else ctl='<input class="inp" id="'+id+'" '+attr+(f.t==='date'?' type="date"':'')+' value="'+esc(v)+'" autocomplete="off">';
  return '<div class="rf" id="'+(client?'cw_':'rw_')+f.k+'"><label class="rfl" for="'+id+'"><span>'+esc(f.l)+'</span>'+(f.req?'<b class="rq">*</b>':'')+'</label>'+ctl+'</div>';
}
function rfqSections(l,client,skip){
  return rfqDefs(l,acctOf(l)).map(function(s){
    var fs=s.f.filter(function(f){ return !skip||skip.indexOf(f.k)<0; }); if(!fs.length) return '';
    return '<section class="rfs"><div class="rfsh">'+esc(s.sec)+'</div><div class="rfgrid">'+fs.map(function(f){ return rfqField(l,f,client); }).join('')+'</div></section>';
  }).join('');
}

/* ---------- the RM's panel: the form, and one footer that carries the status and the actions ---------- */
function rfqTrack(l){
  var st=l.rfq.st, direct=l.rfq.direct, cur={draft:0,shared:1,verified:3,floated:4}[st]||0;
  return '<ol class="rtrack">'+[['Fill'],['Client review'],['Approved'],['Floated']].map(function(s,i){
    var c=(direct&&(i===1||i===2))?'skip':(i<cur?'done':(i===cur?'now':''));
    return '<li class="'+c+'"><i>'+(c==='done'?ic('check','ic14'):'')+'</i><span>'+s[0]+'</span></li>'; }).join('')+'</ol>';
}
function rfqFoot(l){
  var c=rfqCount(l), st=l.rfq.st, me_=canAct(l), who=esc(l.contact.n||'the client'), left='', btns='';
  if(st==='draft'){
    var got=c.req-c.missing, pct=c.req?Math.round(got/c.req*100):100;
    left='<div class="rft-t">'+(c.missing?got+' of '+c.req+' required details filled':'All required details are filled')+'</div><div class="rprog-b"><i style="width:'+pct+'%"'+(pct===100?' class="full"':'')+'></i></div>';
    if(me_) btns='<button class="btn'+(c.missing?'':' primary')+'" data-rfqact="send" data-line="'+l.id+'">'+ic('send')+'Send for client review</button>'+
      '<button class="btn primary" data-flow="float" data-line="'+l.id+'"'+(c.missing?' hidden':'')+'>Float to placement</button>';
  } else if(st==='shared'){
    left='<div class="rft-t">Emailed to '+who+' · '+esc(fmt(l.rfq.sharedAt))+'</div><div class="rft-s">'+(c.missing?'Waiting for them to fill the rest and approve':'Waiting for their approval')+' · <span class="mono">'+esc(rfqLink(l))+'</span></div>';
    if(me_) btns='<button class="btn" data-copy="1">Copy link</button><button class="btn" data-rfqact="resend" data-line="'+l.id+'">Resend email</button>';
  } else if(st==='verified'){
    left='<div class="rft-t green">'+ic('circlecheck','ic14')+'Approved by '+who+'</div><div class="rft-s">'+esc(fmt(l.rfq.verifiedAt))+'</div>';
    if(me_) btns='<button class="btn primary" data-flow="float" data-line="'+l.id+'">Float to placement</button>';
  } else {
    left='<div class="rft-t">Floated to placement · PLC-'+l.id.slice(3)+'</div><div class="rft-s">'+(l.rfq.direct?'Floated directly':'After the client approved')+' · '+esc(fmtD(l.rfq.floatedAt))+'</div>';
    btns=docBtns('RFQ as sent to placement',{line:l.id},false);
  }
  return '<div class="rfoot"><div class="rft" data-soft="1">'+left+'</div><div class="rfa">'+btns+'</div></div>';
}
function rfqFolded(l){ /* once floated, the RFQ folds into one line and the QCR leads the tab */
  return '<details class="rfqfold"><summary><div class="qc-ic">'+ic('file','ic20')+'</div><div class="qc-bd"><b>Request for quote</b> '+chip('Floated','violet',true,true)+'<div class="qc-m">To placement · PLC-'+l.id.slice(3)+' · '+(l.rfq.direct?'floated directly':'after the client approved')+' · '+esc(fmtD(l.rfq.floatedAt))+'</div></div><span class="rf-open">View RFQ</span><span class="rf-close">Hide RFQ</span></summary>'+
    '<div class="rform mt12">'+rfqSections(l,false)+'</div></details>'; }
function rfqBlock(l){
  if(l.rate!==0||!l.rfq||l.rfq.st==='none') return '';
  return '<div class="rfqp">'+
    '<div class="rhead"><div class="rtitle">RFQ</div>'+rfqTrack(l)+'</div>'+
    (l.renews?renRfqNote(l):'')+
    (l.routeSwitch?'<div class="rswitch">'+ic('refresh','ic14')+'<span>Switched from DAU — '+esc(l.routeSwitch.why.charAt(0).toLowerCase()+l.routeSwitch.why.slice(1))+' · '+esc(fmtD(l.routeSwitch.at))+'</span></div>':'')+
    '<div class="rform">'+rfqSections(l,false)+'</div>'+
    '<div class="rfootw" id="rfoot_'+l.id+'">'+rfqFoot(l)+'</div></div>';
}

/* patch after a field edit, so the next click is not lost to a repaint: the field's change
   event fires on blur, i.e. on the mousedown of whatever the user clicks next. Buttons are
   updated in place (class, disabled, title) unless the set of buttons itself changed. */
function softPatch(el,html){
  var tmp=document.createElement('div'); tmp.innerHTML=html;
  var ob=el.querySelectorAll('button'), nb=tmp.querySelectorAll('button'), os=el.querySelectorAll('[data-soft]'), ns=tmp.querySelectorAll('[data-soft]');
  var sig=function(list){ return Array.prototype.map.call(list,function(b){ return (b.dataset.flow||'')+'|'+(b.dataset.uv||'')+'|'+(b.dataset.rfqact||'')+'|'+b.textContent; }).join('#'); };
  if(sig(ob)!==sig(nb)||os.length!==ns.length){ el.innerHTML=html; return; }
  Array.prototype.forEach.call(ob,function(b,i){ b.className=nb[i].className; b.disabled=nb[i].disabled; b.title=nb[i].title; b.hidden=nb[i].hidden; });
  Array.prototype.forEach.call(os,function(s,i){ if(s.innerHTML!==ns[i].innerHTML) s.innerHTML=ns[i].innerHTML; });
  var ot=el.firstElementChild, nt=tmp.firstElementChild; if(ot&&nt&&ot.className!==nt.className) ot.className=nt.className;
}
function rfqPatch(l){
  var f=document.getElementById('rfoot_'+l.id); if(f) softPatch(f,rfqFoot(l));
  var n=document.getElementById('nacard'); if(n) softPatch(n,naCard(l));
  cpPatch(l);
}
document.addEventListener('change',function(ev){
  var t=ev.target; if(!(t instanceof Element)) return; var k=t.dataset.rf, kc=t.dataset.rfc; if(k===undefined&&kc===undefined) return;
  var l=lineById(t.dataset.line); if(!l||!l.rfq) return; var client=kc!==undefined, key=client?kc:k, v=String(t.value||'').trim();
  if(!rfqEditable(l,client)) return;
  var cur=l.rfq.f[key]; if((cur?cur.v:'')===v) return;
  var ok=write(function(){ if(v) l.rfq.f[key]={v:v,by:client?'client':'owner',who:client?'':S.user,at:S.now}; else delete l.rfq.f[key]; },'the RFQ field');
  if(!ok){ var x=l.rfq.f[key]; t.value=x?x.v:''; return; }
  rfqPatch(l);
});

/* ---------- send for client review: one click emails the contact and moves the stage ---------- */
function rfqSend(l){
  var made=[], who=l.contact.n||'the client';
  var ok=write(function(){ l.rfq.st='shared'; l.rfq.sharedAt=S.now; l.rfq.emails=1;
    logAdd(l,'RFQ emailed to '+who+' for review',uname(S.user)+' · '+(l.contact.e||'')+' · '+rfqLink(l)+' · '+plural(rfqCount(l).missing,'required detail')+' left for them','email');
    made=moveStage(l,4,'RFQ emailed for client review'); },'the email');
  if(!ok) return;
  S.ui['ltab_'+l.id]='quotes'; paint();
  toast('RFQ emailed to '+who,'Now at RFQ Shared for Client Review'+(made.length?' · '+plural(made.length,'task')+' created by rule':''),{act:'Copy link',on:'copyrfq'});
}
HANDLERS.push(function(t){
  var x=t.closest('[data-rfqact]'); if(x){ var l=lineById(x.dataset.line); if(!l) return true; var a=x.dataset.rfqact;
    if(a==='send'){ if(canAct(l)&&l.rfq.st==='draft') rfqSend(l); return true; }
    if(a==='resend'){ var ok=write(function(){ l.rfq.emails=(l.rfq.emails||1)+1; logAdd(l,'RFQ email sent again to '+(l.contact.n||'the client'),uname(S.user)+' · '+(l.contact.e||''),'email'); },'the email'); if(ok){ paint(); toast('Email sent again',(l.contact.e||'')); } return true; }
    if(a==='client'){ cpOpen(l); return true; }
    if(a==='qcr'){ qvOpen(l,l.round); return true; }
    return true; }
  if(x=t.closest('[data-rfqfocus]')){ var el=document.getElementById('rf_'+x.dataset.rfqfocus); if(el){ el.scrollIntoView({block:'center',behavior:'smooth'}); try{ el.focus({preventScroll:true}); }catch(e){} } return true; }
  if(x=t.closest('[data-cpclose]')){ cpClose(); return true; }
  if(x=t.closest('[data-cpapprove]')){ if(!x.disabled) cpApprove(); return true; }
  return false;
});

/* ---------- the client's link: a page of its own ---------- */
function rfqVerify(l){ l.rfq.st='verified'; l.rfq.verifiedAt=S.now; logAdd(l,'Client approved the RFQ',(l.contact.n||'Client')+' · on the link','rfq',1); }
function cpOpen(l){ S.ui.cLine=l.id; S.ui.cDone=0; S.ui.cMiss=rfqFlat(l).filter(function(f){ return f.req&&!rfqVal(l,f.k); }).map(function(f){ return f.k; });
  var el=document.getElementById('cpage'); if(!el){ el=document.createElement('div'); el.id='cpage'; el.className='cpage'; document.body.appendChild(el); }
  el.innerHTML=cpHtml(l); el.hidden=false; el.scrollTop=0; document.body.style.overflow='hidden'; }
function cpClose(){ var el=document.getElementById('cpage'); if(el){ el.hidden=true; el.innerHTML=''; } document.body.style.overflow=''; var done=S.ui.cDone, l=lineById(S.ui.cLine); S.ui.cLine=''; S.ui.cDone=0; paint(); if(done&&l) toast('The client approved the RFQ','Now at RFQ Verified by Client — float it to placement'); }
function cpStat(l){ var c=rfqCount(l); return c.missing?'<b class="amber">'+plural(c.missing,'detail')+' still needed</b> before you can approve':'<b class="green">Everything we need is here.</b> Approve to send it back to '+esc(uname(l.owner).split(' ')[0])+'.'; }
function cpHtml(l){
  var a=acctOf(l), miss=S.ui.cMiss||[], fs=rfqFlat(l), first=uname(l.owner).split(' ')[0];
  var bar='<div class="cp-browser"><span class="cp-dots"><i></i><i></i><i></i></span><span class="cp-url">'+ic('lock','ic14')+esc(rfqLink(l))+'</span><span class="sp"></span><span class="cp-proto">Prototype · you are '+esc(l.contact.n||'the client')+'</span><button class="btn sm" data-cpclose="1">Back to the CRM</button></div>';
  if(S.ui.cDone) return bar+'<div class="cp-body"><div class="cp-wrap cp-done"><div class="cp-brand">Bima<i>Kavach</i></div><div class="cp-tick">'+ic('circlecheck','ic22')+'</div><h1 class="cp-h">Approved — thank you</h1><p class="cp-sub">'+esc(uname(l.owner))+' has your details and will send them to insurers for quotes. You will hear back with a comparison.</p><button class="btn primary lg" data-cpclose="1">Back to the CRM</button></div></div>';
  return bar+'<div class="cp-body"><div class="cp-wrap">'+
    '<div class="cp-brand">Bima<i>Kavach</i></div>'+
    '<h1 class="cp-h">Request for quote</h1>'+
    (l.renews?'<p class="cp-sub"><b>Renewal of your '+esc(l.product)+' policy</b> for '+esc(a.n)+', '+esc(renInTx(renDays(l)))+'. This is the request for quote we have on record — please check it, change anything that has changed this year, and approve.</p>'
      :'<p class="cp-sub"><b>'+esc(l.product)+'</b> for '+esc(a.n)+'. '+esc(uname(l.owner))+' has filled in what we know — please check it, add anything missing, and approve.</p>')+
    (miss.length?'<section class="cp-need"><div class="cp-nh"><b>We need '+plural(miss.length,'detail')+' from you</b></div><div class="rfgrid">'+fs.filter(function(f){ return miss.indexOf(f.k)>=0; }).map(function(f){ return rfqField(l,f,true); }).join('')+'</div></section>':'')+
    '<div class="cp-lbl">'+(miss.length?'What we have filled':'Your details')+' <span>— correct anything that is wrong</span></div>'+
    '<div class="rform">'+rfqSections(l,true,miss)+'</div>'+
  '</div></div>'+
  '<div class="cp-foot"><div class="cp-wrap cp-fr"><span id="cpstat">'+cpStat(l)+'</span><button class="btn primary lg" data-cpapprove="1"'+(rfqCount(l).missing?' disabled':'')+'>Approve</button></div></div>';
}
function cpPatch(l){ if(S.ui.cLine!==l.id) return; var s=document.getElementById('cpstat'); if(s) s.innerHTML=cpStat(l); var b=document.querySelector('[data-cpapprove]'); if(b) b.disabled=!!rfqCount(l).missing; }
function cpApprove(){ var l=lineById(S.ui.cLine); if(!l||rfqCount(l).missing||l.rfq.st!=='shared') return;
  var ok=write(function(){ rfqVerify(l); moveStage(l,5,'Client approved the RFQ'); },'the approval'); if(!ok) return;
  S.ui.cDone=1; var el=document.getElementById('cpage'); if(el){ el.innerHTML=cpHtml(l); el.scrollTop=0; } }

FLOWS.excel={t:'Fill the RFQ from an Excel', sub:'[stated 24 Sep · TBD-14] a stopgap until the digitised RFQ exists, with no fixed template. Empty fields are filled from the sheet; what is already filled stays.',
  body:function(){ var l=FL(); return field('File','<div class="chip neutral" style="width:100%;justify-content:flex-start">'+ic('file','ic14')+polCode(l.product).slice(4)+'_RFQ_'+esc(shortName(acctName(l)).replace(/\s+/g,''))+'.xlsx · 62 KB</div>')+
      note('blue','','Fields filled from the sheet are marked <b>From Excel</b>. The stage does not move — float it or send it for client review as usual.'); },
  can:function(){ return true; }, ok:'Fill from the sheet',
  run:function(){ var l=FL(), n=0; var ok=write(function(){ n=rfqFillRest(l,'excel',S.user,S.now); logAdd(l,'RFQ filled from an Excel',uname(S.user)+' · '+plural(n,'field'),'rfq'); },'the RFQ'); if(!ok) return 'fail'; toast(plural(n,'field')+' filled from the Excel',rfqCount(l).missing?rfqCount(l).missing+' required still empty':'Every required field is filled'); }};

FLOWS.rejectAll={t:'The client rejected every quote', sub:'On a DAU line this switches the line to the RFQ route. It goes back to Details Captured with the RFQ open.',
  body:function(){ var l=FL(); return field('Why',input('why',S.sel.why,'Premiums too high; wants the enhanced loss of profit section priced'))+
    note('amber','','<b>Back to Details Captured, as non-DAU.</b> The RFQ opens pre-filled from the requirement. From there you float it straight to placement or send it for client review. QCR v'+l.round+' stays on the line, marked rejected.'); },
  can:function(){ return !!(S.sel.why||'').trim(); }, ok:'Switch to the RFQ route',
  run:function(){ var l=FL(), made=[]; var ok=write(function(){ rfqSwitch(l,'The client rejected every rater quote',S.sel.why.trim()); made=moveStage(l,3,'Client rejected every DAU quote — switched to the RFQ route'); },'the switch'); if(!ok) return 'fail'; toast('Switched to the RFQ route','Back at Details Captured · the RFQ is open on the RFQ & quotes tab'); }};
function rfqSwitch(l,why,detail){
  l.dauQcr=l.stage>=8?{v:l.round,q:(l.qsel&&l.qsel.length?l.qsel:QUOTES.dau.filter(function(q){return q.st==='quoted';}).map(function(q){return q.i;})),at:l.enteredAt,rejAt:S.now,why:detail||why}:null;
  l.rate=0; l.routeSwitch={why:why,at:S.now,detail:detail||''}; l.qsel=[]; l.round=1; l.picked=''; rfqOpen(l,acctOf(l),S.now);
  logAdd(l,'Switched from DAU to the RFQ route',why+(detail?' · '+detail:''),'sys',1);
  logAdd(l,'RFQ opened on screen','System · pre-filled from the requirement and the account','rfq',1);
}

/* ---------- seed: give every seeded non-DAU line the RFQ its stage implies ---------- */
function rfqSeedAll(lines,accounts){
  lines.forEach(function(l){
    if(l.rate!==0||l.stage<3){ l.rfq={st:'none',f:{},openedAt:0,sharedAt:0,verifiedAt:0,floatedAt:0,direct:0}; return; }
    var a=by(accounts,l.acct), t0=l.enteredAt||T0.getTime(), open=t0-86400000*(l.stage>6?9:2); /* later stages: the RFQ story sits well before the current stage */
    rfqOpen(l,a,open);
    var fs=rfqFlat(l,a), own=function(k){ var f=fs.filter(function(x){return x.k===k;})[0]; if(f&&f.s&&!rfqVal(l,k)) l.rfq.f[k]={v:f.s,by:'owner',who:l.owner,at:open+3600000}; };
    own('loc'); own('com'); own('lim'); own('fam'); own('wages');
    if(l.stage===3){ own('start'); return; }
    l.rfq.sharedAt=open+86400000;
    if(l.stage===4){ l.rfq.st='shared'; return; } /* the client has not touched it yet — the gaps are theirs */
    own('start');
    rfqFillRest(l,'client','',open+86400000*2-3600000,a);
    l.rfq.st='verified'; l.rfq.verifiedAt=l.stage===5?t0:open+86400000*2;
    if(l.stage>=6){ l.rfq.st='floated'; l.rfq.floatedAt=l.stage===6?t0:open+86400000*3; }
  });
}
