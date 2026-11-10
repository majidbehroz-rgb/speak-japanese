/* ---------- storage ---------- */
const mem={};window.SYNC={on:false,status:"",dirty(){}};
const store={get(k,d){if(k in mem)return mem[k];try{const v=localStorage.getItem("jp17:"+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
 set(k,v){mem[k]=v;try{localStorage.setItem("jp17:"+k,JSON.stringify(v))}catch(e){}if(window.SYNC)SYNC.dirty(k)}};

/* ---------- errors: show them instead of failing silently ---------- */
function showError(e,where){try{const msg=(e&&e.message)||String(e),rec={msg,where:where||"",stack:((e&&e.stack)||"").split("\n").slice(0,4).join(" | "),at:new Date().toISOString(),build:typeof BUILD==="string"?BUILD:"?"};
  store.set("lastError",rec);let box=document.getElementById("errbox");if(!box){box=document.createElement("div");box.id="errbox";box.setAttribute("role","alert");document.body.appendChild(box)}
  box.innerHTML=`<div><b>Something went wrong${where?" in "+where:""}.</b> ${msg}</div><div class="row"><button class="btn" id="err-copy">Copy details</button><button class="btn" id="err-x">Dismiss</button><span class="small">Paste this into Feedback or #app-feedback.</span></div>`;
  const text=`${rec.where}: ${rec.msg} (build ${rec.build}, ${rec.at})\n${rec.stack}`;box.querySelector("#err-copy").onclick=()=>{const b=box.querySelector("#err-copy");try{navigator.clipboard.writeText(text).then(()=>b.textContent="Copied",()=>b.textContent=text)}catch(x){b.textContent=text}};
  box.querySelector("#err-x").onclick=()=>box.remove()}catch(x){}}
window.addEventListener("error",ev=>showError(ev.error||ev.message,""));window.addEventListener("unhandledrejection",ev=>showError(ev.reason,""));
const safe=(where,fn)=>function(){try{const r=fn.apply(this,arguments);if(r&&typeof r.catch==="function")r.catch(e=>showError(e,where));return r}catch(e){showError(e,where)}};

