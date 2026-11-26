// Detail laut: kilau matahari di air, riak gelombang, dan cincin riak yang
// bergerak pelan. Semua digambar di ruang layar, di bawah garis horizon —
// tanpa menyentuh terrain atau fisika.
const TAU = Math.PI * 2;

// Hash deterministik 0..1 dari satu bilangan bulat (tanpa Math.random,
// supaya kilau stabil antar frame dan tidak berkedip acak).
function hash1(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function drawSunGlint(ctx, W, H, project, cam, horizonY, storm, time) {
  const sp = project(cam.pos[0] + 5000, cam.pos[1] + 2600, cam.pos[2] - 8000);
  if (!sp || sp.x < -260 || sp.x > W + 260) return;
  const maxA = storm ? 0.1 : 0.3;
  const rows = 26;
  for (let i = 0; i < rows; i += 1) {
    const y = horizonY + 10 + i * 15;
    if (y > H) break;
    const t = i / rows;
    const wobble = Math.sin(i * 1.7 + time * 0.8) * (6 + i * 0.9);
    const w = Math.max(18, 130 - i * 4.2);
    const a = maxA * (1 - t) * (0.65 + 0.35 * Math.sin(time * 2 + i * 1.3));
    if (a <= 0.02) continue;
    ctx.fillStyle = `rgba(255,240,180,${a.toFixed(3)})`;
    ctx.fillRect(sp.x - w / 2 + wobble, y, w, 3);
  }
}

function drawWaveSparkles(ctx, W, H, horizonY, storm, time) {
  const count = storm ? 36 : 70;
  for (let i = 0; i < count; i += 1) {
    const hx = hash1(i * 3 + 11);
    const hy = hash1(i * 7 + 5);
    const drift = time * (5 + hx * 12);
    const x = (hx * (W + 80) + drift) % (W + 80) - 40;
    const y = horizonY + 12 + hy * Math.max(20, H - horizonY - 24);
    const tw = 0.5 + 0.5 * Math.sin(time * 1.6 + i * 2.3);
    const a = (storm ? 0.05 : 0.08) + (storm ? 0.08 : 0.18) * tw;
    const len = 5 + hx * 11;
    ctx.fillStyle = storm ? `rgba(190,205,220,${a.toFixed(3)})` : `rgba(225,242,255,${a.toFixed(3)})`;
    ctx.fillRect(x - len / 2, y, len, 1.6);
  }
}

function drawRipples(ctx, W, H, horizonY, storm, time) {
  if (storm) return;
  ctx.save();
  for (let i = 0; i < 5; i += 1) {
    const cx = W * (0.14 + i * 0.18);
    const cy = H - 34 - i * 26;
    if (cy < horizonY + 20) continue;
    const r = 26 + ((time * 22 + i * 47) % 110);
    const a = 0.07 * (1 - r / 150);
    if (a <= 0.01) continue;
    ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.32, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSeaDetail(ctx, W, H, project, cam, focal, horizonY, storm, time) {
  void focal;
  drawSunGlint(ctx, W, H, project, cam, horizonY, storm, time);
  drawWaveSparkles(ctx, W, H, horizonY, storm, time);
  drawRipples(ctx, W, H, horizonY, storm, time);
}
