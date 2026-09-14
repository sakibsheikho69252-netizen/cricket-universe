(function(){
'use strict';
const CU = window.CU = window.CU || {};

// Deterministic PRNG
function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
CU.mulberry32 = mulberry32;

const FIRST = ['Arif','Rohan','Kiran','Dev','Sam','Vikram','Neel','Aarav','Zain','Omar',
'Ravi','Kabir','Ishaan','Rahul','Yash','Manav','Tariq','Jai','Nikhil','Adil','Farid',
'Sahil','Veer','Aman','Imran','Sameer','Anil','Harsh','Varun','Tarun','Naveen','Rohit',
'Arjun','Karan','Dhruv','Aryan','Rehan','Faisal','Suresh','Gopal','Tapan','Bilal','Eshan'];

const LAST = ['Khan','Sharma','Patel','Rao','Verma','Iyer','Nair','Bose','Das','Mehta',
'Kapoor','Sinha','Reddy','Joshi','Malhotra','Chopra','Bhat','Pillai','Gill','Sethi',
'Ahmed','Hussain','Mishra','Trivedi','Chauhan','Prasad','Bhatt','Naik','Menon','Kulkarni',
'Desai','Gupta','Agarwal','Shetty','Rathore','Vaidya','Bakshi','Saxena','Khanna','Roy'];

const BOWL_STYLES = ['Right-arm fast','Right-arm medium','Left-arm medium',
'Right-arm off-break','Right-arm leg-break','Left-arm orthodox','Left-arm chinaman'];

// Cricket roles: BAT, WK, AR, BOWL
const XI_COMPOSITION = ['BAT','BAT','BAT','BAT','WK','AR','AR','BOWL','BOWL','BOWL','BOWL'];

const clamp = v => Math.max(20, Math.min(99, v|0));

function makePlayer(rng, teamId, idx, role){
  const first = FIRST[Math.floor(rng()*FIRST.length)];
  const last = LAST[Math.floor(rng()*LAST.length)];
  const batHand = rng() < 0.72 ? 'R' : 'L';
  const bowlStyle = BOWL_STYLES[Math.floor(rng()*BOWL_STYLES.length)];
  const base = 42 + Math.floor(rng()*42);
  let bat, bowl, fld;
  if (role === 'BAT' || role === 'WK'){
    bat = base + 14; bowl = base - 14; fld = base + 4;
  } else if (role === 'BOWL'){
    bat = base - 16; bowl = base + 16; fld = base;
  } else { // AR
    bat = base + 6; bowl = base + 6; fld = base + 4;
  }
  const roleLabel =
    role === 'BAT' ? 'Batter' :
    role === 'WK' ? 'Wicketkeeper' :
    role === 'BOWL' ? 'Bowler' : 'All-rounder';
  return {
    id: teamId + '-' + idx,
    name: first + ' ' + last,
    short: first[0] + '.' + last,
    age: 19 + Math.floor(rng()*16),
    role, roleLabel, batHand, bowlStyle,
    bat: clamp(bat),
    bowl: clamp(bowl),
    fld: clamp(fld),
    speed: clamp(base + (rng()*22-11)),
    stamina: clamp(base + (rng()*22-11)),
    technique: clamp(base + (rng()*22-11)),
    power: clamp(base + (rng()*22-11)),
    accuracy: clamp(base + (rng()*22-11)),
    form: 55 + Math.floor(rng()*35),
    confidence: 55 + Math.floor(rng()*35),
    fitness: 72 + Math.floor(rng()*26),
    xp: 0, level: 1
  };
}

function makeTeam(id, name, short, region, color, accent, seed){
  const rng = mulberry32(seed);
  const players = XI_COMPOSITION.map((r,i)=>makePlayer(rng,id,i,r));
  return {
    id, name, short, region, color, accent,
    players,
    captain: players[0].id,
    viceCaptain: players[1].id,
    coach: 'Coach ' + FIRST[Math.floor(rng()*FIRST.length)],
    homeStadium: null
  };
}

const TEAMS = [
  makeTeam('TBT','Thunder Bay Titans','TBT','North Coast','#2a7fff','#8fc6ff',101),
  makeTeam('SLK','Solar Kings','SLK','Desert Belt','#ff8a1e','#ffd28a',202),
  makeTeam('IRW','Iron Wolves','IRW','Steel Valley','#8892a0','#d8dde5',303),
  makeTeam('CRS','Coral Strikers','CRS','Coral Bay','#ff4d7a','#ffb0c4',404),
  makeTeam('DSF','Desert Falcons','DSF','Sand Plains','#d4a72c','#f5e29a',505),
  makeTeam('HLB','Highland Bears','HLB','Highlands','#2fa86e','#a0e5c0',606)
];

const STADIUMS = [
  {id:'titan-arena', name:'Titan Arena', capacity:42000, bounce:0.62, spin:0.55, outfield:'fast', color:'#0d3d22'},
  {id:'solar-park',  name:'Solar Park',   capacity:38000, bounce:0.55, spin:0.60, outfield:'medium', color:'#155028'},
  {id:'iron-fort',   name:'Iron Fortress',capacity:35000, bounce:0.68, spin:0.48, outfield:'fast', color:'#1a4a2a'},
  {id:'coral-bay',   name:'Coral Bay Oval',capacity:30000, bounce:0.58, spin:0.58, outfield:'slow', color:'#0f4526'},
  {id:'falcon-dome', name:'Falcon Dome',  capacity:45000, bounce:0.52, spin:0.66, outfield:'medium', color:'#134a2a'},
  {id:'highland-g',  name:'Highland Ground',capacity:28000, bounce:0.70, spin:0.50, outfield:'fast', color:'#0b3a1f'}
];

// Assign home stadiums
TEAMS[0].homeStadium = STADIUMS[0].id;
TEAMS[1].homeStadium = STADIUMS[1].id;
TEAMS[2].homeStadium = STADIUMS[2].id;
TEAMS[3].homeStadium = STADIUMS[3].id;
TEAMS[4].homeStadium = STADIUMS[4].id;
TEAMS[5].homeStadium = STADIUMS[5].id;

const PITCHES = [
  {id:'Flat',    bat:1.15, pace:1.00, spin:0.85, bounce:1.00, desc:'Batting paradise'},
  {id:'Green',   bat:0.90, pace:1.20, spin:0.80, bounce:1.10, desc:'Seam movement'},
  {id:'Dry',     bat:0.98, pace:1.00, spin:1.15, bounce:0.95, desc:'Spin friendly'},
  {id:'Dusty',   bat:0.95, pace:0.95, spin:1.25, bounce:0.90, desc:'Turn and grip'},
  {id:'Bouncy',  bat:0.95, pace:1.15, spin:0.85, bounce:1.30, desc:'Extra bounce'},
  {id:'Slow',    bat:0.92, pace:0.85, spin:1.05, bounce:0.85, desc:'Ball holds up'},
  {id:'Turning', bat:0.88, pace:0.90, spin:1.35, bounce:0.92, desc:'Big turn'}
];

const WEATHERS = [
  {id:'Sunny',  swing:1.00, spin:0.95, vis:1.00, rain:0,   desc:'Clear skies'},
  {id:'Cloudy', swing:1.25, spin:1.00, vis:0.95, rain:0,   desc:'Overcast, swing'},
  {id:'Humid',  swing:1.15, spin:0.90, vis:0.95, rain:0.05,desc:'Sticky conditions'},
  {id:'Wind',   swing:1.10, spin:0.80, vis:1.00, rain:0,   desc:'Breezy outfield'},
  {id:'Fog',    swing:1.05, spin:1.00, vis:0.72, rain:0,   desc:'Poor visibility'},
  {id:'Rain',   swing:1.20, spin:0.95, vis:0.85, rain:0.55,desc:'Rain interruptions'}
];

const FORMATS = {
  T20:  {overs:20, wickets:10, innings:2, ppOvers:6,  drsReviews:2, freeHit:true},
  ODI:  {overs:50, wickets:10, innings:2, ppOvers:10, drsReviews:2, freeHit:true},
  T10:  {overs:10, wickets:10, innings:2, ppOvers:3,  drsReviews:1, freeHit:true},
  Test: {overs:90, wickets:10, innings:4, ppOvers:0,  drsReviews:2, freeHit:false},
  Custom:{overs:20,wickets:10, innings:2, ppOvers:6,  drsReviews:2, freeHit:true}
};

const DIFFICULTY = {
  Easy:   {aiBat:0.85, aiBowl:0.85, aiField:0.85, aiAggr:0.95},
  Normal: {aiBat:1.00, aiBowl:1.00, aiField:1.00, aiAggr:1.00},
  Hard:   {aiBat:1.10, aiBowl:1.08, aiField:1.05, aiAggr:1.05},
  Expert: {aiBat:1.20, aiBowl:1.15, aiField:1.10, aiAggr:1.10},
  Legend: {aiBat:1.30, aiBowl:1.22, aiField:1.15, aiAggr:1.15}
};

const FIELD_POSITIONS = {
  slip:        {x:0.62, y:0.42, close:true},
  gully:       {x:0.70, y:0.40, close:true},
  point:       {x:0.82, y:0.36},
  cover:       {x:0.78, y:0.28},
  extraCover:  {x:0.70, y:0.24},
  midOff:      {x:0.60, y:0.18},
  midOn:       {x:0.40, y:0.18},
  midWicket:   {x:0.28, y:0.26},
  squareLeg:   {x:0.22, y:0.36},
  fineLeg:     {x:0.30, y:0.52, deep:true},
  thirdMan:    {x:0.72, y:0.52, deep:true},
  longOff:     {x:0.66, y:0.06, deep:true, boundary:true},
  longOn:      {x:0.34, y:0.06, deep:true, boundary:true},
  deepSqLeg:   {x:0.16, y:0.44, deep:true, boundary:true},
  deepMidWkt:  {x:0.20, y:0.22, deep:true, boundary:true},
  shortLeg:    {x:0.56, y:0.44, close:true},
  sillyPoint:  {x:0.62, y:0.36, close:true},
  keeper:      {x:0.50, y:0.55, close:true}
};

const DEFAULT_FIELD = {
  standard: ['keeper','slip','point','cover','midOff','midOn','midWicket','squareLeg','fineLeg','thirdMan','longOff'],
  powerplay: ['keeper','slip','point','cover','midOff','midOn','squareLeg','fineLeg','thirdMan','longOn','longOff'],
  defensive: ['keeper','slip','point','cover','midOff','midOn','squareLeg','fineLeg','thirdMan','deepSqLeg','longOn'],
  attacking: ['keeper','slip','gully','point','cover','midOff','midOn','shortLeg','squareLeg','fineLeg','thirdMan'],
  spin: ['keeper','slip','sillyPoint','point','cover','midOff','midOn','squareLeg','deepMidWkt','longOff','longOn']
};

const ACHIEVEMENTS = [
  {id:'first_run', name:'First Run', desc:'Score your first run', icon:'🏃'},
  {id:'first_four', name:'First Four', desc:'Hit a boundary', icon:'4️⃣'},
  {id:'first_six', name:'First Six', desc:'Hit a six', icon:'6️⃣'},
  {id:'fifty', name:'Half Century', desc:'Score 50 in an innings', icon:'5️⃣0️⃣'},
  {id:'century', name:'Century', desc:'Score 100 in an innings', icon:'💯'},
  {id:'hattrick', name:'Hat-trick', desc:'Take 3 wickets in 3 balls', icon:'🎩'},
  {id:'five_wickets', name:'Five Wickets', desc:'Take 5 wickets in an innings', icon:'🖐️'},
  {id:'chase_master', name:'Chase Master', desc:'Win chasing 150+', icon:'🎯'},
  {id:'bowling_master', name:'Bowling Master', desc:'Take 3+ wickets in a match', icon:'🎳'},
  {id:'captain', name:'Captain', desc:'Win a match as captain', icon:'👑'},
  {id:'tournament_champion', name:'Champion', desc:'Win a tournament', icon:'🏆'},
  {id:'match_winner', name:'Match Winner', desc:'Score 50+ and win', icon:'⭐'}
];

CU.DATA = {
  TEAMS, STADIUMS, PITCHES, WEATHERS, FORMATS, DIFFICULTY,
  FIELD_POSITIONS, DEFAULT_FIELD, ACHIEVEMENTS
};

CU.getTeam = function(id){ return TEAMS.find(t=>t.id===id); };
CU.getStadium = function(id){ return STADIUMS.find(s=>s.id===id); };
CU.getPitch = function(id){ return PITCHES.find(p=>p.id===id); };
CU.getWeather = function(id){ return WEATHERS.find(w=>w.id===id); };

})();