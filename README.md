[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/lindaayu1200/kota-aruna/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/lindaayu1200/kota-aruna/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# KOTA ARUNA

An offline three.js crime sandbox on a fictional Indonesian harbor coast at
sunset. Two districts share one ring road: **Teluk Aruna**, a downtown of lit
towers, cranes and shipping sheds, and **Marina Senja**, a beach district of
pastel houses, palms and a long wooden pier.

Everything runs locally from static files. No build step, no account, no network
requests while playing.

## Story

Ara, Dimas, Sinta and Bimo take seven jobs around the coast. The work starts
with a car key at the harbor and moves through a beach package, a courier tail,
a searchlight flight to the lighthouse, a fight on the old pier and an ambush on
the channel bridge. The last job, **Pasang Surut**, turns it all around: Sinta
admits she fed the employers the tide tables, and the crew flips the deal
instead of taking the fall.

## What is in the game

- Walk, drive or fly a third-person helicopter around a seeded open world
- Helicopter searchlight with a real spot light and a soft cone
- Five wanted stars, cooldown, and patrol cars that hunt you down
- Cash rewards, bounties on police cars, and a full seven-mission chain
- Procedural in-game radio with three stations (R cycles, M mutes)
- Four weapon slots: fists, pistol, SMG and rocket launcher (1-4, click to fire)
- Round minimap with roads, both district labels, markers and patrol dots
- Analog speedometer, health and armor meters, live cash and district readout
- Deterministic `?seed=` so a number always rebuilds the same skyline

## Run it

Serve `game/` as static files and open `index.html`. The included development
server needs only Node:

```sh
node serve.ts
```

Then visit `http://localhost:8080/`. Add `?seed=1337` for a fixed city. The
four captures can be recreated with `?shot=harbor`, `?shot=pursuit`,
`?shot=beam` and `?shot=tide`.

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
| E | Start the current mission at its marker |
| 1-4 | Select weapon |
| Click / Ctrl | Fire |
| R / M | Next radio station / mute |
| P | Pause |

## Repository map

- `game/index.html` — page, import map and the complete HUD
- `game/src/config.js` — districts, crew, jobs, guns, radio and tuning
- `game/src/random.js` — seeded generator for repeatable worlds
- `game/src/city.js` — terrain, water, roads, skyline, houses, palms and pier
- `game/src/main.js` — simulation, vehicles, combat, wanted level and HUD
- `game/vendor/three.module.min.js` — vendored three.js, loaded without network
- `screenshots/` — four 1280x720 JPEG renders listed in `shots.json`

## Hand-in package

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` resolves its own folder with `fileURLToPath`, copies `game/` and
`screenshots/` into the output folder and writes a deterministic `dossier.json`
within the competition caps. Two consecutive runs produce byte-identical
output.

See the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01) for the
challenge this entry was built for.
