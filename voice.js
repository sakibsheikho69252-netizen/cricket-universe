(function(){
'use strict';
const CU = window.CU = window.CU || {};

CU.Voice = {
  supported: false,
  enabled: false,
  lastText: '',
  lastAt: 0,

  init(){
    this.supported = 'speechSynthesis' in window;
    const s = CU.Save.getSettings();
    this.enabled = s.commentary && this.supported;
    if (this.enabled){
      const el = document.getElementById('commentary');
      if (!el) return;
      const obs = new MutationObserver(() => this.speak(el.textContent));
      obs.observe(el, {childList:true, characterData:true, subtree:true});
      this._obs = obs;
    }
  },

  refresh(){
    const s = CU.Save.getSettings();
    this.enabled = s.commentary && this.supported;
    if (this.enabled && !this._obs) this.init();
  },

  speak(text){
    if (!this.enabled || !this.supported || !text) return;
    const now = Date.now();
    if (text === this.lastText && now - this.lastAt < 800) return;
    if (now - this.lastAt < 400) return;
    this.lastText = text; this.lastAt = now;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.08; u.pitch = 1.0; u.volume = 0.85;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch(e){}
  },

  stop(){
    if (this.supported) try { speechSynthesis.cancel(); } catch(e){}
  }
};

})();