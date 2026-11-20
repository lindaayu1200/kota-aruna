import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repositoryRoot = dirname(fileURLToPath(import.meta.url));
const handInDirectory = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(handInDirectory, { recursive: true });

for (const folder of ['game', 'screenshots']) {
  const destination = join(handInDirectory, folder);
  rmSync(destination, { recursive: true, force: true });
  cpSync(join(repositoryRoot, folder), destination, { recursive: true });
}

rmSync(join(handInDirectory, 'shots.json'), { force: true });
cpSync(join(repositoryRoot, 'shots.json'), join(handInDirectory, 'shots.json'));

const report = buildDossier(handInDirectory, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(handInDirectory, 'dossier.json'), report);
