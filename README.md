# KOTA ARUNA

KOTA ARUNA is a browser-based open-world crime game set on a warm, invented
Indonesian harbor coast. The current build is the core scaffold: a sunset city
with a harbor downtown, a beachfront district, a ring road, a channel crossed by
bridges, a pier and a lighthouse, seen through a slow orbit camera.

Everything is static and local. There is no build step and no network access at
runtime; three.js is vendored in `game/vendor/`.

## Run it

Serve the repository root with any static file server, then open
`game/index.html`. For example:

```sh
node serve.ts
```

Add `?seed=1234` to the page URL to choose a deterministic city layout.

## Hand in

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` into the output directory and writes
the dossier (`dossier.json`) with the competition limits.

## Layout

- `game/index.html` — the full-viewport canvas, HUD and import map.
- `game/src/config.js` — city size, districts, sunset palette, roads, names.
- `game/src/random.js` — seeded mulberry32 helpers.
- `game/src/city.js` — world generation: water, beach, roads, towers, palms,
  pier, lighthouse, lights and fog.
- `game/src/main.js` — renderer, camera, resize handling and fixed-step loop.
- `game/vendor/three.module.min.js` — vendored three.js 0.160.

Do not edit vendored files or the dossier builder.
