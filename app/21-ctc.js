/* ============================================================================
   Click to call — [stated 23 Sep 2026]
   The RM presses Call on the product line, the system places it, and the moment
   the call ends the disposition form opens on its own. Logging a call by hand
   opens the same form. The telephony is simulated the way every other external
   event in this prototype is: the switch's answers are the amber-dashed buttons.
   [stated] the outcome is not optional — once a call has been placed the
   disposition modal cannot be dismissed until an outcome is picked.
   [stated] nothing is pre-selected. The switch knows whether it connected; only
   the RM knows what was said.
   ========================================================================== */
var CTC={tm:null, iv:null, at:null, res:null};

function ctcStop(){ if(CTC.tm){ clearTimeout(CTC.tm); CTC.tm=null; } if(CTC.iv){ clearInterval(CTC.iv); CTC.iv=null; } }
function ctcReset(){ ctcStop(); CTC.at=null; }
function ctcSecs(t0){ return t0?Math.max(0,Math.round((Date.now()-t0)/1000)):0; }
function mmss(s){ var m=Math.floor(s/60), r=s%60; return (m<10?'0':'')+m+':'+(r<10?'0':'')+r; }
function durTx(s){ if(s<60) return s+' sec'; var m=Math.floor(s/60), r=s%60; return m+' min'+(r?' '+r+' sec':''); }

/* the four things the switch can come back with */
var CTC_END={
  done:{lab:'Connected',    tone:'green', con:1},
  noans:{lab:'No answer',   tone:'amber', con:0},
  busy:{lab:'Busy',         tone:'amber', con:0},
  off:{lab:'Switched off or unreachable', tone:'amber', con:0}
};
function ctcEndKey(ph){ return ph&&ph.indexOf('e_')===0?ph.slice(2):''; }

/* the line's own contact is who gets dialled — it is the decision maker the
   line already carries, and 'Wrong person, referred to correct POC' is what
   changes it. */
function ctcWho(l){ var c=(l&&l.contact)||{}; return {n:c.n||'the client', m:c.m||'—'}; }

FLOWS.ctc={
  t:function(){ var l=FL(); return l&&l.stage===1?'First contact':'Call'; },
  sub:function(){ var k=ctcEndKey(S.sel.ph); return k?'The call is over. The outcome form opens next — it has to be logged.':'The system is placing the call. When it ends you log the outcome.'; },
  nofoot:function(){ return true; },
  locked:function(){ return S.sel.ph==='live'||!!ctcEndKey(S.sel.ph); },
  body:function(){
    var l=FL(), w=ctcWho(l), ph=S.sel.ph||'dial';
    if(!S.sel.ph) S.sel.ph='dial';

    /* entering a phase — wind the clocks exactly once, never on a repaint */
    if(ph!==CTC.at){
      ctcStop(); CTC.at=ph;
      if(ph==='dial'){ CTC.tm=setTimeout(function(){ if(S.flow==='ctc'&&S.sel.ph==='dial'){ S.sel.ph='ring'; paintModal(); } },1500); }
      if(ph==='ring'){ S.sel.r0=Date.now(); }
      if(ph==='live'){ S.sel.t0=Date.now();
        CTC.iv=setInterval(function(){ if(S.flow!=='ctc'||S.sel.ph!=='live'){ ctcStop(); return; }
          var n=document.getElementById('ctcT'); if(n) n.textContent=mmss(ctcSecs(S.sel.t0)); },1000); }
      if(ctcEndKey(ph)){
        var k=ctcEndKey(ph);
        CTC.res={k:k, con:CTC_END[k].con, dur:k==='done'?ctcSecs(S.sel.t0):0, rang:ctcSecs(S.sel.r0), who:w.n, num:w.m, at:S.now};
        CTC.tm=setTimeout(function(){ var ln=FL(); if(S.flow==='ctc'&&ln) openFlow('call',{line:ln.id, ctc:CTC.res}); },900);
      }
    }

    var head='<div class="ctcwho">'+avatar(w.n)+'<div><div class="n">'+esc(w.n)+'</div><div class="m mono">'+esc(w.m)+'</div></div></div>';

    var give='<div class="ctcact"><button class="btn sm ghost" data-close="1">Cancel the call</button></div>';

    if(ph==='dial') return '<div class="ctc">'+head+
      '<div class="ctcst"><i class="dot pulse"></i>Dialling…</div>'+
      give+
      '<div class="ctcnote">'+esc(l.product)+' · '+esc(acctName(l))+' · the call is placed from your BimaKavach number, and it is recorded.</div></div>';

    if(ph==='ring') return '<div class="ctc">'+head+
      '<div class="ctcst amber"><i class="dot pulse"></i>Ringing…</div>'+
      '<div class="ctcact"><button class="btn primary lg" data-mset="ph" data-mval="live">'+ic('phone')+'They answer</button></div>'+
      '<div class="mt12">'+simblock('What the switch comes back with','The telephony is faked here. In the real thing these arrive from the provider, and the RM never sees them.',
        simbtn('Nobody picks up','data-mset="ph" data-mval="e_noans"')+
        simbtn('Busy','data-mset="ph" data-mval="e_busy"')+
        simbtn('Switched off','data-mset="ph" data-mval="e_off"'))+'</div>'+
      '<div class="ctcnote">Nothing is on the record until the call connects — cancelling now leaves the line as it was.</div>'+
      give+'</div>';

    if(ph==='live') return '<div class="ctc">'+head+
      '<div class="ctcst green"><i class="dot"></i>Connected</div>'+
      '<div class="ctcT mono" id="ctcT">'+esc(mmss(ctcSecs(S.sel.t0)))+'</div>'+
      '<div class="ctcact"><button class="btn danger lg" data-mset="ph" data-mval="e_done">'+ic('phoneoff')+'End call</button></div>'+
      '<div class="ctcnote">Ending the call opens the outcome form. You cannot leave it without picking one.</div></div>';

    var k=ctcEndKey(ph), m=CTC_END[k];
    return '<div class="ctc">'+head+
      '<div class="ctcst '+(m.con?'green':'amber')+'"><i class="dot"></i>'+esc(m.lab)+'</div>'+
      '<div class="ctcT mono">'+esc(m.con?mmss(CTC.res?CTC.res.dur:0):'—')+'</div>'+
      '<div class="ctcnote">'+(m.con?'Call ended after '+esc(durTx(CTC.res?CTC.res.dur:0))+'.':'Rang for '+esc(durTx(CTC.res?CTC.res.rang:0))+' without connecting.')+' Opening the outcome form…</div></div>';
  }
};

/* the strip that sits on top of the disposition form when the call was placed
   from here — what the switch knows, and nothing it does not. */
function ctcStrip(c){
  if(!c) return '';
  var m=CTC_END[c.k]||CTC_END.done;
  return '<div class="ctcbar '+(c.con?'green':'amber')+'">'+ic(c.con?'phone':'phoneoff','ic16')+
    '<div><b>Click to call · '+esc(m.lab)+'</b>'+
    '<span>'+esc(c.who)+' · '+esc(c.num)+' · '+(c.con?esc(durTx(c.dur)):'rang '+esc(durTx(c.rang)))+'</span></div></div>';
}
/* what the call adds to the activity line, whichever outcome is picked */
function ctcMeta(c){
  if(!c) return '';
  return ' · click to call'+(c.con?' · '+durTx(c.dur):' · '+(CTC_END[c.k]||{lab:''}).lab.toLowerCase());
}
