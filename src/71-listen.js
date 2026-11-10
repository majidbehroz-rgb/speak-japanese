/* ---------- LISTEN ---------- */
let listenIdx=0,listenItems=[],listenOnce=false,onListenDone=null;
// Practice plays only what has been learned (review records): everything so far, or one week of it. Session steps pass their own ids.
function buildListen(){if(listenSel.ids)return listenSel.ids.map(byId).filter(Boolean);if(listenSel.w==="all"&&listenSel.allDeck)return deck.slice();const L=practiceIds();return deck.filter(c=>L.has(c.id)&&(listenSel.w==="all"||c.w===+listenSel.w))}
let listenSeed=0;function listenOrder(items){if(!store.get("lshuffle",true))return items;listenSeed++;return shuffle(items)}
function renderListen(){const el=document.getElementById("v-listen");if(listenSel.ids||listenSel.half===undefined)listenSel={w:"all",half:"all"};listenItems=listenOrder(buildListen());if(listenIdx>=listenItems.length)listenIdx=0;listenOnce=false;onListenDone=null;
  const gap=store.get("gap",3),hide=store.get("hideText",false),dir=store.get("ldir","say"),L=practiceIds(),weeks=WEEKS.map((w,i)=>[i,deck.filter(c=>c.w===i&&L.has(c.id)).length]).filter(x=>x[1]);
  if(!listenItems.length&&listenSel.w==="all"){el.innerHTML=`<div class="wrap">${practiceNav()}<div><h2>Listen and repeat</h2></div>${nothingYet()}</div>`;bindPracticeNav(el);bindLinks(el);return}
  el.innerHTML=`<div class="wrap">${practiceNav()}
   <div><h2>Listen and repeat</h2><p class="muted small">${listenItems.length} things you've learned, hands-free. In the car or with the phone locked, use <button class="link" data-pm="drive">Drive 🚗</button>.</p></div>
   <div class="panel stage" id="ls-stage"></div>
   <div class="bar"><i id="ls-bar"></i></div>
   <div class="row" style="justify-content:center"><button class="btn" id="ls-prev" aria-label="Previous">◀︎</button><button class="btn primary" id="ls-play" style="min-width:120px">Play</button><button class="btn" id="ls-next" aria-label="Next">▶︎</button></div>
   <details class="panel small"><summary>Options: direction, which week, time to answer, voice speed</summary>
    <div class="seg" role="group" aria-label="Direction"><button id="ld-say" aria-pressed="${dir==="say"}">Say it (English → Japanese)</button><button id="ld-und" aria-pressed="${dir==="und"}">Understand it (Japanese → English)</button></div>
    <div class="row"><label class="small" for="ls-w">What to play</label><select id="ls-w"><option value="all">Everything learned so far (${L.size?deck.filter(c=>L.has(c.id)).length:0})</option>${weeks.map(([i,n])=>`<option value="${i}">W${i+1} · ${esc(WEEKS[i].title)} (${n})</option>`).join("")}</select></div>
    <div class="ctl"><label class="small" for="ls-gap">Time to answer</label><input id="ls-gap" type="range" min="1" max="8" step="1" value="${gap}"><span class="small" id="ls-gapv" style="font-variant-numeric:tabular-nums">${gap}s</span></div>
    <div class="ctl"><label class="small" for="ls-rate">Voice speed</label><input id="ls-rate" type="range" min="0.7" max="1.2" step="0.05" value="${vrate}"><span class="small" id="ls-ratev" style="font-variant-numeric:tabular-nums">${Math.round(vrate*100)}%</span></div>
    <label class="row small"><input type="checkbox" id="ls-hide" ${hide?"checked":""}> Hide the text (audio only)</label>
    <label class="row small"><input type="checkbox" id="ls-shuf" ${store.get("lshuffle",true)?"checked":""}> Shuffle the order (a new order every time)</label></details>
   ${nosound()}${VOICE_WARN}</div>`;
  bindPracticeNav(el);const sw=el.querySelector("#ls-w");sw.value=listenSel.w;
  sw.onchange=()=>{stopAll();listenSel={w:sw.value,half:"all"};listenIdx=0;renderListen()};
  el.querySelector("#ld-say").onclick=()=>{stopAll();store.set("ldir","say");renderListen()};
  el.querySelector("#ld-und").onclick=()=>{stopAll();store.set("ldir","und");renderListen()};
  el.querySelector("#ls-gap").oninput=e=>{store.set("gap",+e.target.value);el.querySelector("#ls-gapv").textContent=e.target.value+"s"};
  el.querySelector("#ls-rate").oninput=e=>{setVrate(+e.target.value);el.querySelector("#ls-ratev").textContent=Math.round(vrate*100)+"%"};
  el.querySelector("#ls-hide").onchange=e=>{store.set("hideText",e.target.checked);drawStage("")};
  el.querySelector("#ls-shuf").onchange=e=>{stopAll();store.set("lshuffle",e.target.checked);listenIdx=0;renderListen()};
  el.querySelector("#ls-play").onclick=()=>listening?stopListen():startListen();
  el.querySelector("#ls-prev").onclick=()=>{listenIdx=(listenIdx-1+listenItems.length)%listenItems.length;restartIf()};
  el.querySelector("#ls-next").onclick=()=>{listenIdx=(listenIdx+1)%listenItems.length;restartIf()};
  drawStage("");renderVoiceWarn()}
// learned = phrases and words with a review record, plus staff phrases with one (Practice never offers unlearned items)
function practiceIds(){return new Set([...learnedIds(),...staffKnown()])}
function nothingYet(){return`<div class="panel"><p style="margin:0">Nothing learned yet. Start with today's lesson on <button class="link" data-gotab="today">Today</button>; everything you learn shows up here to practise.</p></div>`}
function restartIf(){if(listening){stopListen();startListen()}else drawStage("")}
function drawStage(phase,showAns){const st=document.getElementById("ls-stage");if(!st)return;const c=listenItems[listenIdx];if(!c)return;const hide=store.get("hideText",false),und=store.get("ldir","say")==="und";
  const prompt=und?`<div class="ro">${hl(c.ro)}</div><div class="jpw">${hl(c.jp)}</div>`:`<div class="en">${hl(c.en)}</div>`;
  const ans=und?`<div class="en">${hl(c.en)}</div>`:`<div class="ro">${hl(c.ro)}</div><div class="jpw">${hl(c.jp)}</div>`;
  st.innerHTML=`<div class="small muted" style="font-variant-numeric:tabular-nums">${listenIdx+1} / ${listenItems.length} · W${c.w+1}</div><div class="phase">${phase||"&nbsp;"}</div>
   ${hide&&!showAns?`<div class="muted">Just listen</div>`:hide?`${prompt}<div class="ans">${ans}</div>`:`${prompt}${showAns?`<div class="ans">${ans}</div>`:`<div style="opacity:.25;font-size:1.5rem">・・・</div>`}`}`;
  const bar=document.getElementById("ls-bar");if(bar)bar.style.width=((listenIdx+1)/listenItems.length*100)+"%"}
async function startListen(){listening=true;const btn=document.getElementById("ls-play");if(btn)btn.textContent="Pause";
  const my=++runId;stopSpeech();await sleep(80);try{wake=await navigator.wakeLock.request("screen")}catch(e){}
  while(listening&&my===runId){const c=listenItems[listenIdx],und=store.get("ldir","say")==="und",J=LN.item(c),E=eLine(c.en);
    if(und){drawStage("Listen");await voice(J);if(my!==runId)return;
      drawStage("What did it mean?");await yourTurn(E);if(my!==runId)return;
      drawStage("Answer",true);await voice(E);if(my!==runId)return;await tsleep(600);if(my!==runId)return;
      drawStage("Once more",true);await voice(J);if(my!==runId)return;await tsleep(1200)}
    else{drawStage("Listen");await voice(E);if(my!==runId)return;
      drawStage("Say it in Japanese");await yourTurn(J);if(my!==runId)return;
      drawStage("Answer",true);await voice(J);if(my!==runId)return;await tsleep(900);if(my!==runId)return;
      drawStage("Repeat after it",true);await voice(J);if(my!==runId)return;await yourTurn(J)}
    if(my!==runId)return;listenIdx=(listenIdx+1)%listenItems.length;
    if(listenIdx===0&&!listenOnce&&store.get("lshuffle",true))listenItems=shuffle(listenItems);
    if(listenOnce&&listenIdx===0){stopListen();const st=document.getElementById("ls-stage");if(st)st.querySelector(".phase").textContent="All done";if(onListenDone)onListenDone();return}}}
function stopListen(){stopAll();const btn=document.getElementById("ls-play");if(btn)btn.textContent="Play";drawStage("")}

