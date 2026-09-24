/* ==================================================================== *
 *  Seed data. Everything dated relative to the seed clock T0.
 * ==================================================================== */
var STAGES=[
 {n:1, s:'New Lead',                     t:'New Lead',        w:'Us'},
 {n:2, s:'Consultation Setup',           t:'Consultation',    w:'Us'},
 {n:3, s:'Details Captured',             t:'Details Captured', w:'Us'},
 {n:4, s:'RFQ Shared for Client Review', t:'Client Review',   w:'Client'},
 {n:5, s:'RFQ Verified by Client',       t:'RFQ Verified',    w:'Us'},
 {n:6, s:'Quote Requested',              t:'Quote Requested', w:'Placement'},
 {n:7, s:'Quotes Received',              t:'Quotes Received', w:'Us'},
 {n:8, s:'Quote Sent',                   t:'Quote Sent',      w:'Client'},
 {n:9, s:'Purchase Requested',           t:'Purchase Requested', w:'Us / Ops'},
 {n:10,s:'Payment Details Shared with Client', t:'Payment Details Shared', w:'Client'},
 {n:11,s:'Payment Completed',            t:'Paid',            w:'Post-purchase'},
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
var RATEABLE={'Fire & Special Perils':1,'Burglary':1,'Workmen’s Compensation':1,'Group Health':0,'Marine Cargo':0,'Commercial General Liability':0,'Cyber Liability':0,'Directors & Officers':0,'Professional Indemnity':0,'Industrial All Risk':0,'Contractors All Risk':0,'Erection All Risk':0};
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
var SRCS=['Referral','Cold outreach','Event or meeting','Existing client','Partner','Other'];
var BTYPE={fresh:'Fresh', roll:'Market rollover'};
var LOSS=['Do Not Call','Bought directly from the insurer','Bought directly from another broker','Bought directly from an insurance agent','Delay in quote delivery','Lower premium offered','Premium too high','In-person meeting not possible','Wants cashback','Reason not shared'];
var DISQ=['Invalid phone number','Invalid email ID','Non-insurable risk','Internal testing'];
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
var CAT_ROUTE={'Property & casualty':['nikhil','aarti'],'Marine & liability':['anand','sameer'],'Employee benefits':['divya']};

function seed(){
  var users=[
   {id:'nikhil', n:'Nikhil Sharma', role:'exec', cat:'Property & casualty', mgr:'vikram', title:'Sales executive · Property & casualty'},
   {id:'aarti',  n:'Aarti Menon',   role:'exec', cat:'Property & casualty', mgr:'vikram', title:'Sales executive · Property & casualty'},
   {id:'anand',  n:'Anand Kulkarni',role:'exec', cat:'Marine & liability',  mgr:'vikram', title:'Sales executive · Marine & liability'},
   {id:'divya',  n:'Divya Shah',    role:'exec', cat:'Employee benefits',   mgr:'vikram', title:'Sales executive · Employee benefits'},
   {id:'sameer', n:'Sameer Joshi',  role:'exec', cat:'Marine & liability',  mgr:'vikram', title:'Sales executive · Marine & liability'},
   {id:'vikram', n:'Vikram Rao',    role:'mgr',  cat:'', mgr:'', title:'Sales manager · P&C and Marine team'},
   {id:'priya',  n:'Priya Nair',    role:'rm',   cat:'', mgr:'meera', title:'Relationship manager'},
   {id:'rohan',  n:'Rohan Desai',   role:'rm',   cat:'', mgr:'meera', title:'Relationship manager'},
   {id:'meera',  n:'Meera Pillai',  role:'rmhead', cat:'', mgr:'', title:'Head of relationship management'},
   {id:'radha',  n:'Radha Iyer',    role:'cs',   cat:'', mgr:'', title:'Customer Success · post-purchase desk'}
  ];
  function A(id,n,pan,gst,o){ return Object.assign({id:id,n:n,pan:pan||'',gst:gst||'',city:'',st:'',ind:'',emp:'',to:'',grp:'—',own:'nikhil',prov:0,con:[],pols:[],recs:[],prof:null,fin:null,sis:[],createdAt:ago(400)},o||{}); }
  var accounts=[
   A('A-1001','Sharma Industries Pvt Ltd','AABCS1234F','27AABCS1234F1Z5',{city:'Pune',st:'Maharashtra',ind:'Auto components',emp:'240',to:'₹86 Cr',grp:'Sharma Group',own:'priya',
     con:[{n:'Rahul Mehta',d:'Finance Head',m:'+91 98200 44112',e:'rahul.mehta@sharmaind.in',dm:1},{n:'Anita Desai',d:'Plant Ops Manager',m:'+91 98200 71906',e:'anita.desai@sharmaind.in'}],
     pols:[{id:'POL-BUR-2024-3310',ins:'New India Assurance',p:'Burglary',si:'₹18 Cr',pr:281000,start:at(2024,9,27),exp:at(2025,9,26),endo:0,expired:1,ptype:'Fresh'},{id:'POL-FSP-2025-8841',ins:'New India Assurance',p:'Fire & Special Perils',si:'₹18 Cr',pr:294000,start:at(2025,11,15),exp:at(2026,11,14),endo:2,ptype:'Cross-sell',line:'OP-1876'},{id:'POL-WC-2025-1180',ins:'ICICI Lombard',p:'Workmen’s Compensation',si:'₹2 Cr',pr:48000,start:at(2026,4,1),exp:at(2027,3,31),endo:0,ptype:'Cross-sell'},{id:'POL-BUR-2025-7702',ins:'New India Assurance',p:'Burglary',si:'₹20 Cr',pr:305000,start:at(2025,9,27),exp:at(2026,9,26),endo:0,prev:'POL-BUR-2024-3310',ptype:'Renewal'}],
     recs:[{p:'Cyber Liability',why:'No cover held. 71% of auto component makers in the ₹50–100 Cr turnover band hold it.',src:'Bimanetra, computed 14 Sep 2026'},{p:'Directors & Officers',why:'Two independent directors appointed in FY26 per MCA filings. No D&O in force.',src:'Bimanetra, computed 14 Sep 2026'}],
     prof:{risk:'Moderate',cls:'Manufacturing · auto ancillary · NIC 29300',exp:'Two plants, Pune and Chakan. Fire is the dominant exposure.'},
     fin:{rev:'₹86.4 Cr',pat:'₹4.1 Cr',net:'₹22.8 Cr',yr:'FY 2025-26',cin:'U29300PN2009PTC134221',read:'12 Sep 2026'},
     sis:[{n:'Sharma Auto Components Pvt Ltd',r:'Subsidiary',cin:'U29253PN2014PTC152110',ind:'Auto components',to:'₹19 Cr'},{n:'Sharma Holdings Pvt Ltd',r:'Parent',cin:'U65990PN2004PTC119882',ind:'Holding company',to:'—'},{n:'Deccan Precision Tools Pvt Ltd',r:'Fellow subsidiary',cin:'U28939PN2011PTC141003',ind:'Tooling',to:'₹12 Cr'}]}),
   A('A-1006','Sharma Industries (Gujarat)','AABCS1234F','24AABCS1234F1ZP',{city:'Vapi',st:'Gujarat',ind:'Auto components',emp:'60',to:'₹14 Cr',grp:'Sharma Group',own:'nikhil',
     con:[{n:'Rahul Mehta',d:'Finance Head',m:'+91 98200 44112',e:'rahul.mehta@sharmaind.in',dm:1}],prof:{risk:'Low',cls:'Manufacturing · auto ancillary',exp:'Single unit, Vapi.'},fin:{rev:'₹14.2 Cr',pat:'₹0.7 Cr',net:'₹3.9 Cr',yr:'FY 2025-26',cin:'—',read:'12 Sep 2026'}}),
   A('A-1003','Kalyan Logistics Pvt Ltd','AAECK9912J','27AAECK9912J1ZR',{city:'Bhiwandi',st:'Maharashtra',ind:'Logistics and warehousing',emp:'410',to:'₹152 Cr',grp:'Kalyan Group',own:'priya',
     con:[{n:'Rahul Nair',d:'CFO',m:'+91 99300 21874',e:'rahul.nair@kalyanlog.in',dm:1},{n:'Sunita Rane',d:'Admin Head',m:'+91 99300 55210',e:'sunita.rane@kalyanlog.in'}],
     pols:[{id:'POL-MC-2026-4417',ins:'Tata AIG',p:'Marine Cargo',si:'₹40 Cr',pr:298000,exp:at(2026,11,2),endo:3,line:'OP-1874'},{id:'POL-FIRE-2026-2210',ins:'Bajaj Allianz',p:'Fire & Special Perils',si:'₹24 Cr',pr:336000,exp:at(2026,11,2),endo:1}],
     recs:[{p:'Cyber Liability',why:'Warehouse management system is internet-facing. No cover held.',src:'Bimanetra, computed 11 Sep 2026'}],
     prof:{risk:'Elevated',cls:'Transport and storage · NIC 52109',exp:'Multi-location warehousing. Marine and fire both material.'},fin:{rev:'₹152.0 Cr',pat:'₹9.8 Cr',net:'₹61.2 Cr',yr:'FY 2025-26',cin:'U63030MH2006PTC162884',read:'9 Sep 2026'},sis:[{n:'Kalyan Warehousing LLP',r:'Fellow subsidiary',cin:'AAK-8821',ind:'Warehousing',to:'₹31 Cr'}]}),
   A('A-1002','Verdant Agro Exports LLP','AAGCV4471M','27AAGCV4471M1ZT',{city:'Nashik',st:'Maharashtra',ind:'Agri exports',emp:'85',to:'₹31 Cr',own:'aarti',prov:1,
     con:[{n:'Priya Kulkarni',d:'Director',m:'+91 98220 31145',e:'priya@verdantagro.in',dm:1}],prof:{risk:'Moderate',cls:'Agriculture and food · NIC 01300',exp:'Cold chain and marine exposure.'},fin:{rev:'₹30.8 Cr',pat:'₹1.2 Cr',net:'₹8.4 Cr',yr:'FY 2025-26',cin:'AAG-4471',read:'15 Sep 2026'}}),
   A('A-1004','Sunrise Tech Solutions','BXQPS7781L','',{aad:'XXXX XXXX 4412',city:'Bengaluru',st:'Karnataka',ind:'IT services',emp:'12',to:'₹2.4 Cr',own:'nikhil',prov:1,sole:1,
     con:[{n:'Vikas Shetty',d:'Proprietor',m:'+91 98450 77120',e:'vikas@sunrisetech.co.in',dm:1}],recs:[{p:'Professional Indemnity',why:'Software services to overseas clients. No PI in force.',src:'Bimanetra, computed 16 Sep 2026'}],
     prof:{risk:'Low',cls:'Information and communication · NIC 62011',exp:'No premises risk of consequence. Liability is the exposure.'},fin:{rev:'₹2.4 Cr',pat:'—',net:'—',yr:'FY 2025-26',cin:'Sole proprietorship — not registered with MCA',read:'16 Sep 2026'}}),
   A('A-1005','Meridian Chemicals Ltd','AACCM2210K','24AACCM2210K1Z9',{city:'Vadodara',st:'Gujarat',ind:'Specialty chemicals',emp:'680',to:'₹410 Cr',grp:'Meridian Group',own:'priya',
     con:[{n:'Devang Shah',d:'Head of Risk',m:'+91 99240 18876',e:'devang.shah@meridianchem.com',dm:1}],pols:[{id:'POL-IAR-2026-0031',ins:'ICICI Lombard',p:'Industrial All Risk',si:'₹280 Cr',pr:2840000,exp:at(2027,1,31),endo:5},{id:'POL-WC-2025-3310',ins:'ICICI Lombard',p:'Workmen’s Compensation',si:'₹12 Cr',pr:296000,exp:at(2026,9,21),endo:0},{id:'POL-GH-2025-3311',ins:'ICICI Lombard',p:'Group Health',si:'₹5 L per member',pr:1480000,exp:at(2026,9,21),endo:1}],
     prof:{risk:'High',cls:'Manufacture of chemicals · NIC 20119',exp:'Process hazard. IAR and liability both material.'},fin:{rev:'₹410.2 Cr',pat:'₹31.4 Cr',net:'₹188.0 Cr',yr:'FY 2025-26',cin:'L24100GJ1994PLC021118',read:'8 Sep 2026'},sis:[{n:'Meridian Speciality Intermediates Pvt Ltd',r:'Subsidiary',cin:'U24299GJ2012PTC072210',ind:'Chemicals',to:'₹78 Cr'}]}),
   A('A-1009','Ravi Steel Traders Pvt Ltd','AAFCR5521B','03AAFCR5521B1ZK',{city:'Ludhiana',st:'Punjab',ind:'Metal trading',emp:'45',to:'₹58 Cr',own:'nikhil',prov:1,
     con:[{n:'Ravi Bhatia',d:'Managing Director',m:'+91 98140 66231',e:'ravi@ravisteel.in',dm:1}],prof:{risk:'Moderate',cls:'Wholesale trade · NIC 46620',exp:'Stock and storage.'},fin:{rev:'₹57.9 Cr',pat:'₹1.9 Cr',net:'₹11.2 Cr',yr:'FY 2025-26',cin:'U51909PB2010PTC034551',read:'14 Sep 2026'}}),
   A('A-1007','Novacast Foundry Pvt Ltd','AADCN8812P','33AADCN8812P1ZM',{city:'Coimbatore',st:'Tamil Nadu',ind:'Metal casting',emp:'190',to:'₹64 Cr',own:'rohan',
     con:[{n:'S. Balaji',d:'GM Finance',m:'+91 98430 22194',e:'balaji@novacast.co.in',dm:1},{n:'Meena Iyer',d:'Plant Head',m:'+91 98430 55018',dep:1}],
     pols:[{id:'POL-FIRE-2025-9910',ins:'Oriental Insurance',p:'Fire & Special Perils',si:'₹24 Cr',pr:318000,exp:at(2027,8,18),endo:0},{id:'POL-LIA-2025-2019',ins:'Bajaj Allianz',p:'Commercial General Liability',si:'₹5 Cr',pr:312000,exp:at(2026,8,31),endo:0,expired:1},{id:'POL-WC-2025-5521',ins:'New India Assurance',p:'Workmen’s Compensation',si:'₹10 Cr',pr:289000,exp:at(2026,12,10),endo:0},{id:'POL-DNO-2025-5522',ins:'New India Assurance',p:'Directors & Officers',si:'₹8 Cr',pr:264000,exp:at(2026,12,10),endo:0}],
     prof:{risk:'Moderate',cls:'Casting of metals · NIC 24310',exp:'Foundry. Fire and WC.'},fin:{rev:'₹64.1 Cr',pat:'₹3.3 Cr',net:'₹27.4 Cr',yr:'FY 2025-26',cin:'U27310TZ2008PTC014992',read:'2 Sep 2026'}}),
   A('A-1008','Blue Harbour Shipping Pvt Ltd','AAHCB4410N','32AAHCB4410N1ZQ',{city:'Kochi',st:'Kerala',ind:'Shipping agency',emp:'70',to:'₹41 Cr',own:'rohan',
     con:[{n:'Joseph Mathew',d:'Director',m:'+91 98470 31188',e:'joseph@blueharbour.in',dm:1}],pols:[{id:'POL-MC-2025-7741',ins:'New India Assurance',p:'Marine Cargo',si:'₹9 Cr',pr:289000,exp:at(2026,10,12),endo:1},{id:'POL-CGL-2026-2924',ins:'Bajaj Allianz',p:'Commercial General Liability',si:'₹5 Cr',pr:118000,exp:at(2027,9,19),endo:0,line:'OP-2924',period:'20 Sep 2026 – 19 Sep 2027'},{id:'POL-FIRE-2025-3318',ins:'Oriental Insurance',p:'Fire & Special Perils',si:'₹14 Cr',pr:301000,exp:at(2026,12,23),endo:0}],
     prof:{risk:'Low',cls:'Water transport support · NIC 52229',exp:'Agency operations, limited own exposure.'},fin:{rev:'₹41.3 Cr',pat:'₹2.1 Cr',net:'₹14.9 Cr',yr:'FY 2025-26',cin:'U63090KL2011PTC029118',read:'1 Sep 2026'}}),
   A('A-1010','Deccan Precision Tools Pvt Ltd','AADCD7710Q','27AADCD7710Q1ZC',{city:'Chakan',st:'Maharashtra',ind:'Tooling',emp:'120',to:'₹12 Cr',grp:'Sharma Group',own:'nikhil',
     con:[{n:'Suresh Patil',d:'Director',m:'+91 98900 12311',e:'suresh@deccantools.in',dm:1}],prof:{risk:'Moderate',cls:'Manufacture of tools · NIC 25930',exp:'Single plant, Chakan.'},fin:{rev:'₹12.1 Cr',pat:'₹0.6 Cr',net:'₹3.1 Cr',yr:'FY 2025-26',cin:'U28939PN2011PTC141003',read:'10 Sep 2026'}}),
   A('A-1011','Trident Freight Pvt Ltd','AAFCT2201R','',{city:'Mumbai',st:'Maharashtra',ind:'Freight forwarding',emp:'55',to:'₹28 Cr',own:'anand',prov:1,
     con:[{n:'Meera Iyer',d:'Operations Head',m:'+91 98200 11234',e:'meera@tridentfreight.in',dm:1}],prof:{risk:'Moderate',cls:'Freight forwarding · NIC 52291',exp:'Cargo in transit.'},fin:{rev:'₹28.0 Cr',pat:'₹1.1 Cr',net:'₹5.4 Cr',yr:'FY 2025-26',cin:'U63030MH2015PTC260011',read:'18 Sep 2026'}}),
   A('A-1012','Gokhale Textiles Ltd','AAACG3390H','27AAACG3390H1ZQ',{city:'Ichalkaranji',st:'Maharashtra',ind:'Textiles',emp:'520',to:'₹140 Cr',own:'aarti',
     con:[{n:'Prasad Gokhale',d:'CFO',m:'+91 98220 90071',e:'prasad@gokhaletex.com',dm:1}],prof:{risk:'Elevated',cls:'Weaving of textiles · NIC 13121',exp:'Two mills. Fire and boiler exposure.'},fin:{rev:'₹140.3 Cr',pat:'₹6.2 Cr',net:'₹48.0 Cr',yr:'FY 2025-26',cin:'L17110PN1998PLC012345',read:'11 Sep 2026'}}),
   A('A-1013','Orbit Packaging Pvt Ltd','AABCO5567L','27AABCO5567L1ZX',{city:'Nashik',st:'Maharashtra',ind:'Packaging',emp:'95',to:'₹36 Cr',own:'nikhil',
     con:[{n:'Kunal Shah',d:'Managing Director',m:'+91 98230 44190',e:'kunal@orbitpack.in',dm:1}],prof:{risk:'Moderate',cls:'Manufacture of packaging · NIC 17021',exp:'Corrugated stock. Fire.'},fin:{rev:'₹36.2 Cr',pat:'₹1.8 Cr',net:'₹9.9 Cr',yr:'FY 2025-26',cin:'U21021MH2009PTC190210',read:'3 Sep 2026'}}),
   A('A-1014','Pinnacle Realty LLP','AAKFP1120C','27AAKFP1120C1Z3',{city:'Pune',st:'Maharashtra',ind:'Real estate',emp:'40',to:'₹72 Cr',own:'aarti',
     con:[{n:'Rohit Kulkarni',d:'Partner',m:'+91 98500 22331',e:'rohit@pinnaclerealty.in',dm:1}],prof:{risk:'Moderate',cls:'Real estate activities · NIC 68100',exp:'Under-construction sites. CAR and liability.'},fin:{rev:'₹72.0 Cr',pat:'₹8.1 Cr',net:'₹40.2 Cr',yr:'FY 2025-26',cin:'AAK-1120',read:'5 Sep 2026'}}),
   A('A-1015','Apex Infra Projects Ltd','AAACA9901K','27AAACA9901K1ZB',{city:'Mumbai',st:'Maharashtra',ind:'Infrastructure',emp:'900',to:'₹620 Cr',own:'vikram',
     con:[{n:'Nitin Desai',d:'VP Finance',m:'+91 98210 33012',e:'nitin.desai@apexinfra.com',dm:1}],prof:{risk:'High',cls:'Construction · NIC 42101',exp:'Multiple sites. CAR, liability, WC.'},fin:{rev:'₹620.5 Cr',pat:'₹41.0 Cr',net:'₹210.0 Cr',yr:'FY 2025-26',cin:'L45200MH1999PLC120001',read:'7 Sep 2026'}}),
   A('A-1016','Sterling Foods Pvt Ltd','AAHCS4402M','27AAHCS4402M1Z9',{city:'Thane',st:'Maharashtra',ind:'Food processing',emp:'310',to:'₹98 Cr',own:'vikram',
     con:[{n:'Anjali Rao',d:'HR Head',m:'+91 98190 55021',e:'anjali@sterlingfoods.in',dm:1}],prof:{risk:'Moderate',cls:'Food processing · NIC 10790',exp:'Cold storage and staff.'},fin:{rev:'₹98.4 Cr',pat:'₹5.0 Cr',net:'₹31.0 Cr',yr:'FY 2025-26',cin:'U15490MH2005PTC155602',read:'6 Sep 2026'}}),
   /* a fresh inbound for the non-DAU demo: CGL at New Lead */
   A('A-1017','Kaveri Polymers Pvt Ltd','AAGCK7781P','29AAGCK7781P1ZM',{city:'Bengaluru',st:'Karnataka',ind:'Plastic moulding',emp:'140',to:'₹48 Cr',own:'nikhil',createdAt:ago(0,2),
     con:[{n:'Suresh Menon',d:'Director',m:'+91 98450 77120',e:'suresh@kaveripolymers.in',dm:1}],prof:{risk:'Moderate',cls:'Manufacture of plastic products · NIC 22209',exp:'Injection-moulded parts for auto and appliance makers. Product and public liability.'},fin:{rev:'₹48.1 Cr',pat:'₹2.6 Cr',net:'₹14.3 Cr',yr:'FY 2025-26',cin:'U25209KA2011PTC058841',read:'22 Sep 2026'}}),
   /* [stated 23 Sep] the head of RM carries her own accounts — My view has to show a real book */
   A('A-1018','Marigold Hospitality Pvt Ltd','AAJCM5512N','27AAJCM5512N1ZK',{city:'Pune',st:'Maharashtra',ind:'Hotels and hospitality',emp:'520',to:'₹210 Cr',own:'meera',
     con:[{n:'Devika Rao',d:'Finance Controller',m:'+91 98220 66401',e:'devika.rao@marigoldhotels.in',dm:1},{n:'Imran Qureshi',d:'General Manager',m:'+91 98220 66418',e:'imran.q@marigoldhotels.in'}],
     pols:[{id:'POL-FSP-2025-6620',ins:'ICICI Lombard',p:'Fire & Special Perils',si:'₹96 Cr',pr:842000,start:at(2025,11,20),exp:at(2026,11,19),endo:1},
           {id:'POL-BUR-2026-1180',ins:'Tata AIG',p:'Burglary',si:'₹12 Cr',pr:164000,start:at(2026,3,1),exp:at(2027,2,28),endo:0}],
     recs:[{p:'Cyber Liability',why:'Property management and booking systems are internet-facing across nine properties.',src:'Bimanetra, computed 12 Sep 2026'}],
     prof:{risk:'Elevated',cls:'Accommodation · NIC 55101',exp:'Nine properties across Maharashtra and Goa. Fire and public liability both material.'},
     fin:{rev:'₹210.4 Cr',pat:'₹12.6 Cr',net:'₹88.1 Cr',yr:'FY 2025-26',cin:'U55101PN2008PTC131442',read:'12 Sep 2026'}}),
   A('A-1019','Northgate Systems Pvt Ltd','AAECN3348D','27AAECN3348D1ZG',{city:'Mumbai',st:'Maharashtra',ind:'IT infrastructure',emp:'180',to:'₹74 Cr',own:'meera',
     con:[{n:'Sanjay Bhatt',d:'CFO',m:'+91 99300 41127',e:'sanjay.bhatt@northgate.co.in',dm:1}],
     pols:[{id:'POL-CGL-2026-5502',ins:'HDFC Ergo',p:'Commercial General Liability',si:'₹8 Cr',pr:186000,start:at(2026,5,1),exp:at(2027,4,30),endo:0}],
     prof:{risk:'Moderate',cls:'IT infrastructure services · NIC 62099',exp:'Data-centre build and managed services. Liability and employee benefits.'},
     fin:{rev:'₹74.2 Cr',pat:'₹5.1 Cr',net:'₹29.7 Cr',yr:'FY 2025-26',cin:'U62099MH2012PTC229104',read:'15 Sep 2026'}})
  ];
  function O2(id,acct,type,bt,src,created,by_){ var a=by(accounts,acct); return {id:id,acct:acct,name:shortName(a.n)+' — '+type+' — '+MONN[new Date(created).getMonth()]+' '+new Date(created).getFullYear(),type:type,bt:bt,src:src,created:created,by:by_}; }
  var opps=[
   O2('O-1042','A-1001','New Business','Market rollover','Inbound — website',ago(12),'system'),
   O2('O-1051','A-1002','New Business','Fresh','Referral',ago(26),'aarti'),
   O2('O-1055','A-1004','New Business','Fresh','Inbound — website',ago(14),'system'),
   O2('O-1049','A-1009','New Business','Market rollover','Cold outreach',ago(20),'nikhil'),
   O2('O-1060','A-1010','New Business','Fresh','Inbound — website',ago(50),'system'),
   O2('O-1061','A-1013','New Business','Market rollover','Event or meeting',ago(48),'nikhil'),
   O2('O-1062','A-1014','New Business','Fresh','Referral',ago(40),'aarti'),
   O2('O-1063','A-1012','New Business','Market rollover','Inbound — partner',ago(9),'system'),
   O2('O-1064','A-1011','New Business','Fresh','Inbound — website',ago(12),'system'),
   O2('O-1065','A-1003','New Business','Market rollover','Existing client',ago(30),'anand'),
   O2('O-1066','A-1007','New Business','Fresh','Cold outreach',ago(24),'anand'),
   O2('O-1067','A-1005','New Business','Market rollover','Existing client',ago(35),'divya'),
   O2('O-1068','A-1008','New Business','Fresh','Referral',ago(18),'anand'),
   O2('O-1069','A-1006','New Business','Fresh','Existing client',ago(6),'aarti'),
   O2('O-1070','A-1015','New Business','Market rollover','Partner',ago(22),'vikram'),
   O2('O-1071','A-1016','New Business','Fresh','Cold outreach',ago(15),'vikram'),
   /* the RM's own selling: cross-sell and renewal on accounts they own */
   O2('O-1080','A-1003','New Business','Fresh','Existing client',ago(7),'priya'),
   O2('O-1081','A-1005','New Business','Fresh','Existing client',ago(16),'priya'),
   /* [stated 23 Sep] renewals create no opportunity — they are product lines on the account */
   /* last year's fresh buy that the Kalyan marine renewal carries its RFQ over from */
   O2('O-1030','A-1003','New Business','Fresh','Existing client',at(2025,10,6,11),'anand'),
   /* [stated 24 Sep] the DAU-at-fresh case, so the renewal has no RFQ to carry over */
   O2('O-1093','A-1001','New Business','Fresh','Existing client',at(2025,10,2,11),'nikhil'),
   /* paid — in the post-purchase ticket */
   O2('O-1083','A-1003','New Business','Fresh','Existing client',ago(34),'anand'),
   O2('O-1084','A-1005','New Business','Fresh','Cold outreach',ago(41),'divya'),
   O2('O-1085','A-1007','New Business','Market rollover','Cold outreach',ago(30),'anand'),
   O2('O-1086','A-1008','New Business','Fresh','Referral',ago(38),'sameer'),
   O2('O-1087','A-1001','New Business','Fresh','Existing client',ago(20),'nikhil'),
   O2('O-1088','A-1017','New Business','Fresh','Inbound — website',ago(0,2),'system'),
   /* [stated 23 Sep] the heads' own book */
   O2('O-1089','A-1018','New Business','Fresh','Referral',ago(22),'anand'),
   O2('O-1090','A-1019','New Business','Fresh','Existing client',ago(31),'divya'),
   O2('O-1091','A-1019','New Business','Fresh','Existing client',ago(6),'meera'),
   O2('O-1092','A-1016','New Business','Fresh','Referral',ago(1),'vikram')
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
   /* Nikhil */
   L('OP-2203','O-1042','A-1001','Fire & Special Perils','nikhil',2,{idle:1,att:1,src:'Inbound — website',createdAt:ago(12),lastCall:ago(1,2),lastCallD:'Ringing, no answer',prem:340000}),
   L('OP-2201','O-1042','A-1001','Burglary','nikhil',8,{idle:2,prem:64000,picked:'',qAns:1,createdAt:ago(12)}),
   L('OP-2202','O-1042','A-1001','Marine Cargo','aarti',7,{idle:3,prem:92000,createdAt:ago(10)}),
   L('OP-2204','O-1042','A-1001','Cyber Liability','nikhil',6,{idle:5,status:'noapp',reason:'All four insurers declined — occupancy',prem:55000,createdAt:ago(11)}),
   L('OP-2310','O-1060','A-1010','Workmen’s Compensation','nikhil',1,{idle:6,att:0,src:'Inbound — website',assignedAt:ago(6,2),createdAt:ago(6,2),prem:36000}),
   L('OP-2077','O-1060','A-1010','Fire & Special Perils','nikhil',10,{idle:45,prem:210000,picked:'ICICI Lombard',pay:'shared',payMode:'NEFT / RTGS',createdAt:ago(50)}),
   L('OP-2329','O-1063','A-1012','Fire & Special Perils','nikhil',1,{idle:0,att:0,src:'Inbound — partner',assignedAt:ago(0,1),createdAt:ago(0,1),prem:296000}),
   L('OP-2335','O-1088','A-1017','Commercial General Liability','nikhil',1,{idle:0,att:0,src:'Inbound — website',assignedAt:ago(0,2),createdAt:ago(0,2),prem:120000}),
   L('OP-2331','O-1064','A-1011','Burglary','nikhil',1,{idle:0,att:0,src:'Inbound — website',assignedAt:T0.getTime()-8*60000,createdAt:T0.getTime()-8*60000,prem:28000}),
   L('OP-2290','O-1049','A-1009','Fire & Special Perils','nikhil',8,{idle:4,prem:184000,createdAt:ago(20)}),
   L('OP-2244','O-1055','A-1004','Cyber Liability','nikhil',3,{idle:11,prem:48000,createdAt:ago(14)}),
   L('OP-2188','O-1061','A-1013','Commercial General Liability','nikhil',4,{idle:14,prem:74000,createdAt:ago(48)}),
   L('OP-2150','O-1061','A-1013','Fire & Special Perils','nikhil',3,{idle:41,prem:164000,createdAt:ago(48)}),
   L('OP-2102','O-1062','A-1014','Commercial General Liability','nikhil',8,{idle:34,prem:88000,createdAt:ago(40)}),
   L('OP-2015','O-1051','A-1002','Marine Cargo','nikhil',5,{idle:22,status:'park',reason:'Budget or decision deferred',revisit:T0.getTime()-3600000,prem:126000,createdAt:ago(26)}),
   L('OP-2260','O-1065','A-1003','Cyber Liability','nikhil',6,{idle:5,qAns:1,prem:142000,createdAt:ago(30)}),
   L('OP-2233','O-1066','A-1007','Marine Cargo','nikhil',9,{idle:2,prem:72000,picked:'New India Assurance',pay:'ticket',payMode:'NEFT / RTGS',createdAt:ago(24)}),
   /* Aarti */
   L('OP-2401','O-1051','A-1002','Fire & Special Perils','aarti',3,{idle:1,prem:148000,createdAt:ago(26)}),
   L('OP-2402','O-1062','A-1014','Fire & Special Perils','aarti',1,{idle:9,att:0,src:'Inbound — website',assignedAt:ago(9),createdAt:ago(9),prem:164000}),
   L('OP-2403','O-1063','A-1012','Workmen’s Compensation','aarti',9,{idle:2,prem:41000,picked:'ICICI Lombard',createdAt:ago(9)}),
   L('OP-2404','O-1049','A-1009','Commercial General Liability','aarti',4,{idle:19,prem:66000,createdAt:ago(20)}),
   L('OP-2405','O-1069','A-1006','Fire & Special Perils','aarti',2,{idle:2,att:1,prem:120000,createdAt:ago(6)}),
   /* Anand */
   L('OP-2501','O-1065','A-1003','Marine Cargo','anand',8,{idle:2,prem:680000,createdAt:ago(30)}),
   L('OP-2502','O-1065','A-1003','Commercial General Liability','anand',6,{idle:6,qAns:1,prem:142000,createdAt:ago(30)}),
   L('OP-2503','O-1068','A-1008','Marine Cargo','anand',9,{idle:1,prem:214000,picked:'New India Assurance',createdAt:ago(18)}),
   L('OP-2504','O-1066','A-1007','Commercial General Liability','anand',4,{idle:21,prem:58000,createdAt:ago(24)}),
   L('OP-2505','O-1067','A-1005','Commercial General Liability','anand',6,{idle:8,qAns:1,prem:340000,createdAt:ago(35)}),
   L('OP-2506','O-1064','A-1011','Marine Cargo','anand',2,{idle:4,att:2,prem:96000,createdAt:ago(12)}),
   L('OP-2507','O-1064','A-1011','Commercial General Liability','anand',1,{idle:12,att:0,src:'Inbound — website',assignedAt:ago(12),createdAt:ago(12),prem:44000}),
   /* Divya */
   L('OP-2601','O-1067','A-1005','Group Health','divya',7,{idle:3,prem:1240000,createdAt:ago(35)}),
   L('OP-2602','O-1065','A-1003','Group Health','divya',4,{idle:16,prem:486000,createdAt:ago(30)}),
   L('OP-2603','O-1042','A-1001','Group Health','divya',5,{idle:2,prem:268000,createdAt:ago(10)}),
   L('OP-2604','O-1063','A-1012','Group Health','divya',2,{idle:3,att:1,prem:192000,createdAt:ago(9)}),
   L('OP-2605','O-1062','A-1014','Group Health','divya',10,{idle:1,prem:158000,picked:'ICICI Lombard',pay:'shared',payMode:'Cheque',createdAt:ago(40)}),
   L('OP-2606','O-1055','A-1004','Group Health','divya',1,{idle:8,att:0,src:'Inbound — website',assignedAt:ago(8),createdAt:ago(8),prem:34000}),
   /* Sameer */
   L('OP-2701','O-1068','A-1008','Commercial General Liability','sameer',5,{idle:4,prem:62000,createdAt:ago(18)}),
   L('OP-2702','O-1064','A-1011','Cyber Liability','sameer',4,{idle:26,prem:38000,createdAt:ago(12),enteredAt:ago(26)}),
   L('OP-2703','O-1066','A-1007','Workmen’s Compensation','sameer',3,{idle:6,prem:54000,createdAt:ago(24)}),
   L('OP-2704','O-1067','A-1005','Marine Cargo','sameer',6,{idle:9,qAns:1,prem:178000,createdAt:ago(35)}),
   L('OP-2705','O-1061','A-1013','Marine Cargo','sameer',2,{idle:7,att:3,prem:84000,createdAt:ago(48)}),
   L('OP-2706','O-1049','A-1009','Cyber Liability','sameer',1,{idle:15,att:0,src:'Inbound — website',assignedAt:ago(15),createdAt:ago(15),prem:29000}),
   /* Vikram's own book */
   L('OP-2801','O-1070','A-1015','Fire & Special Perils','vikram',8,{idle:2,prem:540000,createdAt:ago(22)}),
   L('OP-2802','O-1070','A-1015','Commercial General Liability','vikram',6,{idle:5,qAns:1,prem:180000,createdAt:ago(22)}),
   L('OP-2803','O-1071','A-1016','Group Health','vikram',4,{idle:9,prem:320000,createdAt:ago(15)}),
   /* RMs selling on their own accounts */
   L('OP-2910','O-1080','A-1003','Cyber Liability','priya',2,{idle:2,att:1,prem:96000,createdAt:ago(7),lastCall:ago(2,1),lastCallD:'Asked to call back later'}),
   L('OP-2911','O-1081','A-1005','Directors & Officers','priya',4,{idle:5,prem:210000,createdAt:ago(16)}),
   L('OP-2912','','A-1008','Marine Cargo','rohan',3,{idle:0,att:0,renews:'POL-MC-2025-7741',createdAt:at(2026,7,14,10),enteredAt:at(2026,7,14,10)}),
   /* renewal lines — every policy on an RM's account inside 90 days of expiry */
   /* [stated 24 Sep] the two Workmen's Compensation renewals are gone — a contractual policy never
      renews. Their demo cases moved to the Group Health and D&O policies on the same accounts. */
   L('OP-2940','','A-1005','Group Health','priya',9,{idle:0,att:2,renews:'POL-GH-2025-3311',picked:'ICICI Lombard',pay:'ticket',payMode:'NEFT / RTGS',createdAt:at(2026,6,23,10),enteredAt:ago(2)}),
   L('OP-2941','','A-1001','Burglary','priya',3,{idle:0,att:0,renews:'POL-BUR-2025-7702',createdAt:at(2026,6,28,10),enteredAt:at(2026,6,28,10)}),
   L('OP-2942','','A-1003','Marine Cargo','priya',3,{idle:0,att:0,renews:'POL-MC-2026-4417',createdAt:at(2026,8,4,10),enteredAt:at(2026,8,4,10)}),
   L('OP-2943','','A-1003','Fire & Special Perils','priya',8,{idle:0,att:1,renews:'POL-FIRE-2026-2210',createdAt:at(2026,8,4,10),enteredAt:ago(4)}),
   L('OP-2944','','A-1001','Fire & Special Perils','priya',3,{idle:0,att:0,renews:'POL-FSP-2025-8841',createdAt:at(2026,8,16,10),enteredAt:at(2026,8,16,10)}),
   L('OP-2945','','A-1007','Commercial General Liability','rohan',9,{idle:0,att:2,renews:'POL-LIA-2025-2019',picked:'Bajaj Allianz',pay:'pre',createdAt:at(2026,6,2,10),enteredAt:ago(1)}),
   L('OP-2946','','A-1007','Directors & Officers','rohan',9,{idle:0,att:2,renews:'POL-DNO-2025-5522',picked:'New India Assurance',pay:'pre',createdAt:at(2026,9,11,10),enteredAt:ago(2)}),
   /* the fresh buy, a year ago: sold by Anand, handed to Priya, issued */
   L('OP-1874','O-1030','A-1003','Marine Cargo','priya',14,{idle:0,att:4,picked:'Tata AIG',pay:'paid',prem:298000,createdAt:at(2025,10,6,11),enteredAt:at(2025,11,20,11),req:{si:'₹40 Cr',tp:'₹3,00,000',to:'₹152 Cr',tob:'Warehousing',noc:'Private limited',pol:'n',ins:'',exp:'',ten:'1 year',clm:'No claims in 3 years',pan:''}}),
   /* [stated 24 Sep] Sharma's Fire policy was sold as a DAU line — the rater priced it and no RFQ
      was ever raised. Its renewal (OP-2944) therefore has nothing to carry over. */
   L('OP-1876','O-1093','A-1001','Fire & Special Perils','nikhil',14,{idle:0,att:3,picked:'New India Assurance',pay:'paid',prem:294000,createdAt:at(2025,10,2,11),enteredAt:at(2025,11,15,11),req:{si:'₹18 Cr',tp:'₹2,90,000',to:'₹86 Cr',tob:'Manufacturing',noc:'Private limited',pol:'n',ins:'',exp:'',ten:'1 year',clm:'No claims in 3 years',pan:''}}),
   /* paid lines, owned by the RM, inside the post-purchase ticket */
   L('OP-2921','O-1083','A-1003','Commercial General Liability','priya',12,{idle:4,prem:142000,picked:'Oriental Insurance',pay:'paid',createdAt:ago(34)}),
   L('OP-2922','O-1084','A-1005','Group Health','priya',13,{idle:5,prem:640000,picked:'ICICI Lombard',pay:'paid',createdAt:ago(41)}),
   L('OP-2923','O-1085','A-1007','Marine Cargo','rohan',12,{idle:2,prem:84000,picked:'Oriental Insurance',pay:'paid',createdAt:ago(30)}),
   L('OP-2924','O-1086','A-1008','Commercial General Liability','rohan',14,{idle:1,prem:118000,picked:'Bajaj Allianz',pay:'paid',createdAt:ago(38)}),
   L('OP-2925','O-1087','A-1001','Directors & Officers','priya',11,{idle:0,prem:156000,picked:'HDFC Ergo',pay:'paid',createdAt:ago(20)}),
   /* [stated 23 Sep] Meera's own book — one just handed over, one collecting documents, one she is selling herself, one renewal */
   L('OP-2934','O-1089','A-1018','Cyber Liability','meera',11,{idle:0,prem:214000,picked:'ICICI Lombard',pay:'paid',createdAt:ago(22)}),
   L('OP-2935','O-1090','A-1019','Group Health','meera',12,{idle:5,prem:1240000,picked:'HDFC Ergo',pay:'paid',createdAt:ago(31)}),
   L('OP-2937','O-1091','A-1019','Professional Indemnity','meera',3,{idle:3,prem:168000,si:'₹6 Cr',tp:'₹1,70,000',createdAt:ago(6)}),
   L('OP-2936','','A-1018','Fire & Special Perils','meera',3,{idle:0,att:0,renews:'POL-FSP-2025-6620',createdAt:at(2026,8,22,10),enteredAt:at(2026,8,22,10)}),
   /* [stated 23 Sep] the sales head sells too — a referral he has not called yet */
   L('OP-2804','O-1092','A-1016','Cyber Liability','vikram',1,{idle:0,att:0,src:'Referral',assignedAt:ago(1),createdAt:ago(1),prem:110000})
  ];
  postSeed(lines,accounts);
  rfqSeedAll(lines,accounts);
  renSeedFix(lines,accounts,opps,users);
  polSeedFix(accounts);   /* [stated 23 Sep] every policy gets a start date and a Fresh / Cross-sell / Renewal type */
  function Tk(id,line,owner,title,cls,createdAgoDays,dueAt,escAt,rule){ return {id:id,line:line,acct:null,owner:owner,title:title,cls:cls,createdAt:ago(createdAgoDays),dueAt:dueAt,escAt:escAt||0,done:0,doneAt:0,doneBy:'',rule:rule||''}; }
  var tasks=[
   Tk('T-8830','OP-2188','nikhil','Chase the RFQ with the client','SLA',5,at(2026,9,17,15,0),at(2026,9,18,17,0),'TR-02'),
   Tk('T-8841','OP-2310','nikhil','Call the new lead','SLA',6,at(2026,9,14,13,40),at(2026,9,14,17,40),'TR-01'),
   Tk('T-8852','OP-2290','nikhil','Follow up on QCR decision','Follow-up',4,at(2026,9,21,16,0),0,''),
   Tk('T-8855','OP-2201','nikhil','Call back after their board meeting','Manual',2,at(2026,9,21,17,30),0,''),
   Tk('T-8856','OP-2203','nikhil','Follow-up call','Follow-up',1,at(2026,9,21,16,0),0,'TR-11'),
   Tk('T-8860','OP-2329','nikhil','Call the new lead','SLA',0,addWork(ago(0,1),240),addWork(addWork(ago(0,1),240),240),'TR-01'),
   Tk('T-8862','OP-2335','nikhil','Call the new lead','SLA',0,addWork(ago(0,2),240),addWork(addWork(ago(0,2),240),240),'TR-01'),
   Tk('T-8861','OP-2331','nikhil','Call the new lead','SLA',0,addWork(T0.getTime()-8*60000,240),addWork(addWork(T0.getTime()-8*60000,240),240),'TR-01'),
   Tk('T-8870','OP-2402','aarti','Call the new lead','SLA',9,at(2026,9,12,14,0),at(2026,9,14,10,0),'TR-01'),
   Tk('T-8871','OP-2404','aarti','Chase the RFQ with the client','SLA',19,at(2026,9,5,12,0),at(2026,9,8,12,0),'TR-02'),
   Tk('T-8880','OP-2504','anand','Chase the RFQ with the client','SLA',21,at(2026,9,3,12,0),at(2026,9,7,12,0),'TR-02'),
   Tk('T-8881','OP-2507','anand','Call the new lead','SLA',12,at(2026,9,9,14,0),at(2026,9,9,18,0),'TR-01'),
   Tk('T-8890','OP-2602','divya','Chase the RFQ with the client','SLA',16,at(2026,9,8,12,0),at(2026,9,10,12,0),'TR-02'),
   Tk('T-8891','OP-2606','divya','Call the new lead','SLA',8,at(2026,9,11,14,0),at(2026,9,11,18,0),'TR-01'),
   Tk('T-8900','OP-2706','sameer','Call the new lead','SLA',15,at(2026,9,4,14,0),at(2026,9,4,18,0),'TR-01'),
   Tk('T-8901','OP-2702','sameer','Chase the RFQ with the client','SLA',26,at(2026,8,28,12,0),at(2026,9,1,12,0),'TR-02'),
   Tk('T-8905','OP-2601','divya','Review the QCR with the client before sending','Follow-up',3,at(2026,9,22,12,0),0,''),
   /* RM tasks */
   Tk('T-8910','OP-2925','priya','Welcome call — introduce yourself before the links land','SLA',0,addWork(ago(0,1),540),addWork(addWork(ago(0,1),540),540),'TR-08'),
   Tk('T-8911','OP-2921','priya','Chase the proposal form and mandate','Follow-up',3,at(2026,9,18,15,0),0,'TR-09'),
   Tk('T-8912','OP-2924','rohan','Policy explanation call','SLA',1,at(2026,9,21,17,0),at(2026,9,22,17,0),'TR-10'),
   Tk('T-8913','OP-2923','rohan','Chase the proposal form and mandate','Follow-up',1,at(2026,9,22,12,0),0,'TR-09'),
   Tk('T-8914','OP-2910','priya','Call the client back','Follow-up',2,at(2026,9,21,15,0),0,'TR-03'),
   /* [stated 23 Sep] the heads' own tasks — My view is the RM and executive home, so it needs real rows */
   Tk('T-8920','OP-2934','meera','Welcome call — introduce yourself before the links land','SLA',0,addWork(ago(0,2),540),addWork(addWork(ago(0,2),540),540),'TR-08'),
   Tk('T-8921','OP-2935','meera','Chase the proposal form and mandate','Follow-up',4,at(2026,9,17,15,0),0,'TR-09'),
   Tk('T-8925','OP-2804','vikram','Call the new lead','SLA',1,at(2026,9,18,15,0),at(2026,9,21,15,0),'TR-01'),
   Tk('T-8926','OP-2803','vikram','Chase the RFQ with the client','SLA',9,at(2026,9,15,12,0),at(2026,9,24,12,0),'TR-02'),
   Tk('T-8927','OP-2801','vikram','Follow up on the quote with Apex','Follow-up',2,at(2026,9,21,16,0),0,'')
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
   R({id:'TR-08',n:'Welcome call',when:[[st(11)]],ti:'Welcome call — introduce yourself before the links land',cl:'sla',du:1,duu:'d',ec:1,ecu:'d',recheck:'off',from:'2026-09-21',fd:1}),
   R({id:'TR-09',n:'Chase the proposal form and mandate',when:[[st(12)]],ti:'Chase the proposal form and mandate',cl:'fu',du:2,duu:'d',ec:0,ecu:'d',waitN:1,waitU:'d',recheck:'daily',repeat:true,max:3,closeWhen:[[notSt(12)]],from:'2026-09-21',fd:2}),
   R({id:'TR-10',n:'Policy explanation call',when:[[st(14)]],ti:'Policy explanation call',cl:'sla',du:2,duu:'d',ec:1,ecu:'d',recheck:'off',from:'2026-09-21',fd:1}),
   /* chains that only the condition model can express */
   R({id:'TR-11',n:'Follow-up call after no connect',when:[[st(2),C('disp','is','group:nc'),isOpen()]],waitN:4,waitU:'h',recheck:'hourly',ti:'Follow-up call',cl:'fu',du:4,duu:'h',ec:0,ecu:'h',repeat:true,max:0,closeWhen:[[C('disp','is','group:c')],[notSt(2)]],from:'2026-09-01',fd:17}),
   R({id:'TR-12',n:'Quote sent · follow-up',when:[[st(8),isOpen()]],waitN:1,waitU:'d',recheck:'daily',ti:'Quote sent follow-up',cl:'fu',du:1,duu:'d',ec:0,ecu:'d',repeat:true,max:0,closeWhen:[[notSt(8)]],from:'2026-09-01',fd:11}),
   R({id:'TR-13',n:'Time Pending · revisit',when:[[C('status','is','park')]],waitN:5,waitU:'d',recheck:'daily',ti:'Revisit the parked line',cl:'fu',du:1,duu:'d',ec:0,ecu:'d',repeat:true,max:0,closeWhen:[[C('status','isnot','park')]],from:'2026-09-01',fd:3})
  ];
  var cfg={ws:10,we:19,dailyH:10,hol:['2026-10-02','2026-10-20','2026-10-21','2026-11-09','2026-12-25']};
  /* service tickets — the RM's book */
  var svc=[
   {id:'CLM-0912', k:'clm', acct:'A-1003', pol:'POL-MC-2026-4417', prod:'Marine Cargo', ins:'Tata AIG', sub:'Transit damage', raised:ago(11), chan:'BimaKendra', sm:'Deepa Kulkarni',
    stage:'Surveyor appointed', client:'Surveyor assigned', wait:'Client', need:1, contest:0, srv:{n:'A. Ramanathan', m:'+91 98450 21187', d:'24 Sep 2026'},
    out:[{d:'Packing list and invoice for the damaged consignment',age:'6 days',got:0},{d:'Photographs of the damaged cartons',age:'6 days',got:0},{d:'Carrier’s damage certificate',age:'3 days',got:0}],
    thread:[{d:'in',w:'Deepa Kulkarni',r:'Servicing manager',at:ago(3,2),b:'Please ask the client for the carrier’s damage certificate. The insurer will not move without it.',open:1},
            {d:'out',w:'The client',r:'relayed by Priya Nair',at:ago(3,1),b:'They say the carrier has acknowledged the damage by email but has not issued a certificate yet. Chasing today.'},
            {d:'out',w:'Priya Nair',r:'your question to the desk',at:ago(4),b:'Is the surveyor visit blocked on these documents, or can it go ahead?'},
            {d:'in',w:'Deepa Kulkarni',r:'Servicing manager',at:ago(4,-1),b:'Visit can go ahead. The documents are for the assessment, not the visit.'},
            {d:'sys',w:'System',r:'',at:ago(9),b:'Surveyor appointed — A. Ramanathan.'}]},
   {id:'CLM-0880', k:'clm', acct:'A-1005', pol:'POL-IAR-2026-0031', prod:'Industrial All Risk', ins:'ICICI Lombard', sub:'Machinery breakdown', raised:ago(19), chan:'RM Interface', sm:'Deepa Kulkarni',
    stage:'Repudiation contested with the insurer', client:'Under assessment', wait:'Insurer', need:0, contest:1, srv:{n:'S. Venkatesh', m:'+91 98860 40021', d:'8 Sep 2026'},
    out:[{d:'Maintenance log for reactor 3',age:'2 days',got:0}], thread:[{d:'sys',w:'System',r:'',at:ago(13),b:'Surveyor appointed — S. Venkatesh.'},{d:'in',w:'Deepa Kulkarni',r:'Servicing manager',at:ago(2),b:'Insurer has repudiated citing wear and tear. We are contesting. Client label stays at Under assessment.'}]},
   {id:'CLM-0854', k:'clm', acct:'A-1001', pol:'POL-FSP-2025-8841', prod:'Fire & Special Perils', ins:'New India Assurance', sub:'Fire', raised:ago(38), chan:'Email', sm:'Arjun Rao',
    stage:'Settled', client:'Settled', wait:'—', need:0, contest:0, srv:null, out:[], thread:[{d:'sys',w:'System',r:'',at:ago(5),b:'Settled. ₹6,20,000 released to the registered account.'}]},
   {id:'END-RM-000412', k:'end', acct:'A-1001', pol:'POL-FSP-2025-8841', prod:'Fire & Special Perils', ins:'New India Assurance', sub:'Addition of location', cat:'Financial', raised:ago(4), chan:'RM Interface',
    sm:'Farhan Qureshi', phase:2, stage:'With insurer', wait:'Insurer', need:0, out:[], thread:[{d:'sys',w:'System',r:'',at:ago(4),b:'Submitted to insurer.'},{d:'sys',w:'System',r:'',at:ago(4),b:'Ticket accepted and assigned to Farhan Qureshi.'}]},
   {id:'END-RM-000406', k:'end', acct:'A-1003', pol:'POL-MC-2026-4417', prod:'Marine Cargo', ins:'Tata AIG', sub:'Change in bank details', cat:'Non-Financial', raised:ago(8), chan:'RM Interface',
    sm:'Farhan Qureshi', phase:1, stage:'Under review', wait:'You', need:1, query:{q:'The cancelled cheque is illegible — the IFSC cannot be read. Please send a clearer copy or a bank letter.',who:'Farhan Qureshi',at:ago(2,-1),open:1,sla:24}, out:[],
    thread:[{d:'sys',w:'System',r:'',at:ago(8),b:'Submitted.'},{d:'sys',w:'System',r:'',at:ago(8),b:'Ticket accepted and assigned to Farhan Qureshi.'}]},
   {id:'END-RM-000398', k:'end', acct:'A-1005', pol:'POL-IAR-2026-0031', prod:'Industrial All Risk', ins:'ICICI Lombard', sub:'Cancellation and refund', cat:'Refund', raised:ago(23), chan:'RM Interface',
    sm:'Farhan Qureshi', phase:4, stage:'Completed', wait:'—', need:0, refund:{amt:'₹4,18,200', ref:'ICL-RFD-88213', utr:'ICIC9930412778'}, out:[], thread:[{d:'sys',w:'System',r:'',at:ago(23),b:'Submitted.'},{d:'sys',w:'System',r:'',at:ago(3),b:'Refund credited. UTR ICIC9930412778.'}]}
  ];
  /* [stated 24 Sep · TBD-25/26/27] one mandate covers the account — every insurer, every policy —
     and it is valid for a fixed period of one year from signature. Nothing is ever marked revoked. */
  var mandates=[
   {id:'MD-001',acct:'A-1005',scope:'Account',signedAt:ago(6),by:'Devang Shah',until:ago(6)+MD_YEAR,status:'active',doc:'Mandate_Meridian.pdf'},
   {id:'MD-002',acct:'A-1007',scope:'Account',signedAt:at(2025,8,10,11,0),by:'S. Balaji',until:at(2026,8,10,11,0),status:'active',doc:'Mandate_Novacast.pdf'},
   {id:'MD-003',acct:'A-1008',scope:'Account',signedAt:ago(9),by:'Joseph Mathew',until:ago(9)+MD_YEAR,status:'active',doc:'Mandate_BlueHarbour.pdf'}
  ];
  return {users:users, accounts:accounts, opps:opps, lines:lines, tasks:tasks, rules:rules, cfg:cfg, rlog:[], svc:svc, mandates:mandates, seq:{opp:1097, line:2950, task:8950, acct:1020, svc:419, clm:920, iss:443, md:4, bkpol:BKPOL_SEQ}, took:[]};
}
function shortName(n){ return String(n).replace(/\s+(Pvt\.?|Private|Ltd\.?|Limited|LLP|\(Gujarat\))\b.*$/i,'').trim()||n; }

var ENDO={
 'Change in sum insured':{cat:'Financial', d:'Increases or reduces the sum insured. Premium is recalculated and a payment link goes to the client.', f:[['Revised sum insured','cur',1],['Effective date','date',1],['Reason for the change','long',1]], docs:[['Valuation report',1],['Board resolution',0]]},
 'Addition of location':{cat:'Financial', d:'Adds a premises to the schedule. The insurer re-rates for the new location.', f:[['Address line','text',1],['PIN code','pin',1],['Nature of occupancy','sel',1,['Godown','Factory','Office','Retail']],['Value of asset at this location','cur',1]], docs:[['Address proof',1],['Site photographs',0]]},
 'Change in name':{cat:'Non-Financial', d:'Corrects or updates the insured’s legal name. No premium impact.', f:[['New legal name','text',1],['Effective date','date',1]], docs:[['Certificate of incorporation',1],['Board resolution',1]]},
 'Change in bank details':{cat:'Non-Financial', d:'Updates the account the insurer pays claims and refunds into.', f:[['Bank name','text',1],['Account number','text',1],['IFSC','text',1]], docs:[['Cancelled cheque',1]]},
 'Cancellation and refund':{cat:'Refund', d:'Cancels the policy. The refund is calculated by the insurer; the client consents on BimaKendra.', f:[['Reason for cancellation','long',1],['Effective date','date',1]], docs:[['Cancellation request letter',1]]},
 'Other':{cat:'', d:'Free text. The category is set by the Service Executive at verification, so no category is shown yet.', f:[['Describe what needs to change','long',1]], docs:[]}
};
var CAUSES=['Fire','Burglary or theft','Flood or inundation','Transit damage','Machinery breakdown','Third-party liability notice','Storm or cyclone','Other'];
var PHASES=['Submitted','Under review','With insurer','Payment','Completed'];
var GROUPS={'Marine group':['anand','sameer'],'Fire group':['nikhil','aarti'],'Liability group':['anand','sameer','nikhil']};
