/* ==================================================================== *
 *  Seed data. Everything dated relative to the seed clock T0.
 * ==================================================================== */
var STAGES=[
 {n:1, s:'New Lead',                     t:'New Lead',        w:'Us'},
 {n:2, s:'Consultation Setup',           t:'Consultation',    w:'Us'},
 {n:3, s:'Details Captured',             t:'Details Captured', w:'Us'},
 {n:4, s:'RFQ Shared for Client Review', t:'Client Review',   w:'Client'},
 {n:5, s:'RFQ Verified by Client',       t:'RFQ Verified',    w:'Us'},
 {n:6, s:'Quote Requested',              t:'Quote Requested', w:'Us'},
 {n:7, s:'Quotes Received',              t:'Quotes Received', w:'Us'},
 {n:8, s:'Quote Sent',                   t:'Quote Sent',      w:'Client'},
 {n:9, s:'Purchase Requested',           t:'Purchase Requested', w:'Us'},
 {n:10,s:'Payment Details Shared with Client', t:'Details Shared', w:'Client'},
 {n:11,s:'Payment Completed',            t:'Payment Completed', w:'Us'},
 {n:12,s:'Policy Documents Pending',     t:'Docs Pending',    w:'Client'},
 {n:13,s:'Awaiting Policy Copy',         t:'Awaiting Copy',   w:'Insurer'},
 {n:14,s:'Policy Copy Sent to Client',   t:'Copy Sent',       w:'—'}
];
var SALES_STAGES=11; /* ownership moves to the RM at 11; 12–14 are the post-purchase ticket's stages */
var CATOF={'Fire & Special Perils':'Property & casualty','Burglary':'Property & casualty','Workmen’s Compensation':'Property & casualty',
 'Industrial All Risk':'Property & casualty','Contractors All Risk':'Property & casualty','Erection All Risk':'Property & casualty',
 'Marine Cargo':'Marine & liability','Commercial General Liability':'Marine & liability','Cyber Liability':'Marine & liability',
 'Directors & Officers':'Marine & liability','Professional Indemnity':'Marine & liability','Group Health':'Employee benefits'};
var PRODUCTS=Object.keys(CATOF);
var RATEABLE={'Fire & Special Perils':1,'Burglary':1,'Workmen’s Compensation':1,'Group Health':0,'Marine Cargo':0,'Commercial General Liability':0,'Cyber Liability':0,'Directors & Officers':1,'Professional Indemnity':0,'Industrial All Risk':0,'Contractors All Risk':0,'Erection All Risk':0};
/* [stated 24 Sep] contractual policies — written for the length of a contract, not a policy year.
   They never renew: no renewal line is opened, and they are out of every renewal view. */
var CONTRACTUAL={'Workmen’s Compensation':1,'Contractors All Risk':1,'Erection All Risk':1};
function isContractual(p){ return !!CONTRACTUAL[p]; }
/* [stated 24 Sep · TBD-62/63] RHL and the proposal form are required on liability products only.
   The liability product list itself is a prototype stand-in — the product groups are still coming. */
var LIABILITY={'Commercial General Liability':1,'Cyber Liability':1,'Directors & Officers':1,'Professional Indemnity':1};
function isLiability(p){ return !!LIABILITY[p]; }
/* [stated 24 Sep · TBD-62] these two generate the risk-held letter; every other insurer emails it */
var RHL_SYS={'HDFC Ergo':1,'Future Generali':1};
/* [stated 24 Sep · TBD-26] a mandate is valid for a fixed period of one year */
var MD_YEAR=365*86400000;
/* [stated 24 Sep · TBD-05/06] the attempt ladder caps at 10 calls; no timing, no channel rule.
   The tenth no-connect fires Unreachable, a terminal status the system sets. */
var ATTEMPT_CAP=10;
var SRCS=['Website','Embedded','Referral','Cold outreach','Event or meeting','Existing client','Partner','Other'];
var BTYPE={fresh:'Fresh', roll:'Market rollover'};
var LOSS=['Do Not Call','Bought directly from the insurer','Bought directly from another broker','Bought directly from an insurance agent','Delay in quote delivery','Lower premium offered','Premium too high','In-person meeting not possible','Wants cashback','Reason not shared'];
var DISQ=['Invalid phone number','Invalid email ID','Non-insurable risk','Internal testing','Duplicate after merge'];
var PARK=['Budget or decision deferred','Renewal date far out','Awaiting internal approval','Locked in a multi-year policy'];
var PAYMODE=['NEFT / RTGS','Payment link','Cheque','Proforma invoice'];
/* [stated 23 Sep] the six call outcomes, and nothing else */
var DISP=[
 {k:'ring', g:'A', n:'Ringing, no answer',                 d:'No connect'},
 {k:'busy', g:'A', n:'Busy, call cut',                     d:'No connect'},
 {k:'off',  g:'A', n:'Switched off or unreachable',        d:'No connect'},
 {k:'poc',  g:'B', n:'Wrong person, referred to correct POC', d:'Connected · asks who the correct POC is · they become the contact on this line'},
 {k:'cb',   g:'B', n:'Asked to call back later',           d:'Connected · asks when · creates the follow-up task for that time'},
 {k:'disc', g:'C', n:'Discovery complete, requirement captured', d:'Connected · opens the requirement questions · moves to Details Captured'}
];
var QUOTES={
 dau:[{i:'ICICI Lombard',p:318400,st:'quoted',lo:1},{i:'Tata AIG',p:342000,st:'quoted'},{i:'Bajaj Allianz',p:361750,st:'quoted'},{i:'HDFC Ergo',p:0,st:'declined',r:'Occupancy outside appetite'}],
 plc:[{i:'New India Assurance',p:305900,st:'quoted',lo:1},{i:'Oriental Insurance',p:329500,st:'quoted'},{i:'United India',p:0,st:'declined',r:'Below minimum premium'},{i:'Reliance General',p:0,st:'awaited'}]
};
/* [6 Oct · demo] Cholamandalam real-time issuance for Workmen’s Compensation (DUA).
   When Chola is the selected insurer on a WC line, the RM runs a guided capture
   (sole-prop, worker/risk, company, GST+PAN OCR), KYC clears on Chola’s API, and a
   24-hour payment link is generated. The policy issues on payment — no payment ticket
   and no post-purchase ticket. Chola is offered only on WC lines. */
var CHOLA='Cholamandalam MS General Insurance';
var WC_PRODUCT='Workmen’s Compensation';
var CHOLA_QUOTE={i:CHOLA,p:331200,st:'quoted',rt:1};
var CHOLA_TTL=24*3600*1000;
function dauQuotes(l){ return (l&&l.product===WC_PRODUCT)?QUOTES.dau.concat([CHOLA_QUOTE]):QUOTES.dau; }
function isChola(l){ return !!l&&l.rate===1&&l.product===WC_PRODUCT&&(l.picked||l.ins)===CHOLA; }
function cholaLink(l){ return 'https://pay.cholamsgeneral.com/wc/'+l.id.toLowerCase().replace(/[^a-z0-9]/g,'')+'-'+String(premOf(l)); }
function cholaUtr(l){ return 'CHLA'+String(l.id.replace(/\D/g,'')).slice(-4)+String(Math.round(premOf(l))).slice(-6); }
function cholaLinkExpired(l){ var ch=l&&l.chola; return !!(ch&&ch.link&&ch.linkAt)&&S.now>ch.linkAt+CHOLA_TTL; }
function cholaLinkLeft(l){ var ch=l.chola||{}; return Math.max(0,Math.round((ch.linkAt+CHOLA_TTL-S.now)/3600000)); }
/* [6 Oct] Cyber (Non-DUA): capture questions + a digitised RFQ chosen by the sum insured band. */
var CYBER_PRODUCT='Cyber Liability';
function isCyber(l){ return !!l&&l.product===CYBER_PRODUCT; }
function parseCrore(str){ var s=String(str||'').toLowerCase().replace(/[,\u20b9\s]/g,''); var m=s.match(/([0-9]*\.?[0-9]+)/); if(!m) return 0; var n=parseFloat(m[1]); if(isNaN(n)) return 0; if(/lac|lakh|lkh|lk/.test(s)) return n/100; if(/cr|crore/.test(s)) return n; if(n>=100000) return n/10000000; return n; }
function cyberBand(l){ var r=l.req||{}; var cr=parseCrore(r.cybcov||r.si||''); if(cr<=2) return '0-2'; if(cr<=10) return '2-10'; return '>10'; }
function cyberBandLabel(b){ return b==='0-2'?'0\u20132 Cr form':(b==='2-10'?'2\u201310 Cr form':'Above 10 Cr (using the 2\u201310 Cr form for now)'); }
/* [8 Oct] Website lead priority. A lead assigned from the website carries the funnel step it dropped
   off at; the further down the purchase funnel, the hotter the lead. P0 (closest to payment) down to
   P3. Applies only to website-sourced leads that are still pre-sale — never to manual opportunities. */
var WEB_PRIO={'Name phone email filled':'P3','Visited Company field step':'P3','Company name filled':'P3','L1 Visited':'P3','L1 completed':'P2','OTP Entered':'P1','View all the available quotes':'P1','Quote selected by user':'P1','Entered offline flow (thank you page)':'P1','User details page visited in purchase flow':'P0','User details submitted in purchase flow':'P0','Company details page submit':'P0','KYC documents submitted':'P0','KYC verified':'P0','Payment start':'P0'};
function webLead(l){ return !!l && l.src==='Website' && !!l.drop && !dead(l) && l.stage<SALES_STAGES; }
function webPrio(l){ return webLead(l)?(WEB_PRIO[l.drop]||''):''; }
function webPrioRank(l){ var p=webPrio(l); return p==='P0'?0:(p==='P1'?1:(p==='P2'?2:(p==='P3'?3:9))); }
function webPrioBadge(l){ var p=webPrio(l); if(!p) return ''; var tone=p==='P0'?'red':(p==='P1'?'amber':(p==='P2'?'violet':'neutral')); return chip(p,tone,false,true); }
var CAT_ROUTE={'Property & casualty':['nikhil','aarti'],'Marine & liability':['anand','sameer'],'Employee benefits':['divya']};
/* [stated 26 Sep · 19.2 / TBD-03/04] a fallback sales user and a fallback RM per product — configuration, no screen */
var FALLBACK_USER={}, FALLBACK_RM={};
Object.keys(CATOF).forEach(function(p){ var c=CATOF[p]; FALLBACK_USER[p]=c==='Marine & liability'?'anand':(c==='Employee benefits'?'divya':'nikhil'); FALLBACK_RM[p]='priya'; });

function seed(){
  var users=[
   {id:'nikhil', n:'Nikhil Sharma', role:'exec', cat:'Property & casualty', mgr:'vikram', title:'Sales executive · Property & casualty'},
   {id:'aarti',  n:'Aarti Menon',   role:'exec', cat:'Property & casualty', mgr:'vikram', title:'Sales executive · Property & casualty'},
   {id:'anand',  n:'Anand Kulkarni',role:'exec', cat:'Marine & liability',  mgr:'vikram', title:'Sales executive · Marine & liability'},
   {id:'divya',  n:'Divya Shah',    role:'exec', cat:'Employee benefits',   mgr:'vikram', title:'Sales executive · Employee benefits'},
   {id:'sameer', n:'Sameer Joshi',  role:'exec', cat:'Marine & liability',  mgr:'vikram', title:'Sales executive · Marine & liability'},
   {id:'vikram', n:'Vikram Rao',    role:'mgr',  cat:'', mgr:'', title:'Sales manager · P&C and Marine team'},
   {id:'priya',  n:'Priya Nair',    role:'rm',   cat:'', mgr:'meera', title:'Relationship manager'},
   {id:'meera',  n:'Meera Pillai',  role:'rmhead', cat:'', mgr:'', title:'Head of relationship management'},
   {id:'radha',  n:'Radha Iyer',    role:'cs',   cat:'', mgr:'', title:'Customer Success · post-purchase desk'}
  ];
  function A(id,n,pan,gst,o){ var a=Object.assign({id:id,n:n,trade:'',pan:pan||'',gst:gst||'',city:'',st:'',ind:'',emp:'',to:'',grp:'—',own:'nikhil',prov:0,con:[],pols:[],recs:[],prof:null,fin:null,sis:[],createdAt:ago(400),createdBy:'nikhil',log:[]},o||{}); if(!a.prov){ a.kycBy=a.kycBy||a.own; a.kycAt=a.kycAt||a.createdAt+20*86400000; a.kycHow=a.kycHow||(a.aad?'PAN card and Aadhaar uploaded':'PAN card and GST certificate uploaded · PAN matched the PAN inside the GSTIN'); } return a; }
  var accounts=[
   /* [6 Oct · demo] Exactly three accounts, one per flow case, all verified and policy-free
      so each flow runs clean from New Lead and no renewal line is auto-created. */
   A('A-1001','Sharma Industries Pvt Ltd','AABCS1234F','27AABCS1234F1Z5',{trade:'Sharma Steel',city:'Pune',st:'Maharashtra',ind:'Auto components',emp:'240',to:'₹86 Cr',grp:'Sharma Group',own:'nikhil',createdAt:ago(40),
     con:[{n:'Rahul Mehta',d:'Finance Head',m:'+91 98200 44112',e:'rahul.mehta@sharmaind.in',dm:1}],
     prof:{risk:'Moderate',cls:'Manufacturing · auto ancillary · NIC 29300',exp:'Two plants, Pune and Chakan. Blue-collar workforce — Workmen’s Compensation is the live need.'},
     fin:{rev:'₹86.4 Cr',pat:'₹4.1 Cr',net:'₹22.8 Cr',yr:'FY 2025-26',cin:'U29300PN2009PTC134221',read:'12 Sep 2026'}}),
   A('A-1002','Northgate Systems Pvt Ltd','AAECN3348D','27AAECN3348D1ZG',{city:'Mumbai',st:'Maharashtra',ind:'IT infrastructure',emp:'180',to:'₹74 Cr',own:'nikhil',createdAt:ago(35),
     con:[{n:'Sanjay Bhatt',d:'CFO',m:'+91 99300 41127',e:'sanjay.bhatt@northgate.co.in',dm:1}],
     prof:{risk:'Moderate',cls:'IT infrastructure services · NIC 62099',exp:'Data-centre build and managed services — internet-facing systems. Cyber is the live need.'},
     fin:{rev:'₹74.2 Cr',pat:'₹5.1 Cr',net:'₹29.7 Cr',yr:'FY 2025-26',cin:'U62099MH2012PTC229104',read:'15 Sep 2026'}}),
   A('A-1003','Meridian Chemicals Ltd','AACCM2210K','24AACCM2210K1Z9',{city:'Vadodara',st:'Gujarat',ind:'Specialty chemicals',emp:'680',to:'₹410 Cr',grp:'Meridian Group',own:'nikhil',createdAt:ago(30),
     con:[{n:'Devang Shah',d:'Head of Risk',m:'+91 99240 18876',e:'devang.shah@meridianchem.com',dm:1}],
     prof:{risk:'High',cls:'Manufacture of chemicals · NIC 20119',exp:'Two independent directors appointed in FY26. Directors & Officers is the live need.'},
     fin:{rev:'₹410.2 Cr',pat:'₹31.4 Cr',net:'₹188.0 Cr',yr:'FY 2025-26',cin:'L24100GJ1994PLC021118',read:'8 Sep 2026'}})
  ];
  function O2(id,acct,type,bt,src,created,by_){ var a=by(accounts,acct); return {id:id,acct:acct,type:type,bt:bt,src:src,created:created,by:by_}; }
  var opps=[
   O2('OPP-001001','A-1001','New Business','Fresh','Website',ago(0,2),'system'),
   O2('OPP-001002','A-1002','New Business','Fresh','Website',ago(0,4),'system'),
   O2('OPP-001003','A-1003','New Business','Fresh','Website',ago(0,6),'system')
  ];
  var contactsOf=function(acct){ var a=by(accounts,acct); return a&&a.con[0]?{n:a.con[0].n,e:a.con[0].e||'',m:a.con[0].m||''}:{n:'',e:'',m:''}; };
  function L(id,opp,acct,product,owner,stage,o){
    o=o||{}; var idle=o.idle===undefined?2:o.idle, created=o.createdAt||ago(idle+3);
    var l={id:id,opp:opp,acct:acct,product:product,owner:owner,stage:stage,status:o.status||'open',reason:o.reason||'',revisit:o.revisit||0,
      att:o.att===undefined?(stage>=2?2:0):o.att, rate:stage>=3?(RATEABLE[product]?1:0):null, rfq:{st:'none',f:{}},
      req:stage>=3?(o.req||{si:o.si||'₹12 Cr',tp:o.tp||'₹2,40,000',to:'—',tob:'Manufacturing',noc:'Private limited',pol:'y',ins:'',exp:'',ten:'1 year',clm:'No claims in 3 years',pan:''}):null,
      round:1,qAns:o.qAns||0,obj:'',qsel:[],picked:o.picked||'',prem:o.prem||240000,ins:o.ins||'',pay:o.pay||'pre',payMode:o.payMode||'',amt:0,payLines:[],renews:o.renews||'',
      enteredAt:o.enteredAt||ago(idle),createdAt:created,assignedAt:o.assignedAt||created,src:o.src||'',contact:contactsOf(acct),
      log:o.log||[{at:created,t:'Product line created',m:'System',sys:1,kind:'sys'}]};
    if(stage>=8 && !l.picked && stage<11) l.picked='';
    if(stage>=9 && !l.picked) l.picked = l.rate?'ICICI Lombard':'New India Assurance';
    if(l.picked) l.ins=l.picked;
    if(stage>=2 && idle>0 && !o.log) l.log.push({at:ago(idle),t:'Stage entered: '+STAGES[stage-1].s,m:'System',sys:1,kind:'stage'});
    if(o.lastCall) l.log.push({at:o.lastCall,t:'Call · '+(o.lastCallD||'Asked to call back later'),m:'',sys:0,kind:'call'});
    return l;
  }
  var lines=[
   /* DUA case — Workmen’s Compensation on a manufacturer with a blue-collar workforce */
   L('OP-2001','OPP-001001','A-1001','Workmen’s Compensation','nikhil',1,{idle:0,att:0,src:'Website',assignedAt:ago(0,2),createdAt:ago(0,2),prem:36000}),
   /* Non-DUA case — Cyber Liability (never rateable → RFQ, then placement) */
   L('OP-2002','OPP-001002','A-1002','Cyber Liability','nikhil',1,{idle:0,att:0,src:'Website',assignedAt:ago(0,4),createdAt:ago(0,4),prem:142000}),
   /* DUA-turned-Non-DUA case — D&O starts DUA (made rateable above) then switches on an empty rater */
   L('OP-2003','OPP-001003','A-1003','Directors & Officers','nikhil',1,{idle:0,att:0,src:'Website',assignedAt:ago(0,6),createdAt:ago(0,6),prem:210000})
  ];
  /* postSeed skipped — the 3-line demo seeds no paid/post-purchase lines */
  /* [8 Oct · demo] A small RM book: four issued post-purchase lines split across the two
     RMs (Priya, Rohan) — two active, two with a policy due for renewal within 90 days.
     Each issuance ticket is closed, so nothing shows as an open service ticket. */
  (function(){
    function rmLine(acc, lineId, prod, owner, soldBy, soldName, prem, si, ins, exp, paidAgo, issId, polId){
      var a=by(accounts, acc);
      a.pols.push({id:polId, ins:ins, p:prod, si:si, pr:prem, exp:exp, endo:0, issuing:0, line:lineId});
      var oppId='OPP-'+lineId.slice(3);
      var l=L(lineId, oppId, acc, prod, owner, 14, {idle:0, att:3, prem:prem, picked:ins, ins:ins, pay:'paid', si:si, createdAt:ago(paidAgo+20), enteredAt:ago(Math.max(1,paidAgo-6))});
      l.paidAt=ago(paidAgo); l.soldBy=soldBy; l.soldName=soldName; l.amt=prem;
      l.hand={note:'', by:soldBy, at:ago(paidAgo), utr:'', proof:'Payment screenshot', read:'matched'};
      l.iss={id:issId, owner:'radha', createdAt:ago(paidAgo), assignedAt:ago(paidAgo), stage:'closed', skip12:false,
        rows:{rhl:{mode:'sys',st:'sent',fu:0,at:ago(paidAgo)}, pf:{mode:'dig',st:'done',fu:0,recv:1,at:ago(paidAgo-2)}, md:{mode:'dig',st:'done',fu:0,at:ago(paidAgo-2),ref:'MD-'+lineId.slice(3)}, pol:{st:'sent',fu:0,esc:0,copy:1,inv:1,at:ago(paidAgo-4)}}, mail:[]};
      lines.push(l);
      opps.push(O2(oppId, acc, 'New Business', 'Fresh', 'Referral', ago(paidAgo+20), 'system'));
    }
    accounts.push(A('A-1101','Vector Logistics Pvt Ltd','AABCV1234K','27AABCV1234K1Z8',{trade:'Vector',city:'Pune',st:'Maharashtra',ind:'Logistics & warehousing',emp:'180',to:'₹64 Cr',grp:'—',own:'priya',createdAt:ago(380),con:[{n:'Anil Kapoor',d:'Finance Head',m:'+91 98191 20012',e:'anil.kapoor@vectorlog.in',dm:1}]}));
    accounts.push(A('A-1102','Crestline Pharma Pvt Ltd','AAFCC5678L','24AAFCC5678L1Z2',{trade:'Crestline',city:'Ahmedabad',st:'Gujarat',ind:'Pharmaceuticals',emp:'320',to:'₹140 Cr',grp:'—',own:'priya',createdAt:ago(360),con:[{n:'Reena Desai',d:'Company Secretary',m:'+91 99250 33471',e:'reena.desai@crestlinepharma.in',dm:1}]}));
    accounts.push(A('A-1103','Ironwood Textiles Ltd','AAGCI9012M','24AAGCI9012M1Z0',{trade:'Ironwood',city:'Surat',st:'Gujarat',ind:'Textile mill',emp:'450',to:'₹98 Cr',grp:'—',own:'priya',createdAt:ago(400),con:[{n:'Mahesh Shah',d:'Director',m:'+91 98252 77810',e:'mahesh.shah@ironwoodtex.in',dm:1}]}));
    accounts.push(A('A-1104','Summit Foods Pvt Ltd','AAHCS3456N','29AAHCS3456N1Z4',{trade:'Summit Foods',city:'Bengaluru',st:'Karnataka',ind:'Food processing',emp:'260',to:'₹72 Cr',grp:'—',own:'priya',createdAt:ago(350),con:[{n:'Latha Rao',d:'HR Head',m:'+91 98860 55123',e:'latha.rao@summitfoods.in',dm:1}]}));
    rmLine('A-1101','OP-2101','Fire & Special Perils','priya','nikhil','Nikhil Sharma',185000,'₹40 Cr','ICICI Lombard',ago(-305),60,'ISS-0501','POL-FIR-2026-2101');
    rmLine('A-1102','OP-2102','Directors & Officers','priya','aarti','Aarti Menon',168000,'₹15 Cr','HDFC Ergo',ago(-45),320,'ISS-0502','POL-DO-2026-2102');
    rmLine('A-1103','OP-2103','Burglary','priya','nikhil','Nikhil Sharma',96000,'₹8 Cr','Tata AIG',ago(-325),40,'ISS-0503','POL-BUR-2026-2103');
    rmLine('A-1104','OP-2104','Fire & Special Perils','priya','aarti','Aarti Menon',120000,'₹25 Cr','Bajaj Allianz',ago(-75),290,'ISS-0504','POL-FIR-2026-2104');
  })();
  /* [8 Oct] website leads carry the funnel step they dropped at (drives P0–P3 priority) */
  (function(){
    var LN=function(id){ return lines.filter(function(l){return l.id===id;})[0]; };
    if(LN('OP-2001')) LN('OP-2001').drop='KYC verified';                 /* P0 */
    if(LN('OP-2002')) LN('OP-2002').drop='View all the available quotes'; /* P1 */
    if(LN('OP-2003')) LN('OP-2003').drop='L1 completed';                 /* P2 */
    function webLeadSeed(acc, nm, city, stt, ind, lineId, prod, owner, drop, prem, aH, cn, ce){
      accounts.push(A(acc, nm, '', '', {city:city,st:stt,ind:ind,own:owner,prov:1,createdAt:ago(0,aH+1),con:[{n:cn,d:'',m:'',e:ce,dm:1}]}));
      var oppId='OPP-'+lineId.slice(3);
      opps.push(O2(oppId, acc, 'New Business','Fresh','Website', ago(0,aH+1),'system'));
      var l=L(lineId, oppId, acc, prod, owner, 1, {idle:0, att:0, src:'Website', assignedAt:ago(0,aH), createdAt:ago(0,aH+1), prem:prem});
      l.drop=drop; lines.push(l);
    }
    webLeadSeed('A-1201','Trimline Industries','Nashik','Maharashtra','Engineering workshop','OP-2130','Burglary','nikhil','Company name filled',40000,5,'Sameer Joshi','sameer@trimline.in');   /* P3 */
    webLeadSeed('A-1202','Peakform Analytics','Bengaluru','Karnataka','IT and software services','OP-2140','Cyber Liability','priya','Company details page submit',90000,2,'Divya Rao','divya@peakform.io'); /* P0 */
    webLeadSeed('A-1203','Greenfield Agro','Indore','Madhya Pradesh','Food processing','OP-2141','Fire & Special Perils','priya','OTP Entered',60000,8,'Alok Verma','alok@greenfieldagro.in'); /* P1 */
    webLeadSeed('A-1204','Novexa Health','Hyderabad','Telangana','Healthtech','OP-2142','Cyber Liability','priya','Quote selected by user',110000,1,'Sana Khan','sana@novexa.health'); /* P1 */
    webLeadSeed('A-1205','Harbour Freight','Mumbai','Maharashtra','Logistics & warehousing','OP-2143','Marine Cargo','priya','L1 completed',75000,3,'Nisha Pillai','nisha@harbourfreight.in'); /* P2 */
    webLeadSeed('A-1206','Crafton Interiors','Jaipur','Rajasthan','Trading and distribution','OP-2144','Burglary','priya','Company name filled',38000,6,'Rohit Jain','rohit@crafton.in'); /* P3 */
  })();
  rfqSeedAll(lines,accounts);
  renSeedFix(lines,accounts,opps,users);
  polSeedFix(accounts);   /* [stated 23 Sep] every policy gets a start date and a Fresh / Cross-sell / Renewal type */
  function Tk(id,line,owner,title,cls,createdAgoDays,dueAt,escAt,rule){ return {id:id,line:line,acct:null,owner:owner,title:title,cls:cls,createdAt:ago(createdAgoDays),dueAt:dueAt,escAt:escAt||0,done:0,doneAt:0,doneBy:'',rule:rule||''}; }
  var tasks=[
   Tk('T-8001','OP-2001','nikhil','Call the new lead','SLA',0,addWork(ago(0,2),240),addWork(addWork(ago(0,2),240),240),'TR-01'),
   Tk('T-8002','OP-2002','nikhil','Call the new lead','SLA',0,addWork(ago(0,4),240),addWork(addWork(ago(0,4),240),240),'TR-01'),
   Tk('T-8003','OP-2003','nikhil','Call the new lead','SLA',0,addWork(ago(0,6),240),addWork(addWork(ago(0,6),240),240),'TR-01')
  ];
  /* task rules — condition sets (spec 07 v3). C(type,op,value,task); AND inside a group, OR between groups */
  function C(type,op,value,task){ return {type:type,op:op,value:String(value),task:task||''}; }
  function R(o){ var r={id:'',n:'',when:[[]],pf:[],rt:'',ot:'',ap:'all',pp:[],gp:'',waitN:0,waitU:'h',recheck:'off',ti:'',cl:'sla',du:1,duu:'d',ec:1,ecu:'d',repeat:false,max:0,closeWhen:[],from:'2026-04-01',until:'',sea:'',act:1,fd:0}; for(var k in o) r[k]=o[k]; return r; }
  var st=function(n){return C('stage','is',n);}, notSt=function(n){return C('stage','isnot',n);}, isOpen=function(){return C('status','is','open');};
  var rules=[
   R({id:'TR-01',n:'Work the new lead',when:[[st(1),isOpen()]],ti:'Call the new lead',cl:'sla',du:4,duu:'h',ec:4,ecu:'h',recheck:'hourly',closeWhen:[[notSt(1)]],fd:128}),
   R({id:'TR-02',n:'Chase the RFQ',when:[[st(4),isOpen()]],ti:'Chase the RFQ with the client',cl:'sla',du:3,duu:'d',ec:2,ecu:'d',recheck:'daily',closeWhen:[[notSt(4)]],fd:34}),
   R({id:'TR-03',n:'Callback',when:[[C('disp','is','Asked to call back later'),isOpen()]],ti:'Call the client back',cl:'fu',du:2,duu:'d',ec:0,ecu:'d',recheck:'off',closeWhen:[[C('disp','isnot','Asked to call back later')]],fd:61}),
   R({id:'TR-04',n:'Chase the payment',when:[[st(10),isOpen()]],ti:'Payment details shared — still unpaid',cl:'sla',du:6,duu:'h',ec:6,ecu:'h',recheck:'hourly',closeWhen:[[notSt(10)]],fd:22}),
   R({id:'TR-05',n:'Marine quote review',when:[[st(8)]],pf:['Marine Cargo'],ap:'grp',gp:'Marine group',ti:'Review the quote before it goes out',cl:'sla',du:1,duu:'d',ec:1,ecu:'d',recheck:'off',from:'2026-07-01',fd:9}),
   R({id:'TR-06',n:'Chase placement for quotes',when:[[st(6),isOpen()]],rt:'plc',ti:'Chase placement for quotes',cl:'sla',du:2,duu:'d',ec:2,ecu:'d',recheck:'daily',closeWhen:[[notSt(6)]],from:'2026-05-01',fd:0}),
   R({id:'TR-07',n:'Renewal consultation',when:[[st(2)]],ot:'ren',ti:'Set up the renewal consultation',cl:'fu',du:3,duu:'d',ec:0,ecu:'d',recheck:'off',sea:'renewal',act:0,fd:44}),
   /* RM clocks — [proposed] values, editable here */
   R({id:'TR-09',n:'Chase the proposal form and mandate',when:[[st(12)]],ti:'Chase the proposal form and mandate',cl:'fu',du:2,duu:'d',ec:0,ecu:'d',waitN:1,waitU:'d',recheck:'daily',repeat:true,max:3,closeWhen:[[notSt(12)]],from:'2026-09-21',fd:2}),
   /* chains that only the condition model can express */
   R({id:'TR-11',n:'Follow-up call after no connect',when:[[st(2),C('disp','is','group:nc'),isOpen()]],waitN:4,waitU:'h',recheck:'hourly',ti:'Follow-up call',cl:'fu',du:4,duu:'h',ec:0,ecu:'h',repeat:true,max:0,closeWhen:[[C('disp','is','group:c')],[notSt(2)]],from:'2026-09-01',fd:17}),
   R({id:'TR-12',n:'Quote sent · follow-up',when:[[st(8),isOpen()]],waitN:1,waitU:'d',recheck:'daily',ti:'Quote sent follow-up',cl:'fu',du:1,duu:'d',ec:0,ecu:'d',repeat:true,max:0,closeWhen:[[notSt(8)]],from:'2026-09-01',fd:11}),
   R({id:'TR-13',n:'Time Pending · revisit',when:[[C('status','is','park')]],waitN:5,waitU:'d',recheck:'daily',ti:'Revisit the parked line',cl:'fu',du:1,duu:'d',ec:0,ecu:'d',repeat:true,max:0,closeWhen:[[C('status','isnot','park')]],from:'2026-09-01',fd:3})
  ];
  var cfg={ws:10,we:19,dailyH:10,hol:['2026-01-01','2026-01-14','2026-01-26','2026-03-04','2026-03-31','2026-05-28','2026-09-14','2026-10-02','2026-10-20','2026-11-09','2026-12-25']};
  /* service tickets — the RM's book */
  var svc=[];
  /* [stated 24 Sep · TBD-25/26/27] one mandate covers the account — every insurer, every policy —
     and it is valid for a fixed period of one year from signature. Nothing is ever marked revoked. */
  var mandates=[];
  return {users:users, accounts:accounts, opps:opps, lines:lines, tasks:tasks, rules:rules, cfg:cfg, rlog:[], svc:svc, mandates:mandates, seq:{opp:1097, line:2950, task:8950, acct:1020, svc:419, clm:920, iss:443, md:4, bkpol:BKPOL_SEQ}, took:[]};
}
function shortName(n){ return String(n).replace(/\s+(Pvt\.?|Private|Ltd\.?|Limited|LLP|\(Gujarat\))\b.*$/i,'').trim()||n; }

var ENDO={
 'Change in sum insured':{cat:'Financial', d:'Increases or reduces the sum insured. Premium is recalculated and a payment link goes to the client.', f:[['Revised sum insured','cur',1],['Effective date','date',1],['Reason for the change','long',1]], docs:[['Valuation report',1],['Board resolution',0]]},
 'Addition of location':{cat:'Financial', d:'Adds a premises to the schedule. The insurer re-rates for the new location.', f:[['Address line','text',1],['PIN code','pin',1],['Nature of occupancy','sel',1,['Godown','Factory','Office','Retail']],['Value of asset at this location','cur',1]], docs:[['Address proof',1],['Site photographs',0]]},
 'Change in name':{cat:'Non-Financial', d:'Corrects or updates the insured’s legal name. No premium impact.', f:[['New legal name','text',1],['Effective date','date',1]], docs:[['Certificate of incorporation',1],['Board resolution',1]]},
 'Change in bank details':{cat:'Non-Financial', d:'Updates the account the insurer pays claims and refunds into.', f:[['Bank name','text',1],['Account number','text',1],['IFSC','text',1]], docs:[['Cancelled cheque',1]]},
 'Cancellation and refund':{cat:'Refund', d:'Cancels the policy. The refund is calculated by the insurer; the client consents on BimaKendra.', f:[['Reason for cancellation','long',1],['Effective date','date',1]], docs:[['Cancellation request letter',1]]},
 'Other':{cat:'', d:'Free text. The category is set by the Service Executive at verification, so no category is shown yet.', f:[['Describe what needs to change','long',1]], docs:[['Supporting document — optional',0]]}
};
/* [stated 26 Sep · 13.1] endorsement types come from the master per product group */
var ENDO_BY_GRP={'Property & casualty':['Change in sum insured','Addition of location','Change in name','Change in bank details','Cancellation and refund','Other'],'Marine & liability':['Change in sum insured','Change in name','Change in bank details','Cancellation and refund','Other'],'Employee benefits':[]};
function endoTypes(p){ return p?(ENDO_BY_GRP[CATOF[p.p]||'Property & casualty']||[]):[]; }
var CAUSES=['Fire','Burglary or theft','Flood or inundation','Transit damage','Machinery breakdown','Third-party liability notice','Storm or cyclone','Other'];
var PHASES=['Submitted','Under review','With insurer','Payment','Completed'];
var GROUPS={'Marine group':['anand','sameer'],'Fire group':['nikhil','aarti'],'Liability group':['anand','sameer','nikhil']};
