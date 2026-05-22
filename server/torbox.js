// ============================================================
//  TorBox Renamer — Fastify Plugin  (Torrent + Usenet)
//  Place in server/torbox.js
//  In server/index.js add:
//    import torboxPlugin from './torbox.js'
//    await fastify.register(torboxPlugin)
//  Railway env vars:
//    TORBOX_API_KEY      (optional — pre-fills login)
//    ANTHROPIC_API_KEY   (optional — enables AI suggestions)
// ============================================================

import axios from 'axios'

const TORBOX = 'https://api.torbox.app/v1/api'

const HTML = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<meta name="theme-color" content="#0d0d0f">
<title>TorBox Renamer</title>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;margin:0;padding:0}
body{background:#0d0d0f;color:#e8e8e8;font-family:'Courier New',monospace;min-height:100vh}
input,button{font-family:'Courier New',monospace}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

#login{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:24px 20px}
.lcard{width:100%;max-width:400px;background:#151518;border:1px solid #222;border-radius:20px;padding:40px 24px 32px;display:flex;flex-direction:column;align-items:center;gap:18px}
.logo{font-size:52px}.app-name{font-size:24px;font-weight:bold;color:#00e5a0;letter-spacing:1px}
.app-sub{font-size:14px;color:#555}
.big-input{width:100%;background:#1e1e24;border:1px solid #333;border-radius:12px;padding:18px 16px;color:#e8e8e8;font-size:16px;outline:none;-webkit-appearance:none}
.big-input:focus{border-color:#00e5a060}
.big-btn{width:100%;background:#00e5a0;color:#0d0d0f;border:none;border-radius:12px;padding:18px;font-weight:bold;font-size:17px;cursor:pointer}
.note{width:100%;background:#161d18;border:1px solid #1e3020;border-radius:10px;padding:14px;font-size:13px;color:#4a7a5a;line-height:1.6}
.err{width:100%;background:#2a1515;color:#ff6b6b;padding:14px;border-radius:10px;font-size:13px;border:1px solid #4a2020;line-height:1.5}
.steps-wrap{width:100%;display:flex;flex-direction:column;align-items:center;gap:18px}
.spinner{width:40px;height:40px;border:3px solid #1e1e24;border-top:3px solid #00e5a0;border-radius:50%;animation:spin .8s linear infinite}
.step-label{font-size:14px;color:#00e5a0}
.steps-list{width:100%;display:flex;flex-direction:column;gap:10px}
.step-row{font-size:14px;display:flex;align-items:center;gap:10px}
.step-dot{width:20px;text-align:center;flex-shrink:0}

#main{display:none;flex-direction:column;min-height:100vh}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #1a1a1e;background:#0d0d0f;position:sticky;top:0;z-index:20}
.top-l{display:flex;align-items:center;gap:10px}
.top-logo{font-size:22px}.top-title{font-size:16px;font-weight:bold;color:#00e5a0}
.top-r{display:flex;align-items:center;gap:10px}
.badge{background:#1e1e24;color:#aaa;padding:4px 12px;border-radius:20px;font-size:13px}
.abar{display:flex;gap:8px;padding:12px 16px;border-bottom:1px solid #1a1a1e;flex-wrap:wrap}
.chip{background:#1e1e24;color:#ddd;border:1px solid #333;border-radius:20px;padding:11px 18px;font-size:15px;cursor:pointer;white-space:nowrap}
.chip.on{background:#00e5a0;color:#0d0d0f;font-weight:bold;border-color:transparent}
.ai-banner{background:#1a1a28;border-bottom:1px solid #2a2a50;color:#aaaaff;padding:12px 18px;font-size:14px}
.list{padding:12px;display:flex;flex-direction:column;gap:10px;padding-bottom:40px}
.tcard{background:#151518;border:1px solid #222228;border-radius:14px;overflow:hidden;animation:fadeIn .2s ease}
.tcard.changed{border-color:#00e5a030}.tcard.done{border-color:#1e3020}
.cmain{display:flex;align-items:center;padding:16px;gap:12px;cursor:pointer;user-select:none}
.cmeta{flex:1;min-width:0}
.ctitle{font-size:17px;color:#e8e8e8;line-height:1.4;word-break:break-word}
.csugg{font-size:15px;color:#00e5a0;margin-top:5px;word-break:break-word;line-height:1.4}
.csub{font-size:13px;color:#777;margin-top:4px}
.tag-ok{color:#00e5a0}.tag-err{color:#ff6b6b}.tag-rev{color:#aaa}.tag-ren{color:#4a7a5a}
.chev{font-size:14px;color:#666;flex-shrink:0}
.ebody{border-top:1px solid #1e1e24;padding:14px 16px;display:flex;flex-direction:column;gap:14px}
.flist{display:flex;flex-direction:column;gap:6px;max-height:160px;overflow-y:auto}
.frow{display:flex;align-items:flex-start;gap:8px}
.fname{font-size:13px;color:#888;line-height:1.5;word-break:break-all}
.cacts{display:flex;flex-direction:column;gap:8px}
.btn-p{background:#00e5a0;color:#0d0d0f;border:none;border-radius:10px;padding:15px 16px;font-weight:bold;font-size:15px;cursor:pointer;text-align:left;line-height:1.4;word-break:break-word;width:100%}
.btn-s{background:#1e1e24;color:#aaa;border:1px solid #2a2a30;border-radius:10px;padding:14px 16px;font-size:15px;cursor:pointer;width:100%}
.btn-g{background:transparent;color:#666;border:1px solid #222;border-radius:10px;padding:14px 16px;font-size:14px;cursor:pointer;width:100%}
.eblock{display:flex;flex-direction:column;gap:10px}
.efield{width:100%;background:#1e1e24;border:1px solid #00e5a040;border-radius:10px;padding:15px 14px;color:#00e5a0;font-size:16px;outline:none;-webkit-appearance:none}
.efield:focus{border-color:#00e5a0}
.eacts{display:flex;gap:8px}
.btn-save{flex:1;background:#00e5a0;color:#0d0d0f;border:none;border-radius:10px;padding:15px;font-weight:bold;font-size:15px;cursor:pointer}
.btn-cancel{flex:1;background:#1e1e24;color:#888;border:1px solid #333;border-radius:10px;padding:15px;font-size:15px;cursor:pointer}
.panel{padding-bottom:40px}
.dupe-exact{background:#1e0a0a;border:1px solid #ff4444!important}
.dbadge-exact{background:#ff4444;color:#fff;font-size:12px;padding:3px 10px;border-radius:10px;font-weight:bold}
.dbadge-pos{background:#ff8844;color:#fff;font-size:12px;padding:3px 10px;border-radius:10px;font-weight:bold}
.drow{display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-top:1px solid #222}
.dtitle{font-size:15px;color:#e8e8e8;word-break:break-word;line-height:1.4}
.dmeta{font-size:13px;color:#888;margin-top:4px}
.btn-del{background:#2a1515;color:#ff6b6b;border:1px solid #5a2020;border-radius:8px;padding:11px 16px;font-size:14px;cursor:pointer;white-space:nowrap;flex-shrink:0}
.btn-del:disabled{opacity:.5}
.tpill{border-radius:8px;padding:3px 10px;font-size:13px;margin-right:4px;display:inline-block;margin-bottom:4px}
.type-badge{font-size:11px;padding:2px 8px;border-radius:6px;font-weight:bold;margin-right:6px;vertical-align:middle}
.type-torrent{background:#1a2a1a;color:#4a9a6a;border:1px solid #2a4a2a}
.type-usenet{background:#1a1a2a;color:#6a7aff;border:1px solid #2a2a5a}
</style>
</head>
<body>

<div id="login">
  <div class="lcard">
    <div class="logo">&#x26a1;</div>
    <div class="app-name">TorBox Renamer</div>
    <div class="app-sub">Torrents &amp; Usenet — AI-powered</div>
    <div id="lform" style="width:100%;display:flex;flex-direction:column;gap:14px">
      <input class="big-input" id="key-input" type="password" placeholder="TorBox API key..." autocomplete="off" autocorrect="off" spellcheck="false">
      <div class="err" id="err-msg" style="display:none"></div>
      <button class="big-btn" id="conn-btn" type="button">Connect &amp; Backup Library</button>
      <div class="note">&#x1f4e6; Backup auto-downloads before any changes</div>
    </div>
    <div id="steps-ui" style="width:100%;display:none">
      <div class="steps-wrap">
        <div class="spinner"></div>
        <div class="step-label" id="step-label">Starting...</div>
        <div class="steps-list" id="steps-list"></div>
      </div>
    </div>
  </div>
</div>

<div id="main">
  <div class="topbar">
    <div class="top-l"><span class="top-logo">&#x26a1;</span><span class="top-title">TorBox Renamer</span></div>
    <div class="top-r">
      <span id="ai-dot" style="display:none;font-size:18px">&#x1f916;</span>
      <span class="badge" id="count">0</span>
    </div>
  </div>
  <div class="abar" id="abar"></div>
  <div class="ai-banner" id="ai-banner" style="display:none"></div>
  <div class="list" id="tlist"></div>
  <div id="dpanel" class="panel" style="display:none"></div>
  <div id="tpanel" class="panel" style="display:none"></div>
</div>

<script>
var STEPS = ['Fetching torrents & Usenet','Creating snapshot','Downloading backup','Almost done...'];
var MANAGED = ['series','movies','adult'];
var TC = {series:'#4488ff',movies:'#aa66ff',adult:'#ff6688'};
var MEXT = /\.(mkv|mp4|avi|mov|wmv|m4v|ts|mpg|mpeg|m2ts|vob|flv|webm|divx|xvid)$/i;

var apiKey='', items=[], backup=null, edits={}, statuses={};
var expandId=null, editId=null;
var dupesOpen=false, dupeGroups=[];
var tagOpen=false, tagProposals=[];
var cleanupBusy=false;

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── QUALITY ──────────────────────────────────────────────────
function getQ(s){
  var m=s.match(/\b(4k|2160p|1080p|720p|480p)\b/i);
  if(!m)return null;
  return m[1].toUpperCase().replace('2160P','4K').replace(/P$/,'p');
}
function getQFiles(files){
  for(var i=0;i<files.length;i++){var q=getQ(files[i].name||files[i].short_name||'');if(q)return q;}
  return null;
}

// ── MEDIA FILES ───────────────────────────────────────────────
function mfiles(files){
  return (files||[]).filter(function(f){return MEXT.test(f.name||f.short_name||'');});
}

// ── BASE NAME ────────────────────────────────────────────────
function baseName(raw){
  var s=raw.split('/').pop().replace(/\.[^/.]+$/,'').replace(/[._]/g,' ');
  s=s.replace(/\bS\d\d?E\d\d?\b.*/i,'');
  s=s.replace(/\b[Ss]eason\s*\d+\b.*/i,'');
  s=s.replace(/\b(4k|2160p|1080p|720p|480p|bluray|bdrip|webrip|web-dl|webdl|hdtv|x264|x265|hevc|avc|h264|h265|hdr|sdr|yify|rarbg|ettv|eztv|prt|proper|repack|extended|theatrical|unrated)\b.*/gi,'');
  s=s.replace(/\b\d{4}\b.*/,'');
  return s.replace(/\s{2,}/g,' ').trim();
}

// ── EPISODE DESCRIPTOR ───────────────────────────────────────
function epDesc(files){
  var eps=[];
  files.forEach(function(f){
    var n=(f.name||f.short_name||'').split('/').pop();
    var m=n.match(/[Ss](\d\d?)[Ee](\d\d?)/);
    if(m)eps.push({s:parseInt(m[1]),e:parseInt(m[2])});
  });
  if(!eps.length)return null;
  var seasons=[],seen={};
  eps.forEach(function(e){if(!seen[e.s]){seasons.push(e.s);seen[e.s]=1;}});
  seasons.sort(function(a,b){return a-b;});
  function pad(n){return n<10?'0'+n:''+n;}
  if(seasons.length>1)return 'Seasons '+seasons[0]+'-'+seasons[seasons.length-1];
  var s=seasons[0];
  var epNums=[],seenE={};
  eps.forEach(function(e){if(e.s===s&&!seenE[e.e]){epNums.push(e.e);seenE[e.e]=1;}});
  epNums.sort(function(a,b){return a-b;});
  if(epNums.length===1)return 'S'+pad(s)+'E'+pad(epNums[0]);
  var mn=epNums[0],mx=epNums[epNums.length-1];
  var seq=(epNums.length===mx-mn+1);
  if(mn===1&&seq&&epNums.length>=6)return 'Season '+s;
  return 'S'+pad(s)+' E'+pad(mn)+'-E'+pad(mx);
}

// ── DERIVE TITLE ─────────────────────────────────────────────
function deriveTitle(files){
  var mf=mfiles(files);
  var src=mf.length?mf:files;
  if(!src||!src.length)return null;
  var q=getQ(src[0].name||src[0].short_name||'')||getQFiles(src);
  var b=baseName(src[0].name||src[0].short_name||'');
  var ep=epDesc(src);
  var parts=[b];
  if(ep)parts.push(ep);
  if(q)parts.push(q);
  return parts.filter(Boolean).join(' ');
}

// ── NORMALIZE FOR DUPE DETECTION ─────────────────────────────
function norm(raw){
  var s=raw.toLowerCase();
  s=s.replace(/\bS\d\d?E\d\d?\b/gi,'');
  s=s.replace(/\b(4k|2160p|1080p|720p|480p|bluray|bdrip|webrip|web-dl|webdl|hdtv|x264|x265|hevc|avc|h264|h265|hdr|sdr|dv|dolby|atmos|aac|ac3|dts|remux|proper|repack|extended|theatrical|unrated|yify|rarbg|ettv|eztv|prt)\b/gi,'');
  s=s.replace(/-[a-z0-9]+$/i,'');
  s=s.replace(/\b\d+\s*(mb|mib|gb|gib)\b/gi,'');
  s=s.replace(/[._\-]+/g,' ').replace(/\s{2,}/g,' ').trim();
  return s;
}

// ── CLASSIFY FOR TAGGING ─────────────────────────────────────
function classify(t){
  var txt=[t.name].concat((t.files||[]).map(function(f){return f.name||f.short_name||'';})).join(' ');
  if(/\bxxx\b|letspostit|brazzers|bangbros|realitykings|mofos|nubiles|vixen|blacked|tushy|wicked|penthouse|playboy|\bporn\b|pornrips|adulttime|21sextury|digitalplayground|eternaldesire|sweetsin|puretaboo/i.test(txt))return 'adult';
  if(/\bS\d\d?E\d\d?\b/i.test(txt))return 'series';
  var t2=edits[t.id]||t.name;
  if(/\bSeason\s*\d+\b/i.test(t2))return 'series';
  return 'movies';
}

// ── BACKUP DOWNLOAD ───────────────────────────────────────────
function dlBackup(data){
  try{
    var b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    var u=URL.createObjectURL(b);
    var a=document.createElement('a');
    a.href=u;a.download='torbox-backup-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(u);},100);
  }catch(e){console.warn('Backup download failed:',e);}
}

// ── STEPS UI ─────────────────────────────────────────────────
function showStep(i){
  document.getElementById('step-label').textContent=STEPS[i]||'Working...';
  document.getElementById('steps-list').innerHTML=STEPS.map(function(s,j){
    var c=j<i?'#00e5a060':j===i?'#00e5a0':'#2a2a30';
    var d=j<i?'&#x2713;':j===i?'&#x25b6;':'&#x25cb;';
    return '<div class="step-row" style="color:'+c+'"><span class="step-dot">'+d+'</span>'+s+'</div>';
  }).join('');
}

// ── CONNECT ───────────────────────────────────────────────────
function doConnect(){
  apiKey=document.getElementById('key-input').value.trim();
  if(!apiKey){showErr('Please enter your API key.');return;}
  document.getElementById('lform').style.display='none';
  document.getElementById('steps-ui').style.display='block';
  document.getElementById('err-msg').style.display='none';

  showStep(0);
  fetch('/api/torbox/list',{headers:{'x-torbox-key':apiKey}})
  .then(function(r){return r.json();})
  .then(function(d){
    if(!d.success)throw new Error(d.detail||'Failed to fetch library');
    items=Array.isArray(d.data)?d.data:[];

    showStep(1);
    backup={
      exported_at:new Date().toISOString(),
      total_count:items.length,
      torrent_count:items.filter(function(i){return i._type==='torrent';}).length,
      usenet_count:items.filter(function(i){return i._type==='usenet';}).length,
      items:items.map(function(t){return{
        id:t.id,name:t.name,hash:t.hash,tags:t.tags||[],_type:t._type,
        files:(t.files||[]).map(function(f){return{id:f.id,name:f.name||f.short_name,size:f.size};})
      };})
    };

    showStep(2);
    dlBackup(backup);

    showStep(3);
    document.getElementById('login').style.display='none';
    document.getElementById('main').style.display='flex';
    renderAll();
  })
  .catch(function(e){
    document.getElementById('steps-ui').style.display='none';
    document.getElementById('lform').style.display='flex';
    showErr(e.message||'Connection failed');
  });
}

function showErr(msg){
  var el=document.getElementById('err-msg');
  el.textContent=msg;el.style.display='block';
}

// ── RENDER ALL ────────────────────────────────────────────────
function renderAll(){
  document.getElementById('count').textContent=items.length;
  renderBar();renderList();renderDupes();renderTags();
}

// ── ACTION BAR ────────────────────────────────────────────────
function renderBar(){
  var needs=items.filter(function(t){return edits[t.id]&&edits[t.id]!==t.name;});
  var h='<button class="chip" onclick="doRefresh()">&#x21bb; Refresh</button>';
  h+='<button class="chip'+(cleanupBusy?' on':'')+'" onclick="doCleanup()">&#x2728; Title Cleanup</button>';
  h+='<button class="chip'+(dupesOpen?' on':'')+'" onclick="toggleDupes()">&#x1f50d; Duplicates</button>';
  h+='<button class="chip'+(tagOpen?' on':'')+'" onclick="toggleTags()">&#x1f3f7; Auto-Tag</button>';
  if(backup)h+='<button class="chip" onclick="dlBackup(backup)">&#x2b07; Backup</button>';
  if(backup)h+='<button class="chip" onclick="doRevertAll()">&#x21a9; Revert All</button>';
  if(needs.length)h+='<button class="chip on" onclick="applyAll()">Apply '+needs.length+'</button>';
  document.getElementById('abar').innerHTML=h;
}

// ── ITEM LIST ─────────────────────────────────────────────────
function renderList(){
  document.getElementById('tlist').innerHTML=items.map(function(t){
    var edit=edits[t.id]!==undefined?edits[t.id]:t.name;
    var changed=edit!==t.name;
    var st=statuses[t.id]||'';
    var isExp=expandId===t.id;
    var isEd=editId===t.id;
    var files=t.files||[];
    var orig=backup&&backup.items.filter(function(b){return b.id===t.id&&b._type===t._type;})[0];
    var origName=orig&&orig.name;
    var cls='tcard'+(changed?' changed':'')+(st==='done'?' done':'');
    var typeBadge='<span class="type-badge '+(t._type==='usenet'?'type-usenet':'type-torrent')+'">'+(t._type==='usenet'?'Usenet':'Torrent')+'</span>';
    var sub=typeBadge+files.length+' file'+(files.length!==1?'s':'');
    if(st==='done')sub+=' <span class="tag-ok">&#x2713; saved</span>';
    else if(st==='reverted')sub+=' <span class="tag-rev">&#x21a9; reverted</span>';
    else if(st&&st.slice(0,4)==='err:')sub+=' <span class="tag-err">&#x2717; '+esc(st.slice(4))+'</span>';
    else if(origName&&t.name!==origName)sub+=' <span class="tag-ren">&#x2022; renamed</span>';
    var exp='';
    if(isExp){
      var frows=files.slice(0,3).map(function(f){
        return '<div class="frow"><span>&#x1f4c4;</span><span class="fname">'+esc((f.name||f.short_name||'').split('/').pop())+'</span></div>';
      }).join('')+(files.length>3?'<div class="fname" style="color:#555">+'+(files.length-3)+' more</div>':'');
      var acts='';
      if(isEd){
        acts='<div class="eblock"><input class="efield" id="ef-'+t.id+'" value="'+esc(edit)+'" type="text" autocorrect="off" spellcheck="false">'
          +'<div class="eacts"><button class="btn-save" onclick="saveEdit(\''+t.id+'\',\''+t._type+'\')">Save</button>'
          +'<button class="btn-cancel" onclick="cancelEdit(\''+t.id+'\')">Cancel</button></div></div>';
      }else{
        acts='<div class="cacts">';
        if(changed)acts+='<button class="btn-p" onclick="applyOne(\''+t.id+'\',\''+t._type+'\')">Apply &#x2192; '+esc(edit)+'</button>';
        acts+='<button class="btn-s" onclick="startEdit(\''+t.id+'\')">&#x270f;&#xfe0f; Edit Title</button>';
        if(origName&&t.name!==origName)acts+='<button class="btn-g" onclick="revertOne(\''+t.id+'\',\''+t._type+'\')">&#x21a9; Revert to Original</button>';
        acts+='</div>';
      }
      exp='<div class="ebody">'+(files.length?'<div class="flist">'+frows+'</div>':'')+acts+'</div>';
    }
    return '<div class="'+cls+'" id="c-'+t.id+'">'
      +'<div class="cmain" onclick="toggleExp(\''+t.id+'\')">'
      +'<div class="cmeta"><div class="ctitle">'+esc(t.name)+'</div>'
      +(changed?'<div class="csugg">&#x2192; '+esc(edit)+'</div>':'')
      +'<div class="csub">'+sub+'</div></div>'
      +'<div class="chev">'+(isExp?'&#x25b2;':'&#x25bc;')+'</div></div>'+exp+'</div>';
  }).join('');
}

// ── CARD ACTIONS ─────────────────────────────────────────────
function toggleExp(id){expandId=expandId===id?null:id;if(editId!==id)editId=null;renderList();}
function startEdit(id){editId=id;renderList();setTimeout(function(){var el=document.getElementById('ef-'+id);if(el)el.focus();},50);}
function cancelEdit(id){editId=null;var t=items.filter(function(x){return x.id===id;})[0];if(t)edits[id]=t.name;renderList();renderBar();}
function saveEdit(id,type){var el=document.getElementById('ef-'+id);if(el&&el.value.trim()){edits[id]=el.value.trim();editId=null;}applyOne(id,type);}

function applyOne(id,type,nameOv){
  var t=items.filter(function(x){return x.id===id;})[0];if(!t)return;
  var newName=nameOv!==undefined?nameOv:edits[id];
  if(!newName||newName===t.name)return;
  statuses[id]='saving';renderList();
  fetch('/api/torbox/rename',{method:'POST',headers:{'Content-Type':'application/json','x-torbox-key':apiKey},body:JSON.stringify({item_id:id,name:newName,type:type||t._type})})
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.success){t.name=newName;statuses[id]='done';}
    else statuses[id]='err:'+(typeof d.detail==='string'?d.detail:JSON.stringify(d.detail||d));
    renderAll();
  })
  .catch(function(e){statuses[id]='err:'+e.message;renderAll();});
}

function applyAll(){
  items.forEach(function(t){if(edits[t.id]&&edits[t.id]!==t.name)applyOne(t.id,t._type);});
}

function revertOne(id,type){
  var orig=backup&&backup.items.filter(function(b){return b.id===id;})[0];
  if(!orig)return;
  edits[id]=orig.name;applyOne(id,type||orig._type,orig.name);
}

function doRevertAll(){
  if(!backup)return;
  if(!confirm('Revert all '+backup.items.length+' items to original names?'))return;
  backup.items.forEach(function(orig){
    var t=items.filter(function(x){return x.id===orig.id&&x._type===orig._type;})[0];
    if(t&&t.name!==orig.name){edits[orig.id]=orig.name;applyOne(orig.id,orig._type,orig.name);}
  });
}

// ── REFRESH ───────────────────────────────────────────────────
function doRefresh(){
  document.getElementById('abar').innerHTML='<span style="color:#00e5a0;padding:11px 4px;font-size:14px">&#x21bb; Refreshing...</span>';
  fetch('/api/torbox/list',{headers:{'x-torbox-key':apiKey}})
  .then(function(r){return r.json();})
  .then(function(d){
    if(!d.success)throw new Error(d.detail||'Failed');
    items=Array.isArray(d.data)?d.data:[];
    statuses={};renderAll();
  })
  .catch(function(e){renderBar();alert('Refresh failed: '+e.message);});
}

// ── TITLE CLEANUP ─────────────────────────────────────────────
function doCleanup(){
  if(cleanupBusy)return;
  cleanupBusy=true;renderBar();
  var banner=document.getElementById('ai-banner');
  banner.style.display='block';banner.textContent='&#x2728; Deriving titles from file names...';
  document.getElementById('ai-dot').style.display='inline';
  items.forEach(function(t){edits[t.id]=deriveTitle(t.files)||t.name;});
  renderList();
  banner.textContent='&#x1f916; AI refining suggestions...';
  var prompt='You are a media library assistant. Suggest clean titles from file names. Rules:\n1. ALWAYS end with quality if present (1080p, 4K, 720p).\n2. Movies: "Movie Title (Year) 1080p"\n3. TV single episode package: "Show Name S02E04 1080p"\n4. TV full season (sequential from E01, 6+ eps): "Show Name Season 2 1080p"\n5. TV partial season: "Show Name S02 E04-E08 1080p"\n6. TV multi-season: "Show Name Seasons 1-3 1080p"\n7. Title casing. Return ONLY JSON array: [{"id":1,"suggested":"Title"}]. No other text.\n\nItems:\n'+JSON.stringify(items.map(function(t){return{id:t.id,type:t._type,current_name:t.name,files:(t.files||[]).slice(0,5).map(function(f){return f.name||f.short_name;})};}),null,2);
  fetch('/api/torbox/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})})
  .then(function(r){return r.json();})
  .then(function(d){
    var block=d.content&&d.content.filter(function(b){return b.type==='text';})[0];
    if(block){
      try{
        var text=block.text.replace(/\x60\x60\x60json|\x60\x60\x60/g,'').trim();
        var results=JSON.parse(text);
        results.forEach(function(r){edits[r.id]=r.suggested;});
      }catch(e){}
    }
  })
  .catch(function(){})
  .then(function(){
    cleanupBusy=false;
    banner.style.display='none';
    document.getElementById('ai-dot').style.display='none';
    renderAll();
  });
}

// ── DUPLICATES ────────────────────────────────────────────────
function isExact(group){
  var qs=group.map(function(t){return getQ(edits[t.id]||t.name)||getQFiles(t.files||[])||'?';});
  return qs.some(function(q,i){return qs.indexOf(q)!==i;});
}

function scanDupes(){
  var groups={};
  items.forEach(function(t){
    var key=norm(edits[t.id]||t.name);
    if(!key||key.length<3)return;
    if(!groups[key])groups[key]=[];
    groups[key].push(t);
  });
  dupeGroups=Object.keys(groups).filter(function(k){return groups[k].length>1;})
    .map(function(k){return[k,groups[k]];})
    .sort(function(a,b){return b[1].length-a[1].length;});
}

function toggleDupes(){
  if(dupesOpen){dupesOpen=false;renderAll();return;}
  scanDupes();dupesOpen=true;renderAll();
}

function delItem(id,type,btn){
  if(!confirm('Delete this item permanently from TorBox?'))return;
  btn.disabled=true;btn.textContent='...';
  fetch('/api/torbox/delete',{method:'POST',headers:{'Content-Type':'application/json','x-torbox-key':apiKey},body:JSON.stringify({item_id:id,type:type})})
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.success){
      items=items.filter(function(t){return !(t.id===id&&t._type===type);});
      delete edits[id];delete statuses[id];
      scanDupes();renderAll();
    }else{btn.disabled=false;btn.textContent='Delete';alert('Delete failed: '+(d.detail||'Unknown'));}
  })
  .catch(function(e){btn.disabled=false;btn.textContent='Delete';alert(e.message);});
}

function renderDupes(){
  var el=document.getElementById('dpanel');
  if(!el)return;
  if(!dupesOpen){el.style.display='none';return;}
  el.style.display='block';
  if(!dupeGroups.length){el.innerHTML='<div style="padding:20px 16px;color:#4a7a5a;font-size:15px">&#x2713; No duplicates found.</div>';return;}
  var exact=dupeGroups.filter(function(g){return isExact(g[1]);}).length;
  var h='<div style="padding:14px 16px 8px;font-size:14px;color:#aaa">'+dupeGroups.length+' group'+(dupeGroups.length!==1?'s':'')+(exact?' &nbsp;<span class="dbadge-exact">'+exact+' EXACT</span>':'')+'</div>';
  dupeGroups.forEach(function(pair){
    var key=pair[0],group=pair[1];
    var ex=isExact(group);
    h+='<div class="tcard'+(ex?' dupe-exact':'')+'" style="margin:0 12px 10px;padding:4px 14px 2px">';
    h+='<div style="display:flex;align-items:center;gap:8px;padding:10px 0 4px">'
      +'<span style="font-size:14px;color:'+(ex?'#ff6666':'#ff9966')+';font-weight:bold;flex:1;word-break:break-word">'+esc(key)+'</span>'
      +'<span class="'+(ex?'dbadge-exact':'dbadge-pos')+'">'+(ex?'EXACT':'POSSIBLE')+'</span></div>';
    group.forEach(function(t){
      var title=edits[t.id]||t.name;
      var files=t.files||[];
      var q=getQ(edits[t.id]||t.name)||getQFiles(files)||'?';
      var sz=t.size?(t.size>1073741824?(t.size/1073741824).toFixed(1)+' GB':(t.size/1048576).toFixed(0)+' MB'):'';
      var mf=mfiles(files).slice(0,3);
      var fnames=mf.map(function(f){return '<span style="display:block;font-size:12px;color:#555;margin-top:2px">'+esc((f.name||f.short_name||'').split('/').pop())+'</span>';}).join('');
      var more=mfiles(files).length-mf.length;
      var typeBadge='<span class="type-badge '+(t._type==='usenet'?'type-usenet':'type-torrent')+'">'+(t._type==='usenet'?'Usenet':'Torrent')+'</span>';
      h+='<div class="drow"><div style="flex:1;min-width:0">'
        +'<div class="dtitle">'+typeBadge+esc(title)+'</div>'
        +'<div class="dmeta">'+files.length+' file'+(files.length!==1?'s':'')+(q!=='?'?' &bull; <b style="color:#e8e8e8">'+q+'</b>':'')+(sz?' &bull; '+sz:'')+'</div>'
        +fnames+(more>0?'<span style="font-size:12px;color:#444">+'+more+' more</span>':'')
        +'</div>'
        +'<button class="btn-del" onclick="delItem(\''+t.id+'\',\''+t._type+'\',this)">Delete</button></div>';
    });
    h+='</div>';
  });
  el.innerHTML=h;
}

// ── AUTO-TAG ─────────────────────────────────────────────────
function toggleTags(){
  if(tagOpen){tagOpen=false;tagProposals=[];renderAll();return;}
  tagProposals=items.map(function(t){
    var cat=classify(t);
    var kept=(t.tags||[]).filter(function(tag){return MANAGED.indexOf(tag.toLowerCase())<0;});
    var final=kept.slice();
    if(final.indexOf(cat)<0)final.push(cat);
    return{t:t,cat:cat,final:final,status:null};
  });
  tagOpen=true;renderAll();
}

function renderTags(){
  var el=document.getElementById('tpanel');
  if(!el)return;
  if(!tagOpen){el.style.display='none';return;}
  el.style.display='block';
  var counts={series:0,movies:0,adult:0};
  tagProposals.forEach(function(p){counts[p.cat]=(counts[p.cat]||0)+1;});
  var done=tagProposals.filter(function(p){return p.status==='done';}).length;
  var errs=tagProposals.filter(function(p){return p.status==='error';}).length;
  var pending=tagProposals.filter(function(p){return !p.status;}).length;
  var h='<div style="padding:14px 16px 8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
  ['series','movies','adult'].forEach(function(k){
    if(counts[k])h+='<span style="background:'+TC[k]+'22;color:'+TC[k]+';border:1px solid '+TC[k]+'44;border-radius:12px;padding:5px 14px;font-size:14px">'+k+' &bull; '+counts[k]+'</span>';
  });
  if(done)h+='<span style="color:#00e5a0;font-size:13px">&#x2713; '+done+' tagged</span>';
  if(errs)h+='<span style="color:#ff6b6b;font-size:13px">&#x2717; '+errs+' errors</span>';
  h+='</div>';
  if(pending)h+='<div style="padding:0 16px 12px"><button class="btn-p" onclick="applyAllTags()">Apply Tags to All '+tagProposals.length+' Items</button></div>';
  ['series','movies','adult'].forEach(function(cat){
    var grp=tagProposals.filter(function(p){return p.cat===cat;});
    if(!grp.length)return;
    h+='<div style="margin:0 12px 14px"><div style="font-size:14px;font-weight:bold;color:'+TC[cat]+';padding:8px 0 6px;border-bottom:1px solid #222;margin-bottom:4px">'+cat.toUpperCase()+' &bull; '+grp.length+'</div>';
    grp.forEach(function(p){
      var title=edits[p.t.id]||p.t.name;
      var kept=(p.t.tags||[]).filter(function(tg){return MANAGED.indexOf(tg.toLowerCase())<0;});
      var pills=p.final.map(function(tg){return '<span class="tpill" style="background:'+(TC[tg]||'#555')+'33;color:'+(TC[tg]||'#aaa')+'">'+esc(tg)+'</span>';}).join('');
      var st=p.status;
      var typeBadge='<span class="type-badge '+(p.t._type==='usenet'?'type-usenet':'type-torrent')+'">'+(p.t._type==='usenet'?'Usenet':'Torrent')+'</span>';
      h+='<div style="display:flex;align-items:flex-start;gap:10px;padding:11px 0;border-top:1px solid #1a1a1a">'
        +'<div style="flex:1;min-width:0"><div style="font-size:15px;color:#e8e8e8;word-break:break-word;line-height:1.4">'+typeBadge+esc(title)+'</div>'
        +'<div style="margin-top:6px">'+pills+'</div>'
        +(kept.length?'<div style="font-size:12px;color:#555;margin-top:3px">keeping: '+kept.join(', ')+'</div>':'')
        +'</div>'
        +(st==='done'?'<span style="color:#00e5a0;font-size:20px;flex-shrink:0">&#x2713;</span>'
         :st==='error'?'<span style="color:#ff6b6b;font-size:20px;flex-shrink:0">&#x2717;</span>'
         :'<button class="btn-del" style="background:#1a2030;color:#4488ff;border-color:#2a3a60" onclick="applyOneTag(\''+p.t.id+'\',\''+p.t._type+'\',this)">Tag</button>')
        +'</div>';
    });
    h+='</div>';
  });
  el.innerHTML=h;
}

function applyOneTag(id,type,btn){
  var p=tagProposals.filter(function(x){return x.t.id===id;})[0];if(!p)return;
  if(btn){btn.disabled=true;btn.textContent='...';}
  fetch('/api/torbox/tag',{method:'POST',headers:{'Content-Type':'application/json','x-torbox-key':apiKey},body:JSON.stringify({item_id:id,type:type||p.t._type,tags:p.final})})
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.success){p.status='done';p.t.tags=p.final;}
    else{p.status='error';if(btn){btn.disabled=false;btn.textContent='Tag';}}
    renderTags();
  })
  .catch(function(){p.status='error';if(btn){btn.disabled=false;btn.textContent='Tag';}renderTags();});
}

function applyAllTags(){
  tagProposals.forEach(function(p){if(!p.status)applyOneTag(p.t.id,p.t._type,null);});
}

// ── INIT ──────────────────────────────────────────────────────
document.getElementById('conn-btn').addEventListener('click', doConnect);
document.getElementById('key-input').addEventListener('keydown',function(e){if(e.key==='Enter')doConnect();});

fetch('/api/torbox/config')
  .then(function(r){return r.json();})
  .then(function(d){if(d.hasKey)document.getElementById('key-input').placeholder='API key configured on server \u2713';})
  .catch(function(){});
</script>
</body>
</html>`;

// ── SERVER PLUGIN ────────────────────────────────────────────
async function plugin(fastify) {

  fastify.get('/torbox', async (request, reply) => {
    reply.type('text/html')
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate')
    return HTML
  })

  fastify.get('/api/torbox/config', async (request, reply) => {
    return { hasKey: !!process.env.TORBOX_API_KEY, hasAI: !!process.env.ANTHROPIC_API_KEY }
  })

  // ── LIST: fetch torrents + usenet, tag each with _type ──────
  fastify.get('/api/torbox/list', async (request, reply) => {
    const key = request.headers['x-torbox-key'] || process.env.TORBOX_API_KEY
    if (!key) return reply.status(401).send({ success: false, detail: 'No API key' })
    try {
      const [torrentRes, usenetRes] = await Promise.allSettled([
        axios.get(`${TORBOX}/torrents/mylist?bypass_cache=true`, {
          headers: { Authorization: `Bearer ${key}` }
        }),
        axios.get(`${TORBOX}/usenet/mylist?bypass_cache=true`, {
          headers: { Authorization: `Bearer ${key}` }
        })
      ])

      const torrents = (torrentRes.status === 'fulfilled' && torrentRes.value.data?.success)
        ? (Array.isArray(torrentRes.value.data.data) ? torrentRes.value.data.data : [])
        : []

      const usenet = (usenetRes.status === 'fulfilled' && usenetRes.value.data?.success)
        ? (Array.isArray(usenetRes.value.data.data) ? usenetRes.value.data.data : [])
        : []

      torrents.forEach(t => { t._type = 'torrent' })
      usenet.forEach(t => { t._type = 'usenet' })

      return { success: true, data: [...torrents, ...usenet] }
    } catch (e) {
      return reply.status(502).send({ success: false, detail: e.message })
    }
  })

  // ── RENAME: route by type ────────────────────────────────────
  fastify.post('/api/torbox/rename', async (request, reply) => {
    const key = request.headers['x-torbox-key'] || process.env.TORBOX_API_KEY
    if (!key) return reply.status(401).send({ success: false, detail: 'No API key' })
    try {
      const { item_id, name, type } = request.body
      let res
      if (type === 'usenet') {
        res = await axios.put(`${TORBOX}/usenet/editusenetdownload`,
          { usenet_id: item_id, name },
          { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } }
        )
      } else {
        res = await axios.put(`${TORBOX}/torrents/edittorrent`,
          { torrent_id: item_id, name },
          { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } }
        )
      }
      return res.data
    } catch (e) {
      const detail = e.response?.data?.detail || e.message
      return reply.status(e.response?.status || 502).send({ success: false, detail, raw: e.response?.data })
    }
  })

  // ── DELETE: route by type ────────────────────────────────────
  fastify.post('/api/torbox/delete', async (request, reply) => {
    const key = request.headers['x-torbox-key'] || process.env.TORBOX_API_KEY
    if (!key) return reply.status(401).send({ success: false, detail: 'No API key' })
    try {
      const { item_id, type } = request.body
      let res
      if (type === 'usenet') {
        res = await axios.post(`${TORBOX}/usenet/controlusenetdownload`,
          { usenet_id: item_id, operation: 'delete' },
          { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } }
        )
      } else {
        res = await axios.post(`${TORBOX}/torrents/controltorrent`,
          { torrent_id: item_id, operation: 'delete' },
          { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } }
        )
      }
      return res.data
    } catch (e) {
      return reply.status(e.response?.status || 502).send({ success: false, detail: e.response?.data?.detail || e.message })
    }
  })

  // ── TAG: route by type ───────────────────────────────────────
  fastify.post('/api/torbox/tag', async (request, reply) => {
    const key = request.headers['x-torbox-key'] || process.env.TORBOX_API_KEY
    if (!key) return reply.status(401).send({ success: false, detail: 'No API key' })
    try {
      const { item_id, type, tags } = request.body
      let res
      if (type === 'usenet') {
        res = await axios.put(`${TORBOX}/usenet/editusenetdownload`,
          { usenet_id: item_id, tags },
          { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } }
        )
      } else {
        res = await axios.put(`${TORBOX}/torrents/edittorrent`,
          { torrent_id: item_id, tags },
          { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } }
        )
      }
      return res.data
    } catch (e) {
      return reply.status(e.response?.status || 502).send({ success: false, detail: e.response?.data?.detail || e.message })
    }
  })

  // ── AI PROXY ─────────────────────────────────────────────────
  fastify.post('/api/torbox/ai', async (request, reply) => {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) return reply.status(503).send({ error: 'ANTHROPIC_API_KEY not set' })
    try {
      const res = await axios.post('https://api.anthropic.com/v1/messages', request.body, {
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }
      })
      return res.data
    } catch (e) {
      return reply.status(502).send({ error: e.message })
    }
  })
}

export default plugin
