/* ==================================================================== *
 *  Renewals — decided 22 Sep 2026.
 *  · The system opens a renewal product line 90 days before a policy on an
 *    RM's account expires: its own renewal opportunity, owned by the
 *    account's RM, linked to the expiring policy (l.renews = policy id).
 *  · It starts at Details Captured. The requirement is carried over from the
 *    expiring policy.
 *  · [stated 24 Sep] THERE IS NO DAU ROUTE AT RENEWAL. Every renewal is an RFQ
 *    line and goes to placement, whatever the product and whatever the fresh
 *    buy was. Three ways the RFQ opens:
 *      – the fresh buy was Non-DAU and bought here → last year's RFQ is
 *        carried over, for the RM to change and send on;
 *      – the fresh buy was DAU, so no RFQ was ever raised → a new RFQ opens,
 *        pre-filled from the policy and the account, for the RM to fill;
 *      – the policy was not bought through the CRM → the same, pre-filled
 *        from the policy record.
 *  · [stated 24 Sep] contractual policies never renew — Workmen's
 *    Compensation, Contractors All Risk and Erection All Risk. No renewal line
 *    is opened and they are out of every renewal view.
 *  · The Renewals pipeline (RMs only) groups the lines by when the current
 *    policy expires: Overdue · Due today · 1–7 · 8–30 · 31–60 · 61–90 days.
 * ==================================================================== */
var REN_WINDOW=90;
var REN_BANDS=[
  {k:'over', t:'Overdue',     g:'expired, not renewed',  tone:'red'},
  {k:'today',t:'Due today',   g:'expires today',         tone:'red'},
  {k:'d7',   t:'1–7 days',    g:'expires this week',     tone:'amber'},
  {k:'d30',  t:'8–30 days',   g:'expires this month',    tone:'amber'},
  {k:'d60',  t:'31–60 days',  g:'expires in 1–2 months', tone:'blue'},
  {k:'d90',  t:'61–90 days',  g:'expires in 2–3 months', tone:'neutral'}
];
function dayStart(t){ var d=new Date(t); d.setHours(0,0,0,0); return d.getTime(); }
function calDays(a,b){ return Math.round((dayStart(b)-dayStart(a))/86400000); }
function polHit(accounts,pid){ for(var i=0;i<accounts.length;i++){ var a=accounts[i]; for(var j=0;j<(a.pols||[]).length;j++){ if(a.pols[j].id===pid) return {a:a,p:a.pols[j]}; } } return null; }
function renPolHit(l){ return l&&l.renews?polHit(S.data.accounts,l.renews):null; }
function renDays(l){ var h=renPolHit(l); return h?calDays(S.now,h.p.exp):0; }
function renBandKey(d){ return d<0?'over':(d===0?'today':(d<=7?'d7':(d<=30?'d30':(d<=60?'d60':'d90')))); }
function renBand(k){ return REN_BANDS.filter(function(b){return b.k===k;})[0]; }
function renInTx(d){ return d<0?'expired '+plural(-d,'day')+' ago':(d===0?'expires today':(d===1?'expires tomorrow':'expires in '+d+' days')); }
function renLineOf(pid){ return S.data.lines.filter(function(l){ return l.renews===pid; })[0]||null; }
function renLines(uid){ return S.data.lines.filter(function(l){ return l.renews&&(!uid||l.owner===uid); }); }
function renDue(l){ return !dead(l)&&l.stage<SALES_STAGES; }                  /* still to renew */
function renCancelled(p){ return (S.data&&S.data.svc||[]).some(function(t){ return t.k==='end'&&t.pol===p.id&&t.sub==='Cancellation and refund'&&t.stage==='Completed'; }); }

/* ---------- the route at renewal — [stated 24 Sep] there isn't one to decide.
   Every renewal is an RFQ line. The rater never prices a renewal, whatever the product and
   whatever the sum insured, so the v21 DAU re-check at Details Captured is gone with it. ---------- */
function siRupees(s){ var m=String(s||'').replace(/,/g,'').match(/([\d.]+)\s*(cr|crore|l|lakh|lac|k)?/i); if(!m) return NaN; var n=parseFloat(m[1]), u=(m[2]||'').toLowerCase(); return n*(u==='cr'||u==='crore'?1e7:(u==='l'||u==='lakh'||u==='lac'?1e5:(u==='k'?1e3:1))); }
function renIsDau(){ return false; }
/* where a renewal's RFQ came from — it decides what the RM is being asked to do */
function renRfqSrc(l){ return (l&&l.rfq&&l.rfq.src)||'outside'; }

/* renewal opportunity name — [stated] 22 Sep: Productline_Renewal_Month Year, the month the policy expires */
function renOppName(p){ var d=new Date(p.exp); return p.p+'_Renewal_'+MONN[d.getMonth()]+' '+d.getFullYear(); }

/* ---------- what is carried over ---------- */
function renReq(a,p,orig){
  var r=orig&&orig.req?orig.req:{};
  return {si:p.si, tp:INR(p.pr), to:(r.to&&r.to!=='—')?r.to:(a.to||'—'), tob:r.tob||'Manufacturing', noc:r.noc||'Private limited',
    pol:'y', ins:p.ins, exp:ymd(p.exp), ten:r.ten||'1 year', clm:r.clm||'No claims in 3 years', pan:'', note:'Carried over from '+p.id};
}
/* [stated 24 Sep] three ways the renewal's RFQ opens, and the RM is asked something different
   in each: carried over from last year's RFQ · a new RFQ because the fresh buy was DAU and
   never had one · a new RFQ because the policy was never bought through the CRM. */
function renRfq(l,a,p,orig,at){
  var fs=rfqFlat(l,a), carried=orig&&orig.rfq&&orig.rfq.f&&Object.keys(orig.rfq.f).length;
  l.rfq={st:'draft',f:{},openedAt:at,sharedAt:0,verifiedAt:0,floatedAt:0,direct:0,from:'',src:''};
  if(carried){
    l.rfq.from=orig.id; l.rfq.src='carry';
    fs.forEach(function(f){ var x=orig.rfq.f[f.k]; if(x&&x.v) l.rfq.f[f.k]={v:x.v,by:'carry',who:orig.id,at:at}; });
  } else {
    l.rfq.src=orig?'dau':'outside';   /* a fresh line with no RFQ was priced by the rater */
    fs.forEach(function(f){ if(f.pre) l.rfq.f[f.k]={v:f.pre,by:f.by,who:'',at:at}; });
  }
  /* what a year changes: the insured's name, the current insurer, its expiry and the new start date */
  var set=function(k,v){ if(v) l.rfq.f[k]={v:v,by:'req',who:'',at:at}; };
  set('name',a.n); set('si',(l.req&&l.req.si)||p.si); set('ins',p.ins); set('exp',ymd(p.exp)); set('start',ymd(p.exp+86400000));
}
function renRfqWhy(l){
  var src=renRfqSrc(l), h=renPolHit(l), pid=h?h.p.id:(l.renews||'the policy');
  if(src==='carry') return 'Carried over from <button class="link" data-go="line" data-id="'+esc(l.rfq.from)+'">'+esc(l.rfq.from)+'</button>, the RFQ placement received when the policy was bought. The insurer, expiry and start date are updated for this year. Change anything that has changed, then send it on.';
  if(src==='dau') return '<b>There is no RFQ to carry over.</b> '+esc(pid)+' was priced by the rater at the fresh buy, so one was never raised. A renewal always goes to placement, so the RFQ opens here pre-filled from the policy and the account — the rest is yours to fill.';
  return 'Pre-filled from the expiring policy '+esc(pid)+' and the account — it was not bought through the CRM, so the rest is to fill. A renewal always goes to placement.';
}
function renRfqNote(l){ if(!renPolHit(l)) return '';
  return '<div class="rnote">'+ic('refresh','ic14')+'<span>'+renRfqWhy(l)+'</span></div>';
}
function renRfqLogT(l,p){ var s=renRfqSrc(l);
  return s==='carry'?('RFQ carried over from '+l.rfq.from)
    :(s==='dau'?('RFQ opened — '+(p?p.id:l.renews)+' was DAU at the fresh buy, so there was none to carry over')
              :('RFQ pre-filled from '+(p?p.id:l.renews))); }
function renRfqLogM(l){ var s=renRfqSrc(l);
  return s==='carry'?'System · the insurer, expiry and start date updated for this year'
    :(s==='dau'?'System · a renewal always goes to placement · pre-filled from the policy and the account'
              :'System · not bought through the CRM · pre-filled from the policy record'); }

/* ---------- seed: the renewal lines the system opened before the seed clock ---------- */
function renSeedFix(lines,accounts,opps,users){
  var uname=function(id){ var u=users.filter(function(x){return x.id===id;})[0]; return u?u.n:id; };
  var byId=function(id){ return lines.filter(function(x){return x.id===id;})[0]; };
  lines.forEach(function(l){
    if(!l.renews) return; var h=polHit(accounts,l.renews); if(!h) return; var a=h.a, p=h.p, at=l.createdAt;
    var orig=p.line?byId(p.line):null;
    if(orig&&!orig.paidAt){ orig.soldBy='anand'; orig.paidAt=orig.enteredAt-19*86400000; orig.log.push({at:orig.paidAt,t:'Payment confirmed',m:'Anand Kulkarni · '+INR(orig.prem)+' matched',sys:0,kind:'pay'},{at:orig.enteredAt,t:'Policy copy and tax invoice sent to the client',m:'System · '+p.id,sys:1,kind:'post'}); }
    /* [stated 24 Sep] a renewal is never DAU — every seeded renewal line is an RFQ line */
    l.req=renReq(a,p,orig); l.prem=p.pr; l.src='Renewal route'; l.rate=0;
    var d=calDays(at,p.exp);
    l.log=[{at:at,t:'Renewal line created',m:'System · '+p.id+' expires '+fmtD(p.exp)+' · opened '+d+' days out · owned by the account’s RM · requirement carried over',sys:1,kind:'sys'},
           {at:at,t:'Stage entered: '+stageName(3),m:'System · a renewal starts here, on the RFQ route',sys:1,kind:'stage'}];
    {
      renRfq(l,a,p,orig,at);
      l.log.push({at:at,t:renRfqLogT(l,p),m:renRfqLogM(l),sys:1,kind:'rfq'});
      if(l.stage>=4){ l.rfq.sharedAt=at+86400000*4; l.log.push({at:l.rfq.sharedAt,t:'RFQ emailed to '+(l.contact.n||'the client')+' for review',m:uname(l.owner),sys:0,kind:'email'});
        if(l.stage>=5){ rfqFillRest(l,'client','',at+86400000*6,a); l.rfq.st='verified'; l.rfq.verifiedAt=at+86400000*6; l.log.push({at:l.rfq.verifiedAt,t:'Client approved the RFQ',m:(l.contact.n||'Client')+' · no changes this year',sys:1,kind:'rfq'}); }
        else l.rfq.st='shared';
        if(l.stage>=6){ l.rfq.st='floated'; l.rfq.floatedAt=at+86400000*7; l.log.push({at:l.rfq.floatedAt,t:'RFQ floated to placement',m:uname(l.owner)+' · ticket PLC-'+l.id.slice(3)+' raised · after client review',sys:0,kind:'sys'}); l.qAns=1; }
        if(l.stage>=7) l.log.push({at:l.enteredAt,t:'Quotes returned by placement',m:'System · ticket PLC-'+l.id.slice(3),sys:1,kind:'sys'});
      }
      /* a seeded renewal already past Quote Sent needs its RFQ to have gone out and come back */
      if(l.stage>=8&&l.rfq.st!=='floated'){ rfqFillRest(l,'client','',at+86400000*5,a); l.rfq.st='floated'; l.rfq.sharedAt=l.rfq.sharedAt||at+86400000*3; l.rfq.verifiedAt=at+86400000*5; l.rfq.floatedAt=at+86400000*6; l.qAns=1; }
    }
    if(l.stage>=8){ l.log.push({at:l.stage===8?l.enteredAt:l.enteredAt-86400000*5,t:'QCR v1 sent to client',m:uname(l.owner)+' · from placement · renewal',sys:0,kind:'qcr'}); }
    if(l.stage>=9){ l.log.push({at:l.enteredAt,t:'Client confirmed insurer',m:uname(l.owner)+' · '+l.picked,sys:0,kind:'call'}); }
    if(l.stage>=9&&l.pay==='ticket'){ l.payLines=[l.id]; l.amt=premOf(l); l.log.push({at:l.enteredAt+3600000,t:'Payment ticket PAY-'+l.id.slice(3)+' raised',m:'System · covers 1 product line · '+(l.payMode||'NEFT / RTGS'),sys:1,kind:'sys'}); }
    if(l.stage>3) l.log.push({at:l.enteredAt,t:'Stage entered: '+stageName(l.stage),m:'System',sys:1,kind:'stage'});
  });
}

/* ---------- the system opening renewal lines as the clock moves ---------- */
function renCreate(a,p,at){
  var orig=p.line?lineById(p.line):null, ou=userById(a.own), owner=ou&&ou.role==='rm'?a.own:rmFor(a), c=a.con.filter(function(x){return !x.dep;})[0]||a.con[0]||{n:'',e:'',m:''};
  /* [stated 23 Sep] no opportunity is created — the renewal is a product line on the account */
  var l={id:'OP-'+(S.data.seq.line++),opp:'',acct:a.id,product:p.p,owner:owner,stage:3,status:'open',reason:'',revisit:0,att:0,rate:0,rfq:{st:'none',f:{}},
    req:renReq(a,p,orig),round:1,qAns:0,obj:'',qsel:[],picked:'',prem:p.pr,ins:'',pay:'pre',payMode:'',amt:0,payLines:[],renews:p.id,
    enteredAt:at,createdAt:at,assignedAt:at,src:'Renewal route',contact:{n:c.n||'',e:c.e||'',m:c.m||''},log:[]};
  l.rate=0;   /* [stated 24 Sep] no DAU route at renewal */
  l.log.unshift({at:at,t:'Renewal line created',m:'System · '+p.id+' expires '+fmtD(p.exp)+' · '+REN_WINDOW+'-day window · owned by '+uname(owner)+' · requirement carried over · RFQ route',sys:1,kind:'sys'});
  renRfq(l,a,p,orig,at); l.log.unshift({at:at,t:renRfqLogT(l,p),m:renRfqLogM(l),sys:1,kind:'rfq'});
  S.data.lines.push(l);
  return l;
}
function renSweep(fire){
  var made=[];
  S.data.accounts.forEach(function(a){ (a.pols||[]).forEach(function(p){
    /* [stated 24 Sep] a contractual policy never renews — it runs for the length of a contract */
    if(p.issuing||renCancelled(p)||isContractual(p.p)) return;
    var d=calDays(S.now,p.exp); if(d<0||d>REN_WINDOW) return;
    if(renLineOf(p.id)) return;
    var l=renCreate(a,p,S.now); made.push(l); if(fire) fireRules(l);
  }); });
  return made;
}

/* ---------- on the line ---------- */
function renHeadChip(l){ var d=renDays(l), h=renPolHit(l); if(!h) return ''; var b=renBand(renBandKey(d));
  return chip('Renewal · '+(d<0?'expired '+fmtDs(h.p.exp):'expires '+fmtDs(h.p.exp)),renDue(l)?b.tone:'neutral',false,true); }
function renOverview(l){ var h=renPolHit(l); if(!h) return ''; var p=h.p;
  return kv('Renews','<button class="link" data-acctpol="'+h.a.id+'">'+esc(p.id)+'</button><div class="meta">'+esc(renInTx(renDays(l)))+'</div>'); }
function renFlag(l){ var h=renPolHit(l); if(!h||!(h.p.endo>0)) return '';
  return '<div class="mt16">'+note('amber','Changed since it was issued',esc(h.p.id)+' was endorsed '+plural(h.p.endo,'time')+'. The policy record holds the cover as first issued — check the endorsements before quoting. <button class="link" data-acctpol="'+h.a.id+'">Open the policy</button>','alert')+'</div>'; }

/* ---------- the pipeline ---------- */
function renRow(l){
  var h=renPolHit(l), p=h?h.p:null, d=renDays(l), w=actingParty(l), b=renBand(renBandKey(d));
  return '<tr class="row'+(dead(l)?' dim':'')+'" data-go="line" data-id="'+l.id+'">'+
    '<td class="nm">'+esc(l.product)+'<div class="sub">'+esc(l.id)+' · '+esc(l.stage<=5?('RFQ'+(renRfqSrc(l)==='carry'?' carried over':' to fill')):'RFQ with placement')+'</div></td>'+
    '<td>'+esc(shortName(acctName(l)))+'</td>'+
    '<td><span class="mono">'+esc(p?p.id:'—')+'</span><div class="sub">'+esc(p?p.ins:'')+(p&&p.endo?' · <span class="amber">endorsed '+plural(p.endo,'time')+'</span>':'')+'</div></td>'+
    '<td style="white-space:nowrap">'+esc(p?fmtD(p.exp):'—')+'<div class="sub '+(renDue(l)&&(b.tone==='red'||b.tone==='amber')?b.tone:'')+'">'+esc(renInTx(d))+'</div></td>'+
    '<td>'+chip(dead(l)?statusTx(l):stageName(l.stage),dead(l)?'red':(l.stage>=SALES_STAGES?'green':'neutral'),true,true)+'</td>'+
    '<td>'+chip(w,waitTone(w),false,true)+'</td>'+
    '<td class="num">'+(p?INR(p.pr):'—')+'</td></tr>';
}
function renTable(rows){
  return '<div class="tw"><table class="t"><thead><tr><th>Renewal</th><th>Account</th><th>Expiring policy</th><th>Expires</th><th>Stage</th><th>Waiting on</th><th class="num">Expiring premium</th></tr></thead><tbody>'+rows.map(renRow).join('')+'</tbody></table></div>';
}
SCREENS.renewals=function(){
  var u=me(); if(u.role!=='rm'&&u.role!=='rmhead') return {sc:'Renewals', html:empty('lock','For relationship managers','The renewals pipeline lists the policies due for renewal on an RM’s accounts.','<button class="btn" data-back="1">'+ic('arrowleft')+'Go back</button>')};
  var all=renLines(u.id), f=S.ui.rnf||'due', sel=S.ui.rnb||'';
  var byExp=function(x,y){ var a=renPolHit(x), b=renPolHit(y); return (a?a.p.exp:0)-(b?b.p.exp:0); };
  var due=all.filter(renDue).sort(byExp), renewed=all.filter(function(l){ return !dead(l)&&l.stage>=SALES_STAGES; }).sort(byExp), lost=all.filter(dead).sort(byExp);
  var grp={}; REN_BANDS.forEach(function(b){ grp[b.k]=[]; }); due.forEach(function(l){ grp[renBandKey(renDays(l))].push(l); });
  var bands='<div class="tiles six">'+REN_BANDS.map(function(b){ var ls=grp[b.k], prem=ls.reduce(function(s,l){ var h=renPolHit(l); return s+(h?h.p.pr:0); },0);
    return '<button class="tile '+b.tone+(sel===b.k?' on':'')+'" data-uiset="rnb" data-uv="'+(sel===b.k?'':b.k)+'"><div class="n"><b>'+ls.length+'</b>'+esc(b.t)+'</div><div class="r"><span class="meta">'+(ls.length?INR(prem)+' expiring':esc(b.g))+'</span></div></button>'; }).join('')+'</div>';
  var body;
  if(f==='due'){
    var shown=REN_BANDS.filter(function(b){ return (!sel||sel===b.k)&&grp[b.k].length; });
    body=shown.length?shown.map(function(b){ return '<section class="card" style="overflow:hidden"><div class="cardh"><span class="t">'+esc(b.t)+'</span>'+chip(grp[b.k].length,b.tone,false,true)+'<span class="sp"></span><span class="s">'+esc(b.g)+'</span></div>'+renTable(grp[b.k])+'</section>'; }).join('')
      : '<div class="card">'+empty('calendar',sel?'Nothing '+renBand(sel).t.toLowerCase():'Nothing due for renewal','Every policy on your accounts expiring in the next '+REN_WINDOW+' days gets a renewal line here, opened by the system.',sel?'<button class="btn" data-uiset="rnb" data-uv="">Show every group</button>':'')+'</div>';
  } else {
    var ls=f==='renewed'?renewed:lost;
    body='<section class="card" style="overflow:hidden">'+(ls.length?renTable(ls):empty('calendar',f==='renewed'?'Nothing renewed yet':'Nothing lost','A renewal counts as renewed once it is paid, and as not renewed when the line is closed as Lost or No Appetite.'))+'</section>';
  }
  var html='<div class="hdrow"><div><div class="h1">Renewals</div><div class="sub">Every policy on your accounts that expires in the next '+REN_WINDOW+' days has a renewal line, opened by the system '+REN_WINDOW+' days out. It starts at Details Captured with the requirement carried over. <b>Every renewal is an RFQ line</b> — there is no rater route at renewal, so last year’s RFQ is carried over where there is one, and otherwise a new one opens to fill. Contractual policies — Workmen’s Compensation, Contractors All Risk, Erection All Risk — never appear here.</div></div></div>'+diamonds()+
    bands+
    '<div class="flex wrap mt16" style="gap:10px">'+pills('rnf',f,[['due','Due in '+REN_WINDOW+' days',due.length],['renewed','Renewed',renewed.length],['lost','Not renewed',lost.length]])+(sel&&f==='due'?'<button class="btn ghost sm" data-uiset="rnb" data-uv="">Show every group</button>':'')+'</div>'+
    '<div class="gap12 mt16">'+body+'</div>';
  return {sc:'Renewals', html:html, cta:''};
};
HANDLERS.push(function(t){
  var x=t.closest('[data-acctpol]'); if(!x) return false;
  S.ui['atab_'+x.dataset.acctpol]='policies'; go('acct',{id:x.dataset.acctpol}); return true;
});
