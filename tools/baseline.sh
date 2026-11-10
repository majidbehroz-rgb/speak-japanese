#!/usr/bin/env bash
# Phase-1 baseline: rebuild from src/ with the v42 CFG and compare byte for byte with the published pages.
#   private: lines 2..end of build-inputs/private-v42.html minus the trailing </body></html> the artifact publisher adds
#   public : index.html as committed (git HEAD)
set -eu
cd "$(dirname "$0")/.."
V42=${SJ_V42:-/home/claude/build-inputs/private-v42.html}
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
python3 tools/build.py --cfg /home/claude/private/cfg.v42.js --private-out "$tmp/private.html" --public-out "$tmp/public.html" >/dev/null
tail -n +2 "$V42" | python3 -c 'import sys;b=sys.stdin.buffer.read();t=b"</body></html>";assert b.endswith(t);sys.stdout.buffer.write(b[:-len(t)])' > "$tmp/v42.html"
git show HEAD:index.html > "$tmp/head.html"
cmp "$tmp/private.html" "$tmp/v42.html" && echo "private build == private-v42.html (lines 2.., minus </body></html>): IDENTICAL ($(wc -c < "$tmp/private.html") bytes)"
cmp "$tmp/public.html" "$tmp/head.html" && echo "public build  == git HEAD:index.html: IDENTICAL ($(wc -c < "$tmp/public.html") bytes)"
