/* ==================================================================== *
 *  Opportunity — a container of product lines on one account
 * ==================================================================== */
function oppStatus(o){
  var ls=linesOfOpp(o.id); if(!ls.length) return {tx:'Open',tone:'green'};   /* an opportunity cannot exist without a product line — no Empty status [stated 23 Sep] */
  if(ls.some(function(l){return openLine(l)||l.status==='park';})) return {tx:'Open',tone:'green'};   /* [stated 26 Sep · 2.9] no Parked status */
  if(ls.every(function(l){return l.stage>=SALES_STAGES&&!dead(l);})) return {tx:'Won',tone:'green'};
  if(ls.some(function(l){return l.stage>=SALES_STAGES&&!dead(l);})) return {tx:'Part won',tone:'green'};
  return {tx:'Closed',tone:'red'};
}
function oppRow(o){
  var ls=linesOfOpp(o.id), st=oppStatus(o), conf=ls.filter(confirmed).reduce(function(s,l){return s+premOf(l);},0);
  return '<div class="row" data-go="opp" data-id="'+o.id+'"><div class="bd"><b>'+esc(oName(o))+'</b> '+chip(st.tx,st.tone,true,true)+'<div class="m2">'+esc(o.id)+' · '+plural(ls.length,'product line')+' · '+esc(o.bt)+' · '+esc(o.src)+' · created '+esc(fmtD(o.created))+(conf?' · <span class="green">'+INR(conf)+' confirmed</span>':'')+'</div></div><div class="rt">'+ic('chevright')+'</div></div>';
}
/* payment requests on an opportunity — one per PAY reference, read off the lines */
function oppPayReqs(o){ var m={}; linesOfOpp(o.id).forEach(function(l){ if(l.pay==='pre'||l.stage<9) return; var r=payRef(l); if(!m[r]) m[r]={ref:r,lines:[],amt:0,by:l.soldBy||l.owner,st:''}; m[r].lines.push(l); m[r].amt+=premOf(l); });
  return Object.keys(m).map(function(k){ var q=m[k], l=q.lines[0]; q.st=l.stage>=SALES_STAGES?'Paid':(l.pay==='back'?'Details returned':(l.pay==='shared'||l.stage===10?'Shared with client':'With Ops')); q.tone=q.st==='Paid'?'green':(q.st==='Details returned'?'amber':'violet'); return q; }); }
SCREENS.opp=function(){
  var o=by(S.data.opps,S.route.id); if(!o) return SCREENS.notfound();
  var a=acctOf(o.acct), u=me(); if(!canSeeAcct(a,u)) return noAccess('opportunity');
  var ls=linesOfOpp(o.id).sort(function(x,y){ return (dead(x)?1:0)-(dead(y)?1:0)||y.stage-x.stage; }), st=oppStatus(o);
  var conf=ls.filter(confirmed).reduce(function(s,l){return s+premOf(l);},0), est=ls.filter(function(l){return (openLine(l)||l.status==='park')&&!confirmed(l)&&premOf(l);}).reduce(function(s,l){return s+premOf(l);},0);
  var mineOn=ls.some(function(l){return l.owner===u.id;});
  var elig=ls.filter(function(l){return l.stage===9&&l.status==='open'&&l.pay==='pre';}), myElig=elig.filter(function(l){return l.owner===u.id;}), others=elig.filter(function(l){return l.owner!==u.id;});
  var reqs=oppPayReqs(o), prov=a.prov;
  var payWhy=prov?'The account is not KYC verified — PAN and GST are needed first.':(!myElig.length?(others.length?'None of the lines at Purchase Requested are yours.':'No line of yours is at Purchase Requested yet.'):'');
  var otherNames=others.map(function(l){return uname(l.owner);}).filter(function(v,i,arr){return arr.indexOf(v)===i;});
  /* O1 identity */
  var html='<div class="crumbs"><button data-go="pipeline">Pipeline</button>'+ic('chevright','ic14')+'<button data-go="acct" data-id="'+a.id+'">'+esc(a.n)+'</button>'+ic('chevright','ic14')+'<b>'+esc(o.id)+'</b></div>'+
    '<div class="hdrow"><div style="min-width:0"><div class="h1 trunc" title="'+esc(oName(o))+'">'+esc(oName(o))+'</div><div class="metaline"><span class="b">'+esc(a.n)+'</span><span class="sep">·</span><span>'+esc(o.type)+'</span><span class="sep">·</span><span>'+esc(o.bt)+'</span><span class="sep">·</span><span>Created '+esc(fmtD(o.created))+'</span><span class="sep">·</span>'+chip(st.tx,st.tone,true,true)+'</div></div><span class="sp"></span>'+
      '<div class="acts">'+(mineOn?addLineBtn(o):'')+'</div></div>'+
    (!mineOn?'<div class="banner neutral mt12">'+ic('lock','ic14')+'<span>You own none of the lines on this opportunity. It is read-only for you.</span></div>':'')+diamonds()+
    '<div class="gap12">'+
    /* O2 product lines */
    card('Product lines', '<div class="tw"><table class="t"><thead><tr><th>Product</th><th>Stage</th><th>Owner</th><th>Status</th><th class="num">Premium</th></tr></thead><tbody>'+ls.map(function(l){ return '<tr class="row'+(dead(l)?' dim':'')+'" data-go="line" data-id="'+l.id+'"><td class="nm">'+esc(l.product)+'<div class="sub">'+esc(l.id)+'</div></td><td>'+esc(stageName(l.stage))+'</td><td>'+esc(uname(l.owner))+'</td><td>'+statusPill(l)+'</td><td class="num">'+(confirmed(l)||l.stage>=SALES_STAGES?'<b class="b">'+INR(premOf(l))+'</b>':(premOf(l)?'<span class="meta">~'+INR(premOf(l))+' expected</span>':'<span class="meta">—</span>'))+'</td></tr>'; }).join('')+'</tbody>'+
      (ls.length>1?'<tfoot><tr><td class="nm" colspan="4">Total</td><td class="num">'+(conf?'<b class="b">'+INR(conf)+'</b> confirmed':'')+(conf&&est?'<br>':'')+(est?'<span class="meta">~'+INR(est)+' expected</span>':'')+(!conf&&!est?'<span class="meta">—</span>':'')+'</td></tr></tfoot>':'')+'</table></div>',
      '', {flush:true})+
    /* O3 payment requests */
    (reqs.length||elig.length?card('Payment requests',
      (reqs.length?reqs.map(function(q){ return '<div class="oreq"><div class="qc-ic">'+ic('wallet','ic20')+'</div><div class="bd"><b>'+esc(q.ref)+'</b> '+chip(q.st,q.tone,true,true)+'<div class="meta">'+q.lines.map(function(l){return esc(l.product);}).join(' · ')+' · '+INR(q.amt)+' · raised by '+esc(uname(q.by))+'</div></div><button class="btn sm ghost" data-go="ticket" data-id="'+esc(q.ref)+'">Open ticket</button></div>'; }).join(''):'')+
      (elig.length?'<div class="oreq"><div class="bd">'+(myElig.length?'<b>'+plural(myElig.length,'line')+' of yours ready</b><div class="meta">'+myElig.map(function(l){return esc(l.product)+' '+INR(premOf(l));}).join(' · ')+'</div>':'<div class="meta">'+esc(payWhy)+'</div>')+
        (otherNames.length?'<div class="meta mt4">'+esc(otherNames.join(', '))+'’s lines will be requested separately.</div>':'')+'</div>'+
        (mineOn?(payWhy?'<button class="btn sm" disabled title="'+esc(payWhy)+'">'+ic('wallet')+'Raise payment request</button>':'<button class="btn sm primary" data-flow="pay" data-comb="1" data-line="'+myElig[0].id+'">'+ic('wallet')+'Raise payment request</button>'):'')+'</div>'+(prov&&mineOn?'<div class="oreq"><div class="bd meta">'+esc(payWhy)+'</div>'+(onAcct(a,u)?'<button class="btn sm" data-flow="kyc" data-acct="'+a.id+'" data-line="">Get verified</button>':'')+'</div>':''):''),
      '',{flush:true}):'')+
    /* O4 account */
    card('Account','<div class="kvgrid">'+kv('Account','<button class="link" data-go="acct" data-id="'+a.id+'">'+esc(a.n)+'</button>')+kv('Identity',prov?chip('Provisional','amber',false,true)+(onAcct(a,u)?' <button class="link" data-flow="kyc" data-acct="'+a.id+'" data-line="">Get verified</button>':''):chip('Verified','green',false,true))+
      kv('Business group',(function(){ var g=S.data.accounts.filter(function(x){return x.id!==a.id&&x.pan&&x.pan===a.pan&&!x.merged;}); return g.length?esc(shortName(a.n))+' — '+plural(g.length+1,'account'):'<span class="meta">Standalone</span>'; })())+kv('Account owner',esc(uname(a.own)))+kv('Source',esc(o.src))+kv('Created by',esc(o.by==='system'?'Inbound · assignment rule':uname(o.by)))+'</div>')+
    /* O5 activity, folded */
    '<div class="card" style="padding:14px 16px"><div><details class="oact"><summary>'+ic('chevright','ic14')+'Activity <span class="meta">· '+plural(oppActs(o).length,'event')+' on the opportunity</span></summary><div class="mt8">'+(oppActs(o).length?'<ul class="tl">'+oppActs(o).map(function(e){ return '<li><span class="dot sys"></span><div class="bd"><b>'+esc(e.t)+'</b><div class="m">'+esc(e.m)+' · '+esc(fmt(e.at))+'</div></div></li>'; }).join('')+'</ul>':'<div class="meta">Nothing yet.</div>')+'</div></details></div></div>'+
    '</div>';
  return {sc:'Opportunity', ctx:o.id, html:html};
};
/* opportunity-level events only: created · line added · line closed · payment request raised · ownership moved */
function oppActs(o){ var out=(o.log||[]).slice();
  if(!out.some(function(e){return /^Opportunity created/.test(e.t);})) out.push({at:o.created,t:'Opportunity created',m:o.by==='system'?'Inbound · assignment rule':uname(o.by)});
  linesOfOpp(o.id).forEach(function(l){ (l.log||[]).forEach(function(e){ if(/^Payment ticket PAY-.* raised|^Owner changed|reassigned|Taken over|Handed back/.test(e.t)&&!out.some(function(x){return x.t===e.t&&x.at===e.at;})) out.push({at:e.at,t:e.t+' · '+l.product,m:e.m}); }); });
  return out.sort(function(a,b){return b.at-a.at;}); }
FLOWS.addLine={t:'Add a product line', sub:function(){ var o=by(S.data.opps,S.sel.opp); return 'On '+(o?o.id:'this opportunity')+'. You own the new line — adding it by hand never runs the assignment rule.'; },
  repaintOn:['product','con'],
  body:function(){ var o=by(S.data.opps,S.sel.opp), a=acctOf(o.acct), have=linesOfOpp(o.id).filter(function(l){return openLine(l)||l.status==='park';}).map(function(l){return l.product;});
    /* [stated 26 Sep · 3.6] products already open on this opportunity are not offered */
    var opts=[['','Choose a product']].concat(PRODUCTS.filter(function(p){ return have.indexOf(p)<0; }));
    var from=lineById(S.sel.from), act=a.con.filter(function(c){return !c.dep;});
    if(S.sel.con===undefined){ var dc=from&&from.contact&&act.some(function(c){return c.n===from.contact.n;})?from.contact.n:(act[0]?act[0].n:''); S.sel.con=dc; }
    var warn=S.sel.product?openProductWarn(a,S.sel.product,o.id):'';
    return field('Product',select('product',S.sel.product||'',opts))+(warn?'<div class="hint amber">'+esc(warn)+'</div>':'')+
      field('Contact for this line',act.length?select('con',S.sel.con,act.map(function(c){return [c.n,c.n+(c.d?' · '+c.d:'')];})):'<div class="meta">No active contacts on the account. Add one on the account first.</div>',from?'Defaults to the contact on '+from.product+'.':'The RFQ and payment details go to this person.'); },
  can:function(){ var o=by(S.data.opps,S.sel.opp); if(!o||!S.sel.product||!S.sel.con) return false; return !addLineWhy(o)&&!linesOfOpp(o.id).filter(function(l){return openLine(l)||l.status==='park';}).some(function(l){return l.product===S.sel.product;}); }, ok:'Add line',
  run:function(){ var o=by(S.data.opps,S.sel.opp), a=acctOf(o.acct), c=a.con.filter(function(x){return x.n===S.sel.con&&!x.dep;})[0]||{n:'',e:'',m:''}; var l;
    var ok=write(function(){ l={id:'OP-'+(S.data.seq.line++),opp:o.id,acct:a.id,product:S.sel.product,owner:S.user,stage:1,status:'open',reason:'',revisit:0,att:0,rate:null,rfq:{st:'none',src:'',at:0},req:null,round:1,qAns:0,obj:'',qsel:[],picked:'',prem:0,ins:'',pay:'pre',amt:0,payLines:[],enteredAt:S.now,createdAt:S.now,assignedAt:S.now,src:o.src||'',contact:{n:c.n||'',e:c.e||'',m:c.m||''},log:[{at:S.now,t:'Product line created',m:uname(S.user)+' · added by hand on '+o.id,sys:0,kind:'sys'}]};
      S.data.lines.push(l); oppLog(o,'Product line added · '+l.product,uname(S.user)+' · '+l.id); fireRules(l,'stage',1); },'the new line');
    if(!ok) return 'fail'; closeFlow(); go('line',{id:l.id}); toast('Line added — '+l.product,'At New Lead · yours. The new-lead rule has set its task.'); return 'stay'; }};
HANDLERS.push(function(t){ var x=t.closest('[data-flow="addLine"]'); if(!x) return false; if(x.disabled) return true; openFlow('addLine',{opp:x.dataset.opp,acct:x.dataset.acct,from:x.dataset.from||''}); return true; });

/* ---------- opportunities list (left pane) ---------- */
/* [stated 23 Sep] scoped by the view switch — scopeIds() is just the person in My view, the whole team in Team view */
function oppMine(o,u){ var ids=scopeIds(u);
  if(ids.indexOf(o.by)>=0) return true;
  if(linesOfOpp(o.id).some(function(l){return ids.indexOf(l.owner)>=0;})) return true;
  if(u.role==='rm'||u.role==='rmhead'){ var a=acctOf(o.acct); return !!a&&ids.indexOf(a.own)>=0; }
  return false; }
SCREENS.opps=function(){
  var u=me(), f=S.ui.of||'mine', st=S.ui.ost||'open', q=(S.ui.oq||'').toLowerCase();
  var all=S.data.opps.slice(), mine=all.filter(function(o){return oppMine(o,u);});
  all=all.filter(function(o){ return canSeeAcct(acctOf(o.acct),u); }); var base=f==='mine'?mine:all;
  var rows=base.filter(function(o){ var s=oppStatus(o).tx;
    if(st==='open'&&s!=='Open') return false; if(st==='won'&&!(s==='Won'||s==='Part won')) return false; if(st==='closed'&&!(s==='Closed'||s==='Parked')) return false;
    if(q&&(oName(o)+' '+o.id+' '+acctName({acct:o.acct})+' '+o.src+' '+o.type+' '+o.bt).toLowerCase().indexOf(q)<0) return false; return true;
  }).sort(function(x,y){return y.created-x.created;});
  var cnt=function(k){ return base.filter(function(o){ var s=oppStatus(o).tx; return k==='all'||(k==='open'&&s==='Open')||(k==='won'&&(s==='Won'||s==='Part won'))||(k==='closed'&&(s==='Closed'||s==='Parked')); }).length; };
  var html='<div class="hdrow"><div><div class="h1">Opportunities</div><div class="sub">'+(teamView(u)?'Your team’s opportunities.':'Opportunities you created or own a line on.')+'</div></div></div>'+diamonds()+
    '<div class="flex wrap" style="gap:10px">'+pills('of',f,[['mine',teamView(u)?'My team':'Mine',mine.length],['all','All',all.length]])+'<span class="sp"></span>'+pills('ost',st,[['open','Open',cnt('open')],['won','Won',cnt('won')],['closed','Closed',cnt('closed')],['all','All',cnt('all')]])+'</div>'+
    '<div class="flex wrap mt12" style="gap:10px"><input class="inp" id="oq" data-ui="oq" style="max-width:320px" placeholder="Opportunity, account, source or type" value="'+esc(S.ui.oq||'')+'">'+(q?'<button class="btn ghost sm" data-clearof="1">Clear</button>':'')+'</div>'+
    '<div class="card mt16" style="overflow:hidden">'+(rows.length?'<div class="tw"><table class="t"><thead><tr><th>Opportunity</th><th>Status</th><th>Account</th><th>Type</th><th>Lines</th><th class="num">Confirmed</th><th>Created</th></tr></thead><tbody>'+
      rows.map(function(o){ var ls=linesOfOpp(o.id), s=oppStatus(o), open=ls.filter(openLine), won=ls.filter(function(l){return l.stage>=SALES_STAGES&&!dead(l);}), conf=ls.filter(confirmed).reduce(function(a,l){return a+premOf(l);},0), a=acctOf(o.acct);
        var sum=ls.length?open.map(function(l){return esc(l.product.split(' ')[0].replace(/’s$/,''))+' — '+esc(STAGES[l.stage-1].t);}).slice(0,4).join(', ')+(open.length>4?', +'+(open.length-4)+' more':'')+(won.length?(open.length?', ':'')+won.length+' won':''):'<span class="meta">no lines yet</span>';
        return '<tr class="row'+(s.tx==='Closed'?' dim':'')+'" data-go="opp" data-id="'+o.id+'"><td class="nm one" style="max-width:250px" title="'+esc(oName(o))+'">'+esc(oName(o))+'<div class="sub">'+esc(o.id)+' · '+esc(o.src)+'</div></td><td>'+chip(s.tx,s.tone,true,true)+'</td><td class="one" title="'+esc(a?a.n:o.acct)+'">'+esc(a?shortName(a.n):o.acct)+(a&&a.prov?'<div class="sub">provisional</div>':'')+'</td><td style="white-space:nowrap">'+esc(o.type)+'<div class="sub">'+esc(o.bt)+'</div></td><td><b>'+ls.length+'</b></td><td class="num">'+(conf?'<b class="b">'+INR(conf)+'</b>':'<span class="meta">—</span>')+'</td><td style="white-space:nowrap">'+esc(fmtD(o.created))+'<div class="sub">'+esc(o.by==='system'?'inbound':uname(o.by))+'</div></td></tr>'; }).join('')+'</tbody></table></div>'
      : empty('handshake', q?'No opportunity matches':'No opportunities here', q?'Try the account name or the opportunity ID.':(f==='mine'?'You get one when you create it, or when a line on it is yours.':'Opportunities arrive from inbound enquiries or New opportunity.'), q?'<button class="btn" data-clearof="1">Clear</button>':''))+'</div>';
  return {sc:'Opportunities', html:html};
};
HANDLERS.push(function(t){ if(t.closest('[data-clearof]')){ S.ui.oq=''; paint(); return true; } return false; });
