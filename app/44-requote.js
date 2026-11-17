/* ==================================================================== *
 *  v76.1 · Change the captured details and re-quote — [stated 17 Nov]
 *  1. Prices follow the requirement. The rater (DUA) and placement (Non-DUA)
 *     price off the captured details: WC on annual wages and medical cover,
 *     every other product on the sum insured / cover. Each round keeps the
 *     prices it was quoted at, so an older QCR still shows its own numbers.
 *  2. DUA: "Change details and re-quote" from Quote Sent. The requirement
 *     form opens; saving sends the line back to Details Captured, runs the
 *     rater again and the QCR goes out as the next version.
 *     Non-DUA: Revise with "Changed sum insured or cover" unlocks the
 *     requirement until placement returns the next round.
 *  3. Editing the details after a rater run marks those quotes out of date;
 *     the next action becomes "Get fresh quotes".
 * ==================================================================== */
function rqAmt(v){ v=String(v||'').replace(/[₹,\s]/g,'').toLowerCase(); var m=v.match(/^([\d.]+)(cr|crore|crores|l|lac|lacs|lakh|lakhs|k)?/); if(!m) return 0;
  var n=+m[1], u=m[2]||''; if(u.indexOf('cr')===0) n*=1e7; else if(u[0]==='l') n*=1e5; else if(u==='k') n*=1e3; return n; }
var RQ_BASE={wcWages:420*22000*12, wcMed:50000, si:1e8};   /* the exposure the base prices were set for */
function rqFactor(l){ var r=(l&&l.req)||{}, f=1;
  if(l.product===WC_PRODUCT){ var nw=+String(r.wcnw||'').replace(/\D/g,''), sal=rqAmt(r.wcsal);
    if(nw&&sal) f=(nw*sal*12)/RQ_BASE.wcWages;
    if(r.wcmed==='n') f*=0.94; else if(r.wcmed==='y'&&r.wcmedamt) f*=1+((rqAmt(r.wcmedamt)-RQ_BASE.wcMed)/RQ_BASE.wcMed)*0.05; }
  else { var si=rqAmt(r.cybcov||r.si); if(si) f=Math.pow(si/RQ_BASE.si,0.8); }
  if(!isFinite(f)||f<=0) f=1; return Math.round(f*1000)/1000; }
function rqScale(qs,f){ return qs.map(function(q){ var x={}; for(var k in q) x[k]=q[k]; if(x.p) x.p=Math.max(5000,Math.round(x.p*f/50)*50); return x; }); }
/* which round's prices to show: the one being viewed, else the current round */
function rqRound(l){ return l._viewV||l.round||1; }
function rqDauF(l){ if(S.flow==='qfetch'&&S.sel&&S.sel.line===l.id&&(S.sel.qph==='dua'||S.sel.qph==='load')) return rqFactor(l);
  var m=l.qfR||{}; return m[rqRound(l)]||m[l.round]||l.qf||1; }
function rqPlcF(l){ var m=l.plfR||{}; return m[rqRound(l)]||m[l.round]||1; }
dauQuotes=(function(d0){ return function(l){ var q=d0.apply(this,arguments); return l?rqScale(q,rqDauF(l)):q; }; })(dauQuotes);
var RQ_PLC0=QUOTES.plc;   /* placement's base prices — scaled per line and round, never in place */
function plcQuotes(l){ return rqScale(RQ_PLC0,l?rqPlcF(l):1); }
quotesFor=function(l){ return l.rate?dauQuotes(l):plcQuotes(l); };
/* the renderers that read QUOTES.plc directly see this line's prices while they run */
function rqWithPlc(l,fn,self,args){ if(!l) return fn.apply(self,args); var was=QUOTES.plc; QUOTES.plc=plcQuotes(l); try{ return fn.apply(self,args); } finally { QUOTES.plc=was; } }
['qcrQuotes','qcrOthers','tkPlcDetails','quotesTab'].forEach(function(n){ var f0=window[n]; if(typeof f0!=='function') return;
  window[n]=function(l){ return rqWithPlc(l,f0,this,arguments); }; });
docQuote=(function(f0){ return function(c){ return rqWithPlc(c&&c.line,f0,this,arguments); }; })(docQuote);
/* a QCR version shows the prices of its own round */
function rqAsOf(f0){ return function(l,v){ if(!l) return f0.apply(this,arguments); var was=l._viewV, req=l.req, snap=l.reqR&&l.reqR[v||l.round]; l._viewV=v||l.round; if(snap) l.req=snap;
  try{ return rqWithPlc(l,f0,this,arguments); } finally { l._viewV=was; l.req=req; } }; }
qvHtml=rqAsOf(qvHtml); qcrCard=rqAsOf(qcrCard);

/* snapshot the prices: the rater at each fetch, placement when it returns a round */
function rqSnapReq(l){ l.reqR=l.reqR||{}; l.reqR[l.round]=JSON.parse(JSON.stringify(l.req||{})); }
function rqSnapDau(l,why){ rqSnapReq(l); l.qfR=l.qfR||{}; l.qfR[l.round]=rqFactor(l); l.qf=l.qfR[l.round]; l.qStale=0;
  var top=dauQuotes(l).filter(function(q){ return q.st==='quoted'; }).map(function(q){ return q.p; }), lo=top.length?Math.min.apply(null,top):0;
  if(why) logAdd(l,why,'System · get-quote API · priced from the requirement'+(lo?' · lowest '+INR(lo):''),'sys',1); }
(function(){ var F=FLOWS.qfetch, r0=F.run; F.run=function(){ var l=FL(), dua=S.sel.qph==='dua', res=r0.apply(this,arguments); try{ if(dua&&l.rate===1) rqSnapDau(l,''); }catch(e){} return res; }; })();
(function(){ var F=FLOWS.freshQ, r0=F.run; F.run=function(){ var l=FL(), res=r0.apply(this,arguments); try{ if(l.rate===1){ rqSnapDau(l,''); save(); } }catch(e){} return res; }; })();
moveStage=(function(m0){ return function(l,n,why){ var r=m0.apply(this,arguments); try{ if(n===7&&l.rate===0){ l.plfR=l.plfR||{}; l.plfR[l.round]=rqFactor(l); rqSnapReq(l); } }catch(e){} return r; }; })(moveStage);

/* 3 · an edit after a rater run marks those quotes out of date */
(function(){ var F=FLOWS.disc, r0=F.run; F.run=function(){ var l=FL(), before=l&&l.rate===1&&l.qf&&!l._rqNoStale?l.qf:0, res=r0.apply(this,arguments);
  try{ if(before&&l.rate===1&&l.stage===3&&Math.abs(rqFactor(l)-before)>0.0005&&!l.qStale){ l.qStale=1; logAdd(l,'Requirement changed — the rater’s quotes are out of date',uname(S.user)+' · get fresh quotes before the QCR goes out','sys',1); save(); paint(); } }catch(e){}
  return res; }; })();
FLOWS.rqFetch={t:'Get fresh quotes', sub:'The requirement changed after the rater priced it. The rater runs again on the new details.',
  body:function(){ var l=FL(), old=rqScale(QUOTES.dau,l.qf||1);
    var row=function(q){ var o=old.filter(function(x){ return x.i===q.i; })[0]; return '<tr'+(q.st==='quoted'?'':' class="dim"')+'><td class="nm">'+esc(q.i)+'</td><td class="num">'+(o&&o.p?INR(o.p):'—')+'</td><td class="num"><b>'+(q.p?INR(q.p):'—')+'</b></td></tr>'; };
    return note('amber','','The quotes below were priced on the old details. Fresh quotes replace them; you then pick what goes in the QCR.','info')+
      '<div class="tw mt12"><table class="t"><thead><tr><th>Insurer</th><th class="num">Was</th><th class="num">Now</th></tr></thead><tbody>'+
      QUOTES.dau.filter(function(q){ return q.st==='quoted'; }).map(function(q){ return row(rqScale([q],rqFactor(l))[0]); }).join('')+'</tbody></table></div>'; },
  ok:'Get fresh quotes',
  run:function(){ var l=FL(); var ok=write(function(){ rqSnapDau(l,'Fresh quotes from the rater — the requirement changed'); l.qsel=[]; },'the new quotes'); if(!ok) return 'fail';
    closeFlow(); openFlow('qcr',{line:l.id}); return 'stay'; }};

/* 2 · DUA: change the details from Quote Sent and re-quote */
FLOWS.rqChange={t:'Change details and re-quote', wide:true,
  sub:function(){ var l=FL(); return 'The client wants something different from QCR v'+l.round+'. Update the requirement — the rater prices it again and QCR v'+(l.round+1)+' goes out.'; },
  repaintOn:(FLOWS.disc.repaintOn||[]),
  body:function(){ return FLOWS.disc.body.apply(this,arguments); },
  can:function(){ return reqCount(FL(),true).miss.length===0; },
  ok:'Save and re-quote',
  run:function(){ var l=FL(), was=l.round;
    var ok=write(function(){ logAdd(l,'Details changed after QCR v'+was,uname(S.user)+' · the opportunity goes back to Details Captured for fresh quotes','sys',1);
      l.round++; l.qsel=[]; l.picked=''; moveStage(l,3,'Details changed — re-quote'); },'the change');
    if(!ok) return 'fail';
    l._rqNoStale=1; var r; try{ r=FLOWS.disc.run.apply(this,arguments); } finally { delete l._rqNoStale; } if(r==='fail') return 'fail';
    var ok2=write(function(){ rqSnapDau(l,'Fresh quotes from the rater — round '+l.round+' on the changed details'); },'the new quotes'); if(!ok2) return 'fail';
    closeFlow(); openFlow('qcr',{line:l.id}); toast('Re-quoted on the new details','Pick the quotes for QCR v'+l.round+'.'); return 'stay'; }};

/* Non-DUA: a revision for changed cover lets the requirement be edited until placement returns */
reqLocked=(function(r0){ return function(l){ if(l&&l.rate===0&&l.stage===6&&l.round>1&&/^Changed sum insured or cover/.test(l.obj||'')) return false; return r0.apply(this,arguments); }; })(reqLocked);
(function(){ var F=FLOWS.objectQcr, r0=F.run; F.run=function(){ var l=FL(), chg=S.sel.ask==='Changed sum insured or cover', res=r0.apply(this,arguments);
  try{ if(chg&&res!=='fail'&&l.stage===6){ closeFlow(); openFlow('disc',{line:l.id}); toast('Update the requirement','Placement re-quotes round '+l.round+' on the new details.'); return 'stay'; } }catch(e){}
  return res; }; })();

/* where the new actions show */
nextAction=(function(n0){ return function(l){ var na=n0.apply(this,arguments);
  try{ if(!l||!l.stage||dead(l)) return na;
    if(l.rate===1&&l.stage===3&&l.qStale) return {tone:'amber',lab:'Next action',txt:'The requirement changed — the quotes are out of date',why:'The rater priced the old details. Get fresh quotes before the QCR goes out.',acts:[['rqFetch','Get fresh quotes'],['tab:quotes','See the old quotes']]};
    if(l.rate===1&&l.stage===8&&na&&na.acts&&!na.acts.some(function(a){ return a[0]==='rqChange'; })) na.acts=na.acts.slice(0,1).concat([['rqChange','Change details and re-quote']],na.acts.slice(1)); }catch(e){}
  return na; }; })(nextAction);
/* the requirement header: Change details and re-quote while the QCR is with the client */
reqSection=(function(r0){ return function(l,full){ var h=r0.apply(this,arguments);
  try{ if(l.rate===1&&l.stage===8&&canAct(l)&&h.indexOf('data-flow="rqChange"')<0){ var i=h.indexOf('</div></div>'); if(i>0) h=h.slice(0,i)+' <button class="btn sm" data-flow="rqChange" data-line="'+l.id+'">Change details and re-quote</button>'+h.slice(i); } }catch(e){}
  return h; }; })(reqSection);
/* a follow-up where the client asked for changes opens the change form on a DUA line */
(function(){ var F=FLOWS.qfollow, r0=F.run; F.run=function(){ var l=FL(), ch=S.sel.fr==='changes'&&l.rate===1, res=r0.apply(this,arguments);
  if(ch&&res==='stay'&&S.flow==='rejectAll'){ closeFlow(); openFlow('rqChange',{line:l.id}); } return res; }; })();
/* the quotes tab says when the rater quotes are stale */
quoteTable=(function(q0){ return function(l,qs,dau){ var h=q0.apply(this,arguments); if(dau&&l&&l.rate===1&&l.stage===3&&l.qStale) h='<div class="banner amber mt8">'+ic('alert','ic14')+'<span><b>Out of date.</b> These were priced on the old details. <button class="link" data-flow="rqFetch" data-line="'+l.id+'">Get fresh quotes</button></span></div>'+h; return h; }; })(quoteTable);
/* the QCR cannot go out on stale quotes */
(function(){ var F=FLOWS.qcr, c0=F.can, b0=F.body; F.can=function(){ var l=FL(); if(l&&l.qStale) return false; return c0?c0.apply(this,arguments):true; };
  F.body=function(){ var l=FL(); if(l&&l.qStale) return note('amber','The quotes are out of date','The requirement changed after the rater priced it. Get fresh quotes first.','alert')+'<button class="btn primary sm mt8" data-flow="rqFetch" data-line="'+l.id+'">Get fresh quotes</button>'; return b0.apply(this,arguments); }; })();


/* ==== Investor demo (v76) ==== */
