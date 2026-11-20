// All the tuning tables for KOTA ARUNA live here: geography, people, contracts,
// guns, stations and the little numbers that make the simulation feel alive.

export const DEFAULT_SEED = 1337;

export const MAP = {
  half: 520,
  channel: 46,
  landY: 1.4,
  waterY: 0.1,
  block: 92,
  bridges: [-170, 178],
  bridgeWidth: 28,
  helipads: [{ x: 148, z: -112 }, { x: -156, z: 252 }],
  workshops: [{ x: 322, z: -54 }, { x: -282, z: 118 }, { x: 236, z: 338 }],
  police: { x: 128, z: 252 },
};

export const DISTRICTS = {
  east: { name: 'TELUK ARUNA', short: 'ARUNA', tint: '#ffb764', blurb: 'Cranes · Glass · Harbour' },
  west: { name: 'MARINA SENJA', short: 'SENJA', tint: '#64e0d6', blurb: 'Palms · Jetty · Lighthouse' },
  water: { name: 'ARUNA CHANNEL', short: 'CHANNEL', tint: '#82c5ff', blurb: 'Keep moving' },
};

export const CREW = [
  { name: 'Ara', role: 'Harbour bookkeeper', color: '#ffbf69', line: 'Every favour has a price, but mine comes with a map.' },
  { name: 'Dimas', role: 'Wheel man', color: '#ff7c6b', line: 'If the road ends, that is what the handbrake is for.' },
  { name: 'Sinta', role: 'Signal runner', color: '#65e2d0', line: 'The static is talking. Somebody just has to listen.' },
  { name: 'Bimo', role: 'Workshop keeper', color: '#b9a4ff', line: 'Bring it back in one piece and I will pretend I saw nothing.' },
];

export const MISSIONS = [
  {
    id: 'fare',
    title: 'Harbour Fare',
    giver: 'Ara',
    brief: 'A quiet passenger wants the jetty without questions. Take the fare across the channel.',
    pay: 1400,
    respect: 8,
    steps: [
      { kind: 'goto', x: 132, z: -300, radius: 16, text: 'Collect the fare at the harbour gate' },
      { kind: 'drive', x: -180, z: -306, radius: 18, text: 'Drive the passenger to Marina jetty' },
    ],
  },
  {
    id: 'wheels',
    title: 'Borrowed Wheels',
    giver: 'Dimas',
    brief: 'There is a blue coupe at the market. Borrow it, then lose the paperwork at the workshop.',
    pay: 2000,
    respect: 12,
    steps: [
      { kind: 'steal', x: 246, z: 132, radius: 20, text: 'Take the coupe from the market' },
      { kind: 'drive', x: 322, z: -54, radius: 20, text: 'Deliver the coupe to Bimo’s workshop' },
    ],
  },
  {
    id: 'relays',
    title: 'Dead Air',
    giver: 'Sinta',
    brief: 'Three relay cases went missing across Marina Senja. Find them before the signal dies.',
    pay: 2800,
    respect: 16,
    cases: [[-208, 62], [-334, -176], [-136, 294]],
    steps: [
      { kind: 'collect', x: -208, z: 62, radius: 8, text: 'Recover the three relay cases' },
      { kind: 'goto', x: -156, z: 252, radius: 18, text: 'Bring the relays to the marina helipad' },
    ],
  },
  {
    id: 'tide',
    title: 'Red Tide Run',
    giver: 'Bimo',
    brief: 'The port police are watching the bridges. Cross the island before the clock runs out.',
    pay: 3600,
    respect: 20,
    heat: 3,
    seconds: 100,
    steps: [
      { kind: 'timer', x: 372, z: 316, radius: 22, text: 'Beat the clock to the east depot' },
    ],
  },
  {
    id: 'bridge',
    title: 'Bridge Tax',
    giver: 'Ara',
    brief: 'Rivals are holding the north bridge. Clear them out and collect the toll.',
    pay: 4400,
    respect: 24,
    rivals: [[-26, -158], [18, -186], [6, -128]],
    steps: [
      { kind: 'eliminate', x: 0, z: -170, radius: 30, text: 'Clear the bridge crew' },
      { kind: 'goto', x: 118, z: -228, radius: 18, text: 'Meet Ara at the harbour office' },
    ],
  },
  {
    id: 'searchlight',
    title: 'Night Shift',
    giver: 'Dimas',
    brief: 'Take the chopper up and sweep the channel with the lamp, then set down at Marina.',
    pay: 6200,
    respect: 30,
    steps: [
      { kind: 'heli', x: 148, z: -112, radius: 22, text: 'Board the helicopter and switch on the searchlight' },
      { kind: 'fly', x: -156, z: 252, radius: 24, text: 'Fly to the western helipad' },
    ],
  },
  {
    id: 'pasang',
    title: 'Pasang Surut',
    giver: 'The crew',
    brief: 'One last flight. What the tide hid is about to surface.',
    pay: 12000,
    respect: 50,
    reveal: true,
    steps: [
      { kind: 'fly', x: 0, z: 6, radius: 30, text: 'Hover over the channel' },
      { kind: 'reveal', x: -430, z: -356, radius: 46, text: 'Follow the lighthouse beam' },
    ],
  },
];

export const WEAPONS = [
  { name: 'Fists', damage: 9, rate: 0.42, ammo: Infinity, reserve: Infinity, range: 5, color: '#e9d9bb' },
  { name: 'Pistol', damage: 24, rate: 0.22, ammo: 14, reserve: 112, range: 130, color: '#ffd166' },
  { name: 'SMG', damage: 13, rate: 0.075, ammo: 36, reserve: 260, range: 100, color: '#65e2d0', respect: 20 },
  { name: 'Rifle', damage: 44, rate: 0.38, ammo: 8, reserve: 72, range: 210, color: '#ff7c6b', respect: 40 },
];

export const RADIO = [
  { name: 'RADAR FM', freq: '101.7', tag: 'Neon patrol', color: '#ff9c6c', bpm: 118, root: 57, wave: 'sawtooth' },
  { name: 'SENJA 88.3', freq: '88.3', tag: 'Slow tide', color: '#65e2d0', bpm: 88, root: 53, wave: 'sine' },
  { name: 'PIXEL RAYA', freq: '94.5', tag: 'Arcade hits', color: '#f7d154', bpm: 142, root: 60, wave: 'square' },
  { name: 'CHANNEL 9', freq: '109.2', tag: 'Talk & static', color: '#b9a4ff', bpm: 104, root: 50, wave: 'triangle' },
];

export const RIDES = {
  sedan: { name: 'City Sedan', max: 28, accel: 15, turn: 1.7, color: '#4c8fb5', length: 4.4 },
  sports: { name: 'Aruna GT', max: 43, accel: 24, turn: 2.0, color: '#e8563f', length: 4.2 },
  van: { name: 'Harbour Van', max: 23, accel: 12, turn: 1.35, color: '#d9a441', length: 5.4 },
  police: { name: 'Patrol Cruiser', max: 34, accel: 18, turn: 1.9, color: '#e8eef4', length: 4.6 },
  heli: { name: 'Coastal Hawk', max: 38, accel: 16, turn: 1.45, color: '#d5574a', length: 8.5 },
};

export const CAR_SPAWNS = [
  [132, -282, 0.3, 'sports'], [246, 132, 1.4, 'sports'], [290, -80, 0.1, 'sedan'],
  [208, 240, 2.1, 'van'], [380, -250, 0.7, 'sedan'], [86, 96, 1.9, 'sedan'],
  [-180, -300, 1.2, 'van'], [-260, 70, 0.4, 'sedan'], [-350, -190, 2.7, 'sports'],
  [-132, 286, 1.5, 'sedan'], [-300, 300, 0.2, 'van'], [-220, 160, 2.4, 'sedan'],
  [148, -112, 0, 'heli'], [-156, 252, 0, 'heli'],
];

export const PALETTE = {
  skyTop: '#343059',
  skyMid: '#c96a72',
  skyLow: '#ffb277',
  sun: '#ffd9a0',
  sand: '#d9bd86',
  land: '#5a5a63',
  road: '#31343e',
  water: '#14566d',
  concrete: '#8d8b8b',
  glass: '#3d7d92',
  neon: '#ffb764',
  mint: '#65e2d0',
};

export const SHOT_VIEWS = {
  cover: { x: 154, z: -316, heading: -0.65, pitch: 0.36, distance: 24, vehicle: 'sports', stars: 0 },
  chase: { x: 12, z: -168, heading: 0.7, pitch: 0.32, distance: 27, vehicle: 'sports', stars: 4 },
  crew: { x: -190, z: -280, heading: 2.3, pitch: 0.35, distance: 15, vehicle: null, stars: 1, ledger: true },
  finale: { x: 4, z: -18, heading: -0.35, pitch: 0.24, distance: 30, vehicle: 'heli', stars: 2, light: true, reveal: true },
};
