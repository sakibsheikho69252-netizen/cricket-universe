(function(){
'use strict';
const CU = window.CU = window.CU || {};

class Audio {
  constructor(){
    this.ctx = null;
    this.enabled = true;
    this.musicOn = true;
    this.volume = 0.6;
  }
  _ensure(){
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    } catch(e){ this.enabled = false; }
  }
  _tone(freq, dur, type, vol){
    if (!this.enabled) return;
    this._ensure();
    if (!this.ctx) return;
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.value = 0;
      const now = this.ctx.currentTime;
      g.gain.linearRampToValueAtTime(vol * this.volume, now + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(now); o.stop(now + dur + 0.02);
    } catch(e){}
  }
  _noise(dur, vol, filterFreq){
    if (!this.enabled) return;
    this._ensure();
    if (!this.ctx) return;
    try {
      const sr = this.ctx.sampleRate;
      const len = Math.max(1, Math.floor(sr * dur));
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let i=0;i<len;i++) data[i] = (Math.random()*2-1) * (1 - i/len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = vol * this.volume;
      let node = src;
      if (filterFreq){
        const f = this.ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = filterFreq;
        f.Q.value = 1.2;
        node = src.connect(f);
        f.connect(g);
      } else {
        src.connect(g);
      }
      g.connect(this.ctx.destination);
      src.start();
    } catch(e){}
  }
  bat(){ this._tone(880, 0.08, 'square', 0.35); this._noise(0.06, 0.25, 1800); }
  bounce(){ this._tone(180, 0.05, 'triangle', 0.22); }
  catch(){ this._tone(420, 0.06, 'sine', 0.3); this._noise(0.05, 0.18, 900); }
  four(){ this._tone(660, 0.12,'sine',0.28); setTimeout(()=>this._tone(880,0.16,'sine',0.28),70); }
  six(){ [0,60,120].forEach((d,i)=>setTimeout(()=>this._tone(500+i*220,0.16,'sine',0.3),d)); }
  wicket(){ this._tone(160,0.25,'sawtooth',0.32); this._noise(0.2,0.2,400); }
  crowd(level){ const v = 0.15 + (level||0)*0.3; this._noise(0.6, v, 800); }
  ui(){ this._tone(520, 0.04, 'sine', 0.2); }
  wide(){ this._tone(320, 0.15, 'sine', 0.25); }
  noball(){ this._tone(360, 0.18, 'sine', 0.25); }
  appeal(){ this._tone(220,0.35,'sawtooth',0.18); }
  tick(){ this._tone(1200, 0.02, 'square', 0.1); }
}
CU.Audio = new Audio();

})();