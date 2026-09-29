# dsh-booster

给 DSH 加**两样它自己没有的东西**：

| 功能 | 一句话 | 归属 |
|---|---|---|
| **右侧栏的真 VS Code** | 右侧栏里那个真的 code-server 工作台，按需启动、不自启；模型写完/改完文件，文件就出现在里面 | **本插件** |
| **完成提示音** | 一轮回答结束后响一声，**由宿主机播放** —— 你切到别的窗口也听得到 | **本插件** |

**只有这两件，是刻意的。** 产品已经自己做了的事，这里一概不做（下面有对照表和原因）。配置在**产品的插件设置**里改 —— 0.1.7 起插件配置由插件管理器渲染，插件自己不再画设置页。

写给 **DSH 0.2.0-rc.1** 的（也在 0.1.7-rc.2 上跑通过），桌面版与命令行版都能用。声明的最低版本是 `engines.dsh: >=0.2.0-rc.1`。

## 个人使用版本

- 这是**我自己日常在用的那份**，顺手整理出来的，不是团队维护的产品。
- **不保证在你的 DSH 版本或系统上同样好用**；没有兼容性承诺，issue / PR 随缘看。
- **后续随缘更新**：我用到什么、烦什么就加什么改什么。想要稳定的东西，建议 fork 自己维护。
- 当前 `0.3.0-beta.4`：beta 阶段，配置项和默认值还可能变。

## 谁负责什么（决定这个插件有多小）

| 能力 | 谁做 |
|---|---|
| 网页链接在侧栏打开（`browser` 类型 + 设置项「网页链接默认打开方式」，默认就是侧栏） | **DSH 自带**（0.1.6 起） |
| 文件/交付文件的侧栏预览、回合结束的文件改动卡片、逐文件对比 | **DSH 自带** |
| 侧边栏终端、Office 预览、Subagent 会话标签、提交计划预览 | **DSH 自带** |
| 外观（主题/字号）、标题栏与快捷键 | **DSH 自带** |
| 插件安装、配置表单 | **DSH 自带的插件管理器** |
| **右侧栏里那个真的 VS Code**（按需启动 + 桥接扩展 + 把我写的文件送进去） | **本插件** |
| **完成提示音**（宿主机播放） | **本插件** |

> 曾经属于本插件、现在归产品的：网页面板（跟随链接、手填地址栏、B 站/YouTube 换 embed、直链 `<video>`）、把写出的文件路由到产品文档预览、自己画的设置页/模块管理器/设置 store、外观模块、标题栏工具。都是因为产品接管了才删的 —— 留着就是两套机制抢同一个侧栏。

---

## 装

**桌面版**（`profiles\desktop` **由应用自己管，命令行会拒绝操作它**：`error: profile "desktop" is managed exclusively by the Electron application`）：

```powershell
# 1. 在 profile 的 package.json 里加两处，并先备份该文件：
#      dependencies:        "dsh-booster": "link:C:/path/to/dsh-booster"
#      dsh.profile.bundles: 加一项 "dsh-booster"
#    （它有 dsh.bundle.patch，所以必须进 bundles，而不是 cordis.patch.yml 的 insert）
# 2. 用 junction 代替跑 pnpm：
$dp = "$env:USERPROFILE\.dsh\profiles\desktop"
New-Item -ItemType Junction -Path "$dp\node_modules\dsh-booster" -Target "C:\path\to\dsh-booster"
# 3. 完整退出应用再打开（关窗口不算，0.1.7 关了窗口任务还在后台跑）
```

**命令行版**（`dsh web`，profile 是 `web`）：

```sh
dsh plugin --profile web add https://github.com/vano1254/dsh-booster/archive/refs/tags/v0.3.0-beta.4.tar.gz
# 本地开发：源码改动即时可见，仍需重启
dsh plugin --profile web add link:/absolute/path/to/dsh-booster
```

> **没有"npm 安装"这一种**：这个包从未发布到 npm。

卸载：删掉上面两处、删掉 junction（或 `dsh plugin --profile web remove dsh-booster`），重启。

---

## 怎么用（三步）

1. **打开它**：右侧栏的**引导页**里有一张写着 **「VS Code」** 的卡片，点它 → 右侧栏出现一个 `kind = booster-vscode` 的标签页。
   > 为什么强调引导页：右侧栏对用户可见的入口就是引导页，**标签页类型只有在贡献了引导卡片的条目时才会出现在那里**（`SidebarRightTabDefinition.guide`）。光注册类型是看不见的 —— 这一点我踩过，见下面。
2. **让它开着**：桥接扩展跑在渲染进程里，**标签页没开着就没有扩展宿主**，文件送进去也没人接。
3. **然后就不用管了**：以后我每次写/改文件，它都会自动在工作台里打开（第一次要多等 ~2 秒启动服务，之后即时）。

如果标签页显示的是"服务没在运行"：**写一个文件它会自己起来**，或者点开卡片里的命令手动起一次。

## 右侧 VS Code（仅 Windows）

它框的是本机 `127.0.0.1:8443` 上的 code-server，**没有自启动** —— 不打开标签页也不写文件，它就不占内存。

| 你在做什么 | 它怎么反应 |
|---|---|
| 模型**成功**写完 / 改完一个文件 | 宿主把该文件路径写进"打开请求"文件（原子写：先 `.tmp` 再 rename），code-server 里的桥接扩展读到就打开它（**只有打开成功才删标记**），同时**按需把服务拉起来** |
| 打开 VS Code 标签页 | 探测 8443：通了直接显示工作台；没通就说明现状，并给出**启动**与**安装**两条命令 |

几个刻意的设计：

1. **面板地址不带 `?folder=`**。code-server 会把这个参数**持久化**进它自己的 `coder.json`；一旦里面是坏值，之后每个窗口都弹 "Workspace does not exist" 而且从 UI 里退不出来。不带参数时它打开自己配置的文件夹。
2. **只框 `127.0.0.1:8443`**，不跟随任何外部链接（网页预览早就交给产品了）。
3. **打开标签页不会启动 code-server**。本来有一段"标签页请宿主把它拉起来"的机制，但 0.1.7 的宿主事件目录里**没有**承载它的 `settings/updated`（我查过：`no catalogued Event named "settings/updated"`），写出去也没人收，所以整段删了，界面上也不再声称"已请宿主启动"。**写一个文件一定会启动它**（`tools/result` 那条路）。
4. **不自动帮你打开标签页**。旧版有一个我自己的 watcher 会开它，精简时删了。要补回来的话需要的东西在 0.1.7 都在（`conversation.input.dock` 槽位、`ctx.sidebarRight.openTab`、`useChat` 官方都在用），但那样又多一套机制。

装 code-server 本体与桥接扩展（一条命令：下载 → 校验 → 解压 → 装扩展 → 起服务）：

```powershell
$d = Get-ChildItem "$env:USERPROFILE\.dsh\profiles\*\node_modules\dsh-booster" -Directory | Select-Object -First 1
powershell -ExecutionPolicy Bypass -File (Join-Path $d.FullName 'tools\setup-code-server.ps1')
```

不想要了就删掉 `%LOCALAPPDATA%\code-server\`（675 MB），插件不用改。想留着磁盘但不让它送文件：把配置里的 `fileOpen` 改成 `off`。

## 完成提示音

- 声音是插件**自己合成**的：毛毡钢琴音色（泛音位置略高于 n×f0、高次泛音先衰减、同音双弦轻微失谐），低音床 F3+C4，完成音在上面叠上行 G4→C5，出错音叠下行 G4→C4。**不含任何第三方音频素材** —— 采样牵涉版权，所以这里是算出来的波形。
- 触发条件是宿主的 `agent/status`：**running → idle** 才算"跑完了"。
- 默认**最短 3 秒**才响（免得每句"好的"都叮一声）；出错时换成下行版，并且**不会在退出时再响一遍**。
- 渲染一次后缓存到 `%TEMP%\dsh-booster-chime-v1-{done|error}.wav`，文件名带版本号，改了合成参数不会复用旧文件。
- 播放器：Windows `SoundPlayer.PlaySync()`（同步，避免尾音被截断）/ macOS `afplay` / Linux `paplay`。

配置项（在产品的插件设置里，4 项）：

| 字段 | 默认 | 说明 |
|---|---|---|
| `fileOpen` | `vscode` | `vscode` 把写/改的文件送进右侧工作台；`off` 只让 DSH 自己处理 |
| `chime` | `true` | 完成后响一声 |
| `chimeMinSeconds` | `3` | 跑够这么久才响（可选 0 / 3 / 5 / 10） |
| `chimeOnError` | `true` | 出错时用下行音 |

## 它是怎么变这么小的

两次减法，都是因为产品自己做了同样的事：

- **0.3.0-beta.1**（0.1.6 之后）：删掉网页面板、链接跟随、手填地址栏、文档预览路由 —— 那个 997 行的模块整个没了。产品现在有"侧边栏以浏览器模式访问 URL"和"文件引用默认侧边栏预览 + 回合结束的文件改动卡片"。
- **0.3.0-beta.2**（0.1.7 之后）：删掉自己画的设置页、模块管理器、设置 store、外观、标题栏工具。产品现在有插件管理器的配置表单和"外观"设置。客户端产物 **62.8 KB → 15.2 KB**。
- **0.3.0-beta.4**：补上引导卡片（见下），修掉一个死机制。

### 三个我踩过的坑（写在这里免得别人再踩）

**① 客户端的 `inject` 写错 = 应用起不来。** `0.3.0-beta.1` 的客户端写的是 `inject = ['slots', 'settingsScope']` —— 0.1.5 时代的 API。0.1.7 里 **`settingsScope` 已被彻底移除**（12 个官方客户端包里出现 0 次），于是这个客户端条目永远 `pending`，而 DSH 把 pending 当作启动失败：

```
web boot: 1 entry did not activate
dsh-booster: pending (waiting for service: settingsScope)
```

应用直接起不来，只能点它的"禁用第三方插件"按钮恢复。**现在的防线**：`inject` 只允许写**已经在实时客户端服务目录里核对过**的名字，冒烟测试的**第一条断言**就是这条。

**② 注册了标签页类型 ≠ 用户看得见。** 右侧栏对用户可见的入口是**引导页**，一个类型只有贡献了 `guide` 条目才会出现在那里（`SidebarRightTabDefinition`：*"Entry boxes for the guide page. Omit to stay off it."*）。beta.2 注册了类型却没给引导条目，同时又把旧版那两个"程序化打开"的入口删了 → **workbench 完全没有路进去**。现在定义里带引导条目，冒烟测试也断言它（**变异测试验证**：把 `guide` 去掉，测试立刻变红）。

**③ 用了不存在的宿主事件 = 死机制。** 我原来监听 `settings/updated` 来响应"标签页请宿主启动服务"，但 0.1.7 的事件目录里根本没有这个名字。代码永远不触发，界面上却写着"已请宿主启动它" —— 那是假话，整段连同文案一起删了。

## 验证状态（如实说）

在 **DSH 0.1.7-rc.2** 与 **0.2.0-rc.1** 桌面版（`profiles/desktop`）上都实测过：

| 项 | 证据 |
|---|---|
| 插件进入实时插件树、带配置 schema | `Config` Inspect：`{id: "include:dsh-booster", patchId: "dsh-booster", status: "schema"}` |
| 写文件 → 桥接标记 | 标记内容 = 被写文件的完整路径 |
| 按需启动 code-server | 写入后 **2 秒内** 8443 开始监听 |
| 扩展激活 → 打开文件 | exthost 日志 `ExtensionService#_doActivateExtension dsh-booster.dsh-open-bridge`；标记被消费；文件可见 |
| 提示音真的播放 | 删掉缓存后重新生成（时间戳可查）＝ 播放器确实跑过 |
| 应用启动无异常 | 7 进程全部响应，无新崩溃日志 |
| 冒烟测试 / CI | **56/56**，ubuntu + windows 双绿 |

在 **0.2.0-rc.1** 上额外核对过（用 npm 上该版本的官方包逐个比对契约）：

| 契约 | 结果 |
|---|---|
| 标签页定义（`guide` / `priority` 三值 / `register` 签名） | `tab-registry.d.ts` 与 0.1.7 **同为 10380 字符**，逐项命中 |
| `sidebar.right.pane.tab` 槽位、`sidebarRightTabs` 服务 | 官方产物里仍在 |
| 客户端唯一硬依赖 `slots` | 官方 locale 产物的 `inject` 里仍在（文件大小与 0.1.7 相同） |
| 模块表组装逻辑（识别 `dsh.client` 包） | `dsh-client-modules` **字节完全相同**（41670 B） |
| 加载握手 `window.__ModuleLoader__.load` | 未变 |
| 宿主事件 `agent/status` / `agent/error` / `tools/result` | 三者都在（`dsh-agent-loop` / `dsh-tools`） |
| 宿主半边在新版上实际加载 | 实时查询返回 `include:dsh-booster` / `status: schema`，且升级后一次真实写入仍落了桥接标记 |

**未验证的**：引导页卡片与标签页里的 iframe 在**别人**的机器/组合上必然可用 —— 我这里只能证明它进了产物、注册进槽位、断言通过；以及桌面版 profile 由应用维护，应用可能在退出时重写我手工接的那两处。

## 已知限制

- **仅 Windows** 支持右侧 VS Code：宿主用 `powershell.exe` + WMI 创建进程（让 code-server 脱离 DSH 进程树，DSH 重启不会顺带杀掉它），桥接扩展读 `%LOCALAPPDATA%`。提示音三平台都有（`SoundPlayer` / `afplay` / `paplay`）。
- **端口写死 8443**，被占用会撞车。
- **不用它就不花钱**：没有自启动；常驻未打开约 164 MB 内存，开着窗口约 870 MB / 7 个进程。
- **打开标签页不会启动 code-server**，只有**写文件**会（或手动跑一次启动命令）。
- **标签页要一直开着**才会实时跟随文件（扩展跑在渲染进程里）。
- **只送成功的 `write`/`edit`**：读文件、正文里提到的路径都不会送。
- **60 秒重试窗口**：刚写完文件但服务还没起来时，一分钟内不会重复尝试。
- **桌面版的 profile 由应用维护**，手工接线要重启才生效。
- **提示音是固定音色**，没有"自定义音频文件"那一条。

## 开发

```sh
npm install
npm run build     # 产出 lib/index.js (ESM host) 与 lib/client.js (单文件 client)
npm run smoke     # 用桩服务跑真实产物，验证两半行为（无需重启）
npm run audit     # 发布前审计：本机用户名/家目录/主机名/密钥，非零退出就别 push
```

`npm run smoke` 覆盖 **56 项断言**。**第一条就是"客户端声明的 `inject` 必须恰好是 `['slots']`，且每个名字都在实时客户端服务目录里"**（坑①就是这么丢的）。另外覆盖：宿主 `Config` 的四个默认值与 `normalizeConfig` 的收敛规则；桥接标记落盘（写/改文件才落、出错与 `fileOpen: off` 不落、原子写不留 `.tmp`）；提示音合成（合法 RIFF/WAVE、长度自洽、渲染可复现、出错音是另一个音、缓存路径带版本号）与四条规则（短回答不响 / 长回答才响 / 关掉不响 / 出错那次不重复响）；客户端只注册一个标签页类型与一个面板、**那个类型必须带引导条目**（坑②的回归防线）、拿不到标签页注册表时不抛错而是等 `sidebarRightTabs`。

`lib/` 是**提交进仓库的**，这是有意的：GitHub tarball 安装不会跑构建脚本，提交产物才能保证装完就有 `lib/client.js`。

### 仓库结构

```
src/index.ts           宿主：Config 声明 + 桥接请求落盘 + 提示音
src/config.ts          双端共享的配置类型、默认值与 schemastery schema
src/chime.ts           宿主：合成并播放提示音（纯波形，不含音频素材）
src/bridge.ts          宿主：桥接请求文件的路径与形状（与扩展的约定）
src/service.ts         宿主：按需拉起 code-server（Windows / WMI）
src/client/index.ts    客户端入口：注册 VS Code 标签页类型（含引导条目）与它的面板
src/client/vscode.tsx  面板（探测服务、框住工作台、状态与命令）
src/client/styles.ts   面板样式（只用产品主题 token）
vscode-extension/      跑在 code-server 里的桥接扩展，不由 DSH 加载
tools/*.ps1            装 code-server / 起服务 / 装桥接扩展 / 迁移桌面版 VS Code 设置
scripts/smoke.mjs      冒烟测试（加载 lib/ 真实产物）
build.mjs              esbuild 双产物 + ModuleLoader 握手
```

## 许可

MIT
