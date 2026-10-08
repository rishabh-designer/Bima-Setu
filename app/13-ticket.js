/* ==================================================================== *
 *  Ticket screen — placement (PLC) and payment (PAY) tickets, derived from
 *  the line. Order on the page: where the ticket is and what to do (hero +
 *  track), what the ticket is about (details), then what happened (activity).
 * ==================================================================== */
var PLC_QUERY='New India want the maximum foreseeable loss working for the godown block before they will quote. Can you get it from the client?';
var PLC_DESK='Meera Iyer';

function tkLog(l,re,last){ var e=l.log.filter(function(x){return re.test(x.t);}).sort(function(a,b){return a.at-b.at;}); return e.length?(last?e[e.length-1]:e[0]):null; }
function tkAt(l,re,last){ var e=tkLog(l,re,last); return e?e.at:0; }
function plcRaisedAt(l){ return (l.rfq&&l.rfq.floatedAt)||tkAt(l,/floated to placement|Stage entered: Quote Requested/i)||l.enteredAt; }
function payRaisedAt(l){ return tkAt(l,/^Payment ticket PAY-/)||tkAt(l,/Stage entered: Purchase Requested/)||l.enteredAt; }
function tkRupee(v){ v=String(v||'').trim(); if(!v) return '—'; return v.indexOf('₹')===0?v:'₹'+v; }
function tkAmt(l){ return l.amt||premOf(l); }

/* [stated 26 Sep · 9.4 · 8.1] the desk's own stage, shown verbatim and read-only; BimaSetu never sets it */
var OPS_OWNER='Farhan Qureshi';
function deskStage(t){ var l=t.line;
  if(t.ty==='Placement'){ if(l.stage>=9||dead(l)) return {st:'Closed',tags:[]}; if(l.stage===6&&!l.qAns&&l.round===1) return {st:'On hold — query to sales',tags:['awaiting sales']}; if(l.stage===6) return {st:l.round>1?'Revision in progress':'Approaching insurers',tags:['awaiting insurers']}; return {st:'QCR delivered',tags:[]}; }
  if(l.stage>=SALES_STAGES) return {st:'Closed',tags:['payment confirmed']};
  if(l.payQ&&!l.payQ.ans) return {st:'On hold — query to sales',tags:['awaiting sales']};
  if(l.pay==='ticket') return {st:payModeOf(l)==='Payment link'?'Link requested from insurer':'Preparing details',tags:[payModeOf(l)==='Payment link'?'awaiting '+payInsurer(l):'in progress']};
  if(l.pay==='back') return {st:'Details attached',tags:[payModeOf(l)==='Payment link'?'link generated':'details ready']};
  return {st:'Awaiting payment',tags:['with client']}; }
function opsClock(l){ var start=payRaisedAt(l), end=l.pay==='ticket'?S.now:(tkAt(l,/Payment details returned by Ops/,1)||S.now), m=workMins(start,end); return {m:m,over:m>60,running:l.pay==='ticket'}; }
/* the steps, oldest first; st: done | now | '' (still to come) */
function ticketSteps(t){
  var l=t.line, s=[];
  if(t.ty==='Placement'){
    s.push({t:'Raised',m:'by '+uname(l.owner),at:plcRaisedAt(l),st:'done'});
    if((l.plcQ&&l.round===1)||l.qAns){ var q=(l.stage===6&&l.plcQ&&!l.qAns&&l.round===1); s.push({t:q?'Query from placement':'Query answered',m:q&&!dead(l)?'Waiting on you':'',at:q?0:tkAt(l,/Replied to placement query/,1),st:q?(dead(l)?'':'now'):'done'}); }
    var backs=l.log.filter(function(e){return /Quotes returned by placement/.test(e.t);}).sort(function(a,b){return a.at-b.at;});
    for(var r=1;r<=l.round;r++){
      var issued=l.stage>=7||r<l.round, working=!issued&&l.stage===6&&(l.qAns||r>1)&&!dead(l);
      s.push({t:'QCR v'+r+' received',m:working?'Placement is on it':'',at:issued&&backs[r-1]?backs[r-1].at:0,st:issued?'done':(working?'now':'')});
      if(r<l.round) s.push({t:'Sent back',m:'for v'+(r+1),at:tkAt(l,new RegExp('v'+(r+1)+' requested')),st:'done'});
    }
    s.push({t:'Sent to the client',m:l.stage===7?'Your review':'',at:l.stage>=8?tkAt(l,/QCR v\d+ (sent to|shared with) client/,1):0,st:l.stage>=8?'done':(l.stage===7&&!dead(l)?'now':'')});
    s.push({t:'Closed',m:l.stage>=9?(l.picked||''):(l.stage===8?'When the client confirms':''),at:l.stage>=9?tkAt(l,/Client confirmed insurer/,1):0,st:l.stage>=9?'done':(l.stage===8&&!dead(l)?'now':'')});
  } else {
    var paid=l.pay==='paid'||l.stage>=SALES_STAGES;
    s.push({t:'Raised',m:'by '+uname(l.soldBy||l.owner),at:payRaisedAt(l),st:'done'});
    s.push({t:'Ops prepares the details',m:l.pay==='ticket'?'With Ops':'',at:l.pay==='ticket'?0:tkAt(l,/Payment details returned by Ops/,1),st:l.pay==='ticket'?'now':'done'});
    s.push({t:'Sent to the client',m:l.pay==='back'?'Waiting on you':'',at:(l.pay==='shared'||paid)?tkAt(l,/Payment details shared/,1):0,st:l.pay==='back'?'now':((l.pay==='shared'||paid)?'done':'')});
    s.push({t:'Paid',m:l.pay==='shared'?'Waiting for the screenshot':'',at:paid?(l.paidAt||0):0,st:paid?'done':(l.pay==='shared'?'now':'')});
  }
  return s;
}

/* what the ticket is waiting for, in one sentence, with the action that moves it */
function tkHead(t){
  var l=t.line, who=l.contact.n||'the client';
  if(t.ty==='Placement'){
    if(l.stage>=9) return {tone:'green',k:'Closed',hl:'Client confirmed '+(l.picked||'an insurer'),w:'The ticket closed when the client confirmed a quote.',acts:[]};
    if(dead(l)) return {tone:'neutral',k:'Closed',hl:'Closed with the line — '+statusTx(l).toLowerCase(),w:l.reason||'',acts:[]};
    if(l.stage===8) return {tone:'blue',k:'Waiting on the client',hl:'QCR v'+l.round+' is with '+who,w:'The ticket closes when the client confirms a quote.',acts:[]};
    if(l.stage===7) return {tone:'amber',k:'Needs you',hl:'QCR v'+l.round+' is back from placement. Review it',w:'Send it to '+who+' as it is, or send it back for revision.',acts:[['qcr','Review the QCR']]};
    if(l.stage===6&&l.plcQ&&!l.qAns&&l.round===1) return {tone:'amber',k:'Needs you',hl:'Placement has a query for you',w:'Nothing moves until you answer it.',acts:[['answerQ','Answer the query']]};
    return {tone:'violet',k:'Waiting on placement',hl:l.round>1?'Placement is reworking the QCR — v'+l.round:'Placement is building QCR v1',w:'They approach the insurers and compare the quotes. The QCR comes back on this ticket.',acts:[]};
  }
  var m=payModeOf(l);
  if(l.pay==='paid'||l.stage>=SALES_STAGES) return {tone:'green',k:'Closed',hl:'Paid — '+INR(tkAmt(l))+' confirmed',w:'Handed over to '+uname(l.owner)+' with the payment screenshot.',acts:[]};
  if(dead(l)) return {tone:'neutral',k:'Closed',hl:'Closed with the line — '+statusTx(l).toLowerCase(),w:'',acts:[]};
  if(l.payQ&&!l.payQ.ans) return {tone:'amber',k:'Needs you',hl:'Ops has a query for you',w:'“'+l.payQ.q+'” The line’s stage is unchanged while it waits.',acts:[['payAnswer','Answer the query']]};
  if(l.pay==='ticket') return {tone:'violet',k:'Waiting on Ops',hl:'Ops is preparing the '+m+' details',w:'They come back on this ticket. You check them, then send them to '+who+'.',acts:[]};
  if(l.pay==='back') return {tone:'amber',k:'Needs you',hl:'The '+m+' details are in. Check them and send them to '+who,w:'',acts:[['share','Share with client']]};
  return {tone:'blue',k:'Waiting on the client',hl:'Details sent to '+who+'. Waiting for the payment screenshot',w:'When it arrives, upload it to confirm the payment. If the link expires unpaid, raise a new request — a ticket is never reopened.',acts:[['proof','Confirm payment']]};
}
function tkBtn(a,l,primary){
  var cls='btn'+(primary?' primary':'');
  if(a[0]==='qcr') return '<button class="'+cls+'" data-qcrview="'+l.round+'" data-line="'+l.id+'">'+esc(a[1])+'</button>';
  return '<button class="'+cls+'" data-flow="'+a[0]+'" data-line="'+l.id+'">'+esc(a[1])+'</button>';
}

function tkTrack(steps){
  return '<ol class="tktrack" style="grid-template-columns:repeat('+steps.length+',minmax(0,1fr))">'+steps.map(function(s){
    return '<li class="step'+(s.st?' '+s.st:'')+'"><div class="b"></div><div class="t">'+esc(s.t)+'</div><div class="tk-m">'+esc(s.st==='now'?(s.m||'Now'):(s.at?fmtD(s.at):(s.m||'')))+'</div></li>'; }).join('')+'</ol>';
}

/* the trail: what the log holds for this ticket, plus its raising when the log predates it */
function tkTrail(t){
  var l=t.line, re=t.ty==='Placement'?/floated to placement|placement|QCR|Quotes returned|Client confirmed insurer|revision/i:/^Payment|payment details|Payment screenshot|Transfer at payment/i;
  var ev=l.log.filter(function(e){ return re.test(e.t)&&!/^Stage entered/.test(e.t); }).map(function(e){ return {t:e.t,m:e.m,at:e.at,sys:e.sys}; });
  var raisedLogged=ev.some(function(e){ return t.ty==='Placement'?/floated to placement/i.test(e.t):/^Payment ticket PAY-/.test(e.t); });
  if(!raisedLogged) ev.push({t:'Ticket '+t.id+' raised',m:uname(t.ty==='Payment'?(l.soldBy||l.owner):l.owner)+(t.ty==='Placement'?' · RFQ floated to '+t.desk:' · '+INR(tkAmt(l))+' · '+payModeOf(l)),at:t.ty==='Placement'?plcRaisedAt(l):payRaisedAt(l),sys:1});
  ev.forEach(function(e){ e.k=/confirmed|Paid|closed|Client confirmed/i.test(e.t)?'Done':(e.sys?'Them':'Us'); });
  ev.sort(function(a,b){ return a.at-b.at; });
  var h=tkHead(t); if(h.tone!=='green'&&h.tone!=='neutral') ev.push({t:h.hl,m:h.k,at:S.now,k:'Open',open:1});
  return ev;
}

function tkSims(t){
  var l=t.line, b=[]; if(!canAct(l)||dead(l)) return '';
  if(t.ty==='Placement'&&l.stage===6&&(l.qAns||l.round>1)) b.push(simbtn('Placement returns the QCR','data-sim="extPlc" data-line="'+l.id+'"'));
  if(t.ty==='Payment'&&l.stage===9&&l.pay==='ticket'){ b.push(simbtn('Ops returns the payment details','data-sim="extOps" data-line="'+l.id+'"')); if(!l.payQ) b.push(simbtn('Ops asks a question','data-sim="extOpsQ" data-line="'+l.id+'"')); }
  if(t.ty==='Payment'&&l.stage===10) b.push(simbtn('The link expired unpaid — Ops closes the ticket','data-sim="extExpire" data-line="'+l.id+'"'));
  if(t.ty==='Payment'&&l.stage===10) b.push(simbtn('Client pays · sends the screenshot','data-sim="extPaid" data-line="'+l.id+'"'));
  return b.length?simblock('Simulate the desk or the client','',b.join('')):'';
}

/* [stated 26 Sep · 16.2] every ticket carries its documents, each to view and download */
function tkDocs(t){ var l=t.line, d=[];
  if(t.ty==='Placement'){ if(l.rfq&&l.rfq.st==='floated'){ d.push(['RFQ as sent to placement',true]); d.push(['RFQ as sent to placement · Excel',true]); } qcrVersions(l).filter(function(v){return v.ready;}).forEach(function(v){ d.push(['Quote Comparison Report v'+v.v,true]); }); }
  else { d.push(['Payment details from Ops',l.pay!=='ticket']); d.push(['PAN card',true]); d.push(['GST certificate',true]); if(l.hand) d.push(['Payment screenshot',true]); }
  return card('Documents',d.length?'<div class="rowlist doclist">'+d.map(function(x){ return docRow(x[0],x[1],x[1]?'':'Not yet on the ticket',{line:l.id}); }).join('')+'</div>':'<div class="meta">Nothing yet.</div>');
}
/* ---------- the two detail blocks ---------- */
function tkPlcDetails(l){
  var r=l.req||{}, qs=QUOTES.plc, back=l.stage>=7, mandate=l.plcExcl?'Yes':'No';
  var ins=back?plural(qs.length,'insurer')+' approached · '+qs.filter(function(q){return q.st==='quoted';}).length+' quoted':'Placement’s call';
  return card('What went to placement',
    '<div class="kvgrid">'+
      kv('Route',l.rfq&&l.rfq.direct?'Floated directly':'After the client approved the RFQ')+
      kv('Sum insured',esc(r.si||'—'))+
      kv('Target premium',esc(tkRupee(l.plcTp||r.tp)))+
      kv('Exclusive mandate',mandate)+
      kv('Business type',esc(l.plcBt||(l.renews?'Renewal':'New')))+
      kv('Rounds so far',String(l.round))+
    '</div>'+
    '<div class="tk-note"><div class="lbl">Note to placement</div><div class="v">'+(l.plcNote?esc(l.plcNote):'<span class="meta">No note was added.</span>')+'</div></div>',
    '<button class="btn sm" data-golinetab="quotes" data-line="'+l.id+'">View the RFQ</button>');
}
function tkQuery(l,can){
  if(!((l.plcQ&&l.round===1)||l.qAns)) return '';
  var unans=l.stage===6&&l.plcQ&&!l.qAns&&l.round===1, open=unans&&!dead(l);
  return card('Query from placement',
    '<div class="tk-q"><div class="tk-qh">'+esc(PLC_DESK)+' · BimaPlacement</div><div class="tk-qt">'+esc(PLC_QUERY)+'</div></div>'+(unans?'<div class="meta mt8">The line stays at '+esc(stageName(l.stage))+' while this is open.</div>':'')+
    (unans?(open&&can?'<div class="mt12"><button class="btn primary sm" data-flow="answerQ" data-line="'+l.id+'">Answer the query</button></div>':'')
         :'<div class="tk-q you"><div class="tk-qh">Your reply'+(tkAt(l,/Replied to placement query/,1)?' · '+esc(fmtD(tkAt(l,/Replied to placement query/,1))):'')+'</div><div class="tk-qt">'+(l.qReply?esc(l.qReply):'Answered.')+'</div></div>'),
    open?chip('Open','amber',true,true):(unans?chip('Not answered','neutral',true,true):chip('Answered','green',true,true)));
}
function tkQcr(l){
  if(l.stage<7&&l.round===1) return '';
  var vs=qcrVersions(l).filter(function(v){ return v.ready; });
  if(!vs.length) return '';
  return card('Quote comparison report',
    '<div class="qcards">'+vs.slice().reverse().map(function(v){ var act=qcrActionable(l,v.v); return qcrCard(l,v.v,{primary:act,label:act?'Review the QCR':'View'}); }).join('')+'</div>');
}
function tkPayDetails(l){
  var lines=(l.payLines&&l.payLines.length?l.payLines.map(lineById).filter(Boolean):[l]), who=l.contact.n||'the client', paid=l.pay==='paid'||l.stage>=SALES_STAGES;
  var head='<div class="tk-pm"><div><div class="pm-k">Payment mode</div><div class="pm-v">'+esc(payModeOf(l))+'</div></div><div class="tk-pm-a"><div class="pm-k">Amount</div><div class="pm-v">'+INR(tkAmt(l))+'</div></div></div>';
  var facts='<div class="kvgrid mt16">'+
    kv('Covers',lines.map(function(x){ return esc(x.product)+' <span class="meta">· '+INR(premOf(x))+'</span>'; }).join('<br>'))+
    kv('Insurer',esc(payInsurer(l)))+
    kv('Send to',esc(who)+'<br><span class="meta">'+esc(l.contact.e||l.contact.m||'')+'</span>')+
  '</div>';
  var ops;
  if(l.pay==='ticket') ops='<div class="tk-empty">'+ic('clock','ic20')+'<div><b>Ops is preparing the '+esc(payModeOf(l))+' details.</b><span>They show up here when Ops returns them.</span></div></div>';
  else {
    var sent=tkLog(l,/Payment details shared/,1);
    ops='<div class="kvgrid two">'+payDetails(l).map(function(r){ return kv(r[0],r[1]); }).join('')+'</div>'+
      '<div class="tk-sent '+(l.pay==='back'?'amber':'green')+'">'+(l.pay==='back'?ic('alert','ic14')+'<span><b>Not sent yet.</b> Check the details above, then share them with '+esc(who)+'.</span>':ic('check','ic14')+'<span>Sent to '+esc(who)+(sent?' · '+esc(fmtD(sent.at)):'')+'</span>')+'</div>';
  }
  var proof='';
  if(paid&&l.hand) proof=card('Payment proof','<div class="kvgrid">'+kv('Screenshot',esc(l.hand.proof||'Payment screenshot'))+kv('Amount',INR(tkAmt(l))+'<br><span class="meta">'+esc(l.hand.read||'')+'</span>')+kv('UTR','<span class="mono">'+esc(l.hand.utr||'—')+'</span>')+'</div>'+(l.hand.note?'<div class="tk-note"><div class="lbl">Handover note</div><div class="v">'+esc(l.hand.note)+'</div></div>':''));
  return card('Payment request',head+facts)+card('Details from Ops',ops)+proof;
}

SCREENS.ticket=function(){
  var t=ticketById(S.route.id); if(!t) return SCREENS.notfound();
  if(t.ty==='Post-purchase') return issTicketScreen(t);
  var l=t.line, a=acctOf(l), o=oppOf(l), can=canAct(l), h=tkHead(t), steps=ticketSteps(t), trail=tkTrail(t), w=actingParty(l);
  var desk=t.ty==='Placement'?[PLC_DESK,'BimaPlacement · builds the QCR']:['BimaOps','Payments desk · prepares the details'];
  var html='<div class="crumbs"><button data-back="1">'+ic('arrowleft','ic14')+' Back</button></div>'+
    '<div class="hdrow"><div><div class="tk-eyebrow">'+esc(t.ty)+' ticket · '+esc(t.desk)+'</div><div class="h1">'+esc(t.id)+'</div>'+
      '<div class="metaline"><span>'+esc(a.n)+'</span><span class="sep">·</span><span>'+esc(l.product)+'</span><span class="sep">·</span><span>Raised by '+esc(uname(t.ty==='Payment'?(l.soldBy||l.owner):l.owner))+' · '+esc(fmt(t.ty==='Placement'?plcRaisedAt(l):payRaisedAt(l)))+'</span></div></div><span class="sp"></span>'+
      '<div class="acts">'+chip(t.st,t.tone,true)+'</div></div>'+
    (!can&&h.tone!=='green'&&h.tone!=='neutral'?'<div class="banner neutral mt16">'+ic('eye','ic14')+'<span>Read-only. '+esc(readOnlyWhy(l)||'The desk works the ticket; the line owner answers it.')+'</span></div>':'')+
    '<section class="tkhero '+h.tone+'"><div class="tkh-top"><div class="tkh-tx"><div class="k">'+esc(h.k)+'</div><div class="hl">'+esc(h.hl)+'</div>'+(h.w?'<div class="w">'+esc(h.w)+'</div>':'')+'</div>'+
      '<div class="tkh-acts">'+(can?h.acts.filter(function(x){ return x[0]==='answerQ'||x[0]==='payAnswer'; }).map(function(x,i){ return tkBtn(x,l,i===0); }).join(''):'')+'</div></div>'+
      (h.acts.some(function(x){ return x[0]!=='answerQ'&&x[0]!=='payAnswer'; })&&can?'<div class="meta" style="padding:0 18px 10px">The next step is on the product line — nothing here moves the stage.</div>':'')+
      '<div class="tkh-track">'+tkTrack(steps)+'</div></section>'+
    '<div class="tkgrid"><div class="tkmain">'+
      (t.ty==='Placement'?tkQuery(l,can)+tkQcr(l)+tkPlcDetails(l):tkPayDetails(l))+panelOr('tk-docs',function(){ return tkDocs(t); })+
      card('Timeline','<ul class="tl">'+trail.map(function(e){ return '<li><span class="dot'+(e.sys?' sys':'')+'"></span><div class="bd"><b>'+esc(e.t)+'</b> '+chip(e.k,e.k==='Us'?'amber':(e.k==='Them'?'violet':(e.k==='Done'?'green':'blue')),false,true)+'<div class="m">'+esc(e.m)+(e.open?'':' · '+esc(fmt(e.at)))+'</div></div></li>'; }).join('')+'</ul>','',{sub:'oldest first'})+
    '</div><aside class="tkside">'+
      card('On the line','<div class="tk-kvs">'+
        kv('Product line','<button class="link" data-go="line" data-id="'+l.id+'">'+esc(l.id)+'</button> <span class="meta">· '+esc(l.product)+'</span>')+
        kv('Stage',chip(stageName(l.stage),'neutral',true,true))+
        kv('Waiting on',chip(w,waitTone(w),false,true))+
        kv('Owner',esc(uname(l.owner)))+
        (o?kv('Opportunity','<button class="link" data-go="opp" data-id="'+o.id+'">'+esc(o.id)+'</button>'):kv('Business type','Renewal <span class="meta">· no opportunity</span>'))+
      '</div>')+
      card('People','<div class="tk-ppl">'+
        '<div class="tk-p"><span class="av">'+esc(initials(desk[0]))+'</span><div><b>'+esc(desk[0])+'</b><span>'+esc(desk[1])+'</span></div></div>'+
        '<div class="tk-p"><span class="av c">'+esc(initials(l.contact.n||'C'))+'</span><div><b>'+esc(l.contact.n||'—')+'</b><span>Client contact · '+esc(l.contact.e||l.contact.m||'')+'</span></div></div>'+
        '<div class="tk-p"><span class="av o">'+esc(initials(uname(l.owner)))+'</span><div><b>'+esc(uname(l.owner))+'</b><span>Line owner'+(l.owner===S.user?' · you':'')+'</span></div></div>'+
      '</div>')+
      (function(){ var d=deskStage(t), c=t.ty==='Payment'?opsClock(l):null; return card('On the desk','<div class="tk-kvs">'+kv('Desk stage','<b>'+esc(d.st)+'</b><div class="meta">as the desk names it · read-only</div>')+(d.tags.length?kv('Tags',d.tags.map(function(g){return chip(g,'neutral',false,true);}).join(' ')):'')+
        kv(t.ty==='Payment'?'Ops owner':'Placement owner',esc(t.ty==='Payment'?OPS_OWNER:PLC_DESK))+kv('Opened',esc(fmt(t.ty==='Placement'?plcRaisedAt(l):payRaisedAt(l))))+
        (c?kv('Turnaround','<span class="'+(c.over?'red':'')+'">'+esc(whTx(c.m))+' of 60 working minutes'+(c.running?' · running':'')+'</span><div class="meta">One clock, never paused.</div>'):kv('Elapsed',esc(whTx(workMins(plcRaisedAt(l),l.stage>=7?(tkAt(l,/Quotes returned by placement/,1)||S.now):S.now)))))+'</div>'); })()+
      tkSims(t)+
    '</aside></div>';
  return {sc:'Ticket', ctx:t.id, html:html, cta: raiseLines().length?'<button class="btn primary sm" data-flow="pickTicket">'+ic('plus')+'Raise ticket</button>':''};
};
HANDLERS.push(function(t){
  var x=t.closest('[data-golinetab]'); if(!x) return false;
  S.ui['ltab_'+x.dataset.line]=x.dataset.golinetab; go('line',{id:x.dataset.line}); return true;
});
