/* ---------- session player: one step at a time ---------- */
let player=null,groupPrompt=false;
function startSession(opt){opt=opt||{};if(opt.revisit)return startRevisit(opt.revisit,opt.at);const s=current();if(!s)return;lessonWeek=s.w;let stages=stagesFor(s.w,s.d);if(s.d!==6)stages.push({kind:"rate",title:"How did it go?",min:0});
  if(opt.logOnly)stages=stages.filter(x=>x.kind==="rate"||x.kind==="selfcheck").map(x=>Object.assign({},x,{title:x.kind==="rate"?"Log the group session":x.title}));
  else if(!store.get("soundOK",false))stages.unshift({kind:"sound",title:"Sound check",min:1});
  const learnIds=stages.filter(x=>x.kind==="learn"&&!x.staff).flatMap(x=>x.ids);
  const off=stages[0]&&stages[0].kind==="sound"?1:0;
  player={s,stages,idx:Math.max(0,Math.min(stages.length-1,opt.at?opt.at+off:0)),done:{},group:opt.group||null,turn:0,logOnly:!!opt.logOnly,learnIds};renderToday()}
function startRevisit(s,at){lessonWeek=s.w;let stages=stagesFor(s.w,s.d).filter(x=>x.kind!=="selfcheck"&&x.kind!=="review");stages.push({kind:"rate",title:"Done revisiting",min:0});if(!store.get("soundOK",false))stages.unshift({kind:"sound",title:"Sound check",min:1});
  const off=stages[0].kind==="sound"?1:0;
  player={s:Object.assign({},s,{revisit:true}),stages,idx:Math.max(0,Math.min(stages.length-1,at?at+off:0)),done:{},group:null,turn:0,logOnly:false,learnIds:stages.filter(x=>x.kind==="learn").flatMap(x=>x.ids),revisit:true};renderToday()}
function groupMul(){return player&&player.group?2:1}
// short gaps between lines: a bit longer when Speed is set slower
const tsleep=ms=>sleep(ms*Math.max(1,0.75/Math.max(0.3,rate)));
// time to say something yourself: the Pause slider, plus time for the length of the line; slower Speed settings get more time
function answerMs(jpLen){return Math.min(16000,(store.get("gap",3)*1000+jpLen*300)*groupMul()*Math.max(1,0.75/Math.max(0.3,rate)))}
function whose(){if(!player||!player.group)return"";const n=player.group[player.turn%player.group.length];player.turn++;return n}
function turnChip(text){return`<div class="toast" id="turn-chip" style="text-align:center;font-weight:700">${esc(text)}</div>`}
function stageDone(){if(!player)return;player.done[player.idx]=true;const b=document.getElementById("pl-badge");if(b)b.hidden=false;const nx=document.getElementById("pl-next");if(nx)nx.classList.add("rail")}
function renderPlayer(el){stopAll();onDialogueDone=null;const st=player.stages[player.idx],n=player.stages.length,last=player.idx===n-1;
  let body="";
  switch(st.kind){
   case"sound":body=`<div class="panel" style="text-align:center"><p>Tap the button and listen for a Japanese voice.</p><button class="btn primary bigbtn" id="snd-play">▶︎ Hear "Konnichiwa"</button><div class="row" style="justify-content:center" id="snd-q" hidden><button class="btn rail" id="snd-ok">I heard it</button><button class="btn" id="snd-no">I heard nothing</button></div><div id="snd-tips" hidden style="text-align:left">${SOUND_TIPS}<div class="row" style="justify-content:center;margin-top:10px"><button class="btn" id="snd-skip">Continue anyway</button></div></div></div>`;break;
   case"learn":body=`<div class="panel stage" id="ln-stage"></div><div class="bar"><i id="ln-bar"></i></div><div class="row" style="justify-content:center"><button class="btn" id="ln-prev" aria-label="Previous phrase">◀︎</button><button class="btn primary" id="ln-play" style="min-width:120px">Pause</button><button class="btn" id="ln-next" aria-label="Next phrase">▶︎</button></div>${ctlHTML()}<p class="small muted" style="text-align:center">Tap any piece to hear it again. ◀︎ ▶︎ move between phrases.</p>${NOSOUND}`;break;
   case"review":body=`<div id="rv"></div>`;break;case"cards":body=`<div id="cw"></div>`;break;
   case"quiz":body=`<div id="qz"></div>${NOSOUND}`;break;
   case"listen":case"warm":case"sayback":case"meaning":body=`<div class="panel stage" id="ls-stage"></div><div class="bar"><i id="ls-bar"></i></div><div class="row" style="justify-content:center"><button class="btn" id="ls-prev" aria-label="Previous">◀︎</button><button class="btn primary" id="ls-play" style="min-width:120px">Pause</button><button class="btn" id="ls-next" aria-label="Next">▶︎</button></div>${ctlHTML()}${NOSOUND}`;break;
   case"tip":body=`<div class="note">${esc(WEEKS[st.w].note)}</div>`;break;
   case"dialogue":case"roleplay":body=hearHTML(st.w)+dialogueHTML(st.w,st.kind==="roleplay");break;
   case"build":body=`<div id="bw"></div>`;break;
   case"answer":body=`${st.only?hearHTML(st.max,true):""}<div class="panel stage" id="tk-stage"></div><div class="bar"><i id="tk-bar"></i></div><div class="row" style="justify-content:center"><button class="btn" id="tk-prev" aria-label="Previous">◀︎</button><button class="btn primary" id="tk-play" style="min-width:120px">Pause</button><button class="btn" id="tk-next" aria-label="Next">▶︎</button></div>${ctlHTML()}${NOSOUND}`;break;
   case"drill":body=`<div class="panel" id="drill"></div>`;break;
   case"speak":{const W=WEEKS[st.w];const L=learnedIds();const ph=W.phrases.map((p,i)=>[p,i]).filter(([p,i])=>!st.hints||L.has(st.w+"-"+i));body=`<div class="panel"><div class="prompt">${esc(st.prompt)}</div><p class="small muted" style="text-align:center">${st.hints?"Say it out loud now, a few times. Use the phrases below, tap one to hear it.":"Say it out loud now, a few times. Hints below if you need them."}</p><details ${st.hints?"open":""}><summary class="small">${st.hints?"Your phrases so far":"Show this week's phrases"}</summary><ul class="hints">${ph.map(([p,i])=>`<li><button class="say" data-say="${i}" aria-label="Play">${SPK}</button>${lines(p[0],p[1],p[2])}</li>`).join("")}</ul></details><button class="btn rail bigbtn" id="said">I said it</button></div>`;break}
   case"intro":body=`<div class="panel"><p class="small muted">Say your introduction from memory, then play it to check.</p><ul class="hints">${INTRO.map((l,i)=>`<li><button class="say" data-intro="${i}" aria-label="Play">${SPK}</button>${lines(fill(l[0],0),fill(l[1],1),fill(l[2],2))}</li>`).join("")}</ul><div class="row"><button class="btn primary" id="intro-play">Play all</button></div></div>`;break;
   case"selfcheck":body=`<div class="panel"><div class="label">Can you do this now?</div><div>${CANDO[st.w].map((c,i)=>`<label class="check"><input type="checkbox" data-chk="${i}"><span>${esc(c)}</span></label>`).join("")}</div><p class="small muted">Be honest: this decides whether you move on or repeat two sessions.</p><button class="btn rail bigbtn" id="finish-week">Finish week ${st.w+1}</button></div>`;break;
   case"rate":{if(player.revisit){body=`<div class="panel"><p>Nice: <b>${esc(sessionTitle(player.s))}</b> again. Log it as extra practice? It keeps your streak alive; your place in the course doesn't change.</p><div class="row"><button class="btn primary" data-again="1">Log it</button><button class="btn" data-again="0">Don't log</button></div><p class="small muted">Back to <button class="link" data-goweek="${player.s.w}">all lessons</button> or <button class="link" data-gotab="today">today</button>.</p></div>`;break}
    const names=store.get("groupNames",[]).filter(x=>x!==discordCfg().name);const nxs=PLAN.queue[PLAN.pos+1];body=`<div class="panel"><p>${player.logOnly?"Log this session as done (you did it with the group). How did it go?":"Session done. How did it go?"}</p>${nxs&&!player.logOnly?`<p class="small muted">Next time: <button class="link" data-goweek="${nxs.w}" data-goday="${nxs.d}"><b>${esc(sessionTitle(nxs))}</b></button>${nxs.d<=2&&nxs.w===player.s.w?" — it opens with a warm-up of today's phrases, then builds on them.":nxs.d===0?" — it opens with a quick recap of this week.":""}</p>`:""}${(player.group||player.logOnly)&&names.length?`<div><div class="label">Who did it with you?</div><div class="row">${names.map((x,i)=>`<label class="row small"><input type="checkbox" data-with="${i}" ${player.group?"checked":""}> ${esc(x)}</label>`).join("")}</div></div>`:""}<div class="rate"><button class="btn" data-rate="hard">Hard<small>repeat it tomorrow</small></button><button class="btn primary" data-rate="ok">OK<small>got most of it</small></button><button class="btn rail" data-rate="easy">Easy<small>move on</small></button></div></div>`;break}}
  const g=player.group;let ghint="";
  if(g){const two=g.length>1?[g[player.turn%g.length],g[(player.turn+1)%g.length]]:[g[0],"you"];
    ghint=({sound:"Turn the volume up so everyone can hear.",learn:"Everyone repeats each piece together; the pauses are doubled.",words:"Everyone says each word in the pause.",warm:"Everyone says it in the pause.",sayback:"Everyone says it in the pause.",meaning:"Everyone calls out the meaning in the pause.",quiz:"Take turns: one person taps each answer, the rest say whether they agree first.",cards:"Take turns: one person answers each card, the rest check it.",listen:"Everyone says it in the pause (the pause is doubled).",answer:"Go around the circle: a different person answers each question.",build:"Take turns: one person builds each sentence.",dialogue:`Roles: ${two[0]} is the traveler (B), ${two[1]} is the local (A). Swap on the second run.`,roleplay:"Act it out: swap roles each round.",speak:"Go around: everyone says it once.",tip:"Read it out loud for the group.",intro:"Everyone says their own introduction.",rate:"Rate it for this phone; the others tap \"Log it\" on theirs.",selfcheck:"Check what the whole group can do."})[st.kind]||""}
  el.innerHTML=`<div class="wrap player">
   <div class="head"><button class="btn" id="pl-exit">Exit</button><span class="label" style="text-align:right">${player.revisit?"Revisit · ":g?"Group · ":""}Step ${player.idx+1} of ${n}${st.min?` · ${st.min} min`:""}</span></div>
   ${player.revisit?`<p class="small muted" style="margin:0">${esc(sessionTitle(player.s))} · <button class="link" data-goweek="${player.s.w}">week ${player.s.w+1} lessons</button></p>`:""}
   <div class="bar"><i style="width:${player.idx/n*100}%"></i></div>
   <div><h2>${esc(st.title)}</h2><p class="small muted">${esc(stageDesc(st))}</p>${ghint?`<p class="small" style="color:var(--rail);font-weight:600">👥 ${esc(ghint)}</p>`:""}</div>
   ${g&&(st.kind==="answer"||st.kind==="cards"||st.kind==="build"||st.kind==="quiz")?turnChip(""):""}${body}${/id="pl-rate"/.test(body)||["rate","selfcheck","tip","sound"].includes(st.kind)?"":ctlHTML()}
   ${st.kind==="rate"||st.kind==="selfcheck"?"":`<div class="foot"><button class="btn" id="pl-back" ${player.idx===0?"disabled":""}>Back</button><span class="donebadge" id="pl-badge" ${player.done[player.idx]?"":"hidden"}>Step done ✓</span><button class="btn primary ${player.done[player.idx]?"rail":""}" id="pl-next">${last?"Finish":"Next step"}</button></div>`}
   ${VOICE_WARN}</div>`;
  const go=i=>{player.idx=i;renderToday()};bindLinks(el);bindCtl(el);
  el.querySelector("#pl-exit").onclick=()=>{const rv=player&&player.revisit,w=player&&player.s.w;player=null;extraSession=false;if(rv)openWeek(w);else renderToday()};
  el.querySelectorAll("[data-again]").forEach(b=>b.onclick=safe("logging the revisit",()=>{const s=player.s;if(b.dataset.again==="1"){toast=logAgain(s)}player=null;extraSession=false;renderToday();window.scrollTo(0,0)}));
  const bk=el.querySelector("#pl-back");if(bk)bk.onclick=()=>go(player.idx-1);
  const nx=el.querySelector("#pl-next");if(nx)nx.onclick=()=>go(player.idx+1);
  const W=WEEKS[st.w!==undefined&&st.w!=="all"?st.w:curWeek()];
  switch(st.kind){
   case"sound":{const q=el.querySelector("#snd-q"),tips=el.querySelector("#snd-tips");el.querySelector("#snd-play").onclick=()=>{sayNow("こんにちは");q.hidden=false};
    el.querySelector("#snd-ok").onclick=()=>{store.set("soundOK",true);stageDone();go(player.idx+1)};el.querySelector("#snd-no").onclick=()=>{tips.hidden=false;renderVoiceWarn()};el.querySelector("#snd-skip").onclick=()=>{stageDone();go(player.idx+1)};break}
   case"learn":learnItems=st.ids.map(byId).filter(Boolean);if(player.revisit)learnItems=shuffle(learnItems);learnIdx=0;onLearnDone=stageDone;
    el.querySelector("#ln-play").onclick=()=>learnOn?stopLearn():startLearn();el.querySelector("#ln-prev").onclick=()=>{learnIdx=(learnIdx-1+learnItems.length)%learnItems.length;restartLearnIf()};el.querySelector("#ln-next").onclick=()=>{learnIdx=(learnIdx+1)%learnItems.length;restartLearnIf()};startLearn();break;
   case"review":reviewWidget(el.querySelector("#rv"),st.ids,stageDone);break;case"cards":cardsWidget(el.querySelector("#cw"),st.n,st.max,stageDone,st.dir||"mix",st.ids);break;
   case"quiz":quizWidget(el.querySelector("#qz"),st.ids,st.n||8,stageDone,st.dir);break;
   case"listen":case"warm":case"sayback":case"meaning":listenSel=st.ids?{ids:st.ids}:{w:String(st.w),half:st.half||"all"};store.set("hideText",!!st.hide);store.set("ldir",st.kind==="meaning"||st.dir==="und"?"und":"say");listenItems=shuffle(buildListen());if(st.limit)listenItems=listenItems.slice(0,st.limit);listenIdx=0;listenOnce=true;onListenDone=stageDone;
    el.querySelector("#ls-play").onclick=()=>listening?stopListen():startListen();el.querySelector("#ls-prev").onclick=()=>{listenIdx=(listenIdx-1+listenItems.length)%listenItems.length;restartIf()};el.querySelector("#ls-next").onclick=()=>{listenIdx=(listenIdx+1)%listenItems.length;restartIf()};startListen();break;
   case"tip":stageDone();break;
   case"dialogue":case"roleplay":el.querySelectorAll("[data-word]").forEach(b=>b.onclick=()=>sayNow(b.dataset.word));bindDialogue(el,st.w);onDialogueDone=st.then!==undefined&&st.kind==="dialogue"?()=>{onDialogueDone=stageDone;const h=document.getElementById("dlg-hint");if(h)h.textContent="Once more, and this time it's your turn to speak…";setTimeout(()=>{if(player&&player.stages[player.idx]===st)runDialogue(st.then)},1200)}:stageDone;if(st.kind==="dialogue")runDialogue(st.mode);break;
   case"build":talk={mode:"build",max:st.max,only:st.only,hide:false};buildWidget(el.querySelector("#bw"),st.n,stageDone);break;
   case"answer":el.querySelectorAll("[data-word]").forEach(b=>b.onclick=()=>sayNow(b.dataset.word));talk={mode:"answer",max:st.max,only:st.only,hide:!!st.hide};talkItems=buildTalkItems();if(st.limit)talkItems=talkItems.slice(0,st.limit);talkIdx=0;talkOnce=true;onTalkDone=stageDone;
    el.querySelector("#tk-play").onclick=()=>talking?stopTalk():startTalk();el.querySelector("#tk-prev").onclick=()=>{talkIdx=(talkIdx-1+talkItems.length)%talkItems.length;if(talking){stopTalk();startTalk()}else drawTalk("")};el.querySelector("#tk-next").onclick=()=>{talkIdx=(talkIdx+1)%talkItems.length;if(talking){stopTalk();startTalk()}else drawTalk("")};startTalk();break;
   case"drill":renderDrill(st.drill,st.n,stageDone);break;
   case"speak":el.querySelectorAll("[data-say]").forEach(b=>b.onclick=()=>sayNow(W.phrases[+b.dataset.say][1],b));el.querySelector("#said").onclick=()=>{stageDone();go(player.idx+1)};break;
   case"intro":el.querySelectorAll("[data-intro]").forEach(b=>b.onclick=()=>sayNow(fill(INTRO[+b.dataset.intro][1],1),b));el.querySelector("#intro-play").onclick=async()=>{const my=++runId;stopSpeech();await sleep(80);for(const l of INTRO){if(my!==runId)return;await speak(fill(l[1],1),"ja");await sleep(400)}stageDone()};break;
   case"selfcheck":el.querySelector("#finish-week").onclick=safe("finishing the week",()=>{const checks=[...el.querySelectorAll("[data-chk]")].map(c=>c.checked);const cd=store.get("cando",{});checks.forEach((v,i)=>{if(v)cd[st.w+"-"+i]=true});store.set("cando",cd);toast=finishSession("ok",checks);player=null;extraSession=false;renderToday();window.scrollTo(0,0)});break;
   case"rate":el.querySelectorAll("[data-rate]").forEach(b=>b.onclick=safe("rating the session",()=>{b.disabled=true;b.textContent="Saving…";const names=store.get("groupNames",[]).filter(x=>x!==discordCfg().name);const withNames=[...el.querySelectorAll("[data-with]")].filter(c=>c.checked).map(c=>names[+c.dataset.with]);
      try{toast=finishSession(b.dataset.rate)}catch(e){if(!PLAN.log.some(l=>l.date===todayIso()&&l.key===skey(player.s))){PLAN.log.push({date:todayIso(),key:skey(player.s),w:player.s.w,d:player.s.d,rating:b.dataset.rate});PLAN.pos++;savePlan();toast="Saved. (Part of the wrap-up failed; details below.)"}throw e}
      finally{if(PLAN.pending&&withNames.length){PLAN.pending.with=withNames;savePlan()}player=null;extraSession=false;renderToday();window.scrollTo(0,0)}}));break}
  renderVoiceWarn()}

/* small widgets used inside a session */
let cardFace="say";
function cardsWidget(box,n,max,onDone,dir,ids){cardMax=max;cardIds=ids&&ids.length?ids:null;dir=dir||store.get("cardDir","mix");let count=0,rev=false;if(!card||card.w>cardMax||(cardIds&&!cardIds.includes(card.id)))pickCard();
  const face=()=>{cardFace=dir==="mix"?(Math.random()<0.5?"say":"und"):dir};face();
  function draw(){if(n<9999&&count>=n){box.innerHTML=`<div class="flash"><div class="phase">Done</div><div class="big">${n} of ${n}</div><p class="small muted">Tap <b>Next step</b>, or keep going.</p><div class="row" style="justify-content:center"><button class="btn" id="cw-more">One more</button></div></div>`;box.querySelector("#cw-more").onclick=()=>{n+=1;draw();if(cardFace==="und")sayNow(card.jp)};return}
    const boxes=store.get("boxes",{}),b=boxes[card.id]||0,und=cardFace==="und";
    const front=und?`<div class="ro" style="font-size:1.4rem;color:var(--ai)">${hl(card.ro)}</div><div class="jpw">${hl(card.jp)}</div>`:`<div class="big">${hl(card.en)}</div>`;
    const back=und?`<div class="big">${hl(card.en)}</div>`:`<div class="ro" style="font-size:1.4rem;color:var(--ai)">${hl(card.ro)}</div><div class="jpw">${hl(card.jp)}</div>`;
    box.innerHTML=`<div class="flash"><div class="small muted" style="font-variant-numeric:tabular-nums">${Math.min(count,n)} / ${n} · ${und?"Japanese → English":"English → Japanese"}</div>${front}${rev?`<div class="ans" style="border-top:1px solid var(--line);width:100%;padding-top:10px">${back}</div>`:`<div class="muted small">${und?"What does it mean?":"Say it in Japanese"}</div>`}<div class="boxes" aria-label="Level ${b} of 5">${[1,2,3,4,5].map(i=>`<i class="${i<=b?"f":""}"></i>`).join("")}</div></div>
     <div class="row" style="justify-content:center;margin-top:10px">${rev?`<button class="btn" id="cw-again">Again</button><button class="btn" id="cw-hear">Hear</button><button class="btn rail" id="cw-got">Got it</button>`:`${und?`<button class="btn" id="cw-hear">Hear</button>`:""}<button class="btn primary" id="cw-show" style="min-width:160px">Show answer</button>`}</div>`;
    const s=box.querySelector("#cw-show");if(s)s.onclick=()=>{rev=true;draw();sayNow(card.jp)};
    const h=box.querySelector("#cw-hear");if(h)h.onclick=()=>sayNow(card.jp);
    const tc=document.getElementById("turn-chip");if(tc&&!rev)tc.textContent=whose()+", you answer";
    const step=(delta)=>{const bx=store.get("boxes",{});bx[card.id]=delta>0?Math.min(5,(bx[card.id]||0)+1):Math.max(0,(bx[card.id]||0)-2);store.set("boxes",bx);count++;if(count===n)onDone();pickCard();face();rev=false;draw();if(cardFace==="und")sayNow(card.jp)};
    const g=box.querySelector("#cw-got");if(g)g.onclick=()=>step(1);const a=box.querySelector("#cw-again");if(a)a.onclick=()=>step(-1)}
  draw();if(cardFace==="und")sayNow(card.jp)}
/* tap quiz: meaning ↔ Japanese, misses come back */
function quizWidget(box,ids,n,onDone,forceDir){const items=ids.map(byId).filter(Boolean);if(items.length<2){box.innerHTML=`<div class="panel"><p class="small muted">Nothing to check yet.</p></div>`;onDone();return}
  const L=learnedIds(),poolAll=deck.filter(c=>(L.has(c.id)&&!!c.staff===!!(items[0]&&items[0].staff))||ids.includes(c.id));
  let queue=shuffle(items).slice(0,n).map(c=>({c,dir:forceDir||(c.staff?"und":Math.random()<0.5?"und":"say")})),total=queue.length,asked=0,firstRight=0,misses=[],round=1,q=null,answered=false,finished=false;
  const key=d=>d==="und"?"en":"ro";
  function options(c,dir){const k=key(dir),seen=new Set([c[k]]),out=[c];const cands=shuffle(poolAll.filter(x=>x.id!==c.id&&x.w===c.w)).concat(shuffle(poolAll.filter(x=>x.id!==c.id&&x.w!==c.w)));
    for(const x of cands){if(out.length>=3)break;if(!seen.has(x[k])){seen.add(x[k]);out.push(x)}}return shuffle(out)}
  function next(){if(!queue.length){if(misses.length&&round===1){round=2;queue=shuffle(misses).map(m=>({c:m.c,dir:m.dir}));misses=[];return next()}return finish()}q=queue.shift();q.opts=options(q.c,q.dir);answered=false;draw();if(q.dir==="und")sayNow(q.c.jp)}
  function finish(){finished=true;box.innerHTML=`<div class="flash"><div class="phase">All done</div><div class="big">${firstRight} of ${total} first try</div><p class="small muted">${firstRight===total?"Every meaning stuck. 🎌":"The ones you missed came back once, and they'll turn up again in your review cards."}</p></div>`;onDone()}
  function draw(){const und=q.dir==="und",k=key(q.dir);
    box.innerHTML=`<div class="flash" style="gap:12px"><div class="small muted" style="font-variant-numeric:tabular-nums">${asked+1} / ${total}${round===2?" · second chance":""}</div><div class="phase">${und?"What does it mean?":"Which one says it?"}</div>
      ${und?`<div class="ro" style="font-size:1.5rem;color:var(--ai)">${hl(q.c.ro)}</div><div class="jpw">${hl(q.c.jp)}</div><button class="say" id="qz-hear" aria-label="Hear it">${SPK}</button>`:`<div class="big">${hl(q.c.en)}</div>`}
      <div class="opts">${q.opts.map((o,i)=>`<button class="opt" data-opt="${i}" ${answered?"disabled":""}>${und?hl(o.en):hl(o.ro)}${!und&&answered&&o.id===q.c.id?`<span class="sub jpw">${hl(o.jp)}</span>`:""}</button>`).join("")}</div>
      <div id="qz-fb" style="min-height:1.6em"></div></div><div class="row" style="justify-content:center;margin-top:10px"><button class="btn primary" id="qz-next" ${answered?"":"hidden"}>Next</button></div>`;
    const hb=box.querySelector("#qz-hear");if(hb)hb.onclick=()=>sayNow(q.c.jp,hb);
    const tc=document.getElementById("turn-chip");if(tc&&!answered)tc.textContent=whose()+", you pick";
    box.querySelectorAll("[data-opt]").forEach(b=>b.onclick=()=>answer(q.opts[+b.dataset.opt],b));
    box.querySelector("#qz-next").onclick=()=>{asked++;next()}}
  function answer(o,btn){if(answered)return;answered=true;const right=o.id===q.c.id;asked<total&&round===1&&right&&firstRight++;
    box.querySelectorAll("[data-opt]").forEach(b=>{b.disabled=true;const oo=q.opts[+b.dataset.opt];if(oo.id===q.c.id)b.classList.add("ok");else if(b===btn)b.classList.add("bad")});
    const fb=box.querySelector("#qz-fb");fb.innerHTML=right?`<div class="pair">✓ <b>${hl(q.c.ro)}</b> = ${hl(q.c.en)}</div>`:`<div class="pair">Not quite. <b>${hl(q.c.ro)}</b> = ${hl(q.c.en)}${o.id!==q.c.id?`<br><span class="small muted">${hl(o.ro)} = ${hl(o.en)}</span>`:""}</div>`;
    if(right&&q.dir==="say"&&round===1){const r=srsAll()[q.c.id];if(r&&r.due<=todayIso())srsGrade(q.c.id,true)}
    if(!right){misses.push(q);if(srsAll()[q.c.id])srsGrade(q.c.id,false);const bx=store.get("boxes",{});bx[q.c.id]=Math.max(0,(bx[q.c.id]||0)-1);store.set("boxes",bx)}
    sayNow(q.c.jp);const nx=box.querySelector("#qz-next");nx.hidden=false;if(right)setTimeout(()=>{if(!answered||finished||box.querySelector("#qz-next")!==nx)return;asked++;next()},1400)}
  next()}
function buildWidget(box,n,onDone){let q=buildItem(),rev=false,count=0;
  function draw(){if(n<9999&&count>=n){box.innerHTML=`<div class="flash"><div class="phase">Done</div><div class="big">${n} of ${n}</div><p class="small muted">Tap <b>Next step</b>, or build one more.</p><div class="row" style="justify-content:center"><button class="btn" id="bw-more">One more</button></div></div>`;box.querySelector("#bw-more").onclick=()=>{n+=1;draw()};return}
    box.innerHTML=`<div class="flash"><div class="small muted" style="font-variant-numeric:tabular-nums">${Math.min(count,n)} / ${n}</div>${q?`<div class="big">${hl(q.en)}</div>${rev?`<div class="ans" style="border-top:1px solid var(--line);width:100%;padding-top:10px"><div class="ro" style="font-size:1.4rem;color:var(--ai)">${hl(q.ro)}</div><div class="jpw">${hl(q.jp)}</div></div>`:`<div class="muted small">Say it in Japanese</div>`}`:`<div class="muted">No patterns yet for this week.</div>`}</div>
    <div class="row" style="justify-content:center;margin-top:10px">${rev?`<button class="btn" id="bw-hear">Hear it again</button><button class="btn rail" id="bw-next">Next</button>`:`<button class="btn primary" id="bw-rev" style="min-width:160px" ${q?"":"disabled"}>Reveal</button><button class="btn" id="bw-skip">Skip</button></div>`}</div>`;
    const tc=document.getElementById("turn-chip");if(tc&&!rev)tc.textContent=whose()+", you build it";
    const r=box.querySelector("#bw-rev");if(r)r.onclick=()=>{rev=true;draw();sayNow(q.jp)};
    const h=box.querySelector("#bw-hear");if(h)h.onclick=()=>sayNow(q.jp);
    const nx=box.querySelector("#bw-next")||box.querySelector("#bw-skip");if(nx)nx.onclick=()=>{if(rev){count++;if(count===n)onDone()}q=buildItem();rev=false;draw()}}
  draw()}

