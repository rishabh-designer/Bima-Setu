/* ==================================================================== *
 *  v76 · Investor demo — [stated 30 Oct]
 *  Only two cases, both walked live from pre-sales:
 *   · Sharma Industries — Workmen’s Compensation (DUA)
 *   · Northgate Systems — Cyber Liability (Non-DUA)
 *  A small cast: one ABM, one Sales executive and his manager, one RM and
 *  the Head of RM, and the administrator.
 * ==================================================================== */
var DEMO_CAST=['arjun','kavya','nikhil','vikram','priya','meera','admin'];
var DEMO_PROFILE={
  'Sharma Industries Pvt Ltd':{trade:'Sharma Steel',city:'Pune',st:'Maharashtra',ind:'Auto components',emp:'240',grp:'Sharma Group',
    prof:{risk:'Moderate',cls:'Manufacturing · auto ancillary · NIC 29300',exp:'Two plants, Pune and Chakan. Blue-collar workforce — Workmen’s Compensation is the live need.'},
    fin:{rev:'₹86.4 Cr',pat:'₹4.1 Cr',net:'₹22.8 Cr',yr:'FY 2025-26',cin:'U29300PN2009PTC134221',read:'12 Sep 2026'},pan:'AABCS1234F',gst:'27AABCS1234F1Z5'},
  'Northgate Systems Pvt Ltd':{city:'Mumbai',st:'Maharashtra',ind:'IT infrastructure',emp:'180',
    prof:{risk:'Moderate',cls:'IT infrastructure services · NIC 62099',exp:'Data-centre build and managed services — internet-facing systems. Cyber is the live need.'},
    fin:{rev:'₹74.2 Cr',pat:'₹5.1 Cr',net:'₹29.7 Cr',yr:'FY 2025-26',cin:'U62099MH2012PTC229104',read:'15 Sep 2026'},pan:'AAECN3348D',gst:'27AAECN3348D1ZG'}
};
function demoSeed(d){
  var keep=function(id){ return DEMO_CAST.indexOf(id)>=0; };
  d.users=d.users.filter(function(u){ return keep(u.id); });
  d.users.forEach(function(u){ if(u.mgr&&!keep(u.mgr)) u.mgr=''; });
  ['accounts','opps','lines','tasks','svc','mandates','rlog','ptk'].forEach(function(k){ if(Array.isArray(d[k])) d[k]=[]; });
  var t0=ago(0,3);
  var pro=function(id,co,ind,prod,poc,m,dsg,e,src){ return {id:id,co:co,ind:ind,src:src,prod:prod,renew:0,owner:'arjun',by:'arjun',createdAt:t0,
    poc1:{n:poc,m:m,d:dsg,e:e},poc2:null,stage:'prospect',bucket:'',from:'',dnp:0,tpAt:0,tpWhy:'',close:null,rp:'',meet:null,resched:[],mails:[],mom:'',handoff:null,
    log:[{at:t0,t:'Prospect added',m:'Single add · Arjun Mehta',x:'',sys:1}],enteredAt:t0,via:'Single add',demo:1}; };
  d.pros=[
    pro('PR-1001','Sharma Industries Pvt Ltd','Manufacturing','Workmen’s Compensation','Rahul Mehta','9820044112','Finance Head','rahul.mehta@sharmaind.in','Event'),
    pro('PR-1002','Northgate Systems Pvt Ltd','IT / ITES','Cyber Liability','Sanjay Bhatt','9930041127','CFO','sanjay.bhatt@northgate.co.in','LinkedIn')
  ];
  d.seq.pr=1003; d.seq.line=2001; d.seq.acct=1001; d.seq.opp=1001;
  d.abmPool=[{id:'arjun',on:true}]; d.abmRR=0; d.abmMode={};
  d.fb={sales:'nikhil',post:'priya',abm:'arjun'};
  if(d.rma){ d.rma.owners=[{u:'priya',level:'RM',regions:['North','South','West','East']}]; d.rma.rr={};
    /* both demo customers sit in the RM band, so Priya is picked by the rule, not by the fallback */
    d.rma.cuts.gwp=[500000,1000000,2500000]; d.rma.cuts.rev=[1000000000,3000000000,10000000000]; }
  if(d.lm){ (d.lm.teams||[]).forEach(function(t){ t.users=(t.users||[]).filter(keep); if(t.manager&&!keep(t.manager)) t.manager=''; if(!t.users.length) t.users=['nikhil']; if(!t.manager) t.manager='vikram'; });
    if(d.lm.people) d.lm.people=d.lm.people.filter(function(p){ return keep(p.id); }); }
  d.lmrr={};
  return d; }
seedFill=(function(f0){ return function(d){ var r=f0(d)||d; return demoSeed(r); }; })(seedFill);

/* the handoff fills in what BimaKavach already knows about the company (Probe42 / Bimanetra in the product) */
(function(){ var F=FLOWS.ab_handoff, r0=F.run; F.run=function(){ var p=dmPro(), res=r0.apply(this,arguments);
  try{ var a=p&&p.handoff?by(S.data.accounts,p.handoff.acct):null, pf=a?DEMO_PROFILE[p.co]:null;
    if(a&&pf&&!a._demo){ a._demo=1; ['trade','city','st','ind','emp','grp'].forEach(function(k){ if(pf[k]&&!a[k]) a[k]=pf[k]; }); a.prof=a.prof||pf.prof; a.fin=a.fin||pf.fin; a.demoKyc={pan:pf.pan,gst:pf.gst}; save(); } }catch(e){}
  return res; }; })();
/* every product category routes to the one Sales executive in the cast */
try{ Object.keys(CAT_ROUTE).forEach(function(c){ CAT_ROUTE[c]=['nikhil']; }); }catch(e){}
