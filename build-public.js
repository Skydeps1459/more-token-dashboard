/**
 * 生成外网可发布的静态快照 public/index.html。
 *
 * 通过 vm 复用 server.js 的注入层函数（liveSnippet / applyBrandTitle），
 * 保证标题、动效和本地站点完全一致；再把 /api/* 调用适配成静态托管可用的形式。
 * 用法: node build-public.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const HTML = path.join(ROOT, "token-dashboard.html");
const SERVER = path.join(ROOT, "server.js");
const OUT_DIR = path.join(ROOT, "public");
const OUT = path.join(OUT_DIR, "index.html");

function loadInject() {
  const src = fs.readFileSync(SERVER, "utf8");
  const start = src.indexOf("function liveSnippet");
  const end = src.indexOf("function sendJson");
  if (start < 0 || end <= start) {
    throw new Error("cannot locate inject functions in server.js");
  }
  const ctx = { SITE_TITLE: process.env.TITLE || "More的Token 消耗看板" };
  vm.createContext(ctx);
  vm.runInContext(src.slice(start, end), ctx);
  if (typeof ctx.liveSnippet !== "function" || typeof ctx.applyBrandTitle !== "function") {
    throw new Error("inject functions incomplete");
  }
  return ctx;
}

/** 静态托管没有 /api/*，换成常量状态，并去掉会误导的「实时更新」文案与按钮 */
function toStatic(snippet, gen) {
  const mock = 'Promise.resolve({json:function(){return Promise.resolve({genMs:' + gen +
    ',updating:false,lastOk:' + gen + ',lastError:null,nextAt:Date.now()+refresh})}})';
  return snippet
    .replace('fetch("/api/status",{cache:"no-store"})', mock)
    .replace('fetch("/api/refresh",{cache:"no-store"})', 'Promise.resolve()')
    .replace('setTimeout(softReload,refresh+20000);', ';')
    .replace('"每 "+Math.round(refresh/60000)+" 分钟更新 · 数据 "', '"数据快照 · 生成于 "')
    .replace('+" · 下次 "+left(nextAt)', '')
    .replace('</style>', '#__liveRefresh{display:none}\n</style>');
}

function main() {
  const html = fs.readFileSync(HTML, "utf8");
  const gen = Math.round(fs.statSync(HTML).mtimeMs);
  const ctx = loadInject();
  const branded = ctx.applyBrandTitle(html);
  const snippet = toStatic(ctx.liveSnippet(gen, 300000, true), gen);
  if (branded.indexOf("</body>") < 0) throw new Error("no </body> in dashboard html");
  const out = branded.replace("</body>", snippet + "\n</body>");
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, out, "utf8");
  console.log("written: " + OUT + " (" + (Buffer.byteLength(out) / 1048576).toFixed(2) + " MB)");
}

main();
