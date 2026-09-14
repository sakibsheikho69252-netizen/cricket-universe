(function(){
'use strict';
const CU = window.CU = window.CU || {};
const { DATA } = CU;

// AI decision-maker for batting, bowling, fielding, captaincy
class AI {
  constructor(difficulty){
    this.diff = DATA.DIFFICULTY[difficulty] || DATA.DIFFICULTY.Normal;
    this.name = difficulty;
  }

  // Choose shot for AI batsman
  chooseShot(batter, situation){
    const {target, requiredRate, ballsRemaining, wicketsLeft, oversLeft} = situation;
    const aggression = (batter.power + (100 - batter.technique)*0.3) / 130 * this.diff.aiAggr;
    const pressure = target != null ? Math.max(0, (requiredRate - 8) / 12) : Math.max(0, (8 - (situation.currentRR||0)) / 12);

    const rand = Math.random();
    const aggr = Math.min(1, aggression + pressure*0.5);

    if (ballsRemaining < 12 || wicketsLeft < 3){
      if (rand < aggr*0.8) return Math.random()<0.5 ? 'loft' : 'drive';
      return Math.random()<0.6 ? 'drive' : 'defend';
    }
    if (target != null && requiredRate > 10){
      if (rand < 0.55) return 'loft';
      if (rand < 0.8) return 'drive';
      return 'flick';
    }
    // Normal play
    if (rand < 0.05) return 'defend';
    if (rand < 0.20) return 'drive';
    if (rand < 0.32) return 'cut';
    if (rand < 0.44) return 'pull';
    if (rand < 0.55) return 'flick';
    if (rand < 0.68) return 'sweep';
    if (rand < 0.80) return 'drive';
    return Math.random()<0.5 ? 'loft' : 'cut';
  }

  // Return timing quality (0..1) for AI batter against a delivery.
  // Better batter vs weaker bowler ⇒ better timing.
  swingQuality(batter, bowler, delivery){
    const skill = (batter.bat*0.6 + batter.technique*0.4) / 100;
    const bowl = (bowler.bowl*0.6 + bowler.accuracy*0.4) / 100;
    const delivHardness = ({yorker:0.35, bouncer:0.25, slower:0.28, googly:0.3, doosra:0.32})[delivery.kind] || 0.15;
    const base = 0.65 + (skill - bowl)*0.35 - delivHardness + (Math.random()-0.5)*0.45;
    return Math.max(0.02, Math.min(1, base * this.diff.aiBat));
  }

  // Choose delivery for AI bowler
  chooseDelivery(bowler, situation){
    const kinds = ['good-length','full','short','yorker','bouncer','slower','cutter'];
    const pitch = situation.pitch;
    const speed = bowler.speed/100;
    const accuracy = bowler.accuracy/100;

    let kind = 'good-length';
    if (situation.ballsRemaining < 6 && Math.random() < 0.35 + speed*0.2){
      kind = Math.random()<0.6 ? 'yorker' : 'slower';
    } else if (situation.isNewBatter && Math.random() < 0.5){
      kind = 'good-length';
    } else if (situation.wicketsLeft <= 4 && Math.random() < 0.4){
      kind = 'yorker';
    } else {
      kind = kinds[Math.floor(Math.random()*kinds.length)];
    }

    const line = ['off','middle','leg','wide-outside'][Math.floor(Math.random()*4)];
    const acc = Math.min(1, accuracy * this.diff.aiBowl * (0.85 + Math.random()*0.3));
    return { kind, line, accuracy: acc, pace: 0.6 + speed*0.4 };
  }

  // Pick bowling end (which bowler bowls next over)
  chooseBowler(bowlingTeam, usedOvers, lastBowlerId, oversRemaining){
    // Simple: pick a bowler who hasn't bowled in last over, prefer higher bowl rating
    const eligible = bowlingTeam.players.filter(p => p.id !== lastBowlerId);
    if (!eligible.length) return bowlingTeam.players[0];
    // Sort by bowl rating + randomness, cap overs per bowler
    const maxOvers = Math.ceil(oversRemaining / 4) + 2;
    const pool = eligible.filter(p => (usedOvers[p.id]||0) < maxOvers);
    const use = pool.length ? pool : eligible;
    use.sort((a,b)=> (b.bowl + Math.random()*20) - (a.bowl + Math.random()*20));
    return use[0];
  }

  // Captaincy: choose field preset based on situation
  chooseField(situation){
    if (situation.isPowerplay) return 'powerplay';
    if (situation.target != null && situation.requiredRate > 10) return 'defensive';
    if (situation.wicketsLeft <= 3 && situation.recentWicket) return 'attacking';
    if (situation.spinBowling) return 'spin';
    return 'standard';
  }

  // Toss decision
  tossDecision(){
    return Math.random() < 0.52 ? 'Bat' : 'Bowl';
  }
}

CU.AI = AI;

})();