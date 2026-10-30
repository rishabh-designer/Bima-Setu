/* ==================================================================== *
 *  v75.32 · Customer type at creation — [stated 30 Oct]
 *  Two questions first: sole proprietor? → (if yes) has GST?
 *  Not sole / sole with GST → GST number now, PAN + GST certificate at KYC.
 *  Sole without GST → Aadhaar number now, PAN + Aadhaar at KYC.
 *  Answers live on the account; KYC follows them with no choice. They can
 *  be edited on the account only while it is provisional.
 * ==================================================================== */
var CUST_LAB={co:'Not a sole proprietor',sole_gst:'Sole proprietor · has GST',sole_nogst:'Sole proprietor · no GST'};
function custType(a){ if(!a) return 'co'; return a.cust||((a.sole||(!!a.aad&&!a.gst))?'sole_nogst':'co'); }
function custT(){ var s=S.sel.isSole; if(s==='n') return 'co'; if(s==='y'){ if(S.sel.hasGst==='y') return 'sole_gst'; if(S.sel.hasGst==='n') return 'sole_nogst'; } return ''; }
function aadDigits(v){ return digits(v); }
function aadErr(v){ var d=aadDigits(v); if(!String(v||'').trim()) return ''; return d.length!==12?'An Aadhaar number is twelve digits.':''; }
function aadFmt(v){ var d=aadDigits(v); return d.length===12?d.slice(0,4)+' '+d.slice(4,8)+' '+d.slice(8):String(v||'').trim(); }
function matchAad(v){ var d=aadDigits(v); if(d.length!==12) return null;
  var g=S.data.accounts.filter(function(a){ return !a.merged&&a.aad&&aadDigits(a.aad)===d; })[0]; return g?{a:g,how:'Aadhaar'}:null; }
function custQs(){ var s=S.sel.isSole;
  return '<div class="field"><div class="lbl">Is the customer a sole proprietor?</div><div class="fgrid">'+
      opt('data-mset="isSole" data-mval="y"',s==='y','Yes','')+opt('data-mset="isSole" data-mval="n"',s==='n','No','')+'</div></div>'+
    (s==='y'?'<div class="field"><div class="lbl">Does the customer have GST?</div><div class="fgrid">'+
      opt('data-mset="hasGst" data-mval="y"',S.sel.hasGst==='y','Yes','')+opt('data-mset="hasGst" data-mval="n"',S.sel.hasGst==='n','No','')+'</div></div>':'')+
    (custT()?'<div class="meta" style="margin-top:-4px;margin-bottom:14px">'+(custT()==='sole_nogst'?'KYC will ask for the PAN card and Aadhaar.':'KYC will ask for the PAN card and the GST certificate.')+'</div>':''); }
/* the account side: the answers, editable only while the account is provisional */
function custKv(a,owner){ return kv('Customer type',esc(CUST_LAB[custType(a)])+(owner&&a.prov?' <button class="quiet" data-flow="custEdit" data-acct="'+a.id+'">Edit</button>':'')+
  '<div class="meta">'+(custType(a)==='sole_nogst'?'KYC: PAN card and Aadhaar':'KYC: PAN card and GST certificate')+'</div>'); }
FLOWS.custEdit={t:'Customer type', sub:'Decides the documents KYC asks for. It can change only while the account is provisional.',
  body:function(){ var a=by(S.data.accounts,S.sel.acct||S.route.id);
    if(S.sel.isSole===undefined){ var c=custType(a); S.sel.isSole=c==='co'?'n':'y'; if(c!=='co') S.sel.hasGst=c==='sole_gst'?'y':'n'; }
    return custQs(); },
  can:function(){ var a=by(S.data.accounts,S.sel.acct||S.route.id); return !!a&&a.prov&&!!custT()&&custT()!==custType(a); },
  ok:'Save',
  run:function(){ var a=by(S.data.accounts,S.sel.acct||S.route.id), was=custType(a), now=custT();
    var ok=write(function(){ a.cust=now; a.sole=now==='sole_nogst'?1:0; acctLog(a,'Customer type changed: '+CUST_LAB[was]+' → '+CUST_LAB[now],uname(S.user)+' · KYC now asks for '+(now==='sole_nogst'?'PAN and Aadhaar':'PAN and GST')); },'the customer type');
    if(!ok) return 'fail'; toast('Customer type saved',CUST_LAB[now]); }};

