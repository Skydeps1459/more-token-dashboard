/**
 * Token Dashboard - 本地站点服务（零依赖，仅需要 Node 18+）
 *
 * 职责：
 *  1. 托管 token-dashboard.html，并注入「自动刷新 + 状态条 + 页面动效」
 *  2. 每 5 分钟调用内置生成器重新扫描本机日志、重建 HTML（原子替换）
 *  3. 提供 /api/status 与 /api/refresh
 *
 * 环境变量：
 *  PORT        监听端口，默认 8765
 *  REFRESH_MS  重建间隔毫秒，默认 300000（5 分钟），最小 1000
 *  PROJECTS    可选，传给生成器的日志目录（生成器也支持 --projects）
 *  ANIMATE     设为 0 可关闭页面动效；系统开启「减少动态效果」时也会自动关闭
 *  TITLE       页面标题，默认「More的Token 消耗看板」
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn, execFileSync } = require("child_process");

const ROOT = __dirname;
const HTML = path.join(ROOT, "token-dashboard.html");
const TMP = HTML + ".tmp";
const LOG = path.join(ROOT, "server.log");
const PID = path.join(ROOT, "server.pid");

// 优先用项目内置的生成器副本，找不到时回退到用户目录里的 skill
const LOCAL_CLI = path.join(ROOT, "tools", "cli.js");
const GLOBAL_CLI = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".workbuddy", "skills", "token-dashboard", "dist", "cli.js"
);
const CLI = fs.existsSync(LOCAL_CLI) ? LOCAL_CLI : GLOBAL_CLI;

const PORT = Number(process.env.PORT || 8765);
const REFRESH_MS = Math.max(1000, Number(process.env.REFRESH_MS || 300000));
const ANIMATE = process.env.ANIMATE !== "0";
const SITE_TITLE = process.env.TITLE || "More的Token 消耗看板";
const HOST = "127.0.0.1";

// 仓库地址：优先 REPO_URL，其次读取 git remote origin（5 分钟缓存，建仓后自动生效）
let repoCache = { at: 0, url: "" };
function normalizeRepoUrl(u) {
  const s = String(u || "").trim().replace(/\.git$/, "");
  if (/^git@github\.com:/.test(s)) return "https://github.com/" + s.slice("git@github.com:".length);
  return s;
}
function getRepoUrl() {
  if (process.env.REPO_URL) return normalizeRepoUrl(process.env.REPO_URL);
  if (Date.now() - repoCache.at < 300000) return repoCache.url;
  let url = "";
  try {
    url = normalizeRepoUrl(execFileSync("git", ["remote", "get-url", "origin"], {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
    }));
  } catch (_) { url = ""; }
  repoCache = { at: Date.now(), url };
  return url;
}

let nextRunAt = Date.now() + REFRESH_MS;
// 文件 mtime 是浮点数，统一取整，避免与前端注入的整数版本比较时误判为「数据已更新」
const initialGen = fs.existsSync(HTML) ? Math.round(fs.statSync(HTML).mtimeMs) : 0;
const state = {
  genMs: initialGen,
  updating: false,
  lastOk: initialGen,
  lastError: null,
  runs: 0,
  startedAt: Date.now()
};

function log(msg) {
  const line = "[" + new Date().toISOString() + "] " + msg;
  try { console.log(line); } catch (_) {}
  try { fs.appendFileSync(LOG, line + "\n", "utf8"); } catch (_) {}
  // 日志超过 1MB 时只保留尾部，避免长期运行无限增长
  try {
    if (fs.statSync(LOG).size > 1024 * 1024) {
      const tail = fs.readFileSync(LOG, "utf8").slice(-200 * 1024);
      fs.writeFileSync(LOG, tail, "utf8");
    }
  } catch (_) {}
}

function generate(reason) {
  if (state.updating) {
    log("skip rebuild (" + reason + "): previous run still in progress");
    return;
  }
  if (!fs.existsSync(CLI)) {
    state.lastError = "generator not found: " + CLI;
    log("rebuild FAILED: " + state.lastError);
    return;
  }
  state.updating = true;
  const started = Date.now();
  log("rebuild start (" + reason + ")");

  const args = [CLI, "--out", TMP];
  if (process.env.PROJECTS) args.push("--projects", process.env.PROJECTS);
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (d) => { stdout += d.toString(); });
  child.stderr.on("data", (d) => { stderr += d.toString(); });
  child.on("error", (e) => {
    state.updating = false;
    state.lastError = e.message;
    log("rebuild FAILED: " + e.message);
  });
  child.on("close", (code) => {
    state.updating = false;
    if (code !== 0 || !fs.existsSync(TMP)) {
      state.lastError = (stderr || stdout || "exit " + code).trim().slice(0, 500);
      log("rebuild FAILED (exit " + code + "): " + state.lastError.replace(/\n/g, " | "));
      try { fs.unlinkSync(TMP); } catch (_) {}
      return;
    }
    try {
      // 先写 .tmp 再替换，保证页面任何时刻读到的都是完整 HTML
      try { fs.renameSync(TMP, HTML); }
      catch (_) { fs.copyFileSync(TMP, HTML); try { fs.unlinkSync(TMP); } catch (_) {} }
      state.genMs = Date.now();
      state.lastOk = state.genMs;
      state.lastError = null;
      state.runs += 1;
      log("rebuild ok in " + (Date.now() - started) + "ms | " + stdout.trim().split("\n")[0]);
      // 让磁盘上的 HTML 也带新标题（离线双击打开时一致）
      try {
        fs.writeFileSync(HTML, applyBrandTitle(fs.readFileSync(HTML, "utf8")), "utf8");
      } catch (e) {
        log("brand title on file skipped: " + e.message);
      }
      if (stderr.trim()) log("generator warn: " + stderr.trim().replace(/\n/g, " | "));
    } catch (e) {
      state.lastError = e.message;
      log("rebuild FAILED while replacing html: " + e.message);
    }
  });
}

/** 注入到页面底部的状态条与自动刷新逻辑 */
function liveSnippet(gen, refresh, animate, repoUrl) {
  // 热力图逐行「扫描点亮」：用 10 条 nth-child 规则形成波浪，重建后自动生效
  const rowDelays = [];
  for (let k = 1; k <= 10; k++) {
    rowDelays.push('body.__anim #heatWrap .hrow:nth-child(10n+' + k + '){animation-delay:' +
      (0.06 + k * 0.05).toFixed(2) + 's}');
  }
  const GH_PATH = "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z";
  const ghIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="' + GH_PATH + '"/></svg>';
  const safeRepo = escapeHtml(repoUrl || "");
  const repoTag = safeRepo
    ? '<a id="__repoLink" href="' + safeRepo + '" target="_blank" rel="noopener noreferrer" title="打开 GitHub 仓库">' +
      ghIcon + '<span>GitHub 仓库</span><span class="__arw">&#8599;</span></a>'
    : '<span id="__repoLink" class="__pending" title="配置 REPO_URL 或完成 GitHub 建仓后自动变为可点击链接">' +
      ghIcon + '<span>仓库 · 待连接</span></span>';
  return [
    '<style>',
    /* ---- 状态条基础样式（无动画也保留）---- */
    '#__liveBar{position:fixed;right:16px;bottom:16px;z-index:99999;display:flex;align-items:center;gap:8px;',
    'padding:7px 12px 9px;border-radius:999px;border:1px solid var(--border,#e5e5e5);',
    'background:var(--card,#fff);color:var(--t2,#666);box-shadow:0 2px 12px rgba(0,0,0,.10);',
    'font:12px/1.4 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif;user-select:none;overflow:hidden}',
    '#__liveBar .__dot{width:7px;height:7px;border-radius:50%;background:#3fb27f;flex:none}',
    '#__liveBar.busy .__dot{background:#e0a33e}',
    '#__liveBar.err .__dot{background:#d64545}',
    '#__liveBar button{border:0;background:transparent;color:var(--blue,#5f8cb6);cursor:pointer;',
    'font:inherit;padding:0 0 0 4px;border-left:1px solid var(--border,#e5e5e5);margin-left:2px}',
    '#__liveBar button:hover{text-decoration:underline}',
    '#__liveTrack{position:absolute;left:0;right:0;bottom:0;height:2px;',
    'background:var(--border3,#eee);overflow:hidden}',
    '#__liveFill{display:block;height:100%;width:100%;',
    'background:linear-gradient(90deg,#5f8cb6,#a78bfa,#5eead4,#5f8cb6);transition:width 1s linear}',
    /* ---- 左下角仓库徽标基础样式 ---- */
    '#__repoLink{position:fixed;left:16px;bottom:16px;z-index:99999;display:flex;align-items:center;gap:7px;',
    'padding:7px 12px;border-radius:999px;text-decoration:none;',
    'border:1px solid var(--border,#e5e5e5);background:var(--card,#fff);color:var(--t2,#666);',
    'box-shadow:0 2px 12px rgba(0,0,0,.10);',
    'font:12px/1.4 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif;user-select:none}',
    '#__repoLink svg{width:14px;height:14px;fill:currentColor;flex:none}',
    '#__repoLink .__arw{opacity:.65;margin-left:1px}',
    'a#__repoLink:hover{color:var(--blue,#5f8cb6);border-color:rgba(111,168,254,.5)}',
    '#__repoLink.__pending{opacity:.62;border-style:dashed;cursor:default}',
    /* ---- 动效 ---- */
    '@keyframes __fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
    '@keyframes __slideIn{from{opacity:0;transform:translateY(16px) scale(.94)}to{opacity:1;transform:none}}',
    '@keyframes __pulse{0%,100%{box-shadow:0 0 0 0 rgba(63,178,127,.5)}50%{box-shadow:0 0 0 6px rgba(63,178,127,0)}}',
    '@keyframes __spin{to{transform:rotate(360deg)}}',
    '@keyframes __grad{to{background-position:250% 0}}',
    '@keyframes __drift1{to{transform:translate3d(16vw,10vh,0) scale(1.15)}}',
    '@keyframes __drift2{to{transform:translate3d(-14vw,14vh,0) scale(1.1)}}',
    '@keyframes __drift3{to{transform:translate3d(10vw,-12vh,0) scale(1.2)}}',
    '@keyframes __shine{from{left:-80%}to{left:150%}}',
    '@keyframes __rowWipe{from{opacity:.12;clip-path:inset(0 100% 0 0)}to{opacity:1;clip-path:inset(0 0 0 0)}}',
    '@keyframes __scanDown{0%{opacity:0;transform:translateY(-100%)}35%{opacity:1}100%{opacity:0;transform:translateY(100%)}}',
    /* 极光背景 + 细网格：内容层抬到 z-index 1，光斑从卡片间隙透出 */
    '#__aurora,#__scan{display:none}',
    'body.__anim #__aurora{display:block;position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}',
    '#__aurora i{position:absolute;display:block;border-radius:50%;filter:blur(78px);will-change:transform}',
    '#__aurora i:nth-child(1){width:52vw;height:52vw;left:-14vw;top:-22vw;',
    'background:radial-gradient(circle,#5f8cb6,transparent 68%);animation:__drift1 28s ease-in-out infinite alternate}',
    '#__aurora i:nth-child(2){width:44vw;height:44vw;right:-12vw;top:8vh;',
    'background:radial-gradient(circle,#a78bfa,transparent 68%);animation:__drift2 34s ease-in-out infinite alternate}',
    '#__aurora i:nth-child(3){width:46vw;height:46vw;left:24vw;bottom:-24vw;',
    'background:radial-gradient(circle,#5eead4,transparent 70%);animation:__drift3 30s ease-in-out infinite alternate}',
    'body.dark.__anim #__aurora i{opacity:.20}',
    'body.__anim:not(.dark) #__aurora i{opacity:.11}',
    '#__aurora::after{content:"";position:absolute;inset:0;',
    'background-image:linear-gradient(rgba(120,150,200,.05) 1px,transparent 1px),',
    'linear-gradient(90deg,rgba(120,150,200,.05) 1px,transparent 1px);background-size:46px 46px;',
    '-webkit-mask-image:radial-gradient(ellipse at 50% 0%,#000,transparent 78%);',
    'mask-image:radial-gradient(ellipse at 50% 0%,#000,transparent 78%)}',
    'body.__anim header,body.__anim .kpis,body.__anim .wrap{position:relative;z-index:1}',
    /* 标题渐变流光（深浅色各一套配色）*/
    '@supports ((-webkit-background-clip:text) or (background-clip:text)){',
    ' body.__anim h1{background-image:linear-gradient(90deg,#6ea8fe,#a78bfa,#5eead4,#6ea8fe);',
    ' background-size:250% 100%;-webkit-background-clip:text;background-clip:text;',
    ' color:transparent;animation:__grad 9s linear infinite}',
    ' body.__anim:not(.dark) h1{background-image:linear-gradient(90deg,#3f6b99,#7c5cbf,#1d8a7e,#3f6b99)}',
    '}',
    /* KPI 卡片扫光、悬浮抬升、数字发光 */
    '.kpi .v{font-variant-numeric:tabular-nums}',
    'body.__anim .kpi .v.__rolling{text-shadow:0 0 16px rgba(111,168,254,.55)}',
    'body.__anim #kpis .kpi{position:relative;overflow:hidden;',
    'transition:transform .25s,box-shadow .25s,border-color .25s}',
    'body.__anim #kpis .kpi:hover{transform:translateY(-3px);',
    'box-shadow:0 10px 26px rgba(80,120,190,.18);border-color:rgba(111,168,254,.5)}',
    'body.__anim #kpis .kpi::after{content:"";position:absolute;top:-60%;left:-80%;',
    'width:55%;height:220%;pointer-events:none;transform:rotate(18deg);',
    'background:linear-gradient(100deg,transparent,rgba(255,255,255,.30),transparent);',
    'animation:__shine 1.25s .4s ease-in-out both}',
    /* 卡片跟随鼠标的柔光 */
    'body.__anim .wrap .card{position:relative;transition:box-shadow .3s,border-color .3s}',
    'body.__anim .wrap .card::before{content:"";position:absolute;inset:0;border-radius:inherit;',
    'pointer-events:none;opacity:0;transition:opacity .35s;',
    'background:radial-gradient(300px circle at var(--cx,50%) var(--cy,50%),rgba(111,168,254,.13),transparent 72%)}',
    'body.__anim .wrap .card:hover::before{opacity:1}',
    'body.__anim .wrap .card:hover{border-color:rgba(111,168,254,.42)}',
    /* 热力图逐行扫描点亮（30 行，纯 CSS，重建后自动重播）*/
    'body.__anim #heatWrap .hrow{animation:__rowWipe .62s cubic-bezier(.2,.8,.2,1) both}',
    ...rowDelays,
    /* 状态条玻璃质感与发光 */
    'body.__anim #__liveBar{background:color-mix(in srgb,var(--card,#fff) 76%,transparent);',
    'backdrop-filter:blur(14px) saturate(1.3);',
    '-webkit-backdrop-filter:blur(14px) saturate(1.3);',
    'box-shadow:0 8px 30px rgba(0,0,0,.18),0 0 0 1px rgba(111,168,254,.28),inset 0 1px 0 rgba(255,255,255,.12)}',
    'body.__anim #__liveFill{background-size:200% 100%;animation:__grad 4s linear infinite;',
    'box-shadow:0 0 10px rgba(94,234,212,.55)}',
    'body.__anim #__repoLink{background:color-mix(in srgb,var(--card,#fff) 76%,transparent);',
    'backdrop-filter:blur(14px) saturate(1.3);-webkit-backdrop-filter:blur(14px) saturate(1.3);',
    'box-shadow:0 8px 30px rgba(0,0,0,.18),0 0 0 1px rgba(111,168,254,.20),inset 0 1px 0 rgba(255,255,255,.12);',
    'animation:__slideIn .5s .25s cubic-bezier(.22,.8,.24,1) both}',
    /* 数据更新时的全屏扫描线 */
    'body.__anim #__scan{display:block;position:fixed;inset:0;z-index:99998;',
    'pointer-events:none;opacity:0;',
    'background:linear-gradient(180deg,transparent 40%,rgba(94,234,212,.07) 47%,',
    'rgba(111,168,254,.24) 50%,transparent 60%)}',
    'body.__anim #__scan.go{animation:__scanDown .4s ease-in-out}',
    /* 图表错峰展开 */
    '@keyframes __chartIn{from{opacity:0;transform:translateY(10px) scaleY(.97)}to{opacity:1;transform:none}}',
    'body.__anim #mdSvg,body.__anim #rdSvg,body.__anim #dmSvg,body.__anim #panel{',
    'animation:__chartIn .7s .32s cubic-bezier(.22,.8,.24,1) both}',
    /* 兜底：CSS 动画若被浏览器暂停/跳过，1.8s 后强制恢复内容可见 */
    'body.__anim.__settled #heatWrap .hrow,body.__anim.__settled #mdSvg,',
    'body.__anim.__settled #__liveBar,body.__anim.__settled #__repoLink,',
    'body.__anim.__settled #rdSvg,body.__anim.__settled #dmSvg,body.__anim.__settled #panel{',
    'animation:none!important;opacity:1!important;clip-path:none!important;transform:none!important}',
    '.__enter{animation:__fadeUp .52s cubic-bezier(.22,.8,.24,1) both}',
    'body.__anim #__liveBar{animation:__slideIn .5s .15s cubic-bezier(.22,.8,.24,1) both}',
    'body.__anim #__liveBar .__dot{animation:__pulse 2.4s ease-in-out infinite}',
    'body.__anim #__liveBar.busy .__dot{width:11px;height:11px;background:transparent;',
    'border:2px solid var(--border2,#ddd);border-top-color:#e0a33e;animation:__spin .7s linear infinite}',
    'body.__anim #__liveBar.err .__dot{animation:none}',
    'body.__anim header,body.__anim .pill,body.__anim .chip,body.__anim .tbtn{',
    'transition:background-color .25s,color .25s,border-color .25s}',
    'body.__anim{transition:background-color .3s,color .3s}',
    'body.__leaving{opacity:0;transition:opacity .38s ease}',
    '@media (prefers-reduced-motion:reduce){',
    ' .__enter,body.__anim #__liveBar,body.__anim #__repoLink,body.__anim #__liveBar .__dot,body.__anim #__liveBar.busy .__dot,',
    ' body.__anim #kpis .kpi::after,body.__anim #heatWrap .hrow,body.__anim h1,',
    ' body.__anim #__liveFill,body.__anim #__scan.go,#__aurora i,',
    ' body.__anim #mdSvg,body.__anim #rdSvg,body.__anim #dmSvg,body.__anim #panel{animation:none!important;opacity:1!important}',
    ' body,#__liveFill,body.__anim .wrap .card::before,body.__anim #kpis .kpi{transition:none!important}',
    ' body.__anim #__aurora,body.__anim #__scan{display:none!important}',
    '}',
    /* ---- 移动端适配（注入层，重建不丢失）---- */
    '@media (max-width:980px){',
    ' body{padding:16px 12px 76px}',
    ' .wrap{grid-template-columns:minmax(0,1fr)}',
    ' .kpis{grid-template-columns:repeat(4,1fr)}',
    '}',
    '@media (max-width:640px){',
    ' body{padding:14px 10px 104px;overflow-x:hidden}',
    ' header{flex-direction:column;align-items:flex-start!important;gap:10px;margin-bottom:12px}',
    ' header > div:last-child{flex:1 1 auto!important;white-space:normal!important;',
    '  width:100%;display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
    ' h1{font-size:18px}',
    ' .sub{flex-wrap:wrap;white-space:normal;overflow-wrap:anywhere;font-size:10px;gap:6px}',
    ' .srcbar{width:100%;max-width:100%;min-width:0;overflow-x:auto;margin-bottom:10px}',
    ' .srcbar .row{width:100%;max-width:100%;min-width:0;box-sizing:border-box;',
    '  flex-wrap:wrap!important;gap:5px}',
    ' .srcbar .stab{flex:1 1 calc(50% - 6px);max-width:calc(50% - 6px);min-width:0;',
    '  font-size:10px;padding:4px 8px;min-height:30px}',
    ' .srcbar .hint{font-size:10px;white-space:normal;line-height:1.4;overflow-wrap:anywhere}',
    ' .pill{margin-left:0;padding:6px 10px;min-height:32px}',
    ' .datepick{min-height:32px;font-size:12px;max-width:112px}',
    ' .kpis{grid-template-columns:repeat(2,1fr);gap:8px}',
    ' #top5{grid-template-columns:repeat(2,1fr)!important;gap:6px}',
    ' .kpi{padding:10px 11px}',
    ' .kpis .kpi .v{font-size:17px}',
    ' .card{padding:12px 12px;margin-bottom:12px}',
    ' .sec-h{gap:8px}',
    ' .tools{flex-wrap:wrap;gap:5px}',
    ' .tools input,.tools select{max-width:130px;min-height:30px}',
    ' .chip{min-height:30px}',
    ' .band4{flex-wrap:wrap}',
    ' .panel-scroll,.heat-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}',
    ' .hrow,.hhead{min-width:560px}',
    ' #tip{max-width:calc(100vw - 24px);white-space:pre-wrap;word-break:break-word}',
    ' #__liveBar{right:10px;bottom:10px;padding:6px 9px 8px;font-size:11px;',
    '  max-width:calc(100vw - 20px)}',
    ' #__liveTxt{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    ' #__liveRefresh{flex:none;padding-left:6px}',
    ' #__repoLink{left:10px;bottom:54px;padding:6px 9px;font-size:11px}',
    '}',
    '@media (max-width:380px){',
    ' .kpis .kpi .v{font-size:15px}',
    ' .kpi{padding:9px 9px}',
    ' #__liveBar{font-size:10px}',
    '}',
    '</style>',
    '<div id="__aurora"><i></i><i></i><i></i></div><div id="__scan"></div>',
    repoTag,
    '<div id="__liveBar"><span class="__dot"></span><span id="__liveTxt"> connecting </span>',
    '<button id="__liveRefresh" title="立即重新扫描日志并生成看板">立即更新</button>',
    '<div id="__liveTrack"><i id="__liveFill"></i></div></div>',
    '<script>(function(){',
    'var gen=__GEN__, refresh=__REFRESH__, animate=__ANIM__,',
    '    bar=document.getElementById("__liveBar"), txt=document.getElementById("__liveTxt"),',
    '    fill=document.getElementById("__liveFill"), nextAt=Date.now()+refresh;',
    'var reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;',
    'var anim=animate&&!reduced;',
    'if(anim)document.body.classList.add("__anim");',
    'function two(n){return n<10?"0"+n:String(n)}',
    'function hhmm(ms){var d=new Date(ms);return two(d.getHours())+":"+two(d.getMinutes())+":"+two(d.getSeconds())}',
    'function left(ms){var s=Math.max(0,Math.round((ms-Date.now())/1000));return Math.floor(s/60)+":"+two(s%60)}',
    /* KPI 数字滚动：保留原有前缀/单位/小数位/千分位格式 */
    /* 真值缓存：重播时绝不把动画中间态当成真实数据 */
    'var truth=window.WeakMap?new WeakMap():null;',
    'function roll(el){',
    '  var raw=truth&&truth.has(el)?truth.get(el):el.textContent.trim();',
    '  if(truth)truth.set(el,raw);',
    '  var m=raw.match(/^([^0-9-]*)(-?[0-9,]+(?:[.][0-9]+)?)(.*)$/);',
    '  if(!m)return;',
    '  var pre=m[1],ns=m[2],suf=m[3],target=parseFloat(ns.replace(/,/g,""));',
    '  if(!isFinite(target)||target===0)return;',
    '  var dec=(ns.split(".")[1]||"").length,comma=ns.indexOf(",")>=0,t0=null,done=false;',
    '  function finish(){done=true;el.textContent=raw;el.classList.remove("__rolling")}',
    '  function frame(){',
    '    if(done)return;',
    '    var now=Date.now();if(t0===null)t0=now;',
    '    var p=Math.min(1,(now-t0)/850);',
    '    if(p>=1){finish();return}',
    '    var e=1-Math.pow(1-p,3),v=target*e;',
    '    var s=dec?v.toFixed(dec):String(Math.round(v));',
    '    if(comma){var a=s.split("."),x=a[0],o="",c=0;',
    '      for(var i=x.length-1;i>=0;i--){o=x[i]+o;if(++c%3===0&&i>0)o=","+o}',
    '      s=o+(a.length>1?"."+a[1]:"")}',
    '    el.textContent=pre+s+suf;',
    '    requestAnimationFrame(frame);',
    '  }',
    '  el.classList.add("__rolling");',
    /* 硬超时：无论 rAF 是否被暂停/加速，1s 后必然恢复真实值并停止写入 */
    '  setTimeout(finish,1000);',
    '  requestAnimationFrame(frame);',
    '}',
    'function rollAll(){',
    '  var els=document.querySelectorAll("#kpis .kpi .v, #top5 .kpi .v");',
    '  for(var i=0;i<els.length;i++)roll(els[i]);',
    '}',
    /* 卡片依次浮入，动画结束后移除 class 以免影响 hover 样式 */
    'function enter(){',
    '  var list=document.querySelectorAll("header, #kpis .kpi, .wrap .card"), i, el;',
    '  for(i=0;i<list.length;i++){',
    '    el=list[i];el.style.animationDelay=Math.min(i,12)*45+"ms";el.classList.add("__enter");',
    '  }',
    '  setTimeout(function(){',
    '    for(i=0;i<list.length;i++){list[i].classList.remove("__enter");list[i].style.animationDelay=""}',
    '  },1500);',
    '}',
    'if(anim){setTimeout(function(){enter();rollAll()},30);',
    '  setTimeout(function(){document.body.classList.add("__settled")},1800);',
    /* 切换时间窗口/主题后热力图重建：允许波浪重播，1.8s 后再次兜底 */
    '  var hw=document.getElementById("heatWrap");',
    '  if(hw&&window.MutationObserver){var rb=false;',
    '    new MutationObserver(function(){if(rb)return;rb=true;',
    '      setTimeout(function(){rb=false;document.body.classList.remove("__settled");',
    '        setTimeout(function(){document.body.classList.add("__settled")},1800)},30);',
    '    }).observe(hw,{childList:true});',
    '  }',
    /* 鼠标位置→卡片局部坐标，rAF 节流后写入 CSS 变量 */
    '  var raf=0,mx=0,my=0;',
    '  document.addEventListener("mousemove",function(e){mx=e.clientX;my=e.clientY;',
    '    if(raf)return;raf=requestAnimationFrame(function(){raf=0;',
    '      var cs=document.querySelectorAll(".wrap .card");',
    '      for(var j=0;j<cs.length;j++){var r=cs[j].getBoundingClientRect();',
    '        cs[j].style.setProperty("--cx",(mx-r.left)+"px");',
    '        cs[j].style.setProperty("--cy",(my-r.top)+"px")}',
    '    })},{passive:true});',
    '  var kpi=document.getElementById("kpis");',
    '  if(kpi&&window.MutationObserver){var busy=false;',
    '    new MutationObserver(function(){if(busy)return;busy=true;',
    '      setTimeout(function(){busy=false;rollAll()},60);',
    '    }).observe(kpi,{childList:true});',
    '  }',
    '}',
    'function softReload(){',
    '  if(anim){document.body.classList.add("__leaving");',
    '    var sc=document.getElementById("__scan");if(sc)sc.classList.add("go");',
    '    setTimeout(function(){document.body.classList.remove("__leaving")},1400);',
    '    setTimeout(function(){location.reload()},430)}',
    '  else location.reload();',
    '}',
    'function paint(s){',
    '  nextAt=s.nextAt||nextAt;',
    '  bar.className=s.lastError?"err":(s.updating?"busy":"");',
    '  txt.textContent=s.updating?"正在重建数据 · 数据 "+hhmm(s.genMs)',
    '    :(s.lastError?"上次更新失败 · 显示旧数据":"每 "+Math.round(refresh/60000)+" 分钟更新 · 数据 "+hhmm(s.genMs)+" · 下次 "+left(nextAt));',
    '}',
    'function progress(){',
    '  var pct=Math.max(0,Math.min(100,(nextAt-Date.now())/refresh*100));',
    '  fill.style.width=pct.toFixed(1)+"%";setTimeout(progress,1000);',
    '}',
    'function poll(){',
    '  fetch("/api/status",{cache:"no-store"}).then(function(r){return r.json()}).then(function(s){',
    '    if(gen&&s.genMs&&Math.round(s.genMs)!==gen){softReload();return}',
    '    gen=Math.round(s.genMs);paint(s);',
    '  }).catch(function(){txt.textContent="站点连接中断，重试中"})',
    '}',
    'setInterval(poll,15000);',
    'document.getElementById("__liveRefresh").onclick=function(){',
    '  bar.className="busy";txt.textContent="已触发重建…";',
    '  fetch("/api/refresh",{cache:"no-store"}).then(function(){setTimeout(poll,2000)}).catch(function(){});',
    '};',
    'setTimeout(softReload,refresh+20000);',
    'poll();progress();',
    '})();</script>'
  ].join("\n")
    .replace("__GEN__", String(Math.round(gen)))
    .replace("__REFRESH__", String(refresh))
    .replace("__ANIM__", animate ? "1" : "0");
}

/** HTML 转义，避免自定义标题里的特殊字符破坏页面 */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

/** 生成器每 5 分钟重写 HTML，标题统一在此替换（幂等），站点与磁盘文件都生效 */
function applyBrandTitle(html) {
  const t = escapeHtml(SITE_TITLE);
  let out = html
    .replace(/<title>[^<]*<\/title>/, () => "<title>" + t + "</title>")
    .replace(/(<h1[^>]*>)[^<]*(<\/h1>)/, (_m, open, close) => open + t + close);
  // 注入 favicon（幂等：已存在就不重复添加）
  if (out.indexOf('rel="icon"') < 0) {
    out = out.replace("</title>", '</title>\n<link rel="icon" type="image/svg+xml" href="favicon.svg">');
  }
  return out;
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function serveDashboard(res) {
  let html;
  try { html = fs.readFileSync(HTML, "utf8"); }
  catch (_) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Dashboard is being generated, please retry in a few seconds.\nSee server.log for details.");
    return;
  }
  const branded = applyBrandTitle(html);
  const snippet = liveSnippet(state.genMs, REFRESH_MS, ANIMATE, getRepoUrl());
  const out = branded.indexOf("</body>") >= 0
    ? branded.replace("</body>", snippet + "\n</body>")
    : branded + snippet;
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(out);
}

const STATIC_EXT = [".css", ".js", ".png", ".jpg", ".svg", ".ico", ".woff2", ".map"];

const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname); }
  catch (_) { pathname = "/"; }

  if (pathname === "/" || pathname === "/index.html" || pathname === "/token-dashboard.html") {
    serveDashboard(res);
    return;
  }
  if (pathname === "/api/status") {
    sendJson(res, 200, {
      genMs: state.genMs,
      updating: state.updating,
      lastOk: state.lastOk,
      lastError: state.lastError,
      runs: state.runs,
      refreshMs: REFRESH_MS,
      animate: ANIMATE,
      nextAt: nextRunAt,
      port: PORT,
      startedAt: state.startedAt
    });
    return;
  }
  if (pathname === "/api/refresh") {
    generate("manual");
    sendJson(res, 202, { accepted: true, updating: state.updating });
    return;
  }

  // 仅放行根目录下的少量静态资源；子目录（tools/ 等）、服务源码、
  // 日志、pid 文件、批处理脚本一律拒绝，避免内部文件被 HTTP 读到
  const rel = pathname.replace(/^\/+/, "");
  const isSubPath = /[\\/]/.test(rel);
  const isPrivate = /^(server\.js|start\.bat|stop\.bat|switch\.bat|server\.log|server\.pid|token-dashboard\.html\.tmp)$/i.test(rel);
  if (isSubPath || isPrivate || rel.startsWith(".") ||
      !STATIC_EXT.includes(path.extname(rel).toLowerCase())) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep)) {
    res.writeHead(403); res.end("403");
    return;
  }
  fs.readFile(abs, (err, data) => {
    if (err) { res.writeHead(404); res.end("404"); return; }
    const ext = path.extname(abs).toLowerCase();
    const type = { ".css": "text/css", ".js": "text/javascript", ".png": "image/png",
      ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon",
      ".woff2": "font/woff2", ".map": "application/json" }[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
    res.end(data);
  });
});

server.on("error", (e) => {
  log("server error: " + e.message);
  try { fs.unlinkSync(PID); } catch (_) {}
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  fs.writeFileSync(PID, String(process.pid), "ascii");
  log("listening on http://" + HOST + ":" + PORT + "/ | refresh every " +
      Math.round(REFRESH_MS / 1000) + "s | generator " + CLI);
  // 先让页面可访问，再后台重建一次保证数据最新
  setTimeout(() => generate("startup"), 400);
});

const timer = setInterval(() => {
  nextRunAt = Date.now() + REFRESH_MS;
  generate("scheduled");
}, REFRESH_MS);

function shutdown() {
  clearInterval(timer);
  try { fs.unlinkSync(PID); } catch (_) {}
  log("shutting down");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", () => { try { fs.unlinkSync(PID); } catch (_) {} });
