// ============================================================
//  BoxWarden — Fastify Plugin  (Torrent + Usenet)
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
<title>BoxWarden</title>
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
.dgroup{background:#151518;border:1px solid #222228;border-radius:14px;margin:0 12px 12px;overflow:hidden}
.dgroup-head{padding:14px 16px 10px;border-bottom:1px solid #1e1e24}
.dgroup-title{font-size:16px;font-weight:bold;color:#e8e8e8;word-break:break-word;line-height:1.4;margin-bottom:6px}
.dgroup-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dgroup-actions{display:flex;gap:8px;padding:10px 16px;border-top:1px solid #1e1e24;flex-wrap:wrap}
.ditem{display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-top:1px solid #1a1a1e;transition:background .15s}
.ditem.selected{background:#2a1515}
.ditem.keep{background:#0d1a10}
.dchk{width:22px;height:22px;border:2px solid #333;border-radius:6px;flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;margin-top:2px;transition:all .15s}
.dchk.checked{background:#ff4444;border-color:#ff4444;color:#fff}
.dchk.keep{background:#00e5a020;border-color:#00e5a050;color:#00e5a0;cursor:default}
.ditem-info{flex:1;min-width:0}
.ditem-name{font-size:15px;color:#e8e8e8;word-break:break-word;line-height:1.4}
.ditem-meta{font-size:13px;color:#666;margin-top:4px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.qbadge{font-size:12px;padding:2px 8px;border-radius:6px;font-weight:bold}
.q-4k{background:#ff990020;color:#ff9900;border:1px solid #ff990040}
.q-1080p{background:#00e5a020;color:#00e5a0;border:1px solid #00e5a040}
.q-720p{background:#4488ff20;color:#4488ff;border:1px solid #4488ff40}
.q-low{background:#44444420;color:#888;border:1px solid #44444440}
.keep-badge{font-size:11px;padding:2px 8px;border-radius:6px;background:#00e5a015;color:#00e5a0;border:1px solid #00e5a030;font-weight:bold}
.del-badge{font-size:11px;padding:2px 8px;border-radius:6px;background:#ff444415;color:#ff6666;border:1px solid #ff444430}
.dsum{padding:14px 16px;font-size:14px;color:#888;border-bottom:1px solid #1e1e24;display:flex;align-items:center;flex-wrap:wrap;gap:10px}
.btn-delbatch{background:#2a1515;color:#ff6b6b;border:1px solid #5a2020;border-radius:10px;padding:12px 18px;font-size:14px;cursor:pointer;font-family:'Courier New',monospace}
.btn-delbatch:disabled{opacity:.5}
.btn-autosel{background:#1e1e24;color:#ddd;border:1px solid #333;border-radius:10px;padding:12px 18px;font-size:14px;cursor:pointer;font-family:'Courier New',monospace}
.btn-keepbest{background:#0d1a10;color:#00e5a0;border:1px solid #00e5a030;border-radius:10px;padding:12px 18px;font-size:14px;cursor:pointer;font-family:'Courier New',monospace}
.tpill{border-radius:8px;padding:3px 10px;font-size:13px;margin-right:4px;display:inline-block;margin-bottom:4px}
.type-badge{font-size:11px;padding:2px 8px;border-radius:6px;font-weight:bold;margin-right:6px;vertical-align:middle}
.type-torrent{background:#1a2a1a;color:#4a9a6a;border:1px solid #2a4a2a}
.type-usenet{background:#1a1a2a;color:#6a7aff;border:1px solid #2a2a5a}
#fbar{border-bottom:1px solid #1a1a1e;background:#0f0f12}
.fsearch{width:100%;background:#1a1a20;border:none;border-bottom:1px solid #1a1a1e;padding:12px 16px;color:#e8e8e8;font-size:15px;font-family:'Courier New',monospace;outline:none}
.fsearch::placeholder{color:#444}
.frow{display:flex;gap:6px;padding:8px 12px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.frow::-webkit-scrollbar{display:none}
.fchip{background:#1a1a20;color:#888;border:1px solid #2a2a30;border-radius:16px;padding:6px 14px;font-size:13px;cursor:pointer;white-space:nowrap;font-family:'Courier New',monospace}
.fchip.on{background:#00e5a015;color:#00e5a0;border-color:#00e5a040}
.fchip.on-type{background:#4a9a6a15;color:#4a9a6a;border-color:#4a9a6a40}
.fchip.on-usenet{background:#6a7aff15;color:#6a7aff;border-color:#6a7aff40}
.fchip.on-series{background:#4488ff15;color:#4488ff;border-color:#4488ff40}
.fchip.on-movies{background:#aa66ff15;color:#aa66ff;border-color:#aa66ff40}
.fchip.on-adult{background:#ff668815;color:#ff6688;border-color:#ff668840}
.fcount{font-size:12px;color:#444;padding:0 14px 8px;font-family:'Courier New',monospace}
.ign-badge{font-size:11px;padding:2px 8px;border-radius:6px;background:#2a2a1a;color:#888;border:1px solid #44443a}
.quota-wrap{display:flex;align-items:center;gap:6px}
.quota-pill{font-size:12px;background:#1e1e24;color:#aaa;padding:3px 10px;border-radius:20px;white-space:nowrap;max-width:100px;overflow:hidden;text-overflow:ellipsis}
.quota-bar-outer{width:60px;height:5px;background:#1e1e24;border-radius:3px;overflow:hidden;flex-shrink:0}
.quota-bar-inner{height:100%;background:#00e5a0;border-radius:3px;transition:width .3s}
.quota-warn .quota-bar-inner{background:#ff9900}
.quota-crit .quota-bar-inner{background:#ff4444}
.quota-pct{font-size:11px;color:#666;flex-shrink:0}
</style>
</head>
<body>

<div id="login">
  <div class="lcard">
    <div class="logo">&#x1f6e1;</div>
    <div class="app-name">BoxWarden</div>
    <div class="app-sub">TorBox library manager &amp; curator</div>
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
    <div class="top-l"><span class="top-logo">&#x1f6e1;</span><span class="top-title">BoxWarden</span></div>
    <div class="top-r">
      <span id="ai-dot" style="display:none;font-size:18px">&#x1f916;</span>
      <div id="quota-widget" class="quota-wrap" style="display:none"></div>
      <span class="badge" id="count">0</span>
    </div>
  </div>
  <div class="abar" id="abar"></div>
  <div id="fbar">
    <input class="fsearch" id="fsearch" type="search" placeholder="&#x1f50d; Search titles..." autocorrect="off" spellcheck="false" oninput="onFilterChange()">
    <div class="frow" id="frow-type"></div>
    <div class="frow" id="frow-tag"></div>
    <div class="fcount" id="fcount"></div>
  </div>
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

var apiKey='', serverHasKey=false, items=[], backup=null, edits={}, statuses={};
var expandId=null, editId=null;
var dupesOpen=false, dupeGroups=[];
var tagOpen=false, tagProposals=[];
var cleanupBusy=false, cleanupMode=false;
var filterType='all', filterTag='all', filterStatus='all';
var ignored={};           // {id:{title:bool,titleSugg:str,tag:bool}}
var ignoredDupeGroups={};  // {normKey:true}
var dupeShowIgnored=false;
var tagShowIgnored=false;
var userInfo=null;

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

// ── BRACKET CLEANUP ──────────────────────────────────────────
function cleanBrackets(s){
  s=s.replace(/[\(\[]\s*(19\d\d|20\d\d)\s*[\)\]]/g,''); // (YYYY) or [YYYY]
  s=s.replace(/\(\s*\)/g,'');       // empty ()
  s=s.replace(/\[\s*\]/g,'');       // empty []
  s=s.replace(/\s*[\(\[]\s*$/,'');  // trailing orphan ( or [
  s=s.replace(/^\s*[\)\]]\s*/,'');  // leading orphan ) or ]
  s=s.replace(/\s*-\s*$/,'');       // trailing dash
  return s.replace(/\s{2,}/g,' ').trim();
}

// ── BASE NAME ────────────────────────────────────────────────
function baseName(raw){
  var s=raw.split('/').pop().replace(/\.[^/.]+$/,'').replace(/[._]/g,' ');
  // extract year (from (YYYY), [YYYY], or bare YYYY)
  var yearM=s.match(/[\(\[]?\b(19\d\d|20\d\d)\b[\)\]]?/);
  var year=yearM?yearM[1]:null;
  s=s.replace(/\bS\d\d?E\d\d?\b.*/i,'');
  s=s.replace(/\b[Ss]eason\s*\d+\b.*/i,'');
  // strip bracketed quality tags like [1080p] or (BluRay) and everything after
  s=s.replace(/[\(\[]\s*(?:4k|2160p|1080p|720p|480p|bluray|bdrip|webrip|web-dl|webdl|hdtv|x264|x265|hevc|avc|h264|h265|hdr|sdr)\s*[\)\]].*/gi,'');
  // strip bare quality and everything after
  s=s.replace(/\b(4k|2160p|1080p|720p|480p|bluray|bdrip|webrip|web-dl|webdl|hdtv|x264|x265|hevc|avc|h264|h265|hdr|uhd|sdr|remux|multi|internal|dts|atmos|truehd|ddp|dd5|ac3|aac|yify|rarbg|ettv|eztv|prt|proper|repack|extended|theatrical|unrated)\b.*/gi,'');
  // strip bare year (will re-add formatted) — strip with surrounding brackets too
  s=cleanBrackets(s);
  s=s.replace(/\b(19\d\d|20\d\d)\b/g,'');
  s=cleanBrackets(s);
  // title-case
  s=s.replace(/\b\w/g,function(c){return c.toUpperCase();});
  return year?s+' ('+year+')':s;
}

// ── HAS WORDS ────────────────────────────────────────────────
function hasWords(s){
  return /[a-zA-Z]{2,}/.test(s.replace(/\.[a-z0-9]{1,4}$/i,''));
}

// ── IS HASH NAME ─────────────────────────────────────────────
function isHashName(s){
  var t=s.trim();
  if(/^[a-f0-9]{16,}$/i.test(t))return true;
  if(/^[a-zA-Z0-9]{20,}$/.test(t))return true;
  return false;
}

// ── LOOKS ABBREVIATED ────────────────────────────────────────
var STOP=/^(the|a|an|of|in|on|at|to|and|or|is|it|its)$/;
function contentWords(s){
  return (s.toLowerCase().match(/[a-z]{2,}/g)||[]).filter(function(w){return !STOP.test(w);});
}
function looksAbbreviated(derivedBase, itemName){
  if(!itemName)return false;
  var bWords=contentWords(derivedBase.replace(/\s*\(\d{4}\)/g,''));
  var iClean=itemName.replace(/[._]/g,' ').replace(/\b(4k|2160p|1080p|720p|480p)\b.*/gi,'');
  var iWords=contentWords(iClean);
  if(iWords.length<=bWords.length+1)return false; // item name not significantly longer
  var overlap=bWords.filter(function(w){return iWords.indexOf(w)>=0;}).length;
  return overlap/Math.max(bWords.length,1)<0.5; // <50% of filename words match item title
}

// ── SCENE PACK DETECTION ─────────────────────────────────────
function isScenePack(files, itemName){
  var mf=mfiles(files);
  var src=mf.length?mf:files;
  if(/\b(pack|collection|bundle|anthology|mega|archive|complete\s*series)\b/i.test(itemName))return true;
  if(src.length<6)return false;
  var bases={};
  src.forEach(function(f){
    var b=baseName((f.name||f.short_name||'').split('/').pop())
      .replace(/\s*\(\d{4}\)/g,'').toLowerCase().slice(0,30).trim();
    if(b.length>3)bases[b]=1;
  });
  return Object.keys(bases).length>=5;
}

// ── CLEAN ITEM TITLE (no-words fallback) ─────────────────────
function cleanItemTitle(name){
  var s=name.replace(/[._]/g,' ');
  var yearM=s.match(/[\(\[]?\b(19\d\d|20\d\d)\b[\)\]]?/);
  var year=yearM?yearM[1]:null;
  var q=getQ(s);
  s=s.replace(/\bS\d\d?E\d\d?\b.*/i,'');
  s=s.replace(/\b[Ss]eason\s*\d+\b.*/i,'');
  s=s.replace(/[\(\[]\s*(?:4k|2160p|1080p|720p|480p|bluray|bdrip|webrip|web-dl|webdl|hdtv|x264|x265|hevc|avc|h264|h265|hdr|sdr)\s*[\)\]].*/gi,'');
  s=s.replace(/\b(4k|2160p|1080p|720p|480p|bluray|bdrip|webrip|web-dl|webdl|hdtv|x264|x265|hevc|avc|h264|h265|hdr|uhd|sdr|remux|multi|internal|dts|atmos|truehd|ddp|dd5|ac3|aac|yify|rarbg|ettv|eztv|prt|proper|repack|extended|theatrical|unrated)\b.*/gi,'');
  s=cleanBrackets(s);
  s=s.replace(/\b(19\d\d|20\d\d)\b/g,'');
  s=cleanBrackets(s);
  s=s.replace(/\b\w/g,function(c){return c.toUpperCase();});
  var title=year?s+' ('+year+')':s;
  return q?title+' '+q:title;
}

// ── SCENE PACK TITLE ─────────────────────────────────────────
function scenePackTitle(files, itemName){
  var mf=mfiles(files);
  var src=mf.length?mf:files;
  var q=getQFiles(src)||getQ(itemName)||'';
  var base=cleanItemTitle(itemName)
    .replace(/\s*(scene\s*pack|collection|bundle|pack)\s*/gi,' ')
    .replace(/\s+(4K|1080p|720p|480p)$/,'').trim();
  base=cleanBrackets(base);
  var parts=[base];
  if(q)parts.push(q);
  parts.push('Scene Pack');
  return parts.join(' ');
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
  if(seasons.length>1)return 'S'+pad(seasons[0])+'-S'+pad(seasons[seasons.length-1]);
  var s=seasons[0];
  var epNums=[],seenE={};
  eps.forEach(function(e){if(e.s===s&&!seenE[e.e]){epNums.push(e.e);seenE[e.e]=1;}});
  epNums.sort(function(a,b){return a-b;});
  if(epNums.length===1)return 'S'+pad(s)+'E'+pad(epNums[0]);
  var mn=epNums[0],mx=epNums[epNums.length-1];
  var seq=(epNums.length===mx-mn+1);
  if(mn===1&&seq&&epNums.length>=6)return 'S'+pad(s);
  return 'S'+pad(s)+'E'+pad(mn)+'-E'+pad(mx);
}

// ── DERIVE TITLE ─────────────────────────────────────────────
function deriveTitle(files, itemName){
  var mf=mfiles(files);
  var src=mf.length?mf:files;

  // no files or none have readable words → clean the existing title
  var anyWords=src&&src.some(function(f){return hasWords(f.name||f.short_name||'');});
  if(!src||!src.length||!anyWords){
    return itemName?cleanItemTitle(itemName):null;
  }

  // scene pack → derive from item name + "Scene Pack"
  if(isScenePack(src, itemName||'')){
    return scenePackTitle(src, itemName||'');
  }

  var q=getQ(src[0].name||src[0].short_name||'')||getQFiles(src);
  var b=baseName(src[0].name||src[0].short_name||'');

  // if filename base looks abbreviated vs item name, use item title instead
  if(itemName&&!isHashName(itemName)&&looksAbbreviated(b,itemName)){
    var itemBase=cleanItemTitle(itemName).replace(/\s+(4K|1080p|720p|480p)$/,'').trim();
    itemBase=cleanBrackets(itemBase);
    b=itemBase;
  }

  var ep=epDesc(src);
  var parts=[b];
  if(ep)parts.push(ep);
  if(q)parts.push(q);
  return parts.filter(Boolean).join(' ');
}

// ── NORMALIZE FOR DUPE DETECTION ─────────────────────────────
function norm(raw){
  var s=raw.toLowerCase();
  // keep SxxExx so different episodes aren't flagged as dupes
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
  if(/\bSeason\s*\d+\b|\bS\d\d?(?:\s*-\s*S\d\d?)?\s*(?:\b|$)/i.test(t2))return 'series';
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

// ── QUOTA WIDGET ─────────────────────────────────────────────
var PLAN_NAMES={0:'Free',1:'Essential',2:'Pro',3:'Standard',4:'Enterprise'};
function renderQuota(){
  var el=document.getElementById('quota-widget');
  if(!el||!userInfo)return;
  var planRaw=userInfo.plan!==undefined?userInfo.plan:userInfo.role;
  var planLabel=PLAN_NAMES[planRaw]||String(planRaw||'');
  if(!planLabel)planLabel='Plan';
  var used=userInfo.total_bytes_downloaded||userInfo.used_bandwidth||userInfo.bandwidth_used||userInfo.bytes_used||0;
  var limit=userInfo.monthly_bandwidth_limit||userInfo.monthly_bandwidth||userInfo.bandwidth_limit||userInfo.total_bandwidth||0;
  var pct=limit>0?Math.min(100,Math.round(used/limit*100)):0;
  var cls=pct>=90?'quota-crit':pct>=70?'quota-warn':'';
  el.className='quota-wrap '+cls;
  el.style.display='flex';
  el.innerHTML='<span class="quota-pill" title="'+esc(planLabel)+'">'+esc(planLabel)+'</span>'
    +(limit>0?'<div class="quota-bar-outer"><div class="quota-bar-inner" style="width:'+pct+'%"></div></div>'
    +'<span class="quota-pct">'+pct+'%</span>':'');
}

function fetchUserInfo(){
  fetch('/api/torbox/user',{headers:{'x-torbox-key':apiKey}})
  .then(function(r){return r.json();})
  .then(function(d){
    var data=d.data||d;
    if(data&&typeof data==='object'&&!Array.isArray(data)){userInfo=data;renderQuota();}
  })
  .catch(function(){});
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
  if(!apiKey&&!serverHasKey){showErr('Please enter your API key.');return;}
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
    fetchUserInfo();
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

// ── FILTER ────────────────────────────────────────────────────
function filteredItems(){
  var q=(document.getElementById('fsearch')||{}).value||'';
  q=q.toLowerCase().trim();
  return items.filter(function(t){
    if(filterType==='torrent'&&t._type!=='torrent')return false;
    if(filterType==='usenet'&&t._type!=='usenet')return false;
    if(filterTag==='untagged'){
      var hasMgd=(t.tags||[]).some(function(tg){return MANAGED.indexOf(tg.toLowerCase())>=0;});
      if(hasMgd)return false;
    } else if(filterTag!=='all'){
      var hasTag=(t.tags||[]).some(function(tg){return tg.toLowerCase()===filterTag;});
      if(!hasTag)return false;
    }
    if(filterStatus==='pending'){var e=edits[t.id];if(!e||e===t.name)return false;}
    if(filterStatus==='done'){if(statuses[t.id]!=='done')return false;}
    if(q&&(t.name||'').toLowerCase().indexOf(q)<0){
      var ed=edits[t.id]||'';
      if(ed.toLowerCase().indexOf(q)<0)return false;
    }
    return true;
  });
}

function onFilterChange(){renderFilterBar();renderList();}

function setFilterType(v){filterType=v;onFilterChange();}
function setFilterTag(v){filterTag=v;onFilterChange();}
function setFilterStatus(v){filterStatus=v;onFilterChange();}

function renderFilterBar(){
  var tc=items.filter(function(t){return t._type==='torrent';}).length;
  var uc=items.filter(function(t){return t._type==='usenet';}).length;
  var pending=items.filter(function(t){var e=edits[t.id];return e&&e!==t.name;}).length;
  var done=items.filter(function(t){return statuses[t.id]==='done';}).length;

  var typeRow=document.getElementById('frow-type');
  var tagRow=document.getElementById('frow-tag');
  var fcountEl=document.getElementById('fcount');
  if(!typeRow)return;

  var types=[
    {v:'all',label:'All ('+items.length+')',cls:'on'},
    {v:'torrent',label:'&#x2729; Torrent ('+tc+')',cls:'on-type'},
    {v:'usenet',label:'&#x25a3; Usenet ('+uc+')',cls:'on-usenet'}
  ];
  typeRow.innerHTML=types.map(function(x){
    return '<button class="fchip'+(filterType===x.v?' '+x.cls:'')+'" onclick="setFilterType(\''+x.v+'\')">'+x.label+'</button>';
  }).join('');

  var tags=[
    {v:'all',label:'All Tags',cls:'on'},
    {v:'series',label:'&#x1f4fa; Series',cls:'on-series'},
    {v:'movies',label:'&#x1f3ac; Movies',cls:'on-movies'},
    {v:'adult',label:'&#x1f51e; Adult',cls:'on-adult'},
    {v:'untagged',label:'Untagged',cls:'on'}
  ];
  tagRow.innerHTML=tags.map(function(x){
    return '<button class="fchip'+(filterTag===x.v?' '+x.cls:'')+'" onclick="setFilterTag(\''+x.v+'\')">'+x.label+'</button>';
  }).join('');

  // append status filters to tag row
  if(pending||done){
    var statusBtns='';
    if(pending)statusBtns+='<button class="fchip'+(filterStatus==='pending'?' on':'')+'" onclick="setFilterStatus(filterStatus===\'pending\'?\'all\':\'pending\')">&#x270f; Pending ('+pending+')</button>';
    if(done)statusBtns+='<button class="fchip'+(filterStatus==='done'?' on':'')+'" onclick="setFilterStatus(filterStatus===\'done\'?\'all\':\'done\')">&#x2713; Done ('+done+')</button>';
    tagRow.innerHTML+=statusBtns;
  }

  var vis=filteredItems().length;
  fcountEl.textContent=vis===items.length?'':('Showing '+vis+' of '+items.length);
}

// ── RENDER ALL ────────────────────────────────────────────────
function renderAll(){
  var panelMode=dupesOpen||tagOpen;
  var tlist=document.getElementById('tlist');
  var fbar=document.getElementById('fbar');
  if(tlist)tlist.style.display=panelMode?'none':'flex';
  if(fbar)fbar.style.display=panelMode?'none':'block';
  var vis=panelMode?items.length:filteredItems().length;
  document.getElementById('count').textContent=vis===items.length?items.length:(vis+'/'+items.length);
  renderBar();
  if(!panelMode)renderFilterBar();
  renderList();
  renderDupes();
  renderTags();
}

// ── ACTION BAR ────────────────────────────────────────────────
function renderBar(){
  var needs=items.filter(function(t){return edits[t.id]&&edits[t.id]!==t.name;});
  var h='<button class="chip" onclick="doRefresh()">&#x21bb; Refresh</button>';
  h+='<button class="chip'+(cleanupBusy||cleanupMode?' on':'')+'" onclick="doCleanup()">&#x2728; Title Cleanup'+(cleanupMode?' ('+needs.length+')':'')+'</button>';
  h+='<button class="chip'+(dupesOpen?' on':'')+'" onclick="toggleDupes()">&#x1f50d; Duplicates</button>';
  h+='<button class="chip'+(tagOpen?' on':'')+'" onclick="toggleTags()">&#x1f3f7; Auto-Tag</button>';
  if(backup)h+='<button class="chip" onclick="dlBackup(backup)">&#x2b07; Backup</button>';
  if(backup)h+='<button class="chip" onclick="doRevertAll()">&#x21a9; Revert All</button>';
  if(needs.length&&!cleanupMode)h+='<button class="chip on" onclick="applyAll()">Apply '+needs.length+'</button>';
  if(needs.length&&cleanupMode)h+='<button class="chip on" onclick="applyAll()">&#x2714; Apply All '+needs.length+'</button>';
  if(cleanupMode){var ign=Object.keys(ignored).filter(function(id){return ignored[id]&&ignored[id].title;}).length;if(ign)h+='<button class="chip" onclick="clearIgnoredTitles()">&#x2298; '+ign+' Ignored</button>';}
  document.getElementById('abar').innerHTML=h;
}

// ── ITEM LIST ─────────────────────────────────────────────────
function renderList(){
  if(dupesOpen||tagOpen)return;
  var visible=filteredItems();
  if(cleanupMode)visible=visible.filter(function(t){if(ignored[t.id]&&ignored[t.id].title)return false;var e=edits[t.id];return e&&e!==t.name;});
  if(!visible.length){
    document.getElementById('tlist').innerHTML='<div style="padding:30px 16px;color:#444;font-size:14px;text-align:center">'+(cleanupMode?'No pending title changes.':'No items match filters.')+'</div>';
    return;
  }
  document.getElementById('tlist').innerHTML=visible.map(function(t){
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
          +'<div class="eacts"><button class="btn-save" onclick="saveEdit('+t.id+',\''+t._type+'\')">Save</button>'
          +'<button class="btn-cancel" onclick="cancelEdit('+t.id+')">Cancel</button></div></div>';
      }else{
        acts='<div class="cacts">';
        if(!cleanupMode&&changed)acts+='<button class="btn-p" onclick="applyOne('+t.id+',\''+t._type+'\')">Apply &#x2192; '+esc(edit)+'</button>';
        acts+='<button class="btn-s" onclick="startEdit('+t.id+')">&#x270f;&#xfe0f; Edit Title</button>';
        if(origName&&t.name!==origName)acts+='<button class="btn-g" onclick="revertOne('+t.id+',\''+t._type+'\')">&#x21a9; Revert to Original</button>';
        acts+='</div>';
      }
      exp='<div class="ebody">'+(files.length?'<div class="flist">'+frows+'</div>':'')+acts+'</div>';
    }
    // In cleanup mode: inline ✓/⊘ buttons + chevron. Otherwise: just chevron.
    var rightSide='';
    if(cleanupMode&&changed){
      rightSide='<div style="display:flex;gap:6px;flex-shrink:0;align-items:center">'
        +'<button onclick="event.stopPropagation();applyOne('+t.id+',\''+t._type+'\')" style="width:36px;height:36px;background:#00e5a015;color:#00e5a0;border:1px solid #00e5a040;border-radius:8px;font-size:17px;cursor:pointer;flex-shrink:0" title="Apply">&#x2714;</button>'
        +'<button onclick="event.stopPropagation();ignoreTitle('+t.id+')" style="width:36px;height:36px;background:#2a2a1a;color:#888;border:1px solid #44443a;border-radius:8px;font-size:16px;cursor:pointer;flex-shrink:0" title="Ignore">&#x2298;</button>'
        +'<div class="chev" style="margin-left:2px">'+(isExp?'&#x25b2;':'&#x25bc;')+'</div>'
        +'</div>';
    } else {
      rightSide='<div class="chev">'+(isExp?'&#x25b2;':'&#x25bc;')+'</div>';
    }
    return '<div class="'+cls+'" id="c-'+t.id+'">'
      +'<div class="cmain" onclick="toggleExp('+t.id+')">'
      +'<div class="cmeta"><div class="ctitle">'+esc(t.name)+'</div>'
      +(changed?'<div class="csugg">&#x2192; '+esc(edit)+'</div>':'')
      +'<div class="csub">'+sub+'</div></div>'
      +rightSide+'</div>'+exp+'</div>';
  }).join('');
}

// ── CARD ACTIONS ─────────────────────────────────────────────
function toggleExp(id){expandId=expandId===id?null:id;if(editId!==id)editId=null;renderList();}
function startEdit(id){editId=id;renderList();setTimeout(function(){var el=document.getElementById('ef-'+id);if(el)el.focus();},50);}
function cancelEdit(id){editId=null;var t=items.filter(function(x){return x.id===id;})[0];if(t)edits[id]=t.name;renderList();renderBar();}
function saveEdit(id,type){var el=document.getElementById('ef-'+id);if(el&&el.value.trim()){edits[id]=el.value.trim();editId=null;}applyOne(id,type);}

function ignoreTitle(id){
  var t=items.filter(function(x){return x.id===id;})[0];if(!t)return;
  var sugg=edits[id];
  ignored[id]=Object.assign({},ignored[id]||{},{title:true,titleSugg:sugg});
  edits[id]=t.name;
  renderList();renderBar();
}
function unignoreTitle(id){
  if(!ignored[id])return;
  var sugg=ignored[id].titleSugg;
  delete ignored[id].title;delete ignored[id].titleSugg;
  if(sugg)edits[id]=sugg;
  renderList();renderBar();
}

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
  items.forEach(function(t){if(ignored[t.id]&&ignored[t.id].title)return;if(edits[t.id]&&edits[t.id]!==t.name)applyOne(t.id,t._type);});
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

function clearIgnoredTitles(){
  Object.keys(ignored).forEach(function(id){
    if(!ignored[id]||!ignored[id].title)return;
    var sugg=ignored[id].titleSugg;
    delete ignored[id].title;delete ignored[id].titleSugg;
    var t=items.filter(function(x){return x.id===parseInt(id);})[0];
    if(t&&sugg)edits[parseInt(id)]=sugg;
  });
  renderAll();
}

// ── REFRESH ───────────────────────────────────────────────────
function doRefresh(){
  document.getElementById('abar').innerHTML='<span style="color:#00e5a0;padding:11px 4px;font-size:14px">&#x21bb; Refreshing...</span>';
  fetch('/api/torbox/list',{headers:{'x-torbox-key':apiKey}})
  .then(function(r){return r.json();})
  .then(function(d){
    if(!d.success)throw new Error(d.detail||'Failed');
    items=Array.isArray(d.data)?d.data:[];
    statuses={};ignored={};ignoredDupeGroups={};dupeShowIgnored=false;tagShowIgnored=false;
    filterType='all';filterTag='all';filterStatus='all';cleanupMode=false;renderAll();
  })
  .catch(function(e){renderBar();alert('Refresh failed: '+e.message);});
}

// ── TITLE CLEANUP ─────────────────────────────────────────────
function doCleanup(){
  // if already in cleanup view and not busy, toggle it off
  if(cleanupMode&&!cleanupBusy){cleanupMode=false;renderAll();return;}
  if(cleanupBusy)return;
  // close other panels
  dupesOpen=false;dupeSelected={};tagOpen=false;tagProposals=[];
  cleanupBusy=true;renderBar();
  var banner=document.getElementById('ai-banner');
  banner.style.display='block';banner.textContent='&#x2728; Deriving titles from file names...';
  document.getElementById('ai-dot').style.display='inline';
  items.forEach(function(t){if(ignored[t.id]&&ignored[t.id].title)return;edits[t.id]=deriveTitle(t.files,t.name)||t.name;});
  renderList();
  banner.textContent='&#x1f916; AI refining suggestions...';
  var prompt='You are a media library assistant. Suggest clean titles. Strict rules:\n'
    +'1. Quality suffix: ALWAYS end with quality tag if present (1080p, 4K, 720p).\n'
    +'2. Year: if a year (YYYY) appears anywhere in the name or files, ALWAYS include it as (YYYY). e.g. "The Movie (2021) 1080p".\n'
    +'3. Movies: "Movie Title (Year) Quality" e.g. "Inception (2010) 1080p".\n'
    +'4. TV single ep: "Show Name S02E04 1080p".\n'
    +'5. TV full season (E01 sequential, 6+ eps): "Show Name S02 1080p".\n'
    +'6. TV partial season: "Show Name S02E04-E08 1080p".\n'
    +'7. TV multi-season: "Show Name S01-S03 1080p".\n'
    +'8. Scene Pack: if the item has many diverse files (a collection/pack/bundle), end with "Scene Pack". e.g. "Studio Name 1080p Scene Pack" or "Artist Discography 2023 Scene Pack".\n'
    +'9. local_suggestion is pre-derived from filenames — use as PRIMARY source. Only override if clearly wrong (garbled, hash-based, missing key info).\n'
    +'10. If local_suggestion looks correct, return it unchanged.\n'
    +'11. Title casing always.\n'
    +'Return ONLY JSON array: [{"id":1,"suggested":"Title"}]. No other text.\n\n'
    +'Items:\n'+JSON.stringify(items.filter(function(t){return !(ignored[t.id]&&ignored[t.id].title);}).map(function(t){
      var mf=mfiles(t.files||[]);
      var src=mf.length?mf:(t.files||[]);
      var anyWords=src.some(function(f){return hasWords(f.name||f.short_name||'');});
      var pack=isScenePack(src,t.name);
      return{
        id:t.id,
        type:t._type,
        current_name:t.name,
        local_suggestion:edits[t.id]||t.name,
        is_pack:pack,
        has_readable_filenames:anyWords,
        files:src.slice(0,6).map(function(f){return f.name||f.short_name;})
      };
    }),null,2);
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
    cleanupMode=true;
    banner.style.display='none';
    document.getElementById('ai-dot').style.display='none';
    renderAll();
  });
}

// ── DUPLICATES ────────────────────────────────────────────────
var dupeSelected={};  // key: id+'_'+type → true

function dupeKey(id,type){return id+'_'+type;}

function qRank(t){
  var q=getQ(edits[t.id]||t.name)||getQFiles(t.files||[])||'';
  if(/4k|2160/i.test(q))return 4;
  if(/1080/i.test(q))return 3;
  if(/720/i.test(q))return 2;
  if(/480/i.test(q))return 1;
  return 0;
}

function bestInGroup(group){
  // pick highest quality, tie-break by largest size
  return group.slice().sort(function(a,b){
    var qd=qRank(b)-qRank(a);
    if(qd!==0)return qd;
    return (b.size||0)-(a.size||0);
  })[0];
}

function qBadgeHtml(t){
  var q=getQ(edits[t.id]||t.name)||getQFiles(t.files||[])||'';
  if(!q)return '';
  var cls=(/4k|2160/i.test(q)?'q-4k':/1080/i.test(q)?'q-1080p':/720/i.test(q)?'q-720p':'q-low');
  return '<span class="qbadge '+cls+'">'+esc(q)+'</span>';
}

function fmtSize(s){
  if(!s)return '';
  return s>1073741824?(s/1073741824).toFixed(1)+' GB':(s/1048576).toFixed(0)+' MB';
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
  // clear stale selections
  var valid={};
  dupeGroups.forEach(function(pair){pair[1].forEach(function(t){valid[dupeKey(t.id,t._type)]=true;});});
  Object.keys(dupeSelected).forEach(function(k){if(!valid[k])delete dupeSelected[k];});
}

function toggleDupes(){
  if(dupesOpen){dupesOpen=false;dupeSelected={};renderAll();return;}
  tagOpen=false;tagProposals=[];cleanupMode=false;
  scanDupes();dupesOpen=true;renderAll();
}

function toggleDupeItem(id,type){
  var k=dupeKey(id,type);
  if(dupeSelected[k])delete dupeSelected[k];
  else dupeSelected[k]=true;
  renderDupes();renderBar();
}

function autoSelectGroup(gi){
  var group=dupeGroups[gi][1];
  var best=bestInGroup(group);
  group.forEach(function(t){
    var k=dupeKey(t.id,t._type);
    if(t.id===best.id&&t._type===best._type)delete dupeSelected[k];
    else dupeSelected[k]=true;
  });
  renderDupes();renderBar();
}

function clearGroupSel(gi){
  var group=dupeGroups[gi][1];
  group.forEach(function(t){delete dupeSelected[dupeKey(t.id,t._type)];});
  renderDupes();renderBar();
}

function deleteSelected(){
  var toDelete=Object.keys(dupeSelected).filter(function(k){return dupeSelected[k];});
  if(!toDelete.length)return;
  var totalSz=0;
  toDelete.forEach(function(k){
    var parts=k.split('_');
    var id=parseInt(parts[0]),type=parts[1];
    var t=items.filter(function(x){return x.id===id&&x._type===type;})[0];
    if(t)totalSz+=(t.size||0);
  });
  var szStr=fmtSize(totalSz);
  if(!confirm('Delete '+toDelete.length+' item'+(toDelete.length!==1?'s':'')+(szStr?' ('+szStr+')':'')+' permanently?'))return;
  var btn=document.getElementById('del-sel-btn');
  if(btn){btn.disabled=true;btn.textContent='Deleting...';}
  var chain=Promise.resolve();
  toDelete.forEach(function(k){
    chain=chain.then(function(){
      var parts=k.split('_');
      var id=parseInt(parts[0]),type=parts[1];
      return fetch('/api/torbox/delete',{method:'POST',headers:{'Content-Type':'application/json','x-torbox-key':apiKey},body:JSON.stringify({item_id:id,type:type})})
      .then(function(r){return r.json();})
      .then(function(d){
        if(d.success){
          items=items.filter(function(t){return !(t.id===id&&t._type===type);});
          delete edits[id];delete statuses[id];delete dupeSelected[k];
        }
      })
      .catch(function(){});
    });
  });
  chain.then(function(){scanDupes();renderAll();});
}

function deleteGroupAll(gi){
  var group=dupeGroups[gi][1];
  var best=bestInGroup(group);
  group.forEach(function(t){
    if(!(t.id===best.id&&t._type===best._type))dupeSelected[dupeKey(t.id,t._type)]=true;
  });
  deleteSelected();
}

function ignoreDupeGroup(key){
  ignoredDupeGroups[key]=true;
  renderDupes();
}
function unignoreDupeGroup(key){
  delete ignoredDupeGroups[key];
  renderDupes();
}
function toggleDupeShowIgnored(){dupeShowIgnored=!dupeShowIgnored;renderDupes();}

function renderDupes(){
  var el=document.getElementById('dpanel');
  if(!el)return;
  if(!dupesOpen){el.style.display='none';return;}
  el.style.display='block';
  if(!dupeGroups.length){
    el.innerHTML='<div style="padding:24px 16px;color:#4a7a5a;font-size:15px;text-align:center">&#x2713; No duplicates found.</div>';
    return;
  }

  var selCount=Object.keys(dupeSelected).filter(function(k){return dupeSelected[k];}).length;
  var selSize=0;
  Object.keys(dupeSelected).forEach(function(k){
    if(!dupeSelected[k])return;
    var parts=k.split('_');var id=parseInt(parts[0]),type=parts[1];
    var t=items.filter(function(x){return x.id===id&&x._type===type;})[0];
    if(t)selSize+=(t.size||0);
  });

  // total reclaimable (all non-best items)
  var reclaimSize=0;
  dupeGroups.forEach(function(pair){
    var best=bestInGroup(pair[1]);
    pair[1].forEach(function(t){if(!(t.id===best.id&&t._type===best._type))reclaimSize+=(t.size||0);});
  });

  var h='<div class="dsum">';
  h+='<span>'+dupeGroups.length+' duplicate group'+(dupeGroups.length!==1?'s':'')+'</span>';
  if(reclaimSize)h+='<span style="color:#4a9a6a">&#x267b; '+fmtSize(reclaimSize)+' reclaimable</span>';
  if(selCount){
    h+='<span style="color:#ff8888">'+selCount+' selected'+(selSize?' &bull; '+fmtSize(selSize):'')+' </span>';
    h+='<button id="del-sel-btn" class="btn-delbatch" onclick="deleteSelected()">&#x1f5d1; Delete Selected ('+selCount+')</button>';
  }
  h+='</div>';

  var visibleGroups=dupeGroups.filter(function(p){return dupeShowIgnored||!ignoredDupeGroups[p[0]];});
  var hiddenCount=dupeGroups.length-dupeGroups.filter(function(p){return !ignoredDupeGroups[p[0]];}).length;
  dupeGroups.filter(function(p){return dupeShowIgnored||!ignoredDupeGroups[p[0]];}).forEach(function(pair,gi){
    var key=pair[0],group=pair[1];
    var best=bestInGroup(group);
    var groupSelCount=group.filter(function(t){return dupeSelected[dupeKey(t.id,t._type)];}).length;
    var cleanTitle=edits[best.id]||best.name;

    h+='<div class="dgroup">';
    // group header
    h+='<div class="dgroup-head">';
    h+='<div class="dgroup-title">'+esc(cleanTitle)+'</div>';
    h+='<div class="dgroup-meta">';
    h+='<span style="font-size:13px;color:#555">'+group.length+' copies</span>';
    var grpSz=group.reduce(function(acc,t){return acc+(t.size||0);},0);
    if(grpSz)h+='<span style="font-size:13px;color:#555">'+fmtSize(grpSz)+' total</span>';
    var nonBestSz=group.filter(function(t){return !(t.id===best.id&&t._type===best._type);}).reduce(function(acc,t){return acc+(t.size||0);},0);
    if(nonBestSz)h+='<span style="font-size:13px;color:#4a7a5a">'+fmtSize(nonBestSz)+' reclaimable</span>';
    h+='</div></div>';

    // items
    group.forEach(function(t){
      var isBest=(t.id===best.id&&t._type===best._type);
      var k=dupeKey(t.id,t._type);
      var isSel=!!dupeSelected[k];
      var files=t.files||[];
      var sz=fmtSize(t.size);
      var typeBadge='<span class="type-badge '+(t._type==='usenet'?'type-usenet':'type-torrent')+'">'+(t._type==='usenet'?'Usenet':'Torrent')+'</span>';
      h+='<div class="ditem'+(isSel?' selected':isBest?' keep':'')+('" id="di-'+k+'">')
        +'<div class="dchk'+(isBest?' keep':isSel?' checked':'')+'" onclick="'+(isBest?'':' toggleDupeItem('+t.id+',\''+t._type+'\')')+'">'
        +(isBest?'&#x2605;':isSel?'&#x2715;':'')
        +'</div>'
        +'<div class="ditem-info">'
        +'<div class="ditem-name">'+typeBadge+esc(edits[t.id]||t.name)+'</div>'
        +'<div class="ditem-meta">'
        +qBadgeHtml(t)
        +(sz?'<span>'+sz+'</span>':'')
        +'<span>'+files.length+' file'+(files.length!==1?'s':'')+'</span>'
        +(isBest?'<span class="keep-badge">&#x2605; Keep</span>':'<span class="del-badge">Duplicate</span>')
        +'</div>'
        +'</div>'
        +'</div>';
    });

    // group actions
    h+='<div class="dgroup-actions">';
    if(groupSelCount){
      h+='<button class="btn-delbatch" onclick="deleteSelected()">&#x1f5d1; Delete '+groupSelCount+' Selected</button>';
      h+='<button class="btn-autosel" onclick="clearGroupSel('+gi+')">Clear</button>';
    } else {
      h+='<button class="btn-autosel" onclick="autoSelectGroup('+gi+')">&#x2713; Select Duplicates</button>';
      h+='<button class="btn-keepbest" onclick="deleteGroupAll('+gi+')">&#x26a1; Keep Best &amp; Delete Rest</button>';
      h+='<button class="btn-g" style="width:auto;padding:10px 14px;font-size:13px" data-key='+JSON.stringify(key)+' onclick="ignoreDupeGroup(JSON.parse(this.dataset.key))">⊘ Ignore Group</button>';
    }
    h+='</div>';
    h+='</div>';
  });
  if(hiddenCount||dupeShowIgnored){
    h+='<div style="padding:14px 16px;text-align:center"><button class="btn-g" style="width:auto;padding:10px 18px;font-size:13px" onclick="toggleDupeShowIgnored()">'+(dupeShowIgnored?'&#x25b2; Hide ignored':'&#x25bc; Show '+hiddenCount+' ignored group'+(hiddenCount!==1?'s':''))+'</button></div>';
  }

  el.innerHTML=h;
}

// ── AUTO-TAG ─────────────────────────────────────────────────
function toggleTags(){
  if(tagOpen){tagOpen=false;tagProposals=[];renderAll();return;}
  dupesOpen=false;dupeSelected={};cleanupMode=false;
  tagProposals=items.map(function(t){
    var cat=classify(t);
    var current=(t.tags||[]).slice();
    // build suggested final: keep all current tags, add cat if missing
    var final=current.slice();
    if(final.map(function(x){return x.toLowerCase();}).indexOf(cat)<0)final.push(cat);
    return{t:t,cat:cat,current:current,final:final,status:null};
  });
  tagOpen=true;renderAll();
}

function toggleTagInFinal(id,tag){
  var p=tagProposals.filter(function(x){return x.t.id===id;})[0];if(!p)return;
  var lower=p.final.map(function(x){return x.toLowerCase();});
  var idx=lower.indexOf(tag.toLowerCase());
  if(idx>=0)p.final.splice(idx,1);
  else p.final.push(tag);
  p.status=null;
  renderTags();
}

function ignoreTag(id){
  ignored[id]=Object.assign({},ignored[id]||{},{tag:true});
  renderTags();
}
function unignoreTag(id){
  if(ignored[id])delete ignored[id].tag;
  renderTags();
}
function toggleTagShowIgnored(){tagShowIgnored=!tagShowIgnored;renderTags();}

function renderTags(){
  var el=document.getElementById('tpanel');
  if(!el)return;
  if(!tagOpen){el.style.display='none';return;}
  el.style.display='block';

  var changed=tagProposals.filter(function(p){
    if(p.status==='done')return false;
    var a=p.current.slice().sort().join(',');
    var b=p.final.slice().sort().join(',');
    return a!==b;
  });
  var done=tagProposals.filter(function(p){return p.status==='done';}).length;
  var errs=tagProposals.filter(function(p){return p.status==='error';}).length;

  var ignoredTagCount=tagProposals.filter(function(p){return ignored[p.t.id]&&ignored[p.t.id].tag;}).length;
  var visibleProposals=tagProposals.filter(function(p){return tagShowIgnored||(!(ignored[p.t.id]&&ignored[p.t.id].tag));});
  var counts={series:0,movies:0,adult:0};
  visibleProposals.forEach(function(p){counts[p.cat]=(counts[p.cat]||0)+1;});

  var h='<div style="padding:14px 16px 8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
  ['series','movies','adult'].forEach(function(k){
    if(counts[k])h+='<span style="background:'+TC[k]+'22;color:'+TC[k]+';border:1px solid '+TC[k]+'44;border-radius:12px;padding:5px 14px;font-size:14px">'+k+' &bull; '+counts[k]+'</span>';
  });
  if(done)h+='<span style="color:#00e5a0;font-size:13px">&#x2713; '+done+' saved</span>';
  if(errs)h+='<span style="color:#ff6b6b;font-size:13px">&#x2717; '+errs+' errors</span>';
  h+='</div>';
  if(changed.length)h+='<div style="padding:0 16px 12px"><button class="btn-p" onclick="applyAllTags()">Apply Changes to '+changed.length+' Items</button></div>';

  visibleProposals.forEach(function(p){
    var title=edits[p.t.id]||p.t.name;
    var typeBadge='<span class="type-badge '+(p.t._type==='usenet'?'type-usenet':'type-torrent')+'">'+(p.t._type==='usenet'?'Usenet':'Torrent')+'</span>';
    var st=p.status;

    // build tag chips for final set — each removable
    var finalLower=p.final.map(function(x){return x.toLowerCase();});
    var chips=p.final.map(function(tg){
      var col=TC[tg.toLowerCase()]||'#888';
      var isNew=p.current.map(function(x){return x.toLowerCase();}).indexOf(tg.toLowerCase())<0;
      var badge=isNew?'<span style="font-size:10px;background:#00e5a030;color:#00e5a0;border-radius:4px;padding:1px 5px;margin-left:4px">+new</span>':'';
      return '<span style="display:inline-flex;align-items:center;background:'+col+'22;color:'+col
        +';border:1px solid '+col+'44;border-radius:10px;padding:4px 10px;font-size:13px;margin:2px;cursor:default">'
        +esc(tg)+badge
        +(st!=='done'?'<span onclick="toggleTagInFinal('+p.t.id+',\''+esc(tg)+'\')" style="margin-left:6px;cursor:pointer;opacity:.7;font-size:11px">&#x2715;</span>':'')
        +'</span>';
    }).join('');

    // show removed tags (in current but not in final)
    var removed=p.current.filter(function(tg){return finalLower.indexOf(tg.toLowerCase())<0;});
    var removedChips=removed.map(function(tg){
      var col=TC[tg.toLowerCase()]||'#888';
      return '<span style="display:inline-flex;align-items:center;background:#1a1a1a;color:#555'
        +';border:1px dashed #333;border-radius:10px;padding:4px 10px;font-size:13px;margin:2px;text-decoration:line-through">'
        +esc(tg)
        +(st!=='done'?'<span onclick="toggleTagInFinal('+p.t.id+',\''+esc(tg)+'\')" style="margin-left:6px;cursor:pointer;opacity:.7;font-size:11px">&#x21ba;</span>':'')
        +'</span>';
    }).join('');

    // quick-add buttons for standard tags not in final
    var addable=MANAGED.filter(function(m){return finalLower.indexOf(m)<0;});
    var addBtns=st==='done'?'':addable.map(function(m){
      return '<span onclick="toggleTagInFinal('+p.t.id+',\''+m+'\')" style="display:inline-flex;align-items:center;background:transparent;color:'+TC[m]
        +';border:1px dashed '+TC[m]+'66;border-radius:10px;padding:4px 10px;font-size:13px;margin:2px;cursor:pointer;opacity:.6">+ '+m+'</span>';
    }).join('');

    var hasDiff=p.current.slice().sort().join(',')!==p.final.slice().sort().join(',');

    h+='<div style="display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-top:1px solid #1a1a1a">'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-size:15px;color:#e8e8e8;word-break:break-word;line-height:1.4;margin-bottom:6px">'+typeBadge+esc(title)+'</div>'
      +'<div>'+chips+removedChips+addBtns+'</div>'
      +'</div>'
      +(st==='done'?'<span style="color:#00e5a0;font-size:20px;flex-shrink:0;margin-top:2px">&#x2713;</span>'
       :st==='error'?'<span style="color:#ff6b6b;font-size:20px;flex-shrink:0;margin-top:2px">&#x2717;</span>'
       :(ignored[p.t.id]&&ignored[p.t.id].tag)?'<button class="btn-g" style="width:auto;padding:8px 12px;font-size:12px;flex-shrink:0;color:#00e5a0;border-color:#00e5a040" onclick="unignoreTag('+p.t.id+')">&#x21ba; Un-ignore</button>'
       :hasDiff?('<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0"><button class="btn-del" style="background:#1a2030;color:#4488ff;border-color:#2a3a60" onclick="applyOneTag('+p.t.id+',\''+p.t._type+'\',this)">Apply</button><button class="btn-g" style="padding:7px 10px;font-size:12px" onclick="ignoreTag('+p.t.id+')">&#x2298; Ignore</button></div>')
       :'<span style="color:#333;font-size:12px;flex-shrink:0;margin-top:4px">no change</span>')
      +'</div>';
  });
  if(ignoredTagCount||tagShowIgnored){
    h+='<div style="padding:12px 16px;text-align:center"><button class="btn-g" style="width:auto;padding:10px 18px;font-size:13px" onclick="toggleTagShowIgnored()">'+(tagShowIgnored?'&#x25b2; Hide ignored':'&#x25bc; Show '+ignoredTagCount+' ignored item'+(ignoredTagCount!==1?'s':''))+'</button></div>';
  }
  el.innerHTML=h;
}

function applyOneTag(id,type,btn){
  var p=tagProposals.filter(function(x){return x.t.id===id;})[0];if(!p)return;
  if(btn){btn.disabled=true;btn.textContent='...';}
  fetch('/api/torbox/tag',{method:'POST',headers:{'Content-Type':'application/json','x-torbox-key':apiKey},body:JSON.stringify({item_id:id,type:type||p.t._type,tags:p.final})})
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.success){p.status='done';p.t.tags=p.final.slice();p.current=p.final.slice();}
    else{p.status='error';if(btn){btn.disabled=false;btn.textContent='Apply';}}
    renderTags();
  })
  .catch(function(){p.status='error';if(btn){btn.disabled=false;btn.textContent='Apply';}renderTags();});
}

function applyAllTags(){
  tagProposals.forEach(function(p){
    if(p.status==='done')return;
    if(ignored[p.t.id]&&ignored[p.t.id].tag)return;
    var a=p.current.slice().sort().join(',');
    var b=p.final.slice().sort().join(',');
    if(a!==b)applyOneTag(p.t.id,p.t._type,null);
  });
}

// ── INIT ──────────────────────────────────────────────────────
document.getElementById('conn-btn').addEventListener('click', doConnect);
document.getElementById('key-input').addEventListener('keydown',function(e){if(e.key==='Enter')doConnect();});

fetch('/api/torbox/config')
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.hasKey){
      serverHasKey=true;
      document.getElementById('key-input').placeholder='API key configured on server \u2713';
      doConnect();
    }
  })
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
          { usenet_download_id: item_id, usenet_id: item_id, name },
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
          { usenet_download_id: item_id, usenet_id: item_id, operation: 'delete' },
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
          { usenet_download_id: item_id, usenet_id: item_id, tags },
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

  // ── USER / QUOTA ─────────────────────────────────────────────
  fastify.get('/api/torbox/user', async (request, reply) => {
    const key = request.headers['x-torbox-key'] || process.env.TORBOX_API_KEY
    if (!key) return reply.status(401).send({ success: false, detail: 'No API key' })
    try {
      const res = await axios.get(`${TORBOX}/user/me`, {
        headers: { Authorization: `Bearer ${key}` }
      })
      return res.data
    } catch (e) {
      return reply.status(e.response?.status || 502).send({ success: false, detail: e.message })
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
