/* ---------- dialogue (shared by Phrases and the session player) ---------- */
const DLG_HINT="Practice mode plays the other person, pauses for your line, then plays your line so you can check yourself.";
let onDialogueDone=null;
function dialogueHTML(w,roleplay){const W=WEEKS[w];
  return`<div class="panel"><div class="label">${esc(W.scene)}</div>
   ${roleplay?`<p class="small">Act it out with your partner: swap roles, three rounds, no notes after the first. Each of you note one thing you couldn't say. Solo? Run "Be the traveler" twice.</p>`:""}
   <div class="row"><button class="btn ${roleplay?"":"primary"}" id="dlg-play">Play</button><button class="btn rail" id="dlg-b">Be the traveler (B)</button><button class="btn" id="dlg-a">Be the local (A)</button><button class="btn" id="dlg-stop" hidden>Stop</button></div>
   <p class="small muted" id="dlg-hint">${DLG_HINT}</p>
   <ul class="dlg">${W.dialogue.map((l,i)=>`<li data-l="${i}"><span class="who ${l[0]}">${l[0]}</span>${lines(fill(l[2],0),fill(l[1],1),fill(l[3],2))}<button class="say" data-dl="${i}" aria-label="Play line">${SPK}</button></li>`).join("")}</ul></div>`}
function bindDialogue(el,w){lessonWeek=w;const W=WEEKS[w];
  el.querySelectorAll("[data-dl]").forEach(b=>b.onclick=()=>{const l=W.dialogue[+b.dataset.dl];hearNow(LN.tts(fill(l[1],1),"ja","dialogue",fill(l[2],0)),b)});
  el.querySelector("#dlg-play").onclick=()=>runDialogue(null);el.querySelector("#dlg-b").onclick=()=>runDialogue("B");el.querySelector("#dlg-a").onclick=()=>runDialogue("A");el.querySelector("#dlg-stop").onclick=stopRole}
function stopRole(){runId++;stopSpeech();const s=document.getElementById("dlg-stop");if(s)s.hidden=true;document.querySelectorAll(".dlg li").forEach(l=>l.classList.remove("active"));const h=document.getElementById("dlg-hint");if(h)h.textContent=DLG_HINT}
async function runDialogue(role){stopRole();const my=++runId,W=WEEKS[lessonWeek],lis=document.querySelectorAll(".dlg li"),hint=document.getElementById("dlg-hint");if(!hint)return;
  document.getElementById("dlg-stop").hidden=false;await sleep(80);
  for(let i=0;i<W.dialogue.length;i++){if(my!==runId)return;const l=W.dialogue[i];lis.forEach(x=>x.classList.toggle("active",+x.dataset.l===i));
    if(role&&l[0]===role){hint.textContent="Your turn: say "+(role==="B"?"the traveler's":"the local's")+" line now.";const roEl=lis[i].querySelector(".ro");roEl.style.visibility="hidden";
      await yourTurn(LN.tts(fill(l[1],1),"ja","dialogue",fill(l[2],0)));roEl.style.visibility="";if(my!==runId)return;hint.textContent="Check yourself:"}
    else hint.textContent=role?"Listen…":"Playing…";
    await voice(LN.tts(fill(l[1],1),"ja","dialogue",fill(l[2],0)));if(my!==runId)return;await sleep(600+store.get("gap",3)*150)}
  if(my===runId){hint.textContent=role?"Nice. Run it again, or try it with the English hidden.":"Done. Now try Be the traveler.";document.getElementById("dlg-stop").hidden=true;lis.forEach(x=>x.classList.remove("active"));if(onDialogueDone)onDialogueDone()}}

/* ---------- LESSON CATALOG ---------- */
// the week's sessions: learning days, the Use-it session, optional More practice (the old use days, after the learning days), finals in week 10
function catalogHTML(w){const L=learnDays(w),list=[];for(let d=0;d<L;d++)list.push({w,d});list.push({w,d:USE_D});for(let d=L;d<USE_D;d++)list.push({w,d,more:true});if(w===9)for(let d=7;d<7+FINALS;d++)list.push({w,d});
  const c=current(),S=srsMap(),learnedAll=sessionsOfWeekLearned(w,S);let doneN=0,planN=0;
  const rows=list.map(s=>{const done=PLAN.log.filter(l=>l.w===s.w&&l.d===s.d&&!l.again),again=PLAN.log.filter(l=>l.w===s.w&&l.d===s.d&&l.again).length;if(done.length&&!s.more)doneN++;if(!s.more)planN++;
    const cur=!!(c&&!c.k&&c.w===s.w&&c.d===s.d&&!c.rep),qi=PLAN.queue.findIndex((q,i)=>i>=PLAN.pos&&!q.k&&q.w===s.w&&q.d===s.d),pd=qi>=0?dateOfQueue(qi):null;
    const avail=!s.more||learnedAll;
    const st=cur?"Next up":done.length?"✓ "+fmt(_dt(done[done.length-1].date))+(again?" · again ×"+again:""):s.more?(avail?(again?"done ×"+again:"optional"):"after day "+L):pd?dfmt(pd):again?"previewed ×"+again:"";
    const stages=stagesFor(s.w,s.d),name=s.d>=7?"Final review "+(s.d-6):s.d===USE_D?"Use it":s.more?"More practice "+(s.d-L+1):"Day "+(s.d+1);
    const focus=catFocus&&catFocus.w===s.w&&catFocus.d===s.d;
    return`<li class="${cur?"now":""} ${focus?"focus":""} ${s.more?"more":""}" data-cat="${s.d}"><span class="dn">${s.d>=7?"R"+(s.d-6):s.d===USE_D?"U":s.more?"+":s.d+1}</span><span style="min-width:0"><b>${name}</b> <span class="st ${done.length?"done":""}">${esc(st)}</span><br><span class="small muted">${esc(stages.map(x=>x.title).join(" · "))} · ${stages.reduce((a,x)=>a+x.min,0)} min</span></span><button class="btn ${cur?"primary":""}" data-play="${s.w}-${s.d}" style="padding:6px 10px">${cur?"Start":s.more?"Practice":done.length?"Revisit":"Preview"}</button></li>`}).join("");
  return`<div class="panel"><div class="label">Sessions · ${doneN} of ${planN} done</div><ul class="cat">${rows}</ul><p class="small muted">Tap any session to do it again, or to peek ahead. More practice is optional, after the learning days. Revisits log as extra practice and keep your streak; only "Start" moves the course forward.</p></div>`}
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
   <div class="row"><button class="btn" id="tg-en" aria-pressed="${hideEn}">${hideEn?"Show":"Hide"} English</button><button class="btn" id="tg-jp" aria-pressed="${store.get("showJp",false)}">${store.get("showJp",false)?"Hide":"Show"} Japanese writing</button></div>
   <div class="panel ${cls}"><div class="label">Phrases · tap to hear</div><p class="small muted">Highlighted words are examples. Swap in your own from the word bank below.</p>
    <ul class="phrases">${W.phrases.map((p,i)=>`<li class="phrase"><button class="say" data-say="${i}" aria-label="Play ${esc(p[0])}">${SPK}</button>${lines(p[0],p[1],p[2])}${wordsHTML(p)}${partsHTML(p)}</li>`).join("")}</ul></div>
   <div class="note"><b>Tip.</b> ${esc(W.note)}</div>
   ${lessonWeek===1?`<div class="panel" id="intro-panel"></div>`:""}
   ${W.patterns&&W.patterns.length?`<div class="panel ${cls}"><div class="label">Patterns · build your own sentences</div>
    <div>${W.patterns.map(p=>`<div class="pat"><div class="ro">${esc(p.ro.replace(/\{[xy]\}/g,"___"))}</div><div class="en small muted">${esc(p.en.replace(/\{[xy]\}/g,"___"))}</div><div class="jpw">${esc(p.jp.replace(/\{[xy]\}/g,"___"))}</div></div>`).join("")}</div>
    <div><button class="btn primary" id="go-build">Drill these patterns</button></div></div>
   <div class="panel"><div class="label">Swap words · tap to hear</div>
    ${slots.map(s=>`<div><div class="small muted" style="margin-bottom:4px">${BANK_NAMES[s]}</div><div class="words">${BANK[s].map(b=>`<button class="word" data-word="${esc(b[1])}"><span class="ro" style="font-size:1rem">${esc(b[0])}</span><span class="r">${esc(b[2])}</span></button>`).join("")}</div></div>`).join("")}</div>`:""}
   <div class="${cls}">${hearHTML(lessonWeek)}${dialogueHTML(lessonWeek,false)}<div class="panel">${ctlHTML()}</div></div>
   ${W.drill?`<div class="panel" id="drill"></div>`:""}
   <div class="panel"><div class="label">Speak out loud</div><ol class="prompts">${W.speak.map(s=>`<li>${esc(s)}</li>`).join("")}</ol></div>
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
  if(W.drill)renderDrill(W.drill,0,null);renderVoiceWarn()}
function setShowJp(v){store.set("showJp",v);document.body.classList.toggle("nojp",!v)}
function renderIntro(box){const set=profileSet();
  box.innerHTML=`<div class="label">Your introduction</div><p class="small muted">${set?"Built from Your answers. Say it from memory, then play it to check.":"Example answers are shown. Fill in Your answers (Practice → Talk) to make it yours."}</p>
   <ul class="phrases">${INTRO.map((l,i)=>`<li class="phrase"><button class="say" data-intro="${i}" aria-label="Play line">${SPK}</button>${lines(fill(l[0],0),fill(l[1],1),fill(l[2],2))}</li>`).join("")}</ul>
   <div class="row"><button class="btn primary" id="intro-play">Play all</button><button class="btn" id="intro-edit">${set?"Edit":"Fill in"} your answers</button></div>`;
  box.querySelectorAll("[data-intro]").forEach(b=>b.onclick=()=>hearNow(LN.tts(fill(INTRO[+b.dataset.intro][1],1),"ja","intro",fill(INTRO[+b.dataset.intro][0],0)),b));
  box.querySelector("#intro-play").onclick=async()=>{const my=++runId;stopSpeech();await sleep(80);for(const l of INTRO){if(my!==runId)return;await voice(LN.tts(fill(l[1],1),"ja","intro",fill(l[0],0)));await sleep(400)}};
  box.querySelector("#intro-edit").onclick=()=>{talk.mode="me";showPractice("talk")}}
function renderDrill(kind,n,onDone){const box=document.getElementById("drill");let q,count=0;
  function next(){if(kind==="numbers"){const v=1+Math.floor(Math.random()*99);const j=jaNum(v);q={show:String(v),k:j.k,r:j.r}}
   else if(kind==="prices"){const pool=[120,150,280,300,380,500,600,750,800,980,1200,1500,1800,2400,3000,3600,4800,6000,8000,8800,9500,12000,15000,26000];const v=pick(pool);const j=jaNum(v);q={show:"¥"+v.toLocaleString("en-US"),k:j.k+"えん",r:j.r+" en"}}
   else{const h=1+Math.floor(Math.random()*12),half=Math.random()<.4;q={show:h+":"+(half?"30":"00"),k:HOURK[h]+"じ"+(half?"はん":""),r:HOURR[h]+"-ji"+(half?" han":"")}}
   draw(false)}
  function draw(rev){if(n&&count>=n){box.innerHTML=`<div class="label">${kind==="numbers"?"Numbers drill":kind==="prices"?"Price drill":"Time drill"} · done</div><div class="flash"><div class="big">${n} of ${n}</div><p class="small muted">Tap <b>Next step</b>, or do one more.</p><div class="row" style="justify-content:center"><button class="btn" id="dr-more">One more</button></div></div>`;box.querySelector("#dr-more").onclick=()=>{n+=1;next()};return}
    box.innerHTML=`<div class="label">${kind==="numbers"?"Numbers drill":kind==="prices"?"Price drill":"Time drill"}${n?` · ${Math.min(count,n)} / ${n}`:""}</div><p class="small muted">Say it out loud, then reveal to check.</p>
    <div class="quizk">${esc(q.show)}</div>
    <div style="text-align:center;min-height:3.2em">${rev?`<div class="ro" style="font-size:1.4rem;color:var(--ai)">${esc(q.r)}</div><div class="jpw">${q.k}</div>`:""}</div>
    <div class="row" style="justify-content:center"><button class="btn primary" id="dr-rev">${rev?"Hear it again":"Reveal"}</button><button class="btn ${rev?"rail":""}" id="dr-next">Next</button></div>`;
   box.querySelector("#dr-rev").onclick=()=>{if(!rev){count++;if(n&&count===n&&onDone)onDone()}draw(true);hearNow(LN.tts(q.k,"ja","drill",q.r))};box.querySelector("#dr-next").onclick=()=>{if(n&&count>=n)draw(false);else next()}}
  next()}

