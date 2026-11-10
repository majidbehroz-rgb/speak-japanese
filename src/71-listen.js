/* ---------- LISTEN ---------- */
let listenIdx=0,listenItems=[],listenOnce=false,onListenDone=null;
function buildListen(){if(listenSel.ids)return listenSel.ids.map(byId).filter(Boolean);if(listenSel.w==="all"){const L=learnedIds();const d=deck.filter(c=>L.has(c.id));return d.length?d:deck.slice()}const w=+listenSel.w,P=deck.filter(c=>c.w===w),h=Math.ceil(P.length/2);return listenSel.half==="a"?P.slice(0,h):listenSel.half==="b"?P.slice(h):P}
let listenSeed=0;function listenOrder(items){if(!store.get("lshuffle",true))return items;listenSeed++;return shuffle(items)}
function renderListen(){const el=document.getElementById("v-listen");listenItems=listenOrder(buildListen());if(listenIdx>=listenItems.length)listenIdx=0;listenOnce=false;onListenDone=null;
  const gap=store.get("gap",3),hide=store.get("hideText",false),dir=store.get("ldir","say");
  el.innerHTML=`<div class="wrap">${practiceNav()}
   <div><h2>Listen and repeat</h2><p class="muted small">Hands-free with the screen on. In the car or with the phone locked, use <button class="link" data-pm="drive">Drive 🚗</button>.</p></div>
   <div class="seg" role="group" aria-label="Direction"><button id="ld-say" aria-pressed="${dir==="say"}">Say it (English → Japanese)</button><button id="ld-und" aria-pressed="${dir==="und"}">Understand it (Japanese → English)</button></div>
   <div class="panel"><div class="row">
     <label class="small" for="ls-w">Phrases</label><select id="ls-w"><option value="all">All weeks (${deck.length})</option>${WEEKS.map((w,i)=>`<option value="${i}">W${i+1} · ${esc(w.title)}</option>`).join("")}</select>
     <select id="ls-h" aria-label="Which part" ${listenSel.w==="all"?"disabled":""}><option value="all">All of week</option><option value="a">First half</option><option value="b">Second half</option></select></div>
    <div class="ctl"><label class="small" for="ls-gap">Time to answer</label><input id="ls-gap" type="range" min="1" max="8" step="1" value="${gap}"><span class="small" id="ls-gapv" style="font-variant-numeric:tabular-nums">${gap}s</span></div>
    <div class="ctl"><label class="small" for="ls-rate">Speed</label><input id="ls-rate" type="range" min="0.4" max="1.1" step="0.05" value="${rate}"><span class="small" id="ls-ratev" style="font-variant-numeric:tabular-nums">${Math.round(rate*100)}%</span></div>
    <label class="row small"><input type="checkbox" id="ls-hide" ${hide?"checked":""}> Hide the text (audio only)</label>
    <label class="row small"><input type="checkbox" id="ls-shuf" ${store.get("lshuffle",true)?"checked":""}> Shuffle the order (a new order every time)</label></div>
   <div class="panel stage" id="ls-stage"></div>
   <div class="bar"><i id="ls-bar"></i></div>
   <div class="row" style="justify-content:center"><button class="btn" id="ls-prev" aria-label="Previous">◀︎</button><button class="btn primary" id="ls-play" style="min-width:120px">Play</button><button class="btn" id="ls-next" aria-label="Next">▶︎</button></div>
   ${NOSOUND}${VOICE_WARN}</div>`;
  bindPracticeNav(el);const sw=el.querySelector("#ls-w"),sh=el.querySelector("#ls-h");sw.value=listenSel.w;sh.value=listenSel.half;
  sw.onchange=()=>{stopAll();listenSel={w:sw.value,half:"all"};listenIdx=0;renderListen()};if(listenSel.ids){listenSel={w:String(curWeek()),half:"all"};listenItems=buildListen()}
  sh.onchange=()=>{stopAll();listenSel.half=sh.value;listenIdx=0;renderListen()};
  el.querySelector("#ld-say").onclick=()=>{stopAll();store.set("ldir","say");renderListen()};
  el.querySelector("#ld-und").onclick=()=>{stopAll();store.set("ldir","und");renderListen()};
  el.querySelector("#ls-gap").oninput=e=>{store.set("gap",+e.target.value);el.querySelector("#ls-gapv").textContent=e.target.value+"s"};
  el.querySelector("#ls-rate").oninput=e=>{rate=+e.target.value;store.set("rate2",rate);el.querySelector("#ls-ratev").textContent=Math.round(rate*100)+"%"};
  el.querySelector("#ls-hide").onchange=e=>{store.set("hideText",e.target.checked);drawStage("")};
  el.querySelector("#ls-shuf").onchange=e=>{stopAll();store.set("lshuffle",e.target.checked);listenIdx=0;renderListen()};
  el.querySelector("#ls-play").onclick=()=>listening?stopListen():startListen();
  el.querySelector("#ls-prev").onclick=()=>{listenIdx=(listenIdx-1+listenItems.length)%listenItems.length;restartIf()};
  el.querySelector("#ls-next").onclick=()=>{listenIdx=(listenIdx+1)%listenItems.length;restartIf()};
  drawStage("");renderVoiceWarn()}
function restartIf(){if(listening){stopListen();startListen()}else drawStage("")}
function drawStage(phase,showAns){const st=document.getElementById("ls-stage");if(!st)return;const c=listenItems[listenIdx];if(!c)return;const hide=store.get("hideText",false),und=store.get("ldir","say")==="und";
  const prompt=und?`<div class="ro">${hl(c.ro)}</div><div class="jpw">${hl(c.jp)}</div>`:`<div class="en">${hl(c.en)}</div>`;
  const ans=und?`<div class="en">${hl(c.en)}</div>`:`<div class="ro">${hl(c.ro)}</div><div class="jpw">${hl(c.jp)}</div>`;
  st.innerHTML=`<div class="small muted" style="font-variant-numeric:tabular-nums">${listenIdx+1} / ${listenItems.length} · W${c.w+1}</div><div class="phase">${phase||"&nbsp;"}</div>
   ${hide&&!showAns?`<div class="muted">Just listen</div>`:hide?`${prompt}<div class="ans">${ans}</div>`:`${prompt}${showAns?`<div class="ans">${ans}</div>`:`<div style="opacity:.25;font-size:1.5rem">・・・</div>`}`}`;
  const bar=document.getElementById("ls-bar");if(bar)bar.style.width=((listenIdx+1)/listenItems.length*100)+"%"}
async function startListen(){listening=true;const btn=document.getElementById("ls-play");if(btn)btn.textContent="Pause";
  const my=++runId;stopSpeech();await sleep(80);try{wake=await navigator.wakeLock.request("screen")}catch(e){}
  while(listening&&my===runId){const c=listenItems[listenIdx],gap=store.get("gap",3)*1000*groupMul(),und=store.get("ldir","say")==="und";
    if(und){drawStage("Listen");await speak(c.jp,"ja");if(my!==runId)return;
      drawStage("What did it mean?");await tsleep(gap);if(my!==runId)return;
      drawStage("Answer",true);await speak(c.en,"en",1);if(my!==runId)return;await tsleep(600);if(my!==runId)return;
      drawStage("Once more",true);await speak(c.jp,"ja");if(my!==runId)return;await tsleep(gap*0.6)}
    else{drawStage("Listen");await speak(c.en,"en",1);if(my!==runId)return;
      drawStage("Say it in Japanese");await sleep(answerMs(c.jp.length));if(my!==runId)return;
      drawStage("Answer",true);await speak(c.jp,"ja");if(my!==runId)return;await tsleep(900);if(my!==runId)return;
      drawStage("Repeat after it",true);await speak(c.jp,"ja");if(my!==runId)return;await tsleep(gap)}
    if(my!==runId)return;listenIdx=(listenIdx+1)%listenItems.length;
    if(listenIdx===0&&!listenOnce&&store.get("lshuffle",true))listenItems=shuffle(listenItems);
    if(listenOnce&&listenIdx===0){stopListen();const st=document.getElementById("ls-stage");if(st)st.querySelector(".phase").textContent="All done";if(onListenDone)onListenDone();return}}}
function stopListen(){stopAll();const btn=document.getElementById("ls-play");if(btn)btn.textContent="Play";drawStage("")}

