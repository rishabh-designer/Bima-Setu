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
/* [stated 23 Sep] scoped by the view switch — scopeIds() is just the person in My view, the whole team in Team view */
function acctInvolved(a,uid){ var ids=scopeIds(userById(uid));
  if(ids.indexOf(a.own)>=0) return true;
  return linesOfAcct(a.id).some(function(l){return ids.indexOf(l.owner)>=0;}); }
function svcOfAcct(aid){ return S.data.svc.filter(function(t){return t.acct===aid;}); }
function polState(p){ if(p.expired||p.exp<S.now) return {tx:'Expired',tone:'red'}; if(p.issuing) return {tx:'Issuing',tone:'violet'}; var d=daysBetween(S.now,p.exp); if(d<=30) return {tx:'Expires in '+d+' d',tone:'red'}; if(d<=90) return {tx:'Expires in '+d+' d',tone:'amber'}; return {tx:'In force',tone:'green'}; }
function premInForce(a){ return a.pols.filter(function(p){return !(p.expired||p.exp<S.now);}).reduce(function(s,p){return s+(+p.pr||0);},0); }

SCREENS.accounts=function(){
  var u=me(), f=S.ui.af||'mine', q=(S.ui.aq||'').toLowerCase().replace(/\s+/g,''), st=S.ui.ast||'', kyc=S.ui.akyc||'';
  var all=S.data.accounts.slice(), mine=all.filter(function(a){return acctInvolved(a,u.id);});
  var pl=function(x){return String(x||'').toLowerCase().replace(/\s+/g,'');};
  var rows=(f==='mine'?mine:all).filter(function(a){
    if(st&&a.st!==st) return false; if(kyc==='v'&&a.prov) return false; if(kyc==='p'&&!a.prov) return false;
    if(q&&!(pl(a.n).indexOf(q)>=0||pl(a.pan).indexOf(q)>=0||pl(a.gst).indexOf(q)>=0||pl(a.city).indexOf(q)>=0||a.con.some(function(c){return pl(c.n).indexOf(q)>=0||pl(c.m).indexOf(q)>=0;}))) return false; return true;
  }).sort(function(x,y){ return acctOpenLines(y).length-acctOpenLines(x).length || x.n.localeCompare(y.n); });
  var states=[]; all.forEach(function(a){ if(a.st&&states.indexOf(a.st)<0) states.push(a.st); }); states.sort();
  var filtered=!!(q||st||kyc);
  var html='<div class="hdrow"><div><div class="h1">Accounts</div><div class="sub">One account per legal entity, matched on PAN and GSTIN — never on name. '+(teamView(u)?(u.role==='rmhead'?'Your team’s are the ones an RM of yours owns.':'Your team’s are the ones they own or sell on.'):(u.role==='rm'||u.role==='rmhead'?'Yours are the ones handed over at payment, and any you are selling on.':'Yours are the ones where you own the account or a product line on it.'))+'</div></div></div>'+diamonds()+
    pills('af',f,[['mine',teamView(u)?'My team’s':(u.role==='rm'||u.role==='rmhead'?'My accounts':'Mine'),mine.length],['all','All',all.length]])+
    '<div class="flex wrap mt12" style="gap:10px"><input class="inp" id="aq" data-ui="aq" style="max-width:300px" placeholder="Name, PAN, GSTIN, city, contact or phone" value="'+esc(S.ui.aq||'')+'">'+
      '<select class="sel" data-uisel="ast" style="max-width:200px"><option value="">All states</option>'+states.map(function(s){return '<option'+(st===s?' selected':'')+'>'+esc(s)+'</option>';}).join('')+'</select>'+
      '<select class="sel" data-uisel="akyc" style="max-width:200px"><option value="">Verified and provisional</option><option value="v"'+(kyc==='v'?' selected':'')+'>Verified only</option><option value="p"'+(kyc==='p'?' selected':'')+'>Provisional only</option></select>'+
      (filtered?'<button class="btn ghost sm" data-clearaf="1">Clear filters</button>':'')+'</div>'+
    '<div class="card mt16" style="overflow:hidden">'+(rows.length?'<div class="tw"><table class="t"><thead><tr><th>Account</th><th>KYC</th><th>City</th><th>Industry</th><th>Owner</th><th class="num">Open lines</th><th class="num">Policies</th></tr></thead><tbody>'+
      rows.map(function(a){ var ol=acctOpenLines(a).length, live=a.pols.filter(function(p){return !(p.expired||p.exp<S.now);}).length; return '<tr class="row" data-go="acct" data-id="'+a.id+'"><td class="nm">'+esc(a.n)+'<div class="sub">'+esc(a.id)+(a.grp&&a.grp!=='—'?' · '+esc(a.grp):'')+'</div></td><td>'+(a.prov?chip('Provisional','amber',false,true):chip('Verified','green',false,true))+'</td><td>'+esc(a.city||'—')+'</td><td>'+esc(a.ind||'—')+'</td><td>'+esc(uname(a.own))+'</td><td class="num">'+(ol||'<span class="meta">0</span>')+'</td><td class="num">'+(live||'<span class="meta">0</span>')+'</td></tr>'; }).join('')+'</tbody></table></div>'
      : empty('building', filtered?'No account matches':'No accounts here yet', filtered?'Check the spelling, or search by PAN or GSTIN — the name on the account may differ from the trading name.':(u.role==='rm'?'Accounts arrive here when a line is paid and handed over.':'An account is created the moment an opportunity is — from an inbound enquiry or <b>New opportunity</b>.'), filtered?'<button class="btn" data-clearaf="1">Clear filters</button>':''))+'</div>';
  return {sc:'Accounts', html:html};
};
HANDLERS.push(function(t){ if(t.closest('[data-clearaf]')){ S.ui.aq='';S.ui.ast='';S.ui.akyc=''; paint(); return true; } return false; });
/* [stated 23 Sep] ticking renewal lines on the account, to bill several on one payment request */
HANDLERS.push(function(t){
  var x=t.closest('[data-rentog]');
  if(x){ var k='rsel_'+x.dataset.acct, cur=(S.ui[k]||[]).slice(), id=x.dataset.rentog, i=cur.indexOf(id);
    if(i>=0) cur.splice(i,1); else cur.push(id); S.ui[k]=cur; paint(); return true; }
  x=t.closest('[data-renclear]'); if(x){ S.ui['rsel_'+x.dataset.renclear]=[]; paint(); return true; }
  return false;
});

SCREENS.acct=function(){
  var a=by(S.data.accounts,S.route.id); if(!a) return SCREENS.notfound();
  var u=me(), tab=S.ui['atab_'+a.id]||'overview', opps=oppsOfAcct(a.id), ls=linesOfAcct(a.id), ol=ls.filter(openLine), pl_=ls.filter(postLine), svc=svcOfAcct(a.id), live=a.pols.filter(function(p){return !(p.expired||p.exp<S.now);});
  var sharePan=S.data.accounts.filter(function(x){return x.id!==a.id&&a.pan&&x.pan===a.pan;}), grp=S.data.accounts.filter(function(x){return x.id!==a.id&&a.grp&&a.grp!=='—'&&x.grp===a.grp;});
  /* [stated 23 Sep] renewals are the RM's book. They sit in their own section, they are out of
     Opportunities, and sales — executive or manager — never sees either the tab or its contents. */
  var seesRen=(u.role==='rm'||u.role==='rmhead');
  var renLines=renLinesOfAcct(a.id).filter(function(l){return !dead(l);});
  /* [stated 23 Sep] a renewal is a product line, so nothing to strip out of Opportunities —
     there are no renewal opportunities. Sales simply does not see the renewal lines. */
  if(!seesRen){ ls=ls.filter(function(l){return !isRen(l);}); ol=ls.filter(openLine); pl_=ls.filter(postLine); }
  var tabs=[['overview','Overview'],['opps','Opportunities']].concat(seesRen?[['ren','Renewals']]:[]).concat([['policies','Policies'],['svc','Servicing'],['comp','Compliance'],['profile','Profile'],['group','Group']]);
  if(!tabs.some(function(t){return t[0]===tab;})) tab='overview';
  var mineHere=acctInvolved(a,u.id), body='';
  /* [stated 23 Sep] one row per policy: number, product, insurer, premium, SI, start, end,
     Active / Inactive, and the policy type. The number opens Policy 360. */
  var polRow=function(p){ var st=polLive(p), ty=polType(p);
    return '<tr'+(polActive(p)?'':' class="dim"')+'><td class="id"><button class="link mono" data-go="policy" data-id="'+p.id+'">'+esc(p.pno||'awaited')+'</button><div class="sub">'+(p.bkno?'BK '+esc(p.bkno):'<span class="meta">no BK number</span>')+'</div></td><td class="nm">'+esc(p.p)+'</td><td>'+esc(p.ins)+'</td><td class="num">'+INR(p.pr)+'</td><td>'+esc(p.si||'—')+'</td><td style="white-space:nowrap">'+esc(p.start?fmtD(p.start):'—')+'</td><td style="white-space:nowrap">'+esc(p.exp?fmtD(p.exp):'—')+'</td><td>'+chip(st.tx,st.tone,true,true)+(p.issuing?'<div class="sub">policy copy pending</div>':'')+'</td><td>'+chip(ty,PTYPE[ty]||'neutral',false,true)+'</td>'+
    (a.own===u.id?'<td class="right" style="white-space:nowrap"><button class="btn sm" data-go="svcnew" data-pol="'+p.id+'" data-acct="'+a.id+'" data-kind="end"'+(polActive(p)?'':' disabled title="Expired policies cannot be endorsed"')+'>Endorse</button> <button class="btn sm ghost" data-go="svcnew" data-pol="'+p.id+'" data-acct="'+a.id+'" data-kind="clm">Claim</button></td>':'')+'</tr>'; };
  if(tab==='overview'){
    body='<div class="stat"><div class="s"><div class="lbl">Open lines</div><div class="v">'+ol.length+'</div></div><div class="s"><div class="lbl">Opportunities</div><div class="v">'+opps.length+'</div></div><div class="s"><div class="lbl">Policies in force</div><div class="v">'+live.length+'</div></div><div class="s"><div class="lbl">Premium in force</div><div class="v">'+(premInForce(a)?INR(premInForce(a)):'—')+'</div></div><div class="s"><div class="lbl">Service tickets</div><div class="v">'+svc.filter(function(t){return t.stage!=='Settled'&&t.stage!=='Completed';}).length+'</div></div></div>'+
      diamonds()+'<div class="flex"><div class="h3">Contacts</div><span class="sp"></span>'+(u.role!=='rm'||a.own===u.id?'<button class="btn sm" data-flow="addContact" data-acct="'+a.id+'">'+ic('plus')+'Add contact</button>':'')+'</div>'+
      '<div class="rowlist mt8" style="border:1px solid var(--border);border-radius:12px">'+(a.con.length?a.con.map(function(c){ return '<div><div class="bd"><b>'+esc(c.n)+'</b>'+(c.dm?' '+chip('Decision maker','violet',false,true):'')+(c.dep?' '+chip('Left the company','red',false,true):'')+'<div class="m">'+esc(c.d||'—')+'</div><div class="m2">'+esc(c.m||'—')+(c.e?' · '+esc(c.e):'')+'</div></div></div>'; }).join(''):'<div><div class="bd meta">No contact on the account. Add one — the RFQ and payment details need someone to go to.</div></div>')+'</div>';
      /* [stated 23 Sep] Overview is the five counts and the contacts, and nothing else.
         Product lines live on Opportunities and Renewals; the post-purchase ticket on Servicing;
         each was a second copy of a list that already has a tab of its own. */
  } else if(tab==='opps'){
    body='<div class="phhd"><div class="t">Opportunities</div><div class="a">'+plural(opps.length,'opportunity').replace('opportunitys','opportunities')+'</div></div><div class="mt12">'+(opps.length?'<div class="rowlist" style="border:1px solid var(--border);border-radius:12px">'+opps.sort(function(x,y){return y.created-x.created;}).map(oppRow).join('')+'</div>':empty('list','No opportunities','An account can exist before any sale — a provisional account from an enquiry, or a client handed over at payment.'))+'</div>'+
      (seesRen&&renLines.length?'<div class="meta mt8">A renewal creates no opportunity — the '+plural(renLines.length,'renewal line')+' on this account '+(renLines.length===1?'sits':'sit')+' on the <b>Renewals</b> tab.</div>':'')+
      note('neutral','','New opportunity is global — the button at the top. Enter this account’s PAN and it matches here; the name fills itself.'+(u.role==='rm'?' A cross-sell on an account you own is yours to sell; a renewal opens itself 90 days before the policy expires.':''),'info');
  } else if(tab==='ren'){
    /* [stated 23 Sep] every renewal product line on this account, soonest to expire first.
       Lines at Purchase Requested can be ticked and raised on one payment request. */
    var renRows=renLines.slice().sort(function(x,y){ var p=renPolHit(x), q=renPolHit(y); return (p?p.p.exp:0)-(q?q.p.exp:0); });
    var payable=renRows.filter(function(l){return l.stage===9&&l.status==='open'&&l.pay==='pre'&&l.owner===u.id;});
    var sel=S.ui['rsel_'+a.id]||[]; sel=sel.filter(function(id){return payable.some(function(l){return l.id===id;});});
    var selTot=sel.reduce(function(t,id){return t+premOf(lineById(id));},0);
    body='<div class="phhd"><div class="t">Renewals</div><div class="a">'+plural(renRows.length,'renewal line')+'</div></div>'+
      '<div class="mt12">'+(renRows.length?'<div class="rowlist" style="border:1px solid var(--border);border-radius:12px">'+renRows.map(function(l){
        var pol=renPolHit(l), can=payable.indexOf(l)>=0, on=sel.indexOf(l.id)>=0;
        var meta=esc(l.id)+' · '+esc(uname(l.owner))+' · opened '+esc(fmtD(l.createdAt));
        if(pol) meta+=' · renews '+esc(pol.p.id)+' · due <b'+(calDays(S.now,pol.p.exp)<=7?' class="red"':'')+'>'+esc(fmtD(pol.p.exp))+'</b>';
        return '<div class="row'+(on?' on':'')+'" data-go="line" data-id="'+l.id+'"><div class="bd"><b>'+esc(l.product)+'</b> '+chip(stageName(l.stage),l.stage>=SALES_STAGES?'green':(dead(l)?'red':'neutral'),true,true)+(l.pay==='ticket'?' '+chip('Payment raised','violet',false,true):'')+'<div class="m2">'+meta+'</div></div>'+
          '<div class="rt">'+(can?'<button class="btn sm'+(on?' primary':' ghost')+'" data-rentog="'+l.id+'" data-acct="'+a.id+'">'+ic(on?'check':'plus')+(on?'Selected':'Select')+'</button>':'')+ic('chevright')+'</div></div>';
      }).join('')+'</div>'
        :empty('refresh','No renewal open on this account','A renewal line opens by itself 90 days before a policy expires, on the account\u2019s RM. Nothing is renewing inside that window.'))+'</div>'+
      (payable.length?'<div class="flex wrap mt12" style="gap:10px;align-items:center"><span class="meta">'+(sel.length?plural(sel.length,'line')+' selected · <b style="color:var(--ink)">'+INR(selTot)+'</b>':plural(payable.length,'line')+' at Purchase Requested — tick the ones to bill together')+'</span><span class="sp"></span>'+
        (sel.length?'<button class="btn ghost sm" data-renclear="'+a.id+'">Clear</button>':'')+
        '<button class="btn primary sm"'+(sel.length?' data-flow="pay" data-line="'+sel[0]+'"':' disabled title="Select at least one renewal line"')+'>'+ic('plus')+'Raise payment request</button></div>':'')+
      note('neutral','','A renewal never creates an opportunity — it is a product line on this account, carrying the policy it renews. One payment request can cover several of them. Sales does not see this section.','info');
  } else if(tab==='policies'){
    /* [stated 23 Sep] the Fresh / Cross-sell / Renewal split, as a filter over one table */
    var pf=S.ui['apf_'+a.id]||'all', cnt=function(k){ return k==='all'?a.pols.length:a.pols.filter(function(p){return polType(p)===k;}).length; };
    var prows=a.pols.filter(function(p){return pf==='all'||polType(p)===pf;}).sort(function(x,y){return polStart(y)-polStart(x);});
    body='<div class="phhd"><div class="t">Policies</div><div class="a">'+live.length+' active · '+(a.pols.length-live.length)+' inactive</div></div>'+
      (a.pols.length?pills('apf_'+a.id,pf,[['all','All',cnt('all')],['Fresh','Fresh',cnt('Fresh')],['Cross-sell','Cross-sell',cnt('Cross-sell')],['Renewal','Renewal',cnt('Renewal')]])+
        (prows.length?'<div class="tw mt12"><table class="t"><thead><tr><th>Policy number<div class="sub">BK internal number</div></th><th>Product</th><th>Insurer</th><th class="num">Premium</th><th>Sum insured</th><th>Start</th><th>End</th><th>Status</th><th>Type</th>'+(a.own===u.id?'<th></th>':'')+'</tr></thead><tbody>'+prows.map(polRow).join('')+'</tbody></table></div>'
          :'<div class="mt12">'+empty('shield','No '+esc(pf.toLowerCase())+' policy on this account','The first policy booked on an account is Fresh, every one after it is Cross-sell, and a policy produced by renewing an earlier one is Renewal.')+'</div>')
        +'<div class="meta mt8">The first policy booked on this account is <b>Fresh</b>, every policy after it is <b>Cross-sell</b>, and a policy produced by renewing an earlier one is <b>Renewal</b>. The type is written once and never changes. Open a policy number for its full record.</div>'
        +(a.pols.some(function(p){return p.issuing;})?'<div class="meta mt8">A policy marked <b>policy copy pending</b> is paid and on cover — the copy is still with the insurer, so its number and period are provisional. Its Documents section says what is outstanding.</div>':'')
        : '<div class="mt12">'+empty('shield','No policies yet','A policy appears here when a line is paid. Until then the account is a prospect.')+'</div>');
  } else if(tab==='svc'){
    var tk=[]; ls.forEach(function(l){ ticketsOf(l).forEach(function(t){tk.push(t);}); });
    body='<div class="phhd"><div class="t">Servicing</div>'+(a.own===u.id?'<button class="btn sm" data-go="svcnew" data-acct="'+a.id+'">'+ic('plus')+'Raise a ticket</button>':'')+'</div>'+
      '<div class="h4 mt12 mb12">Endorsements and claims</div>'+(svc.length?'<div class="rowlist" style="border:1px solid var(--border);border-radius:12px">'+svc.map(svcRow).join('')+'</div>':'<div class="meta">None on this account.'+(u.role==='rm'&&a.pols.length?' Raise one from a policy.':'')+'</div>')+
      '<div class="h4 mt16 mb12">Placement and payment</div>'+(tk.length?'<div class="rowlist" style="border:1px solid var(--border);border-radius:12px">'+tk.map(function(t){ return '<div class="row" data-go="ticket" data-id="'+t.id+'"><div class="bd"><b>'+esc(t.id)+'</b> '+chip(t.st,t.tone,true,true)+'<div class="m2">'+esc(t.ty)+' · '+esc(t.desk)+' · '+esc(t.line.product)+' · '+esc(t.line.id)+'</div></div><div class="rt">'+ic('chevright')+'</div></div>'; }).join('')+'</div>':'<div class="meta">No placement or payment tickets on this account’s lines.</div>');
  } else if(tab==='comp'){
    /* [stated 24 Sep] Compliance documents — every identity and authority document held against the
       account in one place: PAN, GST, Aadhaar where it applies, and the mandate letters. */
    body=acctComplianceTab(a,u);
  } else if(tab==='profile'){
    body='<div class="phhd"><div class="t">Profile</div><div class="a">'+(a.fin?'Probe42 · read '+esc(a.fin.read):'')+'</div></div>'+
      '<div class="kvgrid mt12">'+kv('Legal name',esc(a.n)+(a.nWas?'<div class="meta">read from the PAN card at verification · was “'+esc(a.nWas)+'”</div>':''))+kv('PAN',idShow(a,u,a.pan))+kv('GSTIN',idShow(a,u,a.gst))+(a.aad?kv('Aadhaar (proprietor)',idShow(a,u,a.aad)):'')+kv('KYC',a.prov?chip('Provisional','amber',true,true)+' <span class="meta">needed before a payment request</span>':chip('Verified','green',true,true))+kv('Registered office',esc(a.city||'—')+(a.st?', '+esc(a.st):''))+kv('Industry',esc(a.ind||'—'))+kv('Employees',esc(a.emp||'—'))+kv('Turnover',esc(a.to||'—'))+kv('Group',esc(a.grp||'—'))+kv('Account owner',esc(uname(a.own)))+'</div>'+
      (a.prof?diamonds(true)+'<div class="h3">Risk</div><div class="kvgrid mt12">'+kv('Risk class',esc(a.prof.risk))+kv('Classification',esc(a.prof.cls))+kv('Exposure',esc(a.prof.exp))+'</div>':'')+
      (a.fin?diamonds(true)+'<div class="h3">Financials · '+esc(a.fin.yr)+'</div><div class="kvgrid mt12">'+kv('Revenue',esc(a.fin.rev))+kv('Profit after tax',esc(a.fin.pat))+kv('Net worth',esc(a.fin.net))+kv('CIN','<span class="mono">'+esc(a.fin.cin)+'</span>')+'</div>':'')+
      (a.sole?note('neutral','Sole proprietorship','No CIN and no MCA filing. PAN belongs to the proprietor; Aadhaar stands in for a registration certificate.','info'):'');
  } else if(tab==='group'){
    body='<div class="phhd"><div class="t">Group</div><div class="a">'+esc(a.grp&&a.grp!=='—'?a.grp:'No group on file')+'</div></div>'+
      (sharePan.length?'<div class="mt12">'+note('violet','Same PAN, different registration','<b>'+sharePan.map(function(x){return esc(x.n);}).join(', ')+'</b> share'+(sharePan.length===1?'s':'')+' this PAN — the same company registered in another state. They are separate accounts; the GSTIN tells them apart.')+'</div>':'')+
      '<div class="h4 mt12 mb12">Accounts in the CRM</div>'+((sharePan.length||grp.length)?'<div class="rowlist" style="border:1px solid var(--border);border-radius:12px">'+sharePan.concat(grp.filter(function(x){return sharePan.indexOf(x)<0;})).map(function(x){ return '<div class="row" data-go="acct" data-id="'+x.id+'"><div class="bd"><b>'+esc(x.n)+'</b><div class="m2">'+esc(x.id)+' · '+esc(x.city||'—')+' · '+plural(acctOpenLines(x).length,'open line')+' · owner '+esc(uname(x.own))+'</div></div><div class="rt">'+ic('chevright')+'</div></div>'; }).join('')+'</div>':'<div class="meta">No other account in the CRM shares this PAN or group.</div>')+
      '<div class="h4 mt16 mb12">Related entities · MCA filings</div>'+(a.sis.length?'<div class="tw"><table class="t"><thead><tr><th>Entity</th><th>Relation</th><th>CIN</th><th>Industry</th><th>Turnover</th></tr></thead><tbody>'+a.sis.map(function(s){ var inCrm=S.data.accounts.filter(function(x){return x.fin&&x.fin.cin===s.cin;})[0]; return '<tr'+(inCrm?' class="row" data-go="acct" data-id="'+inCrm.id+'"':'')+'><td class="nm">'+esc(s.n)+(inCrm?' '+chip('In CRM','green',false,true):'')+'</td><td>'+esc(s.r)+'</td><td class="mono">'+esc(s.cin)+'</td><td>'+esc(s.ind)+'</td><td>'+esc(s.to)+'</td></tr>'; }).join('')+'</tbody></table></div><div class="meta mt8">A related entity is a lead, not an account. Nothing is created until someone opens an opportunity for it.</div>':'<div class="meta">Probe42 lists no related entities.</div>');
  }
  var html='<div class="crumbs"><button data-go="accounts">Accounts</button>'+ic('chevright','ic14')+'<b>'+esc(a.n)+'</b></div>'+
    '<div class="hdrow"><div><div class="h1">'+esc(a.n)+'</div><div class="metaline"><span>'+esc(a.id)+'</span><span class="sep">·</span>'+(a.prov?chip('Provisional','amber',true,true):chip('Verified','green',true,true))+(a.pan?'<span class="mono">'+esc(idVisible(a,u)?a.pan:idMask(a.pan))+'</span>':'<span class="meta">no PAN</span>')+(a.gst?'<span class="sep">·</span><span class="mono">'+esc(idVisible(a,u)?a.gst:idMask(a.gst))+'</span>':'')+'<span class="sep">·</span><span>'+esc(a.city||'—')+(a.ind?' · '+esc(a.ind):'')+'</span><span class="sep">·</span><span>owner '+esc(uname(a.own))+'</span></div></div><span class="sp"></span>'+
      /* [stated 24 Sep] a provisional account can be verified from the account itself, by whoever
         is on it — the RM who owns it included. PAN plus GST, or PAN plus Aadhaar for a proprietor. */
      '<div class="acts">'+(a.prov&&(mineHere||isMgrRole(u))?'<button class="btn sm primary" data-flow="kyc" data-acct="'+a.id+'" data-line="">'+ic('shield')+'Get verified</button>':'')+'</div></div>'+
    (a.prov?'<div class="banner amber mt12">'+ic('alert','ic14')+'<span><b>Provisional</b> — created without PAN and GST. Everything up to a quote works; the payment request is the gate. Upload the documents under <b>Compliance</b>, or press <b>Get verified</b>.</span></div>':'')+
    (!mineHere&&!isMgrRole(u)?'<div class="banner neutral mt12">'+ic('eye','ic14')+'<span>You are not on this account — '+esc(uname(a.own))+' owns it'+(ol.length?', '+ol.map(function(l){return uname(l.owner);}).filter(function(v,i,arr){return arr.indexOf(v)===i;}).join(' and ')+' own'+(ol.length===1?'s':'')+' the open lines':'')+'. You can read it and open a new opportunity on it.</span></div>':'')+
    diamonds()+'<div class="tabs atabs">'+tabs.map(function(t){ var n=t[0]==='opps'?opps.length:(t[0]==='ren'?renLines.length:(t[0]==='policies'?a.pols.length:(t[0]==='svc'?svc.length:0))); return '<button data-uiset="atab_'+a.id+'" data-uv="'+t[0]+'"'+(tab===t[0]?' class="on"':'')+'>'+t[1]+(n?' ('+n+')':'')+'</button>'; }).join('')+'</div>'+
    '<div class="card"><div class="cardb">'+body+'</div></div>';
  return {sc:'Account', ctx:a.id, html:html};
};
/* ---------- Compliance documents ---------- */
/* [stated 24 Sep] one section on the account carrying GST, PAN, Aadhaar and the mandate letters,
   each to view and download. What is not on file says who it is waiting on. */
function acctMandates(aid){ return (S.data.mandates||[]).filter(function(m){return m.acct===aid;}).sort(function(x,y){return y.signedAt-x.signedAt;}); }
function acctComplianceTab(a,u){
  var mine=(a.own===u.id)||isMgrRole(u), mds=acctMandates(a.id), c={acct:a.id};
  var idRows=[
    ['PAN card', !!a.pan, a.pan?idShow(a,u,a.pan)+' · the legal name on this account is the name on this card':'', 'asked at verification', c],
    ['GST certificate', !!a.gst, a.gst?idShow(a,u,a.gst)+' · the ten characters inside it are the PAN':'', 'asked at verification', c]
  ];
  if(a.sole||a.aad) idRows.push(['Aadhaar', !!a.aad, a.aad?idShow(a,u,a.aad)+' · proprietor — stands in for a registration certificate':'', 'sole proprietorship, so Aadhaar is accepted in place of GST', c]);
  var held=idRows.filter(function(r){return r[1];}).length;
  return '<div class="phhd"><div class="t">Compliance documents</div><div class="a">'+(held+mds.length)+' on file</div></div>'+
    (a.prov?'<div class="mt12">'+note('amber','Provisional account','PAN and GST are not on file, so a payment request cannot be raised. Uploading them verifies the account — and the legal name is then read off the PAN.'+(mine?' <button class="btn sm" data-flow="kyc" data-acct="'+a.id+'" data-line="">'+ic('shield')+'Get verified</button>':''),'alert')+'</div>':'')+
    '<div class="h4 mt16 mb8">Identity</div><div class="rowlist doclist">'+idRows.map(function(r){ return docRow(r[0],r[1],r[3],r[4],r[2]); }).join('')+'</div>'+
    '<div class="h4 mt16 mb8">Authority</div>'+
    (mds.length?'<div class="rowlist doclist">'+mds.map(function(m){ var live=mdLive(m);
        return '<div><div class="bd"><b>Mandate letter · '+esc(m.id)+'</b> '+chip(live?'Valid':'Expired',live?'green':'amber',true,true)+
          '<div class="m">Account level — every insurer, every policy. Signed by '+esc(m.by)+' on '+esc(fmtD(m.signedAt))+(m.until?' · valid until '+esc(fmtD(m.until)):'')+'</div></div>'+
          '<div class="rt">'+docBtns('Mandate letter',{acct:a.id,ref:m.id})+'</div></div>'; }).join('')+'</div>'
      :'<div class="rowlist doclist">'+docRow('Mandate letter',false,'not signed yet — asked on the first post-purchase ticket',{acct:a.id})+'</div>')+
    '<div class="meta mt12">One mandate covers the account — every insurer, every policy — and it is valid for one year from signature. An existing account is checked against the register before the client is asked again, and nothing is ever marked revoked. <b>Mandate scope is still with Amogh</b> [open].</div>'+
    '<div class="meta mt8">PAN, GSTIN and Aadhaar are stored encrypted and shown in full only to the account owner'+(idVisible(a,u)?' — you own this account, so you see them':' — '+esc(uname(a.own))+' owns this account, so only the last four characters are shown here')+'.</div>';
}
FLOWS.addContact={t:'Add a contact', sub:'On the account. Every line on it can pick this person as its contact.',
  body:function(){ var e=contactErr(); return '<div class="fgrid">'+field('Name',input('n',S.sel.n,'Full name'))+field('Designation',input('d',S.sel.d,'CFO'))+'</div><div class="fgrid">'+field('Mobile',input('m',S.sel.m,'+91 98xxx xxxxx'),'',e.m)+field('Email',input('e',S.sel.e,'name@company.in'),'',e.e)+'</div>'+
    '<div class="field"><div class="lbl">Decision maker</div>'+seg('dm',[['n','No'],['y','Yes']],'n')+'</div>'; },
  can:function(){ var e=contactErr(); return !!(S.sel.n||'').trim()&&(!!(S.sel.m||'').trim()||!!(S.sel.e||'').trim())&&!Object.keys(e).length; }, ok:'Add contact',
  run:function(){ var a=by(S.data.accounts,S.sel.acct||S.route.id); if(!a) return 'fail'; var ok=write(function(){ if(S.sel.dm==='y') a.con.forEach(function(c){c.dm=0;}); a.con.push({n:S.sel.n.trim(),d:(S.sel.d||'').trim(),m:(S.sel.m||'').trim(),e:(S.sel.e||'').trim(),dm:S.sel.dm==='y'?1:0}); },'the contact'); if(!ok) return 'fail'; toast('Contact added',S.sel.n.trim()+' is on '+a.n+'.'); }};
function contactErr(){ var e={}, m=(S.sel.m||'').replace(/[\s\-]/g,''), em=(S.sel.e||'').trim(); if(m&&!/^(\+91)?[6-9]\d{9}$/.test(m)) e.m='An Indian mobile: 10 digits, optionally +91.'; if(em&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) e.e='Not an email address.'; return e; }
function svcRow(t){ var a=acctOf(t.acct), closed=t.stage==='Settled'||t.stage==='Completed'; var need=svcNeed(t);
  return '<div class="row" data-go="svctix" data-id="'+t.id+'"><div class="bd"><b>'+esc(t.id)+' · '+esc(t.sub)+'</b> '+chip(t.stage,closed?'green':(need?'amber':'violet'),true,true)+'<div class="m">'+esc(a?a.n:t.acct)+' · '+esc(t.prod)+' · '+esc(t.pol)+'</div><div class="m2">'+esc(t.k==='clm'?'Claim':'Endorsement'+(t.cat?' · '+t.cat:''))+' · raised '+esc(fmtD(t.raised))+' · waiting on '+esc(need?'you':t.wait)+'</div></div><div class="rt"><button class="btn sm" data-go="svctix" data-id="'+t.id+'">Open</button></div></div>'; }
