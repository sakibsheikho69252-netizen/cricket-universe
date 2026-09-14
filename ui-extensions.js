(function(){
'use strict';
const CU = window.CU = window.CU || {};

// Extend batting controls with advanced shots
const origBatCtrl = CU.UI.prototype._showBattingControls;
CU.UI.prototype._showBattingControls = function(){
  origBatCtrl.call(this);
  const c = document.getElementById('hud-controls');
  if (!c) return;
  const base = ['defend','drive','loft','sweep','pull','cut','flick'];
  const extras = [
    {k:'straight',     label:'➡ Straight'},
    {k:'cover',        label:'↗ Cover'},
    {k:'on',           label:'↖ On Drive'},
    {k:'squareDrive',  label:'➡ Sq Drive'},
    {k:'squareCut',    label:'✂ Sq Cut'},
    {k:'lateCut',      label:'⤵ Late Cut'},
    {k:'hook',         label:'🎣 Hook'},
    {k:'glance',       label:'👀 Glance'},
    {k:'reverseSweep', label:'🔄 Rev Sweep'},
    {k:'scoop',        label:'🥄 Scoop'},
    {k:'ramp',         label:'⛰ Ramp'},
    {k:'upperCut',     label:'⬆ Upper Cut'},
    {k:'insideOut',    label:'🔄 Inside-Out'},
    {k:'switchHit',    label:'🔀 Switch Hit'}
  ];
  extras.forEach(s => {
    if (c.querySelector(`button[data-adv="${s.k}"]`)) return;
    const b = document.createElement('button');
    b.textContent = s.label;
    b.dataset.adv = s.k;
    b.onclick = () => {
      this.curShotType = s.k;
      c.querySelectorAll('button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    };
    c.appendChild(b);
  });
};

// Extend bowling controls with new delivery types
const origBowlCtrl = CU.UI.prototype._showBowlingControls;
CU.UI.prototype._showBowlingControls = function(){
  const m = this.match;
  const c = document.getElementById('hud-controls');
  if (!m){ return origBowlCtrl.call(this); }
  const inn = m.current;
  const style = inn.currentBowler.player.bowlStyle || '';
  const isSpin = /break|orthodox|chinaman/.test(style);

  c.innerHTML = '';
  const kinds = isSpin
    ? ['off-break','leg-break','googly','doosra','top-spinner','arm-ball']
    : ['good-length','full','short','yorker','bouncer','slower','cutter','knuckle','inswing','outswing','reverse-swing'];

  const labels = {
    'good-length':'Good Len','full':'Full','short':'Short','yorker':'Yorker',
    'bouncer':'Bouncer','slower':'Slower','cutter':'Cutter','knuckle':'Knuckle',
    'inswing':'Inswing','outswing':'Outswing','reverse-swing':'Rev Swing',
    'off-break':'Off Break','leg-break':'Leg Break','googly':'Googly',
    'doosra':'Doosra','top-spinner':'Top Spin','arm-ball':'Arm Ball'
  };

  // Ensure current selection is valid for this bowler
  if (!kinds.includes(this.curDelivery.kind)) this.curDelivery.kind = kinds[0];

  kinds.forEach(k => {
    const b = document.createElement('button');
    b.textContent = labels[k] || k;
    b.dataset.kind = k;
    if (k === this.curDelivery.kind) b.classList.add('sel');
    b.onclick = () => {
      this.curDelivery.kind = k;
      c.querySelectorAll('[data-kind]').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    };
    c.appendChild(b);
  });

  ['off','middle','leg','wide-outside'].forEach(l => {
    const b = document.createElement('button');
    b.textContent = l === 'wide-outside' ? 'Wide' : (l[0].toUpperCase()+l.slice(1));
    b.dataset.line = l;
    if (l === this.curDelivery.line) b.classList.add('sel');
    b.onclick = () => {
      this.curDelivery.line = l;
      c.querySelectorAll('[data-line]').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    };
    c.appendChild(b);
  });

  const bowl = document.createElement('button');
  bowl.textContent = '🎳 BOWL';
  bowl.style.background = 'var(--acc)';
  bowl.style.color = '#04180c';
  bowl.style.fontWeight = '900';
  bowl.onclick = () => this._beginDelivery();
  c.appendChild(bowl);

  // Add declaration button for Test
  if (m.config.format === 'Test' && m.isUserBatting === false){
    const decl = document.createElement('button');
    decl.textContent = '📢 Declare';
    decl.style.background = 'var(--warn)'; decl.style.color = '#04180c';
    decl.onclick = () => {
      if (confirm('Declare innings?')) CU.TestMode.declare(this.match);
    };
    c.appendChild(decl);
  }
};

// Extend HUD to show Test day/session info
const origHUD = CU.UI.prototype._updateHUD;
CU.UI.prototype._updateHUD = function(){
  origHUD.call(this);
  const m = this.match;
  if (!m || m.config.format !== 'Test') return;
  const el = document.getElementById('hud-lastover');
  if (!el) return;
  const existing = el.textContent || '';
  el.textContent = `Day ${m.day || 1} · Session ${m.session || 1} · Det ${(m.deterioration||0).toFixed(2)} — ${existing}`;
};

// Extend result screen for season/tournament tracking
const origRecord = CU.UI.prototype._recordMatch;
CU.UI.prototype._recordMatch = function(){
  if (origRecord) origRecord.call(this);
  const m = this.match;
  if (!m) return;
  // Season tracking
  const season = CU.Save.get('tournament', null);
  // Tournament result recording
  if (this._pendingTournament){
    const {engine, fixture} = this._pendingTournament;
    engine.recordResult(fixture, m);
    CU.Save.set('tournament', engine.serialize());
    CU.Save.persist();
    this._pendingTournament = null;
  }
  // Season stats
  if (CU.Season && m.result && m.result.winner){
    const s = CU.Save.get('seasonStats', null);
    if (s){
      CU.Season.recordMatch(s, m);
      CU.Save.set('seasonStats', s);
    }
  }
  // Hat-trick detection (3 consecutive wickets by same bowler)
  this._detectHatTrick(m);
};

CU.UI.prototype._detectHatTrick = function(m){
  for (const inn of m.inningsList){
    const balls = [];
    inn.overHistory.forEach(ov => ov.forEach(b => balls.push(b)));
    inn.currentOver.forEach(b => balls.push(b));
    const lastThree = balls.slice(-3);
    if (lastThree.length === 3 && lastThree.every(b => b.wicket && b.wicketType !== 'runout')){
      const sameBowler = lastThree.every(b => b.bowler && b.bowler.player &&
        b.bowler.player.id === lastThree[0].bowler.player.id);
      if (sameBowler){
        CU.Save.unlock('hattrick');
        const el = document.getElementById('commentary');
        if (el){ el.textContent = '🎩 HAT-TRICK!';
                 el.classList.add('show');
                 setTimeout(()=>el.classList.remove('show'), 3000); }
      }
    }
  }
};

// Add fullscreen button to menu on init
const origShow = CU.UI.prototype.show;
CU.UI.prototype.show = function(name){
  origShow.call(this, name);
  if (name === 'menu'){
    // Voice refresh (in case setting changed)
    if (CU.Voice) CU.Voice.refresh();
  }
};

})();