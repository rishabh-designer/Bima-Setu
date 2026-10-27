/* ==================================================================== *
 *  Shell: sign-in, sidebar, top bar, routing, global event delegation
 * ==================================================================== */
var SCREENS={}, HANDLERS=[];
/* ============================= ADMIN ROLE ============================= */
function actorTag(){ var u=me(); return (u&&u.role==='admin')?('Admin · '+u.n):uname(S.user); }
function prioTone(p){ return p==='P0'?'red':(p==='P1'?'amber':(p==='P2'?'violet':'neutral')); }
function adminTile(nav,icon,title,desc){ return '<button class="row" data-nav="'+nav+'" style="width:100%;text-align:left;display:flex;gap:12px;align-items:center;padding:14px 16px;cursor:pointer"><span>'+ic(icon,'ic22')+'</span><span style="flex:1"><b>'+esc(title)+'</b><div class="meta">'+esc(desc)+'</div></span>'+ic('chevright')+'</button>'; }

var INSURER_MASTER=['New India Assurance','Oriental Insurance','United India','Reliance General','ICICI Lombard','Tata AIG','Bajaj Allianz','HDFC Ergo','Future Generali','Cholamandalam'];
var LA_GROUPS=[
 {name:'Liability team', products:['Directors & Officers','Professional Indemnity','Commercial General Liability','Product Liability','Cyber Liability','Crime'], users:['Anila','Karan','Thejus'], mgr:'Dhruvil'},
 {name:'WC & Engineering team', products:['Workmen’s Compensation','Contractors All Risk','Erection All Risk','Contractors Plant & Machinery'], users:['Deepak','Abhishek','Sunny'], mgr:'Mahendra'},
 {name:'Fire team', products:['Fire & Special Perils','Fire Loss of Profit','Machinery Breakdown','Machinery LOP','Office Package'], users:['Pranay'], mgr:'Pranay'}
];
var LP_STAGES=[
 ['Name, phone, email filled','P3'],['Visited Company field step','P3'],['Company name filled','P3'],['L1 visited','P3'],
 ['L1 completed','P2'],
 ['OTP entered','P1'],['View all the available quotes','P1'],['Quote selected by user','P1'],['Entered offline flow (thank-you page)','P1'],
 ['User details page visited','P0'],['User details submitted in purchase flow','P0'],['Company details page submit','P0'],['KYC documents submitted','P0'],['KYC verified','P0'],['Payment start','P0']
];

SCREENS.adminhome=function(){
  var accts=S.data.accounts.filter(function(a){return !a.merged;}).length;
  var openLn=S.data.lines.filter(function(l){return !dead(l);}).length;
  var renN=renLines().filter(function(l){return renDue(l);}).length;
  var tk=ticketRows(me()), tkOpen=tk.filter(function(r){return !r.closed;}).length, tkNeed=tk.filter(function(r){return r.need;}).length;
  var tsk=S.data.tasks.filter(function(t){return !t.done;}).length;
  var html='<div class="hdrow"><div><div class="h1">Admin console</div><div class="sub">Full access across every team — all accounts, opportunities, pipeline, renewals, tickets and tasks — plus every master configuration. You act on any record directly; the trail records it as Admin.</div></div></div>'+diamonds()+
    '<div class="stat mt12">'+
      '<div class="s"><div class="lbl">Accounts</div><div class="v">'+accts+'</div></div>'+
      '<div class="s"><div class="lbl">Open lines</div><div class="v">'+openLn+'</div></div>'+
      '<div class="s"><div class="lbl">Renewals due</div><div class="v'+(renN?' amber':'')+'">'+renN+'</div></div>'+
      '<div class="s"><div class="lbl">Open tickets</div><div class="v">'+tkOpen+'</div></div>'+
      '<div class="s"><div class="lbl">Open tasks</div><div class="v">'+tsk+'</div></div>'+
    '</div>'+
    '<div class="h4 mt16 mb12">Everything, across every team</div>'+
    '<div class="card"><div class="rowlist">'+
      adminTile('pipeline','list','Opportunities','Every opportunity in every team, by stage.')+
      adminTile('accounts','building','Accounts','Every customer account and its 360.')+
      adminTile('renewals','refresh','Renewals','Every renewal line across the RM book.')+
      adminTile('tickets','ticket','Tickets','Placement, payment, issuance, endorsement and claim tickets'+(tkNeed?' · '+tkNeed+' need attention':'')+'.')+
      adminTile('tasks','checks','Tasks','Every task in the system, whoever owns it.')+
    '</div></div>'+
    '<div class="h4 mt16 mb12">Master configuration</div>'+
    '<div class="card"><div class="rowlist">'+
      adminTile('rules','settings','Task configurator','Rules that create and close tasks — conditions, timing, escalation.')+
      adminTile('leadassign','list','Lead assignment','Round-robin groups and value rules for website leads.')+
      adminTile('leadprio','refresh','Lead prioritisation','P0–P3 priority by the funnel stage a website lead dropped from.')+
      adminTile('masterusers','users','Users','Everyone who signs in — function, role, who they report to, active or not.')+adminTile('rmalloc','handshake','RM allocation','Which RM owns an account after payment — by GWP/revenue band and region.')+adminTile('qmaster','file','Question Master','Every RFQ question, defined once and mapped to products. Excel bulk upload.')+adminTile('masterabm','refresh','ABM assignment','Round robin across the ABM executives at Payment Completed — who is in the pool, in what order, who is next.')+adminTile('rulecfg','settings','Working calendar & checks','Working days, hours, holidays and the hourly/daily rule checks.')+
      adminTile('masters','building','Reference masters','Products, insurers, sources, reasons, payment modes and the fallback users.')+
    '</div></div>';
  return {sc:'Admin console', html:html};
};

SCREENS.masters=function(){
  var tbl=function(title,head,body){ return '<section class="card" style="overflow:hidden"><div class="cardh"><span class="t">'+esc(title)+'</span></div><div class="tw"><table class="t"><thead><tr>'+head.map(function(h){return '<th>'+esc(h)+'</th>';}).join('')+'</tr></thead><tbody>'+body+'</tbody></table></div></section>'; };
  var one=function(arr){ return arr.map(function(x){ return '<tr><td>'+esc(x)+'</td></tr>'; }).join(''); };
  var prod=PRODUCTS.map(function(p){ return '<tr><td class="nm">'+esc(p)+'</td><td>'+esc(CATOF[p])+'</td><td>'+(CONTRACTUAL[p]?chip('Contractual · never renews','violet',false,true):'<span class="meta">Annual · renews</span>')+'</td></tr>'; }).join('');
  var cats=['Property & casualty','Marine & liability','Employee benefits'];
  var fb='<tr><td>Property & casualty</td><td>Nikhil Sharma</td><td>Priya Nair</td></tr><tr><td>Marine & liability</td><td>Anand Kulkarni</td><td>Priya Nair</td></tr><tr><td>Employee benefits</td><td>Divya Shah</td><td>Priya Nair</td></tr>';
  var c=cfg();
  var html='<div class="hdrow"><div><div class="h1">Masters &amp; configuration</div><div class="sub">Every reference list and routing master the product reads from. The configurable masters open their own screen; the reference lists below are the values in use.</div></div></div>'+diamonds()+
    '<div class="h4 mt8 mb12">Configurable masters</div>'+
    '<div class="card"><div class="rowlist">'+
      adminTile('rules','settings','Task configurator','Rules that create and close tasks.')+
      adminTile('leadassign','list','Lead assignment','Round-robin groups and value rules.')+
      adminTile('leadprio','refresh','Lead prioritisation','Priority by funnel drop-off stage.')+
      adminTile('masterusers','users','Users','People, roles and who reports to whom.')+adminTile('rmalloc','handshake','RM allocation','Post-payment RM owner by band + region.')+adminTile('qmaster','file','Question Master','RFQ questions and their product mapping.')+adminTile('masterabm','refresh','ABM assignment','Round robin pool of ABM executives.')+adminTile('rulecfg','settings','Working calendar & checks','Days, hours, holidays, check schedule.')+
    '</div></div>'+
    '<div class="h4 mt16 mb12">Reference lists</div>'+
    tbl('Products',['Product','Category','Type'],prod)+
    tbl('Product categories',['Category'],one(cats))+
    tbl('Insurers',['Insurer'],one(INSURER_MASTER))+
    tbl('Source',['Where the opportunity came from'],one(SRCS))+
    tbl('Business type',['On the opportunity'],one([BTYPE.fresh,BTYPE.roll]))+
    tbl('Payment modes',['Mode'],one(PAYMODE))+
    tbl('Park (Time Pending) reasons',['Reason'],one(PARK))+
    tbl('Disqualification reasons',['Reason'],one(DISQ))+
    fbCard()+
    '<div class="mt16">'+note('neutral','Working calendar','Working days Mon–Fri, '+c.ws+':00–'+c.we+':00, with '+plural(c.hol.length,'holiday')+' marked. The daily rule check runs at '+c.dailyH+':00. Open it from Working calendar & checks above.','info')+'</div>'+
    '<div class="mt12">'+note('violet','Editing','Task rules, the working calendar, lead assignment and lead prioritisation are editable. Inline editing of the reference lists above is the next build.','info')+'</div>';
  return {sc:'Masters', html:html};
};

SCREENS.leadassign=function(){
  var groups=LA_GROUPS.map(function(g){
    return '<tr><td class="nm">'+esc(g.name)+'<div class="meta">'+g.products.length+' products · '+esc(g.products.join(', '))+'</div></td>'+
      '<td>'+g.users.map(function(u,j){return (j+1)+'. '+esc(u);}).join('<br>')+'</td>'+
      '<td>'+esc(g.mgr)+'</td>'+
      '<td>'+chip('Active','green',false,true)+'</td></tr>';
  }).join('');
  var inG={}; LA_GROUPS.forEach(function(g){g.products.forEach(function(p){inG[p]=1;});});
  var notIn=PRODUCTS.filter(function(p){return !inG[p];});
  var html='<div class="hdrow"><div><div class="h1">Lead assignment</div><div class="sub">How an inbound website lead is routed to a sales user. Manually created opportunities are not assigned by this master.</div></div></div>'+diamonds()+
    '<div class="h4 mt8 mb12">Logic 1 · Assignment groups (product-wise round robin)</div>'+
    '<section class="card" style="overflow:hidden"><div class="tw"><table class="t"><thead><tr><th>Group</th><th>Sales users (in turn)</th><th>Sales manager</th><th>Status</th></tr></thead><tbody>'+groups+
      (notIn.length?'<tr class="dim"><td class="nm">Not in any group<div class="meta">'+esc(notIn.join(', '))+'</div></td><td colspan="3"><span class="meta">Falls back to the product’s fallback user.</span></td></tr>':'')+
    '</tbody></table></div></section>'+
    '<div class="h4 mt16 mb12">Logic 2 · Value rules</div>'+
    note('neutral','When sum insured and turnover are both given','The lead is routed by value instead of plain round robin: below the product group’s cut-off (Low) it goes to the next sales user in the round robin; at the cut-off and above (High) it goes to the Sales Manager. Parameters: Sum insured / LOI and Annual turnover. A product group with no cut-off always uses Logic 1.','info')+
    '<div class="mt12">'+note('violet','Editing','This mirrors the standalone Lead Masters prototype. The inline Edit / + New drawers and the “Test a lead” tool are the next build.','info')+'</div>';
  return {sc:'Lead assignment', html:html};
};

SCREENS.leadprio=function(){
  var rows=LP_STAGES.map(function(ss,i){ return '<tr><td class="num">'+(i+1)+'</td><td>'+esc(ss[0])+'</td><td>'+chip(ss[1],prioTone(ss[1]),false,true)+'</td></tr>'; }).join('');
  var html='<div class="hdrow"><div><div class="h1">Lead prioritisation</div><div class="sub">Priority for website leads, by the funnel stage the visitor dropped from. P0 is highest, P3 lowest. Applies only to website drop-offs that create a product line — not to manually added lines.</div></div></div>'+diamonds()+
    '<section class="card" style="overflow:hidden"><div class="cardh"><span class="t">Priority by drop-off stage</span></div><div class="tw"><table class="t"><thead><tr><th>#</th><th>Drop-off stage (journey order)</th><th>Priority</th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'+
    '<div class="mt16">'+note('neutral','Additional rules','Beyond the stage mapping, admins can raise priority by parameters such as sum insured / LOI, annual turnover, product or product group. None are seeded. A rule never lowers the stage priority.','info')+'</div>'+
    '<div class="mt12">'+note('violet','Editing','This mirrors the standalone Lead Masters prototype. The inline Edit / + New drawers and the “Test priority” tool are the next build.','info')+'</div>';
  return {sc:'Lead prioritisation', html:html};
};

/* --------------------------- RM ALLOCATION (post-payment) master --------------------------- */
var RMA_LEVELS=['RM','SRM','AVP','VP'];
var RMA_REGIONS=['North','West','South','East','Central','Northeast'];
var RMA_BANDS=[
 ['RM','0–1 Lakh','0–2 Cr','0–1 Lakh','0–10 Cr'],
 ['SRM','1–3 Lakhs','2–15 Cr','1–3 Lakhs','10–20 Cr'],
 ['AVP','3–7 Lakhs','15–75 Cr','3–7 Lakhs','20–40 Cr'],
 ['VP','7 Lakhs+','75 Cr+','7 Lakhs+','40 Cr+']
];
var RMA_OWNERS=[
 ['Chaitali Bhattacharya','VP',['North','South']],
 ['Manoj Jha','VP',['West']],
 ['Prashant Timothy','AVP',['West']],
 ['Shubh Bangar','AVP',['North','South']],
 ['Gaurav Mishra','SRM',['North','South']],
 ['Narain Kataria','RM',['West']],
 ['Prithvi Madhusudhanan','RM',['South']],
 ['Sumit Chand','RM',['North']]
];
var RMA_STATEMAP=[
 ['North','Jammu & Kashmir, Ladakh, Himachal Pradesh, Punjab, Chandigarh, Uttarakhand, Haryana, Delhi (NCT), Uttar Pradesh'],
 ['West','Rajasthan, Gujarat, Goa, Maharashtra, Dadra & Nagar Haveli and Daman & Diu'],
 ['South','Andhra Pradesh, Karnataka, Kerala, Tamil Nadu, Telangana, Puducherry, Lakshadweep'],
 ['East','Bihar, Jharkhand, Odisha, West Bengal, Andaman & Nicobar Islands'],
 ['Central','Madhya Pradesh, Chhattisgarh'],
 ['Northeast','Assam, Arunachal Pradesh, Meghalaya, Manipur, Mizoram, Nagaland, Tripura, Sikkim']
];
SCREENS.rmalloc=function(){
  var firstName=function(n){ return n.split(' ')[0]; };
  var owner=function(region,level){ return RMA_OWNERS.filter(function(o){ return o[1]===level && o[2].indexOf(region)>=0; }).map(function(o){ return firstName(o[0]); }); };
  var empties=0;
  var cov=RMA_REGIONS.map(function(r){ return '<tr><td class="nm">'+esc(r)+'</td>'+RMA_LEVELS.map(function(l){ var who=owner(r,l); if(!who.length){ empties++; return '<td>'+chip('— missing','red',false,true)+'</td>'; } return '<td>'+esc(who.join(', '))+(who.length>1?' <span class="meta">(round robin)</span>':'')+'</td>'; }).join('')+'</tr>'; }).join('');
  var bands=RMA_BANDS.map(function(b){ return '<tr><td>'+chip(b[0],'violet',false,true)+'</td><td>'+esc(b[1])+'</td><td>'+esc(b[2])+'</td><td>'+esc(b[3])+'</td><td>'+esc(b[4])+'</td></tr>'; }).join('');
  var owners=RMA_OWNERS.map(function(o){ return '<tr><td class="nm">'+esc(o[0])+'</td><td>'+chip(o[1],'violet',false,true)+'</td><td>'+o[2].map(esc).join(', ')+'</td></tr>'; }).join('');
  var smap=RMA_STATEMAP.map(function(x){ return '<tr><td class="nm">'+esc(x[0])+'</td><td>'+esc(x[1])+'</td></tr>'; }).join('');
  var html='<div class="hdrow"><div><div class="h1">RM allocation</div><div class="sub">Which relationship manager owns an account after the sale. It runs at Payment Completed, on an account’s first policy only — once an RM is assigned the logic never runs again for that account. Separate from sales lead assignment.</div></div></div>'+diamonds()+
    note('neutral','How the owner is decided','Each parameter that is present — the payment premium (GWP), net revenue, insurance expense and EB expense — maps to a designation band. The final designation is the highest among the parameters present. The owner is a person at that designation who covers the account’s region (from the State on the account). More than one at the same designation and region → round robin.','info')+
    '<div class="h4 mt16 mb12">Bands → designation level</div>'+
    '<section class="card" style="overflow:hidden"><div class="tw"><table class="t"><thead><tr><th>Level</th><th>Active GWP</th><th>Net revenue</th><th>Insurance expense</th><th>EB expense</th></tr></thead><tbody>'+bands+'</tbody></table></div></section>'+
    '<div class="meta mt8">A band edge falls in the next band — e.g. exactly ₹1 Lakh GWP is SRM, exactly ₹2 Cr revenue is SRM.</div>'+
    '<div class="h4 mt16 mb12">Owner roster</div>'+
    '<section class="card" style="overflow:hidden"><div class="tw"><table class="t"><thead><tr><th>Name</th><th>Designation</th><th>Region(s)</th></tr></thead><tbody>'+owners+'</tbody></table></div></section>'+
    '<div class="h4 mt16 mb12">Coverage · region × designation</div>'+
    '<section class="card" style="overflow:hidden"><div class="tw"><table class="t"><thead><tr><th>Region</th>'+RMA_LEVELS.map(function(l){return '<th>'+esc(l)+'</th>';}).join('')+'</tr></thead><tbody>'+cov+'</tbody></table></div></section>'+
    '<div class="mt12">'+note('amber','Gaps','The business sheet leaves '+empties+' designation × region cells empty — East, Central and North-east are uncovered, and West has no SRM. An account that routes to an empty cell has no owner until the names are supplied.','info')+'</div>'+
    '<div class="h4 mt16 mb12">State → region</div>'+
    '<section class="card" style="overflow:hidden"><div class="tw"><table class="t"><thead><tr><th>Region</th><th>States / UTs</th></tr></thead><tbody>'+smap+'</tbody></table></div></section>'+
    '<div class="mt12">'+note('violet','Editing','This mirrors the standalone BimaSetu RM Allocation prototype. The inline Edit drawers and the “Test an account” tool are the next build, with lead assignment and lead prioritisation.','info')+'</div>';
  return {sc:'RM allocation', html:html};
};

/* =========================== END ADMIN ROLE =========================== */

var PERSONAS=[
 {id:'nikhil', d:'Owns a book of product lines. Home says what needs him. Works lines, raises tickets, creates opportunities.'},
 {id:'vikram', d:'Sees the whole team and acts on none of it. Closes escalated tasks, takes a line over when someone is away, edits task rules.'},
 {id:'priya',  d:'Owns accounts after the sale: chases the client for the proposal form and mandate, holds the relationship through issuance, raises endorsements and claims — and sells on her own accounts.'},
 {id:'meera',  d:'Head of relationship management. Sees every RM’s post-purchase lines, renewals and service tickets; closes escalations, takes a line over, sets the RM clocks.'},
 {id:'admin',  d:'Full access to every account, opportunity, pipeline, renewal, ticket and task across all teams — acts on any record directly — and owns all master configuration: task rules, lead assignment, lead prioritisation and the reference masters.'}
];
/* [stated 23 Sep] a call that has been placed must be dispositioned — its modal has no way out */
function flowLocked(){ var f=FLOWS[S.flow]; return !!(f&&f.locked&&f.locked()); }
function navFor(u){ if(u.role==='admin') return [['adminhome','Home',ic('home','ic22')],['pipeline','Opportunities',ic('list','ic22')],['accounts','Accounts',ic('building','ic22')],['renewals','Renewals',ic('refresh','ic22')],['tickets','Tickets',ic('ticket','ic22')],['tasks','Tasks',ic('checks','ic22')],['masters','Masters',ic('settings','ic22')]];
  /* [stated 23 Sep] My view works the way the executive's does, nav included */
  if(hasViews(u)&&!teamView(u)) return u.role==='rmhead'
    ? [['rmhome','Home',ic('home','ic22')],['pipeline','Opportunities',ic('list','ic22')],['renewals','Renewals',ic('refresh','ic22')],['accounts','Accounts',ic('building','ic22')],['tasks','Tasks',ic('checks','ic22')],['tickets','Tickets',ic('ticket','ic22')],['rules','Call tasks',ic('settings','ic22')]]
    : [['home','Home',ic('home','ic22')],['pipeline','Opportunities',ic('list','ic22')],['accounts','Accounts',ic('building','ic22')],['tasks','Tasks',ic('checks','ic22')],['tickets','Tickets',ic('ticket','ic22')],['rules','Call tasks',ic('settings','ic22')]];
  if(u.role==='mgr') return [['team','Home',ic('home','ic22')],['pipeline','Opportunities',ic('list','ic22')],['accounts','Accounts',ic('building','ic22')],['tasks','My tasks',ic('checks','ic22')],['tickets','Tickets',ic('ticket','ic22')],['rules','Call tasks',ic('settings','ic22')]];
  if(u.role==='rm') return [['rmhome','Home',ic('home','ic22')],['pipeline','Opportunities',ic('list','ic22')],['renewals','Renewals',ic('refresh','ic22')],['accounts','Accounts',ic('building','ic22')],['tasks','Tasks',ic('checks','ic22')],['tickets','Tickets',ic('ticket','ic22')]];
  /* [stated 24 Sep · TBD-54] the head of RM gets Pipeline in Team view too — her team's
     post-purchase lines were otherwise reachable only through home cards and Tickets */
  if(u.role==='rmhead') return [['rmteam','Home',ic('home','ic22')],['pipeline','Opportunities',ic('list','ic22')],['renewals','Renewals',ic('refresh','ic22')],['accounts','Accounts',ic('building','ic22')],['tasks','My tasks',ic('checks','ic22')],['tickets','Tickets',ic('ticket','ic22')],['rules','Call tasks',ic('settings','ic22')]];
  return [['home','Home',ic('home','ic22')],['pipeline','Opportunities',ic('list','ic22')],['accounts','Accounts',ic('building','ic22')],['tasks','Tasks',ic('checks','ic22')],['tickets','Tickets',ic('ticket','ic22')]];
}
function navBadge(v,u){
  if(v==='renewals'){ return renLines(u.id).filter(function(l){ return renDue(l)&&renDays(l)<=7; }).length; }
  if(v==='home'){ var b=homeBuckets(u.id); return b.fresh.length+b.late.length+b.move.length+b.quiet.length; }
  if(v==='tasks'){ return myTasks(u.id).filter(function(t){var s=taskState(t);return s==='esc'||s==='over'||s==='today';}).length; }
  if(v==='team'||v==='rmteam'){ return escalatedTo(u.id).length; }
  if(v==='rmhome'){ var r=rmBuckets(u.id); return r.onme.length; }
  if(v==='tickets'){ return ticketRows(u).filter(function(r){return r.need;}).length; }
  return 0;
}
function activeNav(){ var v=S.route.v, u=me(); if(v==='opp'||v==='opps') return 'opps'; if(v==='home'||v==='rmhome'||v==='team'||v==='rmteam') return homeRoute(u); if(v==='line'||v==='pipeline'){ if(hasViews(u)&&teamView(u)) return homeRoute(u); return 'pipeline'; } if(v==='acct'||v==='accounts'||v==='policy') return 'accounts'; if(v==='ticket'||v==='tickets'||v==='svctix'||v==='svcnew'||v==='svc') return 'tickets'; if(v==='masters'||v==='masterusers'||v==='leadassign'||v==='leadprio'||v==='rmalloc'||v==='qmaster'||v==='masterabm') return 'masters'; if(v==='rule'||v==='rules'||v==='rulesim'||v==='rulecfg') return isRole('admin')?'masters':'rules'; return v; }


/* [stated 27 Sep] sub-lines are one line; the full text is on hover when it is cut */
var CLAMP_SEL='.hdrow .sub,table.t td .sub,.rowlist .bd .m,.rowlist .bd .m2,.hrow .mt,.na .w,.zsib .meta,.zkv .meta,.qc-m,.tk-kvs .meta,.arm,.crow2 .m2,.metaline.one';
document.addEventListener('mouseover',function(ev){ var t=ev.target; if(!(t instanceof Element)) return; var el=t.closest(CLAMP_SEL); if(!el||el.title) return; if(el.scrollWidth>el.clientWidth+1) el.title=el.textContent.replace(/\s+/g,' ').trim(); });
function paint(){
  var root=document.getElementById('app');
  if(!S.user){ root.innerHTML=renderSignin(); paintModal(); return; }
  var u=me(), scr=SCREENS[S.route.v] ? SCREENS[S.route.v]() : SCREENS.notfound();
  /* [stated 26 Sep · 19.3] prototype control: a slow network shows the skeleton first */
  var rk=JSON.stringify(S.route); if(S.ui.slow&&S._skel!==rk){ S._skel=rk; scr={sc:scr.sc,ctx:scr.ctx,html:skeleton(),cta:''}; setTimeout(function(){ if(S._skel===rk) paint(); },700); }
  var nav=navFor(u), an=activeNav();
  root.innerHTML='<div class="app">'+
    '<aside class="side'+(S.side?' open':'')+'" id="side">'+
      '<div class="wm">Bima<i>Setu</i></div><div class="wmsub">'+(u.role==='rm'||u.role==='rmhead'?'Relationship management':(u.role==='mgr'?'Sales management':'Sales'))+' · prototype</div>'+
      (hasViews(u)?'<div class="vsw" role="group" aria-label="View">'+
          '<button data-vw="mine"'+(teamView(u)?'':' class="on"')+'>'+ic('user','ic14')+'My view</button>'+
          '<button data-vw="team"'+(teamView(u)?' class="on"':'')+'>'+ic('users','ic14')+'Team view</button></div>':'')+
      '<label class="ssearch">'+ic('search','ic16')+'<input id="gsearch" placeholder="Search anything" value="'+esc(S.ui.gq||'')+'" autocomplete="off"></label>'+
      '<div class="menu-l">Menu</div><nav class="nav">'+nav.map(function(n){ var c=navBadge(n[0],u);
        return '<button data-nav="'+n[0]+'"'+(an===n[0]?' class="on"':'')+'>'+n[2]+esc(n[1])+(c?'<span class="cnt">'+c+'</span>':'')+'</button>'; }).join('')+'</nav>'+
      '<div class="persona"><div class="row">'+avatar(u.n)+'<div style="min-width:0"><div class="nm">'+esc(u.n)+'<i></i></div><div class="rl">'+esc(u.title)+'</div></div></div>'+
        '<button class="sw" data-switch="1">'+ic('refresh','ic14')+'Switch person</button>'+
        '<div class="more"><button data-proto="1">'+ic('clock','ic14')+' Prototype controls</button><button data-reset="1">Reset</button></div></div>'+
    '</aside>'+
    '<div class="main"><div class="panel">'+
      (S.offline?'<div class="offline">'+ic('wifioff','ic14')+'You are offline — nothing you do will save until you reconnect. <button data-offline="0">Reconnect</button></div>':'')+
      '<div class="topbar"><div class="flex" style="min-width:0"><button class="burger btn ghost sm" data-burger="1" aria-label="Menu">'+ic('menu')+'</button><span class="sc">'+esc(scr.sc||'')+'</span></div>'+
      '<div class="rt">'+(scr.ctx?'<span class="ctx">'+esc(scr.ctx)+'</span>':'')+(scr.cta!==undefined?scr.cta:'<button class="btn primary sm" data-flow="newOpp">'+ic('plus')+'New opportunity</button>')+'</div></div>'+
      '<div class="content">'+scr.html+'</div>'+
    '</div></div>'+
  '</div>';
  paintModal();
  var cur=document.querySelector('.track .step.now'); if(cur){ ['.phase','.track'].forEach(function(sel){ var sc=cur.closest(sel); if(sc&&sc.scrollWidth>sc.clientWidth+2){ var r=cur.getBoundingClientRect(), b=sc.getBoundingClientRect(); sc.scrollLeft+= (r.left-b.left) - sc.clientWidth/2 + r.width/2; } }); }
}
function renderSignin(){
  return '<div class="signin"><div class="box"><div class="wm" style="font-size:var(--fs-4xl)">Bima<i>Setu</i></div><div class="sub">The sales side of the CRM — accounts, opportunities, product lines, tasks and the tickets that carry a line through placement and payment. Pick who you are; everything you do is remembered in this browser until you reset it.</div>'+
    '<div class="personas">'+PERSONAS.map(function(p){ var u=by(seedUsers(),p.id); return '<button class="pcard" data-signin="'+p.id+'">'+avatar(u.n)+'<div><div class="nm">'+esc(u.n)+'</div><div class="rl">'+esc(u.title)+'</div></div><div class="d">'+esc(p.d)+'</div><div class="flex" style="color:var(--violet);font-weight:600;font-size:var(--fs-base)">Sign in '+ic('arrowright','ic14')+'</div></button>'; }).join('')+'</div>'+
    '<div class="mt20">'+note('neutral','Prototype','Every record here is synthetic. Amber dashed blocks simulate something arriving from outside the CRM; dotted grey blocks move the prototype’s clock. Real actions are solid-bordered and never dashed.','info')+'</div></div></div>';
}
var _seedUsers=null; function seedUsers(){ if(S.data) return S.data.users; if(!_seedUsers) _seedUsers=seed().users; return _seedUsers; }

/* prototype controls: time and connectivity, dotted grey by rule */
FLOWS.proto={t:'Prototype controls', sub:'Not part of the product. Time passing and losing the network are simulated here so the states they cause can be seen.',
  nofoot:function(){return true;},
  body:function(){ return timeblock('The clock is fixed at '+fmt(S.now)+' ('+fmtD(S.now)+'). Advance it to see tasks cross into Overdue and Escalated, and lines cross the 30-day quiet line. It never runs on its own.',
      '<button class="timebtn" data-time="60">+1 working hour</button><button class="timebtn" data-time="540">+1 working day</button><button class="timebtn" data-time="2700">+1 working week</button><button class="timebtn" data-time="0">Back to the seed clock</button>')+
    '<div class="mt12">'+note('neutral','Connectivity','The app is '+(S.offline?'<b>offline</b>':'<b>online</b>')+'. Offline, every save fails with a retry, so you can see how a rep is told and what happens when the network returns.<div class="mt8"><button class="btn sm" data-offline="'+(S.offline?'0':'1')+'">'+ic(S.offline?'wifi':'wifioff')+(S.offline?'Reconnect':'Go offline')+'</button></div>','info')+'</div>'+
    '<div class="mt12">'+note('neutral','Loading and errors','See the states a slow or failing network produces: skeletons while a screen loads, and a single panel that could not load while the rest still works.<div class="mt8 flex wrap" style="gap:8px"><button class="btn sm" data-protoui="slow">'+(S.ui.slow?'✓ Slow loading on':'Slow loading')+'</button><button class="btn sm" data-protoui="failPanels">'+(S.ui.failPanels?'✓ Failing panels on':'Make panels fail')+'</button></div>','info')+'</div>'+
    '<div class="mt12">'+note('neutral','Cholamandalam KYC — account type','The Chola KYC step adapts to the account: a verified account reuses the PAN and GST on file; a provisional account is asked to upload them and the numbers are read by OCR. Toggle the Workmen’s Compensation account to see both.<div class="mt8"><button class="btn sm" data-protoprov="1">'+(cholaWcAcct()&&cholaWcAcct().prov?'✓ WC account is provisional':'Make the WC account provisional')+'</button></div>','info')+'</div>'+
    '<div class="mt12">'+note('amber','Reset','Wipes every change you made in this browser and returns to the seed. Cannot be undone.<div class="mt8"><button class="btn danger sm" data-reset="1">Reset to seed</button></div>')+'</div>'; }};
FLOWS.switchUser={t:'Switch person', sub:'Same data, another chair. Nothing is lost.', nofoot:function(){return true;},
  body:function(){ return PERSONAS.map(function(p){ var u=userById(p.id); return '<button class="opt" data-signin="'+p.id+'"><span class="mk'+(S.user===p.id?' on':'')+'"></span><span class="bd"><b>'+esc(u.n)+'</b><span>'+esc(u.title)+'</span></span></button>'; }).join('')+'<div class="mt8"><button class="btn ghost sm" data-signout="1">'+ic('logout')+'Sign out</button></div>'; }};

/* ---------- global events ---------- */
document.addEventListener('click',function(e){
  var t=e.target; if(!(t instanceof Element)) return;
  var x;
  if(t.closest('[data-taskdue]')||t.closest('select.sel,input.inp')&&t.closest('.row')){ return; }
  if(x=t.closest('[data-signin]')){ S.user=x.dataset.signin; S.flow=null; S.sel={}; S.hist=[]; delete S.ui.vw; /* [stated 23 Sep] each person starts in their own default view */ var u=me(); S.route={v:homeRoute(u)}; save(); paint(); return; }
  if(t.closest('[data-signout]')){ S.user=null; S.flow=null; S.route={v:'signin'}; save(); paint(); return; }
  if(t.closest('[data-switch]')){ S.user=null; S.flow=null; S.route={v:'signin'}; save(); paint(); return; }
  if(t.closest('[data-proto]')){ openFlow('proto'); return; }
  if(t.closest('[data-reset]')){ reset(); return; }
  if(x=t.closest('[data-offline]')){ S.offline=x.dataset.offline==='1'; if(!S.offline && S.pending){ retry(); } paint(); if(S.flow==='proto') paintModal(); toast(S.offline?'Offline':'Back online',S.offline?'Saves will fail until you reconnect.':'Saving works again.'); return; }
  if(x=t.closest('[data-time]')){ var tv=x.dataset.time, n=null; if(tv==='0'){ S.now=T0.getTime(); } else if(tv.indexOf('next:')===0){ n=advanceClock(nextCheck(S.now,tv.slice(5))); } else { n=advanceClock(addWork(S.now,+tv)); } save(); paint(); if(S.flow==='proto') paintModal(); toast('Clock moved', tv==='0'?'Back to '+fmt(S.now):'Now '+fmt(S.now)+(n?' · '+plural(n.h,'hourly check')+', '+plural(n.d,'daily check')+' ran · '+plural(n.made,'task')+' created by rule'+(n.ren?' · '+plural(n.ren,'renewal line')+' opened':''):'')); return; }
  if(x=t.closest('[data-toastact]')){ if(x.dataset.toastact==='retry') retry(); var tt=x.closest('.toast'); if(tt) tt.remove(); if(x.dataset.toastact==='copyrfq') toast('Link copied'); return; }
  if(t.closest('[data-burger]')){ S.side=!S.side; document.getElementById('side').classList.toggle('open',S.side); return; }
  if(x=t.closest('[data-nav]')){ go(x.dataset.nav); return; }
  if(t.closest('[data-back]')){ back(); return; }
  /* screen handlers run before generic navigation so a control inside a clickable row wins */
  for(var i=0;i<HANDLERS.length;i++){ if(HANDLERS[i](t,e)) return; }
  if(x=t.closest('[data-go]')){ var p={}; if(x.dataset.id) p.id=x.dataset.id; if(x.dataset.tab) p.tab=x.dataset.tab; if(x.dataset.q!==undefined) p.q=x.dataset.q; go(x.dataset.go,p); return; }
  if(x=t.closest('[data-fold]')){ S.ui['fold_'+x.dataset.fold]=!x.closest('.fold').classList.contains('open'); x.closest('.fold').classList.toggle('open'); return; }
  if(x=t.closest('[data-pill]')){ S.ui[x.dataset.pill]=x.dataset.pv; paint(); return; }
  if(x=t.closest('[data-uiset]')){ S.ui[x.dataset.uiset]=x.dataset.uv; paint(); return; }
  /* modal */
  if(x=t.closest('[data-mset]')){ if(S.flow){ S.sel[x.dataset.mset]=x.dataset.mval; paintModal(); } return; }
  if(x=t.closest('[data-pick]')){ if(S.flow){ if(x.getAttribute('aria-disabled')==='true') return; S.sel.d=x.dataset.pick; paintModal(); } return; }
  if(x=t.closest('[data-tog]')){ if(S.flow){ var arr=S.sel[x.dataset.tog]=S.sel[x.dataset.tog]||[], v=x.dataset.tv, i=arr.indexOf(v); if(i>=0) arr.splice(i,1); else arr.push(v); paintModal(); } return; }
  if(x=t.closest('[data-vw]')){ var want=x.dataset.vw; if((want==='team')!==teamView()){ S.ui.vw=want; var v=S.route.v;
      if(v==='home'||v==='rmhome'||v==='team'||v==='rmteam'){ S.route={v:homeRoute()}; }
      S.flow=null; S.sel={}; save(); paint(); } return; }
  if(t.closest('[data-close]')){ if(flowLocked()) return; closeFlow(); return; }
  if(t.closest('[data-commit]')){ commit(); return; }
  if(t.closest('[data-alt]')){ var f=FLOWS[S.flow]; if(f&&f.alt){ if(typeof f.alt.run==='function'){ f.alt.run(); } else openFlow(f.alt.flow,{line:S.sel.line}); } return; }
  if(t.classList.contains('ovl')){ if(flowLocked()) return; closeFlow(); return; }
  if(x=t.closest('[data-flow]')){ if(x.disabled) return; var fi={line:x.dataset.line||(S.route.id||''),acct:x.dataset.acct||''}; ['pre','from','opp','comb','task'].forEach(function(k){ if(x.dataset[k]) fi[k]=x.dataset[k]; }); if(fi.pre) fi.d=fi.pre; openFlow(x.dataset.flow,fi); return; }
});
document.addEventListener('input',function(e){
  var t=e.target; if(!(t instanceof Element)) return;
  if(t.dataset.f!==undefined){ S.sel[t.dataset.f]=t.value; flowLive(); var lf=FLOWS[S.flow]; if(lf&&lf.onInput) lf.onInput(t.dataset.f); return; }
  if(t.id==='gsearch'){ S.ui.gq=t.value; return; }
  if(t.dataset.ui!==undefined){ S.ui[t.dataset.ui]=t.value; var id=t.id; paint(); var n=document.getElementById(id); if(n){ n.focus(); try{ n.setSelectionRange(n.value.length,n.value.length); }catch(err){} } return; }
});
document.addEventListener('change',function(e){
  var t=e.target; if(!(t instanceof Element)) return;
  if(t.dataset.f!==undefined){ S.sel[t.dataset.f]=t.value; if(t.tagName==='SELECT'){ var f=FLOWS[S.flow]; if(f&&f.repaintOn&&f.repaintOn.indexOf(t.dataset.f)>=0) paintModal(); else flowLive(); } return; }
  if(t.dataset.uisel!==undefined){ S.ui[t.dataset.uisel]=t.value; paint(); return; }
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&S.flow){ if(flowLocked()) return; closeFlow(); return; }
  if(e.key==='Enter'&&e.target&&e.target.id==='gsearch'){ var q=e.target.value.trim(); if(q){ go('search',{q:q}); } }
});
