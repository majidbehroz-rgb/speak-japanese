/* ---------- OFFLINE (public build only): a service worker (sw.js) keeps the page and the recordings for use without data ----------
   Registered only when CFG.pub is true and the page is on https or localhost; the private build never registers one.
   Plan → Settings shows "Works offline: ready ✓" or a "Save for offline" button that stores every audio file. */
const OFFLINE_OK=!!(CFG.pub&&"serviceWorker" in navigator&&"caches" in window&&(location.protocol==="https:"||["localhost","127.0.0.1"].includes(location.hostname)));
if(OFFLINE_OK)navigator.serviceWorker.register("sw.js").catch(()=>{});
// the files the app needs offline: the page, the audio index and every sprite it names
async function offlineFiles(){await audioIndex();return["index.html","audio/index.json",...new Set(Object.values(AX.meta.clips).map(c=>"audio/"+c[0]))].map(p=>new URL(p,location.href).toString())}
async function offlineReady(){try{const files=await offlineFiles();for(const u of files)if(!(await caches.match(u,{ignoreSearch:true})))return false;return true}catch(e){return false}}
let offlineBusy=false;
// the download size, from the index: each sprite's furthest byte, summed, rounded to the nearest MB (null when the index is not loaded)
function offlineMB(){try{const end={};Object.values(AX.meta.clips).forEach(c=>{end[c[0]]=Math.max(end[c[0]]||0,c[1]+c[2])});const b=Object.values(end).reduce((a,x)=>a+x,0);return b?Math.max(1,Math.round(b/1e6)):null}catch(e){return null}}
async function offlineLine(box){if(!box)return;if(!OFFLINE_OK){box.hidden=true;return}box.hidden=false;
  if(offlineBusy)return;const ready=await offlineReady();if(!box.isConnected)return;
  if(ready){box.innerHTML=`<p class="small" style="margin:0">Works offline: ready ✓</p>`;return}
  const mb=offlineMB();
  box.innerHTML=`<div class="row"><button class="btn" id="off-save">Save for offline${mb?` (about ${mb} MB)`:""}</button><span class="small muted" id="off-msg"></span></div>`;
  box.querySelector("#off-save").onclick=async()=>{const b=box.querySelector("#off-save"),m=box.querySelector("#off-msg");b.disabled=true;offlineBusy=true;
    try{const reg=await navigator.serviceWorker.ready,files=await offlineFiles();const name=(await caches.keys()).filter(k=>k.startsWith("sj-")).pop();if(!name)throw new Error("no cache");const c=await caches.open(name);
      for(let i=0;i<files.length;i++){m.textContent=`Saving ${i+1} of ${files.length}…`;const r=await fetch(files[i],{cache:"reload"});if(!r.ok)throw new Error(files[i]+" "+r.status);await c.put(files[i],r)}
      offlineBusy=false;offlineLine(box)}
    catch(e){offlineBusy=false;b.disabled=false;m.textContent="Couldn't save everything; try again with a connection."}}}
