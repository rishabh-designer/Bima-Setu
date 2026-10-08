/* ==================================================================== *
 *  Create opportunity — spec 10 v3: one global button, always blank,
 *  PAN/GSTIN first, match on PAN/GSTIN only, name auto-filled and locked
 *  on a match, no PAN → provisional account, no warnings at creation.
 * ==================================================================== */
var PAN_RE=/^[A-Z]{5}[0-9]{4}[A-Z]$/, GST_RE=/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
function noVal(k){ return (S.sel[k]||'').trim(); }
/* [stated 26 Sep · 1.4] the GSTIN is the only match key. The PAN is characters 3–12 of it — derived, never typed,
   and a GSTIN belongs to exactly one account, so a match is never ambiguous. There is no name matching at all. */
function panOfGst(g){ g=String(g||'').toUpperCase(); return g.length===15?g.slice(2,12):''; }
function gstErr(g){ g=String(g||'').trim().toUpperCase(); if(!g) return ''; if(g.length!==15) return 'A GSTIN is fifteen characters.'; if(!PAN_RE.test(g.slice(2,12))||!GST_RE.test(g)) return 'This GSTIN is not valid.'; return ''; }
function matchAcct(pan,gst){
  gst=(gst||'').toUpperCase(); if(gst.length!==15||gstErr(gst)) return null;
  var g=S.data.accounts.filter(function(a){return !a.merged&&a.gst&&a.gst.toUpperCase()===gst;})[0];
  return g?{a:g,how:'GSTIN'}:null;
}
function digits(v){ return String(v||'').replace(/\D/g,''); }
function mobileErr(v){ return v&&digits(v).length<10?'A contact number needs at least ten digits':''; }
function emailErr(v){ v=String(v||'').trim(); return v&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?'That is not an email address':''; }
/* the same person on the same account: same name, and the same mobile or the same email */
function conMatch(a,c){ return (a.con||[]).filter(function(x){ return String(x.n||'').trim().toLowerCase()===String(c.n||'').trim().toLowerCase() &&
  ((c.m&&digits(x.m)&&digits(x.m).slice(-10)===digits(c.m).slice(-10))||(c.e&&x.e&&x.e.toLowerCase()===String(c.e).toLowerCase())); })[0]||null; }
/* [stated 26 Sep · 3.1 §6] the product is already open on this account: warn, never block */
function openProductOn(a,product,skipOpp){ if(!a||!product) return null;
  var ls=S.data.lines.filter(function(l){ return l.acct===a.id&&l.product===product&&!isRen(l)&&l.opp&&l.opp!==skipOpp&&(openLine(l)||l.status==='park'); });
  return ls.length?oppOf(ls[0]):null; }
function openProductWarn(a,product,skipOpp){ var o=openProductOn(a,product,skipOpp); return o?'Product line for '+product+' already open in opportunity '+o.id+'.':''; }
function newOppErr(){
  var e={}, was=function(k){ return S.sel[k]!==undefined; };
  var ge=gstErr(noVal('gst')); if(ge) e.gst=ge;
  if(was('m')) { var me_=mobileErr(noVal('m')); if(me_) e.m=me_; }
  if(was('e')) { var ee=emailErr(noVal('e')); if(ee) e.e=ee; }
  return e;
}
function newOppState(){ var e=newOppErr(), gst=noVal('gst').toUpperCase(), m=e.gst?null:matchAcct('',gst), locked=!!(m&&m.a);
  var hint;
  if(!gst) hint='<span class="meta">A provisional account will be created. It becomes verified when the GST certificate (or Aadhaar for a proprietor) arrives at KYC.</span>';
  else if(e.gst) hint='';
  else if(locked) hint='<span class="nomatch on">'+ic('circlecheck','ic14')+'<b>'+esc(m.a.n)+'</b> · '+esc(m.a.id)+' · '+esc(m.a.city||'—')+' · owner '+esc(uname(m.a.own))+' · '+(m.a.prov?'Provisional':'Verified')+'</span>';
  else hint='<span class="meta">No account carries this GSTIN. A new account will be created.</span>';
  return {e:e, m:m, locked:locked, name:locked?m.a.n:'', hint:hint, warn:locked?openProductWarn(m.a,S.sel.product):''}; }
FLOWS.newOpp={t:function(){ return S.sel.done?'Opportunity created':'New opportunity'; }, sub:function(){ return S.sel.done?'':'GSTIN first — it finds the company if it is already here. With no GSTIN, a provisional account is created with the opportunity.'; }, wide:true,
  repaintOn:['product','src'],
  nofoot:function(){ return !!S.sel.done; },
  body:function(){
    if(S.sel.done){ var d=S.sel.done, a=by(S.data.accounts,d.acct), l=lineById(d.line), o=by(S.data.opps,d.opp);
      /* [stated 26 Sep · 3.1 §7] four lines, Open the account, and a single Done */
      return '<dl class="kvlist" style="grid-template-columns:140px 1fr;row-gap:12px">'+
        '<dt>Account</dt><dd>'+esc(a.n)+' <span class="meta">· '+esc(a.id)+' · '+(d.newAcct?'new, ':'matched on GSTIN, ')+(a.prov?'provisional':'verified')+'</span></dd>'+
        '<dt>Opportunity</dt><dd>'+esc(oName(o))+'</dd>'+
        '<dt>Product line</dt><dd>'+esc(l.product)+' <span class="meta">· '+esc(l.id)+' · New Lead</span></dd>'+
        '<dt>Owner</dt><dd>'+esc(uname(l.owner))+(l.owner===S.user?' <span class="meta">· you</span>':'')+'</dd></dl>'+
        '<div class="flex wrap mt16"><span class="sp"></span><button class="btn" data-go="acct" data-id="'+a.id+'">Open the account</button><button class="btn primary" data-go="line" data-id="'+l.id+'">Done</button></div>';
    }
    var st=newOppState();
    var bt=S.sel.bt;
    return field('GSTIN',input('gst',S.sel.gst,'29AAACS1234F1Z5','style="text-transform:uppercase"'),'','')+
      '<div class="err" id="e_gst" style="margin-top:-10px">'+esc(st.e.gst||'')+'</div><div class="hint" id="h_gst" style="margin-top:-8px">'+st.hint+'</div>'+
      '<label class="field"><div class="lbl">Company name (as per PAN)</div>'+input('name',st.locked?st.name:(S.sel.name||''),'The registered name, not a brand name',st.locked?'disabled':'')+'<div class="hint" id="h_name">'+(st.locked?'Filled from the matched account. Clear the GSTIN to type a name.':'Whatever is typed here is provisional until the account is verified.')+'</div></label>'+
      '<div class="fgrid">'+field('POC name',input('cn',S.sel.cn,'Who you are speaking to'))+field('POC mobile',input('m',S.sel.m,'+91 98xxx xxxxx'),'',st.e.m)+'</div>'+
      '<div class="fgrid">'+field('POC email',input('e',S.sel.e,'name@company.in'),'',st.e.e)+
        '<label class="field"><div class="lbl">Product</div>'+select('product',S.sel.product||'',[['','Choose a product']].concat(PRODUCTS))+'<div class="hint amber" id="h_prod">'+esc(st.warn)+'</div></label></div>'+
      '<div class="field"><div class="lbl">Business type</div><div class="fgrid">'+
        opt('data-mset="bt" data-mval="fresh"',bt==='fresh','Fresh','Buying this cover for the first time')+
        opt('data-mset="bt" data-mval="roll"',bt==='roll','Market rollover','Moving an existing policy from another broker or insurer')+'</div></div>'+
      field('Source',select('src',S.sel.src||'',[['','Choose a source']].concat(SRCS)));
  },
  live:function(){ var st=newOppState(), g=function(id){return document.getElementById(id);}, n=g('f_name');
    if(n){ n.disabled=st.locked; if(st.locked) n.value=st.name; else if(S.sel.wasLocked){ n.value=''; S.sel.name=''; } S.sel.wasLocked=st.locked; }
    if(g('e_gst')) g('e_gst').textContent=st.e.gst||''; if(g('h_gst')) g('h_gst').innerHTML=st.hint;
    if(g('h_name')) g('h_name').textContent=st.locked?'Filled from the matched account. Clear the GSTIN to type a name.':'Whatever is typed here is provisional until the account is verified.';
    if(g('h_prod')) g('h_prod').textContent=st.warn;
    [['f_m',st.e.m],['f_e',st.e.e]].forEach(function(x){ var el=g(x[0]); if(!el) return; var lab=el.closest('.field'); if(!lab) return; var er=lab.querySelector('.err'); if(x[1]){ if(!er){ er=document.createElement('div'); er.className='err'; lab.appendChild(er); } er.textContent=x[1]; } else if(er) er.remove(); }); },
  can:function(){ if(S.sel.done) return false; var gst=noVal('gst').toUpperCase(); if(gstErr(gst)) return false; var m=matchAcct('',gst);
    var name=(m&&m.a)?m.a.n:noVal('name'); return !!name&&!!noVal('cn')&&digits(noVal('m')).length>=10&&!!noVal('e')&&!emailErr(noVal('e'))&&!!S.sel.product&&!!S.sel.src&&!!S.sel.bt; },
  ok:function(){ var m=matchAcct('',noVal('gst')); return m&&m.a?'Create on '+m.a.id:'Create opportunity'; },
  run:function(){ var gst=noVal('gst').toUpperCase(), m=matchAcct('',gst), a=m&&m.a?m.a:null, newAcct=!a, res={};
    var ok=write(function(){
      if(!a){ a=newAccount({n:noVal('name'),gst:gst,own:S.user,prov:gst?0:1,createdBy:S.user}); }
      var c=conMatch(a,{n:noVal('cn'),m:noVal('m'),e:noVal('e')});
      if(!c){ c={n:noVal('cn'),d:'',m:noVal('m'),e:noVal('e')}; a.con.push(c); }
      var o={id:newOppId(),acct:a.id,type:'New Business',bt:BTYPE[S.sel.bt],src:S.sel.src,created:S.now,by:S.user,log:[]}; S.data.opps.push(o);
      oppLog(o,'Opportunity created',uname(S.user)+' · '+S.sel.src+' · '+BTYPE[S.sel.bt]);
      var l=newLine({opp:o.id,acct:a.id,product:S.sel.product,owner:S.user,src:S.sel.src,contact:c,how:uname(S.user)+' · New opportunity'});
      oppLog(o,'Product line added: '+l.product,'by '+uname(S.user));
      var made=fireRules(l,'stage',1);
      res={acct:a.id,opp:o.id,line:l.id,newAcct:newAcct,how:m?m.how:'',made:made[0]?made[0].dueAt:0};
    },'the opportunity');
    if(!ok) return 'fail'; S.sel={done:res}; paint(); toast('Opportunity created',res.newAcct?'Account, opportunity and first product line — all yours.':'On the existing account. The line is yours.'); return 'stay'; }};
HANDLERS.push(function(t){ var x=t.closest('#ovl [data-go]'); if(x&&S.flow==='newOpp'&&S.sel.done){ closeFlow(); } return false; });

/* ---------- one account, one line: the shapes every creation path writes ---------- */
var GST_STATE={'27':'Maharashtra','24':'Gujarat','29':'Karnataka','33':'Tamil Nadu','32':'Kerala','03':'Punjab','07':'Delhi','36':'Telangana'};
function newAccount(o){ var gst=(o.gst||'').toUpperCase();
  var a={id:'A-'+(S.data.seq.acct++),n:o.n,trade:o.trade||'',pan:panOfGst(gst),gst:gst,city:o.city||'',st:o.st||(gst?(GST_STATE[gst.slice(0,2)]||''):''),ind:o.ind||'',emp:'',to:'',grp:'—',own:o.own,prov:o.prov?1:0,
    con:[],pols:[],recs:[],prof:null,fin:null,sis:[],createdAt:S.now,createdBy:o.createdBy||'system',log:[]};
  if(!a.prov){ a.kycBy=o.createdBy||'system'; a.kycAt=S.now; a.kycHow=o.kycHow||'GSTIN entered at creation · PAN derived from it'; }
  S.data.accounts.push(a); return a; }
function newLine(o){
  var l={id:'OP-'+(S.data.seq.line++),opp:o.opp,acct:o.acct,product:o.product,owner:o.owner,stage:o.stage||1,status:'open',reason:'',revisit:0,att:0,rate:o.rate===undefined?null:o.rate,rfq:{st:'none',f:{}},req:o.req||null,round:1,qAns:0,obj:'',qsel:[],picked:o.picked||'',prem:o.prem||0,ins:o.picked||'',pay:'pre',payMode:'',amt:0,payLines:[],
    enteredAt:S.now,createdAt:S.now,assignedAt:S.now,src:o.src||'',contact:{n:o.contact.n||'',e:o.contact.e||'',m:o.contact.m||''},log:[{at:S.now,t:'Product line created',m:o.how||uname(S.user),sys:o.sys?1:0,kind:'sys'}]};
  S.data.lines.push(l); return l; }
function acctLog(a,t,m,kind){ if(!a.log) a.log=[]; a.log.unshift({at:S.now,t:t,m:m||uname(S.user),kind:kind||'sys'}); }
function oppLog(o,t,m){ if(!o.log) o.log=[]; o.log.unshift({at:S.now,t:t,m:m||uname(S.user)}); }
