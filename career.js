(function(){
'use strict';
const CU = window.CU = window.CU || {};

class Career {
  constructor(playerName){
    this.player = {
      name: playerName, level: 1, xp: 0,
      runs: 0, balls: 0, wickets: 0, catches: 0,
      bat: 55, bowl: 45, fld: 50,
      form: 70, fitness: 80, contract: 'Academy'
    };
    this.season = 1;
    this.history = [];
  }

  addMatchStats({runs, balls, wickets, catches, won}){
    this.player.runs += runs;
    this.player.balls += balls;
    this.player.wickets += wickets;
    this.player.catches += catches;
    const xp = runs + wickets*25 + catches*10;
    this.player.xp += xp;
    this.player.level = 1 + Math.floor(this.player.xp / 200);
    this.player.form = Math.min(100, this.player.form + (won ? 3 : -2));
    // Skill growth
    if (runs > 30) this.player.bat = Math.min(99, this.player.bat + 1);
    if (wickets >= 2) this.player.bowl = Math.min(99, this.player.bowl + 1);
    if (catches > 0) this.player.fld = Math.min(99, this.player.fld + 1);
    this.history.push({season: this.season, runs, wickets, won, date: Date.now()});
    return xp;
  }

  promote(){
    if (this.player.level >= 5 && this.player.contract === 'Academy') this.player.contract = 'Domestic';
    if (this.player.level >= 10 && this.player.contract === 'Domestic') this.player.contract = 'National';
  }

  serialize(){ return {player: this.player, season: this.season, history: this.history}; }
  static deserialize(o){ const c = Object.create(Career.prototype); c.player = o.player; c.season = o.season; c.history = o.history||[]; return c; }
}

CU.Career = Career;

})();