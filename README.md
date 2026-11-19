# KOTA ARUNA

KOTA ARUNA is a self-contained three.js crime game set on a fictional Indonesian
harbor coast at sunset. Two districts share one ring road: **Teluk Aruna**, a
dense downtown of lit towers, cranes and shipping sheds, and **Marina Senja**,
a beach district of pastel houses, palms and a long wooden pier. Everything is
static and local — no build step, no accounts, no network requests at runtime.

## Story

Ara, Dimas, Sinta and Bimo take jobs across the coast: a pickup at the harbor,
a package on the beach, a tail along the ring road, a searchlight run to the
lighthouse, a fight at the old pier and an ambush on the channel bridge. The
seventh job, **Pasang Surut**, turns the story around: Sinta reveals she fed the
employers the tide tables, and the crew decides to flip the deal and leave the
city together. Mission dialogue, the finale and this README all carry that twist.

## Features

- Third-person walking, arcade driving and a flyable helicopter
- Helicopter searchlight with volumetric-style beam and a real spot light
- Five wanted stars, decaying heat, and police cars that give chase
- Money rewards, car bounties and a full mission chain of seven story jobs
- In-game procedural radio with three stations (R to change, M to mute)
- Four weapon slots: fists, pistol, SMG and a rocket launcher (1-4, click to fire)
- Minimap with roads, mission marker, police dots and both district labels
- Analog speedometer, health and armor bars, live district and money readouts
- Seeded city generator: the same `?seed=` always produces the same skyline

## Play

Serve `game/` with any static server, then open `game/index.html`:

```sh
node serve.ts
```

Append `?seed=1337` for a fixed layout. The four screenshots can be reproduced
with `?shot=cover`, `?shot=chase`, `?shot=marina` and `?shot=finale`.

### Controls

| Key | Action |
| --- | --- |
| WASD | Move / steer / fly |
| Shift | Sprint on foot |
| Space | Handbrake in a car, climb in a helicopter |
| C or Ctrl | Descend in a helicopter |
| F | Enter or leave the car |
| H | Enter or leave the helicopter |
| L | Toggle the searchlight |
| E | Start the current mission at its marker |
| 1-4 | Select weapon |
| Click / Ctrl | Fire |
| R / M | Next radio station / mute |
| P | Pause |

## Layout

- `game/index.html` — canvas, import map and the whole HUD
- `game/src/config.js` — districts, palette, crew, missions, weapons, radio
- `game/src/random.js` — seeded xorshift generator used by the world builder
- `game/src/city.js` — terrain, sea, roads, towers, houses, palms, pier, lights
- `game/src/main.js` — simulation, vehicles, combat, wanted level, HUD and camera
- `game/vendor/three.module.min.js` — vendored three.js, loaded offline
- `screenshots/` — four 1280x720 JPEG captures, listed in `shots.json`

## Package for hand-in

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` resolves its own directory with `fileURLToPath`, copies `game/` and
`screenshots/` to the output directory and writes a deterministic `dossier.json`
with the competition caps. Running it twice produces byte-identical output.
