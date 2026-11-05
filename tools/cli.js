#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/cli.ts
var import_node_fs6 = __toESM(require("node:fs"));

// src/server/args.ts
var import_node_os = __toESM(require("node:os"));
var import_node_path = __toESM(require("node:path"));
var UsageError = class extends Error {
};
var DEFAULT_PROJECTS = import_node_path.default.join(import_node_os.default.homedir(), ".workbuddy", "projects");
var DEFAULT_PROJECTS_AI = import_node_path.default.join(import_node_os.default.homedir(), ".workbuddy-ai", "projects");
var DEFAULT_OUT = "token-dashboard.html";
var HELP = `usage: token-dashboard [-h] [--projects PROJECTS] [--projects-ai PROJECTS_AI] [--out OUT] [--title-mode {fixed,legacy}] [--no-claude] [--no-chatgpt] [--no-workbuddy-ai]

WorkBuddy Token 消耗看板生成器

options:
  -h, --help            show this help message and exit
  --projects PROJECTS   国内版 WorkBuddy 会话日志目录（默认 ${DEFAULT_PROJECTS}）
  --projects-ai DIR     国际版 WorkBuddy AI 会话日志目录（默认 ${DEFAULT_PROJECTS_AI}）
  --out OUT             输出 HTML 路径（默认当前目录 ${DEFAULT_OUT}）
  --title-mode {fixed,legacy}
                        会话标题提取策略；legacy 用于与旧版 Python 实现做回归对比
  --no-claude           跳过 Claude Code Desktop / CLI / Cowork
  --no-chatgpt          跳过 ChatGPT Work / Codex（~/.codex 会话转录）
  --no-workbuddy-ai     跳过国际版 WorkBuddy AI（~/.workbuddy-ai/projects）
`;
var TITLE_MODES = ["fixed", "legacy"];
function parseArgs(argv) {
  const options = {
    projects: DEFAULT_PROJECTS,
    projectsAi: DEFAULT_PROJECTS_AI,
    out: DEFAULT_OUT,
    titleMode: "fixed",
    noClaude: false,
    noChatGPT: false,
    noWorkBuddyAi: false
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") return { kind: "help" };
    const eq = arg.indexOf("=");
    const key = eq >= 0 ? arg.slice(0, eq) : arg;
    const inlineValue = eq >= 0 ? arg.slice(eq + 1) : null;
    const takeValue = () => {
      if (inlineValue !== null) return inlineValue;
      const next = argv[++i];
      if (next === void 0) throw new UsageError(`argument ${key}: expected one argument`);
      return next;
    };
    switch (key) {
      case "--projects":
        options.projects = takeValue();
        break;
      case "--projects-ai":
        options.projectsAi = takeValue();
        break;
      case "--out":
        options.out = takeValue();
        break;
      case "--title-mode": {
        const value = takeValue();
        if (!TITLE_MODES.includes(value)) {
          throw new UsageError(`argument --title-mode: invalid choice: '${value}' (choose from 'fixed', 'legacy')`);
        }
        options.titleMode = value;
        break;
      }
      case "--no-claude":
        if (inlineValue !== null) {
          throw new UsageError(`argument --no-claude: ignored explicit argument '${inlineValue}'`);
        }
        options.noClaude = true;
        break;
      case "--no-chatgpt":
        if (inlineValue !== null) {
          throw new UsageError(`argument --no-chatgpt: ignored explicit argument '${inlineValue}'`);
        }
        options.noChatGPT = true;
        break;
      case "--no-workbuddy-ai":
        if (inlineValue !== null) {
          throw new UsageError(`argument --no-workbuddy-ai: ignored explicit argument '${inlineValue}'`);
        }
        options.noWorkBuddyAi = true;
        break;
      default:
        throw new UsageError(`unrecognized arguments: ${arg}`);
    }
  }
  return { kind: "run", options };
}

// src/generated/assets.ts
var HTML_TEMPLATE = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">\r
<meta name="viewport" content="width=device-width,initial-scale=1">\r
<title>Token 消耗看板</title>\r
<style>\r
*{box-sizing:border-box;margin:0;padding:0}\r
:root{--bg:#fafaf9;--card:#fff;--border:#e8e5df;--border2:#e4e1da;--border3:#efede8;--t1:#1f2328;--t2:#6f6c64;--t3:#9a978f;--t4:#b5b2a9;--t5:#a3a099;--t6:#55524b;--wcnm:#374151;--tdc:#3d3b36;--row:#f2f0ea;--empty:#f4f2ed;--hover:#fbfaf7;--focus:#c9c6be;--sep:#d4d1c9;--selbg:#e9f0f7;--selfg:#3f6b99;--selbd:#aec9e0;--red:#d64545;--blue:#5f8cb6;--tipbg:#1f2328;--tiptc:#fff}\r
body.dark{--bg:#1c1b19;--card:#262521;--border:#3a3833;--border2:#3a3833;--border3:#35332e;--t1:#f0eee9;--t2:#b5b2a9;--t3:#8a877f;--t4:#6f6d66;--t5:#8a877f;--t6:#d5d2ca;--wcnm:#c5c2ba;--tdc:#c5c2ba;--row:#323029;--empty:#2e2c29;--hover:#2a2925;--focus:#55524b;--sep:#4a4842;--selbg:#2c3a47;--selfg:#a9c9e4;--selbd:#4a6a85;--red:#e06666;--blue:#8fb8d9;--tipbg:#f0eee9;--tiptc:#1c1b19;color-scheme:dark}\r
body{font-family:-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--t1);padding:22px 18px 60px;max-width:1600px;margin:0 auto}\r
.wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start}\r
.colL,.colR{min-width:0}\r
h1{font-size:20px;font-weight:700;letter-spacing:.3px}\r
.sub{font-size:11px;color:var(--t3);margin-top:3px;display:flex;align-items:center;gap:8px}\r
.tbtn{border:1px solid var(--border2);background:var(--card);color:var(--t2);font-size:11px;padding:1px 10px;border-radius:999px;cursor:pointer}\r
.tbtn:hover{border-color:var(--focus);color:var(--t1)}\r
header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px}\r
.pill{border:1px solid var(--border2);background:var(--card);color:var(--t2);font-size:12px;padding:5px 14px;border-radius:6px;cursor:pointer;margin-left:6px}\r
.pill.on{background:var(--selbg);color:var(--selfg);border-color:var(--selbd)}\r
.datepick{border:1px solid var(--border2);background:var(--card);color:var(--t2);font-size:12px;padding:4px 8px;border-radius:6px;outline:none;vertical-align:middle}\r
.datepick:focus{border-color:var(--focus)}\r
.card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px 18px;margin-bottom:14px}\r
.sec-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:6px}\r
.sec-h h2{font-size:14px;font-weight:400}\r
.kpis{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;margin-bottom:14px}\r
.kpi{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 15px;min-width:0}\r
.kpi .k{font-size:11px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\r
.kpi .v{font-size:20px;font-weight:700;color:var(--t1);margin-top:6px;white-space:nowrap}\r
.kpi .v small{font-size:12px;color:var(--t3);font-weight:600;margin-left:3px}\r
.t5{display:flex;align-items:center;justify-content:space-between;gap:6px;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:5px 9px;min-width:0;cursor:pointer;transition:background .15s,border-color .15s}\r
.t5:hover{border-color:var(--focus)}\r
.t5.on{background:var(--selbg);border-color:var(--selbd)}\r
.t5.on .k,.t5.on .v{color:var(--selfg)}\r
.t5 .k{font-size:9px;color:var(--t5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\r
.t5 .k i{width:6px;height:6px;margin-right:3px;vertical-align:0}\r
.t5 .v{font-size:11px;font-weight:600;color:var(--t6);white-space:nowrap;flex:none}\r
.heat-wrap{max-height:640px;overflow-y:auto;border:1px solid var(--border3);border-radius:8px;padding:6px 8px}\r
.hrow{display:flex;align-items:center;gap:2px;margin-bottom:-1px}\r
.hlab{width:42px;flex:none;font-size:10px;color:var(--t3)}\r
.hcell{flex:1;height:7.3px;border-radius:0;background:var(--empty);cursor:default}\r
.hhead{display:flex;gap:2px;margin:0 1px 4px;padding-left:8px;padding-right:8px}\r
.hhead span{flex:1;min-width:0;text-align:center;font-size:9px;color:var(--t4)}\r
.legend{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--t3)}\r
.legend i{width:14px;height:10px;border-radius:2px;display:inline-block}\r
.caption{font-size:11px;color:var(--t3);margin-bottom:6px}\r
.bandbar{display:flex;height:14px;border-radius:5px;overflow:hidden;margin:8px 0 10px}\r
.bandbar div{height:100%}\r
.bandrow{display:flex;justify-content:space-between;font-size:11px;color:var(--t2);margin-bottom:3px}\r
.tools{display:flex;gap:6px;align-items:center}\r
.tools input{border:1px solid var(--border2);border-radius:6px;padding:5px 10px;font-size:12px;width:110px;background:var(--card);color:var(--t1);outline:none}\r
.tools input:focus{border-color:var(--focus)}\r
.chip{border:1px solid var(--border2);background:var(--card);color:var(--t2);font-size:11px;padding:4px 10px;border-radius:6px;cursor:pointer}\r
.chip.on{background:var(--selbg);color:var(--selfg);border-color:var(--selbd)}\r
.crumb{font-size:12px;color:var(--t3);margin-bottom:10px;display:none;align-items:center;gap:10px}\r
.crumb a{color:var(--t2);text-decoration:none;cursor:pointer}\r
.crumb a:hover{color:var(--selfg)}\r
.crumb .cur{color:var(--selfg)}\r
.crumb .sep{margin:0 6px;color:var(--sep)}\r
.lrow{display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--row);cursor:pointer}\r
.lrow:hover{background:var(--hover)}\r
.lrow .nm{flex:1.4;min-width:0;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\r
.lrow .meta{flex:.8;font-size:11px;color:var(--t3);white-space:nowrap}\r
.lrow .bar{flex:1.2;height:7px;background:var(--empty);border-radius:4px;overflow:hidden}\r
.lrow .bar i{display:block;height:100%;border-radius:4px;background:var(--blue)}\r
.lrow .num{flex:.9;text-align:right;font-size:12px;font-weight:700;white-space:nowrap}\r
.lrow .num em{font-style:normal;color:var(--t4);font-weight:600;font-size:10px;margin-left:4px}\r
.empty{font-size:12px;color:var(--t3);padding:20px 0;text-align:center}\r
.subgrid{display:grid;grid-template-columns:minmax(0,1fr);gap:0}\r
.wcard{display:flex;align-items:center;gap:10px;padding:3px 2px;border-bottom:1px solid var(--row);cursor:pointer;background:transparent;min-width:0}\r
.wcard:hover{background:var(--hover)}\r
.wc-nm{flex:none;width:16%;min-width:0;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--wcnm)}\r
.wc-tt{flex:none;width:72px;text-align:right;font-size:13px;font-weight:400;color:var(--t1);white-space:nowrap}\r
.wc-meta{flex:none;width:88px;text-align:right;font-size:10px;color:var(--t3);white-space:nowrap}\r
.wviz{flex:1.5;display:flex;gap:1px;min-width:0;overflow:hidden}\r
.wcell{flex:1 1 0;min-width:0;height:10.4px;border-radius:0;background:var(--empty)}\r
.panel-scroll{max-height:290px;overflow-y:auto;border:1px solid var(--border3);border-radius:8px;padding:2px 10px}\r
.wsn{flex:none;font-size:10px;border:1px solid var(--border2);border-radius:5px;padding:1px 3px;background:var(--card);color:var(--t2);outline:none}\r
.band4{display:flex;gap:6px;margin-bottom:12px}\r
.b4{flex:1;display:flex;justify-content:space-between;align-items:baseline;gap:6px;border:1px solid var(--border3);border-radius:6px;padding:5px 9px;background:var(--card);min-width:0}\r
.b4k{font-size:10px;color:var(--t3);white-space:nowrap}\r
.b4v{font-size:12.5px;font-weight:700;color:var(--t1);white-space:nowrap}\r
.kpi .s{font-size:10px;color:var(--t4);margin-top:2px;white-space:nowrap}\r
.view-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}\r
.view-t{font-size:13px;font-weight:700}\r
.view-m{font-size:11px;color:var(--t3)}\r
svg text{font-family:inherit}\r
table.rt{width:100%;border-collapse:collapse;font-size:11px}\r
table.rt th{position:sticky;top:0;background:var(--card);text-align:right;color:var(--t3);font-weight:600;padding:5px 6px;border-bottom:1px solid var(--border)}\r
table.rt th:first-child,table.rt td:first-child{text-align:left}\r
table.rt td{text-align:right;padding:4px 6px;border-bottom:1px solid var(--row);color:var(--tdc);white-space:nowrap}\r
.rt-wrap{max-height:320px;overflow:auto;border:1px solid var(--border3);border-radius:8px}\r
#tip{position:fixed;background:var(--tipbg);color:var(--tiptc);padding:7px 10px;border-radius:7px;font-size:11px;pointer-events:none;opacity:0;transition:opacity .08s;white-space:pre;z-index:99;line-height:1.55}\r
</style></head><body>\r
\r
<header style="align-items:flex-end">\r
  <div>\r
    <h1>Token 消耗看板</h1><div class="sub"><span id="genAt"></span><button class="tbtn" id="themeBtn" type="button">深色</button></div>\r
  </div>\r
  <div style="flex:none;white-space:nowrap">\r
    <button class="pill" data-w="1">1 天</button><button class="pill" data-w="3">3 天</button><button class="pill" data-w="7">近 7 天</button><button class="pill on" data-w="30">近 30 天</button><input type="date" id="dStart" class="datepick" title="起始日期"><span style="color:var(--t4);font-size:11px;margin:0 2px">至</span><input type="date" id="dEnd" class="datepick" title="结束日期">\r
  </div>\r
</header>\r
\r
<section class="kpis" id="kpis"></section>\r
\r
<div class="wrap"><div class="colL">\r
\r
<section class="card">\r
  <div class="sec-h"><h2>工作空间活跃分布</h2>\r
    <div class="tools" id="wsTools"><button class="chip" data-m="ses">按会话</button><button class="chip on" data-m="ws">按工作空间</button><input id="wsSearch" placeholder="搜索…"><span id="wsSorts" style="display:none"><button class="chip on" data-s="tt">按 Token</button><button class="chip" data-s="n">按会话数</button></span><select id="wsMult" class="wsn" title="可视化倍率：方块总数=窗口天数×倍率"><option value="1">1X</option><option value="2">2X</option><option value="3" selected>3X</option><option value="4">4X</option><option value="5">5X</option></select></div>\r
  </div>\r
  <div class="crumb" id="crumb"></div>\r
  <div class="panel-scroll"><div id="panel"></div></div>\r
</section>\r
\r
<section class="card">\r
  <div class="sec-h"><h2>单次请求大小分布</h2><span class="caption" style="margin:0" id="mdCap"></span></div>\r
  <svg id="mdSvg" width="100%" height="240"></svg>\r
  <div style="font-size:10px;color:var(--t3);margin-top:6px">每模型一条分布形状（各自归一）· 竖线=该模型 50% · 灰点=90% · 虚线=全局 50% · 数值下条形=两列共享刻度的大小对比（深=50% 浅=90%）</div>\r
</section>\r
</div>\r
\r
<div class="colR">\r
<section class="card" id="heatCard">\r
  <div class="sec-h"><h2>日活分布</h2><div class="legend" id="heatLegend"></div></div>\r
  <div class="band4" id="band4"></div>\r
  <div class="hhead" id="hhead"></div>\r
  <div class="heat-wrap" id="heatWrap"></div>\r
</section>\r
\r
<section class="card">\r
  <div class="sec-h"><h2>0–24 时分布 · 按模型</h2><div class="legend" id="rdLegend" style="flex-wrap:wrap;justify-content:flex-end"></div></div>\r
  <svg id="rdSvg" width="100%" height="112"></svg>\r
</section>\r
\r
<section class="card">\r
  <div class="sec-h"><h2>每日模型用量比例</h2></div>\r
  <svg id="dmSvg" width="100%" height="102"></svg>\r
  <div style="font-size:10px;color:var(--t3);margin-top:4px">x=日期（最新在右）· y=当日 Token · 颜色=模型 · 点击下方模型卡片高亮单模型</div>\r
  <section class="kpis" id="top5" style="margin:12px 0 0;gap:6px;grid-template-columns:repeat(5,1fr)"></section>\r
</section>\r
</div></div>\r
\r
<div id="tip"></div>\r
\r
<script>const D=__DATA__;</script>\r
<script>\r
(() => {
  // src/client/palette.ts
  var MODEL_COLORS_LIGHT = ["#4e7fbc", "#c8894a", "#59a5a0", "#b05a5a", "#8172b3", "#7a9a4e", "#c98ba6", "#9aa8bd"];
  var MODEL_COLORS_DARK = ["#7aa5d4", "#d8a76b", "#6cc0ba", "#d48080", "#a798cf", "#9dba6e", "#d8a3b8", "#aab6c8"];
  var RAMP_LIGHT = ["#f4f2ed", "#e8eef5", "#cfddeb", "#aec9e0", "#88abd0", "#5f8cb6", "#3f6b99", "#2b4f73"];
  var RAMP_DARK = ["#2e2c29", "#33404d", "#3a4f61", "#42607a", "#4b6f8f", "#5682a6", "#6b9abf", "#8fb8d9"];
  var CHART_LIGHT = {
    grid: "#f0ede7",
    axis: "#b5b2a9",
    axis2: "#c9c6be",
    blue: "#5f8cb6",
    dash: "#c9c6be",
    base: "#d4d1c9",
    dim: "#c9c6be",
    dimBar: "#e4e1da",
    other: "#8C8C8C",
    red: "#d64545",
    muted: "#9a978f",
    t1: "#1f2328"
  };
  var CHART_DARK = {
    grid: "#323029",
    axis: "#6f6d66",
    axis2: "#6f6d66",
    blue: "#8fb8d9",
    dash: "#55524b",
    base: "#4a4842",
    dim: "#55524b",
    dimBar: "#3a3833",
    other: "#7d8b96",
    red: "#e06666",
    muted: "#8a877f",
    t1: "#f0eee9"
  };

  // src/client/store.ts
  var DATA = D;
  function isChatGPTSource(id) {
    return id === "chatgpt-codex" || id === "chatgpt-work";
  }
  function inFamilyTab(info, tab) {
    if (tab === "all") return true;
    if (tab === "claude") return info.claude;
    if (tab === "chatgpt") return isChatGPTSource(info.id);
    return !info.claude && !isChatGPTSource(info.id);
  }
  function matchSourceFilter(info, tab, sub) {
    if (tab === "all") return true;
    if (!inFamilyTab(info, tab)) return false;
    if (tab === "claude") return sub === "claude-all" || info.id === sub;
    if (tab === "chatgpt") return sub === "chatgpt-all" || info.id === sub;
    return sub === "workbuddy-all" || info.id === sub;
  }
  var prefersDark = () => {
    try {
      return localStorage.getItem("td-dark") === "1";
    } catch {
      return false;
    }
  };
  var dark0 = prefersDark();
  var S = {
    dark: dark0,
    srcTab: "all",
    srcSub: "workbuddy-all",
    colors: dark0 ? CHART_DARK : CHART_LIGHT,
    modelColors: dark0 ? MODEL_COLORS_DARK : MODEL_COLORS_LIGHT,
    ramp: dark0 ? RAMP_DARK : RAMP_LIGHT,
    win: 30,
    customStart: 0,
    customEnd: 0,
    wsSort: "tt",
    query: "",
    wsMode: "ws",
    wsMult: 3,
    drill: { ws: null, ses: null },
    selModel: null,
    hrSel: null,
    lastAggregate: null,
    panelCtx: null
  };
  function setDark(dark) {
    S.dark = dark;
    S.colors = dark ? CHART_DARK : CHART_LIGHT;
    S.modelColors = dark ? MODEL_COLORS_DARK : MODEL_COLORS_LIGHT;
    S.ramp = dark ? RAMP_DARK : RAMP_LIGHT;
    try {
      localStorage.setItem("td-dark", dark ? "1" : "0");
    } catch {
    }
  }
  function modelColor(index) {
    const n = S.modelColors.length;
    return S.modelColors[(index % n + n) % n];
  }
  function rankColor(mTot) {
    const order = DATA.models.map((_m, i) => i).sort((a, b) => (mTot[b] ?? 0) - (mTot[a] ?? 0));
    const map = {};
    order.forEach((mi, r) => {
      map[mi] = modelColor(r);
    });
    return map;
  }
  var HAS_SOURCES = Array.isArray(DATA.sources) && DATA.sources.length > 0;
  function visibleSessions() {
    if (!HAS_SOURCES || S.srcTab === "all") return DATA.sess;
    return DATA.sess.filter((s) => {
      const info = DATA.sources[s.s ?? 0];
      if (!info) return false;
      return matchSourceFilter(info, S.srcTab, S.srcSub);
    });
  }

  // src/client/dom.ts
  function must(selector) {
    const el = document.querySelector(selector);
    if (!el) throw new Error(\`看板 DOM 结构缺失：\${selector}\`);
    return el;
  }
  function maybe(selector) {
    return document.querySelector(selector);
  }
  function all(selector) {
    return Array.from(document.querySelectorAll(selector));
  }
  function toggleOn(elements, active, className = "on") {
    for (const el of elements) el.classList.toggle(className, el === active);
  }

  // src/client/format.ts
  function fmt(n) {
    if (n >= 1e8) return (n / 1e8).toFixed(2) + " 亿";
    if (n >= 1e4) return (n / 1e4).toFixed(1) + " 万";
    return String(Math.round(n));
  }
  function nf(n) {
    return n.toLocaleString("en-US");
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function hm(minute) {
    return new Date(minute * 6e4);
  }
  function fdate(d) {
    const p = (x) => String(x).padStart(2, "0");
    return d.getMonth() + 1 + "-" + p(d.getDate());
  }
  function ftime(d) {
    const p = (x) => String(x).padStart(2, "0");
    return p(d.getHours()) + ":" + p(d.getMinutes());
  }

  // src/client/pricing.ts
  var PRICE = {
    "deepseek-v4-flash": [1, 4, 0.2],
    "deepseek-v4-pro": [2, 8, 0.5],
    deepseek: [2, 8, 0.5],
    "glm-5.3": [2, 8, 0.4],
    "glm-5.2-x": [1.2, 6, 0.24],
    "glm-5.2": [0.8, 3.2, 0.16],
    glm: [1, 4, 0.2],
    kimi: [1.5, 6, 0.3],
    "claude-opus-5": [150, 750, 15],
    "claude-opus-4-8": [110, 550, 11],
    claude: [110, 550, 11],
    // ChatGPT / Codex：模型名前缀匹配，具体型号排在通用型号之前。
    // 数值为粗略牌价，ChatGPT 订阅套餐（Plus / Pro / Business）通常不额外按 token 计费，
    // 这里给的是「按 API 计价」的等效参考，便于跨来源比较 token 消耗；可自行调整。
    "gpt-5.6-luna": [25, 125, 10],
    "gpt-5.6-terra": [15, 75, 5],
    "gpt-5.6": [10, 50, 3],
    "gpt-5.5-sol": [4, 20, 1],
    "gpt-5.5-codex": [10, 50, 3],
    "gpt-5.5": [6, 30, 2],
    "gpt-5.2": [6, 30, 2],
    "gpt-5.1-codex": [10, 50, 3],
    "gpt-5.1": [6, 30, 2],
    "gpt-5-codex": [10, 50, 3],
    "gpt-5": [6, 30, 2],
    "gpt-4.5": [3, 15, 1],
    "gpt-4.1": [3, 15, 1],
    "gpt-4o": [1.5, 8, 0.5],
    "gpt-4-mini": [0.5, 2, 0.2],
    "gpt-4": [1.5, 8, 0.5],
    gpt: [4, 20, 1],
    qwen: [2.4, 9.6, 0.48],
    hy3: [4, 16, 0.8],
    hy: [4, 16, 0.8],
    minimax: [1, 5, 0.2],
    m3: [1, 5, 0.2]
  };
  var DEFAULT_PRICE = [2, 8, 0.4];
  function priceOf(name) {
    const n = (name || "").toLowerCase();
    for (const key of Object.keys(PRICE)) {
      if (n.startsWith(key)) return PRICE[key];
    }
    return DEFAULT_PRICE;
  }
  var cached = null;
  function modelPrices() {
    if (cached === null) cached = DATA.models.map((m) => priceOf(m));
    return cached;
  }

  // src/client/range.ts
  var MS_PER_DAY = 864e5;
  var MS_PER_MINUTE = 6e4;
  function cut() {
    if (S.win) return DATA.genMs - S.win * MS_PER_DAY;
    return S.customStart ? S.customStart * MS_PER_MINUTE : 0;
  }
  function cutHi() {
    return !S.win && S.customEnd ? S.customEnd * MS_PER_MINUTE : Infinity;
  }

  // src/client/aggregate.ts
  var MS_PER_MINUTE2 = 6e4;
  function aggregate() {
    const lo = cut();
    const hi = cutHi();
    const MP = modelPrices();
    const daily = {};
    const ws = {};
    const band = [0, 0, 0, 0];
    const mTot = new Array(DATA.models.length).fill(0);
    const dm = {};
    let tot = 0;
    let inp = 0;
    let out = 0;
    let ch = 0;
    let turns = 0;
    let nsess = 0;
    let cost = 0;
    const sessAgg = [];
    for (const s of visibleSessions()) {
      let sessTotal = 0;
      let sessTurns = 0;
      for (const r of s.r) {
        const ts = r[0] * MS_PER_MINUTE2;
        if (ts < lo || ts >= hi) continue;
        const d = hm(r[0]);
        const dk = fdate(d);
        const h = d.getHours();
        let bucket = daily[dk];
        if (!bucket) {
          bucket = { h: new Array(24).fill(0), hh: new Array(72).fill(0), tt: 0 };
          daily[dk] = bucket;
        }
        bucket.h[h] += r[2];
        bucket.tt += r[2];
        bucket.hh[h * 3 + Math.floor(d.getMinutes() / 20)] += r[2];
        mTot[r[1]] += r[2];
        let dayModels = dm[dk];
        if (!dayModels) {
          dayModels = {};
          dm[dk] = dayModels;
        }
        dayModels[r[1]] = (dayModels[r[1]] ?? 0) + r[2];
        const wn = s.w;
        let wb = ws[wn];
        if (!wb) {
          wb = { tt: 0, n: 0 };
          ws[wn] = wb;
        }
        wb.tt += r[2];
        band[Math.floor(h / 6)] += r[2];
        tot += r[2];
        inp += r[3];
        out += r[4];
        ch += r[5];
        turns++;
        sessTurns++;
        sessTotal += r[2];
        const pp = MP[r[1]];
        const cacheHit = Math.max(0, Math.min(r[5], r[3]));
        const cacheWrite = Math.max(0, Math.min(r[6] || 0, r[3] - cacheHit));
        cost += (cacheHit * pp[2] + cacheWrite * 1.25 * pp[0] + (r[3] - cacheHit - cacheWrite) * pp[0] + r[4] * pp[1]) / 1e6;
      }
      if (sessTurns) {
        nsess++;
        let wb = ws[s.w];
        if (!wb) {
          wb = { tt: 0, n: 0 };
          ws[s.w] = wb;
        }
        wb.n += 1;
        sessAgg.push({ s, tt: sessTotal, tn: sessTurns });
      }
    }
    const wsArr = DATA.ws.map((nm, i) => ({ i, n: nm, tt: (ws[i] ?? { tt: 0 }).tt, cnt: (ws[i] ?? { n: 0 }).n })).filter((x) => x.tt > 0);
    return { daily, wsArr, band, tot, inp, out, ch, turns, nsess, sessAgg, mTot, dm, cost };
  }

  // src/client/daily-model.ts
  var H = 102;
  var PAD_L = 44;
  var PAD_R = 8;
  var PAD_T = 8;
  var PAD_B = 18;
  var STACK_TOP = 8;
  var CARD_COUNT = 10;
  function topModelIndexes(A, n) {
    return DATA.models.map((_m, i) => i).filter((i) => A.mTot[i] > 0).sort((a, b) => A.mTot[b] - A.mTot[a]).slice(0, n);
  }
  function renderDailyModel(A) {
    const svg = must("#dmSvg");
    const top = topModelIndexes(A, STACK_TOP);
    const dates = Object.keys(A.dm).sort();
    const maxDaily = Math.max(...dates.map((d) => Object.values(A.dm[d]).reduce((a, b) => a + b, 0)), 1);
    const W = svg.clientWidth || 800;
    const n = dates.length || 1;
    const pitch = (W - PAD_L - PAD_R) / n;
    const barW = Math.max(2, pitch * 0.62);
    const segments = top.concat(S.selModel !== null && S.selModel !== -1 && !top.includes(S.selModel) ? [S.selModel] : []);
    const colorOf = rankColor(A.mTot);
    const colorFor = (mi) => mi === -1 ? S.colors.other : colorOf[mi];
    let grid = "";
    let bars = "";
    let xLabels = "";
    for (let i = 1; i < 8; i++) {
      const y = PAD_T + (H - PAD_T - PAD_B) * i / 8;
      grid += '<line x1="' + PAD_L + '" y1="' + y + '" x2="' + (W - PAD_R) + '" y2="' + y + '" stroke="' + S.colors.grid + '" stroke-width="0.5"/>';
    }
    dates.forEach((d, i) => {
      const dayModels = A.dm[d];
      const dayTotal = Object.values(dayModels).reduce((a, b) => a + b, 0);
      let cum = 0;
      for (const mi of segments) {
        const v = dayModels[mi] ?? 0;
        if (!v) continue;
        const bh = v / maxDaily * (H - PAD_T - PAD_B);
        const x = PAD_L + pitch * i + (pitch - barW) / 2;
        const y = H - PAD_B - cum - bh;
        const dimmed = S.selModel !== null && S.selModel !== mi;
        bars += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + Math.max(0.5, bh).toFixed(1) + '" fill="' + (dimmed ? S.colors.dimBar : colorFor(mi)) + '" fill-opacity="' + (dimmed ? "0.5" : "0.85") + '"/>';
        cum += bh;
      }
      const dayList = segments.map((mi) => ({ mi, v: dayModels[mi] ?? 0 })).filter((o) => o.v > 0).sort((a, b) => b.v - a.v);
      const dayTip = d + " · 合计 " + nf(dayTotal) + "\\n" + dayList.map((o) => "· " + (o.mi === -1 ? "其他" : esc(DATA.models[o.mi])) + "  " + nf(o.v) + "（" + (dayTotal ? (o.v / dayTotal * 100).toFixed(1) : 0) + "%）").join("\\n");
      bars += '<rect x="' + (PAD_L + pitch * i).toFixed(1) + '" y="' + PAD_T + '" width="' + pitch.toFixed(1) + '" height="' + (H - PAD_T - PAD_B) + '" fill="#fff" fill-opacity="0" pointer-events="all" data-tip="' + dayTip + '"/>';
      const step = Math.ceil(n / 7);
      if (i % step === 0 || i === n - 1) {
        xLabels += '<text x="' + (PAD_L + pitch * i + pitch / 2) + '" y="' + (H - 4) + '" font-size="9" fill="' + S.colors.axis + '" text-anchor="middle">' + d + "</text>";
      }
    });
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("height", String(H));
    svg.innerHTML = grid + bars + xLabels + '<text x="' + (PAD_L - 5) + '" y="' + (PAD_T + 7) + '" font-size="9" fill="' + S.colors.axis + '" text-anchor="end">' + fmt(maxDaily) + '</text><text x="' + (PAD_L - 5) + '" y="' + (H - PAD_B) + '" font-size="9" fill="' + S.colors.axis + '" text-anchor="end">0</text>';
  }
  function renderModelCards(A) {
    const order = topModelIndexes(A, CARD_COUNT);
    const colorOf = rankColor(A.mTot);
    const card = (mi) => '<div class="t5' + (S.selModel === mi ? " on" : "") + '" data-dm="' + mi + '"><div class="k"><i style="display:inline-block;border-radius:2px;background:' + colorOf[mi] + '"></i>' + esc(DATA.models[mi]) + '</div><div class="v">' + fmt(A.mTot[mi]) + "</div></div>";
    must("#top5").innerHTML = order.map(card).join("");
  }

  // src/client/smooth-line.ts
  function smoothLine(pts) {
    const n = pts.length;
    if (n < 3) return "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L");
    const dx = [];
    const m = [];
    const t = new Array(n);
    for (let i = 0; i < n - 1; i++) dx.push(pts[i + 1][0] - pts[i][0]);
    for (let i = 0; i < n - 1; i++) m.push((pts[i + 1][1] - pts[i][1]) / dx[i]);
    t[0] = m[0];
    t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) {
      t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    }
    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) {
        t[i] = 0;
        t[i + 1] = 0;
        continue;
      }
      const a = t[i] / m[i];
      const b = t[i + 1] / m[i];
      const s = a * a + b * b;
      if (s > 9) {
        const f = 3 / Math.sqrt(s);
        t[i] = f * a * m[i];
        t[i + 1] = f * b * m[i];
      }
    }
    let d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
    for (let i = 0; i < n - 1; i++) {
      const h = dx[i];
      d += " C" + (pts[i][0] + h / 3).toFixed(1) + " " + (pts[i][1] + t[i] * h / 3).toFixed(1) + " " + (pts[i + 1][0] - h / 3).toFixed(1) + " " + (pts[i + 1][1] - t[i + 1] * h / 3).toFixed(1) + " " + pts[i + 1][0].toFixed(1) + " " + pts[i + 1][1].toFixed(1);
    }
    return d;
  }

  // src/client/ridge.ts
  var MS_PER_MINUTE3 = 6e4;
  var H2 = 112;
  var PAD_L2 = 44;
  var PAD_R2 = 8;
  var PAD_T2 = 8;
  var PAD_B2 = 18;
  var LEGEND_MAX = 8;
  function hourModelUsage() {
    const lo = cut();
    const hi = cutHi();
    const byHour = Array.from({ length: 24 }, () => ({}));
    for (const s of visibleSessions()) {
      for (const r of s.r) {
        const ts = r[0] * MS_PER_MINUTE3;
        if (ts < lo || ts >= hi) continue;
        const h = hm(r[0]).getHours();
        const bucket = byHour[h];
        bucket[r[1]] = (bucket[r[1]] ?? 0) + r[2];
      }
    }
    return byHour;
  }
  function renderRidge(A) {
    const svg = must("#rdSvg");
    const byHour = hourModelUsage();
    const W = svg.clientWidth || 800;
    const plotH = H2 - PAD_T2 - PAD_B2;
    const base = PAD_T2 + plotH;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H2);
    svg.setAttribute("height", String(H2));
    const pitch = (W - PAD_L2 - PAD_R2) / 24;
    const series = {};
    for (let h = 0; h < 24; h++) {
      for (const key of Object.keys(byHour[h])) {
        const mi = Number(key);
        let arr = series[mi];
        if (!arr) {
          arr = new Array(24).fill(0);
          series[mi] = arr;
        }
        arr[h] = byHour[h][mi];
      }
    }
    let vmax = 0;
    let vmin = Infinity;
    for (const key of Object.keys(series)) {
      for (const v of series[Number(key)]) {
        if (v > 0) {
          if (v > vmax) vmax = v;
          if (v < vmin) vmin = v;
        }
      }
    }
    if (!vmax) {
      svg.innerHTML = '<text x="' + PAD_L2 + '" y="40" font-size="12" fill="' + S.colors.muted + '">该时间范围内无数据</text>';
      must("#rdLegend").innerHTML = "";
      return;
    }
    const lo = Math.log10(vmin);
    const hi = Math.log10(vmax);
    const span = Math.max(1e-9, hi - lo);
    const yOf = (v) => PAD_T2 + plotH * (1 - (Math.log10(v) - lo) / span);
    let yTicks = "";
    for (let k = Math.ceil(lo); k <= Math.floor(hi); k++) {
      const y = yOf(Math.pow(10, k)).toFixed(1);
      yTicks += '<line x1="' + PAD_L2 + '" y1="' + y + '" x2="' + (W - PAD_R2) + '" y2="' + y + '" stroke="' + S.colors.grid + '" stroke-width="0.5"/><text x="' + (PAD_L2 - 5) + '" y="' + (+y + 3).toFixed(1) + '" font-size="8.5" fill="' + S.colors.axis2 + '" text-anchor="end">' + fmt(Math.pow(10, k)) + "</text>";
    }
    const order = Object.keys(series).map(Number).sort((a, b) => {
      const ta = series[a].reduce((x, y) => x + y, 0);
      const tb = series[b].reduce((x, y) => x + y, 0);
      return ta - tb;
    });
    const colorOf = rankColor(A.mTot);
    let defs = "";
    let curves = "";
    for (const mi of order) {
      const arr = series[mi];
      const dimmed = S.hrSel !== null && S.hrSel !== mi;
      const col = dimmed ? S.colors.dim : colorOf[mi];
      const runs = [];
      let current = [];
      for (let h = 0; h < 24; h++) {
        const v = arr[h];
        if (v) {
          current.push([PAD_L2 + pitch * (h + 0.5), yOf(v)]);
        } else if (current.length) {
          runs.push(current);
          current = [];
        }
      }
      if (current.length) runs.push(current);
      const total = arr.reduce((x, y) => x + y, 0);
      let peak = 0;
      for (let h = 1; h < 24; h++) if (arr[h] > arr[peak]) peak = h;
      const tip = esc(DATA.models[mi]) + "\\n窗口合计 " + fmt(total) + " token\\n时段峰值 " + peak + " 时 · " + fmt(arr[peak]);
      defs += '<linearGradient id="rg' + mi + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + col + '" stop-opacity="0.30"/><stop offset="100%" stop-color="' + col + '" stop-opacity="0.02"/></linearGradient>';
      let body = "";
      let hitPath = "";
      for (const run of runs) {
        let pts;
        if (run.length === 1) {
          const x = run[0][0];
          pts = [
            [Math.max(PAD_L2, x - pitch * 0.5), base],
            run[0],
            [Math.min(W - PAD_R2, x + pitch * 0.5), base]
          ];
        } else {
          pts = [
            [Math.max(PAD_L2, run[0][0] - pitch * 0.6), base],
            ...run,
            [Math.min(W - PAD_R2, run[run.length - 1][0] + pitch * 0.6), base]
          ];
        }
        const line = smoothLine(pts);
        hitPath += (hitPath ? " " : "") + line;
        const area = line + " L" + pts[pts.length - 1][0].toFixed(1) + " " + base + " L" + pts[0][0].toFixed(1) + " " + base + " Z";
        body += '<path d="' + area + '" fill="url(#rg' + mi + ')"/><path d="' + line + '" fill="none" stroke="' + col + '" stroke-width="0.8" stroke-opacity="0.95" pointer-events="none"/>';
      }
      const hit = hitPath ? '<path d="' + hitPath + '" fill="none" stroke="rgba(0,0,0,0)" stroke-width="8" pointer-events="stroke" data-tip="' + tip + '"/>' : "";
      curves += '<g opacity="' + (dimmed ? 0.22 : 1) + '">' + body + hit + "</g>";
    }
    let xTicks = "";
    for (let h = 0; h < 24; h += 2) xTicks += '<text x="' + (PAD_L2 + pitch * (h + 0.5)) + '" y="' + (H2 - 6) + '" font-size="9" fill="' + S.colors.axis + '" text-anchor="middle">' + h + "时</text>";
    const legendIdx = DATA.models.map((_m, i) => i).filter((i) => A.mTot[i] > 0).sort((a, b) => A.mTot[b] - A.mTot[a]).slice(0, LEGEND_MAX);
    const legendColor = rankColor(A.mTot);
    must("#rdLegend").innerHTML = legendIdx.map(
      (mi) => '<span data-hrm="' + mi + '" style="cursor:pointer;' + (S.hrSel !== null && S.hrSel !== mi ? "opacity:.4" : "") + '"><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + legendColor[mi] + ';margin-right:4px"></i>' + esc(DATA.models[mi]) + "</span>"
    ).join("");
    svg.innerHTML = "<defs>" + defs + "</defs>" + yTicks + curves + xTicks + '<line x1="' + PAD_L2 + '" y1="' + base + '" x2="' + (W - PAD_R2) + '" y2="' + base + '" stroke="' + S.colors.base + '"/>';
  }

  // src/client/heat.ts
  var CELLS_PER_HOUR = 3;
  var CELLS_PER_DAY = 24 * CELLS_PER_HOUR;
  var LEVELS = 7;
  function heatLevel(v, denominator) {
    if (v === 0) return 0;
    return Math.min(LEVELS, Math.max(1, 1 + Math.floor(Math.log(v / denominator / 1e-3) / Math.log(350) * LEVELS)));
  }
  function renderHeat(A) {
    const dates = Object.keys(A.daily).sort().reverse();
    must("#hhead").innerHTML = '<span style="width:42px;flex:none"></span>' + Array.from({ length: CELLS_PER_DAY }, (_v, i) => '<span style="text-align:left">' + (i % CELLS_PER_HOUR === 0 ? i / CELLS_PER_HOUR : "") + "</span>").join("");
    const avg = A.tot / (dates.length || 1);
    const wrap = must("#heatWrap");
    let html = "";
    for (const d of dates) {
      const day = A.daily[d];
      html += '<div class="hrow"><div class="hlab">' + d + "</div>";
      for (let i = 0; i < CELLS_PER_DAY; i++) {
        const v = day.hh[i] ?? 0;
        const h0 = Math.floor(i / CELLS_PER_HOUR);
        const m0 = i % CELLS_PER_HOUR * 20;
        const m1 = m0 + 20;
        const pad = (x) => String(x).padStart(2, "0");
        const endHour = m1 === 60 ? h0 + 1 : h0;
        const endMin = m1 === 60 ? "00" : pad(m1);
        const share = day.tt ? (v / day.tt * 100).toFixed(1) : 0;
        const tip = d + " " + h0 + ":" + pad(m0) + "–" + endHour + ":" + endMin + "\\n" + nf(v) + " token（占当日 " + share + "%）";
        html += '<div class="hcell" style="background:' + S.ramp[heatLevel(v, avg)] + '" data-tip="' + tip.replace(/\\n/g, "&#10;") + '"></div>';
      }
      html += "</div>";
    }
    wrap.innerHTML = html || '<div class="empty">该时间范围内无数据</div>';
    let legend = "<span>低</span>";
    for (let i = 1; i <= LEVELS; i++) legend += '<i style="background:' + S.ramp[i] + '"></i>';
    legend += "<span>高</span>";
    must("#heatLegend").innerHTML = legend;
  }
  function renderBand(A) {
    const names = ["凌晨 0-6", "上午 6-12", "下午 12-18", "晚间 18-24"];
    const total = A.band.reduce((a, b) => a + b, 0) || 1;
    must("#band4").innerHTML = A.band.map((v, i) => '<div class="b4"><div class="b4k">' + names[i] + '</div><div class="b4v">' + (v / total * 100).toFixed(1) + "%</div></div>").join("");
  }

  // src/client/panel.ts
  var MS_PER_MINUTE4 = 6e4;
  var HOURS_PER_DAY = 24;
  var sessionHeat = /* @__PURE__ */ new Map();
  function inPanel(selector) {
    const el = must("#panel").querySelector(selector);
    if (!el) throw new Error(\`面板 DOM 结构缺失：\${selector}\`);
    return el;
  }
  function occupancyCells(arr, avgD, prefix) {
    let html = "";
    for (let k = 0; k < S.wsMult; k++) {
      const a = Math.floor(HOURS_PER_DAY * k / S.wsMult);
      const b = Math.floor(HOURS_PER_DAY * (k + 1) / S.wsMult);
      let v = 0;
      for (let h = a; h < b; h++) v += arr[h] ?? 0;
      html += '<div class="wcell" style="background:' + S.ramp[heatLevel(v, avgD)] + '" title="' + prefix + " " + a + ":00–" + b + ":00 · " + fmt(v) + ' token"></div>';
    }
    return html;
  }
  function vizCells(m) {
    const ctx = S.panelCtx;
    const days = ctx ? ctx.days : [];
    const avgD = ctx ? ctx.avgD : 1;
    let html = "";
    for (const dk of days) {
      const arr = (m ? m[dk] : void 0) ?? new Array(HOURS_PER_DAY).fill(0);
      html += occupancyCells(arr, avgD, dk);
    }
    return html;
  }
  function buildViz(w) {
    const ctx = S.panelCtx ?? { whd: {}, days: [], avgD: 1 };
    const byDay = ctx.whd[w] ?? {};
    let html = "";
    for (const dk of ctx.days) {
      const arr = byDay[dk] ?? new Array(HOURS_PER_DAY).fill(0);
      html += occupancyCells(arr, ctx.avgD, dk);
    }
    return html || '<div class="wcell"></div>';
  }
  function renderCrumb() {
    const crumb = must("#crumb");
    if (S.drill.ws === null) {
      crumb.style.display = "none";
      return;
    }
    const wsName = DATA.ws[S.drill.ws] ?? "";
    let back;
    let path;
    if (S.drill.ses !== null) {
      back = '<button class="chip on" data-a="up">← 返回</button>';
      path = '<a data-a="root">' + esc(wsName) + '</a><span class="sep">›</span><span class="cur">' + esc(S.drill.ses.t) + "</span>";
    } else {
      back = '<button class="chip on" data-a="root">← 返回列表</button>';
      path = '<span class="cur">' + esc(wsName) + "</span>";
    }
    crumb.innerHTML = back + '<span class="path">' + path + "</span>";
    crumb.style.display = "flex";
  }
  function renderPanel(A) {
    const panel = must("#panel");
    const tools = must("#wsTools");
    const lo = cut();
    const hi = cutHi();
    const whd = {};
    const daySet = {};
    sessionHeat = /* @__PURE__ */ new Map();
    for (const s of visibleSessions()) {
      let sm = null;
      for (const r of s.r) {
        const ts = r[0] * MS_PER_MINUTE4;
        if (ts < lo || ts >= hi) continue;
        const d = hm(r[0]);
        const dk = fdate(d);
        const hour = d.getHours();
        daySet[dk] = 1;
        let byDay = whd[s.w];
        if (!byDay) {
          byDay = {};
          whd[s.w] = byDay;
        }
        let wsArr = byDay[dk];
        if (!wsArr) {
          wsArr = new Array(HOURS_PER_DAY).fill(0);
          byDay[dk] = wsArr;
        }
        wsArr[hour] += r[2];
        if (!sm) {
          sm = {};
          sessionHeat.set(s, sm);
        }
        let sesArr = sm[dk];
        if (!sesArr) {
          sesArr = new Array(HOURS_PER_DAY).fill(0);
          sm[dk] = sesArr;
        }
        sesArr[hour] += r[2];
      }
    }
    S.panelCtx = { whd, days: Object.keys(daySet).sort(), avgD: A.tot / (Object.keys(A.daily).length || 1) };
    if (S.drill.ws === null) {
      tools.style.display = "flex";
      if (S.wsMode === "ws") {
        must("#wsSorts").style.display = "flex";
        const rows2 = A.wsArr.filter((x) => !S.query || x.n.toLowerCase().includes(S.query));
        if (S.wsSort === "tt") rows2.sort((a, b) => b.tt - a.tt);
        else rows2.sort((a, b) => b.cnt - a.cnt);
        if (!rows2.length) {
          panel.innerHTML = '<div class="empty">无匹配的工作空间</div>';
          return;
        }
        panel.innerHTML = '<div class="subgrid">' + rows2.map(
          (x) => '<div class="wcard" data-ws="' + x.i + '"><div class="wc-nm" title="' + esc(x.n) + '">' + esc(x.n) + '</div><div class="wc-tt">' + fmt(x.tt) + '</div><div class="wc-meta">' + (x.tt / A.tot * 100).toFixed(1) + "% · " + x.cnt + ' 会话</div><div class="wviz">' + buildViz(x.i) + "</div></div>"
        ).join("") + "</div>";
        return;
      }
      must("#wsSorts").style.display = "none";
      const rows = A.sessAgg.filter((x) => !S.query || (x.s.t || "").toLowerCase().includes(S.query)).sort((a, b) => b.tt - a.tt);
      if (!rows.length) {
        panel.innerHTML = '<div class="empty">无匹配的会话</div>';
        return;
      }
      panel.innerHTML = '<div class="subgrid">' + rows.map((x) => {
        const idx = DATA.sess.indexOf(x.s);
        const title = esc(x.s.t || "");
        return '<div class="wcard" data-si="' + idx + '"><div class="wc-nm" title="' + title + '">' + title + '</div><div class="wc-tt">' + fmt(x.tt) + '</div><div class="wc-meta">' + (x.tt / A.tot * 100).toFixed(1) + "% · " + x.tn + ' 轮</div><div class="wviz">' + vizCells(sessionHeat.get(x.s)) + "</div></div>";
      }).join("") + "</div>";
      return;
    }
    if (S.drill.ses === null) {
      tools.style.display = "none";
      const rows = A.sessAgg.filter((x) => x.s.w === S.drill.ws).sort((a, b) => b.tt - a.tt);
      const wsTotal = rows.reduce((a, x) => a + x.tt, 0);
      if (!rows.length) {
        panel.innerHTML = '<div class="empty">该窗口内此工作空间无数据</div>';
        return;
      }
      panel.innerHTML = rows.map((x) => {
        const idx = DATA.sess.indexOf(x.s);
        const title = esc(x.s.t || "");
        return '<div class="wcard" data-ses="' + idx + '"><div class="wc-nm" title="' + title + '">' + title + '</div><div class="wc-tt">' + fmt(x.tt) + '</div><div class="wc-meta">' + (wsTotal ? (x.tt / wsTotal * 100).toFixed(1) : 0) + "% · " + x.tn + ' 轮</div><div class="wviz">' + vizCells(sessionHeat.get(x.s)) + "</div></div>";
      }).join("");
      return;
    }
    tools.style.display = "none";
    const ses = S.drill.ses;
    const reqs = ses.r.filter((r) => {
      const ts = r[0] * MS_PER_MINUTE4;
      return ts >= lo && ts < hi;
    }).sort((a, b) => a[0] - b[0]);
    if (!reqs.length) {
      panel.innerHTML = '<div class="view-h"><div><div class="view-t">' + esc(ses.t) + '</div><div class="view-m">该时间范围内无请求</div></div></div>';
      return;
    }
    const total = reqs.reduce((a, r) => a + r[2], 0);
    const t0 = reqs[0][0];
    const t1 = reqs[reqs.length - 1][0];
    panel.innerHTML = '<div class="view-h"><div><div class="view-t">' + esc(ses.t) + '</div><div class="view-m">' + fdate(hm(t0)) + " " + ftime(hm(t0)) + " → " + fdate(hm(t1)) + " " + ftime(hm(t1)) + " · " + reqs.length + " 次请求 · 合计 " + fmt(total) + '</div></div><div><button class="chip on" data-v="sc">散点</button> <button class="chip" data-v="tb">明细表</button></div></div><div id="reqView"></div>';
    drawScatter(reqs);
    const setView = (v) => {
      for (const btn of Array.from(panel.querySelectorAll("[data-v]"))) {
        btn.classList.toggle("on", btn.dataset["v"] === v);
      }
    };
    inPanel('[data-v="sc"]').onclick = () => {
      drawScatter(reqs);
      setView("sc");
    };
    inPanel('[data-v="tb"]').onclick = () => {
      drawTable(reqs);
      setView("tb");
    };
  }
  function drawScatter(reqs) {
    const el = must("#reqView");
    const ranked = S.lastAggregate ? rankColor(S.lastAggregate.mTot) : null;
    const colorFor = (mi) => ranked ? ranked[mi] : modelColor(mi);
    const W = el.clientWidth || 560;
    const H3 = 240;
    const pL = 42;
    const pR = 12;
    const pT = 12;
    const pB = 26;
    const t0 = reqs[0][0];
    const t1 = reqs[reqs.length - 1][0];
    const span = Math.max(1, t1 - t0);
    const mx = Math.max(...reqs.map((r) => r[2]), 1);
    const xOf = (v) => pL + (W - pL - pR) * (v - t0) / span;
    const yOf = (v) => pT + (H3 - pT - pB) * (1 - Math.log(v + 1) / Math.log(mx + 1));
    let grid = "";
    for (let i = 0; i < 4; i++) {
      const y = pT + (H3 - pT - pB) * i / 3;
      grid += '<line x1="' + pL + '" y1="' + y + '" x2="' + (W - pR) + '" y2="' + y + '" stroke="' + S.colors.grid + '"/>';
    }
    let points = "";
    for (const r of reqs) {
      const d = hm(r[0]);
      const tip = fdate(d) + " " + ftime(d) + ":" + String(d.getSeconds()).padStart(2, "0") + "\\n" + esc(DATA.models[r[1]]) + "\\n输入 " + nf(r[3]) + " · 输出 " + nf(r[4]) + "\\n缓存 " + nf(r[5]) + " · 合计 " + nf(r[2]);
      points += '<circle cx="' + xOf(r[0]).toFixed(1) + '" cy="' + yOf(r[2]).toFixed(1) + '" r="3.2" fill="' + colorFor(r[1]) + '" fill-opacity=".82" data-tip="' + tip.replace(/\\n/g, "&#10;") + '"/>';
    }
    const axisLabels = '<text x="' + pL + '" y="' + (pT + 8) + '" font-size="9" fill="' + S.colors.axis + '">' + fmt(mx) + '</text><text x="' + pL + '" y="' + (H3 - pB) + '" font-size="9" fill="' + S.colors.axis + '">1</text>';
    const d0 = hm(t0);
    const d1 = hm(t1);
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H3 + '" width="100%"><g>' + grid + points + axisLabels + '<text x="' + pL + '" y="' + (H3 - 6) + '" font-size="9" fill="' + S.colors.axis + '">' + fdate(d0) + " " + ftime(d0) + '</text><text x="' + (W - pR) + '" y="' + (H3 - 6) + '" font-size="9" fill="' + S.colors.axis + '" text-anchor="end">' + fdate(d1) + " " + ftime(d1) + '</text><text x="' + (pL - 8) + '" y="' + H3 / 2 + '" font-size="9" fill="' + S.colors.axis + '" text-anchor="end" transform="rotate(-90 ' + (pL - 8) + " " + H3 / 2 + ')">token（对数轴）</text></g></svg><div style="margin-top:6px;font-size:10px;color:var(--t3)">x=时间 · y=单次请求 token（对数） · 颜色=模型：<span style="color:#9a978f">' + modelLegend(reqs) + "</span></div>";
  }
  function modelLegend(reqs) {
    const seen = {};
    for (const r of reqs) seen[r[1]] = 1;
    const ranked = S.lastAggregate ? rankColor(S.lastAggregate.mTot) : null;
    return Object.keys(seen).map((k) => {
      const mi = Number(k);
      return '<span style="color:' + (ranked ? ranked[mi] : modelColor(mi)) + '">●</span>' + esc(DATA.models[mi]);
    }).join("　");
  }
  function drawTable(reqs) {
    const el = must("#reqView");
    let rows = "";
    for (const r of reqs.slice().reverse()) {
      const d = hm(r[0]);
      const tip = "输入 " + nf(r[3]) + " · 输出 " + nf(r[4]) + " · 缓存 " + nf(r[5]) + " · 合计 " + nf(r[2]);
      rows += '<tr data-tip="' + tip + '"><td>' + fdate(d) + " " + ftime(d) + '</td><td style="text-align:left">' + esc(DATA.models[r[1]]) + "</td><td>" + nf(r[3]) + "</td><td>" + nf(r[4]) + "</td><td>" + nf(r[5]) + "</td><td>" + nf(r[2]) + "</td></tr>";
    }
    el.innerHTML = '<div class="rt-wrap"><table class="rt"><thead><tr><th>时间</th><th style="text-align:left">模型</th><th>输入</th><th>输出</th><th>缓存命中</th><th>合计</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
  }

  // src/client/kpis.ts
  function renderKpis(A) {
    const days = Object.keys(A.daily).length || 1;
    const hitRate = A.inp ? A.ch / A.inp * 100 : 0;
    const money = A.cost >= 1e4 ? "¥" + (A.cost / 1e4).toFixed(1) + " 万" : "¥" + A.cost.toFixed(1);
    const cards = [
      ["合计 Token", fmt(A.tot)],
      ["日均（有数据天）", fmt(A.tot / days)],
      ["会话", nf(A.nsess)],
      ["轮次", nf(A.turns)],
      ["输入 / 输出比", (A.out ? Math.round(A.inp / A.out) : 0) + ":1"],
      ["缓存命中率", hitRate.toFixed(1) + "%"],
      ["预估金额", money]
    ];
    must("#kpis").innerHTML = cards.map((x) => '<div class="kpi"><div class="k">' + x[0] + '</div><div class="v">' + x[1] + "</div></div>").join("");
  }

  // src/client/model-dist.ts
  var MS_PER_MINUTE5 = 6e4;
  var MAX_ROWS = 8;
  var BUCKETS = 36;
  var TICK_STEP = 1e5;
  function renderModelDist() {
    const svg = must("#mdSvg");
    const W = svg.clientWidth || 300;
    const lo = cut();
    const hi = cutHi();
    const byModel = {};
    for (const s of visibleSessions()) {
      for (const r of s.r) {
        const ts = r[0] * MS_PER_MINUTE5;
        if (ts < lo || ts >= hi) continue;
        let arr = byModel[r[1]];
        if (!arr) {
          arr = [];
          byModel[r[1]] = arr;
        }
        arr.push(r[2]);
      }
    }
    const rowModels = Object.keys(byModel).map(Number).sort((a, b) => byModel[b].length - byModel[a].length).slice(0, MAX_ROWS);
    if (!rowModels.length) {
      svg.setAttribute("viewBox", "0 0 " + W + " 60");
      svg.setAttribute("height", "60");
      svg.innerHTML = '<text x="16" y="30" font-size="11" fill="' + S.colors.muted + '">该时间范围内无数据</text>';
      must("#mdCap").textContent = "";
      return;
    }
    const rows = rowModels.map((m) => {
      const sorted = byModel[m].slice().sort((x, y) => x - y);
      const n = sorted.length;
      const percentiles = (q) => sorted[Math.min(n - 1, Math.ceil(q * n) - 1)];
      return { m, n, p50: percentiles(0.5), p90: percentiles(0.9) };
    });
    const all2 = [];
    for (const m of rowModels) all2.push(...byModel[m]);
    const allSorted = all2.slice().sort((a, b) => a - b);
    const globalPct = (q) => allSorted[Math.min(allSorted.length - 1, Math.ceil(q * allSorted.length) - 1)];
    const globalP50 = globalPct(0.5);
    const cap = Math.max(1e5, Math.ceil(globalPct(0.995) * 1.06 / 5e4) * 5e4);
    const nameW = Math.min(118, Math.max(...rowModels.map((m) => DATA.models[m].length)) * 6.1 + 6);
    const cntX = nameW + 8;
    const x50 = cntX + 48;
    const x90 = x50 + 56;
    const lw = x90 + 76;
    const barW = 52;
    const xOf = (v) => lw + (W - lw - 6) * Math.min(1, v / cap);
    const pScale = Math.max(rows.reduce((a, r) => Math.max(a, r.p90), 0), 1);
    const rowH = 44;
    const shapeH = 24;
    const padT = 14;
    const axisY = padT + rows.length * rowH + 2;
    const counts = rows.map(() => new Array(BUCKETS).fill(0));
    for (let ri = 0; ri < rows.length; ri++) {
      for (const v of byModel[rows[ri].m]) {
        const i = Math.min(BUCKETS - 1, Math.floor(v / cap * BUCKETS));
        counts[ri][i]++;
      }
    }
    const ranked = S.lastAggregate ? rankColor(S.lastAggregate.mTot) : null;
    let out = '<line x1="' + xOf(globalP50).toFixed(1) + '" y1="' + (padT - 6) + '" x2="' + xOf(globalP50).toFixed(1) + '" y2="' + axisY + '" stroke="' + S.colors.dash + '" stroke-width="0.8" stroke-dasharray="3 2"/><text x="' + (xOf(globalP50) + 3).toFixed(1) + '" y="' + (padT - 1) + '" font-size="9" fill="' + S.colors.axis + '">全局 50% ' + fmt(globalP50) + '</text><text x="0" y="' + (padT - 1) + '" font-size="13" fill="' + S.colors.axis + '">模型</text><text x="' + cntX + '" y="' + (padT - 1) + '" font-size="13" fill="' + S.colors.axis + '">次数</text><text x="' + x50 + '" y="' + (padT - 1) + '" font-size="13" fill="' + S.colors.axis + '">50%</text><text x="' + x90 + '" y="' + (padT - 1) + '" font-size="13" fill="' + S.colors.axis + '">90%</text>';
    rows.forEach((row, ri) => {
      const col = ranked ? ranked[row.m] : modelColor(row.m);
      const baseY = padT + ri * rowH + 24;
      const raw = counts[ri];
      const smooth = raw.map((v, i) => ((raw[i - 1] ?? 0) + 2 * v + (raw[i + 1] ?? 0)) / 4);
      const mx = Math.max(...smooth, 1e-9);
      let d = "M" + lw.toFixed(1) + " " + baseY;
      for (let i = 0; i < BUCKETS; i++) {
        const x = lw + (W - lw - 6) * (i + 0.5) / BUCKETS;
        d += " L" + x.toFixed(1) + " " + (baseY - smooth[i] / mx * shapeH).toFixed(1);
      }
      d += " L" + (W - 6).toFixed(1) + " " + baseY + " Z";
      const tip = esc(DATA.models[row.m]) + "&#10;" + nf(row.n) + " 次 · 50% " + fmt(row.p50) + " · 90% " + fmt(row.p90);
      const barWid = (v) => Math.max(1.2, v / pScale * barW).toFixed(1);
      out += '<path d="' + d + '" fill="' + col + '" fill-opacity="0.3" stroke="' + col + '" stroke-width="0.8" data-tip="' + tip + '"/><line x1="' + xOf(row.p50).toFixed(1) + '" y1="' + (baseY - shapeH - 1) + '" x2="' + xOf(row.p50).toFixed(1) + '" y2="' + baseY + '" stroke="' + col + '" stroke-width="1.6" data-tip="' + tip + '"/><circle cx="' + xOf(row.p90).toFixed(1) + '" cy="' + (baseY - 4) + '" r="2" fill="' + S.colors.axis + '" data-tip="' + tip + '"/><text x="0" y="' + (baseY - 5.5) + '" font-size="11" fill="' + S.colors.t1 + '">' + esc(DATA.models[row.m]) + '</text><text x="' + cntX + '" y="' + (baseY - 5.5) + '" font-size="11" fill="' + S.colors.t1 + '">' + nf(row.n) + '</text><text x="' + x50 + '" y="' + (baseY - 9) + '" font-size="12" fill="' + S.colors.t1 + '">' + fmt(row.p50) + '</text><rect x="' + x50 + '" y="' + (baseY - 5) + '" width="' + barW + '" height="5" fill="' + S.colors.dimBar + '" fill-opacity="0.7" data-tip="' + tip + '"/><rect x="' + x50 + '" y="' + (baseY - 5) + '" width="' + barWid(row.p50) + '" height="5" fill="' + col + '" fill-opacity="0.9" data-tip="' + tip + '"/><text x="' + x90 + '" y="' + (baseY - 9) + '" font-size="12" fill="' + S.colors.t1 + '">' + fmt(row.p90) + '</text><rect x="' + x90 + '" y="' + (baseY - 5) + '" width="' + barW + '" height="5" fill="' + S.colors.dimBar + '" fill-opacity="0.7" data-tip="' + tip + '"/><rect x="' + x90 + '" y="' + (baseY - 5) + '" width="' + barWid(row.p90) + '" height="5" fill="' + col + '" fill-opacity="0.45" data-tip="' + tip + '"/>';
    });
    let ticks = '<line x1="' + lw + '" y1="' + axisY + '" x2="' + (W - 6) + '" y2="' + axisY + '" stroke="' + S.colors.base + '"/>';
    for (let v = 0; v <= cap; v += TICK_STEP) {
      const x = xOf(v);
      ticks += '<line x1="' + x.toFixed(1) + '" y1="' + axisY + '" x2="' + x.toFixed(1) + '" y2="' + (axisY + 2) + '" stroke="' + S.colors.axis + '"/><text x="' + x.toFixed(1) + '" y="' + (axisY + 12) + '" font-size="8" fill="' + S.colors.axis + '" text-anchor="middle">' + (v === 0 ? "0" : v / 1e4 + "万") + "</text>";
    }
    const H3 = axisY + 16;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H3);
    svg.setAttribute("height", String(H3));
    svg.innerHTML = out + ticks;
    must("#mdCap").textContent = "TOP " + rows.length + " 模型 · 共 " + nf(all2.length) + " 次";
  }

  // src/client/tabs.ts
  var TAB_STYLE = \`
.srcbar{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.srcbar .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.stab{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border2);background:var(--card);color:var(--t2);font-size:12px;padding:6px 14px;border-radius:6px;cursor:pointer;font-family:inherit}
.stab:hover{border-color:var(--focus);color:var(--t1)}
.stab.on{background:var(--selbg);color:var(--selfg);border-color:var(--selbd);font-weight:600}
.stab .ct{font-size:10px;color:var(--t4);font-weight:600;padding:1px 6px;border-radius:999px;background:var(--empty)}
.stab.on .ct{color:var(--selfg);background:var(--card)}
.stab.sube{padding:4px 11px;font-size:11px}
.srcbar .hint{font-size:10px;color:var(--t4)}
/* ChatGPT knot 内路径填成 tab 背景色，形成镂空；选中态跟随切换 */
.stab .kc{fill:var(--card)}
.stab.on .kc{fill:var(--selbg)}
\`;
  var ICONS = {
    all: '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><rect x="1.2" y="1.2" width="4.6" height="4.6" rx="1.2"/><rect x="8.2" y="1.2" width="4.6" height="4.6" rx="1.2"/><rect x="1.2" y="8.2" width="4.6" height="4.6" rx="1.2"/><rect x="8.2" y="8.2" width="4.6" height="4.6" rx="1.2"/></svg>',
    workbuddy: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1.3 12.4 4.3v5.4L7 12.7 1.6 9.7V4.3L7 1.3Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M1.6 4.3 7 7.3l5.4-3M7 7.3v5.4" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    claude: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1.5v11M1.5 7h11M3.2 3.2l7.6 7.6M10.8 3.2 3.2 10.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    chatgpt: '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><g transform="translate(7,7) scale(0.0538) translate(-128,-130)"><path d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Z"/><path class="kc" d="M141.624 242.541a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Z"/><path class="kc" d="M37.158 197.931a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803Z"/><path class="kc" d="M23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Z"/><path class="kc" d="M203.015 127.075l-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Z"/><path class="kc" d="M224.757 94.385l-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205Z"/><path class="kc" d="M88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Z"/><path d="M99.929 113.517l28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z"/></g></svg>'
  };
  var TABS = [
    { id: "all", label: "全部", icon: ICONS.all },
    { id: "workbuddy", label: "WorkBuddy", icon: ICONS.workbuddy },
    { id: "claude", label: "Claude", icon: ICONS.claude },
    { id: "chatgpt", label: "ChatGPT", icon: ICONS.chatgpt }
  ];
  var WORKBUDDY_SUB_ORDER = ["workbuddy", "workbuddy-ai"];
  var CLAUDE_SUB_ORDER = ["claude-cowork", "claude-code-desktop", "claude-code-cli"];
  var CHATGPT_SUB_ORDER = ["chatgpt-work", "chatgpt-codex"];
  var SUB_ICONS = {
    workbuddy: '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1.3 12.4 4.3v5.4L7 12.7 1.6 9.7V4.3L7 1.3Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M1.6 4.3 7 7.3l5.4-3M7 7.3v5.4" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    "workbuddy-ai": '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1.3 12.4 4.3v5.4L7 12.7 1.6 9.7V4.3L7 1.3Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><circle cx="7" cy="7.3" r="2.4" stroke="currentColor" stroke-width="1.1"/><path d="M4.6 7.3h4.8M7 4.9c-1.2 1.2-1.2 3.6 0 4.8M7 4.9c1.2 1.2 1.2 3.6 0 4.8" stroke="currentColor" stroke-width="1.1"/></svg>',
    "claude-code-cli": '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="1.5" y="2.5" width="11" height="9" rx="1.4" stroke="currentColor" stroke-width="1.2"/><path d="M4 6l2 1.5L4 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 9.2h2.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    "claude-code-desktop": '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="1.5" y="2" width="11" height="7.6" rx="1.2" stroke="currentColor" stroke-width="1.2"/><path d="M4.6 12h4.8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M7 9.6V12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    "claude-cowork": '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="4.6" cy="4.6" r="2.1" stroke="currentColor" stroke-width="1.2"/><circle cx="9.6" cy="5.6" r="1.7" stroke="currentColor" stroke-width="1.2"/><path d="M1.6 11.6c0-1.9 1.3-3.1 3-3.1s3 1.2 3 3.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M8.4 8.9c1.4 0 2.5.9 2.5 2.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    "chatgpt-codex": '<svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><g transform="translate(7,7) scale(0.0498) translate(-128,-130)"><path d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Z"/><path d="M141.624 242.541a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Z"/><path d="M37.158 197.931a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803Z"/><path d="M23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Z"/><path d="M203.015 127.075l-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Z"/><path d="M224.757 94.385l-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205Z"/><path d="M88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Z"/><path d="M99.929 113.517l28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z"/></g></svg>',
    "chatgpt-work": '<svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><g transform="translate(7,7) scale(0.0498) translate(-128,-130)"><path d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Z"/><path d="M141.624 242.541a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Z"/><path d="M37.158 197.931a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803Z"/><path d="M23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Z"/><path d="M203.015 127.075l-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Z"/><path d="M224.757 94.385l-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205Z"/><path d="M88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Z"/><path d="M99.929 113.517l28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z"/></g></svg>'
  };
  function installTabs() {
    if (!HAS_SOURCES || document.getElementById("srcBar")) return;
    const st = document.createElement("style");
    st.id = "srcBarStyle";
    st.textContent = TAB_STYLE;
    document.head.appendChild(st);
    const bar = document.createElement("nav");
    bar.className = "srcbar";
    bar.id = "srcBar";
    const counts = tabCounts();
    const mainRow = '<div class="row">' + TABS.map(
      (t) => '<button type="button" class="stab' + (t.id === "all" ? " on" : "") + '" data-src="' + t.id + '" title="' + esc(tabTitle(t.id)) + '">' + t.icon + "<span>" + esc(t.label) + '</span><span class="ct">' + nf(counts[t.id]) + "</span></button>"
    ).join("") + "</div>";
    const buildSubRow = (domId, allLabel, allKey, ids) => ids.length > 1 ? '<div class="row" id="' + domId + '" style="display:none"><button type="button" class="stab sube on" data-sub="' + allKey + '">' + esc(allLabel) + "</button>" + ids.map((id) => {
      const info = DATA.sources.find((s) => s.id === id);
      return '<button type="button" class="stab sube" data-sub="' + id + '" title="' + esc(info.label + "：" + nf(info.requests) + " 次请求 · " + nf(info.tokens) + " token") + '">' + (SUB_ICONS[id] ?? "") + "<span>" + esc(info.label) + '</span><span class="ct">' + nf(info.requests) + "</span></button>";
    }).join("") + "</div>" : "";
    const wbSubs = (DATA.sources ?? []).filter((s) => inFamilyTab(s, "workbuddy")).map((s) => s.id).filter((id) => WORKBUDDY_SUB_ORDER.includes(id)).sort((a, b) => WORKBUDDY_SUB_ORDER.indexOf(a) - WORKBUDDY_SUB_ORDER.indexOf(b));
    const claudeSubs = (DATA.sources ?? []).filter((s) => inFamilyTab(s, "claude")).map((s) => s.id).filter((id) => CLAUDE_SUB_ORDER.includes(id)).sort((a, b) => CLAUDE_SUB_ORDER.indexOf(a) - CLAUDE_SUB_ORDER.indexOf(b));
    const gsubs = (DATA.sources ?? []).filter((s) => inFamilyTab(s, "chatgpt")).map((s) => s.id).filter((id) => CHATGPT_SUB_ORDER.includes(id)).sort((a, b) => CHATGPT_SUB_ORDER.indexOf(a) - CHATGPT_SUB_ORDER.indexOf(b));
    const wbSubRow = buildSubRow("srcSubRowWorkBuddy", "全部 WorkBuddy", "workbuddy-all", wbSubs);
    const claudeSubRow = buildSubRow("srcSubRowClaude", "全部 Claude", "claude-all", claudeSubs);
    const chatgptSubRow = buildSubRow("srcSubRowChatGPT", "全部 ChatGPT", "chatgpt-all", gsubs);
    bar.innerHTML = mainRow + wbSubRow + claudeSubRow + chatgptSubRow + '<div class="hint" id="srcHint"></div>';
    const header = must("header");
    (header.parentElement ?? document.body).insertBefore(bar, header);
  }
  function tabCounts() {
    const out = { all: 0, workbuddy: 0, claude: 0, chatgpt: 0 };
    for (const s of DATA.sources ?? []) {
      out.all += s.requests;
      if (inFamilyTab(s, "claude")) out.claude += s.requests;
      else if (inFamilyTab(s, "chatgpt")) out.chatgpt += s.requests;
      else if (inFamilyTab(s, "workbuddy")) out.workbuddy += s.requests;
    }
    return out;
  }
  function tabTitle(id) {
    if (id === "all") return "全部来源";
    const list = (DATA.sources ?? []).filter((s) => inFamilyTab(s, id));
    return list.length ? list.map((s) => s.label + " " + nf(s.tokens) + " token / " + nf(s.requests) + " 次").join(" · ") : "该来源暂无数据";
  }
  function renderTabs() {
    const tabs = all(".stab[data-src]");
    toggleOn(tabs, tabs.find((el) => el.dataset["src"] === S.srcTab) ?? null);
    const subRowWorkBuddy = document.getElementById("srcSubRowWorkBuddy");
    if (subRowWorkBuddy) subRowWorkBuddy.style.display = S.srcTab === "workbuddy" ? "flex" : "none";
    const subRowClaude = document.getElementById("srcSubRowClaude");
    if (subRowClaude) subRowClaude.style.display = S.srcTab === "claude" ? "flex" : "none";
    const subRowChatGPT = document.getElementById("srcSubRowChatGPT");
    if (subRowChatGPT) subRowChatGPT.style.display = S.srcTab === "chatgpt" ? "flex" : "none";
    if (S.srcTab === "workbuddy" || S.srcTab === "claude" || S.srcTab === "chatgpt") {
      const subs = all(".stab[data-sub]");
      toggleOn(subs, subs.find((el) => el.dataset["sub"] === S.srcSub) ?? null);
    }
    renderHint();
  }
  function renderHint() {
    const el = document.getElementById("srcHint");
    if (!el) return;
    if (!HAS_SOURCES || S.srcTab === "all") {
      el.textContent = "";
      return;
    }
    const list = (DATA.sources ?? []).filter((s) => matchSourceFilter(s, S.srcTab, S.srcSub));
    const tt = list.reduce((a, s) => a + s.tokens, 0);
    const rq = list.reduce((a, s) => a + s.requests, 0);
    el.textContent = "当前口径：" + list.map((s) => s.label).join(" + ") + " · " + nf(rq) + " 次请求 · " + nf(tt) + " token";
  }
  function onSourceTab(e) {
    const t = e.target;
    const tab = t instanceof Element ? t.closest(".stab[data-src]") : null;
    if (!tab) return;
    const next = tab.dataset["src"];
    if (!next || next === S.srcTab) return;
    S.srcTab = next;
    S.srcSub = S.srcTab === "chatgpt" ? "chatgpt-all" : S.srcTab === "workbuddy" ? "workbuddy-all" : "claude-all";
    S.drill = { ws: null, ses: null };
    S.selModel = null;
    S.hrSel = null;
    render();
  }
  function onSourceSub(e) {
    const t = e.target;
    const sub = t instanceof Element ? t.closest(".stab[data-sub]") : null;
    if (!sub) return;
    const next = sub.dataset["sub"];
    if (!next || next === S.srcSub) return;
    S.srcSub = next;
    S.drill = { ws: null, ses: null };
    S.selModel = null;
    S.hrSel = null;
    render();
  }

  // src/client/render.ts
  var PANEL_MIN_HEIGHT = 180;
  function render() {
    const A = aggregate();
    S.lastAggregate = A;
    renderTabs();
    renderKpis(A);
    renderHeat(A);
    renderBand(A);
    renderCrumb();
    renderPanel(A);
    renderRidge(A);
    renderModelCards(A);
    renderDailyModel(A);
    renderModelDist();
    const scroll = document.querySelector(".panel-scroll");
    const heatCard = document.querySelector("#heatCard");
    const card = scroll?.closest(".card");
    if (scroll && heatCard && card) {
      const chrome = card.getBoundingClientRect().height - scroll.getBoundingClientRect().height;
      scroll.style.maxHeight = Math.max(PANEL_MIN_HEIGHT, heatCard.getBoundingClientRect().height - chrome) + "px";
    }
  }

  // src/client/tooltip.ts
  var OFFSET = 12;
  function show(tip, text, x, y) {
    tip.textContent = text;
    tip.style.opacity = "1";
    tip.style.left = x + OFFSET + "px";
    tip.style.top = y + OFFSET + "px";
  }
  function tipOf(el, tagName, className) {
    if (tagName && el.tagName !== tagName) return null;
    if (className && !el.classList.contains(className)) return null;
    return el.getAttribute("data-tip");
  }
  function installTooltip() {
    const tip = must("#tip");
    document.addEventListener("mousemove", (e) => {
      const target = e.target;
      if (!(target instanceof Element)) {
        tip.style.opacity = "0";
        return;
      }
      let text = tipOf(target, void 0, "hcell");
      if (text === null) text = tipOf(target, "circle");
      if (text === null) text = tipOf(target, "path");
      if (text === null) text = tipOf(target, "rect");
      if (text === null && target.tagName === "td") {
        const row = target.closest("tr");
        text = row ? row.getAttribute("data-tip") : null;
      }
      if (text === null) {
        tip.style.opacity = "0";
        return;
      }
      show(tip, text, e.clientX, e.clientY);
    });
  }

  // src/client/index.ts
  var MS_PER_DAY2 = 864e5;
  var MS_PER_MINUTE6 = 6e4;
  function targetElement(e) {
    const t = e.target;
    return t instanceof Element ? t : null;
  }
  function onNavigate(e) {
    const el = targetElement(e)?.closest("[data-ws],[data-si],[data-ses],[data-a]");
    if (!el) return;
    const ws = el.dataset["ws"];
    if (ws !== void 0) {
      S.drill = { ws: Number(ws), ses: null };
      render();
      return;
    }
    const si = el.dataset["si"];
    if (si !== void 0) {
      const ses = DATA.sess[Number(si)];
      if (ses) S.drill = { ws: ses.w, ses };
      render();
      return;
    }
    const sesIdx = el.dataset["ses"];
    if (sesIdx !== void 0) {
      S.drill = { ws: S.drill.ws, ses: DATA.sess[Number(sesIdx)] ?? null };
      render();
      return;
    }
    const action = el.dataset["a"];
    if (action === "root") {
      S.drill = { ws: null, ses: null };
      render();
    } else if (action === "up" && S.drill.ws !== null) {
      S.drill = { ws: S.drill.ws, ses: null };
      render();
    }
  }
  function onTimeWindow(e) {
    const pill = targetElement(e)?.closest(".pill");
    if (!pill) return;
    S.win = Number(pill.dataset["w"]);
    S.customStart = 0;
    S.customEnd = 0;
    must("#dStart").value = "";
    must("#dEnd").value = "";
    S.selModel = null;
    S.hrSel = null;
    toggleOn(all(".pill"), pill);
    render();
  }
  function onPanelControls(e) {
    const target = targetElement(e);
    if (!target) return;
    const modeChip = target.closest("#wsTools [data-m]");
    if (modeChip) {
      S.wsMode = modeChip.dataset["m"] === "ses" ? "ses" : "ws";
      toggleOn(all("#wsTools [data-m]"), modeChip);
      renderPanel(aggregate());
      return;
    }
    const sortChip = target.closest("#wsSorts .chip");
    if (sortChip) {
      S.wsSort = sortChip.dataset["s"] === "n" ? "n" : "tt";
      toggleOn(all("#wsSorts .chip"), sortChip);
      renderPanel(aggregate());
    }
  }
  function onHighlight(e) {
    const target = targetElement(e);
    if (!target) return;
    const hourLegend = target.closest("[data-hrm]");
    if (hourLegend) {
      const v = Number(hourLegend.dataset["hrm"]);
      S.hrSel = S.hrSel === v ? null : v;
      if (S.lastAggregate) renderRidge(S.lastAggregate);
      return;
    }
    const modelCard = target.closest("[data-dm]");
    if (modelCard) {
      const v = Number(modelCard.dataset["dm"]);
      S.selModel = S.selModel === v ? null : v;
      if (S.lastAggregate) {
        renderDailyModel(S.lastAggregate);
        renderModelCards(S.lastAggregate);
      }
    }
  }
  function applyCustomRange() {
    const startVal = must("#dStart").value;
    const endVal = must("#dEnd").value;
    if (!startVal && !endVal) return;
    S.customStart = startVal ? (/* @__PURE__ */ new Date(startVal + "T00:00:00")).getTime() / MS_PER_MINUTE6 : 0;
    S.customEnd = endVal ? ((/* @__PURE__ */ new Date(endVal + "T00:00:00")).getTime() + MS_PER_DAY2) / MS_PER_MINUTE6 : 0;
    S.win = 0;
    S.selModel = null;
    for (const pill of all(".pill")) pill.classList.remove("on");
    render();
  }
  function bootstrap() {
    must("#genAt").textContent = "数据截至 " + DATA.gen + " · 请求级真实 usage · 单文件离线可看";
    installTabs();
    installTooltip();
    document.addEventListener("click", onNavigate);
    document.addEventListener("click", onTimeWindow);
    document.addEventListener("click", onSourceTab);
    document.addEventListener("click", onSourceSub);
    document.addEventListener("click", onPanelControls);
    document.addEventListener("click", onHighlight);
    must("#wsSearch").addEventListener("input", (e) => {
      S.query = e.target.value.trim().toLowerCase();
      renderPanel(aggregate());
    });
    must("#wsMult").addEventListener("change", (e) => {
      S.wsMult = Number(e.target.value);
      renderPanel(aggregate());
    });
    must("#dStart").addEventListener("change", applyCustomRange);
    must("#dEnd").addEventListener("change", applyCustomRange);
    render();
    let resizeTimer;
    const wrap = maybe(".wrap");
    if (wrap) {
      new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(render, 120);
      }).observe(wrap);
    }
    const themeBtn = must("#themeBtn");
    themeBtn.textContent = S.dark ? "浅色" : "深色";
    document.body.classList.toggle("dark", S.dark);
    themeBtn.onclick = () => {
      setDark(!S.dark);
      document.body.classList.toggle("dark", S.dark);
      themeBtn.textContent = S.dark ? "浅色" : "深色";
      render();
    };
  }
  bootstrap();
})();\r
</script>\r
</body></html>`;

// src/server/scan.ts
var import_node_fs2 = __toESM(require("node:fs"));

// src/server/file-scan.ts
var import_node_fs = __toESM(require("node:fs"));
var import_node_path2 = __toESM(require("node:path"));
var IS_WINDOWS = process.platform === "win32";
function isHidden(name) {
  return name.startsWith(".");
}
function matchesJsonl(name) {
  const n = IS_WINDOWS ? name.toLowerCase() : name;
  return n.endsWith(".jsonl");
}
function isDirectory(dirEntry, full) {
  if (dirEntry.isDirectory()) return true;
  if (!dirEntry.isSymbolicLink()) return false;
  try {
    return import_node_fs.default.statSync(full).isDirectory();
  } catch {
    return false;
  }
}
function findSessionLogs(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = import_node_fs.default.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (isHidden(entry.name)) continue;
      if (!matchesJsonl(entry.name)) continue;
      if (isDirectory(entry, import_node_path2.default.join(dir, entry.name))) continue;
      out.push(import_node_path2.default.join(dir, entry.name));
    }
    for (const entry of entries) {
      if (isHidden(entry.name)) continue;
      const full = import_node_path2.default.join(dir, entry.name);
      if (isDirectory(entry, full)) walk(full);
    }
  };
  walk(root);
  return out;
}
function relativeParts(file, root) {
  return import_node_path2.default.relative(root, file).split(/[\\/]+/).filter((x) => x !== "");
}

// src/server/py-compat.ts
var PY_SPACE = "\\t\\n\\v\\f\\r\\u001c-\\u001f \\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
var PY_WS_RUN = new RegExp(`[${PY_SPACE}]+`, "g");
var PY_WS_EDGE = new RegExp(`^[${PY_SPACE}]+|[${PY_SPACE}]+$`, "g");
function pyTruthy(v) {
  if (v === null || v === void 0 || v === false) return false;
  if (v === true) return true;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.length > 0;
  if (typeof v === "bigint") return v !== 0n;
  if (Array.isArray(v)) return v.length > 0;
  return Object.keys(v).length > 0;
}
function pyOr(a, b) {
  return pyTruthy(a) ? a : b;
}
function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
var PY_INT_STR = /^[+-]?\d(?:_?\d)*$/;
function pyInt(v) {
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const s = pyStrip(v);
    if (!PY_INT_STR.test(s)) return null;
    const n = Number(s.replace(/_/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function pyFloat(v) {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v !== "string") return null;
  const s = pyStrip(v);
  if (s === "") return null;
  const negative = s.startsWith("-");
  const lower = s.toLowerCase().replace(/^[+-]/, "");
  if (lower === "inf" || lower === "infinity") return negative ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  if (lower === "nan") return Number.NaN;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}
function pyCollapseSpaces(s) {
  return s.split(PY_WS_RUN).filter((x) => x !== "").join(" ");
}
function pyStrip(s) {
  return s.replace(PY_WS_EDGE, "");
}
function pySlice(s, n) {
  if (n <= 0) return "";
  let hasSurrogate = false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 55296 && c <= 57343) {
      hasSurrogate = true;
      break;
    }
  }
  if (!hasSurrogate) return s.slice(0, n);
  return Array.from(s).slice(0, n).join("");
}

// src/server/session-title.ts
var TITLE_MAX = 42;
var USER_QUERY_RE = /<user_query>([\s\S]*?)<\/user_query>/;
function extractUserQuery(text) {
  const m = USER_QUERY_RE.exec(text);
  return m ? m[1] : null;
}
function textSegments(content) {
  if (typeof content === "string") return [content];
  if (!Array.isArray(content)) return null;
  const out = [];
  for (const seg of content) {
    if (!isPlainObject(seg)) continue;
    const type = seg["type"];
    if (type !== "input_text" && type !== "text") continue;
    const raw = seg["text"];
    out.push(typeof raw === "string" ? raw : "");
  }
  return out;
}
function titleLegacy(record) {
  if (record["role"] !== "user") return null;
  const content = record["content"];
  if (typeof content === "string") {
    const t = pyCollapseSpaces(content);
    if (t && !t.startsWith("<")) return pySlice(t, TITLE_MAX);
    return null;
  }
  const segs = textSegments(content);
  if (segs === null) return null;
  for (const raw of segs) {
    const t = pyStrip(raw);
    if (!t) continue;
    if (t.startsWith("<")) return null;
    return pySlice(pyCollapseSpaces(t), TITLE_MAX);
  }
  return null;
}
function titleFixed(record) {
  if (record["role"] !== "user") return null;
  const segs = textSegments(record["content"]);
  if (segs === null) return null;
  for (const raw of segs) {
    const q = extractUserQuery(raw);
    if (q === null) continue;
    const t = pyCollapseSpaces(pyStrip(q));
    if (t) return pySlice(t, TITLE_MAX);
  }
  for (const raw of segs) {
    const t = pyStrip(raw);
    if (!t) continue;
    if (t.startsWith("<")) continue;
    return pySlice(pyCollapseSpaces(t), TITLE_MAX);
  }
  return null;
}
function sessionTitle(record, mode) {
  return mode === "legacy" ? titleLegacy(record) : titleFixed(record);
}

// src/server/timestamp.ts
var Y = "(\\d\\d\\d\\d)";
var MO = "(1[0-2]|0[1-9]|[1-9])";
var D = "(3[0-1]|[1-2]\\d|0[1-9]|[1-9]| [1-9])";
var H = "(2[0-3]|[0-1]\\d|\\d)";
var MI = "([0-5]\\d|\\d)";
var S = "(6[0-1]|[0-5]\\d|\\d)";
var F = "(\\d{1,6})";
var W = "\\s+";
var FORMATS = [
  { name: "%Y-%m-%dT%H:%M:%S.%fZ", re: new RegExp(`^${Y}-${MO}-${D}T${H}:${MI}:${S}\\.${F}Z$`, "i"), hasFrac: true },
  { name: "%Y-%m-%dT%H:%M:%SZ", re: new RegExp(`^${Y}-${MO}-${D}T${H}:${MI}:${S}Z$`, "i"), hasFrac: false },
  { name: "%Y-%m-%d %H:%M:%S", re: new RegExp(`^${Y}-${MO}-${D}${W}${H}:${MI}:${S}$`, "i"), hasFrac: false },
  { name: "%Y-%m-%dT%H:%M:%S.%f", re: new RegExp(`^${Y}-${MO}-${D}T${H}:${MI}:${S}\\.${F}$`, "i"), hasFrac: true }
];
var DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
function daysInMonth(year, month) {
  return month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
}
function utcSeconds(y, mo, d, h, mi, s) {
  if (y < 1 || y > 9999) return null;
  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > daysInMonth(y, mo)) return null;
  if (h > 23 || mi > 59 || s > 59) return null;
  const dt = /* @__PURE__ */ new Date(0);
  dt.setUTCFullYear(y, mo - 1, d);
  dt.setUTCHours(h, mi, s, 0);
  return Math.trunc(dt.getTime() / 1e3);
}
function matchFormat(spec, s) {
  const m = spec.re.exec(s);
  if (!m) return null;
  const num = (i) => Number(m[i].trim());
  return utcSeconds(num(1), num(2), num(3), num(4), num(5), num(6));
}
function parseTimestamp(v) {
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return null;
    if (v > 1e12) return v / 1e3;
    if (v > 1e9) return v;
    return null;
  }
  if (typeof v === "string") {
    const s = pyStrip(v);
    for (const spec of FORMATS) {
      const secs = matchFormat(spec, s);
      if (secs !== null) return secs;
    }
    const f = pyFloat(s);
    if (f === null) return null;
    const ms = f / 1e3;
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

// src/server/usage.ts
function pickModel(pd) {
  const m = pyOr(pyOr(pd["model"], pd["requestModelId"]), pd["requestModelName"]);
  if (typeof m === "string") return m;
  return pyTruthy(m) ? String(m) : "unknown";
}
function extractUsage(record) {
  const pd = record["providerData"];
  if (!isPlainObject(pd)) return null;
  const ruRaw = pd["rawUsage"];
  const uRaw = pd["usage"];
  const ru = isPlainObject(ruRaw) ? ruRaw : {};
  const u = isPlainObject(uRaw) ? uRaw : {};
  const totalRaw = pyOr(ru["total_tokens"], u["totalTokens"]);
  if (!pyTruthy(totalRaw)) return null;
  const tt = pyInt(totalRaw);
  if (tt === null) return null;
  const ptdRaw = ru["prompt_tokens_details"];
  const ptd = isPlainObject(ptdRaw) ? ptdRaw : {};
  let ch = ru["prompt_cache_hit_tokens"];
  if (ch === void 0 || ch === null) ch = pyOr(ptd["cached_tokens"], 0);
  const chInt = pyInt(pyOr(ch, 0));
  if (chInt === null) return null;
  const cwInt = pyInt(pyOr(pyOr(ptd["cached_creation_tokens"], ptd["cache_write_tokens"]), 0));
  if (cwInt === null) return null;
  const it = pyInt(pyOr(pyOr(ru["prompt_tokens"], u["inputTokens"]), 0));
  if (it === null) return null;
  const ot = pyInt(pyOr(pyOr(ru["completion_tokens"], u["outputTokens"]), 0));
  if (ot === null) return null;
  return { tt, it, ot, ch: chInt, cw: cwInt, model: pickModel(pd) };
}

// src/server/workspace.ts
var MARKER = "-WorkBuddy-";
function shortWorkspaceName(name) {
  const i = name.lastIndexOf(MARKER);
  if (i >= 0) {
    const rest = name.slice(i + MARKER.length);
    if (rest) return rest;
  }
  return name;
}

// src/server/scan.ts
var MODEL_MERGE = { "glm-5.2-x": "glm-5.2" };
var UNTITLED = "(无标题会话)";
function splitExt(name) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}
function formatMinute(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function* parseLines(file) {
  let text;
  try {
    text = import_node_fs2.default.readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    if (line === "") continue;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (isPlainObject(parsed)) yield parsed;
  }
}
function scanProjects(options) {
  const { projectsDir, titleMode } = options;
  const now = options.now ?? /* @__PURE__ */ new Date();
  const warnings = [];
  const genMs = Math.trunc(now.getTime());
  const wsNames = /* @__PURE__ */ new Map();
  const wsIndex2 = /* @__PURE__ */ new Map();
  const modelIndex2 = /* @__PURE__ */ new Map();
  const models = [];
  const sessions = /* @__PURE__ */ new Map();
  for (const file of findSessionLogs(projectsDir)) {
    const parts = relativeParts(file, projectsDir);
    const folder = parts[0];
    const second = parts[1];
    if (folder === void 0 || second === void 0) {
      warnings.push(`跳过层级不足的日志文件（原实现会崩溃）: ${file}`);
      continue;
    }
    let sid = parts.length === 2 ? splitExt(second) : second;
    if (!wsIndex2.has(folder)) {
      wsNames.set(folder, shortWorkspaceName(folder));
      wsIndex2.set(folder, wsIndex2.size);
    }
    const wsIdx = wsIndex2.get(folder);
    const recs = [];
    let title = null;
    for (const record of parseLines(file)) {
      const sidRaw = record["sessionId"];
      if (pyTruthy(sidRaw) && parts.length === 2) {
        if (typeof sidRaw === "string") sid = sidRaw;
        else warnings.push(`sessionId 非字符串，沿用文件名推导的会话 id: ${file}`);
      }
      if (title === null) {
        const t = sessionTitle(record, titleMode);
        if (t) title = t;
      }
      const usage = extractUsage(record);
      if (usage === null) continue;
      const model = MODEL_MERGE[usage.model] ?? usage.model;
      const ts = parseTimestamp(record["timestamp"]);
      if (!ts) continue;
      let mi = modelIndex2.get(model);
      if (mi === void 0) {
        mi = models.length;
        modelIndex2.set(model, mi);
        models.push(model);
      }
      recs.push([Math.floor(ts / 60), mi, usage.tt, usage.it, usage.ot, usage.ch, usage.cw]);
    }
    if (recs.length === 0) continue;
    recs.sort((a, b) => a[0] - b[0]);
    const existing = sessions.get(sid);
    if (existing) {
      existing.recs.push(...recs);
    } else {
      sessions.set(sid, { w: wsIdx, id: sid, title, recs });
    }
  }
  const sess = [];
  for (const pending of sessions.values()) {
    if (pending.recs.length === 0) continue;
    sess.push({
      w: pending.w,
      id: pySlice(pending.id, 8),
      t: pyTruthy(pending.title) ? pending.title : UNTITLED,
      st: pending.recs[0][0],
      r: pending.recs
    });
  }
  sess.sort((a, b) => a.st - b.st);
  return {
    data: {
      genMs,
      gen: formatMinute(now),
      ws: [...wsNames.values()],
      models,
      sess
    },
    warnings
  };
}
function serializeData(data) {
  return JSON.stringify(data).replace(/<\//g, "<\\/");
}

// src/server/sources.ts
var import_node_fs5 = __toESM(require("node:fs"));
var import_node_os4 = __toESM(require("node:os"));
var import_node_path5 = __toESM(require("node:path"));

// src/shared/sources-meta.ts
var SOURCE_LABELS = {
  workbuddy: "WorkBuddy",
  "workbuddy-ai": "WorkBuddy AI",
  "claude-code-cli": "Claude Code CLI",
  "claude-code-desktop": "Claude Code Desktop",
  "claude-cowork": "Claude Cowork",
  // ChatGPT PC 端两种模式共用 ~/.codex/ 目录，按 payload 字段区分：
  //   chatgpt-work   = ChatGPT Work（工作模式）
  //   chatgpt-codex  = Codex（编码模式）
  "chatgpt-codex": "Codex",
  "chatgpt-work": "ChatGPT Work"
};

// src/server/claude.ts
var import_node_fs3 = __toESM(require("node:fs"));
var import_node_os2 = __toESM(require("node:os"));
var import_node_path3 = __toESM(require("node:path"));
var import_node_module = require("node:module");
var import_node_url = require("node:url");
var COWORK_TOOL_PREFIX = "mcp__cowork__";
var DESKTOP_ENTRYPOINT = "claude-desktop-3p";
var AGENT_ENTRYPOINT = "local-agent";
var COWORK_DB = "coworker.db";
var SUBAGENTS_DIR = "subagents";
var CLAUDE_SOURCES = [
  "claude-code-cli",
  "claude-code-desktop",
  "claude-cowork"
];
function walkDir(dir, isFile) {
  const out = [];
  const walk = (d) => {
    let entries;
    try {
      entries = import_node_fs3.default.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const full = import_node_path3.default.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (isFile(e.name)) out.push(full);
    }
  };
  walk(dir);
  return out;
}
function collectClaudeJsonlFiles(projectsDir) {
  const files = [];
  let projectDirs;
  try {
    projectDirs = import_node_fs3.default.readdirSync(projectsDir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const pEntry of projectDirs) {
    if (!pEntry.isDirectory() || pEntry.name.startsWith(".")) continue;
    const projectDir = import_node_path3.default.join(projectsDir, pEntry.name);
    let subEntries;
    try {
      subEntries = import_node_fs3.default.readdirSync(projectDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const sEntry of subEntries) {
      const sPath = import_node_path3.default.join(projectDir, sEntry.name);
      if (sEntry.isFile() && sEntry.name.toLowerCase().endsWith(".jsonl")) {
        files.push(sPath);
        continue;
      }
      if (!sEntry.isDirectory()) continue;
      const subagentsDir = import_node_path3.default.join(sPath, SUBAGENTS_DIR);
      if (!import_node_fs3.default.existsSync(subagentsDir)) continue;
      let agentEntries;
      try {
        agentEntries = import_node_fs3.default.readdirSync(subagentsDir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const aEntry of agentEntries) {
        const aPath = import_node_path3.default.join(subagentsDir, aEntry.name);
        if (aEntry.isFile() && aEntry.name.toLowerCase().endsWith(".jsonl")) {
          files.push(aPath);
        }
        if (aEntry.name === "workflows" && aEntry.isDirectory()) {
          let wfEntries;
          try {
            wfEntries = import_node_fs3.default.readdirSync(aPath, { withFileTypes: true });
          } catch {
            continue;
          }
          for (const wfEntry of wfEntries) {
            if (!wfEntry.isDirectory()) continue;
            const wfDir = import_node_path3.default.join(aPath, wfEntry.name);
            let wfFiles;
            try {
              wfFiles = import_node_fs3.default.readdirSync(wfDir, { withFileTypes: true });
            } catch {
              continue;
            }
            for (const fEntry of wfFiles) {
              if (fEntry.isFile() && fEntry.name.toLowerCase().endsWith(".jsonl")) {
                files.push(import_node_path3.default.join(wfDir, fEntry.name));
              }
            }
          }
        }
      }
    }
  }
  return files;
}
function readUtf8(file) {
  try {
    return import_node_fs3.default.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}
var isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function extractClaudeUsage(message, fallbackModel = "unknown") {
  if (!isObj(message)) return null;
  const u = message["usage"];
  if (!isObj(u)) return null;
  const it = pyInt(u["input_tokens"]);
  const ot = pyInt(u["output_tokens"]);
  const ch = pyInt(u["cache_read_input_tokens"]);
  const cw = pyInt(u["cache_creation_input_tokens"]);
  if (it === null || ot === null || ch === null || cw === null) return null;
  const modelRaw = message["model"];
  const model = typeof modelRaw === "string" && modelRaw ? modelRaw : fallbackModel;
  return { tt: it + ot + ch + cw, it, ot, ch, cw, model };
}
function claudeTitle(record) {
  if (record["type"] !== "user") return null;
  const msg = record["message"];
  if (!isObj(msg)) return null;
  const segs = [];
  const content = msg["content"];
  if (typeof content === "string") segs.push(content);
  else if (Array.isArray(content)) {
    for (const seg of content) {
      if (isObj(seg) && seg["type"] === "text" && typeof seg["text"] === "string") segs.push(seg["text"]);
    }
  }
  for (const raw of segs) {
    const t = pyCollapseSpaces(pyStrip(raw));
    if (!t) continue;
    if (t.startsWith("<") || t.startsWith("[Request")) return null;
    return pySlice(t, 42);
  }
  return null;
}
function workspaceFromCwd(cwd, fallback = "Claude") {
  if (typeof cwd !== "string" || !cwd.trim()) return fallback;
  const parts = cwd.split(/[\\/]+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  let last = parts[parts.length - 1];
  if (last === "outputs" || last === "session" || last === "projects" || last === "workspaces") {
    last = parts[parts.length - 2] ?? last;
  }
  return last || fallback;
}
function workspaceFromSlug(slug, fallback = "Claude") {
  const restored = slug.replace(/--/g, "/").replace(/-/g, "/");
  return workspaceFromCwd(restored, fallback);
}
function sessionIdFromPath(file, recordSid) {
  if (typeof recordSid === "string" && pyTruthy(recordSid)) return recordSid;
  const rel = file.split(import_node_path3.default.sep);
  const name = rel[rel.length - 1];
  if (rel[rel.length - 2] === SUBAGENTS_DIR) return rel[rel.length - 3] ?? stripExt(name);
  return stripExt(name);
}
function stripExt(name) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}
function* parseJsonl(file) {
  const text = readUtf8(file);
  if (!text) return;
  for (const line of text.split("\n")) {
    if (!line) continue;
    try {
      const v = JSON.parse(line);
      if (isObj(v)) yield v;
    } catch {
    }
  }
}
function isCoworkSession(auditFile) {
  for (const rec of parseJsonl(auditFile)) {
    if (rec["type"] !== "system") continue;
    const tools = rec["tools"];
    if (!Array.isArray(tools)) continue;
    if (tools.some((t) => typeof t === "string" && t.startsWith(COWORK_TOOL_PREFIX))) return true;
  }
  return false;
}
function scanTranscript(file, fileSource, workspace, titleMode) {
  const out = [];
  let title = null;
  for (const rec of parseJsonl(file)) {
    const sid = sessionIdFromPath(file, rec["sessionId"] ?? rec["session_id"]);
    if (title === null && titleMode === "fixed") title = claudeTitle(rec);
    if (rec["type"] !== "assistant") continue;
    const msg = isObj(rec["message"]) ? rec["message"] : void 0;
    const usage = extractClaudeUsage(msg);
    if (usage === null || !pyTruthy(usage.tt)) continue;
    const ts = parseTimestamp(rec["timestamp"]);
    if (ts === null) continue;
    const ep = rec["entrypoint"];
    const source = ep === DESKTOP_ENTRYPOINT ? "claude-code-desktop" : ep === AGENT_ENTRYPOINT ? fileSource === "claude-cowork" ? "claude-cowork" : "claude-code-desktop" : fileSource;
    const uuid = typeof rec["uuid"] === "string" ? rec["uuid"] : null;
    const key = uuid && pyTruthy(uuid) ? "u:" + uuid : "c:" + sid + "@" + Math.floor(ts / 60) + "@" + usage.tt + "@" + usage.ot;
    const stopReason = typeof msg?.["stop_reason"] === "string" ? msg["stop_reason"] : null;
    out.push({
      hit: {
        source,
        sessionId: sid,
        workspace,
        title,
        minute: Math.floor(ts / 60),
        usage
      },
      key,
      stopReason
    });
  }
  return out;
}
function loadSqlite() {
  try {
    const base = (0, import_node_url.pathToFileURL)(process.cwd() + import_node_path3.default.sep).href;
    return (0, import_node_module.createRequire)(base)("node:sqlite");
  } catch {
    return null;
  }
}
function readCoworkDb(dbPath) {
  if (!import_node_fs3.default.existsSync(dbPath)) return null;
  const sqlite = loadSqlite();
  const DatabaseSync = sqlite?.DatabaseSync;
  if (typeof DatabaseSync !== "function") return null;
  const out = [];
  let db;
  try {
    db = new DatabaseSync(dbPath, { readOnly: true });
  } catch {
    return null;
  }
  try {
    const modelOf = /* @__PURE__ */ new Map();
    try {
      for (const row of db.prepare("select session_id, model from sessions").all()) {
        if (typeof row["session_id"] === "string" && typeof row["model"] === "string" && row["model"]) {
          modelOf.set(row["session_id"], row["model"]);
        }
      }
    } catch {
    }
    for (const row of db.prepare("select * from audit_events").all()) {
      const it = pyInt(row["tokens_in"]);
      const ot = pyInt(row["tokens_out"]);
      const ch = pyInt(row["cache_read"]);
      const cw = pyInt(row["cache_write"]);
      if (it === null || ot === null || ch === null || cw === null) continue;
      const tt = it + ot + ch + cw;
      if (!pyTruthy(tt)) continue;
      const sid = typeof row["session_id"] === "string" && pyTruthy(row["session_id"]) ? row["session_id"] : "cowork-" + (typeof row["id"] === "string" || typeof row["id"] === "number" ? String(row["id"]) : "");
      const ts = parseTimestamp(row["timestamp"]);
      if (ts === null) continue;
      out.push({
        hit: {
          source: "claude-cowork",
          sessionId: sid,
          workspace: workspaceFromCwd(row["workspace"], "Claude Cowork"),
          title: null,
          minute: Math.floor(ts / 60),
          usage: { tt, it, ot, ch, cw, model: modelOf.get(sid) ?? "unknown" }
        },
        key: "w:" + sid + "@" + Math.floor(ts / 60) + "@" + tt,
        stopReason: null
      });
    }
  } finally {
    try {
      db.close();
    } catch {
    }
  }
  return out;
}
function scanClaude(options = {}) {
  const home = options.home ?? import_node_os2.default.homedir();
  const titleMode = options.titleMode ?? "fixed";
  const wanted = new Set(options.sources ?? CLAUDE_SOURCES);
  const warnings = [];
  const all = [];
  const push = (rows) => {
    all.push(...rows);
  };
  if (wanted.has("claude-code-cli") || wanted.has("claude-code-desktop")) {
    const projects = import_node_path3.default.join(home, ".claude", "projects");
    if (import_node_fs3.default.existsSync(projects)) {
      for (const file of collectClaudeJsonlFiles(projects)) {
        const slug = import_node_path3.default.basename(import_node_path3.default.dirname(file));
        push(scanTranscript(file, "claude-code-cli", workspaceFromSlug(slug), titleMode));
      }
    }
  }
  if (wanted.has("claude-code-desktop") || wanted.has("claude-cowork")) {
    const root = import_node_path3.default.join(home, "AppData", "Local", "Claude-3p", "local-agent-mode-sessions");
    if (import_node_fs3.default.existsSync(root)) {
      for (const file of walkDir(root, (n) => n.toLowerCase().endsWith(".jsonl"))) {
        const dir = import_node_path3.default.dirname(file);
        const cowork = isCoworkSession(import_node_path3.default.join(dir, "audit.jsonl"));
        const src = cowork ? "claude-cowork" : "claude-code-desktop";
        push(scanTranscript(file, src, workspaceFromCwd(import_node_path3.default.basename(dir), "Claude"), titleMode));
      }
    }
  }
  if (wanted.has("claude-cowork")) {
    const dbPath = import_node_path3.default.join(home, "AppData", "Roaming", "coworker", COWORK_DB);
    if (!import_node_fs3.default.existsSync(dbPath)) {
      warnings.push("未找到 Claude Cowork 数据库（" + dbPath + "），该来源无数据");
    } else {
      const rows = readCoworkDb(dbPath);
      if (rows === null) {
        warnings.push("无法读取 Claude Cowork 数据库（当前 Node 版本缺少内置 sqlite 模块），该来源无数据");
      } else if (rows.length === 0) {
        warnings.push("Claude Cowork 审计表为空（audit_events 0 行），该来源无数据");
      } else {
        push(rows);
      }
    }
  }
  const best = /* @__PURE__ */ new Map();
  all.forEach((row, idx) => {
    const prev = best.get(row.key);
    if (!prev) {
      best.set(row.key, { row, idx });
      return;
    }
    const curHasStop = !!row.stopReason;
    const prevHasStop = !!prev.row.stopReason;
    if (curHasStop && !prevHasStop) {
      best.set(row.key, { row, idx });
    } else if (curHasStop === prevHasStop) {
      if (row.hit.usage.ot > prev.row.hit.usage.ot) best.set(row.key, { row, idx });
    }
  });
  const hits = [...best.values()].sort((a, b) => a.idx - b.idx).map((x) => x.row.hit);
  if (hits.length < all.length) {
    warnings.push("Claude 日志去重：" + all.length + " 条用量记录合并为 " + hits.length + " 条（同一 uuid 只计一次）");
  }
  return { hits, warnings };
}

// src/server/chatgpt.ts
var import_node_fs4 = __toESM(require("node:fs"));
var import_node_os3 = __toESM(require("node:os"));
var import_node_path4 = __toESM(require("node:path"));
var CHATGPT_SOURCES = ["chatgpt-codex", "chatgpt-work"];
var isObj2 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function getCodexHomes(home) {
  if (home) return [import_node_path4.default.join(home, ".codex")];
  const env = process.env["CODEX_HOME"];
  if (env && env.trim()) {
    return env.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [import_node_path4.default.join(import_node_os3.default.homedir(), ".codex")];
}
function collectRolloutFiles(sessionsDir, archivedDir) {
  const collect = (root) => {
    const out = /* @__PURE__ */ new Map();
    const walk = (d) => {
      let entries;
      try {
        entries = import_node_fs4.default.readdirSync(d, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        if (e.name.startsWith(".")) continue;
        const full = import_node_path4.default.join(d, e.name);
        if (e.isDirectory()) {
          walk(full);
        } else if (e.isFile() && e.name.toLowerCase().endsWith(".jsonl")) {
          const rel = import_node_path4.default.relative(root, full);
          out.set(rel, full);
        }
      }
    };
    if (import_node_fs4.default.existsSync(root)) walk(root);
    return out;
  };
  const active = collect(sessionsDir);
  const archived = collect(archivedDir);
  for (const [rel, full] of archived) {
    if (!active.has(rel)) active.set(rel, full);
  }
  return [...active.values()];
}
function* parseJsonl2(file) {
  let text;
  try {
    text = import_node_fs4.default.readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    if (!line) continue;
    try {
      const v = JSON.parse(line);
      if (isObj2(v)) yield v;
    } catch {
    }
  }
}
function extractTokenDelta(info, prev) {
  const lastRaw = info["last_token_usage"];
  const totalRaw = info["total_token_usage"];
  let next = prev;
  if (isObj2(totalRaw)) {
    const ti = pyInt(totalRaw["input_tokens"]);
    const tc = pyInt(totalRaw["cached_input_tokens"]);
    const to = pyInt(totalRaw["output_tokens"]);
    if (ti !== null && tc !== null && to !== null) {
      next = { input: ti, cached: tc, output: to, total: pyInt(totalRaw["total_tokens"]) ?? ti + to };
    }
  }
  if (isObj2(lastRaw)) {
    const it = pyInt(lastRaw["input_tokens"]);
    const ch = pyInt(lastRaw["cached_input_tokens"]);
    const ot = pyInt(lastRaw["output_tokens"]);
    if (it === null || ch === null || ot === null) return { delta: null, next };
    const tt = pyInt(lastRaw["total_tokens"]) ?? it + ot;
    if (!pyTruthy(tt)) return { delta: null, next };
    return { delta: { tt, it, ot, ch, cw: 0 }, next };
  }
  if (isObj2(totalRaw) && next) {
    if (!prev) {
      if (!pyTruthy(next.total)) return { delta: null, next };
      return { delta: { tt: next.total, it: next.input, ot: next.output, ch: next.cached, cw: 0 }, next };
    }
    const dit = next.input - prev.input;
    const dch = next.cached - prev.cached;
    const dot = next.output - prev.output;
    const dtt = next.total - prev.total;
    if (!pyTruthy(dtt)) return { delta: null, next };
    return { delta: { tt: dtt, it: dit, ot: dot, ch: dch, cw: 0 }, next };
  }
  return { delta: null, next };
}
function classifySource(payload) {
  const fields = [payload["model_provider"], payload["entrypoint"], payload["app"], payload["source"]];
  for (const f of fields) {
    if (typeof f === "string" && f.toLowerCase().includes("work")) return "chatgpt-work";
  }
  return "chatgpt-codex";
}
function codexTitle(payload) {
  const msg = payload["message"];
  if (typeof msg === "string") {
    const t = pyCollapseSpaces(pyStrip(msg));
    if (t && !t.startsWith("<")) return pySlice(t, 42);
  }
  return null;
}
function stripExt2(name) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}
function sessionIdFromFilename(file) {
  const name = import_node_path4.default.basename(file);
  const base = stripExt2(name);
  const parts = base.split("-");
  if (parts.length >= 2) return parts[parts.length - 1];
  return base;
}
function scanRolloutFile(file, titleMode) {
  const hits = [];
  let sessionId = sessionIdFromFilename(file);
  let workspace = "Codex";
  let source = "chatgpt-codex";
  let title = null;
  let currentModel = "unknown";
  let prevTotals = null;
  for (const rec of parseJsonl2(file)) {
    const recType = typeof rec["type"] === "string" ? rec["type"] : typeof rec["kind"] === "string" ? rec["kind"] : "";
    const payload = isObj2(rec["payload"]) ? rec["payload"] : {};
    if (recType === "session_meta") {
      const sid = payload["session_id"] ?? payload["id"];
      if (typeof sid === "string" && pyTruthy(sid)) sessionId = sid;
      const cwd = payload["cwd"];
      if (typeof cwd === "string" && cwd.trim()) workspace = workspaceFromCwd(cwd, "Codex");
      source = classifySource(payload);
      continue;
    }
    if (recType === "turn_context") {
      const m = payload["model"] ?? payload["model_name"];
      if (typeof m === "string" && m) currentModel = m;
      continue;
    }
    if (recType === "event_msg") {
      const subType = typeof payload["type"] === "string" ? payload["type"] : "";
      if (titleMode === "fixed" && title === null && subType === "user_message") {
        title = codexTitle(payload);
      }
      if (subType === "token_count") {
        const info = isObj2(payload["info"]) ? payload["info"] : null;
        if (!info) continue;
        const { delta, next } = extractTokenDelta(info, prevTotals);
        prevTotals = next;
        if (!delta || !pyTruthy(delta.tt)) continue;
        const ts = parseTimestamp(rec["timestamp"]);
        if (ts === null) continue;
        hits.push({
          source,
          sessionId,
          workspace,
          title,
          minute: Math.floor(ts / 60),
          usage: { ...delta, model: currentModel }
        });
      }
    }
  }
  return hits;
}
function scanChatGPT(options = {}) {
  const titleMode = options.titleMode ?? "fixed";
  const wanted = new Set(options.sources ?? CHATGPT_SOURCES);
  const warnings = [];
  const hits = [];
  const codexHomes = getCodexHomes(options.home);
  let totalFiles = 0;
  let emptyFiles = 0;
  for (const codexHome of codexHomes) {
    const sessionsDir = import_node_path4.default.join(codexHome, "sessions");
    const archivedDir = import_node_path4.default.join(codexHome, "archived_sessions");
    if (!import_node_fs4.default.existsSync(sessionsDir) && !import_node_fs4.default.existsSync(archivedDir)) {
      if (codexHomes.length === 1) {
        warnings.push("未找到 Codex 会话目录（" + codexHome + "），该来源无数据");
      }
      continue;
    }
    const files = collectRolloutFiles(sessionsDir, archivedDir);
    totalFiles += files.length;
    for (const file of files) {
      const fileHits = scanRolloutFile(file, titleMode);
      if (fileHits.length === 0) {
        emptyFiles++;
        continue;
      }
      for (const hit of fileHits) {
        if (wanted.has(hit.source)) hits.push(hit);
      }
    }
  }
  if (totalFiles > 0 && hits.length === 0) {
    warnings.push(
      "扫描了 " + totalFiles + " 个 Codex 会话文件，但未提取到任何 token 用量记录" + (emptyFiles === totalFiles ? "（可能全部为 2025-09 之前的旧日志，不支持 token 统计）" : "")
    );
  }
  return { hits, warnings };
}

// src/server/sources.ts
var SOURCE_ORDER = [
  "workbuddy",
  "workbuddy-ai",
  "claude-code-cli",
  "claude-code-desktop",
  "claude-cowork",
  "chatgpt-work",
  "chatgpt-codex"
];
var DEFAULT_PROJECTS_AI2 = import_node_path5.default.join(import_node_os4.default.homedir(), ".workbuddy-ai", "projects");
var UNTITLED2 = "(无标题会话)";
function newSpace() {
  return { wsKey: /* @__PURE__ */ new Map(), wsNames: [], modelKey: /* @__PURE__ */ new Map(), modelNames: [] };
}
function wsIndex(space, name) {
  const hit = space.wsKey.get(name);
  if (hit !== void 0) return hit;
  const i = space.wsNames.length;
  space.wsKey.set(name, i);
  space.wsNames.push(name);
  return i;
}
function modelIndex(space, raw) {
  const name = MODEL_MERGE[raw] ?? raw;
  const hit = space.modelKey.get(name);
  if (hit !== void 0) return hit;
  const i = space.modelNames.length;
  space.modelKey.set(name, i);
  space.modelNames.push(name);
  return i;
}
function onlyWorkBuddy(wanted) {
  return wanted.length === 1 && wanted[0] === "workbuddy";
}
function countRequests(data) {
  let n = 0;
  for (const s of data.sess) n += s.r.length;
  return n;
}
function sumTokens(id, sessions) {
  let n = 0;
  for (const p of sessions.values()) {
    if (p.srcId !== id) continue;
    for (const r of p.recs) n += r[2];
  }
  return n;
}
function scanAllSources(options) {
  const now = options.now ?? /* @__PURE__ */ new Date();
  const titleMode = options.titleMode ?? "fixed";
  const requested = new Set(options.sources ?? SOURCE_ORDER);
  const wanted = SOURCE_ORDER.filter((id) => requested.has(id));
  const perSource = {};
  const single = scanProjects({ projectsDir: options.projectsDir, titleMode, now });
  if (onlyWorkBuddy(wanted)) {
    perSource["workbuddy"] = countRequests(single.data);
    return { data: single.data, warnings: single.warnings, perSource };
  }
  const warnings = [];
  const space = newSpace();
  const sessions = /* @__PURE__ */ new Map();
  const put = (srcId, wsName, sid, title, recs) => {
    const key = srcId + "\0" + sid;
    const ex = sessions.get(key);
    if (ex) {
      ex.wsVotes.set(wsName, (ex.wsVotes.get(wsName) ?? 0) + recs.length);
      if (title && !ex.title) ex.title = title;
      ex.recs.push(...recs);
    } else {
      sessions.set(key, {
        srcId,
        wsName,
        wsVotes: /* @__PURE__ */ new Map([[wsName, recs.length]]),
        id: sid,
        title,
        recs: recs.map((r) => [...r])
      });
    }
  };
  const ingestProjects = (srcId, result) => {
    let req = 0;
    for (const s of result.data.sess) {
      const wsName = result.data.ws[s.w] ?? "(未知工作空间)";
      wsIndex(space, wsName);
      const recs = s.r.map((r) => [
        r[0],
        modelIndex(space, result.data.models[r[1]] ?? "unknown"),
        r[2],
        r[3],
        r[4],
        r[5],
        r[6]
      ]);
      req += recs.length;
      put(srcId, wsName, s.id, s.t, recs);
    }
    return req;
  };
  if (requested.has("workbuddy")) {
    warnings.push(...single.warnings);
    perSource["workbuddy"] = ingestProjects("workbuddy", single);
  }
  if (requested.has("workbuddy-ai")) {
    const aiDir = options.projectsAiDir ?? DEFAULT_PROJECTS_AI2;
    if (!import_node_fs5.default.existsSync(aiDir)) {
      warnings.push(`未找到 WorkBuddy AI 会话目录（${aiDir}），该来源无数据`);
      perSource["workbuddy-ai"] = 0;
    } else {
      const ai = scanProjects({ projectsDir: aiDir, titleMode, now });
      warnings.push(...ai.warnings);
      perSource["workbuddy-ai"] = ingestProjects("workbuddy-ai", ai);
    }
  } else {
    perSource["workbuddy-ai"] = 0;
  }
  const claudeWanted = CLAUDE_SOURCES.filter((id) => requested.has(id));
  if (claudeWanted.length > 0) {
    const res = scanClaude({ home: options.home, titleMode, sources: claudeWanted });
    warnings.push(...res.warnings);
    for (const hit of res.hits) {
      wsIndex(space, hit.workspace);
      const mi = modelIndex(space, hit.usage.model);
      put(
        hit.source,
        hit.workspace,
        hit.sessionId,
        hit.title,
        [[hit.minute, mi, hit.usage.tt, hit.usage.it, hit.usage.ot, hit.usage.ch, hit.usage.cw]]
      );
      perSource[hit.source] = (perSource[hit.source] ?? 0) + 1;
    }
    for (const id of claudeWanted) perSource[id] = perSource[id] ?? 0;
  }
  const chatgptWanted = CHATGPT_SOURCES.filter((id) => requested.has(id));
  if (chatgptWanted.length > 0) {
    const res = scanChatGPT({ home: options.home, titleMode, sources: chatgptWanted });
    warnings.push(...res.warnings);
    for (const hit of res.hits) {
      wsIndex(space, hit.workspace);
      const mi = modelIndex(space, hit.usage.model);
      put(
        hit.source,
        hit.workspace,
        hit.sessionId,
        hit.title,
        [[hit.minute, mi, hit.usage.tt, hit.usage.it, hit.usage.ot, hit.usage.ch, hit.usage.cw]]
      );
      perSource[hit.source] = (perSource[hit.source] ?? 0) + 1;
    }
    for (const id of chatgptWanted) perSource[id] = perSource[id] ?? 0;
  }
  for (const p of sessions.values()) {
    if (p.wsVotes.size === 1) continue;
    let best = p.wsName;
    let bestN = p.wsVotes.get(best) ?? 0;
    for (const [w, n] of p.wsVotes) {
      if (n > bestN) {
        best = w;
        bestN = n;
      }
    }
    p.wsName = best;
    warnings.push(
      "会话 " + pySlice(p.id, 8) + " 的日志分散在 " + p.wsVotes.size + " 个工作空间，已按记录最多的「" + best + "」归属"
    );
  }
  const srcIndex = /* @__PURE__ */ new Map();
  for (const id of wanted) srcIndex.set(id, srcIndex.size);
  const sources = wanted.map((id) => ({
    id,
    label: SOURCE_LABELS[id],
    claude: id.startsWith("claude-"),
    chatgpt: id.startsWith("chatgpt-"),
    requests: perSource[id] ?? 0,
    tokens: sumTokens(id, sessions)
  }));
  const sess = [];
  for (const p of sessions.values()) {
    if (p.recs.length === 0) continue;
    p.recs.sort((a, b) => a[0] - b[0]);
    sess.push({
      w: wsIndex(space, p.wsName),
      s: srcIndex.get(p.srcId),
      id: pySlice(p.id, 8),
      t: p.title ?? UNTITLED2,
      st: p.recs[0][0],
      r: p.recs
    });
  }
  sess.sort((a, b) => a.st - b.st);
  return {
    data: {
      genMs: single.data.genMs,
      gen: single.data.gen,
      ws: space.wsNames,
      models: space.modelNames,
      sess,
      sources
    },
    warnings,
    perSource
  };
}

// src/cli.ts
var EXIT_OK = 0;
var EXIT_FAIL = 1;
var EXIT_USAGE = 2;
var USAGE = "usage: token-dashboard [-h] [--projects PROJECTS] [--projects-ai DIR] [--out OUT] [--title-mode {fixed,legacy}] [--no-claude] [--no-chatgpt] [--no-workbuddy-ai]";
function main(argv) {
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (err) {
    if (err instanceof UsageError) {
      process.stderr.write(`${USAGE}
token-dashboard: error: ${err.message}
`);
      return EXIT_USAGE;
    }
    throw err;
  }
  if (parsed.kind === "help") {
    process.stdout.write(HELP);
    return EXIT_OK;
  }
  const { projects, projectsAi, out, titleMode, noClaude, noChatGPT, noWorkBuddyAi } = parsed.options;
  const noExtra = noClaude && noChatGPT && noWorkBuddyAi;
  if (!import_node_fs6.default.existsSync(projects)) {
    if (noExtra) {
      process.stderr.write(`数据目录不存在：${projects}
本机可能未使用过 WorkBuddy；如需指定其他目录请用 --projects 传入。
`);
      return EXIT_FAIL;
    }
    process.stderr.write(`warn: 数据目录不存在（${projects}），跳过 WorkBuddy 来源
`);
  }
  const wanted = ["workbuddy"];
  if (!noWorkBuddyAi) wanted.push("workbuddy-ai");
  if (!noClaude) wanted.push("claude-code-cli", "claude-code-desktop", "claude-cowork");
  if (!noChatGPT) wanted.push("chatgpt-codex", "chatgpt-work");
  const sources = wanted;
  const { data, warnings, perSource } = scanAllSources({
    projectsDir: projects,
    projectsAiDir: projectsAi,
    titleMode,
    sources
  });
  for (const w of warnings) process.stderr.write(`warn: ${w}
`);
  if (data.sess.length === 0) {
    process.stderr.write("没有扫描到任何 token 用量记录，无法生成看板。\n");
    process.stderr.write(`已检查来源：${Object.keys(perSource).join("、")}
`);
    return EXIT_FAIL;
  }
  const html = HTML_TEMPLATE.replace("__DATA__", () => serializeData(data));
  let size = 0;
  try {
    import_node_fs6.default.writeFileSync(out, html, "utf8");
    size = import_node_fs6.default.statSync(out).size;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    process.stderr.write(`无法写出看板到 ${out}：${detail}
`);
    process.stderr.write(`确认父目录存在且可写（本工具不会自动创建目录）。
`);
    return EXIT_FAIL;
  }
  const megabytes = (size / 1e6).toFixed(1);
  process.stdout.write(`written: ${out} (${megabytes} MB)
`);
  process.stdout.write(
    `sessions: ${data.sess.length} | models: ${data.models.length} | workspaces: ${data.ws.length}
`
  );
  for (const s of data.sources ?? []) {
    process.stdout.write(`  ${s.id}: ${s.requests} 次请求 / ${s.tokens} token
`);
  }
  return EXIT_OK;
}
process.exitCode = main(process.argv.slice(2));
