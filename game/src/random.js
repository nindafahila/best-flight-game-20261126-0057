// Angka acak ber-seed (mulberry32) agar dunia, awan, dan cincin selalu sama
// untuk seed yang sama — penting untuk tangkapan layar yang deterministik.
export function createRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Noise nilai 2D yang halus: interpolasi bilinear dari grid acak ber-seed.
export function createNoise(seed) {
  const rand = createRandom(seed);
  const size = 64;
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i += 1) grid[i] = rand();
  const fade = (t) => t * t * (3 - 2 * t);
  function at(ix, iz) {
    const x = ((ix % size) + size) % size;
    const z = ((iz % size) + size) % size;
    return grid[z * size + x];
  }
  return function noise(x, z) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = fade(x - ix);
    const fz = fade(z - iz);
    const a = at(ix, iz);
    const b = at(ix + 1, iz);
    const c = at(ix, iz + 1);
    const d = at(ix + 1, iz + 1);
    return (a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz) * 2 - 1;
  };
}

// Ambil bilangan bulat dari rentang [min, max) memakai generator ber-seed.
export function rangeInt(rand, min, max) {
  return min + Math.floor(rand() * (max - min));
}
