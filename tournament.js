(function(){
'use strict';
const CU = window.CU = window.CU || {};

class Tournament {
  constructor(teams){
    this.teams = teams.map(t=>({id:t.id, name:t.name, short:t.short, homeStadium:t.homeStadium}));
    this.fixtures = [];
    this.results = [];
    this._buildFixtures();
  }

  _buildFixtures(){
    const t = this.teams;
    for (let i=0;i<t.length;i++){
      for (let j=i+1;j<t.length;j++){
        this.fixtures.push({
          teamA: t[i], teamB: t[j],
          played: false, result: null, winner: null
        });
      }
    }
  }

  nextFixture(){
    return this.fixtures.find(f => !f.played) || null;
  }

  recordResult(fixture, match){
    if (!fixture || fixture.played) return;
    fixture.played = true;
    if (match.result && match.result.winner){
      fixture.winner = match.result.winner;
      fixture.result = match.result.text;
    } else if (match.result && match.result.type === 'tie'){
      fixture.result = 'Tie';
    } else {
      fixture.result = 'No Result';
    }
    this.results.push({fixture, result: fixture.result});
  }

  pointsTable(){
    const map = {};
    this.teams.forEach(t => map[t.id] = {team: t, played:0, won:0, lost:0, tied:0, nr:0, points:0, runsFor:0, ballsFor:0, runsAgainst:0, ballsAgainst:0});
    this.fixtures.filter(f=>f.played).forEach(f => {
      const a = map[f.teamA.id], b = map[f.teamB.id];
      a.played++; b.played++;
      if (f.winner){
        const w = f.winner === f.teamA.name ? a : b;
        const l = f.winner === f.teamA.name ? b : a;
        w.won++; l.lost++;
        w.points += 2;
      } else {
        a.tied++; b.tied++; a.points++; b.points++;
      }
    });
    const rows = Object.values(map);
    rows.forEach(r => { r.nrr = 0; });
    return rows.sort((x,y)=> y.points - x.points);
  }

  isComplete(){
    return this.fixtures.every(f => f.played);
  }

  serialize(){
    return {
      teams: this.teams,
      fixtures: this.fixtures.map(f=>({teamA: f.teamA, teamB: f.teamB, played: f.played, result: f.result, winner: f.winner})),
      results: this.results
    };
  }

  static deserialize(obj){
    const t = Object.create(Tournament.prototype);
    t.teams = obj.teams;
    t.fixtures = obj.fixtures;
    t.results = obj.results || [];
    return t;
  }
}

CU.Tournament = Tournament;

})();