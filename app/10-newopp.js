/* ==================================================================== *
 *  Create opportunity — spec 10 v3: one global button, always blank,
 *  PAN/GSTIN first, match on PAN/GSTIN only, name auto-filled and locked
 *  on a match, no PAN → provisional account, no warnings at creation.
 * ==================================================================== */
var PAN_RE=/^[A-Z]{5}[0-9]{4}[A-Z]$/, GST_RE=/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
function noVal(k){ return (S.sel[k]||'').trim(); }
function matchAcct(pan,gst){
  pan=(pan||'').toUpperCase(); gst=(gst||'').toUpperCase();
  if(gst.length===15){ var g=S.data.accounts.filter(function(a){return a.gst&&a.gst.toUpperCase()===gst;})[0]; if(g) return {a:g,how:'GSTIN'}; }
  if(PAN_RE.test(pan)){ var ps=S.data.accounts.filter(function(a){return a.pan&&a.pan.toUpperCase()===pan;}); if(ps.length===1) return {a:ps[0],how:'PAN'}; if(ps.length>1) return gst.length===15?null:{a:null,many:ps}; }
  return null;
}
function newOppErr(){
  var e={}, pan=noVal('pan').toUpperCase(), gst=noVal('gst').toUpperCase(), m=noVal('m').replace(/[\s\-]/g,''), em=noVal('e');
  if(pan&&!PAN_RE.test(pan)) e.pan='Five letters, four digits, one letter — e.g. AABCS1234F.';
  if(gst&&!GST_RE.test(gst)) e.gst='15 characters: 2-digit state code, the PAN, then 3 more.';
  if(!e.gst&&gst&&pan&&gst.slice(2,12)!==pan) e.gst='The PAN inside this GSTIN is '+gst.slice(2,12)+' — it does not match the PAN above.';
  if(m&&!/^(\+91)?[6-9]\d{9}$/.test(m)) e.m='An Indian mobile: 10 digits, optionally +91.';
  if(em&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) e.e='Not an email address.';
  return e;
}
function newOppState(){ var e=newOppErr(), pan=noVal('pan').toUpperCase(), gst=noVal('gst').toUpperCase(), m=(e.pan||e.gst)?null:matchAcct(pan,gst), locked=!!(m&&m.a);
  return {e:e, m:m, locked:locked, name:locked?m.a.n:'', gstHint:(m&&m.many)?'Two registrations share this PAN — the GSTIN picks one.':'', nameHint:locked?'Matched on '+m.how+' · '+m.a.id+(m.a.prov?' · provisional':''):((pan||gst)&&!e.pan&&!e.gst&&!(m&&m.many)?'No account carries this yet — one will be created.':'')}; }
FLOWS.newOpp={t:'New opportunity', sub:'PAN or GSTIN first. If the company is already here, its name fills itself; if not, a provisional account is created with the opportunity.', wide:true,
  repaintOn:['product','src'],
  nofoot:function(){ return !!S.sel.done; },
  body:function(){
    if(S.sel.done){ var d=S.sel.done, a=by(S.data.accounts,d.acct), l=lineById(d.line);
      return note('green','Created','<b>'+esc(a.n)+'</b> · '+esc(l.product)+' · '+esc(l.id)+' at New Lead, yours.'+(d.newAcct?' A '+(a.prov?'provisional':'new')+' account was created with it.':' Matched the existing account by '+esc(d.how)+'.')+(d.made?' The new-lead rule set a task due '+esc(fmt(d.made))+'.':''),'circlecheck')+
        '<div class="flex wrap mt12"><button class="btn primary" data-go="line" data-id="'+l.id+'">Open the product line</button><button class="btn" data-go="acct" data-id="'+a.id+'">Open the account</button><button class="btn ghost" data-close="1">Close</button></div>';
    }
    var st=newOppState();
    return '<div class="fgrid"><label class="field"><div class="lbl">PAN</div>'+input('pan',S.sel.pan,'AABCS1234F','style="text-transform:uppercase"')+'<div class="err" id="e_pan">'+esc(st.e.pan||'')+'</div></label>'+
      '<label class="field"><div class="lbl">GSTIN</div>'+input('gst',S.sel.gst,'27AABCS1234F1Z5','style="text-transform:uppercase"')+'<div class="err" id="e_gst">'+esc(st.e.gst||'')+'</div><div class="hint" id="h_gst">'+esc(st.gstHint)+'</div></label></div>'+
      '<label class="field"><div class="lbl">Company name</div>'+input('name',st.locked?st.name:(S.sel.name||''),'Legal name as on the PAN card',st.locked?'disabled':'')+'<div class="hint" id="h_name">'+esc(st.nameHint)+'</div></label>'+
      '<div class="fgrid">'+field('Contact name',input('cn',S.sel.cn,'Who you are speaking to'))+field('Designation',input('cd',S.sel.cd,'CFO'))+'</div>'+
      '<div class="fgrid">'+field('Mobile',input('m',S.sel.m,'+91 98xxx xxxxx'),'',st.e.m)+field('Email',input('e',S.sel.e,'name@company.in'),'',st.e.e)+'</div>'+
      '<div class="fgrid">'+field('Product',select('product',S.sel.product||'',[['','Choose a product']].concat(PRODUCTS)))+field('Source',select('src',S.sel.src||'',[['','Choose a source']].concat(SRCS)))+'</div>'+
      '<div class="fgrid"><div class="field"><div class="lbl">Business type</div>'+seg('bt',[['fresh','Fresh'],['roll','Market rollover']],'')+'</div>'+field('Type','<input class="inp" value="New Business" disabled>')+'</div>';
  },
  live:function(){ var st=newOppState(), g=function(id){return document.getElementById(id);}, n=g('f_name');
    if(n){ n.disabled=st.locked; if(st.locked) n.value=st.name; else if(S.sel.wasLocked) n.value=S.sel.name||''; S.sel.wasLocked=st.locked; }
    if(g('e_pan')) g('e_pan').textContent=st.e.pan||''; if(g('e_gst')) g('e_gst').textContent=st.e.gst||''; if(g('h_gst')) g('h_gst').textContent=st.gstHint; if(g('h_name')) g('h_name').textContent=st.nameHint;
    var fm=g('f_m'), fe=g('f_e'); [[fm,st.e.m],[fe,st.e.e]].forEach(function(x){ if(!x[0]) return; var lab=x[0].closest('.field'); if(!lab) return; var er=lab.querySelector('.err'); if(x[1]){ if(!er){ er=document.createElement('div'); er.className='err'; lab.appendChild(er); } er.textContent=x[1]; } else if(er) er.remove(); }); },
  can:function(){ if(S.sel.done) return false; var e=newOppErr(); if(Object.keys(e).length) return false; var pan=noVal('pan').toUpperCase(), gst=noVal('gst').toUpperCase(), m=matchAcct(pan,gst);
    if(m&&m.many) return false; var name=(m&&m.a)?m.a.n:noVal('name'); return !!name&&!!noVal('cn')&&(!!noVal('m')||!!noVal('e'))&&!!S.sel.product&&!!S.sel.src&&!!S.sel.bt; },
  ok:'Create opportunity',
  run:function(){ var pan=noVal('pan').toUpperCase(), gst=noVal('gst').toUpperCase(), m=matchAcct(pan,gst), a=m&&m.a?m.a:null, newAcct=!a, res={};
    var ok=write(function(){
      if(!a){ a={id:'A-'+(S.data.seq.acct++),n:noVal('name'),pan:pan,gst:gst,city:'',st:gst?({'27':'Maharashtra','24':'Gujarat','29':'Karnataka','33':'Tamil Nadu','32':'Kerala','03':'Punjab','07':'Delhi','36':'Telangana'}[gst.slice(0,2)]||''):'',ind:'',emp:'',to:'',grp:'—',own:S.user,prov:(pan&&gst)?0:1,con:[],pols:[],recs:[],prof:null,fin:null,sis:[],createdAt:S.now}; S.data.accounts.push(a); }
      var c=a.con.filter(function(x){return x.n.toLowerCase()===noVal('cn').toLowerCase();})[0];
      if(!c){ c={n:noVal('cn'),d:noVal('cd'),m:noVal('m'),e:noVal('e'),dm:a.con.length?0:1}; a.con.push(c); }
      var o={id:'O-'+(S.data.seq.opp++),acct:a.id,name:shortName(a.n)+' — New Business — '+MONN[NOW().getMonth()]+' '+NOW().getFullYear(),type:'New Business',bt:BTYPE[S.sel.bt],src:S.sel.src,created:S.now,by:S.user}; S.data.opps.push(o);
      var l={id:'OP-'+(S.data.seq.line++),opp:o.id,acct:a.id,product:S.sel.product,owner:S.user,stage:1,status:'open',reason:'',revisit:0,att:0,rate:null,rfq:{st:'none',src:'',at:0},req:null,round:1,qAns:0,obj:'',qsel:[],picked:'',prem:0,ins:'',pay:'pre',amt:0,payLines:[],enteredAt:S.now,createdAt:S.now,assignedAt:S.now,src:S.sel.src,contact:{n:c.n,e:c.e||'',m:c.m||''},log:[{at:S.now,t:'Product line created',m:uname(S.user)+' · New opportunity',sys:0,kind:'sys'}]};
      S.data.lines.push(l); var made=fireRules(l,'stage',1);
      res={acct:a.id,opp:o.id,line:l.id,newAcct:newAcct,how:m?m.how:'',made:made[0]?made[0].dueAt:0};
    },'the opportunity');
    if(!ok) return 'fail'; S.sel={done:res}; paint(); toast('Opportunity created',res.newAcct?'Account, opportunity and first product line — all yours.':'On the existing account. The line is yours.'); return 'stay'; }};

/* ---------- simulated inbound enquiries (amber dashed, home) ---------- */
var INBOUND={
 fire:  {n:'Lakshmi Polymers Pvt Ltd', pan:'AAECL8812K', gst:'27AAECL8812K1Z2', city:'Aurangabad', st:'Maharashtra', ind:'Plastics', product:'Fire & Special Perils', con:{n:'Girish Lakshmi',d:'Director',m:'+91 98600 41122',e:'girish@lakshmipoly.in'}, src:'Inbound — website'},
 marine:{n:'Coastal Exports LLP', pan:'', gst:'', city:'Mangaluru', st:'Karnataka', ind:'Seafood exports', product:'Marine Cargo', con:{n:'Fathima Sheikh',d:'Partner',m:'+91 98440 20311',e:'fathima@coastalexports.in'}, src:'Inbound — website'},
 gh:    {n:'Zenith Software Labs Pvt Ltd', pan:'AAACZ3301P', gst:'29AAACZ3301P1ZK', city:'Bengaluru', st:'Karnataka', ind:'Software', product:'Group Health', con:{n:'Neha Reddy',d:'HR Head',m:'+91 98860 77015',e:'neha@zenithlabs.in'}, src:'Inbound — partner'}
};
HANDLERS.push(function(t){
  var x=t.closest('[data-inbound]'); if(!x) return false;
  var k=INBOUND[x.dataset.inbound]; if(!k) return true;
  var owner=assignFor(k.product), res={};
  var ok=write(function(){
    var m=matchAcct(k.pan,k.gst), a=m&&m.a?m.a:null, newAcct=!a;
    if(!a){ a={id:'A-'+(S.data.seq.acct++),n:k.n,pan:k.pan,gst:k.gst,city:k.city,st:k.st,ind:k.ind,emp:'',to:'',grp:'—',own:owner,prov:(k.pan&&k.gst)?0:1,con:[Object.assign({dm:1},k.con)],pols:[],recs:[],prof:null,fin:null,sis:[],createdAt:S.now}; S.data.accounts.push(a); }
    var o={id:'O-'+(S.data.seq.opp++),acct:a.id,name:shortName(a.n)+' — New Business — '+MONN[NOW().getMonth()]+' '+NOW().getFullYear(),type:'New Business',bt:'Fresh',src:k.src,created:S.now,by:'system'}; S.data.opps.push(o);
    var l={id:'OP-'+(S.data.seq.line++),opp:o.id,acct:a.id,product:k.product,owner:owner,stage:1,status:'open',reason:'',revisit:0,att:0,rate:null,rfq:{st:'none',src:'',at:0},req:null,round:1,qAns:0,obj:'',qsel:[],picked:'',prem:0,ins:'',pay:'pre',amt:0,payLines:[],enteredAt:S.now,createdAt:S.now,assignedAt:S.now,src:k.src,contact:{n:k.con.n,e:k.con.e,m:k.con.m},log:[{at:S.now,t:'Product line created',m:'System · '+k.src+' · assigned to '+uname(owner)+' by the '+(CATOF[k.product])+' rule',sys:1,kind:'sys'}]};
    S.data.lines.push(l); fireRules(l,'stage',1); res={line:l.id,acct:a.id,newAcct:newAcct};
  },'the inbound enquiry');
  if(!ok) return true;
  paint();
  var mine=owner===S.user;
  toast('Inbound enquiry — '+k.product+(res.newAcct?'':' · existing account matched by PAN'), mine?'Assigned to you: least loaded in '+CATOF[k.product]+'. It is in Newly assigned.':'Assigned to '+uname(owner)+' — least loaded in '+CATOF[k.product]+'. It is not yours, so it is not on your home.');
  return true;
});
