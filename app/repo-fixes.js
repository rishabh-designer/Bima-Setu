/* ==================================================================== *
 *  Repo fixes — applied on top of the prototype artifact. build.mjs appends
 *  this file after the modules; porting a new artifact version never touches
 *  it. After each port, check whether the prototype now carries a fix, and
 *  delete it here if so.
 * ==================================================================== */

/* Admin opens renewal opportunities [v65: Admin sees everything and acts
   directly]. Admin's Renewals list is company-wide, but canSeeLine() refuses a
   renewal to anyone who is not an RM, so opening one said "You don't have
   access". (v73 also refused Admin every account; the prototype fixed that in
   v75 by giving canSeeAcct() an Admin case.) Present in v75. Wrapping keeps
   the artifact's own check for every other role. */
(function(){
  var seeLine = canSeeLine;
  canSeeLine = function(l, u){ var who = u || me(); return (!!who && who.role === 'admin' && !!l) || seeLine(l, u); };
  paint();   // boot has already painted; repaint in case it restored an Admin on a renewal
})();
