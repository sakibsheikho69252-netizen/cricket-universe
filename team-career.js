(function(){
'use strict';
const CU = window.CU = window.CU || {};

CU.TeamCareer = {
  create(teamId){
    const t = CU.getTeam(teamId);
    if (!t) return null;
    return {
      teamId,
      chemistry: 60,
      morale: 70,
      trainingFocus: 'balanced',
      seasonWins: 0,
      seasonLosses: 0,
      matches: 0,
      coach: t.coach,
      captain: t.captain,
      viceCaptain: t.viceCaptain
    };
  },

  train(career, focus){
    career.trainingFocus = focus;
    if (focus === 'batting') career.chemistry = Math.min(100, career.chemistry + 1);
    if (focus === 'bowling') career.morale = Math.min(100, career.morale + 1);
    if (focus === 'fielding') career.chemistry = Math.min(100, career.chemistry + 1);
    if (focus === 'fitness'){ career.morale = Math.min(100, career.morale + 2);
                              career.chemistry = Math.min(100, career.chemistry + 1); }
    return career;
  },

  recordMatch(career, won){
    career.matches++;
    if (won) career.seasonWins++; else career.seasonLosses++;
    career.chemistry = Math.max(30, Math.min(100,
      career.chemistry + (won ? 2 : -1)));
    career.morale = Math.max(20, Math.min(100,
      career.morale + (won ? 2 : -2)));
  }
};

})();