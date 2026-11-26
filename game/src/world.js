// Dunia: kepulauan tropis fiktif dengan heightmap ber-seed, tiga pulau,
// kota kecil, dua landasan pacu, dan cincin misi yang diletakkan di jalur.
// Koordinat dunia: x ke timur, z ke utara (pesawat lepas landas ke utara,
// z makin negatif), y ketinggian dalam meter, laut di y = 0.
import { createNoise, createRandom } from './random.js';

// Pulau: pusat, radius, tinggi puncak bukit, dan nama.
export const ISLANDS = [
  { id: 'karang', name: 'Pulau Karang', x: 0, z: 0, radius: 1300, peak: 130 },
  { id: 'hijau', name: 'Pulau Hijau', x: 1900, z: -3400, radius: 950, peak: 170 },
  { id: 'badai', name: 'Pulau Badai', x: -1700, z: -6800, radius: 1050, peak: 210 },
];

// Kota kecil: pusat dan radius; rumah digambar di sekitar sini.
export const TOWNS = [
  { x: 320, z: -420, radius: 260, name: 'Kota Karang' },
  { x: 1900, z: -3150, radius: 220, name: 'Kota Hijau' },
];

// Landasan pacu: persegi panjang di tanah datar, arah timur-barat.
export const RUNWAYS = [
  { id: 'karang', name: 'Karang Intl', x: 0, z: -120, halfLength: 420, halfWidth: 20, heading: 0 },
  { id: 'hijau', name: 'Hijau Field', x: 1900, z: -3400, halfLength: 380, halfWidth: 18, heading: 0 },
  { id: 'badai', name: 'Badai Strip', x: -1700, z: -6800, halfLength: 380, halfWidth: 18, heading: 0 },
];

// Ketinggian terrain di satu titik (meter). Di bawah 0 berarti dasar laut.
export function createWorld(seed) {
  const noise = createNoise(seed);
  const noise2 = createNoise(seed + 101);

  function islandHeight(x, z) {
    let h = -26; // dasar laut
    for (const island of ISLANDS) {
      const dx = x - island.x;
      const dz = z - island.z;
      const d = Math.sqrt(dx * dx + dz * dz) / island.radius;
      if (d >= 1) continue;
      const profile = Math.pow(1 - d * d, 1.6);
      const bump = profile * island.peak;
      const rough = noise(x / 420, z / 420) * 14 + noise2(x / 150, z / 150) * 5;
      h = Math.max(h, bump + rough * profile - 4);
    }
    return h;
  }

  // Ratakan tanah di sekitar landasan agar pesawat bisa mendarat.
  function flattenRunway(h, x, z) {
    for (const r of RUNWAYS) {
      // Di dalam petak landasan: rata penuh (6 m).
      if (Math.abs(x - r.x) < r.halfLength && Math.abs(z - r.z) < r.halfWidth) return 6;
      const dx = Math.abs(x - r.x) - r.halfLength;
      const dz = Math.abs(z - r.z) - r.halfWidth;
      const outside = Math.max(dx, dz);
      if (outside < 90) {
        const t = outside / 90;
        return h * t + 6 * (1 - t);
      }
    }
    return h;
  }

  function heightAt(x, z) {
    return flattenRunway(islandHeight(x, z), x, z);
  }

  // Jenis permukaan untuk pewarnaan: laut, dangkal, pasir, rumput, hutan,
  // batu, kota, atau landasan.
  function surfaceAt(x, z) {
    for (const r of RUNWAYS) {
      if (Math.abs(x - r.x) < r.halfLength && Math.abs(z - r.z) < r.halfWidth) return 'runway';
    }
    const h = heightAt(x, z);
    if (h < -8) return 'deep';
    if (h < 0) return 'shallow';
    if (h < 4) return 'sand';
    for (const town of TOWNS) {
      const dx = x - town.x;
      const dz = z - town.z;
      if (dx * dx + dz * dz < town.radius * town.radius) {
        return noise(x / 60, z / 60) > 0.1 ? 'town' : 'townRoof';
      }
    }
    if (h > 95) return 'rock';
    if (h > 45) return 'forest';
    return 'grass';
  }

  // Cincin misi: jalur dari pulau awal menuju pulau tujuan, dengan variasi
  // ketinggian dan belokan agar terbang terasa hidup.
  function buildRings(missionIndex) {
    const rand = createRandom(seed * 31 + missionIndex * 7 + 5);
    const paths = [
      // Misi 1: putaran di sekitar Pulau Karang.
      [[-700, -900], [-150, -1900], [700, -1500], [1100, -500], [500, 400], [-500, 300]],
      // Misi 2: Karang -> Hijau.
      [[300, -1200], [1100, -2100], [1900, -2900], [1900, -3400]],
      // Misi 3: Karang -> Badai, melewati celah bukit.
      [[-400, -1500], [-1300, -3000], [-900, -4600], [-1700, -5800], [-1700, -6800]],
    ];
    const path = paths[missionIndex] || paths[0];
    return path.map(([x, z], i) => {
      const ground = Math.max(0, heightAt(x, z));
      const alt = ground + 55 + rand() * 55 + (i % 2 === 0 ? 25 : 0);
      return { x, z, y: alt, radius: 26, passed: false, index: i };
    });
  }

  // Awan: posisi ber-seed di langit, bergerak pelan mengikuti waktu.
  function buildClouds(count) {
    const rand = createRandom(seed * 13 + 77);
    const clouds = [];
    for (let i = 0; i < count; i += 1) {
      clouds.push({
        x: (rand() - 0.5) * 14000,
        y: 260 + rand() * 260,
        z: 2000 - rand() * 12000,
        size: 120 + rand() * 220,
        speed: 6 + rand() * 10,
      });
    }
    return clouds;
  }

  // Rumah kota: posisi ber-seed di dalam radius kota, untuk digambar kecil.
  function buildHouses() {
    const rand = createRandom(seed * 17 + 3);
    const houses = [];
    for (const town of TOWNS) {
      for (let i = 0; i < 46; i += 1) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * town.radius * 0.9;
        const x = town.x + Math.cos(a) * r;
        const z = town.z + Math.sin(a) * r;
        houses.push({ x, z, y: Math.max(0, heightAt(x, z)), w: 14 + rand() * 10, red: rand() > 0.35 });
      }
    }
    return houses;
  }

  return { heightAt, surfaceAt, buildRings, clouds: buildClouds(26), houses: buildHouses() };
}

// Landasan tujuan sebuah misi, atau null bila misi tanpa pendaratan.
export function runwayFor(mission) {
  if (!mission || !mission.landAt) return null;
  return RUNWAYS.find((r) => r.id === mission.landAt) || null;
}
