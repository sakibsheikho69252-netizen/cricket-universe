(function(){
'use strict';
const CU = window.CU = window.CU || {};

CU.Season = {
  begin(teams){
    const t = new CU.Tournament(teams);
    return {
      tournament: t,
      seasonNo: 1,
      topScorer: null, topBowler: null, bestPlayer: null,
      champion: null,
      _bat: {}, _bowl: {},
      createdAt: Date.now()
    };
  },

  recordMatch(season, match){
    for (const inn of match.inningsList){
      for (const b of inn.batting){
        const id = b.player.id;
        const e = season._bat[id] = season._bat[id] || {name: b.player.name, runs:0, balls:0, team: inn.battingTeam.short};
        e.runs += b.runs; e.balls += b.balls;
      }
      for (const b of inn.bowling){
        const id = b.player.id;
        const e = season._bowl[id] = season._bowl[id] || {name: b.player.name, wickets:0, runs:0, balls:0, team: inn.bowlingTeam.short};
        e.wickets += b.wickets; e.runs += b.runs; e.balls += b.balls;
      }
    }
  },

  finalize(season){
    const bat = Object.values(season._bat || {}).sort((a,b)=>b.runs - a.runs);
    const bowl = Object.values(season._bowl || {}).sort((a,b)=>b.wickets - a.wickets || (a.runs - b.runs));
    season.topScorer = bat[0] || null;
    season.topBowler = bowl[0] || null;
    season.bestPlayer = bat[0] || bowl[0] || null;
    const pt = season.tournament.pointsTable();
    season.champion = pt[0] ? pt[0].team : null;
    return season;
  },

  nextSeason(prev, teams){
    const next = this.begin(teams);
    next.seasonNo = (prev.seasonNo || 1) + 1;
    return next;
  }
};

})();