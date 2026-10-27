/* ==================================================================== *
 *  Call (click-to-call, Ozonetel) and Email from the prospect [stated 23 Oct]
 *  · Call → ringing → picked up or DNP. Picked up → Contacted / Not interested
 *    form; DNP → the Not contacted dispositions. A placed call must be
 *    dispositioned: the outcome pop-up has no way out.
 *  · Email → the Mail trail tab: send from the system, see the client's replies.
 * ==================================================================== */
FLOWS.ab_call={t:'Call', locked:function(){ return true; }, nofoot:function(){ return true; },
  sub:function(){ var p=cur(); return p?p.co+' · '+stepName(p.stage)+(p.bucket==='nc'?' · Not Connected, DNP '+p.dnp:''):''; },
  body:function(){ var p=cur(), live=S.sel.cs==='live';
    return '<div class="ctc"><div class="ctcwho">'+avatar(p.poc1.n)+'<div><div class="n">'+esc(p.poc1.n)+'</div><div class="m">'+esc(p.poc1.m)+(p.poc1.d?' · '+esc(p.poc1.d):'')+'</div></div></div>'+
      (live?'<span class="ctcst green"><i class="dot"></i>Connected</span><div class="ctcT">01:42</div><div class="ctcact"><button class="btn primary lg" data-callend="1">'+ic('phoneoff')+'End call</button></div><div class="ctcnote">When you end the call, record what was said.</div>'
        :'<span class="ctcst amber"><i class="dot pulse"></i>Ringing · placed through Ozonetel</span><div class="ctcT dim">00:00</div><div class="ctcnote">Your phone rings first, then the client’s. The call is recorded against this prospect.</div>'+
         simblock('Simulate the client','What the client does with the call.',simbtn('Client picks up','data-callsim="up"')+simbtn('Client does not pick up (DNP)','data-callsim="dnp"')))+'</div>'; }};
HANDLERS.push(function(t){
  var x=t.closest('[data-callsim]');
  if(x&&S.flow==='ab_call'){ var p=cur();
    if(x.dataset.callsim==='up'){ S.sel.cs='live'; paintModal(); return true; }
    logAdd(p,'Call placed · not picked up','Click-to-call · '+p.poc1.m,'',1);
    if(p.stage==='callsetup'){ closeFlow(); save(); paint(); toast('Not picked up','Logged in Activity. The meeting stays as booked.'); return true; }
    openFlow('ab_outreach',{id:p.id,via:'call',picked:false,ocs:['not'],oc:'not'}); return true; }
  if(t.closest('[data-callend]')&&S.flow==='ab_call'){ var q=cur();
    if(q.bucket==='nc'){ var back=q.from||'prospect'; q.bucket=''; q.from=''; q.dnp=0; q.stage=back; q.enteredAt=S.now; logAdd(q,'Back to '+stepName(back),'Connected after DNP · Not Connected → '+stepName(back),'',1); }
    logAdd(q,'Call placed · picked up','Click-to-call · 01:42 · '+q.poc1.m,'',1);
    if(q.stage==='callsetup'){ openFlow(q.meet?'ab_callout':'ab_book',{id:q.id,via:'call'}); save(); paint(); paintModal(); return true; }
    openFlow('ab_outreach',{id:q.id,via:'call',picked:true,dur:'01:42',ocs:q.stage==='prospect'?['contacted','ni']:['contacted']}); save(); paint(); paintModal(); return true; }
  x=t.closest('[data-flow="ab_email"]');
  if(x){ var id=x.dataset.id; S.ui['abptab_'+id]='mail'; S.ui['abcmp_'+id]=1; paint(); var el=document.getElementById('mf_sub'); if(el) el.focus(); return true; }
  x=t.closest('[data-mailnew]'); if(x){ S.ui['abcmp_'+x.dataset.mailnew]=1; paint(); return true; }
  x=t.closest('[data-mailcancel]'); if(x){ S.ui['abcmp_'+x.dataset.mailcancel]=0; paint(); return true; }
  x=t.closest('[data-mailsend]'); if(x){ mailSend(proById(x.dataset.mailsend)); return true; }
  x=t.closest('[data-mailsim]'); if(x){ mailReply(proById(x.dataset.mailsim)); return true; }
  return false; });
FLOWS.ab_call.locked=function(){ return true; };

/* ---------- Mail trail ---------- */
var MAILTPL={intro:['Introduction','Commercial insurance for {customer}','Hi {contact},\n\nI look after commercial insurance at BimaKavach, an IRDAI-licensed broker for SMEs. We compare quotes from leading insurers and handle claims for you. Could we take 15 minutes this week?\n\nRegards,\n{me}'],
  meet:['Meeting request','Fifteen minutes on {customer}’s insurance','Hi {contact},\n\nThank you for your time on the phone. Could we meet this week to go through your current policies and renewal dates? Share a slot that suits you.\n\nRegards,\n{me}'],
  fu:['Follow-up','Following up · BimaKavach','Hi {contact},\n\nFollowing up on my earlier note. Happy to work around your schedule.\n\nRegards,\n{me}']};
function tplFill(tx,p){ return String(tx).replace(/\{customer\}/g,p.co).replace(/\{contact\}/g,p.poc1.n.split(' ')[0]).replace(/\{me\}/g,uname(S.user)); }
function mailTab(p){ var cmp=S.ui['abcmp_'+p.id]||!p.mails.length, can=canWork(p)&&!p.rp, last=p.mails[p.mails.length-1];
  var to=p.poc1.e||'';
  var comp=can&&cmp?'<section class="card"><div class="cardh"><span class="t">New email</span><span class="sp"></span><span class="s">sent from the system, from '+esc(uname(S.user).split(' ')[0].toLowerCase())+'@bimakavach.com</span></div><div class="cardb gap12">'+
      field('To',to?'<div class="rfro">'+esc(p.poc1.n)+' &lt;'+esc(to)+'&gt;</div>':'<input class="inp" id="mf_to" data-mf="to_'+p.id+'" placeholder="Client email" value="'+esc(S.ui['mf_to_'+p.id]||'')+'">',to?'':'No email on the primary POC yet. It is saved on the prospect when you send.')+
      field('Subject','<input class="inp" id="mf_sub" data-mf="sub_'+p.id+'" value="'+esc(S.ui['mf_sub_'+p.id]||'')+'" placeholder="Subject">')+
      field('Message','<textarea class="inp" id="mf_body" data-mf="body_'+p.id+'" style="min-height:150px" placeholder="Write to '+esc(p.poc1.n.split(' ')[0])+'">'+esc(S.ui['mf_body_'+p.id]||'')+'</textarea>')+
      '<div class="flex" style="justify-content:flex-end;gap:8px">'+(p.mails.length?'<button class="btn ghost" data-mailcancel="'+p.id+'">Cancel</button>':'')+'<button class="btn primary" data-mailsend="'+p.id+'">'+ic('send')+'Send email</button></div></div></section>':'';
  var thread=p.mails.length?'<div class="msgs">'+p.mails.map(function(m){ return '<div class="msg '+(m.dir==='in'?'in':'out')+'"><div class="w"><b>'+esc(m.from)+'</b> · '+esc(fmt(m.at))+(m.dir==='out'?' · to '+esc(m.to):'')+'</div><div class="b" style="font-weight:600;color:var(--ink)">'+esc(m.sub)+'</div><div style="white-space:pre-wrap">'+esc(m.body)+'</div></div>'; }).join('')+'</div>'
    :'';
  return (canWork(p)&&p.rp?'<div class="banner amber mt8">'+ic('refresh','ic14')+'<span><b>To re-prospect</b> · '+esc(p.rp)+'. Add the new contact details before emailing again.</span></div>':'')+'<div class="phhd"><div class="t">Mail trail</div><div class="a">'+(p.mails.length?plural(p.mails.length,'email')+' · oldest first':'No emails yet')+'</div></div>'+
    (can&&!cmp?'<div class="mt12"><button class="btn primary sm" data-mailnew="'+p.id+'">'+ic('mail')+'New email</button></div>':'')+
    '<div class="gap12 mt12">'+comp+thread+'</div>'+
    (can&&last&&last.dir==='out'?'<div class="mt12">'+simblock('Simulate the client','A reply arriving in the inbox is matched to this prospect.',simbtn(p.poc1.n.split(' ')[0]+' replies','data-mailsim="'+p.id+'"'))+'</div>':''); }
document.addEventListener('input',function(e){ var t=e.target; if(t instanceof Element&&t.dataset&&t.dataset.mf!==undefined){ S.ui['abmf_'+t.dataset.mf]=t.value; } });
HANDLERS.push(function(t){ var x=t.closest('[data-mailtpl]'); if(!x) return false; var p=proById(x.dataset.id), tp=MAILTPL[x.dataset.mailtpl];
  S.ui['mf_sub_'+p.id]=tplFill(tp[1],p); S.ui['mf_body_'+p.id]=tplFill(tp[2],p); paint(); return true; });
function mailSend(p){ var to=p.poc1.e||(S.ui['mf_to_'+p.id]||'').trim(), sub=(S.ui['mf_sub_'+p.id]||'').trim(), body=(S.ui['mf_body_'+p.id]||'').trim();
  if(!mailOk(to)){ toast('Add a valid email address','The client’s email is needed to send.',{red:1}); return; }
  if(!sub||!body){ toast('Add a subject and a message','Both are needed to send.',{red:1}); return; }
  if(!p.poc1.e){ p.poc1.e=to; }
  p.mails.push({dir:'out',at:S.now,from:uname(S.user),to:to,sub:sub,body:body});
  logAdd(p,'Outreach · Email sent','“'+sub+'” · to '+to+' · '+uname(S.user),'');
  S.ui['mf_sub_'+p.id]=''; S.ui['mf_body_'+p.id]=''; S.ui['abcmp_'+p.id]=0; save(); paint();
  toast('Email sent','To '+p.poc1.n+'. Replies show in the Mail trail. Use Log outreach to record what happened.'); }
function mailReply(p){ var last=p.mails[p.mails.length-1];
  p.mails.push({dir:'in',at:S.now,from:p.poc1.n,to:uname(S.user),sub:'Re: '+last.sub.replace(/^Re: /,''),body:'Thanks for reaching out. We are reviewing our covers next month — happy to speak. Call me on '+p.poc1.m+'.'});
  logAdd(p,'Email reply received','From '+p.poc1.n,'',1); save(); paint(); toast('Reply from '+p.poc1.n,'It is in the Mail trail.'); }
