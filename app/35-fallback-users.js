/* ==================================================================== *
 *  [stated 27 Oct] Fallback users — one each for a Sales opportunity, a
 *  Post-sales opportunity and the ABM. Used only when the master that
 *  normally decides (Lead assignment, RM allocation, the ABM pool) finds
 *  nobody. Replaces the per-product fallback list.
 * ==================================================================== */
var FB_KINDS=[['sales','Opportunity · Sales','When Lead assignment finds nobody for a new opportunity.',function(u){ return u.role==='exec'||u.role==='mgr'; }],
  ['post','Opportunity · Post-sales','When RM allocation finds no RM at Payment Completed.',function(u){ return u.role==='rm'||u.role==='rmhead'; }],
  ['abm','ABM','When the ABM round-robin pool is empty at Payment Completed.',function(u){ return u.role==='abm'||u.role==='abmmgr'; }]];
function fbData(){ if(!S.data.fb) S.data.fb={sales:'nikhil',post:'priya',abm:userById('kavya')?'kavya':''}; return S.data.fb; }
function fbUser(k){ var id=S.data?fbData()[k]:''; return id&&userById(id)?id:''; }
function fbCard(){ var f=fbData(), admin=(me()||{}).role==='admin';
  return '<div class="h4 mt16 mb12 flex" style="align-items:center">Fallback users<span class="sp"></span>'+(admin?'<button class="btn sm" data-flow="fbEdit">Edit</button>':'')+'</div>'+
    '<section class="card" style="overflow:hidden"><div class="tw"><table class="t"><thead><tr><th>Fallback for</th><th>User</th><th>Used when</th></tr></thead><tbody>'+
    FB_KINDS.map(function(k){ return '<tr><td class="nm">'+esc(k[1])+'</td><td>'+(f[k[0]]&&userById(f[k[0]])?esc(uname(f[k[0]])):'<span class="red">Not set</span>')+'</td><td class="meta" style="white-space:normal">'+esc(k[2])+'</td></tr>'; }).join('')+'</tbody></table></div></section>'; }
FLOWS.fbEdit={t:'Fallback users', sub:'Who gets the record when the master that normally decides finds nobody.',
  body:function(){ var f=fbData(); if(!S.sel._i){ S.sel._i=1; FB_KINDS.forEach(function(k){ S.sel['fb_'+k[0]]=f[k[0]]||''; }); }
    return FB_KINDS.map(function(k){ var us=S.data.users.filter(k[3]); return field(k[1],select('fb_'+k[0],S.sel['fb_'+k[0]],[['','Choose a user']].concat(us.map(function(u){ return [u.id,u.n+' · '+(u.title||u.role)]; }))),k[2]); }).join(''); },
  can:function(){ return FB_KINDS.every(function(k){ return !!S.sel['fb_'+k[0]]; }); }, ok:'Save',
  run:function(){ var ok=write(function(){ var f=fbData(); FB_KINDS.forEach(function(k){ f[k[0]]=S.sel['fb_'+k[0]]; }); },'the fallback users'); if(!ok) return 'fail'; toast('Fallback users saved',FB_KINDS.map(function(k){ return k[1]+': '+uname(fbData()[k[0]]); }).join(' · ')); }};
/* post-sales: the account's RM, else the Post-sales fallback (until RM allocation picks one) */
rmFor=function(a,product){ var o=a?userById(a.own):null; if(o&&(o.role==='rm'||o.role==='rmhead')) return o.id; return (window.rmAllocPick&&rmAllocPick(a,product))||fbUser('post')||'priya'; };
/* the call outcome knows which task was called, so its follow-up keeps that task's role */
(function(){ var F=FLOWS.call, r0=F.run; F.run=function(){ var l=FL(), t=l?ctOpenTask(l,S.sel.task):null; CT_OUT_TEAM=(t&&t.team)||'';
  try{ return r0.apply(this,arguments); } finally { CT_OUT_TEAM=''; } }; })();
