/* ---------- boot ---------- */
document.body.classList.toggle("nojp",!store.get("showJp",false));
show("today");
/* ---------- progress: the same merge rules serve per-account sync and the "move progress" code ---------- */
const SYNC_KEYS=["boxes","cando","discord","feedbackLog","gap","groupNames","hideEn","hideText","ldir","myPhrases","plan","pmode","profile","vrate","remindAt","showJp","driveLog","dmode","dlen","trip","srs"];
const SHARE_KEYS=SYNC_KEYS.filter(k=>!["discord","feedbackLog","groupNames"].includes(k));   // a progress code never carries webhook addresses or feedback
const progSnapshot=(keys)=>{const k={};for(const n of (keys||SYNC_KEYS)){const v=store.get(n,undefined);if(v!==undefined)k[n]=v}return k};
// Plans are compared as v2: a v1 plan (old app, another device) is converted first, so a v2 plan is never downgraded.
// The newer explicit "start over" wins; otherwise the plan further along the course; then a decided plan over one still showing the
// "New plan" card; then the one with more sessions logged.
const planScore=(p,S)=>{if(!p)return[-1];const v=planFromAny(p,S||{}).plan;return[v.resetAt||"",coursePos(v),v.choice==="pending"?0:1,(v.log||[]).length]};
const cmpScore=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){if(a[i]===b[i])continue;return a[i]>b[i]?1:-1}return 0};
const progScore=k=>planScore(k&&k.plan,k&&k.srs);
// Merge two sets of progress. Review records: the newest per item (so "learned" only grows). Sessions are a union, the plan further along wins,
// card levels take the max, checklists are a union.
function mergeProgress(lk,rk){const out={},remoteAhead=cmpScore(progScore(rk),progScore(lk))>=0;
  let srs=null;if(lk.srs||rk.srs){const l=lk.srs||{},r=rk.srs||{};srs=Object.assign({},l);for(const k in r){if(!srs[k]||(r[k].last||"")>(srs[k].last||""))srs[k]=r[k]}}
  for(const n of SYNC_KEYS){const r=rk[n],l=lk[n];if(n==="srs"){if(srs)out.srs=srs;continue}if(r===undefined){if(l!==undefined)out[n]=l;continue}if(l===undefined){out[n]=n==="plan"?planFromAny(r,srs||{},lk.boxes).plan:r;continue}
    if(n==="plan"){const L=planFromAny(l,srs||{},lk.boxes),R=planFromAny(r,srs||{},rk.boxes);if(srs){Object.assign(srs,L.srs,R.srs,srs)}
      const ahead=cmpScore(planScore(R.plan,srs),planScore(L.plan,srs))>=0,base=ahead?R.plan:L.plan,other=ahead?L.plan:R.plan;
      const seen=new Set((base.log||[]).map(x=>x.date+"|"+x.key)),log=(base.log||[]).slice();
      (other.log||[]).forEach(x=>{const id=x.date+"|"+x.key;if(!seen.has(id)){seen.add(id);log.push(x)}});log.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
      out.plan=Object.assign({},base,{log,focus:Object.assign({},other.focus||{},base.focus||{})});continue}
    if(n==="boxes"){const b=Object.assign({},l);for(const k in r)b[k]=Math.max(b[k]||0,r[k]||0);out[n]=b;continue}
    if(n==="cando"){out[n]=Object.assign({},l,r);continue}
    if(n==="driveLog"){const b=Object.assign({},l);for(const k in r)b[k]=Math.max(b[k]||0,r[k]||0);out[n]=b;continue}
    if(n==="feedbackLog"||n==="myPhrases"){const seen=new Set();out[n]=[...(remoteAhead?r:l),...(remoteAhead?l:r)].filter(x=>{const id=JSON.stringify(x);if(seen.has(id))return false;seen.add(id);return true}).slice(0,50);continue}
    out[n]=remoteAhead?r:l}
  return out}

const b64e=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""),b64d=s=>decodeURIComponent(escape(atob(s.replace(/-/g,"+").replace(/_/g,"/"))));
const progressCode=()=>"JP1."+b64e(JSON.stringify(progSnapshot(SHARE_KEYS)));
function loadProgressCode(raw){let o;try{const t=String(raw||"").replace(/\s+/g,"");if(!t.startsWith("JP1."))throw 0;o=JSON.parse(b64d(t.slice(4)))}catch(e){return{ok:false,msg:"That isn't a progress code. Copy it again from the other device (it starts with JP1.)."}}
  if(!o||typeof o!=="object"||!o.plan||!Array.isArray(o.plan.log))return{ok:false,msg:"That code has no progress in it."};
  const r={};SHARE_KEYS.forEach(k=>{if(o[k]!==undefined)r[k]=o[k]});const before=progSnapshot(SHARE_KEYS),m=mergeProgress(before,r);
  SHARE_KEYS.forEach(k=>{if(k in m)store.set(k,m[k])});PLAN=loadPlan();setVrate(store.get("vrate",1));
  const n=(m.plan&&m.plan.log||[]).length;return{ok:true,msg:"Loaded. You now have "+n+" sessions logged"+(m.srs?" and "+Object.keys(m.srs).length+" items on the memory schedule":"")+"."}}
/* ---------- per-account sync (Claude version): last-writer-wins, but progress never goes backwards ---------- */
(async()=>{if(!IN_CLAUDE)return;let db,uid;
  try{db=await claude.use("db");const u=await claude.use("user");uid=u&&await u.id()}catch(e){return}
  if(!db||!uid)return;
  const LOCAL_ONLY=new Set(["soundOK","notified","lastError","_dev","_t","resume","seenKinds","autoNext"]),KEYS=SYNC_KEYS;
  let dev;try{dev=localStorage.getItem("jp17:_dev")}catch(e){}if(!dev){dev=Math.random().toString(36).slice(2,10);try{localStorage.setItem("jp17:_dev",dev)}catch(e){}}
  const ref=db.doc("data/users/"+uid+"/app");let timer=null,busy=false,again=false,pending=null,applying=false,lastAt=0;
  const snapshot=()=>{const k={};for(const n of KEYS){const v=store.get(n,undefined);if(v!==undefined)k[n]=v}return k};
  const score=progScore;
  const stamp=d=>{try{return new Date(d).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}catch(e){return""}};
  // Merge a remote snapshot with what this device has. Sessions are a union, the higher course position wins,
  // card levels take the max, checklists are a union; everything else comes from whichever side is further along.
function merge(rk){return mergeProgress(snapshot(),rk)}
  async function push(){if(busy){again=true;return}busy=true;
    try{const at=Date.now();await ref.set({v:1,at,dev,keys:snapshot()});lastAt=at;SYNC.status="synced "+stamp(at)}
    catch(e){SYNC.status="sync paused, will retry";setTimeout(()=>SYNC.dirty("retry"),15000)}
    busy=false;if(again){again=false;push()}}
  function apply(d){const m=merge(d.keys||{});const before=JSON.stringify(snapshot());applying=true;for(const n of KEYS){if(n in m)store.set(n,m[n])}applying=false;
    PLAN=loadPlan();setVrate(store.get("vrate",1));practiceMode=store.get("pmode","listen");document.body.classList.toggle("nojp",!store.get("showJp",false));
    lastAt=Math.max(lastAt,d.at||0);SYNC.status="synced "+stamp(lastAt);SYNC.last=d.dev===dev?"this device":"another device at "+stamp(d.at||Date.now());
    const after=JSON.stringify(snapshot());if(JSON.stringify(d.keys||{})!==after)push();
    if(before!==after&&!player){try{VIEWS[curTab]()}catch(e){}}}
  function applyWhenIdle(){if(!pending)return;if(player||listening||talking||learnOn)return;const d=pending;pending=null;apply(d)}
  SYNC.dirty=k=>{if(applying||LOCAL_ONLY.has(k))return;clearTimeout(timer);timer=setTimeout(push,1500)};
  SYNC.on=true;SYNC.status="connecting";
  try{const snap=await ref.get(),d=snap&&snap.exists?snap.data():null;if(d&&d.keys)apply(d);else push()}catch(e){SYNC.status="sync paused, will retry"}
  try{ref.onSnapshot(sn=>{if(!sn||!sn.exists)return;const d=sn.data();if(!d||d.dev===dev||(d.at||0)<=lastAt)return;pending=d;applyWhenIdle()},()=>{SYNC.status="sync paused"})}catch(e){}
  setInterval(applyWhenIdle,3000);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"){clearTimeout(timer);push()}else applyWhenIdle()});
  if(curTab==="plan")renderPlan()})();
</script>
