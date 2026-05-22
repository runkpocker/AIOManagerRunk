// ============================================================
//  TorBox Renamer — Fastify Plugin
//  Add to server/ directory, then register in server/index.js:
//
//    import torboxPlugin from './torbox.js'
//    await fastify.register(torboxPlugin)
//
//  Railway env vars (optional but recommended):
//    TORBOX_API_KEY   — pre-fills the key field in the UI
//    ANTHROPIC_API_KEY — enables AI title suggestions
// ============================================================

import axios from 'axios'

const TORBOX = 'https://api.torbox.app/v1/api'

const HTML = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#0d0d0f">
<title>TorBox Renamer</title>
<style>
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;margin:0;padding:0}
  body{background:#0d0d0f;color:#e8e8e8;font-family:'Courier New',monospace;min-height:100vh}
  input,button{font-family:'Courier New',monospace}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

  /* Login */
  #login{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:24px 20px}
  .card{width:100%;max-width:400px;background:#151518;border:1px solid #222;border-radius:20px;padding:40px 24px 32px;display:flex;flex-direction:column;align-items:center;gap:18px}
  .logo{font-size:52px}.app-name{font-size:24px;font-weight:bold;color:#00e5a0;letter-spacing:1px}
  .app-sub{font-size:14px;color:#555}
  .big-input{width:100%;background:#1e1e24;border:1px solid #333;border-radius:12px;padding:18px 16px;color:#e8e8e8;font-size:16px;outline:none;-webkit-appearance:none}
  .big-input:focus{border-color:#00e5a060}
  .big-btn{width:100%;background:#00e5a0;color:#0d0d0f;border:none;border-radius:12px;padding:18px;font-weight:bold;font-size:17px;cursor:pointer}
  .big-btn:disabled{opacity:.4}
  .note{width:100%;background:#161d18;border:1px solid #1e3020;border-radius:10px;padding:14px;font-size:13px;color:#4a7a5a;line-height:1.6}
  .err{width:100%;background:#2a1515;color:#ff6b6b;padding:14px;border-radius:10px;font-size:13px;border:1px solid #4a2020;line-height:1.5}

  /* Steps */
  .steps{width:100%;display:flex;flex-direction:column;align-items:center;gap:18px}
  .spinner{width:40px;height:40px;border:3px solid #1e1e24;border-top:3px solid #00e5a0;border-radius:50%;animation:spin .8s linear infinite}
  .step-label{font-size:14px;color:#00e5a0}
  .steps-list{width:100%;display:flex;flex-direction:column;gap:10px}
  .step-row{font-size:14px;display:flex;align-items:center;gap:10px;transition:color .3s}
  .step-dot{width:20px;text-align:center;flex-shrink:0}

  /* Main */
  #main{display:none;flex-direction:column;min-height:100vh}
  .topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #1a1a1e;background:#0d0d0f;position:sticky;top:0;z-index:20}
  .top-l{display:flex;align-items:center;gap:10px}
  .top-logo{font-size:22px}.top-title{font-size:16px;font-weight:bold;color:#00e5a0}
  .top-r{display:flex;align-items:center;gap:10px}
  .badge{background:#1e1e24;color:#aaa;padding:4px 12px;border-radius:20px;font-size:13px}
  .abar{display:flex;gap:8px;padding:12px 16px;border-bottom:1px solid #1a1a1e;flex-wrap:wrap}
  .achip{background:#1e1e24;color:#ddd;border:1px solid #333;border-radius:20px;padding:11px 18px;font-size:15px;cursor:pointer;white-space:nowrap}
  .achip.primary{background:#00e5a0;color:#0d0d0f;font-weight:bold;border-color:transparent}
  .ai-banner{background:#1a1a28;border-bottom:1px solid #2a2a50;color:#aaaaff;padding:12px 18px;font-size:14px}
  .list{padding:12px;display:flex;flex-direction:column;gap:10px;padding-bottom:40px}

  /* Cards */
  .tcard{background:#151518;border:1px solid #222228;border-radius:14px;overflow:hidden;animation:fadeIn .2s ease}
  .tcard.changed{border-color:#00e5a030}.tcard.done{border-color:#1e3020}.tcard.reverted{border-color:#2a2a30}
  .cmain{display:flex;align-items:center;padding:16px;gap:12px;cursor:pointer;user-select:none}
  .cmeta{flex:1;min-width:0}
  .ctitle{font-size:17px;color:#e8e8e8;line-height:1.4;word-break:break-word}
  .csugg{font-size:15px;color:#00e5a0;margin-top:5px;word-break:break-word;line-height:1.4}
  .csub{font-size:13px;color:#777;margin-top:4px}
  .tag-ok{color:#00e5a0}.tag-rev{color:#aaa}.tag-err{color:#ff6b6b}.tag-ren{color:#4a7a5a}
  .dupe-exact{background:#3a1a1a;border:1px solid #ff4444!important}
  .dupe-badge-exact{background:#ff4444;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:bold}
  .dupe-badge-possible{background:#ff8844;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:bold}
  .dupe-row{display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-top:1px solid #222}
  .dupe-title{font-size:15px;color:#e8e8e8;word-break:break-word;line-height:1.4}
  .dupe-meta{font-size:13px;color:#888;margin-top:4px}
  .btn-delete{background:#3a1515;color:#ff6b6b;border:1px solid #5a2020;border-radius:8px;padding:10px 16px;font-size:14px;cursor:pointer;white-space:nowrap;flex-shrink:0}
  .btn-delete:disabled{opacity:.5}
  .chev{font-size:14px;color:#666;flex-shrink:0}
  .ebody{border-top:1px solid #1e1e24;padding:14px 16px;display:flex;flex-direction:column;gap:14px}
  .flist{display:flex;flex-direction:column;gap:6px;max-height:160px;overflow-y:auto}
  .frow{display:flex;align-items:flex-start;gap:8px}
  .fname{font-size:13px;color:#888;line-height:1.5;word-break:break-all}
  .cactions{display:flex;flex-direction:column;gap:8px}
  .btn-p{background:#00e5a0;color:#0d0d0f;border:none;border-radius:10px;padding:15px 16px;font-weight:bold;font-size:15px;cursor:pointer;text-align:left;line-height:1.4;word-break:break-word;width:100%}
  .btn-s{background:#1e1e24;color:#aaa;border:1px solid #2a2a30;border-radius:10px;padding:14px 16px;font-size:15px;cursor:pointer;width:100%}
  .btn-g{background:transparent;color:#666;border:1px solid #222;border-radius:10px;padding:14px 16px;font-size:14px;cursor:pointer;width:100%}
  .eblock{display:flex;flex-direction:column;gap:10px}
  .efield{width:100%;background:#1e1e24;border:1px solid #00e5a040;border-radius:10px;padding:15px 14px;color:#00e5a0;font-size:16px;outline:none;-webkit-appearance:none}
  .efield:focus{border-color:#00e5a0}
  .eactions{display:flex;gap:8px}
  .btn-save{flex:1;background:#00e5a0;color:#0d0d0f;border:none;border-radius:10px;padding:15px;font-weight:bold;font-size:15px;cursor:pointer}
  .btn-cancel{flex:1;background:#1e1e24;color:#888;border:1px solid #333;border-radius:10px;padding:15px;font-size:15px;cursor:pointer}
</style>
</head>
<body>

<div id="login">
  <div class="card">
    <div class="logo">⚡</div>
    <div class="app-name">TorBox Renamer</div>
    <div class="app-sub">AI-powered title fixer</div>
    <div id="lform" style="width:100%;display:flex;flex-direction:column;gap:14px">
      <input class="big-input" id="key-input" type="password" placeholder="TorBox API key..." autocomplete="off" autocorrect="off" spellcheck="false">
      <div class="err" id="err-msg" style="display:none"></div>
      <button class="big-btn" id="conn-btn" onclick="connect()">Connect &amp; Backup Library</button>
      <div class="note">📦 Backup auto-downloads before any changes</div>
    </div>
    <div id="steps-ui" style="width:100%;display:none">
      <div class="steps">
        <div class="spinner"></div>
        <div class="step-label" id="step-label">Starting...</div>
        <div class="steps-list" id="steps-list"></div>
      </div>
    </div>
  </div>
</div>

<div id="main">
  <div class="topbar">
    <div class="top-l"><span class="top-logo">⚡</span><span class="top-title">TorBox Renamer</span></div>
    <div class="top-r">
      <span id="ai-dot" style="display:none;font-size:18px">🤖</span>
      <span class="badge" id="count">0</span>
    </div>
  </div>
  <div class="abar" id="abar"></div>
  <div class="ai-banner" id="ai-banner" style="display:none">🤖 AI refining suggestions...</div>
  <div class="list" id="tlist"></div>
  <div id="dupe-panel" style="display:none;padding-bottom:40px"></div>
  <div id="tag-panel" style="display:none;padding-bottom:40px"></div>
</div>

<script>
const STEPS = ['Fetching library','Creating snapshot','Downloading backup','Almost done...']
let apiKey='', torrents=[], backup=null, edits={}, statuses={}, expandedId=null, editingId=null, dupesView=false, dupeGroups=[], cleanupRunning=false, tagView=false, tagProposals=[]

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

function extractQuality(n){const m=n.match(/\\b(4k|2160p|1080p|720p|480p)\\b/i);return m?m[1].toUpperCase().replace('2160P','4K').replace(/P$/,'p'):null}

function cleanFile(n){n=n.split('/').pop()
  
  const q=extractQuality(n)
  let s=n.replace(/\\.[^/.]+$/,'').replace(/[._]/g,' ')
    .replace(/\\b(bluray|bdrip|webrip|web-dl|hdtv|x264|x265|hevc|aac|mkv|mp4|avi|h264|h265|yify|rarbg|ettv|eztv|proper|repack|extended|theatrical|unrated|720p|1080p|4k|2160p|480p)\\b/gi,'')
    .replace(/\\bS\\d{2}E\\d{2}\\b.*/i,'').replace(/\\s{2,}/g,' ').trim()
  return q?s+' '+q:s
}

const MEDIA_EXT=/\.(mkv|mp4|avi|mov|wmv|m4v|ts|mpg|mpeg|m2ts|vob|flv|webm|divx|xvid)$/i
function mediaFiles(files){return(files||[]).filter(f=>{const n=f.name||f.short_name||'';return MEDIA_EXT.test(n)})}

function extractQualityFromFiles(files){
  for(const f of files){const q=extractQuality(f.name||f.short_name||'');if(q)return q}
  return null
}

function getBaseName(raw){
  // Strip path, extension, then all technical tags — stop at first S##E## or year
  let s=raw.split('/').pop().replace(/\.[^/.]+$/,'').replace(/[._]/g,' ')
  s=s.replace(/\b(s\d{1,2}e\d{1,2}|season\s*\d+|series\s*\d+)\b.*/i,'')
  s=s.replace(/\b(4k|2160p|1080p|720p|480p|bluray|bdrip|webrip|web-dl|webdl|hdtv|x264|x265|hevc|avc|h264|h265|hdr|sdr|yify|rarbg|ettv|eztv|prt|proper|repack|extended|theatrical|unrated)\b.*/gi,'')
  s=s.replace(/\b\d{4}\b.*/,'') // stop at year
  return s.replace(/\s{2,}/g,' ').trim()
}

function extractEpisodeDescriptor(files){
  const names=files.map(f=>(f.name||f.short_name||'').split('/').pop())
  const eps=[]
  names.forEach(n=>{
    // Match S01E01 or S01E01-E02 multi-ep patterns
    const m=n.match(/[Ss](\d{1,2})[Ee](\d{1,2})/);
    if(m)eps.push({s:parseInt(m[1]),e:parseInt(m[2])})
  })
  if(!eps.length)return null
  const seasons=[...new Set(eps.map(e=>e.s))].sort((a,b)=>a-b)
  const pad=n=>String(n).padStart(2,'0')
  if(seasons.length>1){
    return 'Seasons '+seasons[0]+'-'+seasons[seasons.length-1]
  }
  const s=seasons[0]
  const epNums=[...new Set(eps.map(e=>e.e))].sort((a,b)=>a-b)
  if(epNums.length===1)return 'S'+pad(s)+'E'+pad(epNums[0])
  const min=epNums[0],max=epNums[epNums.length-1]
  const sequential=epNums.length===max-min+1
  // Treat as full season if: starts at E01, sequential, and 6+ episodes
  if(min===1&&sequential&&epNums.length>=6)return 'Season '+s
  return 'S'+pad(s)+' E'+pad(min)+'-E'+pad(max)
}

function deriveTitle(files){
  const mf=mediaFiles(files);const src=mf.length?mf:files
  if(!src||!src.length)return null
  const quality=extractQuality((edits&&src[0]&&(src[0].name||src[0].short_name))||'')||extractQualityFromFiles(src)
  const base=getBaseName(src[0].name||src[0].short_name||'')
  const epDesc=extractEpisodeDescriptor(src)
  const parts=[base]
  if(epDesc)parts.push(epDesc)
  if(quality)parts.push(quality)
  return parts.filter(Boolean).join(' ')
}

function downloadBackup(data){
  const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
  const u=URL.createObjectURL(b),a=document.createElement('a')
  a.href=u;a.download='torbox-backup-'+new Date().toISOString().slice(0,10)+'.json'
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u)
}

function showStep(i){
  document.getElementById('step-label').textContent=STEPS[i]||'Working...'
  document.getElementById('steps-list').innerHTML=STEPS.map((s,j)=>{
    const c=j<i?'#00e5a060':j===i?'#00e5a0':'#2a2a30'
    const d=j<i?'✓':j===i?'▶':'○'
    return '<div class="step-row" style="color:'+c+'"><span class="step-dot">'+d+'</span>'+s+'</div>'
  }).join('')
}

async function connect(){
  apiKey=document.getElementById('key-input').value.trim()
  if(!apiKey)return
  document.getElementById('lform').style.display='none'
  document.getElementById('steps-ui').style.display='block'
  document.getElementById('err-msg').style.display='none'
  try{
    showStep(0)
    const r=await fetch('/api/torbox/list',{headers:{'x-torbox-key':apiKey}})
    const d=await r.json()
    if(!d.success)throw new Error(d.detail||'Failed to fetch torrents')
    torrents=Array.isArray(d.data)?d.data:[]

    showStep(1)
    backup={exported_at:new Date().toISOString(),torrent_count:torrents.length,
      torrents:torrents.map(t=>({id:t.id,name:t.name,hash:t.hash,tags:t.tags||[],
        files:(t.files||[]).map(f=>({id:f.id,name:f.name||f.short_name,size:f.size}))}))}

    showStep(2)
    downloadBackup(backup)

    showStep(3)
    edits={}
    torrents.forEach(t=>{edits[t.id]=deriveTitle(t.files)||t.name})

    document.getElementById('login').style.display='none'
    document.getElementById('main').style.display='flex'
    renderAll()

    showStep(4)
    await runAI()
  }catch(e){
    document.getElementById('steps-ui').style.display='none'
    document.getElementById('lform').style.display='flex'
    const el=document.getElementById('err-msg')
    el.textContent=e.message;el.style.display='block'
  }
}

async function runAI(){
  document.getElementById('ai-banner').style.display='block'
  document.getElementById('ai-dot').style.display='inline'
  try{
    const prompt='You are a media library assistant. Suggest clean titles from file names. Rules:\n1. ALWAYS end with quality if present (1080p, 4K, 720p).\n2. Movies: "Movie Title (Year) 1080p"\n3. TV single episode package: "Show Name S02E04 1080p"\n4. TV full season (sequential from E01, 6+ eps): "Show Name Season 2 1080p"\n5. TV partial season: "Show Name S02 E04-E08 1080p"\n6. TV multi-season: "Show Name Seasons 1-3 1080p"\n7. Title casing. Return ONLY JSON array: [{"id":1,"suggested":"Title"}]. No other text.\\n\\nTorrents:\\n'+
      JSON.stringify(torrents.map(t=>({id:t.id,current_name:t.name,files:(t.files||[]).slice(0,5).map(f=>f.name||f.short_name)})),null,2)

    const r=await fetch('/api/torbox/ai',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})
    })
    if(!r.ok)throw new Error('AI unavailable')
    const d=await r.json()
    const text=d.content?.find(b=>b.type==='text')?.text||'[]'
    const results=JSON.parse(text.replace(/\`\`\`json|\`\`\`/g,'').trim())
    results.forEach(r=>{edits[r.id]=r.suggested})
    renderAll()
  }catch(e){/* AI optional */}
  document.getElementById('ai-banner').style.display='none'
  document.getElementById('ai-dot').style.display='none'
}

function renderAll(){
  document.getElementById('count').textContent=torrents.length
  renderActionBar();renderList();renderDupes();renderTagPanel()
}

function renderActionBar(){
  const needs=torrents.filter(t=>edits[t.id]&&edits[t.id]!==t.name)
  let h='<button class="achip" onclick="refreshLibrary()">↻ Refresh</button>'
  h+='<button class="achip'+(cleanupRunning?' primary':'')+'" onclick="runTitleCleanup()">✨ Title Cleanup</button>'
  h+='<button class="achip'+(dupesView?' primary':'')+'" onclick="toggleDupes()">🔍 Duplicates</button>'
  h+='<button class="achip'+(tagView?' primary':'')+'" onclick="toggleTagView()">🏷️ Auto-Tag</button>'
  if(backup)h+='<button class="achip" onclick="reDownload()">⬇ Backup</button>'
  if(backup)h+='<button class="achip" onclick="revertAll()">↩ Revert All</button>'
  if(needs.length)h+='<button class="achip primary" onclick="applyAll()">Apply '+needs.length+'</button>'
  document.getElementById('abar').innerHTML=h
}

function renderList(){
  document.getElementById('tlist').innerHTML=torrents.map(t=>{
    const edit=edits[t.id]??t.name,changed=edit!==t.name,st=statuses[t.id]
    const isExp=expandedId===t.id,isEdit=editingId===t.id
    const files=t.files||[]
    const orig=backup?.torrents.find(b=>b.id===t.id)?.name
    const wasRenamed=orig&&t.name!==orig
    let cls='tcard'+(changed?' changed':'')+(st==='done'?' done':'')+(st==='reverted'?' reverted':'')
    let sub=files.length+' file'+(files.length!==1?'s':'')
    if(st==='done')sub+=' <span class="tag-ok">· ✓ saved</span>'
    else if(st==='reverted')sub+=' <span class="tag-rev">· ↩ reverted</span>'
    else if(st&&st.startsWith('err:'))sub+=' <span class="tag-err">· ✗ '+esc(st.slice(4))+'</span>'
    else if(wasRenamed)sub+=' <span class="tag-ren">· renamed</span>'
    let exp=''
    if(isExp){
      const frows=files.map(f=>'<div class="frow"><span>📄</span><span class="fname">'+esc(f.name||f.short_name||'')+'</span></div>').join('')
      let acts=''
      if(isEdit){
        acts='<div class="eblock"><input class="efield" id="ef-'+t.id+'" value="'+esc(edit)+'" type="text" autocorrect="off" spellcheck="false"><div class="eactions"><button class="btn-save" onclick="saveEdit('+t.id+')">Save</button><button class="btn-cancel" onclick="cancelEdit('+t.id+')">Cancel</button></div></div>'
      }else{
        acts='<div class="cactions">'
        if(changed)acts+='<button class="btn-p" onclick="applyOne('+t.id+')">Apply → '+esc(edit)+'</button>'
        acts+='<button class="btn-s" onclick="startEdit('+t.id+')">✏️ Edit Title</button>'
        if(orig&&t.name!==orig)acts+='<button class="btn-g" onclick="revertOne('+t.id+')">↩ Revert to Original</button>'
        acts+='</div>'
      }
      exp='<div class="ebody">'+(files.length?'<div class="flist">'+frows+'</div>':'')+acts+'</div>'
    }
    return '<div class="'+cls+'" id="c-'+t.id+'"><div class="cmain" onclick="toggleExp('+t.id+')"><div class="cmeta"><div class="ctitle">'+esc(t.name)+'</div>'+(changed?'<div class="csugg">→ '+esc(edit)+'</div>':'')+'<div class="csub">'+sub+'</div></div><div class="chev">'+(isExp?'▲':'▼')+'</div></div>'+exp+'</div>'
  }).join('')
}

function toggleExp(id){expandedId=expandedId===id?null:id;if(editingId!==id)editingId=null;renderList();if(editingId===id)setTimeout(()=>document.getElementById('ef-'+id)?.focus(),50)}
function startEdit(id){editingId=id;renderList();setTimeout(()=>document.getElementById('ef-'+id)?.focus(),50)}
function cancelEdit(id){editingId=null;const t=torrents.find(t=>t.id===id);if(t)edits[id]=t.name;renderList();renderActionBar()}
function saveEdit(id){const v=document.getElementById('ef-'+id)?.value?.trim();if(v){edits[id]=v;editingId=null}applyOne(id)}

async function applyOne(id,nameOverride){
  const t=torrents.find(t=>t.id===id);if(!t)return
  const newName=nameOverride??edits[id];if(!newName||newName===t.name)return
  statuses[id]='saving';renderList()
  try{
    const r=await fetch('/api/torbox/rename',{
      method:'POST',headers:{'Content-Type':'application/json','x-torbox-key':apiKey},
      body:JSON.stringify({torrent_id:id,name:newName})
    })
    const d=await r.json()
    if(d.success){t.name=newName;statuses[id]='done'}else statuses[id]='err:'+(typeof d.detail==='string'?d.detail:JSON.stringify(d.detail||d.raw||d))
  }catch(e){statuses[id]='err:'+e.message}
  renderAll()
}

async function applyAll(){for(const t of torrents)if(edits[t.id]&&edits[t.id]!==t.name)await applyOne(t.id)}

async function revertOne(id){
  const orig=backup?.torrents.find(b=>b.id===id)?.name;if(!orig)return
  edits[id]=orig;await applyOne(id,orig)
}

async function revertAll(){
  if(!backup)return
  if(!confirm('Revert all '+backup.torrents.length+' torrents to original names?'))return
  for(const orig of backup.torrents){
    const t=torrents.find(t=>t.id===orig.id)
    if(t&&t.name!==orig.name){edits[orig.id]=orig.name;await applyOne(orig.id,orig.name)}
  }
}

function reDownload(){if(backup)downloadBackup(backup)}

// ── TITLE CLEANUP ────────────────────────────────────────────────────────────

async function runTitleCleanup(){
  if(cleanupRunning) return
  cleanupRunning=true
  renderActionBar()
  document.getElementById('ai-banner').style.display='block'
  document.getElementById('ai-banner').textContent='✨ Deriving titles from file names...'
  document.getElementById('ai-dot').style.display='inline'

  // Step 1: local derivation from filenames
  torrents.forEach(t=>{ edits[t.id]=deriveTitle(t.files)||t.name })
  renderList()

  // Step 2: AI refinement
  document.getElementById('ai-banner').textContent='🤖 AI refining suggestions...'
  await runAI()

  cleanupRunning=false
  renderAll()
}

// ── DUPLICATE DETECTION ──────────────────────────────────────────────────────

function normalizeTitle(raw){
  // Use the derived edit title if available, else the raw torrent name
  let s = raw.toLowerCase()
  // Strip episode markers — keep base show name
  s = s.replace(/\bs\d{1,2}e\d{1,2}\b.*/i,'')
  // Strip quality/codec/source junk
  s = s.replace(/\b(4k|2160p|1080p|720p|480p|bluray|bdrip|webrip|web-dl|webdl|hdtv|x264|x265|hevc|avc|h264|h265|hdr|sdr|dv|dolby|atmos|aac|ac3|dd5|dts|remux|proper|repack|extended|theatrical|unrated|limited|yify|rarbg|ettv|eztv|prt|nf|amzn|hmax|dsnp|pcok)\b/gi,'')
  // Strip release group suffixes (dash + word at end)
  s = s.replace(/-[a-z0-9]+$/i,'')
  // Strip file size markers like "303 mb" "350 mib"
  s = s.replace(/\b\d+\s*(mb|mib|gb|gib)\b/gi,'')
  // Normalize spaces/dots/underscores
  s = s.replace(/[._\-]+/g,' ').replace(/\s{2,}/g,' ').trim()
  return s
}

function scanDupes(){
  const groups = {}
  torrents.forEach(t => {
    // Use AI-derived/edited title if available, else torrent name
    const title = edits[t.id] || t.name
    const key = normalizeTitle(title)
    if(!key || key.length < 3) return
    if(!groups[key]) groups[key] = []
    groups[key].push(t)
  })
  // Only keep groups with 2+ entries
  dupeGroups = Object.entries(groups)
    .filter(([,arr]) => arr.length > 1)
    .sort((a,b) => b[1].length - a[1].length)
  dupesView = true
  renderAll()
}

function toggleDupes(){
  if(dupesView){ dupesView=false; renderAll(); return }
  scanDupes()
}

function isExactDupe(group){
  // Exact = same normalized title AND same quality
  const qualities = group.map(t => extractQuality(edits[t.id]||t.name)||extractQuality((t.files||[]).map(f=>f.name||'').join(' '))||'unknown')
  return qualities.some((q,i) => qualities.indexOf(q) !== i)
}

async function deleteTorrent(id, btnEl){
  if(!confirm('Delete this torrent from TorBox permanently?')) return
  btnEl.disabled=true; btnEl.textContent='Deleting...'
  try{
    const r=await fetch('/api/torbox/delete',{
      method:'POST',headers:{'Content-Type':'application/json','x-torbox-key':apiKey},
      body:JSON.stringify({torrent_id:id})
    })
    const d=await r.json()
    if(d.success){
      torrents=torrents.filter(t=>t.id!==id)
      delete edits[id]; delete statuses[id]
      scanDupes()
    } else {
      btnEl.disabled=false; btnEl.textContent='Delete'
      alert('Delete failed: '+(d.detail||'Unknown error'))
    }
  }catch(e){ btnEl.disabled=false; btnEl.textContent='Delete'; alert(e.message) }
}

function renderDupes(){
  const el = document.getElementById('dupe-panel')
  if(!el) return
  if(!dupesView){ el.style.display='none'; return }
  el.style.display='block'
  if(dupeGroups.length===0){
    el.innerHTML='<div style="padding:20px 16px;color:#4a7a5a;font-size:15px">✓ No duplicates found in your library.</div>'
    return
  }
  const exactCount = dupeGroups.filter(([,g])=>isExactDupe(g)).length
  el.innerHTML =
    '<div style="padding:14px 16px 6px;font-size:14px;color:#aaa">'+
      dupeGroups.length+' group'+(dupeGroups.length!==1?'s':'')+
      (exactCount?' &nbsp;<span class="dupe-badge-exact">'+exactCount+' EXACT</span>':'')+
    '</div>' +
    dupeGroups.map(([key, group]) => {
      const exact = isExactDupe(group)
      const rows = group.map(t => {
        const title = edits[t.id] || t.name
        const files = (t.files||[]).length
        const quality = extractQuality(edits[t.id]||t.name) || extractQuality((t.files||[]).map(f=>f.name||'').join(' ')) || 'unknown'
        const sizeLabel = t.size ? (t.size>1073741824?(t.size/1073741824).toFixed(1)+' GB':(t.size/1048576).toFixed(0)+' MB') : ''
        // Show up to 3 media filenames (just the filename part, no path)
        const mf = mediaFiles(t.files||[]).slice(0,3).map(f=>(f.name||f.short_name||'').split('/').pop()).filter(Boolean)
        const moreCount = mediaFiles(t.files||[]).length - mf.length
        const filePreview = mf.length
          ? '<div style="font-size:12px;color:#666;margin-top:5px;line-height:1.6;word-break:break-all">'
              + mf.map(n=>'<span style="display:block">'+esc(n)+'</span>').join('')
              + (moreCount>0?'<span style="color:#555">…+'+moreCount+' more</span>':'')
            + '</div>'
          : ''
        return '<div class="dupe-row">' +
          '<div style="flex:1;min-width:0">' +
            '<div class="dupe-title">'+esc(title)+'</div>' +
            '<div class="dupe-meta">'+files+' file'+(files!==1?'s':'')+(quality!=='unknown'?' · <b style="color:#e8e8e8">'+quality+'</b>':'')+(sizeLabel?' · '+sizeLabel:'')+'</div>' +
            filePreview +
          '</div>' +
          '<button class="btn-delete" onclick="deleteTorrent('+t.id+',this)">Delete</button>' +
        '</div>'
      }).join('')
      return '<div class="tcard'+(exact?' dupe-exact':'')+'" style="margin-bottom:10px;padding:4px 14px 2px">' +
        '<div style="display:flex;align-items:center;gap:8px;padding:10px 0 4px">' +
          '<span style="font-size:14px;color:'+(exact?'#ff6666':'#ff9966')+';font-weight:bold;flex:1;word-break:break-word">'+esc(key)+'</span>' +
          '<span class="'+(exact?'dupe-badge-exact':'dupe-badge-possible')+'">'+(exact?'EXACT':'POSSIBLE')+'</span>' +
        '</div>' +
        rows + '</div>'
    }).join('')
}

// ── AUTO-TAGGING ─────────────────────────────────────────────────────────────

const MANAGED_TAGS = ['series','movies','adult']
const TAG_COLOR = {series:'#4488ff', movies:'#aa66ff', adult:'#ff6688'}

function classifyTorrent(t){
  const allText=[t.name,...(t.files||[]).map(f=>f.name||f.short_name||'')].join(' ')
  if(/\bxxx\b|letspostit|brazzers|bangbros|realitykings|mofos|nubiles|vixen|blacked|tushy|wicked|penthouse|playboy|\bporn\b|pornrips|adulttime|21sextury|digitalplayground|eternaldesire|sweetsin|puretaboo/i.test(allText))return 'adult'
  if(/\bS\d{1,2}E\d{1,2}\b/i.test(allText))return 'series'
  if(/\bSeason\s*\d+\b/i.test(edits[t.id]||t.name))return 'series'
  return 'movies'
}

function buildFinalTags(existing,newTag){
  const kept=(existing||[]).filter(tag=>!MANAGED_TAGS.includes(tag.toLowerCase()))
  if(!kept.includes(newTag))kept.push(newTag)
  return kept
}

function toggleTagView(){
  if(tagView){tagView=false;tagProposals=[];renderAll();return}
  tagProposals=torrents.map(t=>({t,currentTags:t.tags||[],proposed:classifyTorrent(t),finalTags:buildFinalTags(t.tags,classifyTorrent(t)),status:null}))
  tagView=true;renderAll()
}

function renderTagPanel(){
  const el=document.getElementById('tag-panel')
  if(!el)return
  if(!tagView){el.style.display='none';return}
  el.style.display='block'
  const counts={series:0,movies:0,adult:0}
  tagProposals.forEach(p=>counts[p.proposed]=(counts[p.proposed]||0)+1)
  const done=tagProposals.filter(p=>p.status==='done').length
  const errors=tagProposals.filter(p=>p.status==='error').length
  const pending=tagProposals.filter(p=>!p.status).length

  let html='<div style="padding:14px 16px 8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
  Object.entries(counts).forEach(([k,v])=>{
    html+='<span style="background:'+TAG_COLOR[k]+'22;color:'+TAG_COLOR[k]+';border:1px solid '+TAG_COLOR[k]+'44;border-radius:12px;padding:5px 14px;font-size:14px">'+k+' · '+v+'</span>'
  })
  if(done)html+='<span style="color:#00e5a0;font-size:13px">✓ '+done+' tagged</span>'
  if(errors)html+='<span style="color:#ff6b6b;font-size:13px">✗ '+errors+' errors</span>'
  html+='</div>'
  if(pending){
    html+='<div style="padding:0 16px 12px"><button class="btn-p" style="font-size:15px;padding:14px" onclick="applyAllTags()">Apply Tags to All '+tagProposals.length+' Items</button></div>'
  }
  ;['series','movies','adult'].forEach(tag=>{
    const group=tagProposals.filter(p=>p.proposed===tag)
    if(!group.length)return
    html+='<div style="margin:0 12px 14px"><div style="font-size:14px;font-weight:bold;color:'+TAG_COLOR[tag]+';padding:8px 0 6px;border-bottom:1px solid #222;margin-bottom:4px">'+tag.toUpperCase()+' · '+group.length+'</div>'
    group.forEach(p=>{
      const title=edits[p.t.id]||p.t.name
      const kept=(p.t.tags||[]).filter(tg=>!MANAGED_TAGS.includes(tg.toLowerCase()))
      const tagPills=p.finalTags.map(tg=>'<span style="background:'+(TAG_COLOR[tg]||'#555')+'33;color:'+(TAG_COLOR[tg]||'#aaa')+';border-radius:8px;padding:3px 10px;font-size:13px;margin-right:4px">'+esc(tg)+'</span>').join('')
      const st=p.status
      html+='<div style="display:flex;align-items:flex-start;gap:10px;padding:11px 0;border-top:1px solid #1a1a1a">'
        +'<div style="flex:1;min-width:0"><div style="font-size:15px;color:#e8e8e8;word-break:break-word;line-height:1.4">'+esc(title)+'</div>'
        +'<div style="margin-top:6px">'+tagPills+'</div>'
        +(kept.length?'<div style="font-size:12px;color:#555;margin-top:3px">keeping: '+kept.join(', ')+'</div>':'')
        +'</div>'
        +(st==='done'?'<span style="color:#00e5a0;font-size:20px;flex-shrink:0">✓</span>'
         :st==='error'?'<span style="color:#ff6b6b;font-size:20px;flex-shrink:0">✗</span>'
         :'<button class="btn-delete" style="background:#1a2030;color:#4488ff;border-color:#2a3a60" onclick="applyOneTag('+p.t.id+',this)">Tag</button>')
        +'</div>'
    })
    html+='</div>'
  })
  el.innerHTML=html
}

async function applyOneTag(id,btnEl){
  const p=tagProposals.find(p=>p.t.id===id);if(!p)return
  if(btnEl){btnEl.disabled=true;btnEl.textContent='...'}
  try{
    const r=await fetch('/api/torbox/tag',{method:'POST',headers:{'Content-Type':'application/json','x-torbox-key':apiKey},body:JSON.stringify({torrent_id:id,tags:p.finalTags})})
    const d=await r.json()
    if(d.success){p.status='done';p.t.tags=p.finalTags}else{p.status='error';if(btnEl){btnEl.disabled=false;btnEl.textContent='Tag'}}
  }catch{p.status='error';if(btnEl){btnEl.disabled=false;btnEl.textContent='Tag'}}
  renderTagPanel()
}

async function applyAllTags(){
  for(const p of tagProposals)if(!p.status)await applyOneTag(p.t.id,null)
}

async function refreshLibrary(){
  document.getElementById('abar').innerHTML='<span style="color:#00e5a0;padding:10px 4px;font-size:13px">↻ Refreshing...</span>'
  try{
    const r=await fetch('/api/torbox/list',{headers:{'x-torbox-key':apiKey}})
    const d=await r.json()
    if(!d.success)throw new Error(d.detail||'Failed')
    torrents=Array.isArray(d.data)?d.data:[]
    statuses={}
    renderAll()
  }catch(e){
    renderActionBar()
    alert('Refresh failed: '+e.message)
  }
}

document.getElementById('key-input').addEventListener('keydown',e=>{if(e.key==='Enter')connect()})

// Pre-fill key if server has one configured
fetch('/api/torbox/config').then(r=>r.json()).then(d=>{
  if(d.hasKey)document.getElementById('key-input').placeholder='API key pre-configured on server ✓'
}).catch(()=>{})
</script>
</body>
</html>`

async function plugin(fastify) {

  // Serve the renamer UI
  fastify.get('/torbox', async (request, reply) => {
    reply.type('text/html')
    return HTML
  })

  // Tell the UI whether a server-side key is configured
  fastify.get('/api/torbox/config', async (request, reply) => {
    return { hasKey: !!process.env.TORBOX_API_KEY, hasAI: !!process.env.ANTHROPIC_API_KEY }
  })

  // Proxy: fetch torrent list
  fastify.get('/api/torbox/list', async (request, reply) => {
    const key = request.headers['x-torbox-key'] || process.env.TORBOX_API_KEY
    if (!key) return reply.status(401).send({ success: false, detail: 'No API key provided' })
    try {
      const res = await axios.get(`${TORBOX}/torrents/mylist?bypass_cache=true`, {
        headers: { Authorization: `Bearer ${key}` }
      })
      return res.data
    } catch (e) {
      return reply.status(502).send({ success: false, detail: e.message })
    }
  })

  // Proxy: rename a torrent — sends as form-data (TorBox edit endpoints require it)
  fastify.post('/api/torbox/rename', async (request, reply) => {
    const key = request.headers['x-torbox-key'] || process.env.TORBOX_API_KEY
    if (!key) return reply.status(401).send({ success: false, detail: 'No API key provided' })
    try {
      const { torrent_id, name } = request.body
      const res = await axios.put(`${TORBOX}/torrents/edittorrent`, { torrent_id, name }, {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
      })
      return res.data
    } catch (e) {
      const detail = e.response?.data?.detail || e.response?.data?.error || e.message
      return reply.status(e.response?.status || 502).send({ success: false, detail, raw: e.response?.data })
    }
  })

  // Proxy: update torrent tags
  fastify.post('/api/torbox/tag', async (request, reply) => {
    const key = request.headers['x-torbox-key'] || process.env.TORBOX_API_KEY
    if (!key) return reply.status(401).send({ success: false, detail: 'No API key provided' })
    try {
      const { torrent_id, tags } = request.body
      const res = await axios.put(`${TORBOX}/torrents/edittorrent`, { torrent_id, tags }, {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
      })
      return res.data
    } catch (e) {
      const detail = e.response?.data?.detail || e.message
      return reply.status(e.response?.status || 502).send({ success: false, detail })
    }
  })

  // Proxy: delete a torrent
  fastify.post('/api/torbox/delete', async (request, reply) => {
    const key = request.headers['x-torbox-key'] || process.env.TORBOX_API_KEY
    if (!key) return reply.status(401).send({ success: false, detail: 'No API key provided' })
    try {
      const { torrent_id } = request.body
      const res = await axios.post(`${TORBOX}/torrents/controltorrent`, { torrent_id, operation: 'delete' }, {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
      })
      return res.data
    } catch (e) {
      const detail = e.response?.data?.detail || e.message
      return reply.status(e.response?.status || 502).send({ success: false, detail })
    }
  })

  // Proxy: Anthropic AI suggestions (optional — only works if ANTHROPIC_API_KEY is set)
  fastify.post('/api/torbox/ai', async (request, reply) => {
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) return reply.status(503).send({ error: 'ANTHROPIC_API_KEY not configured on server' })
    try {
      const res = await axios.post('https://api.anthropic.com/v1/messages', request.body, {
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      })
      return res.data
    } catch (e) {
      return reply.status(502).send({ error: e.message })
    }
  })
}

export default plugin
