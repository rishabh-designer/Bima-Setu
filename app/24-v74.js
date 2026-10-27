/* ==================================================================== *
 *  v74 · 23 Oct 2026 — the amendments decided after v73
 *  1 BimaOps payment ticket · 2 post-purchase ticket · 3 DUA instant link
 *  vs Ops ticket · 4 call tasks + click-to-call and the simple configurator
 *  · 5 website drop-off → stage · 6 quotes decide the route, Question
 *  Master, Quote Sent follow-up · 7 account addresses, SI currency
 * ==================================================================== */

/* ---------- small helpers ---------- */
function shortIns(n){ n=String(n||''); var s=n.replace(/\s+(MS General Insurance|General Insurance|Insurance|Assurance)$/,''); return s||n; }
function roInp(v){ return '<input class="inp" value="'+esc(v==null?'':v)+'" disabled>'; }
function fileSave(blob,fn){
  if(window.claude&&typeof window.claude.use==='function'){
    window.claude.use('downloads').then(function(d){ if(!d) return docAnchor(blob,fn);
      d.save({filename:fn,data:blob}).then(function(){ toast('Downloaded','The file is '+fn+'.'); },function(err){ if(err&&err.code==='declined') return; docAnchor(blob,fn); });
    },function(){ docAnchor(blob,fn); });
    return; }
  docAnchor(blob,fn); }
function csvCell(v){ v=String(v==null?'':v); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
function csvParse(txt){ var rows=[], row=[], cur='', q=false, i, c;
  for(i=0;i<txt.length;i++){ c=txt[i];
    if(q){ if(c==='"'){ if(txt[i+1]==='"'){ cur+='"'; i++; } else q=false; } else cur+=c; }
    else if(c==='"') q=true; else if(c===','){ row.push(cur); cur=''; } else if(c==='\n'||c==='\r'){ if(c==='\r'&&txt[i+1]==='\n') i++; row.push(cur); rows.push(row); row=[]; cur=''; } else cur+=c; }
  if(cur!==''||row.length){ row.push(cur); rows.push(row); }
  return rows.filter(function(r){ return r.some(function(x){ return String(x).trim(); }); }); }
