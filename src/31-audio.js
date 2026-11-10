/* ---------- RECORDED AUDIO: one layer for lessons and Drive ----------
   audio/index.json = {frame, silence, clips:{key:[file, byteOffset, byteLength, nFrames]}}; files w1..w10.mp3 + coach.mp3.
   Keys: j:<romaji> phrase · s:<romaji> slow phrase or piece · w:<romaji> single word · k:<romaji> staff voice ·
         e:<sayable(english)> meaning · c:<text> coach line.
   Lessons play one clip at a time through one reused <audio> element (a Blob URL per clip): media elements keep playing with the
   iPhone silent switch on, unlike Web Audio. Every line goes through voice(line): the clip when it exists and plays, otherwise the
   phone's text-to-speech (speak) for that line. A clip resolves on "ended" (or a safety timeout from its length), so nothing overlaps. */
const AUDIO_BASE="audio/";
const DRK={w:ro=>"w:"+ro,j:ro=>"j:"+ro,s:ro=>"s:"+ro,k:ro=>"k:"+ro,e:en=>"e:"+sayable(en),c:t=>"c:"+t};
const DRP={intro:"Drive mode. Eyes on the road. Just listen, and speak out loud.",review:"Review time.",say:"Say it in Japanese.",und:"What does it mean?",staff:"Here's something staff will say to you.",want:"What do they want?",reply:"You can answer:",
  newp:"New phrase.",words:"New words first.",pieces:"Piece by piece.",slow:"All together, slowly.",normal:"Now at normal speed.",fromEn:"Now from the English.",mean:"And what does it mean?",half:"Halfway there. Nice work.",end:"That's the end of this drive. Great work!",preview:"Let's preview your next lesson.",go:"Let's go."};
// AX: state "idle" | "loading" | "ok" | "fail"; meta = the index; files = fetched sprites (ArrayBuffer); urls = Blob URL per clip key
const AX={state:"idle",meta:null,files:{},urls:{},short:{},sil:null,el:null,tok:0,playing:null,p:null};   // short: sprites still shorter than the index needs
function audioIndex(){if(AX.p)return AX.p;AX.state="loading";
  // the index is revalidated every time (new recordings get appended to it); a cached copy is used when there is no network
  const get=mode=>fetch(AUDIO_BASE+"index.json",{cache:mode}).then(r=>{if(!r.ok)throw new Error("audio index "+r.status);return r.json()});
  AX.p=get("no-cache").catch(()=>get("force-cache")).then(meta=>{
    const b=atob(meta.silence),sil=new Uint8Array(b.length);for(let i=0;i<b.length;i++)sil[i]=b.charCodeAt(i);AX.meta=meta;AX.sil=sil;AX.state="ok";return AX})
   .catch(e=>{AX.state="fail";throw e});AX.p.catch(()=>{});return AX.p}
const audioOK=()=>AX.state==="ok"||AX.state==="loading";             // recorded voices expected (the sound check and "No sound?" boxes are dropped)
const clipOf=k=>AX.meta&&k?AX.meta.clips[k]:null;
const clipSec=k=>{const c=clipOf(k);return c?c[3]*AX.meta.frame:0};
const filePending={};
// how far into each sprite the index reaches: a sprite shorter than that is an old copy (recordings get appended to the end)
const fileNeed=name=>{let n=0;for(const k in AX.meta.clips){const c=AX.meta.clips[k];if(c[0]===name)n=Math.max(n,c[1]+c[2])}return n};
function audioFile(name){if(AX.files[name])return Promise.resolve(AX.files[name]);if(filePending[name])return filePending[name];
  const get=mode=>fetch(AUDIO_BASE+name,{cache:mode}).then(r=>{if(!r.ok)throw new Error(name+" "+r.status);return r.arrayBuffer()});
  // a cached sprite is fine while it is long enough for the index; if it is shorter, fetch it once more bypassing every cache
  filePending[name]=get("default").then(b=>b.byteLength>=fileNeed(name)?b:get("reload")).then(b=>{AX.files[name]=b;if(b.byteLength<fileNeed(name))AX.short[name]=b.byteLength;return b}).finally(()=>{delete filePending[name]});return filePending[name]}
// fetch a week's sprite and the coach file ahead of time (at Start), so the lesson has no gaps
function audioPreload(w){return audioIndex().then(()=>Promise.all([audioFile("coach.mp3"),audioFile("w"+(Math.max(0,Math.min(9,w))+1)+".mp3")])).catch(()=>null)}
async function clipUrl(k){if(AX.urls[k])return AX.urls[k];const c=clipOf(k);if(!c)throw new Error("no clip "+k);const buf=await audioFile(c[0]);
  if(c[1]+c[2]>buf.byteLength)throw new Error("clip "+k+" is past the end of "+c[0]);   // still an old copy: this line uses text-to-speech
  return AX.urls[k]=URL.createObjectURL(new Blob([new Uint8Array(buf,c[1],c[2])],{type:"audio/mpeg"}))}
// Voice speed: 100% = the recordings as recorded (70–120%); text-to-speech uses its old default pace (0.75) times the same setting
let vrate=Math.max(0.7,Math.min(1.2,+store.get("vrate",1)||1));
function setVrate(v){vrate=Math.max(0.7,Math.min(1.2,+v||1));store.set("vrate",vrate);rate=0.75*vrate;if(AX.el)try{AX.el.playbackRate=vrate}catch(e){}}
function audioEl(){if(AX.el)return AX.el;const a=AX.el=document.createElement("audio");a.preload="auto";a.setAttribute("playsinline","");try{a.preservesPitch=true;a.webkitPreservesPitch=true}catch(e){}
  try{if(navigator.audioSession)navigator.audioSession.type="playback"}catch(e){}document.body.appendChild(a);return a}
// iOS: the first play() must happen inside a tap; a silent frame played on the first tap unlocks the element for later clips
let audioUnlocked=false,unlockUrl=null;
// a decodable stretch of silence (~0.32 s: nine silent frames from the index, joined): a single frame alone does not decode
function silentUrl(){if(unlockUrl)return unlockUrl;if(!AX.sil)return null;const n=Math.max(8,Math.ceil(0.3/AX.meta.frame)),u=new Uint8Array(AX.sil.length*n);for(let i=0;i<n;i++)u.set(AX.sil,i*AX.sil.length);
  return unlockUrl=URL.createObjectURL(new Blob([u],{type:"audio/mpeg"}))}
function audioUnlock(){if(audioUnlocked)return;const url=silentUrl();if(!url)return;   // index not loaded yet: the next tap unlocks
  audioUnlocked=true;try{const a=audioEl();if(AX.playing)return;a.dataset.clip="";a.src=url;a.playbackRate=1;const p=a.play();if(p&&p.catch)p.catch(()=>{audioUnlocked=false})}catch(e){audioUnlocked=false}}
document.addEventListener("click",audioUnlock,true);
// play one clip; resolves "ok" when it ended, "stopped" when audioStop() cut it, "fail" when it could not play (caller falls back to TTS)
// no line waits on the network without a limit: the clip must be loaded within LOAD_MS, else the line is spoken by text-to-speech
// (and the sprite keeps loading in the background for the next lines). The safety timer covers loading AND playing.
const LOAD_MS=2500;
function playClip(k){const my=++AX.tok;if(AX.playing)AX.playing.fin("stopped");
  return new Promise(res=>{let done=false,t=null;const a=audioEl();
    const fin=v=>{if(done)return;done=true;clearTimeout(t);a.onended=a.onerror=null;if(AX.playing&&AX.playing.fin===fin)AX.playing=null;res(v)};AX.playing={key:k,fin};
    t=setTimeout(()=>fin("fail"),LOAD_MS);   // not loaded in time: "fail" → the caller speaks the line
    clipUrl(k).then(url=>{if(done||my!==AX.tok)return fin("stopped");clearTimeout(t);
      a.onended=()=>fin("ok");a.onerror=()=>fin("fail");a.dataset.clip=k;a.src=url;a.defaultPlaybackRate=vrate;a.playbackRate=vrate;
      // safety net if "ended" never fires: the clip's length at this speed, plus a margin
      t=setTimeout(()=>{if(!a.paused&&!a.ended&&a.currentTime<clipSec(k)-0.05){t=setTimeout(()=>fin("ok"),3000);return}fin("ok")},(clipSec(k)/vrate)*1000+1500);
      const p=a.play();if(p&&p.then)p.then(()=>{},()=>fin("fail"))}).catch(()=>fin("fail"))})}
function audioStop(){AX.tok++;const p=AX.playing;if(p){try{AX.el.pause()}catch(e){}p.fin("stopped")}}
// ---- what to say, by item: the line objects voice() plays ----
// {key, text, lang, r, ro, cat}: key = the clip; text/lang/r = the text-to-speech fallback; ro = the romaji on screen; cat = category of TTS-only lines
// the voices' terms ask for this credit wherever the recordings play (Drive and Plan → Settings)
const VOICE_CREDIT="Recorded voices: VOICEVOX:冥鳴ひまり (your lines), VOICEVOX:玄野武宏 (staff and the other speaker), Kokoro (English).";
const LN={
  // a word card (swap word, number) plays its recorded word; its text-to-speech reads the kana (一 alone could be read several ways)
  j:c=>c.word?{key:jaKey(c.ro,c.num?"w:":"j:"),text:c.say||c.jp,lang:"ja",ro:c.ro}:{key:"j:"+c.ro,text:c.jp,lang:"ja",ro:c.ro},
  item:c=>c.staff?{key:"k:"+c.ro,text:c.jp,lang:"ja",ro:c.ro}:LN.j(c),
  s:(ro,jp)=>({key:jaKey(ro,"s:"),text:jp,lang:"ja",r:0.8,ro}),
  w:wd=>({key:jaKey(wd.ro,"w:"),text:wd.say||wd.jp,lang:"ja",r:0.8,ro:wd.ro}),
  e:en=>({key:"e:"+sayable(en),text:sayable(en),lang:"en",r:1}),
  c:t=>({key:"c:"+t,text:t,lang:"en",r:1}),
  // a reply the learner can give: the recorded phrase when there is one
  reply:(ro,jp)=>({key:jaKey(ro,"j:"),text:jp||ro,lang:"ja",ro}),
  // a conversation/question/answer line: who = "learner" (speaker B, answers, build sentences, the introduction: the model voice, j:)
  // or "other" (speaker A, the questions you will hear: the staff voice, k:, falling back to j: for the same romaji, then text-to-speech)
  tts:(text,lang,cat,ro,who)=>{lang=lang||"ja";const L={key:null,text,lang,cat:cat||"other",ro};if(lang!=="ja"||!ro)return L;
    if(who==="other"){L.key="k:"+ro;L.alt=["j:"+ro];L.voice="other"}else{L.key="j:"+ro;L.voice="learner"}return L}};
// a word or piece: its own clip, else the same romaji recorded as a word, a piece or a phrase (so the text still matches the audio)
const capFirst=t=>t.charAt(0).toUpperCase()+t.slice(1);
function jaKey(ro,pref){const c=[pref+ro,"j:"+ro,"w:"+ro.toLowerCase(),"s:"+ro,"s:"+capFirst(ro),"j:"+ro,"j:"+capFirst(ro)];return c.find(k=>clipOf(k))||pref+ro}
// an English line may be recorded in lower case (word meanings) or as written (phrases)
function eLine(en){const l=LN.e(en);if(!clipOf(l.key)&&clipOf(l.key.toLowerCase()))l.key=l.key.toLowerCase();return l}
// Pairs ("Hai / Iie", "Kore / Sore / Are", …): the members, each with its own clips, when every member clip exists; else null
function membersOf(c){if(!c||c.staff||!/ \/ /.test(c.ro))return null;const ro=c.ro.split(" / "),en=c.en.split(" / "),jp=String(c.jp).split(" / ");if(ro.length!==en.length||ro.length<2)return null;
  const m=ro.map((r,i)=>{const jk=clipOf("w:"+r.toLowerCase())?"w:"+r.toLowerCase():"s:"+r,e=eLine(en[i]);return{ro:r,jp:jp[i]||r,en:en[i],ja:{key:jk,text:jp[i]||r,lang:"ja",ro:r},enL:e}});
  if(AX.state!=="ok")return m;return m.every(x=>clipOf(x.ja.key)&&clipOf(x.enL.key))?m:null}
// play one line: the clip if it exists and plays, else text-to-speech
// a question-and-answer pair: the question in the other speaker's voice (k:), the answer in the learner's (j:)
const qaLines=x=>({q:LN.tts(fill(x.q[1],1),"ja","qa",fill(x.q[0],0),"other"),a:LN.tts(fill(x.a[1],1),"ja","qa",fill(x.a[0],0),"learner")});
// the clip a line will actually request: its key, else the first fallback key that is recorded (k: → j:), else its key (→ text-to-speech)
function lineKey(L){if(!L||!L.key)return null;if(clipOf(L.key))return L.key;return(L.alt||[]).find(k=>clipOf(k))||L.key}
async function voice(L){if(!L)return;if(L.key&&AX.state==="loading")try{await Promise.race([AX.p,sleep(LOAD_MS)])}catch(e){}   // the index gets LOAD_MS, no more
  const k=lineKey(L);if(k&&clipOf(k)){const r=await playClip(k);if(r!=="fail")return r}
  return speak(L.text,L.lang||"ja",L.r)}
// tap to hear one item (buttons): stops whatever is playing first
let hearT=null;
function hearNow(L,btn){const my=++runId;stopSpeech();clearTimeout(hearT);document.querySelectorAll(".say.on").forEach(b=>b.classList.remove("on"));if(btn)btn.classList.add("on");
  hearT=setTimeout(()=>{if(my!==runId)return;voice(L).then(()=>btn&&btn.classList.remove("on"))},60)}
audioIndex().catch(()=>{});
