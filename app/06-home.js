/* ==================================================================== *
 *  Home (sales executive), RM home, Pipeline, Tasks, Tickets, Search, Not found
 * ==================================================================== */
function lineTx(l){ return '<b>'+esc(acctName(l))+'</b> · '+esc(l.product)+' '+chip(stageName(l.stage),'neutral',false,true); }
function lineRow(l,line2,act){
  return '<div class="row" data-go="line" data-id="'+l.id+'"><div class="bd">'+lineTx(l)+(line2?'<div class="m2">'+line2+'</div>':'')+'</div>'+
    '<div class="rt">'+(act?'<button class="btn sm" data-go="line" data-id="'+l.id+'">'+esc(act)+'</button>':'')+'</div></div>';
}
function taskRow(t,opts){
  opts=opts||{}; var st=taskState(t), l=t.line?lineById(t.line):null, a=t.acct?acctOf(t.acct):null;
  var target = l ? lineTx(l) : (a ? '<b>'+esc(a.n)+'</b> · account' : '<b>—</b>');
  var mine=t.owner===S.user, mgr=isMgrRole() && (userById(t.owner)||{}).mgr===S.user;
  return '<div class="row" data-go="'+(l?'line':'acct')+'" data-id="'+(l?l.id:(a?a.id:''))+'">'+
    ((mine||(mgr&&st==='esc'))&&!t.done?'<input type="checkbox" class="chk" data-taskdone="'+t.id+'" aria-label="Done">':'')+
    '<div class="bd"><b>'+esc(t.title)+'</b>'+(opts.who?' <span class="meta">· '+esc(uname(t.owner))+'</span>':'')+'<div class="m">'+target+'</div>'+
    '<div class="m2">'+chip(taskStateTx(t),taskTone(st),true,true)+' '+chip(t.cls,'neutral',false,true)+(st==='esc'||st==='over'?' · was due '+esc(fmt(t.dueAt)):'')+(t.rule?' · rule '+esc(t.rule):'')+'</div></div>'+
    '<div class="rt"><button class="btn sm" data-go="'+(l?'line':'acct')+'" data-id="'+(l?l.id:(a?a.id:''))+'">Open</button></div></div>';
}
function tile(tone,n,label,gloss,go,anchor){ return '<button class="tile '+tone+'" data-go="'+go+'"'+(anchor?' data-anchor="'+anchor+'"':'')+'><div class="n"><b>'+n+'</b>'+esc(label)+'</div><div class="r"><span class="meta">'+esc(gloss)+'</span><span class="go">'+ic('arrowright')+'</span></div></button>'; }

/* ---------- home v3 building blocks, shared by the sales and RM homes ---------- */
function greetTx(){ var h=new Date(S.now).getHours(); return h<12?'Good morning':(h<17?'Good afternoon':'Good evening'); }
function hSeg(key,cur,opts){ return '<div class="hseg">'+opts.map(function(o){ return '<button class="'+(cur===o[0]?'on':'')+(o[3]?' '+o[3]:'')+'" data-uiset="'+key+'" data-uv="'+esc(o[0])+'">'+esc(o[1])+'<span class="n">'+o[2]+'</span></button>'; }).join('')+'</div>'; }
function hCard(id,tone,icon,title,rows,right,none){
  return '<section class="hcard" id="h-'+id+'"><div class="hhd"><span class="hic '+tone+'">'+ic(icon)+'</span><span class="t">'+esc(title)+'</span><span class="sp"></span>'+(right||'')+'</div>'+
    (rows.length?rows.join(''):'<div class="hempty">'+esc(none||'Nothing here.')+'</div>')+'</section>'; }
function hLineRow(l,meta){ return '<div class="hrow row" data-go="line" data-id="'+l.id+'"><div class="bd"><div class="tt">'+esc(shortName(acctName(l)))+' <span class="pr">· '+esc(l.product)+'</span></div><div class="mt">'+meta+'</div></div><div class="rt">'+ic('chevright')+'</div></div>'; }
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
function hTaskCard(tk){ if(!tk.over.length&&!tk.today.length) return '';
  return hCard('tasks',tk.tab==='over'?'red':'amber','checks','Tasks',(tk.tab==='over'?tk.over:tk.today).map(hTaskRow),
    hSeg('htab',tk.tab,[['today','Due today',tk.today.length],['over','Overdue',tk.over.length,'red']]),
    tk.tab==='over'?'Nothing overdue.':'Nothing due today.'); }
/* newly assigned — not contacted yet, filtered by when it landed */
var HBANDS=[['d0','Today',0],['d3','Last 3 days',2],['d7','This week',6],['d30','This month',29]];
function hFreshCard(items){ /* items: [{l:line, at:timestamp, meta:html}] */
  if(!items.length) return '';
  var age=function(x){ return daysBetween(x.at,S.now); };
  var inBand=function(k){ var lim=0; HBANDS.forEach(function(y){ if(y[0]===k) lim=y[2]; }); return items.filter(function(x){ return age(x)<=lim; }); };
  var band=S.ui.nab||''; if(!band||!inBand(band).length){ band=''; HBANDS.forEach(function(y){ if(!band && inBand(y[0]).length) band=y[0]; }); if(!band) band='d0'; }
  return hCard('fresh','violet','sparkles','Newly assigned', inBand(band).map(function(x){ return hLineRow(x.l,x.meta); }),
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
    (b.move.length?hCard('move','amber','zap','Action required', b.move.map(function(l){ return hLineRow(l,'<span>'+esc(nextAction(l).txt)+'</span>'); }), chip(b.move.length,'amber',false,true)):'')+
    (b.quiet.length?hCard('quiet','blue','clock','No activity in '+QUIET_DAYS+' days', b.quiet.map(function(l){ return hLineRow(l,'<span class="red">'+daysQuiet(l)+' days</span><span>since the last activity · waiting on '+esc(actingParty(l))+'</span>'); }), chip(b.quiet.length,'blue',false,true)):'')+
    '</div>'+
    '<div class="mt16">'+simblock('Simulate an inbound enquiry','Stands in for the website form. The assignment rule routes it by product category to the least-loaded executive in that category — it may not land on you.',
      simbtn('Fire enquiry · with PAN','data-inbound="fire"')+simbtn('Marine enquiry · no PAN','data-inbound="marine"')+simbtn('Group Health enquiry','data-inbound="gh"'))+'</div>';
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
  var u=me(), f=S.ui.pf||'open', q=(S.ui.pq||'').toLowerCase(), prod=S.ui.pprod||'', st=S.ui.pstage||'';
  /* [stated 23 Sep] scoped by the view switch — own lines, or the team's */
  var lines=S.data.lines.filter(function(l){return inScope(l.owner,u);}), tv=teamView(u);
  var counts={open:lines.filter(openLine).length, post:lines.filter(postLine).length, issued:lines.filter(issuedLine).length, park:lines.filter(function(l){return l.status==='park';}).length, closed:lines.filter(dead).length, all:lines.length};
  var rows=lines.filter(function(l){
    if(f==='open'&&!openLine(l)) return false; if(f==='post'&&!postLine(l)) return false; if(f==='issued'&&!issuedLine(l)) return false; if(f==='park'&&l.status!=='park') return false; if(f==='closed'&&!dead(l)) return false;
    if(prod&&l.product!==prod) return false; if(st&&String(l.stage)!==st) return false;
    if(q&&(acctName(l)+' '+l.product+' '+l.id+' '+oppName(l)).toLowerCase().indexOf(q)<0) return false; return true;
  }).sort(function(x,y){ return (y.stage-x.stage)||(daysInStage(y)-daysInStage(x)); });
  var prods=[]; lines.forEach(function(l){ if(prods.indexOf(l.product)<0) prods.push(l.product); });
  var html='<div class="hdrow"><div><div class="h1">Pipeline</div><div class="sub">'+(tv?'Every product line your team owns, one row each.':'Every product line you own, one row each.')+' The stage names who must act next; open a row to work it.'+(u.role==='rm'?' Selling and post-purchase sit side by side — the stage tells them apart.':'')+'</div></div></div>'+diamonds()+
    pills('pf',f,[['open','Selling',counts.open],['post','Post-purchase',counts.post],['issued','Issued',counts.issued],['park','Parked',counts.park],['closed','Closed',counts.closed],['all','All',counts.all]])+
    '<div class="flex wrap mt12" style="gap:10px"><input class="inp" id="pq" data-ui="pq" style="max-width:280px" placeholder="Account, product, line or opportunity" value="'+esc(S.ui.pq||'')+'">'+
      '<select class="sel" data-uisel="pprod" style="max-width:220px"><option value="">All products</option>'+prods.map(function(p){return '<option'+(prod===p?' selected':'')+'>'+esc(p)+'</option>';}).join('')+'</select>'+
      '<select class="sel" data-uisel="pstage" style="max-width:240px"><option value="">All stages</option>'+STAGES.map(function(s){return '<option value="'+s.n+'"'+(st===String(s.n)?' selected':'')+'>'+esc(s.s)+'</option>';}).join('')+'</select>'+
      (q||prod||st?'<button class="btn ghost sm" data-clearpf="1">Clear filters</button>':'')+'</div>'+
    '<div class="card mt16" style="overflow:hidden">'+(rows.length?'<div class="tw"><table class="t"><thead><tr><th>Line</th><th><span class="f">'+ic('chevdown')+'Stage</span></th><th>Waiting on</th><th>Account</th>'+(tv?'<th>Owner</th>':'')+'<th>Opportunity</th><th class="num">Premium</th><th>In stage</th></tr></thead><tbody>'+
      rows.map(function(l){ var w=actingParty(l); return '<tr class="row'+(dead(l)?' dim':'')+'" data-go="line" data-id="'+l.id+'"><td class="id">'+esc(l.id)+'<div class="sub" style="color:var(--ink);font-weight:500">'+esc(l.product)+'</div></td>'+
        '<td>'+chip(stageName(l.stage),l.stage===14?'green':(l.stage>=SALES_STAGES?'violet':(dead(l)?'red':(l.status==='park'?'amber':'neutral'))),true,true)+(l.status!=='open'?'<div class="sub">'+esc(statusTx(l))+'</div>':'')+'</td>'+
        '<td>'+chip(w,waitTone(w),false,true)+'</td><td class="nm">'+esc(acctName(l))+'</td>'+(tv?'<td>'+esc(uname(l.owner))+'</td>':'')+'<td>'+esc(oppName(l))+'</td><td class="num">'+(confirmed(l)?'<b class="b">'+INR(premOf(l))+'</b>':'<span class="meta">'+INR(premOf(l))+' est.</span>')+'</td>'+
        '<td>'+(l.stage===14?'—':plural(daysInStage(l),'day'))+'</td></tr>'; }).join('')+'</tbody></table></div>'
      : empty('filter', q||prod||st?'No line matches those filters':'No '+(f==='open'?'selling':(f==='post'?'post-purchase':f))+' lines', q||prod||st?'Clear a filter, or search for the account by name from the sidebar.':'Lines arrive from inbound enquiries, from <b>New opportunity</b>, or by reassignment.', q||prod||st?'<button class="btn" data-clearpf="1">Clear filters</button>':''))+'</div>';
  return {sc:'Pipeline', html:html};
};
HANDLERS.push(function(t){ if(t.closest('[data-clearpf]')){ S.ui.pq='';S.ui.pprod='';S.ui.pstage=''; paint(); return true; } return false; });

/* ---------- tasks ---------- */
SCREENS.tasks=function(){
  var u=me(), all=S.data.tasks.filter(function(t){return t.owner===u.id;}), f=S.ui.tf||'open', cls=S.ui.tcls||'';
  var open=all.filter(function(t){return !t.done;}), done=all.filter(function(t){return t.done;});
  var grp={esc:[],over:[],today:[],week:[],later:[]};
  open.forEach(function(t){ if(cls&&t.cls!==cls) return; var st=taskState(t); if(st==='esc'||st==='over'||st==='today'){ grp[st].push(t); return; } var d=daysBetween(S.now,t.dueAt); if(d<=7) grp.week.push(t); else grp.later.push(t); });
  var g=function(k,title,tone){ if(!grp[k].length) return ''; return '<section class="card"><div class="cardh"><span class="t">'+esc(title)+'</span>'+chip(grp[k].length,tone,false,true)+'</div><div class="rowlist">'+grp[k].sort(function(x,y){return x.dueAt-y.dueAt;}).map(function(t){return taskRow(t);}).join('')+'</div></section>'; };
  var html='<div class="hdrow"><div><div class="h1">Tasks</div><div class="sub">Only yours — a task cannot be held by anyone else. Grouped by when, not by kind: what is late comes before what kind of task it is.</div></div></div>'+diamonds()+
    '<div class="flex wrap" style="gap:10px">'+pills('tf',f,[['open','Open',open.length],['done','Done',done.length]])+'<span class="sp"></span><select class="sel" data-uisel="tcls" style="max-width:180px"><option value="">All classes</option><option'+(cls==='SLA'?' selected':'')+'>SLA</option><option'+(cls==='Follow-up'?' selected':'')+'>Follow-up</option><option'+(cls==='Manual'?' selected':'')+'>Manual</option></select></div>'+
    '<div class="gap12 mt16">'+(f==='done'
      ? (done.length?'<section class="card"><div class="rowlist">'+done.sort(function(x,y){return y.doneAt-x.doneAt;}).map(function(t){return taskRow(t);}).join('')+'</div></section>':empty('circlecheck','Nothing completed yet','Completed tasks stay here for the record; the line they were about is unchanged by them.'))
      : (open.length? g('esc','Escalated','red')+g('over','Overdue','red')+g('today','Due today','amber')+g('week','This week','violet')+g('later','Later','neutral')
        : empty('checks','No open tasks','A task arrives three ways: a rule fires when a line enters a stage, a disposition creates a follow-up, or you add one yourself.','<button class="btn" data-flow="addTask">'+ic('plus')+'Add task</button>')))+'</div>'+
    '<div class="mt16">'+note('violet','Escalation','SLA tasks escalate to your manager after their second clock. Follow-up and Manual tasks stop at Overdue — you chose their dates, so nobody is escalated for missing them.','info')+'</div>';
  return {sc:'Tasks', html:html, cta:'<button class="btn primary sm" data-flow="addTask">'+ic('plus')+'Add task</button>'};
};
FLOWS.addTask={t:'Add a task', sub:'For yourself, on a product line or an account. Class is always Manual — a user cannot create an SLA task.',
  body:function(){
    var u=me(), mine=S.data.lines.filter(function(l){return l.owner===u.id && openLine(l);});
    var preset=S.sel.line||''; var opts=[['','Choose a line']].concat(mine.map(function(l){return [l.id,acctName(l)+' · '+l.product];}));
    var dueMin=ymd(S.now);
    return field('Task', input('title',S.sel.title,'What needs doing'))+
      field('Attach to', select('lineId',S.sel.lineId||preset,opts))+
      field('Due', '<input class="inp" id="f_due" data-f="due" type="date" min="'+dueMin+'" value="'+esc(S.sel.due||'')+'">','The calendar starts at today and will not go earlier.', S.sel.due&&S.sel.due<dueMin?'A due date cannot be in the past.':'')+
      note('neutral','','Class <b>Manual</b>. It goes Pending → Overdue and never escalates.');
  },
  can:function(){ return !!(S.sel.title||'').trim() && !!(S.sel.lineId||S.sel.line) && !!S.sel.due && S.sel.due>=ymd(S.now); }, ok:'Add task',
  run:function(){ var due=new Date(S.sel.due+'T18:00:00').getTime(); var lid=S.sel.lineId||S.sel.line;
    return write(function(){ S.data.tasks.push({id:'T-'+(S.data.seq.task++),line:lid,acct:null,owner:S.user,title:S.sel.title.trim(),cls:'Manual',createdAt:S.now,dueAt:due,escAt:0,done:0,doneAt:0,doneBy:'',rule:''}); },'the new task') ? undefined : 'fail'; }};
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
      field('Why you are closing it',select('why',S.sel.why||CLOSE_WHY[0],CLOSE_WHY))+
      field('Note — optional',input('x',S.sel.x,'Anything the owner should know')); },
  can:function(){ return !!(by(S.data.tasks,S.sel.task)); }, ok:'Close the task',
  run:function(){ var tk=by(S.data.tasks,S.sel.task); if(!tk) return 'fail';
    var why=(S.sel.why||CLOSE_WHY[0])+((S.sel.x||'').trim()?' · '+S.sel.x.trim():'');
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
  S.data.lines.forEach(function(l){ if(!scopeLines(l)) return; ticketsOf(l).forEach(function(t){ rows.push({id:t.id, kind:t.ty, k:t.ty==='Placement'?'plc':(t.ty==='Payment'?'pay':'iss'), st:t.st, tone:t.tone, closed:t.st==='Closed'||t.st==='Withdrawn', acct:acctName(l), sub:l.product+' · '+l.id, wait:t.ty==='Post-purchase'?issWaiting(l):(t.pend?'You':'Desk'), need:!!(t.act&&canAct(l)), pend:t.pend, raised:t.raised, go:'ticket'}); }); });
  S.data.svc.forEach(function(t){ var a=acctOf(t.acct); if(!scopeAcct(a)) return; var nd=svcNeed(t); rows.push({id:t.id, kind:t.k==='clm'?'Claim':'Endorsement', k:t.k, st:t.stage, tone:svcClosed(t)?'green':(nd?'amber':'violet'), closed:svcClosed(t), acct:a?a.n:t.acct, sub:t.sub+' · '+t.pol, wait:nd?(svcCanAct(t)?'You':uname(a.own)):t.wait, need:nd&&svcCanAct(t), pend:nd?(t.query&&t.query.open?'A query from the desk is waiting for a reply.':'Documents the desk asked for are still outstanding.'):'', raised:t.raised, go:'svctix'}); });
  return rows.sort(function(x,y){ return (y.need-x.need)||(y.raised-x.raised); });
}
SCREENS.tickets=function(){
  var u=me(), all=ticketRows(u), k=S.ui.tkk||'all', f=S.ui.tkf||'open';
  var byK=function(kk){ return all.filter(function(r){return kk==='all'||r.k===kk;}); };
  var rows=byK(k).filter(function(r){ return f==='need'?r.need:(f==='open'?!r.closed:(f==='closed'?r.closed:true)); });
  var need=all.filter(function(r){return r.need;}).length, open=all.filter(function(r){return !r.closed;}).length, closed=all.length-open;
  var canRaise=u.role==='rm';
  var html='<div class="hdrow"><div><div class="h1">Tickets</div><div class="sub">Everything a desk is working for you, in one list: placement and payment on your lines, the post-purchase ticket after payment, endorsements and claims on '+(u.role==='rm'?'your accounts':(u.role==='rmhead'?'your team’s accounts':'the accounts you are on'))+'. A ticket is a queue, not a stage.</div></div></div>'+diamonds()+
    '<div class="flex wrap" style="gap:10px">'+pills('tkf',f,[['need','Needs you',need],['open','Open',open],['closed','Closed',closed],['all','All',all.length]])+'<span class="sp"></span>'+pills('tkk',k,[['all','All types'],['plc','Placement',byK('plc').length],['pay','Payment',byK('pay').length],['iss','Post-purchase',byK('iss').length],['end','Endorsement',byK('end').length],['clm','Claim',byK('clm').length]])+'</div>'+
    '<div class="card mt16" style="overflow:hidden">'+(rows.length?'<div class="tw"><table class="t"><thead><tr><th>Ticket</th><th>Type</th><th>Status</th><th>Account</th><th>On</th><th>Waiting on</th><th>Raised</th></tr></thead><tbody>'+
      rows.map(function(r){ return '<tr class="row'+(r.closed?' dim':'')+'" data-go="'+r.go+'" data-id="'+r.id+'"><td class="id" style="white-space:nowrap">'+esc(r.id)+'</td><td>'+chip(r.kind,'neutral',false,true)+'</td><td style="max-width:280px">'+chip(r.st,r.tone,true,true)+(r.pend&&!r.closed?'<div class="sub" style="color:var(--amber);white-space:normal">'+esc(r.pend)+'</div>':'')+'</td><td class="nm" style="white-space:nowrap">'+esc(shortName(r.acct))+'</td><td><span class="meta">'+esc(r.sub)+'</span></td><td>'+(r.need?'<span class="amber b">You</span>':esc(r.wait))+'</td><td>'+esc(fmtD(r.raised))+'</td></tr>'; }).join('')+'</tbody></table></div>'
      : empty('ticket', f==='need'?'Nothing waiting on you':'No '+(f==='closed'?'closed':'open')+' tickets'+(k!=='all'?' of this type':''), f==='need'?'Every query is answered and every document the desk asked for is in.':'A placement ticket opens when you float an RFQ, a payment ticket when you raise the request, a post-purchase ticket at Payment Completed. Endorsements and claims are raised by the account’s RM.', canRaise&&f!=='need'?'<button class="btn" data-go="svcnew">'+ic('plus')+'Raise request</button>':''))+'</div>';
  return {sc:'Tickets', html:html, cta: canRaise?'<button class="btn primary sm" data-go="svcnew">'+ic('plus')+'Raise request</button>':'<button class="btn primary sm" data-flow="raiseReq">'+ic('plus')+'Raise request</button>'};
};
FLOWS.raiseReq={t:'Raise a request', sub:'Placement and payment requests are raised from the product line they belong to; endorsements and claims by the account’s RM.', nofoot:function(){return true;},
  body:function(){ var u=me(), mine=S.data.lines.filter(function(l){return l.owner===u.id&&openLine(l);}), plc=mine.filter(function(l){return l.rate===0&&(l.stage===5||(l.stage===3&&l.rfq&&l.rfq.f&&!rfqCount(l).missing));}), pay=mine.filter(function(l){return l.stage===9&&l.pay==='pre';});
    var row=function(title,sub,btn){ return '<div class="row" style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)"><div style="flex:1"><b>'+title+'</b><div class="meta">'+sub+'</div></div>'+btn+'</div>'; };
    return row('Float an RFQ to placement','From a non-DAU line whose RFQ the client verified, or that you filled completely yourself. '+(plc.length?plural(plc.length,'line')+' ready now.':'None ready right now.'),plc.length?'<button class="btn sm primary" data-flow="float" data-line="'+plc[0].id+'">'+esc(acctName(plc[0]))+' · '+esc(plc[0].product)+'</button>':'<button class="btn sm ghost" data-go="pipeline">Pipeline</button>')+
      row('Raise a payment request','From a line at Purchase Requested, once the client has confirmed. '+(pay.length?plural(pay.length,'line')+' ready now.':'None ready right now.'),pay.length?'<button class="btn sm primary" data-flow="pay" data-line="'+pay[0].id+'">'+esc(acctName(pay[0]))+' · '+esc(pay[0].product)+'</button>':'<button class="btn sm ghost" data-go="pipeline">Pipeline</button>')+
      row('Endorsement or claim','Raised by the relationship manager who owns the account, from the account’s Policies tab.','<button class="btn sm ghost" data-go="accounts">Accounts</button>'); }};

/* ---------- search ---------- */
SCREENS.search=function(){
  var q=S.route.q||S.ui.gq||'', r=search(q), n=r.accounts.length+r.lines.length+r.opps.length+(r.policies||[]).length+r.tickets.length+r.tasks.length;
  var g=function(title,items,fn){ if(!items.length) return ''; return '<div class="grp"><div class="h4 mb12">'+esc(title)+' <span class="meta">'+items.length+'</span></div><div class="card"><div class="rowlist">'+items.map(fn).join('')+'</div></div></div>'; };
  var html='<div class="h1">Search</div><div class="sub">Results for “'+esc(q)+'” across accounts, lines, opportunities, policies, tickets and tasks. Accounts match on name, PAN, GSTIN, contact name and phone; a policy on either of its numbers.</div>'+diamonds()+
    (n?'<div class="searchres">'+
      g('Accounts',r.accounts,function(a){ return '<div class="row" data-go="acct" data-id="'+a.id+'"><div class="bd"><b>'+esc(a.n)+'</b><div class="m2">'+esc(a.id)+' · '+esc(a.city||'—')+' · owner '+esc(uname(a.own))+(a.prov?' · provisional':'')+'</div></div><div class="rt">'+ic('chevright')+'</div></div>'; })+
      g('Product lines',r.lines,function(l){ return lineRow(l,esc(oppName(l))+' · owner '+esc(uname(l.owner))); })+
      g('Opportunities',r.opps,function(o){ return '<div class="row" data-go="opp" data-id="'+o.id+'"><div class="bd"><b>'+esc(o.name)+'</b><div class="m2">'+esc(o.id)+' · '+plural(linesOfOpp(o.id).length,'line')+'</div></div><div class="rt">'+ic('chevright')+'</div></div>'; })+
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
