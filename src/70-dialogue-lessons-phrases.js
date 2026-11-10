/* ---------- dialogue (shared by Phrases and the session player) ---------- */
const DLG_HINT="Practice mode plays the other person, pauses for your line, then plays your line so you can check yourself.";
let onDialogueDone=null;
// speaker A (the local) speaks in the staff voice (k:), speaker B (the traveler, you) in the model voice (j:)
const dlgLine=l=>LN.tts(fill(l[1],1),"ja","dialogue",fill(l[2],0),l[0]==="A"?"other":"learner");
function dialogueHTML(w,roleplay){const W=WEEKS[w];
  return`<div class="panel"><div class="label">${esc(W.scene)}</div>
   ${roleplay?`<p class="small">Act it out with your partner: swap roles, three rounds, no notes after the first. Each of you note one thing you couldn't say. Solo? Run "Be the traveler" twice.</p>`:""}
   <div class="row"><button class="btn ${roleplay?"":"primary"}" id="dlg-play">Play</button><button class="btn rail" id="dlg-b">Be the traveler (B)</button><button class="btn" id="dlg-a">Be the local (A)</button><button class="btn" id="dlg-stop" hidden>Stop</button></div>
   <p class="small muted" id="dlg-hint">${DLG_HINT}</p>
   <ul class="dlg">${W.dialogue.map((l,i)=>`<li data-l="${i}"><span class="who ${l[0]}">${l[0]}</span>${lines(fill(l[2],0),fill(l[1],1),fill(l[3],2))}<button class="say" data-dl="${i}" aria-label="Play line">${SPK}</button></li>`).join("")}</ul></div>`}
function bindDialogue(el,w){lessonWeek=w;const W=WEEKS[w];
  el.querySelectorAll("[data-dl]").forEach(b=>b.onclick=()=>{const l=W.dialogue[+b.dataset.dl];hearNow(dlgLine(l),b)});
  el.querySelector("#dlg-play").onclick=()=>runDialogue(null);el.querySelector("#dlg-b").onclick=()=>runDialogue("B");el.querySelector("#dlg-a").onclick=()=>runDialogue("A");el.querySelector("#dlg-stop").onclick=stopRole}
function stopRole(){runId++;stopSpeech();const s=document.getElementById("dlg-stop");if(s)s.hidden=true;document.querySelectorAll(".dlg li").forEach(l=>l.classList.remove("active"));const h=document.getElementById("dlg-hint");if(h)h.textContent=DLG_HINT}
async function runDialogue(role){stopRole();const my=++runId,W=WEEKS[lessonWeek],lis=document.querySelectorAll(".dlg li"),hint=document.getElementById("dlg-hint");if(!hint)return;
  document.getElementById("dlg-stop").hidden=false;await sleep(80);
  for(let i=0;i<W.dialogue.length;i++){if(my!==runId)return;const l=W.dialogue[i];lis.forEach(x=>x.classList.toggle("active",+x.dataset.l===i));
    if(role&&l[0]===role){hint.textContent="Your turn: say "+(role==="B"?"the traveler's":"the local's")+" line now.";const roEl=lis[i].querySelector(".ro");roEl.style.visibility="hidden";
      await yourTurn(dlgLine(l));roEl.style.visibility="";if(my!==runId)return;hint.textContent="Check yourself:"}
    else hint.textContent=role?"Listen…":"Playing…";
    await voice(dlgLine(l));if(my!==runId)return;await sleep(600+store.get("gap",3)*150)}
  if(my===runId){hint.textContent=role?"Nice. Run it again, or try it with the English hidden.":"Done. Now try Be the traveler.";document.getElementById("dlg-stop").hidden=true;lis.forEach(x=>x.classList.remove("active"));if(onDialogueDone)onDialogueDone()}}

/* ---------- LESSON CATALOG ---------- */
// swap words that some lesson teaches (pruned ones and words never taught are not offered)
let _taught=null;function taughtEver(ro){if(!_taught){_taught=new Set();deck.forEach(c=>wordTok(c.ro).concat(TEACH_WITH[c.ro]||[]).forEach(t=>_taught.add(t)))}return!PRUNED.has(ro)&&wordTok(ro).every(t=>_taught.has(t))}
// the week's sessions: learning days, the Use-it session, optional More practice (the old use days, after the learning days), finals in week 10
function catalogHTML(w){const L=learnDays(w),list=[];for(let d=0;d<L;d++)list.push({w,d});list.push({w,d:USE_D});for(let d=L;d<USE_D;d++)list.push({w,d,more:true});if(w===9)for(let d=7;d<7+FINALS;d++)list.push({w,d});
  const c=current(),S=srsMap(),learnedAll=sessionsOfWeekLearned(w,S);let doneN=0,planN=0;
  const rows=list.map(s=>{const done=PLAN.log.filter(l=>l.w===s.w&&l.d===s.d&&!l.again),again=PLAN.log.filter(l=>l.w===s.w&&l.d===s.d&&l.again).length;if(done.length&&!s.more)doneN++;if(!s.more)planN++;
    const cur=!!(c&&!c.k&&c.w===s.w&&c.d===s.d&&!c.rep),qi=PLAN.queue.findIndex((q,i)=>i>=PLAN.pos&&!q.k&&q.w===s.w&&q.d===s.d),pd=qi>=0?dateOfQueue(qi):null;
    const avail=!s.more||learnedAll,ss=sessState(s.w,s.d),open=ss!=="future"&&ss!=="locked";
    const st=cur?"Next up":done.length?"✓ "+fmt(_dt(done[done.length-1].date))+(again?" · again ×"+again:""):s.more?(avail?(again?"done ×"+again:"optional"):"after day "+L):pd?dfmt(pd):again?"previewed ×"+again:"";
    const stages=stagesFor(s.w,s.d),name=s.d>=7?"Final review "+(s.d-6):s.d===USE_D?"Use it":s.more?"More practice "+(s.d-L+1):"Day "+(s.d+1);
    const focus=catFocus&&catFocus.w===s.w&&catFocus.d===s.d;
    return`<li class="${cur?"now":""} ${focus?"focus":""} ${s.more?"more":""}" ${open?`data-cat="${s.d}"`:""}><span class="dn">${s.d>=7?"R"+(s.d-6):s.d===USE_D?"U":s.more?"+":s.d+1}</span><span style="min-width:0"><b>${name}</b> <span class="st ${done.length?"done":""}">${esc(st)}</span> <span class="small muted">· ${stages.reduce((a,x)=>a+x.min,0)} min</span></span>${open?`<button class="btn ${ss==="next"?"primary":""}" data-play="${s.w}-${s.d}" style="padding:6px 10px">${ss==="next"?(cur?"Start":"Go to Today"):ss==="more"?"Practice":"Revisit"}</button>`:`<details class="contents"><summary class="small">Contents</summary><ol class="small muted">${stages.map(x=>`<li>${esc(x.title)}</li>`).join("")}</ol></details>`}</li>`}).join("");
  return`<div class="panel"><div class="label">Sessions · ${doneN} of ${planN} done</div><ul class="cat">${rows}</ul><p class="small muted">Finished sessions can be done again (logged as extra practice; they keep your streak). The next one starts from Today. Later ones show what is in them and open when you get there. More practice is optional, after the learning days.</p></div>`}
// More practice becomes available once every item of the week's learning days has a review record
function sessionsOfWeekLearned(w,S){S=S||srsMap();for(let d=0;d<learnDays(w);d++)if(sessionItems(w,d).some(id=>!S[id]))return false;return true}

/* ---------- PHRASES (reference) ---------- */
function renderLessons(){const el=document.getElementById("v-lessons"),W=WEEKS[lessonWeek];
  const hideEn=store.get("hideEn",false),cls=hideEn?"hide-en":"";
  const slots=[...new Set((W.patterns||[]).flatMap(p=>[p.x,p.y].filter(Boolean)))];
  el.innerHTML=`<div class="wrap">
   <div class="chips" role="group" aria-label="Week">${WEEKS.map((w,i)=>`<button class="chip" data-w="${i}" aria-pressed="${i===lessonWeek}">W${i+1}</button>`).join("")}</div>
   <div><div class="label">Week ${lessonWeek+1}${(()=>{const d=weekPlan(lessonWeek);return d.length?" · planned "+fmt(_dt(d[0]))+(d.length>1?" – "+fmt(_dt(d[d.length-1])):""):""})()}</div><h2><span class="jp">${W.kanji}</span> · ${esc(W.title)}</h2><p class="muted">${esc(W.goal)}</p></div>
   ${catalogHTML(lessonWeek)}
   <details class="fold" id="ls-phrases"><summary>Phrases (${W.phrases.length}) · tap to hear</summary>
   <div class="row"><button class="btn" id="tg-en" aria-pressed="${hideEn}">${hideEn?"Show":"Hide"} English</button><button class="btn" id="tg-jp" aria-pressed="${store.get("showJp",false)}">${store.get("showJp",false)?"Hide":"Show"} Japanese writing</button></div>
   <div class="panel ${cls}"><div class="label">Phrases · tap to hear</div><p class="small muted">Highlighted words are examples. Swap in your own from the word bank below.</p>
    <ul class="phrases">${W.phrases.map((p,i)=>`<li class="phrase"><button class="say" data-say="${i}" aria-label="Play ${esc(p[0])}">${SPK}</button>${lines(p[0],p[1],p[2])}${wordsHTML(p)}${partsHTML(p)}</li>`).join("")}</ul></div></details>
   <details class="fold"><summary>This week's tip</summary><div class="note">${esc(W.note)}</div></details>
   ${lessonWeek===1?`<details class="fold"><summary>Your introduction</summary><div class="panel" id="intro-panel"></div></details>`:""}
   ${W.patterns&&W.patterns.length?`<details class="fold"><summary>Patterns and swap words</summary><div class="panel ${cls}"><div class="label">Patterns · build your own sentences</div>
    <div>${W.patterns.map(p=>`<div class="pat"><div class="ro">${esc(p.ro.replace(/\{[xy]\}/g,"___"))}</div><div class="en small muted">${esc(p.en.replace(/\{[xy]\}/g,"___"))}</div><div class="jpw">${esc(p.jp.replace(/\{[xy]\}/g,"___"))}</div></div>`).join("")}</div>
    <div><button class="btn primary" id="go-build">Drill these patterns</button></div></div>
   <div class="panel"><div class="label">Swap words · tap to hear</div>
    ${slots.map(s=>`<div><div class="small muted" style="margin-bottom:4px">${BANK_NAMES[s]}</div><div class="words">${BANK[s].filter(b=>taughtEver(b[0])).map(b=>`<button class="word" data-word="${esc(b[1])}"><span class="ro" style="font-size:1rem">${esc(b[0])}</span><span class="r">${esc(b[2])}</span></button>`).join("")}</div></div>`).join("")}</div></details>`:""}
   <details class="fold"><summary>The week's conversation</summary><div class="${cls}">${hearHTML(lessonWeek)}${dialogueHTML(lessonWeek,false)}<div class="panel">${ctlHTML()}</div></div></details>
   ${W.drill?`<details class="fold" id="drill-fold"><summary>${W.drill==="numbers"?"Numbers":W.drill==="prices"?"Price":"Time"} drill</summary><div class="panel" id="drill"></div></details>`:""}
   <details class="fold"><summary>Speak out loud: situations</summary><ol class="prompts">${W.speak.map(s=>`<li>${esc(s)}</li>`).join("")}</ol></details>
   ${VOICE_WARN}</div>`;
  el.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{stopAll();lessonWeek=+b.dataset.w;catFocus=null;renderLessons()});bindLinks(el);
  el.querySelectorAll("[data-cat]").forEach(li=>li.onclick=()=>playSession(lessonWeek,+li.dataset.cat));
  el.querySelectorAll("[data-say]").forEach(b=>b.onclick=()=>hearNow(LN.j(byId(lessonWeek+"-"+b.dataset.say)),b));
  el.querySelectorAll("[data-word]").forEach(b=>b.onclick=()=>hearNow(b.dataset.wro?{key:"j:"+b.dataset.wro,text:b.dataset.word,lang:"ja",ro:b.dataset.wro}:LN.tts(b.dataset.word,"ja","bank")));el.querySelectorAll("[data-pjp]").forEach(b=>b.onclick=()=>sayNow(b.dataset.pjp));
  el.querySelector("#tg-en").onclick=()=>{store.set("hideEn",!hideEn);renderLessons()};
  el.querySelector("#tg-jp").onclick=()=>{setShowJp(!store.get("showJp",false));renderLessons()};
  bindDialogue(el,lessonWeek);bindCtl(el);
  const gb=el.querySelector("#go-build");if(gb)gb.onclick=()=>{talk={mode:"build",max:lessonWeek,only:true,hide:false};showPractice("talk")};
  if(lessonWeek===1)renderIntro(el.querySelector("#intro-panel"));
  const df=el.querySelector("#drill-fold");if(df)df.ontoggle=()=>{if(df.open)renderDrill(W.drill,0,null);else{runId++;stopSpeech()}};renderVoiceWarn()}   // the drill starts only when opened
function setShowJp(v){store.set("showJp",v);document.body.classList.toggle("nojp",!v)}
function renderIntro(box){
  box.innerHTML=`<div class="label">Your introduction</div><p class="small muted">Built from Your answers (Kuma from Denver until you change them). Say it from memory, then play it to check.</p>
   <ul class="phrases">${INTRO.map((l,i)=>`<li class="phrase"><button class="say" data-intro="${i}" aria-label="Play line">${SPK}</button>${lines(fill(l[0],0),fill(l[1],1),fill(l[2],2))}</li>`).join("")}</ul>
   <div class="row"><button class="btn primary" id="intro-play">Play all</button><button class="btn" id="intro-edit">Edit your answers</button></div>`;
  box.querySelectorAll("[data-intro]").forEach(b=>b.onclick=()=>hearNow(LN.tts(fill(INTRO[+b.dataset.intro][1],1),"ja","intro",fill(INTRO[+b.dataset.intro][0],0)),b));
  box.querySelector("#intro-play").onclick=async()=>{const my=++runId;stopSpeech();await sleep(80);for(const l of INTRO){if(my!==runId)return;await voice(LN.tts(fill(l[1],1),"ja","intro",fill(l[0],0)));await sleep(400)}};
  box.querySelector("#intro-edit").onclick=()=>{talk.mode="me";showPractice("talk")}}
// ---- drills ask only for numbers built from words already taught (rule 3) ----
// number words are learned word cards (NUMW); "sanzen", "en", "ku-ji", "go-ji", "ichi-ji" are words met in phrases
const DIG=["","ichi","ni","san","yon","go","roku","nana","hachi","kyuu"],NUM_BASE=new Set(DIG.slice(1).concat(["juu","hyaku","sen","man","han"]));
function numKnown(){const L=learnedIds(),s=new Set();deck.forEach(c=>{if(c.num&&L.has(c.id))s.add(c.ro)});return{num:s,tok:knownTokens(player&&player.learnIds)}}
// the words a number is built from: "nihyaku" → ni + hyaku, "juuichi" → juu + ichi; sound-changed forms (sanbyaku, roppyaku, happyaku, hassen) stay whole
function numParts(r){return String(r).split(/[\s-]+/).filter(Boolean).flatMap(t=>{for(const b of["hyaku","sen"])if(t!==b&&t.endsWith(b)&&DIG.includes(t.slice(0,-b.length)))return[t.slice(0,-b.length),b];
  if(/^juu(ichi|ni)$/.test(t))return["juu",t.slice(3)];return[t]})}
const partOK=(t,k)=>NUM_BASE.has(t)?k.num.has(t):k.tok.has(t);
function hourOK(h,k){const r=HOURR[h]+"-ji";if(k.num.has(r)||k.tok.has(r))return true;if([4,7,9].includes(h))return false;return numParts(HOURR[h]).every(t=>partOK(t,k))}
const PRICE_POOL=[120,150,280,300,380,500,600,750,800,980,1200,1500,1800,2400,3000,3600,4800,6000,8000,8800,9500,12000,15000,26000];
const allTen=k=>DIG.slice(1).concat("juu").every(t=>k.num.has(t));
// every value a drill can ask right now: [{show, k (kana), r (romaji)}]
function drillValues(kind,k){k=k||numKnown();const out=[];
  if(kind==="numbers"){if(allTen(k))for(let v=1;v<100;v++){const j=jaNum(v);out.push({show:String(v),k:j.k,r:j.r})}else DIG.concat("juu").forEach((t,v)=>{if(v&&k.num.has(t)){const j=jaNum(v);out.push({show:String(v),k:j.k,r:j.r})}})}
  else if(kind==="prices")PRICE_POOL.forEach(v=>{const j=jaNum(v),r=j.r+" en";if(numParts(r).every(t=>partOK(t,k)))out.push({show:"¥"+v.toLocaleString("en-US"),k:j.k+"えん",r})});
  else for(let h=1;h<=12;h++){if(!hourOK(h,k))continue;out.push({show:h+":00",k:HOURK[h]+"じ",r:HOURR[h]+"-ji"});if(k.num.has("han"))out.push({show:h+":30",k:HOURK[h]+"じはん",r:HOURR[h]+"-ji han"})}
  return out}
// the first time 11–99 come up: three spoken examples of how they build
const NUM_DEMO=[["Eleven is ten, then one.",11],["Twenty is two tens.",20],["Thirty-five is three tens and five.",35]];
function renderDrill(kind,n,onDone){const box=document.getElementById("drill");if(!box)return;let q,count=0;const name=kind==="numbers"?"Numbers drill":kind==="prices"?"Price drill":"Time drill";
  const k=numKnown(),pool=drillValues(kind,k);
  if(!pool.length){box.innerHTML=`<div class="label">${name}</div><p class="small muted">Nothing to drill yet: the words for these come in a later lesson.</p>`;if(onDone)onDone();return}
  function next(){const v=pick(pool);q=Object.assign({},v);draw(false)}
  function draw(rev){if(n&&count>=n){box.innerHTML=`<div class="label">${name} · done</div><div class="flash"><div class="big">${n} of ${n}</div><p class="small muted">Tap <b>Next step</b>, or do one more.</p><div class="row" style="justify-content:center"><button class="btn" id="dr-more">One more</button></div></div>`;box.querySelector("#dr-more").onclick=()=>{n+=1;next()};return}
    box.innerHTML=`<div class="label">${name}${n?` · ${Math.min(count,n)} / ${n}`:""}</div><p class="small muted">Say it out loud, then reveal to check.</p>
    <div class="quizk">${esc(q.show)}</div>
    <div style="text-align:center;min-height:3.2em">${rev?`<div class="ro" style="font-size:1.4rem;color:var(--ai)">${esc(q.r)}</div><div class="jpw">${q.k}</div>`:""}</div>
    <div class="row" style="justify-content:center"><button class="btn primary" id="dr-rev">${rev?"Hear it again":"Reveal"}</button><button class="btn ${rev?"rail":""}" id="dr-next">Next</button></div>`;
   box.querySelector("#dr-rev").onclick=()=>{if(!rev){count++;if(n&&count===n&&onDone)onDone()}draw(true);hearNow({key:"j:"+q.r,text:q.k,lang:"ja",ro:q.r,cat:"drill"})};box.querySelector("#dr-next").onclick=()=>{if(n&&count>=n)draw(false);else next()}}
  // the demonstration plays once, the first time all of 1–10 are known
  if(kind==="numbers"&&allTen(k)&&!store.get("numDemo",false)){let i=0;const my=++runId;
    const show=(txt,ro,kana)=>{box.innerHTML=`<div class="label">${name} · how the numbers build</div><div class="flash" id="dr-demo"><div class="en">${esc(txt)}</div>${ro?`<div class="ro" style="font-size:1.4rem;color:var(--ai)">${esc(ro)}</div><div class="jpw">${esc(kana)}</div>`:""}</div><div class="row" style="justify-content:center"><button class="btn" id="dr-skipdemo">Skip the examples</button></div>`;
      box.querySelector("#dr-skipdemo").onclick=()=>{runId++;stopSpeech();store.set("numDemo",true);next()}};
    (async()=>{await sleep(80);for(const [txt,v] of NUM_DEMO){if(my!==runId)return;const j=jaNum(v);show(txt,"","");await voice({key:"c:"+txt,text:txt,lang:"en",cat:"demo"});if(my!==runId)return;
        show(txt,j.r,j.k);await voice({key:"j:"+j.r,text:j.k,lang:"ja",ro:j.r,cat:"demo"});if(my!==runId)return;await tsleep(900);if(my!==runId)return;await voice({key:"j:"+j.r,text:j.k,lang:"ja",ro:j.r,cat:"demo"});if(my!==runId)return;await tsleep(1200)}
      if(my!==runId)return;show("Now you try.","","");await voice({key:"c:Now you try.",text:"Now you try.",lang:"en",cat:"demo"});if(my!==runId)return;store.set("numDemo",true);next()})();return}
  next()}
// the keys of lines that have no recording yet but will (new words, the demonstration, every drill value): text-to-speech until recorded
function pendingLines(){const out=[],k={num:new Set(NUMW.map(x=>x[1])),tok:new Set(["sanzen","en","ku-ji","go-ji","ichi-ji"])};
  deck.filter(c=>c.num).forEach(c=>{out.push({kind:"word",key:LN.j(c).key,jp:c.say,ro:c.ro,en:c.en,where:"number word "+c.id});out.push({kind:"meaning",key:eLine(c.en).key,jp:"",ro:"",en:sayable(c.en),where:"number word "+c.id})});
  NUM_DEMO.forEach(([t,v])=>{out.push({kind:"coach",key:"c:"+t,jp:"",ro:"",en:t,where:"numbers demonstration"});const j=jaNum(v);out.push({kind:"demo",key:"j:"+j.r,jp:j.k,ro:j.r,en:String(v),where:"numbers demonstration"})});
  out.push({kind:"coach",key:"c:Now you try.",jp:"",ro:"",en:"Now you try.",where:"numbers demonstration"});
  ["numbers","prices","time"].forEach(d=>drillValues(d,k).forEach(v=>out.push({kind:"drill",key:"j:"+v.r,jp:v.k,ro:v.r,en:v.show,where:d+" drill"})));
  return out.filter(x=>!clipOf(x.key))}


