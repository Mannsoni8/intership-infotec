<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>SyncDoc - README</title>
<style>
:root{--bg:#f4f6fa;--fg:#14213d;--muted:#5c6784;--card:#fff;--line:#d5dae5;--teal:#00a896;--amber:#f4a100;--navy:#14213d;--term:#0f1b36;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0b1326;--fg:#e8edf8;--muted:#9fb0d3;--card:#14213d;--line:#27386300;--line:#2a3b66;--term:#070d1c}}
:root[data-theme="dark"]{--bg:#0b1326;--fg:#e8edf8;--muted:#9fb0d3;--card:#14213d;--line:#2a3b66;--term:#070d1c}
html{scroll-padding-top:env(safe-area-inset-top,0px);scroll-behavior:smooth}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
main{max-width:920px;margin:0 auto;padding:0 20px 80px}
section{padding:56px 0 8px}
h2{font-size:28px;margin:0 0 6px}h2 small{display:block;font-size:14px;font-weight:400;color:var(--muted)}
p{margin:8px 0}code{font-family:ui-monospace,Consolas,monospace;background:color-mix(in srgb,var(--teal) 14%,transparent);padding:1px 6px;border-radius:5px;font-size:.9em}
.hero{text-align:center;padding:90px 0 40px;position:relative}
.hero:before{content:"";position:absolute;left:50%;top:40px;width:420px;height:420px;margin-left:-210px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--teal) 30%,transparent),transparent 65%);animation:pulse 5s ease-in-out infinite;z-index:-1}
@keyframes pulse{50%{transform:scale(1.18);opacity:.7}}
h1{font-size:clamp(44px,9vw,76px);margin:0;letter-spacing:-2px}
h1 i{display:inline-block;width:.07em;height:.85em;background:var(--teal);margin-left:6px;vertical-align:-.05em;animation:blink 1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.lead{max-width:640px;margin:14px auto;color:var(--muted);font-size:18px}
.badge{display:inline-block;background:var(--teal);color:#fff;padding:5px 16px;border-radius:99px;font-weight:600;font-size:14px}
.chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:22px}
.chip{background:var(--card);border:1px solid var(--line);padding:5px 13px;border-radius:99px;font-size:13px}
.reveal{opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s ease;transition-delay:var(--d,0s)}
.reveal.in{opacity:1;transform:none}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px}
svg text{font-family:system-ui,sans-serif}
.flow{width:100%;height:auto}
.dash{stroke-dasharray:6 6;animation:dash 1s linear infinite}@keyframes dash{to{stroke-dashoffset:-12}}
.term{background:var(--term);color:#d6e2ff;border-radius:12px;padding:16px 18px;font:14px/1.8 ui-monospace,Consolas,monospace;min-height:190px;overflow-x:auto;white-space:pre}
.term .c{color:#7d8fb8}.term .p{color:var(--teal)}
.term b{display:inline-block;width:8px;height:15px;background:#d6e2ff;vertical-align:-2px;animation:blink 1s steps(1) infinite}
.demo{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:640px){.demo{grid-template-columns:1fr}}
.tab{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.tab header{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--line);font-size:13px}
.tab header i{width:10px;height:10px;border-radius:50%}
.pane{padding:14px;min-height:130px;font-size:15px;white-space:pre-wrap;overflow-wrap:anywhere}
.pane h4{margin:0 0 6px;font-size:18px}
.flash{animation:flash 1.2s ease}@keyframes flash{0%{background:#fff3b0;color:#14213d}100%{background:transparent}}
.cur{display:inline-block;width:2px;height:1.1em;vertical-align:-3px;position:relative;margin-left:1px}
.cur em{position:absolute;bottom:100%;left:-2px;font:600 10px/14px system-ui;font-style:normal;color:#fff;padding:0 5px;border-radius:3px 3px 3px 0;white-space:nowrap}
.lock{font-size:11px;color:#fff;background:#3cb44b;padding:1px 8px;border-radius:8px;float:right}
.weeks{display:grid;gap:14px;position:relative}
.week{display:grid;grid-template-columns:48px 1fr;gap:14px}
.num{width:44px;height:44px;border-radius:50%;background:var(--teal);color:#fff;display:grid;place-items:center;font-weight:700;transition:transform .5s}
.week.in .num{animation:pop .6s ease}@keyframes pop{0%{transform:scale(.3)}70%{transform:scale(1.2)}100%{transform:scale(1)}}
.week h3{margin:0 0 4px;font-size:18px}.week ul{margin:0;padding-left:18px;color:var(--muted)}
table{width:100%;border-collapse:collapse;font-size:14px}
td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}td:first-child{font-weight:700;width:30%}
tr{opacity:0;transform:translateX(-18px);transition:all .45s ease;transition-delay:var(--d,0s)}tr.in{opacity:1;transform:none}
.warn{border-left:4px solid var(--amber);margin:10px 0;border-radius:6px}
details{margin:8px 0}summary{cursor:pointer;font-weight:600}
pre.tree{margin:10px 0 0;font:13px/1.6 ui-monospace,Consolas,monospace;overflow-x:auto;color:var(--muted)}
button.theme{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));right:12px;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:99px;padding:6px 12px;cursor:pointer;font-size:13px;z-index:5}
@media (prefers-reduced-motion:reduce){*,*:before{animation:none!important;transition:none!important}.reveal,tr{opacity:1;transform:none}}
</style>
</head>
<body>
<button class="theme" id="theme" aria-label="Toggle theme">Light / Dark</button>
<main>
<div class="hero reveal">
  <span class="badge">Status: Weeks 1 - 4 complete</span>
  <h1>SyncDoc<i></i></h1>
  <p class="lead">A block based document editor where many people edit the same document at the same time without overwriting each other (Yjs CRDT), with an AST tree stored in MongoDB.</p>
  <div class="chips" id="tech"></div>
</div>

<section><h2 class="reveal">How a request flows<small>Two roads from the browser to the server, one road to the database</small></h2>
<div class="card reveal">
<svg class="flow" viewBox="0 0 720 230" role="img" aria-label="Browser to server to MongoDB flow">
 <defs><marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#00a896"/></marker></defs>
 <g font-size="17" font-weight="700" text-anchor="middle">
  <rect x="10" y="50" width="170" height="110" rx="14" fill="var(--card)" stroke="var(--line)"/><text x="95" y="95" fill="var(--fg)">Browser</text><text x="95" y="118" font-size="12" font-weight="400" fill="var(--muted)">React + Yjs client</text>
  <rect x="275" y="50" width="170" height="110" rx="14" fill="#14213d"/><text x="360" y="95" fill="#fff">Server</text><text x="360" y="118" font-size="12" font-weight="400" fill="#cadcfc">Express + ws</text>
  <rect x="540" y="50" width="170" height="110" rx="14" fill="var(--card)" stroke="var(--line)"/><text x="625" y="95" fill="var(--fg)">MongoDB</text><text x="625" y="118" font-size="12" font-weight="400" fill="var(--muted)">users + block tree</text>
 </g>
 <line class="dash" x1="180" y1="82" x2="272" y2="82" stroke="#00a896" stroke-width="3" marker-end="url(#ar)"/>
 <line class="dash" x1="180" y1="128" x2="272" y2="128" stroke="#f4a100" stroke-width="3"/>
 <line class="dash" x1="445" y1="105" x2="537" y2="105" stroke="#00a896" stroke-width="3" marker-end="url(#ar)"/>
 <text x="226" y="72" font-size="11" text-anchor="middle" fill="var(--muted)">REST + JWT</text>
 <text x="226" y="148" font-size="11" text-anchor="middle" fill="var(--muted)">WebSocket</text>
 <text x="491" y="95" font-size="11" text-anchor="middle" fill="var(--muted)">Mongoose</text>
 <circle r="5" fill="#00a896"><animateMotion dur="2.4s" repeatCount="indefinite" path="M180 82 L272 82"/></circle>
 <circle r="5" fill="#00a896"><animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path="M445 105 L537 105"/></circle>
 <circle r="5" fill="#f4a100"><animateMotion dur="1.6s" repeatCount="indefinite" path="M180 128 L272 128 L180 128"/></circle>
 <circle r="5" fill="#f4a100"><animateMotion dur="1.6s" begin=".8s" repeatCount="indefinite" path="M272 128 L180 128 L272 128"/></circle>
 <text x="360" y="205" font-size="12" text-anchor="middle" fill="var(--muted)">Autosave every 2 s: live Yjs copy -> block tree -> DOMPurify -> MongoDB</text>
</svg></div></section>

<section><h2 class="reveal">How to run<small>Node 18+ and MongoDB (or an Atlas link)</small></h2>
<div class="term reveal" id="term"></div>
<p class="reveal">Demo accounts after <code>npm run seed</code> (password <code>Password123!</code>): <code>alice@example.com</code>, <code>bob@example.com</code>.</p>
<p class="reveal">Editor shortcuts: <code>Enter</code> new block, <code>Tab</code> / <code>Shift+Tab</code> indent / outdent a list item, <code>Backspace</code> in an empty block deletes it, arrows move between blocks.</p>
<details class="card reveal"><summary>Run the tests</summary>
<div class="term" style="min-height:0;margin-top:10px"><span class="p">$</span> npm run typecheck
<span class="p">$</span> npm test                <span class="c"># unit + sync tests, no database needed</span>
<span class="p">$</span> TEST_MONGO_URI=mongodb://127.0.0.1:27017/syncdoc-test npm test</div>
<p class="muted">The api tests wipe the database named in <code>TEST_MONGO_URI</code> - never point it at real data.</p></details>
</section>

<section><h2 class="reveal">Try the collaboration<small>Two tabs, two logins (each tab keeps its own session)</small></h2>
<div class="demo reveal">
 <div class="tab"><header><i style="background:#e6194b"></i><b>Alice</b><span class="lock" id="lockA" style="visibility:hidden;background:#e6194b">Alice is editing</span></header><div class="pane" id="pA"></div></div>
 <div class="tab"><header><i style="background:#3cb44b"></i><b>Bob</b><span class="lock" id="lockB" style="visibility:hidden">Bob is editing</span></header><div class="pane" id="pB"></div></div>
</div>
<p class="muted reveal">Live demo of what you will see: the other person's caret, a block lock badge, and a yellow flash when a block changes.</p></section>

<section><h2 class="reveal">What was built</h2><div class="weeks" id="weeks"></div></section>

<section><h2 class="reveal">Security<small>Every risk and what is done about it</small></h2>
<div class="card reveal" style="padding:6px 8px"><table id="sec"></table></div></section>

<section><h2 class="reveal">Known limitations<small>The honest list</small></h2><div id="lim"></div></section>

<section><h2 class="reveal">Folder structure</h2>
<details class="card reveal" open><summary>syncdoc/</summary><pre class="tree">  scripts/setup.js          creates server/.env with a random JWT secret
  client/src/
    components/             Block, CursorLayer, EditorPage, DocumentList, LoginPage, SharePanel, PresenceBar
    context/                AuthContext, CursorContext (atomic cursor state)
    hooks/useCollabDoc.ts   Yjs connection, presence, cursors, locks, block actions
    utils/                  deltas (caret transform), textDiff, stable, dom (+ unit tests)
  server/src/
    models/                 User, Document (recursive AST validation + DOMPurify)
    routes/                 auth, documents (CRUD, share, import, export)
    sync/                   syncServer (Yjs websocket, locks, autosave), deps
    utils/                  blockTree, markdown, exportHtml, exportPdf, sanitize
    __tests__/              unit, sync (10 clients) and api (integration) tests</pre></details></section>
</main>
<script>
var $=function(s){return document.querySelector(s)},reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
function esc(t){var d=document.createElement("div");d.textContent=t;return d.innerHTML}
// theme toggle
$("#theme").onclick=function(){var r=document.documentElement,dark=r.dataset.theme?r.dataset.theme==="dark":matchMedia("(prefers-color-scheme:dark)").matches;r.dataset.theme=dark?"light":"dark"};
// data (from the README)
["React","TypeScript","Vite","Node.js + Express","MongoDB + Mongoose","WebSocket (ws) + Yjs","JWT, bcrypt, helmet, rate limit, DOMPurify","pdfkit export","Jest + Supertest + Vitest"].forEach(function(t,i){var s=document.createElement("span");s.className="chip reveal";s.style.setProperty("--d",i*.06+"s");s.textContent=t;$("#tech").appendChild(s)});
var weeks=[["1","Week 1 - AST model and document UI",["Nested Mongoose schema; a recursive pre('save') hook checks unique ids, max depth, list rules and fills parentId, depth and path.","React UI to list, create, import and delete documents; block components for every type."]],
["2","Week 2 - Real time engine",["WebSocket server with Yjs rooms, presence and block locking (\"Alice is editing\").","Edits autosaved to MongoDB every 2 seconds, so nothing is lost on restart."]],
["M","Mid-project review",["Markdown <-> JSON AST mapping, used for import and export.","10 concurrent clients test: all clients end identical, no character lost.","Remote changes do not corrupt your typing: the caret moves with the change."]],
["3","Week 3 - Export and cursors",["Export to PDF, HTML and Markdown; HTML is escaped, sanitized and has its own Content-Security-Policy.","CursorContext: atomic reducer state; blocks are React.memo so only the changed block updates."]],
["4","Week 4 - Security and live cursors",["DOMPurify cleans every block before it is saved.","Live cursors and selections with name and color (Yjs relative positions).","Block states: blue bar = you, colored bar + badge = locked, yellow flash = just changed."]]];
weeks.forEach(function(w,i){var d=document.createElement("div");d.className="week reveal";d.style.setProperty("--d",i*.08+"s");d.innerHTML='<div class="num">'+w[0]+'</div><div class="card"><h3>'+esc(w[1])+"</h3><ul>"+w[2].map(function(x){return"<li>"+esc(x)+"</li>"}).join("")+"</ul></div>";$("#weeks").appendChild(d)});
var sec=[["Passwords","bcrypt (cost 12), 8-72 characters, hash never returned"],["Login tokens","JWT HS256 (algorithm fixed, 8h); secret must be 32+ chars or the server will not start"],["Brute force","rate limit on login / register (20 per 15 min per ip) and on the whole api"],["Who can open a document","only owner and collaborators: REST and WebSocket both check it; others get \"not found\""],["Removed collaborator","his live WebSocket is closed immediately"],["Owner-only actions","rename, delete, share, remove people"],["XSS","DOMPurify strips markup from every block and title before saving; React escapes output; exported HTML is escaped, sanitized again and has a CSP"],["NoSQL injection","all inputs type-checked, ids validated, sanitizeFilter is on"],["Fake data over WebSocket","ids / types / depth repaired before saving; max 1000 blocks, 10000 chars per block, 1 MB per message"],["Lock spoofing","lock name and color come from the logged in user, not from the client"],["CSRF / CSWSH","token sent in a header (not a cookie); WebSocket checks the Origin"],["Headers","helmet, CORS only for CLIENT_ORIGIN, 300 KB body limit"],["Errors","internal errors are logged, users only see a generic message"],["Downloads","exports are attachments with no-store"]];
$("#sec").innerHTML=sec.map(function(r,i){return'<tr style="--d:'+(i%7)*.05+'s"><td>'+esc(r[0])+"</td><td>"+esc(r[1])+"</td></tr>"}).join("");
var lim=["Locks are \"soft\": the UI makes a locked block read-only, the server keeps the lock table but does not reject a modified client. Being a CRDT, such edits are still merged, never lost.","Code blocks keep < and > (never inserted as HTML). Other block types have all markup removed, so typing literal tags like <b> in normal text removes them.","PDF and non-English text: built-in fonts only support Latin characters, others become ?. Set PDF_FONT_PATH in server/.env to a .ttf font (e.g. Noto Sans).","The JWT is sent in the WebSocket URL (browsers cannot set headers there). Do not log full URLs in production.","The token is in sessionStorage, so an XSS bug could read it. Use HTTPS in production.","Rate limits are per server process. No password reset, email verification or refresh tokens yet.","Tested on Node 22 against a MongoDB-compatible server (FerretDB); no dependency needs more than Node 18; package-lock.json is included (use npm ci).","The browser UI was type-checked, built and unit tested but not clicked through in an automated browser test - please try the two-tab demo yourself."];
$("#lim").innerHTML=lim.map(function(t,i){return'<div class="card warn reveal" style="--d:'+i*.05+'s">'+esc(t)+"</div>"}).join("");
// scroll reveal
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.15});
document.querySelectorAll(".reveal,tr").forEach(function(el){io.observe(el)});
// terminal typing
var lines=[["cd syncdoc",""],["npm install",""],["npm run setup","creates server/.env with a random JWT secret"],["npm run seed","2 demo users + 2 documents (optional)"],["npm run dev:server","terminal 1 -> http://localhost:5000"],["npm run dev:client","terminal 2 -> http://localhost:5173"]];
function plainTerm(){$("#term").innerHTML=lines.map(function(l){return'<span class="p">$</span> '+esc(l[0])+(l[1]?'   <span class="c"># '+esc(l[1])+"</span>":"")}).join("\n")}
function typeTerm(){var out="",li=0,ci=0,t=$("#term");(function step(){if(li>=lines.length){t.innerHTML=out+'<span class="p">$</span> <b></b>';return}var l=lines[li];if(ci<=l[0].length){t.innerHTML=out+'<span class="p">$</span> '+esc(l[0].slice(0,ci))+"<b></b>";ci++;setTimeout(step,45)}else{out+='<span class="p">$</span> '+esc(l[0])+(l[1]?'   <span class="c"># '+esc(l[1])+"</span>":"")+"\n";li++;ci=0;setTimeout(step,260)}})()}
if(reduce)plainTerm();else{var tio=new IntersectionObserver(function(e){if(e[0].isIntersecting){tio.disconnect();typeTerm()}},{threshold:.5});tio.observe($("#term"))}
// live collaboration demo
var H="Payment Service Spec",A="Alice types here. ",B=" Bob adds a line.";
function pane(p,head,body,cur,col,flash){p.innerHTML="<h4>"+esc(head)+"</h4><span"+(flash?' class="flash"':"")+">"+esc(body)+"</span>"+(cur?'<span class="cur" style="background:'+col+'"><em style="background:'+col+'">'+cur+"</em></span>":"")}
function demo(){var n=0;function frame(){var a=A.slice(0,Math.min(n,A.length)),b=n>A.length?B.slice(0,n-A.length):"",txt=a+b,phase=n<=A.length;
 $("#lockA").style.visibility=phase?"visible":"hidden";$("#lockB").style.visibility=phase?"hidden":"visible";
 pane($("#pA"),H,txt,phase?"":"Bob","#3cb44b",false);pane($("#pB"),H,txt,phase?"Alice":"","#e6194b",true);
 n++;if(n>A.length+B.length+14)n=0;setTimeout(frame,n===0?1400:85)}frame()}
if(reduce){pane($("#pA"),H,A+B,"","#000");pane($("#pB"),H,A+B,"","#000")}else{var dio=new IntersectionObserver(function(e){if(e[0].isIntersecting){dio.disconnect();demo()}},{threshold:.3});dio.observe($(".demo"))}
</script>
</body>
</html>
