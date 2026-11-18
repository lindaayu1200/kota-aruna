// KOTA ARUNA — shared world constants.
// The city is a warm, fictional Indonesian harbor coast at sundown.

export const CITY_NAME = 'KOTA ARUNA';
export const STEP = 1 / 60;
export const CITY_SIZE = 900;

// The playable land sits east of the shoreline; the z range is a little
// taller than the x range so the ring road can breathe.
export const GROUND = {
  minX: -320,
  maxX: 460,
  minZ: -470,
  maxZ: 470,
};

export const DISTRICTS = [
  {
    id: 'teluk-aruna',
    name: 'TELUK ARUNA',
    kind: 'harbor-downtown',
    center: { x: 180, z: 40 },
    radius: 265,
  },
  {
    id: 'marina-senja',
    name: 'MARINA SENJA',
    kind: 'beach',
    center: { x: -150, z: -120 },
    radius: 245,
  },
];

export const PALETTE = {
  skyTop: '#2a1b4d',
  skyHorizon: '#f08a68',
  sun: '#ffd08a',
  fog: '#e5977f',
  waterDeep: '#12394b',
  waterShallow: '#3a8f92',
  sand: '#efc58d',
  ground: '#3c3347',
  road: '#181923',
  lane: '#f7d9a4',
  wood: '#6d4b36',
  stone: '#827071',
  lighthouse: '#f2e6d8',
  neon: {
    cyan: '#5ef2ff',
    pink: '#ff5ea8',
    amber: '#ffb45a',
  },
  pastels: [
    '#f2b5a0',
    '#f7d8a8',
    '#a8d8cf',
    '#e7a6c4',
    '#c5b6e8',
    '#9ec9e8',
  ],
  towerTints: [
    '#7c8fae',
    '#9a8fbc',
    '#6f8fa0',
    '#8c7ba8',
    '#809bb5',
  ],
  greens: ['#2f6b4f', '#3d8a5e', '#245c46', '#4b9a66'],
};

export const CITY_LAYOUT = {
  waterLevel: 0.05,
  shorelineX: -300,
  beachWidth: 52,
  roadGrid: {
    xs: [-200, -80, 40, 160, 280],
    zs: [-280, -140, 0, 140, 280],
    width: 16,
  },
  ringRoad: {
    center: { x: 60, z: 0 },
    radiusX: 370,
    radiusZ: 400,
    width: 24,
    segments: 72,
  },
  channel: {
    z: 200,
    halfWidth: 28,
    startX: -320,
    endX: 180,
  },
  pier: {
    z: -170,
    startX: -292,
    endX: -430,
    width: 9,
  },
  lighthouse: {
    x: -436,
    z: -170,
  },
};

// Street names are invented for this coast: old harbor nicknames, sea light,
// and the colours the sky turns just before evening.
export const STREET_NAMES = {
  northSouth: [
    'Jalan Teluk Aruna',
    'Jalan Ombak Biru',
    'Jalan Bintang Utara',
    'Jalan Dermaga Tua',
    'Jalan Cakrawala',
  ],
  eastWest: [
    'Jalan Marina Senja',
    'Jalan Pantai Kencana',
    'Jalan Senja Raya',
    'Jalan Tanjung Harapan',
    'Jalan Pasir Emas',
  ],
  ring: 'Jalan Lingkar Aruna',
  pier: 'Dermaga Karang Senja',
  channel: 'Terusan Aruna',
};
