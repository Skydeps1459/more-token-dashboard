/**
 * 每天一次「自动检测同步」：
 *   检测本地是否有变化 -> 由最新看板生成 public/index.html -> git commit -> git push（若已配置 remote）
 *
 * 用法:
 *   node sync.js --once    单次执行（手动触发 / 计划任务调用）
 *   node sync.js           常驻，启动即执行一次，之后每 24h 一次
 * 环境变量:
 *   SYNC_MS   检测间隔毫秒，默认 86400000（24 小时），最小 60000
 *   TITLE     自定义看板标题（透传给 build-public.js）
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = __dirname;
const ONCE = process.argv.indexOf("--once") >= 0;
const INTERVAL = Math.max(60000, Number(process.env.SYNC_MS || 86400000));
const LOG = path.join(ROOT, "sync.log");
const PID = path.join(ROOT, "sync.pid");

function log(msg) {
  const line = "[" + new Date().toLocaleString() + "] " + msg;
  try { console.log(line); } catch (_) {}
  try { fs.appendFileSync(LOG, line + "\n", "utf8"); } catch (_) {}
  try {
    if (fs.statSync(LOG).size > 512 * 1024) {
      fs.writeFileSync(LOG, fs.readFileSync(LOG, "utf8").slice(-100 * 1024), "utf8");
    }
  } catch (_) {}
}

function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}
function tryGit(args) {
  try { return git(args); } catch (_) { return null; }
}

function syncOnce() {
  log("check start");
  // 1. 由最新看板生成公开静态页
  try {
    execFileSync(process.execPath, [path.join(ROOT, "build-public.js")], {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (e) {
    log("build-public FAILED: " + e.message);
    return;
  }
  // 2. 自动检测：没有任何变化就跳过
  const status = tryGit(["status", "--porcelain"]);
  if (status === null) { log("not a git repo, skip"); return; }
  if (!status) { log("no changes, skip"); return; }
  log("detected " + status.split("\n").length + " changed path(s), committing");

  // 3. 提交（身份回退，避免未配置 git user 时失败）
  if (tryGit(["add", "-A"]) === null) { log("git add FAILED"); return; }
  const msg = "chore: daily auto sync " + new Date().toLocaleString("sv-SE").slice(0, 16);
  if (tryGit(["-c", "user.name=More", "-c", "user.email=more@users.noreply.github.com",
    "commit", "-m", msg]) === null) {
    log("commit FAILED (nothing to commit or git error)");
    return;
  }
  log("committed: " + msg);

  // 4. 有 remote 才推送；未建仓/未登录时保留本地提交，不报错
  const remote = tryGit(["remote", "get-url", "origin"]);
  if (!remote) { log("no origin remote yet, kept local commit"); return; }
  if (tryGit(["push", "origin", "HEAD:main"]) === null) {
    log("push FAILED (check 'gh auth login' / network)");
    return;
  }
  log("pushed to " + remote);
}

if (ONCE) {
  syncOnce();
} else {
  fs.writeFileSync(PID, String(process.pid), "ascii");
  log("daemon start | interval " + (INTERVAL / 3600000).toFixed(1) + "h");
  syncOnce();
  const timer = setInterval(syncOnce, INTERVAL);
  const shutdown = () => {
    clearInterval(timer);
    try { fs.unlinkSync(PID); } catch (_) {}
    log("daemon stop");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("exit", () => { try { fs.unlinkSync(PID); } catch (_) {} });
}
