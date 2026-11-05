# More 的 Token 消耗看板

一个零依赖、可离线运行的本地 Token 用量看板，配套每日自动同步的公开静态站点。

## 在线地址

- **GitHub Pages（每日自动更新）**：https://skydeps1459.github.io/more-token-dashboard/
- **源码仓库**：https://github.com/Skydeps1459/more-token-dashboard

Pages 地址会随每日自动同步更新；WorkBuddy 的应用分享链接是一次性上传的静态快照，需要手动重新发布才会变化。

## 看板内容

- **KPI**：合计 Token、日均、会话、轮次、输入/输出比、缓存命中率、预估金额
- **图表**：日活热力图（20 分钟粒度）、0–24 时模型山脊图、每日模型用量堆叠柱、单次请求大小分布（p50 / p90）
- **下钻**：工作空间 → 会话 → 单次请求三级
- **来源切换**：WorkBuddy / WorkBuddy AI / Claude 家族 / ChatGPT 家族 / Codex
- **交互**：深浅色主题、1 / 3 / 7 / 30 天窗口与自定义日期区间
- **动效**：极光背景、标题流光、卡片扫光、KPI 数字滚动、热力图逐行点亮、鼠标跟随光晕、刷新扫描线

数据来自本机日志（`~/.workbuddy/projects`、`~/.codex/sessions` 等）中的请求级真实 usage，不是估算值。

## 快速开始（本地站点）

需要 **Node.js 18+**，运行期零依赖，不需要 `npm install`。

| 脚本 | 作用 |
| --- | --- |
| `start.bat` | 启动本地站点，默认 http://127.0.0.1:8765/ |
| `start.bat --open` | 启动并打开浏览器 |
| `start.bat --no-anim` | 关闭页面动效启动 |
| `stop.bat` | 停止站点 |
| `switch.bat` | 一键切换开 / 关 |

启动后立即生成一次看板，之后**每 5 分钟**重新扫描日志，先写 `.tmp` 再原子替换 `token-dashboard.html`。页面检测到新数据会柔和刷新，右下角状态条有倒计时进度条和「立即更新」按钮。

## 每日自动同步

| 脚本 | 作用 |
| --- | --- |
| `sync-start.bat` | 启动每日守护（启动即检测一次，之后每 24 小时一次） |
| `sync-stop.bat` | 停止守护 |
| `sync-now.bat` | 立即执行一次检测同步 |

`sync.js` 的流程：由最新看板重新生成 `public/index.html` → 检测 git 变化 → **有变化才提交** → 有 `origin` 才推送；无变化直接跳过。推送到 `main` 且 `public/**` 变化时，`.github/workflows/pages.yml` 会自动部署 GitHub Pages（带并发取消，不会堆积）。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `8765` | 本地站点端口 |
| `REFRESH_MS` | `300000` | 看板重建间隔（5 分钟） |
| `ANIMATE` | 开 | 设为 `0` 关闭页面动效 |
| `TITLE` | `More的Token 消耗看板` | 页面标题 |
| `REPO_URL` | 自动读 `git remote origin` | 左下角仓库徽标链接；未配置时显示占位 |
| `PROJECTS` | — | 指定其他日志目录 |
| `SYNC_MS` | `86400000` | 每日同步间隔（24 小时） |

系统开启「减少动态效果」时，页面动效也会自动关闭。

## 目录结构

```text
server.js                     本地站点：静态服务 + 注入动效 + 5 分钟重建 + /api/status|refresh
token-dashboard.html          生成的看板（每 5 分钟重写，勿手改）
tools/cli.js                  内置生成器副本，让项目自包含
build-public.js               由看板生成公开静态页（把 /api 调用静态适配）
public/index.html             外网可访问的静态快照
public/favicon.svg            网站图标
favicon.svg                   本地站点用的同一份图标
sync.js                       每日检测同步（--once 单次 / 常驻）
sync-start|stop|now.bat       每日同步的开关脚本
start|stop|switch.bat         本地站点的开关脚本
.github/workflows/pages.yml   push 自动部署 GitHub Pages
server.log / sync.log         运行日志（已忽略，不会提交）
```

## 数据与隐私

- 生成的 HTML **内嵌了日志文本**（会话标题截断、工作空间名等）。本仓库按「完整真实数据」公开，分享这些文件等于公开这些内容。
- `.gitignore` 已排除运行时日志、pid 文件、`.workbuddy/` 项目记忆等私有文件。
- 云端沙箱读不到本机日志，所以公开站点是**静态快照**；真实数据的持续更新由本机每日同步推送完成。
- 预估金额基于内置牌价表按实际缓存命中计价，仅供参考，不同套餐计费方式不同。
- `tools/cli.js` 来自 WorkBuddy 内置技能包的打包产物，公开分发请留意其授权。

## 常用命令

```bash
node server.js          # 前台启动本地站点
node build-public.js    # 生成公开静态页
node sync.js --once     # 立即检测同步一次
git push origin main    # 手动推送
```
