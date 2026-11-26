// Input: keyboard + mouse. Tombol dibaca tiap frame sebagai keadaan
// (pitch/bank/throttle), aksi sekali tekan (pause, kamera, mute, restart)
// diambil lewat antrean agar tidak terpicu dua kali.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_CAMERA = 4;
export const ACTION_MUTE = 8;
export const ACTION_RESTART = 16;
export const ACTION_HELP = 32;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let lookYaw = 0;
  let dragging = false;
  let lastX = 0;

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.key.toLowerCase());
    if (e.key === 'Enter' || e.key === ' ') actions |= ACTION_CONFIRM;
    if (e.key.toLowerCase() === 'p' || e.key === 'Escape') actions |= ACTION_PAUSE;
    if (e.key.toLowerCase() === 'c') actions |= ACTION_CAMERA;
    if (e.key.toLowerCase() === 'm') actions |= ACTION_MUTE;
    if (e.key.toLowerCase() === 'r') actions |= ACTION_RESTART;
    if (e.key.toLowerCase() === 'h') actions |= ACTION_HELP;
  }
  function onKeyUp(e) {
    keys.delete(e.key.toLowerCase());
  }
  function onMouseDown(e) {
    dragging = true;
    lastX = e.clientX;
  }
  function onMouseMove(e) {
    if (!dragging) return;
    lookYaw = Math.max(-1, Math.min(1, lookYaw + (e.clientX - lastX) * 0.004));
    lastX = e.clientX;
  }
  function onMouseUp() {
    dragging = false;
  }
  function onClick(e) {
    // Klik di mana saja di layar judul = mulai (tombol juga digambar di sana).
    actions |= ACTION_CONFIRM;
    void e;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('click', onClick);

  // Keadaan kontrol kontinu untuk fisika: -1, 0, atau 1 per sumbu.
  function control() {
    const pitch = (keys.has('arrowup') ? 1 : 0) - (keys.has('arrowdown') ? 1 : 0);
    const bank = (keys.has('arrowright') ? 1 : 0) - (keys.has('arrowleft') ? 1 : 0);
    return {
      pitch,
      bank,
      throttleUp: keys.has('w') || keys.has('shift'),
      throttleDown: keys.has('s') || keys.has('control'),
      brake: keys.has(' '),
    };
  }

  function takeActions() {
    const a = actions;
    actions = 0;
    return a;
  }

  // Look kembali ke tengah pelan-pelan saat mouse tidak di-drag.
  function updateLook(dt) {
    if (!dragging) lookYaw += (0 - lookYaw) * Math.min(1, dt * 1.5);
    return lookYaw;
  }

  return { control, takeActions, updateLook };
}
