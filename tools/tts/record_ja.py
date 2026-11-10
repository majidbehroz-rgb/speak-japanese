"""Build the Japanese recording list from the app's tts-needed.json, checking every line's reading against its romaji.
  python3 record_ja.py NEEDED.json OUT_CLIPS.json      then:  python3 append_clips.py --audio DIR --clips OUT_CLIPS.json"""
import json, re, sys
import jacheck, vv
T = ['Greetings and politeness','Introducing yourself','Food and ordering','Shopping and prices','Directions and trains','Time, days and plans','Small talk and likes','Talking about your trip','Hotel, problems and help','Full rehearsal']
R2K = {}
for k, r in jacheck.K.items():
    R2K.setdefault(r, k)
R2K.update({'sha':'シャ','shu':'シュ','sho':'ショ','cha':'チャ','chu':'チュ','cho':'チョ','ja':'ジャ','ju':'ジュ','jo':'ジョ','fa':'ファ','fi':'フィ','fe':'フェ','fo':'フォ','ti':'ティ','di':'ディ','wi':'ウィ','we':'ウェ'})
for c, kk in (('k','キ'),('g','ギ'),('n','ニ'),('h','ヒ'),('b','ビ'),('p','ピ'),('m','ミ'),('r','リ')):
    for v, s in (('a','ャ'),('u','ュ'),('o','ョ')): R2K[c+'y'+v] = kk + s
def ro2kata(ro):
    s = re.sub(r'[^a-z ]', '', re.sub(r'[-\[\]]', '', ro.lower())); out = ''; i = 0
    while i < len(s):
        if s[i] == ' ': i += 1; continue
        if s[i] == 'n' and (i+1 == len(s) or s[i+1] not in 'aiueoy'): out += 'ン'; i += 1; continue
        if i+1 < len(s) and s[i] == s[i+1] and s[i] not in 'aiueon': out += 'ッ'; i += 1; continue
        if s[i] == 't' and s[i+1:i+3] == 'ch': out += 'ッ'; i += 1; continue
        for n in (3, 2, 1):
            if s[i:i+n] in R2K: out += R2K[s[i:i+n]]; i += n; break
        else: i += 1
    return out
def week(wh):
    m = re.match(r'W(\d+) ', wh)
    if m: return int(m.group(1)) - 1
    m = re.search(r'number word (\d+)-', wh)
    if m: return int(m.group(1))
    if 'demonstration' in wh: return 2
    if wh.startswith('numbers'): return 1
    if wh.startswith('price'): return 3
    if wh.startswith('time'): return 5
    if wh.startswith('introduction'): return 9
    for i, t in enumerate(T):
        if wh.startswith(t): return i
    return None
def main():
    d = json.load(open(sys.argv[1])); out = []; bad = []; fixed = 0
    for x in d:
        if x.get('englishOnly') or x['key'][0] in 'ec': continue
        kind = x['key'][0]; jp = jacheck.strip(x['jp'])
        ok, rd, got, want = jacheck.check(x['ro'], jp, kind)
        if not ok:
            kana = ro2kata(x['ro'])
            ok2, rd2, got2, _ = jacheck.check(x['ro'], kana, kind)
            if ok2: jp = kana; fixed += 1
            else: bad.append((x['key'], x['jp'], rd, kana, rd2)); continue
        w = week(x.get('where') or '')
        if w is None: bad.append((x['key'], 'no week', x.get('where'))); continue
        out.append({'k': x['key'], 'w': w, 'text': x['ro'], 'jp': jp})
    seen = set(); out = [c for c in out if not (c['k'] in seen or seen.add(c['k']))]
    json.dump(out, open(sys.argv[2], 'w', encoding='utf8'), ensure_ascii=False)
    print(len(out), 'lines to record;', fixed, 'read from kana instead of the written form;', len(bad), 'could not be matched (they stay on the phone voice):')
    for b in bad: print('  ', b)
if __name__ == '__main__': main()
