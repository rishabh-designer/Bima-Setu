/* ==================================================================== *
 *  Repo fixes — applied on top of the prototype artifact. build.mjs appends
 *  this file after the modules; porting a new artifact version never touches
 *  it. After each port, check whether the prototype now carries a fix, and
 *  delete it here if so.
 * ==================================================================== */

/* Admin opens any account or opportunity [v65: Admin sees everything and acts
   directly]. The lists widen through scopeIds(), but canSeeAcct() and
   canSeeLine() have no Admin case, so every record opened from those lists
   said "You don't have access". Present in v73. Wrapping keeps the artifact's
   own checks for every other role. */
(function(){
  var seeAcct = canSeeAcct, seeLine = canSeeLine;
  function isAdmin(u){ u = u || me(); return !!u && u.role === 'admin'; }
  canSeeAcct = function(a, u){ return (isAdmin(u) && !!a && !a.merged) || seeAcct(a, u); };
  canSeeLine = function(l, u){ return (isAdmin(u) && !!l) || seeLine(l, u); };
  paint();   // boot has already painted; repaint in case it restored an Admin on a record
})();
