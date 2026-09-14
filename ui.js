(function(){
'use strict';
const CU = window.CU = window.CU || {};
const { DATA, Save, Audio, Commentary, Rules } = CU;

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

class UI {
  constructor(){
    this.match = null;
    this.renderer = null;
    this.state = {
      screen: 'menu',
      timeOfDay: 'Day',
      fieldPreset: 'standard'
    };
    this.ballInProgress = false;
    this.pendingDelivery = null;
    this.pendingShot = null;
    this.pendingQuality = 0;
    this.tapTime = 0;
    this.deliveryStart = 0;
    this.timingRAF = null;
    this.curShotType = 'drive';
    this.curDelivery = {kind:'good-length', line:'off', accuracy:0.9, pace:0.8};
    this.tournamentEngine = null;
    this.careerEngine = null;
    this.resultCallback = null;
    this.resultShowExtra = null;
    this.xiSelected = new Set();
    this.setupConfig = null;
    this.lastResultEvent = null;
    this._bind();
    this._initRenderer();
    this._applySettings();
  }

  _initRenderer(){
    this.renderer = new CU.Renderer($('#field'));
    const loop = (t) => {
      const dt = Math.min(0.05, (t - (this._lastT||t)) / 1000);
      this._lastT = t;
      if (this.match && !this.match.ended){
        this.renderer.update(dt);
      } else {
        this.renderer.update(dt);
      }
      this._drawMatchState();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _drawMatchState(){
    if (!this.renderer) return;
    const s = {
      timeOfDay: this.match ? (this.match.config.timeOfDay || 'Day') : 'Day',
      fieldPreset: this.match ? this.match.fieldPreset : 'standard'
    };
    this.renderer.render(s);
  }

  _bind(){
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-action]');
      if (t){
        const a = t.getAttribute('data-action');
        this._handleAction(a, t);
      }
      const tb = e.target.closest('[data-toss]');
      if (tb){ this._handleTossCall(tb.getAttribute('data-toss')); }
      const tc = e.target.closest('[data-choice]');
      if (tc){ this._handleTossChoice(tc.getAttribute('data-choice')); }
      const bb = e.target.closest('[data-back]');
      if (bb){ this.show(bb.getAttribute('data-back')); }
    });
    // Canvas tap for batting timing
    $('#field').addEventListener('pointerdown', e => this._onCanvasTap(e));
    $('#field').addEventListener('touchstart', e => { e.preventDefault(); this._onCanvasTap(e.touches[0]); }, {passive:false});
  }

  _applySettings(){
    const s = Save.getSettings();
    Audio.enabled = s.sound;
    Audio.musicOn = s.music;
  }

  show(name){
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + name);
    if (el) el.classList.add('active');
    this.state.screen = name;
    if (name !== 'match') this._stopTiming();
  }

  _handleAction(a, el){
    Audio.ui();
    switch(a){
      case 'quick-match': this._openSetup(); break;
      case 'start-setup': this._startSetup(); break;
      case 'auto-toss': this._autoToss(); break;
      case 'confirm-xi': this._confirmXI(); break;
      case 'pause': this._pauseMatch(); break;
      case 'resume': this.show('match'); break;
      case 'to-scorecard': this._showScorecard(); break;
      case 'save-match': this._saveMatch(); break;
      case 'quit-match': this._quitMatch(); break;
      case 'result-continue': this._resultContinue(); break;
      case 'result-scorecard': this._showScorecard(); break;
      case 'settings': this._showSettings(); break;
      case 'achievements': this._showAchievements(); break;
      case 'records': this._showRecords(); break;
      case 'training': this._showTraining(); break;
      case 'career': this._showCareer(); break;
      case 'tournament': this._showTournament(); break;
      case 'load-game': this._loadGame(); break;
    }
  }

  // ============ SETUP ============
  _openSetup(){
    const teams = DATA.TEAMS;
    const selA = $('#setup-teamA'), selB = $('#setup-teamB');
    selA.innerHTML = teams.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
    selB.innerHTML = teams.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
    selA.value = teams[0].id;
    selB.value = teams[1].id;

    const pitchSel = $('#setup-pitch');
    pitchSel.innerHTML = DATA.PITCHES.map(p=>`<option value="${p.id}">${p.id} — ${p.desc}</option>`).join('');
    const weatherSel = $('#setup-weather');
    weatherSel.innerHTML = DATA.WEATHERS.map(w=>`<option value="${w.id}">${w.id} — ${w.desc}</option>`).join('');
    const stadiumSel = $('#setup-stadium');
    stadiumSel.innerHTML = DATA.STADIUMS.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');

    $('#setup-format').onchange = (e) => {
      const v = e.target.value;
      $('#row-overs').style.display = v === 'Custom' ? 'flex' : 'none';
    };
    this.show('setup');
  }

  _startSetup(){
    const format = $('#setup-format').value;
    const teamAId = $('#setup-teamA').value;
    const teamBId = $('#setup-teamB').value;
    if (teamAId === teamBId){ alert('Pick two different teams'); return; }
    const teamA = CU.getTeam(teamAId);
    const teamB = CU.getTeam(teamBId);
    const overs = format === 'Custom' ? parseInt($('#setup-overs').value)||20 : DATA.FORMATS[format].overs;
    const wickets = Math.min(10, parseInt($('#setup-wickets').value)||10);
    const diff = $('#setup-diff').value;
    const pitchId = $('#setup-pitch').value;
    const weatherId = $('#setup-weather').value;
    const stadiumId = $('#setup-stadium').value;
    const time = $('#setup-time').value;

    this.setupConfig = {
      teamA, teamB, format, overs, wickets, difficulty: diff,
      pitch: CU.getPitch(pitchId), weather: CU.getWeather(weatherId),
      stadium: CU.getStadium(stadiumId), timeOfDay: time,
      freeHit: format !== 'Test'
    };

    // XI select for user team (teamA) — auto select first 11
    this.xiSelected = new Set(teamA.players.slice(0, 11).map(p=>p.id));
    this._renderXI();
    this.show('xi');
  }

  _renderXI(){
    const {teamA} = this.setupConfig;
    const list = $('#xi-list');
    list.innerHTML = '';
    teamA.players.forEach(p => {
      const div = document.createElement('div');
      div.className = 'xi-item' + (this.xiSelected.has(p.id) ? ' selected' : '');
      div.innerHTML = `
        <span class="role">${p.roleLabel}</span>
        <span class="name">${p.name}${p.batHand==='L'?' (L)':''}</span>
        <span class="stats">BAT ${p.bat}<br>BWL ${p.bowl}</span>`;
      div.onclick = () => {
        if (this.xiSelected.has(p.id)) this.xiSelected.delete(p.id);
        else if (this.xiSelected.size < 11) this.xiSelected.add(p.id);
        this._renderXI();
      };
      list.appendChild(div);
    });
    $('#xi-count').textContent = this.xiSelected.size + '/11';
    $('#xi-title').textContent = teamA.name + ' — Playing XI';
  }

  _confirmXI(){
    if (this.xiSelected.size !== 11){ alert('Select exactly 11 players'); return; }
    const {teamA, teamB} = this.setupConfig;
    // Filter teamA players to the selected XI
    this.setupConfig.teamA = Object.assign({}, teamA, {
      players: teamA.players.filter(p => this.xiSelected.has(p.id))
    });
    // Team B auto XI: first 11
    this.setupConfig.teamB = Object.assign({}, teamB, {
      players: teamB.players.slice(0, 11)
    });
    // Toss
    this.show('toss');
    $('#toss-status').textContent = 'Call it in the air…';
    $('#toss-call').style.display = 'flex';
    $('#toss-choice').style.display = 'none';
    $('#auto-toss-btn').style.display = 'block';
  }

  _handleTossCall(call){
    $('#toss-call').style.display = 'none';
    $('#auto-toss-btn').style.display = 'none';
    const coin = $('#coin');
    coin.classList.remove('flip'); void coin.offsetWidth; coin.classList.add('flip');
    Audio.crowd(0.2);
    setTimeout(() => {
      const m = new CU.Match(this.setupConfig);
      this.match = m;
      const res = m.doToss(call);
      $('#toss-status').textContent = `It's ${res.coin}! ${res.winner} won the toss.`;
      if (res.userDecision){
        $('#toss-choice').style.display = 'flex';
      } else {
        setTimeout(() => this._afterToss(res.decision), 900);
      }
    }, 950);
  }

  _handleTossChoice(choice){
    $('#toss-choice').style.display = 'none';
    this.match.applyToss(choice);
    this._afterToss(choice);
  }

  _autoToss(){
    this._handleTossCall('Heads');
  }

  _afterToss(decision){
    this.match.start();
    this.show('match');
    this._resizeCanvas();
    this._updateHUD();
    // Initial commentary
    const inn = this.match.current;
    this._setCommentary(`${inn.battingTeam.name} batting first. ${inn.currentBowler.player.name} to bowl.`);
    // If user is bowling, show delivery controls; else wait for delivery
    this._setupBallPhase();
  }

  _resizeCanvas(){
    setTimeout(()=>this.renderer.resize(), 50);
  }

  // ============ MATCH FLOW ============
  _setupBallPhase(){
    const m = this.match;
    if (!m || m.ended) return;
    const inn = m.current;
    if (inn.done){ this._onInningsEnd(); return; }
    if (m.isUserBatting){
      // User is batting → AI bowls; show shot buttons
      this._showBattingControls();
    } else {
      // User is bowling → show delivery buttons
      this._showBowlingControls();
    }
  }

  _showBattingControls(){
    const c = $('#hud-controls');
    c.innerHTML = '';
    const shots = [
      {k:'defend', label:'🛡 Defend'},
      {k:'drive', label:'🏏 Drive'},
      {k:'loft', label:'⬆ Loft'},
      {k:'sweep', label:'🧹 Sweep'},
      {k:'pull', label:'💪 Pull'},
      {k:'cut', label:'✂ Cut'},
      {k:'flick', label:'↩ Flick'}
    ];
    shots.forEach(s => {
      const b = document.createElement('button');
      b.textContent = s.label;
      b.onclick = () => {
        this.curShotType = s.k;
        $$('#hud-controls button').forEach(x=>x.classList.remove('sel'));
        b.classList.add('sel');
      };
      if (s.k === this.curShotType) b.classList.add('sel');
      c.appendChild(b);
    });
    // Auto-trigger a delivery after brief pause
    setTimeout(() => this._beginDelivery(), 400);
  }

  _showBowlingControls(){
    const c = $('#hud-controls');
    c.innerHTML = '';
    const kinds = [
      {k:'good-length', label:'Good Length'},
      {k:'full', label:'Full'},
      {k:'short', label:'Short'},
      {k:'yorker', label:'Yorker'},
      {k:'bouncer', label:'Bouncer'},
      {k:'slower', label:'Slower'},
      {k:'cutter', label:'Cutter'}
    ];
    const lines = [
      {k:'off', label:'Off'},
      {k:'middle', label:'Middle'},
      {k:'leg', label:'Leg'},
      {k:'wide-outside', label:'Wide'}
    ];
    // Two rows: kinds then lines then BOWL button
    kinds.forEach(k => {
      const b = document.createElement('button');
      b.textContent = k.label;
      b.onclick = () => { this.curDelivery.kind = k.k; refresh(); };
      b.dataset.kind = k.k;
      c.appendChild(b);
    });
    lines.forEach(l => {
      const b = document.createElement('button');
      b.textContent = l.label;
      b.onclick = () => { this.curDelivery.line = l.k; refresh(); };
      b.dataset.line = l.k;
      c.appendChild(b);
    });
    const bowl = document.createElement('button');
    bowl.textContent = '🎳 BOWL';
    bowl.style.background = 'var(--acc)'; bowl.style.color = '#04180c';
    bowl.onclick = () => this._beginDelivery();
    c.appendChild(bowl);
    const refresh = () => {
      $$('#hud-controls button').forEach(b=>b.classList.remove('sel'));
      const k = c.querySelector(`[data-kind="${this.curDelivery.kind}"]`);
      const l = c.querySelector(`[data-line="${this.curDelivery.line}"]`);
      if (k) k.classList.add('sel');
      if (l) l.classList.add('sel');
    };
    refresh();
    // If user wants to change bowler manually, only possible at over end — handled below
  }

  _beginDelivery(){
    const m = this.match;
    if (!m || m.ended) return;
    const inn = m.current;
    if (inn.done){ this._onInningsEnd(); return; }

    // Determine delivery
    let delivery;
    if (m.isUserBatting){
      delivery = m.chooseDelivery();
    } else {
      // Slight randomisation on user's chosen delivery
      delivery = Object.assign({}, this.curDelivery);
      delivery.accuracy = 0.7 + Math.random()*0.28;
      delivery.pace = 0.7 + Math.random()*0.3;
    }
    this.pendingDelivery = delivery;
    this.ballInProgress = true;

    // Animate
    const bowlerSpeed = inn.currentBowler.player.speed / 100;
    const dur = Math.max(0.5, 1.0 - bowlerSpeed*0.4);

    // HUD: show timing bar for user batting
    if (m.isUserBatting){
      $('#timing-wrap').classList.remove('hidden');
      this._startTimingBar(dur);
    } else {
      $('#timing-wrap').classList.add('hidden');
    }

    this.renderer.startDelivery(delivery, bowlerSpeed, () => {
      this._onBallReachBatter();
    });
  }

  _startTimingBar(duration){
    const cursor = $('#timing-cursor');
    const start = performance.now();
    const total = duration * 1000;
    const loop = () => {
      if (!this.ballInProgress){ cursor.style.left = '0%'; return; }
      const t = performance.now() - start;
      const u = Math.min(1, t / total);
      cursor.style.left = (u * 100) + '%';
      if (u < 1) this.timingRAF = requestAnimationFrame(loop);
      else { cursor.style.left = '100%'; }
    };
    cancelAnimationFrame(this.timingRAF);
    this._timingStart = start;
    this._timingTotal = total;
    this.timingRAF = requestAnimationFrame(loop);
  }

  _stopTiming(){
    if (this.timingRAF) cancelAnimationFrame(this.timingRAF);
    this.timingRAF = null;
    $('#timing-wrap').classList.add('hidden');
  }

  _onCanvasTap(e){
    if (!this.match || this.match.ended) return;
    if (!this.ballInProgress) return;
    if (!this.match.isUserBatting) return;
    // Record tap time
    const now = performance.now();
    const elapsed = now - this._timingStart;
    const u = Math.min(1, elapsed / this._timingTotal);
    // Ideal = 100% (ball reaches batter at end of animation)
    const ideal = 0.85; // tap when cursor near 85%
    const err = Math.abs(u - ideal);
    const window_ = 0.32;
    let quality = Math.max(0, 1 - err / window_);
    const s = Save.getSettings();
    if (s.battingAssist) quality = Math.min(1, quality * 1.15 + 0.05);
    this.pendingQuality = quality;
    this.pendingShot = this.curShotType;
    // Immediately resolve to avoid double-handling
    this.ballInProgress = false;
    this._stopTiming();
    this._resolveAndShow();
  }

  _onBallReachBatter(){
    if (!this.match || !this.ballInProgress) return;
    // Ball arrived before user tapped
    if (this.match.isUserBatting){
      // Auto-miss
      this.pendingQuality = 0;
      this.pendingShot = this.curShotType;
      this.ballInProgress = false;
      this._stopTiming();
      this._resolveAndShow();
    } else {
      // AI batted — resolve now
      const choice = this.match.chooseShot();
      this.pendingShot = choice.shot;
      this.pendingQuality = choice.quality;
      this.ballInProgress = false;
      this._resolveAndShow();
    }
  }

  _resolveAndShow(){
    const m = this.match;
    const inn = m.current;
    const ev = m.executeBall({
      delivery: this.pendingDelivery,
      shot: this.pendingShot,
      quality: this.pendingQuality
    });
    this.lastResultEvent = ev;
    this._updateHUD();
    this._showEventToast(ev);
    const line = Commentary.ballLine(ev, Math.random);
    let text = line;
    if (ev.milestone) text = Commentary.milestoneLine(ev.milestone, Math.random);
    this._setCommentary(text);

    // Sounds
    if (ev.wicket) { Audio.wicket(); Audio.crowd(0.6); }
    else if (ev.runs === 6){ Audio.six(); Audio.crowd(0.9); this.renderer.burst(this.renderer.W/2, this.renderer.H/2, '#ffb84d', 24); }
    else if (ev.runs === 4){ Audio.four(); Audio.crowd(0.5); this.renderer.burst(this.renderer.W/2, this.renderer.H/2, '#3ee07a', 16); }
    else if (ev.extra) { Audio.wide(); }
    else if (ev.contact) { Audio.bat(); }
    else { Audio.bounce(); }

    // Achievements
    this._checkAchievements(ev);

    // Handle innings / batter change
    if (inn.wickets > 0 && ev.wicket){
      // Bring next batter
      if (inn.nextBatterIdx < inn.batting.length){
        inn.bringNextBatter(ev.batterIdx);
      }
    }

    if (inn.done){
      setTimeout(() => this._onInningsEnd(), 700);
      return;
    }

    // After over complete, allow bowler change (user bowling)
    if (ev.overEnd && !m.isUserBatting){
      setTimeout(() => this._showBowlingOverEnd(), 400);
      return;
    }

    // Continue
    setTimeout(() => {
      if (this.match && !this.match.ended && !this.match.current.done){
        this._setupBallPhase();
      }
    }, 500);
  }

  _showBowlingOverEnd(){
    const m = this.match;
    const inn = m.current;
    const c = $('#hud-controls');
    c.innerHTML = '';
    const label = document.createElement('div');
    label.style.cssText = 'width:100%;text-align:center;font-size:12px;color:#fff;padding:4px';
    label.textContent = 'Over complete — choose next bowler';
    c.appendChild(label);
    // Choose from bowling team (exclude last bowler)
    const lastId = inn.currentBowler.player.id;
    const candidates = m.teamA.players.filter(p => p.id !== lastId);
    candidates.forEach(p => {
      const b = document.createElement('button');
      b.textContent = `${p.short} (${p.bowl})`;
      b.onclick = () => {
        const idx = inn.bowling.findIndex(x => x.player.id === p.id);
        if (idx >= 0){
          inn.setBowler(idx);
          m.rotateBowler && null;
          this._setupBallPhase();
        }
      };
      c.appendChild(b);
    });
  }

  _showEventToast(ev){
    const t = $('#result-toast');
    let txt = '';
    if (ev.wicket) txt = 'OUT!';
    else if (ev.runs === 6) txt = 'SIX!';
    else if (ev.runs === 4) txt = 'FOUR!';
    else if (ev.extra === 'wide') txt = 'WIDE';
    else if (ev.extra === 'noball') txt = 'NO BALL';
    else if (ev.runs > 0) txt = '+' + ev.runs;
    else return;
    t.textContent = txt;
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  }

  _setCommentary(text){
    const c = $('#commentary');
    c.textContent = text;
    c.classList.add('show');
    clearTimeout(this._commTimer);
    this._commTimer = setTimeout(()=>c.classList.remove('show'), 2500);
  }

  _updateHUD(){
    const m = this.match;
    if (!m) return;
    const inn = m.current;
    if (!inn) return;
    $('#hud-team').textContent = inn.battingTeam.short + ' batting';
    $('#hud-runs').textContent = `${inn.runs}/${inn.wickets}`;
    $('#hud-overs').textContent = `(${inn.oversText}/${inn.maxOvers})`;
    if (inn.target != null){
      const need = Math.max(0, inn.target - inn.runs);
      const ballsLeft = inn.maxBalls - inn.balls;
      const rr = Rules.requiredRate(need, ballsLeft);
      $('#hud-target').textContent = `Target ${inn.target} · Need ${need} off ${ballsLeft} (RRR ${isFinite(rr)?rr.toFixed(2):'—'})`;
    } else {
      $('#hud-target').textContent = '';
    }
    const st = inn.striker, ns = inn.nonStriker, bw = inn.currentBowler;
    $('#hud-striker').innerHTML = `<b>★ ${st.player.short}</b>${st.runs} (${st.balls})`;
    $('#hud-bowler').innerHTML = `<b>🎳 ${bw.player.short}</b>${bw.wickets}/${bw.runs}`;
    // FOW
    const fow = inn.fow.slice(-3).map(f=>`${f.runs}/${f.wicket} (${f.batter.split(' ')[0]})`).join(' · ');
    $('#hud-fow').textContent = fow ? 'FOW: ' + fow : '';
    // Last over
    const last = inn.overHistory[inn.overHistory.length-1] || [];
    const lastText = last.map(e => e.wicket ? 'W' : (e.extra === 'wide' ? 'wd' : (e.extra === 'noball' ? 'nb' : e.runs))).join(' ');
    $('#hud-lastover').textContent = lastText ? 'Last ov: ' + lastText : '';
  }

  _onInningsEnd(){
    const m = this.match;
    if (!m) return;
    if (m.ended){
      this._showResult();
      return;
    }
    // Show innings break
    const inn = m.inningsList[m.currentInningsIdx];
    $('#result-title').textContent = 'Innings Break';
    $('#result-text').textContent = `${inn.battingTeam.name}: ${inn.runs}/${inn.wickets} in ${inn.oversText} overs.`;
    const next = m.inningsList[m.currentInningsIdx + 1];
    if (next && next.target != null){
      $('#result-extra').innerHTML = `<div class="card"><h3>Chase</h3><p>${next.battingTeam.name} need <b>${next.target}</b> runs from ${next.maxOvers} overs to win.</p></div>`;
    } else {
      $('#result-extra').innerHTML = '';
    }
    this.resultCallback = 'next-innings';
    this.show('result');
  }

  _resultContinue(){
    if (this.resultCallback === 'next-innings'){
      this.resultCallback = null;
      this.show('match');
      this._resizeCanvas();
      // Make sure the bowler for the new innings is set
      const m = this.match;
      const inn = m.current;
      if (!inn.done){
        this._updateHUD();
        this._setupBallPhase();
      } else {
        this._showResult();
      }
    } else {
      this.show('menu');
    }
  }

  _showResult(){
    const m = this.match;
    if (!m) return;
    if (!m.result){
      m.computeResult();
    }
    $('#result-title').textContent = m.result ? (m.result.type === 'tie' ? 'Match Tied!' : 'Result') : 'Match Over';
    $('#result-text').textContent = m.result ? m.result.text : 'Match ended.';
    $('#result-extra').innerHTML = '';
    this.resultCallback = 'to-menu';
    // Record stats & achievements
    this._recordMatch();
    this.show('result');
  }

  _recordMatch(){
    const m = this.match;
    if (!m) return;
    // Update records & achievements
    const recs = {};
    for (const inn of m.inningsList){
      for (const b of inn.batting){
        if (b.runs > (recs.highestScore || 0)) recs.highestScore = b.runs;
        if (b.sixes > (recs.mostSixes || 0)) recs.mostSixes = b.sixes;
        if (b.fours > (recs.mostFours || 0)) recs.mostFours = b.fours;
      }
      for (const b of inn.bowling){
        if (b.wickets > (recs.mostWickets || 0)) recs.mostWickets = b.wickets;
      }
      for (const p of inn.partnerships){
        if (p.runs > (recs.bestPartnership || 0)) recs.bestPartnership = p.runs;
      }
    }
    Save.updateRecords(recs);
    Save.set('matchHistory', (Save.get('matchHistory') || []).concat([{
      teams: [m.teamA.short, m.teamB.short],
      result: m.result ? m.result.text : '',
      date: Date.now(),
      format: m.config.format
    }]).slice(-30));
    // Achievements
    if (recs.highestScore >= 50) Save.unlock('fifty');
    if (recs.highestScore >= 100) Save.unlock('century');
    if (recs.mostSixes > 0) Save.unlock('first_six');
    if (recs.mostFours > 0) Save.unlock('first_four');
    if (recs.mostWickets >= 5) Save.unlock('five_wickets');
    if (recs.mostWickets >= 3) Save.unlock('bowling_master');
    if (m.result && m.result.winner === m.teamA.name) Save.unlock('captain');
  }

  _checkAchievements(ev){
    if (ev.wicket && ev.wicketType){
      // check hat-trick tracking omitted for brevity
    }
    if (ev.runs === 4) Save.unlock('first_four');
    if (ev.runs === 6) Save.unlock('first_six');
  }

  // ============ SCORECARD ============
  _showScorecard(){
    const m = this.match;
    if (!m) return;
    const body = $('#scorecard-body');
    body.innerHTML = '';
    m.inningsList.forEach((inn, idx) => {
      if (!inn.balls && inn.runs === 0 && inn.wickets === 0 && idx > m.currentInningsIdx) return;
      body.appendChild(this._renderInningsCard(inn, idx));
    });
    this.show('scorecard');
  }

  _renderInningsCard(inn, idx){
    const sec = document.createElement('div');
    sec.className = 'sc-section';
    sec.innerHTML = `<h3>Innings ${idx+1} — ${inn.battingTeam.name}: ${inn.runs}/${inn.wickets} (${inn.oversText} ov)</h3>`;

    // Batting
    const bat = document.createElement('table');
    bat.className = 'sc-table';
    bat.innerHTML = `<thead><tr><th>Batter</th><th class="num">R</th><th class="num">B</th><th class="num">4s</th><th class="num">6s</th><th class="num">SR</th></tr></thead>`;
    const tb = document.createElement('tbody');
    inn.batting.forEach(b => {
      if (b.balls === 0 && !b.out) return;
      const tr = document.createElement('tr');
      const sr = b.balls ? ((b.runs/b.balls)*100).toFixed(1) : '0.0';
      const outTxt = b.out ? `<span class="out">${this._dismissalText(b)}</span>` : `<span class="notout">not out</span>`;
      tr.innerHTML = `<td>${b.player.name}${outTxt}</td>
        <td class="num">${b.runs}</td><td class="num">${b.balls}</td>
        <td class="num">${b.fours}</td><td class="num">${b.sixes}</td>
        <td class="num">${sr}</td>`;
      tb.appendChild(tr);
    });
    bat.appendChild(tb);
    sec.appendChild(bat);

    // Extras
    const ex = document.createElement('div');
    ex.style.marginTop = '8px'; ex.style.fontSize = '12px'; ex.style.color = 'var(--fg2)';
    const e = inn.extras;
    ex.textContent = `Extras: ${e.wides + e.noballs + e.byes + e.legbyes} (w ${e.wides}, nb ${e.noballs}, b ${e.byes}, lb ${e.legbyes})`;
    sec.appendChild(ex);

    // Total
    const tot = document.createElement('div');
    tot.style.marginTop = '6px'; tot.style.fontSize = '13px'; tot.style.fontWeight = '700';
    tot.textContent = `Total: ${inn.runs}/${inn.wickets} in ${inn.oversText} overs · RR ${Rules.runRate(inn.runs, inn.balls).toFixed(2)}`;
    sec.appendChild(tot);

    // Bowling
    const bowl = document.createElement('table');
    bowl.className = 'sc-table';
    bowl.style.marginTop = '10px';
    bowl.innerHTML = `<thead><tr><th>Bowler</th><th class="num">O</th><th class="num">R</th><th class="num">W</th><th class="num">Econ</th></tr></thead>`;
    const btb = document.createElement('tbody');
    inn.bowling.forEach(b => {
      if (b.balls === 0) return;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${b.player.name}</td>
        <td class="num">${Rules.oversText(b.balls)}</td>
        <td class="num">${b.runs}</td>
        <td class="num">${b.wickets}</td>
        <td class="num">${b.balls?((b.runs*6/b.balls)).toFixed(2):'0.00'}</td>`;
      btb.appendChild(tr);
    });
    bowl.appendChild(btb);
    sec.appendChild(bowl);

    // FOW & partnerships
    if (inn.fow.length){
      const fow = document.createElement('div');
      fow.style.marginTop = '8px'; fow.style.fontSize = '11px'; fow.style.color = 'var(--fg2)';
      fow.textContent = 'FOW: ' + inn.fow.map(f=>`${f.runs}/${f.wicket} (${f.batter.split(' ')[0]}, ${f.over})`).join(', ');
      sec.appendChild(fow);
    }
    if (inn.partnerships.length){
      const ps = document.createElement('div');
      ps.style.marginTop = '4px'; ps.style.fontSize = '11px'; ps.style.color = 'var(--fg2)';
      ps.textContent = 'Partnerships: ' + inn.partnerships.map((p,i)=>`${p.runs}(${p.balls})`).join(', ');
      sec.appendChild(ps);
    }

    return sec;
  }

  _dismissalText(b){
    const names = {bowled:'b', lbw:'lbw', caught:'c', runout:'run out', stumped:'st', hitwicket:'hit wicket'};
    const k = names[b.how] || b.how || 'out';
    if (b.how === 'caught') return `c ${b.fielder||''} b ${b.bowler||''}`;
    if (b.how === 'bowled') return `b ${b.bowler||''}`;
    if (b.how === 'lbw') return `lbw b ${b.bowler||''}`;
    if (b.how === 'stumped') return `st ${b.fielder||''} b ${b.bowler||''}`;
    return k;
  }

  // ============ PAUSE / SAVE / LOAD ============
  _pauseMatch(){
    this._stopTiming();
    this.show('pause');
  }

  _saveMatch(){
    if (!this.match) return;
    try {
      const snapshot = this._serializeMatch(this.match);
      Save.set('matchSnapshot', snapshot);
      Save.persist();
      this._setCommentary('Match saved.');
      this.show('match');
    } catch(e){ alert('Save failed: ' + e.message); }
  }

  _serializeMatch(m){
    // simplified snapshot — no functions
    return {
      config: {
        format: m.config.format, overs: m.config.overs, wickets: m.config.wickets,
        difficulty: m.config.difficulty, timeOfDay: m.config.timeOfDay
      },
      teamA: m.teamA, teamB: m.teamB,
      pitchId: m.pitch.id, weatherId: m.weather.id, stadiumId: m.stadium.id,
      currentInningsIdx: m.currentInningsIdx,
      inningsList: m.inningsList.map(inn => ({
        battingTeam: inn.battingTeam, bowlingTeam: inn.bowlingTeam,
        maxOvers: inn.maxOvers, maxWickets: inn.maxWickets,
        runs: inn.runs, wickets: inn.wickets, balls: inn.balls,
        extras: inn.extras, target: inn.target, format: inn.format,
        batting: inn.batting.map(b => ({playerId: b.player.id, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, out: b.out, how: b.how, bowler: b.bowler, fielder: b.fielder})),
        bowling: inn.bowling.map(b => ({playerId: b.player.id, balls: b.balls, runs: b.runs, wickets: b.wickets, maidens: b.maidens, order: b.order})),
        nextBatterIdx: inn.nextBatterIdx, strikerIdx: inn.strikerIdx, nonStrikerIdx: inn.nonStrikerIdx, currentBowlerIdx: inn.currentBowlerIdx,
        partnerships: inn.partnerships, fow: inn.fow, overHistory: inn.overHistory,
        legalBallsThisOver: inn.legalBallsThisOver, thisOverRuns: inn.thisOverRuns, thisOverWickets: inn.thisOverWickets,
        freeHit: inn.freeHit, done: inn.done
      })),
      tossWinner: m.tossWinner, tossDecision: m.tossDecision,
      battingFirstTeam: m.battingFirstTeam, fieldPreset: m.fieldPreset
    };
  }

  _loadGame(){
    const snap = Save.get('matchSnapshot', null);
    if (!snap){ alert('No saved match found.'); return; }
    try {
      const m = new CU.Match({
        teamA: snap.teamA, teamB: snap.teamB,
        format: snap.config.format, overs: snap.config.overs, wickets: snap.config.wickets,
        difficulty: snap.config.difficulty,
        pitch: CU.getPitch(snap.pitchId), weather: CU.getWeather(snap.weatherId),
        stadium: CU.getStadium(snap.stadiumId), timeOfDay: snap.config.timeOfDay
      });
      m.tossWinner = snap.tossWinner;
      m.tossDecision = snap.tossDecision;
      m.battingFirstTeam = snap.battingFirstTeam;
      m.tossDone = true;
      m.fieldPreset = snap.fieldPreset || 'standard';
      m.inningsList = snap.inningsList.map(is => {
        const inn = new CU.Innings(
          is.battingTeam, is.bowlingTeam,
          {overs: is.maxOvers, wickets: is.maxWickets, format: is.format, target: is.target}
        );
        inn.runs = is.runs; inn.wickets = is.wickets; inn.balls = is.balls;
        inn.extras = is.extras; inn.target = is.target;
        inn.nextBatterIdx = is.nextBatterIdx;
        inn.strikerIdx = is.strikerIdx; inn.nonStrikerIdx = is.nonStrikerIdx;
        inn.currentBowlerIdx = is.currentBowlerIdx;
        inn.partnerships = is.partnerships || [];
        inn.fow = is.fow || [];
        inn.overHistory = is.overHistory || [];
        inn.legalBallsThisOver = is.legalBallsThisOver||0;
        inn.thisOverRuns = is.thisOverRuns||0;
        inn.thisOverWickets = is.thisOverWickets||0;
        inn.freeHit = !!is.freeHit;
        inn.done = !!is.done;
        // rebuild batting/bowling references
        inn.batting = is.batting.map(b => {
          const p = inn.battingTeam.players.find(pp=>pp.id===b.playerId);
          return Object.assign({}, b, {player: p});
        });
        inn.bowling = is.bowling.map(b => {
          const p = inn.bowlingTeam.players.find(pp=>pp.id===b.playerId);
          return Object.assign({}, b, {player: p});
        });
        return inn;
      });
      m.currentInningsIdx = snap.currentInningsIdx;
      m.started = true;
      m.ended = false;
      this.match = m;
      this.show('match');
      this._resizeCanvas();
      this._updateHUD();
      this._setupBallPhase();
    } catch(e){ alert('Load failed: ' + e.message); }
  }

  _quitMatch(){
    this.match = null;
    this._stopTiming();
    this.show('menu');
  }

  // ============ SETTINGS ============
  _showSettings(){
    const body = $('#settings-body');
    const s = Save.getSettings();
    body.innerHTML = '';

    const rows = [
      {k:'sound', label:'Sound'},
      {k:'music', label:'Music'},
      {k:'commentary', label:'Commentary'},
      {k:'vibration', label:'Vibration'},
      {k:'battingAssist', label:'Batting Assist'},
      {k:'bowlingAssist', label:'Bowling Assist'},
      {k:'drs', label:'DRS Reviews'}
    ];
    rows.forEach(r => {
      const div = document.createElement('div');
      div.className = 'setting-row';
      div.innerHTML = `<label>${r.label}</label><div class="switch ${s[r.k]?'on':''}" data-k="${r.k}"></div>`;
      body.appendChild(div);
    });
    // Difficulty
    const dif = document.createElement('div');
    dif.className = 'setting-row';
    dif.innerHTML = `<label>Default Difficulty</label>
      <select id="set-diff">
        ${['Easy','Normal','Hard','Expert','Legend'].map(d=>`<option ${d===s.difficulty?'selected':''}>${d}</option>`).join('')}
      </select>`;
    body.appendChild(dif);
    dif.querySelector('select').onchange = e => Save.set('settings.difficulty', e.target.value);

    // Graphics
    const gr = document.createElement('div');
    gr.className = 'setting-row';
    gr.innerHTML = `<label>Graphics</label>
      <select id="set-gfx">
        ${['low','medium','high'].map(d=>`<option ${d===s.graphics?'selected':''}>${d}</option>`).join('')}
      </select>`;
    body.appendChild(gr);
    gr.querySelector('select').onchange = e => Save.set('settings.graphics', e.target.value);

    // Toggles
    body.querySelectorAll('.switch').forEach(sw => {
      sw.onclick = () => {
        const k = sw.dataset.k;
        const v = !sw.classList.contains('on');
        sw.classList.toggle('on', v);
        Save.set('settings.' + k, v);
        this._applySettings();
      };
    });

    // Export / Import / Reset
    const exp = document.createElement('button');
    exp.className = 'btn'; exp.textContent = '⬇ Export Save';
    exp.onclick = () => {
      const data = CU.Save.exportSave();
      const blob = new Blob([data], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'cricket-universe-save.json';
      a.click();
    };
    body.appendChild(exp);

    const imp = document.createElement('button');
    imp.className = 'btn'; imp.textContent = '⬆ Import Save';
    imp.onclick = () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.json';
      inp.onchange = () => {
        const f = inp.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          if (CU.Save.importSave(r.result)) { alert('Imported.'); this._applySettings(); }
          else alert('Invalid save file.');
        };
        r.readAsText(f);
      };
      inp.click();
    };
    body.appendChild(imp);

    const rst = document.createElement('button');
    rst.className = 'btn ghost'; rst.textContent = '⚠ Reset All Data';
    rst.onclick = () => {
      if (confirm('Reset all saved data?')){ CU.Save.reset(); this._applySettings(); alert('Reset.'); }
    };
    body.appendChild(rst);

    this.show('settings');
  }

  // ============ ACHIEVEMENTS ============
  _showAchievements(){
    const body = $('#ach-body');
    body.innerHTML = '';
    const unlocked = Save.get('achievements', []);
    DATA.ACHIEVEMENTS.forEach(a => {
      const got = unlocked.includes(a.id);
      const div = document.createElement('div');
      div.className = 'card';
      div.style.opacity = got ? '1' : '0.5';
      div.innerHTML = `<h3>${a.icon} ${a.name} ${got?'✓':''}</h3><p>${a.desc}</p>`;
      body.appendChild(div);
    });
    this.show('achievements');
  }

  _showRecords(){
    const body = $('#records-body');
    body.innerHTML = '';
    const r = Save.get('records', {});
    const fields = [
      ['highestScore','Highest Score'], ['bestBowling','Best Bowling'],
      ['mostSixes','Most Sixes (innings)'], ['mostFours','Most Fours (innings)'],
      ['mostWickets','Most Wickets (innings)'], ['bestPartnership','Best Partnership'],
      ['mostCatches','Most Catches']
    ];
    fields.forEach(([k,label]) => {
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `<h3>${label}</h3><p>${r[k] != null ? r[k] : '—'}</p>`;
      body.appendChild(div);
    });
    this.show('records');
  }

  // ============ TRAINING ============
  _showTraining(){
    const body = $('#training-body');
    body.innerHTML = '';
    const modes = [
      {id:'batting', label:'🏏 Batting Timing', stat:'bat'},
      {id:'bowling', label:'🎳 Bowling Accuracy', stat:'bowl'},
      {id:'fielding', label:'🧤 Fielding Reflex', stat:'fld'},
      {id:'fitness',  label:'💪 Fitness', stat:'fitness'},
      {id:'power',    label:'💥 Power Hitting', stat:'power'}
    ];
    modes.forEach(m => {
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `<h3>${m.label}</h3><p>Practice to improve your ${m.stat} attribute.</p>`;
      const b = document.createElement('button');
      b.className = 'btn primary'; b.textContent = 'Train (+1 XP)';
      b.style.marginTop = '8px';
      b.onclick = () => {
        Save.set('trainingXP', (Save.get('trainingXP',0)||0)+1);
        alert(`Training complete! ${m.stat} +1 XP.`);
      };
      div.appendChild(b);
      body.appendChild(div);
    });
    this.show('training');
  }

  // ============ CAREER ============
  _showCareer(){
    const body = $('#career-body');
    body.innerHTML = '';
    const career = Save.get('career', null);
    if (!career){
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `<h3>Start a Career</h3><p>Create your player and rise from Academy to International.</p>`;
      const nameInp = document.createElement('input');
      nameInp.placeholder = 'Player name';
      nameInp.style.cssText = 'width:100%;padding:10px;margin-top:8px;border-radius:8px;background:var(--bg2);color:var(--fg);border:1px solid var(--line)';
      div.appendChild(nameInp);
      const start = document.createElement('button');
      start.className = 'btn primary'; start.textContent = 'Start Career';
      start.style.marginTop = '8px';
      start.onclick = () => {
        const nm = nameInp.value.trim() || 'Rookie Player';
        Save.set('career', {
          player: {name: nm, level:1, xp:0, runs:0, balls:0, wickets:0, catches:0,
            bat:55, bowl:45, fld:50, form:70, fitness:80, contract:'Academy'},
          season: 1, history: []
        });
        this._showCareer();
      };
      div.appendChild(start);
      body.appendChild(div);
    } else {
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `
        <h3>${career.player.name}</h3>
        <div class="row"><span>Level</span><span>${career.player.level}</span></div>
        <div class="row"><span>XP</span><span>${career.player.xp}</span></div>
        <div class="row"><span>Runs</span><span>${career.player.runs}</span></div>
        <div class="row"><span>Wickets</span><span>${career.player.wickets}</span></div>
        <div class="row"><span>Contract</span><span>${career.player.contract}</span></div>
        <div class="row"><span>Form</span><span>${career.player.form}</span></div>
        <div class="row"><span>Fitness</span><span>${career.player.fitness}</span></div>
      `;
      body.appendChild(div);
      const play = document.createElement('button');
      play.className = 'btn primary'; play.textContent = 'Play Career Match';
      play.onclick = () => {
        // Launch a quick match using default teams (user controls teamA)
        this._openSetup();
      };
      body.appendChild(play);
      const reset = document.createElement('button');
      reset.className = 'btn ghost'; reset.textContent = 'Retire Player';
      reset.onclick = () => { if (confirm('Retire?')) { Save.set('career', null); this._showCareer(); } };
      body.appendChild(reset);
    }
    this.show('career');
  }

  // ============ TOURNAMENT ============
  _showTournament(){
    const body = $('#tournament-body');
    body.innerHTML = '';
    const t = Save.get('tournament', null);
    if (!t){
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `<h3>Start a Tournament</h3><p>6-team round-robin league + knockout finals.</p>`;
      const b = document.createElement('button');
      b.className = 'btn primary'; b.textContent = 'Begin Season';
      b.style.marginTop = '8px';
      b.onclick = () => {
        const engine = new CU.Tournament(DATA.TEAMS);
        Save.set('tournament', engine.serialize());
        Save.persist();
        this._showTournament();
      };
      div.appendChild(b);
      body.appendChild(div);
    } else {
      const engine = CU.Tournament.deserialize(t);
      const pt = engine.pointsTable();
      const tbl = document.createElement('table');
      tbl.className = 'pt';
      tbl.innerHTML = `<thead><tr><th>Team</th><th>P</th><th>W</th><th>L</th><th>Pts</th><th>NRR</th></tr></thead>`;
      const tbody = document.createElement('tbody');
      pt.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${row.team.short}</td><td>${row.played}</td><td>${row.won}</td><td>${row.lost}</td><td><b>${row.points}</b></td><td>${row.nrr.toFixed(2)}</td>`;
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      const wrap = document.createElement('div');
      wrap.className = 'card'; wrap.appendChild(tbl);
      body.appendChild(wrap);

      // Fixtures
      const fx = document.createElement('div');
      fx.className = 'card';
      fx.innerHTML = `<h3>Fixtures</h3>`;
      engine.fixtures.forEach((f, i) => {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `<span>${f.teamA.short} vs ${f.teamB.short}</span><span>${f.played ? f.result : '—'}</span>`;
        fx.appendChild(row);
      });
      body.appendChild(fx);

      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn primary';
      const next = engine.nextFixture();
      nextBtn.textContent = next ? `Play: ${next.teamA.short} vs ${next.teamB.short}` : (engine.isComplete() ? 'Season Complete' : 'No match');
      nextBtn.disabled = !next;
      nextBtn.onclick = () => {
        const fixture = next;
        const config = {
          teamA: fixture.teamA, teamB: fixture.teamB,
          format: 'T20', overs: 20, wickets: 10, difficulty: 'Normal',
          pitch: CU.getPitch('Flat'), weather: CU.getWeather('Sunny'),
          stadium: CU.getStadium(fixture.teamA.homeStadium || 'titan-arena'),
          timeOfDay: 'Day', freeHit: true
        };
        this.setupConfig = config;
        this.xiSelected = new Set(config.teamA.players.slice(0,11).map(p=>p.id));
        this._pendingTournament = { engine, fixture };
        this._renderXI();
        this.show('xi');
        this._afterConfirmHook = (match) => {
          if (match.ended && this._pendingTournament){
            const res = engine.recordResult(fixture, match);
            Save.set('tournament', engine.serialize());
            Save.persist();
          }
        };
      };
      body.appendChild(nextBtn);

      const reset = document.createElement('button');
      reset.className = 'btn ghost'; reset.textContent = 'Reset Tournament';
      reset.onclick = () => { if (confirm('Reset tournament?')) { Save.set('tournament', null); this._showTournament(); } };
      body.appendChild(reset);
    }
    this.show('tournament');
  }

}

CU.UI = UI;

})();