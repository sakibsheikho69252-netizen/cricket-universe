(function(){
'use strict';
const CU = window.CU = window.CU || {};

CU.Umpire = {
  signals: {
    four:    {text:'4️⃣ FOUR', hold:900},
    six:     {text:'6️⃣ SIX', hold:1200},
    wide:    {text:'↔ WIDE', hold:900},
    noball:  {text:'🚫 NO BALL', hold:1000},
    bye:     {text:'📤 BYE', hold:800},
    legbye:  {text:'🦵 LEG BYE', hold:800},
    out:     {text:'☝ OUT', hold:1300},
    notout:  {text:'✋ NOT OUT', hold:900},
    dead:    {text:'🛑 DEAD BALL', hold:900},
    freehit: {text:'🎯 FREE HIT', hold:900},
    newball: {text:'⚪ NEW BALL', hold:1500},
    over:    {text:'⏱ END OF OVER', hold:900}
  },

  signal(kind, hold){
    const el = document.getElementById('umpire-signal');
    if (!el) return;
    const s = this.signals[kind] || {text: kind, hold: 900};
    el.textContent = s.text;
    el.className = 'umpire-signal show';
    if (kind === 'out') el.classList.add('out');
    clearTimeout(this._t);
    this._t = setTimeout(() => el.classList.remove('show'), hold || s.hold);
    if (CU.Vibrate && (kind === 'out' || kind === 'four' || kind === 'six')){
      CU.Vibrate.buzz(kind === 'out' ? 140 : 60);
    }
  }
};

// Hook: emit umpire signals
const origExecute = CU.Match.prototype.executeBall;
CU.Match.prototype.executeBall = function(input){
  const ev = origExecute.call(this, input);
  if (ev.extra === 'wide') CU.Umpire.signal('wide');
  else if (ev.extra === 'noball') CU.Umpire.signal('noball');
  else if (ev.runs === 4) CU.Umpire.signal('four');
  else if (ev.runs === 6) CU.Umpire.signal('six');
  else if (ev.wicket) CU.Umpire.signal('out');
  if (ev.freeHit) setTimeout(() => CU.Umpire.signal('freehit'), 400);
  if (ev.overEnd) setTimeout(() => CU.Umpire.signal('over'), 300);
  return ev;
};

})();