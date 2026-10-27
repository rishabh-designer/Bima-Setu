/* ==================================================================== *
 *  7 · Account addresses · sum insured currency
 * ==================================================================== */
function acctAddrKvs(a,u){ var can=onAcct(a,u), ed=can?' <button class="quiet" data-flow="acctAddr" data-acct="'+a.id+'">Edit</button>':'';
  return kv('Communication address',(a.commAddr?esc(a.commAddr):'<span class="meta">not captured</span>')+ed)+kv('GST address',a.gstAddr?esc(a.gstAddr):'<span class="meta">'+(a.prov?'read from the GST certificate at KYC':'not captured')+'</span>'); }
FLOWS.acctAddr={t:'Addresses on the account', sub:'The communication address is where letters and documents go. The GST address is the one on the GST certificate.',
  body:function(){ var a=by(S.data.accounts,S.sel.acct); if(S.sel.ca===undefined){ S.sel.ca=a.commAddr||''; S.sel.ga=a.gstAddr||''; }
    return field('Communication address',input('ca',S.sel.ca,'Plot 14, MIDC Bhosari, Pune 411026'))+field('GST address',input('ga',S.sel.ga,'As on the GST certificate'),'Read from the GST certificate at KYC when it is uploaded.'); },
  can:function(){ return !!(S.sel.ca||'').trim(); }, ok:'Save',
  run:function(){ var a=by(S.data.accounts,S.sel.acct); var ok=write(function(){ a.commAddr=S.sel.ca.trim(); a.gstAddr=(S.sel.ga||'').trim(); acctLog(a,'Addresses updated',uname(S.user)); },'the addresses'); if(!ok) return 'fail'; toast('Saved',''); }};
var CURS=['INR','USD','EUR','GBP','AED','SGD'];
function fxOk(v){ return /^\d+(\.\d+)?$/.test(String(v||'').trim())&&+v>0; }
function siNum(v){ var n=parseFloat(String(v||'').replace(/[^\d.]/g,'')); return isNaN(n)?0:n; }
function siInrTx(v,cur,fx){ if(!fxOk(fx)||!siNum(v)) return ''; return '≈ '+CR(siNum(v)*(+fx))+' at today’s rate.'; }
function siDisp(l,v){ var r=l.req||{}, cur=r.sicur; if(!cur||cur==='INR') return v; return cur+' '+v+(fxOk(r.sifx)?' · ≈ '+CR(siNum(v)*(+r.sifx))+' at ₹'+r.sifx+' (rate on the day)':''); }
function siCur(l){ var r=l.req||{}; return S.sel.sicur!==undefined?S.sel.sicur:(r.sicur||'INR'); }
function siFx(l){ var r=l.req||{}; return S.sel.sifx!==undefined?S.sel.sifx:(r.sifx||''); }
function hasSiQ(l){ return reqQs(l,true).some(function(x){ return x.k==='si'||x.k==='cybcov'; }); }
function reqField(l,x,e){ var h=reqField0(l,x,e); if(x.k!=='si'&&x.k!=='cybcov') return h; var cur=siCur(l), fx=siFx(l);
  return '<div>'+h+'<div class="fgrid mt8">'+field('Currency',select('sicur',cur,CURS))+(cur!=='INR'?field('Today’s rate · 1 '+cur+' in ₹',input('sifx',fx,'83.20'),'Mandatory when the sum insured is not in rupees. '+siInrTx(reqGet(l,x.k,true),cur,fx),e.sifx):'<div></div>')+'</div></div>'; }
function discErr(){ var e=discErr0(), l=FL(); if(l&&hasSiQ(l)&&siCur(l)!=='INR'&&S.sel.sifx!==undefined&&!fxOk(S.sel.sifx)) e.sifx='Enter today’s rate, e.g. 83.20'; return e; }
(function(){ var F=FLOWS.disc, c0=F.can, r0=F.run; F.repaintOn=(F.repaintOn||[]).concat(['sicur']);
  F.can=function(){ if(!c0()) return false; var l=FL(); if(!hasSiQ(l)||siCur(l)==='INR') return true; return fxOk(siFx(l)); };
  F.run=function(){ var l=FL(), cur=S.sel.sicur, fx=S.sel.sifx; var res=r0.apply(this,arguments); if(res!=='fail'&&l.req&&cur!==undefined){ l.req.sicur=cur; l.req.sifx=cur==='INR'?'':String(fx||'').trim(); save(); } return res; }; })();
