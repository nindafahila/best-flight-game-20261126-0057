// Sky Courier: Pulau Karang — loop utama dan mesin keadaan layar.
// Layar: title -> play -> paused -> mission-done -> victory / game-over.
// ?seed=N menetapkan seed dunia. ?shot=<nama>&seed=N membekukan satu adegan
// demo untuk tangkapan layar, lalu menandai window.__shotReady.
import { MISSIONS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { createPlaneState, stepPlane, checkRing, landingScore, altitudeFeet } from './physics.js';
import { createMissionState, allRingsPassed, eventMessage, timeBonus } from './missions.js';
import { createRenderer } from './render.js';
import { drawHUD, buildMinimap } from './hud.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_CAMERA, ACTION_MUTE, ACTION_RESTART, ACTION_HELP, createInput } from './input.js';
import { createSound } from './sound.js';
import { buildShotState } from './shots.js';
import { drawTitleScreen, drawBriefing, drawMissionResult } from './polish.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const sound = createSound();
const minimap = buildMinimap(world);

const SCREEN_TITLE = 'title';
const SCREEN_PLAY = 'play';
const SCREEN_PAUSED = 'paused';
const SCREEN_OVER = 'over';
const SCREEN_WIN = 'win';
const SCREEN_MISSION = 'mission';
const SCREEN_BRIEF = 'brief';

let screen = SCREEN_TITLE;
let plane = createPlaneState();
let mission = createMissionState(0);
mission.rings = world.buildRings(0);
let score = 0;
let best = 0;
let time = 0;
let message = '';
let messageTime = -10;
let cameraMode = 'chase';
let helpOpen = false;
let muted = false;
let crashReason = '';
let landedSoft = false;
let lastBonus = 0;
let lastLanding = 0;
let lowFuelWarned = false;
let stallWarned = false;

try {
  best = Number.parseInt(window.localStorage.getItem('skycourier-best') ?? '0', 10) || 0;
} catch {
  best = 0;
}

function saveBest() {
  try {
    window.localStorage.setItem('skycourier-best', String(best));
  } catch {
    // Penyimpanan mati: skor terbaik hanya bertahan kunjungan ini.
  }
}

function announce(text) {
  status.textContent = text;
}

function showMessage(text) {
  message = text;
  messageTime = time;
  announce(text);
}

function startMission(index) {
  plane = createPlaneState();
  mission = createMissionState(index);
  mission.rings = world.buildRings(index);
  mission.def.fuel = MISSIONS[index].fuel;
  plane.fuel = MISSIONS[index].fuel;
  score = index === 0 ? 0 : score;
  message = '';
  lowFuelWarned = false;
  stallWarned = false;
  lastBonus = 0;
  lastLanding = 0;
  screen = SCREEN_BRIEF;
  announce(`${MISSIONS[index].name}. ${MISSIONS[index].brief}`);
}

function startGame() {
  score = 0;
  startMission(0);
}

function endGame(reason) {
  crashReason = reason;
  screen = SCREEN_OVER;
  sound.crash();
  sound.stopAlarm();
  if (score > best) {
    best = score;
    saveBest();
  }
  announce(`Game over. Skor ${score}. Terbaik ${best}.`);
}

function winGame() {
  screen = SCREEN_WIN;
  sound.land();
  sound.stopAlarm();
  if (score > best) {
    best = score;
    saveBest();
  }
  announce(`Semua misi selesai! Skor ${score}.`);
}

function step(dt) {
  if (screen !== SCREEN_PLAY) return;
  time += dt;
  mission.time += dt;
  const ctl = input.control();
  const result = stepPlane(plane, ctl, mission.def, world, time, dt);
  sound.setEngine(plane.throttle, plane.speedKnots, !plane.onGround || plane.speedKnots > 5);

  // Stall: peringatkan sekali sampai pulih.
  if (!plane.onGround && plane.speedKnots < 55) {
    if (!stallWarned) {
      showMessage(eventMessage('stall'));
      sound.alarm();
      stallWarned = true;
    }
  } else if (stallWarned && plane.speedKnots > 70) {
    stallWarned = false;
    sound.stopAlarm();
  }

  // Bahan bakar menipis: peringatkan sekali.
  if (plane.fuel < 20 && !lowFuelWarned) {
    showMessage(eventMessage('low-fuel'));
    lowFuelWarned = true;
  }

  // Cincin: lewati satu per satu, masing-masing +100.
  for (const ring of mission.rings) {
    if (checkRing(plane, ring)) {
      mission.ringsPassed += 1;
      score += 100;
      showMessage(eventMessage('ring', mission.ringsPassed));
      sound.ring();
    }
  }

  if (result.event === 'fuel') {
    endGame('fuel');
    return;
  }
  if (result.event === 'crash') {
    endGame(result.reason === 'water' ? 'crash-water' : 'crash-ground');
    return;
  }
  if (result.event === 'landed') {
    landedSoft = result.soft;
    const gained = landingScore(result.soft, plane);
    lastLanding = gained;
    score += gained;
    mission.landed = true;
    showMessage(eventMessage('landed', result.soft));
    sound.land();
    if (allRingsPassed(mission)) {
      finishMission();
    }
    return;
  }

  // Misi tanpa pendaratan selesai saat cincin terakhir dilewati.
  if (!mission.def.landAt && allRingsPassed(mission)) finishMission();
}

function finishMission() {
  const bonus = timeBonus(mission);
  lastBonus = bonus;
  score += bonus;
  mission.done = true;
  showMessage(`${eventMessage('mission-done')} Bonus waktu +${bonus}`);
  sound.stopAlarm();
  if (mission.index + 1 < MISSIONS.length) {
    screen = SCREEN_MISSION;
  } else {
    winGame();
  }
}

function handleActions() {
  const actions = input.takeActions();
  if (actions & ACTION_MUTE) {
    muted = sound.toggleMute();
    announce(muted ? 'Suara mati.' : 'Suara hidup.');
  }
  if (actions & ACTION_HELP) helpOpen = !helpOpen;
  if (actions & ACTION_CAMERA) {
    cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
    announce(`Kamera ${cameraMode === 'chase' ? 'kejar' : 'kokpit'}.`);
  }
  if (actions & ACTION_RESTART && (screen === SCREEN_PLAY || screen === SCREEN_OVER || screen === SCREEN_PAUSED)) {
    startMission(mission.index);
    return;
  }
  if (actions & ACTION_CONFIRM) {
    sound.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
    else if (screen === SCREEN_BRIEF) {
      screen = SCREEN_PLAY;
      announce('Misi dimulai.');
    } else if (screen === SCREEN_MISSION) startMission(mission.index + 1);
    else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
  }
  if (actions & ACTION_PAUSE) {
    if (screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    } else if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Lanjut.');
    }
  }
}

function drawOverlay(ctx, W, H, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,20,34,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || '#ffd23e';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(title, W / 2, H * 0.36);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '19px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.36 + 44 + i * 30));
}

function draw() {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const lookYaw = input.updateLook(STEP);
  // Layar judul: kamera dari ketinggian, menatap pulau + landasan + laut.
  const renderPlane =
    screen === SCREEN_TITLE
      ? { ...plane, x: -200, y: 150, z: -700, heading: 40, pitch: -6, bank: 0 }
      : plane;
  renderer.draw({
    plane: renderPlane,
    mission,
    world,
    time,
    storm: mission.def.storm,
    cameraMode,
    lookYaw,
  });
  if (screen === SCREEN_TITLE) {
    drawTitleScreen(ctx, W, H, best);
    return;
  }
  if (screen === SCREEN_BRIEF) {
    drawBriefing(ctx, W, H, mission.def, mission.index, MISSIONS.length, time);
    return;
  }
  drawHUD(ctx, {
    plane,
    mission,
    score,
    time,
    W,
    H,
    message,
    messageTime,
    cameraMode,
    storm: mission.def.storm,
    minimap,
  });
  if (helpOpen && screen === SCREEN_PLAY) {
    drawOverlay(ctx, W, H, 'BANTUAN', [
      'W / S — throttle    Panah — pitch & bank    Spasi — rem udara',
      'Jaga kecepatan di atas 55 knot agar tidak stall.',
      'Ikuti panah kuning ke cincin berikutnya. Mendarat pelan di landasan:',
      'kecepatan vertikal kecil, sejajar landasan, bank hampir nol.',
      'Tekan H lagi untuk menutup.',
    ]);
  } else if (screen === SCREEN_PAUSED) {
    drawOverlay(ctx, W, H, 'JEDA', ['Tekan P atau Enter untuk lanjut.', `Misi: ${mission.def.name}   Skor: ${score}`]);
  } else if (screen === SCREEN_MISSION) {
    drawMissionResult(ctx, W, H, {
      def: mission.def,
      ringsPassed: mission.ringsPassed,
      ringCount: mission.def.ringCount,
      landed: mission.landed,
      landedSoft,
      landingPoints: lastLanding,
      bonus: lastBonus,
      score,
      best,
      isLast: mission.index + 1 >= MISSIONS.length,
    });
  } else if (screen === SCREEN_OVER) {
    const reason = crashReason === 'crash-water' ? 'Pesawat jatuh ke laut.'
      : crashReason === 'fuel' ? 'Bahan bakar habis di tengah jalan.'
      : 'Pesawat menabrak tanah.';
    drawOverlay(ctx, W, H, 'GAME OVER', [reason, `Skor: ${score}   Terbaik: ${best}`, 'Tekan Enter untuk terbang lagi, R untuk ulang misi.'], '#ff5a4e');
  } else if (screen === SCREEN_WIN) {
    drawOverlay(ctx, W, H, 'SEMUA MISI SELESAI!', [
      'Kargo terkirim ke tiga pulau. Pulau Karang berterima kasih, Kapten!',
      `Skor akhir: ${score}   Terbaik: ${best}`,
      'Tekan Enter untuk terbang lagi.',
    ]);
  }
}

// Mode tangkapan layar: bekukan satu adegan demo, gambar dua kali,
// lalu tandai siap agar headless Chrome bisa memotret.
function runShot(name) {
  const state = buildShotState(name, world, seed);
  if (!state) {
    document.body.textContent = `Shot tidak dikenal: ${name}`;
    return;
  }
  plane = state.plane;
  mission = state.mission;
  score = state.score;
  time = state.time;
  message = '';
  messageTime = -10;
  screen = SCREEN_PLAY;
  let painted = 0;
  function paint() {
    draw();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

if (shotName) {
  runShot(shotName);
} else {
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min((now - last) / 1000, 0.25);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        step(STEP);
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) break;
      }
    } else {
      accumulator = 0;
      // Latar judul & briefing tetap hidup: awan bergerak, pesawat diam di landasan.
      if (screen === SCREEN_TITLE || screen === SCREEN_BRIEF) time += elapsed;
    }
    draw();
  }
  requestAnimationFrame(frame);
}
