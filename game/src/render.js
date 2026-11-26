// Renderer: langit, terrain perspektif, awan, cincin, landasan, rumah,
// dan pesawat kargo — semuanya digambar dari kode di atas canvas 2D.
import { RUNWAYS } from './world.js';

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Warna permukaan terrain.
const SURFACE_COLORS = {
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

function mixColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0;
  let H = 0;

  function resize() {
    W = canvas.width = canvas.clientWidth || 1280;
    H = canvas.height = canvas.clientHeight || 720;
  }

  // Kamera kejar: di belakang pesawat, melihat sedikit ke depan atas.
  function cameraBasis(plane, lookYaw) {
    const h = (plane.heading * Math.PI) / 180;
    const fx = Math.sin(h);
    const fz = -Math.cos(h);
    const camX = plane.x - fx * 30 + Math.sin(h + Math.PI / 2) * lookYaw * 8;
    const camY = plane.y + 9;
    const camZ = plane.z - fz * 30 + Math.cos(h + Math.PI / 2) * lookYaw * 8;
    const lookX = plane.x + fx * 60;
    const lookY = plane.y + 10 + plane.pitch * 0.3;
    const lookZ = plane.z + fz * 60;
    let fwd = [lookX - camX, lookY - camY, lookZ - camZ];
    const fl = Math.hypot(fwd[0], fwd[1], fwd[2]) || 1;
    fwd = [fwd[0] / fl, fwd[1] / fl, fwd[2] / fl];
    // right = fwd x up(0,1,0) = (-fwd.z, 0, fwd.x)
    let right = [-fwd[2], 0, fwd[0]];
    const rl = Math.hypot(right[0], right[2]) || 1;
    right = [right[0] / rl, 0, right[2] / rl];
    const up = [
      right[1] * fwd[2] - right[2] * fwd[1],
      right[2] * fwd[0] - right[0] * fwd[2],
      right[0] * fwd[1] - right[1] * fwd[0],
    ];
    return { pos: [camX, camY, camZ], fwd, right, up };
  }

  function makeProjector(cam, focal, horizonY) {
    return function project(x, y, z) {
      const vx = x - cam.pos[0];
      const vy = y - cam.pos[1];
      const vz = z - cam.pos[2];
      const cz = vx * cam.fwd[0] + vy * cam.fwd[1] + vz * cam.fwd[2];
      if (cz < 3) return null;
      const cx = vx * cam.right[0] + vy * cam.right[1] + vz * cam.right[2];
      const cy = vx * cam.up[0] + vy * cam.up[1] + vz * cam.up[2];
      return { x: W / 2 + (cx / cz) * focal, y: horizonY - (cy / cz) * focal, d: cz };
    };
  }

  function drawSky(cam, focal, horizonY, storm, time) {
    const top = storm ? '#1c2436' : '#2f7fd0';
    const mid = storm ? '#4a5468' : '#7ec3ee';
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, top);
    grad.addColorStop(Math.max(0.05, horizonY / H), mid);
    grad.addColorStop(Math.min(1, horizonY / H + 0.08), storm ? '#5c6675' : '#cfe9f7');
    grad.addColorStop(1, storm ? '#3a3f4a' : '#8fc3e8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // Matahari (redup saat badai).
    const sun = { x: cam.pos[0] + 5000, y: cam.pos[1] + 2600, z: cam.pos[2] - 8000 };
    const sp = makeProjector(cam, focal, horizonY)(sun.x, sun.y, sun.z);
    if (sp) {
      const glow = ctx.createRadialGradient(sp.x, sp.y, 4, sp.x, sp.y, 90);
      glow.addColorStop(0, storm ? 'rgba(220,220,200,0.5)' : 'rgba(255,244,180,0.95)');
      glow.addColorStop(0.25, storm ? 'rgba(220,220,200,0.18)' : 'rgba(255,220,120,0.5)');
      glow.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(sp.x - 100, sp.y - 100, 200, 200);
      ctx.fillStyle = storm ? '#d8d8c8' : '#fff3b0';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, storm ? 22 : 30, 0, TAU);
      ctx.fill();
    }
    void time;
  }

  function drawClouds(world, cam, focal, horizonY, time, storm) {
    ctx.save();
    for (const c of world.clouds) {
      const cx = c.x + ((time * c.speed) % 4000);
      const p = makeProjector(cam, focal, horizonY)(cx, c.y, c.z);
      if (!p || p.d > 9000) continue;
      const s = (c.size * focal) / p.d;
      if (s < 4) continue;
      ctx.fillStyle = storm ? 'rgba(52,58,72,0.85)' : 'rgba(255,255,255,0.88)';
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.ellipse(p.x + i * s * 0.55, p.y + (i === 0 ? -s * 0.12 : s * 0.08), s * 0.62, s * 0.3, 0, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Terrain: strip-strip tanah dari jauh ke dekat, diwarnai per permukaan.
  function drawTerrain(world, cam, focal, horizonY, storm) {
    const fogColor = storm ? '#5c6675' : '#bcd9ea';
    // Dasar laut di bawah horizon: menutup celah rambut antar strip tanah.
    // Warnanya kabut dekat horizon agar sambungannya tampak seperti kabut laut.
    ctx.fillStyle = storm ? '#5c6675' : '#bcd9ea';
    ctx.fillRect(0, horizonY, W, H - horizonY);
    const rows = 30;
    const cols = 22;
    const fwdX = cam.fwd[0];
    const fwdZ = cam.fwd[2];
    const rightX = cam.right[0];
    const rightZ = cam.right[2];
    const project = makeProjector(cam, focal, horizonY);
    // Jarak baris: rapat di dekat, renggang di jauh.
    const dists = [];
    for (let i = 0; i <= rows; i += 1) dists.push(50 * Math.pow(1.15, i));
    const strip = [];
    for (let i = 0; i <= rows; i += 1) {
      const d = dists[i];
      const half = d * 0.95;
      const row = [];
      for (let j = 0; j <= cols; j += 1) {
        const lat = -half + (2 * half * j) / cols;
        const x = cam.pos[0] + fwdX * d + rightX * lat;
        const z = cam.pos[2] + fwdZ * d + rightZ * lat;
        const y = world.heightAt(x, z);
        row.push({ p: project(x, y, z), x, z, y, d });
      }
      strip.push(row);
    }
    for (let i = rows - 1; i >= 0; i -= 1) {
      const near = strip[i];
      const far = strip[i + 1];
      for (let j = 0; j < cols; j += 1) {
        const a = far[j];
        const b = far[j + 1];
        const c = near[j + 1];
        const dpt = near[j];
        if (!a.p || !b.p || !c.p || !dpt.p) continue;
        const mx = (a.x + b.x + c.x + dpt.x) / 4;
        const mz = (a.z + b.z + c.z + dpt.z) / 4;
        const surf = world.surfaceAt(mx, mz);
        const fog = clamp(a.d / 2200, 0, 0.8);
        const fill = mixColor(SURFACE_COLORS[surf] || '#5da24a', fogColor, fog);
        ctx.fillStyle = fill;
        ctx.strokeStyle = fill;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.p.x, a.p.y);
        ctx.lineTo(b.p.x, b.p.y);
        ctx.lineTo(c.p.x, c.p.y);
        ctx.lineTo(dpt.p.x, dpt.p.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  function drawRunwayMarkings(cam, focal, horizonY) {
    const project = makeProjector(cam, focal, horizonY);
    for (const r of RUNWAYS) {
      const corners = [
        [r.x - r.halfLength, 7, r.z - r.halfWidth],
        [r.x + r.halfLength, 7, r.z - r.halfWidth],
        [r.x + r.halfLength, 7, r.z + r.halfWidth],
        [r.x - r.halfLength, 7, r.z + r.halfWidth],
      ].map(([x, y, z]) => project(x, y, z));
      if (corners.some((p) => !p)) continue;
      ctx.fillStyle = 'rgba(58,60,66,0.95)';
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (const p of corners.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fill();
      // Garis tengah putus-putus.
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let x = r.x - r.halfLength + 20; x < r.x + r.halfLength - 10; x += 60) {
        const p1 = project(x, 7.4, r.z - 1.5);
        const p2 = project(x + 28, 7.4, r.z - 1.5);
        const p3 = project(x + 28, 7.4, r.z + 1.5);
        const p4 = project(x, 7.4, r.z + 1.5);
        if (!p1 || !p2 || !p3 || !p4) continue;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawHouses(world, cam, focal, horizonY) {
    const project = makeProjector(cam, focal, horizonY);
    for (const h of world.houses) {
      const p = project(h.x, h.y + 6, h.z);
      if (!p || p.d > 2400 || p.d < 10) continue;
      const s = (h.w * focal) / p.d;
      if (s < 1.5) continue;
      ctx.fillStyle = '#e8e0cc';
      ctx.fillRect(p.x - s / 2, p.y - s * 0.7, s, s * 0.7);
      ctx.fillStyle = h.red ? '#b5543a' : '#7a7f85';
      ctx.beginPath();
      ctx.moveTo(p.x - s / 2 - 1, p.y - s * 0.7);
      ctx.lineTo(p.x, p.y - s * 1.15);
      ctx.lineTo(p.x + s / 2 + 1, p.y - s * 0.7);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawRings(mission, cam, focal, horizonY, time) {
    const project = makeProjector(cam, focal, horizonY);
    for (const ring of mission.rings) {
      const p = project(ring.x, ring.y, ring.z);
      if (!p || p.d < 5) continue;
      const r = (ring.radius * focal) / p.d;
      if (r < 2 || r > 900) continue;
      const pulse = 1 + Math.sin(time * 3 + ring.index) * 0.06;
      ctx.save();
      ctx.globalAlpha = ring.passed ? 0.25 : 1;
      ctx.strokeStyle = ring.passed ? '#9aa0a6' : '#ffc21c';
      ctx.lineWidth = Math.max(2, r * 0.09);
      ctx.shadowColor = ring.passed ? 'transparent' : '#ff9d00';
      ctx.shadowBlur = ring.passed ? 0 : 18;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * pulse, 0, TAU);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = ring.passed ? '#c8ccd0' : '#fff3c4';
      ctx.lineWidth = Math.max(1, r * 0.03);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * pulse, 0, TAU);
      ctx.stroke();
      // Label nomor cincin di atasnya.
      if (!ring.passed && r > 14) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(12, Math.min(26, r * 0.45))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(String(ring.index + 1), p.x, p.y - r - 8);
      }
      ctx.restore();
    }
  }

  // Pesawat kargo dilihat dari belakang-atas: badan, sayap, ekor, baling-baling.
  function drawPlane(plane, time, cameraMode) {
    if (cameraMode === 'cockpit') {
      // Kokpit: hidung + panel bawah + pilar samping.
      ctx.fillStyle = '#20242c';
      ctx.beginPath();
      ctx.moveTo(W / 2 - 130, H);
      ctx.quadraticCurveTo(W / 2, H * 0.62, W / 2 + 130, H);
      ctx.lineTo(W / 2 + 90, H);
      ctx.lineTo(W / 2 - 90, H);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a3f4a';
      ctx.fillRect(W / 2 - 130, H - 26, 260, 26);
      ctx.fillStyle = '#16181d';
      ctx.fillRect(0, 0, 26, H);
      ctx.fillRect(W - 26, 0, 26, H);
      return;
    }
    const cx = W / 2;
    const cy = H * 0.60 + plane.pitch * 1.2;
    const s = 1.0;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((plane.bank * Math.PI) / 180);
    ctx.scale(s, s);
    // Bayangan lembut di bawah pesawat.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(6, 26, 150, 14, 0, 0, TAU);
    ctx.fill();
    // Sayap utama.
    ctx.fillStyle = '#f5f1e6';
    ctx.strokeStyle = '#d94f2b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-150, 6);
    ctx.quadraticCurveTo(-60, -14, 0, -10);
    ctx.quadraticCurveTo(60, -14, 150, 6);
    ctx.quadraticCurveTo(60, 16, 0, 14);
    ctx.quadraticCurveTo(-60, 16, -150, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Badan pesawat (dilihat dari belakang, hidung menjauh ke atas).
    const body = ctx.createLinearGradient(-26, -110, 26, 60);
    body.addColorStop(0, '#ff7a3c');
    body.addColorStop(0.5, '#ff9a4d');
    body.addColorStop(1, '#e85d20');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-24, 62);
    ctx.quadraticCurveTo(-30, -40, -14, -108);
    ctx.quadraticCurveTo(0, -122, 14, -108);
    ctx.quadraticCurveTo(30, -40, 24, 62);
    ctx.quadraticCurveTo(0, 74, -24, 62);
    ctx.closePath();
    ctx.fill();
    // Garis biru di badan + jendela kokpit.
    ctx.fillStyle = '#1d4e89';
    ctx.fillRect(-24, -58, 48, 10);
    ctx.fillStyle = '#bfe6ff';
    ctx.beginPath();
    ctx.ellipse(0, -84, 13, 16, 0, 0, TAU);
    ctx.fill();
    // Ekor horizontal + sirip vertikal.
    ctx.fillStyle = '#f5f1e6';
    ctx.strokeStyle = '#d94f2b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-58, 52);
    ctx.lineTo(58, 52);
    ctx.lineTo(40, 68);
    ctx.lineTo(-40, 68);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d94f2b';
    ctx.beginPath();
    ctx.moveTo(-8, 46);
    ctx.lineTo(0, -6);
    ctx.lineTo(8, 46);
    ctx.closePath();
    ctx.fill();
    // Baling-baling berputar di hidung.
    const propAngle = time * 22;
    ctx.save();
    ctx.translate(0, -112);
    ctx.rotate(propAngle);
    ctx.fillStyle = 'rgba(40,40,40,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 52, 7, 0, 0, TAU);
    ctx.fill();
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, 52, 7, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(0, -112, 7, 0, TAU);
    ctx.fill();
    // Lampu navigasi: merah kiri, hijau kanan, putih ekor (berkedip).
    ctx.fillStyle = '#ff2e2e';
    ctx.beginPath();
    ctx.arc(-150, 6, 6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2eff5e';
    ctx.beginPath();
    ctx.arc(150, 6, 6, 0, TAU);
    ctx.fill();
    if (Math.floor(time * 2) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 70, 5, 0, TAU);
      ctx.fill();
    }
    // Registrasi di badan.
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PK-SKY', 0, 34);
    ctx.restore();
  }

  function drawRain(time) {
    ctx.save();
    ctx.strokeStyle = 'rgba(200,215,235,0.45)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 90; i += 1) {
      const x = ((i * 137.5 + time * 320) % (W + 60)) - 30;
      const y = ((i * 89.3 + time * 900) % (H + 40)) - 20;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 9, y + 26);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw(scene) {
    resize();
    const { plane, mission, world, time, storm, cameraMode, lookYaw } = scene;
    const focal = H * 1.05;
    const cam = cameraBasis(plane, lookYaw || 0);
    // Garis horizon: proyeksikan titik jauh setinggi kamera.
    const horizonProbe = makeProjector(cam, focal, H * 0.45)(cam.pos[0] + cam.fwd[0] * 4000, cam.pos[1], cam.pos[2] + cam.fwd[2] * 4000);
    const horizonY = horizonProbe ? horizonProbe.y : H * 0.45;
    drawSky(cam, focal, horizonY, storm, time);
    drawClouds(world, cam, focal, horizonY, time, storm);
    drawTerrain(world, cam, focal, horizonY, storm);
    drawRunwayMarkings(cam, focal, horizonY);
    drawHouses(world, cam, focal, horizonY);
    drawRings(mission, cam, focal, horizonY, time);
    drawPlane(plane, time, cameraMode);
    if (storm) drawRain(time);
  }

  return { draw, resize };
}
