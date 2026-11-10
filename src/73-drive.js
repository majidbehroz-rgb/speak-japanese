/* ---------- DRIVE: audio only. One continuous recording per drive, so it keeps playing with the screen locked ---------- */
// DRK / DRP (clip keys and coach lines) live in 31-audio.js; Drive shares its index and file cache (AX)
let DA=null,driveAudio=null,drive=null; // DA: loaded index + files; drive: the built drive (segments, marks, url)
const dlog=()=>store.get("driveLog",{});
function driveWeekMin(){const L=dlog(),d=new Date();let s=0;for(let i=0;i<7;i++){const x=new Date(d);x.setDate(d.getDate()-i);s+=L[iso(x)]||0}return Math.round(s/60)}
async function driveLoad(names){await audioIndex();await Promise.all((names||[]).map(audioFile));DA=AX;return DA}
const dclip=k=>DA&&DA.meta.clips[k];
const ddur=k=>{const c=dclip(k);return c?c[3]*DA.meta.frame:1.5};
function drivePools(){const L=learnedIds(),S=staffKnown(),rec=c=>AX.state!=="ok"||!!(clipOf(DRK.j(c.ro))&&clipOf(DRK.e(c.en))&&clipOf(DRK.s(c.ro)));   // Drive plays recordings only: items not recorded yet wait
  const learned=deck.filter(c=>L.has(c.id)&&!c.staff&&rec(c)),staff=deck.filter(c=>S.has(c.id));
  const cw=curWeek();let fresh=deck.filter(c=>c.w===cw&&!c.staff&&!L.has(c.id)&&rec(c));if(!fresh.length&&cw<9)fresh=deck.filter(c=>c.w===cw+1&&!c.staff&&rec(c)).slice(0,halfOf(cw+1));
  return{learned,staff,fresh:fresh.slice(0,6)}}
// the script: a list of {k:clipKey} | {gap:seconds} | {mark:{c,phase,show}} entries
function driveScript(mode,minutes){const P=drivePools(),g=store.get("gap",3),out=[],target=minutes*60;let t=0,nSay=0,nUnd=0,nStaff=0,half=false;
  const clip=(k,say)=>{out.push({k,say});t+=ddur(k)},gap=s=>{s=Math.max(0.3,Math.min(20,s));out.push({gap:s});t+=s},
    // a your-turn pause (rule 5): the drive plays at Voice speed, so the silence is stretched to come out as turnMs() at that speed
    turn=k=>{out.push({gap:turnMs({key:k})/1000*driveRate(),turn:true});t+=turnMs({key:k})/1000},mark=(c,phase,show)=>out.push({mark:{c,phase,show}}),coach=x=>clip(DRK.c(x),[x,"en"]);
  const J=c=>[c.jp,"ja"],E=c=>[sayable(c.en),"en"];
  // pairs (Hai / Iie …) are asked one member at a time: member meaning → your turn → member word
  function pairItem(c,m){m.forEach(x=>{const mc={ro:x.ro,jp:x.jp,en:x.en,w:c.w};mark(mc,"Say it in Japanese","en");clip(x.enL.key,[sayable(x.en),"en"]);turn(x.ja.key);mark(mc,"Answer","both");clip(x.ja.key,[x.jp,"ja"]);gap(1.2)})}
  function sayItem(c){const m=membersOf(c);if(m){if(nSay++<2)coach(DRP.say);return pairItem(c,m)}mark(c,"Say it in Japanese","en");if(nSay++<2)coach(DRP.say);clip(DRK.e(c.en),E(c));turn(DRK.j(c.ro));
    mark(c,"Answer · repeat after her","both");clip(DRK.j(c.ro),J(c));gap(ddur(DRK.j(c.ro))+1.2);clip(DRK.j(c.ro),J(c));gap(1.2)}
  function undItem(c){mark(c,"What does it mean?","ro");if(nUnd++<2)coach(DRP.und);clip(DRK.j(c.ro),J(c));turn(DRK.e(c.en));mark(c,"It means…","both");clip(DRK.e(c.en),E(c));gap(0.5);clip(DRK.j(c.ro),J(c));gap(1.2)}
  function staffItem(c){mark(c,"Staff say… what do they want?","ro");if(nStaff++<1)coach(DRP.staff);else coach(DRP.want);clip(DRK.k(c.ro),J(c));gap(0.7);clip(DRK.k(c.ro),J(c));turn(DRK.e(c.en));
    mark(c,"It means…","both");clip(DRK.e(c.en),E(c));gap(0.6);
    if(c.reply&&!c.reply.startsWith("(")&&dclip(DRK.j(c.reply))){coach(DRP.reply);clip(DRK.j(c.reply),[c.replyJp||c.reply,"ja"]);gap(ddur(DRK.j(c.reply))*1.2+1)}else gap(1)}
  function learnItem(c){const parts=PARTS[c.ro]?partsOf(c.ro):[];
    const nw=c.word||c.staff?[]:newWordsFor(c.id,c.ro).filter(w=>dclip(DRK.w(w.ro)));
    if(nw.length){mark(c,"New words first","both");coach(DRP.words);nw.forEach(w=>{clip(DRK.e(w.en),[sayable(w.en),"en"]);gap(0.3);clip(DRK.w(w.ro),[w.say,"ja",0.8]);turn(DRK.w(w.ro));clip(DRK.w(w.ro),[w.say,"ja",0.8]);gap(0.8)})}
    mark(c,"New: listen","both");coach(DRP.newp);clip(DRK.e(c.en),E(c));gap(0.4);clip(DRK.j(c.ro),J(c));gap(0.8);
    if(parts.length>1||(parts.length===1&&/sound it out/.test(parts[0][2]))){mark(c,"Piece by piece","both");coach(DRP.pieces);
      parts.forEach(x=>{if(!/sound it out|the whole phrase/.test(x[2])){clip(DRK.e(x[2]),[sayable(x[2]),"en"]);gap(0.3)}clip(DRK.s(x[0]),[x[1]||c.jp,"ja",0.8]);turn(DRK.s(x[0]));clip(DRK.s(x[0]),[x[1]||c.jp,"ja",0.8]);turn(DRK.s(x[0]))});
      mark(c,"All together, slowly","both");coach(DRP.slow)}
    else{mark(c,"Slowly","both")}
    clip(DRK.s(c.ro),[c.jp,"ja",0.8]);turn(DRK.s(c.ro));mark(c,"Normal speed","both");coach(DRP.normal);clip(DRK.j(c.ro),J(c));turn(DRK.j(c.ro));
    {const m=membersOf(c);if(m){mark(c,"Now from the English","en");coach(DRP.fromEn);pairItem(c,m)}else{mark(c,"Now from the English","en");coach(DRP.fromEn);clip(DRK.e(c.en),E(c));turn(DRK.j(c.ro));mark(c,"Answer","both");clip(DRK.j(c.ro),J(c));gap(1)}}
    mark(c,"What does it mean?","ro");coach(DRP.mean);clip(DRK.j(c.ro),J(c));turn(DRK.e(c.en));mark(c,"It means…","both");clip(DRK.e(c.en),E(c));gap(1.5)}
  mark(null,"Starting","none");coach(DRP.intro);gap(0.6);
  let review=P.learned.slice();const boxes=store.get("boxes",{}),cw=curWeek();
  if(mode==="preview"||!review.length){if(P.fresh.length){coach(DRP.preview);gap(0.5);P.fresh.forEach(c=>{if(t<target*0.8)learnItem(c)});review=review.concat(P.fresh)}}
  if(!review.length)review=deck.filter(c=>c.w===0&&!c.staff).slice(0,halfOf(0));
  if(t<target){coach(DRP.review);gap(0.5)}
  const SR=srsAll(),T=todayIso();const weight=c=>(SR[c.id]&&SR[c.id].due<=T?3:1)*(c.w===cw?3:c.w>=cw-1?2:1)*(1+Math.max(0,3-(boxes[c.id]||0)))*(P.fresh.includes(c)?2:1);
  let bag=[],last=null,staffBag=shuffle(P.staff),k=0;
  const pick=()=>{if(!bag.length){bag=[];review.forEach(c=>{const n=Math.min(4,Math.round(weight(c)/2));for(let i=0;i<Math.max(1,n);i++)bag.push(c)});bag=shuffle(bag)}
    let i=bag.findIndex(c=>c!==last);if(i<0)i=0;return bag.splice(i,1)[0]};
  while(t<target-20){k++;
    if(!half&&t>target/2){coach(DRP.half);gap(0.5);half=true}
    if(staffBag.length&&k%5===0){staffItem(staffBag.pop());continue}
    const c=pick();last=c;(Math.random()<0.6?sayItem:undItem)(c)}
  mark(null,"Done","none");coach(DRP.end);gap(1);return out}
// (a clip that is missing, or past the end of an old copy of its sprite, is left out)
// stitch the clips into one MP3 (constant-bitrate frames, so they join cleanly) and time-stamp each step
async function driveBuild(mode,minutes){
  await driveLoad();const files=new Set();
  const script=driveScript(mode,minutes);script.forEach(s=>{if(s.k){const c=dclip(s.k);if(c)files.add(c[0])}});await driveLoad([...files]);
  const parts=[],marks=[],F=DA.meta.frame,sil=DA.sil;let frames=0;
  for(const s of script){if(s.mark){marks.push(Object.assign({t:frames*F},s.mark));continue}
    if(s.k){const c=dclip(s.k);if(!c||c[1]+c[2]>DA.files[c[0]].byteLength)continue;parts.push(new Uint8Array(DA.files[c[0]],c[1],c[2]));frames+=c[3];continue}
    const n=Math.round(s.gap/F);if(n<1)continue;const u=new Uint8Array(n*sil.length);for(let i=0;i<n;i++)u.set(sil,i*sil.length);parts.push(u);frames+=n}
  const url=URL.createObjectURL(new Blob(parts,{type:"audio/mpeg"}));
  return{mode,minutes,url,marks,total:frames*F,script}}
function driveRate(){return vrate}
function driveEl(){if(driveAudio)return driveAudio;const a=driveAudio=document.createElement("audio");a.preload="auto";a.setAttribute("playsinline","");try{a.preservesPitch=true;a.webkitPreservesPitch=true}catch(e){}
  let lastT=0;a.addEventListener("timeupdate",()=>{const d=a.currentTime-lastT;lastT=a.currentTime;if(d>0&&d<3){const L=driveMem||dlog(),k=todayIso();L[k]=Math.round(((L[k]||0)+d)*10)/10;driveMem=L;driveLogAcc+=d;if(driveLogAcc>15){driveLogAcc=0;store.set("driveLog",L)}}drawDrive()});
  a.addEventListener("seeked",()=>{lastT=a.currentTime});
  a.addEventListener("play",()=>{lastT=a.currentTime;drawDrive();msState("playing")});a.addEventListener("pause",()=>{if(driveMem)store.set("driveLog",driveMem);drawDrive();msState("paused")});
  a.addEventListener("ended",()=>{if(driveMem)store.set("driveLog",driveMem);drawDrive(true)});
  a.addEventListener("error",()=>{if(drive&&a.src)showError(new Error("Drive audio couldn't play ("+(a.error&&a.error.code)+")"),"drive")});
  document.body.appendChild(a);return a}
let driveLogAcc=0,driveMem=null;
function msState(s){try{navigator.mediaSession.playbackState=s}catch(e){}}
function driveMarkAt(t){if(!drive)return-1;let i=-1;for(let j=0;j<drive.marks.length;j++){if(drive.marks[j].t<=t+0.05)i=j;else break}return i}
function driveItemStarts(){const out=[];let prev=undefined;(drive?drive.marks:[]).forEach((m,i)=>{if(m.c!==prev){out.push(m.t);prev=m.c}});return out}
function driveSkip(dir){const a=driveEl();if(!drive)return;const st=driveItemStarts(),t=a.currentTime;let i=st.findIndex(x=>x>t+0.3);if(i<0)i=st.length;
  if(dir>0){a.currentTime=i<st.length?st[i]:Math.max(0,drive.total-0.5)}else{let cur=i-1;if(cur>=0&&t-st[cur]<2.5)cur--;a.currentTime=Math.max(0,cur>=0?st[cur]:0)}drawDrive()}
function driveMedia(){if(!("mediaSession" in navigator))return;const ms=navigator.mediaSession;
  try{ms.metadata=new MediaMetadata({title:drive.mode==="preview"?"Preview + review":"Review · "+drive.minutes+" min",artist:"Speak Japanese · Drive",album:"Week "+(curWeek()+1),artwork:[{src:DRIVE_ICON,sizes:"180x180",type:"image/png"}]})}catch(e){}
  const a=driveEl(),H=(n,f)=>{try{ms.setActionHandler(n,f)}catch(e){}};
  H("play",()=>a.play());H("pause",()=>a.pause());H("nexttrack",()=>driveSkip(1));H("previoustrack",()=>driveSkip(-1));
  H("seekbackward",d=>{a.currentTime=Math.max(0,a.currentTime-((d&&d.seekOffset)||10))});H("seekforward",d=>{a.currentTime=Math.min(drive.total,a.currentTime+((d&&d.seekOffset)||10))});
  H("seekto",d=>{if(d&&d.seekTime!=null)a.currentTime=d.seekTime})}
const mmss=s=>{s=Math.max(0,Math.round(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
function drawDrive(ended){const st=document.getElementById("dv-stage");if(!st)return;const a=driveAudio,play=document.getElementById("dv-play");
  const playing=a&&!a.paused&&!a.ended&&drive;if(play)play.textContent=playing?"Pause":drive&&a&&a.currentTime>0&&!a.ended?"Resume":"▶︎ Start drive";
  if(!drive){st.innerHTML=`<div class="muted">Press Start, then put the phone away.</div>`;return}
  const i=driveMarkAt(a?a.currentTime:0),m=drive.marks[i]||{c:null,phase:"",show:"none"},c=m.c;
  const hide=store.get("hideText",false)&&playing;
  st.innerHTML=`<div class="phase">${ended||(a&&a.ended)?"All done":esc(m.phase||"")}</div>${c&&!hide?`${m.show!=="ro"?`<div class="en">${hl(c.en)}</div>`:""}${m.show!=="en"?`<div class="ro">${hl(c.ro)}</div><div class="jpw">${hl(c.jp)}</div>`:`<div style="opacity:.25;font-size:1.5rem">・・・</div>`}`:c?`<div class="muted">Just listen</div>`:""}`;
  const bar=document.getElementById("dv-bar");if(bar&&a)bar.style.width=(Math.min(1,(a.currentTime||0)/drive.total)*100)+"%";
  const tm=document.getElementById("dv-time");if(tm&&a)tm.textContent=mmss(a.currentTime)+" / "+mmss(drive.total);
  try{if(a&&"mediaSession" in navigator&&navigator.mediaSession.setPositionState&&drive.total>0)navigator.mediaSession.setPositionState({duration:drive.total,playbackRate:a.playbackRate||1,position:Math.min(drive.total,a.currentTime||0)})}catch(e){}}
async function driveStart(){const a=driveEl();const mode=store.get("dmode","review"),minutes=store.get("dlen",20);
  if(drive&&a.src&&!a.ended&&a.currentTime>0&&drive.mode===mode&&drive.minutes===minutes){a.playbackRate=driveRate();return a.play()}
  // unlock audio inside the tap (iOS) before the async build
  try{a.src=DRIVE_SILENT;a.play().catch(()=>{})}catch(e){}
  const msg=document.getElementById("dv-msg");if(msg)msg.textContent="Getting the audio ready…";
  try{stopSpeech();const d=await driveBuild(mode,minutes);if(drive&&drive.url)try{URL.revokeObjectURL(drive.url)}catch(e){}drive=d;
    a.src=d.url;a.defaultPlaybackRate=a.playbackRate=driveRate();driveMedia();await a.play();a.playbackRate=driveRate();if(msg)msg.textContent="";drawDrive()}
  catch(e){if(msg)msg.textContent="Recorded audio isn't available here, so using the phone's voice. Keep the screen on.";driveFallback(mode,minutes)}}
// fallback: the phone's own voice (stops when the screen locks, so keep it awake)
let fbOn=false;
async function driveFallback(mode,minutes){const my=++runId;fbOn=true;try{wake=await navigator.wakeLock.request("screen")}catch(e){}
  const script=driveScript(mode,minutes),marks=[];drive={mode,minutes,marks:[],total:0,fallback:true};let cur=null;
  for(const s of script){if(my!==runId)return;if(s.mark){cur=s.mark;drawFallback(cur);continue}
    if(s.k&&s.say){await speak(s.say[0],s.say[1],s.say[2]||1)}else if(s.gap)await sleep(s.gap*1000)}
  fbOn=false;drawFallback({phase:"All done"})}
function drawFallback(m){const st=document.getElementById("dv-stage");if(!st)return;const c=m.c;st.innerHTML=`<div class="phase">${esc(m.phase||"")}</div>${c?`${m.show!=="ro"?`<div class="en">${hl(c.en)}</div>`:""}${m.show!=="en"?`<div class="ro">${hl(c.ro)}</div>`:""}`:""}`}
function driveStop(){if(driveAudio&&!driveAudio.paused)driveAudio.pause()}
function renderDrive(){const el=document.getElementById("v-drive");const mode=store.get("dmode","review"),len=store.get("dlen",20),gap=store.get("gap",3),P=drivePools();
  const empty=mode==="review"&&!P.learned.length&&!P.staff.length;   // nothing learned: a note, not unlearned audio (preview is a separate, labelled choice)
  const fresh=P.fresh.length?P.fresh.map(c=>c.ro).slice(0,3).join(", ")+(P.fresh.length>3?"…":""):"";
  el.innerHTML=`<div class="wrap">${practiceNav()}
   <div><h2>Drive mode 🚗</h2><p class="muted small">Audio only, hands-free. It keeps playing with the screen locked, and the play/skip buttons on your lock screen, headphones and car work. Say your answers out loud.</p></div>
   ${empty?nothingYet()+`<p class="small muted" style="margin:0">Or peek ahead: choose <b>Preview the next lesson</b> under Options.</p>`:`   <div class="panel stage" id="dv-stage" style="min-height:180px"></div>
   <div class="bar"><i id="dv-bar"></i></div>
   <div class="row" style="justify-content:space-between"><span class="small muted" id="dv-time" style="font-variant-numeric:tabular-nums"></span><span class="small muted">${driveWeekMin()} min in the car this week</span></div>
   <div class="row" style="justify-content:center"><button class="btn" id="dv-prev" aria-label="Previous phrase" style="min-width:64px;min-height:56px">⏮</button><button class="btn primary" id="dv-play" style="min-width:170px;min-height:56px;font-size:1.1rem">▶︎ Start drive</button><button class="btn" id="dv-next" aria-label="Next phrase" style="min-width:64px;min-height:56px">⏭</button></div>
   <p class="small" id="dv-msg" style="text-align:center;margin:0;min-height:1.2em"></p>
`}
   <details class="panel small" ${empty?"open":""}><summary>Options: what to play, length, time to answer, voice speed</summary>
   <div class="seg" role="group" aria-label="What to play"><button data-dmode="review" aria-pressed="${mode==="review"}">Review what I've learned (${P.learned.length+P.staff.length})</button><button data-dmode="preview" aria-pressed="${mode==="preview"}">Preview the next lesson${P.fresh.length?" ("+P.fresh.length+")":""}</button></div>
   ${mode==="review"&&!P.learned.length?`<p class="small muted" style="margin:0">Nothing learned yet: review has nothing to play.</p>`:""}
   ${mode==="preview"&&fresh?`<p class="small muted" style="margin:0">New: ${esc(fresh)}. Then a review mix. It doesn't tick off lessons; it gets you a head start.</p>`:""}
   <div class="row"><span class="small">Length</span><div class="seg" role="group" aria-label="Length">${[10,20,30].map(n=>`<button data-dlen="${n}" aria-pressed="${len===n}">${n} min</button>`).join("")}</div></div>
    <div class="ctl"><label class="small" for="dv-rate">Voice speed</label><input id="dv-rate" type="range" min="0.7" max="1.2" step="0.05" value="${vrate}"><span class="small" id="dv-ratev" style="font-variant-numeric:tabular-nums">${Math.round(vrate*100)}%</span></div>
    <div class="ctl"><label class="small" for="dv-gap">Time to answer</label><input id="dv-gap" type="range" min="1" max="8" step="1" value="${gap}"><span class="small" id="dv-gapv" style="font-variant-numeric:tabular-nums">${gap}s</span></div>
    <p class="small muted" style="margin:0" id="dv-gapnote">Time to answer is how long each pause for your answer lasts. A new setting applies the next time you press Start.</p>
   <label class="row small"><input type="checkbox" id="dv-hide" ${store.get("hideText",false)?"checked":""}> Hide the text while playing</label></details>
   <details class="nosound small"><summary>Tips for the car and the lock screen</summary><div class="note"><ul>
    <li>Press Start before you set off, then lock the phone. Use your car's or headphones' play/pause and skip buttons, or the lock screen.</li>
    <li>⏭ skips to the next phrase; ⏮ goes back to the start of this one.</li>
    <li>If the sound stops when you lock the phone, open this page in Safari or Chrome instead of inside another app, and press Start there.</li>
    <li>Silent switch: recorded audio may follow the ring/silent switch on iPhone; flip it to ring if you hear nothing.</li>
    <li>Answer out loud during the pauses. Talking is what makes it stick.</li></ul></div></details>
   <p class="small muted" style="margin:0">${VOICE_CREDIT}</p>
   </div>`;
  bindPracticeNav(el);
  el.querySelectorAll("[data-dmode]").forEach(b=>b.onclick=()=>{driveStop();store.set("dmode",b.dataset.dmode);renderDrive()});
  el.querySelectorAll("[data-dlen]").forEach(b=>b.onclick=()=>{driveStop();store.set("dlen",+b.dataset.dlen);renderDrive()});
  el.querySelector("#dv-rate").oninput=e=>{setVrate(+e.target.value);el.querySelector("#dv-ratev").textContent=Math.round(vrate*100)+"%";if(driveAudio)driveAudio.playbackRate=driveRate()};
  el.querySelector("#dv-gap").oninput=e=>{store.set("gap",+e.target.value);el.querySelector("#dv-gapv").textContent=e.target.value+"s"};
  el.querySelector("#dv-hide").onchange=e=>{store.set("hideText",e.target.checked);drawDrive()};
  if(empty){bindLinks(el);el.querySelectorAll("[data-dmode]").forEach(b=>b.onclick=()=>{driveStop();store.set("dmode",b.dataset.dmode);renderDrive()});return}
  el.querySelector("#dv-play").onclick=safe("drive",()=>{const a=driveAudio;if(fbOn){runId++;fbOn=false;stopSpeech();drive=null;drawDrive();return}if(a&&!a.paused&&drive)a.pause();else driveStart()});
  el.querySelector("#dv-prev").onclick=()=>driveSkip(-1);el.querySelector("#dv-next").onclick=()=>driveSkip(1);
  drawDrive();driveLoad().catch(()=>{})}
const DRIVE_SILENT="data:audio/mpeg;base64,//NIxAAAAANIAAAAAExBTUVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NIxHwAAANIAAAAAFVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NIxHwAAANIAAAAAFVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NIxHwAAANIAAAAAFVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NIxHwAAANIAAAAAFVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NIxHwAAANIAAAAAFVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NIxHwAAANIAAAAAFVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NIxHwAAANIAAAAAFVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NIxHwAAANIAAAAAFVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NIxHwAAANIAAAAAFVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NIxHwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
const DRIVE_ICON="data:image/png;base64,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";

