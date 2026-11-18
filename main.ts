// KOTA ARUNA — submission packer.
//
// The deliverable is a folder of plain static files: game/ is the browser game itself and
// screenshots/ holds its cover art. This script assembles those two sibling folders inside the
// output directory chosen by the grader, then asks the vendored make.fun helper to describe the
// result as dossier.json. It uses only Node's standard library and runs directly under Node 22:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Locally: `node serve.ts` serves game/ at http://localhost:8080 for a quick play-through.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

/** Directory holding this script (and, next to it, the two payload folders). */
const here = fileURLToPath(new URL('.', import.meta.url));
/** Where the finished submission is written. */
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// These numbers mirror the scorer's gates. Anything larger is rejected at judging time, so we
// refuse it here as well instead of producing a dossier nobody can read.
const limits = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

/**
 * Recursively place one of our source folders under the output root.
 * @param {string} name - folder name, relative to this script
 */
function stageFolder(name) {
  const source = join(here, name);
  if (!existsSync(source)) throw new Error(`Missing payload folder: ${name}`);
  cpSync(source, join(out, name), { recursive: true });
}

mkdirSync(out, { recursive: true });
stageFolder('game');
stageFolder('screenshots');

const dossier = buildDossier(out, limits);
writeFileSync(join(out, 'dossier.json'), dossier, 'utf8');
