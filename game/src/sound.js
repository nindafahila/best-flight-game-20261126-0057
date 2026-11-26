// Suara: WebAudio murni dari kode, tanpa berkas audio. Dengung mesin
// mengikuti throttle, bunyi saat melewati cincin, alarm saat stall atau
// bahan bakar menipis, dan tepukan saat mendarat mulus.
export function createSound() {
  let ctx = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let muted = false;
  let alarmTimer = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'square';
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineOsc.connect(filter);
      engineOsc2.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      engineOsc2.start();
      return true;
    } catch {
      return false;
    }
  }

  // Dipanggil dari gestur pengguna pertama (klik/tombol) agar AudioContext jalan.
  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function setEngine(throttle, speedKnots, flying) {
    if (!ctx || muted || !flying) {
      if (engineGain) engineGain.gain.value = 0;
      return;
    }
    const base = 55 + throttle * 75 + speedKnots * 0.12;
    engineOsc.frequency.setTargetAtTime(base, ctx.currentTime, 0.08);
    engineOsc2.frequency.setTargetAtTime(base * 0.5 + 3, ctx.currentTime, 0.08);
    engineGain.gain.setTargetAtTime(0.02 + throttle * 0.05, ctx.currentTime, 0.1);
  }

  function blip(freq, dur, type, vol) {
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      // Audio gagal: permainan tetap jalan tanpa suara.
    }
  }

  function ring() {
    blip(880, 0.18, 'sine', 0.16);
    setTimeout(() => blip(1318, 0.3, 'sine', 0.14), 90);
  }

  function alarm() {
    if (!ctx || muted) return;
    if (alarmTimer) return;
    alarmTimer = setInterval(() => {
      if (muted) return;
      blip(620, 0.12, 'square', 0.05);
    }, 450);
  }

  function stopAlarm() {
    if (alarmTimer) {
      clearInterval(alarmTimer);
      alarmTimer = null;
    }
  }

  function land() {
    blip(523, 0.15, 'triangle', 0.15);
    setTimeout(() => blip(659, 0.15, 'triangle', 0.15), 120);
    setTimeout(() => blip(784, 0.3, 'triangle', 0.16), 240);
  }

  function crash() {
    blip(160, 0.5, 'sawtooth', 0.2);
    setTimeout(() => blip(90, 0.7, 'sawtooth', 0.18), 120);
  }

  function toggleMute() {
    muted = !muted;
    if (muted) stopAlarm();
    return muted;
  }

  return { unlock, setEngine, ring, alarm, stopAlarm, land, crash, toggleMute, isMuted: () => muted };
}
