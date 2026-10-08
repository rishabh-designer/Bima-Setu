/* ==================================================================== *
 *  Accounts — the finder, and Account 360
 * ==================================================================== */
/* [stated 24 Sep · NFR-02] the numbers are stored encrypted and shown in full only to the
   account's owner — and to a manager above them. Everyone else sees the last four characters. */
function idVisible(a,u){ if(!a||!u) return false; if(a.own===u.id) return true;
  if(isMgrRole(u)){ var o=userById(a.own); return !!o && (o.mgr===u.id||o.id===u.id); } return false; }
function idMask(v){ v=String(v||''); if(!v) return ''; var t=v.replace(/\s+/g,''); return t.length<=4?t:(new Array(t.length-3).join('\u2022')+t.slice(-4)); }
function idShow(a,u,v){ if(!v) return '<span class="meta">Not on file</span>';
  return idVisible(a,u)?'<span class="mono">'+esc(v)+'</span>':'<span class="mono">'+esc(idMask(v))+'</span> <span class="meta">· owner only</span>'; }
function acctOpenLines(a){ return linesOfAcct(a.id).filter(openLine); }
/* ---------- visibility — [stated 25–27 Sep · 18.5] one test, used everywhere ----------
   A user sees an account they own, one they own a line on, one where they are Sold by on a policy
   (permanently), or one where someone in their team qualifies. Merged-away accounts are never shown. */
function soldHere(a,uid){ return linesOfAcct(a.id).some(function(l){ return l.soldBy===uid; }) || (a.pols||[]).some(function(p){ var l=p.line?lineById(p.line):null; return l&&l.soldBy===uid; }); }
function whyMine(a,uid){ if(!a||a.merged) return ''; if(a.own===uid) return 'own'; if(linesOfAcct(a.id).some(function(l){return l.owner===uid&&(!isRen(l)||isRmRole(userById(uid)));})) return 'line'; if(soldHere(a,uid)) return 'sold'; return ''; }
function isRmRole(u){ return !!u&&(u.role==='rm'||u.role==='rmhead'); }
function teamIds(u){ if(!u) return []; if(u.role==='mgr') return teamOf(u.id).map(function(x){return x.id;}); if(u.role==='rmhead') return rmTeam(u.id).map(function(x){return x.id;}); return []; }
function canSeeAcct(a,u){ u=u||me(); if(!a||!u||a.merged) return false; if(whyMine(a,u.id)) return true; return teamIds(u).some(function(id){ return !!whyMine(a,id); }); }
function canSeeLine(l,u){ u=u||me(); if(!l||!u) return false; if(isRen(l)&&!isRmRole(u)) return false; return canSeeAcct(acctOf(l),u); }
/* someone on the account — the people who may act on it (Get verified, contacts) */
function onAcct(a,u){ u=u||me(); return !!u&&!!a&&(a.own===u.id||linesOfAcct(a.id).some(function(l){return l.owner===u.id;})); }
function noAccess(what){ return {sc:'No access', html:empty('lock','You don’t have access to this '+what+'.','It is not one of yours, and nobody in your team is on it.','<button class="btn" data-back="1">'+ic('arrowleft')+'Go back</button>')}; }
/* the listing is scoped by the view switch; visibility itself is not (17.5) */
function acctInvolved(a,uid){ if(!a||a.merged) return false; var ids=scopeIds(userById(uid)); return ids.some(function(id){ return !!whyMine(a,id); }); }
function svcOfAcct(aid){ return S.data.svc.filter(function(t){return t.acct===aid;}); }
/* [stated 27 Sep · 9.8] a policy written at payment reads Awaiting policy copy until the copy passes QC */
function polState(p){ if(p.expired||p.exp<S.now) return {tx:'Expired',tone:'red'}; if(p.issuing) return {tx:'Awaiting policy copy',tone:'violet'}; var d=daysBetween(S.now,p.exp); if(d<=30) return {tx:'Expires in '+d+' d',tone:'red'}; if(d<=90) return {tx:'Expires in '+d+' d',tone:'amber'}; return {tx:'In force',tone:'green'}; }
function premInForce(a){ return a.pols.filter(function(p){return !(p.expired||p.exp<S.now)&&!p.issuing;}).reduce(function(s,p){return s+(+p.pr||0);},0); }
var WHY_TX={own:'you own it',line:'you own a line here',sold:'sold here',team:'your team is on it'};
function acctLive(a,u){ var ls=linesOfAcct(a.id).filter(function(l){ return !isRen(l)||isRmRole(u); });
  var opp=oppsOfAcct(a.id).some(function(o){ return oppStatus(o).tx==='Open'; }), tk=svcOfAcct(a.id).some(function(t){return !svcClosed(t);})||ls.some(function(l){ return ticketsOf(l).some(function(t){ return t.st!=='Closed'; }); });
  var ren=(a.pols||[]).some(function(p){ var d=calDays(S.now,p.exp); return !p.issuing&&!p.expired&&!isContractual(p.p)&&d>=0&&d<=REN_WINDOW; });
  return {opp:opp,ticket:tk,ren:ren}; }
function liveTx(v){ var p=[]; if(v.opp) p.push('open opportunity'); if(v.ticket) p.push('open ticket'); if(v.ren) p.push('renewal inside 90 days'); return p.length?p.join(' · '):'nothing live'; }
function acctLastAct(a){ var mx=a.createdAt||0; linesOfAcct(a.id).forEach(function(l){ var t=lastActivity(l); if(t>mx) mx=t; }); (a.log||[]).forEach(function(e){ if(e.at>mx) mx=e.at; }); return mx; }
function acctNextRen(a){ var n=Infinity; (a.pols||[]).forEach(function(p){ if(!p.issuing&&!p.expired&&!isContractual(p.p)&&p.exp>=S.now&&p.exp<n) n=p.exp; }); return n; }
/* the search over the rail — never wider than what the user can already see */
function acctMatch(a,q){ if(!q) return {ok:true,why:''}; var pl=function(x){return String(x||'').toLowerCase().replace(/\s+/g,'');};
  if(pl(a.n).indexOf(q)>=0||pl(a.trade).indexOf(q)>=0||pl(a.pan).indexOf(q)>=0||pl(a.gst).indexOf(q)>=0) return {ok:true,why:''};
  for(var i=0;i<a.con.length;i++){ var c=a.con[i];
    if(pl(c.n).indexOf(q)>=0) return {ok:true,why:'matched on contact name: '+c.n+(c.dep?' · inactive':'')};
    if(pl(c.m).replace(/\D/g,'').indexOf(q.replace(/\D/g,''))>=0&&q.replace(/\D/g,'').length>=4) return {ok:true,why:'matched on contact phone: '+c.n+(c.dep?' · inactive':'')};
    if(pl(c.e).indexOf(q)>=0) return {ok:true,why:'matched on contact email: '+c.n+(c.dep?' · inactive':'')}; }
  return {ok:false}; }
function acctRailRows(u){
  var q=(S.ui.aq||'').toLowerCase().replace(/\s+/g,''), fw=S.ui.afw||'', fl=S.ui.afl||'', fk=S.ui.akyc||'', fi=S.ui.aind||'', fs=S.ui.ast||'', so=S.ui.asort||'new';
  var all=S.data.accounts.filter(function(a){ return acctInvolved(a,u.id); });
  var rows=[]; all.forEach(function(a){ var w=whyMine(a,u.id)||'team', lv=acctLive(a,u), m=acctMatch(a,q);
    if(!m.ok) return; if(fw&&w!==fw) return; if(fk==='v'&&a.prov) return; if(fk==='p'&&!a.prov) return; if(fi&&a.ind!==fi) return; if(fs&&a.city!==fs&&a.st!==fs) return;
    if(fl==='opp'&&!lv.opp) return; if(fl==='tk'&&!lv.ticket) return; if(fl==='ren'&&!lv.ren) return; if(fl==='none'&&(lv.opp||lv.ticket||lv.ren)) return;
    rows.push({a:a,w:w,lv:lv,why:m.why}); });
  var sorters={new:function(x,y){return (y.a.createdAt||0)-(x.a.createdAt||0);}, act:function(x,y){return acctLastAct(y.a)-acctLastAct(x.a);}, az:function(x,y){return x.a.n.localeCompare(y.a.n);},
    prem:function(x,y){return premInForce(y.a)-premInForce(x.a);}, ren:function(x,y){return acctNextRen(x.a)-acctNextRen(y.a);}};
  rows.sort(sorters[so]||sorters.new);
  return {rows:rows,total:all.length}; }
function acctRail(u,sel){
  var r=acctRailRows(u), all=S.data.accounts.filter(function(a){ return acctInvolved(a,u.id); });
  var inds=[], places=[]; all.forEach(function(a){ if(a.ind&&inds.indexOf(a.ind)<0) inds.push(a.ind); [a.city,a.st].forEach(function(p){ if(p&&places.indexOf(p)<0) places.push(p); }); }); inds.sort(); places.sort();
  var nf=['afw','afl','akyc','aind','ast'].filter(function(k){return S.ui[k];}).length, open=S.ui.afold||nf;
  var sel_=function(key,cur,opts){ return '<select class="sel" data-uisel="'+key+'">'+opts.map(function(o){ return '<option value="'+esc(o[0])+'"'+(cur===o[0]?' selected':'')+'>'+esc(o[1])+'</option>'; }).join('')+'</select>'; };
  return '<aside class="arail'+(S.ui.arailOpen?' open':'')+(sel?'':' solo')+'"><div class="arh">'+
      '<input class="inp" id="aq" data-ui="aq" placeholder="Name, PAN, GSTIN, contact, phone or email" value="'+esc(S.ui.aq||'')+'" aria-label="Search your accounts">'+
      '<div class="flex mt8" style="gap:8px"><button class="btn sm ghost" data-uiset="afold" data-uv="'+(open?'':'1')+'">'+ic('filter')+'Filters'+(nf?' · '+nf:'')+'</button><span class="sp"></span>'+
        sel_('asort',S.ui.asort||'new',[['new','Newest created'],['act','Most recent activity'],['az','Name A–Z'],['prem','Premium in force'],['ren','Nearest renewal']])+'</div>'+
      (open?'<div class="afl mt8">'+
        sel_('afw',S.ui.afw||'',[['','Why it is mine — any'],['own','I own the account'],['line','I own a line here'],['sold','I sold here']].concat(teamView(u)?[['team','My team is on it']]:[]))+
        sel_('afl',S.ui.afl||'',[['','Live work — any'],['opp','Open opportunity'],['tk','Open ticket'],['ren','Renewal inside 90 days'],['none','Nothing live']])+
        sel_('akyc',S.ui.akyc||'',[['','Identity — any'],['v','Verified'],['p','Provisional']])+
        sel_('aind',S.ui.aind||'',[['','Industry — any']].concat(inds.map(function(x){return [x,x];})))+
        sel_('ast',S.ui.ast||'',[['','City or state — any']].concat(places.map(function(x){return [x,x];})))+
        (nf||S.ui.aq?'<button class="btn sm ghost" data-clearaf="1">Clear filters</button>':'')+'</div>':'')+
      '<div class="meta mt8">Showing '+r.rows.length+' of '+r.total+'</div></div>'+
    '<div class="arl">'+(r.rows.length?r.rows.map(function(x){ var a=x.a;
      return '<button class="arow'+(sel===a.id?' on':'')+'" data-go="acct" data-id="'+a.id+'"><div class="arn"><b>'+esc(a.n)+'</b>'+(a.prov?chip('Provisional','amber',false,true):chip('Verified','green',false,true))+'</div>'+
        (x.why?'<div class="arm amber">'+esc(x.why)+'</div>':'<div class="arm">'+esc(a.city||'—')+' · '+esc(WHY_TX[x.w])+(liveTx(x.lv)!=='nothing live'?' · '+esc(liveTx(x.lv)):'')+'</div>')+'</button>'; }).join('')
      : '<div class="empty" style="padding:28px 12px"><div class="t">'+(nf||S.ui.aq?'Nothing matches these filters':'Nothing here yet')+'</div>'+(nf||S.ui.aq?'<div class="a"><button class="btn sm" data-clearaf="1">Clear filters</button></div>':'<div class="b">An account appears here when you own it, own a line on it, or sold a policy on it.</div>')+'</div>')+'</div></aside>';
}
/* how an account came in — the person who created it, or the source of its first opportunity */
function acctCameIn(a){ if(userById(a.createdBy)) return 'by '+uname(a.createdBy); var o=oppsOfAcct(a.id).slice().sort(function(x,y){return (x.created||0)-(y.created||0);})[0]; return o&&o.src?o.src:(a.createdBy||'migrated'); }
SCREENS.accounts=function(){
  /* [stated 27 Sep] like Opportunities: the list first, full width; a row opens the account */
  var u=me(), r=acctRailRows(u), all=S.data.accounts.filter(function(a){ return acctInvolved(a,u.id); });
  var inds=[], places=[]; all.forEach(function(a){ if(a.ind&&inds.indexOf(a.ind)<0) inds.push(a.ind); [a.city,a.st].forEach(function(p){ if(p&&places.indexOf(p)<0) places.push(p); }); }); inds.sort(); places.sort();
  var nf=['afw','afl','akyc','aind','ast'].filter(function(k){return S.ui[k];}).length;
  var sel_=function(key,cur,opts){ return '<select class="sel" data-uisel="'+key+'" style="width:auto;max-width:200px">'+opts.map(function(o){ return '<option value="'+esc(o[0])+'"'+(cur===o[0]?' selected':'')+'>'+esc(o[1])+'</option>'; }).join('')+'</select>'; };
  var filters='<div class="flex wrap" style="gap:10px">'+
    '<input class="inp" id="aq" data-ui="aq" style="max-width:280px" placeholder="Name, PAN, GSTIN, contact, phone or email" value="'+esc(S.ui.aq||'')+'" aria-label="Search your accounts">'+
    sel_('afl',S.ui.afl||'',[['','Live work — any'],['opp','Open opportunity'],['tk','Open ticket'],['ren','Renewal inside 90 days'],['none','Nothing live']])+
    sel_('akyc',S.ui.akyc||'',[['','Identity — any'],['v','Verified'],['p','Provisional']])+
    '<button class="btn ghost" data-uiset="afold" data-uv="'+(S.ui.afold?'':'1')+'">'+ic('filter')+'More filters'+(['afw','aind','ast'].filter(function(k){return S.ui[k];}).length?' · '+['afw','aind','ast'].filter(function(k){return S.ui[k];}).length:'')+'</button>'+
    (nf||S.ui.aq?'<button class="btn ghost" data-clearaf="1">Clear</button>':'')+'<span class="sp"></span>'+
    sel_('asort',S.ui.asort||'new',[['new','Newest created'],['act','Most recent activity'],['az','Name A–Z'],['prem','Premium in force'],['ren','Nearest renewal']])+'</div>'+
    (S.ui.afold?'<div class="flex wrap mt8" style="gap:10px">'+
      sel_('afw',S.ui.afw||'',[['','Why it is mine — any'],['own','I own the account'],['line','I own a line here'],['sold','I sold here']].concat(teamView(u)?[['team','My team is on it']]:[]))+
      sel_('aind',S.ui.aind||'',[['','Industry — any']].concat(inds.map(function(x){return [x,x];})))+
      sel_('ast',S.ui.ast||'',[['','City or state — any']].concat(places.map(function(x){return [x,x];})))+'</div>':'');
  var rows=r.rows.map(function(x){ var a=x.a, pif=a.pols.filter(function(p){return !(p.expired||p.exp<S.now)&&!p.issuing;}).length;
    return '<tr class="row" data-go="acct" data-id="'+a.id+'"><td class="nm one" title="'+esc(a.n)+'">'+esc(a.n)+'<div class="sub">'+(x.why?'<span class="amber">'+esc(x.why)+'</span>':esc(a.id)+' · '+esc(a.city||'—'))+'</div></td>'+
      '<td>'+(a.prov?chip('Provisional','amber',true,true):chip('Verified','green',true,true))+'</td>'+
      '<td class="one">'+esc(uname(a.own))+'<div class="sub">'+esc(WHY_TX[x.w])+'</div></td>'+
      '<td class="num">'+(pif?'<b class="b">'+pif+'</b>':'<span class="meta">—</span>')+'</td>'+
      '<td class="num">'+(premInForce(a)?'<b class="b">'+INR(premInForce(a))+'</b>':'<span class="meta">—</span>')+'</td>'+
      '<td style="white-space:nowrap">'+(a.createdAt?esc(fmtD(a.createdAt)):'<span class="meta">—</span>')+'<div class="sub">'+esc(acctCameIn(a))+'</div></td></tr>'; }).join('');
  var html='<div class="hdrow"><div><div class="h1">Accounts</div><div class="sub">'+(teamView(u)?'Your team’s accounts.':'Accounts you own, own a line on, or sold on.')+'</div></div></div>'+diamonds()+
    filters+
    '<div class="card mt16" style="overflow:hidden">'+(r.rows.length?'<div class="tw"><table class="t"><thead><tr><th>Account</th><th>Identity</th><th>Owner</th><th class="num">Policies in force</th><th class="num">Premium in force</th><th>Created on</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
      :empty('building',nf||S.ui.aq?'Nothing matches these filters':'No accounts yet',nf||S.ui.aq?'Clear the search or a filter.':'An account appears here when you own it, own a line on it, or sold a policy on it.',nf||S.ui.aq?'<button class="btn" data-clearaf="1">Clear filters</button>':''))+'</div>'+
    '<div class="meta mt8">Showing '+r.rows.length+' of '+r.total+'</div>';
  return {sc:'Accounts', ctx:plural(r.total,'account'), html:html};
};
HANDLERS.push(function(t){ if(t.closest('[data-clearaf]')){ ['aq','afw','afl','akyc','aind','ast'].forEach(function(k){ S.ui[k]=''; }); paint(); return true; } return false; });
/* [stated 23 Sep] ticking renewal lines on the account, to bill several on one payment request */
HANDLERS.push(function(t){
  var x=t.closest('[data-rentog]');
  if(x){ var k='rsel_'+x.dataset.acct, cur=(S.ui[k]||[]).slice(), id=x.dataset.rentog, i=cur.indexOf(id);
    if(i>=0) cur.splice(i,1); else cur.push(id); S.ui[k]=cur; paint(); return true; }
  x=t.closest('[data-renclear]'); if(x){ S.ui['rsel_'+x.dataset.renclear]=[]; paint(); return true; }
  return false;
});
/* ---------- the contacts rail — [stated 26 Sep · 1.8] on every tab of Account 360 ---------- */
/* the decision-maker marker is per opportunity, set from the opportunity */
function dmOpps(a,c){ return oppsOfAcct(a.id).filter(function(o){ return oppDm(o)===c.n; }); }
function oppDm(o){ if(o.dm!==undefined) return o.dm; var a=acctOf(o.acct); var c=a&&a.con.filter(function(x){return x.dm&&!x.dep;})[0]; return c?c.n:''; }
function contactsRail(a,u){
  var can=onAcct(a,u);
  return '<aside class="crail"><div class="flex"><div class="h4">Contacts</div><span class="sp"></span>'+(can?'<button class="btn sm" data-flow="addContact" data-acct="'+a.id+'">'+ic('plus')+'Add</button>':'')+'</div>'+
    '<div class="crl mt8">'+(a.con.length?a.con.map(function(c,i){ var dm=dmOpps(a,c);
      return '<div class="crow2'+(c.dep?' dim':'')+'"><div class="bd"><b>'+esc(c.n)+(c.dep?' <span class="meta">· left</span>':'')+'</b><div class="m">'+esc(c.d||'—')+'</div>'+
        '<div class="m2 mono">'+esc(c.m||'—')+'</div><div class="m2">'+esc(c.e||'—')+'</div>'+
        (dm.length?'<div class="m2">'+chip('Decision maker','violet',false,true)+' <span class="meta">on '+esc(dm.map(function(o){return o.id;}).join(', '))+'</span></div>':'')+'</div>'+
        (can&&!c.dep?'<div class="cra"><button class="btn xs" data-acall="'+i+'" data-acct="'+a.id+'" title="Call '+esc(c.n)+'">'+ic('phone','ic14')+'Call</button><button class="btn xs ghost" data-flow="editContact" data-acct="'+a.id+'" data-ci="'+i+'">Edit</button><button class="btn xs ghost" data-flow="depContact" data-acct="'+a.id+'" data-ci="'+i+'">Deactivate</button></div>':'')+'</div>'; }).join('')
      :'<div class="meta">No contact on the account yet.'+(can?' Add one — the RFQ and payment details need someone to go to.':'')+'</div>')+'</div></aside>';
}
function contactErr(){ var e={}, was=function(k){ return S.sel[k]!==undefined; };
  if(was('m')){ if(!(S.sel.m||'').trim()) e.m='Add a mobile number'; else if(mobileErr(S.sel.m)) e.m=mobileErr(S.sel.m); }
  if(was('e')){ if(!(S.sel.e||'').trim()) e.e='Add an email'; else if(emailErr(S.sel.e)) e.e=emailErr(S.sel.e); }
  return e; }
function contactOk(){ return !!(S.sel.n||'').trim()&&digits(S.sel.m).length>=10&&!!(S.sel.e||'').trim()&&!emailErr(S.sel.e); }
function contactBody(){ var e=contactErr(); return '<div class="fgrid">'+field('Name',input('n',S.sel.n,'Full name'))+field('Designation — optional',input('d',S.sel.d,'CFO'))+'</div><div class="fgrid">'+field('Mobile',input('m',S.sel.m,'+91 98xxx xxxxx'),'',e.m)+field('Email',input('e',S.sel.e,'name@company.in'),'',e.e)+'</div>'+
  note('neutral','','Mobile and email are for reaching them and for search — never a key. Two people can share a number. The decision maker is marked on each opportunity, not here.','info'); }
FLOWS.addContact={t:'Add a contact', sub:'On the account. Any line on it can pick this person as its contact.',
  body:contactBody, live:function(){ paintModalErrs(contactErr()); }, can:contactOk, ok:'Add contact',
  run:function(){ var a=by(S.data.accounts,S.sel.acct||S.route.id); if(!a) return 'fail'; var ok=write(function(){ a.con.push({n:S.sel.n.trim(),d:(S.sel.d||'').trim(),m:(S.sel.m||'').trim(),e:(S.sel.e||'').trim()}); acctLog(a,'Contact added: '+S.sel.n.trim(),uname(S.user)); },'the contact'); if(!ok) return 'fail'; toast('Contact added',S.sel.n.trim()+' is on '+a.n+'.'); }};
FLOWS.editContact={t:'Edit contact', sub:'Changes the contact on the account. Lines that already carry them keep working.',
  body:function(){ var a=by(S.data.accounts,S.sel.acct), c=a&&a.con[+S.sel.ci]; if(c&&S.sel.n===undefined){ S.sel.n=c.n; S.sel.d=c.d||''; S.sel.m=c.m||''; S.sel.e=c.e||''; } return contactBody(); },
  live:function(){ paintModalErrs(contactErr()); }, can:contactOk, ok:'Save',
  run:function(){ var a=by(S.data.accounts,S.sel.acct), c=a&&a.con[+S.sel.ci]; if(!c) return 'fail'; var was=c.n; var ok=write(function(){ c.n=S.sel.n.trim(); c.d=(S.sel.d||'').trim(); c.m=(S.sel.m||'').trim(); c.e=(S.sel.e||'').trim();
      S.data.lines.forEach(function(l){ if(l.acct===a.id&&l.contact.n===was){ l.contact={n:c.n,e:c.e,m:c.m}; } }); acctLog(a,'Contact edited: '+c.n,uname(S.user)); },'the contact'); if(!ok) return 'fail'; toast('Contact saved',''); }};
FLOWS.depContact={t:'Deactivate this contact', sub:'For someone who has left. They stay on every activity they appear in and are still found by search, marked inactive.',
  body:function(){ var a=by(S.data.accounts,S.sel.acct), c=a&&a.con[+S.sel.ci]; var ls=S.data.lines.filter(function(l){ return l.acct===a.id&&l.contact.n===(c&&c.n)&&!dead(l)&&l.stage<14; });
    return note('amber','','<b>'+esc(c?c.n:'')+'</b> is dimmed and marked <b>left</b>. They cannot be picked as the contact on a new line.'+(ls.length?' They are still the contact on '+plural(ls.length,'open line')+' — change it on the line.':''),'info'); },
  can:function(){return true;}, ok:'Deactivate',
  run:function(){ var a=by(S.data.accounts,S.sel.acct), c=a&&a.con[+S.sel.ci]; if(!c) return 'fail'; var ok=write(function(){ c.dep=1; acctLog(a,'Contact deactivated: '+c.n,uname(S.user)+' · left the company'); },'the contact'); if(!ok) return 'fail'; toast('Deactivated',c.n+' is marked as left.'); }};
function paintModalErrs(e){ ['m','e'].forEach(function(k){ var el=document.getElementById('f_'+k); if(!el) return; var lab=el.closest('.field'); if(!lab) return; var er=lab.querySelector('.err'); if(e[k]){ if(!er){ er=document.createElement('div'); er.className='err'; lab.appendChild(er); } er.textContent=e[k]; } else if(er) er.remove(); }); }
/* [stated 26 Sep · 1.8 §6] click to call from the rail writes the call on the account — no disposition,
   because there is no product line in context. The disposition is logged from a line. */
HANDLERS.push(function(t){ var x=t.closest('[data-acall]'); if(!x) return false; var a=by(S.data.accounts,x.dataset.acct), c=a&&a.con[+x.dataset.acall]; if(!c) return true;
  var ok=write(function(){ acctLog(a,'Call · '+c.n,uname(S.user)+' · '+c.m+' · click to call · from the contacts rail · no disposition — no product line in context','call'); },'the call');
  if(ok){ paint(); toast('Calling '+c.n,'Placed from your BimaKavach number. It is on the account’s activity; log an outcome from a product line if it was about one.'); } return true; });

/* ---------- the account's activity: the union of its lines' trails, each entry naming its line ---------- */
function acctActivity(a,u,kind){
  var ev=[]; (a.log||[]).forEach(function(e){ ev.push({at:e.at,t:e.t,m:e.m,k:e.kind||'sys',where:'Account'}); });
  oppsOfAcct(a.id).forEach(function(o){ (o.log||[]).forEach(function(e){ ev.push({at:e.at,t:e.t,m:e.m,k:'sys',where:o.id}); }); });
  linesOfAcct(a.id).forEach(function(l){ if(isRen(l)&&!isRmRole(u)) return; (l.log||[]).forEach(function(e){ ev.push({at:e.at,t:e.t,m:e.m,k:e.kind||'sys',where:l.product+' · '+l.id,line:l.id}); }); });
  if(kind) ev=ev.filter(function(e){ return actKindOf(e.k)===kind; });
  return ev.sort(function(x,y){return y.at-x.at;}); }
SCREENS.acct=function(){
  var a=by(S.data.accounts,S.route.id); if(!a) return SCREENS.notfound();
  if(a.merged){ var mm=by(S.data.accounts,a.merged); if(mm) { S.route.id=mm.id; a=mm; } }
  var u=me(); if(!canSeeAcct(a,u)) return noAccess('account');
  var tab=S.ui['atab_'+a.id]||'overview', opps=oppsOfAcct(a.id), ls=linesOfAcct(a.id), svc=svcOfAcct(a.id), live=a.pols.filter(function(p){return polActive(p);});
  var sharePan=S.data.accounts.filter(function(x){return x.id!==a.id&&!x.merged&&a.pan&&x.pan===a.pan;});
  /* [stated 23 Sep · 18.5 §2] renewals are the RM's book — sales never sees the tab or its lines */
  var seesRen=isRmRole(u);
  var renLines=renLinesOfAcct(a.id).filter(function(l){return !dead(l);});
  if(!seesRen){ ls=ls.filter(function(l){return !isRen(l);}); }
  var ol=ls.filter(openLine);
  var tabs=[['overview','Overview'],['opps','Opportunities']].concat(seesRen?[['ren','Renewals']]:[]).concat([['policies','Policies'],['svc','Servicing'],['comp','Compliance'],['profile','Profile'],['group','Group'],['activity','Activity']]);
  if(!tabs.some(function(t){return t[0]===tab;})) tab='overview';
  var why=whyMine(a,u.id), owner=a.own===u.id, body='';
  /* [stated 23 Sep] one row per policy: number, BK number, product, insurer, premium, SI, start, end, status, type */
  var polRow=function(p){ var st=polLive(p), ty=polType(p);
    return '<tr'+(polActive(p)?'':' class="dim"')+'><td class="id"><button class="link mono" data-go="policy" data-id="'+p.id+'">'+esc(p.pno||'awaited')+'</button></td><td class="mono">'+(p.bkno?esc(p.bkno):'<span class="meta">—</span>')+'</td><td class="nm">'+esc(p.p)+'</td><td>'+esc(p.ins)+'</td><td class="num">'+INR(p.pr)+'</td><td>'+esc(p.si||'—')+'</td><td style="white-space:nowrap">'+(p.issuing?'<span class="meta">to be confirmed</span>':esc(p.start?fmtD(p.start):'—'))+'</td><td style="white-space:nowrap">'+(p.issuing?'<span class="meta">—</span>':esc(p.exp?fmtD(p.exp):'—'))+'</td><td>'+chip(st.tx,st.tone,true,true)+(p.issuing?'<div class="sub">Awaiting policy copy</div>':'')+'</td><td>'+chip(ty,PTYPE[ty]||'neutral',false,true)+'</td>'+
    (owner?'<td class="right" style="white-space:nowrap">'+(polActive(p)&&!p.issuing?'<button class="btn sm" data-go="svcnew" data-pol="'+p.id+'" data-acct="'+a.id+'" data-kind="end">Endorse</button> ':'')+(!p.issuing?'<button class="btn sm ghost" data-go="svcnew" data-pol="'+p.id+'" data-acct="'+a.id+'" data-kind="clm">Claim</button>':'')+'</td>':'')+'</tr>'; };
  if(tab==='overview'){
    body='<div class="stat"><div class="s"><div class="lbl">Open lines</div><div class="v">'+ol.length+'</div></div><div class="s"><div class="lbl">Opportunities</div><div class="v">'+opps.length+'</div></div><div class="s"><div class="lbl">Policies in force</div><div class="v">'+live.filter(function(p){return !p.issuing;}).length+'</div></div><div class="s"><div class="lbl">Premium in force</div><div class="v">'+(premInForce(a)?INR(premInForce(a)):'—')+'</div></div><div class="s"><div class="lbl">Service tickets</div><div class="v">'+svc.filter(function(t){return !svcClosed(t);}).length+'</div></div></div>'+
      '';
  } else if(tab==='opps'){
    /* [stated 26 Sep · 1.7] each opportunity row opens out to its lines, with stage and owner */
    body='<div class="phhd"><div class="t">Opportunities</div><div class="a">'+plural(opps.length,'opportunity').replace('opportunitys','opportunities')+'</div></div><div class="mt12">'+(opps.length?'<div class="rowlist" style="border:1px solid var(--border);border-radius:12px">'+opps.sort(function(x,y){return y.created-x.created;}).map(function(o){ var st=oppStatus(o), lns=linesOfOpp(o.id), conf=lns.filter(confirmed).reduce(function(s,l){return s+premOf(l);},0);
        return '<details class="orow"><summary><div class="bd"><b>'+esc(oName(o))+'</b> '+chip(st.tx,st.tone,true,true)+'<div class="m2">'+esc(o.type)+' · '+esc(o.bt)+' · '+plural(lns.length,'line')+(conf?' · <span class="green">'+INR(conf)+' confirmed</span>':'')+'</div></div><span class="rf-open">Lines</span><button class="btn sm ghost" data-go="opp" data-id="'+o.id+'">Open</button></summary>'+
          '<div class="rowlist">'+lns.map(function(l){ return '<div class="row'+(dead(l)?' dim':'')+'" data-go="line" data-id="'+l.id+'"><div class="bd"><b>'+esc(l.product)+'</b> '+chip(stageName(l.stage),dead(l)?'red':'neutral',true,true)+(l.status!=='open'?' '+chip(statusTx(l),statusTone(l),false,true):'')+'<div class="m2">'+esc(l.id)+' · '+esc(uname(l.owner))+'</div></div><div class="rt">'+ic('chevright')+'</div></div>'; }).join('')+'</div></details>'; }).join('')+'</div>':empty('list','Nothing here yet','An account can exist before any sale — a provisional account from an enquiry, or a client handed over at payment.'))+'</div>'+
      (seesRen&&renLines.length?'<div class="meta mt8">A renewal creates no opportunity — the '+plural(renLines.length,'renewal line')+' on this account '+(renLines.length===1?'sits':'sit')+' on the <b>Renewals</b> tab.</div>':'');
  } else if(tab==='ren'){
    var renRows=renLines.slice().sort(function(x,y){ var p=renPolHit(x), q=renPolHit(y); return (p?p.p.exp:0)-(q?q.p.exp:0); });
    var payable=renRows.filter(function(l){return l.stage===9&&l.status==='open'&&l.pay==='pre'&&l.owner===u.id;});
    var sel=S.ui['rsel_'+a.id]||[]; sel=sel.filter(function(id){return payable.some(function(l){return l.id===id;});});
    var selTot=sel.reduce(function(t,id){return t+premOf(lineById(id));},0);
    body='<div class="phhd"><div class="t">Renewals</div><div class="a">'+plural(renRows.length,'renewal line')+'</div></div>'+
      '<div class="mt12">'+(renRows.length?'<div class="rowlist" style="border:1px solid var(--border);border-radius:12px">'+renRows.map(function(l){
        var pol=renPolHit(l), can=payable.indexOf(l)>=0, on=sel.indexOf(l.id)>=0, w=actingParty(l);
        var why_=l.stage===9&&l.status==='open'?(l.pay!=='pre'?'already on '+payRef(l):(l.owner!==u.id?uname(l.owner)+'’s line — requested separately':'')):'';
        var meta=esc(l.id)+' · '+esc(uname(l.owner))+' · waiting on '+esc(w);
        if(pol) meta+=' · renews '+esc(pol.p.pno||pol.p.bkno||'')+' · due <b'+(calDays(S.now,pol.p.exp)<=7?' class="red"':'')+'>'+esc(fmtD(pol.p.exp))+'</b>';
        return '<div class="row'+(on?' on':'')+'" data-go="line" data-id="'+l.id+'"><div class="bd"><b>'+esc(l.product)+'</b> '+prioBadge(l)+' '+chip(stageName(l.stage),l.stage>=SALES_STAGES?'green':(dead(l)?'red':'neutral'),true,true)+'<div class="m2">'+meta+'</div>'+(why_?'<div class="m2 meta">'+esc(why_)+'</div>':'')+'</div>'+
          '<div class="rt">'+(can?'<button class="btn sm'+(on?' primary':' ghost')+'" data-rentog="'+l.id+'" data-acct="'+a.id+'">'+ic(on?'check':'plus')+(on?'Selected':'Select')+'</button>':'')+ic('chevright')+'</div></div>';
      }).join('')+'</div>'
        :empty('refresh','Nothing here yet','A renewal line opens by itself 90 days before a policy expires, on the account’s RM.'))+'</div>'+
      (payable.length?'<div class="flex wrap mt12" style="gap:10px;align-items:center"><span class="meta">'+(sel.length?plural(sel.length,'line')+' selected · <b style="color:var(--ink)">'+INR(selTot)+'</b>':plural(payable.length,'line')+' at Purchase Requested — tick the ones to bill together')+'</span><span class="sp"></span>'+
        (sel.length?'<button class="btn ghost sm" data-renclear="'+a.id+'">Clear</button>':'')+
        '<button class="btn primary sm"'+(sel.length?' data-flow="pay" data-line="'+sel[0]+'"':' disabled title="Select at least one renewal line"')+'>'+ic('plus')+'Raise payment request</button></div>':'')+
      note('neutral','','A renewal never creates an opportunity — it is a product line on this account, carrying the policy it renews. One payment request can cover several of them. Sales does not see this section.','info');
  } else if(tab==='policies'){
    var pf=S.ui['apf_'+a.id]||'all', cnt=function(k){ return k==='all'?a.pols.length:a.pols.filter(function(p){return polType(p)===k;}).length; };
    var prows=a.pols.filter(function(p){return pf==='all'||polType(p)===pf;}).sort(function(x,y){return polStart(y)-polStart(x);});
    body='<div class="phhd"><div class="t">Policies</div><div class="a">'+live.length+' active · '+(a.pols.length-live.length)+' inactive</div></div>'+
      (a.pols.length?pills('apf_'+a.id,pf,[['all','All',cnt('all')],['Fresh','Fresh',cnt('Fresh')],['Cross-sell','Cross-sell',cnt('Cross-sell')],['Renewal','Renewal',cnt('Renewal')]])+
        (prows.length?'<div class="tw mt12"><table class="t"><thead><tr><th>Policy number</th><th>BK internal number</th><th>Product</th><th>Insurer</th><th class="num">Premium</th><th>Sum insured</th><th>Start</th><th>End</th><th>Status</th><th>Type</th>'+(owner?'<th></th>':'')+'</tr></thead><tbody>'+prows.map(polRow).join('')+'</tbody></table></div>'
          :'<div class="mt12">'+empty('shield','Nothing matches these filters','','<button class="btn sm" data-uiset="apf_'+a.id+'" data-uv="all">Clear filters</button>')+'</div>')
        +'<div class="meta mt8">The first policy booked on this account is <b>Fresh</b>, every policy after it is <b>Cross-sell</b>, and a policy produced by renewing an earlier one is <b>Renewal</b>. The type is written once and never changes. Open a policy number for its full record.</div>'
        : '<div class="mt12">'+empty('shield','Nothing here yet','A policy appears here when a line is paid. Until then the account is a prospect.')+'</div>');
  } else if(tab==='svc'){
    var tk=[]; ls.forEach(function(l){ ticketsOf(l).forEach(function(t){tk.push(t);}); });
    /* [stated 26 Sep · 1.7 / 13.4] anything with a query waiting on our reply is lifted to the top */
    var pend=svc.filter(function(t){ return svcNeed(t)&&!svcClosed(t); }), rest=svc.filter(function(t){ return pend.indexOf(t)<0; });
    var endo=rest.filter(function(t){return t.k==='end';}), clm=rest.filter(function(t){return t.k==='clm';});
    var rl=function(xs){ return '<div class="rowlist" style="border:1px solid var(--border);border-radius:12px">'+xs.map(svcRow).join('')+'</div>'; };
    body='<div class="phhd"><div class="t">Servicing</div>'+(owner?'<button class="btn sm" data-go="svcnew" data-acct="'+a.id+'">'+ic('plus')+'Raise a ticket</button>':'')+'</div>'+
      (pend.length?'<div class="h4 mt12 mb12">Pending on us '+chip(pend.length,'amber',false,true)+'</div>'+rl(pend):'')+
      '<div class="h4 mt16 mb12">Endorsements</div>'+(endo.length?rl(endo):'<div class="meta">None on this account.</div>')+
      '<div class="h4 mt16 mb12">Claims</div>'+(clm.length?rl(clm):'<div class="meta">None on this account.</div>')+
      '<div class="h4 mt16 mb12">Placement, payment and issuance</div>'+(tk.length?'<div class="rowlist" style="border:1px solid var(--border);border-radius:12px">'+tk.map(function(t){ return '<div class="row" data-go="ticket" data-id="'+t.id+'"><div class="bd"><b>'+esc(t.id)+'</b> '+chip(t.st,t.tone,true,true)+'<div class="m2">'+esc(t.ty)+' · '+esc(t.desk)+' · '+esc(t.line.product)+' · '+esc(t.line.id)+'</div></div><div class="rt">'+ic('chevright')+'</div></div>'; }).join('')+'</div>':'<div class="meta">No placement, payment or issuance tickets on this account’s lines.</div>');
  } else if(tab==='comp'){
    body=acctComplianceTab(a,u);
  } else if(tab==='profile'){
    var src=function(t,d){ return '<div class="meta">'+esc(t)+(d?' · '+esc(d):'')+'</div>'; };
    body=panelOr('profile_'+a.id,function(){ return '<div class="phhd"><div class="t">Profile</div><div class="a">'+(a.fin?'As of '+esc(a.fin.read)+', 10:00':'')+'</div></div>'+
      '<div class="kvgrid mt12">'+kv('Legal name',esc(a.n)+(a.nWas?'<div class="meta">Created as: '+esc(a.nWas)+'</div>':''))+
        kv('Trade / brand name',(a.trade?esc(a.trade):'<span class="meta">none on file</span>')+(owner?' <button class="quiet" data-flow="tradeName" data-acct="'+a.id+'">'+(a.trade?'Edit':'Add')+'</button>':''))+
        kv('Relationship type',(a.rel?esc(a.rel):'<span class="meta">not labelled</span>')+(owner?' <button class="quiet" data-flow="relType" data-acct="'+a.id+'">'+(a.rel?'Change':'Label it')+'</button>':'')+'<div class="meta">display only — it changes no key, group or match</div>')+
        kv('PAN',idShow(a,u,a.pan))+kv(a.sole||a.aad?'Aadhaar (proprietor)':'GSTIN',idShow(a,u,a.sole||a.aad?a.aad:a.gst))+kv('KYC',a.prov?chip('Provisional','amber',true,true)+' <span class="meta">needed before a payment request</span>':chip('Verified','green',true,true)+'<div class="meta">'+esc(kycLine(a))+'</div>')+
        kv('Registered office',esc(a.city||'—')+(a.st?', '+esc(a.st):''))+kv('Industry',esc(a.ind||'—'))+kv('Employees',esc(a.emp||'—'))+kv('Turnover',esc(a.to||'—')+(a.fin?src('Probe42',a.fin.read):''))+kv('Account owner',esc(uname(a.own)))+'</div>'+
      (a.prof?diamonds(true)+'<div class="h3">Risk</div><div class="kvgrid mt12">'+kv('Risk class',esc(a.prof.risk)+src('Bimanetra','computed '+(a.fin?a.fin.read:'')))+kv('Classification',esc(a.prof.cls)+src('Bimanetra','computed '+(a.fin?a.fin.read:'')))+kv('Exposure',esc(a.prof.exp)+src('Bimanetra','computed '+(a.fin?a.fin.read:'')))+'</div>':'')+
      (a.fin?diamonds(true)+'<div class="h3">Financials · '+esc(a.fin.yr)+'</div><div class="kvgrid mt12">'+kv('Revenue',esc(a.fin.rev)+src('Probe42',a.fin.read))+kv('Profit after tax',esc(a.fin.pat)+src('Probe42',a.fin.read))+kv('Net worth',esc(a.fin.net)+src('Probe42',a.fin.read))+kv('CIN','<span class="mono">'+esc(a.fin.cin)+'</span>'+src('Probe42',a.fin.read))+'</div>':''); });
  } else if(tab==='group'){
    /* [stated 26 Sep · 1.1 §8] the group is the PAN; sister companies come from Probe42, unlinked */
    body='<div class="phhd"><div class="t">Group</div><div class="a">'+(sharePan.length?'Business group · '+plural(sharePan.length+1,'account'):'One account under this PAN')+'</div></div>'+
      '<div class="h4 mt12 mb12">Same PAN, held in BimaSetu</div>'+(sharePan.length?'<div class="rowlist" style="border:1px solid var(--border);border-radius:12px">'+sharePan.map(function(x){ var vis=canSeeAcct(x,u); return '<div class="row"'+(vis?' data-go="acct" data-id="'+x.id+'"':'')+'><div class="bd"><b>'+esc(x.n)+'</b><div class="m2">GSTIN '+esc(idVisible(x,u)?x.gst:idMask(x.gst))+' · '+esc(x.st||'—')+(x.rel?' · '+esc(x.rel):'')+'</div></div><div class="rt">'+(vis?ic('chevright'):'<span class="meta">not yours to open</span>')+'</div></div>'; }).join('')+'</div>':'<div class="meta">No other GST registration under this PAN is in BimaSetu.</div>')+
      panelOr('probe_'+a.id,function(){ return '<div class="h4 mt16 mb12">Sister companies (Probe42)</div>'+(a.sis.length?'<div class="tw"><table class="t"><thead><tr><th>Entity</th><th>Relation</th><th>CIN</th><th>Industry</th><th>Turnover</th></tr></thead><tbody>'+a.sis.map(function(s){ return '<tr><td class="nm">'+esc(s.n)+'</td><td>'+esc(s.r)+'</td><td class="mono">'+esc(s.cin)+'</td><td>'+esc(s.ind)+'</td><td>'+esc(s.to)+'</td></tr>'; }).join('')+'</tbody></table></div><div class="meta mt8">Read from Probe42, as of '+esc(a.fin?a.fin.read:'—')+'. Read-only and unlinked: this list makes no claim about which of these are customers.</div>':'<div class="meta">Probe42 lists no related entities.</div>'); });
  } else if(tab==='activity'){
    var kf=S.ui['aak_'+a.id]||'', ev=acctActivity(a,u,kf);
    body='<div class="phhd"><div class="t">Activity</div><div class="a">every line’s trail, and the account’s own entries</div></div><div class="mt12">'+actFilterChips('aak_'+a.id,kf)+'</div>'+
      '<div class="mt12">'+(ev.length?'<ul class="tl">'+ev.slice(0,80).map(function(e){ return '<li><span class="dot'+(actKindOf(e.k)==='sys'?' sys':'')+'"></span><div class="bd"><b>'+esc(e.t)+'</b><div class="m">'+(e.line?'<button class="quiet" data-go="line" data-id="'+e.line+'">'+esc(e.where)+'</button>':esc(e.where))+' · '+esc(e.m||'')+' · '+esc(fmt(e.at))+'</div></div></li>'; }).join('')+'</ul>':empty('inbox',kf?'Nothing matches these filters':'Nothing here yet','',kf?'<button class="btn sm" data-uiset="aak_'+a.id+'" data-uv="">Clear filters</button>':''))+'</div>';
  }
  var sole=a.sole||(!!a.aad&&!a.gst);
  var keys=(a.pan?'<span class="mono">'+esc(idVisible(a,u)?a.pan:idMask(a.pan))+'</span>':'<span class="meta">no PAN</span>')+'<span class="sep">·</span>'+
    (sole?(a.aad?'<span class="mono">'+esc(idVisible(a,u)?a.aad:idMask(a.aad))+'</span>':'<span class="meta">no Aadhaar</span>'):(a.gst?'<span class="mono">'+esc(idVisible(a,u)?a.gst:idMask(a.gst))+'</span>':'<span class="meta">no GSTIN</span>'))+'<span class="meta">'+(sole?'PAN · Aadhaar':'PAN · GSTIN')+'</span>';
  var grpLine=sharePan.length?'<div class="metaline"><span class="meta">Business group:</span> <span>'+esc(shortName(a.n))+' — '+plural(sharePan.length+1,'account')+'</span>'+sharePan.map(function(x){ return '<span class="sep">·</span><span class="mono">'+esc(idVisible(x,u)?x.gst:idMask(x.gst))+'</span> <span>'+esc(x.st||'')+'</span>'; }).join('')+'</div>':'';
  var html='<div class="amain">'+
    '<div class="crumbs"><button data-go="accounts">Accounts</button>'+ic('chevright','ic14')+'<b>'+esc(a.n)+'</b></div>'+
    '<div class="hdrow"><div style="min-width:0"><div class="h1">'+esc(a.n)+'</div>'+
      '<div class="metaline"><span>'+esc(a.id)+'</span><span class="sep">·</span>'+(a.prov?chip('Provisional','amber',true,true):'<span title="'+esc(kycLine(a))+'">'+chip('Verified','green',true,true)+'</span>')+(a.rel?chip(a.rel,'neutral',false,true):'')+keys+'</div>'+
      '<div class="metaline one"><span>'+esc(a.city||'—')+'</span><span class="sep">·</span><span>Owner <b class="b">'+esc(uname(a.own))+'</b></span>'+(sharePan.length?'<span class="sep">·</span><span title="Same PAN, '+plural(sharePan.length+1,'account')+'">Group of '+(sharePan.length+1)+'</span>':'')+'</div></div><span class="sp"></span>'+
      '<div class="acts">'+(isMgrRole(u)&&inMyTeam(a.own,u)?'<button class="btn sm" data-flow="acctReassign" data-acct="'+a.id+'">Reassign</button>':'')+(a.prov&&onAcct(a,u)?'<button class="btn sm primary" data-flow="kyc" data-acct="'+a.id+'" data-line="">'+ic('shield')+'Get verified</button>':'')+'<button class="btn sm" data-flow="newOpp">'+ic('plus')+'New opportunity</button></div></div>'+
    (a.prov?'<div class="banner amber mt12">'+ic('alert','ic14')+'<span><b>Provisional</b> — '+(a.pan||a.gst?'PAN and GST documents not uploaded.':'no PAN or GST yet.')+' Needed before payment.</span><span class="sp"></span>'+(onAcct(a,u)?'<button class="btn sm" data-flow="kyc" data-acct="'+a.id+'" data-line="">Get verified</button>':'')+'</div>'
      :'')+
    (sole?'<div class="banner neutral mt12">'+ic('info','ic14')+'<span><b>Sole proprietor</b> — PAN + Aadhaar, no GST.</span></div>':'')+
    (!why?'<div class="banner neutral mt12">'+ic('eye','ic14')+'<span><b>You are not on this account.</b> '+esc(uname(a.own))+' owns it'+(ol.length?', and '+ol.map(function(l){return uname(l.owner);}).filter(function(v,i,arr){return arr.indexOf(v)===i;}).join(' and ')+' own'+(ol.length===1?'s':'')+' the open lines':'')+'. Read-only.</span></div>':'')+
    diamonds()+'<div class="tabs atabs">'+tabs.map(function(t){ var n=t[0]==='opps'?opps.length:(t[0]==='ren'?renLines.length:(t[0]==='policies'?a.pols.length:(t[0]==='svc'?svc.length:0))); return '<button data-uiset="atab_'+a.id+'" data-uv="'+t[0]+'"'+(tab===t[0]?' class="on"':'')+'>'+t[1]+(n?' ('+n+')':'')+'</button>'; }).join('')+'</div>'+
    '<div class="abody"><div class="card"><div class="cardb">'+body+'</div></div>'+contactsRail(a,u)+'</div></div>';
  return {sc:'Account', ctx:a.id, html:html};
};
function kycLine(a){ if(a.prov) return 'Provisional'; return (a.kycHow||'PAN and GST on file')+(a.kycBy?' · verified by '+(userById(a.kycBy)?uname(a.kycBy):a.kycBy):'')+(a.kycAt?' on '+fmtD(a.kycAt):''); }
FLOWS.tradeName={t:'Trade or brand name', sub:'The name the company uses day to day. It is searchable; it is never a key and never matched on.',
  body:function(){ var a=by(S.data.accounts,S.sel.acct); if(S.sel.tn===undefined) S.sel.tn=a.trade||''; return field('Trade / brand name',input('tn',S.sel.tn,'Sharma Steel'),'Leave blank to remove it. The legal name comes from the PAN and is not edited here.'); },
  can:function(){return true;}, ok:'Save',
  run:function(){ var a=by(S.data.accounts,S.sel.acct); var ok=write(function(){ a.trade=(S.sel.tn||'').trim(); acctLog(a,'Trade name '+(a.trade?'set to '+a.trade:'removed'),uname(S.user)); },'the name'); if(!ok) return 'fail'; toast('Saved',''); }};
var REL_TYPES=['GST Registration','Branch','Subsidiary','Sister','Parent'];
FLOWS.relType={t:'Relationship type', sub:'A label for display only. It changes nothing about keys, grouping, matching or visibility.',
  body:function(){ var a=by(S.data.accounts,S.sel.acct); return REL_TYPES.map(function(r){ return opt('data-pick="'+r+'"',(S.sel.d||a.rel)===r,r,''); }).join('')+opt('data-pick="none"',(S.sel.d||'')==='none','No label',''); },
  can:function(){return !!S.sel.d;}, ok:'Save',
  run:function(){ var a=by(S.data.accounts,S.sel.acct); var ok=write(function(){ a.rel=S.sel.d==='none'?'':S.sel.d; },'the label'); if(!ok) return 'fail'; toast('Saved',''); }};
/* ---------- Compliance documents ---------- */
function acctMandates(aid){ return (S.data.mandates||[]).filter(function(m){return m.acct===aid;}).sort(function(x,y){return y.signedAt-x.signedAt;}); }
function acctComplianceTab(a,u){
  var mine=onAcct(a,u), mds=acctMandates(a.id), c={acct:a.id}, by_=kycLine(a);
  var idRows=[
    ['PAN card', !!a.pan&&!a.prov, a.pan?idShow(a,u,a.pan)+' · the legal name on this account is the name on this card'+(a.prov?'':' · '+esc(by_)):'', 'asked at verification', c],
    ['GST certificate', !!a.gst&&!a.prov, a.gst?idShow(a,u,a.gst)+' · the ten characters inside it are the PAN':'', a.sole?'not applicable — Aadhaar stands in for it':'asked at verification', c]
  ];
  if(a.sole||a.aad){ idRows[1]=['Aadhaar', !!a.aad&&!a.prov, a.aad?idShow(a,u,a.aad)+' · proprietor — stands in for a registration certificate':'', 'sole proprietorship, so Aadhaar is accepted in place of GST', c]; }
  var held=idRows.filter(function(r){return r[1];}).length;
  return '<div class="phhd"><div class="t">Compliance documents</div><div class="a">'+(held+mds.length)+' on file</div></div>'+
    (a.prov?'<div class="mt12">'+note('amber','Provisional account','Missing: '+(a.sole?'the PAN card and Aadhaar':'the PAN card and the GST certificate (or Aadhaar, for a proprietor with no GST)')+'. A payment request cannot be raised until they are uploaded.'+(mine?' <button class="btn sm" data-flow="kyc" data-acct="'+a.id+'" data-line="">'+ic('shield')+'Get verified</button>':''),'alert')+'</div>':'')+
    '<div class="h4 mt16 mb8">Identity</div><div class="rowlist doclist">'+idRows.map(function(r){ return docRow(r[0],r[1],r[3],r[4],r[2]); }).join('')+'</div>'+
    '<div class="h4 mt16 mb8">Authority</div>'+
    (mds.length?'<div class="rowlist doclist">'+mds.map(function(m){ var live=mdLive(m);
        return '<div><div class="bd"><b>Mandate letter · '+esc(m.id)+'</b> '+chip(live?'Valid':'Expired',live?'green':'amber',true,true)+
          '<div class="m">Account level — every insurer, every policy. Signed by '+esc(m.by)+' on '+esc(fmtD(m.signedAt))+(m.until?' · valid until '+esc(fmtD(m.until)):'')+'</div></div>'+
          '<div class="rt">'+docBtns('Mandate letter',{acct:a.id,ref:m.id})+'</div></div>'; }).join('')+'</div>'
      :'<div class="rowlist doclist">'+docRow('Mandate letter',false,'not signed yet — asked on the first post-purchase ticket',{acct:a.id})+'</div>')+
    '<div class="meta mt12">One mandate covers the account — every insurer, every policy — and it is valid for one year from signature. Nothing is ever marked revoked.</div>'+
    '<div class="meta mt8">PAN, GSTIN and Aadhaar show in full only to the account owner and their manager'+(idVisible(a,u)?' — you are one of them':' — you see the last four characters')+'. The document images show as uploaded.</div>';
}
function svcRow(t){ var a=acctOf(t.acct), closed=t.stage==='Settled'||t.stage==='Completed'; var need=svcNeed(t);
  return '<div class="row" data-go="svctix" data-id="'+t.id+'"><div class="bd"><b>'+esc(t.id)+' · '+esc(t.sub)+'</b> '+chip(t.stage,closed?'green':(need?'amber':'violet'),true,true)+'<div class="m">'+esc(a?a.n:t.acct)+' · '+esc(t.prod)+' · '+esc(t.pol)+'</div><div class="m2">'+esc(t.k==='clm'?'Claim':'Endorsement'+(t.cat?' · '+t.cat:''))+' · raised '+esc(fmtD(t.raised))+' · waiting on '+esc(need?'you':t.wait)+'</div></div><div class="rt"><button class="btn sm" data-go="svctix" data-id="'+t.id+'">Open</button></div></div>'; }
