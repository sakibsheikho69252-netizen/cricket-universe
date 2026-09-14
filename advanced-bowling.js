(function(){
'use strict';
const CU = window.CU = window.CU || {};

CU.DELIVERIES = {
  'good-length':  {cat:'pace', accuracy:0.90, desc:'Good Length'},
  'full':         {cat:'pace', accuracy:0.88, desc:'Full'},
  'short':        {cat:'pace', accuracy:0.85, desc:'Short'},
  'yorker':       {cat:'pace', accuracy:0.70, desc:'Yorker'},
  'bouncer':      {cat:'pace', accuracy:0.72, desc:'Bouncer'},
  'slower':       {cat:'pace', accuracy:0.85, desc:'Slower Ball'},
  'cutter':       {cat:'pace', accuracy:0.80, desc:'Cutter'},
  'knuckle':      {cat:'pace', accuracy:0.80, desc:'Knuckle Ball'},
  'inswing':      {cat:'swing', accuracy:0.85, desc:'Inswing'},
  'outswing':     {cat:'swing', accuracy:0.85, desc:'Outswing'},
  'reverse-swing':{cat:'swing', accuracy:0.72, desc:'Reverse Swing'},
  'off-break':    {cat:'spin', accuracy:0.88, desc:'Off Break'},
  'leg-break':    {cat:'spin', accuracy:0.88, desc:'Leg Break'},
  'googly':       {cat:'spin', accuracy:0.75, desc:'Googly'},
  'doosra':       {cat:'spin', accuracy:0.72, desc:'Doosra'},
  'top-spinner':  {cat:'spin', accuracy:0.85, desc:'Top Spinner'},
  'arm-ball':     {cat:'spin', accuracy:0.85, desc:'Arm Ball'}
};

CU.DELIVERY_POOLS = {
  pace: ['good-length','full','short','yorker','bouncer','slower','cutter','knuckle','inswing','outswing','reverse-swing'],
  spin: ['off-break','leg-break','googly','doosra','top-spinner','arm-ball'],
  swing:[ 'inswing','outswing','reverse-swing','good-length','full']
};

CU.DELIVERY_HARDNESS = {
  yorker:0.40, bouncer:0.25, slower:0.32, googly:0.38, doosra:0.40,
  'reverse-swing':0.42, knuckle:0.30, 'top-spinner':0.28
};

// Extend AI delivery choice
CU.AI.prototype.chooseDelivery = function(bowler, situation){
  const style = bowler.bowlStyle || '';
  const isSpin = /break|orthodox|chinaman/.test(style);
  const isSwing = /fast|medium/.test(style) && situation.newBall;
  const pool = isSpin ? CU.DELIVERY_POOLS.spin :
               isSwing ? CU.DELIVERY_POOLS.swing :
               CU.DELIVERY_POOLS.pace;

  let kind;
  if (situation.ballsRemaining < 6 && !isSpin && Math.random() < 0.4){
    kind = Math.random() < 0.5 ? 'yorker' : 'slower';
  } else if (situation.wicketsLeft <= 4 && Math.random() < 0.4){
    kind = 'yorker';
  } else {
    kind = pool[Math.floor(Math.random()*pool.length)];
  }
  const line = ['off','middle','leg','wide-outside'][Math.floor(Math.random()*4)];
  const acc = Math.min(1, (bowler.accuracy/100) * this.diff.aiBowl * (0.85 + Math.random()*0.3));
  return { kind, line, accuracy: acc,
           pace: 0.6 + (bowler.speed/100)*0.4,
           style: CU.DELIVERIES[kind].desc };
};

})();