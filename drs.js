(function(){
'use strict';
const CU = window.CU = window.CU || {};

const DRS = {
  active: false,
  review: null,
  overlay: null,
  canvas: null,
  ctx: null,

  init(){
    this.overlay = document.getElementById('drs-overlay');
    this.canvas = document.getElementById('drs-canvas');
    if (this.canvas) this.ctx = this.canvas.getContext('2d');
  },

  offerReview(match, event){
    const s = CU.Save.getSettings();
    if (!s.drs) return false;
    const inn = match.current;
    const isBattingSide = inn.battingTeam.id === match.teamA.id;
    const side = isBattingSide ? 'A' : 'B';
    if (match.drsReviews[side] <= 0) return false;
    if (!['lbw','caught','runout','stumped','hitwicket'].includes(event.wicketType)) return false;

    this.review = {
      match, event, side,
      type: event.wicketType,
      strikerName: event.strikerName,
      bowlerName: event.bowlerName
    };
    this.showReviewPrompt();
    return true;
  },

  showReviewPrompt(){
    const ov = this.overlay;
    if (!ov) return;
    ov.classList.add('active');
    const p = document.getElementById('drs-prompt');
    const r = document.getElementById('drs-result');
    if (p) p.style.display = 'flex';
    if (r) r.style.display = 'none';
    const info = document.getElementById('drs-info');
    if (info && this.review){
      const rem = this.review.match.drsReviews[this.review.side];
      info.textContent = `Reviews remaining: ${rem}`;
    }
  },

  decide(accept){
    if (!this.review) return;
    const p = document.getElementById('drs-prompt');
    if (p) p.style.display = 'none';
    if (!accept){
      this.overlay.classList.remove('active');
      this.review = null;
      return;
    }
    this.runReview();
  },

  runReview(){
    const r = this.review;
    const res = document.getElementById('drs-result');
    if (res) res.style.display = 'flex';
    const rng = r.match.rng;
    let verdict = 'OUT';
    const q = r.event.quality || 0.5;

    if (r.type === 'lbw'){
      const hitChance = 0.30 + (1 - q)*0.55;
      verdict = rng() < hitChance ? 'OUT' : 'NOT OUT';
    } else if (r.type === 'caught'){
      verdict = r.event.contact && q > 0.15 ? 'OUT' : 'NOT OUT';
    } else if (r.type === 'runout' || r.type === 'stumped'){
      verdict = rng() < 0.5 ? 'OUT' : 'NOT OUT';
    } else if (r.type === 'hitwicket'){
      verdict = rng() < 0.8 ? 'OUT' : 'NOT OUT';
    }

    this.drawTrajectory(r);

    const v = document.getElementById('drs-verdict');
    if (v){
      v.textContent = verdict;
      v.className = 'drs-verdict ' + (verdict === 'OUT' ? 'out' : 'not-out');
    }

    const m = r.match;
    m.drsReviews[r.side] = Math.max(0, m.drsReviews[r.side] - 1);

    if (verdict === 'NOT OUT'){
      const inn = m.current;
      const b = r.event.batter;
      if (b && b.out){
        b.out = false; b.how = null; b.bowler = null; b.fielder = null;
        inn.wickets = Math.max(0, inn.wickets - 1);
        if (inn.fow.length) inn.fow.pop();
        // Return batsman to crease
        if (inn.strikerIdx !== r.event.batterIdx && inn.nonStrikerIdx !== r.event.batterIdx){
          // Was out — bring back at same end (striker or non)
          inn.strikerIdx = r.event.batterIdx;
        }
        inn.nextBatterIdx = Math.max(2, inn.nextBatterIdx - 1);
      }
      const c = document.getElementById('commentary');
      if (c){ c.textContent = 'Review overturns — NOT OUT!'; c.classList.add('show');
              setTimeout(()=>c.classList.remove('show'),2200); }
    } else {
      const c = document.getElementById('commentary');
      if (c){ c.textContent = 'Review upheld — OUT!'; c.classList.add('show');
              setTimeout(()=>c.classList.remove('show'),2200); }
    }

    setTimeout(() => {
      this.overlay.classList.remove('active');
      if (res) res.style.display = 'none';
      this.review = null;
    }, 2400);
  },

  drawTrajectory(r){
    const c = this.canvas;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio||1);
    const W = c.clientWidth || 280, H = c.clientHeight || 260;
    c.width = W*dpr; c.height = H*dpr;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#0d2413';
    ctx.fillRect(0,0,W,H);
    const pad = 24;
    const px = pad, py = pad, pw = W - pad*2, ph = H - pad*2;

    // Pitch
    ctx.fillStyle = '#c9a875';
    ctx.fillRect(px + pw*0.35, py, pw*0.30, ph);

    // Stumps both ends
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    const sw = 16;
    ctx.beginPath(); ctx.moveTo(px+pw/2-sw/2, py+10); ctx.lineTo(px+pw/2+sw/2, py+10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px+pw/2-sw/2, py+ph-10); ctx.lineTo(px+pw/2+sw/2, py+ph-10); ctx.stroke();

    // Trajectory
    const sx = px+pw/2+10, sy = py+ph-24;
    const ex = px+pw/2, ey = py+24;
    const dev = r.type === 'lbw' ? 26 : 8;
    ctx.strokeStyle = '#3ee07a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx, sy);
    for (let t=0;t<=1;t+=0.05){
      const x = sx + (ex-sx)*t + Math.sin(t*Math.PI)*dev;
      const y = sy + (ey-sy)*t;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Impact
    ctx.fillStyle = '#ffb84d';
    ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif';
    ctx.fillText('Impact', ex+10, ey);
    ctx.fillText(r.type === 'lbw' ? 'Ball tracking' : r.type, 10, 16);
  }
};

CU.DRS = DRS;

// Hook: offer review after wicket
const origExecute = CU.Match.prototype.executeBall;
CU.Match.prototype.executeBall = function(input){
  const ev = origExecute.call(this, input);
  if (ev.wicket && !this._drsOffered && this.isUserBatting && !ev.freeHit){
    this._drsOffered = true;
    setTimeout(() => {
      CU.DRS.offerReview(this, ev);
      this._drsOffered = false;
    }, 500);
  }
  return ev;
};

})();