// Misi dan skor: cincin yang harus dilewati, urutan misi, bonus waktu,
// dan pesan yang tampil ke pemain saat sesuatu terjadi.
import { MISSIONS, SCORE } from './config.js';

// Keadaan satu misi: cincin aktif, ring yang sudah dilewati, waktu mulai.
export function createMissionState(index) {
  const def = MISSIONS[index];
  return {
    index,
    def,
    rings: [],
    ringsPassed: 0,
    time: 0,
    timeLimit: def.id === 3 ? 420 : 600,
    landed: false,
    done: false,
  };
}

export function missionName(index) {
  return MISSIONS[index] ? MISSIONS[index].name : 'Misi selesai';
}

// Bonus waktu: makin cepat selesai, makin besar.
export function timeBonus(mission) {
  const left = Math.max(0, mission.timeLimit - mission.time);
  return Math.round(left * SCORE.timeBonusPerSecond);
}

// Ring berikutnya yang dituju (panah penunjuk di HUD mengarah ke sini).
export function nextRing(mission) {
  return mission.rings.find((r) => !r.passed) || null;
}

export function allRingsPassed(mission) {
  return mission.rings.length > 0 && mission.rings.every((r) => r.passed);
}

// Pesan singkat sesuai peristiwa, untuk banner di tengah layar.
export function eventMessage(kind, detail) {
  if (kind === 'ring') return `CINCIN ${detail} DILEWATI! +${SCORE.ring}`;
  if (kind === 'landed') return detail ? 'PENDARATAN MULUS! +400' : 'MENDARAT! +250';
  if (kind === 'crash-ground') return 'MENABRAK TANAH!';
  if (kind === 'crash-water') return 'JATUH KE LAUT!';
  if (kind === 'fuel') return 'BAHAN BAKAR HABIS!';
  if (kind === 'stall') return 'STALL! TAMBAH THROTTLE!';
  if (kind === 'mission-done') return 'MISI SELESAI!';
  if (kind === 'low-fuel') return 'BAHAN BAKAR MENIPIS!';
  return '';
}
