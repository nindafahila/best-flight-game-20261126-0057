// Sky Courier: Pulau Karang — tetapan dasar permainan.
// Semua angka di sini dalam satuan dunia: meter untuk jarak, knot untuk
// kecepatan, kaki untuk ketinggian yang ditampilkan di HUD.
export const WORLD = {
  seaLevel: 0,
  gravityFeel: 1,
  // Kecepatan terbang: pelan di bawah ini pesawat stall (jatuh).
  stallKnots: 55,
  minKnots: 40,
  maxKnots: 210,
  cruiseKnots: 120,
  // Bahan bakar: 100 unit per misi; habis berarti darurat.
  fuelStart: 100,
  stormFuelStart: 62,
};

export const PLANE = {
  // Jarak kamera kejar di belakang pesawat dan tingginya di atas pesawat.
  cameraDistance: 30,
  cameraHeight: 9,
  // Batas gerak: pitch naik/turun dan bank kiri/kanan (derajat).
  maxPitchUp: 22,
  maxPitchDown: -18,
  maxBank: 62,
  pitchRate: 34,
  bankRate: 95,
  // Throttle naik/turun per detik saat tombol ditekan.
  throttleRate: 0.55,
  // Radius tabrakan dengan tanah/air (meter di atas permukaan).
  groundClearance: 2.5,
};

// Misi berurutan: nama, ring yang harus dilewati, cuaca, dan landasan tujuan.
export const MISSIONS = [
  {
    id: 1,
    name: 'Misi 1 — Cincin Emas',
    brief: 'Lewati 6 cincin emas di atas laut dan pulau. Jaga kecepatan di atas 55 knot!',
    ringCount: 6,
    storm: false,
    wind: 0,
    landAt: null,
    fuel: WORLD.fuelStart,
  },
  {
    id: 2,
    name: 'Misi 2 — Antar Kargo',
    brief: 'Lewati 4 cincin, lalu mendarat mulus di landasan Pulau Hijau.',
    ringCount: 4,
    storm: false,
    wind: 2,
    landAt: 'hijau',
    fuel: WORLD.fuelStart,
  },
  {
    id: 3,
    name: 'Misi 3 — Badai Karang',
    brief: 'Badai! Angin kencang, bahan bakar ketat. Lewati 5 cincin dan mendarat di Pulau Badai sebelum kehabisan bahan bakar.',
    ringCount: 5,
    storm: true,
    wind: 9,
    landAt: 'badai',
    fuel: WORLD.stormFuelStart,
  },
];

export const SCORE = {
  ring: 100,
  landing: 250,
  softLandingBonus: 150,
  timeBonusPerSecond: 2,
  damagePenalty: 25,
};

export const STEP = 1 / 60;
export const KNOT_TO_MS = 0.514444;
export const M_TO_FT = 3.28084;
