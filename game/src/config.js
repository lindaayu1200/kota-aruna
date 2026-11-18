// KOTA ARUNA — all of the city's tuning numbers and colours live here.
// World coordinates are metres on a flat X/Z plane: +X points inland (east) and -X points out to
// the sea (west). The beach runs down the western edge, and a tidal channel cuts in from the sea
// between the two districts, so the bridges are the obvious crossroads.

export const CITY_NAME = 'KOTA ARUNA';

/** Fixed simulation step, in seconds. The renderer may run faster or slower than this. */
export const STEP = 1 / 60;

export const CITY = {
  width: 900,
  depth: 900,
  halfWidth: 450,
  halfDepth: 450,
  waterLevel: -0.7,
  beach: { west: -350, inland: -278 },
  channel: { centerZ: 6, width: 52, west: -450, east: 205 },
};

/** The two neighbourhoods. centre is [x, z]; radius is a soft influence radius, not a wall. */
export const DISTRICTS = [
  { id: 'teluk-aruna', name: 'TELUK ARUNA', kind: 'harbor-downtown', center: [-80, -175], radius: 185 },
  { id: 'marina-senja', name: 'MARINA SENJA', kind: 'beach', center: [-170, 190], radius: 180 },
];

/** Sunset colours. Hex strings are safe to hand straight to THREE.Color. */
export const PALETTE = {
  skyTop: '#231739',
  skyBottom: '#f08a52',
  sun: '#ffd08a',
  fog: '#8d5a6b',
  water: '#2f4b6b',
  waterGlint: '#b56a72',
  sand: '#d8b58a',
  ground: '#6d6a63',
  road: '#2c2733',
  roadLine: '#e8c795',
  concrete: '#8c8492',
  neon: ['#ff5fa2', '#55e6ff', '#ffc857', '#9b7bff'],
  tower: '#3a3550',
  beachBlock: '#e6b9a4',
  palmTrunk: '#7a563e',
  palmLeaf: '#3f7d5c',
};

/** Street grid and the ring road that wraps around both districts. */
export const ROADS = {
  width: 20,
  laneWidth: 10,
  spacing: 90,
  verticalX: [-360, -270, -180, -90, 0, 90, 180, 270, 360],
  horizontalZ: [-360, -270, -180, -90, 0, 90, 180, 270, 360],
  ring: { center: [20, 10], radiusX: 290, radiusZ: 378, width: 24 },
  bridges: [
    { x: -270, name: 'Jembatan Pasir Putih' },
    { x: -180, name: 'Jembatan Pasar Ikan' },
    { x: 90, name: 'Jembatan Senja' },
  ],
  // Invented street names with a coastal Indonesian flavour.
  names: {
    vertical: [
      'Jalan Angin Laut', 'Jalan Pasir Putih', 'Jalan Teluk Aruna', 'Jalan Nelayan',
      'Jalan Matahari', 'Jalan Karang Biru', 'Jalan Sireh', 'Jalan Pelabuhan Baru',
      'Jalan Cakrawala',
    ],
    horizontal: [
      'Jalan Senja Raya', 'Jalan Gambir', 'Jalan Laut Selatan', 'Jalan Tanjung Gelap',
      'Jalan Bakau', 'Jalan Bintang Timur', 'Jalan Pesisir', 'Jalan Gamelan',
      'Jalan Bulusan',
    ],
    ring: 'Jalan Lingkar Aruna',
  },
};

/** Where the player (or a parked car) can start out: on dry road, in each district. */
export const SPAWN_ZONES = [
  { district: 'teluk-aruna', x: -180, z: -180 },
  { district: 'teluk-aruna', x: -90, z: -270 },
  { district: 'marina-senja', x: -180, z: 180 },
  { district: 'marina-senja', x: -270, z: 270 },
];
