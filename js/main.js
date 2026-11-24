const DATA_FILES = {games:"data/games.json", videos:"data/videos.json", profile:"data/profile.json", logs:"data/logs.json"};
const API_BASE = "https://game-hub-api.zongyooou.workers.dev";
let adminSession = sessionStorage.getItem("gamehub-session") || "";
function apiHeaders(){return {"Content-Type":"application/json", ...(adminSession?{Authorization:"Bearer "+adminSession}:{})}}
async function api(path, options={}){const r=await fetch(API_BASE+path,{...options,headers:{...apiHeaders(),...(options.headers||{})}});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||("API "+r.status));return body}
function consumeLoginToken(){const m=location.hash.match(/(?:^|[&#])gh_session=([^&]+)/);if(m){adminSession=decodeURIComponent(m[1]);sessionStorage.setItem("gamehub-session",adminSession);history.replaceState(null,"",location.pathname+location.search)}}
consumeLoginToken();
const SAMPLE = {
  games:[
    {name:"Clash Royale",category:"Mobile",player_id:"YOUR_PLAYER_ID",description:"皇室戰爭好友邀請中心。更新你的玩家標籤與邀請連結。",cover:"",qrcode:"",invite_url:""},
    {name:"Monster Strike",category:"Mobile",player_id:"YOUR_PLAYER_ID",description:"怪物彈珠（日版）玩家資訊與好友邀請。",cover:"",qrcode:"",invite_url:""},
    {name:"Minecraft",category:"PC",player_id:"Java Edition",description:"Minecraft Java Edition 生存世界與遊戲紀錄。",cover:"",qrcode:"",invite_url:""}
  ],
  videos:[],
  logs:[],
  profile:{name:"ZONGYOU",avatar:"Z",bio:"喜歡遊戲，也喜歡記錄遊戲中的每一刻。",social:[]}
};
let data = structuredClone(SAMPLE), currentFilter="全部", activeGame=null, activeVideo=null;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const safe = v => String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function assetPath(path){return path||""}
function youtubeId(url){try{const u=new URL(url);if(u.hostname.includes("youtu.be"))return u.pathname.slice(1);if(u.searchParams.get("v"))return u.searchParams.get("v");const m=u.pathname.match(/\/(embed|shorts|live)\/([^/?]+)/);return m?m[2]:""}catch{return""}}
async function loadData(){for(const [key,path] of Object.entries(DATA_FILES)){try{const r=await fetch(path);if(r.ok)data[key]=await r.json()}catch(e){console.info("Using sample data for",path)}}localStorage.removeItem("gamehub-draft");data.logs=data.logs||[];renderAll()}
async function saveDraft(){renderAll();$("#admin-status").textContent="正在建立 GitHub 備份並發布資料…";try{await api("/api/data",{method:"PUT",body:JSON.stringify(data)});$("#admin-status").textContent="雲端發布成功：已先備份 GitHub 舊資料，再更新正式資料。";toast("雲端資料已發布")}catch(e){$("#admin-status").textContent="雲端發布失敗：本次變更尚未同步，請勿重新整理；請檢查登入或 API 設定後重試。"+e.message;toast("發布失敗，請勿重新整理頁面")}}
function renderGames(){const q=$("#game-search").value.trim().toLowerCase();const games=data.games.filter(g=>(currentFilter==="全部"||g.category===currentFilter)&&`${g.name} ${g.description||""} ${g.player_id||""}`.toLowerCase().includes(q));$("#game-count").textContent=`${String(data.games.length).padStart(2,"0")} GAMES`;$("#stat-games").textContent=String(data.games.length).padStart(2,"0");$("#game-grid").innerHTML=games.length?games.map(g=>{const i=data.games.indexOf(g);return `<article class="game-card" data-game="${i}" tabindex="0"><div class="game-cover">${g.cover?`<img src="${safe(assetPath(g.cover))}" alt="">`:`<span class="cover-fallback">${safe(g.name.slice(0,2).toUpperCase())}</span>`}</div><div class="game-card-body"><h3 class="game-card-title">${safe(g.name)}</h3><div class="game-card-desc">${safe(g.description||"查看遊戲資訊與好友邀請。")}</div><div class="game-card-foot"><span>${g.player_id?"PLAYER PROFILE":"GAME DETAILS"}</span><span class="card-arrow">↗</span></div></div></article>`}).join(""):`<div class="empty-state">找不到符合條件的遊戲。</div>`;$$(".game-card").forEach(el=>{el.addEventListener("click",()=>openGame(+el.dataset.game));el.addEventListener("keydown",e=>{if(e.key==="Enter")openGame(+el.dataset.game)})})}
function renderVideos(){const videos=data.videos;$("#stat-videos").textContent=String(videos.length).padStart(2,"0");const featured=videos[0];const featuredId=featured?youtubeId(featured.url):"";if(!featured){$("#video-feature").innerHTML=`<div class="video-player-placeholder"><span class="play-symbol">▶</span><span>NO VIDEO YET</span></div><div class="video-feature-info"><div class="eyebrow">FEATURED VIDEO</div><h3>尚未新增影片</h3><p>可以從管理內容新增 YouTube 影片。</p></div>`}else{$("#video-feature").innerHTML=`<div class="video-player-placeholder" data-video="0">${featuredId?`<img class="featured-thumb" src="https://img.youtube.com/vi/${safe(featuredId)}/hqdefault.jpg" alt="${safe(featured.title)} 封面" onerror="this.style.display=\'none\'">`:""}<span class="play-symbol">▶</span><span>PLAY FEATURED VIDEO</span></div><div class="video-feature-info"><div class="eyebrow">FEATURED VIDEO · ${safe(featured.category||"VIDEO")}</div><h3>${safe(featured.title)}</h3><p>${safe(featured.description||"點擊播放影片，或開啟 YouTube。")}</p><button class="button button-primary" id="featured-play">立即播放 ↗</button></div>`;$("#video-feature").querySelector(".video-player-placeholder").addEventListener("click",()=>openVideo(0));$("#featured-play").addEventListener("click",()=>openVideo(0))}
$("#video-grid").innerHTML=videos.slice(1).map((v,n)=>{const id=youtubeId(v.url);return `<article class="video-card" data-video="${n+1}"><div class="video-thumb">${id?`<img src="https://img.youtube.com/vi/${safe(id)}/hqdefault.jpg" alt="">`:""}</div><div class="video-card-info"><strong>${safe(v.title)}</strong><span>${safe(v.category||"影片")} · 點擊播放</span></div></article>`}).join("");$$(".video-card").forEach(el=>el.addEventListener("click",()=>openVideo(+el.dataset.video)))}
function renderProfile(){const p=data.profile;$("#profile-name").textContent=p.name||"PLAYER";$("#profile-avatar").textContent=p.avatar||"G";$("#profile-bio").textContent=p.bio||"";$("#hero-description").textContent=p.bio||"收藏遊戲、分享好友邀請，紀錄每一段冒險。";$("#social-links").innerHTML=(p.social||[]).map(s=>`<a href="${safe(s.url)}" target="_blank" rel="noopener">${safe(s.name)} ↗</a>`).join("")}
function renderAll(){renderGames();renderVideos();renderLogs();renderProfile()}
function renderLogs(){
 const logs=[...(data.logs||[])].sort((a,b)=>(b.date||"").localeCompare(a.date||""));
 $("#journal-list").innerHTML=logs.length?logs.map(log=>{
  const images=(log.images||[]).map(src=>'<img src="'+safe(src)+'" alt="遊戲截圖" loading="lazy">').join("");
  const id=youtubeId(log.video_url||"");
  const video=id?'<div class="journal-video"><iframe src="https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'" title="'+safe(log.title)+'" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>':'<div class="journal-video journal-video-empty"></div>';
  return '<article class="journal-entry"><div class="journal-copy"><div class="journal-date">'+safe(log.date||"")+'</div><h3>'+safe(log.title||"未命名進度")+'</h3><p>'+safe(log.content||"").replace(/\n/g,"<br>")+'</p>'+(images?'<div class="journal-images">'+images+'</div>':"")+'</div>'+video+'</article>';
 }).join(""):'<div class="empty-state">目前還沒有遊戲日誌。登入管理介面，新增今天的遊玩進度吧。</div>';
}
function openGame(i){const g=data.games[i];if(!g)return;activeGame=g;$("#modal-game-title").textContent=g.name;$("#modal-category").textContent=g.category||"GAME";$("#modal-description").textContent=g.description||"";$("#modal-player-id").textContent=g.player_id||"未提供";$("#modal-cover").innerHTML=g.cover?`<img src="${safe(g.cover)}" alt="">`:safe(g.name.slice(0,2).toUpperCase());$("#modal-actions").innerHTML=`${g.invite_url?`<a class="button button-primary" href="${safe(g.invite_url)}" target="_blank" rel="noopener">加入好友 ↗</a>`:""}${g.qrcode?`<button class="button button-quiet" id="show-qr">顯示 QR Code</button>`:""}`;$("#modal-qr-wrap").hidden=true;if(g.qrcode)$("#modal-actions").querySelector("#show-qr").addEventListener("click",()=>{$("#modal-qr").src=g.qrcode;$("#modal-qr-wrap").hidden=false});$("#game-modal").classList.add("open")}
function openVideo(i){const v=data.videos[i];if(!v)return;activeVideo=v;const id=youtubeId(v.url);$("#video-modal-title").textContent=v.title;$("#embed-frame").innerHTML=id?`<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1" title="${safe(v.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`:`<p>無法辨識影片網址。<a href="${safe(v.url)}" target="_blank" rel="noopener">前往 YouTube</a></p>`;$("#video-modal").classList.add("open")}
function closeModal(id){$("#"+id).classList.remove("open");if(id==="video-modal")$("#embed-frame").innerHTML=""}
$$("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
$$(".modal-backdrop").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m.id)}));
document.addEventListener("keydown",e=>{if(e.key==="Escape")$$(".modal-backdrop.open").forEach(m=>closeModal(m.id))});
$("#copy-id").addEventListener("click",async()=>{if(!activeGame?.player_id)return toast("沒有可複製的玩家 ID");try{await navigator.clipboard.writeText(activeGame.player_id);toast("玩家 ID 已複製")}catch{toast("瀏覽器不允許複製，請手動選取")}});
$("#game-search").addEventListener("input",renderGames);$("#game-filters").addEventListener("click",e=>{const b=e.target.closest("[data-filter]");if(!b)return;currentFilter=b.dataset.filter;$$(".filter-chip").forEach(x=>x.classList.toggle("selected",x===b));renderGames()});
$$("[data-nav]").forEach(a=>a.addEventListener("click",()=>{$$("[data-nav]").forEach(x=>x.classList.toggle("active",x===a))}));
$("#admin-open").addEventListener("click",async()=>{if(!adminSession){location.href=API_BASE+"/auth/login";return}const modal=$("#admin-modal"),loading=$("#admin-loading");loading.hidden=false;modal.classList.add("open");try{await api("/api/me");const cloud=await api("/api/data");data={games:cloud.games,videos:cloud.videos,logs:cloud.logs||[],profile:cloud.profile};renderAll();refreshAdmin();loading.hidden=true}catch(e){modal.classList.remove("open");sessionStorage.removeItem("gamehub-session");adminSession="";toast("登入已失效，請重新登入");location.href=API_BASE+"/auth/login"}});
$("#admin-logout").addEventListener("click",async()=>{try{await api("/auth/logout",{method:"POST"})}catch{}sessionStorage.removeItem("gamehub-session");adminSession="";closeModal("admin-modal");toast("已登出管理帳號")});
$$(".admin-tab").forEach(b=>b.addEventListener("click",()=>{$$(".admin-tab").forEach(x=>x.classList.toggle("active",x===b));$$(".admin-pane").forEach(x=>x.classList.remove("active"));$("#pane-"+b.dataset.tab).classList.add("active")}));
function refreshAdmin(){ $("#admin-journal-list").innerHTML=(data.logs||[]).map((log,i)=>`<div class="admin-row"><span>${safe(log.date)} · ${safe(log.title)}</span><button data-edit-journal="${i}">編輯</button><button class="delete" data-delete-journal="${i}">刪除</button></div>`).join("")||"<div class=empty-state>尚無每日進度</div>";$("#admin-game-list").innerHTML=data.games.map((g,i)=>`<div class="admin-row"><span>${safe(g.name)} <small>· ${safe(g.category)}</small></span><button data-edit-game="${i}">編輯</button><button class="delete" data-delete-game="${i}">刪除</button></div>`).join("")||"<div class='empty-state'>尚無遊戲</div>";$("#admin-video-list").innerHTML=data.videos.map((v,i)=>`<div class="admin-row"><span>${safe(v.title)}</span><button data-edit-video="${i}">編輯</button><button class="delete" data-delete-video="${i}">刪除</button></div>`).join("")||"<div class='empty-state'>尚無影片</div>";$("#p-name").value=data.profile.name||"";$("#p-avatar").value=data.profile.avatar||"";$("#p-bio").value=data.profile.bio||"";$("#p-social").value=(data.profile.social||[]).map(s=>`${s.name} | ${s.url}`).join("\n")}

function resetJournalForm(){$("#journal-form").reset();$("#journal-edit-index").value="";$("#j-date").value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);$("#journal-form-heading").textContent="新增每日進度"}
$("#journal-form-reset").addEventListener("click",resetJournalForm);
resetJournalForm();
$("#admin-journal-list").addEventListener("click",e=>{
 const edit=e.target.dataset.editJournal,del=e.target.dataset.deleteJournal;
 if(del!==undefined){data.logs.splice(+del,1);saveDraft();refreshAdmin()}
 if(edit!==undefined){const log=data.logs[+edit];$("#journal-edit-index").value=edit;$("#j-date").value=log.date||"";$("#j-title").value=log.title||"";$("#j-content").value=log.content||"";$("#j-video").value=log.video_url||"";$("#j-images").value="";$("#journal-form-heading").textContent="編輯每日進度（可追加圖片）";$("#journal-form").scrollIntoView({behavior:"smooth",block:"center"})}
});
function bytesToBase64(buffer){const bytes=new Uint8Array(buffer);let binary="";for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary)}
$("#journal-form").addEventListener("submit",async e=>{
 e.preventDefault();const submit=e.submitter;submit.disabled=true;submit.textContent="正在上傳與儲存…";
 try{
  const images=[];const edit=$("#journal-edit-index").value;
  if(edit!=="")images.push(...(data.logs[+edit].images||[]));
  for(const file of $("#j-images").files){
   if(file.size>5*1024*1024)throw new Error(file.name+" 超過 5 MB");
   if(!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type))throw new Error(file.name+" 格式不支援");
   const uploaded=await api("/api/upload",{method:"POST",body:JSON.stringify({name:file.name,content_type:file.type,content:bytesToBase64(await file.arrayBuffer())})});
   images.push(uploaded.path);
  }
  const entry={date:$("#j-date").value,title:$("#j-title").value.trim(),content:$("#j-content").value.trim(),images,video_url:$("#j-video").value.trim()};
  if(entry.video_url&&!youtubeId(entry.video_url))throw new Error("影片網址目前只支援 YouTube");
  if(edit==="")data.logs.unshift(entry);else data.logs[+edit]=entry;
  await saveDraft();refreshAdmin();resetJournalForm();
 }catch(err){toast("儲存失敗："+err.message)}
 finally{submit.disabled=false;submit.textContent="儲存每日進度"}
});
function resetGameForm(){ $("#game-form").reset();$("#game-edit-index").value="";$("#game-form-heading").textContent="新增遊戲"}
$("#game-form-reset").addEventListener("click",resetGameForm);
$("#admin-game-list").addEventListener("click",e=>{const edit=e.target.dataset.editGame,del=e.target.dataset.deleteGame;if(del!==undefined){data.games.splice(+del,1);saveDraft();refreshAdmin()}if(edit!==undefined){const g=data.games[+edit];$("#game-edit-index").value=edit;$("#g-name").value=g.name;$("#g-category").value=g.category||"Mobile";$("#g-player").value=g.player_id||"";$("#g-cover").value=g.cover||"";$("#g-invite").value=g.invite_url||"";$("#g-qr").value=g.qrcode||"";$("#g-description").value=g.description||"";$("#game-form-heading").textContent="編輯遊戲";$("#game-form").scrollIntoView({behavior:"smooth",block:"center"})}});
$("#game-form").addEventListener("submit",e=>{e.preventDefault();const g={name:$("#g-name").value.trim(),category:$("#g-category").value,player_id:$("#g-player").value.trim(),cover:$("#g-cover").value.trim(),invite_url:$("#g-invite").value.trim(),qrcode:$("#g-qr").value.trim(),description:$("#g-description").value.trim()};const i=$("#game-edit-index").value;if(i==="")data.games.push(g);else data.games[+i]=g;saveDraft();refreshAdmin();resetGameForm()});
function resetVideoForm(){$("#video-form").reset();$("#video-edit-index").value="";$("#video-form-heading").textContent="新增影片"}
$("#video-form-reset").addEventListener("click",resetVideoForm);
$("#admin-video-list").addEventListener("click",e=>{const edit=e.target.dataset.editVideo,del=e.target.dataset.deleteVideo;if(del!==undefined){data.videos.splice(+del,1);saveDraft();refreshAdmin()}if(edit!==undefined){const v=data.videos[+edit];$("#video-edit-index").value=edit;$("#v-title").value=v.title;$("#v-url").value=v.url;$("#v-category").value=v.category||"";$("#v-description").value=v.description||"";$("#video-form-heading").textContent="編輯影片";$("#video-form").scrollIntoView({behavior:"smooth",block:"center"})}});
$("#video-form").addEventListener("submit",e=>{e.preventDefault();const v={title:$("#v-title").value.trim(),url:$("#v-url").value.trim(),category:$("#v-category").value.trim(),description:$("#v-description").value.trim()};if(!youtubeId(v.url))return toast("請輸入有效的 YouTube 網址");const i=$("#video-edit-index").value;if(i==="")data.videos.push(v);else data.videos[+i]=v;saveDraft();refreshAdmin();resetVideoForm()});
$("#profile-form").addEventListener("submit",e=>{e.preventDefault();data.profile={name:$("#p-name").value.trim(),avatar:$("#p-avatar").value.trim(),bio:$("#p-bio").value.trim(),social:$("#p-social").value.split("\n").map(x=>x.split("|")).filter(x=>x.length>=2).map(x=>({name:x[0].trim(),url:x.slice(1).join("|").trim()})).filter(x=>x.name&&x.url)};saveDraft();refreshAdmin()});
function download(name,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)}
$("#export-all").addEventListener("click",()=>{download("games.json",data.games);setTimeout(()=>download("videos.json",data.videos),250);setTimeout(()=>download("profile.json",data.profile),500);toast("已匯出三份 JSON，請放回 data 資料夾")});
$("#import-file").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{const obj=JSON.parse(await f.text());if(Array.isArray(obj)){if(f.name.toLowerCase().includes("video"))data.videos=obj;else if(f.name.toLowerCase().includes("game"))data.games=obj;else throw Error("請使用 games.json 或 videos.json 檔名")}else if(obj&&obj.games&&obj.videos&&obj.profile){data=obj}else if(obj&&typeof obj==="object"&&("name" in obj||"bio" in obj)){data.profile=obj}else{throw Error("格式不符")};saveDraft();refreshAdmin();toast("資料匯入成功")}catch(err){toast("匯入失敗：請確認 JSON 格式與檔名")};e.target.value=""});
$("#reset-data").addEventListener("click",()=>{if(confirm("確定還原範例資料？目前草稿會被覆蓋。")){data=structuredClone(SAMPLE);saveDraft();refreshAdmin()}});
$("#year").textContent=new Date().getFullYear();loadData();
