/* ==================================================================== *
 *  Home (sales executive), RM home, Pipeline, Tasks, Tickets, Search, Not found
 * ==================================================================== */
function lineTx(l){ return '<b>'+esc(acctName(l))+'</b> · '+esc(l.product)+' '+chip(stageName(l.stage),'neutral',false,true); }
function lineRow(l,line2,act){
  return '<div class="row" data-go="line" data-id="'+l.id+'"><div class="bd">'+lineTx(l)+' '+prioBadge(l)+(line2?'<div class="m2">'+line2+'</div>':'')+'</div>'+
    '<div class="rt">'+(act?'<button class="btn sm" data-go="line" data-id="'+l.id+'">'+esc(act)+'</button>':'')+'</div></div>';
}
function taskSrc(t){ if(t.src) return t.src; if(t.rule){ var r=by(S.data.rules,t.rule); return 'Rule · '+(r?r.n:t.rule); } return t.cls==='Manual'?'Added by '+uname(t.by||t.owner):(t.cls==='Follow-up'?'Call outcome':'System'); }
function taskRow(t,opts){
  opts=opts||{}; var st=taskState(t), l=t.line?lineById(t.line):null, a=t.acct?acctOf(t.acct):null;
  var target = l ? lineTx(l)+(l.status!=='open'?' '+chip(statusTx(l),statusTone(l),false,true):'') : (a ? '<b>'+esc(a.n)+'</b> · account' : '<b>—</b>');
  var mine=t.owner===S.user, mgr=isMgrRole() && (userById(t.owner)||{}).mgr===S.user;
  var due=!t.done&&mine&&t.cls!=='SLA'?'<input type="datetime-local" class="inp tdue" data-taskdue="'+t.id+'" value="'+esc(dtLocal(t.dueAt))+'" min="'+esc(dtLocal(S.now))+'" title="Change the due date and time">':'';
  var doneTx=t.done?(t.doneBy==='system'?'Closed by the system — '+(t.closeWhy||'its condition was met'):'Done by '+uname(t.doneBy)+(t.closeWhy?' · '+t.closeWhy:''))+' · '+fmt(t.doneAt):'';
  return '<div class="row" data-go="'+(l?'line':'acct')+'" data-id="'+(l?l.id:(a?a.id:''))+'">'+
    ((mine||(mgr&&st==='esc'))&&!t.done?'<input type="checkbox" class="chk" data-taskdone="'+t.id+'" aria-label="Done">':'')+
    '<div class="bd"><b>'+esc(t.title)+'</b>'+(opts.who?' <span class="meta">· '+esc(uname(t.owner))+'</span>':'')+'<div class="m">'+target+'</div>'+
    (t.desc?'<div class="m2">'+esc(t.desc)+'</div>':'')+
    '<div class="m2">'+(t.done?chip('Done','green',true,true)+' <span class="meta">'+esc(doneTx)+'</span>':'<span title="'+(t.cls==='SLA'?'Due date set by rule — not editable':'You set this date — change it on the right')+'">'+chip(taskStateTx(t),taskTone(st),true,true)+'</span> '+chip(t.cls,'neutral',false,true)+(t.cls!=='SLA'?' '+chip('does not escalate','neutral',false,true):'')+(st==='esc'||st==='over'?' · was due '+esc(fmt(t.dueAt)):''))+' · <span class="meta" title="Why this task exists">'+esc(taskSrc(t))+'</span>'+''+'</div></div>'+
    '<div class="rt">'+due+'<button class="btn sm" data-go="'+(l?'line':'acct')+'" data-id="'+(l?l.id:(a?a.id:''))+'">Open</button></div></div>';
}
document.addEventListener('change',function(ev){ var t=ev.target; if(!(t instanceof Element)||t.dataset.taskdue===undefined) return; var tk=by(S.data.tasks,t.dataset.taskdue); if(!tk||!t.value) return; var v=new Date(t.value).getTime(); if(v<S.now){ toast('A due time cannot be in the past','',{red:1}); paint(); return; } if(write(function(){ tk.dueAt=v; },'the due date')){ paint(); toast('Due '+fmt(v),''); } });
function tile(tone,n,label,gloss,go,anchor){ return '<button class="tile '+tone+'" data-go="'+go+'"'+(anchor?' data-anchor="'+anchor+'"':'')+'><div class="n"><b>'+n+'</b>'+esc(label)+'</div><div class="r"><span class="meta">'+esc(gloss)+'</span><span class="go">'+ic('arrowright')+'</span></div></button>'; }

/* ---------- home v3 building blocks, shared by the sales and RM homes ---------- */
function greetTx(){ var h=new Date(S.now).getHours(); return h<12?'Good morning':(h<17?'Good afternoon':'Good evening'); }
function hSeg(key,cur,opts){ return '<div class="hseg">'+opts.map(function(o){ return '<button class="'+(cur===o[0]?'on':'')+(o[3]?' '+o[3]:'')+'" data-uiset="'+key+'" data-uv="'+esc(o[0])+'">'+esc(o[1])+'<span class="n">'+o[2]+'</span></button>'; }).join('')+'</div>'; }
/* [stated 26 Sep · 17.1] a card shows five rows, then N more */
function hCard(id,tone,icon,title,rows,right,none){ var all=S.ui['hm_'+id], shown=all?rows:rows.slice(0,5);
  return '<section class="hcard" id="h-'+id+'"><div class="hhd"><span class="hic '+tone+'">'+ic(icon)+'</span><span class="t">'+esc(title)+'</span><span class="sp"></span>'+(right||'')+'</div>'+
    panelOr('h-'+id,function(){ return (rows.length?shown.join(''):'<div class="hempty">'+esc(none||'Nothing here.')+'</div>')+(rows.length>5?'<button class="hmore" data-uiset="hm_'+id+'" data-uv="'+(all?'':'1')+'">'+(all?'Show fewer':(rows.length-5)+' more')+'</button>':''); })+'</section>'; }
function hLineRow(l,meta){ return '<div class="hrow row" data-go="line" data-id="'+l.id+'"><div class="bd"><div class="tt">'+esc(shortName(acctName(l)))+' <span class="pr">· '+esc(l.product)+'</span> '+prioBadge(l)+'</div><div class="mt">'+meta+'</div></div><div class="rt">'+ic('chevright')+'</div></div>'; }
function hTaskRow(t){ var l=t.line?lineById(t.line):null, a=t.acct?acctOf(t.acct):null, st=taskState(t);
  var tgt=l?(shortName(acctName(l))+' · '+l.product):(a?shortName(a.n):'—');
  var lateTx=function(){ var h=Math.round(workMins(t.dueAt,S.now)/60); if(h<1) return 'Overdue'; if(h<9) return 'Overdue by '+h+(h===1?' hour':' hours'); var d=Math.round(h/9)||1; return 'Overdue by '+d+(d===1?' day':' days'); };
  var state=st==='esc'?chip('Escalated · '+lateTx().toLowerCase(),'red',true,true):(st==='over'?chip(lateTx(),'red',true,true):chip('Due '+fmt(t.dueAt).replace(/^today, /,''),'amber',true,true));
  return '<div class="hrow row" data-go="'+(l?'line':'acct')+'" data-id="'+(l?l.id:(a?a.id:''))+'"><div class="bd"><div class="tt">'+esc(t.title)+'</div><div class="mt">'+state+'<span>'+esc(tgt)+'</span></div></div>'+
    '<div class="rt"><button class="done" data-taskdone="'+t.id+'">'+ic('check')+'Mark done</button></div></div>'; }
/* tasks on this person, split the way the homepage shows them */
function hTasks(uid){ var over=[], today=[]; myTasks(uid).forEach(function(t){ var st=taskState(t); if(st==='esc'||st==='over') over.push(t); else if(st==='today') today.push(t); });
  var byDue=function(x,y){ return x.dueAt-y.dueAt; }; over.sort(byDue); today.sort(byDue);
  var tab=S.ui.htab||'today'; if(tab==='today'&&!today.length&&over.length) tab='over';
  return {over:over, today:today, tab:tab}; }
function hTaskCard(tk){
  return hCard('tasks',tk.tab==='over'?'red':'amber','checks','Tasks',(tk.tab==='over'?tk.over:tk.today).map(hTaskRow),
    hSeg('htab',tk.tab,[['today','Due today',tk.today.length],['over','Overdue',tk.over.length,'red']]),
    tk.tab==='over'?'Nothing overdue.':'Nothing due today.'); }
/* newly assigned — not contacted yet, filtered by when it landed */
var HBANDS=[['d0','Today',0],['d3','Last 3 days',2],['d7','This week',6],['d30','This month',29]];
function hFreshCard(items){ /* items: [{l:line, at:timestamp, meta:html}] */
  var age=function(x){ return daysBetween(x.at,S.now); };
  var inBand=function(k){ var lim=0; HBANDS.forEach(function(y){ if(y[0]===k) lim=y[2]; }); return items.filter(function(x){ return age(x)<=lim; }); };
  var band=S.ui.nab||''; if(!band||!inBand(band).length){ band=''; HBANDS.forEach(function(y){ if(!band && inBand(y[0]).length) band=y[0]; }); if(!band) band='d0'; }
  return hCard('fresh','violet','sparkles','Newly assigned', inBand(band).sort(function(a,b){ return (webPrioRank(a.l)-webPrioRank(b.l))||(a.at-b.at); }).map(function(x){ return hLineRow(x.l,x.meta); }),
    hSeg('nab',band,HBANDS.map(function(y){ return [y[0],y[1],inBand(y[0]).length]; })), 'Nothing assigned in this window.'); }
function hWhen(at){ var d=daysBetween(at,S.now); return d<=0?'today':(d===1?'yesterday':d+' days ago'); }
/* ---------- a manager's rows: the same card language, plus the one action they have ---------- */
/* [stated 23 Sep] a head opens the homepage to see what to work on now — escalations first,
   then what is slipping. No tables, no long lists, nothing that is only for looking at. */
function hMgrTaskRow(t){ var l=t.line?lineById(t.line):null, a=t.acct?acctOf(t.acct):null;
  var tgt=l?(shortName(acctName(l))+' · '+l.product):(a?shortName(a.n):'—');
  var h=Math.round(workMins(t.escAt||t.dueAt,S.now)/60), since=h<9?(h<1?'just now':h+(h===1?' hour':' hours')):Math.max(1,Math.round(h/9))+(Math.round(h/9)===1?' day':' days');
  return '<div class="hrow row" data-go="'+(l?'line':'acct')+'" data-id="'+(l?l.id:(a?a.id:''))+'"><div class="bd"><div class="tt">'+esc(t.title)+'</div>'+
    '<div class="mt">'+chip('Escalated '+since+' ago','red',true,true)+'<span>'+esc(tgt)+' · '+esc(uname(t.owner))+'</span></div></div>'+
    '<div class="rt">'+(l?'<button class="tk" data-flow="takeover" data-line="'+l.id+'">Take it over</button>':'')+'<button class="done" data-taskdone="'+t.id+'">'+ic('check')+'Close</button></div></div>'; }
function hSlipRow(l,meta){ return '<div class="hrow row" data-go="line" data-id="'+l.id+'"><div class="bd"><div class="tt">'+esc(shortName(acctName(l)))+' <span class="pr">· '+esc(l.product)+'</span></div><div class="mt">'+meta+'</div></div>'+
    '<div class="rt"><button class="tk" data-flow="takeover" data-line="'+l.id+'">Take it over</button>'+ic('chevright')+'</div></div>'; }
function hMgrHero(u,sub){ return '<div class="hhero"><div class="h1">'+esc(greetTx())+', '+esc(u.n.split(' ')[0])+'</div><span class="hday">'+ic('calendar')+esc(fmt(S.now).replace(/^today, /,'Today · '))+'</span></div>'+
    '<div class="sub">'+sub+'</div>'+diamonds(); }
/* [stated 23 Sep] a home list is short — five rows, then a count you can open */
var HMAX=5;
function hCut(key,rows){ var all=S.ui[key]==='all'; var out=all?rows.slice():rows.slice(0,HMAX);
  if(!all&&rows.length>HMAX) out.push('<button class="hmore" data-uiset="'+key+'" data-uv="all">'+esc((rows.length-HMAX)+' more')+ic('chevdown','ic14')+'</button>');
  if(all&&rows.length>HMAX) out.push('<button class="hmore" data-uiset="'+key+'" data-uv="">Show less'+ic('chevdown','ic14')+'</button>');
  return out; }
function hMgrClear(what){ return '<div class="mt16">'+empty('circlecheck','Nothing needs you right now',what)+'</div>'; }


SCREENS.home=function(){
  /* [stated 23 Sep] the homepage answers one question: what do I have to do today. */
  var u=me(), b=homeBuckets(u.id), tk=hTasks(u.id);
  var n=b.fresh.length+tk.over.length+tk.today.length+b.move.length+b.quiet.length;
  var html='<div class="hhero"><div class="h1">'+esc(greetTx())+', '+esc(u.n.split(' ')[0])+'</div><span class="hday">'+ic('calendar')+esc(fmt(S.now).replace(/^today, /,'Today · '))+'</span></div>'+
    '<div class="sub">Everything that needs you today. The rest of your book is on <button class="link" data-go="pipeline">Pipeline</button>.</div>'+diamonds()+
    (n?'':'<div class="mt16">'+empty('circlecheck','Nothing needs you today','No task is due or overdue, nothing new is waiting for a first call, and no line is sitting on you.','<button class="btn" data-go="pipeline">Open Pipeline</button>')+'</div>')+
    '<div class="hgap">'+
    hFreshCard(b.fresh.map(function(l){ return {l:l, at:l.assignedAt, meta:'<span>assigned '+esc(hWhen(l.assignedAt))+(l.src?' · '+esc(l.src):'')+'</span>'}; }))+
    hTaskCard(tk)+
    (1?hCard('move','amber','zap','Action required', b.move.map(function(l){ return hLineRow(l,'<span>'+esc(nextAction(l).txt)+'</span>'); }), chip(b.move.length,'amber',false,true)):'')+
    (1?hCard('quiet','blue','clock','No activity in '+QUIET_DAYS+' days', b.quiet.map(function(l){ return hLineRow(l,'<span class="red">'+daysQuiet(l)+' days</span><span>since the last activity · waiting on '+esc(actingParty(l))+'</span>'); }), chip(b.quiet.length,'blue',false,true)):'')+
    '</div>'+
    '<div class="mt16">'+inboundSim()+'</div>';
  return {sc:'Home', html:html};
};

SCREENS.rmhome=function(){
  var u=me(), need=S.data.svc.filter(function(t){return svcNeed(t);}), open=S.data.svc.filter(function(t){return !svcClosed(t);});
  var mine=S.data.accounts.filter(function(a){return a.own===u.id;});
  var ren=[]; mine.forEach(function(a){ a.pols.forEach(function(p){ var d=daysBetween(S.now,p.exp); if(d>=0&&d<=90) ren.push({a:a,p:p,d:d}); }); });
  var html='<div class="h1">Your desk</div><div class="sub">'+plural(mine.length,'account')+' you own after the sale. What needs you, then what is coming up for renewal.</div>'+diamonds()+
    '<div class="tiles">'+tile('red',need.length,'need your reply','a query or a document is waiting on you','tickets')+tile('violet',open.length,'open service tickets','endorsements and claims in flight','tickets')+tile('amber',ren.length,'renewals in 90 days','policies on your accounts','accounts')+tile('blue',mine.length,'accounts you own','sold, or handed over at payment','accounts')+'</div>'+
    '<div class="gap12 mt16">'+
    (need.length?'<section class="card"><div class="cardh"><span class="t">Needs your reply</span>'+chip(need.length,'red',false,true)+'</div><div class="rowlist">'+need.map(function(t){ return '<div class="row" data-go="svctix" data-id="'+t.id+'"><div class="bd"><b>'+esc(t.id)+' · '+esc(t.sub)+'</b><div class="m">'+esc(acctOf(t.acct).n)+' · '+esc(t.prod)+'</div><div class="m2">'+chip(t.stage,'amber',true,true)+' · waiting on you</div></div><div class="rt"><button class="btn sm" data-go="svctix" data-id="'+t.id+'">Open</button></div></div>'; }).join('')+'</div></section>':'')+
    (ren.length?'<section class="card"><div class="cardh"><span class="t">Renewals in the next 90 days</span>'+chip(ren.length,'amber',false,true)+'<span class="sp"></span><span class="s">renewals themselves enter through the renewal route, not this prototype</span></div><div class="rowlist">'+ren.sort(function(x,y){return x.d-y.d;}).map(function(r){ return '<div class="row" data-go="acct" data-id="'+r.a.id+'"><div class="bd"><b>'+esc(r.a.n)+'</b> · '+esc(r.p.p)+'<div class="m2">'+esc(r.p.id)+' · '+esc(r.p.ins)+' · expires '+esc(fmtD(r.p.exp))+' · <span class="'+(r.d<=30?'red':'amber')+'">in '+r.d+' days</span></div></div><div class="rt"><button class="btn sm" data-go="acct" data-id="'+r.a.id+'">Open account</button></div></div>'; }).join('')+'</div></section>':'')+
    (!need.length&&!ren.length?empty('circlecheck','Nothing needs you','Every service ticket is with the desk or the insurer, and nothing renews in the next 90 days.'):'')+'</div>';
  return {sc:'Home', html:html};
};

/* ---------- pipeline ---------- */
SCREENS.pipeline=function(){
  var u=me(), f=S.ui.pf||(isRmRole(u)?'all':'open'), q=(S.ui.pq||'').toLowerCase(), prod=S.ui.pprod||'', st=S.ui.pstage||'';
  /* [stated 23 Sep] scoped by the view switch — own lines, or the team's */
  var lines=S.data.lines.filter(function(l){return inScope(l.owner,u);}), tv=teamView(u);
  var counts={open:lines.filter(openLine).length, post:lines.filter(postLine).length, issued:lines.filter(issuedLine).length, park:lines.filter(function(l){return l.status==='park';}).length, closed:lines.filter(dead).length, all:lines.length};
  var rows=lines.filter(function(l){
    if(f==='open'&&!openLine(l)) return false; if(f==='post'&&!postLine(l)) return false; if(f==='issued'&&!issuedLine(l)) return false; if(f==='park'&&l.status!=='park') return false; if(f==='closed'&&!dead(l)) return false;
    if(prod&&l.product!==prod) return false; if(st&&String(l.stage)!==st) return false;
    if(q&&(acctName(l)+' '+l.product+' '+l.id+' '+oppName(l)).toLowerCase().indexOf(q)<0) return false; return true;
  }).sort(function(x,y){ return (y.stage-x.stage)||(webPrioRank(x)-webPrioRank(y))||(daysInStage(y)-daysInStage(x)); });
  var prods=[]; lines.forEach(function(l){ if(prods.indexOf(l.product)<0) prods.push(l.product); });
  var html='<div class="hdrow"><div><div class="h1">Pipeline</div><div class="sub">'+(tv?'Every product line your team owns.':'Every product line you own.')+'</div></div></div>'+diamonds()+
    pills('pf',f,[['open','Selling',counts.open],['post','Post-purchase',counts.post],['issued','Issued',counts.issued],['park','Parked',counts.park],['closed','Closed',counts.closed],['all','All',counts.all]])+
    '<div class="flex wrap mt12" style="gap:10px"><input class="inp" id="pq" data-ui="pq" style="max-width:280px" placeholder="Account, product, line or opportunity" value="'+esc(S.ui.pq||'')+'">'+
      '<select class="sel" data-uisel="pprod" style="max-width:220px"><option value="">All products</option>'+prods.map(function(p){return '<option'+(prod===p?' selected':'')+'>'+esc(p)+'</option>';}).join('')+'</select>'+
      '<select class="sel" data-uisel="pstage" style="max-width:240px"><option value="">All stages</option>'+STAGES.map(function(s){return '<option value="'+s.n+'"'+(st===String(s.n)?' selected':'')+'>'+esc(s.s)+'</option>';}).join('')+'</select>'+
      (q||prod||st?'<button class="btn ghost sm" data-clearpf="1">Clear filters</button>':'')+'</div>'+
    '<div class="card mt16" style="overflow:hidden">'+(rows.length?'<div class="tw"><table class="t"><thead><tr><th>Line</th><th><span class="f">'+ic('chevdown')+'Stage</span></th><th>Waiting on</th><th>Account</th>'+(tv?'<th>Owner</th>':'')+'<th>Opportunity</th><th class="num">Premium</th><th>In stage</th></tr></thead><tbody>'+
      rows.map(function(l){ var w=actingParty(l); return '<tr class="row'+(dead(l)?' dim':'')+'" data-go="line" data-id="'+l.id+'"><td class="id">'+esc(l.id)+' '+prioBadge(l)+'<div class="sub" style="color:var(--ink);font-weight:500">'+esc(l.product)+'</div></td>'+
        '<td>'+chip(stageName(l.stage),l.stage===14?'green':(l.stage>=SALES_STAGES?'violet':(dead(l)?'red':(l.status==='park'?'amber':'neutral'))),true,true)+(l.status!=='open'?'<div class="sub">'+esc(statusTx(l))+'</div>':'')+'</td>'+
        '<td>'+chip(w,waitTone(w),false,true)+'</td><td class="nm one" title="'+esc(acctName(l))+'">'+esc(shortName(acctName(l)))+'</td>'+(tv?'<td class="one">'+esc(uname(l.owner))+'</td>':'')+'<td class="one">'+esc(l.opp||'Renewal')+'</td><td class="num">'+(confirmed(l)?'<b class="b">'+INR(premOf(l))+'</b>':'<span class="meta">'+INR(premOf(l))+' est.</span>')+'</td>'+
        '<td>'+(l.stage===14?'—':plural(daysInStage(l),'day'))+'</td></tr>'; }).join('')+'</tbody></table></div>'
      : empty('filter', q||prod||st?'No line matches those filters':'No '+(f==='open'?'selling':(f==='post'?'post-purchase':f))+' lines', q||prod||st?'Clear a filter, or search for the account by name from the sidebar.':'Lines arrive from inbound enquiries, from <b>New opportunity</b>, or by reassignment.', q||prod||st?'<button class="btn" data-clearpf="1">Clear filters</button>':''))+'</div>';
  return {sc:'Pipeline', html:html};
};
HANDLERS.push(function(t){ if(t.closest('[data-clearpf]')){ S.ui.pq='';S.ui.pprod='';S.ui.pstage=''; paint(); return true; } return false; });

/* ---------- tasks ---------- */
SCREENS.tasks=function(){
  var u=me(), all=S.data.tasks.filter(function(t){return t.owner===u.id;}), cls=S.ui.tcls||'', att=S.ui.tatt||'', rec=S.ui.trec||'', sf=S.ui.tst||'';
  var esc2=isMgrRole(u)?escalatedTo(u.id):[];
  var pass=function(t){ if(cls&&t.cls!==cls) return false; if(att==='line'&&!t.line) return false; if(att==='acct'&&t.line) return false;
    var l=t.line?lineById(t.line):null; if(rec==='open'&&l&&dead(l)) return false; if(rec==='closed'&&!(l&&dead(l))) return false; if(sf&&!t.done&&taskState(t)!==sf) return false; if(sf&&t.done) return false; return true; };
  var open=all.filter(function(t){return !t.done;}), wk=S.now-7*86400000, done=all.filter(function(t){return t.done&&t.doneAt>=wk;});
  var grp={esc:[],over:[],today:[],up:[]}; open.filter(pass).forEach(function(t){ var st=taskState(t); grp[st==='pending'?'up':st].push(t); });
  var cnt={esc:open.filter(function(t){return taskState(t)==='esc';}).length+esc2.length,over:open.filter(function(t){return taskState(t)==='over';}).length,today:open.filter(function(t){return taskState(t)==='today';}).length};
  var g=function(k,title,tone,list,who){ list=list||grp[k]; if(!list.length) return ''; return '<section class="card"><div class="cardh"><span class="t">'+esc(title)+'</span>'+chip(list.length,tone,false,true)+'</div><div class="rowlist">'+list.sort(function(x,y){return x.dueAt-y.dueAt;}).map(function(t){return taskRow(t,{who:who});}).join('')+'</div></section>'; };
  var sel=function(key,cur,opts){ return '<select class="sel" data-uisel="'+key+'" style="max-width:180px">'+opts.map(function(o){ return '<option value="'+o[0]+'"'+(cur===o[0]?' selected':'')+'>'+esc(o[1])+'</option>'; }).join('')+'</select>'; };
  var shown=grp.esc.length+grp.over.length+grp.today.length+grp.up.length+esc2.length;
  var html='<div class="hdrow"><div><div class="h1">Tasks</div><div class="sub">Only yours'+(isMgrRole(u)?', plus what has escalated to you':'')+'. Grouped by when, not by kind.</div></div></div>'+
    '<div class="stat mt12"><div class="s"><div class="lbl">Escalated</div><div class="v red">'+cnt.esc+'</div></div><div class="s"><div class="lbl">Overdue</div><div class="v red">'+cnt.over+'</div></div><div class="s"><div class="lbl">Due today</div><div class="v amber">'+cnt.today+'</div></div></div>'+diamonds()+
    '<div class="flex wrap" style="gap:10px">'+sel('tcls',cls,[['','All classes'],['SLA','SLA'],['Follow-up','Follow-up'],['Manual','Manual']])+sel('tatt',att,[['','Lines and accounts'],['line','On a product line'],['acct','On an account']])+sel('trec',rec,[['','Any record state'],['open','Record open'],['closed','Record closed']])+sel('tst',sf,[['','Any state'],['esc','Escalated'],['over','Overdue'],['today','Due today'],['pending','Upcoming']])+'</div>'+
    '<div class="gap12 mt16">'+(shown||done.length
      ? g('esc2','Escalated to you','red',esc2.filter(pass),true)+g('esc','Escalated','red')+g('over','Overdue','red')+g('today','Due today','amber')+g('up','Upcoming','neutral')+
        (shown?'':'<div class="card">'+empty('checks',open.length?'Nothing matches these filters':'No open tasks',open.length?'Change or clear the filters.':'A task arrives three ways: a rule fires, a call outcome creates a follow-up, or you add one yourself.')+'</div>')+
        (done.length?'<section class="card"><div class="cardh"><span class="t">Done this week</span>'+chip(done.length,'green',false,true)+'</div><div class="rowlist">'+done.sort(function(x,y){return y.doneAt-x.doneAt;}).map(function(t){return taskRow(t);}).join('')+'</div></section>':'')
      : empty('checks','Nothing here yet','A task arrives three ways: a rule fires when a line enters a stage, a call outcome creates a follow-up, or you add one yourself.','<button class="btn" data-flow="addTask">'+ic('plus')+'Add task</button>'))+'</div>'+
    '<div class="mt16">'+note('violet','Escalation','SLA tasks escalate to your manager after their second clock. Follow-up and Manual tasks stop at Overdue — you chose their dates, so nobody is escalated for missing them.','info')+'</div>';
  return {sc:'Tasks', html:html, cta:'<button class="btn primary sm" data-flow="addTask">'+ic('plus')+'Add task</button>'};
};
FLOWS.addTask={t:'Add a task', sub:'For yourself, on a product line or an account. Class is always Manual — a user cannot create an SLA task.',
  body:function(){
    var u=me(), mine=S.data.lines.filter(function(l){return l.owner===u.id && (openLine(l)||postLine(l));}), accts=S.data.accounts.filter(function(a){ return onAcct(a,u)&&!a.merged; });
    var cur=S.sel.att||(S.sel.line?'l:'+S.sel.line:'');
    var opts='<select class="sel" id="f_att" data-f="att"><option value="">Choose a line or an account</option><optgroup label="Product lines">'+mine.map(function(l){return '<option value="l:'+l.id+'"'+(cur==='l:'+l.id?' selected':'')+'>'+esc(acctName(l)+' · '+l.product)+'</option>';}).join('')+'</optgroup><optgroup label="Accounts">'+accts.map(function(a){return '<option value="a:'+a.id+'"'+(cur==='a:'+a.id?' selected':'')+'>'+esc(a.n)+'</option>';}).join('')+'</optgroup></select>';
    return field('Task', input('title',S.sel.title,'What needs doing'))+field('Description — optional',input('desc',S.sel.desc,'Anything you will want to remember'))+
      field('Attach to', opts)+
      field('Due', '<input class="inp" id="f_due" data-f="due" type="datetime-local" min="'+esc(dtLocal(S.now))+'" value="'+esc(S.sel.due||'')+'">','Date and time. It cannot be in the past.', S.sel.due&&new Date(S.sel.due).getTime()<S.now?'A due time cannot be in the past.':'')+
      note('neutral','','Class <b>Manual</b>. It goes Pending → Overdue and never escalates.');
  },
  can:function(){ return !!(S.sel.title||'').trim() && !!(S.sel.att||S.sel.line) && !!S.sel.due && new Date(S.sel.due).getTime()>=S.now; }, ok:'Add task',
  run:function(){ var due=new Date(S.sel.due).getTime(), at=S.sel.att||('l:'+S.sel.line), lid=at.indexOf('l:')===0?at.slice(2):null, aid=at.indexOf('a:')===0?at.slice(2):null;
    return write(function(){ S.data.tasks.push({id:'T-'+(S.data.seq.task++),line:lid,acct:aid,owner:S.user,by:S.user,src:'Added by '+uname(S.user),title:S.sel.title.trim(),desc:(S.sel.desc||'').trim(),cls:'Manual',createdAt:S.now,dueAt:due,escAt:0,done:0,doneAt:0,doneBy:'',rule:''}); },'the new task') ? undefined : 'fail'; }};
HANDLERS.push(function(t){
  var x=t.closest('[data-taskdone]'); if(!x) return false;
  var task=by(S.data.tasks,x.dataset.taskdone); if(!task) return true;
  /* [stated 24 Sep · TBD-37] a manager closing someone else's escalated task has to say why —
     it disappears from the owner's list too, so the record must name who closed it and on what
     grounds. Closing your own task needs no reason. */
  if(task.owner!==S.user){ openFlow('closeTask',{task:task.id}); return true; }
  var ok=write(function(){ task.done=1; task.doneAt=S.now; task.doneBy=S.user; var l=lineById(task.line); if(l) fireRules(l); }, 'completing the task');
  if(ok){ toast('Task completed','Off your list. The line has not moved — completing a task never changes a stage.'); paint(); } else { x.checked=false; }
  return true;
});
var CLOSE_WHY=['Already done — the owner did it off-system','No longer relevant','Duplicate of another task','I am taking the line over','Wrong owner'];
FLOWS.closeTask={t:'Close an escalated task', sub:'It leaves the owner’s list as well as yours, so the record names you and why.',
  body:function(){ var tk=by(S.data.tasks,S.sel.task)||{}, l=tk.line?lineById(tk.line):null;
    return note('amber','','<b>“'+esc(tk.title||'')+'”</b> belongs to '+esc(uname(tk.owner))+(l?' on '+esc(l.id)+' · '+esc(l.product):'')+'. Closing it here closes it for them. The line does not move.','info')+
      field('Why you are closing it',input('x',S.sel.x,'Nikhil called them from his personal phone; the follow-up is done'),'',S.sel.x!==undefined&&!(S.sel.x||'').trim()?'Give a reason':''); },
  can:function(){ return !!(by(S.data.tasks,S.sel.task))&&!!(S.sel.x||'').trim(); }, ok:'Close the task',
  run:function(){ var tk=by(S.data.tasks,S.sel.task); if(!tk) return 'fail';
    var why=S.sel.x.trim();
    var ok=write(function(){ tk.done=1; tk.doneAt=S.now; tk.doneBy=S.user; tk.closeWhy=why;
      var l=lineById(tk.line);
      if(l){ logAdd(l,'Escalated task closed by '+uname(S.user),'“'+tk.title+'” · owner '+uname(tk.owner)+' · '+why+' · the line did not move','sys',1); fireRules(l); }
    },'closing the task'); if(!ok) return 'fail';
    toast('Task closed','Closed for '+uname(tk.owner)+' too. Reason on the record; the line has not moved.'); }};

/* ---------- tickets: placement, payment, post-purchase, endorsements and claims — one list ---------- */
function ticketRows(u){
  var rows=[], mineLines=function(l){ return l.owner===u.id; };
  /* [stated 23 Sep] the view switch scopes this list too */
  var scopeLines = hasViews(u)&&!teamView(u) ? mineLines
                 : (u.role==='mgr' ? function(l){ var o=userById(l.owner); return l.owner===u.id||(o&&o.mgr===u.id); }
                 : (u.role==='rmhead' ? function(l){ var o=userById(l.owner); return (o&&o.mgr===u.id)||l.owner===u.id; } : mineLines));
  var scopeAcct = function(a){ if(!a) return false;
    if(hasViews(u)&&!teamView(u)) return a.own===u.id||linesOfAcct(a.id).some(mineLines);
    if(u.role==='rm') return a.own===u.id;
    if(u.role==='rmhead') return a.own===u.id||rmTeam(u.id).some(function(x){return x.id===a.own;});
    if(u.role==='mgr') return linesOfAcct(a.id).some(scopeLines);
    return linesOfAcct(a.id).some(mineLines); };
  S.data.lines.forEach(function(l){ if(!scopeLines(l)) return; ticketsOf(l).forEach(function(t){ var closed=/^Closed|^Paid/.test(t.st)||t.st==='Withdrawn', ds=t.ty==='Post-purchase'?ISS_STAGE[l.iss.stage]:deskStage(t).st;
    rows.push({id:t.id, kind:t.ty==='Post-purchase'?'Issuance':t.ty, k:t.ty==='Placement'?'plc':(t.ty==='Payment'?'pay':'iss'), st:t.st, desk:ds, tone:t.tone, closed:closed, acct:acctName(l), sub:l.product+' · '+l.id, wait:closed?'—':actingParty(l), need:!!(t.act&&canAct(l)), pend:t.pend, raised:t.raised, by:t.ty==='Post-purchase'?'System':uname(t.ty==='Payment'?(l.soldBy||l.owner):l.owner), atStage:l.enteredAt||t.raised, go:'ticket'}); }); });
  S.data.svc.forEach(function(t){ var a=acctOf(t.acct); if(!scopeAcct(a)) return; var nd=svcNeed(t), ph=polById(t.pol); rows.push({id:t.id, kind:t.k==='clm'?'Claim':'Endorsement', k:t.k, st:t.stage, desk:t.stage, tone:svcClosed(t)?'green':(nd?'amber':'violet'), closed:svcClosed(t), acct:a?a.n:t.acct, sub:t.sub+' · '+(ph?(ph.p.pno||ph.p.bkno||t.pol):t.pol), wait:svcClosed(t)?'—':(nd?'Us':(t.wait==='Insurer'||t.wait==='Client'?t.wait:'Us')), need:nd&&svcCanAct(t), pend:nd?(t.query&&t.query.open?'A query from the desk is waiting for a reply.':'Documents the desk asked for are still outstanding.'):'', raised:t.raised, by:uname(a?a.own:''), atStage:t.stageAt||t.raised, go:'svctix'}); });
  /* [stated 26 Sep · 16.4] Needs you first, then whatever has sat longest at its stage */
  return rows.sort(function(x,y){ return (y.need-x.need)||(x.atStage-y.atStage); });
}
SCREENS.tickets=function(){
  var u=me(), all=ticketRows(u), k=S.ui.tkk||'all', f=S.ui.tkf||(all.some(function(r){return r.need;})?'need':'open'), team=(hasViews(u)&&teamView(u))||u.role==='mgr';
  var byK=function(kk){ return all.filter(function(r){return kk==='all'||r.k===kk;}); };
  var rows=byK(k).filter(function(r){ return f==='need'?r.need:(f==='open'?!r.closed:(f==='closed'?r.closed:true)); });
  var need=all.filter(function(r){return r.need;}).length, open=all.filter(function(r){return !r.closed;}).length, closed=all.length-open;
  var canRaise=raiseLines(u).length>0;
  var html='<div class="hdrow"><div><div class="h1">Tickets</div><div class="sub">Placement, payment, issuance, endorsements and claims.</div></div><span class="sp"></span><div class="acts">'+(canRaise?'<button class="btn primary" data-flow="pickTicket">'+ic('plus')+'Raise ticket</button>':'')+'</div></div>'+diamonds()+
    '<div class="flex wrap" style="gap:10px">'+pills('tkf',f,[['need','Needs you',need],['open','Open',open],['closed','Closed',closed],['all','All',all.length]])+'<span class="sp"></span>'+pills('tkk',k,[['all','All types',all.length],['plc','Placement',byK('plc').length],['pay','Payment',byK('pay').length],['iss','Issuance',byK('iss').length],['end','Endorsement',byK('end').length],['clm','Claim',byK('clm').length]])+'</div>'+
    '<div class="card mt16" style="overflow:hidden">'+(rows.length?'<div class="tw"><table class="t"><thead><tr><th>Ticket</th><th>Status · desk stage</th><th>Account</th><th>Waiting on</th>'+(team?'<th>Raised by</th>':'')+'<th>Raised</th></tr></thead><tbody>'+
      rows.map(function(r){ return '<tr class="row'+(r.closed?' dim':'')+'" data-go="'+r.go+'" data-id="'+r.id+'"><td class="id" style="white-space:nowrap">'+esc(r.id)+'<div class="sub">'+esc(r.kind)+'</div></td><td style="max-width:340px">'+chip(r.st,r.tone,true,true)+''+(r.pend&&!r.closed?'<div class="sub amber" title="'+esc(r.pend)+'">'+esc(r.pend)+'</div>':'<div class="sub">'+[r.desk&&r.desk!==r.st?esc(r.desk):'',r.closed?'':esc(plural(daysBetween(r.atStage,S.now),'day'))].filter(Boolean).join(' · ')+'</div>')+'</td><td class="nm">'+esc(shortName(r.acct))+'<div class="sub">'+esc(r.sub)+'</div></td><td>'+(r.wait==='—'?'—':chip(r.wait,waitTone(r.wait),false,true))+'</td>'+(team?'<td>'+esc(r.by||'')+'</td>':'')+'<td style="white-space:nowrap">'+esc(fmtD(r.raised))+'</td></tr>'; }).join('')+'</tbody></table></div>'
      : (all.length&&(k!=='all'||f!=='all')?empty('ticket','Nothing matches these filters','Try another status or type.','<button class="btn" data-uiset="tkf" data-uv="all">Clear filters</button>'):empty('ticket','Nothing here yet', 'A placement ticket opens when you float an RFQ, a payment ticket when you raise the request, an issuance ticket at Payment Completed. Endorsements and claims are raised by the account’s RM.')))+'</div>';
  return {sc:'Tickets', html:html, cta:''};
};
FLOWS.raiseReq={t:'Raise a request', sub:'Placement and payment requests are raised from the product line they belong to; endorsements and claims by the account’s RM.', nofoot:function(){return true;},
  body:function(){ var u=me(), mine=S.data.lines.filter(function(l){return l.owner===u.id&&openLine(l);}), plc=mine.filter(function(l){return l.rate===0&&(l.stage===5||(l.stage===3&&l.rfq&&l.rfq.f&&!rfqCount(l).missing));}), pay=mine.filter(function(l){return l.stage===9&&l.pay==='pre';});
    var row=function(title,sub,btn){ return '<div class="row" style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)"><div style="flex:1"><b>'+title+'</b><div class="meta">'+sub+'</div></div>'+btn+'</div>'; };
    return row('Float an RFQ to placement','From a non-DUA line whose RFQ the client verified, or that you filled completely yourself. '+(plc.length?plural(plc.length,'line')+' ready now.':'None ready right now.'),plc.length?'<button class="btn sm primary" data-flow="float" data-line="'+plc[0].id+'">'+esc(acctName(plc[0]))+' · '+esc(plc[0].product)+'</button>':'<button class="btn sm ghost" data-go="pipeline">Pipeline</button>')+
      row('Raise a payment request','From a line at Purchase Requested, once the client has confirmed. '+(pay.length?plural(pay.length,'line')+' ready now.':'None ready right now.'),pay.length?'<button class="btn sm primary" data-flow="pay" data-line="'+pay[0].id+'">'+esc(acctName(pay[0]))+' · '+esc(pay[0].product)+'</button>':'<button class="btn sm ghost" data-go="pipeline">Pipeline</button>')+
      row('Endorsement or claim','Raised by the relationship manager who owns the account, from the account’s Policies tab.','<button class="btn sm ghost" data-go="accounts">Accounts</button>'); }};

/* [stated 27 Sep] a Raise ticket button on the line's Tickets tab. Every ticket a line can have is
   listed; the ones not open to it yet say why, so the owner never has to guess where to go. */
function lineTicketOpts(l){
  var a=acctOf(l), p=polOfLine(l), out=[], rc=l.rfq&&l.rfq.f?rfqCount(l):null;
  var plcWhy= l.rate===1?'A DUA line is priced by the rater — it has no placement ticket.'
    :(l.rate==null?'The route is decided when the requirement is captured.'
    :(l.rfq&&l.rfq.st==='floated'?'Already floated — PLC-'+l.id.slice(3)+' is open.'
    :(l.stage===4?'The RFQ is with the client for review. Float it once they approve.'
    :(l.stage===3&&rc&&rc.missing?plural(rc.missing,'required RFQ field')+' still empty.'
    :(l.stage===5||l.stage===3?'':'Placement is raised from Details Captured or RFQ Verified.')))));
  out.push({k:'plc',t:'Placement ticket',s:'Float the RFQ to BimaPlacement for quotes',why:plcWhy,btn:'<button class="btn sm primary" data-flow="float" data-line="'+l.id+'">Float to placement</button>'});
  var payWhy= l.stage<9?'Opens at Purchase Requested, once the client confirms an insurer.':(l.pay!=='pre'||l.stage>9?'Already raised — '+payRef(l)+'.':'');
  out.push({k:'pay',t:'Payment ticket',s:'Ask Ops for the payment details for the chosen insurer',why:payWhy,btn:'<button class="btn sm primary" data-flow="pay" data-line="'+l.id+'">Raise payment request</button>'});
  var own=a&&a.own===S.user, issued=p&&!p.issuing;
  var svcWhy= !issued?'Opens once the policy is issued.':(!own?'Raised by '+uname(a.own)+', who owns the account.':'');
  out.push({k:'svc',t:'Endorsement or claim',s:'A service request on the policy this line produced',why:svcWhy,
    btn:issued?(polActive(p)?'<button class="btn sm" data-go="svcnew" data-pol="'+p.id+'" data-acct="'+a.id+'" data-kind="end">Endorse</button> ':'')+'<button class="btn sm" data-go="svcnew" data-pol="'+p.id+'" data-acct="'+a.id+'" data-kind="clm">Claim</button>':''});
  return out;
}
FLOWS.lineTicket={t:'Raise a ticket', sub:function(){ var l=FL(); return esc(acctName(l))+' · '+esc(l.product)+' — the tickets this line can raise, and when.'; }, nofoot:function(){return true;},
  body:function(){ var l=FL();
    return '<div class="rowlist" style="border:1px solid var(--border);border-radius:12px">'+lineTicketOpts(l).map(function(o){
      return '<div'+(o.why?' class="dim"':'')+'><div class="bd"><b>'+esc(o.t)+'</b> '+(o.why?chip('Not yet','neutral',false,true):chip('Ready','green',false,true))+'<div class="m">'+esc(o.s)+'</div>'+(o.why?'<div class="m">'+ic('info','ic14')+' '+esc(o.why)+'</div>':'')+'</div><div class="rt">'+(o.why?'':o.btn)+'</div></div>'; }).join('')+'</div>'+
      '<div class="meta mt12">The post-purchase ticket opens by itself at Payment Completed.</div>'; }};

/* [stated 27 Sep] Raise ticket on the Tickets list: pick the product line, then the same list the
   line's own Tickets tab shows — each ticket Ready, or Not yet with the reason. */
function raiseLines(u){ u=u||me(); return S.data.lines.filter(function(l){ return l.owner===u.id&&!dead(l); }); }
function lineReadyN(l){ return lineTicketOpts(l).filter(function(o){return !o.why;}).length; }
FLOWS.pickTicket={t:'Raise a ticket', sub:'Pick the product line it is for.', nofoot:function(){return true;},
  repaintOn:['pl'],
  body:function(){ var ls=raiseLines().slice().sort(function(a,b){ return (lineReadyN(b)>0)-(lineReadyN(a)>0) || acctName(a).localeCompare(acctName(b)); });
    if(!ls.length) return empty('ticket','No product lines of yours','Tickets are raised from a line you own.');
    if(!S.sel.pl) S.sel.pl=ls[0].id;
    var l=lineById(S.sel.pl)||ls[0];
    var opts=ls.map(function(x){ var n=lineReadyN(x); return [x.id, shortName(acctName(x))+' · '+x.product+' · '+stageName(x.stage)+(n?' · '+n+' ready':'')]; });
    return field('Product line',select('pl',l.id,opts),'Lines with a ticket ready to raise are listed first.')+
      '<div class="rowlist mt12" style="border:1px solid var(--border);border-radius:12px">'+lineTicketOpts(l).map(function(o){
        return '<div'+(o.why?' class="dim"':'')+'><div class="bd"><b>'+esc(o.t)+'</b> '+(o.why?chip('Not yet','neutral',false,true):chip('Ready','green',false,true))+'<div class="m">'+esc(o.s)+'</div>'+(o.why?'<div class="m">'+ic('info','ic14')+' '+esc(o.why)+'</div>':'')+'</div><div class="rt">'+(o.why?'':o.btn)+'</div></div>'; }).join('')+'</div>'+
      '<div class="meta mt12">The issuance ticket opens by itself at Payment Completed. <button class="link" data-go="line" data-id="'+l.id+'">Open the line</button></div>'; }};

/* ---------- search ---------- */
SCREENS.search=function(){
  var q=S.route.q||S.ui.gq||'', r=search(q), n=r.accounts.length+r.lines.length+r.opps.length+(r.policies||[]).length+r.tickets.length+r.tasks.length;
  var g=function(title,items,fn){ if(!items.length) return ''; return '<div class="grp"><div class="h4 mb12">'+esc(title)+' <span class="meta">'+items.length+'</span></div><div class="card"><div class="rowlist">'+items.map(fn).join('')+'</div></div></div>'; };
  var html='<div class="h1">Search</div><div class="sub">Results for “'+esc(q)+'” across accounts, lines, opportunities, policies, tickets and tasks. Only what you can open. Accounts match on name, trade name, PAN, GSTIN and a contact’s name, phone or email; a policy on either of its numbers.</div>'+diamonds()+
    (n?'<div class="searchres">'+
      g('Accounts',r.accounts,function(a){ return '<div class="row" data-go="acct" data-id="'+a.id+'"><div class="bd"><b>'+esc(a.n)+'</b><div class="m2">'+esc(a.id)+' · '+esc(a.city||'—')+' · owner '+esc(uname(a.own))+(a.prov?' · provisional':'')+(r.why[a.id]?' · <span class="violet">'+esc(r.why[a.id])+'</span>':'')+'</div></div><div class="rt">'+ic('chevright')+'</div></div>'; })+
      g('Product lines',r.lines,function(l){ return lineRow(l,esc(oppName(l))+' · owner '+esc(uname(l.owner))); })+
      g('Opportunities',r.opps,function(o){ return '<div class="row" data-go="opp" data-id="'+o.id+'"><div class="bd"><b>'+esc(oName(o))+'</b><div class="m2">'+esc(o.id)+' · '+plural(linesOfOpp(o.id).length,'line')+'</div></div><div class="rt">'+ic('chevright')+'</div></div>'; })+
      /* [stated 24 Sep · TBD-36] Policy 360 straight from search, on either number */
      g('Policies',r.policies||[],function(h){ return '<div class="row" data-go="policy" data-id="'+h.p.id+'"><div class="bd"><b>'+esc(h.p.pno||h.p.bkno||'awaited')+'</b> '+chip(polLive(h.p).tx,polLive(h.p).tone,true,true)+'<div class="m2">'+esc(h.p.p)+' · '+esc(h.p.ins)+' · '+esc(h.a.n)+(h.p.bkno?' · BK '+esc(h.p.bkno):'')+'</div></div><div class="rt">'+ic('chevright')+'</div></div>'; })+
      g('Tickets',r.tickets,function(t){ var svc=!!t.k; return '<div class="row" data-go="'+(svc?'svctix':'ticket')+'" data-id="'+t.id+'"><div class="bd"><b>'+esc(t.id)+'</b><div class="m2">'+esc(svc?t.sub:t.ty+' · '+t.st)+'</div></div><div class="rt">'+ic('chevright')+'</div></div>'; })+
      g('Tasks',r.tasks,function(t){ return taskRow(t,{who:1}); })+'</div>'
    : empty('search','Nothing matches “'+q+'”','Try the company name, a PAN or GSTIN, a contact’s phone, or an ID like OP-2203 or PLC-2203.'));
  return {sc:'Search', html:html};
};

/* ---------- not found ---------- */
SCREENS.notfound=function(){
  return {sc:'Not found', html:empty('alert','That record isn’t here','It may have been deleted, merged into another account, or the link is wrong. '+(S.route.id?'Nothing has the ID <b>'+esc(S.route.id)+'</b>.':''),'<button class="btn" data-back="1">'+ic('arrowleft')+'Go back</button> <button class="btn ghost" data-nav="'+(isRole('mgr')?'team':(isRole('rm')?'rmhome':(isRole('rmhead')?'rmteam':'home')))+'">Home</button>')};
};
