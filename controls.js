(function(){
'use strict';
const CU = window.CU = window.CU || {};

CU.Gestures = {
  start: null,
  current: null,
  holdTimer: null,
  mappedShot: null,

  init(canvas, ui){
    this.ui = ui;
    this.canvas = canvas;
    // Neutralise ui.js internal tap handler
    ui._onCanvasTap = function(){};

    canvas.addEventListener('pointerdown', e => this.onDown(e), {passive:false});
    canvas.addEventListener('pointermove', e => this.onMove(e), {passive:false});
    canvas.addEventListener('pointerup',   e => this.onUp(e),   {passive:false});
    canvas.addEventListener('pointercancel', () => this.reset());
  },

  onDown(e){
    const ui = this.ui;
    if (!ui.match || !ui.ballInProgress || !ui.match.isUserBatting) return;
    this.start = {x: e.clientX, y: e.clientY, t: performance.now()};
    this.current = {...this.start};
    this.mappedShot = null;
    clearTimeout(this.holdTimer);
    this.holdTimer = setTimeout(() => { this._held = true; }, 260);
    this._held = false;
  },

  onMove(e){
    if (!this.start) return;
    this.current = {x: e.clientX, y: e.clientY, t: performance.now()};
    const dx = this.current.x - this.start.x;
    const dy = this.current.y - this.start.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 26){
      const a = Math.atan2(dy, dx) * 180 / Math.PI;
      let dir;
      if (a >= -22.5 && a < 22.5) dir = 'right';
      else if (a >= 22.5 && a < 67.5) dir = 'down-right';
      else if (a >= 67.5 && a < 112.5) dir = 'down';
      else if (a >= 112.5 && a < 157.5) dir = 'down-left';
      else if (a >= 157.5 || a < -157.5) dir = 'left';
      else if (a >= -157.5 && a < -112.5) dir = 'up-left';
      else if (a >= -112.5 && a < -67.5) dir = 'up';
      else if (a >= -67.5 && a < -22.5) dir = 'up-right';
      this.mappedShot = this.mapDirection(dir);
    }
  },

  onUp(e){
    const ui = this.ui;
    if (!this.start){ return; }
    clearTimeout(this.holdTimer);
    if (!ui.ballInProgress){ this.reset(); return; }
    if (!ui.match || !ui.match.isUserBatting){ this.reset(); return; }

    // Timing quality (same algorithm as tap)
    const now = performance.now();
    const elapsed = now - ui._timingStart;
    const u = Math.min(1, elapsed / ui._timingTotal);
    const ideal = 0.85;
    const err = Math.abs(u - ideal);
    const win = 0.32;
    let quality = Math.max(0, 1 - err / win);
    const s = CU.Save.getSettings();
    if (s.battingAssist) quality = Math.min(1, quality * 1.15 + 0.05);

    const dx = (e.clientX||this.start.x) - this.start.x;
    const dy = (e.clientY||this.start.y) - this.start.y;
    const dist = Math.hypot(dx, dy);
    const dt = now - this.start.t;

    let shot = ui.curShotType;
    if (dist > 40 && this.mappedShot) shot = this.mappedShot;
    if (this._held || dist > 120) quality = Math.min(1, quality * 1.10);

    ui.pendingQuality = quality;
    ui.pendingShot = shot;
    ui.ballInProgress = false;
    ui._stopTiming();
    ui._resolveAndShow();
    this.reset();
  },

  reset(){
    this.start = null; this.current = null;
    this.mappedShot = null;
    clearTimeout(this.holdTimer);
    this._held = false;
  },

  mapDirection(dir){
    const map = {
      'up':        'loft',
      'up-right':  'cover',
      'right':     'squareDrive',
      'down-right':'lateCut',
      'down':      'defend',
      'down-left': 'glance',
      'left':      'flick',
      'up-left':   'on'
    };
    return map[dir] || this.ui.curShotType;
  }
};

})();