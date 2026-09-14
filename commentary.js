(function(){
'use strict';
const CU = window.CU = window.CU || {};

const LINES = {
  dot: ['No run.','Solid defence.','Beaten! No run.','Dot ball, pressure builds.',
        'Straight to the fielder.','Good tight line.','Played and missed!'],
  one: ['Quick single taken.','Pushed into the gap for one.','Easy single.',
        'Nudged off the pads for one.','Well run!'],
  two: ['Good running, two runs.','Placed into the gap for a couple.',
        'Excellent placement — two.','Driven wide of mid-off, they take two.'],
  three: ['Three runs! Great running.','Hard run, three taken.','Deep fielder cuts it off, they run three.'],
  four: ['FOUR! Beautiful shot!','Cracked through the covers — four!',
         'FOUR! Timed to perfection.','Races away to the boundary — four!',
         'Sweetly struck — four runs!'],
  six: ['SIX! Massive hit!','Into the crowd — SIX!','That is out of here! SIX!',
        'Clean strike over the ropes! SIX!','Monster hit — SIX runs!'],
  wicket_bowled: ['BOWLED HIM! Timber!','Through the gate — BOWLED!','The stumps are shattered!'],
  wicket_caught: ['CAUGHT! Taken cleanly!','Up in the air… and taken!',
                  'Straight to the fielder — OUT!','Excellent catch! Gone!'],
  wicket_lbw: ['LBW! Plumb in front!','Given LBW — big wicket!','Trapped on the pads — OUT!'],
  wicket_runout: ['RUN OUT! Direct hit!','Terrible mix-up — RUN OUT!','Run out at the striker\'s end!'],
  wicket_stumped: ['STUMPED! Quick hands behind the stumps!','Down the track and stumped!'],
  wicket_hitwicket: ['HIT WICKET! Disaster!','He\'s knocked his own stumps over!'],
  wicket_other: ['OUT! Umpire raises the finger!','He has to go!'],
  wide: ['Wide called.','That\'s down leg — wide.','Wide, extra run.'],
  noball: ['No-ball! Free hit coming.','Overstepped — no-ball!','No-ball called.'],
  bye: ['Byes taken.','Through the keeper — byes.'],
  legbye: ['Off the pads — leg bye.','Leg bye signalled.'],
  appeal_out: ['The umpire raises the finger — OUT!','Given! Big moment.'],
  appeal_notout: ['Not out! The umpire shakes his head.','Not out — good decision.'],
  fifty: ['FIFTY! A fine half-century!','Fifty up — magnificent knock!'],
  century: ['CENTURY! A magnificent hundred!','Hundred up — take a bow!'],
  over_end: ['End of the over.','That\'s the over.','Over complete.'],
  innings_end: ['Innings complete.','That\'s the end of the innings.'],
  freehit: ['Free hit!','This is a free hit delivery.']
};

function pick(arr, rng){ return arr[Math.floor((rng?rng():Math.random())*arr.length)]; }

function ballLine(ev, rng){
  if (ev.type === 'wide') return pick(LINES.wide, rng);
  if (ev.type === 'noball') return pick(LINES.noball, rng);
  if (ev.type === 'bye') return pick(LINES.bye, rng);
  if (ev.type === 'legbye') return pick(LINES.legbye, rng);
  if (ev.wicket){
    const k = ev.wicket;
    if (k === 'bowled') return pick(LINES.wicket_bowled, rng);
    if (k === 'caught') return pick(LINES.wicket_caught, rng);
    if (k === 'lbw') return pick(LINES.wicket_lbw, rng);
    if (k === 'runout') return pick(LINES.wicket_runout, rng);
    if (k === 'stumped') return pick(LINES.wicket_stumped, rng);
    if (k === 'hitwicket') return pick(LINES.wicket_hitwicket, rng);
    return pick(LINES.wicket_other, rng);
  }
  if (ev.runs === 0) return pick(LINES.dot, rng);
  if (ev.runs === 1) return pick(LINES.one, rng);
  if (ev.runs === 2) return pick(LINES.two, rng);
  if (ev.runs === 3) return pick(LINES.three, rng);
  if (ev.runs === 4) return pick(LINES.four, rng);
  if (ev.runs === 6) return pick(LINES.six, rng);
  return '';
}

function milestoneLine(kind, rng){
  if (kind === 'fifty') return pick(LINES.fifty, rng);
  if (kind === 'century') return pick(LINES.century, rng);
  return '';
}

CU.Commentary = { ballLine, milestoneLine };

})();