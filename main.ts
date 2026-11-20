// KOTA ARUNA — the hand-in program.
//
// Run it with MAKEFUN_OUTPUT_DIR pointed at the folder to publish. It verifies
// the entry, copies the playable files plus the captures, then asks the kit's
// dossier builder for the exact bytes the grader will read. Every path comes
// from fileURLToPath and nothing here consults a clock, a dice or the network,
// so repeated runs lay down the same bytes.

import {
  cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync,
  statSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const ROOT = dirname(fileURLToPath(import.meta.url));
const GAME = join(ROOT, 'game');
const SHOTS = join(ROOT, 'screenshots');
const LIST = join(ROOT, 'shots.json');

// The keys are the dossier library's own; the numbers are this bounty's caps.
const LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// A failed check stops the hand-in before anything is published.
function insist(ok: boolean, why: string): void {
  if (!ok) throw new Error(`KOTA ARUNA hand-in refused: ${why}`);
}

function directory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

function regularFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

const given = process.env.MAKEFUN_OUTPUT_DIR;
insist(typeof given === 'string' && given.trim() !== '', 'MAKEFUN_OUTPUT_DIR is missing');
const destination = resolve(given as string);
insist(destination !== ROOT, 'the destination must not be the repository root');
insist(!destination.startsWith(GAME), 'the destination must not live inside game/');
insist(!destination.startsWith(SHOTS), 'the destination must not live inside screenshots/');

insist(directory(GAME), 'game/ is missing');
insist(directory(SHOTS), 'screenshots/ is missing');
insist(regularFile(LIST), 'shots.json is missing');

// These are the modules the import map and the page script depend upon.
for (const relative of [
  'index.html',
  'src/config.js',
  'src/random.js',
  'src/city.js',
  'src/main.js',
  'vendor/three.module.min.js',
]) {
  insist(regularFile(join(GAME, relative)), `game/${relative} is missing`);
}

const markup = readFileSync(join(GAME, 'index.html'), 'utf8');
insist(markup.includes('type="importmap"'), 'index.html must declare an import map');
insist(markup.includes('./vendor/three.module.min.js'), 'the import map must point at the local three.js');
insist(markup.includes('./src/main.js'), 'index.html must load the game module');

type Entry = { file?: unknown; label?: unknown };

function soundFileName(name: string): boolean {
  return name.length > 0 && name.length <= 128
    && !name.startsWith('.') && !name.startsWith('-')
    && !name.includes('/') && !name.includes('\\');
}

let manifest: { shots?: unknown };
try {
  manifest = JSON.parse(readFileSync(LIST, 'utf8')) as { shots?: unknown };
} catch {
  throw new Error('KOTA ARUNA hand-in refused: shots.json is not JSON');
}
insist(!!manifest && typeof manifest === 'object' && Array.isArray(manifest.shots),
  'shots.json needs a shots array');
const entries = manifest.shots as Entry[];
insist(entries.length >= 3 && entries.length <= LIMITS.screenshots.max,
  'shots.json should list three or four captures');

for (const entry of entries) {
  insist(typeof entry.file === 'string' && typeof entry.label === 'string' && entry.label.trim() !== '',
    'every capture needs a file name and a caption');
  const name = entry.file as string;
  insist(soundFileName(name), `unacceptable capture name: ${name}`);
  insist(/\.(png|jpe?g)$/i.test(name), `screenshots/${name} must be a PNG or JPEG`);
  const picture = join(SHOTS, name);
  insist(regularFile(picture), `screenshots/${name} is missing`);
  insist(statSync(picture).size <= LIMITS.screenshots.max_bytes,
    `screenshots/${name} is larger than 256 KiB`);
}

const present = readdirSync(SHOTS).filter((name) => !name.startsWith('.'));
insist(present.length >= 3 && present.length <= LIMITS.screenshots.max,
  'screenshots/ must contain three or four images');
for (const entry of entries) insist(present.includes(entry.file as string), `shots.json forgot ${entry.file}`);

mkdirSync(destination, { recursive: true });
for (const [source, folder] of [[GAME, 'game'], [SHOTS, 'screenshots']] as const) {
  const target = join(destination, folder);
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
}

const dossier = buildDossier(destination, LIMITS);
writeFileSync(join(destination, 'dossier.json'), dossier);
process.stdout.write(`KOTA ARUNA published to ${destination}: ${dossier.byteLength} dossier bytes, ${entries.length} captures\n`);
