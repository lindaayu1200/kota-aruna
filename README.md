[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/lindaayu1200/kota-aruna/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/lindaayu1200/kota-aruna/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# KOTA ARUNA

A compact open-world crime drama that runs as pure static files. Nothing is
installed, bundled or fetched while playing: three.js is vendored, the radio is
synthesised with WebAudio, and the entire coastline is grown from one integer
seed.

The sun hangs over the Aruna Channel and never quite sets. Glass towers,
container cranes and the harbour market fill **Teluk Aruna** to the east; palm
groves, a wooden jetty and a turning lighthouse frame **Marina Senja** to the
west. Two bridges are the only way across for a car — a helicopter does not
need them.

## Crew and story

- **Ara** keeps the harbour book and hands out the first favours.
- **Dimas** drives anything with a wheel and knows the back streets.
- **Sinta** pulls order out of radio static and broken relay gear.
- **Bimo** holds the workshop keys and the heavy hardware.

Seven contracts lead from a simple passenger fare to a final flight above the
channel. The last job uncovers **Pasang Surut** — the tide was never the point.
The channel gates were opened at high water so crates could slip past the port
police, the smashed relays were a decoy, and every earlier favour was an
audition. The book ends up in your hands.

## What is in the game

- A seeded 3D coastal city: street grid, elliptical ring road, canal, two
  bridges, beach, jetty, lighthouse, cranes, traffic, pedestrians and a
  gently moving sea.
- Cars, vans and a **drivable helicopter**. `Space` lifts, `Ctrl` drops,
  `W`/`S` pitch, `A`/`D` yaw, and `L` switches the searchlight on and off.
- One to five **wanted stars**. Patrol cruisers chase, ram and shoot; three
  stars bring the air unit with its own lamp. Escape or pay the fine.
- Seven story missions with waypoints, timers, rivals, character chatter and
  the Pasang Surut reveal. `J` opens the contract ledger at any time.
- Four **weapon slots** — fists, pistol, SMG and rifle. Respect unlocks the
  heavier guns; `1`–`4` selects, `X` reloads, `Space` fires.
- Four procedurally generated **radio stations**. `R`/`T` change station,
  `M` mutes, and the dashboard equaliser follows the music.
- A **minimap** with both district names, a km/h **speedometer**, money,
  respect, health, stars and the current objective in one HUD.
- Three workshops repair vehicles and act as checkpoints; three save slots
  persist through a page reload.

## Controls

| Key | On foot | In a car | In the helicopter |
| --- | --- | --- | --- |
| `W A S D` | Walk | Throttle, brake, steer | Pitch and yaw |
| `Shift` | Sprint | Boost | — |
| `Space` | Fire | Handbrake | Climb |
| `Ctrl` | Crouch | — | Descend |
| `E` | Talk, enter, repair | Leave vehicle | Leave once landed |
| `L` | — | — | Searchlight |
| `1`–`4` | Weapon slots | — | — |
| `X` | Reload | — | — |
| `J` | Contract ledger | Contract ledger | Contract ledger |
| `R` / `T` / `M` | Radio next / back / mute | Same | Same |
| `Arrows` or drag | Orbit camera | Orbit camera | Orbit camera |
| `F` | Quick-save | Quick-save | Quick-save |
| `Esc` | Pause | Pause | Pause |

## Play locally

```sh
node serve.ts --port 8099
```

Open `http://localhost:8099/`. `?seed=42` grows a different coastline, and
`?shot=cover`, `?shot=chase`, `?shot=crew` or `?shot=finale` stage a camera for
a capture. Any static file server works; `serve.ts` is included for
convenience.

The four 1280×720 JPEGs in `screenshots/` are captures of this build in Chrome,
catalogued in `shots.json`.

## Hand in

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` validates the manifest and core files, copies `game/` and
`screenshots/` to the requested folder, and writes `dossier.json` with the kit
builder. Its paths come from `fileURLToPath`, and no clock, dice or network is
consulted, so two consecutive runs are byte-identical.

The bounty is listed at [make.fun/bounty/gta6-01](https://make.fun/bounty/gta6-01).

## Source map

- `game/index.html` — canvas, import map, HUD, menus and overlays.
- `game/src/config.js` — map layout, crew, contracts, guns, radio and rides.
- `game/src/random.js` — seeded stream and helper maths.
- `game/src/city.js` — scenery, water animation and world queries.
- `game/src/main.js` — driving, flying, law, combat, missions, HUD and shots.
- `main.ts` — deterministic packaging step.
- `shots.json` — the four captures and captions.
