/* ==================================================================== *
 *  Payment — the mode chosen at the request is carried through, shown
 *  plainly before the details go to the client, and the proof is a
 *  payment screenshot the amount (and UTR) are read from. If they cannot
 *  be read, the owner types them.
 * ==================================================================== */
function payModeOf(l){ return l.payMode||'Payment link'; }
function payInsurer(l){ return l.picked||l.ins||'the insurer'; }
function payDetails(l){
  var m=payModeOf(l), ins=payInsurer(l), slug=ins.toLowerCase().replace(/[^a-z]+/g,''), amt=INR(l.amt||premOf(l));
  if(m==='NEFT / RTGS') return [['Beneficiary',esc(ins)],['Account number','<span class="mono">XXXX XXXX '+esc(l.id.slice(3))+'</span>'],['IFSC','<span class="mono">'+esc(slug.slice(0,4).toUpperCase())+'0000104</span>'],['Reference to quote','<span class="mono">'+esc('Q-'+l.id.slice(3)+'-26')+'</span>'],['Amount','<b>'+amt+'</b>']];
  if(m==='Cheque') return [['Payable to',esc(ins)],['Hand over at',esc(ins)+' branch, or the BimaKavach office'],['Write on the back','<span class="mono">'+esc('Q-'+l.id.slice(3)+'-26')+'</span> and the client’s phone number'],['Amount','<b>'+amt+'</b>']];
  if(m==='Proforma invoice') return [['Proforma invoice','PDF · issued by '+esc(ins)],['Pay by',esc(fmtD(addWork(S.now,durMins(3,'d'))))],['Amount','<b>'+amt+'</b>']];
  return [['Payment link','<span class="mono">pay.'+esc(slug)+'.com/…</span>'],['Valid for','48 hours'],['Amount','<b>'+amt+'</b>']];
}
function payModeBlock(l){
  return '<div class="paymode"><div class="pm-k">Payment mode</div><div class="pm-v">'+esc(payModeOf(l))+'</div></div>'+
    '<div class="kvgrid two mt12">'+payDetails(l).map(function(r){ return kv(r[0],r[1]); }).join('')+'</div>';
}

/* ---------- share the payment details: the mode is the first thing the owner sees ---------- */
FLOWS.share={t:'Share payment details with the client', sub:'Check the payment mode and the details Ops returned, then send them.',
  body:function(){ var l=FL();
    return payModeBlock(l)+
      '<div class="fgrid">'+field('Send by',select('ch',S.sel.ch||'Email',['Email','WhatsApp']))+field('To','<input class="inp" value="'+esc(l.contact.n+' · '+(S.sel.ch==='WhatsApp'?(l.contact.m||''):(l.contact.e||'')))+'" disabled>')+'</div>'; },
  repaintOn:['ch'],
  can:function(){return true;}, ok:function(){ return 'Send to '+FL().contact.n; },
  run:function(){ var l=FL(), made=[]; var ok=write(function(){ (l.payLines.length?l.payLines:[l.id]).forEach(function(id){ var x=lineById(id); x.pay='shared'; logAdd(x,'Payment details shared with client',uname(S.user)+' · '+payModeOf(l)+' · '+(S.sel.ch||'Email')+' to '+(S.sel.ch==='WhatsApp'?x.contact.m:x.contact.e),'pay'); if(x.stage<10) made=made.concat(moveStage(x,10,'Payment details sent')); }); },'sharing'); if(!ok) return 'fail'; toast('Payment details sent to '+l.contact.n,payModeOf(l)+' · '+stageToast(l,made)); }};

/* ---------- confirm payment: a screenshot, read ---------- */
function proofUtr(l){ return 'UTIB'+'2609'+l.id.slice(3)+'1178'; }
function proofSample(l){
  var amt=INR(l.amt||premOf(l)), ins=payInsurer(l);
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520"><rect width="360" height="520" rx="22" fill="#F4F6FA"/><rect x="20" y="24" width="320" height="472" rx="16" fill="#fff"/>'+
    '<circle cx="180" cy="96" r="30" fill="#0B7A48"/><path d="M166 96l10 10 20-22" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'+
    '<text x="180" y="160" font-family="Arial" font-size="18" font-weight="700" fill="#171630" text-anchor="middle">Payment successful</text>'+
    '<text x="180" y="206" font-family="Arial" font-size="30" font-weight="700" fill="#171630" text-anchor="middle">'+amt.replace('₹','Rs ')+'</text>'+
    '<text x="44" y="262" font-family="Arial" font-size="13" fill="#8C8CA3">Paid to</text><text x="44" y="282" font-family="Arial" font-size="15" fill="#171630">'+ins+'</text>'+
    '<text x="44" y="322" font-family="Arial" font-size="13" fill="#8C8CA3">UTR</text><text x="44" y="342" font-family="Arial" font-size="15" fill="#171630">'+proofUtr(l)+'</text>'+
    '<text x="44" y="382" font-family="Arial" font-size="13" fill="#8C8CA3">Date</text><text x="44" y="402" font-family="Arial" font-size="15" fill="#171630">'+fmtD(S.now)+'</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function proofReadNow(){
  if(S.flow!=='proof') return; var l=FL(), due=l.amt||premOf(l);
  if(S.sel.simFail){ S.sel.read='fail'; S.sel.amt=''; S.sel.utr=''; } else { S.sel.read='done'; S.sel.amt=String(due); S.sel.utr=proofUtr(l); }
  paintModal();
}
function proofTake(name,url){ S.sel.img=url; S.sel.fname=name; S.sel.ferr=''; S.sel.read='reading'; S.sel.amt=''; S.sel.utr=''; paintModal(); setTimeout(proofReadNow,900); }
function proofMatch(){ var l=FL(), s=S.sel, due=l.amt||premOf(l), amtOk=String(s.amt||'').replace(/\D/g,'')===String(due);
  if(!s.img||s.read==='reading'||!s.amt) return '';
  return amtOk?note('green','','<b>Matches the '+INR(due)+' requested.</b>'):note('red','Amount does not match','The request was for '+INR(due)+'. Part payments are not supported — raise a fresh request for the amount actually paid.','alert'); }
FLOWS.proof={t:'Confirm payment', sub:'Upload the payment screenshot the client sent. The amount and UTR are read from it.',
  onInput:function(k){ if(k!=='amt') return; var el=document.getElementById('proofmatch'); if(el) el.innerHTML=proofMatch(); },
  body:function(){ var l=FL(), s=S.sel, due=l.amt||premOf(l), amtOk=String(s.amt||'').replace(/\D/g,'')===String(due), h='';
    if(!s.img){
      h+='<label class="pdrop" for="f_proofimg"><input type="file" id="f_proofimg" accept="image/png,image/jpeg,image/webp" data-proofimg="1" hidden>'+ic('upload','ic20')+'<b>Upload the payment screenshot</b><span>An image — PNG or JPG — of the payment confirmation</span></label>'+
        (s.ferr?'<div class="err">'+esc(s.ferr)+'</div>':'')+
        simblock('Prototype','',
          '<button type="button" class="simbtn" data-proofsample="1">Use a sample screenshot</button><button type="button" class="simbtn" data-prooffail="1">'+(s.simFail?'✓ The amount can’t be read':'Make the amount unreadable')+'</button>');
    } else {
      h+='<div class="pshot"><img src="'+s.img+'" alt="Payment screenshot"><div class="pshot-m"><b>'+esc(s.fname)+'</b>'+
        '<span class="'+(s.read==='fail'?'amber':(s.read==='done'?'green':''))+'">'+(s.read==='reading'?'Reading the amount…':(s.read==='done'?'Amount and UTR read from the screenshot':'Couldn’t read the amount — type it from the screenshot'))+'</span>'+
        '<button type="button" class="quiet" data-proofclear="1">Replace screenshot</button></div></div>';
      if(s.read==='done') h+='<div class="kvgrid two">'+kv('Amount paid','<b style="font-size:var(--fs-xl)">'+INR(+s.amt)+'</b>')+kv('UTR','<span class="mono">'+esc(s.utr||'—')+'</span>')+'</div>';
      if(s.read==='fail') h+='<div class="fgrid">'+field('Amount paid',input('amt',s.amt,'e.g. '+INR(due).replace('₹','')),'Type it exactly as on the screenshot.')+field('UTR — optional',input('utr',s.utr,'e.g. SBIN226305412'))+'</div>';
      h+='<div id="proofmatch" class="proofmatch">'+proofMatch()+'</div>';
    }
    h+=field('Handover note for the RM \u2014 optional',input('pnote',s.pnote,'Anything promised, any sensitivity, the best way to reach the client'),'[stated 24 Sep \u00b7 TBD-22] not mandatory. Where it is written it goes to '+esc(uname(rmFor(acctOf(l))))+' with the account, the quote, the KYC documents and this screenshot.');
    h+=note('neutral','','Confirming moves the account and the line to '+esc(uname(rmFor(acctOf(l))))+' and opens the post-purchase ticket. It cannot be undone.');
    return h; },
  can:function(){ var l=FL(), s=S.sel, due=l.amt||premOf(l); return !!s.img && (s.read==='done'||s.read==='fail') && String(s.amt||'').replace(/\D/g,'')===String(due); }, ok:'Confirm payment',
  run:function(){ var l=FL(), a=acctOf(l), rm=rmFor(a), s=S.sel; var ok=write(function(){ (l.payLines.length?l.payLines:[l.id]).forEach(function(id){ var x=lineById(id); x.pay='paid'; x.soldBy=x.owner; x.paidAt=S.now;
      x.hand={note:(s.pnote||'').trim(),by:S.user,at:S.now,utr:s.utr||'',proof:'Payment screenshot · '+(s.fname||'screenshot'),read:s.read==='done'?'read from the screenshot':'typed by '+uname(S.user)};
      logAdd(x,'Payment confirmed',uname(S.user)+' · '+INR(x.amt||premOf(x))+' '+(s.read==='done'?'read from the screenshot':'typed from the screenshot')+(s.utr?' · UTR '+s.utr:''),'pay');
      logAdd(x,'Ownership transferred to '+uname(rm),'System · account and product line owner both moved · handover packet attached','sys',1);
      x.owner=rm; tasksOfLine(x.id).forEach(function(t){ if(!t.done) t.owner=rm; }); moveStage(x,11,'Payment confirmed'); issCreate(x); });
      if(a) a.own=rm; },'the payment'); if(!ok) return 'fail';
    toast('Paid — handed to '+uname(rm),'Payment Completed. Sold by '+uname(S.user)+'. The post-purchase ticket is open; the RM’s welcome-call clock is running.'); }};
document.addEventListener('change',function(ev){
  var t=ev.target; if(!(t instanceof Element)||t.dataset.proofimg===undefined) return; var f=t.files&&t.files[0]; if(!f) return;
  if(!/^image\//.test(f.type)){ S.sel.ferr='Only a payment screenshot is accepted — an image, PNG or JPG. '+f.name+' is not an image.'; paintModal(); return; }
  var rd=new FileReader(); rd.onload=function(){ proofTake(f.name,rd.result); }; rd.readAsDataURL(f);
});
HANDLERS.push(function(t){
  var x;
  if(t.closest('[data-proofsample]')){ proofTake('payment-screenshot.png',proofSample(FL())); return true; }
  if(t.closest('[data-prooffail]')){ S.sel.simFail=!S.sel.simFail; paintModal(); return true; }
  if(t.closest('[data-proofclear]')){ S.sel.img=''; S.sel.fname=''; S.sel.read=''; S.sel.amt=''; S.sel.utr=''; paintModal(); return true; }
  return false;
});
