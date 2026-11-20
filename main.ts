// Hand-in program for KOTA ARUNA. It checks the source tree and the capture
// manifest, publishes a clean copy to MAKEFUN_OUTPUT_DIR, and asks the kit
// library for the canonical dossier. Only paths derived from this file are
// used; no clock, random number or network request can change the bytes.

import {
  cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync,
  statSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const ROOT = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = join(ROOT, 'game');
const SHOT_DIR = join(ROOT, 'screenshots');
const MANIFEST = join(ROOT, 'shots.json');

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

type Capture = { file?: unknown; label?: unknown };

function requireOrFail(condition: boolean, reason: string): void {
  if (!condition) throw new Error(`KOTA ARUNA hand-in refused: ${reason}`);
}

function isFolder(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

function liesUnder(path: string, folder: string): boolean {
  return path === folder || path.startsWith(folder + sep);
}

function safeName(name: string): boolean {
  return name.length > 0 && name.length <= 128
    && !name.startsWith('.') && !name.startsWith('-')
    && !name.includes('/') && !name.includes('\\')
    && /\.(?:png|jpe?g)$/i.test(name);
}

const requested = process.env.MAKEFUN_OUTPUT_DIR;
requireOrFail(typeof requested === 'string' && requested.trim().length > 0, 'MAKEFUN_OUTPUT_DIR must be set');
const target = resolve(requested as string);
requireOrFail(target !== ROOT, 'the output folder must not be the repository root');
requireOrFail(!liesUnder(target, GAME_DIR), 'the output folder must not be inside game/');
requireOrFail(!liesUnder(target, SHOT_DIR), 'the output folder must not be inside screenshots/');

requireOrFail(isFolder(GAME_DIR), 'game/ is missing');
requireOrFail(isFolder(SHOT_DIR), 'screenshots/ is missing');
requireOrFail(isFile(MANIFEST), 'shots.json is missing');

const requiredGameFiles = [
  'index.html',
  'src/config.js',
  'src/random.js',
  'src/city.js',
  'src/main.js',
  'vendor/three.module.min.js',
];
for (const relative of requiredGameFiles) {
  requireOrFail(isFile(join(GAME_DIR, relative)), `game/${relative} is missing`);
}

const page = readFileSync(join(GAME_DIR, 'index.html'), 'utf8');
requireOrFail(page.includes('type="importmap"'), 'index.html needs an import map');
requireOrFail(page.includes('./vendor/three.module.min.js'), 'the import map must use the vendored three.js');
requireOrFail(page.includes('./src/main.js'), 'index.html must load src/main.js');

let manifest: { shots?: unknown };
try {
  manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { shots?: unknown };
} catch {
  throw new Error('KOTA ARUNA hand-in refused: shots.json is not valid JSON');
}
requireOrFail(Boolean(manifest) && Array.isArray(manifest.shots), 'shots.json needs a shots array');
const captures = manifest.shots as Capture[];
requireOrFail(captures.length >= 3 && captures.length <= CAPS.screenshots.max,
  'shots.json must describe three or four captures');

for (const capture of captures) {
  requireOrFail(typeof capture.file === 'string' && typeof capture.label === 'string'
    && capture.label.trim().length > 0, 'each capture needs a file name and a caption');
  const name = capture.file as string;
  requireOrFail(safeName(name), `unacceptable capture file name: ${name}`);
  const picture = join(SHOT_DIR, name);
  requireOrFail(isFile(picture), `screenshots/${name} is missing`);
  requireOrFail(statSync(picture).size <= CAPS.screenshots.max_bytes,
    `screenshots/${name} exceeds the 256 KiB image cap`);
}

const onDisk = readdirSync(SHOT_DIR).filter((name) => !name.startsWith('.'));
requireOrFail(onDisk.length >= 3 && onDisk.length <= CAPS.screenshots.max,
  'screenshots/ must hold three or four images');
for (const capture of captures) requireOrFail(onDisk.includes(capture.file as string), `shots.json omitted ${capture.file}`);

mkdirSync(target, { recursive: true });
for (const [source, folder] of [[GAME_DIR, 'game'], [SHOT_DIR, 'screenshots']] as const) {
  const copyTo = join(target, folder);
  rmSync(copyTo, { recursive: true, force: true });
  cpSync(source, copyTo, { recursive: true });
}

const dossier = buildDossier(target, CAPS);
writeFileSync(join(target, 'dossier.json'), dossier);
process.stdout.write(`KOTA ARUNA published to ${target}: ${dossier.byteLength} dossier bytes, ${captures.length} captures\n`);
