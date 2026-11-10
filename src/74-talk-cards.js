/* ---------- TALK ---------- */
let talkItems=[],talkIdx=0,buildQ=null,buildRev=false,talkOnce=false,onTalkDone=null;
function buildTalkItems(){const k=knownTokens(player&&player.learnIds),ok=q=>lineKnown(q.q[0],k)&&lineKnown(q.a[0],k);const all=QA.filter(q=>talk.only?q.w===talk.max:q.w<=talk.max);const it=all.filter(ok);return shuffle(it.length?it:QA.filter(q=>q.w<=talk.max&&ok(q)).concat(it.length?[]:all).slice(0,Math.max(1,all.length)))}
function buildItem(){let pats=WEEKS.flatMap(w=>w.patterns||[]).filter(p=>talk.only?p.w===talk.max:p.w<=talk.max);
  if(!pats.length)pats=WEEKS.flatMap(w=>w.patterns||[]).filter(p=>p.w<=talk.max);if(!pats.length)return null;const p=pick(pats),K=knownWords();
  const choose=slot=>{const known=BANK[slot].filter(b=>K.has(b[0]));if(known.length)return pick(known);const intro=swapWords(p.w).filter(s=>s.slot===slot).map(s=>[s.ro,s.jp,s.en]);return pick(intro.length?intro:BANK[slot].slice(0,4))};
  const x=choose(p.x),y=p.y?choose(p.y):null;
  const sub=(s,k)=>s.replace("{x}","["+x[k]+"]").replace("{y}",y?"["+y[k]+"]":"");
  return{en:sub(p.en,2),ro:sub(p.ro,0),jp:sub(p.jp,1),w:p.w}}
function renderTalk(){const el=document.getElementById("v-talk"),m=talk.mode;talkOnce=false;onTalkDone=null;
  const scopeUI=`<div class="row"><div class="chips" role="group" aria-label="Up to week" style="flex:1;min-width:0">${WEEKS.map((w,i)=>`<button class="chip" data-tw="${i}" aria-pressed="${i===talk.max}">W${i+1}</button>`).join("")}</div>
    <div class="seg" role="group" aria-label="Scope"><button id="tk-only" aria-pressed="${talk.only}">This week</button><button id="tk-upto" aria-pressed="${!talk.only}">All so far</button></div></div>`;
  let body="";
  if(m==="answer"){talkItems=buildTalkItems();talkIdx=0;const gap=store.get("gap",3);
    body=`<p class="small muted">The app asks what people in Japan will actually ask you. Answer out loud in the pause, then hear one good answer.</p>${scopeUI}
     <div class="panel">${ctlHTML()}
      <label class="row small"><input type="checkbox" id="tk-hide" ${talk.hide?"checked":""}> Hide the question text (audio only, like a real conversation)</label></div>
     <div class="panel stage" id="tk-stage"></div><div class="bar"><i id="tk-bar"></i></div>
     <div class="row" style="justify-content:center"><button class="btn" id="tk-prev" aria-label="Previous">◀︎</button><button class="btn primary" id="tk-play" style="min-width:120px">Play</button><button class="btn" id="tk-next" aria-label="Next">▶︎</button></div>`}
  else if(m==="build"){body=`<p class="small muted">A pattern plus a swap word makes a sentence you've never rehearsed. Say it out loud, then reveal.</p>${scopeUI}<div id="bw"></div>`}
  else if(m==="chat"){body=chatBody()}
  else{const p=prof();const sel=(key,label)=>`<div class="field"><label class="small" for="pf-${key}">${label}</label><select id="pf-${key}">${BANK[key].map(b=>`<option value="${b[0]}" ${p[key]===b[0]?"selected":""}>${esc(b[2])} · ${esc(b[0])}</option>`).join("")}</select></div>`;
    body=`<p class="small muted">These fill in the drills, the questions and your introduction. ${SYNC.on?"Synced to your Claude account on every device.":"Saved on this phone only."}</p>
     <div class="panel"><div class="grid2">
      <div class="field"><label class="small" for="pf-name">Your first name</label><input type="text" id="pf-name" value="${esc(p.name)}" placeholder="Your first name" autocomplete="given-name"></div>
      <div class="field"><label class="small" for="pf-nameKana">How it's said in Japanese (a guess, fix it if it sounds off)</label><input type="text" id="pf-nameKana" value="${esc(p.nameKana)}" placeholder="in katakana (optional)" lang="ja"></div>
      <div class="field"><label class="small" for="pf-origin">Where you're from (city or state)</label><input type="text" id="pf-origin" value="${esc(p.origin)}" placeholder="Your city or state"></div>
      <div class="field"><label class="small" for="pf-originKana">In Japanese</label><input type="text" id="pf-originKana" value="${esc(p.originKana)}" placeholder="in katakana (optional)" lang="ja"></div>
      ${sel("job","Your job")}${sel("hobby","A hobby")}${sel("food","A Japanese food you like")}${sel("city","A place you want to visit")}</div>
      <div class="row"><button class="btn primary" id="pf-save">Save</button><button class="btn" id="pf-hear">Hear my name</button><span class="small muted" id="pf-msg"></span></div></div>
     <div class="panel"><div class="label">Your introduction</div><ul class="phrases">${INTRO.map((l,i)=>`<li class="phrase"><button class="say" data-intro="${i}" aria-label="Play line">${SPK}</button>${lines(fill(l[0],0),fill(l[1],1),fill(l[2],2))}</li>`).join("")}</ul></div>`}
  el.innerHTML=`<div class="wrap">${practiceNav()}<div><h2>Talk</h2></div>
   <div class="seg" role="group" aria-label="Mode"><button data-tm="answer" aria-pressed="${m==="answer"}">Answer questions</button><button data-tm="build" aria-pressed="${m==="build"}">Build sentences</button><button data-tm="me" aria-pressed="${m==="me"}">Your answers</button>${SAMPLE?`<button data-tm="chat" aria-pressed="${m==="chat"}">Chat with a local</button>`:""}</div>
   ${body}${VOICE_WARN}</div>`;
  bindPracticeNav(el);el.querySelectorAll("[data-tm]").forEach(b=>b.onclick=()=>{stopAll();talk.mode=b.dataset.tm;renderTalk()});
  el.querySelectorAll("[data-tw]").forEach(b=>b.onclick=()=>{stopAll();talk.max=+b.dataset.tw;renderTalk()});
  const to=el.querySelector("#tk-only");if(to){to.onclick=()=>{stopAll();talk.only=true;renderTalk()};el.querySelector("#tk-upto").onclick=()=>{stopAll();talk.only=false;renderTalk()}}
  if(m==="answer"){bindCtl(el);
    el.querySelector("#tk-hide").onchange=e=>{talk.hide=e.target.checked;drawTalk("")};
    el.querySelector("#tk-play").onclick=()=>talking?stopTalk():startTalk();
    el.querySelector("#tk-prev").onclick=()=>{talkIdx=(talkIdx-1+talkItems.length)%talkItems.length;if(talking){stopTalk();startTalk()}else drawTalk("")};
    el.querySelector("#tk-next").onclick=()=>{talkIdx=(talkIdx+1)%talkItems.length;if(talking){stopTalk();startTalk()}else drawTalk("")};
    drawTalk("")}
  if(m==="build")buildWidget(el.querySelector("#bw"),9999,()=>{});
  if(m==="chat")bindChat(el);
  if(m==="me"){const p=prof();const g=id=>el.querySelector("#pf-"+id);
    g("name").oninput=()=>{if(p.nameAuto!==false){g("nameKana").value=kata(g("name").value)}};
    g("nameKana").oninput=()=>{p.nameAuto=false};
    g("origin").oninput=()=>{if(p.originAuto!==false){g("originKana").value=kata(g("origin").value)}};
    g("originKana").oninput=()=>{p.originAuto=false};
    const save=()=>{const np={name:g("name").value.trim(),nameKana:g("nameKana").value.trim(),nameAuto:p.nameAuto!==false,origin:g("origin").value.trim(),originKana:g("originKana").value.trim(),originAuto:p.originAuto!==false,job:g("job").value,hobby:g("hobby").value,food:g("food").value,city:g("city").value};
      if(np.name&&!np.nameKana)np.nameKana=kata(np.name);if(np.origin&&!np.originKana)np.originKana=kata(np.origin);store.set("profile",np);return np};
    g("save").onclick=()=>{save();renderTalk();const msg=document.getElementById("pf-msg");if(msg)msg.textContent="Saved."};
    g("hear").onclick=()=>{const np=save();sayNow(np.nameKana||"クマ")};
    el.querySelectorAll("[data-intro]").forEach(b=>b.onclick=()=>sayNow(fill(INTRO[+b.dataset.intro][1],1),b))}
  renderVoiceWarn()}
function drawTalk(phase,showAns,cue){const st=document.getElementById("tk-stage");if(!st)return;const it=talkItems[talkIdx];if(!it){st.innerHTML="";return}
  const q=`<div class="ro">${hl(fill(it.q[0],0))}</div><div class="en muted">${hl(fill(it.q[2],2))}</div><div class="jpw">${hl(fill(it.q[1],1))}</div>`;
  const a=`<div class="ans"><div class="small muted">In Japanese</div><div class="ro">${hl(fill(it.a[0],0))}</div><div class="en muted">${hl(fill(it.a[2],2))}</div><div class="jpw">${hl(fill(it.a[1],1))}</div></div>`;
  st.innerHTML=`<div class="small muted" style="font-variant-numeric:tabular-nums">${talkIdx+1} / ${talkItems.length} · W${it.w+1}</div><div class="phase">${phase||"&nbsp;"}</div>
   ${talk.hide&&!showAns?`<div class="muted">Listen for the question</div>`:q}${showAns?a:cue?`<div class="ans"><div class="small muted">Say this in Japanese</div><div class="en" style="font-size:1.25rem">${hl(fill(it.a[2],2))}</div></div>`:`<div style="opacity:.25;font-size:1.5rem">・・・</div>`}`;
  const bar=document.getElementById("tk-bar");if(bar)bar.style.width=((talkIdx+1)/talkItems.length*100)+"%"}
async function startTalk(){talking=true;const btn=document.getElementById("tk-play");if(btn)btn.textContent="Pause";
  const my=++runId;stopSpeech();await sleep(80);try{wake=await navigator.wakeLock.request("screen")}catch(e){}
  while(talking&&my===runId){const it=talkItems[talkIdx],gap=store.get("gap",3)*1000*groupMul(),qj=fill(it.q[1],1),aj=fill(it.a[1],1);
    const tc=document.getElementById("turn-chip");if(tc)tc.textContent=whose()+", you answer this one";
    drawTalk("Question");await speak(qj,"ja");if(my!==runId)return;await tsleep(500);if(my!==runId)return;
    drawTalk("Say this in Japanese",false,true);await speak(sayable(fill(it.a[2],2)),"en",1);if(my!==runId)return;await sleep(answerMs(aj.length)+800);if(my!==runId)return;
    drawTalk("In Japanese",true);await speak(aj,"ja");if(my!==runId)return;await tsleep(700);if(my!==runId)return;
    drawTalk("Repeat it",true);await speak(aj,"ja");if(my!==runId)return;await sleep(answerMs(aj.length));if(my!==runId)return;
    talkIdx=(talkIdx+1)%talkItems.length;
    if(talkOnce&&talkIdx===0){stopTalk();const st=document.getElementById("tk-stage");if(st)st.querySelector(".phase").textContent="All done";if(onTalkDone)onTalkDone();return}}}
function stopTalk(){stopAll();const btn=document.getElementById("tk-play");if(btn)btn.textContent="Play";drawTalk("")}

/* ---------- CARDS ---------- */
let card=null;
let cardIds=null;
function pool(){const L=learnedIds(),cw=curWeek();if(cardIds){const r=deck.filter(c=>cardIds.includes(c.id));if(r.length)return r}const p=deck.filter(c=>!c.staff&&c.w<=cardMax&&(c.w<cw||L.has(c.id)));return p.length?p:deck.filter(c=>c.w<=cardMax)}
function eff(c,boxes){const b=boxes[c.id]||0;return PLAN.focus[c.w]?Math.max(0,b-1):b}
function pickCard(){const boxes=store.get("boxes",{}),p=pool();const min=Math.min(...p.map(c=>eff(c,boxes)));
  let cand=p.filter(c=>eff(c,boxes)<=min+(Math.random()<.25?1:0));if(card&&cand.length>1)cand=cand.filter(c=>c.id!==card.id);card=pick(cand)}
function renderCards(){cardIds=null;const el=document.getElementById("v-cards");const boxes=store.get("boxes",{}),p=pool(),known=p.filter(c=>(boxes[c.id]||0)>=3).length;
  el.innerHTML=`<div class="wrap">${practiceNav()}
   <div><h2>Review cards</h2>${Object.keys(PLAN.focus).length?`<p class="small muted">Extra weight on week${Object.keys(PLAN.focus).length>1?"s":""} ${Object.keys(PLAN.focus).map(w=>`<button class="link" data-goweek="${w}">${+w+1}</button>`).join(", ")} (marked hard).</p>`:""}</div>
   ${ctlHTML()}<div class="row"><select id="cd-max" aria-label="Weeks included">${WEEKS.map((w,i)=>`<option value="${i}">Weeks 1–${i+1}</option>`).join("")}</select><span class="small muted" style="font-variant-numeric:tabular-nums">${known} of ${p.length} solid</span></div>
   <div class="seg" role="group" aria-label="Direction">${[["mix","Mixed"],["say","English → Japanese"],["und","Japanese → English"]].map(([v,t])=>`<button data-cdir="${v}" aria-pressed="${store.get("cardDir","mix")===v}">${t}</button>`).join("")}</div>
   <div id="cw"></div>${VOICE_WARN}</div>`;
  bindLinks(el);bindPracticeNav(el);bindCtl(el);const sel=el.querySelector("#cd-max");sel.value=String(cardMax);sel.onchange=()=>{cardMax=+sel.value;card=null;renderCards()};
  el.querySelectorAll("[data-cdir]").forEach(b=>b.onclick=()=>{store.set("cardDir",b.dataset.cdir);card=null;renderCards()});
  cardsWidget(el.querySelector("#cw"),9999,cardMax,()=>{},store.get("cardDir","mix"));renderVoiceWarn()}

