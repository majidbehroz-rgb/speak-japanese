/* ---------- tabs ---------- */
let practiceMode=store.get("pmode","listen");
const VIEWS={today:renderToday,lessons:renderLessons,practice:()=>(({listen:renderListen,talk:renderTalk,cards:renderCards,drive:renderDrive})[practiceMode]||renderListen)(),translate:renderTranslate,plan:renderPlan};
const SECTION={today:"today",lessons:"lessons",practice:()=>practiceMode,translate:"translate",plan:"plan"};
let curTab="today";
function show(v){if(curTab==="today"&&v!=="today"&&player){if(player.done[player.idx])(player.stay=player.stay||{})[player.idx]=true;if(typeof autoCancel==="function")autoCancel();stepTok++}
  stopAll();onDialogueDone=null;curTab=v;const sec=typeof SECTION[v]==="function"?SECTION[v]():SECTION[v];
  document.querySelectorAll("nav.tabs button").forEach(b=>b.setAttribute("aria-selected",b.dataset.v===v));
  document.querySelectorAll("#app>section").forEach(s=>{const vis=s.id==="v-"+sec;s.hidden=!vis;if(!vis)s.innerHTML=""});
  VIEWS[v]();window.scrollTo(0,0)}
function showPractice(m){practiceMode=m;store.set("pmode",m);show("practice")}
let catFocus=null;
function openWeek(w,d){w=Math.max(0,Math.min(9,+w));lessonWeek=w;catFocus=(d===undefined||d===null||isNaN(d))?null:{w,d:+d};show("lessons");const f=document.querySelector(".cat li.focus");if(f)setTimeout(()=>f.scrollIntoView({block:"center",behavior:"smooth"}),50)}
function openTalk(mode,max){if(mode)talk.mode=mode;if(max!==undefined&&max!==null){talk.max=+max;talk.only=true}showPractice("talk")}
// what the learner may do with a course session from Lessons/Plan links: done → redo it; next → it starts from Today;
// more → optional practice once the week's learning days are learned; future/locked → contents only (rule 3: nothing is used before it is taught)
function sessState(w,d){const S=srsMap(),L=learnDays(w);if(PLAN.log.some(l=>l.w===w&&l.d===d&&!l.again))return"done";
  if(d<L){const it=sessionItems(w,d);if(it.length&&it.every(id=>S[id]))return"done"}
  const nx=PLAN.queue.slice(PLAN.pos).find(q=>!q.k&&!q.rep);if(nx&&nx.w===w&&nx.d===d)return"next";
  if(d>=L&&d<USE_D)return sessionsOfWeekLearned(w,S)?"more":"locked";return"future"}
function playSession(w,d,at){const st=sessState(w,d);if(st==="future"||st==="locked"){openWeek(w,d);return false}
  const c=current();show("today");if(st==="next"){if(c&&!c.k&&c.w===w&&c.d===d&&!c.rep)startSession({at});return true}
  startSession({revisit:{w,d,rep:0},at});return true}
function bindLinks(el){el.querySelectorAll("[data-goweek]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();const d=b.dataset.goday;openWeek(+b.dataset.goweek,d===undefined?null:+d)});
  el.querySelectorAll("[data-gotab]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();const t=b.dataset.gotab;if(t==="talk")openTalk(b.dataset.mode,b.dataset.max);else if(t==="practice")showPractice(b.dataset.mode||"listen");else show(t)});
  el.querySelectorAll("[data-play]").forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();const [w,d]=b.dataset.play.split("-").map(Number);playSession(w,d,b.dataset.at===undefined?undefined:+b.dataset.at)})}
const sessLink=(s,text)=>`<button class="link" data-play="${s.w}-${s.d}">${esc(text||sessionTitle(s))}</button>`;
document.querySelectorAll("nav.tabs button").forEach(b=>b.onclick=()=>show(b.dataset.v));
function practiceNav(){return`<div class="seg" role="group" aria-label="Practice"><button data-pm="listen" aria-pressed="${practiceMode==="listen"}">Listen</button><button data-pm="talk" aria-pressed="${practiceMode==="talk"}">Talk</button><button data-pm="cards" aria-pressed="${practiceMode==="cards"}">Cards</button><button data-pm="drive" aria-pressed="${practiceMode==="drive"}">Drive 🚗</button></div>`}
function bindPracticeNav(el){el.querySelectorAll("[data-pm]").forEach(b=>b.onclick=()=>showPractice(b.dataset.pm))}

