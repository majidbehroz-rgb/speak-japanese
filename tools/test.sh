#!/usr/bin/env bash
# Run the Playwright tests against a built page.
#   tools/test.sh                    all tests on the public build (index.html)
#   tools/test.sh rules doses        only these tests
#   tools/test.sh --private walk     run against the private build (/home/claude/out/japan-trainer.html, or $SJ_PRIVATE_OUT)
# Tests: public audio rules doses state walk   (see tools/README.md for their options)
set -u
cd "$(dirname "$0")/.."
if [ "${1:-}" = "--private" ]; then shift; export SJ_PAGE="${SJ_PRIVATE_OUT:-/home/claude/out/japan-trainer.html}"; fi
tests=("$@"); [ ${#tests[@]} -eq 0 ] && tests=(public audio rules doses state walk)
fail=0; summary=()
for t in "${tests[@]}"; do
  if node "tools/tests/$t.js"; then summary+=("$t: pass"); else summary+=("$t: FAIL"); fail=1; fi
done
echo; printf '%s\n' "${summary[@]}"
exit $fail
