(function(){
'use strict';
const CU = window.CU = window.CU || {};

class Renderer {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.W = 0; this.H = 0;
    this.balls = []; // active ball animations
    this.particles = [];
    this.resize();
    window.addEventListener('resize', ()=>this.resize());
    window.addEventListener('orientationchange', ()=>setTimeout(()=>this.resize(), 300));
  }

  resize(){
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(r.width * this.dpr);
    this.canvas.height = Math.floor(r.height * this.dpr);
    this.W = r.width; this.H = r.height;
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
  }

  // Field coordinate helpers
  cx(){ return this.W/2; }
  cy(){ return this.H/2; }
  fieldRadius(){ return Math.min(this.W, this.H) * 0.42; }

  drawField(state){
    const ctx = this.ctx;
    const W = this.W, H = this.H;
    const cx = W/2, cy = H/2;
    const R = this.fieldRadius();

    // Background grass
    ctx.fillStyle = state && state.timeOfDay === 'Night' ? '#0a2414' : '#134a26';
    ctx.fillRect(0,0,W,H);

    // Outer boundary (ellipse)
    const rx = R * 1.15;
    const ry = R;
    ctx.save();
    ctx.beginPath();
    const grad = ctx.createRadialGradient(cx, cy, R*0.2, cx, cy, rx);
    grad.addColorStop(0, state && state.timeOfDay === 'Night' ? '#123a22' : '#1c6b34');
    grad.addColorStop(1, state && state.timeOfDay === 'Night' ? '#0a2414' : '#0e3a1d');
    ctx.fillStyle = grad;
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
    ctx.fill();

    // Boundary rope
    ctx.strokeStyle = '#e8f5ea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx-2, ry-2, 0, 0, Math.PI*2);
    ctx.stroke();

    // 30-yard circle
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5,7]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx*0.55, ry*0.55, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pitch (vertical rectangle in center)
    const pw = Math.max(30, R*0.16);
    const ph = R * 1.15;
    ctx.fillStyle = '#c9a875';
    ctx.fillRect(cx - pw/2, cy - ph/2, pw, ph);
    // crease lines
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    const stumpsY1 = cy - ph*0.38;
    const stumpsY2 = cy + ph*0.38;
    [stumpsY1, stumpsY2].forEach(y=>{
      ctx.beginPath(); ctx.moveTo(cx-pw/2, y); ctx.lineTo(cx+pw/2, y); ctx.stroke();
    });
    // stumps
    this.drawStumps(cx, stumpsY1, pw*0.28);
    this.drawStumps(cx, stumpsY2, pw*0.28);

    ctx.restore();

    this._pitchInfo = {cx, cy, pw, ph, stumpsY1, stumpsY2, rx, ry, R};
  }

  drawStumps(cx, y, w){
    const ctx = this.ctx;
    ctx.fillStyle = '#f4f4f4';
    const sw = Math.max(2, w*0.16);
    for (let i=-1;i<=1;i++){
      ctx.fillRect(cx + i*w*0.32 - sw/2, y - 10, sw, 20);
    }
    // bails
    ctx.fillStyle = '#ffd27a';
    ctx.fillRect(cx - w*0.4, y - 12, w*0.8, 2);
  }

  drawPlayers(state){
    const ctx = this.ctx;
    const p = this._pitchInfo;
    if (!p) return;

    // Bowler position (top of pitch)
    const bowlerY = p.stumpsY1 - 20;
    const bowlerX = p.cx;

    // Batter position (bottom of pitch)
    const batterY = p.stumpsY2 + 14;
    const batterX = p.cx + 12;

    // Non-striker
    const nsX = p.cx - 12;
    const nsY = p.stumpsY1 + 20;

    // Wicketkeeper
    const wkY = p.stumpsY2 + 42;
    const wkX = p.cx + 6;

    // Fielders around (from fielding preset)
    const fielders = this.getFielderPositions(state);

    ctx.save();

    // Fielders (blue team)
    fielders.forEach(f => {
      this.drawPerson(f.x, f.y, '#2a7fff', 5);
    });

    // WK
    this.drawPerson(wkX, wkY, '#2a7fff', 5);

    // Non-striker
    this.drawPerson(nsX, nsY, '#ff8a1e', 6);

    // Striker (batter)
    this.drawPerson(batterX, batterY, '#ff8a1e', 7);

    // Bowler (blue team)
    this.drawPerson(bowlerX, bowlerY, '#2a7fff', 6);

    ctx.restore();
  }

  getFielderPositions(state){
    const p = this._pitchInfo;
    if (!p) return [];
    const preset = (state && state.fieldPreset) || 'standard';
    const positions = (CU.DATA.DEFAULT_FIELD[preset] || CU.DATA.DEFAULT_FIELD.standard).slice();
    const rx = p.rx * 0.92, ry = p.ry * 0.92;
    return positions.map(name => {
      const def = CU.DATA.FIELD_POSITIONS[name];
      if (!def) return {x: p.cx, y: p.cy};
      // def.x, def.y in [0,1] relative to full field
      const x = p.cx + (def.x - 0.5) * rx * 2;
      const y = p.cy + (def.y - 0.5) * ry * 2;
      return {x, y, name};
    });
  }

  drawPerson(x, y, color, r){
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // Ball animation
  spawnBall(from, to, duration, arc, onComplete){
    this.balls.push({x: from.x, y: from.y, fromX: from.x, fromY: from.y,
      toX: to.x, toY: to.y, dur: duration, t: 0, arc: arc||0, onComplete});
  }

  // Called by match UI when a delivery starts
  startDelivery(delivery, ballSpeed, onBallReachBatter){
    const p = this._pitchInfo;
    if (!p) return;
    const bowlerPos = {x: p.cx, y: p.stumpsY1 - 20};
    const batPos = {x: p.cx + 12, y: p.stumpsY2 + 10};
    const dur = Math.max(0.35, 1.1 - ballSpeed*0.5); // seconds
    const timeToBatter = dur;
    // Swing/line offsets
    let endX = batPos.x;
    if (delivery.line === 'leg') endX -= 22;
    else if (delivery.line === 'off') endX += 6;
    else if (delivery.line === 'wide-outside') endX += 26;

    this.deliveryInfo = {
      startTime: performance.now(),
      timeToBatter: dur * 1000,
      targetX: endX, targetY: batPos.y,
      bowlerPos, batPos
    };

    this.spawnBall(bowlerPos, {x: endX, y: batPos.y}, dur, 0, () => {
      // Ball reached batter (or missed)
      if (onBallReachBatter) onBallReachBatter();
    });
  }

  update(dt){
    // Update balls
    for (let i=this.balls.length-1;i>=0;i--){
      const b = this.balls[i];
      b.t += dt;
      const u = Math.min(1, b.t / b.dur);
      b.x = b.fromX + (b.toX - b.fromX) * u;
      b.y = b.fromY + (b.toY - b.fromY) * u + Math.sin(u*Math.PI) * b.arc;
      if (u >= 1){
        if (b.onComplete) b.onComplete();
        this.balls.splice(i,1);
      }
    }
    // Particles
    for (let i=this.particles.length-1;i>=0;i--){
      const p = this.particles[i];
      p.x += p.vx*dt; p.y += p.vy*dt;
      p.vy += 200*dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i,1);
    }
  }

  drawBall(){
    const ctx = this.ctx;
    this.balls.forEach(b => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI*2);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.restore();
    });
    // particles
    this.particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x-1, p.y-1, 2, 2);
    });
    ctx.globalAlpha = 1;
  }

  burst(x, y, color, count){
    for (let i=0;i<count;i++){
      const a = Math.random()*Math.PI*2;
      const s = 60 + Math.random()*140;
      this.particles.push({
        x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 60,
        life: 0.6 + Math.random()*0.4, maxLife: 1, color: color || '#3ee07a'
      });
    }
  }

  render(state){
    this.drawField(state);
    this.drawPlayers(state);
    this.drawBall();
  }
}

CU.Renderer = Renderer;

})();