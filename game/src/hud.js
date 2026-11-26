// HUD: semua instrumen digambar di canvas agar terbaca di tangkapan layar:
// airspeed, altimeter, horizon buatan, kompas pita, throttle, bahan bakar,
// timer misi, skor, penghitung cincin, minimap, dan pesan misi.
import { M_TO_FT } from './config.js';
import { altitudeFeet, headingToCompass } from './physics.js';
import { nextRing } from './missions.js';

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,18,28,0.62)';
  ctx.strokeStyle = 'rgba(140,220,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
}

function label(ctx, text, x, y, size, color, align) {
  ctx.fillStyle = color || '#cfe9ff';
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

// Horizon buatan: lingkaran biru-cokelat yang miring mengikuti bank/pitch.
function drawHorizon(ctx, plane, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate((-plane.bank * Math.PI) / 180);
  const pitchPx = clamp(plane.pitch, -30, 30) * (r / 30);
  ctx.fillStyle = '#3f8fd2';
  ctx.fillRect(-r, -r + pitchPx, r * 2, r - pitchPx);
  ctx.fillStyle = '#8a5a2e';
  ctx.fillRect(-r, pitchPx, r * 2, r - pitchPx + 1);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, pitchPx);
  ctx.lineTo(r, pitchPx);
  ctx.stroke();
  ctx.restore();
  // Sayap tetap di tengah lingkaran.
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - r + 8, y);
  ctx.lineTo(x - 12, y);
  ctx.moveTo(x + 12, y);
  ctx.lineTo(x + r - 8, y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(140,220,255,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  label(ctx, 'HORIZON', x, y + r + 14, 11, '#cfe9ff', 'center');
}

// Pita kompas di bawah: derajat + arah mata angin, heading di tengah.
function drawCompass(ctx, heading, W, H) {
  const y = H - 44;
  const w = Math.min(560, W * 0.5);
  const x0 = (W - w) / 2;
  panel(ctx, x0 - 8, y - 26, w + 16, 52);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x0 - 8, y - 26, w + 16, 52, 10);
  ctx.clip();
  const pxPerDeg = w / 120;
  const center = ((heading % 360) + 360) % 360;
  for (let d = -60; d <= 60; d += 5) {
    const deg = ((Math.round(center) + d) % 360 + 360) % 360;
    const sx = x0 + w / 2 + d * pxPerDeg;
    const major = deg % 30 === 0;
    ctx.strokeStyle = major ? '#fff' : 'rgba(207,233,255,0.6)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(sx, y + 12);
    ctx.lineTo(sx, y + (major ? -2 : 4));
    ctx.stroke();
    if (major) {
      const names = { 0: 'U', 90: 'T', 180: 'S', 270: 'B' };
      label(ctx, names[deg] || String(deg).padStart(3, '0'), sx, y - 8, 12, '#fff', 'center');
    }
  }
  ctx.restore();
  // Penanda heading di tengah.
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(x0 + w / 2 - 7, y - 26);
  ctx.lineTo(x0 + w / 2 + 7, y - 26);
  ctx.lineTo(x0 + w / 2, y - 14);
  ctx.closePath();
  ctx.fill();
  label(ctx, `${String(Math.round(center)).padStart(3, '0')}° ${headingToCompass(center)}`, x0 + w / 2, y + 30, 13, '#ffd23e', 'center');
}

function drawGaugeBar(ctx, x, y, w, h, frac, color, bg) {
  ctx.fillStyle = bg || 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w * clamp(frac, 0, 1), h, 5);
  ctx.fill();
}

export function drawHUD(ctx, scene) {
  const { plane, mission, score, time, W, H, message, messageTime, cameraMode, storm, minimap } = scene;
  const ring = nextRing(mission);
  const alt = altitudeFeet(plane);
  const vs = Math.round(plane.verticalSpeed * 196.85); // m/s -> ft/min

  // Bar atas: nama misi, timer, skor, cincin.
  panel(ctx, 12, 12, Math.min(560, W * 0.62), 46);
  label(ctx, mission.def.name, 26, 32, 17, '#ffffff');
  label(ctx, `WAKTU ${Math.floor(mission.time / 60)}:${String(Math.floor(mission.time % 60)).padStart(2, '0')}`, 26, 50, 12, '#9fd8ff');
  label(ctx, `SKOR ${score}`, 300, 32, 17, '#ffd23e');
  label(ctx, `CINCIN ${mission.ringsPassed}/${mission.rings.length}`, 300, 50, 12, '#ffd23e');

  // Panel kiri: airspeed besar + throttle.
  panel(ctx, 12, 70, 150, 130);
  label(ctx, 'AIRSPEED', 24, 92, 11, '#9fd8ff');
  label(ctx, String(Math.round(plane.speedKnots)), 24, 138, 40, plane.speedKnots < 55 && !plane.onGround ? '#ff5a4e' : '#ffffff');
  label(ctx, 'KNOT', 108, 138, 12, '#cfe9ff');
  label(ctx, 'THROTTLE', 24, 164, 11, '#9fd8ff');
  drawGaugeBar(ctx, 24, 170, 126, 12, plane.throttle, plane.throttle > 0.85 ? '#ff9d00' : '#37c978');
  label(ctx, `${Math.round(plane.throttle * 100)}%`, 24, 196, 11, '#cfe9ff');
  if (plane.speedKnots < 55 && !plane.onGround) label(ctx, 'STALL!', 24, 186, 13, '#ff5a4e');

  // Panel kanan: altimeter + vertical speed + horizon.
  panel(ctx, W - 162, 70, 150, 118);
  label(ctx, 'ALTITUDE', W - 150, 92, 11, '#9fd8ff');
  label(ctx, String(alt), W - 150, 138, 40, '#ffffff');
  label(ctx, 'FT', W - 52, 138, 12, '#cfe9ff');
  label(ctx, `V/S ${vs >= 0 ? '+' : ''}${vs} FT/MIN`, W - 150, 164, 11, vs < -500 ? '#ff9d00' : '#cfe9ff');
  drawHorizon(ctx, plane, W - 87, 214, 44);
  label(ctx, `BANK ${Math.round(plane.bank)}°  PITCH ${Math.round(plane.pitch)}°`, W - 87, 286, 11, '#cfe9ff', 'center');

  // Bahan bakar + kerusakan, kanan atas bawah horizon.
  panel(ctx, W - 162, 308, 150, 84);
  label(ctx, 'FUEL', W - 150, 330, 11, '#9fd8ff');
  const lowFuel = plane.fuel < 25;
  drawGaugeBar(ctx, W - 150, 336, 126, 12, plane.fuel / 100, lowFuel ? '#ff5a4e' : '#37c978');
  label(ctx, `${Math.round(plane.fuel)}%${lowFuel ? ' — MENIPIS!' : ''}`, W - 150, 364, 11, lowFuel ? '#ff5a4e' : '#cfe9ff');
  label(ctx, `DAMAGE ${Math.round(plane.damage)}%`, W - 150, 382, 11, plane.damage > 0 ? '#ff5a4e' : '#cfe9ff');

  // Kompas pita bawah.
  drawCompass(ctx, plane.heading, W, H);

  // Minimap kanan bawah: pulau, landasan, cincin, pesawat.
  const mm = 150;
  const mx = W - mm - 14;
  const my = H - mm - 66;
  panel(ctx, mx - 6, my - 24, mm + 12, mm + 30);
  label(ctx, 'PETA — PULAU KARANG', mx, my - 8, 11, '#cfe9ff');
  if (minimap) ctx.drawImage(minimap, mx, my, mm, mm);
  const toMap = (x, z) => [mx + ((x + 2600) / 6400) * mm, my + ((z + 7600) / 9600) * mm];
  for (const r of mission.rings) {
    if (r.passed) continue;
    const [rx, ry] = toMap(r.x, r.z);
    ctx.fillStyle = '#ffc21c';
    ctx.beginPath();
    ctx.arc(rx, ry, 4, 0, TAU);
    ctx.fill();
  }
  const [px, py] = toMap(plane.x, plane.z);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate((plane.heading * Math.PI) / 180);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Panah ke cincin berikutnya + jaraknya.
  if (ring) {
    const dx = ring.x - plane.x;
    const dz = ring.z - plane.z;
    const bearing = (Math.atan2(dx, -dz) * 180) / Math.PI;
    let rel = ((bearing - plane.heading + 540) % 360) - 180;
    const dist = Math.round(Math.hypot(dx, dz));
    const ax = W / 2;
    const ay = H * 0.30;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate((rel * Math.PI) / 180);
    ctx.fillStyle = '#ffc21c';
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(16, 10);
    ctx.lineTo(0, 2);
    ctx.lineTo(-16, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(10,18,28,0.85)';
    ctx.lineWidth = 4;
    ctx.strokeText(`CINCIN ${ring.index + 1} — ${dist} m`, ax, ay + 44);
    ctx.fillStyle = '#ffc21c';
    ctx.fillText(`CINCIN ${ring.index + 1} — ${dist} m`, ax, ay + 44);
    ctx.restore();
  }

  // Mode kamera + cuaca di kiri bawah.
  label(ctx, `KAMERA: ${cameraMode === 'cockpit' ? 'KOKPIT' : 'KEJAR'} (C)  •  ${storm ? 'BADAI — ANGIN ' + Math.round(plane.windGust) : 'CERAH'}`, 16, H - 66, 12, '#eaf6ff');
  label(ctx, 'W/S throttle • Panah terbang • Spasi rem • P jeda • H bantuan', 16, H - 50, 11, 'rgba(234,246,255,0.75)');

  // Banner pesan tengah (beberapa detik setelah peristiwa).
  if (message && time - messageTime < 3) {
    const alpha = clamp(3 - (time - messageTime), 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,18,28,0.6)';
    const tw = ctx.measureText(message).width;
    ctx.fillRect(W / 2 - tw / 2 - 18, H * 0.42 - 34, tw + 36, 48);
    ctx.fillStyle = '#ffd23e';
    ctx.fillText(message, W / 2, H * 0.42);
    ctx.restore();
  }
}

// Minimap sekali jadi: gambar heightmap kasar ke canvas kecil.
export function buildMinimap(world) {
  const c = document.createElement('canvas');
  c.width = 150;
  c.height = 150;
  const g = c.getContext('2d');
  for (let ix = 0; ix < 150; ix += 1) {
    for (let iz = 0; iz < 150; iz += 1) {
      const x = -2600 + (ix / 150) * 6400;
      const z = -7600 + (iz / 150) * 9600;
      const h = world.heightAt(x, z);
      g.fillStyle = h < 0 ? (h < -8 ? '#155a8a' : '#2fa3c7') : h < 4 ? '#e6cf96' : h > 95 ? '#8a8a7a' : '#5da24a';
      g.fillRect(ix, iz, 1, 1);
    }
  }
  return c;
}
