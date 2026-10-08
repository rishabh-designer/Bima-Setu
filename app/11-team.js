/* ==================================================================== *
 *  Team — the sales manager's view. Sees everything, acts on almost nothing.
 * ==================================================================== */
function teamOf(mgrId){ return S.data.users.filter(function(u){return u.role==='exec'&&u.mgr===mgrId;}); }
function wonRecently(l){ return !!l.paidAt && l.stage>=SALES_STAGES && daysBetween(l.paidAt,S.now)<=30; }
function personStats(u){
  var ls=S.data.lines.filter(function(l){return l.owner===u.id;}), open=ls.filter(openLine), tk=myTasks(u.id);
  var st=function(t){return taskState(t);};
  return {u:u, open:open.length, us:open.filter(function(l){return actingParty(l)==='Us';}).length, quiet:open.filter(function(l){return daysQuiet(l)>=QUIET_DAYS;}).length,
    over:tk.filter(function(t){return st(t)==='over';}).length, esc:tk.filter(function(t){return st(t)==='esc';}).length, fresh:open.filter(function(l){return l.stage===1&&!attempts(l);}).length,
    won:S.data.lines.filter(function(l){return (l.soldBy||'')===u.id&&wonRecently(l);}).length, conf:open.filter(confirmed).reduce(function(s,l){return s+premOf(l);},0), est:open.reduce(function(s,l){return s+premOf(l);},0)};
}
SCREENS.team=function(){
  var u=me(); if(u.role!=='mgr') return {sc:'Team', html:empty('lock','Managers only','The team view shows every line across a team. Yours is on Home.','<button class="btn" data-go="home">Home</button>')};
  /* [stated 23 Sep] escalated tasks first, then the stalled lines. Nothing else on this page. */
  var team=teamOf(u.id), ids=team.map(function(x){return x.id;});
  var open_=S.data.lines.filter(function(l){return ids.indexOf(l.owner)>=0&&openLine(l);});
  var esc_=escalatedTo(u.id).sort(function(x,y){return (x.escAt||x.dueAt)-(y.escAt||y.dueAt);});
  var quiet=open_.filter(function(l){return daysQuiet(l)>=QUIET_DAYS;}).sort(function(x,y){return daysQuiet(y)-daysQuiet(x);});
  /* [stated 24 Sep · TBD-53] a new lead is stalled after 3 WORKING days uncalled, not 1 calendar day */
  var uncalled=open_.filter(uncalledLate).sort(function(x,y){return x.assignedAt-y.assignedAt;});
  var slip=uncalled.map(function(l){ return {l:l,k:'new',d:workDays(l.assignedAt||l.createdAt,S.now)}; })
    .concat(quiet.map(function(l){ return {l:l,k:'quiet',d:daysQuiet(l)}; }))
    .sort(function(x,y){return y.d-x.d;});
  var seen={}, slipRows=[]; slip.forEach(function(x){ if(seen[x.l.id]) return; seen[x.l.id]=1; slipRows.push(x); });
  var mine=S.data.lines.filter(function(l){return l.owner===u.id&&openLine(l);});
  var html=hMgrHero(u,'Your team\u2019s escalated tasks and the lines that have stalled. '+esc(team.map(function(x){return x.n.split(' ')[0];}).join(', '))+' \u00b7 '+plural(open_.length,'open line')+'.')+
    (esc_.length+slipRows.length?'':hMgrClear('Every SLA task is inside its clocks, no new lead has sat '+UNCALLED_DAYS+' working days uncalled, and no open line has gone quiet for '+QUIET_DAYS+' days.'))+
    '<div class="hgap">'+
    (esc_.length?hCard('esc','red','alert','Escalated tasks',hCut('mesc',esc_.map(hMgrTaskRow)),chip(esc_.length,'red',true,true),''):'')+
    (slipRows.length?hCard('slip','amber','clock','Stalled',hCut('mslip',slipRows.map(function(x){
        var meta=x.k==='new'
          ? chip('Uncalled','red',true,true)+'<span>'+esc(uname(x.l.owner))+' \u00b7 '+esc(stageName(x.l.stage))+' \u00b7 waiting on '+esc(actingParty(x.l))+' \u00b7 '+plural(x.d,'working day')+' since assigned</span>'
          : chip('Quiet 30 days','amber',true,true)+'<span>'+esc(uname(x.l.owner))+' \u00b7 '+esc(stageName(x.l.stage))+' \u00b7 waiting on '+esc(actingParty(x.l))+' \u00b7 last activity '+esc(fmtD(lastActivity(x.l)))+'</span>';
        return hSlipRow(x.l,meta); })),
      chip(slipRows.length,'amber',true,true),''):'')+
    '</div>'+
    '<div class="meta mt16">Closing an escalated task closes it for the owner too, and the line does not move. Taking a line over is the fallback for when the owner is away \u2014 it is audited.'+
      (mine.length?' Your own '+plural(mine.length,'open line')+' '+(mine.length===1?'is':'are')+' on <button class="link" data-go="pipeline">Pipeline</button>.':'')+'</div>';
  return {sc:'Home', html:html};
};
HANDLERS.push(function(t){ if(t.closest('[data-cleartf]')){ S.ui.tp='';S.ui.tprod=''; paint(); return true; } return false; });
