// Sky Courier: Pulau Karang — program penyerahan (Node 22, pustaka standar saja).
// Tugasnya satu: menyalin game/ dan screenshots/ dari samping berkas ini ke
// /output, lalu menulis /output/dossier.json, ringkasan yang dibaca juri,
// memakai pustaka make.fun yang divendor di vendor/makefun-game.ts.
// Di luar grader, MAKEFUN_OUTPUT_DIR menggantikan /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyGameToOutput() {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
  const shotsDir = join(repoRoot, 'screenshots');
  if (existsSync(shotsDir)) {
    cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
  }
}

function writeDossier() {
  // Batas yang sama dengan yang dipakai penilai tertutup: text_max_bytes
  // membentuk isi dossier; sisanya menolak entri yang akan ditolak penilai
  // (lebih dari 4 tangkapan layar atau satu di atas 256 KiB; lebih dari
  // 993 berkas game/ atau 48 MiB, atau satu path di bawah game/ lebih
  // dari 1000 byte).
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

copyGameToOutput();
writeDossier();
