/* ==================================================================== *
 *  Boot
 * ==================================================================== */
(function(){
  var fresh=!load(); if(fresh){ S.data=seedFill(seed()); }
  applyCfg();
  if(fresh){ renSweep(false); primeRules(); }
  S.data.tasks.forEach(function(t){ if(!t.done && t.seen===undefined) t.seen=taskStateOf(t); });
  if(S.user && !userById(S.user)) S.user=null;
  if(S.route && S.route.v && !SCREENS[S.route.v]) S.route={v:'home'};
  paint();
})();
