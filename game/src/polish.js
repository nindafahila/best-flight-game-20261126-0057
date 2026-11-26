// Layar polish: judul yang menarik, briefing sebelum tiap misi, dan layar
// hasil misi yang jelas. Semua digambar dari kode di atas canvas 2D.
const TAU = Math.PI * 2;

const TIPS = {
  1: 'Ikuti panah kuning — cincin berikutnya selalu ditandai di layar.',
  2: 'Mendarat pelan: kecepatan vertikal kecil, sejajar landasan, bank hampir nol.',
  3: 'Hemat bahan bakar: throttle 60–70% cukup untuk jelajah, penuh hanya saat mendaki.',
};

function roundPanel(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function wrapText(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function drawTitleScreen(ctx, W, H, best) {
  // Vignette gelap di atas-bawah supaya teks terbaca di atas dunia.
  const topShade = ctx.createLinearGradient(0, 0, 0, H * 0.42);
  topShade.addColorStop(0, 'rgba(6,16,30,0.72)');
  topShade.addColorStop(1, 'rgba(6,16,30,0)');
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, W, H * 0.42);
  const botShade = ctx.createLinearGradient(0, H, 0, H * 0.58);
  botShade.addColorStop(0, 'rgba(6,16,30,0.72)');
  botShade.addColorStop(1, 'rgba(6,16,30,0)');
  ctx.fillStyle = botShade;
  ctx.fillRect(0, H * 0.58, W, H * 0.42);

  ctx.textAlign = 'center';
  // Judul besar dengan bayangan berlapis + gradien emas.
  const titleGrad = ctx.createLinearGradient(0, H * 0.16, 0, H * 0.30);
  titleGrad.addColorStop(0, '#ffe98a');
  titleGrad.addColorStop(0.5, '#ffd23e');
  titleGrad.addColorStop(1, '#ff9d00');
  ctx.font = 'bold 68px sans-serif';
  ctx.fillStyle = 'rgba(10,20,35,0.85)';
  ctx.fillText('SKY COURIER', W / 2 + 3, H * 0.27 + 4);
  ctx.fillStyle = titleGrad;
  ctx.fillText('SKY COURIER', W / 2, H * 0.27);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  try {
    ctx.letterSpacing = '10px';
  } catch {
    // letterSpacing tidak didukung: lanjut tanpa spasi huruf.
  }
  ctx.fillText('PULAU KARANG', W / 2, H * 0.27 + 46);
  try {
    ctx.letterSpacing = '0px';
  } catch {
    // Abaikan bila tidak didukung.
  }
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '19px sans-serif';
  ctx.fillText('Terbang antar pulau, lewati cincin emas, antar kargo, dan mendarat sebelum badai datang.', W / 2, H * 0.27 + 88);

  // Tiga chip fitur.
  const chips = ['3 MISI BERURUTAN', 'FISIKA TERBANG', 'PENDARATAN DINILAI'];
  const chipW = 210;
  const gap = 18;
  const totalW = chips.length * chipW + (chips.length - 1) * gap;
  chips.forEach((c, i) => {
    const x = W / 2 - totalW / 2 + i * (chipW + gap);
    const y = H * 0.42;
    ctx.fillStyle = 'rgba(10,25,45,0.66)';
    roundPanel(ctx, x, y, chipW, 40, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,62,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffe98a';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(c, x + chipW / 2, y + 26);
  });

  // Tombol mulai dengan cahaya.
  ctx.save();
  ctx.shadowColor = 'rgba(255,157,0,0.8)';
  ctx.shadowBlur = 26;
  const btnGrad = ctx.createLinearGradient(0, H * 0.54, 0, H * 0.54 + 60);
  btnGrad.addColorStop(0, '#ffb52e');
  btnGrad.addColorStop(1, '#ff8a00');
  ctx.fillStyle = btnGrad;
  roundPanel(ctx, W / 2 - 175, H * 0.54, 350, 60, 14);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#1a1206';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('MULAI TERBANG  (Enter)', W / 2, H * 0.54 + 38);

  // Kontrol dua kolom + skor terbaik.
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '16px sans-serif';
  const left = [
    'W / S — throttle naik / turun',
    'Panah Atas-Bawah — pitch (naik / turun)',
    'Panah Kiri-Kanan — belok (bank)',
  ];
  const right = [
    'Spasi — rem udara      C — kamera kejar / kokpit',
    'P — jeda      R — ulang misi      M — suara',
    'H — bantuan      Klik — mulai',
  ];
  left.forEach((line, i) => {
    ctx.textAlign = 'right';
    ctx.fillText(line, W / 2 - 24, H * 0.70 + i * 27);
  });
  right.forEach((line, i) => {
    ctx.textAlign = 'left';
    ctx.fillText(line, W / 2 + 24, H * 0.70 + i * 27);
  });
  ctx.textAlign = 'center';
  if (best > 0) {
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`★ Skor terbaik: ${best}`, W / 2, H * 0.70 + 3 * 27 + 16);
  }
  ctx.fillStyle = 'rgba(234,246,255,0.75)';
  ctx.font = '14px sans-serif';
  ctx.fillText('Jaga kecepatan di atas 55 knot agar tidak stall. Ikuti panah kuning ke cincin berikutnya.', W / 2, H - 24);
}

export function drawBriefing(ctx, W, H, def, index, total, time) {
  ctx.fillStyle = 'rgba(8,20,34,0.62)';
  ctx.fillRect(0, 0, W, H);
  const pw = Math.min(680, W * 0.72);
  const ph = 330;
  const px = (W - pw) / 2;
  const py = H * 0.5 - ph / 2 - 10;
  ctx.fillStyle = 'rgba(10,25,45,0.88)';
  roundPanel(ctx, px, py, pw, ph, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,62,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(`MISI ${index + 1} DARI ${total}`, W / 2, py + 40);
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(def.name, W / 2, py + 84);

  ctx.fillStyle = '#eaf6ff';
  ctx.font = '18px sans-serif';
  const lines = wrapText(ctx, def.brief, pw - 90);
  lines.forEach((line, i) => ctx.fillText(line, W / 2, py + 122 + i * 26));

  const baseY = py + 122 + lines.length * 26 + 14;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px sans-serif';
  const target = def.landAt ? `Lewati ${def.ringCount} cincin, lalu mendarat di landasan tujuan.` : `Lewati ${def.ringCount} cincin emas.`;
  ctx.fillText(`Tujuan: ${target}`, W / 2, baseY);
  ctx.fillStyle = '#9fd8ff';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Tips: ${TIPS[def.id] || 'Terbang tenang, hemat bahan bakar.'}`, W / 2, baseY + 28);
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Bahan bakar: ${def.fuel} unit${def.storm ? '  •  Angin kencang, waspada hembusan!' : ''}`, W / 2, baseY + 56);

  const pulse = 0.65 + 0.35 * Math.sin(time * 4);
  ctx.fillStyle = `rgba(255,210,62,${pulse.toFixed(2)})`;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('TEKAN ENTER UNTUK MULAI', W / 2, py + ph - 22);
}

export function drawMissionResult(ctx, W, H, data) {
  const { def, ringsPassed, ringCount, landed, landedSoft, landingPoints, bonus, score, best, isLast } = data;
  ctx.fillStyle = 'rgba(8,20,34,0.6)';
  ctx.fillRect(0, 0, W, H);
  const pw = Math.min(620, W * 0.66);
  const ph = 360;
  const px = (W - pw) / 2;
  const py = H * 0.5 - ph / 2 - 10;
  ctx.fillStyle = 'rgba(10,25,45,0.9)';
  roundPanel(ctx, px, py, pw, ph, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,62,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('MISI SELESAI!', W / 2, py + 62);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText(def.name, W / 2, py + 98);

  ctx.font = '19px sans-serif';
  const rows = [
    [`Cincin dilewati: ${ringsPassed} / ${ringCount}`, `+${ringsPassed * 100}`],
    landed
      ? [`Pendaratan: ${landedSoft ? 'MULUS' : 'mendarat'}`, `+${landingPoints}`]
      : ['Pendaratan: — (misi tanpa mendarat)', '+0'],
    ['Bonus waktu', `+${bonus}`],
  ];
  rows.forEach(([label, value], i) => {
    const y = py + 140 + i * 34;
    ctx.fillStyle = '#eaf6ff';
    ctx.textAlign = 'left';
    ctx.fillText(label, px + 56, y);
    ctx.fillStyle = '#ffd23e';
    ctx.textAlign = 'right';
    ctx.fillText(value, px + pw - 56, y);
  });

  ctx.strokeStyle = 'rgba(234,246,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 56, py + 140 + rows.length * 34 + 2);
  ctx.lineTo(px + pw - 56, py + 140 + rows.length * 34 + 2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`SKOR: ${score}    ★ TERBAIK: ${best}`, W / 2, py + 140 + rows.length * 34 + 40);
  ctx.fillStyle = '#9fd8ff';
  ctx.font = '17px sans-serif';
  ctx.fillText(
    isLast ? 'Semua misi selesai! Tekan Enter untuk melihat hasil akhir.' : 'Tekan Enter untuk misi berikutnya.',
    W / 2,
    py + ph - 26,
  );
}
