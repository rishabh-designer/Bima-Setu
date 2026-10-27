/* ==================================================================== *
 *  Admin master · ABM assignment — the round-robin pool [stated 23 Oct]
 * ==================================================================== */
SCREENS.masterabm=function(){ var u=me(); if(!u||u.role!=='admin') return {sc:'ABM assignment',html:empty('lock','Only the administrator edits the masters',''),cta:''};
  var pool=abPool(), nx=rrNextIdx(), cnt=function(id,how){ return S.data.accounts.filter(function(a){ return a.abm===id&&(!how||/^Round robin/.test(a.abmHow||'')); }).length; };
  var last=function(id){ var t=0; S.data.accounts.forEach(function(a){ if(a.abm===id&&/^Round robin/.test(a.abmHow||'')&&(a.abmAt||0)>t) t=a.abmAt; }); return t; };
  var order=[]; if(nx>=0){ for(var k=0;k<pool.length;k++){ var i=(nx+k)%pool.length; if(pool[i].on) order.push(pool[i].id); } }
  var seq=[]; for(var j=0;j<6&&order.length;j++) seq.push(uname(order[j%order.length]).split(' ')[0]);
  var tog=function(x){ return '<button class="tog'+(x.on?' on':'')+'" data-abpool="tog" data-id="'+x.id+'" aria-pressed="'+(x.on?'true':'false')+'"><i></i>'+(x.on?'In':'Out')+'</button>'; };
  var rows=pool.map(function(x,i){ return '<tr class="'+(x.on?'':'dim')+'"><td class="num" style="width:60px">'+(i+1)+'</td><td class="nm"><span class="flex">'+avatar(uname(x.id),true)+esc(uname(x.id))+(i===nx?' '+chip('Next','violet',true,true):'')+'</span></td>'+
    '<td>'+tog(x)+'</td><td class="num">'+cnt(x.id)+'</td><td class="num">'+cnt(x.id,1)+'</td><td>'+(last(x.id)?esc(fmtD(last(x.id))):'<span class="meta">—</span>')+'</td>'+
    '<td class="right" style="white-space:nowrap"><button class="btn sm" data-abpool="up" data-id="'+x.id+'"'+(i?'':' disabled')+' aria-label="Move up">↑</button> <button class="btn sm" data-abpool="down" data-id="'+x.id+'"'+(i<pool.length-1?'':' disabled')+' aria-label="Move down">↓</button></td></tr>'; }).join('');
  var html='<div class="crumbs"><button data-go="masters">Masters</button>'+ic('chevright','ic14')+'<b>ABM assignment</b></div>'+
    '<div class="hdrow"><div><div class="h1">ABM assignment</div><div class="sub">Who becomes a customer’s ABM. It runs at Payment Completed, with the RM, once per company — the ABM stays for the customer’s lifetime. Separate from sales lead assignment and RM allocation.</div></div></div>'+diamonds()+
    '<div class="card pad"><div class="h4">The rule</div><ol class="ul mt8" style="padding-left:20px">'+
      '<li><b>Sourced by ABM</b> — if an ABM handed the customer off, that ABM.</li>'+
      '<li><b>Round robin</b> — otherwise the next ABM executive in the pool below, in order, skipping anyone marked Out. This includes an RM’s own manual opportunity on an account with no ABM.</li>'+
      '<li><b>Existing customer</b> — already has an ABM: no new assignment, whatever the route.</li></ol>'+
      '<div class="meta mt8">The ABM Manager is never in the pool. The manager can still reassign a customer’s ABM from the account page.</div></div>'+
    '<div class="h4 mt16 mb12">Round-robin pool</div>'+
    '<section class="card" style="overflow:hidden"><div class="tw"><table class="t"><thead><tr><th class="num">Order</th><th>ABM executive</th><th>In pool</th><th class="num">Customers</th><th class="num">By round robin</th><th>Last assigned</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'+
    '<div class="flex wrap mt12" style="gap:10px">'+(seq.length?'<span class="meta">Next in turn: <b class="b">'+esc(seq.join(' → '))+'</b> …</span>':'<span class="red">Nobody is in the pool — customers that are not sourced by an ABM get no ABM until someone is added.</span>')+'<span class="sp"></span><button class="btn sm" data-abpool="reset">'+ic('refresh')+'Start again from the top</button></div>'+
    '<div class="mt12">'+note('neutral','In the prototype','New ABM executives join the end of the pool. Marking someone Out (on leave, at capacity) skips them without losing their place; their existing customers stay with them.','info')+'</div>';
  return {sc:'ABM assignment', ctx:pool.filter(function(x){return x.on;}).length+' in the pool', html:html, cta:''}; };
HANDLERS.push(function(t){ var x=t.closest('[data-abpool]'); if(!x) return false; if(x.disabled) return true; var k=x.dataset.abpool, pool=abPool(), i=pool.findIndex(function(p){ return p.id===x.dataset.id; }), msg='';
  var nextId=(rrNext()||{}).id;
  var ok=write(function(){
    if(k==='tog'){ pool[i].on=!pool[i].on; msg=uname(pool[i].id)+(pool[i].on?' is back in the pool':' is out of the pool — skipped until back in'); }
    if(k==='up'&&i>0){ var a=pool[i]; pool[i]=pool[i-1]; pool[i-1]=a; msg=uname(a.id)+' moved up'; }
    if(k==='down'&&i<pool.length-1){ var b=pool[i]; pool[i]=pool[i+1]; pool[i+1]=b; msg=uname(b.id)+' moved down'; }
    if(k==='reset'){ S.data.abmRR=0; msg='The next customer goes to '+((rrNext()||{}).n||'nobody'); }
    else if(nextId&&(k==='up'||k==='down')){ var ni=pool.findIndex(function(p){ return p.id===nextId; }); if(ni>=0) S.data.abmRR=ni; } },'the pool');
  if(ok){ paint(); toast('ABM assignment',msg); } return true; });
