(function(){
'use strict';
const CU = window.CU = window.CU || {};

// Extended rare dismissals: hit wicket, hit ball twice, obstruct field, timed out
const origPossible = CU.Match.prototype.possibleDismissals;
CU.Match.prototype.possibleDismissals = function(shot, quality, delivery){
  const base = origPossible.call(this, shot, quality, delivery);
  const rng = this.rng;
  // Rare 0.15%: hit wicket
  if (rng() < 0.0015) base.push('hitwicket');
  // Rare 0.08%: obstructing the field
  if (rng() < 0.0008) base.push('obstruct');
  // Rare 0.05%: hit ball twice
  if (rng() < 0.0005) base.push('hitballtwice');
  return base;
};

// Human-readable dismissal labels
CU.Rules.dismissalLabel = function(k){
  const map = {
    bowled: 'b', caught: 'c', lbw: 'lbw', runout: 'run out',
    stumped: 'st', hitwicket: 'hit wicket',
    hitballtwice: 'hit the ball twice', obstruct: 'obstructing the field',
    timedout: 'timed out'
  };
  return map[k] || k;
};

})();