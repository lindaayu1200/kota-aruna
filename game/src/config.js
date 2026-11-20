export const IDENTITY = {
  name: 'KOTA ARUNA',
  slogan: 'DUA DISTRIK, SATU AIR',
  edition: 'EDISI SENJA',
};

export const STEP = 1 / 60;

export const BOUNDS = {
  minX: -640,
  maxX: 560,
  minZ: -560,
  maxZ: 560,
  seaHeight: 0.08,
  worldRange: 520,
};

export const ZONES = [
  {
    key: 'teluk-aruna',
    label: 'TELUK ARUNA',
    note: 'MENARA, DERMAGA & KANAL',
    x: 175,
    z: 45,
    radius: 325,
    color: '#ffad78',
  },
  {
    key: 'marina-senja',
    label: 'MARINA SENJA',
    note: 'PANTAI, POHON & PERAHU',
    x: -215,
    z: -150,
    radius: 305,
    color: '#6fe4ee',
  },
];

export const INK = {
  zenith: '#1b163f',
  horizon: '#f29670',
  sunlight: '#ffd7a0',
  mist: '#d99588',
  deep: '#082a3d',
  shallow: '#3d9b9a',
  beach: '#efcb98',
  land: '#3b3247',
  street: '#1a1c29',
  ring: '#272a3b',
  markings: '#ffe0ac',
  wood: '#7a523b',
  stone: '#938389',
  glass: '#94dcef',
  lantern: '#ffc178',
  rose: '#ff69ad',
  aqua: '#5ef0ff',
  homes: ['#f3b7a2', '#f9d7ad', '#a9dfd2', '#e5a9c6', '#c6b9ed', '#a3cae9'],
  offices: ['#7287af', '#9585ba', '#678fa1', '#8a79a5', '#7999b7'],
  fronds: ['#2f7051', '#3e9060', '#265a46', '#529e69'],
};

export const GRID = {
  columns: [-230, -110, 10, 140, 270, 400],
  rows: [-330, -180, -35, 115, 260, 405],
  laneWidth: 18,
  coast: -320,
  sand: 62,
  ring: { x: 72, z: 15, rx: 385, rz: 418, width: 27, slices: 84 },
  waterway: { z: 205, half: 30, west: -330, east: 190 },
  jetty: { z: -185, shore: -300, end: -455, width: 11 },
  lamp: { x: -452, z: -185 },
  pad: { x: 300, z: -250, radius: 27 },
  downtown: { minX: -20, maxX: 455, minZ: -455, maxZ: 455 },
  village: { minX: -298, maxX: -12, minZ: -445, maxZ: 445 },
};

export const STREETS = {
  columns: [
    'JALAN TELUK ARUNA',
    'JALAN OMBAK BIRU',
    'JALAN BINTANG UTARA',
    'JALAN DERMAGA TUA',
    'JALAN CAKRAWALA',
    'JALAN PELABUHAN BARU',
  ],
  rows: [
    'JALAN MARINA SENJA',
    'JALAN PANTAI KENCANA',
    'JALAN SENJA RAYA',
    'JALAN TANJUNG HARAPAN',
    'JALAN PASIR EMAS',
    'JALAN LANGIT TIMUR',
  ],
  circle: 'JALAN LINGKAR ARUNA',
  jetty: 'DERMAGA KARANG SENJA',
};

export const CREW = [
  {
    id: 'ara',
    name: 'Ara',
    role: 'pengatur rute pelabuhan',
    color: '#ffd07d',
    quote: 'Air naik, jejak hilang. Itu bukan ramalan — itu pekerjaan kami.',
  },
  {
    id: 'dimas',
    name: 'Dimas',
    role: 'pengemudi andalan',
    color: '#7adfff',
    quote: 'Gang sempit bukan masalah. Rem yang telat yang bikin cerita pendek.',
  },
  {
    id: 'sinta',
    name: 'Sinta',
    role: 'pembaca tabel air',
    color: '#ff8cc4',
    quote: 'Angka pasang tidak pernah bohong. Orang yang menyalinnya, bisa.',
  },
  {
    id: 'bimo',
    name: 'Bimo',
    role: 'penjaga dermaga',
    color: '#a9efaa',
    quote: 'Aku mengenal papan yang berderit sebelum orang sempat berdiri.',
  },
];

export const CONTRACTS = [
  {
    id: 'c1',
    number: 1,
    title: 'KUNCI GUDANG',
    zone: 'teluk-aruna',
    lead: 'ara',
    at: { x: 210, z: 78 },
    reward: 950,
    setup: 'Ara menunggu di depan gudang dengan kunci mobil yang bukan miliknya.',
    task: 'Temui Ara di kawasan gudang Teluk Aruna',
    intro: 'Ara: Kau juga datang. Kuncinya di kap mesin. Jangan bertanya siapa pemiliknya.',
    outro: 'Ara: Satu selesai. Masih enam sebelum air berubah arah.',
  },
  {
    id: 'c2',
    number: 2,
    title: 'PAYUNG KELIMA',
    zone: 'marina-senja',
    lead: 'dimas',
    at: { x: -232, z: -224 },
    reward: 1300,
    setup: 'Dimas menaruh paket di bawah payung yang paling mudah tertukar.',
    task: 'Ambil titik Dimas di bibir pantai Marina Senja',
    intro: 'Dimas: Payung kelima dari kiri. Kalau sudah ada yang duduk, kita terlambat.',
    outro: 'Dimas: Mudah. Sekarang bagian yang bikin tangan kotor.',
  },
  {
    id: 'c3',
    number: 3,
    title: 'BAYANG LINGKAR',
    zone: 'marina-senja',
    lead: 'sinta',
    at: { x: -90, z: -304 },
    reward: 1700,
    setup: 'Sinta mengawasi kurir yang membawa muatan lebih dari sekadar pasir.',
    task: 'Capai pos pengintai Sinta di lingkar selatan',
    intro: 'Sinta: Ikuti dari jauh. Kalau dia menoleh, berarti kau sudah terlalu dekat.',
    outro: 'Sinta: Datanya masuk. Jam surutnya diatur dari luar, bukan oleh alam.',
  },
  {
    id: 'c4',
    number: 4,
    title: 'SOROT TIMUR',
    zone: 'teluk-aruna',
    lead: 'ara',
    at: { x: 300, z: -250 },
    reward: 2200,
    needs: 'air',
    setup: 'Helikopter menunggu. Mercusuar harus terang sebelum kapal lewat.',
    task: 'Naik helikopter dan nyalakan sorotan di helipad',
    intro: 'Ara: Kalau ada yang bertanya, kau sedang mencari kapal hilang. Nyalakan lampunya.',
    outro: 'Ara: Cahayanya sampai ke ujung dermaga. Bimo sudah menunggu di sana.',
  },
  {
    id: 'c5',
    number: 5,
    title: 'PAPAN LENGAN',
    zone: 'marina-senja',
    lead: 'bimo',
    at: { x: -420, z: -185 },
    reward: 2700,
    setup: 'Bimo terdesak di ujung dermaga kayu dan butuh jalan keluar.',
    task: 'Bantu Bimo di ujung Dermaga Karang Senja',
    intro: 'Bimo: Tiga mobil di belakangku. Aku masih punya satu tangan kosong.',
    outro: 'Bimo: Beres. Aku tahu siapa yang mengirim mereka kemari.',
  },
  {
    id: 'c6',
    number: 6,
    title: 'PETI KOSONG',
    zone: 'teluk-aruna',
    lead: 'dimas',
    at: { x: 135, z: 205 },
    reward: 3300,
    setup: 'Konvoi lewat jembatan kanal. Kargonya tidak seperti kelihatannya.',
    task: 'Sergap konvoi di jembatan kanal Teluk Aruna',
    intro: 'Dimas: Potong di jembatan. Jangan biarkan peti itu masuk ke kota.',
    outro: 'Dimas: Petinya kosong. Kita dipakai supaya kelihatan di tempat yang salah.',
  },
  {
    id: 'c7',
    number: 7,
    title: 'PASANG SURUT',
    zone: 'teluk-aruna',
    lead: 'sinta',
    at: { x: 300, z: -250 },
    reward: 6500,
    setup: 'Sinta mengaku soal tabel pasang. Kru berkumpul untuk membalik rencana.',
    task: 'Kumpulkan kru di helipad dan putar arah cerita',
    intro: 'Sinta: Aku yang memberi mereka jam surut. Kuingin ini cuma soal uang. Air balik, kita juga balik.',
    outro: 'Ara: Kota ini masih punya kita. Sampai besok pagi, kru.',
  },
];

export const GUNS = [
  { id: 'hand', label: 'TANGAN KOSONG', tag: 'FIST', rounds: Infinity, harm: 14, delay: 0.34, reach: 6 },
  { id: 'sidearm', label: 'PISTOL ARUNA', tag: 'PST', rounds: 50, harm: 30, delay: 0.17, reach: 100 },
  { id: 'subgun', label: 'SMG SENJA', tag: 'SMG', rounds: 200, harm: 18, delay: 0.07, reach: 110 },
  { id: 'launcher', label: 'ROKET PASANG', tag: 'RKT', rounds: 9, harm: 95, delay: 0.85, reach: 150 },
];

export const STATIONS = [
  { id: 'aruna', label: 'ARUNA FM', dial: '98.4', style: 'harbor soul', beat: 98, tone: 220 },
  { id: 'senja', label: 'SENJA PULSE', dial: '104.7', style: 'coastal drive', beat: 124, tone: 261.6 },
  { id: 'pasang', label: 'PASANG RADIO', dial: '88.1', style: 'after dark', beat: 82, tone: 196 },
];

export const HEAT = [
  { word: 'TENANG', tint: '#6fe4ee' },
  { word: 'DIPERHATIKAN', tint: '#ffd982' },
  { word: 'DIBURU', tint: '#ff9b6b' },
  { word: 'BERBAHAYA', tint: '#ff6d84' },
  { word: 'TERCARI', tint: '#ff4d6d' },
  { word: 'LEGENDARIS', tint: '#ff3b52' },
];

export const START_MONEY = 2500;

export const DEPARTURES = [
  { x: 238, z: 86, facing: -0.5, note: 'GUDANG TELUK' },
  { x: -225, z: -215, facing: 0.9, note: 'PANTAI SENJA' },
  { x: 70, z: -390, facing: 0, note: 'LINGKARAN' },
  { x: 135, z: 205, facing: Math.PI / 2, note: 'JEMBATAN KANAL' },
  { x: -380, z: -185, facing: -Math.PI / 2, note: 'DERMAGA LAMA' },
];

export const FRAME_TEXT = {
  harbor: 'Sunset over Teluk Aruna',
  pursuit: 'Ring road pursuit',
  beam: 'Searchlight over Marina Senja',
  tide: 'Pasang Surut at the helipad',
};
