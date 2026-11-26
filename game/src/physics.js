// Fisika pesawat kargo kecil: throttle, pitch, bank, stall, angin, bahan
// bakar, tabrakan, dan penilaian pendaratan. Semua langkah memakai dt tetap
// 1/60 detik agar hasil simulasi bisa diulang.
import { KNOT_TO_MS, M_TO_FT, PLANE, SCORE, WORLD } from './config.js';
import { RUNWAYS } from './world.js';

export const CRASH_GROUND = 'ground';
export const CRASH_WATER = 'water';
export const CRASH_FUEL = 'fuel';

// Keadaan awal pesawat di ujung landasan Pulau Karang, menghadap utara.
export function createPlaneState() {
  return {
    x: -380,
    y: 8,
    z: -120,
    heading: 90, // 90 = timur, searah landasan Pulau Karang (sumbu x)
    pitch: 0,
    bank: 0,
    speedKnots: 0,
    throttle: 0,
    fuel: WORLD.fuelStart,
    damage: 0,
    verticalSpeed: 0,
    onGround: true,
    windGust: 0,
  };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const deg = (r) => (r * 180) / Math.PI;
const rad = (d) => (d * Math.PI) / 180;

export function headingToCompass(heading) {
  const names = ['U', 'UTL', 'TL', 'TTL', 'T', 'TGR', 'TG', 'TBD', 'S', 'SBD', 'BD', 'BBL', 'B', 'BBU', 'BU', 'UBU'];
  const i = Math.round((((heading % 360) + 360) % 360) / 22.5) % 16;
  return names[i];
}

// Satu langkah fisika. `ctl` berisi input pemain; `mission` misi aktif;
// `world` dipakai untuk tinggi terrain; `time` untuk hembusan angin.
// Mengembalikan event: 'ring' | 'landed' | 'crash' | 'fuel' | null.
export function stepPlane(plane, ctl, mission, world, time, dt) {
  // Throttle: W/Shift naik, S/Ctrl turun; rem udara (Spasi) memangkas cepat.
  if (ctl.throttleUp) plane.throttle = clamp(plane.throttle + PLANE.throttleRate * dt, 0, 1);
  if (ctl.throttleDown) plane.throttle = clamp(plane.throttle - PLANE.throttleRate * dt, 0, 1);
  if (ctl.brake) plane.speedKnots = Math.max(0, plane.speedKnots - 60 * dt);

  // Pitch dan bank mengikuti tombol, kembali ke nol saat dilepas.
  // Panah atas (pitch +1) = hidung naik, panah bawah = hidung turun.
  const pitchTarget = ctl.pitch * PLANE.maxPitchUp;
  const bankTarget = ctl.bank * PLANE.maxBank;
  plane.pitch += clamp(pitchTarget - plane.pitch, -PLANE.pitchRate * dt, PLANE.pitchRate * dt);
  plane.bank += clamp(bankTarget - plane.bank, -PLANE.bankRate * dt, PLANE.bankRate * dt);
  if (!ctl.pitch) plane.pitch += clamp(0 - plane.pitch, -PLANE.pitchRate * 0.6 * dt, PLANE.pitchRate * 0.6 * dt);
  if (!ctl.bank) plane.bank += clamp(0 - plane.bank, -PLANE.bankRate * 0.8 * dt, PLANE.bankRate * 0.8 * dt);

  // Kecepatan: throttle mendorong ke kecepatan target; mendaki mengurasnya.
  const targetSpeed = 30 + plane.throttle * (WORLD.maxKnots - 30);
  const climbDrag = Math.max(0, plane.pitch) * 1.4;
  const speedTarget = Math.max(WORLD.minKnots, targetSpeed - climbDrag - (plane.onGround ? 0 : 0));
  plane.speedKnots += clamp(speedTarget - plane.speedKnots, -26 * dt, 34 * dt);

  // Stall: terlalu pelan di udara membuat hidung jatuh sendiri.
  const stalled = !plane.onGround && plane.speedKnots < WORLD.stallKnots;
  if (stalled) {
    plane.pitch = Math.max(plane.pitch - 26 * dt, PLANE.maxPitchDown);
    plane.verticalSpeed = Math.min(plane.verticalSpeed, -6);
  }

  // Belok: bank memutar heading; makin cepat, makin besar laju beloknya.
  const turnRate = plane.bank * 0.32 * clamp(plane.speedKnots / 100, 0.3, 1.6);
  plane.heading = (((plane.heading + turnRate * dt) % 360) + 360) % 360;

  // Angin misi badai: dorongan samping + hembusan berkala.
  const wind = mission ? mission.wind : 0;
  plane.windGust = wind * Math.sin(time * 0.7) * 0.6 + wind * Math.sin(time * 1.9) * 0.4;
  const windPush = (wind + plane.windGust) * dt * 0.9;

  // Gerak maju: kecepatan diubah ke m/detik, diproyeksikan ke heading/pitch.
  const speedMs = plane.speedKnots * KNOT_TO_MS;
  const hRad = rad(plane.heading);
  const pRad = rad(plane.pitch);
  const forward = Math.cos(pRad) * speedMs * dt;
  plane.x += Math.sin(hRad) * forward + windPush * Math.cos(hRad);
  plane.z -= Math.cos(hRad) * forward + windPush * Math.sin(hRad);
  plane.verticalSpeed = Math.sin(pRad) * speedMs;
  plane.y += plane.verticalSpeed * dt;
  if (plane.y < 0) plane.y = 0;

  // Bahan bakar berkurang mengikuti throttle; habis = darurat.
  plane.fuel -= (0.12 + plane.throttle * 0.5) * dt;
  if (plane.fuel <= 0) {
    plane.fuel = 0;
    return { event: 'fuel', reason: CRASH_FUEL };
  }

  // Tanah dan air di bawah pesawat.
  const ground = world.heightAt(plane.x, plane.z);
  const clearance = plane.y - ground;
  // Landasan di bawah pesawat: salah satu dari semua landasan (lepas landas
  // selalu dari Karang, mendarat di landasan tujuan misi).
  const runway =
    RUNWAYS.find(
      (r) =>
        Math.abs(plane.x - r.x) < r.halfLength && Math.abs(plane.z - r.z) < r.halfWidth + 6,
    ) || null;
  const overRunway = runway !== null;
  // Hanya pesawat yang sebelumnya mengudara yang bisa "mendarat" — pesawat
  // yang baru spawn di landasan sedang menggelinding, bukan mendarat.
  const wasAirborne = !plane.onGround;

  if (clearance <= PLANE.groundClearance) {
    if (overRunway) {
      // Masih mendaki setelah lepas landas: biarkan naik, jangan hitung mendarat.
      if (wasAirborne && plane.verticalSpeed >= 1) {
        plane.onGround = false;
        return { event: null };
      }
      if (wasAirborne) {
        // Mendarat: terlalu keras, terlalu cepat, atau terlalu miring = tabrakan.
        if (plane.verticalSpeed < -4 || plane.speedKnots >= 120 || Math.abs(plane.bank) > 20) {
          plane.damage = 100;
          return { event: 'crash', reason: CRASH_GROUND };
        }
        // Mendarat mulus di landasan: roda menyentuh, pesawat berhenti pelan.
        plane.onGround = true;
        plane.y = ground + 1;
        plane.pitch = 0;
        plane.bank = 0;
        plane.speedKnots = Math.max(0, plane.speedKnots - 90 * dt);
        const soft = Math.abs(plane.verticalSpeed) < 2;
        return { event: 'landed', soft, runway };
      }
      // Menggelinding di landasan: lepas landas bila hidung naik + cukup cepat.
      if (plane.verticalSpeed > 1.5 && plane.speedKnots > 70) {
        plane.onGround = false;
        return { event: null };
      }
      plane.y = ground + 1;
      return { event: null };
    }
    // Di luar landasan: menyentuh tanah/air = tabrakan.
    if (wasAirborne) {
      plane.damage = 100;
      return { event: 'crash', reason: ground <= 0.5 ? CRASH_WATER : CRASH_GROUND };
    }
    plane.y = ground + 1;
    return { event: null };
  }
  plane.onGround = false;
  return { event: null };
}

// Jarak pesawat ke pusat cincin; lolos bila cukup dekat saat melewatinya.
export function checkRing(plane, ring) {
  if (ring.passed) return false;
  const dx = plane.x - ring.x;
  const dy = plane.y - ring.y;
  const dz = plane.z - ring.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < ring.radius + 6) {
    ring.passed = true;
    return true;
  }
  return false;
}

// Nilai pendaratan: dasar + bonus bila lembut dan sejajar landasan.
export function landingScore(soft, plane) {
  let score = SCORE.landing;
  if (soft) score += SCORE.softLandingBonus;
  if (Math.abs(plane.bank) < 5) score += 50;
  return score;
}

export function altitudeFeet(plane) {
  return Math.max(0, Math.round(plane.y * M_TO_FT));
}
