(function(){
'use strict';
const CU = window.CU = window.CU || {};

CU.TestMode = {
  SESSIONS_PER_DAY: 3,
  OVERS_PER_SESSION: 30,
  NEW_BALL_OVERS: 80,

  attach(match){
    if (match.config.format !== 'Test') return;
    match.day = 1;
    match.session = 1;
    match.ballsThisSession = 0;
    match.declaredInnings = [];
    match.followOnApplied = false;
    match.deterioration = 0;
    match.pitchModifier = {bat:1, pace:1, spin:1, bounce:1};
  },

  onBall(match, ev){
    if (match.config.format !== 'Test') return;
    match.ballsThisSession++;
    match.deterioration = Math.min(1, match.balls / 1200);
    const d = match.deterioration;
    match.pitchModifier.spin = 1 + d*0.55;
    match.pitchModifier.bounce = 1 - d*0.15;
    match.pitchModifier.bat = 1 - d*0.28;

    if (match.ballsThisSession >= this.OVERS_PER_SESSION * 6){
      match.session++;
      match.ballsThisSession = 0;
      if (match.session > this.SESSIONS_PER_DAY){
        match.session = 1;
        match.day++;
        this.announce(`Day ${match.day} begins.`, 'dayStart');
      } else {
        this.announce(`Session ${match.session} begins.`, 'sessionStart');
      }
      if (match.balls % (this.NEW_BALL_OVERS * 6) === 0){
        CU.Umpire.signal('newball', 1800);
        this.announce('New ball taken — harder, faster.', 'newball');
      }
    }
  },

  declare(match){
    const inn = match.current;
    if (!inn || inn.done) return false;
    match.declaredInnings.push(match.currentInningsIdx);
    inn.done = true;
    this.announce(`Innings ${match.currentInningsIdx+1} declared at ${inn.runs}/${inn.wickets}.`, 'declared');
    match.onInningsEnd();
    return true;
  },

  checkFollowOn(match){
    if (match.inningsList.length < 2) return false;
    const inn1 = match.inningsList[0];
    const inn2 = match.inningsList[1];
    if (inn1.runs - inn2.runs >= 200) return true;
    return false;
  },

  announce(text, kind){
    const el = document.getElementById('commentary');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
    if (kind) CU.Save.set('test.lastEvent', {kind, text, t: Date.now()});
  }
};

// Hooks
const origExecute = CU.Match.prototype.executeBall;
CU.Match.prototype.executeBall = function(input){
  const ev = origExecute.call(this, input);
  CU.TestMode.onBall(this, ev);
  return ev;
};

const origStart = CU.Match.prototype.start;
CU.Match.prototype.start = function(){
  CU.TestMode.attach(this);
  return origStart.call(this);
};

})();