/* ==================================================================== *
 *  [stated 27 Oct] Raise ticket = endorsements and claims only.
 *  Placement and payment tickets are raised only through the journey
 *  (Float to placement, Raise payment request on the opportunity).
 * ==================================================================== */
function svcLineOk(l){ var a=acctOf(l), p=polOfLine(l), u=me(); return !!(a&&p&&!p.issuing&&u&&(a.own===u.id||(window.abCoA&&abCoA(a,u))||u.role==='admin')); }
lineTicketOpts=(function(f0){ return function(l){ return f0(l).filter(function(o){ return o.k==='svc'; }).map(function(o){
  if(o.why&&/^Raised by /.test(o.why)&&svcLineOk(l)){ var a=acctOf(l), p=polOfLine(l); o.why=''; o.btn=(polActive(p)?'<button class="btn sm" data-go="svcnew" data-pol="'+p.id+'" data-acct="'+a.id+'" data-kind="end">Endorse</button> ':'')+'<button class="btn sm" data-go="svcnew" data-pol="'+p.id+'" data-acct="'+a.id+'" data-kind="clm">Claim</button>'; }
  return o; }); }; })(lineTicketOpts);
raiseLines=function(u){ u=u||me(); return S.data.lines.filter(function(l){ return (l.owner===u.id||abCo(l,u)||u.role==='admin')&&!dead(l)&&svcLineOk(l); }); };
(function(){ var F=FLOWS.pickTicket, b0=F.body; F.sub='An endorsement or a claim on an issued policy. Placement and payment tickets are raised from the opportunity’s journey.';
  F.body=function(){ return b0().replace('Lines with a ticket ready to raise are listed first.','Product lines with an issued policy.').replace('The issuance ticket opens by itself at Payment Completed.','Placement and payment tickets are raised from the opportunity: Float to placement, Raise payment request. The issuance ticket opens by itself at Payment Completed.'); };
  var L=FLOWS.lineTicket, l0=L.body; L.sub=function(){ var l=FL(); return esc(acctName(l))+' · '+esc(l.product)+' — endorsements and claims on its policy.'; };
  L.body=function(){ return l0().replace('The post-purchase ticket opens by itself at Payment Completed.','Placement and payment tickets are raised from the opportunity’s journey. The post-purchase ticket opens by itself at Payment Completed.'); }; })();

/* [stated 27 Oct] renewal to-dos run on the checks; shared copies close together everywhere */
primeRules=(function(p0){ return function(){ var r=p0.apply(this,arguments); try{ ctRenewSweep(); }catch(e){} return r; }; })(primeRules);
advanceClock=(function(a0){ return function(){ var r=a0.apply(this,arguments); try{ ctRenewSweep(); ctPairSweep(); }catch(e){} return r; }; })(advanceClock);
paint=(function(p0){ return function(){ try{ if(S.data&&S.data.tasks) ctPairSweep(); }catch(e){} return p0.apply(this,arguments); }; })(paint);
