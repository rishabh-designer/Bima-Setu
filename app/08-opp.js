/* ==================================================================== *
 *  Opportunity — a container of product lines on one account
 * ==================================================================== */
function oppStatus(o){
  var ls=linesOfOpp(o.id); if(!ls.length) return {tx:'Open',tone:'green'};   /* an opportunity cannot exist without a product line — no Empty status [stated 23 Sep] */
  if(ls.some(openLine)) return {tx:'Open',tone:'green'};
  if(ls.some(function(l){return l.status==='park';})) return {tx:'Parked',tone:'amber'};
  if(ls.every(function(l){return l.stage>=SALES_STAGES&&!dead(l);})) return {tx:'Won',tone:'green'};
  if(ls.some(function(l){return l.stage>=SALES_STAGES&&!dead(l);})) return {tx:'Part won',tone:'green'};
  return {tx:'Closed',tone:'red'};
}
function oppRow(o){
  var ls=linesOfOpp(o.id), st=oppStatus(o), conf=ls.filter(confirmed).reduce(function(s,l){return s+premOf(l);},0);
  return '<div class="row" data-go="opp" data-id="'+o.id+'"><div class="bd"><b>'+esc(o.name)+'</b> '+chip(st.tx,st.tone,true,true)+'<div class="m2">'+esc(o.id)+' · '+plural(ls.length,'product line')+' · '+esc(o.bt)+' · '+esc(o.src)+' · created '+esc(fmtD(o.created))+(conf?' · <span class="green">'+INR(conf)+' confirmed</span>':'')+'</div></div><div class="rt">'+ic('chevright')+'</div></div>';
}
SCREENS.opp=function(){
  var o=by(S.data.opps,S.route.id); if(!o) return SCREENS.notfound();
  var a=acctOf(o.acct), ls=linesOfOpp(o.id).sort(function(x,y){return y.stage-x.stage;}), u=me(), st=oppStatus(o);
  var open=ls.filter(openLine), won=ls.filter(function(l){return l.stage>=SALES_STAGES&&!dead(l);}), conf=ls.filter(confirmed).reduce(function(s,l){return s+premOf(l);},0), est=open.filter(function(l){return !confirmed(l);}).reduce(function(s,l){return s+premOf(l);},0);
  var atNine=ls.filter(function(l){return l.stage===9&&l.status==='open'&&l.pay==='pre';}), payable=atNine.filter(function(l){return l.owner===u.id;});
  var requested=ls.filter(function(l){return l.stage>=9&&l.status==='open'&&l.pay!=='pre';});
  /* [stated 23 Sep] a product line can only be added while the opportunity is open */
  var canAdd=u.role!=='cs', addOk=canAdd&&st.tx==='Open';
  var addBtn=canAdd?(addOk?'<button class="btn sm" data-flow="addLine" data-acct="'+a.id+'" data-opp="'+o.id+'">'+ic('plus')+'Add product line</button>'
    :'<button class="btn sm" disabled title="'+esc('A product line can only be added while the opportunity is open. This one reads '+st.tx.toLowerCase()+'.')+'">'+ic('plus')+'Add product line</button>'):'';
  var html='<div class="crumbs"><button data-go="accounts">Accounts</button>'+ic('chevright','ic14')+'<button data-go="acct" data-id="'+a.id+'">'+esc(a.n)+'</button>'+ic('chevright','ic14')+'<b>'+esc(o.id)+'</b></div>'+
    '<div class="hdrow"><div><div class="h1">'+esc(o.name)+'</div><div class="metaline"><span class="b">'+esc(a.n)+'</span><span class="sep">·</span><span>'+esc(o.id)+'</span><span class="sep">·</span>'+chip(st.tx,st.tone,true,true)+chip(o.type,'neutral',false,true)+chip(o.bt,'neutral',false,true)+'</div></div><span class="sp"></span>'+
      '<div class="acts">'+(u.role!=='cs'?'<button class="btn sm'+(payable.length?' primary':'')+'" data-flow="pay" data-line="'+(payable[0]?payable[0].id:'')+'"'+(payable.length?'':' disabled title="'+esc(atNine.length?'Confirmed lines here are owned by '+atNine.map(function(l){return uname(l.owner);}).filter(function(v,i,arr){return arr.indexOf(v)===i;}).join(', ')+' — they raise the request':(requested.length?'Payment request already raised — see the ticket on the line':'Active once a product line reaches Purchase Requested'))+'"')+'>'+ic('wallet')+'Payment</button>':'')+addBtn+'</div></div>'+diamonds()+
    '<div class="stat" style="margin-bottom:16px"><div class="s"><div class="lbl">Product lines</div><div class="v">'+ls.length+'</div></div><div class="s"><div class="lbl">Open</div><div class="v">'+open.length+'</div></div><div class="s"><div class="lbl">Won</div><div class="v">'+won.length+'</div></div><div class="s"><div class="lbl">Confirmed premium</div><div class="v">'+(conf?INR(conf):'—')+'</div></div><div class="s"><div class="lbl">Still estimated</div><div class="v meta" style="font-weight:600">'+(est?INR(est):'—')+'</div></div></div>'+
    '<div class="gap12">'+
    card('Product lines', ls.length
      ? '<div class="tw"><table class="t"><thead><tr><th>Product</th><th>Owner</th><th>Stage</th><th>Waiting on</th><th class="num">Premium</th><th>In stage</th></tr></thead><tbody>'+ls.map(function(l){ var w=actingParty(l); return '<tr class="row'+(dead(l)?' dim':'')+'" data-go="line" data-id="'+l.id+'"><td class="nm">'+esc(l.product)+'<div class="sub">'+esc(l.id)+(l.rate===1?' · DAU':(l.rate===0?' · placement':''))+'</div></td><td>'+esc(uname(l.owner))+'</td><td>'+chip(stageName(l.stage),l.stage===14?'green':(l.stage>=SALES_STAGES?'violet':(dead(l)?'red':(l.status==='park'?'amber':'neutral'))),true,true)+(l.status!=='open'?'<div class="sub">'+esc(statusTx(l))+'</div>':'')+'</td><td>'+chip(w,waitTone(w),false,true)+'</td><td class="num">'+(confirmed(l)?'<b class="b">'+INR(premOf(l))+'</b>':'<span class="meta">'+INR(premOf(l))+' est.</span>')+'</td><td>'+(l.stage===14?'—':plural(daysInStage(l),'day'))+'</td></tr>'; }).join('')+'</tbody></table></div>'
      : empty('list','No product lines yet','An opportunity is only a container. Add the first product line and the stage spine begins on it.',addOk?'<button class="btn" data-flow="addLine" data-acct="'+a.id+'" data-opp="'+o.id+'">'+ic('plus')+'Add product line</button>':''),
      '', {flush:true, sub:'the stage lives here, one per product'})+
    card('Captured at creation','<div class="kvgrid">'+kv('Account','<button class="link" data-go="acct" data-id="'+a.id+'">'+esc(a.n)+'</button>'+(a.prov?' '+chip('Provisional','amber',false,true):' '+chip('Verified','green',false,true)))+kv('Type',esc(o.type))+kv('Business type',esc(o.bt))+kv('Source',esc(o.src))+kv('Created',esc(fmtD(o.created))+' · '+esc(o.by==='system'?'inbound, assigned by rule':uname(o.by)))+kv('Decision maker',a.con[0]?esc(a.con[0].n+', '+a.con[0].d):'—')+'</div>')+
    '</div>';
  return {sc:'Opportunity', ctx:o.id, html:html};
};
FLOWS.addLine={t:'Add a product line', sub:function(){ var o=by(S.data.opps,S.sel.opp); return 'On '+(o?o.name:'this opportunity')+'. You own the new line — adding it by hand never triggers the assignment rule.'; },
  repaintOn:['product','con'],
  body:function(){ var o=by(S.data.opps,S.sel.opp), a=acctOf(o.acct), have=linesOfOpp(o.id).filter(openLine).map(function(l){return l.product;});
    var opts=[['','Choose a product']].concat(PRODUCTS.map(function(p){ return [p,p+(have.indexOf(p)>=0?' — already open here':'')]; }));
    var dup=S.sel.product&&have.indexOf(S.sel.product)>=0;
    return field('Product',select('product',S.sel.product||'',opts),'',dup?'An open '+S.sel.product+' line already exists on this opportunity. Work that one, or close it first.':'')+
      (S.sel.product?note('neutral','','Whether it is rated by the system (DAU) or quoted by placement is decided when the requirement is captured — not now.','info'):'')+
      field('Contact for this line',select('con',S.sel.con||(a.con[0]?a.con[0].n:''),a.con.map(function(c){return [c.n,c.n+' · '+c.d];})),'The RFQ and payment details go to this person. Add people on the account.')+
      field('Source',select('src',S.sel.src||o.src||SRCS[0],SRCS.concat(o.src&&SRCS.indexOf(o.src)<0?[o.src]:[]))); },
  can:function(){ var o=by(S.data.opps,S.sel.opp); if(!o||!S.sel.product) return false; return !linesOfOpp(o.id).filter(openLine).some(function(l){return l.product===S.sel.product;}); }, ok:'Add line',
  run:function(){ var o=by(S.data.opps,S.sel.opp), a=acctOf(o.acct), c=a.con.filter(function(x){return x.n===(S.sel.con||(a.con[0]||{}).n);})[0]||a.con[0]||{n:'',e:'',m:''}; var l;
    var ok=write(function(){ l={id:'OP-'+(S.data.seq.line++),opp:o.id,acct:a.id,product:S.sel.product,owner:S.user,stage:1,status:'open',reason:'',revisit:0,att:0,rate:null,rfq:{st:'none',src:'',at:0},req:null,round:1,qAns:0,obj:'',qsel:[],picked:'',prem:0,ins:'',pay:'pre',amt:0,payLines:[],enteredAt:S.now,createdAt:S.now,assignedAt:S.now,src:S.sel.src||o.src||'',contact:{n:c.n||'',e:c.e||'',m:c.m||''},log:[{at:S.now,t:'Product line created',m:uname(S.user)+' · added by hand',sys:0,kind:'sys'}]};
      S.data.lines.push(l); fireRules(l,'stage',1); },'the new line');
    if(!ok) return 'fail'; closeFlow(); go('line',{id:l.id}); toast('Line added — '+l.product,'At New Lead · yours. The new-lead rule has set its task.'); return 'stay'; }};
HANDLERS.push(function(t){ var x=t.closest('[data-flow="addLine"]'); if(!x) return false; openFlow('addLine',{opp:x.dataset.opp,acct:x.dataset.acct}); return true; });

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
  var base=f==='mine'?mine:all;
  var rows=base.filter(function(o){ var s=oppStatus(o).tx;
    if(st==='open'&&s!=='Open') return false; if(st==='won'&&!(s==='Won'||s==='Part won')) return false; if(st==='closed'&&!(s==='Closed'||s==='Parked')) return false;
    if(q&&(o.name+' '+o.id+' '+acctName({acct:o.acct})+' '+o.src+' '+o.type+' '+o.bt).toLowerCase().indexOf(q)<0) return false; return true;
  }).sort(function(x,y){return y.created-x.created;});
  var cnt=function(k){ return base.filter(function(o){ var s=oppStatus(o).tx; return k==='all'||(k==='open'&&s==='Open')||(k==='won'&&(s==='Won'||s==='Part won'))||(k==='closed'&&(s==='Closed'||s==='Parked')); }).length; };
  var html='<div class="hdrow"><div><div class="h1">Opportunities</div><div class="sub">One per account per sale — a container of product lines. '+(teamView(u)?(u.role==='rmhead'?'Your team’s are the ones on your RMs’ accounts.':'Your team’s are the ones they created or own a line on.'):(u.role==='rm'||u.role==='rmhead'?'Yours are the ones on accounts you own, plus any you created or own a line on.':'Yours are the ones you created or own a line on.'))+' The stage lives on each line; open a row to see them.</div></div></div>'+diamonds()+
    '<div class="flex wrap" style="gap:10px">'+pills('of',f,[['mine',teamView(u)?'My team':'Mine',mine.length],['all','All',all.length]])+'<span class="sp"></span>'+pills('ost',st,[['open','Open',cnt('open')],['won','Won',cnt('won')],['closed','Closed or parked',cnt('closed')],['all','All',cnt('all')]])+'</div>'+
    '<div class="flex wrap mt12" style="gap:10px"><input class="inp" id="oq" data-ui="oq" style="max-width:320px" placeholder="Opportunity, account, source or type" value="'+esc(S.ui.oq||'')+'">'+(q?'<button class="btn ghost sm" data-clearof="1">Clear</button>':'')+'</div>'+
    '<div class="card mt16" style="overflow:hidden">'+(rows.length?'<div class="tw"><table class="t"><thead><tr><th>Opportunity</th><th>Status</th><th>Account</th><th>Type</th><th>Lines</th><th class="num">Confirmed</th><th>Created</th></tr></thead><tbody>'+
      rows.map(function(o){ var ls=linesOfOpp(o.id), s=oppStatus(o), open=ls.filter(openLine), won=ls.filter(function(l){return l.stage>=SALES_STAGES&&!dead(l);}), conf=ls.filter(confirmed).reduce(function(a,l){return a+premOf(l);},0), a=acctOf(o.acct);
        var sum=ls.length?open.map(function(l){return esc(l.product.split(' ')[0].replace(/’s$/,''))+' — '+esc(STAGES[l.stage-1].t);}).slice(0,4).join(', ')+(open.length>4?', +'+(open.length-4)+' more':'')+(won.length?(open.length?', ':'')+won.length+' won':''):'<span class="meta">no lines yet</span>';
        return '<tr class="row'+(s.tx==='Closed'?' dim':'')+'" data-go="opp" data-id="'+o.id+'"><td class="nm">'+esc(o.name)+'<div class="sub">'+esc(o.id)+' · '+esc(o.src)+'</div></td><td>'+chip(s.tx,s.tone,true,true)+'</td><td>'+esc(a?a.n:o.acct)+(a&&a.prov?'<div class="sub">provisional</div>':'')+'</td><td>'+esc(o.type)+'<div class="sub">'+esc(o.bt)+'</div></td><td><b>'+ls.length+'</b> <span class="meta">'+sum+'</span></td><td class="num">'+(conf?'<b class="b">'+INR(conf)+'</b>':'<span class="meta">—</span>')+'</td><td>'+esc(fmtD(o.created))+'<div class="sub">'+esc(o.by==='system'?'inbound':uname(o.by))+'</div></td></tr>'; }).join('')+'</tbody></table></div>'
      : empty('handshake', q?'No opportunity matches':'No opportunities here', q?'Try the account name or the opportunity ID.':(f==='mine'?'You get one when you create it, or when a line on it is yours.':'Opportunities arrive from inbound enquiries or New opportunity.'), q?'<button class="btn" data-clearof="1">Clear</button>':''))+'</div>';
  return {sc:'Opportunities', html:html};
};
HANDLERS.push(function(t){ if(t.closest('[data-clearof]')){ S.ui.oq=''; paint(); return true; } return false; });
