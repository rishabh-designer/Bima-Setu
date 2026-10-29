/* ==================================================================== *
 *  [stated 29 Oct] Overview: "Sold" is now "Payment details", and it shows
 *  what the client was sent — the payment link, the NEFT / RTGS details or
 *  the proforma invoice — once Ops returns them (or the insurer's link on
 *  the instant route).
 * ==================================================================== */
function payAcctNo(l){ var n=(l.id.replace(/\D/g,'')+'0000').slice(0,4); return '5020 0'+n.slice(0,3)+' '+n.slice(3)+'731'; }
payDetails=(function(p0){ return function(l){ return p0(l).map(function(r){ return r[0]==='Account number'?[r[0],'<span class="mono">'+esc(payAcctNo(l))+'</span>']:r; }); }; })(payDetails);
function payDetailsSub(l){ var inst=isChola(l)||l.route==='INSTANT', rows=[], note='', mode='';
  var copy=function(t){ return ' <button type="button" class="link" data-paycopy="'+esc(t)+'">Copy</button>'; };
  var DROP={'Reference to quote':1,'Amount':1,'From':1};
  if(inst){ mode='Payment link';
    if(l.chola&&l.chola.link){ var exp=typeof cholaLinkExpired==='function'&&cholaLinkExpired(l);
      rows.push(['Payment link','<span class="mono">'+esc(l.chola.link)+'</span>'+copy(l.chola.link)+(exp?' '+chip('Expired','red',false,true):'')]); }
    else note='The insurer’s payment link appears here once it is generated.'; }
  else if(l.pay==='cheque'){ mode='Cheque'; rows=payDetails(l); }
  else if(l.pay==='back'||l.pay==='shared'||l.pay==='paid'||(l.stage>=11&&l.pay&&l.pay!=='pre'&&l.pay!=='ticket')){ mode=payModeOf(l);
    rows=payDetails(l).map(function(r){ var k=r[0];
      if(k==='Payment link'){ var url='https://pay.'+payInsurer(l).toLowerCase().replace(/[^a-z]+/g,'')+'.com/bk/'+l.id.toLowerCase(); return ['Payment link','<span class="mono">'+esc(url)+'</span>'+copy(url)]; }
      if(k==='Proforma invoice') return ['Proforma invoice','<button type="button" class="link" data-flow="proformaView" data-line="'+l.id+'">'+ic('file','ic14')+' Proforma invoice · '+esc(payInsurer(l))+'.pdf</button>'];
      if(k==='IFSC') return ['IFSC code',r[1]];
      return r; }); }
  else if(l.pay==='ticket') note='With Ops on '+payRef(l)+'. The payment details appear here when Ops closes the ticket — and go to the client by email at the same moment.';
  else note='Raise the payment request to get the payment details from Ops.';
  rows=rows.filter(function(r){ return !DROP[r[0]]; });
  var base=[['Insurer',esc(l.picked||l.ins||'—')],['Branch',esc(l.insBranch||'—')],['Premium','<b>'+INR(premOf(l))+'</b>']];
  var sent=(l.payMails||[]), last=sent.slice(-1)[0];
  return '<div class="phhd"><div class="t">Payment details'+(mode&&rows.length?' <span class="meta">· '+esc(mode)+'</span>':'')+'</div></div>'+
    '<div class="kvgrid mt12">'+base.concat(rows).map(function(r){ return kv(r[0],r[1]); }).join('')+'</div>'+
    (!rows.length&&note?'<div class="meta mt8">'+esc(note)+'</div>':''); }
HANDLERS.push(function(t){ var x=t.closest('[data-paycopy]'); if(!x) return false; try{ if(navigator.clipboard) navigator.clipboard.writeText(x.dataset.paycopy).catch(function(){}); }catch(e){} toast('Copied',x.dataset.paycopy); return true; });
FLOWS.proformaView={t:'Proforma invoice', sub:function(){ var l=FL(); return payInsurer(l)+' · '+l.product; }, wide:true, nocancel:function(){ return false; },
  body:function(){ var l=FL(), a=acctOf(l), amt=l.amt||premOf(l);
    return '<div class="mailprev"><div class="h4">'+esc(payInsurer(l))+' — Proforma invoice</div><div class="meta">Ref Q-'+esc(l.id.slice(3))+'-26 · issued '+esc(fmtD(S.now))+'</div>'+
      '<div class="kvgrid two mt12">'+kv('Billed to',esc(a?a.n:'—'))+kv('Product',esc(l.product))+kv('Premium (incl. GST)','<b>'+INR(amt)+'</b>')+kv('Pay by',esc(fmtD(addWork(S.now,durMins(3,'d')))))+'</div>'+
      '<div class="meta mt12">Returned by Ops on '+esc(payRef(l))+' and emailed to the client with the payment details.</div></div>'; },
  ok:'Close', run:function(){} };

/* ==== ABM (v75) ==== */
(function(){
var T0L=T0.getTime();
var ICONS={
 home:'<path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
 list:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>',
 check:'<path d="M20 6L9 17l-5-5"/>',
 checks:'<path d="M3 7l2 2 4-4M3 15l2 2 4-4M13 6h8M13 14h8"/>',
 x:'<path d="M18 6L6 18M6 6l12 12"/>',
 chevdown:'<path d="M6 9l6 6 6-6"/>',
 chevright:'<path d="M9 6l6 6-6 6"/>',
 arrowright:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
 zap:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 alert:'<path d="M7.9 3h8.2l4.9 4.9v8.2L16.1 21H7.9L3 16.1V7.9z"/><path d="M12 8v5M12 16h.01"/>',
 refresh:'<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
 send:'<path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4z"/>',
 upload:'<path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/>',
 inbox:'<path d="M3 13l2.5-8h13L21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 13h5l2 3h4l2-3h5"/>',
 circlecheck:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
 more:'<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 filter:'<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
 phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z"/>',
 phoneoff:'<path d="M10.7 13.3a16 16 0 0 0 4.6 3.4l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2v2.2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-3.9-3.4M6.5 6.5A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9"/><path d="M2 2l20 20"/>',
 users:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 handshake:'<path d="M11 17l-1-1M13 19l-1-1M15 17l-1-1"/><path d="M2 8l4-4 5 1 3-1 4 4 4 1-3 3-2 2-2 2-2 2-3-3-4-1-2-2z"/>',
 sparkles:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
 logout:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M13 3h6v18h-6"/>',
 building:'<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>',
 ticket:'<path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M13 5v14"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
};
function ic(n,cls){ return '<svg class="'+(cls||'ic16')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICONS[n]||'')+'</svg>'; }
function esc(x){ return String(x==null?'':x).replace(/[&<>"]/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];}); }
function initials(n){ return String(n||'').split(' ').map(function(p){return p[0];}).join('').slice(0,2).toUpperCase(); }
function by(arr,id){ for(var i=0;i<arr.length;i++) if(arr[i].id===id) return arr[i]; return null; }
function plural(n,w){ return n+' '+(n===1?w:(/[^aeiou]y$/.test(w)?w.slice(0,-1)+'ies':w+'s')); }

/* ---------- time: a fixed prototype clock ---------- */
var DAY=86400000;
function NOW(){ return S.now; }
var DAYN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MONN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], MONL=['January','February','March','April','May','June','July','August','September','October','November','December'];
function sameDay(a,b){ a=new Date(a); b=new Date(b); return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
function fmtD(t){ var d=new Date(t); return d.getDate()+' '+MONN[d.getMonth()]+' '+d.getFullYear(); }
function fmtDs(t){ var d=new Date(t); return d.getDate()+' '+MONN[d.getMonth()]; }
function fmtT(t){ var d=new Date(t); return (d.getHours()<10?'0':'')+d.getHours()+':'+(d.getMinutes()<10?'0':'')+d.getMinutes(); }
function fmt(t){ var d=new Date(t), n=S.now;
  if(sameDay(d,n)) return 'today, '+fmtT(t); if(sameDay(d,n-DAY)) return 'yesterday, '+fmtT(t); if(sameDay(d,n+DAY)) return 'tomorrow, '+fmtT(t);
  return DAYN[d.getDay()]+' '+d.getDate()+' '+MONN[d.getMonth()]+', '+fmtT(t); }
function ymd(t){ var d=new Date(t), m=d.getMonth()+1, q=d.getDate(); return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(q<10?'0':'')+q; }
function dtLocal(t){ var d=new Date(t), p=function(n){return (n<10?'0':'')+n;}; return ymd(t)+'T'+p(d.getHours())+':'+p(d.getMinutes()); }
function daysAgo(t){ return Math.floor((S.now-t)/DAY); }
function agoTx(t){ var d=daysAgo(t); if(d<=0) return 'today'; return d===1?'yesterday':d+' days ago'; }
function monthKey(t){ var d=new Date(t); return d.getFullYear()*12+d.getMonth(); }
function monthLbl(k){ return MONL[k%12]+' '+Math.floor(k/12); }
function at(mo,d,h,mi){ return new Date(2026,mo-1,d,h||0,mi||0).getTime(); }
function ago(days,h){ return T0L-(days*24+(h||0))*3600000; }

/* placeholder lists until the ABM team confirms (open points 2 and 3) */
var SOURCES=['LinkedIn','Website','Referral','Event','Database purchase','Cold outreach'];
var INDUSTRIES=['Manufacturing','IT / ITES','Pharma','Logistics','Retail','Construction','Other'];
var OUTREACH=[['call','Call','phone'],['email','Email','mail'],['linkedin','LinkedIn message','send'],['whatsapp','WhatsApp','send']];
var MODES=['Virtual','In-person','Call'];
var CLOSE_REASONS=['Global mandate in place','Existing broker assigned','Not interested in discussion','No current requirements'];
var STEPS=[['prospect','Prospect'],['mql','MQL'],['callsetup','Meeting Set-up'],['sal','Meeting Completed'],['handed','Handed off']];
var BUCKETS={nc:'Not Connected', tp:'Time Pending', ni:'Not Interested'};
function stepIdx(s){ for(var i=0;i<STEPS.length;i++) if(STEPS[i][0]===s) return i; return 0; }
function stepName(s){ return STEPS[stepIdx(s)][1]; }
function P(o){ /* prospect defaults */
  var p={id:o.id, co:o.co, ind:o.ind||'', src:o.src||'', prod:o.prod||'', renew:o.renew||0, owner:o.owner, by:o.by||o.owner, createdAt:o.createdAt||ago(10),
    poc1:o.poc1, poc2:o.poc2||null, stage:o.stage||'prospect', bucket:o.bucket||'', from:o.from||'', dnp:o.dnp||0, tpAt:o.tpAt||0, tpWhy:o.tpWhy||'',
    close:o.close||null, rp:o.rp||'', meet:o.meet||null, resched:o.resched||[], mails:o.mails||[], mom:o.mom||'', handoff:o.handoff||null, log:[], enteredAt:o.enteredAt||o.createdAt||ago(10), via:o.via||'Single add'};
  (o.log||[]).forEach(function(e){ p.log.push({at:e[0],t:e[1],m:e[2]||'',x:e[3]||'',sys:e[4]?1:0}); });
  p.log.sort(function(a,b){return b.at-a.at;});
  return p; }
function abSeedPros(){
  var users=[
   {id:'arjun',  n:'Arjun Mehta',   role:'abm',    title:'ABM executive'},
   {id:'sneha',  n:'Sneha Kapoor',  role:'abm',    title:'ABM executive'},
   {id:'rahul',  n:'Rahul Bhatt',   role:'abm',    title:'ABM executive'},
   {id:'kavya',  n:'Kavya Reddy',   role:'abmmgr', title:'ABM manager'},
   /* the BimaSetu people a handoff can go to */
   {id:'nikhil', n:'Nikhil Sharma', role:'exec', title:'Sales executive · Property & casualty'},
   {id:'aarti',  n:'Aarti Menon',   role:'exec', title:'Sales executive · Property & casualty'},
   {id:'anand',  n:'Anand Kulkarni',role:'exec', title:'Sales executive · Marine & liability'},
   {id:'divya',  n:'Divya Shah',    role:'exec', title:'Sales executive · Employee benefits'},
   {id:'sameer', n:'Sameer Joshi',  role:'exec', title:'Sales executive · Marine & liability'},
   {id:'priya',  n:'Priya Nair',    role:'rm',   title:'Relationship manager'}
  ];
  var c=function(n,m,d,e){ return {n:n,m:m,d:d||'',e:e||''}; };
  var pros=[
   P({id:'PR-1001',co:'Shreeji Polymers Pvt Ltd',ind:'Manufacturing',src:'LinkedIn',prod:'Fire & Special Perils',owner:'arjun',createdAt:ago(0,2),poc1:c('Hemant Patel','9824011203','Director'),via:'Bulk upload',
     log:[[ago(0,2),'Prospect added','Bulk upload · Arjun Mehta','',1]]}),
   P({id:'PR-1002',co:'Coastal Freight Movers',ind:'Logistics',src:'Database purchase',prod:'Marine Cargo',owner:'arjun',createdAt:ago(1),poc1:c('Farhan Shaikh','9930044120','Operations head','farhan@coastalfreight.in'),
     mails:[{dir:'out',at:ago(0,20),from:'Arjun Mehta',to:'farhan@coastalfreight.in',sub:'Marine cargo cover for Coastal Freight Movers',body:'Hi Farhan,\n\nI look after commercial insurance at BimaKavach. We place marine cargo and open covers for freight movers across India. I have attached a short deck. Could we take 15 minutes this week to see if we can help with your next renewal?\n\nRegards,\nArjun Mehta'},{dir:'in',at:ago(0,4),from:'Farhan Shaikh',to:'arjun@bimakavach.com',sub:'Re: Marine cargo cover for Coastal Freight Movers',body:'Thanks Arjun. Our marine open policy renews in January. Call me on Monday after 11.'}],
     log:[[ago(1),'Prospect added','Single add · Arjun Mehta','',1],[ago(0,20),'Outreach · Email','Contacted · Email outreach · Arjun Mehta','Sent the intro deck and asked for a 15-minute call.']]}),
   P({id:'PR-1003',co:'Nandi Agro Foods',ind:'Manufacturing',src:'Event',prod:'Group Health',owner:'arjun',createdAt:ago(3),poc1:c('Lakshmi Gowda','9845120876','HR manager','lakshmi@nandiagro.com'),stage:'mql',enteredAt:ago(1),
     log:[[ago(3),'Prospect added','Single add · Arjun Mehta','',1],[ago(1),'Outreach · Call','Contacted · MQL · Arjun Mehta','140 staff, current GHI renews in March. Wants options with parental cover.'],[ago(1),'Moved to MQL','Prospect → MQL','',1]]}),
   P({id:'PR-1004',co:'Vertex Software Labs',ind:'IT / ITES',src:'LinkedIn',prod:'Cyber Liability',renew:at(1,15),owner:'arjun',createdAt:ago(9),poc1:c('Rohit Saxena','9811204455','CFO','rohit@vertexlabs.io'),poc2:c('Ananya Rao','9811204460','Finance manager','ananya@vertexlabs.io'),
     stage:'callsetup',enteredAt:ago(2),meet:{at:T0L+5*3600000,mode:'Virtual',where:'Google Meet link shared on email'},
     log:[[ago(9),'Prospect added','Single add · Arjun Mehta','',1],[ago(6),'Outreach · LinkedIn message','Contacted · MQL · Arjun Mehta','',0],[ago(6),'Moved to MQL','Prospect → MQL','',1],[ago(2),'Consultation call scheduled','Virtual · '+fmtD(T0L)+' 16:00 · Arjun Mehta','',0],[ago(2),'Moved to Meeting Set-up','MQL → Meeting Set-up','',1]]}),
   P({id:'PR-1005',co:'Gharkul Constructions',ind:'Construction',src:'Referral',prod:'Contractors All Risk',owner:'arjun',createdAt:ago(14),poc1:c('Sandeep Kale','9822300198','Project director','sandeep@gharkul.co.in'),
     stage:'sal',enteredAt:ago(1),meet:{at:ago(1,2),mode:'In-person',where:'Gharkul office, Baner, Pune'},mom:'Two projects starting in December. Needs CAR for both sites and WC for ~220 workers. Existing WC with a local agent renews in Jan. Wants quotes before 15 Nov.',
     log:[[ago(14),'Prospect added','Single add · Arjun Mehta','',1],[ago(11),'Moved to MQL','Prospect → MQL','',1],[ago(7),'Moved to Meeting Set-up','MQL → Meeting Set-up','',1],[ago(1),'Consultation call completed','In-person · Arjun Mehta','Two projects starting in December. Needs CAR for both sites and WC for ~220 workers.'],[ago(1),'Moved to Meeting Completed','Meeting Set-up → Meeting Completed','',1]]}),
   P({id:'PR-1006',co:'Mahalaxmi Textiles',ind:'Manufacturing',src:'Cold outreach',prod:'Fire & Special Perils',owner:'arjun',createdAt:ago(8),poc1:c('Vinod Agarwal','9879002211','Owner'),
     stage:'prospect',bucket:'nc',from:'prospect',dnp:2,enteredAt:ago(1),
     log:[[ago(8),'Prospect added','Bulk upload · Kavya Reddy','',1],[ago(4),'Outreach · Call','Not contacted · Did not answer call · DNP 1','',0],[ago(1),'Outreach · Call','Not contacted · Currently unreachable · DNP 2','',0]]}),
   P({id:'PR-1007',co:'Orbit Pharma Distributors',ind:'Pharma',src:'Website',prod:'Marine Cargo',owner:'arjun',createdAt:ago(20),poc1:c('Deepa Nair','9846077123','Admin head','deepa@orbitpharma.in'),
     stage:'mql',bucket:'ni',from:'mql',dnp:4,enteredAt:ago(2),close:{why:'Not connected after 4 attempts (DNP 4)',note:'Moved automatically after the fourth unanswered attempt',at:ago(2),by:'system'},
     log:[[ago(20),'Prospect added','Single add · Arjun Mehta','',1],[ago(15),'Moved to MQL','Prospect → MQL','',1],[ago(9),'Outreach · Call','Not contacted · Did not answer call · DNP 1'],[ago(6),'Outreach · Call','Not contacted · Did not answer call · DNP 2'],[ago(4),'Outreach · Call','Not contacted · Currently unreachable · DNP 3'],[ago(2),'Outreach · Call','Not contacted · Did not answer call · DNP 4'],[ago(2),'Moved to Not Interested','Not connected after 4 attempts (DNP 4) · automatic','',1]]}),
   P({id:'PR-1008',co:'Kalinga Steel Fabricators',ind:'Manufacturing',src:'Event',prod:'Industrial All Risk',renew:at(3,31),owner:'arjun',createdAt:ago(25),poc1:c('Subrat Mohanty','9437021190','GM Finance','subrat@kalingasteel.com'),
     stage:'prospect',bucket:'tp',from:'prospect',tpAt:at(11,3,10),tpWhy:'Future opportunity',enteredAt:ago(12),
     log:[[ago(25),'Prospect added','Single add · Arjun Mehta','',1],[ago(12),'Outreach · Call','Contacted · Future opportunity · renewal 31 Mar 2027','Current IAR is with a broker until March. Call again in November.'],[ago(12),'Moved to Time Pending','Follow up '+fmtD(at(11,3)),'',1]]}),
   P({id:'PR-1009',co:'Urban Basket Retail',ind:'Retail',src:'LinkedIn',prod:'Burglary',owner:'arjun',createdAt:ago(30),poc1:c('Megha Jain','9920045566','Store operations'),
     stage:'prospect',bucket:'tp',from:'prospect',tpAt:at(12,8,11),tpWhy:'Call later',enteredAt:ago(5),
     log:[[ago(30),'Prospect added','Bulk upload · Arjun Mehta','',1],[ago(5),'Outreach · Call','Contacted · Call later','Asked us to call after Diwali sales.'],[ago(5),'Moved to Time Pending','Follow up '+fmtD(at(12,8)),'',1]]}),
   P({id:'PR-1010',co:'Sai Krupa Hospitals',ind:'Other',src:'Referral',prod:'Professional Indemnity',owner:'arjun',createdAt:ago(18),poc1:c('Dr. Prakash Rao','9880011223','Medical director'),
     stage:'prospect',bucket:'ni',from:'prospect',close:{why:'Existing broker assigned',note:'Group-level broker handles all lines; locked for 3 years.',at:ago(6),by:'arjun'},enteredAt:ago(6),
     log:[[ago(18),'Prospect added','Single add · Arjun Mehta','',1],[ago(6),'Closed · Not interested','Existing broker assigned · Arjun Mehta','Group-level broker handles all lines; locked for 3 years.']]}),
   P({id:'PR-1011',co:'Trident Auto Components',ind:'Manufacturing',src:'Database purchase',prod:'Workmen’s Compensation',owner:'arjun',createdAt:ago(11),poc1:c('Ravi Kumar','9811990022','Plant HR'),
     stage:'prospect',rp:'Contact left company',enteredAt:ago(3),
     log:[[ago(11),'Prospect added','Bulk upload · Kavya Reddy','',1],[ago(3),'Outreach · Call','Contacted · Contact left company · marked To re-prospect','Ravi moved to another firm in September. Need the new HR head.']]}),
   P({id:'PR-1012',co:'Bluewave Aquaculture',ind:'Other',src:'Event',prod:'Marine Cargo',owner:'arjun',createdAt:ago(40),poc1:c('Joseph Thomas','9447011876','Managing partner','joseph@bluewave.in'),
     stage:'handed',enteredAt:ago(16),meet:{at:ago(17),mode:'Virtual',where:'Zoom'},mom:'Exports shrimp to the EU, ~40 shipments a year. Wants an annual open cover.',
     handoff:{at:ago(16),by:'arjun',opps:[{id:'OP-3101',prod:'Marine Cargo',owner:'anand',renew:at(12,31),doc:'Bluewave_marine_policy_2025.pdf',stage:'Quote Requested'}]},
     log:[[ago(40),'Prospect added','Single add · Arjun Mehta','',1],[ago(17),'Consultation call completed','Virtual · Arjun Mehta','Exports shrimp to the EU, ~40 shipments a year.'],[ago(16),'Handed off to Sales','OP-3101 Marine Cargo → Anand Kulkarni','',1]]}),
   /* Sneha's book */
   P({id:'PR-1013',co:'Pinnacle Chemicals Ltd',ind:'Manufacturing',src:'Referral',prod:'Fire & Special Perils',owner:'sneha',createdAt:ago(2),poc1:c('Nitin Desai','9821033450','CFO'),
     log:[[ago(2),'Prospect added','Single add · Sneha Kapoor','',1]]}),
   P({id:'PR-1014',co:'Zenith Data Systems',ind:'IT / ITES',src:'LinkedIn',prod:'Cyber Liability',owner:'sneha',createdAt:ago(6),poc1:c('Pooja Iyer','9886044321','IT director','pooja@zenithdata.in'),stage:'mql',enteredAt:ago(3),
     log:[[ago(6),'Prospect added','Single add · Sneha Kapoor','',1],[ago(3),'Moved to MQL','Prospect → MQL','',1]]}),
   P({id:'PR-1015',co:'Sahyadri Cold Chain',ind:'Logistics',src:'Website',prod:'Marine Cargo',owner:'sneha',createdAt:ago(12),poc1:c('Amit Pawar','9890055321','Owner','amit@sahyadricold.in'),
     stage:'callsetup',enteredAt:ago(4),meet:{at:T0L+DAY+2*3600000,mode:'In-person',where:'Sahyadri office, Chakan'},resched:[{from:ago(1),to:T0L+DAY+2*3600000,at:ago(2)}],
     log:[[ago(12),'Prospect added','Single add · Sneha Kapoor','',1],[ago(4),'Moved to Meeting Set-up','MQL → Meeting Set-up','',1],[ago(2),'Consultation call re-scheduled','Moved to '+fmtD(T0L+DAY)+' 13:00','Client travelling.']]}),
   P({id:'PR-1016',co:'Indus Ceramics',ind:'Manufacturing',src:'Cold outreach',prod:'Burglary',owner:'sneha',createdAt:ago(9),poc1:c('Harshad Shah','9825077001','Partner'),
     stage:'prospect',bucket:'nc',from:'prospect',dnp:1,enteredAt:ago(1),
     log:[[ago(9),'Prospect added','Bulk upload · Sneha Kapoor','',1],[ago(1),'Outreach · Call','Not contacted · Did not answer call · DNP 1']]}),
   P({id:'PR-1017',co:'Greenleaf Organics',ind:'Retail',src:'Event',prod:'Group Health',owner:'sneha',createdAt:ago(22),poc1:c('Ritu Malhotra','9810088776','HR head'),
     stage:'mql',bucket:'tp',from:'mql',tpAt:at(10,26,11),tpWhy:'Call later',enteredAt:ago(4),
     log:[[ago(22),'Prospect added','Single add · Sneha Kapoor','',1],[ago(4),'Outreach · Call','Contacted · Call later','Budget sign-off next week.'],[ago(4),'Moved to Time Pending','Follow up '+fmtD(at(10,26)),'',1]]}),
   /* Rahul's book */
   P({id:'PR-1018',co:'Deccan Precision Tools',ind:'Manufacturing',src:'Database purchase',prod:'Industrial All Risk',owner:'rahul',createdAt:ago(4),poc1:c('Kiran Reddy','9849022334','Director'),
     log:[[ago(4),'Prospect added','Bulk upload · Kavya Reddy','',1]]}),
   P({id:'PR-1019',co:'Metro Edu Services',ind:'Other',src:'Website',prod:'Professional Indemnity',owner:'rahul',createdAt:ago(10),poc1:c('Shalini Gupta','9873301122','Admin manager'),
     stage:'sal',enteredAt:ago(0,3),meet:{at:ago(0,4),mode:'Call',where:'Phone'},mom:'Runs 6 coaching centres. Wants PI and a fire policy for the Noida centre.',
     log:[[ago(10),'Prospect added','Single add · Rahul Bhatt','',1],[ago(0,3),'Consultation call completed','Call · Rahul Bhatt','Runs 6 coaching centres. Wants PI and a fire policy for the Noida centre.'],[ago(0,3),'Moved to Meeting Completed','Meeting Set-up → Meeting Completed','',1]]}),
   P({id:'PR-1020',co:'Royal Spices Exports',ind:'Other',src:'Referral',prod:'Marine Cargo',owner:'rahul',createdAt:ago(16),poc1:c('Imran Qureshi','9867700213','Owner'),
     stage:'prospect',bucket:'ni',from:'prospect',close:{why:'No current requirements',note:'',at:ago(3),by:'rahul'},enteredAt:ago(3),
     log:[[ago(16),'Prospect added','Single add · Rahul Bhatt','',1],[ago(3),'Closed · Not interested','No current requirements · Rahul Bhatt','',0]]})
  ];
  return {users:users, pros:pros};
}
/* ---------- derived state: never stored twice ---------- */
function proById(id){ return by(S.data.pros,id); }
function isClosed(p){ return p.bucket==='ni'; }
function isHanded(p){ return p.stage==='handed'; }
function active(p){ return !isClosed(p)&&!isHanded(p); }
/* where a prospect sits on the home page */
function place(p){ if(p.bucket) return p.bucket; return p.stage; }
function placeName(p){ return p.bucket?BUCKETS[p.bucket]:stepName(p.stage); }
function placeTone(p){ if(p.bucket==='ni') return 'red'; if(p.bucket==='nc') return 'red'; if(p.bucket==='tp') return 'amber'; if(p.stage==='handed') return 'green'; if(p.stage==='sal') return 'violet'; if(p.stage==='callsetup') return 'blue'; return 'neutral'; }
function inScope(p,u){ u=u||me(); return isMgr(u)||p.owner===u.id; }
function myPros(u){ return S.data.pros.filter(function(p){ return inScope(p,u); }); }
function dnpDots(n){ var h='<span class="dnpdots" title="DNP '+n+' of 4">'; for(var i=1;i<=4;i++) h+='<i'+(i<=n?' class="on"':'')+'></i>'; return h+'</span>'; }
function pend(tx,why){ return '<span class="pend" title="'+esc(why||'Default used until the ABM team confirms')+'">'+ic('info','ic14')+esc(tx||'Pending ABM')+'</span>'; }
function logAdd(p,t,m,x,sys){ p.log.unshift({at:S.now,t:t,m:m||uname(S.user),x:x||'',sys:sys?1:0}); }
function moveTo(p,stage){ var was=stepName(p.stage); p.stage=stage; p.bucket=''; p.from=''; p.enteredAt=S.now; logAdd(p,'Moved to '+stepName(stage),was+' → '+stepName(stage),'',1); }
var DNP4_WHY='Not connected after 4 attempts (DNP 4)';
/* [stated 22 Oct] the fourth unanswered attempt moves the prospect to Not Interested */
function addDnp(p,hl,txt,x){ if(p.bucket!=='nc') toBucket(p,'nc'); p.dnp=Math.min(4,p.dnp+1); p.enteredAt=S.now; logAdd(p,'Outreach · '+hl,txt+' · DNP '+p.dnp,x);
  if(p.dnp>=4){ p.bucket='ni'; p.close={why:DNP4_WHY,note:'Moved automatically after the fourth unanswered attempt',at:S.now,by:'system'}; logAdd(p,'Moved to Not Interested',DNP4_WHY+' · automatic','',1); return true; } return false; }
function toBucket(p,b){ if(!p.bucket) p.from=p.stage; p.bucket=b; p.enteredAt=S.now; }
/* the prototype clock: a Time Pending prospect whose date has come moves to Meeting Set-up [spec v2 · decided 22 Oct] */
function sweep(){ var n=0; S.data.pros.forEach(function(p){ if(p.bucket==='tp'&&p.tpAt&&p.tpAt<=S.now){ p.bucket=''; p.from=''; p.stage='callsetup'; p.meet=null; p.enteredAt=S.now; p.tpAt=0;
  p.log.unshift({at:S.now,t:'Moved to Meeting Set-up',m:'Follow-up date reached · Time Pending → Meeting Set-up',x:'',sys:1}); n++; } }); return n; }
function seg(key,opts,dflt){ var cur=S.sel[key]===undefined?dflt:S.sel[key];
  return '<div class="seg">'+opts.map(function(o){ return '<button type="button" data-mset="'+key+'" data-mval="'+esc(o[0])+'"'+(String(cur)===String(o[0])?' class="on"':'')+'>'+esc(o[1])+'</button>'; }).join('')+'</div>'; }

/* ---------- ui primitives (BimaSetu kit) ---------- */
function chip(tx,tone,dot,sm){ return '<span class="chip'+(tone?' '+tone:'')+(sm?' sm':'')+'">'+(dot?'<i class="d"></i>':'')+esc(tx)+'</span>'; }
function kv(k,v){ return '<div class="kv"><div class="lbl">'+esc(k)+'</div><div class="v">'+v+'</div></div>'; }
function field(label,inner,hint,err){ return '<div class="field"><div class="lbl">'+label+'</div>'+inner+(err?'<div class="err">'+esc(err)+'</div>':(hint?'<div class="hint">'+hint+'</div>':''))+'</div>'; }
function input(key,val,ph,extra){ return '<input class="inp" id="f_'+key+'" data-f="'+key+'" value="'+esc(val==null?'':val)+'" placeholder="'+esc(ph||'')+'" autocomplete="off" '+(extra||'')+'>'; }
function select(key,val,opts,extra){ return '<select class="sel" id="f_'+key+'" data-f="'+key+'" '+(extra||'')+'>'+opts.map(function(o){ var v=Array.isArray(o)?o[0]:o, l=Array.isArray(o)?o[1]:o; return '<option value="'+esc(v)+'"'+(String(v)===String(val)?' selected':'')+'>'+esc(l)+'</option>'; }).join('')+'</select>'; }
function note(tone,title,body,icon){ return '<div class="note '+tone+'">'+(title?'<div class="nt">'+ic(icon||(tone==='amber'?'alert':'zap'))+esc(title)+'</div>':'')+body+'</div>'; }
function empty(icon,title,body,action){ return '<div class="empty"><div class="ic">'+ic(icon||'inbox')+'</div><div class="t">'+esc(title)+'</div>'+(body?'<div class="b">'+body+'</div>':'')+(action?'<div class="a">'+action+'</div>':'')+'</div>'; }
function diamonds(grey){ return '<div class="diamonds'+(grey?' grey':'')+'"></div>'; }
function simblock(title,noteTx,btns){ return '<div class="sim"><div class="st">'+ic('zap','ic14')+esc(title||'Simulate an inbound event')+'<span class="tag">Prototype only</span></div>'+(noteTx?'<div class="sn">'+esc(noteTx)+'</div>':'')+'<div class="sb">'+btns+'</div></div>'; }
function simbtn(label,attr){ return '<button class="simbtn" '+attr+'>'+esc(label)+'</button>'; }
function timeblock(noteTx,btns){ return '<div class="timeb"><div class="st">'+ic('clock','ic14')+'Prototype time control</div>'+(noteTx?'<div class="sn">'+esc(noteTx)+'</div>':'')+'<div class="sb">'+btns+'</div></div>'; }
function opt(attr,on,title,sub,sq){ return '<button type="button" class="opt'+(on?' on':'')+(sq?' sq':'')+'" '+attr+'><span class="mk"></span><span class="bd"><b>'+esc(title)+'</b>'+(sub?'<span>'+sub+'</span>':'')+'</span></button>'; }
function pills(key,cur,opts){ return '<div class="pills">'+opts.map(function(o){ return '<button class="pill'+(cur===o[0]?' on':'')+'" data-pill="'+key+'" data-pv="'+esc(o[0])+'"><i class="d"></i>'+esc(o[1])+(o[2]!==undefined?' ('+o[2]+')':'')+'</button>'; }).join('')+'</div>'; }
function avatar(name,sm){ return '<span class="avatar'+(sm?' sm':'')+'" aria-hidden="true">'+esc(initials(name))+'</span>'; }
function zc(title,body,extra){ return '<div class="zc"><div class="zh"><span>'+esc(title)+'</span>'+(extra||'')+'</div>'+body+'</div>'; }
function greetTx(){ var h=new Date(S.now).getHours(); return h<12?'Good morning':(h<17?'Good afternoon':'Good evening'); }
function hSeg(key,cur,opts){ return '<div class="hseg">'+opts.map(function(o){ return '<button class="'+(cur===o[0]?'on':'')+(o[3]?' '+o[3]:'')+'" data-uiset="'+key+'" data-uv="'+esc(o[0])+'">'+esc(o[1])+'<span class="n">'+o[2]+'</span></button>'; }).join('')+'</div>'; }
function hCard(id,tone,icon,title,rows,right,none){ var all=S.ui['hm_'+id], shown=all?rows:rows.slice(0,5);
  return '<section class="hcard" id="h-'+id+'"><div class="hhd"><span class="hic '+tone+'">'+ic(icon)+'</span><span class="t">'+esc(title)+'</span><span class="sp"></span>'+(right||'')+'</div>'+
    (rows.length?shown.join(''):'<div class="hempty">'+esc(none||'Nothing here.')+'</div>')+(rows.length>5?'<button class="hmore" data-uiset="hm_'+id+'" data-uv="'+(all?'':'1')+'">'+(all?'Show fewer':(rows.length-5)+' more')+'</button>':'')+'</section>'; }
function hRow(p,meta,right){ return '<div class="hrow row" data-go="abpro" data-id="'+p.id+'"><div class="bd"><div class="tt">'+esc(p.co)+' <span class="pr">· '+esc(p.poc1.n)+'</span></div><div class="mt">'+meta+'</div></div><div class="rt">'+(right||'')+ic('chevright')+'</div></div>'; }
/* ---------- counts ---------- */
function counts(list){ var c={prospect:0,mql:0,callsetup:0,sal:0,handed:0,nc:0,tp:0,ni:0,d1:0,d2:0,d3:0,d4:0,rp:0};
  list.forEach(function(p){ c[place(p)]++; if(p.bucket==='nc') c['d'+Math.max(1,Math.min(4,p.dnp))]++; if(p.rp&&active(p)) c.rp++; }); return c; }
function tileB(tone,n,label,gloss,key,extra){ return '<button class="tile '+tone+'" data-tilego="'+key+'"><div class="n"><b>'+n+'</b>'+esc(label)+'</div>'+(extra||'')+'<div class="r"><span class="meta">'+esc(gloss)+'</span><span class="go">'+ic('arrowright')+'</span></div></button>'; }
function stageTiles(c,list,who,mid){
  return '<div class="secl">Stages</div><div class="tiles five">'+
    tileB('neutral',c.prospect,'Prospect','added, outreach not landed yet','prospect')+
    tileB('violet',c.mql,'MQL','contacted and qualified','mql')+
    tileB('blue',c.callsetup,'Meeting Set-up','meeting booked','callsetup')+
    tileB('violet',c.sal,'Meeting Completed','meeting done, ready to hand off','sal')+
    tileB('green',c.handed,'Handed off','opportunities created','handed')+'</div>'+
  (mid?'<div class="mt16">'+mid+'</div>':'')+'<div class="secl">Buckets</div>'+bucketBoard(list,who); }
/* buckets as a board: one column per bucket, one card per prospect */
function segBar(n,tot,tone){ var h='<div class="kseg">'; for(var i=1;i<=tot;i++) h+='<i class="'+(i<=n?tone:'')+'"></i>'; return h+'</div>'; }
function kCard(p,top,line,who){ return '<button class="kcard" data-go="abpro" data-id="'+p.id+'">'+top+'<b class="kt">'+esc(p.co)+(p.prod?' <span>· '+esc(p.prod)+'</span>':'')+'</b><div class="kl">'+line+'</div><div class="kf">'+(who?avatar(uname(p.owner),true)+'<span>'+esc(uname(p.owner))+'</span>':ic('user','ic14')+'<span>'+esc(p.poc1.n)+(p.poc1.d?' · '+esc(p.poc1.d):'')+'</span>')+'</div></button>'; }
function bucketBoard(list,who){
  var nc=list.filter(function(p){return p.bucket==='nc';}).sort(function(a,b){ return b.dnp-a.dnp||(a.enteredAt-b.enteredAt); });
  var tp=list.filter(function(p){return p.bucket==='tp';}).sort(function(a,b){ return a.tpAt-b.tpAt; });
  var ni=list.filter(function(p){return p.bucket==='ni';}).sort(function(a,b){ return (b.close?b.close.at:0)-(a.close?a.close.at:0); });
  var d=function(n){ return nc.filter(function(p){ return Math.max(1,Math.min(4,p.dnp))===n; }).length; };
  var col=function(key,title,n,sub,cards,none){ return '<section class="kcol"><button class="kh" data-tilego="'+key+'"><span>'+esc(title)+'</span><b>'+n+'</b></button>'+(sub?'<div class="ksub">'+sub+'</div>':'')+'<div class="kbody">'+(cards||'<div class="kempty">'+esc(none)+'</div>')+'</div></section>'; };
  var tpCards='', lastM=-1; tp.forEach(function(p){ var m=monthKey(p.tpAt); if(m!==lastM){ tpCards+='<div class="kmonth">'+esc(monthLbl(m))+'</div>'; lastM=m; }
    tpCards+=kCard(p,'',ic('clock','ic14')+' Follow up <b>'+esc(fmtDs(p.tpAt))+'</b><div class="kl2">'+esc(p.tpWhy||'Call later')+(p.renew?' · renewal '+esc(fmtD(p.renew)):'')+'</div>',who); });
  return '<div class="board">'+
    col('nc','Not Connected',nc.length,'DNP 1 · '+d(1)+'&nbsp;&nbsp; DNP 2 · '+d(2)+'&nbsp;&nbsp; DNP 3 · '+d(3)+'&nbsp;&nbsp; <span class="red">DNP 4 → Not Interested</span>',
      nc.map(function(p){ return kCard(p,segBar(p.dnp,4,'r'),'<b class="'+(p.dnp>=4?'red':'')+'">DNP '+p.dnp+'</b> · last tried '+esc(agoTx(p.enteredAt))+'<div class="kl2">came from '+esc(stepName(p.from||'prospect'))+'</div>',who); }).join(''),'Nobody waiting on another attempt.')+
    col('tp','Time Pending',tp.length,'month by follow-up date',tpCards,'Nothing parked for later.')+
    col('ni','Not Interested',ni.length,'closed with a reason',ni.map(function(p){ return kCard(p,'',esc(p.close?p.close.why:'Closed')+'<div class="kl2">closed '+esc(p.close?fmtD(p.close.at):'')+'</div>',who); }).join(''),'Nothing closed.')+
  '</div>'; }

/* ---------- home: ABM user ---------- */
function meetMeta(p){ if(!p.meet) return chip('Call not booked yet','amber',true,true)+'<span>back from Time Pending</span>';
  var late=p.meet.at<S.now; return chip((late?'Was ':'')+fmt(p.meet.at),late?'red':(sameDay(p.meet.at,S.now)?'amber':'blue'),true,true)+'<span>'+esc(p.meet.mode)+(p.meet.where?' · '+esc(p.meet.where):'')+'</span>'; }
function homeCards(list,who){
  var calls=list.filter(function(p){ return p.stage==='callsetup'&&!p.bucket; }).sort(function(a,b){ return (a.meet?a.meet.at:0)-(b.meet?b.meet.at:0); });
  var sal=list.filter(function(p){ return p.stage==='sal'&&!p.bucket; });
  var nc=list.filter(function(p){ return p.bucket==='nc'; });
  var dn=S.ui.abhdnp||'d1'; var ncIn=nc.filter(function(p){ return 'd'+Math.max(1,Math.min(4,p.dnp))===dn; });
  if(!ncIn.length&&nc.length){ ['d1','d2','d3','d4'].some(function(k){ var x=nc.filter(function(p){return 'd'+Math.max(1,Math.min(4,p.dnp))===k;}); if(x.length){ dn=k; ncIn=x; return true; } return false; }); }
  var tp=list.filter(function(p){ return p.bucket==='tp'; }).sort(function(a,b){ return a.tpAt-b.tpAt; });
  var months=[]; tp.forEach(function(p){ var k=monthKey(p.tpAt); if(months.indexOf(k)<0) months.push(k); });
  var mk=+(S.ui.abhtpm||0); if(months.indexOf(mk)<0) mk=months[0]||0;
  var rp=list.filter(function(p){ return p.rp&&active(p); });
  var ow=function(p){ return who?'<span>'+esc(uname(p.owner))+'</span>':''; };
  return '<div class="hgap mt16">'+
    hCard('sal','violet','handshake','Ready to hand off',sal.map(function(p){ return hRow(p,chip('Meeting Completed','violet',true,true)+'<span>call done '+esc(agoTx(p.enteredAt))+'</span>'+ow(p),'<button class="tk" data-go="abpro" data-id="'+p.id+'">Hand off</button>'); }),chip(sal.length,'violet',false,true),'Nothing waiting for a handoff.')+
    hCard('calls','blue','calendar','Consultation calls',calls.map(function(p){ return hRow(p,meetMeta(p)+ow(p)); }),chip(calls.length,'blue',false,true),'No consultation calls booked.')+
    hCard('nc','red','phoneoff','Not Connected',ncIn.map(function(p){ return hRow(p,dnpDots(p.dnp)+'<span>DNP '+p.dnp+' · last tried '+esc(agoTx(p.enteredAt))+' · came from '+esc(stepName(p.from||'prospect'))+'</span>'+ow(p)); }),
      hSeg('abhdnp',dn,[['d1','DNP 1',nc.filter(function(p){return p.dnp<=1;}).length],['d2','DNP 2',nc.filter(function(p){return p.dnp===2;}).length],['d3','DNP 3',nc.filter(function(p){return p.dnp===3;}).length],['d4','DNP 4',nc.filter(function(p){return p.dnp>=4;}).length,'red']]),'Nobody is waiting on another attempt.')+
    hCard('tp','amber','clock','Time Pending',tp.filter(function(p){ return monthKey(p.tpAt)===mk; }).map(function(p){ return hRow(p,chip('Follow up '+fmtDs(p.tpAt),'amber',true,true)+'<span>'+esc(p.tpWhy||'Call later')+(p.renew?' · renewal '+esc(fmtD(p.renew)):'')+'</span>'+ow(p)); }),
      months.length?hSeg('abhtpm',String(mk),months.map(function(k){ return [String(k),monthLbl(k),tp.filter(function(p){return monthKey(p.tpAt)===k;}).length]; })):'','Nothing parked for later.')+
    (rp.length?hCard('rp','amber','refresh','To re-prospect',rp.map(function(p){ return hRow(p,chip(p.rp,'amber',true,true)+'<span>find a new point of contact</span>'+ow(p)); }),chip(rp.length,'amber',false,true)):'')+
  '</div>'; }
SCREENS.abhome=function(){
  var u=me(); if(isMgr(u)) return mgrHome(u);
  var list=myPros(u), c=counts(list);
  var html='<div class="hhero"><div class="h1">'+esc(greetTx())+', '+esc(u.n.split(' ')[0])+'</div><span class="hday">'+ic('calendar')+esc(fmt(S.now).replace(/^today, /,'Today · '))+'</span></div>'+
    '<div class="sub">Your prospects, from first outreach to handoff. Every list is on <button class="link" data-go="abpros">Prospects</button>.</div>'+diamonds()+
    stageTiles(c,list,false,hPreTaskCard(u));
  return {sc:'Home', html:html};
};
/* ---------- home: ABM manager — team buckets + a row per ABM user ---------- */
function mgrHome(u){
  var all=S.data.pros, c=counts(all);
  var cols=[['prospect','Prospect'],['mql','MQL'],['callsetup','Meeting Set-up'],['sal','Meeting Completed'],['nc','Not Connected'],['tp','Time Pending'],['ni','Not Interested'],['handed','Handed off']];
  var rows=abmUsers().map(function(x){ var cc=counts(all.filter(function(p){return p.owner===x.id;}));
    return '<tr><td class="nm"><span class="flex">'+avatar(x.n,true)+esc(x.n)+'</span></td>'+cols.map(function(k){ var n=cc[k[0]]; return '<td class="num'+(n?'':' zero')+'">'+(n?'<button data-teamgo="'+k[0]+'" data-owner="'+x.id+'">'+n+'</button>':'0')+'</td>'; }).join('')+'</tr>'; }).join('');
  var tot='<tr><td>Team</td>'+cols.map(function(k){ return '<td class="num">'+c[k[0]]+'</td>'; }).join('')+'</tr>';
  var html='<div class="hhero"><div class="h1">'+esc(greetTx())+', '+esc(u.n.split(' ')[0])+'</div><span class="hday">'+ic('calendar')+esc(fmt(S.now).replace(/^today, /,'Today · '))+'</span></div>'+
    '<div class="sub">The whole ABM team’s prospects. Click a number to open that list; reassign from a prospect’s page.</div>'+diamonds()+
    stageTiles(c,all,true,hPreTaskCard(u))+
    '<div class="secl">By ABM user</div><section class="card" style="overflow:hidden"><div class="tw"><table class="t mgrtable"><thead><tr><th>ABM user</th>'+cols.map(function(k){ return '<th class="num">'+esc(k[1])+'</th>'; }).join('')+'</tr></thead><tbody>'+rows+'</tbody><tfoot>'+tot+'</tfoot></table></div></section>';
  return {sc:'Home', ctx:'Team view', html:html};
}
HANDLERS.push(function(t){ var x=t.closest('[data-tilego]'); if(x){ var k=x.dataset.tilego; if(k==='handed'){ go('abhanded'); return true; } S.ui.abpf=k; S.ui.abpown=''; S.ui.abpdnp=''; go('abpros'); return true; }
  x=t.closest('[data-teamgo]'); if(x){ var k2=x.dataset.teamgo; if(k2==='handed'){ S.ui.abhown=x.dataset.owner; go('abhanded'); return true; } S.ui.abpf=k2; S.ui.abpown=x.dataset.owner; S.ui.abpdnp=''; go('abpros'); return true; } return false; });

/* ---------- prospects list ---------- */
function nextTx(p){
  if(p.stage==='handed') return '<span class="meta">Handed '+esc(fmtD(p.handoff.at))+'</span>';
  if(p.bucket==='ni') return '<span class="meta">'+esc(p.close?p.close.why:'Closed')+'</span>';
  if(p.bucket==='tp') return 'Follow up '+esc(fmtD(p.tpAt));
  if(p.bucket==='nc') return dnpDots(p.dnp)+' <span class="meta">DNP '+p.dnp+'</span>';
  if(p.stage==='callsetup') return p.meet?esc(fmt(p.meet.at))+'<div class="sub">'+esc(p.meet.mode)+'</div>':'<span class="amber">Book the call</span>';
  if(p.stage==='sal') return '<span class="violet b">Hand off</span>';
  if(p.rp) return '<span class="amber">To re-prospect</span>';
  return '<span class="meta">Reach out</span>'; }
SCREENS.abpros=function(){
  var u=me(), mgr=isMgr(u), list=myPros(u), f=S.ui.abpf||'active', q=(S.ui.abpq||'').toLowerCase(), own=S.ui.abpown||'', dn=S.ui.abpdnp||'', src=S.ui.abpsrc||'';
  var c=counts(list), act=list.filter(active).length;
  var rows=list.filter(function(p){
    if(f==='active'&&!active(p)) return false; if(f!=='active'&&f!=='all'&&place(p)!==f) return false;
    if(own&&p.owner!==own) return false; if(f==='nc'&&dn&&String(Math.max(1,Math.min(4,p.dnp)))!==dn) return false; if(src&&p.src!==src) return false;
    if(q&&(p.co+' '+p.id+' '+p.poc1.n+' '+(p.poc2?p.poc2.n:'')+' '+p.prod).toLowerCase().indexOf(q)<0) return false; return true;
  }).sort(function(a,b){ return stepIdx(b.stage)-stepIdx(a.stage)||(b.enteredAt-a.enteredAt); });
  var html='<div class="hdrow"><div><div class="h1">'+(mgr?'Team prospects':'Prospects')+'</div><div class="sub">'+(mgr?'Every prospect the ABM team owns.':'Every prospect you own.')+'</div></div></div>'+diamonds()+
    pills('abpf',f,[['active','Active',act],['prospect','Prospect',c.prospect],['mql','MQL',c.mql],['callsetup','Meeting Set-up',c.callsetup],['sal','Meeting Completed',c.sal],['nc','Not Connected',c.nc],['tp','Time Pending',c.tp],['ni','Not Interested',c.ni],['handed','Handed off',c.handed],['all','All',list.length]])+
    '<div class="flex wrap mt12" style="gap:10px"><input class="inp" id="abpq" data-ui="abpq" style="max-width:280px" placeholder="Company, contact, product or ID" value="'+esc(S.ui.abpq||'')+'">'+
      (f==='nc'?'<select class="sel" id="abpdnp" data-uisel="abpdnp" style="max-width:160px"><option value="">Any DNP</option>'+[1,2,3].map(function(n){ return '<option value="'+n+'"'+(dn===String(n)?' selected':'')+'>DNP '+n+'</option>'; }).join('')+'</select>':'')+
      '<select class="sel" id="abpsrc" data-uisel="abpsrc" style="max-width:200px"><option value="">Any data source</option>'+SOURCES.map(function(s){ return '<option'+(src===s?' selected':'')+'>'+esc(s)+'</option>'; }).join('')+'</select>'+
      (mgr?'<select class="sel" id="abpown" data-uisel="abpown" style="max-width:200px"><option value="">Every ABM user</option>'+abmUsers().map(function(x){ return '<option value="'+x.id+'"'+(own===x.id?' selected':'')+'>'+esc(x.n)+'</option>'; }).join('')+'</select>':'')+
      (q||own||dn||src?'<button class="btn ghost sm" data-abclearpf="1">Clear filters</button>':'')+'</div>'+
    '<div class="card mt16" style="overflow:hidden">'+(rows.length?'<div class="tw"><table class="t"><thead><tr><th>Prospect</th><th>Company</th><th>Where it is</th><th>Next</th><th>Data source</th>'+(mgr?'<th>Owner</th>':'')+'<th>Since</th></tr></thead><tbody>'+
      rows.map(function(p){ return '<tr class="row'+(isClosed(p)?' dim':'')+'" data-go="abpro" data-id="'+p.id+'"><td class="id">'+esc(p.id)+'<div class="sub" style="color:var(--ink);font-weight:500">'+esc(p.prod||'Product not known')+'</div></td>'+
        '<td class="nm one" title="'+esc(p.co)+'">'+esc(p.co)+'<div class="sub">'+esc(p.poc1.n)+(p.poc1.d?' · '+esc(p.poc1.d):'')+'</div></td>'+
        '<td>'+chip(placeName(p),placeTone(p),true,true)+(p.bucket?'<div class="sub">from '+esc(stepName(p.from||'prospect'))+'</div>':'')+(p.rp&&active(p)?'<div class="sub amber">To re-prospect</div>':'')+'</td>'+
        '<td>'+nextTx(p)+'</td><td>'+esc(p.src||'—')+'</td>'+(mgr?'<td class="one">'+esc(uname(p.owner))+'</td>':'')+'<td>'+esc(agoTx(p.enteredAt))+'</td></tr>'; }).join('')+'</tbody></table></div>'
      : empty('filter','No prospect matches','Change the tab or clear a filter. New prospects come from <b>Add prospect</b> or <b>Bulk upload</b>.','<button class="btn" data-abclearpf="1">Clear filters</button>'))+'</div>';
  return {sc:mgr?'Team prospects':'Prospects', html:html};
};
HANDLERS.push(function(t){ if(t.closest('[data-abclearpf]')){ S.ui.abpq='';S.ui.abpown='';S.ui.abpdnp='';S.ui.abpsrc=''; paint(); return true; } return false; });

/* ---------- handed off: the opportunities ABM created, read-only ---------- */
SCREENS.abhanded=function(){
  var u=me(), mgr=isMgr(u), own=S.ui.abhown||'';
  var rows=[]; myPros(u).forEach(function(p){ if(p.handoff&&(!own||p.owner===own)) p.handoff.opps.forEach(function(o){ rows.push({p:p,o:o}); }); });
  rows.sort(function(a,b){ return b.p.handoff.at-a.p.handoff.at; });
  var html='<div class="hdrow"><div><div class="h1">Handed off</div><div class="sub">Opportunities '+(mgr?'the ABM team':'you')+' created at handoff. You can follow them here; Sales or the RM works them in BimaSetu.</div></div></div>'+diamonds()+
    (mgr?'<div class="flex wrap" style="gap:10px"><select class="sel" id="abhown" data-uisel="abhown" style="max-width:220px"><option value="">Every ABM user</option>'+abmUsers().map(function(x){ return '<option value="'+x.id+'"'+(own===x.id?' selected':'')+'>'+esc(x.n)+'</option>'; }).join('')+'</select></div>':'')+
    '<div class="card mt16" style="overflow:hidden">'+(rows.length?'<div class="tw"><table class="t"><thead><tr><th>Opportunity</th><th>Company</th><th>Stage in BimaSetu</th><th>Owner</th><th>Sourced by ABM</th><th>Handed</th></tr></thead><tbody>'+
      rows.map(function(r){ return '<tr class="row" data-go="abpro" data-id="'+r.p.id+'"><td class="id">'+esc(r.o.id)+'<div class="sub" style="color:var(--ink);font-weight:500">'+esc(r.o.prod)+'</div></td><td class="nm one">'+esc(r.p.co)+'</td><td>'+abLiveStage(r.o)+'</td><td>'+esc(uname(r.o.owner))+'<div class="sub">'+esc((by(S.data.users,r.o.owner)||{}).role==='rm'?'RM':'Sales')+'</div></td><td>'+esc(uname(r.p.owner))+'</td><td>'+esc(fmtD(r.p.handoff.at))+'</td></tr>'; }).join('')+'</tbody></table></div>'
      : empty('handshake','Nothing handed off yet','A prospect reaches Meeting Completed after its consultation call. Hand it off from there and its opportunities appear here.'))+'</div>';
  return {sc:'Handed off', html:html};
};
function canWork(p,u){ u=u||me(); return !!u && p.owner===u.id && !isHanded(p); }
function stageTrack(p){
  var cur=stepIdx(p.stage);
  var cap=p.bucket?BUCKETS[p.bucket]+' · came from '+stepName(p.from||p.stage):(p.stage==='handed'?'Handed off to Sales or RM':stepName(p.stage));
  var side=p.stage==='handed'?plural(p.handoff.opps.length,'opportunity')+' created':(p.bucket==='nc'?'DNP '+p.dnp+' of 4':(p.bucket==='tp'?'Follow up '+fmtD(p.tpAt):(p.bucket==='ni'?(p.close?p.close.why:''):'Owner '+uname(p.owner))));
  var steps=STEPS.map(function(s,i){ var c='step'; if(i<cur||(p.stage==='handed'&&i===cur)) c+=' done'; else if(i===cur) c+=(p.bucket?' now dead':' now'); return '<div class="'+c+'"><div class="b"></div><div class="t">'+esc(s[1])+'</div></div>'; }).join('');
  var bk=['nc','tp','ni'].map(function(k){ return '<span class="bk'+(p.bucket===k?' on'+(k==='tp'?'':' red'):'')+'">'+esc(BUCKETS[k])+(k==='nc'&&p.bucket==='nc'?' · DNP '+p.dnp:'')+'</span>'; }).join('');
  return '<div class="stagecard"><div class="cap"><b>'+esc(cap)+'</b><span class="sp"></span><span class="meta">'+esc(side)+'</span></div>'+
    '<div class="track"><div class="phase sales solo"><div class="ph-h">ABM <b>'+esc(uname(p.owner))+'</b></div><div class="abmtrack">'+steps+'</div></div></div>'+
    '<div class="bucketbar"><span>Buckets</span>'+bk+'</div></div>'; }
function nextAction(p){
  if(isHanded(p)) return {tone:'green',lab:'Handed off',txt:plural(p.handoff.opps.length,'opportunity')+' with Sales or the RM',why:'Each one starts at New Lead in BimaSetu. You can follow them on the Handoff tab.',acts:[]};
  if(p.bucket==='ni') return {tone:'neutral',lab:'Closed',txt:p.close?p.close.why:'Not interested',why:(p.close&&p.close.note?p.close.note+' · ':'')+'Closed '+(p.close?fmtD(p.close.at):''),acts:[['reopen','Reopen']]};
  if(p.bucket==='nc') return {tone:'red',lab:'Not Connected · DNP '+p.dnp,txt:'Try again',why:'Last attempt '+agoTx(p.enteredAt)+'. Each unanswered attempt adds one DNP; the fourth (DNP 4) moves it to Not Interested.',acts:[['call','Call'],['email','Email'],['attempt','Log another attempt'],['close','Close as not interested']]};
  if(p.bucket==='tp') return {tone:'amber',lab:'Time Pending',txt:'Follow up on '+fmtD(p.tpAt),why:(p.tpWhy||'Call later')+'. On that date it moves to Meeting Set-up by itself.',acts:[['tpNow','Move to Meeting Set-up now'],['tpEdit','Change the follow-up date']]};
  if(p.rp) return {tone:'amber',lab:'To re-prospect',txt:'Find a new point of contact',why:p.rp+'. Outreach is paused until you add the new contact details; it then comes back as a new prospect.',acts:[['newPoc','Add contact details']]};
  if(p.stage==='prospect') return {tone:'neutral',lab:'Next action',txt:'Reach out to '+p.poc1.n,why:'Call, email, LinkedIn or WhatsApp. Record what happened, and the prospect moves on its own.',acts:[['call','Call'],['email','Email'],['outreach','Log outreach']]};
  if(p.stage==='mql') return {tone:'violet',lab:'Next action',txt:'Schedule the consultation',why:'Contacted and qualified. Schedule it straight away if you already have a date and time, or call '+p.poc1.n+' to follow up.',two:1,acts:[['call','Follow-up call'],['book','Schedule consultation'],['email','Email'],['outreach','Log outreach']]};
  if(p.stage==='callsetup'&&!p.meet) return {tone:'amber',lab:'Next action',txt:'Book the consultation call',why:'Back from Time Pending, or reopened. Agree a time with '+p.poc1.n+'.',acts:[['book','Book the call'],['call','Call'],['email','Email']]};
  if(p.stage==='callsetup') return {tone:'blue',lab:'Consultation call',txt:fmt(p.meet.at)+' · '+p.meet.mode,why:(p.meet.where||'')+(p.resched.length?' · rescheduled '+plural(p.resched.length,'time'):''),acts:[['callout','Record the call outcome'],['call','Call'],['email','Email'],['resched','Reschedule']]};
  if(p.stage==='sal') return {tone:'violet',lab:'Next action',txt:'Hand it off to Sales or an RM',why:'The call is done. Pick the products and an owner for each; one opportunity is created per product.',acts:[['handoff','Hand off']]};
  return {tone:'neutral',lab:'Next action',txt:'—',acts:[]}; }
function naCard(p){
  var na=nextAction(p), mine=canWork(p)||(p.bucket==='ni'&&p.owner===S.user), prim=na.acts[0], prim2=na.two?na.acts[1]:null, secs=na.acts.slice(na.two?2:1);
  var b=function(x,cls){ return '<button class="btn '+cls+'" data-flow="ab_'+x[0]+'" data-id="'+p.id+'">'+esc(x[1])+'</button>'; };
  var foot='';
  if(mine&&prim) foot='<div class="acts">'+(prim2?'<div class="two2">'+b(prim,'primary lg')+b(prim2,'primary lg')+'</div>':b(prim,'primary lg full'))+(secs.length?'<div class="sec">'+secs.map(function(x){return b(x,'sm');}).join('')+'</div>':'')+'</div>';
  else if(prim&&!mine) foot='<div class="acts"><div class="w">'+(isMgr()?'Only the owner works this prospect. You can reassign it.':'Only '+esc(uname(p.owner))+' works this prospect.')+'</div>'+(isMgr()?'<button class="btn sm" data-flow="ab_reassign" data-id="'+p.id+'">Reassign</button>':'')+'</div>';
  return '<div class="na '+na.tone+'"><div class="k">'+esc(na.lab)+(na.pend?' '+pend('Pending ABM','After DNP 4 the prospect stays in Not Connected. The ABM team has not confirmed this rule yet (open point 1).'):'')+'</div><div class="i">'+esc(na.txt)+'</div>'+(na.why?'<div class="w">'+esc(na.why)+'</div>':'')+foot+'</div>'; }
function pocBlock(c,label){ return '<div class="zkv"><span>'+esc(label)+'</span><b>'+esc(c.n)+'</b>'+(c.d?' <span class="meta">· '+esc(c.d)+'</span>':'')+'<div class="meta">'+esc([c.m,c.e].filter(Boolean).join(' · ')||'—')+'</div></div>'; }
function lwLeft(p){
  var mine=canWork(p);
  var acc=zc('Company & contacts','<div class="zname">'+esc(p.co)+'</div><div class="zchips">'+(p.ind?chip(p.ind,'neutral',false,true):'')+(p.src?chip(p.src,'neutral',false,true):'')+'</div>'+
    pocBlock(p.poc1,'Primary POC')+(p.poc2?pocBlock(p.poc2,'Secondary POC'):'<div class="zkv"><span>Secondary POC</span><b class="meta" style="font-weight:400">Not added</b></div>'),
    mine?'<button class="link" data-flow="ab_editPoc" data-id="'+p.id+'">'+(p.poc2?'Edit':'Add secondary')+'</button>':'');
  return acc+'<div id="nacard">'+naCard(p)+'</div>'+preTaskCard(p); }
function simsFor(p){ return ''; }
SCREENS.abpro=function(){
  var p=proById(S.route.id); if(!p) return {sc:'Prospect',html:empty('search','Prospect not found','It may have been reset.','<button class="btn" data-go="abpros">Open prospects</button>')};
  var u=me(); if(!inScope(p,u)) return {sc:'Prospect',html:empty('lock','Not your prospect','It belongs to '+esc(uname(p.owner))+'. Ask your ABM manager to reassign it.')};
  var tab=S.ui['abptab_'+p.id]||(isHanded(p)?'handoff':'overview');
  var tabs=[['overview','Overview'],['activity','Activity'],['mail','Mail trail'+(p.mails.length?' ('+p.mails.length+')':'')]].concat(isHanded(p)?[['handoff','Handed off']]:[]);
  if(!tabs.some(function(t){return t[0]===tab;})) tab='overview';
  var body='';
  if(tab==='overview'){
    body='<div class="phhd"><div class="t">Captured when added</div><div class="a">Added <b>'+esc(fmtD(p.createdAt))+'</b> · '+esc(p.via)+'</div></div><div class="kvgrid mt12">'+
      kv('Company',esc(p.co))+kv('Industry',esc(p.ind||'—'))+kv('Data source',esc(p.src||'—'))+kv('Product of interest',esc(p.prod||'—'))+kv('Renewal date',p.renew?esc(fmtD(p.renew)):'—')+kv('Owner',esc(uname(p.owner)))+'</div>'+
      (p.meet||p.resched.length||p.mom?diamonds(true):'')+
      (p.meet?'<div class="meetcard">'+'<div class="k">'+(p.stage==='callsetup'?'Consultation call booked':'Consultation call')+'</div><div class="v">'+esc(fmt(p.meet.at))+'</div><div class="m">'+esc(p.meet.mode)+(p.meet.where?' · '+esc(p.meet.where):'')+'</div></div>':'')+
      (p.resched.length?'<div class="mt12"><div class="lbl">Reschedule history</div><ul class="tl">'+p.resched.slice().reverse().map(function(r){ return '<li><span class="dot sys"></span><div class="bd"><b>'+esc(fmt(r.from))+' → '+esc(fmt(r.to))+'</b><div class="m">changed '+esc(fmt(r.at))+(r.why?' · '+esc(r.why):'')+'</div></div></li>'; }).join('')+'</ul></div>':'')+
      (p.mom?'<div class="mt12"><div class="lbl">Meeting notes (minutes of meeting)</div><div class="body mt8" style="color:var(--ink)">'+esc(p.mom)+'</div></div>':'');
  } else if(tab==='mail'){ body=mailTab(p);
  } else if(tab==='activity'){
    body='<div class="phhd"><div class="t">Activity</div><div class="a">newest first</div></div><ul class="tl mt8">'+p.log.map(function(e){ return '<li><span class="dot'+(e.sys?' sys':'')+'"></span><div class="bd"><b>'+esc(e.t)+'</b><div class="m">'+esc(e.m)+' · '+esc(fmt(e.at))+'</div>'+(e.x?'<div class="x">'+esc(e.x)+'</div>':'')+'</div></li>'; }).join('')+'</ul>';
  } else {
    var h=p.handoff;
    body='<div class="phhd"><div class="t">Handoff</div><div class="a">'+esc(fmtD(h.at))+' by <b>'+esc(uname(h.by))+'</b></div></div>'+
      '<div class="handbox mt12"><b>'+plural(h.opps.length,'opportunity')+' created on '+esc(p.co)+'</b><div class="meta">Each started at New Lead. “Sourced by ABM: '+esc(uname(p.owner))+'” is stored on every one. This view is read-only.</div></div>'+
      '<div class="mt12" style="border:1px solid var(--border);border-radius:12px;overflow:hidden"><div class="tw"><table class="t"><thead><tr><th>Opportunity</th><th>Owner</th><th>Stage in BimaSetu</th><th>Renewal date</th><th>Existing policy</th></tr></thead><tbody>'+
      h.opps.map(function(o){ return '<tr><td class="id">'+esc(o.id)+'<div class="sub" style="color:var(--ink);font-weight:500">'+esc(o.prod)+'</div></td><td>'+esc(uname(o.owner))+'<div class="sub">'+esc((by(S.data.users,o.owner)||{}).role==='rm'?'RM':'Sales')+'</div></td><td>'+abLiveStage(o)+'</td><td>'+(o.renew?esc(fmtD(o.renew)):'—')+'</td><td>'+(o.doc?'<span class="flex">'+ic('file','ic14')+esc(o.doc)+'</span>':'<span class="meta">Not uploaded</span>')+'</td></tr>'; }).join('')+'</tbody></table></div></div>'+
      (h.poc?'<div class="kvgrid mt16">'+kv('POC on the opportunities',esc(h.poc.n))+kv('Mobile',esc(h.poc.m))+kv('Email',esc(h.poc.e))+(h.poc2?kv('Second contact',esc(h.poc2.n)+' <span class="meta">· '+esc(h.poc2.m)+'</span>'):'')+'</div>':'')+
      (p.mom?'<div class="mt12"><div class="lbl">Meeting notes shared with the owners</div><div class="body mt8" style="color:var(--ink)">'+esc(p.mom)+'</div></div>':'');
  }
  var axes='<div class="axes">'+chip(placeName(p),placeTone(p),true,true)+(p.bucket==='nc'?'<span class="chip sm">'+dnpDots(p.dnp)+' DNP '+p.dnp+'</span>':'')+(p.rp&&active(p)?chip('To re-prospect','amber',false,true):'')+
    (active(p)?chip(plural(daysAgo(p.enteredAt),'day')+' here','neutral',false,true):'')+(p.prod?chip(p.prod,'neutral',false,true):'')+'</div>';
  var banners=(p.bucket==='tp'?'<div class="banner amber mt12">'+ic('clock','ic14')+'<span><b>Time Pending</b> until '+esc(fmtD(p.tpAt))+' · '+esc(p.tpWhy||'Call later')+'. On that date it moves to Meeting Set-up.</span></div>':'')+
    (p.bucket==='ni'?'<div class="banner red mt12">'+ic('lock','ic14')+'<span><b>Closed · Not interested</b> — '+esc(p.close?p.close.why:'')+'. Reopen it to work it again.</span></div>':'')+
    (isHanded(p)?'<div class="banner green mt12">'+ic('circlecheck','ic14')+'<span><b>Handed off</b> on '+esc(fmtD(p.handoff.at))+'. The prospect is read-only now; follow the opportunities on the Handoff tab.</span></div>':'');
  var html='<div class="lhd"><div class="crumbs"><button data-go="abpros">'+(isMgr()?'Team prospects':'Prospects')+'</button>'+ic('chevright','ic14')+'<b>'+esc(p.co)+'</b></div>'+
    '<div class="hdrow"><div style="min-width:0"><div class="h1">'+esc(p.co)+'</div><div class="metaline"><span class="b">'+esc(p.poc1.n)+'</span><span class="sep">·</span><span>'+esc(p.id)+'</span>'+(p.src?'<span class="sep">·</span><span>'+esc(p.src)+'</span>':'')+'</div></div><span class="sp"></span>'+
      '<div class="acts"><span class="ownchip" title="Owner of this prospect">'+avatar(uname(p.owner),true)+esc(uname(p.owner))+'</span>'+(isMgr()&&!isHanded(p)?'<button class="btn sm" data-flow="ab_reassign" data-id="'+p.id+'">Reassign</button>':'')+'</div></div>'+axes+'</div>'+
    banners+'<div class="mt12">'+stageTrack(p)+'</div>'+
    '<div class="lw mt16"><div class="lz lc"><div class="tabs">'+tabs.map(function(t){ return '<button data-uiset="abptab_'+p.id+'" data-uv="'+t[0]+'"'+(tab===t[0]?' class="on"':'')+'>'+t[1]+'</button>'; }).join('')+'</div>'+
    '<div class="pane"><div class="pb">'+body+'</div></div></div>'+
    '<div class="lside"><div class="lz">'+lwLeft(p)+'</div><div class="lz">'+simsFor(p)+'</div></div></div>';
  return {sc:'Prospect', ctx:p.id, html:html};
};
function mobOk(s){ return /^[6-9]\d{9}$/.test(String(s||'').replace(/\s+/g,'')); }
function mailOk(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s||'').trim()); }
function dParse(s){ s=String(s||'').trim(); var m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if(m) return new Date(+m[1],+m[2]-1,+m[3]).getTime(); m=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/); if(m) return new Date(+m[3],+m[2]-1,+m[1]).getTime(); return 0; }
function dtParse(s){ return s?new Date(s).getTime():0; }
function cur(){ return proById(S.sel.id); }
function dateIn(key,val,min){ return '<input class="inp" type="date" id="f_'+key+'" data-f="'+key+'" value="'+esc(val||'')+'"'+(min?' min="'+esc(min)+'"':'')+'>'; }
function dtIn(key,val){ return '<input class="inp" type="datetime-local" id="f_'+key+'" data-f="'+key+'" value="'+esc(val||'')+'" min="'+esc(dtLocal(S.now))+'">'; }
function modeBlock(){ var m=S.sel.mode||'Virtual', p=cur(), mob=p&&p.poc1?p.poc1.m:'';
  if(S.sel._wm===undefined){ S.sel._wm=m; if(m==='Call'&&!S.sel.where) S.sel.where=mob; }
  else if(S.sel._wm!==m){ S.sel._wm=m; S.sel.where=m==='Call'?mob:''; }
  return field('Mode',seg('mode',MODES.map(function(x){return [x,x];}),'Virtual'))+field(m==='In-person'?'Location':(m==='Virtual'?'Meeting link or platform':'Number to call'),input('where',S.sel.where,m==='In-person'?'Office address':(m==='Virtual'?'Google Meet, Zoom, Teams':'Mobile number')),m==='Call'?'Primary POC’s number. Change it if they want a different one.':''); }
function noteIn(){ return field('Notes — optional','<textarea class="inp" id="f_x" data-f="x" placeholder="What was said">'+esc(S.sel.x||'')+'</textarea>'); }
function pickList(key,items,cur2){ return items.map(function(o){ return opt('data-mset="'+key+'" data-mval="'+esc(o[0])+'"',cur2===o[0],o[1],o[2]||''); }).join(''); }
function futureOk(v){ return !!v && v>S.now; }

/* ---------- log outreach (Prospect and MQL) — the ABM team's disposition lists ---------- */
var DISP={
 prospect:{
  contacted:[['followup','Follow-up','Stays in Prospect'],['torp','To re-prospect','Pick the reason · find a new point of contact'],['later','Call later','Time Pending, with a follow-up date'],['future','Future opportunity','Time Pending · capture the renewal date'],['mql','MQL','Contacted and qualified → MQL']],
  not:[['unreach','Currently unreachable','Not Connected · adds a DNP'],['dna','Did not answer call','Not Connected · adds a DNP'],['invalid','Invalid or wrong contact number','To re-prospect'],['torp','To re-prospect','Find a new point of contact']]},
 mql:{
  contacted:[['mqlfu','MQL follow-up','Stays in MQL'],['sched','Consultation call scheduled','Capture the meeting date → Meeting Set-up']],
  not:[['unreach','Currently unreachable','Not Connected · adds a DNP'],['dna','Did not answer call','Not Connected · adds a DNP']]}
};
var RP_WHY=['POC not found','Wrong point of contact','Contact left company'];
var RP_TX={notfound:'POC not found',wrongpoc:'Wrong point of contact',left:'Contact left company',torp:'To re-prospect',invalid:'Invalid or wrong contact number'};
function dispLabel(st,oc,d){ var l=(DISP[st]||{})[oc]||[]; for(var i=0;i<l.length;i++) if(l[i][0]===d) return l[i][1]; return ''; }
FLOWS.ab_outreach={t:function(){ return S.sel.via==='call'?'Call outcome':'Log outreach'; }, locked:function(){ return S.sel.via==='call'; }, sub:function(){ var p=cur(); return p?p.co+' · '+p.poc1.n+' · '+stepName(p.stage):''; }, wide:true,
  body:function(){ var p=cur(), st=p.stage==='mql'?'mql':'prospect', oc=S.sel.oc||'', d=S.sel.d||'';
    var ocs=[['contacted','Contacted',''],['not','Not contacted','']]; if(st==='prospect') ocs.push(['ni','Not interested','Close with a reason']);
    if(S.sel.ocs) ocs=ocs.filter(function(o){ return S.sel.ocs.indexOf(o[0])>=0; });
    if(ocs.length===1&&!S.sel.oc){ S.sel.oc=ocs[0][0]; oc=S.sel.oc; }
    var h=(S.sel.via==='call'?'<div class="ctcbar '+(S.sel.picked?'green':'neutral')+'">'+ic(S.sel.picked?'phone':'phoneoff','ic16')+'<div><b>'+(S.sel.picked?'Call ended · '+esc(S.sel.dur||'')+' · picked up':'Call ended · not picked up (DNP)')+'</b><span>'+esc(p.poc1.n)+' · '+esc(p.poc1.m)+' · placed through Ozonetel</span></div></div>'
        :field('Mode',seg('how',OUTREACH.filter(function(o){return o[0]!=='call';}).map(function(o){return [o[0],o[1]];}),'linkedin'),'Calls are logged from the Call button. Recorded on every attempt, so outreach by channel can be reported.'))+
      (ocs.length>1?field('What happened',seg('oc',ocs.map(function(o){return [o[0],o[1]];}),'')):'');
    if(oc==='ni'){ h+=field('Close reason',pickList('d',CLOSE_REASONS.map(function(r){return [r,r];}),d)); }
    else if(oc){ h+=field('Disposition',pickList('d',DISP[st][oc],d));
      if(d==='later') h+=field('Follow-up date',dateIn('fu',S.sel.fu,ymd(S.now+DAY)),'It sits in Time Pending until then, shown under that month.');
      if(d==='future') h+='<div class="fgrid">'+field('Renewal date of their current policy',dateIn('ren',S.sel.ren||(p.renew?ymd(p.renew):''),ymd(S.now)))+field('Follow-up date',dateIn('fu',S.sel.fu,ymd(S.now+DAY)))+'</div>';
      if(d==='sched') h+=field('Date and time of the consultation call',dtIn('mt',S.sel.mt))+modeBlock();
      if(d==='unreach'||d==='dna') h+=(p.dnp+1>=4?note('red','','This is the fourth unanswered attempt (DNP 4). The prospect moves to <b>Not Interested</b>.','info'):note('neutral','','This adds DNP '+(p.dnp+1)+' and moves the prospect to Not Connected.','info'));
      if(d==='torp'&&oc==='contacted') h+=field('Reason',pickList('rpw',RP_WHY.map(function(r){return [r,r];}),S.sel.rpw||''));
      if(RP_TX[d]) h+=note('amber','','The prospect is marked <b>To re-prospect</b>. Until you add the new contact details, that is the only action on it; it then comes back as a new prospect.','info'); }
    return h+noteIn(); },
  can:function(){ var oc=S.sel.oc, d=S.sel.d; if(!oc||!d) return false;
    if(d==='later') return futureOk(dParse(S.sel.fu)); if(d==='future') return futureOk(dParse(S.sel.fu))&&!!dParse(S.sel.ren); if(d==='sched') return futureOk(dtParse(S.sel.mt)); if(d==='torp'&&oc==='contacted') return !!S.sel.rpw; return true; },
  ok:function(){ var d=S.sel.d; if(S.sel.oc==='ni') return 'Close prospect'; if(d==='mql') return 'Move to MQL'; if(d==='sched') return 'Book the call'; return 'Save'; },
  run:function(){ var p=cur(), how=S.sel.via==='call'?'call':(S.sel.how||'linkedin'), hl=OUTREACH.filter(function(o){return o[0]===how;})[0][1], oc=S.sel.oc, d=S.sel.d, x=(S.sel.x||'').trim(), st=p.stage==='mql'?'mql':'prospect';
    var ocTx=oc==='contacted'?'Contacted':(oc==='not'?'Not contacted':'Not interested');
    if(oc==='ni'){ toBucket(p,'ni'); p.close={why:d,note:x,at:S.now,by:S.user}; logAdd(p,'Closed · Not interested',d+' · '+uname(S.user),x); toast('Prospect closed',d+'. You can reopen it from its page.'); return; }
    var lbl=dispLabel(st,oc,d); if(d==='torp'&&oc==='contacted') lbl+=' · '+S.sel.rpw;
    if(d==='unreach'||d==='dna'){ if(addDnp(p,hl,ocTx+' · '+lbl,x)) toast('Moved to Not Interested','Fourth unanswered attempt (DNP 4). Reopen it if they get back to you.'); else toast('Not Connected · DNP '+p.dnp,'Try again later from the Not Connected list.'); return; }
    logAdd(p,'Outreach · '+hl,ocTx+' · '+lbl+' · '+uname(S.user),x);
    if(RP_TX[d]){ p.rp=(d==='torp'&&oc==='contacted')?S.sel.rpw:RP_TX[d]; toast('Marked To re-prospect','Add the new contact details once you have them.'); return; }
    if(d==='mql'){ moveTo(p,'mql'); toast('Moved to MQL',p.co+' is contacted and qualified.'); return; }
    if(d==='later'||d==='future'){ var fu=dParse(S.sel.fu)+10*3600000; toBucket(p,'tp'); p.tpAt=fu; p.tpWhy=lbl; if(d==='future'){ p.renew=dParse(S.sel.ren); }
      logAdd(p,'Moved to Time Pending','Follow up '+fmtD(fu)+(d==='future'?' · renewal '+fmtD(p.renew):''),'',1); toast('Time Pending until '+fmtD(fu),'It shows under '+monthLbl(monthKey(fu))+' on your home page.'); return; }
    if(d==='sched'){ var mt=dtParse(S.sel.mt); p.meet={at:mt,mode:S.sel.mode||'Virtual',where:(S.sel.where||'').trim()}; logAdd(p,'Consultation call scheduled',p.meet.mode+' · '+fmt(mt),x); moveTo(p,'callsetup'); toast('Call booked · '+fmt(mt),'Moved to Meeting Set-up.'); return; }
    toast('Outreach logged',lbl+'. The prospect stays in '+stepName(p.stage)+'.'); }};

/* ---------- another attempt from Not Connected ---------- */
FLOWS.ab_attempt={t:'Log another attempt', sub:function(){ var p=cur(); return p?p.co+' · '+p.poc1.n+' · DNP '+p.dnp:''; },
  body:function(){ var p=cur(), d=S.sel.d||'';
    return field('How you reached out',seg('how',OUTREACH.map(function(o){return [o[0],o[1]];}),'call'))+
      field('What happened',pickList('d',[['dna','Did not answer call',p.dnp+1>=4?'DNP 4 · moves to Not Interested':'Adds DNP '+(p.dnp+1)],['unreach','Currently unreachable',p.dnp+1>=4?'DNP 4 · moves to Not Interested':'Adds DNP '+(p.dnp+1)],['conn','Connected','Back to '+stepName(p.from||'prospect')+', then log what was said']],d))+
      (d==='conn'?note('amber','','It returns to the stage it came from ('+esc(stepName(p.from||'prospect'))+'). '+pend('Pending ABM','Where a reconnected prospect goes is open point 1 for the ABM team.'),'info'):'')+
      noteIn(); },
  can:function(){ return !!S.sel.d; }, ok:function(){ return S.sel.d==='conn'?'Mark connected':'Save attempt'; },
  run:function(){ var p=cur(), d=S.sel.d, x=(S.sel.x||'').trim(), how=S.sel.how||'call', hl=OUTREACH.filter(function(o){return o[0]===how;})[0][1];
    if(d==='conn'){ var back=p.from||'prospect'; logAdd(p,'Outreach · '+hl,'Connected after DNP '+p.dnp+' · back to '+stepName(back),x); p.bucket=''; p.from=''; p.dnp=0; p.stage=back; p.enteredAt=S.now;
      logAdd(p,'Back to '+stepName(back),'Not Connected → '+stepName(back),'',1); S.flow=null; closeFlow(); save(); paint(); openFlow('ab_outreach',{id:p.id,oc:'contacted'}); toast('Connected','Now log what was said.'); return 'stay'; }
    if(addDnp(p,hl,'Not contacted · '+(d==='dna'?'Did not answer call':'Currently unreachable'),x)) toast('Moved to Not Interested','Fourth unanswered attempt (DNP 4). Reopen it if they get back to you.'); else toast('DNP '+p.dnp,'Logged. Try again later.'); }};

/* ---------- book / reschedule / call outcome ---------- */
FLOWS.ab_book={t:'Schedule the consultation', sub:function(){ var p=cur(); return p?p.co+' · '+p.poc1.n:''; },
  body:function(){ return field('Date and time',dtIn('mt',S.sel.mt))+modeBlock()+noteIn(); },
  can:function(){ return futureOk(dtParse(S.sel.mt)); }, ok:'Book the call',
  run:function(){ var p=cur(), mt=dtParse(S.sel.mt); p.meet={at:mt,mode:S.sel.mode||'Virtual',where:(S.sel.where||'').trim()}; logAdd(p,'Consultation call scheduled',p.meet.mode+' · '+fmt(mt),(S.sel.x||'').trim()); if(p.stage==='mql'){ moveTo(p,'callsetup'); toast('Consultation booked · '+fmt(mt),'Moved to Meeting Set-up.'); return; } toast('Call booked · '+fmt(mt),''); }};
FLOWS.ab_resched={t:'Reschedule the call', sub:function(){ var p=cur(); return p&&p.meet?'Booked for '+fmt(p.meet.at)+' · '+p.meet.mode:''; },
  body:function(){ var p=cur(); if(S.sel.mode===undefined&&p.meet){ S.sel.mode=p.meet.mode; S.sel.where=p.meet.where; }
    return field('New date and time',dtIn('mt',S.sel.mt))+modeBlock()+field('Why — optional',input('x',S.sel.x,'Client travelling'))+note('neutral','','No limit on reschedules. Every change is kept in the reschedule history.','info'); },
  can:function(){ return futureOk(dtParse(S.sel.mt)); }, ok:'Reschedule',
  run:function(){ var p=cur(), mt=dtParse(S.sel.mt), old=p.meet.at; p.resched.push({from:old,to:mt,at:S.now,why:(S.sel.x||'').trim()}); p.meet={at:mt,mode:S.sel.mode||p.meet.mode,where:(S.sel.where||'').trim()};
    logAdd(p,'Consultation call re-scheduled',fmt(old)+' → '+fmt(mt),(S.sel.x||'').trim()); toast('Rescheduled to '+fmt(mt),'Reschedule '+p.resched.length+' recorded.'); }};
FLOWS.ab_callout={t:'Record the call outcome', locked:function(){ return S.sel.via==='call'; }, sub:function(){ var p=cur(); return p&&p.meet?p.co+' · '+fmt(p.meet.at)+' · '+p.meet.mode:''; }, wide:true,
  body:function(){ var p=cur(), d=S.sel.d||'';
    var h=field('Disposition',pickList('d',[['done','Consultation call completed','Add the meeting notes → Meeting Completed'],['resch','Consultation call re-scheduled','Capture the new date'],['noshow','POC no-show — meeting','Capture the new date and time'],['fu','Consultation call follow-up','Stays in Meeting Set-up'],['cancel','Not Interested','Close with a reason · can be reopened']],d));
    if(d==='done') h+=field('Meeting notes (minutes of meeting)','<textarea class="inp" id="f_mom" data-f="mom" style="min-height:110px" placeholder="Products they need, sums insured, current insurer, timelines">'+esc(S.sel.mom||'')+'</textarea>','Shared with Sales or the RM at handoff.');
    if(d==='resch'||d==='noshow') h+=field('New date and time',dtIn('mt',S.sel.mt),d==='noshow'?'The meeting is rescheduled to this time; the no-show is kept in the reschedule history.':'');
    if(d==='cancel') h+=field('Close reason '+pend('Pending ABM','Whether these four reasons fit a meeting that did not go ahead is open point 4.'),pickList('cr',CLOSE_REASONS.map(function(r){return [r,r];}),S.sel.cr||''));
    return h+(d==='done'?'':noteIn()); },
  can:function(){ var d=S.sel.d; if(!d) return false; if(d==='done') return !!(S.sel.mom||'').trim(); if(d==='resch'||d==='noshow') return futureOk(dtParse(S.sel.mt)); if(d==='cancel') return !!S.sel.cr; return true; },
  ok:function(){ return ({done:'Move to Meeting Completed',resch:'Reschedule',noshow:'Reschedule',cancel:'Close as not interested'})[S.sel.d]||'Save'; },
  run:function(){ var p=cur(), d=S.sel.d, x=(S.sel.x||'').trim();
    if(d==='done'){ p.mom=S.sel.mom.trim(); logAdd(p,'Consultation call completed',p.meet.mode+' · '+uname(S.user),p.mom); moveTo(p,'sal'); toast('Moved to Meeting Completed','Hand it off when you are ready.'); return; }
    if(d==='resch'){ var mt=dtParse(S.sel.mt), old=p.meet.at; p.resched.push({from:old,to:mt,at:S.now,why:x}); p.meet.at=mt; logAdd(p,'Consultation call re-scheduled',fmt(old)+' → '+fmt(mt),x); toast('Rescheduled to '+fmt(mt),''); return; }
    if(d==='noshow'){ var nt=dtParse(S.sel.mt), was=p.meet.at; logAdd(p,'POC no-show — meeting','The call on '+fmt(was)+' did not happen',x); p.resched.push({from:was,to:nt,at:S.now,why:'POC no-show'+(x?' · '+x:'')}); p.meet.at=nt; logAdd(p,'Consultation call re-scheduled',fmt(was)+' → '+fmt(nt)+' · after no-show','',1); toast('No-show recorded','Rescheduled to '+fmt(nt)+'.'); return; }
    if(d==='cancel'){ logAdd(p,'Meeting outcome · Not interested',fmt(p.meet.at),x); toBucket(p,'ni'); p.close={why:S.sel.cr,note:x||'Not interested at Meeting Set-up',at:S.now,by:S.user}; logAdd(p,'Closed · Not interested',S.sel.cr+' · '+uname(S.user),'',1); toast('Prospect closed','You can reopen it from its page.'); return; }
    logAdd(p,'Consultation call follow-up','Stays in Meeting Set-up',x); toast('Follow-up logged',''); }};

/* ---------- Time Pending ---------- */
FLOWS.ab_tpNow={t:'Move to Meeting Set-up now', sub:function(){ var p=cur(); return p?'Parked until '+fmtD(p.tpAt):''; },
  body:function(){ return note('neutral','','It leaves Time Pending and lands in Meeting Set-up with no call booked. Book the call from there.','info'); }, ok:'Move to Meeting Set-up',
  run:function(){ var p=cur(); p.bucket=''; p.from=''; p.tpAt=0; p.meet=null; p.stage='callsetup'; p.enteredAt=S.now; logAdd(p,'Moved to Meeting Set-up','Time Pending → Meeting Set-up, before the follow-up date','',1); toast('Moved to Meeting Set-up','Book the consultation call next.'); }};
FLOWS.ab_tpEdit={t:'Change the follow-up date', sub:function(){ var p=cur(); return p?'Now '+fmtD(p.tpAt):''; },
  body:function(){ return field('New follow-up date',dateIn('fu',S.sel.fu,ymd(S.now+DAY)))+noteIn(); }, can:function(){ return futureOk(dParse(S.sel.fu)); }, ok:'Save date',
  run:function(){ var p=cur(), fu=dParse(S.sel.fu)+10*3600000; logAdd(p,'Follow-up date changed',fmtD(p.tpAt)+' → '+fmtD(fu),(S.sel.x||'').trim()); p.tpAt=fu; toast('Follow up '+fmtD(fu),'Shown under '+monthLbl(monthKey(fu))+'.'); }};

/* ---------- close, reopen, re-prospect, contacts, reassign ---------- */
FLOWS.ab_close={t:'Close as not interested', sub:function(){ var p=cur(); return p?p.co:''; },
  body:function(){ return field('Close reason',pickList('cr',CLOSE_REASONS.map(function(r){return [r,r];}),S.sel.cr||''))+noteIn(); }, can:function(){ return !!S.sel.cr; }, ok:'Close prospect',
  run:function(){ var p=cur(); toBucket(p,'ni'); p.close={why:S.sel.cr,note:(S.sel.x||'').trim(),at:S.now,by:S.user}; logAdd(p,'Closed · Not interested',S.sel.cr+' · '+uname(S.user),(S.sel.x||'').trim()); toast('Prospect closed',''); }};
FLOWS.ab_reopen={t:'Reopen this prospect', sub:function(){ var p=cur(); return p&&p.close?'Closed '+fmtD(p.close.at)+' · '+p.close.why:''; },
  body:function(){ var p=cur(); return note('neutral','','It goes back to <b>'+esc(stepName(p.from||'prospect'))+'</b>, where it was when it was closed.','info'); }, ok:'Reopen',
  run:function(){ var p=cur(), back=p.from||'prospect'; p.bucket=''; p.from=''; p.close=null; p.dnp=0; p.stage=back; if(back==='callsetup') p.meet=null; p.enteredAt=S.now; logAdd(p,'Reopened','Not Interested → '+stepName(back)+' · '+uname(S.user),'',0); toast('Reopened','Back in '+stepName(back)+'.'); }};
function pocFields(pre){ return '<div class="fgrid">'+field('Name',input(pre+'n',S.sel[pre+'n'],'Full name'))+field('Contact number',input(pre+'m',S.sel[pre+'m'],'10-digit mobile','inputmode="numeric"'),'',S.sel[pre+'m']&&!mobOk(S.sel[pre+'m'])?'Enter a 10-digit mobile number starting 6–9':'')+'</div><div class="fgrid">'+field('Designation — optional',input(pre+'d',S.sel[pre+'d'],'Director, CFO, HR head'))+field('Email — optional',input(pre+'e',S.sel[pre+'e'],'name@company.com'),'',S.sel[pre+'e']&&!mailOk(S.sel[pre+'e'])?'Check the email address':'')+'</div>'; }
function pocOk(pre,req){ var n=(S.sel[pre+'n']||'').trim(), m=S.sel[pre+'m']; if(!req&&!n&&!m) return true; return !!n&&mobOk(m)&&(!S.sel[pre+'e']||mailOk(S.sel[pre+'e'])); }
function pocOf(pre){ return {n:S.sel[pre+'n'].trim(),m:String(S.sel[pre+'m']).replace(/\s+/g,''),d:(S.sel[pre+'d']||'').trim(),e:(S.sel[pre+'e']||'').trim()}; }
FLOWS.ab_newPoc={t:'Add contact details', sub:function(){ var p=cur(); return p?p.co+' · '+(p.rp||''):''; },
  body:function(){ var p=cur(); return note('neutral','','The old contact, <b>'+esc(p.poc1.n)+'</b>, stays in the activity trail. The prospect is marked <b>Re-prospected</b> and starts again at Prospect.','info')+pocFields('a'); },
  can:function(){ return pocOk('a',true); }, ok:'Re-prospect',
  run:function(){ var p=cur(), old=p.poc1.n; p.poc1=pocOf('a'); logAdd(p,'Outreach · Re-prospected','New contact '+p.poc1.n+' replaces '+old+' · '+uname(S.user),'',0); p.rp=''; p.dnp=0; p.bucket=''; p.from=''; p.stage='prospect'; p.enteredAt=S.now; toast('Re-prospected','Back as a new prospect with '+p.poc1.n+'.'); }};
FLOWS.ab_editPoc={t:'Contacts', sub:function(){ var p=cur(); return p?p.co:''; },
  body:function(){ var p=cur(); if(S.sel._i===undefined){ S.sel._i=1; ['n','m','d','e'].forEach(function(k){ S.sel['a'+k]=p.poc1[k]; if(p.poc2) S.sel['b'+k]=p.poc2[k]; }); }
    return '<div class="lbl" style="font-weight:650;color:var(--ink)">Primary POC · mandatory</div>'+pocFields('a')+'<div class="lbl mt8" style="font-weight:650;color:var(--ink)">Secondary POC · optional</div>'+pocFields('b'); },
  can:function(){ return pocOk('a',true)&&pocOk('b',false); }, ok:'Save contacts',
  run:function(){ var p=cur(); p.poc1=pocOf('a'); p.poc2=(S.sel.bn||'').trim()?pocOf('b'):null; logAdd(p,'Contacts updated',uname(S.user),'',1); toast('Contacts saved',''); }};
FLOWS.ab_reassign={t:'Reassign prospect', sub:function(){ var p=cur(); return p?p.co+' · owned by '+uname(p.owner):''; },
  body:function(){ var p=cur(); return field('New owner',select('to',S.sel.to||'',[['','Pick an ABM user']].concat(abmUsers().filter(function(x){return x.id!==p.owner;}).map(function(x){return [x.id,x.n];}))))+note('neutral','','The prospect keeps its stage, bucket and history. Only the owner changes.','info'); },
  can:function(){ return !!S.sel.to; }, ok:'Reassign', repaintOn:['to'],
  run:function(){ var p=cur(), was=p.owner; p.owner=S.sel.to; logAdd(p,'Reassigned',uname(was)+' → '+uname(p.owner)+' · by '+uname(S.user),'',1); toast('Reassigned to '+uname(p.owner),''); }};

/* ---------- one company, one ABM [stated 23 Oct] ---------- */
function dupMsg(co,forAbm){ if(!(co||'').trim()) return ''; var h=abmOfCo(co); if(!h||!h.id||h.id===forAbm) return '';
  return h.why==='customer'?'This company is already a customer with '+uname(h.id)+' as its ABM. Only one ABM works a company.':'This company is already a prospect of '+uname(h.id)+'. Only one ABM works a company.'; }
/* ---------- add one prospect ---------- */
FLOWS.ab_addPro={t:'Add prospect', sub:'Company, contact name and number are mandatory. Everything else can be filled in later.', wide:true,
  body:function(){ var u=me();
    var dup=dupMsg(S.sel.co,isMgr(u)?S.sel.own:u.id);
    return field('Company name',input('co',S.sel.co,'Registered or trading name'),'',dup)+
      '<div class="lbl" style="font-weight:650;color:var(--ink)">Primary POC</div>'+pocFields('a')+
      '<details class="rqsum"'+(S.sel.open2?' open':'')+'><summary data-mset="open2" data-mval="1">Secondary POC <span class="link">optional</span></summary><div class="mt8">'+pocFields('b')+'</div></details>'+
      '<div class="fgrid">'+field('Data source',select('src',S.sel.src||'',[['','Not known']].concat(SOURCES)),pend('Placeholder list','The data source values are open point 2 for the ABM team.'))+field('Industry',select('ind',S.sel.ind||'',[['','Not known']].concat(INDUSTRIES)),pend('Placeholder list','The industry values are open point 3 for the ABM team.'))+'</div>'+
      '<div class="fgrid">'+field('Product of interest',select('prod',S.sel.prod||'',[['','Not known']].concat(PRODUCTS)),'The BimaSetu product list. Pre-fills the handoff.')+field('Renewal date of current policy',dateIn('ren',S.sel.ren),'Pre-fills the handoff.')+'</div>'+
      (isMgr(u)?field('Owner',select('own',S.sel.own||'',[['','Pick an ABM user']].concat(abmUsers().map(function(x){return [x.id,x.n];})))):note('neutral','','You will own this prospect. It lands in <b>Prospect</b>.','info')); },
  can:function(){ var u=me(); return !!(S.sel.co||'').trim()&&!dupMsg(S.sel.co,isMgr(u)?S.sel.own:u.id)&&pocOk('a',true)&&pocOk('b',false)&&(!isMgr()||!!S.sel.own); }, ok:'Add prospect',
  run:function(){ var u=me(), id='PR-'+(S.data.seq.pr++);
    var p=P({id:id,co:S.sel.co.trim(),ind:S.sel.ind||'',src:S.sel.src||'',prod:S.sel.prod||'',renew:dParse(S.sel.ren),owner:isMgr(u)?S.sel.own:u.id,by:u.id,createdAt:S.now,poc1:pocOf('a'),poc2:(S.sel.bn||'').trim()?pocOf('b'):null,enteredAt:S.now});
    p.log.unshift({at:S.now,t:'Prospect added',m:'Single add · '+u.n+(isMgr(u)?' · assigned to '+uname(p.owner):''),x:'',sys:1}); S.data.pros.unshift(p);
    S.flow=null; closeFlow(); save(); go('abpro',{id:id}); toast('Prospect added',id+' · '+p.co+' is in Prospect.'); return 'stay'; }};
