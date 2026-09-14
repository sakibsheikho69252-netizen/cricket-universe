(function(){
'use strict';
const CU = window.CU = window.CU || {};
const { Rules, DATA } = CU;

function cloneTeam(team){
  return JSON.parse(JSON.stringify(team));
}

class Innings {
  constructor(batting, bowling, config){
    this.battingTeam = batting;
    this.bowlingTeam = bowling;
    this.maxOvers = config.overs;
    this.maxWickets = Math.min(config.wickets, batting.players.length - 1);
    this.runs = 0;
    this.wickets = 0;
    this.balls = 0;      // legal balls
    this.extras = {wides:0, noballs:0, byes:0, legbyes:0};
    this.target = config.target || null;
    this.format = config.format;

    this.batting = batting.players.map(p => ({
      player: p, runs: 0, balls: 0, fours: 0, sixes: 0,
      out: false, how: null, bowler: null, fielder: null, order: 0
    }));
    this.bowling = bowling.players.map(p => ({
      player: p, balls: 0, runs: 0, wickets: 0, maidens: 0, wides:0, noballs:0, order: -1
    }));
    this.nextBatterIdx = 2;
    this.strikerIdx = 0;
    this.nonStrikerIdx = 1;
    this.currentBowlerIdx = 0;
    this.partnerships = [];
    this.currentPartnership = {runs:0, balls:0, b1:0, b2:1};
    this.fow = [];
    this.overHistory = []; // array of arrays of ball-events
    this.currentOver = [];
    this.legalBallsThisOver = 0;
    this.thisOverRuns = 0;
    this.thisOverWickets = 0;
    this.spellOvers = {}; // bowlerIdx -> overs count
    this.lastEvent = null;
    this.freeHit = false;
    this.done = false;
    this.endedReason = null;
    this.dayOver = config.dayOver || false;
    // Assign bowler order to first bowler
    this.bowling[0].order = 0;
  }

  get striker(){ return this.batting[this.strikerIdx]; }
  get nonStriker(){ return this.batting[this.nonStrikerIdx]; }
  get currentBowler(){ return this.bowling[this.currentBowlerIdx]; }
  get battingTeamRemaining(){ return this.batting.length - this.nextBatterIdx; }
  get maxBalls(){ return this.maxOvers * 6; }
  get oversText(){ return Rules.oversText(this.balls); }

  addExtra(kind, runs){
    if (kind === 'wide'){ this.runs += 1; this.extras.wides += 1; this.currentBowler.wides += 1; this.currentBowler.runs += 1; this.currentPartnership.runs += 1; }
    else if (kind === 'noball'){ this.runs += 1; this.extras.noballs += 1; this.currentBowler.noballs += 1; this.currentBowler.runs += 1; this.currentPartnership.runs += 1; }
    else if (kind === 'bye'){ this.runs += runs; this.extras.byes += runs; this.currentPartnership.runs += runs; }
    else if (kind === 'legbye'){ this.runs += runs; this.extras.legbyes += runs; this.currentBowler.runs += runs; this.currentPartnership.runs += runs; }
  }

  recordBall(ev){
    // ev: {legal, runs, wicket, wicketType, extra, batter, bowler, fielder}
    this.lastEvent = ev;
    this.currentOver.push(ev);
    if (ev.legal){
      this.balls += 1;
      this.legalBallsThisOver += 1;
      this.striker.balls += 1;
      this.currentBowler.balls += 1;
      this.currentPartnership.balls += 1;
      this.thisOverRuns += ev.runs;
    } else {
      this.thisOverRuns += ev.runs;
    }
    if (ev.wicket){
      this.wickets += 1;
      this.thisOverWickets += 1;
      const batsman = ev.batter;
      batsman.out = true;
      batsman.how = ev.wicketType;
      batsman.bowler = ev.bowler ? ev.bowler.player.name : null;
      batsman.fielder = ev.fielder || null;
      this.fow.push({
        wicket: this.wickets, runs: this.runs, over: this.oversText,
        batter: batsman.player.name, batsmanIdx: ev.batterIdx
      });
      // Close partnership
      this.partnerships.push({
        runs: this.currentPartnership.runs,
        balls: this.currentPartnership.balls,
        b1: this.currentPartnership.b1,
        b2: this.currentPartnership.b2,
        wicket: this.wickets
      });
      this.currentPartnership = {runs:0, balls:0, b1:0, b2:0};
      if (ev.extra === 'bye' || ev.extra === 'legbye'){
        // handled separately
      }
    }
  }

  addBatterRun(batterIdx, runs){
    const b = this.batting[batterIdx];
    b.runs += runs;
    this.runs += runs;
    if (runs === 4) b.fours += 1;
    if (runs === 6) b.sixes += 1;
    this.currentPartnership.runs += runs;
    this.currentBowler.runs += runs;
  }

  swapStrike(){
    const t = this.strikerIdx;
    this.strikerIdx = this.nonStrikerIdx;
    this.nonStrikerIdx = t;
  }

  bringNextBatter(idxToReplace){
    if (this.nextBatterIdx >= this.batting.length) return false;
    if (idxToReplace === this.strikerIdx) this.strikerIdx = this.nextBatterIdx;
    else this.nonStrikerIdx = this.nextBatterIdx;
    this.nextBatterIdx += 1;
    // start new partnership
    this.currentPartnership = {runs:0, balls:0, b1: this.strikerIdx, b2: this.nonStrikerIdx};
    return true;
  }

  isOverComplete(){
    return this.legalBallsThisOver > 0 && this.legalBallsThisOver >= 6;
  }

  completeOver(){
    // Maiden check
    if (this.thisOverRuns === 0 && this.thisOverWickets === 0 && this.legalBallsThisOver >= 6){
      this.currentBowler.maidens += 1;
    }
    this.spellOvers[this.currentBowlerIdx] = (this.spellOvers[this.currentBowlerIdx]||0) + this.legalBallsThisOver/6;
    this.overHistory.push(this.currentOver);
    this.currentOver = [];
    this.legalBallsThisOver = 0;
    this.thisOverRuns = 0;
    this.thisOverWickets = 0;
    // End change: swap strike
    this.swapStrike();
  }

  isComplete(){
    if (this.wickets >= this.maxWickets) { this.endedReason = 'all-out'; return true; }
    if (this.balls >= this.maxBalls) { this.endedReason = 'overs'; return true; }
    if (this.target != null && this.runs >= this.target) { this.endedReason = 'target'; return true; }
    if (this.nextBatterIdx >= this.batting.length && this.batting.some(b=>!b.out)) {
      // all out effectively
      this.endedReason = 'all-out'; return true;
    }
    return false;
  }

  setBowler(idx){
    this.currentBowlerIdx = idx;
    if (this.bowling[idx].order === -1) this.bowling[idx].order = this.bowling.filter(b=>b.order>=0).length;
  }
}

class Match {
  constructor(config){
    this.config = config; // {teamA, teamB, format, overs, wickets, difficulty, pitch, weather, stadium, timeOfDay}
    this.teamA = cloneTeam(config.teamA);
    this.teamB = cloneTeam(config.teamB);
    this.pitch = config.pitch;
    this.weather = config.weather;
    this.stadium = config.stadium;
    this.rng = CU.mulberry32(Date.now() & 0xffffffff);
    this.ai = new CU.AI(config.difficulty || 'Normal');
    this.inningsList = [];
    this.currentInningsIdx = 0;
    this.result = null;
    this.tossWinner = null;
    this.tossDecision = null;
    this.battingFirstTeam = null;
    this.tossDone = false;
    this.started = false;
    this.ended = false;
    this.drsReviews = {A: config.format === 'Test' ? 2 : 2, B: config.format === 'Test' ? 2 : 2};
    this.freeHitAvailable = config.freeHit !== false;
    this.matchStats = {};
    this.history = []; // ball-by-ball log
    this.slotBatting = null; // 'A' or 'B'
    this.fieldPreset = 'standard';
  }

  aiDifficulty(){
    return this.ai.diff;
  }

  // Toss
  doToss(userCall){
    const coin = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const winner = coin === userCall ? this.teamA : this.teamB; // user is teamA
    this.tossWinner = winner;
    // Decide bat/bowl — user gets to choose, AI auto-decides
    if (winner.id === this.teamA.id){
      return { coin, winner: winner.name, userDecision: true };
    } else {
      const decision = this.ai.tossDecision();
      this.tossDecision = decision;
      this.applyToss(decision);
      return { coin, winner: winner.name, userDecision: false, decision };
    }
  }

  applyToss(decision){
    this.tossDecision = decision;
    const winner = this.tossWinner;
    const loser = winner.id === this.teamA.id ? this.teamB : this.teamA;
    if (decision === 'Bat'){
      this.battingFirstTeam = winner;
    } else {
      this.battingFirstTeam = loser;
    }
    this.tossDone = true;
  }

  start(){
    if (!this.tossDone) throw new Error('Toss not done');
    const first = this.battingFirstTeam;
    const second = first.id === this.teamA.id ? this.teamB : this.teamA;

    // Innings 1
    const inn1 = new Innings(first, second, {
      overs: this.config.overs, wickets: this.config.wickets,
      format: this.config.format, target: null
    });
    inn1.setBowler(this.ai.chooseBowler(second, inn1.spellOvers, null, this.config.overs));
    this.inningsList.push(inn1);
    // Innings 2 (for limited overs) / Innings 3,4 for Test — handled later
    this.inningsList.push(new Innings(second, first, {
      overs: this.config.overs, wickets: this.config.wickets,
      format: this.config.format, target: null
    }));
    this.currentInningsIdx = 0;
    this.started = true;
    return inn1;
  }

  get current(){ return this.inningsList[this.currentInningsIdx]; }
  get isUserBatting(){
    const inn = this.current;
    if (!inn) return false;
    // user controls teamA always
    return inn.battingTeam.id === this.teamA.id;
  }

  // Choose delivery (user or AI)
  chooseDelivery(forced){
    const inn = this.current;
    const bowler = inn.currentBowler.player;
    if (forced) return forced;
    // AI bowls
    return this.ai.chooseDelivery(bowler, {
      pitch: this.pitch,
      ballsRemaining: inn.maxBalls - inn.balls,
      wicketsLeft: inn.maxWickets - inn.wickets,
      isNewBatter: inn.striker.balls < 3
    });
  }

  // Choose shot (user or AI)
  chooseShot(forcedShot, forcedQuality){
    const inn = this.current;
    const batter = inn.striker.player;
    if (forcedShot){
      return { shot: forcedShot, quality: forcedQuality };
    }
    // AI batting
    const target = inn.target;
    const requiredRate = target != null ? Rules.requiredRate(target - inn.runs, inn.maxBalls - inn.balls) : null;
    const shot = this.ai.chooseShot(batter, {
      target, requiredRate,
      ballsRemaining: inn.maxBalls - inn.balls,
      wicketsLeft: inn.maxWickets - inn.wickets,
      oversLeft: inn.maxOvers - inn.balls/6,
      currentRR: Rules.runRate(inn.runs, inn.balls)
    });
    const delivery = this.lastDelivery || {kind:'good-length'};
    const quality = this.ai.swingQuality(batter, inn.currentBowler.player, delivery);
    return { shot, quality };
  }

  // Core: execute a delivery and return result
  // inputs: {delivery, shot, quality}
  executeBall(input){
    const inn = this.current;
    const rng = this.rng;
    const bowler = inn.currentBowler.player;
    const batter = inn.striker.player;
    const delivery = input.delivery || {kind:'good-length', line:'off', accuracy:0.9, pace:0.8};

    // 1) Check extra (wide/no-ball)
    let extra = null;
    if (delivery.kind !== 'yorker' && delivery.kind !== 'beamer'){
      extra = Rules.resolveExtra(delivery, rng);
    } else if (delivery.kind === 'beamer'){
      extra = 'noball';
    }

    // 2) Free hit handling
    const isFreeHit = inn.freeHit;
    if (isFreeHit){
      extra = null;
    }

    if (extra){
      const ev = {
        legal: false, runs: 0, wicket: false, wicketType: null,
        extra, batter: inn.striker, batterIdx: inn.strikerIdx,
        bowler: inn.currentBowler, delivery, shot: null, quality: 0,
        strikerName: batter.name, bowlerName: bowler.name,
        over: inn.oversText, freeHit: isFreeHit
      };
      if (extra === 'wide'){
        inn.addExtra('wide', 1);
        ev.runs = 1;
      } else if (extra === 'noball'){
        inn.addExtra('noball', 1);
        ev.runs = 1;
        if (this.freeHitAvailable) inn.freeHit = true;
      }
      inn.recordBall(ev);
      this.history.push(ev);
      this.lastDelivery = delivery;
      return ev;
    }

    // 3) Shot resolution
    const shot = input.shot || 'drive';
    const quality = input.quality != null ? input.quality : 0.5;
    const resolved = Rules.resolveShot(shot, quality, batter, bowler, this.pitch, this.weather, rng);

    let runs = resolved.runs;
    let wicket = null;

    // 4) Wicket check
    if (resolved.contact){
      const possible = this.possibleDismissals(shot, quality, delivery);
      const w = Rules.rollWicket(resolved.wicketChance, rng, possible);
      if (w) wicket = w;
    } else {
      // Missed ball — bowled or LBW chance
      if (!isFreeHit){
        const missWicketChance = (bowler.bowl/200) * 0.35 + 0.08;
        const w = Rules.rollWicket(missWicketChance, rng, ['bowled','lbw']);
        if (w) wicket = w;
      }
    }

    // 5) Free hit protection — only run out allowed
    if (isFreeHit && wicket && wicket !== 'runout'){
      wicket = null;
    }

    // 6) Apply runs and record
    const ev = {
      legal: true, runs: 0, wicket: !!wicket, wicketType: wicket,
      extra: null, batter: inn.striker, batterIdx: inn.strikerIdx,
      bowler: inn.currentBowler, delivery, shot, quality,
      strikerName: batter.name, bowlerName: bowler.name,
      over: inn.oversText, freeHit: isFreeHit,
      edge: resolved.edge || null,
      contact: resolved.contact
    };

    if (wicket){
      // Wicket: no runs added except for run-out edge cases; keep simple
      if (wicket === 'runout'){
        // runs 0 for the dismissed batsman; maybe batter scores 0 and cross
        inn.recordBall(ev);
      } else {
        inn.recordBall(ev);
      }
    } else {
      inn.addBatterRun(inn.strikerIdx, runs);
      ev.runs = runs;
      inn.recordBall(ev);
      // Odd runs → swap
      if (runs % 2 === 1) inn.swapStrike();
    }

    // Record free-hit consumption
    if (isFreeHit) inn.freeHit = false;

    // Milestones
    const striker = inn.striker;
    if (!wicket && striker.runs >= 50 && striker.runs - runs < 50){
      ev.milestone = 'fifty';
    }
    if (!wicket && striker.runs >= 100 && striker.runs - runs < 100){
      ev.milestone = 'century';
    }

    this.history.push(ev);
    this.lastDelivery = delivery;

    // 7) Over completion
    if (inn.isOverComplete()){
      inn.completeOver();
      ev.overEnd = true;
      this.rotateBowler();
    }

    // 8) Innings completion
    if (inn.isComplete()){
      inn.done = true;
      this.onInningsEnd();
    }

    return ev;
  }

  possibleDismissals(shot, quality, delivery){
    const list = ['bowled','caught','lbw'];
    if (shot === 'sweep' || shot === 'cut') list.push('caught','lbw','stumped');
    if (quality > 0.7) return ['caught','runout'];
    if (quality < 0.3) return ['caught','bowled','lbw','stumped'];
    return list;
  }

  rotateBowler(){
    const inn = this.current;
    if (!inn || inn.done) return;
    // User bats? AI picks bowler. User bowls? They pick manually (UI handles).
    if (inn.battingTeam.id === this.teamA.id){
      // AI is bowling → pick a new bowler different from current
      const curId = inn.currentBowler.player.id;
      const next = this.ai.chooseBowler(inn.bowlingTeam, inn.spellOvers, curId, inn.maxOvers);
      const idx = inn.bowling.findIndex(b => b.player.id === next.id);
      if (idx >= 0) inn.setBowler(idx);
    }
    // Update AI field preset
    const situ = {
      isPowerplay: this.isPowerplay(),
      target: inn.target,
      requiredRate: inn.target != null ? Rules.requiredRate(inn.target - inn.runs, inn.maxBalls - inn.balls) : 0,
      wicketsLeft: inn.maxWickets - inn.wickets,
      recentWicket: inn.thisOverWickets > 0,
      spinBowling: inn.currentBowler.player.bowlStyle.includes('break') || inn.currentBowler.player.bowlStyle.includes('orthodox') || inn.currentBowler.player.bowlStyle.includes('chinaman')
    };
    this.fieldPreset = this.ai.chooseField(situ);
  }

  isPowerplay(){
    if (this.config.format === 'Test') return false;
    return this.current.balls < (DATA.FORMATS[this.config.format].ppOvers * 6);
  }

  onInningsEnd(){
    const inn = this.current;
    // Close final partnership
    if (inn.currentPartnership.balls > 0){
      inn.partnerships.push({
        runs: inn.currentPartnership.runs, balls: inn.currentPartnership.balls,
        b1: inn.currentPartnership.b1, b2: inn.currentPartnership.b2, wicket: inn.wickets
      });
    }
    // If this was innings 1 of a 2-innings match, set target for innings 2
    if (this.currentInningsIdx === 0 && this.config.format !== 'Test'){
      const target = inn.runs + 1;
      this.inningsList[1].target = target;
    }
    if (this.config.format === 'Test' && this.currentInningsIdx === 1){
      // Test: schedule innings 3, 4 — simplified
      const firstTeam = this.inningsList[0].battingTeam;
      const secondTeam = this.inningsList[0].bowlingTeam;
      const inn3 = new Innings(firstTeam, secondTeam, {
        overs: this.config.overs, wickets: this.config.wickets, format: 'Test', target: null
      });
      inn3.setBowler(this.ai.chooseBowler(secondTeam, {}, null, this.config.overs));
      this.inningsList.push(inn3);
      const inn4 = new Innings(secondTeam, firstTeam, {
        overs: this.config.overs, wickets: this.config.wickets, format: 'Test', target: null
      });
      this.inningsList.push(inn4);
    }
    // Determine if match ended
    if (this.currentInningsIdx >= this.inningsList.length - 1){
      this.ended = true;
      this.computeResult();
    } else {
      this.currentInningsIdx += 1;
      const next = this.current;
      if (next.bowling.length){
        next.setBowler(this.ai.chooseBowler(next.bowlingTeam, {}, null, next.maxOvers));
      }
    }
  }

  computeResult(){
    if (this.inningsList.length < 2) return;
    const inn1 = this.inningsList[0];
    const inn2 = this.inningsList[1];
    const team1 = inn1.battingTeam;
    const team2 = inn2.battingTeam;

    if (this.config.format === 'Test'){
      // Simple: aggregate innings
      const totalA = this.inningsList.filter((_,i)=>i%2===0).reduce((s,i)=>s+i.runs,0);
      const totalB = this.inningsList.filter((_,i)=>i%2===1).reduce((s,i)=>s+i.runs,0);
      if (totalA === totalB){
        this.result = {type:'tie', text:'Match tied!'};
      } else if (totalA > totalB){
        this.result = {type:'win', winner: team1.name, text:`${team1.name} won by ${totalA-totalB} runs`};
      } else {
        this.result = {type:'win', winner: team2.name, text:`${team2.name} won by ${totalB-totalA} runs`};
      }
      return;
    }

    if (inn2.runs >= inn2.target){
      const wicketsLeft = inn2.maxWickets - inn2.wickets;
      this.result = {
        type: 'win', winner: team2.name,
        text: `${team2.name} won by ${wicketsLeft} wicket${wicketsLeft!==1?'s':''}`
      };
    } else if (inn2.runs === inn1.runs){
      this.result = {type:'tie', text:'Match tied!'};
    } else {
      const margin = inn1.runs - inn2.runs;
      this.result = {
        type: 'win', winner: team1.name,
        text: `${team1.name} won by ${margin} run${margin!==1?'s':''}`
      };
    }
  }

  // Public: force end (for rain / user quit)
  forceEnd(reason){
    this.ended = true;
    if (reason === 'rain'){
      this.result = {type:'noresult', text:'Match abandoned — No Result'};
    }
  }
}

CU.Match = Match;
CU.Innings = Innings;

})();