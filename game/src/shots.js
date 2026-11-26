// Adegan demo deterministik untuk tangkapan layar (?shot=...&seed=N).
// Tiap shot membangun keadaan permainan yang nyata — misi, posisi, cincin,
// cuaca — lalu dibekukan di satu frame, jadi tangkapan layar selalu sama
// untuk seed yang sama dan selalu menunjukkan pesawat + HUD + terrain.
import { createMissionState } from './missions.js';
import { createPlaneState } from './physics.js';

// Posisi pesawat per shot: [x, y, z, heading, pitch, bank, speed, throttle, fuel]
const SHOTS = {
  // Sampul: terbang di atas laut menghadap cincin emas, Pulau Hijau di kejauhan.
  cover: { mission: 0, plane: [450, 170, -1150, 20, 2, -8, 132, 0.72, 82], score: 350, time: 96 },
  // Di atas landasan saat lepas landas: marka jelas, kota di kejauhan.
  runway: { mission: 1, plane: [100, 45, -120, 90, 4, 0, 92, 0.85, 96], score: 100, time: 8 },
  // Terbang rendah di atas pulau menuju cincin, pantai di bawah.
  rings: { mission: 0, plane: [500, 100, -600, 84, -2, 14, 148, 0.8, 71], score: 520, time: 154 },
  // Misi badai: langit gelap, hujan, instrumen menyala, bahan bakar ketat.
  storm: { mission: 2, plane: [-1050, 210, -4300, 27, 0, -18, 141, 0.9, 34], score: 740, time: 243 },
};

export function shotNames() {
  return Object.keys(SHOTS);
}

// Bangun keadaan penuh untuk satu shot; mengembalikan null bila nama tak dikenal.
export function buildShotState(name, world, seed) {
  const def = SHOTS[name];
  if (!def) return null;
  const mission = createMissionState(def.mission);
  mission.rings = world.buildRings(def.mission);
  // Cincin yang sudah dilewati di shot ini: sebagian, agar penghitung hidup.
  const passed = name === 'cover' ? 2 : name === 'rings' ? 3 : name === 'storm' ? 2 : name === 'runway' ? 0 : 0;
  for (let i = 0; i < passed && i < mission.rings.length; i += 1) {
    mission.rings[i].passed = true;
    mission.ringsPassed += 1;
  }
  const plane = createPlaneState();
  const [x, y, z, heading, pitch, bank, speed, throttle, fuel] = def.plane;
  Object.assign(plane, { x, y, z, heading, pitch, bank, speedKnots: speed, throttle, fuel, onGround: false });
  mission.time = def.time;
  void seed;
  return { plane, mission, score: def.score, storm: mission.def.storm, time: def.time + 12.4 };
}
