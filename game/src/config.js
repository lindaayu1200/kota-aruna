export const GAME_TITLE = 'KOTA ARUNA';
export const GAME_TAGLINE = 'DUA DISTRIK, SATU AIR PASANG';
export const FRAME_TIME = 1 / 60;

export const LIMITS = {
  west: -640,
  east: 560,
  north: -560,
  south: 560,
  seaLevel: 0.06,
  chaseRadius: 520,
};

export const DISTRICTS = [
  {
    id: 'teluk-aruna',
    name: 'TELUK ARUNA',
    caption: 'MENARA & PELABUHAN',
    center: { x: 170, z: 50 },
    radius: 320,
    color: '#ffa76f',
  },
  {
    id: 'marina-senja',
    name: 'MARINA SENJA',
    caption: 'PANTAI & PERAHU',
    center: { x: -210, z: -145 },
    radius: 300,
    color: '#70e3f1',
  },
];

export const PALETTE = {
  highSky: '#201848',
  lowSky: '#f38f74',
  sun: '#ffdaa3',
  haze: '#e7a08a',
  oceanDark: '#0b2e43',
  oceanLight: '#3f9c9c',
  sand: '#f1cc95',
  soil: '#3c3349',
  asphalt: '#1b1c29',
  ringAsphalt: '#26293a',
  roadPaint: '#ffe0a9',
  pierWood: '#79503a',
  concrete: '#8d7e82',
  glass: '#90dcf0',
  lantern: '#ffc06e',
  hotPink: '#ff66aa',
  coolCyan: '#61f0ff',
  cottagePaints: ['#f4b9a5', '#f9d9ac', '#aadfd3', '#e8aac8', '#c8bced', '#a4cbed'],
  officePaints: ['#7789b2', '#9888bb', '#6890a2', '#897aa6', '#7c9bb8'],
  leafPaints: ['#316f50', '#409261', '#285c47', '#56a16b'],
};

export const STREET_GRID = {
  northSouth: [-230, -110, 10, 140, 270, 400],
  eastWest: [-330, -180, -35, 115, 260, 405],
  width: 18,
  shoreline: -320,
  sandWidth: 64,
  belt: { cx: 72, cz: 15, rx: 385, rz: 418, width: 27, pieces: 84 },
  channel: { z: 205, half: 30, west: -330, east: 190 },
  pier: { z: -185, shore: -300, tip: -455, width: 11 },
  beacon: { x: -452, z: -185 },
  helipad: { x: 300, z: -250, radius: 27 },
  officeArea: { west: -20, east: 455, north: -455, south: 455 },
  cottageArea: { west: -298, east: -12, north: -445, south: 445 },
};

export const STREET_NAMES = {
  vertical: [
    'Jalan Teluk Aruna',
    'Jalan Ombak Biru',
    'Jalan Bintang Utara',
    'Jalan Dermaga Tua',
    'Jalan Cakrawala',
    'Jalan Pelabuhan Baru',
  ],
  horizontal: [
    'Jalan Marina Senja',
    'Jalan Pantai Kencana',
    'Jalan Senja Raya',
    'Jalan Tanjung Harapan',
    'Jalan Pasir Emas',
    'Jalan Langit Timur',
  ],
  orbital: 'Jalan Lingkar Aruna',
  boardwalk: 'Dermaga Karang Senja',
};

export const CREW = [
  {
    id: 'ara',
    name: 'Ara',
    role: 'pengatur jalan pelabuhan',
    color: '#ffd07d',
    line: 'Kalau air naik, jejak ikut hanyut. Itu bukan ramalan, itu pekerjaan.',
  },
  {
    id: 'dimas',
    name: 'Dimas',
    role: 'pengemudi andalan',
    color: '#7adfff',
    line: 'Gang sempit bukan soal. Rem yang telat baru bikin cerita pendek.',
  },
  {
    id: 'sinta',
    name: 'Sinta',
    role: 'pembaca pasang surut',
    color: '#ff8cc4',
    line: 'Angka air tidak pernah bohong. Orang yang menyalinnya yang bisa bohong.',
  },
  {
    id: 'bimo',
    name: 'Bimo',
    role: 'penjaga dermaga',
    color: '#a9efaa',
    line: 'Aku tahu papan mana yang berderit sebelum orang sempat berdiri di atasnya.',
  },
];

export const MISSIONS = [
  {
    id: 'm1',
    number: 1,
    title: 'KUNCI PELABUHAN',
    district: 'teluk-aruna',
    lead: 'ara',
    point: { x: 210, z: 78 },
    pay: 950,
    brief: 'Ara duduk di depan gudang dengan kunci mobil yang bukan miliknya.',
    objective: 'Temui Ara di area gudang Teluk Aruna',
    opener: 'Ara: Kau datang juga. Kuncinya ada di kap mesin. Jangan tanya siapa pemiliknya.',
    closer: 'Ara: Satu beres. Masih enam job sebelum air berubah arah.',
  },
  {
    id: 'm2',
    number: 2,
    title: 'PAYUNG KEEMPAT',
    district: 'marina-senja',
    lead: 'dimas',
    point: { x: -232, z: -224 },
    pay: 1300,
    brief: 'Sebuah paket ditaruh Dimas di bawah payung pantai yang mudah tertukar.',
    objective: 'Ambil titik Dimas di bibir pantai Marina Senja',
    opener: 'Dimas: Payung keempat dari kiri. Kalau sudah ada yang duduk di situ, kita terlambat.',
    closer: 'Dimas: Gampang. Sekarang bagian yang bikin tangan kotor.',
  },
  {
    id: 'm3',
    number: 3,
    title: 'KURIR LINGKAR',
    district: 'marina-senja',
    lead: 'sinta',
    point: { x: -90, z: -304 },
    pay: 1700,
    brief: 'Sinta memantau kurir yang membawa lebih dari sekadar karung pasir.',
    objective: 'Capai pos pengintai Sinta di lingkar selatan',
    opener: 'Sinta: Ikuti dia dari jauh. Kalau dia menoleh, kau sudah terlalu dekat.',
    closer: 'Sinta: Datanya masuk. Tapi jam surutnya diatur dari luar, bukan oleh alam.',
  },
  {
    id: 'm4',
    number: 4,
    title: 'SOROTAN TIMUR',
    district: 'teluk-aruna',
    lead: 'ara',
    point: { x: 300, z: -250 },
    pay: 2200,
    brief: 'Helikopter menunggu di helipad. Mercusuar harus terang sebelum kapal lewat.',
    objective: 'Naik helikopter dan nyalakan sorotan di helipad',
    opener: 'Ara: Kalau ada yang bertanya, kau sedang mencari kapal hilang. Nyalakan lampunya.',
    closer: 'Ara: Cahayanya sampai ke ujung dermaga. Bimo sudah menunggu di sana.',
  },
  {
    id: 'm5',
    number: 5,
    title: 'PAPAN BERDERIT',
    district: 'marina-senja',
    lead: 'bimo',
    point: { x: -420, z: -185 },
    pay: 2700,
    brief: 'Bimo terkepung di ujung dermaga kayu dan butuh jalan keluar.',
    objective: 'Bantu Bimo di ujung Dermaga Karang Senja',
    opener: 'Bimo: Tiga mobil di belakangku. Aku masih punya satu tangan kosong.',
    closer: 'Bimo: Beres. Aku tahu siapa yang mengirim mereka kemari.',
  },
  {
    id: 'm6',
    number: 6,
    title: 'PETI KOSONG',
    district: 'teluk-aruna',
    lead: 'dimas',
    point: { x: 40, z: 205 },
    pay: 3300,
    brief: 'Konvoi lewat jembatan kanal. Kargo yang mereka bawa tidak seperti kelihatannya.',
    objective: 'Sergap konvoi di jembatan kanal Teluk Aruna',
    opener: 'Dimas: Potong di jembatan. Jangan biarkan peti itu masuk ke kota.',
    closer: 'Dimas: Petinya kosong. Kita cuma dipakai supaya kelihatan di tempat yang salah.',
  },
  {
    id: 'm7',
    number: 7,
    title: 'PASANG SURUT',
    district: 'teluk-aruna',
    lead: 'sinta',
    point: { x: 300, z: -250 },
    pay: 6500,
    brief: 'Sinta mengaku soal tabel pasang. Seluruh kru berkumpul untuk membalik rencana.',
    objective: 'Kumpulkan kru di helipad dan putar arah cerita',
    opener: 'Sinta: Aku yang memberi mereka jam surut. Aku kira cuma soal uang. Air balik, kita juga balik.',
    closer: 'Ara: Kota ini masih punya kita. Sampai besok pagi, kru.',
  },
];

export const WEAPONS = [
  { id: 'fists', label: 'TANGAN KOSONG', short: 'FIST', stock: Infinity, damage: 14, cooldown: 0.34, range: 6 },
  { id: 'pistol', label: 'PISTOL ARUNA', short: 'PST', stock: 50, damage: 30, cooldown: 0.17, range: 100 },
  { id: 'smg', label: 'SMG SENJA', short: 'SMG', stock: 200, damage: 18, cooldown: 0.07, range: 110 },
  { id: 'rocket', label: 'ROKET PASANG', short: 'RKT', stock: 9, damage: 95, cooldown: 0.85, range: 150 },
];

export const RADIO_CHANNELS = [
  { id: 'aruna', label: 'ARUNA FM', frequency: '98.4', mood: 'harbor soul', tempo: 98, root: 220 },
  { id: 'senja', label: 'SENJA PULSE', frequency: '104.7', mood: 'coastal drive', tempo: 124, root: 261.6 },
  { id: 'pasang', label: 'PASANG RADIO', frequency: '88.1', mood: 'after dark', tempo: 82, root: 196 },
];

export const ALERT_TIERS = [
  { label: 'BERSIH', color: '#70e3f1' },
  { label: 'DIPERHATIKAN', color: '#ffd982' },
  { label: 'DIBURU', color: '#ff9b6b' },
  { label: 'BERBAHAYA', color: '#ff6d84' },
  { label: 'TERCARI', color: '#ff4d6d' },
  { label: 'LEGENDARIS', color: '#ff3b52' },
];

export const START_CASH = 2500;

export const START_POINTS = [
  { x: 238, z: 86, heading: -0.5, caption: 'GUDANG TELUK' },
  { x: -225, z: -215, heading: 0.9, caption: 'PANTAI SENJA' },
  { x: 70, z: -390, heading: 0, caption: 'LINGKARAN' },
  { x: 42, z: 205, heading: Math.PI / 2, caption: 'JEMBATAN KANAL' },
  { x: -380, z: -185, heading: -Math.PI / 2, caption: 'DERMAGA LAMA' },
];

export const SHOT_CAPTIONS = {
  harbor: 'Sunset over Teluk Aruna',
  pursuit: 'Ring road pursuit',
  beam: 'Searchlight over Marina Senja',
  tide: 'Pasang Surut at the helipad',
};
