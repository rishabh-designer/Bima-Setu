/* ==================================================================== *
 *  5 · Website drop-off → opportunity stage (decided 19 Oct)
 * ==================================================================== */
WEB_PRIO['Payment failed']='P0';
var WEB_DROP_MAP={
 'Name phone email filled':{st:1},'Visited Company field step':{st:1},'Company name filled':{st:1},'L1 Visited':{st:1},
 'L1 completed':{st:3},'OTP Entered':{st:3},'View all the available quotes':{st:3},'Entered offline flow (thank you page)':{st:3,non:1},
 'Quote selected by user':{st:'kyc'},'User details page visited in purchase flow':{st:'kyc'},'User details submitted in purchase flow':{st:'kyc'},'Company details page submit':{st:'kyc'},
 'KYC documents submitted':{st:9,us:1},'KYC verified':{st:'kyc'},'Payment start':{st:'kyc'},'Payment failed':{st:'kyc'}};
function webDropStage(drop,prov){ var m=WEB_DROP_MAP[drop]; if(!m) return 1; return m.st==='kyc'?(prov?9:10):m.st; }
SCREENS.leadprio=function(){
  var lands=function(d){ var m=WEB_DROP_MAP[d]||{st:1}; if(m.st===1) return 'New Lead'; if(m.st===3) return 'Details Captured'+(m.non?' · Non-DUA':''); if(m.us) return 'KYC Details Requested · waiting on Us, documents to verify'; return 'Purchase Requested (verified account) · KYC Details Requested (provisional)'; };
  var rows=Object.keys(WEB_DROP_MAP).map(function(d,i){ var p=WEB_PRIO[d]||'P1'; return '<tr><td class="num">'+(i+1)+'</td><td>'+esc(d)+(d==='Payment failed'?' '+chip('New event','violet',false,true):'')+'</td><td>'+chip(p,prioTone(p),false,true)+'</td><td>'+esc(lands(d))+'</td></tr>'; }).join('');
  var html='<div class="hdrow"><div><div class="h1">Lead prioritisation</div><div class="sub">For website drop-offs: the priority from the funnel step, and the stage the opportunity opens at. The drop-off point and its priority stay on their own field; the stage does not replace them.</div></div></div>'+diamonds()+
    '<section class="card" style="overflow:hidden"><div class="tw"><table class="t"><thead><tr><th>#</th><th>Drop-off point</th><th>Priority</th><th>Opens at</th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'+
    '<div class="mt16">'+note('neutral','Rules','From L1 completed onward the capture form is pre-filled from the L1 answers; the stage does not wait for the rest. The route (DUA or Non-DUA) is decided from the L1 answers at Details Captured. One “First call · website drop-off” task fires at whatever stage it opens at — first call in 5 minutes, until someone answers.','info')+'</div>';
  return {sc:'Lead prioritisation', html:html}; };
