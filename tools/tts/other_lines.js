// every line spoken by the other person (conversation speaker A, questions) with the staff-voice key it should have
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const ROOT='/home/claude/speak-japanese';
const srv=http.createServer((q,r)=>{let p=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':p.endsWith('.html')?'text/html; charset=utf-8':p.endsWith('.json')?'application/json':'application/octet-stream'});r.end(b)})}).listen(8771,async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({serviceWorkers:'block'});const p=await ctx.newPage();
 await p.goto('http://localhost:8771/index.html');await p.waitForTimeout(1200);
 const out=await p.evaluate(()=>{const o=[];
  WEEKS.forEach((W,w)=>W.dialogue.forEach((l,i)=>{const L=dlgLine(l);if(L.voice==='other')o.push({kind:'dialogue',key:'k:'+fill(l[2],0),voice:'other',jp:fill(l[1],1),ro:fill(l[2],0),en:fill(l[3],2),where:`W${w+1} conversation line ${i+1} (${l[0]})`})}));
  QA.forEach((q,i)=>o.push({kind:'qa',key:'k:'+fill(q.q[0],0),voice:'other',jp:fill(q.q[1],1),ro:fill(q.q[0],0),en:fill(q.q[2],2),where:`W${q.w+1} question ${i+1}`}));
  return o});
 fs.writeFileSync(process.argv[2],JSON.stringify(out));console.log(out.length,'other-speaker lines');await b.close();srv.close()});
