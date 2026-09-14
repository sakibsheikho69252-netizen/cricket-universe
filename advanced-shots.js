(function(){
'use strict';
const CU = window.CU = window.CU || {};

CU.SHOTS = {
  defend:      {power:0.25, risk:0.02, desc:'Defend'},
  straight:    {power:0.78, risk:0.10, desc:'Straight Drive'},
  cover:       {power:0.72, risk:0.11, desc:'Cover Drive'},
  on:          {power:0.70, risk:0.12, desc:'On Drive'},
  squareDrive: {power:0.72, risk:0.13, desc:'Square Drive'},
  lateCut:     {power:0.55, risk:0.08, desc:'Late Cut'},
  squareCut:   {power:0.78, risk:0.14, desc:'Square Cut'},
  upperCut:    {power:0.85, risk:0.24, desc:'Upper Cut'},
  pull:        {power:0.85, risk:0.22, desc:'Pull'},
  hook:        {power:0.92, risk:0.30, desc:'Hook'},
  flick:       {power:0.60, risk:0.12, desc:'Flick'},
  glance:      {power:0.55, risk:0.10, desc:'Glance'},
  sweep:       {power:0.75, risk:0.20, desc:'Sweep'},
  reverseSweep:{power:0.82, risk:0.28, desc:'Reverse Sweep'},
  scoop:       {power:0.65, risk:0.32, desc:'Scoop'},
  ramp:        {power:0.70, risk:0.34, desc:'Ramp'},
  switchHit:   {power:0.98, risk:0.38, desc:'Switch Hit'},
  insideOut:   {power:0.88, risk:0.18, desc:'Inside-Out'},
  drive:       {power:0.70, risk:0.10, desc:'Drive'},
  loft:        {power:1.00, risk:0.32, desc:'Lofted'}
};

// Override resolveShot to use extended table (falls back to base for unknown shots)
const origResolve = CU.Rules.resolveShot;
CU.Rules.resolveShot = function(shot, quality, batter, bowler, pitch, weather, rng){
  const def = CU.SHOTS[shot];
  if (!def) return origResolve.call(this, shot, quality, batter, bowler, pitch, weather, rng);

  const bat = (batter.bat + batter.power*0.5 + batter.technique*0.3) / 180;
  const bowl = (bowler.bowl + bowler.accuracy*0.4) / 160;
  const pitchMod = pitch ? pitch.bat : 1.0;
  const weatherMod = weather ? (weather.vis*0.4 + weather.swing*0.6) : 1.0;
  const eff = Math.max(0, Math.min(1, quality * (0.85 + bat*0.35)));
  if (eff < 0.08) return {contact:false, runs:0, wicketChance:0.35};

  let runsBase = eff * def.power * 10 * pitchMod * bat / bowl * (0.9 + rng()*0.3);
  let risk = def.risk * (1.4 - eff*0.9) * (0.85 + bowl*0.3) * weatherMod;

  let runs = 0;
  const roll = runsBase + rng()*2;
  if (shot === 'defend') runs = roll < 1.2 ? 0 : 1;
  else if (roll < 0.9) runs = 0;
  else if (roll < 2.0) runs = 1;
  else if (roll < 3.0) runs = 2;
  else if (roll < 3.6) runs = 3;
  else if (roll < 5.2) runs = 4;
  else runs = 6;

  if (eff < 0.25){
    risk += 0.25;
    runs = Math.min(runs, 1);
    return {contact:true, runs, edge: rng()<0.5?'inside':'outside', wicketChance:risk, quality:eff};
  }
  if (eff < 0.15 && rng() < 0.55){
    return {contact:false, runs:0, wicketChance: (bowler.bowl/200)*0.4 + 0.15};
  }
  return {contact:true, runs, wicketChance: risk, quality: eff, edge:null};
};

})();