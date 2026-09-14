(function(){
'use strict';
const CU = window.CU = window.CU || {};

CU.Rain = {
  check(match){
    const w = match.weather;
    if (!w || w.rain <= 0) return false;
    if (Math.random() < w.rain * 0.025){
      this.interrupt(match);
      return true;
    }
    return false;
  },

  interrupt(match){
    const inn = match.current;
    if (!inn || inn.done) return;
    const oversLost = 1 + Math.floor(Math.random()*4);
    const prevMax = inn.maxOvers;
    inn.maxOvers = Math.max(Math.ceil(inn.balls/6) + 1, inn.maxOvers - oversLost);

    let targetMsg = '';
    if (inn.target != null){
      const orig = inn.target;
      const ratio = inn.maxOvers / prevMax;
      inn.target = Math.max(1, Math.ceil(orig * ratio));
      targetMsg = ` New target: ${inn.target}`;
    }

    CU.Umpire && CU.Umpire.signal('dead', 1600);
    const el = document.getElementById('commentary');
    if (el){
      el.textContent = `🌧 Rain stops play. ${oversLost} over(s) lost.${targetMsg}`;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 3200);
    }
  }
};

// Hook
const origExecute = CU.Match.prototype.executeBall;
CU.Match.prototype.executeBall = function(input){
  const ev = origExecute.call(this, input);
  if (!this.ended) CU.Rain.check(this);
  return ev;
};

})();