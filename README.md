[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/lindaayu1200/kota-aruna/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/lindaayu1200/kota-aruna/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# KOTA ARUNA

An offline three.js crime sandbox set on a fictional Indonesian coast at sunset.
One ring road connects **Teluk Aruna**, a dense harbor of towers and cranes, with
**Marina Senja**, a quieter stretch of pastel houses, palms and a long wooden pier.

All assets are local. The game needs no build step, account or network request
once it is open in a browser.

## The story

Ara, Dimas, Sinta and Bimo hand out seven jobs that begin with a borrowed car at
the docks and end with a flight around the channel. The chain moves from a
beachside pickup to a courier watch, a helicopter sweep of the lighthouse, a
fight on the pier and an ambush at the canal bridge. The seventh job,
**Pasang Surut**, reveals that Sinta sold the tide schedule to the employers; the
crew turns the setup around instead of taking the blame.

## Highlights

- Third-person walking, car driving and helicopter flight in one seeded city
- Helicopter searchlight with a real spotlight and visible light cone
- Five wanted stars, cooldown, bounties and pursuing patrol cars
- Cash rewards across a seven-mission chain with crew dialogue
- Procedural radio with three stations (R to switch, M to mute)
- Four weapon slots: fists, pistol, SMG and rocket launcher (1-4, click to fire)
- Round minimap with both district names, mission marker and police dots
- Analog speedometer, health/armor meters, wallet and district readout
- Repeatable skyline through `?seed=1337`

## Play locally

Serve `game/` over HTTP and open `index.html`. The bundled development server
uses only Node's standard library:

```sh
node serve.ts
```

Open `http://localhost:8080/`. Add `?seed=1337` for a fixed city. The four
capture presets are `?shot=harbor`, `?shot=pursuit`, `?shot=beam` and
`?shot=tide`.

### Controls

| Key | Action |
| --- | --- |
| WASD | Move, steer or fly |
| Shift | Sprint on foot |
| Space | Handbrake in a car, climb in a helicopter |
| C or Ctrl | Descend in a helicopter |
| F | Enter or leave the car |
| H | Enter or leave the helicopter |
| L | Toggle the searchlight |
| E | Begin the current mission at its marker |
| 1-4 | Select weapon |
| Click / Ctrl | Fire |
| R / M | Next radio station / mute |
| P | Pause |

## Files

- `game/index.html` — canvas, import map and HUD styles
- `game/src/config.js` — districts, crew, jobs, guns, radio and tuning
- `game/src/random.js` — seeded generator used by the skyline and prop scatter
- `game/src/city.js` — roads, water, skyline, houses, palms, pier and beacon
- `game/src/main.js` — simulation, vehicles, combat, police, radio and HUD
- `game/vendor/three.module.min.js` — bundled three.js module
- `screenshots/` — four 1280x720 JPEG renders described in `shots.json`

## Hand-in build

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` finds its own directory with `fileURLToPath`, copies `game/` and
`screenshots/` into the destination, includes `shots.json` and writes a
deterministic `dossier.json`. Repeated runs produce byte-for-byte identical
output.

The challenge is listed on the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01).
