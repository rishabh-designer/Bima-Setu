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
    : (l.rate===1?'DUA — priced by the rater, no RFQ':(l.rate===0?(l.rfq&&l.rfq.direct?'Non-DUA — floated straight to placement':'Non-DUA — RFQ, then placement'):'DUA or non-DUA is decided when the requirement is captured'))));
  /* [stated 26 Sep · 2.1] hover shows entered-on and left-on; a stage visited before a route switch stays ticked */
  var seen={}; visitsOf(l).forEach(function(v){ if(v.out) seen[v.n]=1; });
  var step=function(s){ var c='step'; if(s.n<l.stage||(s.n>l.stage&&seen[s.n])) c+=' done'; else if(s.n===l.stage) c+=(dead(l)?' now dead':' now'); return '<div class="'+c+'" title="'+esc(stageHover(l,s))+'"><div class="b"></div><div class="t">'+esc(s.t)+'</div></div>'; };
  var seller=l.soldBy?uname(l.soldBy):(paid?'sales':uname(l.owner));
  var head='<div class="stagecard"><div class="cap"><b>'+esc(cap)+'</b><span class="sp"></span><span class="meta">'+esc(side)+'</span></div>';
  if(!paid){
    var vis=STAGES.slice(0,SALES_STAGES).filter(function(s){ return !skipped(l,s.n)||seen[s.n]; });
    return head+'<div class="track"><div class="phase sales solo"><div class="ph-h">Selling <b>'+esc(seller)+'</b></div><div class="ph-steps" style="grid-template-columns:repeat('+vis.length+',minmax(0,1fr));min-width:'+(vis.length*60)+'px">'+vis.map(step).join('')+'</div></div></div></div>';
  }
  return head+'<div class="track"><div class="phase soldc"><div class="ph-h">Selling <b>'+esc(seller)+'</b></div>'+
      '<div class="soldblk" title="Selling done"><div class="b"></div><div class="t">'+ic('check','ic14')+'Sold · Payment Completed</div>'+(l.paidAt?'<div class="d">Paid '+esc(fmtD(l.paidAt))+'</div>':'')+'</div></div>'+
    '<div class="hand"><span>→ RM</span><i></i></div>'+
    '<div class="phase post wide"><div class="ph-h">Post-purchase <b>'+esc(uname(l.owner))+'</b></div><div class="ph-steps">'+STAGES.slice(SALES_STAGES).filter(function(s){ return !(isChola(l)&&(s.n===12||s.n===13)); }).map(step).join('')+'</div></div></div></div>';
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
function naAttr(a,l){ if(a[0].indexOf('go:')===0){ var g=a[0].split(':'); return 'data-go="'+g[1]+'" data-id="'+g.slice(2).join(':')+'"'; } if(a[0]==='copylink') return 'data-copy="1"'; if(a[0]==='resendRfq') return 'data-resendrfq="'+l.id+'"'; if(a[0]==='resendQcr') return 'data-resendqcr="'+l.id+'"'; if(a[0]==='noapp') return 'data-flow="status" data-line="'+l.id+'" data-pre="noapp"'; if(a[0].indexOf('act:')===0) return 'data-rfqact="'+a[0].slice(4)+'" data-line="'+l.id+'"'; return a[0].indexOf('tab:')===0 ? 'data-uiset="ltab_'+l.id+'" data-uv="'+a[0].slice(4)+'"' : 'data-flow="'+a[0]+'" data-line="'+l.id+'"'; }
function naCard(l){
  var na=nextAction(l), mine=canAct(l), prim=na.acts[0], secs=na.acts.slice(1,3), a=acctOf(l);
  var b=function(x,cls){ return x[2]?'<button class="btn '+cls+'" disabled title="'+esc(x[2])+'">'+esc(x[1])+'</button>':'<button class="btn '+cls+'" '+naAttr(x,l)+'>'+esc(x[1])+'</button>'; };
  var foot='';
  /* [stated 26 Sep · 2.8] one primary, at most two secondaries; no button row when the viewer has nothing to do */
  if(mine&&prim) foot='<div class="acts">'+b(prim,'primary lg full')+(secs.length?'<div class="sec">'+secs.map(function(x){return b(x,'sm');}).join('')+'</div>':'')+
    secs.filter(function(x){return x[2];}).map(function(x){ return '<div class="w">'+esc(x[1])+' — '+esc(x[2])+'</div>'; }).join('')+'</div>';
  else if(!mine&&canTakeOver(l)) foot='<div class="acts"><button class="btn lg full" data-flow="takeover" data-line="'+l.id+'">Take ownership</button></div>';
  var own='';
  var pan=a&&a.prov&&l.stage<9&&!dead(l)?'<div class="w">'+ic('info','ic14')+' No PAN on this account yet. Not needed now — a payment request will wait for it.</div>':'';
  return '<div class="na '+na.tone+'"><div class="k" data-soft="1">'+esc(na.lab||'Next action')+'</div><div class="i" data-soft="1">'+esc(na.txt)+'</div><div class="w" data-soft="1"'+(na.why?'':' hidden')+'>'+esc(na.why||'')+'</div>'+own+pan+foot+'</div>';
}
function simsFor(l){
  if(!canAct(l)) return '';
  var b=[];
  if(l.stage===4&&l.rate===0){ b.push(simbtn('Open the client’s link','data-rfqact="client" data-line="'+l.id+'"')); b.push(simbtn('Client fills the rest and approves','data-sim="rfqClient" data-line="'+l.id+'"')); }
  if(l.stage===3&&l.rate===1) b.push(simbtn('The rater comes back empty — no insurer quotes','data-sim="raterNone" data-line="'+l.id+'"'));
  if(l.stage===6 && !l.plcQ && !l.qAns && l.round===1) b.push(simbtn('Placement raises a query','data-sim="plcQuery" data-line="'+l.id+'"'));
  if(l.stage===6 && (l.qAns||l.round>1||!l.plcQ)){ b.push(simbtn('Placement returns the QCR','data-sim="extPlc" data-line="'+l.id+'"')); b.push(simbtn('Placement returns: every insurer declined','data-sim="extNone" data-line="'+l.id+'"')); }
  if(l.stage===9 && l.pay==='ticket') b.push(simbtn('Ops returns the payment details','data-sim="extOps" data-line="'+l.id+'"'));
  if(l.stage===10&&isChola(l)){ if(!cholaLinkExpired(l)){ b.push(simbtn('Client pays on Chola’s link · policy issued in real time','data-sim="cholaPaid" data-line="'+l.id+'"')); b.push(simbtn('24 hours pass — the payment link expires','data-sim="cholaExpire" data-line="'+l.id+'"')); } }
  else if(l.stage===10) b.push(simbtn('Client pays · sends the screenshot','data-sim="extPaid" data-line="'+l.id+'"'));
  if(l.stage>=SALES_STAGES) b=b.concat(postSims(l));
  if((me().role==='exec'||me().role==='rm')&&l.stage<14) b.push(simbtn('Your manager takes this line over','data-sim="extTake" data-line="'+l.id+'"'));
  if(!b.length) return '';
  return simblock('Simulate an inbound event','Things that happen outside the CRM — a client, placement or Ops acting — faked so the flow can continue.',b.join(''));
}
/* [stated 26 Sep · 2.9 · PD-102] a product line can be added only while the opportunity is open, and
   only by someone who owns a line on it — a manager cannot add a line to a team member's opportunity */
function addLineWhy(o,u){ u=u||me(); if(!o) return 'No opportunity.'; if(oppStatus(o).tx!=='Open') return 'A product line can only be added while the opportunity is open.';
  if(!linesOfOpp(o.id).some(function(l){return l.owner===u.id;})) return 'Only someone who owns a product line on this opportunity can add one.'; return ''; }
function addLineBtn(o,from,cls){ var why=addLineWhy(o); if(why&&/owns a product line/.test(why)) return '';
  return why?'<button class="btn '+(cls||'sm')+'" disabled title="'+esc(why)+'">'+ic('plus')+'Add product line</button>'
    :'<button class="btn '+(cls||'sm')+'" data-flow="addLine" data-acct="'+o.acct+'" data-opp="'+o.id+'"'+(from?' data-from="'+from+'"':'')+'>'+ic('plus')+'Add product line</button>'; }
function zc(title,body,extra){ return '<div class="zc"><div class="zh"><span>'+esc(title)+'</span>'+(extra||'')+'</div>'+body+'</div>'; }
function statusPill(l){ if(l.status==='open') return chip('Open','green',true,true);
  var tx=l.status==='park'?'Time Pending · revisit '+fmtD(l.revisit)+(l.reason?' · '+l.reason:''):closedTx(l);
  return '<span title="'+esc(tx)+'">'+chip(l.status==='park'?'Time Pending':statusTx(l),statusTone(l),true,true)+'</span>'; }
function lwLeft(l,a,o){
  var c=l.contact||{}, u=me(), sole=a.sole||(!!a.aad&&!a.gst), sib=o?linesOfOpp(o.id).filter(function(x){return x.id!==l.id;}):renLinesOfAcct(l.acct).filter(function(x){return x.id!==l.id;});
  var acc=zc('Account & contact','<button class="link zname" data-go="acct" data-id="'+a.id+'">'+esc(a.n)+'</button><div class="zchips">'+(a.prov?chip('Provisional','amber',false,true):chip('Verified','green',false,true))+(sole?chip('Sole proprietor','neutral',false,true):'')+'</div>'+
    '<div class="zkv"><span>Contact on this line</span><b>'+esc(c.n||'—')+'</b>'+(c.m||c.e?'<div class="meta">'+esc([c.m,c.e].filter(Boolean).join(' · '))+'</div>':'')+'</div>'+
    '<div class="zkv"><span>Account owner</span><b>'+esc(uname(a.own))+'</b></div>');
  var kyc=zc('KYC',(a.prov?'<div class="meta">'+(a.pan||a.gst?'PAN and GST documents not uploaded yet.':'No PAN and no GST yet.')+' Everything up to a quote works — the payment request waits for it.</div>'+(onAcct(a,u)?'<button class="btn sm mt8" data-flow="kyc" data-acct="'+a.id+'" data-line="'+l.id+'">'+ic('shield')+'Get verified</button>':'')
    :'<div class="meta">'+esc(kycLine(a))+'</div>'));
  var sl=sib.length?sib.map(function(x){ var tag=dead(x)?chip(statusTx(x),'red',false,true):(x.status==='park'?chip('Time Pending','amber',false,true):(x.stage>=9&&x.pay!=='pre'&&x.stage<SALES_STAGES?chip('In '+payRef(x),'violet',false,true):''));
      return '<button class="zsib'+(dead(x)?' dim':'')+'" data-go="line" data-id="'+x.id+'"><b>'+esc(x.product)+'</b><span class="meta">'+esc(stageName(x.stage))+' · '+esc(uname(x.owner))+'</span>'+tag+'</button>'; }).join('')
    :'<div class="meta">'+(o?'The only product line on this opportunity.':'No other renewal lines on this account.')+'</div>';
  var sibs=zc(o?'Other lines on '+o.id:'Other renewal lines',sl+(o?'<div class="mt8">'+addLineBtn(o,l.id,'sm full')+'</div>':''));
  return acc;
}
function lwRight(l){
  var tks=ticketsOf(l), lt=tasksOfLine(l.id).filter(function(t){return !t.done;}), sold=l.soldBy&&l.soldBy!==l.owner;
  var own=(l.log||[]).filter(function(e){ return /reassigned|Taken over|Handed back|Owner changed|Ownership transferred/i.test(e.t); }).slice(0,3);
  var t1=zc('Tickets',tks.length?tks.map(function(t){ return '<button class="zsib" data-go="ticket" data-id="'+t.id+'"><b>'+esc(t.id)+'</b><span class="meta">'+esc(t.ty)+' · '+esc(t.desk)+'</span>'+chip(t.st,t.tone,true,true)+'</button>'; }).join(''):'<div class="meta">None yet. Placement, payment and post-purchase tickets appear here as they open.</div>');
  var t2=zc('Tasks',lt.length?lt.slice(0,3).map(function(t){ var st=taskState(t); return '<div class="ztask"><b>'+esc(t.title)+'</b><span class="'+(st==='esc'||st==='over'?'red':(st==='today'?'amber':'meta'))+'">'+esc(taskStateTx(t))+'</span></div>'; }).join('')+(lt.length>3?'<button class="link mt4" data-uiset="ltab_'+l.id+'" data-uv="tasks">'+(lt.length-3)+' more</button>':''):'<div class="meta">No open tasks.</div>',isMine(l)?'<button class="link" data-flow="addTask" data-line="'+l.id+'">Add</button>':'');
  var kd=[['Created',fmtD(l.createdAt)],['In this stage since',fmtD(l.enteredAt)],['Last activity',fmt(lastActivity(l))]];
  if(l.status==='park') kd.push(['Revisit on',fmtD(l.revisit)]); if(l.paidAt) kd.push(['Paid',fmtD(l.paidAt)]); if(l.renews){ var rh=renPolHit(l); if(rh) kd.push(['Policy ends',fmtD(rh.p.exp)]); }
  var t3=zc('Key dates',kd.map(function(x){ return '<div class="zkv row"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>'; }).join(''));
  var t4=zc('Ownership & audit','<div class="zkv row"><span>Owner</span><b>'+esc(uname(l.owner))+'</b></div>'+(sold?'<div class="zkv row"><span>Sold by</span><b>'+esc(uname(l.soldBy))+'</b></div>':'')+'<div class="zkv row"><span>Came in by</span><b>'+esc(l.inbound?'Inbound · assignment rule':(isRen(l)?'Renewal · opened by the system':'Added by hand'))+'</b></div>'+
    (own.length?own.map(function(e){ return '<div class="ztask"><b>'+esc(e.t)+'</b><span class="meta">'+esc(e.m)+' · '+esc(fmtD(e.at))+'</span></div>'; }).join(''):'<div class="meta mt4">The owner has not changed.</div>'));
  /* [stated 27 Sep] Tickets, Tasks, Key dates and Ownership & audit are off the side — they live on their tabs */
  return simsFor(l);
}
SCREENS.line=function(){
  var l=lineById(S.route.id); if(!l) return SCREENS.notfound();
  var a=acctOf(l), o=oppOf(l), tab=S.ui['ltab_'+l.id]||'overview', ro=readOnlyWhy(l), u=me();
  if(!canSeeLine(l,u)) return noAccess('product line');
  /* [stated 26 Sep · 2.8] still being sold: Overview · Requirement · RFQ & quotes · Tickets · Activity · Tasks · Manage.
     Handed over after payment: Overview · Post-purchase · Mail trail · Requirement · Tickets · Activity · Tasks · Manage. */
  var hasDocs=!!polOfLine(l);
  var tabs=(l.iss?[['overview','Overview'],['post','Post-purchase'],['mail','Mail trail']].concat(hasDocs?[['docs','Documents']]:[])
                 :[['overview','Overview']].concat(hasDocs?[['docs','Documents']]:[['quotes','RFQ & quotes']]))
    .concat([['tickets','Tickets'],['activity','Activity'],['tasks','Tasks'],['manage','Manage']]);
  if(!tabs.some(function(t){return t[0]===tab;})) tab='overview';
  if(l.iss && !S.ui['ltab_'+l.id]) tab='post';
  var tks=ticketsOf(l), ltasks=tasksOfLine(l.id).filter(function(t){return !t.done;});
  var body='';
  if(tab==='overview'){
    body='<div class="phhd"><div class="t">Captured at creation</div><div class="a">Line age <b>'+plural(daysBetween(l.createdAt,S.now),'day')+'</b></div></div><div class="kvgrid mt12">'+
      (o?kv('Opportunity','<button class="link" data-go="opp" data-id="'+o.id+'">'+esc(oName(o))+'</button>')+kv('Business type',o.bt===o.type?esc(o.type):esc(o.bt)+' · '+esc(o.type))
         :kv('Business type','Renewal <span class="meta">· no opportunity — a renewal is a product line on the account</span>'))+(l.renews?renOverview(l):'')+
      kv('Source',esc(l.src||(o?o.src:'')||'—'))+kv('Created',esc(fmtD(l.createdAt)))+
      kv('Calls',plural(callsMade(l),'call')+(l.stage<3&&!everConnected(l)&&l.status==='open'?'<div class="meta">'+(ATTEMPT_CAP-l.att)+' attempts left</div>':''))+
      (l.inbound?kv('Done online',esc(({legs:plural(l.inbound.legs||0,'step')+' of 4 discovery steps',rated:'Discovery and the rater’s quotes',selected:'Discovery, quotes and a quote selection'})[l.inbound.step]||'Contact details only')):'')+'</div>'+(l.renews?renFlag(l):'')+
      (l.stage>=9&&l.picked?diamonds(true)+soldBlock(l):'')+
      (l.stage>=1?diamonds(true)+reqSection(l,true):'');
  } else if(tab==='req'){
    body=reqSection(l,true); 
  } else if(tab==='post'){ body=postTab(l); }
  else if(tab==='quotes'){ body=l.stage<3&&!l.webQuotes?empty('file','Nothing to quote yet','The RFQ opens once the requirement is captured.'):quotesTab(l); }
  else if(tab==='docs'){ body=docsTab(l); }
  else if(tab==='mail'){ body=mailTrail(l); }
  else if(tab==='activity'){ body=lineActivity(l); }
  else if(tab==='tickets'){ body='<div class="phhd"><div class="t">Tickets on this line</div><div class="a">'+plural(tks.length,'ticket')+(canAct(l)&&!dead(l)?' <button class="btn sm primary" data-flow="lineTicket" data-line="'+l.id+'">'+ic('plus')+'Raise ticket</button>':'')+'</div></div><div class="mt12">'+(tks.length?'<div class="rowlist" style="border:1px solid var(--border);border-radius:12px">'+tks.map(function(t){ return '<div class="row" data-go="ticket" data-id="'+t.id+'"><div class="bd"><b>'+esc(t.id)+'</b> '+chip(t.st,t.tone,true,true)+'<div class="m2">'+esc(t.ty)+' · '+esc(t.desk)+' · raised '+esc(fmtD(t.raised))+(t.pend?' · <span class="amber">'+esc(t.pend)+'</span>':'')+'</div></div><div class="rt">'+(t.act&&canAct(l)?'<button class="btn sm" data-flow="'+t.act+'" data-line="'+l.id+'">'+esc(t.actLbl)+'</button>':'')+'<button class="btn sm ghost" data-go="ticket" data-id="'+t.id+'">Open ticket</button></div></div>'; }).join('')+'</div>':empty('ticket','No tickets on this line','A placement ticket opens when the RFQ is floated, a payment ticket when the request is raised, a post-purchase ticket at Payment Completed.'))+'</div>'; }
  else if(tab==='tasks'){ body='<div class="phhd"><div class="t">Tasks on this line</div>'+(isMine(l)?'<button class="btn sm" data-flow="addTask" data-line="'+l.id+'">'+ic('plus')+'Add task</button>':'')+'</div><div class="mt12">'+(ltasks.length?'<div class="rowlist" style="border:1px solid var(--border);border-radius:12px">'+ltasks.map(function(t){return taskRow(t,{who:t.owner!==S.user});}).join('')+'</div>':empty('checks','No open tasks on this line','Rules create tasks when the line enters a stage; call outcomes create follow-ups; you can add your own.'))+'</div>'; }
  else if(tab==='manage'){ body=manageTab(l); }
  var w=actingParty(l), p=prio(l);
  var ovf='<details class="ovf"><summary class="btn sm ghost" aria-label="More">'+ic('more','ic16')+'</summary><div class="menu">'+
    '<button data-copy="1">Copy link to this line</button><button data-go="acct" data-id="'+a.id+'">Open the account</button>'+(o?'<button data-go="opp" data-id="'+o.id+'">Open the opportunity</button>':'')+'<button data-uiset="ltab_'+l.id+'" data-uv="manage">Manage</button></div></details>';
  var axes='<div class="axes">'+statusPill(l)+'<span title="'+esc(waitHow(l))+'">'+chip('Waiting on '+w,waitTone(w),false,true)+'</span>'+(p?'<span title="Renewal priority · '+esc(renInTx(renDays(l)))+'">'+prioBadge(l)+'</span>':'')+
    (dead(l)||l.stage===14?'':chip(plural(daysInStage(l),'day')+' in stage',daysInStage(l)>=QUIET_DAYS?'red':'neutral',false,true))+chip(routeTx(l),l.rate===1?'violet':'neutral',false,true)+(l.renews?renHeadChip(l):'')+'</div>';
  var banners=(ro?'<div class="banner '+(dead(l)?'red':(l.stage===14?'green':'neutral'))+' mt12">'+ic('lock','ic14')+'<span>'+esc(ro)+'</span></div>':'')+
    (isDupMerge(l)?'<div class="banner violet mt12">'+ic('info','ic14')+'<span>This line came across in an account merge and duplicates another one on the same product. It was closed as <b>Disqualified · Duplicate after merge</b>.</span></div>':'')+
    (l.renews&&renPolHit(l)&&renPolHit(l).p.endo>0?'<div class="banner amber mt12">'+ic('alert','ic14')+'<span><b>Endorsed since issue</b> — '+esc(renPolHit(l).p.pno||renPolHit(l).p.id)+' has '+plural(renPolHit(l).p.endo,'completed endorsement')+'. Check them before quoting. <button class="link" data-go="policy" data-id="'+esc(renPolHit(l).p.id)+'">Open the policy</button></span></div>':'')+
    (l.status==='park'?'<div class="banner amber mt12">'+ic('clock','ic14')+'<span><b>Time Pending</b> — revisit '+esc(fmtD(l.revisit))+' · '+esc(l.reason)+'. The stage is untouched. It comes back to Open on that date.</span></div>':'');
  var html='<div class="lhd"><div class="crumbs"><button data-go="acct" data-id="'+a.id+'">'+esc(a.n)+'</button>'+ic('chevright','ic14')+(o?'<button data-go="opp" data-id="'+o.id+'">'+esc(o.id)+'</button>'+ic('chevright','ic14'):'<span class="b">Renewal</span>'+ic('chevright','ic14'))+'<b>'+esc(l.product)+'</b></div>'+
    '<div class="hdrow"><div style="min-width:0"><div class="h1">'+esc(l.product)+'</div><div class="metaline"><span class="b">'+esc(a.n)+'</span>'+(o?'<span class="sep">·</span><span>'+esc(o.id)+'</span>':'')+'<span class="sep">·</span><span>'+esc(l.id)+'</span></div></div><span class="sp"></span>'+
      '<div class="acts"><span class="ownchip" title="Owner of this product line">'+avatar(uname(l.owner),true)+esc(uname(l.owner))+'</span>'+(canTakeOver(l)?'<button class="btn sm" data-flow="takeover" data-line="'+l.id+'">Take ownership</button>':'')+(S.data.took.indexOf(l.id)>=0&&isMine(l)?'<button class="btn sm outline" data-flow="handback" data-line="'+l.id+'">Hand back</button>':'')+ovf+'</div></div>'+axes+'</div>'+
    banners+'<div class="mt12">'+stageTrack(l)+'</div>'+
    '<div class="lw mt16"><div class="lz lc">'+
    '<div class="tabs">'+tabs.map(function(t){return '<button data-uiset="ltab_'+l.id+'" data-uv="'+t[0]+'"'+(tab===t[0]?' class="on"':'')+'>'+t[1]+(t[0]==='tasks'&&ltasks.length?' ('+ltasks.length+')':'')+(t[0]==='tickets'&&tks.length?' ('+tks.length+')':'')+'</button>';}).join('')+'</div>'+
    '<div class="pane"><div class="pb">'+panelOr('lw-body',function(){return body;})+'</div></div></div>'+
    '<div class="lside"><div class="lz ll">'+lwLeft(l,a,o)+'<div id="nacard">'+naCard(l)+'</div></div><div class="lz lr">'+lwRight(l)+'</div></div></div>';
  return {sc:'Product line', ctx:l.id, html:html};
};
/* the line's Activity tab — no Log activity button: calls are logged from the call, the rest by the system [F5] */
function lineActivity(l){ var k='lact_'+l.id, cur=S.ui[k]||'', q=(S.ui['lq_'+l.id]||'').toLowerCase();
  var items=(l.log||[]).filter(function(e){ return (!cur||actKindOf(e.kind,e.t)===cur)&&(!q||(e.t+' '+(e.m||'')+' '+(e.x||'')).toLowerCase().indexOf(q)>=0); });
  return '<div class="phhd"><div class="t">Activity</div><div class="a">newest first · written by the system and the call form</div></div>'+
    '<div class="flex wrap mt8" style="gap:10px;align-items:center">'+actFilterChips(k,cur)+'<span class="sp"></span><input class="inp" style="max-width:220px" placeholder="Search this trail" id="lq_'+l.id+'" data-ui="lq_'+l.id+'" value="'+esc(S.ui['lq_'+l.id]||'')+'"></div>'+
    '<div class="mt8">'+(items.length?actList({log:items},0):empty('inbox',(l.log||[]).length?'Nothing matches these filters':'No activity yet',(l.log||[]).length?'Clear the filter or the search.':'Calls and stage moves land here as they happen.'))+'</div>'; }
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
/* [stated 26 Sep · 8.3] a quote is valid 30 days from delivery; its status is quoted · expired · rejected · selected */
function quoteAt(l){ if(l.qAt) return l.qAt; var e=(l.log||[]).filter(function(x){ return /Quotes returned by placement|Rater returned prices|Quote selected on the website/.test(x.t); })[0]; return e?e.at:(l.enteredAt||S.now); }
function quoteUntil(l){ return quoteAt(l)+QUOTE_VALID*86400000; }
function quoteSt(l,q){ if(q.st!=='quoted') return q.st==='declined'?'declined':'awaited'; if(l.picked===q.i&&l.stage>=9) return 'selected'; if(l.stage>=9||(l.dauQcr&&l.rate===0&&l.dauQcr.q.indexOf(q.i)>=0)) return 'rejected'; if(S.now>quoteUntil(l)) return 'expired'; return 'quoted'; }
var QST={quoted:['Quoted','green'],expired:['Expired','neutral'],rejected:['Not selected','neutral'],selected:['Selected','violet'],declined:['Declined','red'],awaited:['Awaited','neutral']};
function quoteTable(l,qs,dau){
  var si=(l.req||{}).si||'—', origin=l.webQuotes?'Website':(dau?'Rater':'Placement · round '+l.round), web={}; (l.webQuotes||[]).forEach(function(w){ web[w.i]=w.sel?'selected on website':'viewed on website'; });
  return '<div class="tw mt12"><table class="t"><thead><tr><th>Insurer</th><th>Status</th><th class="num">Premium</th><th>Sum insured</th><th>Valid until</th><th>From</th><th></th></tr></thead><tbody>'+qs.map(function(q){ var st=quoteSt(l,q), inq=dau&&l.stage>=8&&l.qsel&&l.qsel.length&&l.qsel.indexOf(q.i)>=0;
    return '<tr'+(st==='expired'||st==='declined'||st==='awaited'||st==='rejected'?' class="dim"':'')+'><td class="nm">'+esc(q.i)+(q.rt?' '+chip('Instant issuance','violet',false,true):(st==='quoted'&&qs.some(function(x){return x.rt;})?' '+chip('Assisted issuance','neutral',false,true):''))+(q.lo&&st==='quoted'?' '+chip('Lowest','green',false,true):'')+(inq?' '+chip('In the QCR','blue',false,true):'')+(q.r?'<div class="sub">'+esc(q.r)+'</div>':'')+(web[q.i]?'<div class="sub">'+esc(web[q.i])+'</div>':'')+'</td><td>'+chip(QST[st][0],QST[st][1],false,true)+'</td><td class="num">'+(q.p?INR(q.p):'—')+'</td><td>'+(q.p?esc(si):'—')+'</td><td>'+(q.p?esc(fmtD(quoteUntil(l))):'—')+'</td><td class="meta">'+esc(origin)+'</td>'+
      '<td class="right" style="white-space:nowrap">'+(q.st==='quoted'?docBtns('Quote · '+q.i,{line:l.id}):'')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
    '<div class="meta mt8">Valid '+QUOTE_VALID+' days from '+(dau?'the rater’s price':'delivery')+'. The lowest-premium marker is internal — the client’s copy names no preferred quote.</div>';
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
    return empty('file','Nothing to quote yet','DUA or non-DUA is decided when the requirement is captured. A DUA line gets the rater’s quotes straight away; a non-DUA line gets the RFQ on this tab.');
  }
  if(l.rate===1){
    if(l.stage<8){
      h+='<div class="phhd"><div class="t">Quotes from the rater</div><div class="a">DUA · priced from the requirement · no RFQ</div></div>'+quoteTable(l,dauQuotes(l),true)+
        (canAct(l)&&l.stage===3?'<div class="mt12"><button class="btn primary sm" data-flow="qcr" data-line="'+l.id+'">Select quotes and send QCR</button></div>':'');
    } else h+=qcrSection(l);
  } else {
    var folded=l.rfq&&l.rfq.st==='floated';
    if(!folded) h+=rfqBlock(l);
    if(l.dauQcr){ h+=diamonds(true)+'<div class="phhd"><div class="t">Before the switch</div><div class="a">DUA · from the rater</div></div><div class="qcards mt12">'+qcrCard(l,l.dauQcr.v,{rej:true,label:'View'})+'</div>'; }
    var qh='';
    if(l.stage>=7||(l.stage===6&&l.round>1)) qh=(l.stage>=7&&!l.allDecl?'<div class="phhd"><div class="t">Quotes</div><div class="a">round '+l.round+' · from placement</div></div>'+quoteTable(l,QUOTES.plc,false)+diamonds(true):(l.allDecl&&l.stage===7?'<div class="banner red mt8">'+ic('alert','ic14')+'<span><b>No insurer quoted</b> on round '+l.round+'. Close it as No Appetite from the next-action card.</span></div>':''))+qcrSection(l);
    else if(l.stage===6) qh='<div class="phhd"><div class="t">QCR</div><div class="a">with placement · ticket PLC-'+l.id.slice(3)+'</div></div><div class="qcards mt12"><div class="qcard muted"><div class="qc-ic">'+ic('file','ic20')+'</div><div class="qc-bd"><b>Quote Comparison Report</b><div class="qc-m">Placement builds it and it lands here when the ticket responds</div></div></div></div>';
    if(folded) h=qh+(qh?'<div class="mt16"></div>':'')+rfqFolded(l)+(l.dauQcr?h:'');
    else if(qh) h+=diamonds(true)+qh;
  }
  return h;
}
function manageTab(l){
  var u=me(), o=oppOf(l);
  var rows=[];
  if(canAct(l)&&l.stage<SALES_STAGES) rows.push(['Change status','Time Pending, or close it as Lost, No Appetite, Disqualified'+(l.stage<=10?' or Withdrawn':'')+'. The stage is preserved either way.','status','Change status']);
  /* [stated 26 Sep · 4.5 · TBD-58] only the owner's manager reassigns, and only inside their own team */
  if(isMgrRole(u)&&!dead(l)&&l.stage<14&&!isMine(l)) rows.push(inMyTeam(l.owner,u)?['Reassign this product line','Moves this one line to someone in your team. The account owner does not change. Open tasks go with it.','reassign','Reassign']:['Reassign this product line','This line is outside your team.','','','Not yours to move']);
  else if(isMine(l)&&!dead(l)&&l.stage<14&&!isMgrRole(u)) rows.push(['Reassign this product line','Only '+uname((userById(l.owner)||{}).mgr||'vikram')+' can reassign this line.','','','Manager only']);
  if(canTakeOver(l)) rows.push(['Take ownership','For when '+uname(l.owner)+' is away and this cannot wait. You become the owner; the trail records it.','takeover','Take ownership']);
  if(S.data.took.indexOf(l.id)>=0&&isMine(l)) rows.push(['Hand back','Return the line to '+uname(l.prevOwner||'')+', who owned it before you took it.','handback','Hand back']);
  if(l.status==='park'&&isMine(l)) rows.push(['Resume','Take it off Time Pending. The stage never moved.','resume','Resume']);
  var h='<div class="phhd"><div class="t">Manage</div></div><div class="rowlist mt12" style="border:1px solid var(--border);border-radius:12px">'+
    (rows.length?rows.map(function(r){ return '<div><div class="bd"><b>'+esc(r[0])+'</b><div class="m">'+esc(r[1])+'</div></div><div class="rt">'+(r[2]?'<button class="btn sm" data-flow="'+r[2]+'" data-line="'+l.id+'">'+esc(r[3])+'</button>':chip(r[4]||'','neutral',false,true))+'</div></div>'; }).join(''):'<div><div class="bd meta">Nothing to manage here — '+esc(readOnlyWhy(l)||'the line is closed')+'</div></div>')+'</div>'+
    (l.iss?diamonds(true)+manageTicketBlock(l):'')+
    diamonds(true)+'<div class="h3">Related</div><div class="rowlist mt8" style="border:1px solid var(--border);border-radius:12px">'+
    (o?'<div class="row" data-go="opp" data-id="'+o.id+'"><div class="bd"><b>'+esc(oName(o))+'</b><div class="m">'+plural(linesOfOpp(o.id).length,'product line')+' · add a line or raise a payment request across lines there</div></div><div class="rt">'+ic('chevright')+'</div></div>'
       :'<div class="row" data-uiset="atab_'+l.acct+'" data-uv="ren" data-go="acct" data-id="'+l.acct+'"><div class="bd"><b>Renewals on '+esc(acctName(l))+'</b><div class="m">'+plural(renLinesOfAcct(l.acct).filter(function(x){return !dead(x);}).length,'renewal line')+' · raise a payment request across several of them there</div></div><div class="rt">'+ic('chevright')+'</div></div>')+
    '<div class="row" data-go="acct" data-id="'+l.acct+'"><div class="bd"><b>'+esc(acctName(l))+'</b><div class="m">Account 360 — policies, contacts, KYC</div></div><div class="rt">'+ic('chevright')+'</div></div></div>';
  return h;
}
HANDLERS.push(function(t){ var x=t.closest('[data-uiset="tkf"][data-uv="all"].btn'); if(x){ S.ui.tkk='all'; } return false; });
HANDLERS.push(function(t){ var x=t.closest('[data-resendqcr]'); if(!x) return false; var l=lineById(x.dataset.resendqcr); if(l&&write(function(){ logAdd(l,'QCR v'+l.round+' sent again to '+(l.contact.n||'the client'),uname(S.user)+' · email · same version','email'); },'the resend')){ paint(); toast('QCR v'+l.round+' sent again','Same version — nothing changed.'); } return true; });
HANDLERS.push(function(t){ var x=t.closest('[data-resendrfq]'); if(!x) return false; var l=lineById(x.dataset.resendrfq); if(!l) return true; if(write(function(){ logAdd(l,'RFQ link resent to '+(l.contact.n||'the client'),uname(S.user)+' · email · same link','email'); },'the resend')){ paint(); toast('RFQ link resent','Same link — what they filled so far is kept.'); } return true; });
HANDLERS.push(function(t){
  var x=t.closest('[data-copy]'); if(x){ toast('Link copied'); return true; }
  x=t.closest('[data-sim]'); if(x){ var l=lineById(x.dataset.line); if(!l) return true; runSim(x.dataset.sim,l); return true; }
  return false;
});
function runSim(k,l){
  var ok=write(function(){
    if(k==='rfqClient'){ var n=rfqFillRest(l,'client','',S.now); logAdd(l,'Client filled '+plural(n,'field')+' on the link','System','rfq',1); rfqVerify(l); moveStage(l,5,'Client verified the RFQ'); }
    if(k==='raterNone'){ logAdd(l,'Rater returned no quotes','System · every insurer declined the risk','sys',1); rfqSwitch(l,'The rater returned no quotes',''); }
    if(k==='extOpsQ'){ l.payQ={q:'The insurer needs the GSTIN address to match the proposal. Which address should the receipt carry?',at:S.now,ans:''}; logAdd(l,'Query from Ops on '+payRef(l),'System · '+OPS_OWNER+' · '+l.payQ.q,'sys',1); }
    if(k==='extExpire'){ var old=payRef(l); (l.payLines&&l.payLines.length?l.payLines:[l.id]).forEach(function(id){ var x=lineById(id); if(!x) return; (x.payOld=x.payOld||[]).push(old); x.pay='pre'; x.payRef=''; logAdd(x,old+' closed by Ops as expired','System · the link expired unpaid · raise a new request','sys',1); }); }
    if(k==='plcQuery'){ l.plcQ=1; l.qAt=0; logAdd(l,'Placement raised a query','System · ticket PLC-'+l.id.slice(3)+' · '+PLC_QUERY,'sys',1); }
    if(k==='extNone'){ l.allDecl=1; logAdd(l,'Placement ticket responded — every insurer declined','System · ticket PLC-'+l.id.slice(3)+' · no quotes on round '+l.round,'sys',1); moveStage(l,7,'Placement ticket responded with no quotes'); }
    if(k==='extPlc'){ l.allDecl=0; l.qAt=S.now; logAdd(l,'Quotes returned by placement','System · ticket PLC-'+l.id.slice(3),'sys',1); moveStage(l,7,'Quotes received from placement'); }
    if(k==='extOps'){ (l.payLines&&l.payLines.length?l.payLines:[l.id]).forEach(function(id){ var x=lineById(id); if(!x||x.pay!=='ticket') return; x.pay='back'; logAdd(x,'Payment details returned by Ops','System · ticket '+payRef(x)+' · '+payModeOf(x),'sys',1); }); }
    if(k==='extPaid'){ logAdd(l,'Payment screenshot received from client','System · on email','pay',1); }
    if(k==='extTake'){ var u=userById(l.owner); var m=u&&u.mgr?u.mgr:'vikram'; if(S.data.took.indexOf(l.id)<0) S.data.took.push(l.id); l.prevOwner=l.owner; l.owner=m; logAdd(l,'Owner changed from '+uname(l.prevOwner)+' to '+uname(m)+' — client escalation','by '+uname(m)+' · Take ownership','sys',1); }
    if(k==='cholaPaid'){ if(cholaLinkExpired(l)) return; var a=acctOf(l), rm=rmFor(a,l.product);
      l.pay='paid'; l.soldBy=l.owner; l.paidAt=S.now; l.amt=premOf(l);
      l.hand={note:'',by:l.owner,at:S.now,utr:cholaUtr(l),proof:'Cholamandalam payment link',read:'auto-confirmed by the insurer'};
      l.chola=l.chola||{}; l.chola.paid=S.now;
      cholaIssue(l);
      logAdd(l,'Client paid on Cholamandalam’s link','System · '+INR(premOf(l))+' · auto-confirmed by the insurer · no payment ticket','pay',1);
      logAdd(l,'Policy copy generated in real time by Cholamandalam','System · issued on payment · no post-purchase ticket','post',1);
      logAdd(l,'Owner changed from '+uname(l.owner)+' to '+uname(rm)+' — Transfer at payment','by the system · issued in real time','sys',1);
      l.owner=rm; tasksOfLine(l.id).forEach(function(t){ if(!t.done) t.owner=rm; }); if(a) a.own=rm;
      moveStage(l,11,'Paid on Chola link · policy issued in real time'); }
    if(k==='cholaExpire'){ l.chola=l.chola||{}; if(l.chola.linkAt) l.chola.linkAt=S.now-CHOLA_TTL-1; logAdd(l,'Payment link expired','System · the 24-hour Cholamandalam link lapsed unpaid · regenerate to send a fresh link','sys',1); }
  },'the simulated event');
  if(!ok) return;
  var msg={rfqClient:['The client approved the RFQ','Now at RFQ Verified by Client — float it to placement'],raterNone:['No rater quotes — switched to the RFQ route','Still at Details Captured. The RFQ is open on the RFQ & quotes tab'],plcQuery:['Placement raised a query','Answer it on the placement ticket — the stage does not move.'],extPlc:['QCR back from placement','Now at Quotes Received'],extNone:['Every insurer declined','Close it as No Appetite — not Lost'],extOpsQ:['Ops has a query','Answer it on the ticket. The stage does not move.'],extExpire:['Payment link expired','Ops closed the ticket. Raise a new payment request — the old one is never reopened.'],extOps:['Ops returned the payment details','Stage stays at Purchase Requested — share them with the client'],extPaid:['The client sent the payment screenshot','Upload it in Confirm payment to close the sale'],extTake:['This line is no longer yours','Your manager took it over while you were looking. The screen is now read-only.'],cholaPaid:['Paid on Cholamandalam’s link','Policy issued in real time — no ticket. Share the copy with the client.'],cholaExpire:['Payment link expired','The 24-hour link lapsed unpaid. Regenerate it from the line.']}[k];
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
    if(was('pe')&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((S.sel.pe||'').trim())) e.pe='Give the new contact\u2019s name, mobile and email.';
  }
  if(S.sel.d==='cb'&&(S.sel.cbat||'')&&new Date(S.sel.cbat).getTime()<=S.now) e.cbat='Pick a date and time in the future.';
  return e;
}
/* what still has to be filled before the disposition can be logged */
function callReady(){
  if(!S.sel.d) return false;
  if(S.sel.d==='poc'){ var m=(S.sel.pm||'').replace(/[^\d]/g,'');
    if(!(S.sel.pn||'').trim()||m.length<10||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((S.sel.pe||'').trim())) return false; }
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
        '<div class="fgrid">'+field('Contact number',input('pm',S.sel.pm,'+91 98200 44112'),'Needed to reach them.',e.pm)+field('Designation — optional',input('pd',S.sel.pd,'Finance Head'),'As they gave it.')+'</div>'+
        field('Email',input('pe',S.sel.pe,''),'They are added to '+esc(a.n)+'\u2019s contacts and become the contact on this line. '+esc(l.contact.n||'The current contact')+' stays on the account.',e.pe)+'</div>';
      if(k==='cb') return '<div class="subform">'+
        field('Call back on','<input class="inp" id="f_cbat" data-f="cbat" type="datetime-local" min="'+esc(dtLocal(S.now))+'" value="'+esc(S.sel.cbat||'')+'">','The follow-up task is created for exactly this time, on you.',e.cbat)+'</div>';
      return '';
    };
    var cc=S.sel.ctc, list=DISP.filter(function(d){ if(cc) return cc.con?d.g!=='A':d.g==='A'; return true; }).filter(function(d){ return !(d.k==='disc'&&l.stage>2); });
    /* [stated 26 Sep · 5.5] after a placed call the list follows what the switch reported; past stage 2 there is no Discovery complete */
    return (cc?ctcStrip(cc):'<div class="ctcbar neutral">'+ic('phone','ic16')+'<div><b>Manual</b><span>'+esc(l.contact.n||'—')+' · '+esc(l.contact.m||'no number')+'</span></div></div>')+list.map(function(d){ return opt('data-pick="'+d.k+'"',S.sel.d===d.k,d.n,'Group '+d.g+' · '+esc(d.d))+(S.sel.d===d.k?sub(d.k):''); }).join(''); },
  can:callReady, ok:'Log disposition',
  run:function(){ var l=FL(), a=acctOf(l), d=DISP.filter(function(x){return x.k===S.sel.d;})[0];
    if(d.k==='disc'){ var ln=l.id, cc=S.sel.ctc;
      /* the call happened — it goes on the record before the requirement form takes over */
      write(function(){ var n=bumpCall(l,true); l.lastDisp=d.n; logAdd(l,'Call · '+d.n,uname(S.user)+' · call '+n+' · connected'+(cc?ctcMeta(cc):' · manual'),'call'); reopenOnCall(l); if(l.stage===1) moveStage(l,2,'First contact logged'); },'the call');
      closeFlow(); openFlow('disc',{line:ln,called:1}); return 'stay'; }
    var made=[], extra=ctcMeta(S.sel.ctc), was=l.contact.n||'', cbAt=0, unreach=false;
    if(d.k==='poc'){ extra+=' · referred to '+(S.sel.pn||'').trim()+', '+(S.sel.pd||'').trim()+' · '+(S.sel.pm||'').trim(); }
    if(d.k==='cb'){ cbAt=new Date(S.sel.cbat).getTime(); extra+=' · call back '+fmt(cbAt); }
    var ok=write(function(){ var n=bumpCall(l,d.g!=='A'); l.lastDisp=d.n; logAdd(l,'Call · '+d.n,uname(S.user)+' · call '+n+(d.g==='A'?' · no connect':' · connected')+(S.sel.ctc?extra:' · manual'+extra),'call'); if(d.g!=='A') reopenOnCall(l);
      if(d.k==='poc'){
        /* [stated 26 Sep · PD-013] the referred person becomes a contact only — the decision-maker marker is not touched */
        var c={n:(S.sel.pn||'').trim(), d:(S.sel.pd||'').trim(), m:(S.sel.pm||'').trim(), e:(S.sel.pe||'').trim()};
        if(!a.con.some(function(x){return x.m===c.m||(c.e&&x.e===c.e);})){ a.con.push(c); acctLog(a,'Contact added: '+c.n,uname(S.user)+' · referred on a call · '+l.product); }
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

/* [stated 27 Sep] one flat list, no L1–L4 headings; 'What the business does' removed. [26 Sep · 6.2] the discovery questions are the product's set, read from BKAdmin — the same set the
   website asks. Every question is blocking; target premium (optional), GSTIN (asked) and a note sit outside it.
   Nothing is pre-filled except what the customer answered online. Erection All Risk has no set configured. */
var RQ={
 tob:{t:'Type of business',k:'pick',o:['Manufacturing','Trading','Services','Warehousing']},
 noc:{t:'Nature of company',k:'pick',o:['Private limited','Public limited','LLP','Partnership','Sole proprietorship']},
 to:{t:'Annual turnover',k:'num',ph:'₹86 Cr'}, si:{t:'Approximate sum insured',k:'num',ph:'₹18 Cr'},
 occ:{t:'Occupancy of the premises',k:'text',ph:'Textile mill with an attached godown'},
 com:{t:'Commodity shipped',k:'text',ph:'Steel coils'}, mode:{t:'Mode of transit',k:'pick',o:['Road','Rail','Sea','Air','Multimodal']},
 act:{t:'What the business does',k:'text',ph:'Contract manufacturing of auto parts'},
 hc:{t:'Employees to cover',k:'num',ph:'240'}, fam:{t:'Family cover',k:'pick',o:['Employee only','Employee, spouse and children','Including parents']},
 pol:{t:'Existing policy?',k:'yn'}, ins:{t:'Incumbent insurer',k:'text',ph:'New India Assurance',when:'pol'}, exp:{t:'Policy expiry date',k:'date',when:'pol'},
 clm:{t:'Claims history',k:'pick',o:['No claims in 3 years','1 claim','2 or more claims']}, ten:{t:'Policy tenure',k:'pick',o:['1 year','2 years','3 years']},
 wcbiz:{t:'Type of business',k:'pick',o:['Electric Cables, Makers and suppliers','Auto components manufacturing','Textile mill','Chemical manufacturing','Engineering workshop','Construction and civil works','Food processing','Logistics and warehousing','IT and software services','Trading and distribution']},
 wcnw:{t:'Number of workers',k:'num',ph:'10'},
 wcsal:{t:'Monthly salary of workers',k:'num',ph:'₹15,000'},
 wcmed:{t:'Do you need medical expenses coverage?',k:'yn'},
 wcmedamt:{t:'Medical expenses amount',k:'pick',o:['₹10,000','₹25,000','₹50,000','₹1,00,000'],when:'wcmed'},
 wcten:{t:'How long do you need this policy?',k:'pick',o:['3 Months','6 Months','1 Year']},
 cybtob:{t:'Type of business',k:'pick',o:['EdTech','Healthtech','IT / ITES: Consulting','Logistics / Transport','Travel & Tourism','Others']},
 cybcov:{t:'How much coverage do you need?',k:'text',ph:'₹50 Lacs'},
 cybto:{t:'Company annual turnover',k:'pick',o:['Up to ₹1 Cr','₹1 Cr to ₹5 Cr','₹5 Cr to ₹25 Cr','₹25 Cr to ₹100 Cr','Above ₹100 Cr']},
 cybnat:{t:'What is the nature of your company?',k:'pick',o:['One Person Company','Private Limited','Public Limited','LLP','Partnership','Sole Proprietorship']},
 cybsub:{t:'Does your business have subsidiaries?',k:'yn'},
 cybsubIn:{t:'Subsidiaries in India',k:'num',ph:'0',when:'cybsub'},
 cybsubUs:{t:'Subsidiaries in USA & Canada',k:'num',ph:'0',when:'cybsub'},
 cybsubRow:{t:'Subsidiaries in rest of world (excl. USA & Canada)',k:'num',ph:'0',when:'cybsub'},
 cybpol:{t:'Does your business have an existing cyber policy?',k:'yn'},
 cybclm:{t:'Any claims or incidents in the last 5 years?',k:'yn'}
};
var TPL={
 prop:[['L1 · The business',['tob','noc','to']],['L2 · The risk',['si','occ']],['L3 · Existing cover',['pol','ins','exp']],['L4 · History and term',['clm','ten']]],
 mar:[['L1 · The business',['tob','noc','to']],['L2 · The cargo',[['si','Annual transit value'],'com','mode']],['L3 · Existing cover',['pol','ins','exp']],['L4 · History and term',['clm','ten']]],
 liab:[['L1 · The business',['tob','noc','to']],['L2 · The exposure',[['si','Limit of indemnity']]],['L3 · Existing cover',['pol','ins','exp']],['L4 · History and term',['clm','ten']]],
 gh:[['L1 · The business',['tob','noc']],['L2 · The people',['hc','fam',['si','Sum insured per family']]],['L3 · Existing cover',['pol','ins','exp']],['L4 · History',['clm']]],
 wc:[['Workmen’s Compensation',['wcbiz','wcnw','wcsal','wcmed','wcmedamt','wcten']]],
 cyb:[['Cyber Liability',['cybtob','cybcov','cybto','cybnat','cybsub','cybsubIn','cybsubUs','cybsubRow','cybpol','cybclm']]]
};
var PROD_TPL={'Fire & Special Perils':'prop','Burglary':'prop','Industrial All Risk':'prop','Contractors All Risk':'prop','Marine Cargo':'mar','Commercial General Liability':'liab','Cyber Liability':'cyb','Directors & Officers':'liab','Professional Indemnity':'liab','Group Health':'gh','Workmen’s Compensation':'wc'};
function reqTpl(p){ var k=PROD_TPL[p]; return k?TPL[k]:null; }
function reqGet(l,k,live){ if(live&&S.sel[k]!==undefined) return S.sel[k]; var r=l.req||{}; return r[k]!==undefined&&r[k]!==null?r[k]:''; }
function reqQs(l,live){ var t=reqTpl(l.product); if(!t) return []; var out=[];
  t.forEach(function(g){ g[1].forEach(function(x){ var k=Array.isArray(x)?x[0]:x, q=RQ[k]; if(q.when&&reqGet(l,q.when,live)!=='y') return; out.push({k:k,t:Array.isArray(x)?x[1]:q.t,q:q,leg:g[0]}); }); }); return out; }
function reqBad(q,v){ v=String(v||'').trim(); if(!v) return ''; if(q.k==='num'&&!/\d/.test(v)) return 'Enter a number'; if(q.k==='date'&&isNaN(new Date(v).getTime())) return 'Enter a valid date'; return ''; }
function reqCount(l,live){ var qs=reqQs(l,live), miss=qs.filter(function(x){ var v=reqGet(l,x.k,live); return !String(v||'').trim()||reqBad(x.q,v); }); return {n:qs.length-miss.length,m:qs.length,miss:miss,qs:qs}; }
function reqDone(l){ var c=reqCount(l); return !!reqTpl(l.product)&&c.m>0&&!c.miss.length; }
function reqOnlineN(l){ var o=l.reqOnline||{}; return Object.keys(o).filter(function(k){return o[k];}).length; }
/* [stated 26 Sep · 6.1 §8] editable until the RFQ is floated (Non-DUA) or the QCR is sent (DUA) */
function reqLocked(l){ return (l.rfq&&l.rfq.st==='floated')||(l.rate===1&&l.stage>=8)||l.stage>=9; }
function reqField(l,x,e){ var q=x.q, v=reqGet(l,x.k,true), on=(l.reqOnline||{})[x.k]&&S.sel[x.k]===undefined, hint=on?'answered online — confirm on call':'';
  var ctl= q.k==='pick'?select(x.k,v,[['','Choose…']].concat(q.o)) : (q.k==='yn'?seg(x.k,[['y','Yes'],['n','No']],v) : (q.k==='date'?'<input class="inp" id="f_'+x.k+'" data-f="'+x.k+'" type="date" value="'+esc(v)+'">':input(x.k,v,q.ph||'')));
  return field(x.t,ctl,hint,e[x.k]); }
FLOWS.disc={t:function(){ var l=FL(); return l.renews?'Update the renewal details':'Capture requirement'; },
  sub:function(){ var l=FL(); return l.renews?'Carried over from '+l.renews+'. Change what has changed this year.':'The '+l.product+' questions — the same ones the website asks. Save part of it now and finish on the next call.'; }, wide:true,
  repaintOn:['pol','tob','noc','ten','clm','mode','fam','wcmed','cybsub'],
  body:function(){ var l=FL(), a=acctOf(l), t=reqTpl(l.product), e=discErr();
    if(!t) return empty('file','No discovery questions are configured for this product','The '+esc(l.product)+' question set is missing in BKAdmin, so the requirement cannot be completed. It has been flagged to admin.');
    var c=reqCount(l,true);
    return '<div class="flex" style="justify-content:space-between;align-items:center"><b>'+c.n+' of '+c.m+' answered</b>'+(c.miss.length?'<span class="meta">'+plural(c.miss.length,'question')+' left</span>':chip('Complete','green',false,true))+'</div>'+
      '<div class="fgrid mt16">'+c.qs.map(function(x){ return reqField(l,x,e); }).join('')+'</div>'+
      diamonds(true)+
      field('Target premium — optional',input('tp',reqGet(l,'tp',true),'₹3,40,000'),'Feeds the expected premium. Never holds anything up.',e.tp)+
      (a.prov?field('GSTIN — asked, not blocking',input('gst',S.sel.gst!==undefined?S.sel.gst:(a.gst||''),'27AABCS1429B1ZB'),'Needed before a payment request, not now. PAN is read from it.',e.gst):'')+
      field('Note — optional',input('note',reqGet(l,'note',true),'Anything the RFQ and placement should know'))+
      (c.miss.length?note('amber','Still to answer',c.miss.map(function(x){return esc(x.t);}).join(' · ')+'<div class="meta mt4">You can save now — answers are kept and the line stays at '+esc(stageName(Math.max(l.stage,2)))+'.</div>','info'):''); },
  can:function(){ return !!reqTpl(FL().product); },
  ok:function(){ var l=FL(); if(l.req&&l.stage>=3) return 'Save'; return reqCount(l,true).miss.length?'Save — '+reqCount(l,true).n+' of '+reqCount(l,true).m:'Save and complete discovery'; },
  run:function(){ var l=FL(), a=acctOf(l), made=[], dropped=0, before=l.stage;
    var ok=write(function(){ var r=l.req?JSON.parse(JSON.stringify(l.req)):{};
      reqQs(l,true).concat([{k:'tp',q:{k:'num'}},{k:'note',q:{k:'text'}}]).forEach(function(x){ if(S.sel[x.k]===undefined) return; var v=String(S.sel[x.k]||'').trim(); if(reqBad(x.q,v)){ dropped++; return; } r[x.k]=v; });
      if(S.sel.pol!==undefined) r.pol=S.sel.pol; if(r.pol==='n'){ r.ins=''; r.exp=''; }
      l.req=r; if(l.product===WC_PRODUCT){ var _nw=parseInt(String(r.wcnw||'').replace(/\D/g,''),10)||0, _sal=parseInt(String(r.wcsal||'').replace(/\D/g,''),10)||0; if(_nw&&_sal) r.si=INR(_nw*_sal*12)+' annual wages'; } if(l.product===CYBER_PRODUCT&&r.cybcov){ r.si=r.cybcov; } l.reqOnline={}; if(l.reqCarry) Object.keys(S.sel).forEach(function(k){ if(l.reqCarry[k]&&S.sel[k]!==undefined) delete l.reqCarry[k]; });
      if(a.prov&&S.sel.gst!==undefined&&(S.sel.gst||'').trim()&&!gstErr(S.sel.gst.trim().toUpperCase())){ a.gst=S.sel.gst.trim().toUpperCase(); a.pan=panOfGst(a.gst); acctLog(a,'GSTIN recorded',uname(S.user)+' · asked on discovery · PAN '+a.pan+' read from it · documents still to upload'); }
      var c=reqCount(l);
      if(c.miss.length){ logAdd(l,'Requirement saved — '+c.n+' of '+c.m+' answered',uname(S.user)+' · '+plural(c.miss.length,'question')+' left','note'); made=fireRules(l); return; }
      if(l.stage>=3){ logAdd(l,'Requirement edited',uname(S.user),'note'); made=fireRules(l); return; }
      logAdd(l,'Requirement captured — '+c.m+' of '+c.m+' answered',uname(S.user),'note');
      if(l.stage===1) made=moveStage(l,2,'First contact logged');
      made=(made||[]).concat(moveStage(l,3,'Every discovery question answered'));
      if(l.rate===null||l.rate===undefined){ l.rate=RATEABLE[l.product]?1:0; logAdd(l,'Classified '+(l.rate?'DUA — rated by the system':'Non-DUA — quoted by placement'),'System · read from the requirement','sys',1);
        if(l.rate) logAdd(l,'Rater returned prices','System · '+dauQuotes(l).filter(function(q){return q.st==='quoted';}).length+' insurers priced, '+dauQuotes(l).filter(function(q){return q.st==='declined';}).length+' declined · no RFQ needed','sys',1);
        else { rfqOpen(l,a,S.now); logAdd(l,'RFQ opened on screen','System · for '+l.product,'rfq',1); } } },'the requirement');
    if(!ok) return 'fail';
    var c=reqCount(l);
    if(before<3&&l.stage>=3) toast('Discovery complete — '+(l.rate?'DUA':'Non-DUA'),l.rate?'Rater quotes are in. Pick what goes in the QCR.':'The RFQ is open. Fill it, then float it or send it for client review.');
    else toast(c.miss.length?'Saved — '+c.n+' of '+c.m+' answered':'Requirement saved',(c.miss.length?plural(c.miss.length,'question')+' left. The line stays at '+stageName(l.stage)+'.':'')+(dropped?' '+plural(dropped,'answer')+' not saved — they need a number or a date.':'')); }};
function discErr(){ var l=FL(), e={}; reqQs(l,true).forEach(function(x){ if(S.sel[x.k]===undefined) return; var v=S.sel[x.k]; if(!String(v||'').trim()) e[x.k]='Needed before the line can move on'; else { var b=reqBad(x.q,v); if(b) e[x.k]=b; } });
  if(S.sel.tp!==undefined&&(S.sel.tp||'').trim()&&!/\d/.test(S.sel.tp)) e.tp='Enter a number';
  if(S.sel.gst!==undefined&&(S.sel.gst||'').trim()){ var g=gstErr(S.sel.gst.trim().toUpperCase()); if(g) e.gst=g; }
  return e; }
/* the Requirement section — meter, full list with markers, collapsed summary once complete [6.6] */
function reqSection(l,full){
  var t=reqTpl(l.product), a=acctOf(l), c=reqCount(l), can=canAct(l)&&l.stage>=2&&!reqLocked(l), onl=l.reqOnline||{};
  if(!t) return '<div class="phhd"><div class="t">Requirement</div></div>'+empty('file','No discovery questions are configured for this product','Flagged to admin. The line cannot leave Consultation Setup until the set exists in BKAdmin.');
  var act=can?'<button class="btn sm" data-flow="disc" data-line="'+l.id+'">'+(c.n?'Edit':'Capture requirement')+'</button>':(reqLocked(l)&&canAct(l)&&(l.stage===7||l.stage===8)&&!l.rate?'<button class="link" data-flow="objectQcr" data-line="'+l.id+'">Revise</button>':'');
  var head='<div class="phhd"><div class="t">Requirement</div><div class="a">'+(c.miss.length?c.n+' of '+c.m+' answered':chip('Complete','green',false,true))+' '+act+'</div></div>';
  if(!c.n&&!Object.keys(onl).length) return head+'<div class="mt8">'+empty('file','Not captured yet','The '+esc(l.product)+' questions open from the discovery call, or from Capture requirement.')+'</div>';
  var row=function(k,lab,val,mk){ return '<div class="rqrow"><span>'+esc(lab)+'</span><b'+(val?'':' class="meta"')+'>'+(val?esc(val):'— not answered')+'</b>'+(mk?'<i>'+esc(mk)+'</i>':'')+'</div>'; };
  var fmtV=function(x){ var v=reqGet(l,x.k); if(x.q.k==='yn') return v==='y'?'Yes':(v==='n'?'No':''); if(x.q.k==='date'&&v) return fmtD(new Date(v).getTime()); return v; };
  var cy=l.reqCarry||{};
  var list='<div class="rqlist mt8">'+c.qs.map(function(x){ return row(x.k,x.t,fmtV(x),onl[x.k]?'answered online — confirm on call':(cy[x.k]&&reqGet(l,x.k)?'carried over from '+cy[x.k]:'')); }).join('')+
    row('tp','Target premium',reqGet(l,'tp'),'')+(a.prov?row('gst','GSTIN',a.gst||'','requested — not holding anything up'):'')+(reqGet(l,'note')?row('note','Note',reqGet(l,'note'),''):'')+'</div>';
  if(!c.miss.length&&!full){ var r=l.req||{}; var sum=[r.si?'SI '+r.si:'',r.tp?'target '+r.tp:'',r.pol==='y'&&r.ins?r.ins:(r.pol==='n'?'first-time buyer':''),r.pol==='y'&&r.exp?'expires '+fmtD(new Date(r.exp).getTime()):''].filter(Boolean).join(' · ');
    return head+'<details class="rqsum mt8"><summary>'+esc(sum||'Complete')+' <span class="link">Show all</span></summary>'+list+'</details>'+(reqLocked(l)?'<div class="meta mt8">'+ic('lock','ic14')+' Read-only now — '+(l.rate?'the QCR has gone to the client':'the RFQ has been floated')+'. A change is a revision.</div>':''); }
  return head+list;
}

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
      '<div class="fgrid">'+field('Business type',select('bt',S.sel.bt||(l.renews?'Renewal':(o&&o.bt==='Market rollover'?'Rollover':'New')),['New','Renewal','Rollover']),'What placement should treat this as.')+field('RFQ','<input class="inp" value="'+esc(l.stage===3?'Filled by '+uname(l.owner)+' · not reviewed by the client':'Approved by '+(l.contact.n||'the client'))+'" disabled>')+'</div>'+
      '<div class="fgrid">'+field('Industry type','<input class="inp" value="'+esc(a.ind)+'" disabled>')+field('Target premium — optional',input('tp',tp,'3,40,000'),'Helps placement aim. Never holds the float up.',bad?'Digits only, e.g. 3,40,000.':'')+'</div>'+
      '<div class="field"><div class="lbl">Exclusive mandate</div>'+seg('excl',[['y','Yes'],['n','No']],'n')+'</div>'+
      field('Note to placement',input('note',S.sel.note,'Client wants a like-for-like plus enhanced fire loss of profit.'))+
      note('blue','','Six of the eight fields are filled for you. <b>Which insurers to approach is placement’s call</b> — they build the comparison, so they choose the market.'); },
  can:function(){ var l=FL(); if(l.stage===3&&rfqCount(l).missing) return false; var tp=S.sel.tp!==undefined?S.sel.tp:(l.req&&l.req.tp?l.req.tp.replace(/[^\d,]/g,''):''); return !tp || /^\d[\d,]*$/.test(tp); }, ok:'Raise placement ticket',
  run:function(){ var l=FL(), made=[]; var ok=write(function(){ var direct=l.stage===3; l.rfq.st='floated'; l.rfq.floatedAt=S.now; l.rfq.direct=direct?1:0; l.plcBt=S.sel.bt||(l.renews?'Renewal':'New'); l.plcNote=(S.sel.note||'').trim(); l.plcExcl=S.sel.excl==='y'?1:0; l.plcTp=S.sel.tp!==undefined?S.sel.tp:(l.req&&l.req.tp?l.req.tp:''); logAdd(l,'RFQ floated to placement',uname(S.user)+' · ticket PLC-'+l.id.slice(3)+' raised'+(direct?' · directly, without client review':' · after client review'),'sys'); made=moveStage(l,6,'Placement ticket raised'); },'the placement ticket'); if(!ok) return 'fail'; toast('Placement ticket PLC-'+l.id.slice(3)+' raised',stageToast(l,made)); }};

FLOWS.answerQ={t:'Answer placement’s query', sub:'The ticket is blocked on this. Answering it is what unblocks the round.',
  body:function(){ return note('amber','Meera Iyer, BimaPlacement','New India want the maximum foreseeable loss working for the godown block before they will quote. Can you get it from the client?','mail')+field('Your reply',input('q',S.sel.q,'MFL working attached — client’s risk engineer sent it this morning.'))+
      field('Attachment — optional',S.sel.att?'<div class="chip neutral">'+ic('file','ic14')+esc(S.sel.att)+' <button type="button" class="link" data-qatt="">Remove</button></div>':'<button type="button" class="btn sm" data-qatt="MFL_working.pdf">'+ic('upload')+'Attach a file</button>')+note('blue','','The reply goes back on the ticket. The product line stays at Quote Requested — answering a query is not progress through the pipeline.'); },
  can:function(){ return !!(S.sel.q||'').trim(); }, ok:'Send reply',
  run:function(){ var l=FL(); var ok=write(function(){ l.qAns=1; l.qReply=(S.sel.q||'').trim(); logAdd(l,'Replied to placement query',uname(S.user)+' · ticket PLC-'+l.id.slice(3)+' · '+l.qReply+(S.sel.att?' · attached '+S.sel.att:''),'sys'); },'the reply'); if(!ok) return 'fail'; toast('Reply sent to placement','Stage unchanged at Quote Requested — the ticket is unblocked'); }};

FLOWS.qcr={t:'Select quotes and send the QCR', sub:'Rateable line. The system priced it, you choose what the client sees.',
  body:function(){ var l=FL(), qs=dauQuotes(l).filter(function(q){return q.st==='quoted';}); if(!S.sel.q) S.sel.q=qs.map(function(q){return q.i;});
    return note('blue','','On a rateable line there is no placement team, so the comparison is assembled here from the rater’s prices.')+
      (function(){ var hasRt=qs.some(function(x){return x.rt;}); return qs.map(function(q){ var tag=q.rt?chip('Instant issuance','violet',false,true):(hasRt?chip('Assisted issuance','neutral',false,true):''); return opt('data-tog="q" data-tv="'+esc(q.i)+'"',S.sel.q.indexOf(q.i)>=0,q.i,tag,INR(q.p),true); }).join(''); })()+
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
    field('What is asked for',select('ask',S.sel.ask||'',[['','Choose…'],'Re-rate','A different insurer','Changed sum insured or cover','Revised terms']))+
    field('What needs to change',input('x',S.sel.x,'Ask New India to re-rate with the enhanced fire loss of profit section.'))+note('amber','','This sends the line back to Quote Requested. It is the one place the stage moves backwards.'); },
  can:function(){ var l=FL(); return !!S.sel.d && !!S.sel.ask && !!(S.sel.x||'').trim() && !(S.sel.d==='client'&&l.stage<8); }, ok:function(){ return 'Request v'+(FL().round+1); },
  run:function(){ var l=FL(), made=[]; var ok=write(function(){ l.round++; l.obj=S.sel.ask+' — '+S.sel.x.trim(); l.objBy=S.sel.d; l.qAns=1; l.qAt=0; (l.objs=l.objs||[]).push({v:l.round-1,why:S.sel.ask+' — '+S.sel.x.trim(),by:S.sel.d,at:S.now}); logAdd(l,'QCR sent back for revision',uname(S.user)+' · '+(S.sel.d==='client'?'client objected':'owner objected')+' · '+S.sel.ask+' · v'+l.round+' requested','sys'); made=moveStage(l,6,'Revision requested'); },'the revision request'); if(!ok) return 'fail'; toast('Revision v'+l.round+' requested',stageToast(l,made)); }};

FLOWS.confirm={t:'Record client confirmation', sub:'They named an insurer and a premium. This is the buying signal.',
  body:function(){ var l=FL(), qs=quotesFor(l).filter(function(q){return q.st==='quoted'&&(!l.rate||!l.qsel||!l.qsel.length||l.qsel.indexOf(q.i)>=0);}), exp=S.now>quoteUntil(l);
    return qs.map(function(q){ return opt('data-pick="'+esc(q.i)+'"',S.sel.d===q.i,q.i,'SI '+esc((l.req||{}).si||'—')+' · '+(exp?'expired '+fmtD(quoteUntil(l)):'valid until '+fmtD(quoteUntil(l)))+(q.rt?' · instant issuance — no payment ticket':''),INR(q.p),false,exp); }).join('')+
      (S.sel.d?'<div class="kvgrid two mt12">'+kv('Insurer','<b>'+esc(S.sel.d)+'</b>')+kv('Confirmed premium','<b>'+INR((qs.filter(function(q){return q.i===S.sel.d;})[0]||{}).p||0)+'</b>')+'</div>':'')+
      (exp?note('amber','These quotes have expired','An expired quote cannot be confirmed. Send the QCR back for fresh quotes.','alert'):note('blue','','Confirmed premium is the revenue number. It is written here and not again.')); },
  repaintOn:[],
  can:function(){return !!S.sel.d&&S.now<=quoteUntil(FL());}, ok:'Confirm',
  run:function(){ var l=FL(), made=[]; var ok=write(function(){ l.picked=S.sel.d; l.ins=S.sel.d; if(isChola(l)) l.chola={conf:S.now}; logAdd(l,'Client confirmed insurer',uname(S.user)+' · '+S.sel.d,'call'); made=moveStage(l,9,'Client confirmed '+S.sel.d); },'the confirmation'); if(!ok) return 'fail'; toast('Client confirmed '+l.picked,stageToast(l,made)); }};

/* ---------- Cholamandalam real-time issuance (WC · DUA) ---------- */
function cholaSalesNext(l){
  var ch=l.chola||{}, a=acctOf(l);
  if(l.stage===9){
    if(!ch.kyc) return {tone:'amber',lab:'Next action',txt:'Run real-time KYC with Cholamandalam',why:'Chola writes Workmen’s Compensation on a live API. Capture the issuance details, upload PAN and GST for OCR, and clear KYC — no payment ticket is raised.',acts:[['cholaKyc','Run KYC with Cholamandalam']]};
    return {tone:'amber',lab:'Next action',txt:'KYC cleared — generate the payment link',why:'Cholamandalam returned KYC success. Generate the live payment link and share it with '+((l.contact||{}).n||'the client')+'. It is valid for 24 hours.',acts:[['cholaLink','Generate payment link']]};
  }
  if(l.stage===10){
    if(cholaLinkExpired(l)) return {tone:'red',lab:'Link expired',txt:'The payment link expired after 24 hours',why:'The 24-hour Cholamandalam link lapsed unpaid. Regenerate it to send '+((l.contact||{}).n||'the client')+' a fresh link.',acts:[['cholaLink','Regenerate payment link']]};
    return {tone:'blue',lab:'Waiting on the client',txt:'Payment link sent · expires in '+cholaLinkLeft(l)+'h · policy issues on payment',why:'Cholamandalam’s link ('+(ch.link||'')+') is with '+((l.contact||{}).n||'the client')+'. No screenshot and no confirm step — when they pay, Chola issues the policy copy in real time. The link is valid 24 hours.',acts:[['cholaLink','View the link']]};
  }
  return {tone:'neutral',lab:'',txt:'',why:'',acts:[]};
}
function cholaPostNext(l){
  if(l.stage===11) return {tone:'amber',lab:'Next action',txt:'Paid — Cholamandalam issued the policy in real time. Share the copy with the client',why:'The client paid on Chola’s link and the policy copy was generated instantly — no payment ticket and no post-purchase ticket. Share it with '+((l.contact||{}).n||'the client')+' to close the sale.',acts:[['cholaShare','Share the policy copy']]};
  if(l.stage===14) return {tone:'green',lab:'Issued',txt:'Policy copy shared · issued in real time via Cholamandalam',why:'Chola issued the policy on payment and you shared the copy. No payment ticket and no post-purchase ticket were needed.',acts:[]};
  return {tone:'neutral',lab:'',txt:'',why:'',acts:[]};
}
function cholaIssue(l){
  var a=acctOf(l); if(!a||polOfLine(l)) return;
  var p={id:polCode(l.product)+'-2026-'+l.id.slice(3),bkno:bkPolNo(),pno:'',ins:l.picked||l.ins,p:l.product,si:(l.req||{}).si||'—',pr:premOf(l),start:S.now,exp:S.now+365*86400000-86400000,endo:0,issuing:0,line:l.id,ptype:polTypeFor(a,l),prev:'',realtime:1};
  p.pno=insPolNo(p); p.period=fmtD(S.now)+' – '+fmtD(S.now+365*86400000-86400000); p.issuedAt=S.now;
  a.pols.push(p); l.chola=l.chola||{}; l.chola.policy=p.id;
}
function soldBlock(l){ var payTx; if(isChola(l)){ payTx=(l.chola&&l.chola.paid)?'Paid on the Cholamandalam link':(l.stage>=10?'Payment link sent':((l.chola&&l.chola.kyc)?'KYC cleared':'In KYC')); } else { payTx=l.pay==='pre'?'Not requested':(l.pay==='ticket'?'With Ops':(l.pay==='back'?'Details returned':(l.pay==='shared'?'Shared with client':'Paid'))); }
  return '<div class="phhd"><div class="t">Sold</div></div><div class="kvgrid mt12">'+kv('Insurer',esc(l.picked||l.ins||'—'))+kv('Confirmed premium','<b>'+INR(premOf(l))+'</b>')+kv('Payment',esc(payTx))+'</div>'; }
function docsTab(l){ var a=acctOf(l), p=polOfLine(l), ins=l.picked||l.ins||'the insurer';
  var rows=[docRow('Quote Comparison Report',true,'',{line:l.id},'The quotes the client compared'),
    docRow('Quote · '+ins,true,'',{line:l.id},'The quote the client selected'),
    docRow('PAN card',!!a.pan,a.pan?'':'not uploaded yet',{acct:a.id}),
    docRow('GST certificate',!!a.gst,a.gst?'':'not uploaded yet',{acct:a.id}),
    docRow('Policy copy',!!p,p?'':'awaited from the insurer',{line:l.id,pol:p?p.id:''},p&&p.pno?'Policy '+p.pno:(p?'issued in real time':''))];
  return '<div class="phhd"><div class="t">Documents</div><div class="a">everything held on this line</div></div><div class="rowlist doclist mt8" style="border:1px solid var(--border);border-radius:12px">'+rows.join('')+'</div>'; }

/* the guided capture + OCR + KYC, run after the client picks Chola */
function cholaPre(l){ var a=acctOf(l); if(S.sel.caddr===undefined) S.sel.caddr=(a.n||'')+(a.city?', '+a.city:'')+(a.st?', '+a.st:''); if(S.sel.cplace===undefined) S.sel.cplace=a.city||''; if(S.sel.cpin===undefined) S.sel.cpin='411001'; if(S.sel.carea===undefined) S.sel.carea=(a.city||'Area')+' H.O'; if(S.sel.cinc===undefined) S.sel.cinc='2009-11-20'; }
FLOWS.cholaKyc={t:'Cholamandalam real-time issuance', wide:true, repaintOn:['criskloc'],
  sub:function(){ return ['A few more details','Worker and risk location','Company details','Upload PAN and GST — read by OCR'][S.sel.cstep||0]; },
  body:function(){ var l=FL(), a=acctOf(l), st=S.sel.cstep||0, steps=['Details','Risk','Company','KYC'];
    var bar='<div class="flex" style="gap:6px;flex-wrap:wrap;margin-bottom:14px">'+steps.map(function(t,i){ return chip((i<st?'✓ ':(i+1)+'. ')+t,i===st?'violet':(i<st?'green':'neutral'),false,true); }).join('')+'</div>';
    var h=bar;
    if(st===0){
      h+=field('Are you a sole proprietor?',seg('csole',[['y','Yes'],['n','No']],S.sel.csole))+
        (S.sel.csole==='y'?field('Do you have a GST registration certificate?',seg('cgst',[['y','Yes'],['n','No']],S.sel.cgst)):'')+
        note('blue','','A sole proprietor without GST is issued against PAN and Aadhaar. A registered business is issued against its GSTIN.','info');
    } else if(st===1){
      h+=field('Type of worker',select('cworker',S.sel.cworker||'',[['','Choose…'],'Accountant','Clerical / administrative','Factory worker','Skilled technician','Driver','Security guard','Labourer','Sales / field staff']))+
        field('Risk location to be covered',select('criskloc',S.sel.criskloc||'',[['','Choose…'],'All India Coverage','Specific Location']),'These details affect the policy premium.')+
        (S.sel.criskloc==='Specific Location'?'<div class="fgrid">'+field('Risk address',input('craddr',S.sel.craddr,'3rd Floor, 25th B Main Rd, Sector 2, HSR Layout'))+field('Pincode',input('crpin',S.sel.crpin,'560102'))+'</div><div class="fgrid">'+field('Risk state',input('crstate',S.sel.crstate,'Karnataka'))+field('Risk city',input('crcity',S.sel.crcity,'Bengaluru'))+'</div>':'');
    } else if(st===2){ cholaPre(l);
      h+=field('Address',input('caddr',S.sel.caddr,''),'Shown on the policy document.')+
        '<div class="fgrid">'+field('Place of incorporation',input('cplace',S.sel.cplace,''))+field('Pincode',input('cpin',S.sel.cpin,''))+'</div>'+
        '<div class="fgrid">'+field('Area code',input('carea',S.sel.carea,''))+field('Incorporation date','<input class="inp" id="f_cinc" data-f="cinc" type="date" value="'+esc(S.sel.cinc||'')+'">')+'</div>';
    } else {
      var prov=a&&a.prov;
      if(!prov){ if(S.sel.cpan===undefined) S.sel.cpan=a.pan||''; if(S.sel.cgstno===undefined) S.sel.cgstno=a.gst||'';
        h+=note('green','PAN and GST already on file — KYC cleared with Cholamandalam','<div class="fgrid">'+field('PAN on file',input('cpan',S.sel.cpan,''))+field('GSTIN on file',input('cgstno',S.sel.cgstno,''))+'</div>','circlecheck')+
          '<div class="flex" style="gap:8px">'+docBtns('PAN card',{acct:a.id})+docBtns('GST certificate',{acct:a.id})+'</div>'+
          note('blue','','This is a verified account, so the PAN and GST you already hold are reused — no upload needed. Chola’s API runs KYC against the numbers on file.','info');
      } else {
        var up=function(k,label){ var img=S.sel[k+'img']; return field(label,img?'<div class="kycup"><img src="'+img+'" alt="'+esc(label)+'"><div class="kycup-m"><b>'+esc(S.sel[k+'name']||label)+'</b><span class="green">'+ic('circlecheck','ic14')+'Uploaded</span><button type="button" class="quiet" data-cuclear="'+k+'">Replace</button></div></div>':'<label class="pdrop sm" for="f_'+k+'"><input type="file" id="f_'+k+'" accept="image/png,image/jpeg,application/pdf" data-cup="'+k+'" hidden>'+ic('upload','ic20')+'<b>Upload the '+esc(label.toLowerCase())+'</b></label>'); };
        var read=S.sel.cpan&&S.sel.cgstno;
        h+=note('amber','Provisional account — documents not on file','Upload the PAN card and GST certificate. OCR reads the numbers, and the account is verified as KYC clears with Cholamandalam.','alert')+up('cpan','PAN card')+up('cgstdoc','GST certificate')+
          (read?note('green','Read and verified — account KYC complete, cleared with Cholamandalam','<div class="fgrid">'+field('PAN read from the card',input('cpan',S.sel.cpan,''))+field('GSTIN read from the certificate',input('cgstno',S.sel.cgstno,''))+'</div>','circlecheck'):'')+
          simblock('Prototype','The OCR is faked here. In the product the numbers are read on upload.','<button type="button" class="simbtn" data-cholasample="1">Use sample documents</button>');
      }
    }
    return h+(st>0?'<div class="mt12"><button type="button" class="btn sm ghost" data-cholaback="1">← Back</button></div>':'');
  },
  can:function(){ var st=S.sel.cstep||0;
    if(st===0) return S.sel.csole==='n'||(S.sel.csole==='y'&&(S.sel.cgst==='y'||S.sel.cgst==='n'));
    if(st===1){ if(!(S.sel.cworker||'')||!(S.sel.criskloc||'')) return false; if(S.sel.criskloc==='Specific Location') return !!(S.sel.craddr||'').trim()&&!!(S.sel.crstate||'').trim()&&!!(S.sel.crcity||'').trim()&&!!(S.sel.crpin||'').trim(); return true; }
    if(st===2) return ['caddr','cplace','cpin','carea','cinc'].every(function(k){ return !!String(S.sel[k]||'').trim(); });
    var a=acctOf(FL()); if(a&&!a.prov) return !!S.sel.cpan&&!!S.sel.cgstno;
    return !!S.sel.cpanimg&&!!S.sel.cgstdocimg&&!!S.sel.cpan&&!!S.sel.cgstno; },
  ok:function(){ return (S.sel.cstep||0)<3?'Continue':'Complete KYC'; },
  run:function(){ var st=S.sel.cstep||0; if(st<3){ S.sel.cstep=st+1; return 'stay'; }
    var l=FL(); var ok=write(function(){ l.chola=l.chola||{}; l.chola.kyc=S.now;
      var a=acctOf(l); if(a&&a.prov){ a.prov=0; a.pan=S.sel.cpan; a.gst=S.sel.cgstno; a.kycBy=S.user; a.kycAt=S.now; a.kycHow='PAN and GST uploaded and read by OCR · Cholamandalam issuance'; a.kycDocs={pan:S.sel.cpanname||'PAN card',doc:S.sel.cgstdocname||'GST certificate'}; acctLog(a,'KYC verified','System · PAN and GST uploaded for the Cholamandalam issuance · '+uname(S.user)); linesOfAcct(a.id).forEach(function(x){ logAdd(x,'KYC verified','System · documents uploaded on the Cholamandalam issuance','sys',1); }); }
      l.chola.cap={sole:S.sel.csole,gstCert:S.sel.cgst||'',worker:S.sel.cworker,riskLoc:S.sel.criskloc,riskAddr:S.sel.craddr||'',riskState:S.sel.crstate||'',riskCity:S.sel.crcity||'',riskPin:S.sel.crpin||'',coAddr:S.sel.caddr,coPlace:S.sel.cplace,coPin:S.sel.cpin,coArea:S.sel.carea,coInc:S.sel.cinc,pan:S.sel.cpan,gst:S.sel.cgstno};
      logAdd(l,'Chola issuance details captured',uname(S.user)+' · '+(S.sel.csole==='y'?'sole proprietor':'registered business')+' · worker: '+S.sel.cworker+' · risk: '+S.sel.criskloc,'note',0);
      logAdd(l,'PAN and GST read by OCR · real-time KYC cleared with Cholamandalam','System · PAN '+S.sel.cpan+' · GSTIN '+S.sel.cgstno+' · via insurer API','sys',1); },'the KYC'); if(!ok) return 'fail';
    toast('KYC cleared','Cholamandalam verified the insured. Generate the payment link next.'); }};
FLOWS.cholaLink={t:function(){ var l=FL(); return (l.chola&&l.chola.link&&!cholaLinkExpired(l))?'Payment link':'Generate payment link'; }, sub:'Cholamandalam returns a live link, valid for 24 hours. Copy it or send it to the client; after 24 hours, regenerate it.',
  body:function(){ var l=FL(), ch=l.chola||{}, valid=ch.link&&!cholaLinkExpired(l), link=valid?ch.link:cholaLink(l), em=(l.contact||{}).e;
    return '<div class="kvgrid two">'+kv('Insurer',esc(CHOLA))+kv('Amount','<b>'+INR(premOf(l))+'</b>')+'</div>'+
      (ch.link&&cholaLinkExpired(l)?note('amber','The previous link expired','It was valid for 24 hours and was not paid. Sending a new link replaces it.','alert'):'')+
      '<div class="field"><div class="lbl">Payment link</div><div class="flex" style="gap:8px;align-items:center"><input class="inp mono" value="'+esc(link)+'" readonly style="flex:1 1 auto;min-width:0"><button type="button" class="btn sm" data-copy="1">'+ic('copy','ic14')+'Copy link</button></div></div>'+
      (ch.sentAt&&valid?note('green','','Sent to '+esc(ch.sentTo||em||'the client')+' on '+esc(fmt(ch.sentAt))+' · valid for '+cholaLinkLeft(l)+' more hours. The policy issues in real time when they pay.','circlecheck'):note('blue','',(valid?'Valid for '+cholaLinkLeft(l)+' more hours. ':'Valid for 24 hours once sent. ')+(em?'Send payment link emails it to '+esc(em)+' (the contact on this line). ':'')+'The policy issues in real time the moment they pay.','info')); },
  ok:function(){ var l=FL(), ch=l.chola||{}; return (ch.link&&!cholaLinkExpired(l)&&ch.sentAt)?'Resend payment link':'Send payment link'; },
  run:function(){ var l=FL(), em=(l.contact||{}).e; var regen=!!(l.chola&&l.chola.link&&cholaLinkExpired(l)); var ok=write(function(){ l.chola=l.chola||{}; if(!l.chola.link||cholaLinkExpired(l)){ l.chola.link=cholaLink(l); l.chola.linkAt=S.now; } l.chola.sentAt=S.now; l.chola.sentTo=em||'the client'; logAdd(l,(regen?'Payment link regenerated and sent':'Payment link sent')+' to '+(em||'the client'),'System · email · '+l.chola.link+' · valid 24 hours · no payment ticket','email',1); if(l.stage<10) moveStage(l,10,'Payment link sent to the client'); },'sending the link'); if(!ok) return 'fail'; toast('Payment link sent','Emailed to '+(em||'the client')+'. Valid for 24 hours — the policy issues in real time when they pay.'); }};
FLOWS.cholaShare={t:'Share the policy copy', sub:'Cholamandalam issued it on payment. Send it to the client — there is no QC step and no ticket.', wide:true,
  body:function(){ var l=FL(), p=polOfLine(l);
    return '<div class="flex" style="gap:8px">'+docBtns('Policy copy',{line:l.id})+docBtns('Tax invoice',{line:l.id})+'</div>'+
      '<div class="kvgrid two mt12">'+kv('Insurer',esc(l.picked||l.ins))+kv('Policy number','<span class="mono">'+esc(p?p.pno:'—')+'</span>')+kv('Premium','<b>'+INR(premOf(l))+'</b>')+kv('Sum insured',esc((l.req||{}).si||'—'))+'</div>'+
      note('blue','','Cholamandalam issued the policy copy and tax invoice in real time when the client paid. Sharing sends them to '+esc((l.contact||{}).n||'the client')+' on the three rails and closes the line — no QC and no post-purchase ticket.','info'); },
  ok:'Share policy copy',
  run:function(){ var l=FL(); var ok=write(function(){ l.chola=l.chola||{}; l.chola.shared=S.now; logAdd(l,'Policy copy and tax invoice shared with the client','System · issued in real time by Cholamandalam · three rails · no post-purchase ticket','post',1); moveStage(l,14,'Policy copy shared with the client'); },'the share'); if(!ok) return 'fail'; toast('Shared','Policy copy and tax invoice sent to the client. Issued in real time — no ticket.'); }};
function cholaWcAcct(){ var l=(S.data.lines||[]).filter(function(x){return x.product===WC_PRODUCT;})[0]; return l?acctOf(l):by(S.data.accounts,'A-1001'); }
HANDLERS.push(function(t){
  var x=t.closest('[data-cholaback]'); if(x){ S.sel.cstep=Math.max(0,(S.sel.cstep||0)-1); paintModal(); return true; }
  x=t.closest('[data-protoprov]'); if(x){ var a=cholaWcAcct(); if(a){ a.prov=a.prov?0:1; acctLog(a,a.prov?'Set to provisional (prototype control)':'Set to verified (prototype control)','Prototype · to demonstrate the Cholamandalam KYC step'); } save(); paintModal(); paint(); if(a) toast('WC account '+(a.prov?'set to provisional':'verified'),a.prov?'The Cholamandalam KYC step will now ask to upload PAN and GST.':'The Cholamandalam KYC step will auto-fill from the documents on file.'); return true; }
  x=t.closest('[data-cholasample]'); if(x){ var l=FL(),a=acctOf(l); S.sel.cpanimg=kycDoc('pan',a); S.sel.cpanname='PAN_'+shortName(a.n).replace(/\s+/g,'')+'.pdf'; S.sel.cgstdocimg=kycDoc('gst',a); S.sel.cgstdocname='GST_Certificate_'+shortName(a.n).replace(/\s+/g,'')+'.pdf'; S.sel.cpan=a.pan||'AABCS1234F'; S.sel.cgstno=a.gst||'27AABCS1234F1Z5'; paintModal(); return true; }
  x=t.closest('[data-cuclear]'); if(x){ var k=x.dataset.cuclear; S.sel[k+'img']=''; S.sel[k+'name']=''; if(k==='cpan') S.sel.cpan=''; if(k==='cgstdoc') S.sel.cgstno=''; paintModal(); return true; }
  return false;
});
document.addEventListener('change',function(ev){ var t=ev.target; if(!(t instanceof Element)||t.dataset.cup===undefined) return; var f=t.files&&t.files[0]; if(!f) return; var k=t.dataset.cup, a=acctOf(FL());
  var done=function(){ if(S.sel.cpanimg&&S.sel.cgstdocimg){ S.sel.cpan=a.pan||S.sel.cpan||'AABCS1234F'; S.sel.cgstno=a.gst||S.sel.cgstno||'27AABCS1234F1Z5'; } paintModal(); };
  if(/^image\//.test(f.type)){ var rd=new FileReader(); rd.onload=function(){ S.sel[k+'img']=rd.result; S.sel[k+'name']=f.name; done(); }; rd.readAsDataURL(f); } else { S.sel[k+'img']=kycDoc(k==='cpan'?'pan':'gst',a); S.sel[k+'name']=f.name; done(); } });

