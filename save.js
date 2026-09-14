(function(){
'use strict';
const CU = window.CU = window.CU || {};

const KEY = 'cricketUniverse_v1';

const defaultSave = () => ({
  settings: {
    sound: true, music: true, commentary: true, vibration: true,
    graphics: 'high', difficulty: 'Normal', language: 'en',
    battingAssist: true, bowlingAssist: true, drs: true, fullscreen: false
  },
  stats: {},          // playerId -> {runs, balls, fours, sixes, wickets, ...}
  achievements: [],   // unlocked ids
  records: {
    highestScore: null, bestBowling: null, mostSixes: 0, mostFours: 0,
    mostWickets: 0, fastestFifty: null, fastestCentury: null,
    bestPartnership: 0, mostCatches: 0
  },
  career: null,
  tournament: null,
  matchHistory: [],
  version: 1
});

let cache = null;

function load(){
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw){ cache = defaultSave(); return cache; }
    const parsed = JSON.parse(raw);
    cache = Object.assign(defaultSave(), parsed);
    cache.settings = Object.assign(defaultSave().settings, parsed.settings || {});
    cache.records = Object.assign(defaultSave().records, parsed.records || {});
    return cache;
  } catch(e){
    console.warn('Save load failed', e);
    cache = defaultSave();
    return cache;
  }
}

function persist(){
  try { localStorage.setItem(KEY, JSON.stringify(cache)); }
  catch(e){ console.warn('Save persist failed', e); }
}

function get(path, fallback){
  const s = load();
  const parts = path.split('.');
  let cur = s;
  for (const p of parts){
    if (cur == null) return fallback;
    cur = cur[p];
  }
  return cur === undefined ? fallback : cur;
}

function set(path, value){
  const s = load();
  const parts = path.split('.');
  let cur = s;
  for (let i=0;i<parts.length-1;i++){
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length-1]] = value;
  persist();
}

function bumpStats(playerId, delta){
  const s = load();
  s.stats[playerId] = s.stats[playerId] || {runs:0,balls:0,fours:0,sixes:0,wickets:0,catches:0,matches:0,fifties:0,hundreds:0,best:0,bestBowl:0};
  const st = s.stats[playerId];
  for (const k in delta) st[k] = (st[k]||0) + delta[k];
  persist();
}

function unlock(id){
  const s = load();
  if (!s.achievements.includes(id)){
    s.achievements.push(id);
    persist();
    return true;
  }
  return false;
}

function updateRecords(partial){
  const s = load();
  for (const k in partial){
    const v = partial[k];
    if (typeof v === 'number'){
      if ((s.records[k]||0) < v) s.records[k] = v;
    } else if (v != null && s.records[k] == null){
      s.records[k] = v;
    }
  }
  persist();
}

function exportSave(){
  return JSON.stringify(load());
}

function importSave(json){
  try {
    const obj = JSON.parse(json);
    if (typeof obj !== 'object') return false;
    cache = Object.assign(defaultSave(), obj);
    persist();
    return true;
  } catch(e){ return false; }
}

function reset(){
  cache = defaultSave();
  persist();
}

CU.Save = { load, persist, get, set, bumpStats, unlock, updateRecords,
  exportSave, importSave, reset };
CU.Save.getSettings = () => load().settings;

})();