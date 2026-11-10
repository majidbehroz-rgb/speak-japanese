# Speak Japanese: build and tests

`index.html` is a **built file**. Edit the parts in `src/`, then rebuild.

## Source

`src/*.html` and `src/*.js` are the page body (from `<title>` to `</script>`), split at top-level boundaries.
They are concatenated in file-name order with no separators, so the numeric prefixes set the order.
`src/public/head.html` and `src/public/tail.html` are the wrapper the public page adds around them.
What each part holds is in [`CODEMAP.md`](CODEMAP.md).

## Build

```
python3 tools/build.py                       # both builds
python3 tools/build.py --public-only         # only index.html
python3 tools/build.py --cfg PATH            # private CFG from PATH (or SJ_CFG=PATH)
python3 tools/build.py --private-out PATH    # private output path (or SJ_PRIVATE_OUT=PATH)
```

| Build   | Output                               | Content |
|---------|--------------------------------------|---------|
| public  | `index.html` (GitHub Pages)          | `src/public/head.html` + parts + `src/public/tail.html`, with the empty public `CFG` |
| private | `/home/claude/out/japan-trainer.html` (published as a Claude artifact) | parts with the substitutions applied, plus one trailing newline. There is no `<head>` and no `</body></html>`, because the artifact publisher adds them. |

**Private CFG.** The private `CFG` line (start date, flight date, Discord channel links, app links) lives outside the repo,
default `/home/claude/private/cfg.js`. It is a single line `const CFG={...};`. The build wraps it as `/*CFG*/.../*END CFG*/`.
Never commit it or paste it into the repo.

**Public/private differences** are listed in one place: `SUBSTITUTIONS` in `tools/build.py`. Each entry is the text
from the public parts and its private replacement. Each public text must occur exactly once, otherwise the build fails.
Today there are two entries: the `CFG` line, and `NAME_WORDS` (the private build also lists `"sam"`).

**Safety checks.** The build fails loudly if the public output contains a Discord channel, webhook or invite link, a claude.ai artifact link,
the `/*CFG*/` marker, any URL from the private CFG (except its `publicLink`) or the private start/trip date, or if its `CFG` has a non-empty
`start`, `trip`, `appLink` or `ch`. Both outputs have their `<script>` block syntax-checked with `node --check`.

**Baseline (phase 1 only).** `tools/baseline.sh` rebuilds with `cfg.v42.js` into a temporary folder and compares the result byte for byte
with `build-inputs/private-v42.html` (lines 2 to the end, minus the publisher's trailing `</body></html>`) and with `git HEAD:index.html`.

## Tests

```
tools/test.sh                    # all: public audio rules doses state walk (public build)
tools/test.sh rules walk         # some
tools/test.sh --private walk     # against the private build
node tools/tests/<name>.js       # one test directly
```

The tests are plain Node scripts using Playwright (`require('playwright')`, Chromium preinstalled). Each one serves the repo on
`http://localhost:8765/` with the chosen page as `/index.html` (`SJ_PAGE`, `SJ_PORT`), and stops the server when it finishes. Web fonts are blocked.
The browser's `speechSynthesis` is replaced by a fake that finishes at once. The app's own speech code is left as it is.

| Test | What it checks | Options |
|------|----------------|---------|
| `public` | `index.html` has no private strings or analytics, and has an empty CFG. It also runs the same checker on the private build, which must be flagged (self-test). | `SJ_CFG`, `SJ_PRIVATE_OUT` |
| `audio` | Every clip in `audio/index.json` lies inside its MP3 file and starts on a frame header. Every key Drive mode can request exists: a static pass, plus the real `driveScript()` at every point of the v2 course. | |
| `rules` | Walks the v2 course order, including each week's optional More-practice sessions once they become available. Every word on screen outside a teaching step must have been taught before. Name, place-slot and number words are reported as exempt. | `SJ_RULES_SELFTEST=1` |
| `doses` | New words and items per learning day (`newToday`). Flags over 7 words or over 12 items; reports only. | `SJ_DOSES_STRICT=1` |
| `state` | The owner's saved progress (read at run time): the "New plan" card appears. After Continue the warm-up comes first, then week 2 day 3. Learned stays 25, and nothing is re-queued or skipped. | `SJ_STATE`, `SJ_STATE_NOW` |
| `plan` | Plan v2 capacity for a flight on Dec 17, cases (a)–(e). Checks: at most 2 a day; weekday doubles only after weekends; finish by Dec 16 or the overflow is stated; no "behind"/"missed" wording; rendering Today twice changes no storage. Prints the numbers. | |
| `flow` | Auto-advance countdown and Stay here; Resume after a reload; skip prompt only on unfinished steps; the feedback box is closed by default and gone the next day; the gear is collapsed; step help moves behind "?". | |
| `sync` | A v2 progress code round-trips. Merging with v1 plans (behind or ahead, both directions) stays v2 and never moves backwards. The owner's v1 code keeps a device on v2. | |
| `walk` | A fresh learner from Nov 14 does what Today offers each day and completes the course by Dec 16 with no page errors. `SJ_WALK_MODE=manual` taps Next (confirming Skip); `auto` never taps Next and relies on auto-advance (`tools/test.sh` runs both as `walk` and `walk-auto`). | `SJ_WALK_MODE`, `SJ_WALK_DAYS`, `SJ_WALK_START`, `SJ_WALK_TRIP`, `SJ_WALK_HARD`, `SJ_WALK_VERBOSE` |

`tools/shots.sh [--private]` saves phone-size screenshots of the main screens to `/home/claude/out/shots/phase2/` for review by eye.
`tools/baseline.sh` was the phase-1 byte-for-byte check against v42; the builds intentionally differ from v42 since phase 2.

## Audio

`audio/index.json` is `{frame, silence, clips}`:

- `frame` is the duration of one MP3 frame in seconds (0.036).
- `silence` is one silent frame, base64.
- `clips` maps each key to `[file, byteOffset, byteLength, nFrames]`.

The files are `w1.mp3`..`w10.mp3` (the clips of each week) and `coach.mp3`. All of them are constant-bitrate frames, so Drive mode cuts the byte ranges out and joins them with silent frames into one MP3 (`driveBuild`).

The key prefixes are:

| Prefix | Content |
|--------|---------|
| `j:<romaji>` | Phrase at normal speed. |
| `s:<romaji>` | Slow phrase, or a piece of one (from `PARTS`). |
| `w:<romaji>` | Single word. |
| `k:<romaji>` | Staff voice. |
| `e:<english>` | English meaning, spoken as `sayable(en)`. |
| `c:<text>` | Coach line (`DRP`). |

The voice pipeline that made these clips was lost. `build-inputs/tts-old/` only holds parts of an older one, and phase 4 rebuilds it.
