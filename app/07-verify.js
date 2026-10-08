/* ==================================================================== *
 *  Verifying a provisional account — [stated 24 Sep]
 *  The documents are uploaded here: the PAN card, and then either the GST
 *  certificate or, for a proprietor with no GST, Aadhaar. OCR reads the
 *  numbers AND the legal name off the PAN; the name on the account is
 *  replaced by the name on the card, and the change is shown before it is
 *  written. PAN is still validated against the PAN inside the GSTIN.
 * ==================================================================== */
/* the legal name a PAN card carries: the registry form, in capitals */
function panLegalName(a){
  var n=String(a.n||'').trim()
    .replace(/\bPvt\.?\b/ig,'Private').replace(/\bLtd\.?\b/ig,'Limited')
    .replace(/\s+/g,' ').toUpperCase();
  if(!/(PRIVATE LIMITED|PUBLIC LIMITED|LIMITED|LLP|PARTNERSHIP|ENTERPRISES|& SONS)$/.test(n) && !a.sole) n+=' PRIVATE LIMITED';
  return n;
}
function kycDoc(kind,a){
  var W=420,H=260, t=function(x,y,s,sz,w,col){ return '<text x="'+x+'" y="'+y+'" font-family="Arial" font-size="'+sz+'" font-weight="'+(w||400)+'" fill="'+(col||'#171630')+'">'+String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</text>'; };
  var head={pan:'INCOME TAX DEPARTMENT',gst:'GOODS AND SERVICES TAX',aad:'UNIQUE IDENTIFICATION AUTHORITY OF INDIA'}[kind];
  var body='';
  if(kind==='pan') body=t(24,96,'Name',11,600,'#8C8CA3')+t(24,116,panLegalName(a),13,700)+t(24,152,'Permanent Account Number',11,600,'#8C8CA3')+t(24,176,a.pan||'AAAAA9999A',20,700)+t(24,214,'Signature',11,600,'#8C8CA3');
  if(kind==='gst') body=t(24,96,'Registration Number',11,600,'#8C8CA3')+t(24,118,a.gst||'27AAAAA9999A1Z5',15,700)+t(24,152,'Legal Name',11,600,'#8C8CA3')+t(24,172,panLegalName(a),12,700)+t(24,204,'Principal Place of Business',11,600,'#8C8CA3')+t(24,222,(a.city||'')+(a.st?', '+a.st:''),12,600);
  if(kind==='aad') body=t(24,96,'Aadhaar',11,600,'#8C8CA3')+t(24,120,a.aad||'XXXX XXXX 4412',18,700)+t(24,156,'Name',11,600,'#8C8CA3')+t(24,176,'RAMANLAL VORA',13,700)+t(24,208,'Proprietor of',11,600,'#8C8CA3')+t(24,226,a.n||'',12,600);
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'"><rect width="'+W+'" height="'+H+'" rx="10" fill="#EEF1F7"/><rect x="10" y="10" width="'+(W-20)+'" height="'+(H-20)+'" rx="6" fill="#fff"/>'+
    '<rect x="10" y="10" width="'+(W-20)+'" height="46" rx="6" fill="#171630"/>'+t(24,39,head,12,700,'#fff')+body+'</svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function kycRoute(){ return S.sel.route||'gst'; }
function kycSecondName(){ return kycRoute()==='gst'?'GST certificate':'Aadhaar'; }
function kycReadNow(){
  if(S.flow!=='kyc') return; var a=KA();
  S.sel.read=1;
  var pan=(S.sel.pan||a.pan||'AABCX1234K').toUpperCase(); S.sel.pan=pan;
  if(kycRoute()==='gst') S.sel.gst=S.sel.mis?'27AABCZ9999Z1ZQ':(a.gst||('27'+pan+'1Z5'));
  else S.sel.aad=a.aad||'XXXX XXXX 4412';
  S.sel.ocrname=panLegalName(a);
  paintModal();
}
function KA(){ var l=lineById(S.sel.line||'')||null; return l?acctOf(l):by(S.data.accounts,S.sel.acct||S.route.id); }
FLOWS.kyc={t:'Get the account verified', sub:function(){ return S.sel.read?'Read off the documents. Check the legal name before it is written to the account.':'Upload the PAN card, and the GST certificate — or Aadhaar, where there is no GST.'; },
  body:function(){ var a=KA(), r=kycRoute();
    if(S.sel.read){
      var pan=(S.sel.pan||'').toUpperCase(), gst=(S.sel.gst||'').toUpperCase(), aad=(S.sel.aad||'');
      var match=r==='aad'||gst.slice(2,12)===pan, dup=r==='gst'?S.data.accounts.filter(function(x){return x.id!==a.id&&!x.merged&&x.gst&&x.gst.toUpperCase()===gst;})[0]:null;
      var nm=(S.sel.ocrname||'').trim(), changed=nm&&nm!==a.n;
      return (match?note('green','','<b>Read and validated.</b> '+(r==='gst'?'The ten characters inside the GSTIN are the PAN on the card.':'No GST on a proprietorship, so Aadhaar stands in for the registration certificate.')):note('red','This PAN card does not match the PAN inside the GSTIN. One of them is wrong.','The PAN inside the GSTIN is '+esc(gst.slice(2,12)||'—')+'; the PAN card reads '+esc(pan)+'. Correct a misread below, or ask the client for the right document.','alert'))+
        '<div class="fgrid">'+field('PAN read from the card',input('pan',pan,'AAAAA9999A'))+
          (r==='gst'?field('GSTIN read from the certificate',input('gst',gst,'15 characters')):field('Aadhaar read from the document',input('aad',aad,'XXXX XXXX 9999')))+'</div>'+
        /* [stated 24 Sep] the legal name comes off the PAN, and replaces what was typed */
        field('Legal name as per PAN',input('ocrname',nm,''),'Read by OCR from the PAN card. This is what the account will be called.')+
        (changed?note('amber','Legal name will change','<div class="kycname"><span class="meta">Legal name:</span> <span class="kn-o">'+esc(a.n)+'</span>'+ic('arrowright','ic14')+'<span class="kn-n">'+esc(nm)+'</span></div>Every screen, document, search and opportunity name follows the PAN from here. The name typed at creation stays on the activity trail and on Profile.','info'):
          note('blue','','The name on the account already matches the PAN card. Nothing to change.'))+
        (match&&dup?note('amber','Matches an existing account','<b>'+esc(dup.n)+'</b> ('+dup.id+') already carries this GSTIN. This provisional account merges into it: every opportunity, line, contact, activity and task moves across with its id, owner and stage unchanged, and you land on '+esc(dup.id)+'. '+esc(uname(dup.own))+' keeps the account.'):'');
    }
    var up=function(k,label,hint){
      var img=S.sel[k+'img'];
      return field(label, img?'<div class="kycup"><img src="'+img+'" alt="'+esc(label)+'"><div class="kycup-m"><b>'+esc(S.sel[k+'name']||label)+'</b><span class="green">'+ic('circlecheck','ic14')+'Uploaded</span><button type="button" class="quiet" data-kycclear="'+k+'">Replace</button></div></div>'
        : '<label class="pdrop sm" for="f_'+k+'"><input type="file" id="f_'+k+'" accept="image/png,image/jpeg,application/pdf" data-kycup="'+k+'" hidden>'+ic('upload','ic20')+'<b>Upload the '+esc(label.toLowerCase())+'</b><span>'+esc(hint)+'</span></label>', img?'':hint); };
    return '<div class="field"><div class="lbl">Second document</div>'+seg('route',[['gst','GST certificate'],['aad','Aadhaar — no GST']],'gst')+
        '<div class="hint">'+esc(r==='gst'?'A registered business. PAN is checked against the PAN inside the GSTIN.':'A proprietor with no GST registration. Aadhaar stands in for the registration certificate.')+'</div></div>'+
      up('pan','PAN card','An image or a PDF of the card')+
      up('doc',kycSecondName(),r==='gst'?'Form GST REG-06':'The proprietor’s Aadhaar')+
      note('blue','','Both documents are read by OCR — the numbers, and the legal name on the PAN.')+
      simblock('Prototype','The OCR is faked here. In the product these are read on upload.',
        '<button type="button" class="simbtn" data-kycsample="1">Use sample documents</button>'+
        (S.sel.panimg&&S.sel.docimg?'<button type="button" class="simbtn" data-kycmis="1">'+(S.sel.mis?'✓ PAN will not match the GSTIN':'Make the PAN mismatch the GSTIN')+'</button>':'')); },
  can:function(){ if(!S.sel.read) return !!S.sel.panimg&&!!S.sel.docimg;
    var pan=(S.sel.pan||'').trim().toUpperCase();
    if(!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return false;
    if(!(S.sel.ocrname||'').trim()) return false;
    if(kycRoute()==='aad') return !!(S.sel.aad||'').trim();
    var gst=(S.sel.gst||'').trim().toUpperCase(); return gst.length===15&&gst.slice(2,12)===pan; },
  ok:function(){ return S.sel.read?'Verify and update the name':'Read the documents'; },
  run:function(){ var l=lineById(S.sel.line||'')||null, a=KA(), r=kycRoute();
    if(!S.sel.read){ kycReadNow(); return 'stay'; }
    var pan=S.sel.pan.trim().toUpperCase(), gst=r==='gst'?S.sel.gst.trim().toUpperCase():'', aad=r==='aad'?S.sel.aad.trim():'';
    var nm=(S.sel.ocrname||'').trim(), was=a.n, dup=r==='gst'?S.data.accounts.filter(function(x){return x.id!==a.id&&!x.merged&&x.gst&&x.gst.toUpperCase()===gst;})[0]:
      S.data.accounts.filter(function(x){return x.id!==a.id&&!x.merged&&x.pan===pan&&x.aad&&x.aad.replace(/\s/g,'').slice(-4)===aad.replace(/\s/g,'').slice(-4);})[0];
    var ok=write(function(){
      if(dup){ mergeAccount(a,dup,r); return; }
      a.pan=pan; if(gst) a.gst=gst; if(aad) a.aad=aad; a.prov=0; a.kycBy=S.user; a.kycAt=S.now; a.kycHow=r==='gst'?'PAN card and GST certificate uploaded · PAN matched the PAN inside the GSTIN':'PAN card and Aadhaar uploaded · proprietorship, no GST';
      a.kycDocs={pan:S.sel.panname||'PAN card',doc:S.sel.docname||kycSecondName()};
      if(nm&&nm!==a.n){ a.nWas=was; a.n=nm; acctLog(a,'Renamed on verification: '+was+' → '+nm,'System · read by OCR from the PAN card'); }
      acctLog(a,'KYC verified','System · '+a.kycHow+' · uploaded by '+uname(S.user));
      linesOfAcct(a.id).forEach(function(x){
        logAdd(x,'KYC verified','System · '+(r==='gst'?'PAN matched the PAN inside the GSTIN':'PAN and Aadhaar read — proprietorship, no GST')+' · uploaded by '+uname(S.user),'sys',1);
      });
    },'the verification');
    if(!ok) return 'fail';
    /* [stated 26 Sep · 1.5 §4 / 1.6 §10] a merge lands the user on the master account, the trail entry in view */
    if(dup){ closeFlow(); S.ui['atab_'+dup.id]='activity'; go('acct',{id:dup.id}); }
    else if(!l){ closeFlow(); go('acct',{id:a.id}); }
    toast(dup?'Merged into '+dup.n:'Account verified', dup?'Everything moved across with its id, owner and stage. '+uname(dup.own)+' keeps the account.':(nm&&nm!==was?'Renamed to '+nm+' from the PAN card. The payment request is now open.':'The payment request is now open.')); }};
/* [stated 26 Sep · 1.6] the provisional account folds into the verified one. Every record moves with its id,
   owner, stage and history; the provisional account is kept with an internal Merged flag and never shown again.
   Two open lines for one product after the merge are flagged, never resolved by the system. */
function mergeAccount(a,dup,r){
  var ls=S.data.lines.filter(function(x){return x.acct===a.id;}), os=S.data.opps.filter(function(x){return x.acct===a.id;}), ts=0, acts=0, cn=0;
  ls.forEach(function(x){ var clash=S.data.lines.filter(function(y){ return y.acct===dup.id&&y.product===x.product&&!isRen(y)&&(openLine(y)||y.status==='park'); });
    if((openLine(x)||x.status==='park')&&clash.length){ x.dupMerge=1; clash.forEach(function(y){ y.dupMerge=1; }); }
    x.acct=dup.id; acts+=(x.log||[]).length; ts+=tasksOfLine(x.id).filter(function(t){return !t.done;}).length; });
  os.forEach(function(x){ x.acct=dup.id; });
  (a.pols||[]).forEach(function(p){ dup.pols.push(p); }); a.pols=[];
  S.data.svc.forEach(function(t){ if(t.acct===a.id) t.acct=dup.id; });
  a.con.forEach(function(c){ var m=conMatch(dup,c); if(!m){ dup.con.push(c); cn++; } });
  a.merged=dup.id; a.mergedAt=S.now;
  var who=userById(a.createdBy)?uname(a.createdBy):(a.createdBy||'the system');
  acctLog(dup,'Merged in provisional account '+a.id+' “'+a.n+'” (created '+fmtDs(a.createdAt)+' by '+who+') on '+(r==='gst'?'PAN + GSTIN':'PAN + Aadhaar')+' match — '+
    [plural(os.length,'opportunity').replace('opportunitys','opportunities'),plural(ls.length,'product line'),plural(a.con.length,'contact'),plural(acts,'activity').replace('activitys','activities'),plural(ts,'task')].join(', ')+' moved.','System · KYC by '+uname(S.user));
  auditLog('merge',{from:a.id,to:dup.id,lines:ls.map(function(x){return x.id;}),opps:os.map(function(x){return x.id;})});
}
function isDupMerge(l){ if(!l.dupMerge||!(openLine(l)||l.status==='park')) return false; return S.data.lines.some(function(y){ return y!==l&&y.acct===l.acct&&y.product===l.product&&y.dupMerge&&(openLine(y)||y.status==='park'); }); }
/* uploads: a real file for the two documents, or the sample pair */
document.addEventListener('change',function(ev){
  var t=ev.target; if(!(t instanceof Element)||t.dataset.kycup===undefined) return;
  var f=t.files&&t.files[0]; if(!f) return; var k=t.dataset.kycup;
  var rd=new FileReader(); rd.onload=function(){ S.sel[k+'img']=rd.result; S.sel[k+'name']=f.name; paintModal(); };
  if(/^image\//.test(f.type)) rd.readAsDataURL(f); else { S.sel[k+'img']=kycDoc(k==='pan'?'pan':(kycRoute()==='gst'?'gst':'aad'),KA()); S.sel[k+'name']=f.name; paintModal(); }
});
HANDLERS.push(function(t){
  var x=t.closest('[data-kycsample]');
  if(x){ var a=KA(); S.sel.panimg=kycDoc('pan',a); S.sel.panname='PAN_'+shortName(a.n).replace(/\s+/g,'')+'.pdf';
    S.sel.docimg=kycDoc(kycRoute()==='gst'?'gst':'aad',a); S.sel.docname=(kycRoute()==='gst'?'GST_Certificate_':'Aadhaar_')+shortName(a.n).replace(/\s+/g,'')+'.pdf'; paintModal(); return true; }
  x=t.closest('[data-kycclear]'); if(x){ var k=x.dataset.kycclear; S.sel[k+'img']=''; S.sel[k+'name']=''; paintModal(); return true; }
  x=t.closest('[data-kycmis]'); if(x){ S.sel.mis=!S.sel.mis; if(S.sel.read){ var a2=KA(); S.sel.gst=S.sel.mis?('27AABCZ9999Z1ZQ'):((a2.gst||'')); } paintModal(); return true; }
  return false;
});

/* [stated 23 Sep] one request can cover several lines. For fresh business that is the opportunity's
   lines; a renewal has no opportunity, so it is the account's other renewal lines. */
function payGroup(l){ return isRen(l)?renLinesOfAcct(l.acct):linesOfOpp(l.opp); }
/* [stated 26 Sep · 9.1] from the line: this line only, with Combine with other lines as the way to add more.
   From the opportunity: the selector. Other owners' lines and lines already on a request are named, not selectable.
   No default payment mode. */
function payRows(l){ var gp=payGroup(l).filter(function(x){ return (x.stage===9||(x.stage===10&&x.pay==='pre'))&&x.status==='open'; });
  return gp.map(function(x){ var why=x.pay!=='pre'?'already on '+payRef(x):(x.owner!==S.user?uname(x.owner)+'’s line — requested separately':''); return {l:x,why:why,warn:daysInStage(x)>=QUOTE_VALID?'The confirmed quote may have expired — check it with the insurer first':''}; }); }
FLOWS.pay={t:'Raise payment request', sub:function(){ var l=FL(); return 'One request can cover several of your lines at Purchase Requested — the client pays one amount.'; },
  repaintOn:['mode'],
  body:function(){ var l=FL(), a=acctOf(l), rows=payRows(l), mine=rows.filter(function(r){return !r.why;});
    if(!S.sel.l) S.sel.l=S.sel.comb?mine.map(function(r){return r.l.id;}):[l.id];
    var sel=mine.filter(function(r){return S.sel.l.indexOf(r.l.id)>=0;}), tot=sel.reduce(function(s,r){return s+premOf(r.l);},0), h='';
    h+=a.prov?note('red','The account is not KYC verified','PAN and GST are needed before a payment request. <button class="btn sm" data-flow="kyc" data-line="'+l.id+'">Get verified</button>','lock'):'';
    if(!S.sel.comb){ var r0=rows.filter(function(r){return r.l.id===l.id;})[0]||{l:l};
      h+='<div class="kvgrid two">'+kv('Product line',esc(l.product)+' · '+esc(l.picked||l.ins||'—'))+kv('Amount','<b style="font-size:var(--fs-xl)">'+INR(premOf(l))+'</b>')+'</div>'+(r0.warn?note('amber','',esc(r0.warn),'alert'):'')+
        (mine.length>1?'<button type="button" class="btn sm mt8" data-pcomb="1">'+ic('plus')+'Combine with other lines</button>':'');
    } else {
      h+=rows.map(function(r){ return opt('data-tog="l" data-tv="'+r.l.id+'"',!r.why&&S.sel.l.indexOf(r.l.id)>=0,r.l.product,(r.why?esc(r.why):esc(r.l.picked||r.l.ins||'—')+' · '+r.l.id)+(r.warn&&!r.why?' · <span class="amber">'+esc(r.warn)+'</span>':''),INR(premOf(r.l)),true,!!r.why); }).join('')+
        '<div class="flex" style="justify-content:space-between;border-top:1px solid var(--border);padding-top:10px"><span class="meta">'+plural(sel.length,'line')+' selected</span><b style="font-size:var(--fs-xl)">'+INR(tot)+'</b></div>';
    }
    h+='<div class="fgrid">'+field('Business name','<input class="inp" value="'+esc(a.n)+'" disabled>','As on the PAN — the insurer’s receipt carries it.')+field('Payment mode',select('mode',S.sel.mode||'',[['','Choose how the customer will pay']].concat(PAYMODE)))+'</div>'+
      '<div class="fgrid">'+field('PAN card','<input class="inp" value="PAN_'+esc(shortName(a.n).replace(/\s+/g,''))+'.pdf" disabled>')+field('GST certificate','<input class="inp" value="GST_'+esc(a.gst||'')+'.pdf" disabled>')+'</div>';
    return h; },
  can:function(){ var l=FL(), a=acctOf(l); return !a.prov&&!!S.sel.mode&&!!(S.sel.l&&S.sel.l.length); },
  ok:function(){ return 'Raise request to Ops'; },
  run:function(){ var l=FL(), ref='PAY-'+l.id.slice(3)+((l.payOld||[]).length?'-'+((l.payOld||[]).length+1):''); var ok=write(function(){ var ids=S.sel.l.slice(), amt=ids.reduce(function(s,i){return s+premOf(lineById(i));},0); ids.forEach(function(id){ var x=lineById(id); x.pay='ticket'; x.payRef=ref; x.payMode=S.sel.mode; x.payLines=ids; x.amt=amt; x.payAt=S.now; logAdd(x,'Payment ticket '+ref+' raised','System · covers '+plural(ids.length,'product line')+' · '+INR(amt)+' · '+S.sel.mode,'sys',1); });
      var o=oppOf(l); if(o) oppLog(o,'Payment request raised · '+ref,uname(S.user)+' · '+plural(ids.length,'line')+' · '+INR(amt)); if(isRen(l)) S.ui['rsel_'+l.acct]=[]; },'the payment request'); if(!ok) return 'fail'; toast(ref+' raised with Ops','Stage stays at Purchase Requested. Ops aims to return the details within 60 working minutes.'); }};
HANDLERS.push(function(t){ var x=t.closest('[data-qatt]'); if(!x) return false; S.sel.att=x.dataset.qatt; paintModal(); return true; });
HANDLERS.push(function(t){ var x=t.closest('[data-pcomb]'); if(!x) return false; var rows=payRows(FL()); S.sel.comb=1; S.sel.l=rows.filter(function(r){return !r.why;}).map(function(r){return r.l.id;}); paintModal(); return true; });

/* [stated 26 Sep · 2.3] the owner sets the status. Withdrawn is open to the owner on stages 1–10 with a
   free-text reason; nothing after payment withdraws. Lost needs at least one connected call. Unreachable
   is the system's, never a person's. */
function reachedOnce(l){ return everConnected(l)||!!l.req||l.stage>=3; }
FLOWS.payAnswer={t:'Answer Ops’ query', sub:'The payment ticket is on hold until you answer. The line stays at Purchase Requested.',
  body:function(){ var l=FL(); return note('amber',OPS_OWNER+', BimaOps',esc(l.payQ?l.payQ.q:''),'mail')+field('Your reply',input('q',S.sel.q,'Registered office address, as on the GST certificate.')); },
  can:function(){ return !!(S.sel.q||'').trim(); }, ok:'Send reply',
  run:function(){ var l=FL(); var ok=write(function(){ l.payQ.ans=S.sel.q.trim(); logAdd(l,'Replied to Ops query on '+payRef(l),uname(S.user)+' · '+l.payQ.ans,'sys'); },'the reply'); if(!ok) return 'fail'; toast('Reply sent to Ops','Stage unchanged at Purchase Requested'); }};
FLOWS.deskMail={t:'Write to the desk', sub:'On the RM ↔ desk thread of the post-purchase ticket. The client does not see it.',
  body:function(){ var l=FL(), r=l.iss.rows, pend=[r.pf.st==='pending'?['pf','Please resend the proposal form link to the client']:null,r.md.st==='pending'?['md','Please resend the mandate letter link to the client']:null].filter(Boolean);
    return (pend.length?'<div class="lbl">Quick asks</div>'+pend.map(function(x){ return opt('data-pick="'+x[0]+'"',S.sel.d===x[0],x[1],''); }).join(''):'')+field('Message',input('x',S.sel.x,'Anything the desk should know or do')); },
  can:function(){ return !!S.sel.d||!!(S.sel.x||'').trim(); }, ok:'Send',
  run:function(){ var l=FL(), ask={pf:'Please resend the proposal form link to the client.',md:'Please resend the mandate letter link to the client.'}[S.sel.d]||''; var body=[ask,(S.sel.x||'').trim()].filter(Boolean).join(' ');
    var ok=write(function(){ issMail(l,'rm',uname(S.user),'Customer Success','RE: '+l.iss.id+' — '+acctName(l)+' · '+l.product,body); logAdd(l,'Wrote to the desk on '+l.iss.id,uname(S.user)+' · '+body,'desk'); },'the message'); if(!ok) return 'fail'; toast('Sent to the desk','On the RM ↔ desk thread.'); }};
FLOWS.status={t:'Change status', sub:'Status sits beside the stage. Time Pending keeps the position; closing preserves how far it got.',
  body:function(){ var l=FL(), canLose=reachedOnce(l), d=S.sel.d; var minD=ymd(S.now);
    var ops=[['park','Time Pending','Alive, deliberately parked. Keeps its stage. Needs a revisit date and a reason'],['lost','Lost','The client did not buy from us. Needs a loss reason'+(canLose?'':' · available once a call has connected')],['noapp','No Appetite','We could not place it. A supply failure, not a competitive loss'],['disq','Disqualified','Should never have been in the pipeline. Needs a reason']];
    if(l.stage<=10) ops.push(['withdrawn','Withdrawn','The client pulled out before paying. Say why in their words']);
    return ops.map(function(x){ return opt('data-pick="'+x[0]+'"',d===x[0],x[1],x[2],'',false,x[0]==='lost'&&!canLose); }).join('')+
      (d==='park'?'<div class="fgrid">'+field('Revisit on','<input class="inp" id="f_rv" data-f="rv" type="date" min="'+minD+'" value="'+esc(S.sel.rv||'')+'">','',S.sel.rv&&S.sel.rv<minD?'Cannot be in the past.':'')+field('Reason',select('rs',S.sel.rs||'',[['','Choose a reason']].concat(PARK)))+'</div>':'')+
      (d==='lost'?field('Loss reason',select('rs',S.sel.rs||'',[['','Choose a reason']].concat(LOSS))):'')+
      (d==='disq'?field('Disqualification reason',select('rs',S.sel.rs||'',[['','Choose a reason']].concat(DISQ))):'')+
      (d==='withdrawn'?field('Why did they withdraw?',input('rs',S.sel.rs,'In the client’s words')):'')+
      (d==='noapp'?field('Why could it not be placed? — optional',input('rs',S.sel.rs,'Occupancy, risk reason, which insurers declined')):'')+
      (d&&d!=='park'?note('neutral','','A closed line is not reopened. If they come back, it is a new opportunity.','info'):''); },
  can:function(){ var l=FL(), d=S.sel.d; if(!d) return false; if(d==='lost'&&!reachedOnce(l)) return false; if(d==='withdrawn'&&l.stage>10) return false; if(d==='park') return !!S.sel.rv&&S.sel.rv>=ymd(S.now)&&!!S.sel.rs; if(d==='lost'||d==='disq'||d==='withdrawn') return !!(S.sel.rs||'').trim(); return true; }, ok:'Apply status',
  run:function(){ var l=FL(); var nm={park:'Time Pending',lost:'Lost',noapp:'No Appetite',disq:'Disqualified',withdrawn:'Withdrawn'}[S.sel.d];
    var ok=write(function(){ l.status=S.sel.d; l.reason=(S.sel.rs||'').trim(); if(S.sel.d==='park') l.revisit=new Date(S.sel.rv+'T10:00:00').getTime(); else { l.closedAt=S.now; l.closedBy=S.user; var o=oppOf(l); if(o) oppLog(o,'Product line closed · '+l.product+' · '+nm,uname(S.user)+(l.reason?' · '+l.reason:'')); }
      logAdd(l,'Status → '+nm,uname(S.user)+(l.reason?' · '+l.reason:''),'sys'); fireRules(l); },'the status'); if(!ok) return 'fail';
    toast('Status: '+nm, S.sel.d==='park'?'Stage stays at '+stageName(l.stage)+' — it comes back to Open on '+fmtD(l.revisit):'Line closed at '+stageName(l.stage)+' · how far it got is preserved'); }};
FLOWS.resume={t:'Resume this line', sub:'Takes it off Time Pending. The stage never moved.', body:function(){ var l=FL(); return note('blue','','Parked '+esc(fmtD(l.log.filter(function(e){return /Time Pending/.test(e.t);})[0]?l.log.filter(function(e){return /Time Pending/.test(e.t);})[0].at:S.now))+' · '+esc(l.reason)+'. It goes back to <b>'+esc(stageName(l.stage))+'</b>, waiting on '+esc(STAGES[l.stage-1].w)+'.'); }, can:function(){return true;}, ok:'Resume',
  run:function(){ var l=FL(); var ok=write(function(){ l.status='open'; l.reason=''; l.revisit=0; logAdd(l,'Status → Open',uname(S.user)+' · resumed by hand','sys'); fireRules(l); },'resuming'); if(!ok) return 'fail'; toast('Resumed','The stage never moved'); }};

FLOWS.reassign={t:'Reassign this product line', sub:function(){ var l=FL(); return 'Now owned by '+uname(l.owner)+'. Moves this line only — the account owner stays.'; },
  body:function(){ var l=FL(), ppl=myTeam().filter(function(x){return x.id!==l.owner;});
    return (ppl.length?ppl.map(function(p){ return opt('data-pick="'+p.id+'"',S.sel.d===p.id,p.n,p.cat||p.title||''); }).join(''):empty('users','Nobody else in your team','There is no one to move it to.'))+
      field('Reason',input('rs',S.sel.rs,'Nikhil on leave until 10 Oct'),'',S.sel.rs!==undefined&&!(S.sel.rs||'').trim()?'Give a reason for the transfer':'')+note('neutral','','Open tasks on the line move with it. Stage, status, contact, quotes and tickets are untouched.','clock'); },
  can:function(){ return !!S.sel.d&&!!(S.sel.rs||'').trim(); }, ok:'Reassign',
  run:function(){ var l=FL(), to=S.sel.d; var ok=write(function(){ moveLineOwner(l,to,(S.sel.rs||'').trim()); },'the reassignment'); if(!ok) return 'fail'; toast('Reassigned to '+uname(to),'It is in their Newly assigned. The account owner is unchanged.'); }};
function moveLineOwner(l,to,why){ var from=l.owner; l.owner=to; l.reAt=S.now; tasksOfLine(l.id).forEach(function(t){ if(!t.done) t.owner=to; });
  logAdd(l,'Owner changed from '+uname(from)+' to '+uname(to)+' — '+why,'by '+uname(S.user),'sys'); var o=oppOf(l); if(o) oppLog(o,'Ownership moved · '+l.product+' · '+uname(from)+' → '+uname(to),'by '+uname(S.user)+' · '+why); }
/* [stated 26 Sep · 4.5 · PD-101] reassigning the account moves the old owner's open lines on it too */
FLOWS.acctReassign={t:'Reassign this account', sub:function(){ var a=by(S.data.accounts,S.sel.acct); return 'Account owner now '+uname(a.own)+'. This is the only way the account owner changes.'; },
  body:function(){ var a=by(S.data.accounts,S.sel.acct), ppl=myTeam().filter(function(x){return x.id!==a.own;}), mv=linesOfAcct(a.id).filter(function(l){ return l.owner===a.own&&(openLine(l)||postLine(l)||l.status==='park'); });
    return (ppl.length?ppl.map(function(p){ return opt('data-pick="'+p.id+'"',S.sel.d===p.id,p.n,p.cat||p.title||''); }).join(''):empty('users','Nobody else in your team','There is no one to move it to.'))+
      field('Reason',input('rs',S.sel.rs,'Priya left 30 Sep'),'',S.sel.rs!==undefined&&!(S.sel.rs||'').trim()?'Give a reason for the transfer':'')+
      note('blue',mv.length?plural(mv.length,'open line')+' move with it':'No open lines move',mv.length?mv.map(function(l){return esc(l.product)+' · '+esc(stageName(l.stage));}).join('<br>')+'<div class="meta mt4">Lines owned by anyone else on this account stay where they are.</div>':'Only the account owner changes.','info'); },
  can:function(){ return !!S.sel.d&&!!(S.sel.rs||'').trim(); }, ok:'Reassign',
  run:function(){ var a=by(S.data.accounts,S.sel.acct), to=S.sel.d, from=a.own, why=(S.sel.rs||'').trim(), n=0; var ok=write(function(){ linesOfAcct(a.id).forEach(function(l){ if(l.owner===from&&(openLine(l)||postLine(l)||l.status==='park')){ moveLineOwner(l,to,why); n++; } }); a.own=to; acctLog(a,'Owner changed from '+uname(from)+' to '+uname(to)+' — '+why,'by '+uname(S.user)+' · '+plural(n,'line')+' moved with it'); },'the reassignment'); if(!ok) return 'fail'; toast('Account reassigned to '+uname(to),plural(n,'open line')+' moved with it.'); }};
/* [stated 26 Sep · 18.4] take ownership: the owner's manager only, free-text reason */
FLOWS.takeover={t:'Take ownership', sub:function(){ var l=FL(); return 'Take ownership of '+l.product+' from '+uname(l.owner)+'?'; },
  body:function(){ return field('Reason',input('rs',S.sel.rs,'Owner on leave, client waiting'),'',S.sel.rs!==undefined&&!(S.sel.rs||'').trim()?'Give a reason':'')+note('neutral','','You become the owner and every action from here is yours in the trail. Open tasks come with it. Hand it back from Manage when they are back.'); },
  can:function(){ return !!(S.sel.rs||'').trim()&&canTakeOver(FL()); }, ok:'Take ownership',
  run:function(){ var l=FL(); var ok=write(function(){ if(S.data.took.indexOf(l.id)<0) S.data.took.push(l.id); var from=l.owner; l.prevOwner=from; l.owner=S.user; tasksOfLine(l.id).forEach(function(t){ if(!t.done) t.owner=S.user; }); logAdd(l,'Owner changed from '+uname(from)+' to '+uname(S.user)+' — '+(S.sel.rs||'').trim(),'by '+uname(S.user)+' · Take ownership','sys'); },'the takeover'); if(!ok) return 'fail'; toast('You now own this line','Open tasks moved with it.'); }};
function handBackWhy(l){ var p=userById(l.prevOwner); if(!p) return 'The previous owner is not on record.'; if(p.active===0) return uname(p.id)+' is no longer active.'; if(p.mgr!==S.user) return uname(p.id)+' is no longer in your team.'; return ''; }
FLOWS.handback={t:'Hand back', sub:function(){ var l=FL(); return 'Hand '+l.product+' back to '+uname(l.prevOwner||'')+'?'; },
  body:function(){ var l=FL(), why=handBackWhy(l); if(S.sel.rs===undefined) S.sel.rs='Back from leave';
    return (why?note('red','Cannot hand back',esc(why)+' Reassign it to someone in your team instead.','alert'):'')+field('Reason',input('rs',S.sel.rs,'Back from leave'))+note('neutral','','Open tasks go back with it. The trail shows the round trip.'); },
  can:function(){ return !handBackWhy(FL())&&!!(S.sel.rs||'').trim(); }, ok:'Hand back',
  run:function(){ var l=FL(); var ok=write(function(){ var to=l.prevOwner; l.owner=to; l.prevOwner=''; l.reAt=S.now; var i=S.data.took.indexOf(l.id); if(i>=0) S.data.took.splice(i,1); tasksOfLine(l.id).forEach(function(t){ if(!t.done) t.owner=to; }); logAdd(l,'Owner changed from '+uname(S.user)+' to '+uname(to)+' — '+(S.sel.rs||'').trim(),'by '+uname(S.user)+' · Hand back','sys'); },'the hand-back'); if(!ok) return 'fail'; toast('Handed back','The line is home.'); }};
