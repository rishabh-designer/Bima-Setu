/* ==================================================================== *
 *  The QCR — a report comparing the quotes, not a list of them.
 *  Placement builds it on a non-DUA line; on a DUA line it is assembled from
 *  the rater quotes the owner picked. The owner reviews it here and either
 *  sends it to the contact (7 → 8) or sends it back for revision (→ 6).
 *  The per-insurer terms below are prototype stand-ins.
 * ==================================================================== */
var QCR_TERMS={
 liab:{cov:'Premises, products and completed operations', add:['Defence costs outside the limit','Worldwide jurisdiction, excluding USA and Canada','Contractual liability'], exc:['Pollution, except sudden and accidental','Professional services','Product recall'], ded:['₹50,000 each claim','₹1,00,000 each claim','₹75,000 each claim']},
 marine:{cov:'All risks, warehouse to warehouse', add:['Strike, riot and civil commotion','War risk','Transit by courier'], exc:['Improper packing','Loss from delay','Inherent vice'], ded:['0.5% of claim, minimum ₹10,000','1% of claim, minimum ₹15,000','₹20,000 each claim']},
 prop:{cov:'Fire and special perils, STFI, earthquake', add:['Terrorism','Removal of debris','Architects’ and surveyors’ fees'], exc:['Wear and tear','Electrical and mechanical breakdown','Unoccupied beyond 30 days'], ded:['₹25,000 each claim','₹50,000 each claim','5% of claim, minimum ₹25,000']},
 gh:{cov:'Hospitalisation, day care, pre and post hospitalisation (30 / 60 days)', add:['Maternity up to ₹75,000','Pre-existing diseases from day one','Room rent at actuals'], exc:['Cosmetic treatment','Non-medical consumables','Experimental therapies'], ded:['No co-pay','10% co-pay on parents','5% co-pay on all claims']},
 wc:{cov:'Liability under the Employees’ Compensation Act', add:['Medical expenses up to ₹1,00,000','Occupational disease','Contractors’ workers'], exc:['Wilful misconduct','War and nuclear','Intoxication'], ded:['None','None','None']}
};
var QCR_CSR={'New India Assurance':'95.6%','Oriental Insurance':'93.1%','United India':'92.4%','Reliance General':'94.0%','ICICI Lombard':'96.8%','Tata AIG':'95.2%','Bajaj Allianz':'94.4%','HDFC Ergo':'96.1%'};

function qcrSource(l){ return l.rate===1?'dau':'plc'; }
function qcrQuotes(l,dauRejected){
  if(dauRejected&&l.dauQcr) return dauQuotes(l).filter(function(q){ return l.dauQcr.q.indexOf(q.i)>=0; });
  if(l.rate===1){ var sel=l.qsel&&l.qsel.length?l.qsel:null; return dauQuotes(l).filter(function(q){ return q.st==='quoted'&&(!sel||sel.indexOf(q.i)>=0); }); }
  return QUOTES.plc.filter(function(q){ return q.st==='quoted'; });
}
function qcrOthers(l,dauRejected){ if(dauRejected||l.rate===1) return []; return QUOTES.plc.filter(function(q){ return q.st!=='quoted'; }); }
function qcrIssued(l,v){ var e=l.log.filter(function(x){ return /Quotes returned by placement|QCR v\d+ (sent to|shared with) client/.test(x.t); }).sort(function(a,b){return a.at-b.at;}); return e.length?e[e.length-1].at:(l.enteredAt||S.now); }

function qcrReport(l,v,dauRejected){
  var a=acctOf(l), r=l.req||{}, qs=qcrQuotes(l,dauRejected), oth=qcrOthers(l,dauRejected), fam=RFQ_FAM[l.product]||'prop', T=QCR_TERMS[fam];
  var issued=qcrIssued(l,v), dau=dauRejected||l.rate===1;
  var by_=dau?uname(l.owner)+', BimaKavach':'Meera Iyer, BimaPlacement', ref=dau?'QCR-'+l.id.slice(3)+'-'+v:'PLC-'+l.id.slice(3);
  var col=function(fn){ return qs.map(function(q,i){ return '<td>'+fn(q,i)+'</td>'; }).join(''); };
  var rows=[
    ['Premium', function(q){ return '<b class="qs-p">'+INR(q.p)+'</b>'; }],
    ['Sum insured', function(){ return esc(r.si||'—'); }],
    ['Scope of cover', function(){ return esc(T.cov); }],
    ['Deductible', function(q,i){ return esc(T.ded[i%3]); }],
    ['Add-ons included', function(q,i){ return T.add.slice(0,3-(i%3)).map(esc).join('<br>'); }],
    ['Exclusions to note', function(q,i){ return esc(T.exc[i%3]); }],
    ['Claim settlement ratio', function(q){ return esc(QCR_CSR[q.i]||'—'); }],
    ['Quote valid until', function(){ return esc(fmtD(issued+30*86400000)); }]
  ];
  return '<article class="qsheet">'+
    '<header class="qs-h"><div class="qs-brand">Bima<i>Kavach</i></div><div class="qs-tt"><div class="qs-title">Quote Comparison Report</div><div class="qs-ver">Version '+v+' · '+esc(fmtD(issued))+'</div></div></header>'+
    '<dl class="qs-meta">'+
      '<div><dt>Prepared for</dt><dd>'+esc(a.n)+'</dd></div>'+
      '<div><dt>Product</dt><dd>'+esc(l.product)+'</dd></div>'+
      '<div><dt>Sum insured</dt><dd>'+esc(r.si||'—')+'</dd></div>'+
      '<div><dt>Policy period</dt><dd>'+esc(r.ten||'1 year')+(l.rfq&&l.rfq.f&&rfqVal(l,'start')?' from '+esc(fmtD(new Date(rfqVal(l,'start')+'T00:00:00').getTime())):'')+'</dd></div>'+
      '<div><dt>Prepared by</dt><dd>'+esc(by_)+'</dd></div>'+
      '<div><dt>Reference</dt><dd>'+esc(ref)+'</dd></div>'+
    '</dl>'+
    '<div class="qs-tw"><table class="qs-t"><thead><tr><th></th>'+qs.map(function(q){ return '<th>'+esc(q.i)+'</th>'; }).join('')+'</tr></thead><tbody>'+
      rows.map(function(rw){ return '<tr><th>'+esc(rw[0])+'</th>'+col(rw[1])+'</tr>'; }).join('')+'</tbody></table></div>'+
    (oth.length?'<div class="qs-also"><b>Also approached</b>'+oth.map(function(q){ return '<span>'+esc(q.i)+' — '+(q.st==='declined'?'declined'+(q.r?': '+esc(q.r.toLowerCase()):''):'no response by the report date')+'</span>'; }).join('')+'</div>':'')+
    '<footer class="qs-note">This report sets out the quotes as received and names no preferred insurer. Terms are summarised; the insurer’s policy wording governs.</footer>'+
  '</article>';
}

/* ---------- the viewer ---------- */
function qcrActionable(l,v){ return l.rate===0&&l.stage===7&&v===l.round&&canAct(l); }
function qvOpen(l,v,dauRejected){
  S.ui.qvLine=l.id; S.ui.qvV=v; S.ui.qvRej=!!dauRejected;
  var el=document.getElementById('qview'); if(!el){ el=document.createElement('div'); el.id='qview'; el.className='qview'; document.body.appendChild(el); }
  el.innerHTML=qvHtml(l,v,dauRejected); el.hidden=false; document.body.style.overflow='hidden';
  var bd=el.querySelector('.qv-body'); if(bd) bd.scrollTop=0;
}
function qvClose(){ var el=document.getElementById('qview'); if(el){ el.hidden=true; el.innerHTML=''; } document.body.style.overflow=''; S.ui.qvLine=''; }
function qvHtml(l,v,dauRejected){
  var a=acctOf(l), act=!dauRejected&&qcrActionable(l,v), who=l.contact.n||'the client', dau=dauRejected||l.rate===1;
  var st=qcrVersions(l).filter(function(x){return x.v===v;})[0];
  return '<div class="qv-top"><div class="qv-tt"><b>QCR v'+v+'</b> · '+esc(shortName(a.n))+' · '+esc(l.product)+'<div class="meta">'+(dau?'Assembled from the rater’s quotes':'From BimaPlacement · ticket PLC-'+l.id.slice(3))+(dauRejected?' · rejected by the client':(st?' · '+esc(st.st):''))+'</div></div><span class="sp"></span>'+
      '<button class="btn sm ghost" data-docdl="Quote Comparison Report" data-dline="'+l.id+'" data-dv="'+v+'">'+ic('upload','ic14')+'Download</button><button class="btn sm" data-qvclose="1">Close</button></div>'+
    '<div class="qv-body">'+qcrReport(l,v,dauRejected)+'</div>'+
    /* [stated 24 Sep] three ways out: the system emails it, the owner downloads it and sends it
       themselves, or it goes back to placement. A manual send is recorded as one. */
    (act?'<div class="qv-foot"><div class="qv-fr"><span class="meta">Review it before it goes out. Send it from here, download it and send it yourself, or send it back to placement.</span><span class="sp"></span>'+
      '<button class="btn" data-qvback="1">Send back for revision</button>'+
      '<button class="btn" data-qvmanual="1">'+ic('upload','ic14')+'Download and share myself</button>'+
      '<button class="btn primary" data-qvsend="1">'+ic('send')+'Send to '+esc(who)+'</button></div></div>':'');
}
/* ---------- shared by hand: the owner sends the report on their own channel ---------- */
/* [stated 24 Sep] the client has the quote either way, so the line moves to Quote Sent. What
   differs is the record: who sent it, on what channel, and that it did not go out from here. */
var SHARE_CH=['WhatsApp','Email from my own mailbox','In a meeting','Printed and handed over','Courier'];
FLOWS.shareQcr={t:function(){ var l=FL(); return 'Share QCR v'+l.round+' yourself'; },
  sub:'You have downloaded the report and sent it to the client on your own channel. Record it here so the line and the trail agree with what the client has.',
  body:function(){ var l=FL(), a=acctOf(l);
    if(S.sel.to===undefined) S.sel.to=l.contact.n||'';
    return note('blue','','<b>Download it first if you have not.</b> '+docBtns('Quote Comparison Report',{line:l.id,acct:a.id,v:l.round},false))+
      field('How you sent it',select('ch',S.sel.ch||SHARE_CH[0],SHARE_CH))+
      field('Who you sent it to',input('to',S.sel.to!==undefined?S.sel.to:(l.contact.n||''),'The person at the client’s end'),'Defaults to the contact on this product line.')+
      field('Note — optional',input('x',S.sel.x,'Anything said when you sent it'))+
      note('amber','','The line moves to <b>Quote Sent</b> and the quote-sent follow-up rules start, exactly as if the system had emailed it. The trail records that it went out by hand, not from here.','info'); },
  can:function(){ return !!(S.sel.to||'').trim(); }, ok:'Record it and move to Quote Sent',
  run:function(){ var l=FL(), made=[], ch=S.sel.ch||SHARE_CH[0], to=(S.sel.to||'').trim();
    var ok=write(function(){
      logAdd(l,'QCR v'+l.round+' shared with client — by hand',uname(S.user)+' · downloaded and sent on '+ch+' to '+to+(S.sel.x?' · '+S.sel.x:'')+' · not sent from the CRM','qcr');
      made=moveStage(l,8,'QCR v'+l.round+' shared by hand');
    },'the share'); if(!ok) return 'fail';
    toast('QCR v'+l.round+' recorded as shared',ch+' to '+to+' · '+stageToast(l,made)); }};
function qvSend(){
  var l=lineById(S.ui.qvLine); if(!l||!qcrActionable(l,S.ui.qvV)) return; var made=[];
  var ok=write(function(){ logAdd(l,'QCR v'+l.round+' shared with client',uname(S.user)+' · emailed to '+(l.contact.n||'the client')+(l.contact.e?' · '+l.contact.e:'')+' · as received from placement','qcr'); made=moveStage(l,8,'QCR v'+l.round+' sent to the client'); },'the QCR');
  if(!ok) return; qvClose(); paint(); toast('QCR v'+l.round+' emailed to '+(l.contact.n||'the client'),stageToast(l,made));
}
HANDLERS.push(function(t){
  var x;
  if(x=t.closest('[data-flow="qcrPlc"]')){ var lp=lineById(x.dataset.line); if(lp) qvOpen(lp,lp.round); return true; } /* ticket rows still name the old flow */
  if(x=t.closest('[data-qcrview]')){ var l=lineById(x.dataset.line); if(l) qvOpen(l,+x.dataset.qcrview||l.round,x.dataset.rej==='1'); return true; }
  if(t.closest('[data-qvclose]')){ qvClose(); return true; }
  if(t.closest('[data-qvsend]')){ qvSend(); return true; }
  if(t.closest('[data-qvback]')){ var ln=S.ui.qvLine; qvClose(); openFlow('objectQcr',{line:ln}); return true; }
  if(t.closest('[data-qvmanual]')){ var lm=S.ui.qvLine; qvClose(); openFlow('shareQcr',{line:lm}); return true; }
  return false;
});
document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&S.ui&&S.ui.qvLine){ qvClose(); } });

/* a compact card that stands for the report wherever it is listed */
function qcrCard(l,v,opts){ opts=opts||{}; var q=qcrQuotes(l,opts.rej), ps=q.map(function(x){return x.p;}).filter(Boolean), lo=Math.min.apply(null,ps), hi=Math.max.apply(null,ps), st=qcrVersions(l).filter(function(x){return x.v===v;})[0];
  return '<div class="qcard"><div class="qc-ic">'+ic('file','ic20')+'</div><div class="qc-bd"><b>Quote Comparison Report · v'+v+'</b>'+(opts.rej?' '+chip('Rejected by the client','red',true,true):(st?' '+chip(st.st,st.tone,true,true):''))+
    '<div class="qc-m">'+plural(q.length,'insurer')+' compared'+(ps.length?' · '+(lo===hi?INR(lo):INR(lo)+' – '+INR(hi)):'')+(st&&st.at?' · '+esc(fmtD(st.at)):'')+'</div></div>'+
    '<div class="qc-a"><button class="btn sm'+(opts.primary?' primary':'')+'" data-qcrview="'+v+'" data-line="'+l.id+'"'+(opts.rej?' data-rej="1"':'')+'>'+esc(opts.label||'View')+'</button></div></div>'; }
