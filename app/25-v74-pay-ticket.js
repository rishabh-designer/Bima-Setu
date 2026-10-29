/* ==================================================================== *
 *  1 · BimaOps — the payment ticket
 *  [stated 23 Oct · BR-280/FR-7.25] four reachable stages plus Withdrawn:
 *  Under routing → Link generation → Awaiting payment details → Payment
 *  details sent. [BR-281] Escalated is the only tag BimaOps sends.
 *  [VAL-7.08] Share with client waits for Payment details sent.
 *  [BR-275] stage-wise while open; the final duration on a closed ticket.
 * ==================================================================== */
var PAY_DESK=['Under routing','Link generation','Awaiting payment details','Payment details sent'];
function payTkSt(l){ if(l.pay==='cheque') return 'Closed · Payment mode cheque'; if(dead(l)&&l.pay==='ticket') return 'Withdrawn'; if(l.pay==='back') return 'Payment details sent'; if(l.pay==='paid'||l.stage>=SALES_STAGES) return 'Paid'; if(l.pay==='shared') return 'Shared'; return 'With Ops'; }
function payTkTone(l){ var s=payTkSt(l); return s==='Payment details sent'?'amber':((s==='Paid'||/^Closed/.test(s))?'green':(s==='Withdrawn'?'neutral':'violet')); }
function deskStage(t){ var l=t.line; if(t.ty!=='Payment') return deskStage0(t);
  if(l.pay==='cheque') return {st:'Payment mode cheque',tags:[]};
  if(dead(l)&&l.pay==='ticket') return {st:'Withdrawn',tags:[]};
  if(l.pay==='ticket'){ var i=Math.min(2,l.payDesk||0); return {st:PAY_DESK[i],tags:opsClock(l).over?['Escalated']:[]}; }
  return {st:'Payment details sent',tags:[]}; }
function payTurnKv(l,c){
  if(l.pay==='cheque') return kv('Duration','<span class="meta">Closed when raised — a cheque is a notification, nothing comes back</span>');
  if(c.running){ var at=l.payDeskAt||payRaisedAt(l);
    return kv('At this stage','<b>'+esc(whTx(workMins(at,S.now)))+'</b><div class="meta">'+esc(PAY_DESK[Math.min(2,l.payDesk||0)])+' · since '+esc(fmt(at))+'</div>')+
      kv('60-minute clock','<span class="'+(c.over?'red':'')+'">'+esc(whTx(c.m))+' of 60 working minutes</span><div class="meta">One clock, never paused. Past it, BimaOps tags the ticket Escalated.</div>'); }
  return kv('Took to share the details','<b class="'+(c.over?'red':'')+'">'+esc(whTx(c.m))+'</b><div class="meta">Final duration · raised → Payment details sent'+(c.over?' · past the 60-minute clock':'')+'</div>'); }
function paySimBtns(l){ var b=[], d=l.payDesk||0;
  if(d<1) b.push(simbtn('Ops picks it up — Link generation','data-v74sim="payRoute" data-line="'+l.id+'"'));
  else if(d<2&&payModeOf(l)==='Payment link') b.push(simbtn('Ops asks the insurer for the link — Awaiting payment details','data-v74sim="payAwait" data-line="'+l.id+'"'));
  b.push(simbtn('Ops sends the details and closes the ticket','data-sim="extOps" data-line="'+l.id+'"'));
  return b; }

/* [stated 23 Oct · new behaviour 1] the same insurer is the seventh condition on the multi-payment gate */
function payIns(l){ return l.picked||l.ins||''; }
function payElig(l,u){ u=u||me(); return !!u&&!!l&&l.owner===u.id&&l.stage===10&&l.status==='open'&&l.pay==='pre'&&!acctOf(l).prov&&!isChola(l); }
function payAcctGroups(lines,u){ u=u||me(); var m={}; (lines||[]).forEach(function(l){ if(payElig(l,u)){ var k=l.acct+'|'+(isRen(l)?'r':'f')+'|'+payIns(l); (m[k]=m[k]||[]).push(l); } }); return m; }
function payAnchor(){ var ids=paySel(); if(!ids.length) return null; var l=lineById(ids[0]); return l?{acct:l.acct,ren:isRen(l),ins:payIns(l)}:null; }
function payCompatible(l){ var a=payAnchor(); return !a||(l.acct===a.acct&&isRen(l)===a.ren&&payIns(l)===a.ins); }
function payRows(l){ var gp=payGroup(l).filter(function(x){ return (x.stage===10||(x.stage===11&&x.pay==='pre'))&&x.status==='open'&&!isChola(x); });
  return gp.map(function(x){ var why=x.pay!=='pre'?'already on '+payRef(x):(x.owner!==S.user?uname(x.owner)+'’s line — requested separately':(payIns(x)!==payIns(l)?'different insurer ('+payIns(x)+') — a separate request':''));
    return {l:x,why:why,warn:daysInStage(x)>=QUOTE_VALID?'The confirmed quote may have expired — check it with the insurer first':''}; }); }
function branchOpts(ins,a){ var c=(a&&a.city)||'Mumbai'; return [c+' branch',((a&&a.st)||'Maharashtra')+' regional office','Mumbai corporate office']; }
function branchOf(l){ return l.insBranch||(((acctOf(l)||{}).city||'Head office')+' branch'); }

/* [stated 23 Oct · new behaviour 2–4] seven fields; the insurer branch travels; cheque is a notification */
FLOWS.pay={t:'Raise payment request', sub:'One request covers your opportunities on this account at Purchase Requested with the same insurer — the client pays one amount.',
  repaintOn:['mode'],
  body:function(){ var l=FL(), a=acctOf(l), rows=payRows(l), mine=rows.filter(function(r){return !r.why;}), c=l.contact||{};
    if(!S.sel.l) S.sel.l=S.sel.comb?mine.map(function(r){return r.l.id;}):[l.id];
    var sel=mine.filter(function(r){return S.sel.l.indexOf(r.l.id)>=0;}), tot=sel.reduce(function(s,r){return s+premOf(r.l);},0), h='';
    if(S.sel.amt===undefined||S.sel._tot!==tot){ S.sel.amt=String(tot); S.sel._tot=tot; }
    h+=a.prov?note('red','The account is not KYC verified','PAN and GST are needed before a payment request. <button class="btn sm" data-flow="kyc" data-line="'+l.id+'">Get verified</button>','lock'):'';
    if(!S.sel.comb){ var r0=rows.filter(function(r){return r.l.id===l.id;})[0]||{l:l};
      h+='<div class="kvgrid two">'+kv('Opportunity',esc(l.product)+' · '+esc(payIns(l)||'—'))+kv('Selection totals','<b style="font-size:var(--fs-xl)">'+INR(premOf(l))+'</b>')+'</div>'+(r0.warn?note('amber','',esc(r0.warn),'alert'):'')+
        (mine.length>1?'<button type="button" class="btn sm mt8" data-pcomb="1">'+ic('plus')+'Combine with other opportunities</button>':'');
    } else {
      h+=rows.map(function(r){ return opt('data-tog="l" data-tv="'+r.l.id+'"',!r.why&&S.sel.l.indexOf(r.l.id)>=0,r.l.product,(r.why?esc(r.why):esc(payIns(r.l)||'—')+' · '+r.l.id)+(r.warn&&!r.why?' · <span class="amber">'+esc(r.warn)+'</span>':''),INR(premOf(r.l)),true,!!r.why); }).join('')+
        '<div class="flex" style="justify-content:space-between;border-top:1px solid var(--border);padding-top:10px"><span class="meta">'+plural(sel.length,'opportunity').replace('opportunitys','opportunities')+' selected · same insurer</span><b style="font-size:var(--fs-xl)">'+INR(tot)+'</b></div>';
    }
    var typed=+String(S.sel.amt||'').replace(/\D/g,'');
    h+='<div class="lbl">Seven fields go to BimaOps</div>'+
      '<div class="fgrid">'+field('Business name',roInp(a.n),'As on the PAN')+field('Client email',roInp(c.e||'—'),'From the POC on this opportunity')+'</div>'+
      '<div class="fgrid">'+field('Client phone',roInp(c.m||'—'),'From the POC on this opportunity')+field('Payment mode',select('mode',S.sel.mode||'',[['','Choose how the customer will pay']].concat(PAYMODE)))+'</div>'+
      '<div class="fgrid">'+field('PAN card',roInp('PAN_'+shortName(a.n).replace(/\s+/g,'')+'.pdf'),'From KYC')+field('GST certificate',roInp('GST_'+(a.gst||'')+'.pdf'),'From KYC')+'</div>'+
      '<div class="fgrid">'+field('Amount',input('amt',S.sel.amt,''),'Typed. Pre-filled with the selection total.')+field('Insurer branch — travels with the request',roInp(branchOf(l)),'From the opportunity. NEFT and proforma details differ by branch.')+'</div>'+
      (typed&&typed!==tot?note('amber','Amount differs from the selection','The selection totals '+INR(tot)+'; you typed '+INR(typed)+'. Both go on the request.','alert'):'')+
      (S.sel.mode==='Cheque'?note('amber','Cheque is a notification, not a route','The ticket is raised and closes at once at Payment mode cheque. Nothing is obtained and nothing comes back — you collect the physical cheque and record it here.','info'):'');
    return h; },
  can:function(){ var l=FL(), a=acctOf(l); return !a.prov&&!!S.sel.mode&&!!(S.sel.l&&S.sel.l.length)&&/\d/.test(S.sel.amt||''); },
  ok:function(){ return S.sel.mode==='Cheque'?'Notify Ops — cheque':'Raise request to Ops'; },
  run:function(){ var l=FL(), cheque=S.sel.mode==='Cheque', ref='PAY-'+l.id.slice(3)+((l.payOld||[]).length?'-'+((l.payOld||[]).length+1):''), typed=+String(S.sel.amt).replace(/\D/g,'');
    var ok=write(function(){ var ids=S.sel.l.slice(), amt=ids.reduce(function(s,i){return s+premOf(lineById(i));},0);
      ids.forEach(function(id){ var x=lineById(id); x.pay=cheque?'cheque':'ticket'; x.payRef=ref; x.payMode=S.sel.mode; x.payLines=ids; x.amt=typed||amt; x.payAt=S.now; x.payDesk=0; x.payDeskAt=S.now; x.payBranch=branchOf(x);
        logAdd(x,'Payment ticket '+ref+' raised','System · BimaOps · covers '+plural(ids.length,'opportunity').replace('opportunitys','opportunities')+' · '+INR(x.amt)+(x.amt!==amt?' typed (selection '+INR(amt)+')':'')+' · '+S.sel.mode+' · '+payIns(x)+', '+x.payBranch+' · client '+((x.contact||{}).e||'—')+' / '+((x.contact||{}).m||'—'),'sys',1);
        if(cheque) logAdd(x,ref+' closed at Payment mode cheque','System · BimaOps · a notification only — nothing comes back; the RM collects the cheque','sys',1); });
      var o=oppOf(l); if(o) oppLog(o,'Payment request raised · '+ref,uname(S.user)+' · '+INR(typed||amt)); if(isRen(l)) S.ui['rsel_'+l.acct]=[]; },'the payment request');
    if(!ok) return 'fail';
    toast(cheque?ref+' — Ops notified (cheque)':ref+' raised with Ops',cheque?'The ticket closed at Payment mode cheque. Collect the cheque, then record it on the opportunity.':'Desk stage Under routing. Ops aims to send the details within 60 working minutes.'); }};

/* the handover at payment, shared by every way a payment completes */
function payComplete(ids,info){ var l0=lineById(ids[0]), a=acctOf(l0), rm=rmFor(a,l0.product);
  ids.forEach(function(id){ var x=lineById(id); if(!x) return; var due=x.amt||premOf(x); x.pay='paid'; x.soldBy=x.owner; x.paidAt=S.now; x.hand=info.hand;
    var diff=info.paid!==undefined&&info.paid!==due; if(diff) x.payDiff={due:due,paid:info.paid};
    logAdd(x,'Payment confirmed',info.log+(diff?' · paid against '+INR(due)+' requested · flagged':''),'pay');
    logAdd(x,'Sold by '+uname(x.owner),'System · '+(x.picked||'')+' · '+INR(premOf(x)),'sys',1);
    x.notSel=quotesFor(x).filter(function(q){return q.st==='quoted'&&q.i!==x.picked;}).map(function(q){return q.i;});
    logAdd(x,'Owner changed from '+uname(x.owner)+' to '+uname(rm)+' — Transfer at payment','by the system · Sold by '+uname(x.owner)+' · account owner moved too','sys',1);
    x.owner=rm; tasksOfLine(x.id).forEach(function(t){ if(!t.done) t.owner=rm; }); moveStage(x,12,'Payment confirmed'); issCreate(x); });
  if(a) a.own=rm; return rm; }
FLOWS.chequeIn={t:'Record the cheque collected', sub:'You have the physical cheque. Recording it completes the payment and hands the account to the RM.',
  body:function(){ var l=FL(), due=l.amt||premOf(l); if(S.sel.camt===undefined) S.sel.camt=String(due);
    return '<div class="kvgrid two">'+kv('Payable to',esc(payIns(l)))+kv('Amount due','<b>'+INR(due)+'</b>')+'</div>'+
      '<div class="fgrid">'+field('Cheque number',input('cno',S.sel.cno,'000123'))+field('Drawn on (bank)',input('cbank',S.sel.cbank,'HDFC Bank, Pune'))+'</div>'+
      '<div class="fgrid">'+field('Cheque date','<input class="inp" id="f_cdt" data-f="cdt" type="date" value="'+esc(S.sel.cdt||ymd(S.now))+'">')+field('Amount on the cheque',input('camt',S.sel.camt,''))+'</div>'+
      note('neutral','','Confirming moves the account and the opportunity to '+esc(uname(rmFor(acctOf(l),l.product)))+' and opens the post-purchase ticket. Payment Details Shared is skipped — no details were ever sent.','info'); },
  can:function(){ return !!(S.sel.cno||'').trim()&&!!(S.sel.cbank||'').trim()&&/\d/.test(S.sel.camt||''); }, ok:'Confirm payment',
  run:function(){ var l=FL(), s=S.sel, ids=(l.payLines&&l.payLines.length?l.payLines:[l.id]), paid=+String(s.camt).replace(/\D/g,''), rm;
    var ok=write(function(){ rm=payComplete(ids,{hand:{note:'',by:S.user,at:S.now,utr:'Cheque '+s.cno.trim(),proof:'Cheque · '+s.cbank.trim()+' · '+(s.cdt||ymd(S.now)),read:'recorded by '+uname(S.user)},paid:paid,log:uname(S.user)+' · cheque '+s.cno.trim()+' · '+s.cbank.trim()+' · '+INR(paid)}); },'the payment');
    if(!ok) return 'fail'; toast('Paid by cheque — handed to '+uname(rm),'Payment Completed. The post-purchase ticket is open.'); }};
function tkHead(t){ var l=t.line;
  if(t.ty==='Payment'&&l.pay==='cheque'&&!dead(l)) return {tone:'amber',k:'Needs you',hl:'Payment mode cheque — collect the cheque from '+(l.contact.n||'the client'),w:'Ops was notified and the ticket closed at once. Nothing comes back from Ops on a cheque.',acts:[['chequeIn','Record the cheque collected']]};
  return tkHead0(t); }
function ticketSteps(t){ var l=t.line;
  if(t.ty==='Payment'&&(l.pay==='cheque'||(l.pay==='paid'&&l.payMode==='Cheque'))){ var paid=l.stage>=SALES_STAGES;
    return [{t:'Raised',m:'by '+uname(l.soldBy||l.owner),at:payRaisedAt(l),st:'done'},{t:'Closed · Payment mode cheque',m:'a notification to Ops',at:payRaisedAt(l),st:'done'},{t:'Cheque collected',m:paid?'':'With the RM',at:paid?(l.paidAt||0):0,st:paid?'done':'now'}]; }
  return ticketSteps0(t); }
function tkPayDetails(l){
  var sent=card('What went to BimaOps','<div class="kvgrid">'+kv('Business name',esc(acctName(l)))+kv('Client email',esc((l.contact||{}).e||'—'))+kv('Client phone',esc((l.contact||{}).m||'—'))+kv('PAN · GST','<span class="mono">'+esc(idMask((acctOf(l)||{}).pan))+' · '+esc(idMask((acctOf(l)||{}).gst))+'</span>')+kv('Payment mode',esc(payModeOf(l)))+kv('Amount',INR(tkAmt(l)))+kv('Insurer branch',esc(l.payBranch||branchOf(l)))+'</div>');
  if(l.pay==='cheque') return sent+card('Ops','<div class="tk-empty">'+ic('info','ic20')+'<div><b>A notification only.</b><span>The ticket closed at Payment mode cheque the moment it was raised. You collect the cheque and record it on the opportunity.</span></div></div>');
  return sent+tkPayDetails0(l); }
