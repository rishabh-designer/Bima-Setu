/* ==================================================================== *
 *  Repo fixes — applied on top of the prototype artifact. build.mjs appends
 *  this file after the modules; porting a new artifact version never touches
 *  it. After each port, check whether the prototype now carries a fix, and
 *  delete it here if so.
 * ==================================================================== */

/* No "Incumbent insurer" or "Policy expiry date" on the requirement [asked
   17 Nov for the Vercel link; not yet in the prototype]. The "Existing cover"
   group of the Fire, Burglary, IAR, CAR, Marine, Liability and Group Health
   requirement keeps "Existing policy?" only. Taking the two questions out of
   the templates removes them from the form, the Requirement section and the
   completeness count. Delete this once the prototype drops them too. */
(function(){
  Object.keys(TPL).forEach(function(k){ TPL[k].forEach(function(g){
    g[1] = g[1].filter(function(x){ var q = Array.isArray(x) ? x[0] : x; return q !== 'ins' && q !== 'exp'; }); }); });
})();

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
