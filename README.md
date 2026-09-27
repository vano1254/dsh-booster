# dsh-booster

给 DSH 加两样它自己没有的东西：**右侧栏里那个真的 VS Code**（按需启动，不自启）和**完成提示音**（由宿主机播放，你切走界面也听得到）。

给 DSH **0.1.7** 写的，桌面版与命令行版都可用。配置在**产品的插件设置**里改（0.1.7 起插件配置由插件管理器渲染），插件自己不再画设置页。

## 个人使用版本

- 这是**我自己日常在用的那份**，顺手整理出来的，不是团队维护的产品。
- **不保证在你的 DSH 版本或系统上同样好用**；没有兼容性承诺，issue / PR 随缘看。
- **后续随缘更新**：我用到什么、烦什么就加什么改什么。想要稳定的东西，建议 fork 自己维护。
- 当前 `0.3.0-beta.3`：beta 阶段，配置项和默认值还可能变。

先说三件可能影响你决定的事：

- **只为 0.1.7 及以上写**。0.1.7 移除了客户端的 `settingsScope` 服务（本插件 0.3.0-beta.1 曾因此让应用**起不来**），换成了"插件声明 `Config` + 客户端 `configForms`"。老版本 DSH 请用 `0.3.0-beta.1` **之前的**版本，或自己改。
- **「右侧 VS Code」要额外装一个约 675 MB 的独立程序**（code-server，**仅 Windows**）。不装也能用：文件交给 DSH 自己预览，提示音照常。
- **只有一个硬依赖**（`slots`），其余服务全部可选取用。这不是洁癖：客户端插件声明的服务一旦永远不出现，它会一直 pending，而 **pending 会让整个应用拒绝启动** —— 我踩过，见下面「一次真实的启动失败」。

---

## 装

**桌面版**（`profiles\desktop`，由应用自己管，命令行会拒绝操作它）：

```powershell
# 1. 在 profile 的 package.json 里加两处：
#      dependencies:  "dsh-booster": "link:C:/path/to/dsh-booster"
#      dsh.profile.bundles: 加一项 "dsh-booster"
#    （它有 dsh.bundle.patch，所以必须进 bundles，而不是 cordis.patch.yml 的 insert）
# 2. 建一个 junction，代替跑 pnpm：
$dp = "$env:USERPROFILE\.dsh\profiles\desktop"
New-Item -ItemType Junction -Path "$dp\node_modules\dsh-booster" -Target "C:\path\to\dsh-booster"
# 3. 重启应用
```

> 桌面版的 `package.json` 是应用自己维护的，改之前先备份；改了之后**必须重启**才生效。

**命令行版**（`dsh web`，profile 是 `web`）：

```sh
dsh plugin --profile web add https://github.com/vano1254/dsh-booster/archive/refs/tags/v0.3.0-beta.3.tar.gz
# 本地开发：源码改动即时可见，仍需重启
dsh plugin --profile web add link:/absolute/path/to/dsh-booster
```

> **没有"npm 安装"这一种**：这个包从未发布到 npm。

卸载：把上面两处删掉、删掉 junction（或 `dsh plugin --profile web remove dsh-booster`），重启。

---

## 右侧 VS Code（仅 Windows）

右侧栏会多出一个 **VS Code** 标签页类型（kind `booster-vscode`）。它框的是本机的 code-server，**没有自启动**：你不打开标签页、也不写文件，它就不占内存。

| 你在做什么 | 它怎么反应 |
|---|---|
| 模型写完 / 改完一个文件 | 宿主把该文件写进一个"打开请求"文件，code-server 里的桥接扩展读到就把文件打开；同时**按需把服务拉起来**（首次约 2 秒） |
| 打开 VS Code 标签页 | 探测 8443 端口：通了就直接显示工作台；没通就说明现状，并给出**启动**与**安装**两条命令 |

几个刻意的设计：

1. **面板地址不带 `?folder=`**。code-server 会把这个参数**持久化**进它自己的 `coder.json`；一旦里面是个坏值，之后每个窗口都弹 "Workspace does not exist" 而且从 UI 里退不出来。不带参数时它打开自己配置的文件夹。
2. **只框 `127.0.0.1:8443`**，不跟随任何外部链接（网页预览和文件预览都交给 DSH 自己了，见下）。
3. **打开标签页不会启动 code-server。** 本来有一段"标签页请宿主把它拉起来"的机制，但 0.1.7 的宿主事件目录里**没有**承载它的 settings/updated —— 我查过，报的是 "no catalogued Event named settings/updated" —— 写出去也没人收，所以整段删了，界面上也不再声称"已请宿主启动"。**写一个文件一定会启动它**（tools/result 那条路），否则就用标签页里给的那条命令。

装 code-server 本体与桥接扩展（一条命令：下载 → 校验 → 解压 → 装扩展 → 起服务）：

```powershell
$d = Get-ChildItem "$env:USERPROFILE\.dsh\profiles\*\node_modules\dsh-booster" -Directory | Select-Object -First 1
powershell -ExecutionPolicy Bypass -File (Join-Path $d.FullName 'tools\setup-code-server.ps1')
```

不想要了就删掉 `%LOCALAPPDATA%\code-server\`（675 MB），插件不用改。想留着磁盘但不让它自动打开文件：把配置里的 `fileOpen` 改成 `off`。

## 完成提示音

一轮回答结束后响一声，**由宿主机播放** —— 所以你切到别的窗口、甚至全屏看视频也听得到（浏览器里的提示音做不到这点）。

- 声音是插件**自己合成**的：毛毡钢琴音色（泛音略高于 n×f0，高次泛音先衰减，同音双弦轻微失谐），低音 F3+C4 厚底，上面加一个上行 G4→C5。**不含任何第三方音频素材** —— 采样会牵涉版权，所以这里是算出来的波形。
- 触发条件是宿主的 `agent/status`：**running → idle** 才算"跑完了"。
- 默认**最短 3 秒**才响（免得每句"好的"都叮一声）；出错时换成**下行版**（同音色），并且不会在退出时再响一遍。
- 渲染一次后缓存在 `%TEMP%\dsh-booster-chime-v1-{done|error}.wav`，文件名带版本号，改了合成参数不会复用旧文件。

配置项（在产品的插件设置里）：

| 字段 | 默认 | 说明 |
|---|---|---|
| `fileOpen` | `vscode` | `vscode` 把写/改的文件送进右侧工作台；`off` 只让 DSH 自己处理 |
| `chime` | `true` | 完成后响一声 |
| `chimeMinSeconds` | `3` | 跑够这么久才响（可选 0 / 3 / 5 / 10） |
| `chimeOnError` | `true` | 出错时用下行音 |

## 这版为什么又变了一遍

DSH 0.1.6 把插件的两块功能收进了产品本身（侧边栏以浏览器模式访问 URL、文件引用与交付文件默认侧边栏预览 + 回合结束的文件改动卡片），所以 **0.3.0-beta.1 删掉了**网页面板、链接跟随、可手填地址栏与文档预览路由，那个 997 行的模块整个没了。

紧接着 0.1.7 又改掉了插件的设置通道，于是 **0.3.0-beta.3 又删掉了**自己画的设置页、模块管理器与设置 store —— 现在配置由产品的插件管理器渲染，插件只声明一个 `Config`。客户端产物因此 **62.8 KB → 15.2 KB**。

### 一次真实的启动失败（写在这里免得别人再踩）

`0.3.0-beta.1` 的客户端写的是 `inject = ['slots', 'settingsScope']` —— 0.1.5 时代的 API。0.1.7 里 **`settingsScope` 已被彻底移除**（12 个官方客户端包里出现 0 次），于是这个客户端条目永远 `pending`，而 DSH 把 pending 当作启动失败：

```
web boot: 1 entry did not activate
dsh-booster: pending (waiting for service: settingsScope)
```

应用直接起不来，只能点它的"禁用第三方插件"按钮恢复。

**现在的防线**：`inject` 只允许写**已经在实时客户端服务目录里核对过**的名字（0.1.7 是 `layout, locale, sessions, slots, theme, timer, uiWorkspace, workspaces` + 官方插件还会注入的 `remote / configForms / sidebarRightTabs / …`），冒烟测试的**第一条断言**就是"声明必须恰好等于 `['slots']`"。

## 已知限制（如实说）

- **仅 Windows** 支持右侧 VS Code：宿主用 `powershell.exe` + WMI 创建进程（这样 code-server 不挂在 DSH 进程树下，DSH 重启不会顺带杀掉它），桥接扩展读 `%LOCALAPPDATA%`。提示音在三大平台都能播（Windows `SoundPlayer` / macOS `afplay` / Linux `paplay`）。
- **端口写死 8443**，被占用会撞车。
- **不用它就不花钱**：没有自启动；常驻未打开约 164 MB 内存，开着窗口约 870 MB / 7 个进程。
- **打开标签页不会自动启动 code-server**：只有**写文件**会（或你手动跑一次启动命令）。
- **桌面版的 profile 由应用维护**，手工接线要重启才生效，且应用可能在退出时重写它。

## 开发

```sh
npm install
npm run build     # 产出 lib/index.js (ESM host) 与 lib/client.js (单文件 client)
npm run smoke     # 用桩服务跑真实产物，验证两半行为（无需重启）
npm run audit     # 发布前审计：本机用户名/家目录/主机名/密钥，非零退出就别 push
```

`npm run smoke` 覆盖 **54 项断言**，其中**第一条就是"客户端声明的 inject 必须恰好是 [slots]，且每个名字都在实时客户端服务目录里"**（上一条命就是这么丢的）。另外覆盖：宿主 Config 的四个默认值与 normalizeConfig 的收敛规则；桥接标记落盘（写/改文件才落、出错与 fileOpen:off 不落、原子写不留 .tmp）；提示音合成（合法 RIFF/WAVE、长度自洽、渲染可复现、出错音是另一个音、缓存路径带版本号）与四条规则（短回答不响 / 长回答才响 / 关掉不响 / 出错那次不重复响）；客户端只注册一个标签页类型与一个面板，拿不到标签页注册表时不抛错而是等 sidebarRightTabs。

`lib/` 是**提交进仓库的**，这是有意的：GitHub tarball 安装不会跑构建脚本，提交产物才能保证装完就有 `lib/client.js`。

### 仓库结构

```
src/index.ts         宿主：Config 声明 + 桥接请求落盘 + 提示音
src/config.ts        双端共享的配置类型、默认值与 schemastery schema
src/chime.ts         宿主：合成并播放提示音（纯波形，不含音频素材）
src/bridge.ts        宿主：桥接请求文件的路径与形状（与扩展的约定）
src/service.ts       宿主：按需拉起 code-server（Windows / WMI）
src/client/index.ts  客户端入口：只注册 VS Code 标签页类型与它的面板
src/client/vscode.tsx  面板（探测、请宿主启动、框住工作台、状态与命令）
src/client/styles.ts   面板样式（只用产品主题 token）
vscode-extension/    跑在 code-server 里的桥接扩展，不由 DSH 加载
tools/*.ps1          起服务 / 装扩展 / 迁移桌面版设置的脚本
scripts/smoke.mjs    冒烟测试（加载 lib/ 真实产物）
build.mjs            esbuild 双产物 + ModuleLoader 握手
```

## 许可

MIT
