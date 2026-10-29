/* ==================================================================== *
 *  [stated 29 Oct] Payment details go to the client automatically.
 *  When Ops closes the payment ticket at "Payment details sent", BimaSetu
 *  emails the details to the client contact on the request — email only,
 *  no RM or Sales name in the body, no checks — and moves the opportunity
 *  to Payment Details Shared with Client. While it is at that stage the
 *  user can resend: each resend is a new email with the same details.
 * ==================================================================== */
function payMail(l){ var who=(l.contact&&l.contact.n)||'there', amt=INR(l.amt||premOf(l)), mode=payModeOf(l), ins=payInsurer(l), a=acctOf(l);
  var how=mode==='Payment link'?'Pay securely using the payment link below. The link is from '+ins+'.':(mode==='NEFT / RTGS'||/NEFT/.test(mode)?'Pay by NEFT / RTGS to the account details below.':'The '+mode.toLowerCase()+' details are below.');
  return {to:(l.contact&&l.contact.e)||'', subject:'Payment details · '+l.product+' policy with '+ins,
    body:'Dear '+who+',\n\nPlease find the payment details for '+(a?shortName(a.n)+'’s ':'your ')+l.product+' policy with '+ins+'.\n\nAmount: '+amt+'\nPayment mode: '+mode+'\n\n'+how+'\n\nOnce the payment is done, please reply to this email with the payment confirmation.\n\nRegards,\nTeam BimaKavach'}; }
function payEmailOut(x,resend){ var m=payMail(x); x.payMails=(x.payMails||[]).concat([{at:S.now,to:m.to,resend:resend?1:0,by:resend?S.user:'system'}]);
  logAdd(x,resend?'Payment details re-sent to the client':'Payment details shared with client',(resend?uname(S.user)+' · resend':'System · sent automatically when Ops closed '+payRef(x))+' · email to '+(m.to||'the contact on the request')+' · '+payModeOf(x),'pay',resend?0:1); }
function payAutoSend(l){ var made=[], ids=(l.payLines&&l.payLines.length?l.payLines:[l.id]);
  ids.forEach(function(id){ var x=lineById(id); if(!x||x.pay!=='back') return; x.pay='shared'; payEmailOut(x,false); if(x.stage<11) made=made.concat(moveStage(x,11,'Payment details emailed to the client')); });
  return made; }
FLOWS.payResend={t:'Resend payment details', sub:function(){ var l=FL(); return 'A new email with the same payment details goes to '+((l.contact&&l.contact.n)||'the client')+'.'; }, wide:true,
  body:function(){ var l=FL(), m=payMail(l), sent=(l.payMails||[]);
    return '<div class="mailprev"><div class="mh"><span class="meta">To</span> '+esc(m.to||'—')+'</div><div class="mh"><span class="meta">Subject</span> '+esc(m.subject)+'</div><pre>'+esc(m.body)+'</pre>'+(payModeOf(l)==='Payment link'?'<div class="meta">The insurer’s payment link is included.</div>':'<div class="meta">The details Ops returned are included.</div>')+'</div>'+
      (sent.length?'<div class="meta mt12">Sent so far: '+sent.map(function(s){ return esc(fmt(s.at))+(s.resend?' (resend)':' (automatic)'); }).join(' · ')+'</div>':''); },
  can:function(){ var l=FL(); return !!l&&l.stage===11&&!dead(l); }, ok:'Resend email',
  run:function(){ var l=FL(); if(!l||l.stage!==11) return 'fail'; var ok=write(function(){ payEmailOut(l,true); },'the resend'); if(!ok) return 'fail'; toast('Payment details re-sent',(l.contact&&l.contact.e)||'the client'); }};
