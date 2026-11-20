# KOTA ARUNA

[![make.fun competition](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)

A self-contained 3D crime sandbox that runs straight from static files. There
is no bundler, no install step and no network traffic at play time: three.js is
vendored, the radio is synthesised in the browser, and the whole coast grows
from one integer seed.

The sunset never quite finishes. Container cranes and glass towers crowd
**Teluk Aruna** on the eastern side of the channel, while palms, a timber
jetty and a turning lighthouse frame **Marina Senja** on the western shore.

## The crew and the secret

Four people run this coastline. **Ara** trades favours around the harbour,
**Dimas** knows every shortcut behind a steering wheel, **Sinta** can pull a
signal out of static, and **Bimo** keeps the workshop keys. Seven contracts
move you between the two districts: a passenger fare, a lifted car, missing
relay cases, a three-star pursuit, a timed run over the canal bridges, a street
showdown, and one final flight.

That last job reveals **Pasang Surut**: the tide was never the point. The
channel gates were opened at high water so crates could slip past the port
police, the broken relays were a decoy, and every earlier favour was an
audition. Ara kept the book, Dimas drove the boats, Bimo held the keys — and at
the end the book is yours.

## What is in the game

- A fixed-seed coastal city with a street grid, elliptical ring road, canal
  and two bridges, beach, jetty, lighthouse, helipad, traffic and pedestrians.
- Cars and vans to steal and drive. The helicopter climbs on `Space`, drops on
  `Ctrl`, turns on `A`/`D`, pitches on `W`/`S`, and `L` switches on a real
  searchlight with a spotlight and a visible beam.
- One to five wanted stars. Patrol cars give chase, ram and shoot; three stars
  bring an air unit that tracks you with its own light. Lose the heat or pay
  the fine.
- Seven story contracts with character portraits, glowing pickups, rivals,
  clocks and the Pasang Surut reveal. `J` opens the ledger at any time.
- Four weapon slots — fists, pistol, SMG and rifle. Respect unlocks the heavier
  guns; `1`–`4` selects a slot, `X` reloads and `Space` fires on foot.
- Four procedurally synthesised radio stations. `R` and `T` change station,
  `M` mutes, and the dashboard equaliser dances along.
- A labelled minimap for both districts, a km/h speedometer, money, respect,
  health, stars and the current objective, all visible at a glance.
- Three workshops that repair the car and act as manual checkpoints, plus three
  save slots and a continue button that survive a page reload.

## Controls

| Key | On foot | In a car | In the helicopter |
| --- | --- | --- | --- |
| `W A S D` | Walk | Throttle, brake, steer | Pitch and yaw |
| `Shift` | Sprint | Boost | — |
| `Space` | Fire | Handbrake | Climb |
| `Ctrl` | — | — | Descend |
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

Then open `http://localhost:8099/`. Add `?seed=42` to grow the coast from a
different seed. Any static server works; `serve.ts` is a small Node standard
library helper included for convenience.

The four images in `screenshots/` are unedited captures of this build in
Chrome. The URLs `?shot=cover`, `?shot=chase`, `?shot=marina` and
`?shot=finale` stage the matching camera, props and HUD before a capture.

## Hand in

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` checks the manifest, the core game files and the import map, copies
`game/` and `screenshots/` into the output folder, and writes `dossier.json`
with the kit's builder. It resolves its own location with `fileURLToPath`, so
two consecutive runs produce byte-identical output.

## Source map

- `game/index.html` — canvas, import map, HUD, menus and overlays.
- `game/src/config.js` — map, palette, crew, contracts, guns, radio and rides.
- `game/src/random.js` — seeded stream and angle helpers.
- `game/src/city.js` — scenery, water animation and world queries.
- `game/src/main.js` — driving, flying, law, combat, missions, HUD and shots.
- `main.ts` — deterministic packaging step.
- `shots.json` — the four captures and their captions.
- `.gitignore` — scratch that never reaches the entry.
- `README.md` — this guide.
