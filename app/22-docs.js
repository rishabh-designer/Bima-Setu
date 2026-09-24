/* ==================================================================== *
 *  Documents — one viewer for every document in the system.
 *  [stated 24 Sep] wherever a document is shown, it can be viewed and
 *  downloaded: quote, QCR, RFQ, policy copy, tax invoice, PAN, GST,
 *  Aadhaar, mandate letter, proposal form, RHL, payment proof.
 *
 *  A document is opened with data-doc="<name>" and, optionally, the record
 *  it hangs off — data-dacct, data-dpol, data-dline, data-dref, data-dv.
 *  Nothing here stores anything: every sheet is rendered from the record.
 * ==================================================================== */

/* ---------- which document is this ---------- */
function docKind(n){
  var s=String(n||'').toLowerCase();
  if(/pan/.test(s)) return 'pan';
  if(/gst.*(cert|reg)|gst certificate|gstin/.test(s)) return 'gst';
  if(/aadhaar|aadhar/.test(s)) return 'aadhaar';
  if(/mandate/.test(s)) return 'mandate';
  if(/proposal/.test(s)) return 'proposal';
  if(/risk-held|risk held|\brhl\b/.test(s)) return 'rhl';
  if(/tax invoice|invoice/.test(s)) return 'invoice';
  if(/policy copy|policy schedule|^policy\b/.test(s)) return 'policy';
  if(/quote comparison|\bqcr\b/.test(s)) return 'qcr';
  if(/quote/.test(s)) return 'quote';
  if(/\brfq\b|request for quote/.test(s)) return 'rfq';
  if(/payment proof|screenshot/.test(s)) return 'proof';
  return 'generic';
}
var DOCEXT={pan:'pdf',gst:'pdf',aadhaar:'pdf',mandate:'pdf',proposal:'pdf',rhl:'pdf',invoice:'pdf',policy:'pdf',qcr:'pdf',quote:'pdf',rfq:'pdf',proof:'png',generic:'pdf'};
var DOCSIZE={pan:'210 KB',gst:'480 KB',aadhaar:'190 KB',mandate:'320 KB',proposal:'1.4 MB',rhl:'260 KB',invoice:'88 KB',policy:'2.1 MB',qcr:'640 KB',quote:'410 KB',rfq:'300 KB',proof:'742 KB',generic:'256 KB'};

/* ---------- the record a document hangs off ---------- */
function docCtx(ds){
  var c={name:ds.doc||'Document', v:+(ds.dv||0)};
  c.line=ds.dline?lineById(ds.dline):null;
  c.polh=ds.dpol?polById(ds.dpol):null;
  c.pol=c.polh?c.polh.p:null;
  c.acct=ds.dacct?by(S.data.accounts,ds.dacct):(c.polh?c.polh.a:(c.line?acctOf(c.line):null));
  c.ref=ds.dref||'';
  if(!c.pol&&c.line) { var h=(c.acct&&c.acct.pols||[]).filter(function(p){return p.line===c.line.id;})[0]; if(h) c.pol=h; }
  return c;
}
function docShort(c){ return shortName((c.acct&&c.acct.n)||'BimaKavach').replace(/[^A-Za-z0-9]+/g,''); }
function docFile(k,c){
  var base={pan:'PAN_'+docShort(c),gst:'GST_Certificate_'+docShort(c),aadhaar:'Aadhaar_'+docShort(c),
    mandate:'Mandate_'+docShort(c)+(c.ref?'_'+c.ref:''),proposal:'ProposalForm_'+docShort(c),rhl:'RHL_'+docShort(c),
    invoice:'TaxInvoice_'+docShort(c),policy:'Policy_'+((c.pol&&c.pol.id)||docShort(c)),
    qcr:'QCR_v'+(c.v||1)+'_'+docShort(c),quote:'Quote_'+docShort(c),rfq:'RFQ_'+docShort(c),
    proof:'payment-screenshot',generic:String(c.name).replace(/[^A-Za-z0-9]+/g,'_')}[k];
  return base+'.'+DOCEXT[k];
}

/* ---------- the sheets ---------- */
function dRow(k,v){ return '<div class="dr"><div class="dk">'+esc(k)+'</div><div class="dv">'+v+'</div></div>'; }
function dHead(brand,title,sub){ return '<header class="ds-h"><div class="ds-b">'+brand+'</div><div class="ds-t"><div class="ds-tt">'+esc(title)+'</div>'+(sub?'<div class="ds-ts">'+esc(sub)+'</div>':'')+'</div></header>'; }
var BK_BRAND='Bima<i>Kavach</i>';

function docPan(c){
  var a=c.acct||{}, nm=a.pan?a.n:'—';
  return '<article class="qsheet dsheet">'+
    dHead('<span class="ds-gov">आयकर विभाग<br>INCOME TAX DEPARTMENT</span>','Permanent Account Number Card','भारत सरकार · GOVT. OF INDIA')+
    '<div class="dpan">'+
      '<div class="dpan-l">'+
        dRow('Name',esc(nm))+
        dRow(a.sole?'Father’s Name':'Date of Incorporation',esc(a.sole?'Ramanlal Vora':(a.fin&&a.fin.yr?'01/04/'+(String(a.fin.yr).slice(0,4)-8):'12/06/2011')))+
        dRow('Permanent Account Number',a.pan?'<span class="mono dbig">'+esc(a.pan)+'</span>':'<span class="dmiss">not on file</span>')+
      '</div>'+
      '<div class="dpan-r"><div class="dphoto">'+ic('building','ic22')+'</div><div class="dsign">'+esc(a.sole?'R. Vora':'Authorised signatory')+'</div></div>'+
    '</div>'+
    '<footer class="qs-note">A prototype rendition. The real card is the scan uploaded at verification; the legal name on the account is read from this document by OCR.</footer></article>';
}
function docGst(c){
  var a=c.acct||{};
  return '<article class="qsheet dsheet">'+
    dHead('<span class="ds-gov">Government of India<br>GOODS AND SERVICES TAX</span>','Form GST REG-06','Registration Certificate')+
    '<div class="dgrid">'+
      dRow('Registration Number (GSTIN)',a.gst?'<span class="mono dbig">'+esc(a.gst)+'</span>':'<span class="dmiss">not on file</span>')+
      dRow('Legal Name',esc(a.n||'—'))+
      dRow('Trade Name',esc(a.n?shortName(a.n):'—'))+
      dRow('Constitution of Business',esc((a.sole?'Sole Proprietorship':(a.fin?'Private Limited Company':'—'))))+
      dRow('Address of Principal Place of Business',esc((a.city||'—')+(a.st?', '+a.st:'')))+
      dRow('Date of Liability',esc(fmtD(at(2017,7,1))))+
      dRow('Type of Registration','Regular')+
      dRow('PAN inside the GSTIN',a.gst?'<span class="mono">'+esc(a.gst.slice(2,12))+'</span>'+(a.pan&&a.gst.slice(2,12)===a.pan?' '+chip('matches the PAN card','green',false,true):''):'<span class="dmiss">—</span>')+
    '</div>'+
    '<footer class="qs-note">A prototype rendition. Verification checks that the ten characters inside the GSTIN are the PAN on the card.</footer></article>';
}
function docAadhaar(c){
  var a=c.acct||{};
  return '<article class="qsheet dsheet">'+
    dHead('<span class="ds-gov">भारतीय विशिष्ट पहचान प्राधिकरण<br>UNIQUE IDENTIFICATION AUTHORITY OF INDIA</span>','Aadhaar','Proprietor’s identity')+
    '<div class="dgrid">'+
      dRow('Aadhaar number',a.aad?'<span class="mono dbig">'+esc(a.aad)+'</span>':'<span class="dmiss">not on file</span>')+
      dRow('Name','Ramanlal Vora')+
      dRow('Held for',esc(a.n||'—'))+
      dRow('Why it is here','A sole proprietorship has no CIN and no MCA filing, so Aadhaar stands in for a registration certificate.')+
    '</div>'+
    '<footer class="qs-note">Only the last four digits are shown anywhere outside this document. Stored encrypted; visible to the account owner only.</footer></article>';
}
function docMandate(c){
  var a=c.acct||{}, m=c.ref?(S.data.mandates||[]).filter(function(x){return x.id===c.ref;})[0]:null;
  m=m||(S.data.mandates||[]).filter(function(x){return x.acct===a.id;})[0]||null;
  return '<article class="qsheet dsheet">'+
    dHead('<b>'+esc(a.n||'—')+'</b>','Letter of Mandate','Appointment of insurance broker')+
    '<p class="dp">To whom it may concern,</p>'+
    '<p class="dp">We, <b>'+esc(a.n||'—')+'</b>'+(a.gst?' (GSTIN '+esc(a.gst)+')':'')+', hereby appoint <b>BimaKavach Insurance Broking Private Limited</b>, an IRDAI-licensed broker, to act on our behalf in respect of the placement and servicing of our insurance policies at account level, and authorise the insurers concerned to deal with them accordingly.</p>'+
    '<div class="dgrid mt16">'+
      dRow('Mandate reference',m?'<span class="mono">'+esc(m.id)+'</span>':'<span class="dmiss">not on the register</span>')+
      dRow('Scope','Account level — every insurer, every policy on this account')+
      dRow('Signed by',esc(m&&m.by?m.by:((a.con&&a.con[0]&&a.con[0].n)||'—')))+
      dRow('Signed on',esc(m&&m.signedAt?fmtD(m.signedAt):'—'))+
      dRow('Valid until',m&&m.until?esc(fmtD(m.until)):'<span class="dmiss">—</span>')+
      dRow('Status',m?chip(m.status==='active'?'Active':m.status,m.status==='active'?'green':'neutral',true,true):'—')+
    '</div>'+
    '<div class="dsignblk"><div class="dsline"></div><div class="dsl">'+esc(m&&m.by?m.by:'Authorised signatory')+' · for '+esc(a.n||'—')+'</div></div>'+
    '<footer class="qs-note">One mandate covers the account, for one year from signature. A new customer is asked for it on the first post-purchase ticket; an existing account is checked against the register first.</footer></article>';
}
function docProposal(c){
  var l=c.line, a=c.acct||{}, ins=(l&&(l.picked||l.ins))||(c.pol&&c.pol.ins)||'the insurer', r=(l&&l.req)||{};
  var done=l&&l.iss&&l.iss.rows.pf.st==='done';
  return '<article class="qsheet dsheet">'+
    dHead('<b>'+esc(ins)+'</b>','Proposal Form',esc((l&&l.product)||(c.pol&&c.pol.p)||'')) +
    '<div class="dgrid">'+
      dRow('Proposer',esc(a.n||'—'))+
      dRow('Registered address',esc((a.city||'—')+(a.st?', '+a.st:'')))+
      dRow('PAN',a.pan?'<span class="mono">'+esc(a.pan)+'</span>':'<span class="dmiss">—</span>')+
      dRow('Business',esc(r.tob||a.ind||'—'))+
      dRow('Sum insured proposed',esc(r.si||(c.pol&&c.pol.si)||'—'))+
      dRow('Period',esc(r.ten||'1 year'))+
      dRow('Claims in the last 3 years',esc(r.clm||'—'))+
      dRow('Declaration',done?'Signed and dated by the proposer':'<span class="dmiss">unsigned — still with the client</span>')+
    '</div>'+
    '<div class="dsignblk"><div class="dsline"></div><div class="dsl">'+esc((l&&l.contact&&l.contact.n)||'Authorised signatory')+' · '+esc(done?fmtD(l.iss.rows.pf.at):'date')+'</div></div>'+
    '<footer class="qs-note">The proposal form is the insurer’s document, not ours — digitised on Bimakendra where the insurer has a digital form, otherwise the insurer’s PDF, filled and signed offline.</footer></article>';
}
function docRhl(c){
  var l=c.line, a=c.acct||{}, ins=(l&&(l.picked||l.ins))||(c.pol&&c.pol.ins)||'the insurer';
  var at_=l&&l.iss?l.iss.rows.rhl.at:0;
  return '<article class="qsheet dsheet">'+
    dHead('<b>'+esc(ins)+'</b>','Risk-Held Letter','Confirmation of cover')+
    '<p class="dp">This is to confirm that we have held the risk in respect of the proposal below with effect from the date shown, pending issue of the policy document.</p>'+
    '<div class="dgrid">'+
      dRow('Insured',esc(a.n||'—'))+
      dRow('Product',esc((l&&l.product)||(c.pol&&c.pol.p)||'—'))+
      dRow('Sum insured',esc((l&&l.req&&l.req.si)||(c.pol&&c.pol.si)||'—'))+
      dRow('Premium received',esc(l?INR(premOf(l)):(c.pol?INR(c.pol.pr):'—')))+
      dRow('Risk held from',esc(at_?fmtD(at_):(l&&l.paidAt?fmtD(l.paidAt):'—')))+
      dRow('Broker','BimaKavach Insurance Broking Private Limited')+
    '</div>'+
    '<footer class="qs-note">Required on liability products. HDFC Ergo and Future Generali generate it; every other insurer sends it by email, which the bot attaches to the ticket.</footer></article>';
}
function docPolicy(c){
  var p=c.pol, l=c.line||(p&&p.line?lineById(p.line):null), a=c.acct||{};
  if(!p) return docGeneric(c);
  return '<article class="qsheet dsheet">'+
    dHead('<b>'+esc(p.ins)+'</b>','Policy Schedule',esc(p.p))+
    '<div class="dgrid">'+
      dRow('Policy number',p.pno?'<span class="mono dbig">'+esc(p.pno)+'</span>':'<span class="dmiss">awaited — the copy is still with the insurer</span>')+
      dRow('BK internal policy number',p.bkno?'<span class="mono">'+esc(p.bkno)+'</span>':'<span class="dmiss">not on file — migrated policy</span>')+
      dRow('Insured',esc(a.n||'—'))+
      dRow('Address',esc((a.city||'—')+(a.st?', '+a.st:'')))+
      dRow('Period of insurance',esc((p.start?fmtD(p.start):'—')+' to '+(p.exp?fmtD(p.exp):'—')))+
      dRow('Sum insured',esc(p.si||'—'))+
      dRow('Premium','<b>'+INR(p.pr)+'</b>')+
      dRow('Broker','BimaKavach Insurance Broking Private Limited')+
      dRow('Endorsements',String(p.endo||0))+
    '</div>'+
    '<footer class="qs-note">A prototype rendition of the insurer’s schedule. The number and period on the record are written from this document when it passes QC.</footer></article>';
}
function docInvoice(c){
  var p=c.pol, l=c.line, prem=p?p.pr:(l?premOf(l):0), base=Math.round(prem/1.18), gst=prem-base;
  return '<article class="qsheet dsheet">'+
    dHead('<b>'+esc((p&&p.ins)||(l&&(l.picked||l.ins))||'the insurer')+'</b>','Tax Invoice','GST invoice for premium')+
    '<div class="dgrid">'+
      dRow('Invoice number','<span class="mono">INV-'+esc(((p&&p.id)||(l&&l.id)||'0000').replace(/\D/g,'').slice(-6)||'000000')+'</span>')+
      dRow('Invoice date',esc(fmtD((l&&l.paidAt)||(p&&p.start)||S.now)))+
      dRow('Billed to',esc((c.acct&&c.acct.n)||'—'))+
      dRow('GSTIN of recipient',c.acct&&c.acct.gst?'<span class="mono">'+esc(c.acct.gst)+'</span>':'<span class="dmiss">—</span>')+
    '</div>'+
    '<div class="qs-tw mt16"><table class="qs-t"><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>'+
      '<tr><th>Premium</th><td>'+INR(base)+'</td></tr>'+
      '<tr><th>GST at 18%</th><td>'+INR(gst)+'</td></tr>'+
      '<tr><th>Total payable</th><td><b>'+INR(prem)+'</b></td></tr>'+
    '</tbody></table></div>'+
    '<footer class="qs-note">Issued by the insurer and sent with the policy copy. The premium on the record is the gross amount, as paid.</footer></article>';
}
function docQuote(c){
  var l=c.line; if(!l) return docGeneric(c);
  var qs=(l.rate===1?QUOTES.dau:QUOTES.plc).filter(function(q){return q.st==='quoted';}), r=l.req||{};
  return '<article class="qsheet dsheet">'+
    dHead(BK_BRAND,'Quotes as received',esc(l.product))+
    '<div class="dgrid">'+dRow('Insured',esc(acctName(l)))+dRow('Sum insured',esc(r.si||'—'))+dRow('Period',esc(r.ten||'1 year'))+dRow('Source',esc(l.rate===1?'Priced by the rater':'From BimaPlacement · PLC-'+l.id.slice(3)))+'</div>'+
    '<div class="qs-tw mt16"><table class="qs-t"><thead><tr><th>Insurer</th><th>Premium</th><th>Valid to</th></tr></thead><tbody>'+
      qs.map(function(q){ return '<tr><th>'+esc(q.i)+'</th><td>'+INR(q.p)+'</td><td>'+esc(fmtD((l.enteredAt||S.now)+28*86400000))+'</td></tr>'; }).join('')+
    '</tbody></table></div>'+
    '<footer class="qs-note">This sheet names no preferred insurer. The comparison the client sees is the Quote Comparison Report.</footer></article>';
}
function docRfq(c){
  var l=c.line; if(!l||!l.rfq||!l.rfq.f) return docGeneric(c);
  var fs=rfqFlat(l);
  return '<article class="qsheet dsheet">'+
    dHead(BK_BRAND,'Request for Quote',esc(l.product+' · '+acctName(l)))+
    '<div class="dgrid">'+fs.map(function(f){ var v=rfqVal(l,f.k); return dRow(f.l, v?esc(v):'<span class="dmiss">not filled</span>'); }).join('')+'</div>'+
    '<footer class="qs-note">As sent to placement'+(l.rfq.floatedAt?' on '+esc(fmtD(l.rfq.floatedAt)):'')+'. The Excel equivalent carries the same fields, one per row.</footer></article>';
}
function docProof(c){
  var l=c.line; if(!l) return docGeneric(c);
  return '<article class="qsheet dsheet dshot"><img src="'+proofSample(l)+'" alt="Payment screenshot">'+
    '<div class="dgrid mt16">'+dRow('Amount read',esc(INR(l.amt||premOf(l))))+dRow('UTR',(l.hand&&l.hand.utr)?'<span class="mono">'+esc(l.hand.utr)+'</span>':'<span class="mono">'+esc(proofUtr(l))+'</span>')+dRow('Read how',esc((l.hand&&l.hand.read)||'read from the screenshot'))+'</div>'+
    '<footer class="qs-note">Payment proof is always a screenshot. The amount must match the request; part payments are not accepted.</footer></article>';
}
function docGeneric(c){
  return '<article class="qsheet dsheet">'+
    dHead(BK_BRAND,String(c.name),c.acct?esc(c.acct.n):'')+
    '<div class="dgrid">'+
      dRow('Document',esc(c.name))+
      (c.acct?dRow('Account',esc(c.acct.n)):'')+
      (c.pol?dRow('Policy','<span class="mono">'+esc(c.pol.id)+'</span>'):'')+
      (c.line?dRow('Product line',esc(c.line.id+' · '+c.line.product)):'')+
      dRow('Held on','the record — nothing in this prototype stands behind it')+
    '</div>'+
    '<footer class="qs-note">A prototype rendition. In the product this opens the file held against the record.</footer></article>';
}
function docSheet(k,c){
  if(k==='qcr'&&c.line) return qcrReport(c.line,c.v||c.line.round,false);
  return {pan:docPan,gst:docGst,aadhaar:docAadhaar,mandate:docMandate,proposal:docProposal,rhl:docRhl,
    policy:docPolicy,invoice:docInvoice,quote:docQuote,rfq:docRfq,proof:docProof}[k]?
    {pan:docPan,gst:docGst,aadhaar:docAadhaar,mandate:docMandate,proposal:docProposal,rhl:docRhl,
     policy:docPolicy,invoice:docInvoice,quote:docQuote,rfq:docRfq,proof:docProof}[k](c):docGeneric(c);
}

/* ---------- the viewer ---------- */
function docOpen(c){
  var k=docKind(c.name), el=document.getElementById('docv');
  if(!el){ el=document.createElement('div'); el.id='docv'; el.className='qview'; document.body.appendChild(el); }
  S.ui.docv=c;
  var where=[c.acct?c.acct.n:'', c.pol?c.pol.id:'', c.line?c.line.id+' · '+c.line.product:''].filter(Boolean).join(' · ');
  el.innerHTML='<div class="qv-top"><div class="qv-tt"><b>'+esc(c.name)+'</b>'+(where?' · '+esc(where):'')+'<div class="meta">'+esc(docFile(k,c))+' · '+esc(DOCSIZE[k])+'</div></div><span class="sp"></span>'+
      '<button class="btn sm" data-docdl="'+esc(c.name)+'" data-dacct="'+esc(c.acct?c.acct.id:'')+'" data-dpol="'+esc(c.pol?c.pol.id:'')+'" data-dline="'+esc(c.line?c.line.id:'')+'" data-dref="'+esc(c.ref||'')+'" data-dv="'+esc(c.v||'')+'">'+ic('upload','ic14')+'Download</button>'+
      '<button class="btn sm ghost" data-docclose="1">Close</button></div>'+
    '<div class="qv-body">'+docSheet(k,c)+'</div>';
  el.hidden=false; document.body.style.overflow='hidden';
  var bd=el.querySelector('.qv-body'); if(bd) bd.scrollTop=0;
}
function docClose(){ var el=document.getElementById('docv'); if(el){ el.hidden=true; el.innerHTML=''; } S.ui.docv=null; document.body.style.overflow=''; }

/* ---------- the download is a real file ----------
   The sheet is flattened to lines and written as a single-font PDF, so what
   arrives carries the same name and extension the screen promised. */
function pdfTxt(s){
  return String(s==null?'':s)
    .replace(/₹/g,'Rs ').replace(/[‘’]/g,"'").replace(/[“”]/g,'"')
    .replace(/[–—]/g,'-').replace(/·/g,'-').replace(/•/g,'*').replace(/…/g,'...')
    .replace(/[^\x20-\x7e]/g,'');
}
function pdfEsc(s){ return pdfTxt(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)'); }
function pdfWrap(s,n){ var w=pdfTxt(s).split(/\s+/), out=[], cur='';
  w.forEach(function(x){ if(!cur) cur=x; else if((cur+' '+x).length<=n) cur+=' '+x; else { out.push(cur); cur=x; } });
  if(cur) out.push(cur); return out.length?out:['']; }
function docLines(k,c){
  var tmp=document.createElement("div"); tmp.innerHTML=docSheet(k,c);
  Array.prototype.forEach.call(tmp.querySelectorAll('br'),function(br){ br.parentNode.replaceChild(document.createTextNode(' / '),br); });
  var lines=[], INLINE={B:1,I:1,EM:1,STRONG:1,SPAN:1,A:1,BUTTON:1,SMALL:1,CODE:1,DT:1,DD:1};
  var flat=function(el){ return el.textContent.replace(/\s+/g,' ').trim(); };
  var leaf=function(el){ return !el.children.length || Array.prototype.every.call(el.children,function(ch){ return INLINE[ch.tagName]; }); };
  var walk=function(el){
    Array.prototype.forEach.call(el.children,function(ch){
      if(ch.classList.contains('dr')){ var kk=ch.querySelector('.dk'), vv=ch.querySelector('.dv');
        lines.push({t:(kk?flat(kk):'').toUpperCase()+':  '+(vv?flat(vv):'')}); return; }
      if(ch.tagName==='DIV'&&ch.parentNode&&ch.parentNode.classList.contains('qs-meta')){
        var dt=ch.querySelector('dt'), dd=ch.querySelector('dd');
        lines.push({t:(dt?flat(dt):'').toUpperCase()+':  '+(dd?flat(dd):'')}); return; }
      if(ch.classList.contains('qs-also')){ Array.prototype.forEach.call(ch.children,function(x){ var s=flat(x); if(s) lines.push({t:s}); }); return; }
      if(ch.tagName==='TABLE'){ Array.prototype.forEach.call(ch.querySelectorAll('tr'),function(tr){
        lines.push({t:Array.prototype.map.call(tr.children,function(td){ return flat(td); }).filter(Boolean).join('   |   ')}); }); lines.push({t:''}); return; }
      if(leaf(ch)||ch.tagName==='P'){ var s=flat(ch); if(s) lines.push({t:s}); return; }
      walk(ch);
    });
  };
  walk(tmp);
  return lines;
}
function docPdf(c){
  var k=docKind(c.name), title=pdfTxt(c.name), rows=docLines(k,c);
  var where=[c.acct?c.acct.n:'', c.pol?(c.pol.pno||c.pol.bkno||c.pol.id):'', c.line?c.line.id:''].filter(Boolean).join(' - ');
  var body=[]; rows.forEach(function(r){ pdfWrap(r.t,92).forEach(function(x){ body.push(x); }); });
  var PER=44, pages=[]; for(var i=0;i<body.length||!pages.length;i+=PER) pages.push(body.slice(i,i+PER));
  var objs=[], N=pages.length;
  objs.push('<</Type/Catalog/Pages 2 0 R>>');
  objs.push('<</Type/Pages/Kids['+pages.map(function(_,i){ return (3+i*2)+' 0 R'; }).join(' ')+']/Count '+N+'>>');
  pages.forEach(function(pg,i){
    var stream='BT /F2 15 Tf 56 792 Td ('+pdfEsc(title)+') Tj ET\n'+
      'BT /F1 9 Tf 56 776 Td ('+pdfEsc(where+(where?'   -   ':'')+'BimaKavach - prototype rendition')+') Tj ET\n'+
      '0.6 w 56 768 m 539 768 l S\n'+
      'BT /F1 10 Tf 56 750 Td 14 TL '+pg.map(function(x){ return '('+pdfEsc(x)+') Tj T*'; }).join(' ')+' ET\n'+
      'BT /F1 8 Tf 56 40 Td (Page '+(i+1)+' of '+N+') Tj ET';
    objs.push('<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 '+(3+N*2)+' 0 R/F2 '+(4+N*2)+' 0 R>>>>/Contents '+(4+i*2)+' 0 R>>');
    objs.push('<</Length '+stream.length+'>>\nstream\n'+stream+'\nendstream');
  });
  objs.push('<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>');
  objs.push('<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>');
  var out='%PDF-1.4\n', off=[];
  objs.forEach(function(o,i){ off.push(out.length); out+=(i+1)+' 0 obj\n'+o+'\nendobj\n'; });
  var xref=out.length;
  out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';
  off.forEach(function(o){ out+=(('0000000000'+o).slice(-10))+' 00000 n \n'; });
  out+='trailer\n<</Size '+(objs.length+1)+'/Root 1 0 R>>\nstartxref\n'+xref+'\n%%EOF';
  return out;
}
function docDownload(c){
  var k=docKind(c.name), fn=docFile(k,c).replace(/\.png$/,'.pdf'), data=docPdf(c);
  var bytes=new Uint8Array(data.length); for(var i=0;i<data.length;i++) bytes[i]=data.charCodeAt(i)&0xff;
  var blob=new Blob([bytes],{type:'application/pdf'});
  /* published pages hand the file over through the downloads capability; opened as a
     file, the plain anchor does it. Either way the viewer gets the same PDF. */
  if(window.claude&&typeof window.claude.use==='function'){
    window.claude.use('downloads').then(function(d){
      if(!d) return docAnchor(blob,fn);
      d.save({filename:fn,data:blob}).then(function(){ toast('Downloaded','The file is '+fn+'.'); },
        function(err){ if(err&&err.code==='declined') return; docAnchor(blob,fn); });
    },function(){ docAnchor(blob,fn); });
    return;
  }
  docAnchor(blob,fn);
}
function docAnchor(blob,fn){
  try{ var url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=fn; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); },2000);
    toast('Downloaded','The file is '+fn+'.');
  }catch(e){ toast('Could not download',fn+' — the preview blocked the save. Open the page in its own tab.',{red:1}); }
}
HANDLERS.push(function(t){
  var x=t.closest('[data-docdl]');
  if(x){ var d={},ds=x.dataset,q; for(q in ds) d[q]=ds[q]; d.doc=ds.docdl; docDownload(docCtx(d)); return true; }
  x=t.closest('[data-doc]'); if(x){ docOpen(docCtx(x.dataset)); return true; }
  if(t.closest('[data-docclose]')){ docClose(); return true; }
  return false;
});
document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&S.ui&&S.ui.docv){ docClose(); } });

/* ---------- the pair of buttons, for every list that shows a document ---------- */
function docAttr(name,c){ c=c||{};
  return 'data-doc="'+esc(name)+'"'+(c.acct?' data-dacct="'+esc(c.acct)+'"':'')+(c.pol?' data-dpol="'+esc(c.pol)+'"':'')+
    (c.line?' data-dline="'+esc(c.line)+'"':'')+(c.ref?' data-dref="'+esc(c.ref)+'"':'')+(c.v?' data-dv="'+esc(c.v)+'"':'');
}
function docBtns(name,c,sm){
  var s=sm===false?'':' sm', d=docAttr(name,c), dl=d.replace('data-doc=','data-docdl=');
  return '<button class="btn'+s+' ghost" '+d+'>'+ic('eye','ic14')+'View</button> <button class="btn'+s+' ghost" '+dl+'>'+ic('upload','ic14')+'Download</button>';
}
/* a narrow cell gets View alone — the document's own viewer carries Download */
function docView1(name,c,label){ return '<button class="btn sm ghost" '+docAttr(name,c)+'>'+ic('eye','ic14')+esc(label||'View')+'</button>'; }
/* one row of a document list: name, state, and the pair of buttons when it is held */
function docRow(name,held,who,c,extra){
  return '<div><div class="bd"><b>'+esc(name)+'</b>'+(held?'':' '+chip('Not on file','amber',true,true))+
    (extra?'<div class="m">'+extra+'</div>':'')+(!held&&who?'<div class="m">'+esc(who)+'</div>':'')+'</div>'+
    '<div class="rt">'+(held?docBtns(name,c):'<span class="meta">'+esc(who||'not on file yet')+'</span>')+'</div></div>';
}
