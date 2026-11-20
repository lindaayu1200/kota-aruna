import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const sourceRoot = dirname(fileURLToPath(import.meta.url));
const handIn = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(handIn, { recursive: true });

for (const folder of ['game', 'screenshots']) {
  const target = join(handIn, folder);
  rmSync(target, { recursive: true, force: true });
  cpSync(join(sourceRoot, folder), target, { recursive: true });
}

const manifestTarget = join(handIn, 'shots.json');
rmSync(manifestTarget, { force: true });
cpSync(join(sourceRoot, 'shots.json'), manifestTarget);

const reportTarget = join(handIn, 'dossier.json');
rmSync(reportTarget, { force: true });
const report = buildDossier(handIn, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(reportTarget, report);
