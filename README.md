# dsh-booster

给 DSH Web GUI 加的一点东西：右侧栏的预览面、几个外观选项、会话标题栏的快捷工具。装成插件，全部在 **设置 → 增强套件** 里开关，改完即时生效。

## 个人使用版本

- 这是**我自己日常在用的那份配置**，顺手整理出来的，不是团队维护的产品。
- **不保证在你的 DSH 版本或系统上同样好用**；没有兼容性承诺，issue / PR 随缘看。
- **后续随缘更新**：我用到什么、烦什么就加什么改什么。想要稳定的东西，建议 fork 自己维护。
- 当前 `0.3.0-beta.1`：beta 阶段，设置项和默认值还可能变。

功能细节在下面「使用」一节。先说三条可能影响你决定的事：

- **模块全部可选**。关掉的模块不注册槽位、不起定时器、不注入 CSS。
- **只剩右侧 VS Code 这一件事**：网页预览与文件预览已经由 DSH 自己做（0.1.6 起），所以插件把它们删了，见下面「这版砍掉了什么」。
- **「右侧 VS Code」是可选的**。要额外装一个约 675 MB 的独立程序（code-server），**仅 Windows**；不装也照样用，文件交给 DSH 自己处理。

---

## 安装

> **桌面版的 profile 由应用自己管**，命令行会直接拒绝它：
>
> ```
> error: profile "desktop" is managed exclusively by the Electron application
> ```
>
> 所以桌面版只能走**应用内的插件页**；`--profile web` 那条路只适用于命令行版。

**桌面版（这个应用）**：设置 → 插件 → 安装插件，填下面这个地址（GitHub tarball，无需 npm 账号）：

```
https://github.com/vano1254/dsh-booster/archive/refs/tags/v0.3.0-beta.1.tar.gz
```

装好后在同一页启用它（0.1.7 支持实时开启/禁用），必要时重启应用。

**命令行版（`dsh web`）**：

```sh
# 方式一：GitHub tarball（推荐，无需 npm 账号）
dsh plugin --profile web add https://github.com/vano1254/dsh-booster/archive/refs/tags/v0.3.0-beta.1.tar.gz

# 方式二：本地开发（源码改动即时可见，仍需重启 GUI）
dsh plugin --profile web add link:/absolute/path/to/dsh-booster
```

> **没有"npm 安装"这一种。** 仓库里的 `package.json` 是 npm 形状的，但这个包**从未发布到 npm**，所以直接用包名安装会 404。想要那条路，就自己发一次包（`npm publish`）—— 本仓库不替你做这件事。

**装完必须重启才生效**（客户端模块图在启动时组装）。

### 装完先做一个选择：要不要右侧那个真 VS Code

重启后在 **设置 → 增强套件 → 右侧 VS Code** 里会问你一次。两条路都能用，没有哪条是"残废版"：

| 选择 | 你得到什么 | 代价 |
|---|---|---|
| **要** | 右侧栏多一个**真的 VS Code** 标签页（code-oss 本体，96 个内置扩展），模型写/改文件时自动打开那个文件 | 磁盘 **675 MB**（独立程序，**不属于本插件**；仅 Windows；无微软市场，装不了市场扩展） |
| **不要** | 外观、标题栏快捷工具、完成提示音照常；文件交给 DSH 自己预览（它 0.1.6 起本来就会） | 无 |

要的话，一条命令装好（下载官方 tarball → 校验 → 解压 → 装桥接扩展 → 起服务）：

```powershell
# 脚本在插件目录里，这条会自动找到它（web / desktop 都适用）
$d = Get-ChildItem "$env:USERPROFILE\.dsh\profiles\*\node_modules\dsh-booster" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
powershell -ExecutionPolicy Bypass -File (Join-Path $d.FullName 'tools\setup-code-server.ps1')
```

不要就什么都不用做。插件**不会静默失败，也不会偷改你的设置**：检测不到服务时它只在**那一次**改用产品自带的预览器打开文件，你选的"代码文件打开方式"保持原样，设置页和那个标签页里会说明当前状态、以及想装该跑哪条命令。

**平台**：外观 / 标题栏工具 / 完成提示音是纯浏览器或宿主 Node 代码，跨平台。**「右侧 VS Code」那一整套仅 Windows**——它依赖 PowerShell 与 WMI，详见下面那一节。

卸载：桌面版在插件页里卸载；命令行版用 `dsh plugin --profile web remove dsh-booster`。

## 使用

重启后打开 **设置 → 增强套件**，里面就是唯一的控制面板。

| 模块 | 内容 | 默认 |
|---|---|---|
| **右侧 VS Code** | 右侧栏里那个**真的** VS Code（按需启动、无自启动），模型写/改文件时把文件送进那个窗口；按 `vscode.fileOpen` 两态分派（送过去 / 只让 DSH 自己处理） | 开 |
| **外观** | 强调色（默认/海蓝/森林/紫罗兰）、界面字体（系统无衬线/微软雅黑/宋体衬线）、会话阅读字号 | 开 |
| **标题栏快捷工具** | 会话标题栏里的侧栏开关 + 阅读字号 ± 步进 | 开 |
| **完成提示音** | 一轮回答结束后响一声（可设最短时长、出错用另一声），**由宿主机播放**，所以你把界面切到别处也听得到 | 关 |

> **完成提示音**的声音是插件**自己合成**的一小段低音钢琴（F3+C4 厚底 + 上行 G4→C5），不是系统通知音、也不含任何第三方音频素材 —— 采样会牵涉版权，所以这里是算出来的波形。它监听宿主的 `agent/status`：**running → idle** 才算"跑完了"，并按你设的最短时长决定要不要出声。

配置写在 `~/.dsh/settings.yaml` 的 `booster` 段：

```yaml
booster:
  modules:
    preview: true
    appearance: true
    headerTools: true
  appearance:
    accent: ocean
    fontFamily: default
  headerTools:
    sidebarToggle: true
    readingSize: true
  preview:
    linkMode: all
    fileOpen: vscode
```

手改这个文件同样生效（GUI 会收到设置变更通知）。

## 这版砍掉了什么（以及为什么）

0.1.6 起，产品自己接管了两件事，插件的同名机制就变成"两套东西抢同一个侧栏"：

| 插件曾经有 | 产品现在有 | 结论 |
|---|---|---|
| 网页面板：跟随回复里的链接、可手填地址栏、YouTube/B 站换 embed、直链走 `<video>` | 侧边栏以浏览器模式访问指定 URL | **删掉** |
| 把写出的文件路由到产品自带的文档预览（自己拼 `dsh-resource://` 地址、调用开始/结束各开一次） | 文件引用与交付文件默认由侧边栏预览，回合结束还有文件改动卡片和逐文件对比 | **删掉** |

两个模块的全部代码（997 行的 `modules/preview.tsx`）连同 `linkMode` / `url` 两个设置项一起删除，客户端产物 **62.8 KB → 53.0 KB**。

于是插件只剩产品没做的那件事：**右侧栏里那个真的 VS Code**，外加外观、标题栏工具、完成提示音。

`fileOpen` 也跟着收敛成两态：`vscode`（交给插件桥接的 code-server）/ `off`（只让 DSH 自己处理）。原先还有第三个值在描述"用产品自带的预览器打开"—— 那是插件**替产品做的决定**，现在这个决定归产品自己，插件不再需要表达它。

## 右侧 VS Code（可选，**仅 Windows**）

把右侧栏变成**真的** VS Code（不是模拟的代码视图）。由三部分组成，缺一不可：

| 部分 | 是什么 | 在哪 |
|---|---|---|
| code-server | VS Code（code-oss）本体，监听 `127.0.0.1:8443` | `%LOCALAPPDATA%\code-server\`——**675 MB，独立程序，需自己装，不属于本插件** |
| 桥接扩展 | 轮询请求文件并在窗口里打开它 | `vscode-extension/`，装进 code-server |
| 宿主半边 | `write`/`edit` 成功后落一份请求，并按需拉起 code-server | `src/bridge.ts` / `src/service.ts` |

### 为什么需要"桥接"这种别扭的东西

code-server 的 URL 只能指定**打开哪个文件夹**，没有任何参数能指定"打开某个文件"。所以文件通过一个请求文件中转：宿主写 `<LOCALAPPDATA>\code-server\bridge\open-request.json`，扩展轮询它并调 `showTextDocument`。请求是**一次性的**——打开成功即删除，不会每次重开面板都重放上一个文件。

### 安装（Windows）

```powershell
# 1. 装本体：从 code-server 的 GitHub Releases 下 Windows tarball（~206 MB），解压到
#    %LOCALAPPDATA%\code-server\code-server-<version>-windows-amd64\
# 2. 起服务（无自启动，按需拉起）
powershell -ExecutionPolicy Bypass -File tools\start-code-server.ps1
# 3. 把桥接扩展装进 code-server
powershell -ExecutionPolicy Bypass -File tools\install-vscode-bridge.ps1
# 4.（可选）搬桌面版 VS Code 的设置 / 片段 / 扩展
powershell -ExecutionPolicy Bypass -File tools\migrate-from-desktop-vscode.ps1
```

### 怎么让它出现在右侧栏

**不用再靠"回复里恰好出现那个 URL"了。** 两条路：

1. **设置 → 增强套件 → 侧栏预览 → 「在右栏打开 VS Code」** —— 任何时候都能开，不需要模型配合
2. **自动**：`fileOpen` 为 `vscode` 时，模型写/改文件的当次就会把 VS Code 推到右栏（每个挂载只推一次，避免每个流式快照都抢一次焦点）

VS Code 是一个**独立的标签页类型**（kind `booster-vscode`），和「网页」标签页不共用一格 —— 回复里再出现别的链接也不会把它挤掉。

这一页的地址由插件自己拼，并且**故意不带 `?folder=` 参数**。原因是一次真实事故：code-server 会把 `?folder=` 持久化进 `coder.json`，一旦那个值不对（比如被一段文档示例污染成 `/C:/…`），之后**每个**窗口都会弹 "Workspace does not exist"，而且从 UI 里退不出来。不带参数时，code-server 打开它自己配置的文件夹（由 `tools/start-code-server.ps1 -Folder` 决定）。

顺带一提，面板也不会再把服务自己的地址当成"要预览的链接"——`127.0.0.1:8443` / `localhost:8443` 会被跳过。

**服务没在跑的时候，标签页会自己请宿主把它拉起来。** 页面本身启动不了程序，所以它往设置里写一个启动请求，宿主看到就启动 code-server，然后把结果写回同一个字段：起来了就直接显示工作台，起不来（没装、或启动失败）就变成一句准确的说明加两条命令 —— 一条"已经装了，跑它启动"，一条"还没装，跑它安装"。

这条链路保留了"不自启、不用不占内存"：**只有你真的打开那个标签页，它才会去启动**。

### 已知限制（如实说）

- **仅 Windows**：宿主侧用 `powershell.exe` + WMI 创建进程（这样 code-server 不挂在 DSH 进程树下，DSH 重启不会顺带杀掉它），桥接扩展读 `%LOCALAPPDATA%`。
- **不用它就不花钱**：没有自启动；常驻未打开约 164 MB 内存，开着窗口约 870 MB / 7 个进程。你打开那个标签页时它会按需启动（见上一节），关掉标签页不会把它关掉。
- **端口写死 8443**，被占用会撞车。
- **这个本地服务默认没有认证**（`--auth none` + 绑回环）。本机任何进程都能连上它，而它背后是"带终端的编辑器"。取舍、以及想加认证时怎么做，写在 [SECURITY.md](SECURITY.md) 里 —— 建议读一遍再决定要不要这么用。
- **装不了市场扩展**：code-oss 没有微软市场，扩展只能复制或手装。
- **打开文件会抢焦点**；同一窗口内 200 ms 内的连续请求会合并成一次。

### 不想要它

设置 → 增强套件 → 右侧 VS Code → `代码文件打开方式` 改成「只让 DSH 自己处理」，桥接那条路自然闲置。要回收磁盘就删掉 `%LOCALAPPDATA%\code-server\`（675 MB）——**插件一行都不用改**。

## 路线图（随缘）

已经能用的：装 / 开 / 关 / 持久化 / 重启后还在；「右侧 VS Code」（含一键安装脚本、装完问一次、打开标签页自动拉起）、外观、标题栏快捷工具、完成提示音。

想做的（没有时间表，我用到才做）：

- 命令面板（Ctrl+K 快速跳转）、消息增强（复制 Markdown / 折叠长消息 / 会话内搜索）
- 上下文与成本看板（右栏，接宿主 `tokenMeter` 读真实 token 与花费）、输入区增强（草稿暂存、提示词快插）
- 密度 / 消息宽度（要先盘清产品暴露的间距 token，避免硬写 DOM 选择器）

**明确不做**：系统通知、插件市场/管理器、语音、消息编辑/reroll。社区已有成熟实现（`dsh-notify-win`、`dshmarket`、`dsh-voice-chat`、`dsh-message-edit`），重复实现只会让它变臃肿。

## 设计要点

- **唯一的设置 UI**：所有模块的开关和配置都在这一个 `settings.section` 页面里，不去挤占"通用"分区的行。
- **不做自有 RPC**：宿主半边只注册 `booster` 设置命名空间，读写走 DSH 自带的设置通道（带 revision 并发保护）。少写一套传输层，就少一处会坏的地方。
- **不重复实现已有能力**：阅读字号直接调 `ctx.theme.setFontSize()`——`ui-theme` 是它的唯一写入方，所以标题栏步进和官方"外观"行永远显示同一个数字，不会各存一份然后漂移。
- **强调色用官方分层 API**：`ctx.theme.overrideTokens()` 把 `{ light, dark }` 叠加在当前主题之上，可叠加、可还原，不碰主题注册表。
- **只看属性，不猜 API**：所有服务签名都是从运行时的 Cordis Inspect 读出来的，不是照名字猜的。
- **不依赖未随包发布的类型包**：`@deepseek-ai/dsh-client-runtime` / `dsh-client-ui-slots` 并不随每个 DSH 版本发布，外部插件 import 它们的类型是最大的版本脆弱点。本插件在 `src/client/types.ts` 里只声明自己真正调用的成员，因此上游类型变动不会把构建卡死。
- **处处容错**：每个注册、每次写入、每个模块的 apply 都包在 `try/catch` 里——单个模块坏掉不会带走其它模块，更不会把 GUI 启动搞崩。
- **`lib/` 是提交进仓库的**，这是有意的：GitHub tarball 安装时不会跑构建脚本，提交产物才能保证装完就有 `lib/client.js`。

## 已知限制

- **只在本机地址可用持久化**：通过非 loopback 地址访问 Web GUI 时，DSH 的设置传输不落盘，此时开关只在本次会话有效。
- **必须重启 GUI**：客户端插件模块图在启动时组装，改完配置即时生效，但装/卸插件本身要重启。
- **升级兼容**：本插件的开发与验证针对 **DSH 0.1.7-rc.2 桌面版**（profile `desktop`）。0.1.6 把网页面板与文件预览收进产品后，本插件删掉了自己的同名实现 —— 用更老的 DSH 时，那部分能力就没有了（右侧 VS Code 不受影响）。本插件只使用 slots、主题 token 与设置通道这三类稳定扩展面，并优先用可选服务（`ctx.get`）而非硬依赖。

## 开发

```sh
npm install
npm run build     # 产出 lib/index.js (ESM host) 与 lib/client.js (单文件 client)
npm run smoke     # 用桩服务跑真实产物，验证两半行为（无需重启 GUI）
npm run audit     # 发布前审计：本机用户名/家目录/主机名/密钥，非零退出就别 push
```

`npm run smoke` 覆盖 116 项断言：宿主命名空间与 schema 默认值、**完成提示音的合成与规则**（渲染出的是合法 RIFF/WAVE、单声道 16 位 44.1kHz、渲染可复现、出错音是另一个音、缓存路径带版本号；以及"短回答不响 / 长回答才响 / 关掉就绝不响 / 出错的那次不会在退出时再响一遍"）、客户端模块注册、组件可渲染、设置页确实列出三种代码打开方式与两种链接模式（这三态在宿主侧存在，页面漏掉一个就是回归）、开关触发槽位回收、强调色分层内容、字号写入范围，**以及"装完问一次"这条链**——探测结果落成 `codeServer` 的三种状态、探测**绝不改写**用户选的打开方式、服务缺席时文件仍然在内置预览器里打开（而不是无声无息）、打开标签页会请宿主启动并把答复写回浏览器能看到的地方，再加上侧栏预览模块的完整行为：写文件时按会话地址打开官方预览、同一调用不重复打开、调用结束后再打开一次以刷新、Windows 绝对路径逐段编码、非文件工具不产生目标、回复里的最新链接进网页面板、**侧栏服务自己的地址不会被当成链接跟随**（否则 code-server 会把 URL 里的 `?folder=` 持久化下来）、**VS Code 标签页已注册且框的地址不带 `?folder=`**、设置页入口按 kind 打开那个标签页、YouTube 观看页重写为 embed、直链媒体走 `<video>`、同一链接不重复加载；还覆盖宿主侧的桥接请求落盘与 `fileOpen` 三态分派，以及按需拉起 code-server 的判定（已在监听就不重启、找不到启动器就跳过且不占用重试窗口），最后是服务获取的三条路径（同步命中 / 太早于是等 / 彻底拿不到时留诊断）。改完代码先跑它，比"重启一下看看"快也准。

冒烟测试里带一个约 80 行的迷你 React 桩：它按组件身份保存 hook 单元并立即执行 effect，所以观察席那种"靠 effect 干活"的逻辑也能被确定性验证。

### 仓库结构

```
src/index.ts               宿主半边：注册设置命名空间 + 在 write/edit 之后落桥接请求
src/bridge.ts              宿主：桥接请求文件的路径与形状（与扩展的约定）
src/service.ts             宿主：按需拉起 code-server（Windows / WMI）
src/chime.ts               宿主：合成并播放完成提示音（纯波形，不含音频素材）
src/settings.ts            双端共享的纯类型与默认值（不含 schema）
src/schema.ts              仅宿主：schemastery schema
src/client/index.ts        客户端入口：绑定命名空间、启模块、注册设置页
src/client/runtime.ts      设置存储 + 模块管理器（开关即装卸）
src/client/types.ts        自有的最小服务类型声明
src/client/settings-page.tsx  唯一的设置页
src/client/modules/*       每个模块一个文件
vscode-extension/          跑在 code-server 里的桥接扩展，不由 DSH 加载
tools/*.ps1                起服务 / 装扩展 / 迁移桌面版设置的脚本
scripts/smoke.mjs          冒烟测试（加载 lib/ 真实产物）
build.mjs                  esbuild 双产物 + ModuleLoader 握手
```

加一个模块 = 加一个 `src/client/modules/<id>.ts`、在 `modules/index.ts` 登记、在 `settings-page.tsx` 的 `BODIES` 里加一段配置 UI。

## 许可

MIT
