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
const AX={state:"idle",meta:null,files:{},urls:{},sil:null,el:null,tok:0,playing:null,p:null};
function audioIndex(){if(AX.p)return AX.p;AX.state="loading";
  AX.p=fetch(AUDIO_BASE+"index.json",{cache:"force-cache"}).then(r=>{if(!r.ok)throw new Error("audio index "+r.status);return r.json()}).then(meta=>{
    const b=atob(meta.silence),sil=new Uint8Array(b.length);for(let i=0;i<b.length;i++)sil[i]=b.charCodeAt(i);AX.meta=meta;AX.sil=sil;AX.state="ok";return AX})
   .catch(e=>{AX.state="fail";throw e});AX.p.catch(()=>{});return AX.p}
const audioOK=()=>AX.state==="ok"||AX.state==="loading";             // recorded voices expected (the sound check and "No sound?" boxes are dropped)
const clipOf=k=>AX.meta&&k?AX.meta.clips[k]:null;
const clipSec=k=>{const c=clipOf(k);return c?c[3]*AX.meta.frame:0};
const filePending={};
function audioFile(name){if(AX.files[name])return Promise.resolve(AX.files[name]);if(filePending[name])return filePending[name];
  filePending[name]=fetch(AUDIO_BASE+name,{cache:"force-cache"}).then(r=>{if(!r.ok)throw new Error(name+" "+r.status);return r.arrayBuffer()}).then(b=>{AX.files[name]=b;return b}).finally(()=>{delete filePending[name]});return filePending[name]}
// fetch a week's sprite and the coach file ahead of time (at Start), so the lesson has no gaps
function audioPreload(w){return audioIndex().then(()=>Promise.all([audioFile("coach.mp3"),audioFile("w"+(Math.max(0,Math.min(9,w))+1)+".mp3")])).catch(()=>null)}
async function clipUrl(k){if(AX.urls[k])return AX.urls[k];const c=clipOf(k);if(!c)throw new Error("no clip "+k);const buf=await audioFile(c[0]);
  return AX.urls[k]=URL.createObjectURL(new Blob([new Uint8Array(buf,c[1],c[2])],{type:"audio/mpeg"}))}
// Voice speed: 100% = the recordings as recorded (70–120%); text-to-speech uses its old default pace (0.75) times the same setting
let vrate=Math.max(0.7,Math.min(1.2,+store.get("vrate",1)||1));
function setVrate(v){vrate=Math.max(0.7,Math.min(1.2,+v||1));store.set("vrate",vrate);rate=0.75*vrate;if(AX.el)try{AX.el.playbackRate=vrate}catch(e){}}
function audioEl(){if(AX.el)return AX.el;const a=AX.el=document.createElement("audio");a.preload="auto";a.setAttribute("playsinline","");try{a.preservesPitch=true;a.webkitPreservesPitch=true}catch(e){}
  try{if(navigator.audioSession)navigator.audioSession.type="playback"}catch(e){}document.body.appendChild(a);return a}
// iOS: the first play() must happen inside a tap; a silent frame played on the first tap unlocks the element for later clips
let audioUnlocked=false;
function audioUnlock(){if(audioUnlocked)return;audioUnlocked=true;try{const a=audioEl();a.src="data:audio/mpeg;base64,"+((AX.meta&&AX.meta.silence)||"//NIxAAAAANIAAAAAExBTUUzLjEwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");const p=a.play();if(p&&p.catch)p.catch(()=>{})}catch(e){}}
document.addEventListener("click",audioUnlock,true);
// play one clip; resolves "ok" when it ended, "stopped" when audioStop() cut it, "fail" when it could not play (caller falls back to TTS)
function playClip(k){const my=++AX.tok;if(AX.playing)AX.playing.fin("stopped");
  return new Promise(res=>{let done=false,t=null;const a=audioEl();
    const fin=v=>{if(done)return;done=true;clearTimeout(t);a.onended=a.onerror=null;if(AX.playing&&AX.playing.fin===fin)AX.playing=null;res(v)};AX.playing={key:k,fin};
    clipUrl(k).then(url=>{if(done||my!==AX.tok)return fin("stopped");
      a.onended=()=>fin("ok");a.onerror=()=>fin("fail");a.dataset.clip=k;a.src=url;a.defaultPlaybackRate=vrate;a.playbackRate=vrate;
      // safety net if "ended" never fires: the clip's length at this speed, plus a margin
      t=setTimeout(()=>{if(!a.paused&&!a.ended&&a.currentTime<clipSec(k)-0.05){t=setTimeout(()=>fin("ok"),3000);return}fin("ok")},(clipSec(k)/vrate)*1000+1500);
      const p=a.play();if(p&&p.then)p.then(()=>{},()=>fin("fail"))}).catch(()=>fin("fail"))})}
function audioStop(){AX.tok++;const p=AX.playing;if(p){try{AX.el.pause()}catch(e){}p.fin("stopped")}}
// ---- what to say, by item: the line objects voice() plays ----
// {key, text, lang, r, ro, cat}: key = the clip; text/lang/r = the text-to-speech fallback; ro = the romaji on screen; cat = category of TTS-only lines
const LN={
  j:c=>({key:"j:"+c.ro,text:c.jp,lang:"ja",ro:c.ro}),
  item:c=>c.staff?{key:"k:"+c.ro,text:c.jp,lang:"ja",ro:c.ro}:{key:"j:"+c.ro,text:c.jp,lang:"ja",ro:c.ro},
  s:(ro,jp)=>({key:jaKey(ro,"s:"),text:jp,lang:"ja",r:0.8,ro}),
  w:wd=>({key:jaKey(wd.ro,"w:"),text:wd.say||wd.jp,lang:"ja",r:0.8,ro:wd.ro}),
  e:en=>({key:"e:"+sayable(en),text:sayable(en),lang:"en",r:1}),
  c:t=>({key:"c:"+t,text:t,lang:"en",r:1}),
  // a reply the learner can give: the recorded phrase when there is one
  reply:(ro,jp)=>({key:jaKey(ro,"j:"),text:jp||ro,lang:"ja",ro}),
  tts:(text,lang,cat,ro)=>({key:null,text,lang:lang||"ja",cat:cat||"other",ro})};
// a word or piece: its own clip, else the same romaji recorded as a word, a piece or a phrase (so the text still matches the audio)
const capFirst=t=>t.charAt(0).toUpperCase()+t.slice(1);
function jaKey(ro,pref){const c=[pref+ro,"w:"+ro.toLowerCase(),"s:"+ro,"s:"+capFirst(ro),"j:"+ro,"j:"+capFirst(ro)];return c.find(k=>clipOf(k))||pref+ro}
// an English line may be recorded in lower case (word meanings) or as written (phrases)
function eLine(en){const l=LN.e(en);if(!clipOf(l.key)&&clipOf(l.key.toLowerCase()))l.key=l.key.toLowerCase();return l}
// Pairs ("Hai / Iie", "Kore / Sore / Are", …): the members, each with its own clips, when every member clip exists; else null
function membersOf(c){if(!c||c.staff||!/ \/ /.test(c.ro))return null;const ro=c.ro.split(" / "),en=c.en.split(" / "),jp=String(c.jp).split(" / ");if(ro.length!==en.length||ro.length<2)return null;
  const m=ro.map((r,i)=>{const jk=clipOf("w:"+r.toLowerCase())?"w:"+r.toLowerCase():"s:"+r,e=eLine(en[i]);return{ro:r,jp:jp[i]||r,en:en[i],ja:{key:jk,text:jp[i]||r,lang:"ja",ro:r},enL:e}});
  if(AX.state!=="ok")return m;return m.every(x=>clipOf(x.ja.key)&&clipOf(x.enL.key))?m:null}
// play one line: the clip if it exists and plays, else text-to-speech
async function voice(L){if(!L)return;if(L.key&&AX.state==="loading")try{await AX.p}catch(e){}
  if(L.key&&clipOf(L.key)){const r=await playClip(L.key);if(r!=="fail")return r}
  return speak(L.text,L.lang||"ja",L.r)}
// tap to hear one item (buttons): stops whatever is playing first
let hearT=null;
function hearNow(L,btn){const my=++runId;stopSpeech();clearTimeout(hearT);document.querySelectorAll(".say.on").forEach(b=>b.classList.remove("on"));if(btn)btn.classList.add("on");
  hearT=setTimeout(()=>{if(my!==runId)return;voice(L).then(()=>btn&&btn.classList.remove("on"))},60)}
audioIndex().catch(()=>{});
