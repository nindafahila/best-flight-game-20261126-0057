// Langit hidup: gradien hangat, matahari bercahaya dengan sinar, dan awan
// bervolume berlapis. Semua digambar dari kode di atas canvas 2D — tanpa
// gambar luar. `project` adalah proyektor kamera dari renderer.
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function sunWorld(cam) {
  return { x: cam.pos[0] + 5000, y: cam.pos[1] + 2600, z: cam.pos[2] - 8000 };
}

function drawSun(ctx, project, cam, focal, horizonY, storm, time) {
  const s = sunWorld(cam);
  const sp = project(s.x, s.y, s.z);
  if (!sp) return;
  // Cahaya hangat yang menyebar di sekitar matahari.
  const glowR = storm ? 110 : 210;
  const glow = ctx.createRadialGradient(sp.x, sp.y, 6, sp.x, sp.y, glowR);
  if (storm) {
    glow.addColorStop(0, 'rgba(225,225,205,0.55)');
    glow.addColorStop(0.4, 'rgba(225,225,205,0.16)');
    glow.addColorStop(1, 'rgba(225,225,205,0)');
  } else {
    glow.addColorStop(0, 'rgba(255,246,190,0.95)');
    glow.addColorStop(0.25, 'rgba(255,222,130,0.55)');
    glow.addColorStop(0.6, 'rgba(255,190,90,0.18)');
    glow.addColorStop(1, 'rgba(255,190,90,0)');
  }
  ctx.fillStyle = glow;
  ctx.fillRect(sp.x - glowR, sp.y - glowR, glowR * 2, glowR * 2);
  // Sinar pendek yang berputar pelan (hanya saat cerah).
  if (!storm) {
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate(time * 0.05);
    ctx.strokeStyle = 'rgba(255,232,150,0.35)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU;
      const r0 = 42;
      const r1 = 58 + (i % 2) * 10;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Cakram matahari (pucat saat badai, seperti bulan di balik awan).
  ctx.fillStyle = storm ? '#dcdcc8' : '#fff3b0';
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, storm ? 20 : 28, 0, TAU);
  ctx.fill();
  // Kabut hangat di garis horizon, tepat di bawah matahari.
  const haze = ctx.createRadialGradient(sp.x, horizonY, 4, sp.x, horizonY, 320);
  haze.addColorStop(0, storm ? 'rgba(160,165,175,0.20)' : 'rgba(255,214,140,0.30)');
  haze.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(sp.x - 320, horizonY - 90, 640, 180);
  void focal;
}

// Satu gumpal awan: tiga elips bertumpuk — atas terang, bawah berbayang —
// supaya awan terlihat tebal, bukan sekadar tempelan putih datar.
function drawPuff(ctx, x, y, s, storm, shade) {
  const top = storm ? 'rgba(88,96,112,0.92)' : 'rgba(255,255,255,0.95)';
  const mid = storm ? 'rgba(70,78,94,0.92)' : 'rgba(238,246,252,0.95)';
  const bottom = storm ? 'rgba(48,54,68,0.9)' : 'rgba(203,222,238,0.92)';
  ctx.fillStyle = bottom;
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.16, s * 0.95, s * 0.26, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = mid;
  ctx.beginPath();
  ctx.ellipse(x - s * 0.5, y + s * 0.02, s * 0.58, s * 0.28, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + s * 0.5, y + s * 0.04, s * 0.55, s * 0.26, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.14, s * 0.62, s * 0.3, 0, 0, TAU);
  ctx.fill();
  void shade;
}

function drawClouds(ctx, project, cam, focal, horizonY, storm, time, world) {
  ctx.save();
  for (const c of world.clouds) {
    const cx = c.x + ((time * c.speed) % 4000);
    const p = project(cx, c.y, c.z);
    if (!p || p.d > 9000) continue;
    const s = (c.size * focal) / p.d;
    if (s < 4) continue;
    drawPuff(ctx, p.x, p.y, s, storm);
  }
  ctx.restore();
}

// Bank awan jauh di dekat horizon: gumpalan pipih yang bergerak sangat pelan,
// memberi kesan kedalaman pada langit.
function drawFarBank(ctx, W, horizonY, storm, time) {
  ctx.save();
  ctx.globalAlpha = storm ? 0.5 : 0.65;
  for (let i = 0; i < 6; i += 1) {
    const x = ((i * 317 + time * 4) % (W + 420)) - 210;
    const y = horizonY - 26 - (i % 3) * 16;
    const w = 190 + (i % 3) * 70;
    ctx.fillStyle = storm ? 'rgba(74,82,100,0.8)' : 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(x, y, w, 13 + (i % 2) * 5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = storm ? 'rgba(58,66,84,0.8)' : 'rgba(226,240,250,0.85)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.25, y + 7, w * 0.6, 10, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawSkyScene(ctx, W, H, project, cam, focal, horizonY, storm, time, world) {
  // Gradien langit: biru dalam di atas, cerah hangat di dekat horizon.
  const top = storm ? '#131927' : '#1d6cc2';
  const mid = storm ? '#2b3446' : '#4f9fe0';
  const low = storm ? '#565e6d' : '#a9d3ec';
  const bottom = storm ? '#3a3f4a' : '#8fc3e8';
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, top);
  grad.addColorStop(Math.max(0.05, (horizonY / H) * 0.55), mid);
  grad.addColorStop(Math.max(0.08, horizonY / H), low);
  grad.addColorStop(Math.min(1, horizonY / H + 0.1), low);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  drawSun(ctx, project, cam, focal, horizonY, storm, time);
  drawFarBank(ctx, W, horizonY, storm, time);
  drawClouds(ctx, project, cam, focal, horizonY, storm, time, world);
}
