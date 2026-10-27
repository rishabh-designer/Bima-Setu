/* ==================================================================== *
 *  3 · DUA purchase — instant link vs Ops ticket (D1–D10, 19 Oct)
 *  The route is the confirmed quote's instant flag. Account KYC (stage 9)
 *  applies to both. One modal generates (stays at 10, shown as Payment
 *  Link Generated) and sends (→ 11). The insurer's payment is detected
 *  automatically (→ 12). Policy back → share → 15, else the ticket.
 * ==================================================================== */
var INSTANT={}; INSTANT[CHOLA]={adapter:'CHOLA_PAYTM',mins:24*60,details:1,policy:1,detect:'callback'}; INSTANT['Go Digit']={adapter:'DIGIT',mins:48*60,details:0,policy:0,detect:'polling'};
var DIGIT_QUOTE={i:'Go Digit',p:329800,st:'quoted',rt:1};
var DIGIT_PRODUCTS={'Fire & Special Perils':1,'Burglary':1};
if(INSURER_MASTER.indexOf('Go Digit')<0) INSURER_MASTER.push('Go Digit');
function dauQuotes(l){ var q=QUOTES.dau.slice(); if(l&&l.product===WC_PRODUCT) q.push(CHOLA_QUOTE); if(l&&DIGIT_PRODUCTS[l.product]) q.push(DIGIT_QUOTE); return q; }
function isChola(l){ return !!l&&l.route==='INSTANT'&&!isRen(l)&&!!INSTANT[l.picked||l.ins]; }
function instCfg(l){ return (l&&INSTANT[l.picked||l.ins])||{mins:0,policy:0,details:0,adapter:'',detect:''}; }
function instTTL(l){ return instCfg(l).mins*60000; }
function validTx(l){ return Math.round(instCfg(l).mins/60)+' hours'; }
function cholaLinkExpired(l){ var ch=l&&l.chola; return !!(ch&&ch.link&&ch.linkAt)&&S.now>ch.linkAt+instTTL(l); }
function cholaLinkLeft(l){ var ch=l.chola||{}; return Math.max(0,Math.round((ch.linkAt+instTTL(l)-S.now)/3600000)); }
function cholaLink(l){ var ins=l.picked||l.ins, host=ins===CHOLA?'pay.cholamsgeneral.com/wc':'pay.godigit.com/p'; return 'https://'+host+'/'+l.id.toLowerCase().replace(/[^a-z0-9]/g,'')+'-'+String(premOf(l)); }
function stLabel(l,s){ return (s.n===10&&isChola(l))?'Link Generated':s.t; }
FLOWS.confirm={t:'Record client confirmation', sub:'They named an insurer and a premium. This is the buying signal.',
  repaintOn:['br'],
  body:function(){ var l=FL(), a=acctOf(l), qs=quotesFor(l).filter(function(q){return q.st==='quoted'&&(!l.rate||!l.qsel||!l.qsel.length||l.qsel.indexOf(q.i)>=0);}), exp=S.now>quoteUntil(l);
    var h=qs.map(function(q){ var inst=q.rt&&!isRen(l); return opt('data-pick="'+esc(q.i)+'"',S.sel.d===q.i,q.i,'SI '+esc((l.req||{}).si||'—')+' · '+(exp?'expired '+fmtD(quoteUntil(l)):'valid until '+fmtD(quoteUntil(l)))+(inst?' · instant purchase — the insurer’s own payment link':' · payment through an Ops ticket'),INR(q.p),false,exp); }).join('');
    if(S.sel.d){ var q=qs.filter(function(x){return x.i===S.sel.d;})[0]||{}, inst=q.rt&&!isRen(l), brs=branchOpts(S.sel.d,a); if(!S.sel.br) S.sel.br=brs[0];
      h+='<div class="kvgrid two mt12">'+kv('Insurer','<b>'+esc(S.sel.d)+'</b>')+kv('Confirmed premium','<b>'+INR(q.p||0)+'</b>')+kv('Route',inst?chip('Instant purchase','violet',false,true):chip('Ops ticket','neutral',false,true))+kv('Next stage',esc(verified(a)?'Purchase Requested':'KYC Details Requested — the account is not KYC verified'))+'</div>'+
        field('Insurer branch',select('br',S.sel.br,brs),'Saved on the opportunity. It travels with the payment request — NEFT and proforma details differ by branch.');
      if(inst){ var cf=INSTANT[S.sel.d]||{}; h+=note('violet','Instant purchase','You generate and send '+esc(shortIns(S.sel.d))+'’s payment link from the opportunity (valid '+Math.round((cf.mins||0)/60)+' hours). Payment is detected automatically. '+(cf.policy?'The policy number and PDF come back from the insurer — no post-purchase ticket.':'If the policy PDF does not come back, the normal post-purchase ticket opens.')+(verified(a)?'':' Account KYC comes first.'),'zap'); }
      if(isRen(l)&&q.rt) h+=note('neutral','','A renewal goes through Ops, whatever the insurer.','info'); }
    return h+(exp?note('amber','These quotes have expired','An expired quote cannot be confirmed.','alert'):note('blue','','Confirmed premium is the revenue number. It is written here and not again.')); },
  can:function(){ return !!S.sel.d&&S.now<=quoteUntil(FL()); }, ok:'Confirm',
  run:function(){ var l=FL(), made=[], q=quotesFor(l).filter(function(x){return x.i===S.sel.d;})[0]||{}; var ok=write(function(){ l.picked=S.sel.d; l.ins=S.sel.d; l.insBranch=S.sel.br||branchOpts(S.sel.d,acctOf(l))[0]; l.route=(q.rt&&!isRen(l))?'INSTANT':'OPS'; if(l.route==='INSTANT') l.chola={conf:S.now};
      logAdd(l,'Client confirmed insurer',uname(S.user)+' · '+S.sel.d+' · '+l.insBranch+' · route '+(l.route==='INSTANT'?'instant purchase':'Ops ticket'),'call'); var _a=acctOf(l), _dest=verified(_a)?10:9; made=moveStage(l,_dest,'Client confirmed '+S.sel.d); },'the confirmation');
    if(!ok) return 'fail'; toast('Client confirmed '+l.picked,stageToast(l,made)); }};
function cholaSalesNext(l){ var ch=l.chola||{}, ins=shortIns(l.picked), cfg=instCfg(l), who=(l.contact||{}).n||'the client';
  if(l.stage===10){
    if(ch.err) return {tone:'red',lab:'Insurer API failed',txt:ins+' returned: '+ch.err,why:'No link was generated. Try again, or raise the payment request to Ops instead — a manual switch, with a reason. Nothing switches on its own.',acts:[['instGen','Try again'],['instSwitch','Raise payment request to Ops instead']]};
    if(cfg.details&&!ch.kyc) return {tone:'amber',lab:'Next action',txt:'Capture the details '+ins+' needs to issue',why:ins+' issues on its own API. A few issuance details first; insurer KYC then runs on the account’s verified PAN and GST.',acts:[['cholaKyc','Capture '+ins+' details'],['instSwitch','Switch to Ops']]};
    if(!ch.link||cholaLinkExpired(l)) return {tone:'amber',lab:'Next action',txt:'Generate & send '+ins+'’s payment link',why:'Insurer KYC (CKYC on the verified PAN and GST) → proposal → link, in one step. Valid '+validTx(l)+'. One link per opportunity.',acts:[['instGen','Generate & send payment link'],['instSwitch','Switch to Ops']]};
    return {tone:'amber',lab:'Payment Link Generated',txt:'The link is ready and not yet sent',why:'Generated '+fmt(ch.linkAt)+' · valid for '+cholaLinkLeft(l)+' more hours. Send it to '+who+'.',acts:[['cholaLink','Send link']]};
  }
  if(l.stage===11){
    if(cholaLinkExpired(l)) return {tone:'red',lab:'Link expired',txt:'The payment link expired unpaid',why:'It was valid '+validTx(l)+'. Regenerate — the old link is closed at '+ins+' where its API allows.',acts:[['instGen','Regenerate the link']]};
    return {tone:'blue',lab:'Waiting on the client',txt:'Payment link sent · expires in '+cholaLinkLeft(l)+'h',why:ins+'’s link is with '+who+'. Payment is detected automatically from the insurer ('+cfg.detect+') — no screenshot, no confirm step.',acts:[['cholaLink','View or resend the link']]};
  }
  return {tone:'neutral',lab:'',txt:'',why:'',acts:[]}; }
function cholaPostNext(l){ var ins=shortIns(l.picked);
  if(l.stage===12) return {tone:'amber',lab:'Next action',txt:'Paid — '+ins+' returned the policy number and PDF. Share the copy with the client',why:'The payment came back from the insurer automatically. The policy copy is here — no post-purchase ticket.',acts:[['cholaShare','Share the policy copy']]};
  if(l.stage===15) return {tone:'green',lab:'Issued',txt:'Policy copy shared · issued in real time by '+ins,why:'No payment ticket and no post-purchase ticket were needed.',acts:[]};
  return {tone:'neutral',lab:'',txt:'',why:'',acts:[]}; }
FLOWS.instGen={t:function(){ return S.sel.gen?'Send the payment link':'Generate & send payment link'; },
  sub:function(){ var l=FL(); return shortIns(l.picked)+' · instant purchase · one link per opportunity'; },
  repaintOn:['ch'],
  body:function(){ var l=FL(), a=acctOf(l), ch=l.chola||{};
    if(!S.sel.gen) return '<div class="kvgrid two">'+kv('Insurer',esc(l.picked))+kv('Amount','<b>'+INR(premOf(l))+'</b>')+kv('Insurer KYC','CKYC on PAN '+esc(idMask(a.pan))+' and GSTIN '+esc(idMask(a.gst))+' — from the verified account')+kv('Link valid',esc(validTx(l))+' · set per insurer')+'</div>'+
      note('blue','','Generating runs the insurer’s KYC, creates the proposal and returns the link. Nothing is sent yet — you see the link first. Until it is sent the opportunity stays at Purchase Requested.','info')+
      simblock('Prototype','The insurer’s API is faked here.','<button type="button" class="simbtn" data-mset="fail" data-mval="'+(S.sel.fail?'':'1')+'">'+(S.sel.fail?'✓ The insurer will reject the KYC':'Make the insurer reject the KYC')+'</button>');
    return '<div class="field"><div class="lbl">Payment link — generated '+esc(fmt(ch.linkAt))+'</div><div class="flex" style="gap:8px;align-items:center"><input class="inp mono" value="'+esc(ch.link)+'" readonly style="flex:1 1 auto;min-width:0"><button type="button" class="btn sm" data-copy="1">Copy link</button></div></div>'+
      '<div class="fgrid">'+field('Send by',select('ch',S.sel.ch||'Email',['Email','WhatsApp']))+field('To',roInp((l.contact.n||'')+' · '+(S.sel.ch==='WhatsApp'?(l.contact.m||''):(l.contact.e||''))))+'</div>'+
      note('neutral','','Sending moves the opportunity to Payment Details Shared. Close without sending and it stays at Purchase Requested with Send link as the next step.','info'); },
  ok:function(){ return S.sel.gen?'Send link':'Generate link'; },
  run:function(){ var l=FL();
    if(!S.sel.gen){ var fail=!!S.sel.fail;
      var ok=write(function(){ l.chola=l.chola||{}; if(fail){ l.chola.err='KYC rejected — the name on the PAN does not match the insurer’s CKYC record'; logAdd(l,'Insurer KYC failed at '+shortIns(l.picked),'System · '+instCfg(l).adapter+' · '+l.chola.err+' · no link generated','sys',1); return; }
        l.chola.err=''; var re=!!l.chola.link; if(re) (l.chola.old=l.chola.old||[]).push(l.chola.link);
        l.chola.link=cholaLink(l)+(l.chola.old?'-'+l.chola.old.length:''); l.chola.linkAt=S.now; l.chola.kyc=l.chola.kyc||S.now; l.chola.sentAt=0;
        logAdd(l,'Payment link generated by '+shortIns(l.picked),'System · '+instCfg(l).adapter+' · insurer KYC passed (CKYC on the verified PAN and GST) · proposal created · valid '+validTx(l)+(re?' · the previous link closed':''),'sys',1); },'the link');
      if(!ok) return 'fail';
      if(fail){ toast('The insurer rejected the KYC','Try again, or raise the payment request to Ops instead.',{red:1}); return; }
      S.sel.gen=1; paint(); return 'stay'; }
    var ch=S.sel.ch||'Email', to=ch==='WhatsApp'?l.contact.m:l.contact.e;
    var ok2=write(function(){ l.chola.sentAt=S.now; l.chola.sentTo=to||'the client'; logAdd(l,'Payment link sent to '+(l.contact.n||'the client'),'System · '+ch+' · '+(to||'')+' · '+l.chola.link,'email',1); if(l.stage<11) moveStage(l,11,'Payment link sent to the client'); },'sending the link');
    if(!ok2) return 'fail'; toast('Payment link sent',ch+' to '+(l.contact.n||'the client')+'. Payment is detected automatically.'); }};
FLOWS.cholaLink={t:function(){ var l=FL(); return l.chola&&l.chola.sentAt?'Payment link':'Send the payment link'; },
  sub:function(){ var l=FL(); return shortIns(l.picked)+'’s link · valid '+validTx(l)+' from generation.'; },
  repaintOn:['ch'],
  body:function(){ var l=FL(), ch=l.chola||{};
    return '<div class="kvgrid two">'+kv('Insurer',esc(l.picked))+kv('Amount','<b>'+INR(premOf(l))+'</b>')+'</div>'+
      '<div class="field"><div class="lbl">Payment link</div><div class="flex" style="gap:8px;align-items:center"><input class="inp mono" value="'+esc(ch.link||'')+'" readonly style="flex:1 1 auto;min-width:0"><button type="button" class="btn sm" data-copy="1">Copy link</button></div></div>'+
      field('Send by',select('ch',S.sel.ch||'Email',['Email','WhatsApp']))+
      (ch.sentAt?note('green','','Sent to '+esc(ch.sentTo||'the client')+' on '+esc(fmt(ch.sentAt))+' · valid for '+cholaLinkLeft(l)+' more hours.','circlecheck'):note('blue','','Valid for '+cholaLinkLeft(l)+' more hours.','info')); },
  can:function(){ var l=FL(); return !!(l.chola&&l.chola.link)&&!cholaLinkExpired(l); },
  ok:function(){ var l=FL(); return l.chola&&l.chola.sentAt?'Resend link':'Send link'; },
  run:function(){ var l=FL(), ch=S.sel.ch||'Email', to=ch==='WhatsApp'?l.contact.m:l.contact.e, re=!!(l.chola&&l.chola.sentAt);
    var ok=write(function(){ l.chola.sentAt=S.now; l.chola.sentTo=to||'the client'; logAdd(l,(re?'Payment link resent':'Payment link sent')+' to '+(l.contact.n||'the client'),'System · '+ch+' · '+l.chola.link,'email',1); if(l.stage<11) moveStage(l,11,'Payment link sent to the client'); },'sending the link');
    if(!ok) return 'fail'; toast(re?'Link resent':'Payment link sent',ch+' to '+(l.contact.n||'the client')); }};
FLOWS.instSwitch={t:'Raise the payment request to Ops instead', sub:'A manual switch, with a reason. The opportunity moves to the Ops ticket route.',
  body:function(){ var l=FL(), ch=l.chola||{};
    return (ch.err?note('red',shortIns(l.picked)+' returned an error',esc(ch.err),'alert'):'')+field('Reason',select('rs',S.sel.rs||'',[['','Choose…'],'Insurer KYC rejected','Insurer API timed out','No link returned','Client prefers NEFT / RTGS','Other']))+
      note('neutral','','The instant link is closed. From here it is a normal payment request — one BimaOps ticket, which can also combine with other opportunities on the account with the same insurer.','info'); },
  can:function(){ return !!S.sel.rs; }, ok:'Switch to Ops',
  run:function(){ var l=FL(); var ok=write(function(){ var was=l.chola; l.route='OPS'; l.chola=null; logAdd(l,'Switched to the Ops route','by '+uname(S.user)+' · '+S.sel.rs+(was&&was.link?' · the instant link was closed':''),'sys'); if(l.stage===11&&l.pay==='pre') moveStage(l,10,'Switched to the Ops route'); },'the switch');
    if(!ok) return 'fail'; toast('Switched to Ops','Raise the payment request — it becomes a BimaOps ticket.'); }};
FLOWS.cholaShare={t:'Share the policy copy', sub:'The insurer issued it on payment. Send it to the client — no QC step and no ticket.', wide:true,
  body:function(){ var l=FL(), p=polOfLine(l);
    return '<div class="flex" style="gap:8px">'+docBtns('Policy copy',{line:l.id})+docBtns('Tax invoice',{line:l.id})+'</div>'+
      '<div class="kvgrid two mt12">'+kv('Insurer',esc(l.picked||l.ins))+kv('Policy number','<span class="mono">'+esc(p?p.pno:'—')+'</span>')+kv('Premium','<b>'+INR(premOf(l))+'</b>')+kv('Sum insured',esc((l.req||{}).si||'—'))+'</div>'+
      note('blue','',esc(shortIns(l.picked))+' returned the policy number and PDF when the client paid. Sharing sends them to '+esc((l.contact||{}).n||'the client')+' on the three rails and closes the line.','info'); },
  ok:'Share policy copy',
  run:function(){ var l=FL(); var ok=write(function(){ l.chola=l.chola||{}; l.chola.shared=S.now; logAdd(l,'Policy copy and tax invoice shared with the client','System · issued in real time by '+shortIns(l.picked)+' · three rails · no post-purchase ticket','post',1); moveStage(l,15,'Policy copy shared with the client'); },'the share');
    if(!ok) return 'fail'; toast('Shared','Policy copy and tax invoice sent to the client.'); }};
function soldBlock(l){ var payTx;
  if(isChola(l)){ var ins=shortIns(l.picked); payTx=(l.chola&&l.chola.paid)?'Paid on '+ins+'’s link':(l.stage>=11?'Payment link sent':((l.chola&&l.chola.link)?'Link generated':'Link not generated yet')); }
  else { payTx=l.pay==='pre'?'Not requested':(l.pay==='ticket'?'With Ops · '+PAY_DESK[Math.min(2,l.payDesk||0)]:(l.pay==='back'?'Payment details sent':(l.pay==='cheque'?'Cheque — to collect':(l.pay==='shared'?'Shared with client':'Paid')))); }
  return '<div class="phhd"><div class="t">Sold</div></div><div class="kvgrid mt12">'+kv('Insurer',esc(l.picked||l.ins||'—'))+kv('Confirmed premium','<b>'+INR(premOf(l))+'</b>')+kv('Payment',esc(payTx))+kv('Route',l.route==='INSTANT'?'Instant purchase':'Ops ticket')+kv('Insurer branch',esc(l.insBranch||'—'))+'</div>'; }
