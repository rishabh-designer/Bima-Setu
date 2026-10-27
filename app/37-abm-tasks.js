/* ==================================================================== *
 *  Pre-sales tasks for the ABM team [stated 23 Oct]
 *  The system keeps one open task per active prospect, worked out from where
 *  the prospect is. When the ABM does the thing (logs a call, books the
 *  meeting, records the outcome…) the task closes by itself and the next one
 *  opens. The ABM Manager sets the due times and turns rules on or off.
 * ==================================================================== */
function preSeedRules(){ return [
  {id:'PR-01',k:'first',when:'A prospect is added (no outreach yet)',title:'First call to {contact}',n:1,unit:'d',on:true,act:['call','Call']},
  {id:'PR-02',k:'fu',when:'Contacted at Prospect, still at Prospect (follow-up)',title:'Follow-up call to {contact}',n:2,unit:'d',on:true,act:['call','Call']},
  {id:'PR-03',k:'dnp',when:'A DNP is recorded (Not Connected, DNP 1–3)',title:'Follow-up call to {contact} · DNP {dnp}',n:1,unit:'d',on:true,act:['call','Call']},
  {id:'PR-04',k:'book',when:'Prospect reaches MQL, or a meeting needs booking at Meeting Set-up',title:'Schedule the consultation with {contact}',n:2,unit:'d',on:true,call:1},
  {id:'PR-05',k:'meet',when:'A consultation meeting is booked',title:'Consultation meeting with {contact}',at:1,on:true,call:0},
  {id:'PR-06',k:'remeet',when:'A meeting is rescheduled, or the POC did not show',title:'Rescheduled consultation meeting with {contact}',at:1,on:true,call:0},
  {id:'PR-07',k:'hand',when:'Prospect reaches Meeting Completed',title:'Hand off {customer} to Sales or an RM',n:1,unit:'d',on:true,call:0}]; }
function preRule(k){ return (S.data.prules2||[]).filter(function(r){ return r.k===k; })[0]; }
function touchesOf(p){ return p.log.filter(function(e){ return /^Outreach/.test(e.t); }); }
function wantTask(p){
  if(!active(p)||p.bucket==='tp') return null;
  var t=touchesOf(p), last=t.length?t[0].at:0;
  if(p.rp) return null;
  if(p.bucket==='nc') return {k:'dnp',key:'dnp:'+p.dnp+':'+p.enteredAt,base:p.enteredAt};
  if(p.stage==='prospect') return t.length?{k:'fu',key:'fu:'+t.length,base:last}:{k:'first',key:'first:'+p.enteredAt,base:p.enteredAt};
  if(p.stage==='mql'||(p.stage==='callsetup'&&!p.meet)) return {k:'book',key:'book:'+p.stage+':'+p.enteredAt,base:p.enteredAt};
  if(p.stage==='callsetup') return {k:p.resched.length?'remeet':'meet',key:'meet:'+p.meet.at,base:p.meet.at,at:p.meet.at};
  if(p.stage==='sal') return {k:'hand',key:'hand:'+p.enteredAt,base:p.enteredAt};
  return null; }
function preTitle(r,p){ return r.title.replace(/\{contact\}/g,p.poc1.n).replace(/\{customer\}/g,p.co).replace(/\{dnp\}/g,p.dnp); }
function preSync(){
  if(!S.data||!S.data.pros) return 0;
  if(!S.data.prules2) S.data.prules2=preSeedRules();
  if(!S.data.ptk) S.data.ptk=[];
  if(!S.data.seq.pt) S.data.seq.pt=901;
  var made=0;
  S.data.pros.forEach(function(p){
    var w=wantTask(p), r=w?preRule(w.k):null, off=false; if(r&&!r.on){ r=null; w=null; off=true; }
    var mine=S.data.ptk.filter(function(t){ return t.pro===p.id; });
    mine.forEach(function(t){ if(!t.done&&(!w||t.key!==w.key)){ t.done=1; t.doneAt=S.now; t.how=off?'Rule turned off':(p.log[0]?p.log[0].t:'Moved on'); } if(!t.done) t.owner=p.owner; });
    if(w&&!mine.some(function(t){ return t.key===w.key; })){
      var due=r.at?w.at:w.base+(r.unit==='h'?r.n*3600000:r.n*DAY);
      S.data.ptk.push({id:'TK-'+(S.data.seq.pt++),key:w.key,pro:p.id,owner:p.owner,rule:r.id,k:r.k,title:preTitle(r,p),createdAt:Math.min(w.base,S.now),dueAt:due,done:0,doneAt:0,how:''}); made++; }
  });
  return made; }
(function(){ var _save=save; save=function(){ try{ preSync(); }catch(e){} _save(); }; })();

function preTasks(u){ u=u||me(); return (S.data.ptk||[]).filter(function(t){ var p=proById(t.pro); return p&&inScope(p,u); }); }
function ptState(t){ if(t.done) return 'done'; if(t.dueAt<S.now) return 'over'; if(sameDay(t.dueAt,S.now)) return 'today'; return 'up'; }
function dueTx(t){ var s=ptState(t); return s==='over'?'Overdue':(s==='today'?'Due today':'Due '+fmtD(t.dueAt)); }
function dueTone(t){ var s=ptState(t); return s==='over'?'red':(s==='today'?'amber':'neutral'); }
function preRow(t){ var p=proById(t.pro), r=by(S.data.prules2,t.rule)||{}, can=!t.done&&canWork(p);
  return '<div><div class="bd"><b>'+esc(t.title)+'</b>'+(isMgr()?' <span class="meta">· '+esc(uname(t.owner))+'</span>':'')+
    '<div class="m">'+esc(p.co)+' · '+esc(p.poc1.n)+' · '+esc(placeName(p))+'</div>'+
    '<div class="m2">'+(t.done?chip('Done','green',true,true)+' <span class="meta">'+esc(fmt(t.doneAt))+' · '+esc(t.how||'')+'</span>':chip(dueTx(t),dueTone(t),true,true)+' '+chip(t.rule,'neutral',false,true)+' · <span class="meta">'+(r.at?'meeting at ':'due ')+esc(fmt(t.dueAt))+'</span>')+'</div></div>'+
    '<div class="rt">'+(can?(r.call!==0?'<button class="btn sm primary" data-flow="ab_call" data-id="'+p.id+'">'+ic('phone')+'Call</button>':'<button class="btn sm primary" data-tkdone="'+t.id+'">'+ic('check')+'Mark done</button>'):'')+'<button class="btn sm ghost" data-go="abpro" data-id="'+p.id+'">Open</button></div></div>'; }
HANDLERS.push(function(t){ var x=t.closest('[data-tkdone]'); if(!x) return false; var k=by(S.data.ptk,x.dataset.tkdone), p=k?proById(k.pro):null; if(k&&p&&canWork(p)&&!k.done&&(by(S.data.prules2,k.rule)||{}).call===0){ k.done=1; k.doneAt=S.now; k.how='Marked done by '+uname(S.user); logAdd(p,'Task done · '+k.title,uname(S.user),'',1); save(); paint(); toast('Task done',k.title); } return true; });
SCREENS.abtasks=function(){
  var u=me(), all=preTasks(u), open=all.filter(function(t){return !t.done;}), done=all.filter(function(t){return t.done&&t.doneAt>=S.now-7*DAY;}).sort(function(a,b){return b.doneAt-a.doneAt;});
  var g={over:[],today:[],up:[]}; open.forEach(function(t){ g[ptState(t)].push(t); });
  var f=S.ui.abptkf||'now';
  var sec=function(k,title,tone){ var ls=g[k]; if(!ls.length) return ''; return '<section class="card"><div class="cardh"><span class="t">'+esc(title)+'</span>'+chip(ls.length,tone,false,true)+'</div><div class="rowlist">'+ls.sort(function(x,y){return x.dueAt-y.dueAt;}).map(preRow).join('')+'</div></section>'; };
  var body=f==='done'?(done.length?'<section class="card"><div class="cardh"><span class="t">Done in the last 7 days</span>'+chip(done.length,'green',false,true)+'</div><div class="rowlist">'+done.map(preRow).join('')+'</div></section>':'<div class="card">'+empty('checks','Nothing done this week yet','Tasks close by themselves when you log the call, book the meeting or record the outcome.')+'</div>')
    :(open.length?sec('over','Overdue','red')+sec('today','Due today','amber')+(f==='all'?sec('up','Upcoming','neutral'):''):'<div class="card">'+empty('checks','No open tasks','New tasks appear as prospects are added and move through the stages.')+'</div>');
  if(f==='now'&&open.length&&!g.over.length&&!g.today.length) body='<div class="card">'+empty('checks','Nothing due today','See Upcoming for what is next.')+'</div>';
  var html='<div class="hdrow"><div><div class="h1">Tasks</div><div class="sub">'+(isMgr(u)?'Every ABM’s pre-sales tasks.':'Created by the system as your prospects move. Call tasks close when you log the call; meeting and hand-off tasks you mark done.')+'</div></div></div>'+
    '<div class="stat mt12"><div class="s"><div class="lbl">Overdue</div><div class="v red">'+g.over.length+'</div></div><div class="s"><div class="lbl">Due today</div><div class="v amber">'+g.today.length+'</div></div><div class="s"><div class="lbl">Upcoming</div><div class="v">'+g.up.length+'</div></div><div class="s"><div class="lbl">Done · 7 days</div><div class="v green">'+done.length+'</div></div></div>'+diamonds()+
    pills('abptkf',f,[['now','Overdue and today',g.over.length+g.today.length],['all','All open',open.length],['done','Done',done.length]])+
    '<div class="gap12 mt16">'+body+'</div>';
  return {sc:'Tasks', html:html, cta:''};
};
function preTaskCard(p){ var ts=(S.data.ptk||[]).filter(function(t){ return t.pro===p.id; }); if(!ts.length) return '';
  var o=ts.filter(function(t){return !t.done;})[0], last=ts.filter(function(t){return t.done;}).sort(function(a,b){return b.doneAt-a.doneAt;})[0];
  return zc('Task',(o?'<div class="zkv"><span>Open · '+esc(o.rule)+'</span><b>'+esc(o.title)+'</b><div class="mt8">'+chip(dueTx(o),dueTone(o),true,true)+' <span class="meta">'+esc(fmt(o.dueAt))+'</span></div>'+(canWork(p)?'<div class="flex wrap mt8">'+((by(S.data.prules2,o.rule)||{}).call!==0?'<button class="btn sm" data-flow="ab_call" data-id="'+p.id+'">'+ic('phone')+'Call</button>':'<button class="btn sm" data-tkdone="'+o.id+'">'+ic('check')+'Mark done</button>')+'</div>':'')+'</div>':'<div class="zkv"><b class="meta" style="font-weight:400">No open task</b></div>')+
    (last?'<div class="zkv"><span>Last done</span><b style="font-weight:500">'+esc(last.title)+'</b><div class="meta">'+esc(fmt(last.doneAt))+' · '+esc(last.how||'')+'</div></div>':''),
    '<button class="link" data-go="abtasks">All tasks</button>'); }

/* ---------- manager: pre-sales task rules ---------- */
SCREENS.abrules=function(){
  var u=me(); if(!isMgr(u)) return {sc:'Task rules',html:empty('lock','Only the ABM Manager edits task rules','')};
  var rs=S.data.prules2||[];
  var html='<div class="hdrow"><div><div class="h1">Task rules</div><div class="sub">Pre-sales tasks the system creates for the prospect’s ABM. One open task per prospect; it closes by itself when the ABM does it.</div></div></div>'+diamonds()+
    note('amber','Starting values','The task types follow the journey. Due times are starting values until the ABM team confirms them. '+pend('Pending ABM','The ABM team to confirm the due times and whether more task types are needed.'),'info')+
    '<div class="card mt16" style="overflow:hidden"><div class="tw"><table class="t rules"><thead><tr><th>Rule</th><th>When</th><th>Task for the ABM</th><th>Due</th><th>Closes when</th><th>Active</th><th></th></tr></thead><tbody>'+
    rs.map(function(r){ return '<tr><td class="id">'+esc(r.id)+'</td><td class="when">'+esc(r.when)+'</td><td><span class="tt">'+esc(r.title)+'</span></td><td class="due">'+(r.at?'At the meeting time':plural(r.n,r.unit==='h'?'working hour':'working day')+'<div class="sub">after it is created</div>')+'</td><td class="when">'+esc(PRE_CLOSE[r.k])+'</td><td><button class="btn xs'+(r.on?' primary':'')+'" data-prtog="'+r.id+'">'+(r.on?'On':'Off')+'</button></td><td>'+(r.at?'':'<button class="btn sm" data-flow="ab_preRuleEdit" data-id="'+r.id+'">Edit</button>')+'</td></tr>'; }).join('')+'</tbody></table></div></div>'+
    '<div class="mt12 meta">{contact} and {customer} are filled in from the prospect when the task is created.</div>';
  return {sc:'Task rules', html:html, cta:''};
};
var PRE_CLOSE={first:'Any outreach is logged (call, email, log outreach)',fu:'The next outreach is logged',dnp:'The next attempt is logged, or it reaches DNP 4',book:'The meeting is booked',meet:'The meeting outcome is recorded',remeet:'The meeting outcome is recorded',hand:'The prospect is handed off'};
HANDLERS.push(function(t){ var x=t.closest('[data-prtog]'); if(!x) return false; var r=by(S.data.prules2,x.dataset.prtog); r.on=!r.on; save(); paint(); toast(r.id+(r.on?' is on':' is off'),r.on?'Tasks are created again for prospects at this point.':'Open tasks from this rule are closed.'); return true; });
FLOWS.ab_preRuleEdit={t:function(){ return 'Edit '+S.sel.id; }, sub:function(){ var r=by(S.data.prules2,S.sel.id); return r?r.title:''; },
  body:function(){ var r=by(S.data.prules2,S.sel.id); if(S.sel._i===undefined){ S.sel._i=1; S.sel.n=String(r.n); S.sel.unit=r.unit; }
    return '<div class="fgrid">'+field('Due after',input('n',S.sel.n,'1','inputmode="numeric"'))+field('Unit',select('unit',S.sel.unit,[['h','Working hours'],['d','Working days']]))+'</div>'+note('neutral','','Applies to tasks created from now on. Open tasks keep their due time.','info'); },
  can:function(){ return +S.sel.n>0; }, ok:'Save rule',
  run:function(){ var r=by(S.data.prules2,S.sel.id); r.n=+S.sel.n; r.unit=S.sel.unit; toast(r.id+' saved','Due '+plural(r.n,r.unit==='h'?'working hour':'working day')+' after it is created.'); }};

/* ---------- homepage task card — same as the BimaSetu sales executive home ---------- */
function lateTx(t){ var h=Math.round((S.now-t.dueAt)/3600000); if(h<1) return 'Overdue'; if(h<24) return 'Overdue by '+plural(h,'hour'); return 'Overdue by '+plural(Math.round(h/24),'day'); }
function hPreRow(t){ var p=proById(t.pro), r=by(S.data.prules2,t.rule)||{}, st=ptState(t), can=canWork(p);
  var state=st==='over'?chip(lateTx(t),'red',true,true):chip('Pending · due '+fmt(t.dueAt).replace(/^today, /,''),'amber',true,true);
  return '<div class="hrow row" data-go="abpro" data-id="'+p.id+'"><div class="bd"><div class="tt">'+esc(t.title)+' <span class="pr">· '+esc(p.co)+' · '+esc(p.id)+'</span></div><div class="mt">'+state+'<span>'+esc(p.poc1.n)+' '+esc(p.poc1.m)+'</span>'+(isMgr()?'<span>'+esc(uname(t.owner))+'</span>':'<span>'+esc(placeName(p))+'</span>')+'</div></div>'+
    '<div class="rt">'+(can?(r.call!==0?'<button class="done" data-flow="ab_call" data-id="'+p.id+'">'+ic('phone')+'Call Now</button>':'<button class="done" data-tkdone="'+t.id+'">'+ic('check')+'Mark done</button>'):ic('chevright'))+'</div></div>'; }
function hPreTaskCard(u){ var over=[], today=[]; preTasks(u).forEach(function(t){ if(t.done) return; var s=ptState(t); if(s==='over') over.push(t); else if(s==='today') today.push(t); });
  var byDue=function(x,y){ return x.dueAt-y.dueAt; }; over.sort(byDue); today.sort(byDue);
  var tab=S.ui.abhptab||'today'; if(tab==='today'&&!today.length&&over.length) tab='over';
  return hCard('ptasks',tab==='over'?'red':'amber','checks','Tasks',(tab==='over'?over:today).map(hPreRow),
    hSeg('abhptab',tab,[['today','Due today',today.length],['over','Overdue',over.length,'red']]),
    tab==='over'?'Nothing overdue.':'Nothing due today.'); }
HANDLERS.push(function(t){ var x=t.closest('.hrow [data-flow="ab_call"]'); if(!x) return false; openFlow('ab_call',{id:x.dataset.id}); return true; });
/* ---------- handoff: one opportunity per product, owner per opportunity ---------- */
function ownerSel(key,val){ var s=sellers(); return '<select class="sel" id="f_'+key+'" data-f="'+key+'"><option value="">Pick an owner</option><optgroup label="Sales">'+s.filter(function(x){return x.role==='exec';}).map(function(x){ return '<option value="'+x.id+'"'+(val===x.id?' selected':'')+'>'+esc(x.n)+'</option>'; }).join('')+'</optgroup><optgroup label="Relationship managers">'+s.filter(function(x){return x.role==='rm';}).map(function(x){ return '<option value="'+x.id+'"'+(val===x.id?' selected':'')+'>'+esc(x.n)+'</option>'; }).join('')+'</optgroup></select>'; }
FLOWS.ab_handoff={t:'Hand off to Sales or RM', wide:true, sub:function(){ var p=cur(); return p?p.co+' · one opportunity is created for each product':''; },
  body:function(){ var p=cur();
    if(S.sel._i===undefined){ S.sel._i=1; S.sel.pn=p.poc1.n; S.sel.pm=p.poc1.m; S.sel.pe=p.poc1.e; S.sel.mom=p.mom; S.sel.prods=p.prod?[p.prod]:[]; S.sel.c2=p.poc2?'1':''; if(p.prod&&p.renew) S.sel['r_'+PRODUCTS.indexOf(p.prod)]=ymd(p.renew); }
    var prods=S.sel.prods||[];
    var h='<div class="lbl" style="font-weight:650;color:var(--ink)">Point of contact on the opportunities</div><div class="fgrid three">'+
      field('POC name',input('pn',S.sel.pn))+field('POC contact number',input('pm',S.sel.pm,'','inputmode="numeric"'),'',S.sel.pm&&!mobOk(S.sel.pm)?'Enter a 10-digit mobile number':'')+field('POC email ID',input('pe',S.sel.pe,'name@company.com'),'',!mailOk(S.sel.pe)?'Mandatory at handoff':'')+'</div>'+
      (p.poc2?'<label class="cbx"><input type="checkbox" class="chk" data-ck="c2"'+(S.sel.c2?' checked':'')+'><span>Also add <b>'+esc(p.poc2.n)+'</b> (secondary POC) as a second contact '+pend('Pending ABM','Whether the secondary POC carries over is open point 5.')+'</span></label>':'')+
      field('Products the customer wants','<div class="chips">'+PRODUCTS.map(function(x){ return '<button type="button" data-tog="prods" data-tv="'+esc(x)+'"'+(prods.indexOf(x)>=0?' class="on"':'')+'>'+esc(x)+'</button>'; }).join('')+'</div>',prods.length>1?plural(prods.length,'opportunity')+' will be created on '+esc(p.co)+', each with its own owner.':'Pick one or more. Each becomes its own opportunity.');
    var ex=acctOfCo(p.co); if(ex) prods.forEach(function(x){ S.sel['o_'+PRODUCTS.indexOf(x)]=ex.own; });
    h+=(ex?note('violet','Existing customer','<b>'+esc(p.co)+'</b> is already a customer. Every opportunity goes to its RM, <b>'+esc(uname(ex.own))+'</b>, with <b>'+esc(uname(ex.abm))+'</b> as ABM.','info'):'');
    h+=prods.map(function(x){ var i=PRODUCTS.indexOf(x), doc=S.sel['doc_'+i];
      return '<div class="prodrow"><div class="ph">'+ic('file','ic16')+'<b>'+esc(x)+'</b><span class="sp"></span>'+chip('New Lead','neutral',true,true)+'</div><div class="fgrid">'+
        field('Owner',ex?'<div class="rfro">'+esc(uname(ex.own))+' <span class="meta">· RM of this customer</span></div>':ownerSel('o_'+i,S.sel['o_'+i]||''))+field('Renewal date of the existing policy',dateIn('r_'+i,S.sel['r_'+i]||''))+'</div>'+
        '<div class="mt8">'+field('Existing policy document','<div class="filepick'+(doc?' on':'')+'">'+ic(doc?'circlecheck':'upload','ic16')+'<span class="sp" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(doc||'No file chosen')+'</span>'+
          '<input type="file" id="fdoc_'+i+'" data-docfor="'+i+'" accept=".pdf,.jpg,.jpeg,.png" hidden><button type="button" class="btn sm" data-pickdoc="'+i+'">'+(doc?'Change':'Choose file')+'</button>'+(doc?'':'<button type="button" class="btn ghost sm" data-sampledoc="'+i+'">Use a sample</button>')+'</div>','Goes to this opportunity’s owner.')+'</div></div>'; }).join('');
    h+=field('Meeting notes shared with the owners','<textarea class="inp" id="f_mom" data-f="mom" style="min-height:80px">'+esc(S.sel.mom||'')+'</textarea>');
    return h+note('neutral','','The company is matched against existing customers in BimaSetu. Each opportunity starts at <b>New Lead</b> with its owner, and stores “Sourced by ABM: '+esc(uname(p.owner))+'”. An opportunity given to an RM stays with the RM through payment.','info'); },
  can:function(){ var prods=S.sel.prods||[]; if(!prods.length||!(S.sel.pn||'').trim()||!mobOk(S.sel.pm)||!mailOk(S.sel.pe)) return false; return prods.every(function(x){ return !!S.sel['o_'+PRODUCTS.indexOf(x)]; }); },
  ok:function(){ var n=(S.sel.prods||[]).length; return n>1?'Create '+n+' opportunities':'Hand off'; },
  run:function(){ var p=cur(), u=me(), opps=(S.sel.prods||[]).map(function(x){ var i=PRODUCTS.indexOf(x); return {id:'OP-'+(S.data.seq.op++),prod:x,owner:S.sel['o_'+i],renew:dParse(S.sel['r_'+i]),doc:S.sel['doc_'+i]||'',stage:'New Lead'}; });
    p.mom=(S.sel.mom||'').trim();
    p.handoff={at:S.now,by:u.id,opps:opps,poc:{n:S.sel.pn.trim(),m:S.sel.pm,e:S.sel.pe.trim()},poc2:S.sel.c2&&p.poc2?p.poc2:null};
    logAdd(p,'Handed off to Sales / RM',opps.map(function(o){ return o.id+' '+o.prod+' → '+uname(o.owner); }).join(' · '),'',1); moveTo(p,'handed');
    S.ui['abptab_'+p.id]='handoff'; toast(plural(opps.length,'opportunity')+' created','Each is at New Lead with its owner in BimaSetu.'); }};

/* ---------- bulk upload ---------- */
var TPL=['Company name','POC name','POC number','POC designation','POC email','Secondary POC name','Secondary POC number','Data source','Renewal date','Industry','Product name','Owner'];
var SAMPLE='Company name,POC name,POC number,POC designation,POC email,Secondary POC name,Secondary POC number,Data source,Renewal date,Industry,Product name,Owner\n'+
 'Ambika Packaging Pvt Ltd,Suresh Menon,9845012345,Director,suresh@ambikapack.in,,,Event,2027-02-28,Manufacturing,Fire & Special Perils,Arjun Mehta\n'+
 'Northstar Logistics,Gurpreet Singh,9815023456,Fleet head,,,,Database purchase,,Logistics,Marine Cargo,Sneha Kapoor\n'+
 'Kaveri Hospitality,,9886034567,GM,,,,Referral,,Other,Group Health,Rahul Bhatt\n'+
 'Silverline Infotech,Neha Batra,98110,CTO,neha@silverline.io,,,LinkedIn,,IT / ITES,Cyber Liability,Arjun Mehta\n'+
 'Prakash Engineering Works,Mohan Prakash,9822045678,Owner,,Lata Prakash,9822045679,Cold outreach,15-01-2027,Manufacturing,Workmen’s Compensation,Rahul Bhatt\n'+
 'Ganga Agro Exports,Vijay Yadav,9935056789,Partner,vijay@gangaagro.com,,,Website,,Other,Marine Cargo,Sneha Kapoor';
function csvParse(tx){ var rows=[], row=[], f='', q=false; tx=String(tx).replace(/\r/g,'');
  for(var i=0;i<tx.length;i++){ var c=tx[i]; if(q){ if(c==='"'){ if(tx[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=c; }
    else if(c==='"') q=true; else if(c===','){ row.push(f); f=''; } else if(c==='\n'){ row.push(f); rows.push(row); row=[]; f=''; } else f+=c; }
  if(f!==''||row.length){ row.push(f); rows.push(row); } return rows.filter(function(r){ return r.some(function(x){ return String(x).trim(); }); }); }
function ownerOf(s){ s=String(s||'').trim().toLowerCase(); if(!s) return null; var hit=null; abmUsers().forEach(function(x){ if(x.n.toLowerCase()===s||x.id===s||x.n.split(' ')[0].toLowerCase()===s) hit=x; }); return hit; }
function validate(tx){ var u=me(), rows=csvParse(tx); if(!rows.length) return {ok:[],bad:[],err:'The file is empty.'};
  var hd=rows[0].map(function(x){ return x.trim().toLowerCase(); }), col=function(n){ return hd.indexOf(n.toLowerCase()); };
  if(col('Company name')<0||col('POC name')<0||col('POC number')<0) return {ok:[],bad:[],err:'The header row must match the template. Company name, POC name and POC number are missing.'};
  var ok=[], bad=[];
  rows.slice(1).forEach(function(r,i){ var g=function(n){ var k=col(n); return k<0?'':String(r[k]||'').trim(); }, errs=[];
    if(!g('Company name')) errs.push('Company name is missing'); if(!g('POC name')) errs.push('POC name is missing');
    if(!g('POC number')) errs.push('POC number is missing'); else if(!mobOk(g('POC number'))) errs.push('POC number is not a 10-digit mobile');
    if(g('POC email')&&!mailOk(g('POC email'))) errs.push('POC email is not valid');
    if(g('Secondary POC number')&&!mobOk(g('Secondary POC number'))) errs.push('Secondary POC number is not a 10-digit mobile');
    if(g('Data source')&&SOURCES.indexOf(g('Data source'))<0) errs.push('Data source is not on the list');
    if(g('Industry')&&INDUSTRIES.indexOf(g('Industry'))<0) errs.push('Industry is not on the list');
    if(g('Product name')&&PRODUCTS.indexOf(g('Product name').replace("'",'’'))<0) errs.push('Product is not on the BimaSetu list');
    if(g('Renewal date')&&!dParse(g('Renewal date'))) errs.push('Renewal date should be YYYY-MM-DD or DD-MM-YYYY');
    var own=u.id; if(isMgr(u)){ var o=ownerOf(g('Owner')); if(!g('Owner')) errs.push('Owner is missing'); else if(!o) errs.push('Owner is not an ABM user'); else own=o.id; }
    var dh=g('Company name')?abmOfCo(g('Company name')):null; if(dh&&dh.id&&dh.id!==own) errs.push('Company already with '+uname(dh.id)+' (one ABM per company)');
    var rec={n:i+2,co:g('Company name'),pn:g('POC name'),pm:g('POC number'),pd:g('POC designation'),pe:g('POC email'),sn:g('Secondary POC name'),sm:g('Secondary POC number'),src:g('Data source'),ren:g('Renewal date'),ind:g('Industry'),prod:g('Product name').replace("'",'’'),own:own,ownTx:g('Owner')};
    if(errs.length) bad.push({r:rec,e:errs.join(' · ')}); else ok.push(rec); });
  return {ok:ok,bad:bad,err:''}; }
FLOWS.ab_bulk={t:'Bulk upload prospects', wide:true, sub:function(){ return isMgr()?'One row per prospect. The Owner column assigns each row to an ABM user.':'One row per prospect. Every row you upload is yours.'; },
  body:function(){ var res=S.sel.res;
    if(!res) return '<div class="lbl" style="font-weight:650;color:var(--ink)">1 · Use the template</div><div class="mt8" style="border:1px solid var(--border);border-radius:12px;overflow:hidden"><div class="tw"><table class="t tpl"><thead><tr>'+TPL.map(function(c){ return '<th>'+esc(c)+(/^(Company name|POC name|POC number)$/.test(c)||(c==='Owner'&&isMgr())?' *':'')+'</th>'; }).join('')+'</tr></thead><tbody><tr>'+csvParse(SAMPLE)[1].map(function(c){ return '<td>'+esc(c||'—')+'</td>'; }).join('')+'</tr></tbody></table></div></div>'+
      '<div class="hint mt8">CSV or Excel saved as CSV. * mandatory. '+(isMgr()?'Owner is an ABM user’s name.':'The Owner column is ignored on your uploads; you own every row.')+' Renewal date as YYYY-MM-DD or DD-MM-YYYY.</div>'+
      '<div class="lbl mt12" style="font-weight:650;color:var(--ink)">2 · Upload the filled file</div><div class="pdrop mt8" data-pickcsv="1">'+ic('upload','ic22')+'<b>Choose a CSV file</b><span>Valid rows are added; rows that fail come back in an error file.</span></div><input type="file" id="fcsv" accept=".csv,text/csv" hidden>'+
      (S.sel.err?'<div class="err mt8">'+esc(S.sel.err)+'</div>':'')+
      '<div class="mt12">'+simblock('Simulate the upload','Uses a sample file of 6 rows: 4 are valid and 2 have errors.',simbtn('Upload the sample file','data-samplecsv="1"'))+'</div>';
    return '<div class="stat"><div class="s"><div class="lbl">Ready to add</div><div class="v green">'+res.ok.length+'</div></div><div class="s"><div class="lbl">Failed</div><div class="v red">'+res.bad.length+'</div></div><div class="s"><div class="lbl">File</div><div class="v" style="font-size:var(--fs-md);padding-top:10px">'+esc(S.sel.fname||'')+'</div></div></div>'+
      (res.ok.length?'<div class="lbl mt12">Will be added to Prospect</div><div class="rowlist mt8" style="border:1px solid var(--border);border-radius:12px">'+res.ok.map(function(r){ return '<div><div class="bd"><b>'+esc(r.co)+'</b><div class="m">'+esc(r.pn)+' · '+esc(r.pm)+(r.prod?' · '+esc(r.prod):'')+'</div></div><div class="rt">'+chip(uname(r.own),'neutral',false,true)+'</div></div>'; }).join('')+'</div>':'')+
      (res.bad.length?'<div class="lbl mt12">Error file · fix these rows and upload them again</div><div class="mt8" style="border:1px solid var(--redLine);border-radius:12px;overflow:hidden"><div class="tw"><table class="t tpl"><thead><tr><th>Row</th><th>Company name</th><th>POC name</th><th>POC number</th><th>Error</th></tr></thead><tbody>'+res.bad.map(function(b){ return '<tr><td>'+b.r.n+'</td><td>'+esc(b.r.co||'—')+'</td><td>'+esc(b.r.pn||'—')+'</td><td>'+esc(b.r.pm||'—')+'</td><td class="red">'+esc(b.e)+'</td></tr>'; }).join('')+'</tbody></table></div></div>':'')+
      '<div class="mt8"><button class="btn ghost sm" data-csvagain="1">'+ic('refresh')+'Upload a different file</button></div>'; },
  can:function(){ return !!(S.sel.res&&S.sel.res.ok.length); }, ok:function(){ return S.sel.res?'Add '+plural(S.sel.res.ok.length,'prospect'):'Add prospects'; },
  run:function(){ var u=me(), n=0; S.sel.res.ok.forEach(function(r){ var id='PR-'+(S.data.seq.pr++);
      var p=P({id:id,co:r.co,ind:r.ind,src:r.src,prod:r.prod,renew:dParse(r.ren),owner:r.own,by:u.id,createdAt:S.now,enteredAt:S.now,via:'Bulk upload',poc1:{n:r.pn,m:r.pm,d:r.pd,e:r.pe},poc2:r.sn?{n:r.sn,m:r.sm,d:'',e:''}:null});
      p.log.unshift({at:S.now,t:'Prospect added',m:'Bulk upload · '+u.n+' · '+(S.sel.fname||'file'),x:'',sys:1}); S.data.pros.unshift(p); n++; });
    S.ui.abpf='prospect'; toast(plural(n,'prospect')+' added',(S.sel.res.bad.length?plural(S.sel.res.bad.length,'row')+' failed; they are in the error file.':'Every row was valid.')); go('abpros',null); return 'stay'; }};
HANDLERS.push(function(t){
  if(t.closest('[data-pickcsv]')){ var f=document.getElementById('fcsv'); if(f) f.click(); return true; }
  if(t.closest('[data-samplecsv]')){ S.sel.fname='abm_prospects_sample.csv'; var r=validate(SAMPLE); S.sel.res=r.err?null:r; S.sel.err=r.err; paintModal(); return true; }
  if(t.closest('[data-csvagain]')){ S.sel.res=null; S.sel.err=''; paintModal(); return true; }
  var x=t.closest('[data-pickdoc]'); if(x){ var d=document.getElementById('fdoc_'+x.dataset.pickdoc); if(d) d.click(); return true; }
  x=t.closest('[data-sampledoc]'); if(x){ var p=cur(); S.sel['doc_'+x.dataset.sampledoc]=(p?p.co.split(' ')[0]:'Existing')+'_'+PRODUCTS[+x.dataset.sampledoc].split(' ')[0].replace(/[^A-Za-z]/g,'')+'_policy_2026.pdf'; paintModal(); return true; }
  return false; });
document.addEventListener('change',function(e){ var t=e.target; if(!(t instanceof Element)) return;
  if(t.id==='fcsv'&&t.files&&t.files[0]){ var file=t.files[0], rd=new FileReader(); rd.onload=function(){ S.sel.fname=file.name; var r=validate(rd.result); S.sel.res=r.err?null:r; S.sel.err=r.err; paintModal(); }; rd.readAsText(file); return; }
  if(t.dataset&&t.dataset.docfor!==undefined&&t.files&&t.files[0]){ S.sel['doc_'+t.dataset.docfor]=t.files[0].name; paintModal(); return; }
  if(t.dataset&&t.dataset.ck!==undefined){ S.sel[t.dataset.ck]=t.checked?'1':''; return; }
});
