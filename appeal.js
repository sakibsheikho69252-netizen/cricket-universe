(function(){
'use strict';
const CU = window.CU = window.CU || {};

CU.Appeal = {
  // Visual appeal animation — called by umpire signals already
  shout(decision){
    const ov = document.getElementById('umpire-overlay');
    const el = document.getElementById('umpire-signal');
    if (!el) return;
    const txt = decision === 'OUT' ? '☝ OUT!' : '✋ NOT OUT';
    el.textContent = txt;
    el.className = 'umpire-signal show ' + (decision === 'OUT' ? 'out' : 'notout');
    clearTimeout(this._t);
    this._t = setTimeout(() => el.classList.remove('show'), 1400);
    if (CU.Vibrate) CU.Vibrate.buzz(decision === 'OUT' ? 120 : 40);
  }
};

})();