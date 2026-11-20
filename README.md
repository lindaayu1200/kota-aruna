[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/lindaayu1200/kota-aruna/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/lindaayu1200/kota-aruna/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# KOTA ARUNA

A self-contained three.js crime sandbox on a fictional Indonesian coastline at dusk. A single ring road ties together **Teluk Aruna** — towers, cranes, warehouses and a canal — with **Marina Senja** — pastel cottages, palms and a long wooden jetty reaching toward the lighthouse.

Everything ships as static files. There is no build step, no account and no network traffic once the page is open.

## Story

Ara, Dimas, Sinta and Bimo pull you through seven contracts: a borrowed car at the docks, a parcel under a beach umbrella, a tail on the orbital road, a searchlight sweep above the water, a rescue at the end of the pier and an ambush on the canal bridge. The last job, **Pasang Surut**, drops the twist: Sinta leaked the tide table to the people hiring you. Instead of taking the fall, the crew uses the rising water to turn the setup around.

## What is in the box

- On-foot movement, a drivable car and a flyable helicopter with a working spotlight cone
- Five wanted stars, cooldown, bounty cash and pursuing patrol cars
- Seven paid story contracts with crew dialogue and a final reveal
- Three generated radio stations (synthesized with WebAudio), switch and mute keys
- Four weapon slots: fists, pistol, SMG and rocket launcher
- Circular minimap naming both districts, marking the current job and police units
- Analog speed dial, health and armor meters, wallet and district display
- Deterministic skyline; `?seed=1337` reproduces the same city

## Run it

Serve `game/` over HTTP and open `index.html`. The repository includes a Node standard-library server:

```sh
node serve.ts
```

Then visit `http://localhost:8080/`. The fixed city is `?seed=1337`. Screenshot views are `?shot=harbor`, `?shot=pursuit`, `?shot=beam` and `?shot=tide`.

### Controls

| Key | Action |
| --- | --- |
| WASD | Walk, steer or fly |
| Shift | Sprint |
| Space | Handbrake / climb |
| C | Descend in the helicopter |
| F | Enter or leave the car |
| H | Enter or leave the helicopter |
| L | Toggle the searchlight |
| E | Start the contract at the marker |
| 1-4 | Choose a weapon |
| Click / Ctrl | Fire |
| R / M | Next radio station / mute |
| P | Pause |

## Layout

- `game/index.html` — canvas, import map and HUD
- `game/src/config.js` — districts, crew, contracts, guns, radio and tuning
- `game/src/random.js` — small seeded generator for repeatable scenery
- `game/src/city.js` — land, water, roads, skyline, cottages, palms, jetty and lighthouse
- `game/src/main.js` — simulation, vehicles, combat, police, audio and interface
- `game/vendor/three.module.min.js` — bundled three.js module
- `screenshots/` — four 1280x720 JPEGs listed in `shots.json`

## Hand-in

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` resolves its own folder with `fileURLToPath`, copies `game/` and `screenshots/`, adds `shots.json` and writes a deterministic `dossier.json`. Running it twice produces byte-identical output.

See the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01) for the challenge details.
