(function(){
'use strict';
const CU = window.CU = window.CU || {};

// Cricket Rules Engine
// Determines outcomes of deliveries based on inputs.
// All rule checks that matter for the running match happen here.

const DISMISSALS = {
  BOWLED: 'b',
  CAUGHT: 'c',
  LBW: 'lbw',
  RUNOUT: 'run out',
  STUMPED: 'st',
  HITWICKET: 'hit wicket',
  HITBALLTWICE: 'hit the ball twice',
  OBSTRUCT: 'obstructing the field',
  TIMEDOUT: 'timed out'
};

function oversText(balls){
  return Math.floor(balls/6) + '.' + (balls%6);
}

function runRate(runs, balls){
  if (balls <= 0) return 0;
  return (runs * 6 / balls);
}

function requiredRate(runs, balls){
  if (balls <= 0) return Infinity;
  return (runs * 6 / balls);
}

// Timing quality → shot result. quality in [0,1]
// shot: 'defend'|'drive'|'loft'|'sweep'|'pull'|'cut'|'flick'
// pitch/weather modify the outcome.
function resolveShot(shot, quality, batter, bowler, pitch, weather, rng){
  // Convert quality to shot distance & risk
  const bat = (batter.bat + batter.power*0.5 + batter.technique*0.3) / 180;
  const bowl = (bowler.bowl + bowler.accuracy*0.4) / 160;

  const shotPower = ({
    defend: 0.25, drive: 0.7, loft: 1.0, sweep: 0.75,
    pull: 0.85, cut: 0.8, flick: 0.6
  })[shot] || 0.7;

  const riskBase = ({
    defend: 0.02, drive: 0.10, loft: 0.32, sweep: 0.20,
    pull: 0.22, cut: 0.15, flick: 0.12
  })[shot] || 0.18;

  const pitchMod = (pitch ? pitch.bat : 1.0);
  const pitchPace = (pitch ? pitch.pace : 1.0);
  const weatherMod = (weather ? (weather.vis * 0.4 + weather.swing * 0.6) : 1.0);

  const effQuality = Math.max(0, Math.min(1, quality * (0.85 + bat*0.35)));
  const contact = effQuality;
  if (contact < 0.08) return {contact:false, runs:0, wicketChance:0.35};

  // Runs base from quality × power × shot
  let runsBase = contact * shotPower * 10 * pitchMod * bat / bowl * (0.9 + rng()*0.3);

  // Edge cases: low quality = more risk
  let risk = riskBase * (1.4 - contact*0.9) * (0.85 + bowl*0.3) * weatherMod;

  // Distance categories
  let runs = 0;
  const roll = runsBase + rng()*2;
  if (shot === 'defend'){
    runs = roll < 1.2 ? 0 : (roll < 2 ? 1 : 0);
  } else {
    if (roll < 0.9) runs = 0;
    else if (roll < 2.0) runs = 1;
    else if (roll < 3.0) runs = 2;
    else if (roll < 3.6) runs = 3;
    else if (roll < 5.2) runs = 4;
    else runs = 6;
  }

  // Quality<0.25 → edge, may be caught
  if (contact < 0.25){
    risk += 0.25;
    runs = Math.min(runs, 1);
    // inside/outside edge
    const edgeType = rng() < 0.5 ? 'inside' : 'outside';
    return {contact:true, runs, edge: edgeType, wicketChance: risk, quality: contact};
  }

  // Miss chance
  if (contact < 0.15 && rng() < 0.55){
    return {contact:false, runs:0, wicketChance: (bowler.bowl/200)*0.4 + 0.15};
  }

  return {contact:true, runs, wicketChance: risk, quality: contact, edge:null};
}

// Decide whether a wicket occurs given a wicketChance and a dismissal preference list
function rollWicket(chance, rng, possible){
  if (rng() > chance) return null;
  const list = possible && possible.length ? possible : ['bowled','caught','lbw','runout','stumped'];
  return list[Math.floor(rng()*list.length)];
}

// Extras resolver — called before shot resolution
function resolveExtra(delivery, rng){
  // delivery: {type, line, length, pace, accuracy}
  const acc = delivery.accuracy || 0.85;
  // Wide if very inaccurate line
  if (delivery.line === 'wide-outside' && rng() > acc * 0.7) return 'wide';
  if (delivery.line === 'wayward' && rng() > acc * 0.5) return 'wide';
  // No-ball if over-stepping
  if (delivery.type === 'beamer') return 'noball';
  if (rng() < (1 - acc) * 0.28) return 'noball';
  return null;
}

// Over completion check
function isOverComplete(legalBalls){
  return legalBalls > 0 && legalBalls % 6 === 0;
}

// Innings completion check
function isInningsComplete(innings){
  if (innings.wickets >= innings.maxWickets) return true;
  if (innings.balls >= innings.maxOvers * 6) return true;
  if (innings.target != null && innings.runs >= innings.target) return true;
  return false;
}

// Net run rate
function nrr(runs, balls, maxOvers){
  if (balls === 0) return 0;
  const oversEquivalent = balls / 6;
  return runs / Math.max(1, oversEquivalent);
}

CU.Rules = {
  DISMISSALS, oversText, runRate, requiredRate,
  resolveShot, rollWicket, resolveExtra,
  isOverComplete, isInningsComplete, nrr
};

})();