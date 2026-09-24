/* ==================================================================== *
 *  Product line workspace — the screen a sales executive lives in
 * ==================================================================== */
function FL(){ return lineById(S.sel.line||S.route.id); }
function wr(fn,label){ return write(fn,label)?undefined:'fail'; }
function stageTrack(l){
  /* Before payment: the selling steps only — the RM's steps are not shown yet, and once the route is
     known the steps it skips are removed, not struck through. From Payment Completed: the selling
     phase collapses to one "Sold" block and the RM's post-purchase steps take the bar. */
  var w=actingParty(l), paid=l.stage>=SALES_STAGES;
  var cap= l.stage===14?'Issued — Policy Copy Sent to Client':(dead(l)?statusTx(l)+' at '+stageName(l.stage):stageName(l.stage)+' · waiting on '+w);
  var side= (l.renews&&!paid?'Renewal · ':'')+(paid ? 'Owned by the RM since payment · moved by the post-purchase ticket'+(l.iss?' '+l.iss.id:'')
    : (l.renews ? 'RFQ, then placement — a renewal never goes to the rater'
    : (l.rate===1?'DAU — priced by the rater, no RFQ':(l.rate===0?(l.rfq&&l.rfq.direct?'Non-DAU — floated straight to placement':'Non-DAU — RFQ, then placement'):'DAU or non-DAU is decided when the requirement is captured'))));
  var step=function(s){ var c='step'; if(s.n<l.stage) c+=' done'; else if(s.n===l.stage) c+=(dead(l)?' now dead':' now'); return '<div class="'+c+'" title="'+esc(s.s)+'"><div class="b"></div><div class="t">'+esc(s.t)+'</div></div>'; };
  var seller=l.soldBy?uname(l.soldBy):(paid?'sales':uname(l.owner));
  var head='<div class="stagecard"><div class="cap"><b>'+esc(cap)+'</b><span class="sp"></span><span class="meta">'+esc(side)+'</span></div>';
  if(!paid){
    var vis=STAGES.slice(0,SALES_STAGES).filter(function(s){ return !skipped(l,s.n); });
    return head+'<div class="track"><div class="phase sales solo"><div class="ph-h">Selling <b>'+esc(seller)+'</b></div><div class="ph-steps" style="grid-template-columns:repeat('+vis.length+',minmax(0,1fr));min-width:'+(vis.length*60)+'px">'+vis.map(step).join('')+'</div></div></div></div>';
  }
  return head+'<div class="track"><div class="phase soldc"><div class="ph-h">Selling <b>'+esc(seller)+'</b></div>'+
      '<div class="soldblk" title="Selling done"><div class="b"></div><div class="t">'+ic('check','ic14')+'Sold · Payment Completed</div>'+(l.paidAt?'<div class="d">Paid '+esc(fmtD(l.paidAt))+'</div>':'')+'</div></div>'+
    '<div class="hand"><span>→ RM</span><i></i></div>'+
    '<div class="phase post wide"><div class="ph-h">Post-purchase <b>'+esc(uname(l.owner))+'</b></div><div class="ph-steps">'+STAGES.slice(SALES_STAGES).map(step).join('')+'</div></div></div></div>';
}
function clockCard(l){
  var w=actingParty(l), d=daysInStage(l), tone= dead(l)?'neutral':(w==='Us'?(d>=QUIET_DAYS?'red':'blue'):(daysQuiet(l)>=QUIET_DAYS?'red':'blue'));
  if(l.stage===14) tone='green';
  var head= l.stage===14?'Issued':(dead(l)?statusTx(l):(l.status==='park'?'Parked':plural(d,'day')+' in stage'));
  var pct=Math.min(100,Math.round(d/QUIET_DAYS*100));
  return '<div class="clock '+tone+'"><div class="top"><span>Stage clock</span><span class="own">'+avatar(uname(l.owner),true)+esc(uname(l.owner))+'</span></div>'+
    '<div class="hl">'+esc(head)+'</div><div class="bar"><i style="width:'+pct+'%"></i></div>'+
    '<div class="l1">'+esc(stageName(l.stage))+'<span> · waiting on '+esc(w)+'</span></div>'+
    '<div class="l2">'+ic('clock','ic14')+'Last activity '+esc(fmt(lastActivity(l)))+(daysQuiet(l)>=QUIET_DAYS?' · <span class="red">'+daysQuiet(l)+' days quiet</span>':'')+'</div></div>';
}
function naAttr(a,l){ if(a[0].indexOf('act:')===0) return 'data-rfqact="'+a[0].slice(4)+'" data-line="'+l.id+'"'; return a[0].indexOf('tab:')===0 ? 'data-uiset="ltab_'+l.id+'" data-uv="'+a[0].slice(4)+'"' : 'data-flow="'+a[0]+'" data-line="'+l.id+'"'; }
function naCard(l){
  var na=nextAction(l), mine=canAct(l), ro=readOnlyWhy(l);
  var prim=na.acts[0], secs=na.acts.slice(1);
  return '<div class="na '+na.tone+'"><div class="k" data-soft="1">'+esc(na.lab||'Next action')+'</div><div class="i" data-soft="1">'+esc(na.txt)+'</div><div class="w" data-soft="1"'+(na.why?'':' hidden')+'>'+esc(na.why||'')+'</div>'+
    /* [stated 23 Sep] no Log activity on the next-action card — the card is what to do next,
       and logging an activity is not it. It stays on the line's Activity tab. */
    (mine && prim ? '<div class="acts"><button class="btn primary lg full" '+naAttr(prim,l)+'>'+esc(prim[1])+'</button>'+
      (secs.length?'<div class="sec">'+secs.map(function(a){return '<button class="btn sm" '+naAttr(a,l)+'>'+esc(a[1])+'</button>';}).join('')+'</div>':'')+'</div>'
      : (mine ? '' : (ro?'<div class="w">'+ic('lock','ic14')+' '+esc(ro)+'</div>':'')))+
    '</div>';
}
function simsFor(l){
  if(!canAct(l)) return '';
  var b=[];
  if(l.stage===4&&l.rate===0){ b.push(simbtn('Open the client’s link','data-rfqact="client" data-line="'+l.id+'"')); b.push(simbtn('Client fills the rest and approves','data-sim="rfqClient" data-line="'+l.id+'"')); }
  if(l.stage===3&&l.rate===1) b.push(simbtn('The rater comes back empty — no insurer quotes','data-sim="raterNone" data-line="'+l.id+'"'));
  if(l.stage===6 && (l.qAns||l.round>1)) b.push(simbtn('Placement returns the QCR','data-sim="extPlc" data-line="'+l.id+'"'));
  if(l.stage===9 && l.pay==='ticket') b.push(simbtn('Ops returns the payment details','data-sim="extOps" data-line="'+l.id+'"'));
  if(l.stage===10) b.push(simbtn('Client pays · sends the screenshot','data-sim="extPaid" data-line="'+l.id+'"'));
  if(l.stage>=SALES_STAGES) b=b.concat(postSims(l));
  if((me().role==='exec'||me().role==='rm')&&l.stage<14) b.push(simbtn('Your manager takes this line over','data-sim="extTake" data-line="'+l.id+'"'));
  if(!b.length) return '';
  return simblock('Simulate an inbound event','Things that happen outside the CRM — a client, placement or Ops acting — faked so the flow can continue.',b.join(''));
}
SCREENS.line=function(){
  var l=lineById(S.route.id); if(!l) return SCREENS.notfound();
  var a=acctOf(l), o=oppOf(l), tab=S.ui['ltab_'+l.id]||'overview', ro=readOnlyWhy(l), u=me();
  /* [stated 23 Sep] all four changes are for a line handed over to the RM after payment — that is,
     one that has a post-purchase ticket. A line still being sold keeps its RFQ & quotes tab;
     once it is handed over, that content folds into Overview and the tab goes, Mail trail
     becomes a tab of its own, and Manage ticket moves to Manage. */
  var tabs=(l.iss?[['overview','Overview'],['post','Post-purchase'],['mail','Mail trail'],['req','Requirement']]
                 :[['overview','Overview'],['req','Requirement'],['quotes','RFQ & quotes']])
    .concat([['tickets','Tickets'],['activity','Activity'],['tasks','Tasks'],['manage','Manage']]);
  if(!tabs.some(function(t){return t[0]===tab;})) tab='overview';
  if(l.iss && !S.ui['ltab_'+l.id]) tab='post';
  var tks=ticketsOf(l), ltasks=tasksOfLine(l.id).filter(function(t){return !t.done;});
  var body='';
  if(tab==='overview'){
    body='<div class="phhd"><div class="t">Captured at creation</div><div class="a">Line age <b>'+plural(daysBetween(l.createdAt,S.now),'day')+'</b></div></div><div class="kvgrid mt12">'+
      kv('Account','<button class="link" data-go="acct" data-id="'+a.id+'">'+esc(a.n)+'</button>'+(a.prov?' '+chip('Provisional','amber',false,true):' '+chip('Verified','green',false,true)))+
      (o?kv('Opportunity','<button class="link" data-go="opp" data-id="'+o.id+'">'+esc(o.name)+'</button>')+kv('Business type',o.bt===o.type?esc(o.type):esc(o.bt)+' · '+esc(o.type))
         :kv('Business type','Renewal <span class="meta">· no opportunity — a renewal is a product line on the account</span>'))+(l.renews?renOverview(l):'')+
      kv('Contact on this line',esc(l.contact.n||'—')+(l.contact.e?'<div class="meta">'+esc(l.contact.e)+' · '+esc(l.contact.m)+'</div>':''))+kv('Source',esc(l.src||(o?o.src:'')||'—'))+kv('Owner',esc(uname(l.owner)))+
      kv('Created',esc(fmtD(l.createdAt)))+(l.stage>=9&&l.picked?kv('Confirmed premium','<b>'+INR(premOf(l))+'</b>'):'')+
      kv('Calls',plural(l.att,'call')+(l.stage<3&&!everConnected(l)&&l.status==='open'?'<div class="meta">'+(ATTEMPT_CAP-l.att)+' of '+ATTEMPT_CAP+' attempts left before the system closes it as Unreachable</div>':''))+'</div>'+(l.renews?renFlag(l):'')+
      (l.iss?diamonds(true)+quotesTab(l):'');
  } else if(tab==='req'){
    body='<div class="phhd"><div class="t">Requirement</div>'+(canAct(l)&&l.stage>=2?'<button class="btn sm" data-flow="disc" data-line="'+l.id+'">'+(l.req?'Edit':'Capture')+'</button>':'')+'</div>'+
      (l.req?'<div class="kvgrid mt16">'+kv('Approximate sum insured',esc(l.req.si))+kv('Target premium',esc(l.req.tp))+kv('Annual turnover',esc(l.req.to))+kv('Type of business',esc(l.req.tob))+kv('Nature of company',esc(l.req.noc))+kv('Existing policy',l.req.pol==='y'?'Yes':'No — first-time buyer')+(l.req.pol==='y'?kv('Incumbent insurer',esc(l.req.ins||'—'))+kv('Policy expiry',esc(l.req.exp||'—')):'')+kv('Policy tenure',esc(l.req.ten))+kv('Claims history',esc(l.req.clm))+'</div>'
        : '<div class="mt12">'+empty('file','Not captured yet','The gate for '+esc(l.product)+' opens from the discovery call — log a call with <b>Discovery complete</b> and the questions appear. They are defined per product.')+'</div>');
  } else if(tab==='post'){ body=postTab(l); }
  else if(tab==='quotes'){ body=quotesTab(l); }
  else if(tab==='mail'){ body=mailTrail(l); }
  else if(tab==='activity'){ body='<div class="phhd"><div class="t">Activity</div>'+(canAct(l)?'<button class="btn sm" data-flow="logAct" data-line="'+l.id+'">Log activity</button>':'')+'</div><div class="mt8">'+actList(l,0)+'</div>'; }
  else if(tab==='tickets'){ body='<div class="phhd"><div class="t">Tickets on this line</div><div class="a">'+plural(tks.length,'ticket')+'</div></div><div class="mt12">'+(tks.length?'<div class="rowlist" style="border:1px solid var(--border);border-radius:12px">'+tks.map(function(t){ return '<div class="row" data-go="ticket" data-id="'+t.id+'"><div class="bd"><b>'+esc(t.id)+'</b> '+chip(t.st,t.tone,true,true)+'<div class="m2">'+esc(t.ty)+' · '+esc(t.desk)+' · raised '+esc(fmtD(t.raised))+(t.pend?' · <span class="amber">'+esc(t.pend)+'</span>':'')+'</div></div><div class="rt">'+(t.act&&canAct(l)?'<button class="btn sm" data-flow="'+t.act+'" data-line="'+l.id+'">'+esc(t.actLbl)+'</button>':'')+'<button class="btn sm ghost" data-go="ticket" data-id="'+t.id+'">Ticket flow</button></div></div>'; }).join('')+'</div>':empty('ticket','No tickets on this line','A placement ticket opens when the RFQ is floated, a payment ticket when the request is raised, a post-purchase ticket at Payment Completed.'))+'</div>'; }
  else if(tab==='tasks'){ body='<div class="phhd"><div class="t">Tasks on this line</div>'+(isMine(l)?'<button class="btn sm" data-flow="addTask" data-line="'+l.id+'">'+ic('plus')+'Add task</button>':'')+'</div><div class="mt12">'+(ltasks.length?'<div class="rowlist" style="border:1px solid var(--border);border-radius:12px">'+ltasks.map(function(t){return taskRow(t,{who:t.owner!==S.user});}).join('')+'</div>':empty('checks','No open tasks on this line','Rules create tasks when the line enters a stage; dispositions create follow-ups; you can add your own.'))+'</div>'; }
  else if(tab==='manage'){ body=manageTab(l); }
  /* [stated 23 Sep] a renewal line has no opportunity, so there is no opportunity step in the trail */
  var html='<div class="crumbs"><button data-go="accounts">Accounts</button>'+ic('chevright','ic14')+'<button data-go="acct" data-id="'+a.id+'">'+esc(a.n)+'</button>'+ic('chevright','ic14')+(o?'<button data-go="opp" data-id="'+o.id+'">'+esc(o.id)+'</button>'+ic('chevright','ic14'):'<span class="b">Renewal</span>'+ic('chevright','ic14'))+'<b>'+esc(l.product)+'</b></div>'+
    '<div class="hdrow"><div><div class="h1">'+esc(l.product)+'</div><div class="metaline"><span class="b">'+esc(a.n)+'</span><span class="sep">·</span><span>'+esc(l.id)+'</span><span class="sep">·</span>'+chip(statusTx(l),statusTone(l),true,true)+chip('Waiting on '+actingParty(l),waitTone(actingParty(l)),false,true)+chip(routeTx(l),l.rate===1?'violet':'neutral',false,true)+(l.renews?renHeadChip(l):'')+'</div></div><span class="sp"></span>'+
      '<div class="acts">'+(isMgrRole(u)&&!isMine(l)&&(openLine(l)||postLine(l))?'<button class="quiet" data-flow="takeover" data-line="'+l.id+'">Take it over</button>':'')+(S.data.took.indexOf(l.id)>=0&&isMine(l)?'<button class="btn sm outline" data-flow="handback" data-line="'+l.id+'">Hand back</button>':'')+'</div></div>'+
    (ro?'<div class="banner '+(dead(l)?'red':(l.stage===14?'green':'neutral'))+' mt12">'+ic('lock','ic14')+'<span>'+esc(ro)+'</span></div>':'')+
    (l.status==='park'?'<div class="banner amber mt12">'+ic('clock','ic14')+'<span><b>Time Pending</b> — revisit '+esc(fmtD(l.revisit))+' · '+esc(l.reason)+'. The stage below is untouched.</span></div>':'')+
    '<div class="mt12">'+stageTrack(l)+'</div>'+diamonds()+
    '<div class="tabs">'+tabs.map(function(t){return '<button data-uiset="ltab_'+l.id+'" data-uv="'+t[0]+'"'+(tab===t[0]?' class="on"':'')+'>'+t[1]+(t[0]==='tasks'&&ltasks.length?' ('+ltasks.length+')':'')+(t[0]==='tickets'&&tks.length?' ('+tks.length+')':'')+'</button>';}).join('')+'</div>'+
    '<div class="two"><div class="rail">'+clockCard(l)+'<div id="nacard">'+naCard(l)+'</div>'+simsFor(l)+'</div><div class="pane"><div class="pb">'+body+'</div></div></div>';
  return {sc:'Product line', ctx:l.id, html:html};
};
function actList(l,n){
  var items=l.log.slice().sort(function(a,b){return b.at-a.at;}); if(n) items=items.slice(0,n);
  if(!items.length) return empty('inbox','No activity yet','Calls, emails and stage moves land here as they happen.');
  return '<ul class="tl">'+items.map(function(e){ return '<li><span class="dot'+(e.sys?' sys':'')+'"></span><div class="bd"><b>'+esc(e.t)+'</b><div class="m">'+esc(e.m)+' · '+esc(fmt(e.at))+'</div>'+(e.x?'<div class="x">'+esc(e.x)+'</div>':'')+'</div></li>'; }).join('')+'</ul>';
}
function qcrVersions(l){
  /* one entry per round, derived from the log and the round counter */
  var out=[], logs=l.log.slice().sort(function(a,b){return a.at-b.at;});
  var find=function(re){ var m=logs.filter(function(e){return re.test(e.t);}); return m.length?m[m.length-1]:null; };
  for(var v=1; v<=l.round; v++){
    var issued=find(new RegExp('^QCR v'+v+' (sent to|shared with) client')), back=find(new RegExp('QCR sent back for revision.*v'+(v+1)+' requested')), plc=logs.filter(function(e){return /Quotes returned by placement/.test(e.t);})[v-1];
    var st, tone, when=0;
    if(v<l.round){ st='Sent back for revision'+(back&&/client objected/.test(back.m)?' — the client objected':(back?' — the owner objected':'')); tone='amber'; when=back?back.at:0; }
    else if(l.stage>=8||(l.rate&&issued)){ st=l.stage>=9&&l.picked?'Shared · client chose '+l.picked:'Shared with the client'; tone='green'; when=issued?issued.at:(l.stage===8?l.enteredAt:0); }
    else if(l.stage===7){ st='Received from placement — under review'; tone='blue'; when=plc?plc.at:l.enteredAt; }
    else { st=l.rate?'Not sent yet — pick the quotes':(v>1?'Revision in preparation with placement':'In preparation'); tone='neutral'; when=0; }
    var ready=!(tone==='neutral');
    out.push({v:v, by:l.rate?'assembled here from the rater’s prices':'prepared by BimaPlacement · ticket PLC-'+l.id.slice(3), st:st, tone:tone, at:when||(issued?issued.at:(plc?plc.at:0)), ready:ready});
  }
  return out;
}
function quoteTable(l,qs,dau){
  return '<div class="tw mt12"><table class="t"><thead><tr><th>Insurer</th><th></th><th class="num">Premium</th><th>Valid to</th><th></th></tr></thead><tbody>'+qs.map(function(q){ var inq=dau&&l.stage>=8&&l.qsel&&l.qsel.length&&l.qsel.indexOf(q.i)>=0;
    return '<tr'+(q.st!=='quoted'?' class="dim"':'')+'><td class="nm">'+esc(q.i)+(q.lo?' '+chip('Lowest','green',false,true):'')+(inq?' '+chip('In the QCR','blue',false,true):'')+(l.picked===q.i?' '+chip('Client chose','violet',false,true):'')+(q.r?'<div class="sub">'+esc(q.r)+'</div>':'')+'</td><td>'+chip(q.st==='quoted'?'Quoted':(q.st==='declined'?'Declined':'Awaited'),q.st==='quoted'?'green':(q.st==='declined'?'red':'neutral'),false,true)+'</td><td class="num">'+(q.p?INR(q.p):'—')+'</td><td>'+(q.p?esc(fmtD((l.enteredAt||S.now)+28*86400000)):'—')+'</td>'+
      /* [stated 24 Sep] every quote can be viewed and downloaded */
      '<td class="right" style="white-space:nowrap">'+(q.st==='quoted'?docBtns('Quote · '+q.i,{line:l.id}):'')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
    '<div class="meta mt8">The lowest-premium marker is internal. The client’s copy names no preferred quote.</div>';
}
function qcrSection(l){
  var vers=qcrVersions(l);
  return '<div class="phhd"><div class="t">QCR</div><div class="a">'+(l.rate===1?'assembled from the rater’s quotes':'from placement · ticket PLC-'+l.id.slice(3))+'</div></div><div class="qcards mt12">'+
    vers.slice().reverse().map(function(q){
      if(!q.ready) return '<div class="qcard muted"><div class="qc-ic">'+ic('file','ic20')+'</div><div class="qc-bd"><b>Quote Comparison Report · v'+q.v+'</b> '+chip(q.st,q.tone,true,true)+'<div class="qc-m">'+(l.rate===1?'Pick the quotes to build it':'Placement is preparing it')+'</div></div></div>';
      var act=qcrActionable(l,q.v); return qcrCard(l,q.v,{primary:act,label:act?'Review the QCR':'View'}); }).join('')+'</div>';
}
function quotesTab(l){
  var h='';
  if(l.rate===null||l.rate===undefined){
    return empty('file','Nothing to quote yet','DAU or non-DAU is decided when the requirement is captured. A DAU line gets the rater’s quotes straight away; a non-DAU line gets the RFQ on this tab.');
  }
  if(l.rate===1){
    if(l.stage<8){
      h+='<div class="phhd"><div class="t">Quotes from the rater</div><div class="a">DAU · priced from the requirement · no RFQ</div></div>'+quoteTable(l,QUOTES.dau,true)+
        (canAct(l)&&l.stage===3?'<div class="mt12"><button class="btn primary sm" data-flow="qcr" data-line="'+l.id+'">Select quotes and send QCR</button></div>':'');
    } else h+=qcrSection(l);
  } else {
    var folded=l.rfq&&l.rfq.st==='floated';
    if(!folded) h+=rfqBlock(l);
    if(l.dauQcr){ h+=diamonds(true)+'<div class="phhd"><div class="t">Before the switch</div><div class="a">DAU · from the rater</div></div><div class="qcards mt12">'+qcrCard(l,l.dauQcr.v,{rej:true,label:'View'})+'</div>'; }
    var qh='';
    if(l.stage>=7||(l.stage===6&&l.round>1)) qh=qcrSection(l);
    else if(l.stage===6) qh='<div class="phhd"><div class="t">QCR</div><div class="a">with placement · ticket PLC-'+l.id.slice(3)+'</div></div><div class="qcards mt12"><div class="qcard muted"><div class="qc-ic">'+ic('file','ic20')+'</div><div class="qc-bd"><b>Quote Comparison Report</b><div class="qc-m">Placement builds it and it lands here when the ticket responds</div></div></div></div>';
    if(folded) h=qh+(qh?'<div class="mt16"></div>':'')+rfqFolded(l)+(l.dauQcr?h:'');
    else if(qh) h+=diamonds(true)+qh;
  }
  if(l.stage>=9 && l.picked){ h+=diamonds(true)+'<div class="phhd"><div class="t">Sold</div></div><div class="kvgrid mt12">'+kv('Insurer',esc(l.picked))+kv('Confirmed premium','<b>'+INR(premOf(l))+'</b>')+kv('Payment',l.pay==='pre'?'Not requested':(l.pay==='ticket'?'With Ops':(l.pay==='back'?'Details returned':(l.pay==='shared'?'Shared with client':'Paid'))))+'</div>'; }
  return h;
}
function manageTab(l){
  var u=me(), o=oppOf(l);
  var rows=[];
  if(canAct(l)&&l.stage<SALES_STAGES) rows.push(['Change status','Park it, or close it as Lost, No Appetite or Disqualified. The stage is preserved either way.','status','Change status']);
  if(l.stage>=SALES_STAGES&&!dead(l)) rows.push(['Withdrawal','Only Customer Success can mark the client withdrawn, from the ticket. The line freezes where it is. [stated 24 Sep · TBD-30] there is no refund path, and that is deliberate — refunds are out of scope, not missing.','','']);
  /* [stated 24 Sep · TBD-58] an executive may not reassign their own line — a manager does it */
  if(isMgrRole(u)&&!dead(l)&&l.stage<14) rows.push(['Reassign this product line','Owner sits on the line, so this moves one line — not the opportunity, not the account. A manager’s action: the owner cannot move their own line.','reassign','Reassign']);
  else if(isMine(l)&&!dead(l)&&l.stage<14) rows.push(['Reassign this product line','Only a manager can move a line. Ask '+uname((userById(l.owner)||{}).mgr||'vikram')+' if this needs to sit with someone else.','','','Manager only']);
  if(isMgrRole(u)&&!isMine(l)&&(openLine(l)||postLine(l))) rows.push(['Take it over','The fallback for when '+uname(l.owner)+' is away and this cannot wait. You become the owner; the trail records it.','takeover','Take it over']);
  if(S.data.took.indexOf(l.id)>=0&&isMine(l)) rows.push(['Hand back','Return the line to the executive it was taken from. The trail shows the round trip.','handback','Hand back']);
  if(l.status==='park'&&isMine(l)) rows.push(['Resume','Take it off Time Pending. The stage never moved.','resume','Resume']);
  var h='<div class="phhd"><div class="t">Manage</div></div><div class="rowlist mt12" style="border:1px solid var(--border);border-radius:12px">'+
    (rows.length?rows.map(function(r){ return '<div><div class="bd"><b>'+esc(r[0])+'</b><div class="m">'+esc(r[1])+'</div></div><div class="rt">'+(r[2]?'<button class="btn sm'+(r[2]==='takeover'?' ghost':'')+'" data-flow="'+r[2]+'" data-line="'+l.id+'">'+esc(r[3])+'</button>':chip(r[4]||'Customer Success','neutral',false,true))+'</div></div>'; }).join(''):'<div><div class="bd meta">Nothing to manage here — '+esc(readOnlyWhy(l)||'the line is closed')+'</div></div>')+'</div>'+
    (l.iss?diamonds(true)+manageTicketBlock(l):'')+
    diamonds(true)+'<div class="h3">Related</div><div class="rowlist mt8" style="border:1px solid var(--border);border-radius:12px">'+
    (o?'<div class="row" data-go="opp" data-id="'+o.id+'"><div class="bd"><b>'+esc(o.name)+'</b><div class="m">'+plural(linesOfOpp(o.id).length,'product line')+' · add a line or raise a payment request across lines there</div></div><div class="rt">'+ic('chevright')+'</div></div>'
       :'<div class="row" data-uiset="atab_'+l.acct+'" data-uv="ren" data-go="acct" data-id="'+l.acct+'"><div class="bd"><b>Renewals on '+esc(acctName(l))+'</b><div class="m">'+plural(renLinesOfAcct(l.acct).filter(function(x){return !dead(x);}).length,'renewal line')+' · raise a payment request across several of them there</div></div><div class="rt">'+ic('chevright')+'</div></div>')+
    '<div class="row" data-go="acct" data-id="'+l.acct+'"><div class="bd"><b>'+esc(acctName(l))+'</b><div class="m">Account 360 — policies, contacts, KYC</div></div><div class="rt">'+ic('chevright')+'</div></div></div>';
  return h;
}
HANDLERS.push(function(t){
  var x=t.closest('[data-copy]'); if(x){ toast('Link copied'); return true; }
  x=t.closest('[data-sim]'); if(x){ var l=lineById(x.dataset.line); if(!l) return true; runSim(x.dataset.sim,l); return true; }
  return false;
});
function runSim(k,l){
  var ok=write(function(){
    if(k==='rfqClient'){ var n=rfqFillRest(l,'client','',S.now); logAdd(l,'Client filled '+plural(n,'field')+' on the link','System','rfq',1); rfqVerify(l); moveStage(l,5,'Client verified the RFQ'); }
    if(k==='raterNone'){ logAdd(l,'Rater returned no quotes','System · every insurer declined the risk','sys',1); rfqSwitch(l,'The rater returned no quotes',''); }
    if(k==='extPlc'){ logAdd(l,'Quotes returned by placement','System · ticket PLC-'+l.id.slice(3),'sys',1); moveStage(l,7,'Quotes received from placement'); }
    if(k==='extOps'){ l.pay='back'; logAdd(l,'Payment details returned by Ops','System · ticket PAY-'+l.id.slice(3)+' · '+payModeOf(l),'sys',1); }
    if(k==='extPaid'){ logAdd(l,'Payment screenshot received from client','System · on email','pay',1); }
    if(k==='extTake'){ var u=userById(l.owner); var m=u&&u.mgr?u.mgr:'vikram'; if(S.data.took.indexOf(l.id)<0) S.data.took.push(l.id); l.prevOwner=l.owner; l.owner=m; logAdd(l,'Taken over by '+uname(m),'System · while you were on the record','sys',1); }
  },'the simulated event');
  if(!ok) return;
  var msg={rfqClient:['The client approved the RFQ','Now at RFQ Verified by Client — float it to placement'],raterNone:['No rater quotes — switched to the RFQ route','Still at Details Captured. The RFQ is open on the RFQ & quotes tab'],extPlc:['QCR back from placement','Now at Quotes Received'],extOps:['Ops returned the payment details','Stage stays at Purchase Requested — share them with the client'],extPaid:['The client sent the payment screenshot','Upload it in Confirm payment to close the sale'],extTake:['This line is no longer yours','Your manager took it over while you were looking. The screen is now read-only.']}[k];
  paint(); toast(msg[0],msg[1]);
}

/* ---------- flows on a line ---------- */
function stageToast(l,made){ var w=actingParty(l); return 'Now at '+stageName(l.stage)+' · waiting on '+w+(made&&made.length?' · '+plural(made.length,'task')+' created by rule':''); }
/* [stated 23 Sep] two outcomes ask for more before they can be logged:
   the correct POC (name, number, designation) and the call-back date and time. */
/* an empty field is not an error until it has been touched — the commit stays disabled either way */
function callErr(){ var e={}, was=function(k){ return S.sel[k]!==undefined; };
  if(S.sel.d==='poc'){
    if(was('pn')&&!(S.sel.pn||'').trim()) e.pn='Who should we be speaking to?';
    var m=(S.sel.pm||'').replace(/[^\d]/g,'');
    if(was('pm')&&!(S.sel.pm||'').trim()) e.pm='A number is needed to reach them.';
    else if((S.sel.pm||'').trim()&&m.length<10) e.pm='That does not look like a phone number.';
    if(was('pd')&&!(S.sel.pd||'').trim()) e.pd='Their designation, as they gave it.';
  }
  if(S.sel.d==='cb'&&(S.sel.cbat||'')&&new Date(S.sel.cbat).getTime()<=S.now) e.cbat='Pick a time in the future.';
  return e;
}
/* what still has to be filled before the disposition can be logged */
function callReady(){
  if(!S.sel.d) return false;
  if(S.sel.d==='poc'){ var m=(S.sel.pm||'').replace(/[^\d]/g,'');
    if(!(S.sel.pn||'').trim()||!(S.sel.pd||'').trim()||m.length<10) return false; }
  if(S.sel.d==='cb'){ if(!(S.sel.cbat||'')||new Date(S.sel.cbat).getTime()<=S.now) return false; }
  var e=callErr(); for(var k in e) return false; return true;
}
FLOWS.call={t:function(){ var l=FL(); return S.sel.ctc?'Call outcome':(l&&l.stage===1?'First Contact':'Log call'); },
  /* [stated 23 Sep] a call placed from here must be dispositioned — there is no way out of this modal until an outcome is picked */
  sub:function(){ return S.sel.ctc?'The call is over and it is on the record. Pick what happened — this cannot be skipped.':'Pick the outcome. The stage follows from it — you never type a stage.'; },
  locked:function(){ return !!S.sel.ctc; }, nocancel:function(){ return !!S.sel.ctc; },
  body:function(){ var l=FL(), a=acctOf(l), e=callErr();
    /* [stated 23 Sep] the extra questions sit directly under the outcome that asks them */
    var sub=function(k){
      if(k==='poc') return '<div class="subform">'+
        field('Name',input('pn',S.sel.pn,'Rahul Mehta'),'Who they said you should be speaking to.',e.pn)+
        '<div class="fgrid">'+field('Contact number',input('pm',S.sel.pm,'+91 98200 44112'),'Needed to reach them.',e.pm)+field('Designation',input('pd',S.sel.pd,'Finance Head'),'As they gave it.',e.pd)+'</div>'+
        field('Email — optional',input('pe',S.sel.pe,''),'They are added to '+esc(a.n)+'\u2019s contacts and become the contact on this line. '+esc(l.contact.n||'The current contact')+' stays on the account.')+'</div>';
      if(k==='cb') return '<div class="subform">'+
        field('Call back on','<input class="inp" id="f_cbat" data-f="cbat" type="datetime-local" min="'+esc(dtLocal(S.now))+'" value="'+esc(S.sel.cbat||'')+'">','The follow-up task is created for exactly this time, on you.',e.cbat)+'</div>';
      return '';
    };
    return ctcStrip(S.sel.ctc)+DISP.map(function(d){ return opt('data-pick="'+d.k+'"',S.sel.d===d.k,d.n,'Group '+d.g+' · '+esc(d.d))+(S.sel.d===d.k?sub(d.k):''); }).join(''); },
  can:callReady, ok:'Log disposition',
  run:function(){ var l=FL(), a=acctOf(l), d=DISP.filter(function(x){return x.k===S.sel.d;})[0];
    if(d.k==='disc'){ var ln=l.id, cc=S.sel.ctc;
      /* the call happened — it goes on the record before the requirement form takes over */
      if(cc) write(function(){ l.att++; l.lastDisp=d.n; logAdd(l,'Call · '+d.n,uname(S.user)+' · call '+l.att+' · connected'+ctcMeta(cc),'call'); },'the call');
      closeFlow(); openFlow('disc',{line:ln}); return 'stay'; }
    var made=[], extra=ctcMeta(S.sel.ctc), was=l.contact.n||'', cbAt=0, unreach=false;
    if(d.k==='poc'){ extra+=' · referred to '+(S.sel.pn||'').trim()+', '+(S.sel.pd||'').trim()+' · '+(S.sel.pm||'').trim(); }
    if(d.k==='cb'){ cbAt=new Date(S.sel.cbat).getTime(); extra+=' · call back '+fmt(cbAt); }
    var ok=write(function(){ l.att++; l.lastDisp=d.n; logAdd(l,'Call · '+d.n,uname(S.user)+' · call '+l.att+(d.g==='A'?' · no connect':' · connected')+extra,'call');
      if(d.k==='poc'){
        var c={n:(S.sel.pn||'').trim(), d:(S.sel.pd||'').trim(), m:(S.sel.pm||'').trim(), e:(S.sel.pe||'').trim(), dm:1};
        if(!a.con.some(function(x){return x.m===c.m||(c.e&&x.e===c.e);})) a.con.push(c);
        a.con.forEach(function(x){ if(x!==c&&x.n!==c.n) x.dm=0; });
        l.contact={n:c.n, e:c.e, m:c.m};
        logAdd(l,'Contact on this line changed to '+c.n,'System · '+c.d+' · '+c.m+(was?' · was '+was:'')+' · added to the account\u2019s contacts','sys',1);
      }
      made=fireRules(l);
      /* [stated 23 Sep] the client named a time, so the callback rule's task takes that time
         rather than its default — one task, on the hour the client asked for. */
      if(d.k==='cb'){
        var t=openRuleTask(l,'TR-03');
        if(t){ t.dueAt=cbAt; t.escAt=0; t.title='Call back '+(l.contact.n||'the client'); }
        else S.data.tasks.push({id:'T-'+(S.data.seq.task++),line:l.id,acct:null,owner:S.user,title:'Call back '+(l.contact.n||'the client'),cls:'Follow-up',createdAt:S.now,dueAt:cbAt,escAt:0,done:0,doneAt:0,doneBy:'',rule:''});
      }
      if(l.stage===1){ made=made.concat(moveStage(l,2,'First contact logged')); }
      /* [stated 24 Sep · TBD-05/06] the ladder caps at 10 calls. No timing rule, no channel rule:
         the tenth call that does not connect, on a line nobody has ever reached, closes it as
         Unreachable. The system sets it, never a person, and the stage is preserved. */
      if(d.g==='A' && l.att>=ATTEMPT_CAP && l.status==='open' && !everConnected(l)){
        l.status='unreach'; l.reason=ATTEMPT_CAP+' calls, never connected';
        tasksOfLine(l.id).forEach(function(t){ if(!t.done){ t.done=1; t.doneAt=S.now; t.doneBy='system'; } });
        logAdd(l,'Closed as Unreachable','System · '+ATTEMPT_CAP+' calls and no connect · stage preserved at '+stageName(l.stage),'sys',1);
        unreach=true;
      }
    },'the call');
    if(!ok) return 'fail';
    if(unreach){ toast('Closed as Unreachable',ATTEMPT_CAP+' calls with no connect. The stage stays at '+stageName(l.stage)+'; open tasks are closed by the system.',{red:1}); return; }
    toast('Disposition logged — '+d.n, d.k==='poc'?(S.sel.pn||'').trim()+' is now the contact on this line.':(d.k==='cb'?'Follow-up set for '+fmt(cbAt)+'. Stage unchanged.':stageToast(l,made))); }};
/* a line counts as reached once any connected disposition is on the trail */
function everConnected(l){ return (l.log||[]).some(function(e){ return /^Call · /.test(e.t) && / · connected/.test(e.m||''); }); }

FLOWS.disc={t:function(){ var l=FL(); return l.renews?'Update the renewal details':'Capture requirement'; }, sub:function(){ var l=FL(); return l.renews?'Carried over from '+l.renews+'. Change what has changed this year — the renewal goes to placement either way.':'The gate for '+l.product+'. These questions are defined per product — Marine and Group Health ask different ones.'; }, wide:true,
  repaintOn:['tob','noc','ten','clm'],
  body:function(){ var l=FL(), a=acctOf(l), r=l.req||{}, v=function(k,d){ return S.sel[k]!==undefined?S.sel[k]:(r[k]!==undefined?r[k]:d); }; var pol=selOf('pol',r.pol||'y');
    var e=discErr();
    return '<div class="fgrid">'+field('Approximate sum insured',input('si',v('si',''),'₹18 Cr'),'',e.si)+field('Target premium',input('tp',v('tp',''),'₹3,40,000'),'',e.tp)+'</div>'+
      field('Annual turnover',input('to',v('to',a.to||''),'₹86 Cr'),'Pre-filled from Probe42 where it exists. Correct it if the client says otherwise.')+
      '<div class="fgrid">'+field('Type of business',select('tob',v('tob','Manufacturing'),['Manufacturing','Trading','Services','Warehousing']))+field('Nature of company',select('noc',v('noc','Private limited'),['Private limited','Public limited','LLP','Partnership','Sole proprietorship']))+'</div>'+
      '<div class="field"><div class="lbl">Do you have an existing policy?</div>'+seg('pol',[['y','Yes'],['n','No']],r.pol||'y')+'</div>'+
      (pol==='y'?'<div class="fgrid">'+field('Incumbent insurer',input('ins',v('ins',''),'New India Assurance'),'',e.ins)+field('Policy expiry date','<input class="inp" id="f_exp" data-f="exp" type="date" value="'+esc(v('exp',''))+'">','',e.exp)+'</div>'
               :note('green','','First-time buyer. Incumbent insurer and expiry date do not apply, and are not asked.'))+
      '<div class="fgrid">'+field('Policy tenure',select('ten',v('ten','1 year'),['1 year','2 years','3 years']))+field('Claims history',select('clm',v('clm','No claims in 3 years'),['No claims in 3 years','1 claim','2 or more claims']))+'</div>'+
      /* [stated 24 Sep · TBD-02] the decision maker is not asked — the contact on the line is
         already captured, and a second product line never re-asks it. */
      (a.prov?field('PAN or GSTIN — asked, not enforced',input('pan',v('pan',''),'Leave blank if they will not share it yet'),'',e.pan):'')+
      field('Note',input('note',v('note',''),'Anything the RFQ and placement should know'));
  },
  can:function(){ var e=discErr(); return !Object.keys(e).length && !!(S.sel.si||(FL().req||{}).si) && !!(S.sel.tp||(FL().req||{}).tp); }, ok:function(){ var l=FL(); return l.req?'Save':'Save and complete discovery'; },
  run:function(){ var l=FL(), r=l.req||{}, had=!!l.req, pol=selOf('pol',r.pol||'y');
    var made=[];
    var ok=write(function(){ l.req={si:S.sel.si||r.si,tp:S.sel.tp||r.tp,to:S.sel.to!==undefined?S.sel.to:(r.to||acctOf(l).to),tob:S.sel.tob||r.tob||'Manufacturing',noc:S.sel.noc||r.noc||'Private limited',pol:pol,ins:pol==='y'?(S.sel.ins||r.ins||''):'',exp:pol==='y'?(S.sel.exp||r.exp||''):'',ten:S.sel.ten||r.ten||'1 year',clm:S.sel.clm||r.clm||'No claims in 3 years',pan:S.sel.pan||r.pan||'',note:S.sel.note||r.note||''};
      if(!had){ l.att++; l.lastDisp='Discovery complete, requirement captured'; logAdd(l,'Call · Discovery complete, requirement captured',uname(S.user)+' · call '+l.att+' · '+(pol==='n'?'first-time buyer':'renewal, incumbent '+(l.req.ins||'—')),'call');
        if(l.rate===null||l.rate===undefined){ l.rate=RATEABLE[l.product]?1:0; logAdd(l,'Classified '+(l.rate?'DAU — rated by the system':'Non-DAU — quoted by placement'),'System · read from the requirement','sys',1);
          if(l.rate) logAdd(l,'Rater returned prices','System · '+QUOTES.dau.filter(function(q){return q.st==='quoted';}).length+' insurers priced, '+QUOTES.dau.filter(function(q){return q.st==='declined';}).length+' declined · no RFQ needed','sys',1);
          else { rfqOpen(l,acctOf(l),S.now); logAdd(l,'RFQ opened on screen','System · pre-filled from the requirement and the account','rfq',1); } }
        if(l.stage<3) made=moveStage(l,3,l.stage===1?'Requirement captured on first contact':'Requirement captured'); else made=fireRules(l); } else { logAdd(l,'Requirement edited','','note'); fireRules(l); } },'the requirement');
    if(!ok) return 'fail';
    toast(had?'Requirement saved':'Discovery complete — '+(l.rate?'DAU':'Non-DAU'),had?(l.renews?'The renewal stays on the RFQ route — check the RFQ and send it on.':''):(l.rate?'Rater quotes are in. Pick what goes in the QCR.':'The RFQ is open on screen, pre-filled. Fill it, then float it or send it for client review.')); }};
function discErr(){ var l=FL(), r=l.req||{}, e={}, g=function(k){ return S.sel[k]!==undefined?S.sel[k]:(r[k]||''); };
  var si=g('si'), tp=g('tp'); if(si&&!/\d/.test(si)) e.si='Give a number, e.g. ₹18 Cr.'; if(tp&&!/\d/.test(tp)) e.tp='Give a number, e.g. ₹3,40,000.';
  if(selOf('pol',r.pol||'y')==='y'){ var exp=g('exp'); if(exp && new Date(exp).getTime()<S.now-86400000) e.exp='That policy has already expired — if so, answer No.'; }
  var pan=(g('pan')||'').trim().toUpperCase(); if(pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan) && pan.length!==15) e.pan='Not a PAN (AAAAA9999A) or a 15-character GSTIN.';
  return e; }

FLOWS.chase={t:'Chase the RFQ', sub:'No reminder goes to the client automatically. Chasing is the owner’s.',
  body:function(){ return field('Channel',select('ch',S.sel.ch||'Call',['Call','Email','WhatsApp']))+note('blue','','Logged against '+esc(FL().contact.n)+', the contact on this product line. The follow-up task comes from the RFQ chase rule — it is not set here.'); },
  can:function(){return true;}, ok:'Log the chase',
  run:function(){ var l=FL(); var ok=write(function(){ logAdd(l,'Chased the client on the RFQ',uname(S.user)+' · '+(S.sel.ch||'Call'),(S.sel.ch||'Call').toLowerCase()==='email'?'email':((S.sel.ch||'')==='WhatsApp'?'whatsapp':'call')); },'the chase'); if(!ok) return 'fail'; toast('Chase logged','Stage unchanged at '+stageName(l.stage)+' · still waiting on the client'); }};

FLOWS.logAct={t:'Log activity', sub:'A call, an email, a WhatsApp or a meeting. It resets the activity clock; a note does not.',
  body:function(){ return field('Kind',select('k',S.sel.k||'call',[['call','Call'],['email','Email'],['whatsapp','WhatsApp'],['meeting','Meeting'],['note','Internal note']]))+field('What happened',input('x',S.sel.x,'One line, in your words')); },
  can:function(){ return !!(S.sel.x||'').trim(); }, ok:'Log it',
  run:function(){ var l=FL(), k=S.sel.k||'call'; var ok=write(function(){ var e={at:S.now,t:{call:'Call',email:'Email',whatsapp:'WhatsApp',meeting:'Meeting',note:'Note'}[k],m:uname(S.user),sys:0,kind:k,x:S.sel.x.trim()}; l.log.unshift(e); },'the activity'); if(!ok) return 'fail'; toast('Logged',k==='note'?'Internal note. The activity clock is unchanged.':'The activity clock on this line is reset.'); }};

FLOWS.float={t:'Float to placement', sub:'Raises a ticket on Bima Sahayak. It stays open until a quote is selected.',
  body:function(){ var l=FL(), a=acctOf(l), o=oppOf(l), tp=S.sel.tp!==undefined?S.sel.tp:(l.req&&l.req.tp?l.req.tp.replace(/[^\d,]/g,''):''); var bad=tp&&!/^\d[\d,]*$/.test(tp);
    var direct=l.stage===3;
    return (direct?note('amber','','<b>Floating directly.</b> Every required field is filled by you; the client does not review it. The two client-review steps are skipped.'):note('green','','<b>The client approved the RFQ.</b> Placement receives it as a rendered form and an Excel.'))+
      '<div class="fgrid">'+field('Product','<input class="inp" value="'+esc(l.product)+'" disabled>')+field('Business name','<input class="inp" value="'+esc(a.n)+'" disabled>')+'</div>'+
      '<div class="fgrid">'+field('Business type','<input class="inp" value="'+esc(o?o.bt+' · '+o.type:'Renewal')+'" disabled>',o?'Set at opportunity creation.':'A renewal is a product line — it has no opportunity.')+field('RFQ','<input class="inp" value="'+esc(l.stage===3?'Filled by '+uname(l.owner)+' · not reviewed by the client':'Approved by '+(l.contact.n||'the client'))+'" disabled>')+'</div>'+
      '<div class="fgrid">'+field('Industry type','<input class="inp" value="'+esc(a.ind)+'" disabled>')+field('Target premium',input('tp',tp,'3,40,000'),'',bad?'Digits only, e.g. 3,40,000.':'')+'</div>'+
      '<div class="field"><div class="lbl">Exclusive mandate</div>'+seg('excl',[['y','Yes'],['n','No']],'n')+'</div>'+
      field('Note to placement',input('note',S.sel.note,'Client wants a like-for-like plus enhanced fire loss of profit.'))+
      note('blue','','Six of the eight fields are filled for you. <b>Which insurers to approach is placement’s call</b> — they build the comparison, so they choose the market.'); },
  can:function(){ var l=FL(); if(l.stage===3&&rfqCount(l).missing) return false; var tp=S.sel.tp!==undefined?S.sel.tp:(l.req&&l.req.tp?l.req.tp.replace(/[^\d,]/g,''):''); return !!tp && /^\d[\d,]*$/.test(tp); }, ok:'Raise placement ticket',
  run:function(){ var l=FL(), made=[]; var ok=write(function(){ var direct=l.stage===3; l.rfq.st='floated'; l.rfq.floatedAt=S.now; l.rfq.direct=direct?1:0; l.plcNote=(S.sel.note||'').trim(); l.plcExcl=S.sel.excl==='y'?1:0; l.plcTp=S.sel.tp!==undefined?S.sel.tp:(l.req&&l.req.tp?l.req.tp:''); logAdd(l,'RFQ floated to placement',uname(S.user)+' · ticket PLC-'+l.id.slice(3)+' raised'+(direct?' · directly, without client review':' · after client review'),'sys'); made=moveStage(l,6,'Placement ticket raised'); },'the placement ticket'); if(!ok) return 'fail'; toast('Placement ticket PLC-'+l.id.slice(3)+' raised',stageToast(l,made)); }};

FLOWS.answerQ={t:'Answer placement’s query', sub:'The ticket is blocked on this. Answering it is what unblocks the round.',
  body:function(){ return note('amber','Meera Iyer, BimaPlacement','New India want the maximum foreseeable loss working for the godown block before they will quote. Can you get it from the client?','mail')+field('Your reply',input('q',S.sel.q,'MFL working attached — client’s risk engineer sent it this morning.'))+note('blue','','The reply goes back on the ticket. The product line stays at Quote Requested — answering a query is not progress through the pipeline.'); },
  can:function(){ return !!(S.sel.q||'').trim(); }, ok:'Send reply',
  run:function(){ var l=FL(); var ok=write(function(){ l.qAns=1; l.qReply=(S.sel.q||'').trim(); logAdd(l,'Replied to placement query',uname(S.user)+' · ticket PLC-'+l.id.slice(3),'sys'); },'the reply'); if(!ok) return 'fail'; toast('Reply sent to placement','Stage unchanged at Quote Requested — the ticket is unblocked'); }};

FLOWS.qcr={t:'Select quotes and send the QCR', sub:'Rateable line. The system priced it, you choose what the client sees.',
  body:function(){ var l=FL(), qs=QUOTES.dau.filter(function(q){return q.st==='quoted';}); if(!S.sel.q) S.sel.q=qs.map(function(q){return q.i;});
    return note('blue','','On a rateable line there is no placement team, so the comparison is assembled here from the rater’s prices.')+
      qs.map(function(q){ return opt('data-tog="q" data-tv="'+esc(q.i)+'"',S.sel.q.indexOf(q.i)>=0,q.i,'SI '+esc((l.req||{}).si||'—')+' · valid 28 days',INR(q.p),true); }).join('')+
      (S.sel.q.length?'':note('red','Nothing selected','A QCR with no quotes cannot be sent. Pick at least one.','alert'))+
      /* [stated 24 Sep] the owner can send it from here or take it away and send it themselves */
      '<div class="field"><div class="lbl">How it goes to the client</div>'+seg('how',[['sys','Email it from here'],['hand','I will send it myself']],'sys')+
        '<div class="hint">'+esc(selOf('how','sys')==='hand'?'The report is recorded as shared by hand — download it below and send it on your own channel. The line still moves to Quote Sent.':'The system emails it to '+(l.contact.n||'the client')+'.')+'</div></div>'+
      (selOf('how','sys')==='hand'?note('blue','','<b>Download the report</b> '+docBtns('Quote Comparison Report',{line:l.id,v:l.round},false))+field('How you will send it',select('ch',S.sel.ch||SHARE_CH[0],SHARE_CH)):'')+
      note('blue','','The lowest-premium marker is stripped from the client’s copy.'); },
  repaintOn:['how'],
  can:function(){ return !!(S.sel.q&&S.sel.q.length); }, ok:function(){ return selOf('how','sys')==='hand'?'Record it as shared':'Send to '+FL().contact.n; },
  run:function(){ var l=FL(), made=[], hand=selOf('how','sys')==='hand', ch=S.sel.ch||SHARE_CH[0];
    var ok=write(function(){ l.qsel=S.sel.q.slice();
      logAdd(l,'QCR v'+l.round+(hand?' shared with client — by hand':' sent to client'),uname(S.user)+' · '+l.qsel.length+' quotes · assembled here'+(hand?' · downloaded and sent on '+ch+' · not sent from the CRM':''),'qcr');
      made=moveStage(l,8,hand?'QCR shared by hand':'QCR sent'); },'the QCR');
    if(!ok) return 'fail'; toast(hand?'QCR recorded as shared':'QCR sent',(hand?ch+' · ':'')+stageToast(l,made)); }};

FLOWS.objectQcr={t:'Send the QCR back to placement', sub:'A revision is a new round on the same ticket, never a new ticket.',
  body:function(){ var l=FL(); return [['us','I am not happy with it','Before the client has seen it'],['client','The client objected','They have seen v'+l.round+' and want changes']].map(function(x){ var off=x[0]==='client'&&l.stage<8; return opt('data-pick="'+x[0]+'"',S.sel.d===x[0],x[1],x[2]+(off?' · not shared yet':''),'',false,off); }).join('')+
    field('What needs to change',input('x',S.sel.x,'Ask New India to re-rate with the enhanced fire loss of profit section.'))+note('amber','','This sends the line back to Quote Requested. It is the one place the stage moves backwards.'); },
  can:function(){ var l=FL(); return !!S.sel.d && !!(S.sel.x||'').trim() && !(S.sel.d==='client'&&l.stage<8); }, ok:function(){ return 'Request v'+(FL().round+1); },
  run:function(){ var l=FL(), made=[]; var ok=write(function(){ l.round++; l.obj=S.sel.d; l.qAns=1; logAdd(l,'QCR sent back for revision',uname(S.user)+' · '+(S.sel.d==='client'?'client objected':'owner objected')+' · v'+l.round+' requested','sys'); made=moveStage(l,6,'Revision requested'); },'the revision request'); if(!ok) return 'fail'; toast('Revision v'+l.round+' requested',stageToast(l,made)); }};

FLOWS.confirm={t:'Record client confirmation', sub:'They named an insurer and a premium. This is the buying signal.',
  body:function(){ var l=FL(); return quotesFor(l).filter(function(q){return q.st==='quoted';}).map(function(q){ return opt('data-pick="'+esc(q.i)+'"',S.sel.d===q.i,q.i,'SI '+esc((l.req||{}).si||'—'),INR(q.p)); }).join('')+note('blue','','Confirmed premium is the revenue number. It is written here and not again.'); },
  can:function(){return !!S.sel.d;}, ok:'Confirm',
  run:function(){ var l=FL(), made=[]; var ok=write(function(){ l.picked=S.sel.d; l.ins=S.sel.d; logAdd(l,'Client confirmed insurer',uname(S.user)+' · '+S.sel.d,'call'); made=moveStage(l,9,'Client confirmed '+S.sel.d); },'the confirmation'); if(!ok) return 'fail'; toast('Client confirmed '+l.picked,stageToast(l,made)); }};

/* ==================================================================== *
 *  Verifying a provisional account — [stated 24 Sep]
 *  The documents are uploaded here: the PAN card, and then either the GST
 *  certificate or, for a proprietor with no GST, Aadhaar. OCR reads the
 *  numbers AND the legal name off the PAN; the name on the account is
 *  replaced by the name on the card, and the change is shown before it is
 *  written. PAN is still validated against the PAN inside the GSTIN.
 * ==================================================================== */
/* the legal name a PAN card carries: the registry form, in capitals */
function panLegalName(a){
  var n=String(a.n||'').trim()
    .replace(/\bPvt\.?\b/ig,'Private').replace(/\bLtd\.?\b/ig,'Limited')
    .replace(/\s+/g,' ').toUpperCase();
  if(!/(PRIVATE LIMITED|PUBLIC LIMITED|LIMITED|LLP|PARTNERSHIP|ENTERPRISES|& SONS)$/.test(n) && !a.sole) n+=' PRIVATE LIMITED';
  return n;
}
function kycDoc(kind,a){
  var W=420,H=260, t=function(x,y,s,sz,w,col){ return '<text x="'+x+'" y="'+y+'" font-family="Arial" font-size="'+sz+'" font-weight="'+(w||400)+'" fill="'+(col||'#171630')+'">'+String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</text>'; };
  var head={pan:'INCOME TAX DEPARTMENT',gst:'GOODS AND SERVICES TAX',aad:'UNIQUE IDENTIFICATION AUTHORITY OF INDIA'}[kind];
  var body='';
  if(kind==='pan') body=t(24,96,'Name',11,600,'#8C8CA3')+t(24,116,panLegalName(a),13,700)+t(24,152,'Permanent Account Number',11,600,'#8C8CA3')+t(24,176,a.pan||'AAAAA9999A',20,700)+t(24,214,'Signature',11,600,'#8C8CA3');
  if(kind==='gst') body=t(24,96,'Registration Number',11,600,'#8C8CA3')+t(24,118,a.gst||'27AAAAA9999A1Z5',15,700)+t(24,152,'Legal Name',11,600,'#8C8CA3')+t(24,172,panLegalName(a),12,700)+t(24,204,'Principal Place of Business',11,600,'#8C8CA3')+t(24,222,(a.city||'')+(a.st?', '+a.st:''),12,600);
  if(kind==='aad') body=t(24,96,'Aadhaar',11,600,'#8C8CA3')+t(24,120,a.aad||'XXXX XXXX 4412',18,700)+t(24,156,'Name',11,600,'#8C8CA3')+t(24,176,'RAMANLAL VORA',13,700)+t(24,208,'Proprietor of',11,600,'#8C8CA3')+t(24,226,a.n||'',12,600);
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'"><rect width="'+W+'" height="'+H+'" rx="10" fill="#EEF1F7"/><rect x="10" y="10" width="'+(W-20)+'" height="'+(H-20)+'" rx="6" fill="#fff"/>'+
    '<rect x="10" y="10" width="'+(W-20)+'" height="46" rx="6" fill="#171630"/>'+t(24,39,head,12,700,'#fff')+body+'</svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function kycRoute(){ return S.sel.route||'gst'; }
function kycSecondName(){ return kycRoute()==='gst'?'GST certificate':'Aadhaar'; }
function kycReadNow(){
  if(S.flow!=='kyc') return; var a=KA();
  S.sel.read=1;
  var pan=(S.sel.pan||a.pan||'AABCX1234K').toUpperCase(); S.sel.pan=pan;
  if(kycRoute()==='gst') S.sel.gst=S.sel.mis?'27AABCZ9999Z1ZQ':(a.gst||('27'+pan+'1Z5'));
  else S.sel.aad=a.aad||'XXXX XXXX 4412';
  S.sel.ocrname=panLegalName(a);
  paintModal();
}
function KA(){ var l=lineById(S.sel.line||'')||null; return l?acctOf(l):by(S.data.accounts,S.sel.acct||S.route.id); }
FLOWS.kyc={t:'Get the account verified', sub:function(){ return S.sel.read?'Read off the documents. Check the legal name before it is written to the account.':'Upload the PAN card, and the GST certificate — or Aadhaar, where there is no GST.'; },
  body:function(){ var a=KA(), r=kycRoute();
    if(S.sel.read){
      var pan=(S.sel.pan||'').toUpperCase(), gst=(S.sel.gst||'').toUpperCase(), aad=(S.sel.aad||'');
      var match=r==='aad'||gst.slice(2,12)===pan, dup=r==='gst'?S.data.accounts.filter(function(x){return x.id!==a.id&&x.gst&&x.gst.toUpperCase()===gst;})[0]:null;
      var nm=(S.sel.ocrname||'').trim(), changed=nm&&nm!==a.n;
      return (match?note('green','','<b>Read and validated.</b> '+(r==='gst'?'The ten characters inside the GSTIN are the PAN on the card.':'No GST on a proprietorship, so Aadhaar stands in for the registration certificate.')):note('red','PAN does not match the GSTIN','The PAN inside the GSTIN is '+esc(gst.slice(2,12)||'—')+'; the PAN card reads '+esc(pan)+'. One of the two documents is wrong. Go back and re-upload.','alert'))+
        '<div class="fgrid">'+field('PAN read from the card',input('pan',pan,'AAAAA9999A'))+
          (r==='gst'?field('GSTIN read from the certificate',input('gst',gst,'15 characters')):field('Aadhaar read from the document',input('aad',aad,'XXXX XXXX 9999')))+'</div>'+
        /* [stated 24 Sep] the legal name comes off the PAN, and replaces what was typed */
        field('Legal name as per PAN',input('ocrname',nm,''),'Read by OCR from the PAN card. This is what the account will be called.')+
        (changed?note('amber','The name on the account will change','<div class="kycname"><span class="kn-o">'+esc(a.n)+'</span>'+ic('arrowright','ic14')+'<span class="kn-n">'+esc(nm)+'</span></div>Every screen, document and search that names this account follows the PAN from here. The name that was typed at creation is kept on the activity trail.','info'):
          note('blue','','The name on the account already matches the PAN card. Nothing to change.'))+
        (match&&dup?note('amber','Matches an existing account','<b>'+esc(dup.n)+'</b> ('+dup.id+') already carries this GSTIN. This provisional account will merge into it: the line moves across, and '+esc(uname(dup.own))+' keeps the account.'):'');
    }
    var up=function(k,label,hint){
      var img=S.sel[k+'img'];
      return field(label, img?'<div class="kycup"><img src="'+img+'" alt="'+esc(label)+'"><div class="kycup-m"><b>'+esc(S.sel[k+'name']||label)+'</b><span class="green">'+ic('circlecheck','ic14')+'Uploaded</span><button type="button" class="quiet" data-kycclear="'+k+'">Replace</button></div></div>'
        : '<label class="pdrop sm" for="f_'+k+'"><input type="file" id="f_'+k+'" accept="image/png,image/jpeg,application/pdf" data-kycup="'+k+'" hidden>'+ic('upload','ic20')+'<b>Upload the '+esc(label.toLowerCase())+'</b><span>'+esc(hint)+'</span></label>', img?'':hint); };
    return '<div class="field"><div class="lbl">Second document</div>'+seg('route',[['gst','GST certificate'],['aad','Aadhaar — no GST']],'gst')+
        '<div class="hint">'+esc(r==='gst'?'A registered business. PAN is checked against the PAN inside the GSTIN.':'A proprietor with no GST registration. Aadhaar stands in for the registration certificate.')+'</div></div>'+
      up('pan','PAN card','An image or a PDF of the card')+
      up('doc',kycSecondName(),r==='gst'?'Form GST REG-06':'The proprietor’s Aadhaar')+
      note('blue','','Both documents are read by OCR — the numbers, and the legal name on the PAN.')+
      simblock('Prototype','The OCR is faked here. In the product these are read on upload.',
        '<button type="button" class="simbtn" data-kycsample="1">Use sample documents</button>'+
        (S.sel.panimg&&S.sel.docimg?'<button type="button" class="simbtn" data-kycmis="1">'+(S.sel.mis?'✓ PAN will not match the GSTIN':'Make the PAN mismatch the GSTIN')+'</button>':'')); },
  can:function(){ if(!S.sel.read) return !!S.sel.panimg&&!!S.sel.docimg;
    var pan=(S.sel.pan||'').trim().toUpperCase();
    if(!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return false;
    if(!(S.sel.ocrname||'').trim()) return false;
    if(kycRoute()==='aad') return !!(S.sel.aad||'').trim();
    var gst=(S.sel.gst||'').trim().toUpperCase(); return gst.length===15&&gst.slice(2,12)===pan; },
  ok:function(){ return S.sel.read?'Verify and update the name':'Read the documents'; },
  run:function(){ var l=lineById(S.sel.line||'')||null, a=KA(), r=kycRoute();
    if(!S.sel.read){ kycReadNow(); return 'stay'; }
    var pan=S.sel.pan.trim().toUpperCase(), gst=r==='gst'?S.sel.gst.trim().toUpperCase():'', aad=r==='aad'?S.sel.aad.trim():'';
    var nm=(S.sel.ocrname||'').trim(), was=a.n, dup=r==='gst'?S.data.accounts.filter(function(x){return x.id!==a.id&&x.gst&&x.gst.toUpperCase()===gst;})[0]:null;
    var ok=write(function(){
      if(dup){ S.data.lines.forEach(function(x){ if(x.acct===a.id) x.acct=dup.id; }); S.data.opps.forEach(function(x){ if(x.acct===a.id) x.acct=dup.id; }); a.con.forEach(function(c){ if(!dup.con.some(function(d){return d.e===c.e;})) dup.con.push(c); }); S.data.accounts.splice(S.data.accounts.indexOf(a),1); linesOfAcct(dup.id).forEach(function(x){ logAdd(x,'KYC verified — merged into '+dup.n,'System · '+dup.id+' keeps its owner '+uname(dup.own),'sys',1); }); return; }
      a.pan=pan; if(gst) a.gst=gst; if(aad) a.aad=aad; a.prov=0;
      if(nm&&nm!==a.n){ a.nWas=was; a.n=nm; }
      linesOfAcct(a.id).forEach(function(x){
        logAdd(x,'KYC verified','System · '+(r==='gst'?'PAN matched the PAN inside the GSTIN':'PAN and Aadhaar read — proprietorship, no GST')+' · uploaded by '+uname(S.user),'sys',1);
        if(nm&&nm!==was) logAdd(x,'Legal name updated from the PAN card','System · OCR read “'+nm+'” · was “'+was+'”','sys',1);
      });
    },'the verification');
    if(!ok) return 'fail';
    if(!l){ closeFlow(); go('acct',{id:dup?dup.id:a.id}); }
    toast(dup?'Merged into '+dup.n:'Account verified', dup?'The line moved across. '+uname(dup.own)+' keeps the account; you keep the line.':(nm&&nm!==was?'Renamed to '+nm+' from the PAN card. The KYC gate before payment is now open.':'The KYC gate before payment is now open.')); }};
/* uploads: a real file for the two documents, or the sample pair */
document.addEventListener('change',function(ev){
  var t=ev.target; if(!(t instanceof Element)||t.dataset.kycup===undefined) return;
  var f=t.files&&t.files[0]; if(!f) return; var k=t.dataset.kycup;
  var rd=new FileReader(); rd.onload=function(){ S.sel[k+'img']=rd.result; S.sel[k+'name']=f.name; paintModal(); };
  if(/^image\//.test(f.type)) rd.readAsDataURL(f); else { S.sel[k+'img']=kycDoc(k==='pan'?'pan':(kycRoute()==='gst'?'gst':'aad'),KA()); S.sel[k+'name']=f.name; paintModal(); }
});
HANDLERS.push(function(t){
  var x=t.closest('[data-kycsample]');
  if(x){ var a=KA(); S.sel.panimg=kycDoc('pan',a); S.sel.panname='PAN_'+shortName(a.n).replace(/\s+/g,'')+'.pdf';
    S.sel.docimg=kycDoc(kycRoute()==='gst'?'gst':'aad',a); S.sel.docname=(kycRoute()==='gst'?'GST_Certificate_':'Aadhaar_')+shortName(a.n).replace(/\s+/g,'')+'.pdf'; paintModal(); return true; }
  x=t.closest('[data-kycclear]'); if(x){ var k=x.dataset.kycclear; S.sel[k+'img']=''; S.sel[k+'name']=''; paintModal(); return true; }
  x=t.closest('[data-kycmis]'); if(x){ S.sel.mis=!S.sel.mis; if(S.sel.read){ var a2=KA(); S.sel.gst=S.sel.mis?('27AABCZ9999Z1ZQ'):((a2.gst||'')); } paintModal(); return true; }
  return false;
});

/* [stated 23 Sep] one request can cover several lines. For fresh business that is the opportunity's
   lines; a renewal has no opportunity, so it is the account's other renewal lines. */
function payGroup(l){ return isRen(l)?renLinesOfAcct(l.acct):linesOfOpp(l.opp); }
FLOWS.pay={t:'Raise payment request', sub:function(){ var l=FL(); return 'A request is issued against an amount, not against products — so one request can cover several '+(isRen(l)?'renewal lines on this account':'lines on the opportunity')+'.'; },
  body:function(){ var l=FL(), a=acctOf(l), gp=payGroup(l), el=gp.filter(function(x){return x.stage===9&&x.status==='open'&&x.owner===S.user&&x.pay==='pre';}), other=gp.filter(function(x){return x.stage===9&&x.status==='open'&&x.owner!==S.user&&x.pay==='pre';});
    /* [stated 23 Sep] opened from the account's Renewals tab, the ticked lines are the selection */
    if(!S.sel.l){ var pre=isRen(l)?(S.ui['rsel_'+l.acct]||[]).filter(function(id){return el.some(function(x){return x.id===id;});}):[];
      S.sel.l=pre.length?pre:el.map(function(x){return x.id;}); } var tot=el.filter(function(x){return S.sel.l.indexOf(x.id)>=0;}).reduce(function(s,x){return s+premOf(x);},0);
    var amt=S.sel.amt!==undefined?S.sel.amt:String(tot), bad=amt&&(String(amt).replace(/[^\d]/g,'')!==String(tot));
    return (a.prov?note('red','KYC outstanding','PAN and GST are mandatory before a payment request. <button class="btn sm" data-flow="kyc" data-line="'+l.id+'">Get verified</button>','lock'):note('green','','<b>Account verified.</b> The request goes straight to Ops.'))+
      el.map(function(x){ return opt('data-tog="l" data-tv="'+x.id+'"',S.sel.l.indexOf(x.id)>=0,x.product,esc(x.ins||'—')+' · '+x.id,INR(premOf(x)),true); }).join('')+
      '<div class="flex" style="justify-content:space-between;border-top:1px solid var(--border);padding-top:10px"><span class="meta">Selected lines</span><b style="font-size:var(--fs-xl)">'+INR(tot)+'</b></div>'+
      '<div class="fgrid">'+field('Payment amount',input('amt',amt,''),'',bad?'Does not match the selected lines ('+INR(tot)+'). Part payments are not supported — change the selection instead.':'')+field('Payment mode',select('mode',S.sel.mode||PAYMODE[0],PAYMODE))+'</div>'+
      '<div class="fgrid">'+field('PAN card','<input class="inp" value="PAN_'+esc(shortName(a.n).replace(/\s+/g,''))+'.pdf" disabled>')+field('GST certificate','<input class="inp" value="GST_'+esc(a.gst||'')+'.pdf" disabled>')+'</div>'+
      (other.length?note('blue','','<b>'+other.map(function(x){return esc(x.product);}).join(', ')+'</b> cannot be included — owned by '+esc(uname(other[0].owner))+'. The client will get a separate request for that.'):''); },
  can:function(){ var l=FL(), a=acctOf(l); if(a.prov) return false; if(!S.sel.l||!S.sel.l.length) return false; var el=payGroup(l).filter(function(x){return S.sel.l.indexOf(x.id)>=0;}); var tot=el.reduce(function(s,x){return s+premOf(x);},0); var amt=S.sel.amt!==undefined?S.sel.amt:String(tot); return String(amt).replace(/[^\d]/g,'')===String(tot); }, ok:'Raise ticket to Ops',
  run:function(){ var l=FL(); var ok=write(function(){ var ids=S.sel.l.slice(); ids.forEach(function(id){ var x=lineById(id); x.pay='ticket'; x.payMode=S.sel.mode||PAYMODE[0]; x.payLines=ids; x.amt=ids.reduce(function(s,i){return s+premOf(lineById(i));},0); logAdd(x,'Payment ticket PAY-'+l.id.slice(3)+' raised','System · covers '+plural(ids.length,'product line')+' · '+(S.sel.mode||PAYMODE[0]),'sys',1); }); if(isRen(l)) S.ui['rsel_'+l.acct]=[]; },'the payment request'); if(!ok) return 'fail'; toast('Ticket PAY-'+l.id.slice(3)+' raised with Ops','Stage stays at Purchase Requested — an internal queue is a ticket, not a stage'); }};

FLOWS.status={t:'Change status', sub:'Status is orthogonal to stage. Parking keeps the position; closing preserves how far it got.',
  body:function(){ var l=FL(), canLose=l.stage>=3, d=S.sel.d; var minD=ymd(S.now);
    return [['park','Time Pending','Alive, deliberately parked. Keeps its stage. Needs a revisit date and a reason'],['lost','Lost','The client did not buy from us. Needs a loss reason'+(canLose?'':' · unavailable until someone has actually been reached')],['noapp','No Appetite','We could not place it. A supply failure, not a competitive loss'],['disq','Disqualified','Should never have been in the pipeline. Needs a reason']].map(function(x){ return opt('data-pick="'+x[0]+'"',d===x[0],x[1],x[2],'',false,x[0]==='lost'&&!canLose); }).join('')+
      (d==='park'?'<div class="fgrid">'+field('Revisit on','<input class="inp" id="f_rv" data-f="rv" type="date" min="'+minD+'" value="'+esc(S.sel.rv||'')+'">','',S.sel.rv&&S.sel.rv<minD?'Cannot be in the past.':'')+field('Park reason',select('rs',S.sel.rs||'',[['','Choose a reason']].concat(PARK)))+'</div>':'')+
      (d==='lost'?field('Loss reason',select('rs',S.sel.rs||'',[['','Choose a reason']].concat(LOSS))):'')+
      (d==='disq'?field('Disqualification reason',select('rs',S.sel.rs||'',[['','Choose a reason']].concat(DISQ))):'')+
      (d==='noapp'?field('Why could it not be placed? — optional',input('rs',S.sel.rs,'Occupancy, risk reason, which insurers declined')):''); },
  can:function(){ var l=FL(), d=S.sel.d; if(!d) return false; if(d==='lost'&&l.stage<3) return false; if(d==='park') return !!S.sel.rv&&S.sel.rv>=ymd(S.now)&&!!S.sel.rs; if(d==='lost'||d==='disq') return !!S.sel.rs; return true; }, ok:'Apply status',
  run:function(){ var l=FL(); var nm={park:'Time Pending',lost:'Lost',noapp:'No Appetite',disq:'Disqualified'}[S.sel.d];
    var ok=write(function(){ l.status=S.sel.d; l.reason=S.sel.rs||''; if(S.sel.d==='park') l.revisit=new Date(S.sel.rv+'T10:00:00').getTime(); logAdd(l,'Status set to '+nm,uname(S.user)+(l.reason?' · '+l.reason:''),'sys'); fireRules(l); },'the status'); if(!ok) return 'fail';
    toast('Status: '+nm, S.sel.d==='park'?'Stage stays at '+stageName(l.stage)+' — the position is kept':'Line closed at '+stageName(l.stage)+' · how far it got is preserved'); }};
FLOWS.resume={t:'Resume this line', sub:'Takes it off Time Pending. The stage never moved.', body:function(){ var l=FL(); return note('blue','','Parked '+esc(fmtD(l.log.filter(function(e){return /Time Pending/.test(e.t);})[0]?l.log.filter(function(e){return /Time Pending/.test(e.t);})[0].at:S.now))+' · '+esc(l.reason)+'. It goes back to <b>'+esc(stageName(l.stage))+'</b>, waiting on '+esc(STAGES[l.stage-1].w)+'.'); }, can:function(){return true;}, ok:'Resume',
  run:function(){ var l=FL(); var ok=write(function(){ l.status='open'; l.reason=''; l.revisit=0; logAdd(l,'Resumed',uname(S.user),'sys'); fireRules(l); },'resuming'); if(!ok) return 'fail'; toast('Resumed','The stage never moved'); }};

FLOWS.reassign={t:'Reassign this product line', sub:'Owner sits on the product line, so this moves one line — not the opportunity, not the account.',
  body:function(){ var l=FL(); var ppl=S.data.users.filter(function(u){return (l.stage>=SALES_STAGES?u.role==='rm':(u.role==='exec'||u.role==='rm'))&&u.id!==l.owner;});
    return (l.stage>=SALES_STAGES?note('neutral','','After payment a line can only move between relationship managers.','info'):'')+ppl.map(function(p){ return opt('data-pick="'+p.id+'"',S.sel.d===p.id,p.n,p.cat||p.title); }).join('')+field('Reason (mandatory, audited)',select('rs',S.sel.rs||'',[['','Select…'],'Leave or absence','Product specialism','Workload','Client asked for a change','Other']))+note('neutral','','Open tasks on the line move with it. The clock continues from where it is — reassignment does not reset it.','clock'); },
  can:function(){ return !!S.sel.d&&!!S.sel.rs; }, ok:'Reassign',
  run:function(){ var l=FL(), to=S.sel.d; var ok=write(function(){ var from=l.owner; l.owner=to; tasksOfLine(l.id).forEach(function(t){ if(!t.done) t.owner=to; }); logAdd(l,'Product line reassigned to '+uname(to),uname(S.user)+' · '+S.sel.rs+' · from '+uname(from),'sys'); },'the reassignment'); if(!ok) return 'fail'; toast('Reassigned to '+uname(to),'Only this line moved. The account owner is unchanged'); }};
FLOWS.takeover={t:'Take this line over', sub:function(){ var l=FL(); return 'Currently '+uname(l.owner)+'. You become the owner; every action from here is yours in the trail.'; },
  body:function(){ return note('amber','This is the fallback, not the workflow','The usual move is to get the owner to do it. Take it over only when they are away and it cannot wait.')+field('Reason (mandatory, audited)',select('rs',S.sel.rs||'',[['','Select…'],'Owner on leave','Owner unreachable','Client escalation','Other'])); },
  can:function(){ return !!S.sel.rs; }, ok:'Take it over',
  run:function(){ var l=FL(); var ok=write(function(){ if(S.data.took.indexOf(l.id)<0) S.data.took.push(l.id); l.prevOwner=l.owner; var from=l.owner; l.owner=S.user; tasksOfLine(l.id).forEach(function(t){ if(!t.done) t.owner=S.user; }); logAdd(l,'Taken over by '+uname(S.user),S.sel.rs+' · from '+uname(from),'sys'); },'the takeover'); if(!ok) return 'fail'; toast('You now own this line','Open tasks moved with it. Hand it back from Manage when '+uname(l.prevOwner)+' is back.'); }};
FLOWS.handback={t:'Hand back', sub:function(){ var l=FL(); return 'Returns the line to '+uname(l.prevOwner||'nikhil')+'. The trail shows the round trip — taken, worked, returned.'; }, body:function(){ return note('neutral','','Open tasks go back with it.'); }, can:function(){return true;}, ok:'Hand back',
  run:function(){ var l=FL(); var ok=write(function(){ var to=l.prevOwner||'nikhil'; l.owner=to; l.prevOwner=''; var i=S.data.took.indexOf(l.id); if(i>=0) S.data.took.splice(i,1); tasksOfLine(l.id).forEach(function(t){ if(!t.done) t.owner=to; }); logAdd(l,'Handed back to '+uname(to),uname(S.user),'sys'); },'the hand-back'); if(!ok) return 'fail'; toast('Handed back','The line is home.'); }};
