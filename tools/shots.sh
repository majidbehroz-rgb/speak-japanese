#!/usr/bin/env bash
# Phone-size screenshots of the phase-4 screens for review by eye.
#   tools/shots.sh             public build  → /home/claude/out/shots/phase4/
#   tools/shots.sh --private   private build (SJ_PRIVATE_OUT or /home/claude/out/japan-trainer.html)
set -eu
cd "$(dirname "$0")/.."
if [ "${1:-}" = "--private" ]; then export SJ_PAGE="${SJ_PRIVATE_OUT:-/home/claude/out/japan-trainer.html}"; fi
node tools/tests/shots.js
