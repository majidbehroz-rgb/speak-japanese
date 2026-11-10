#!/usr/bin/env python3
"""Build Speak Japanese from src/ parts.

  python3 tools/build.py                 # both builds
  python3 tools/build.py --public-only   # only index.html
  python3 tools/build.py --cfg PATH      # private CFG file (default: $SJ_CFG or /home/claude/private/cfg.js)
  python3 tools/build.py --private-out PATH

PUBLIC  -> index.html  = src/public/head.html + parts + src/public/tail.html
PRIVATE -> <private-out> = parts with SUBSTITUTIONS applied + PRIVATE_TAIL (no wrapper head, no </body></html>)

The parts in src/ are the PUBLIC page body. Every public/private difference is listed in
SUBSTITUTIONS below; each "public" text must occur exactly once in the parts or the build fails.
Never print the private CFG.
"""
import argparse, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
DEFAULT_CFG = "/home/claude/private/cfg.js"
DEFAULT_PRIVATE_OUT = "/home/claude/out/japan-trainer.html"

PUBLIC_CFG = 'const CFG={pub:true,start:"",trip:"",ch:{},appLink:"",publicLink:""};'


def private_cfg(path):
    cfg = open(path, encoding="utf-8").read().strip()
    if not cfg.startswith("const CFG={") or "\n" in cfg:
        die("private CFG file must hold a single line starting with 'const CFG={' (%s)" % path)
    return "/*CFG*/" + cfg + "/*END CFG*/"


# ---- the ONLY public/private differences --------------------------------------------
# (description, text in the public parts, private replacement or a callable(cfg_path) -> text)
SUBSTITUTIONS = [
    ("CFG line (personal dates and links)", PUBLIC_CFG, private_cfg),
    ("NAME_WORDS: private build also treats 'sam' as a name",
     'const NAME_WORDS=new Set(["ken","ken-san","sumisu"]);',
     'const NAME_WORDS=new Set(["sam","ken","ken-san","sumisu"]);'),
]
PRIVATE_TAIL = "\n"  # the artifact publisher appends </body></html> itself

# strings that must never reach the public build
FORBIDDEN_PUBLIC = [
    (r"discord(?:app)?\.com/(?:channels|api/webhooks)/\d{15,}", "Discord channel/webhook link (real snowflake id)"),
    (r"discord\.gg/\w", "Discord invite link"),
    (r"claude\.ai/(?:code/)?artifacts?/[\w-]", "claude.ai artifact link"),
    (r"/\*CFG\*/", "private CFG marker"),
]


def die(msg):
    sys.stderr.write("BUILD FAILED: " + msg + "\n")
    sys.exit(1)


def read(p):
    with open(p, encoding="utf-8", newline="") as f:
        return f.read()


def write(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="") as f:
        f.write(s)


def parts():
    names = sorted(n for n in os.listdir(SRC) if n.endswith((".html", ".js")) and os.path.isfile(os.path.join(SRC, n)))
    if not names:
        die("no parts in src/")
    return "".join(read(os.path.join(SRC, n)) for n in names)


def check_script(html, label):
    i = html.find("<script>")
    j = html.rfind("</script>")
    if i < 0 or j < i:
        die(label + ": no <script> block")
    js = html[i + len("<script>"):j]
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
        f.write(js)
        tmp = f.name
    try:
        r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
    finally:
        os.unlink(tmp)
    if r.returncode != 0:
        die(label + ": script block has a syntax error\n" + r.stderr[-2000:])


def check_public(html, cfg_path):
    for rx, what in FORBIDDEN_PUBLIC:
        if re.search(rx, html, re.I):
            die("public build contains a private string: " + what)
    m = re.search(r"const CFG=\{[^\n]*?\};", html)
    if not m:
        die("public build: CFG line not found")
    cfg = m.group(0)
    for key in ("start", "trip", "appLink"):
        km = re.search(key + r':"([^"]*)"', cfg)
        if not km or km.group(1):
            die("public build: CFG.%s must be present and empty" % key)
    if not re.search(r"ch:\{\}", cfg):
        die("public build: CFG.ch must be empty")
    # every URL in the private CFG (except the public link) must be absent from the public build
    if cfg_path and os.path.exists(cfg_path):
        pc = read(cfg_path)
        pub = re.search(r'publicLink:"([^"]*)"', pc)
        publink = pub.group(1) if pub else None
        for u in re.findall(r'"(https?://[^"]+)"', pc):
            if u != publink and u in html:
                die("public build contains a URL from the private CFG (not printed)")
        for key in ("start", "trip"):
            km = re.search(key + r':"([^"]+)"', pc)
            if km and ('"%s"' % km.group(1)) in html:
                die("public build contains the private %s date" % key)


def build_public(body, cfg_path):
    html = read(os.path.join(SRC, "public", "head.html")) + body + read(os.path.join(SRC, "public", "tail.html"))
    check_public(html, cfg_path)
    check_script(html, "public")
    return html


def build_private(body, cfg_path):
    if not os.path.exists(cfg_path):
        die("private CFG not found: %s (use --cfg or SJ_CFG)" % cfg_path)
    out = body
    for what, pub, priv in SUBSTITUTIONS:
        n = out.count(pub)
        if n != 1:
            die("substitution '%s': expected 1 match in src, found %d" % (what, n))
        out = out.replace(pub, priv(cfg_path) if callable(priv) else priv)
    out += PRIVATE_TAIL
    check_script(out, "private")
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cfg", default=os.environ.get("SJ_CFG", DEFAULT_CFG))
    ap.add_argument("--private-out", default=os.environ.get("SJ_PRIVATE_OUT", DEFAULT_PRIVATE_OUT))
    ap.add_argument("--public-out", default=os.path.join(ROOT, "index.html"))
    ap.add_argument("--public-only", action="store_true")
    a = ap.parse_args()
    body = parts()
    pub = build_public(body, a.cfg)
    write(a.public_out, pub)
    print("public : %s (%d bytes)" % (a.public_out, len(pub.encode())))
    if not a.public_only:
        priv = build_private(body, a.cfg)
        write(a.private_out, priv)
        print("private: %s (%d bytes, CFG from %s)" % (a.private_out, len(priv.encode()), os.path.basename(a.cfg)))


if __name__ == "__main__":
    main()
