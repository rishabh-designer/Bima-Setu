/* ==================================================================== *
 *  v48 shared helpers — states, activity kinds, renewal priority
 * ==================================================================== */
/* [stated 25 Sep · 19.3] a panel loads, fails and empties on its own. The prototype can make panels fail
   (Prototype controls) so the state can be seen; Try again brings each one back. */
function panelOr(key,fn){ if(S.ui.failPanels&&!(S.ui.panelOk||{})[key]) return '<div class="pfail">'+ic('alert','ic16')+'<span>Couldn’t load this.</span><button class="btn sm" data-retry="'+esc(key)+'">Try again</button></div>'; return fn(); }
HANDLERS.push(function(t){ var x=t.closest('[data-protoui]'); if(!x) return false; var k=x.dataset.protoui; S.ui[k]=S.ui[k]?0:1; if(k==='failPanels') S.ui.panelOk={}; S._skel=''; paintModal(); paint(); return true; });
HANDLERS.push(function(t){ var x=t.closest('[data-retry]'); if(!x) return false; if(!S.ui.panelOk) S.ui.panelOk={}; S.ui.panelOk[x.dataset.retry]=1; paint(); return true; });
function skeleton(){ return '<div class="skel"><i style="width:38%;height:28px"></i><i style="width:62%"></i><i style="width:100%;height:120px;margin-top:18px"></i><i style="width:100%;height:220px"></i></div>'; }
/* [stated 26 Sep · 5.1 §6] the trail filters: Calls · Documents · Ownership · System, and a text search */
function actKindOf(k,t){ if(k==='call') return 'call'; if(/^(email|qcr|rfq|pay|post|whatsapp)$/.test(k||'')) return 'docs';
  if(/Owner changed|Ownership|reassigned|Taken over|Handed back|Take ownership/i.test(t||'')) return 'own'; return 'sys'; }
function actFilterChips(key,cur){ return '<div class="chips">'+[['','Everything'],['call','Calls'],['docs','Documents'],['own','Ownership'],['sys','System']].map(function(x){ return '<button type="button" data-uiset="'+key+'" data-uv="'+x[0]+'"'+(cur===x[0]?' class="on"':'')+'>'+x[1]+'</button>'; }).join('')+'</div>'; }
/* [stated 26–27 Sep · 12.5] P1 0–7 days (overdue included) · P2 8–30 · P3 31–60 · no badge 61–90.
   Renewal lines only, derived from the expiring policy's end date, never typed and never overridden. */
function prio(l){ if(!isRen(l)||dead(l)||l.stage>=SALES_STAGES) return ''; var d=renDays(l); return d<=7?'P1':(d<=30?'P2':(d<=60?'P3':'')); }
function prioBadge(l){ var p=prio(l); return p?chip(p,p==='P1'?'red':(p==='P2'?'amber':'blue'),false,true):webPrioBadge(l); }
function prioRank(l){ var p=prio(l); return p==='P1'?0:(p==='P2'?1:(p==='P3'?2:3)); }
function byPrio(x,y){ var a=renPolHit(x), b=renPolHit(y); return (prioRank(x)-prioRank(y))||((a?a.p.exp:0)-(b?b.p.exp:0)); }

/* seed lines already past discovery carry a full answer set for their product's template */
function seedFill(d){ var SMP={tob:'Manufacturing',noc:'Private limited',to:'₹40 Cr',si:'₹10 Cr',occ:'Manufacturing unit with an attached godown',com:'Finished goods',mode:'Road',act:'Manufacturing and trading',hc:'180',fam:'Employee, spouse and children',pol:'n',clm:'No claims in 3 years',ten:'1 year'};
  d.lines.forEach(function(l){ if(l.stage<3||!l.req) return; var t=reqTpl(l.product); if(!t) return; t.forEach(function(g){ g[1].forEach(function(x){ var k=Array.isArray(x)?x[0]:x; if(!l.req[k]) l.req[k]=k==='to'?((d.accounts.filter(function(a){return a.id===l.acct;})[0]||{}).to||SMP.to):SMP[k]; }); }); if(l.req.pol==='y'&&!l.req.ins){ l.req.ins='New India Assurance'; } if(l.req.pol==='y'&&!l.req.exp) l.req.exp='2026-12-31'; });
  return d; }
