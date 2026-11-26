// Detail terrain: pewarnaan bukit berundak (puncak lebih terang, lembah lebih
// dalam), pasir basah di tepi air, variasi halus per petak, palem di pulau,
// dan jendela + pepohonan di kota. Tidak mengubah heightmap atau fisika —
// hanya cara terrain digambar.
import { TOWNS } from './world.js';

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Warna dasar permukaan (sama dengan yang dipakai renderer sebelumnya).
const BASE = {
  deep: '#155a8a',
  shallow: '#2fa3c7',
  sand: '#e6cf96',
  grass: '#5da24a',
  forest: '#3e7a34',
  rock: '#8a8a7a',
  town: '#cbb98f',
  townRoof: '#b5543a',
  runway: '#4a4d52',
};

function parseColor(c) {
  if (c.charAt(0) === '#') {
    const p = parseInt(c.slice(1), 16);
    return [(p >> 16) & 255, (p >> 8) & 255, p & 255];
  }
  const m = c.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
}

function mix(a, b, t) {
  const pa = parseColor(a);
  const pb = parseColor(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function shade(rgb, f) {
  const p = parseColor(rgb);
  const r = Math.round(clamp(p[0] * f, 0, 255));
  const g = Math.round(clamp(p[1] * f, 0, 255));
  const b = Math.round(clamp(p[2] * f, 0, 255));
  return `rgb(${r},${g},${b})`;
}

// Hash deterministik 0..1 dari koordinat dunia (variasi antar petak).
function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Warna satu petak terrain: dasar permukaan + bayangan ketinggian + variasi
// halus + kabut. `y` ketinggian rata-rata petak, `fog` 0..0.8, `fogColor`
// warna kabut dari renderer.
export function terrainColor(surf, y, mx, mz, fog, fogColor, storm) {
  let color = BASE[surf] || '#5da24a';
  const n = hash2(Math.floor(mx / 60), Math.floor(mz / 60));
  if (surf === 'grass' || surf === 'forest') {
    // Bukit berundak: makin tinggi makin terang (terkena matahari), lembah
    // lebih dalam. Variasi halus supaya tidak terlihat seperti papan datar.
    const t = clamp((y - 4) / 90, 0, 1);
    const lit = surf === 'grass' ? '#7cc05f' : '#4f8f3e';
    color = mix(color, lit, t * 0.55);
    color = shade(color, 0.94 + n * 0.12);
  } else if (surf === 'sand') {
    // Pasir basah menggelap di tepi air, pasir kering terang di atasnya.
    if (y < 1.2) color = mix(color, '#c2a878', 0.55);
    color = shade(color, 0.96 + n * 0.08);
  } else if (surf === 'shallow') {
    // Dangkal makin biru pekat mengikuti kedalaman.
    color = mix(color, BASE.deep, clamp(-y / 8, 0, 1) * 0.55);
  } else if (surf === 'rock') {
    color = shade(color, n > 0.5 ? 1.08 : 0.9);
  } else if (surf === 'town' || surf === 'townRoof') {
    color = shade(color, 0.95 + n * 0.1);
  }
  if (storm) color = mix(color, '#5c6675', 0.12);
  return mix(color, fogColor, fog);
}

// Palem: dibangun sekali dari heightmap (posisi ber-seed, tersimpan di cache
// modul), lalu digambar kecil di pulau. Sway tipis mengikuti waktu.
let palmCache = null;
function buildPalms(world) {
  if (palmCache) return palmCache;
  const palms = [];
  for (let x = -1600; x <= 3000; x += 90) {
    for (let z = -7800; z <= 900; z += 90) {
      const surf = world.surfaceAt(x, z);
      if (surf !== 'grass' && surf !== 'sand') continue;
      const y = world.heightAt(x, z);
      if (y < 3 || y > 45) continue;
      if (hash2(x, z) > 0.09) continue;
      palms.push({ x, z, y, lean: (hash2(x + 40, z) - 0.5) * 2, tall: 9 + hash2(x, z + 60) * 5 });
    }
  }
  palmCache = palms.slice(0, 170);
  return palmCache;
}

export function drawPalms(ctx, world, project, focal, time) {
  const palms = buildPalms(world);
  for (const p of palms) {
    const base = project(p.x, p.y, p.z);
    if (!base || base.d > 2600 || base.d < 10) continue;
    const s = (p.tall * focal) / base.d;
    if (s < 2.5) continue;
    const sway = Math.sin(time * 0.8 + p.x * 0.05) * s * 0.06;
    const topX = base.x + p.lean * s * 0.14 + sway;
    const topY = base.y - s;
    ctx.strokeStyle = '#7a5a38';
    ctx.lineWidth = Math.max(1, s * 0.09);
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.quadraticCurveTo(base.x + p.lean * s * 0.07, base.y - s * 0.55, topX, topY);
    ctx.stroke();
    ctx.strokeStyle = '#2f7a2e';
    ctx.lineWidth = Math.max(1, s * 0.07);
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI * (0.15 + i * 0.175);
      const ex = topX + Math.cos(a) * s * 0.55;
      const ey = topY + Math.sin(a) * s * 0.34 + s * 0.22;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(topX + Math.cos(a) * s * 0.3, topY + Math.sin(a) * s * 0.2 - s * 0.12, ex, ey);
      ctx.stroke();
    }
    ctx.fillStyle = '#4a9a3a';
    ctx.beginPath();
    ctx.arc(topX, topY, Math.max(1, s * 0.07), 0, TAU);
    ctx.fill();
  }
}

// Jendela hangat di rumah yang sudah ada + pepohonan di sekitar kota.
export function drawTownDetail(ctx, world, project, focal) {
  for (const h of world.houses) {
    const p = project(h.x, h.y + 6, h.z);
    if (!p || p.d > 2400 || p.d < 10) continue;
    const s = (h.w * focal) / p.d;
    if (s < 3) continue;
    ctx.fillStyle = 'rgba(255,233,168,0.9)';
    ctx.fillRect(p.x - s * 0.22, p.y - s * 0.45, s * 0.13, s * 0.16);
    ctx.fillRect(p.x + s * 0.1, p.y - s * 0.45, s * 0.13, s * 0.16);
  }
  for (const town of TOWNS) {
    for (let i = 0; i < 14; i += 1) {
      const a = hash2(town.x + i * 31, town.z) * TAU;
      const r = (0.3 + hash2(town.x, town.z + i * 17) * 0.6) * town.radius;
      const x = town.x + Math.cos(a) * r;
      const z = town.z + Math.sin(a) * r;
      const y = world.heightAt(x, z);
      if (y < 2) continue;
      const p = project(x, y + 8, z);
      if (!p || p.d > 2400 || p.d < 10) continue;
      const s = (9 * focal) / p.d;
      if (s < 2) continue;
      ctx.fillStyle = '#2e6b28';
      ctx.beginPath();
      ctx.arc(p.x, p.y - s * 0.4, s * 0.42, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3f8a35';
      ctx.beginPath();
      ctx.arc(p.x - s * 0.12, p.y - s * 0.55, s * 0.3, 0, TAU);
      ctx.fill();
    }
  }
}
