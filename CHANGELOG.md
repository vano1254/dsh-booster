
# Changelog

All notable changes to `dsh-booster` are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0-beta.2] - 2026-09-28

### Fixed

- **A startup failure on DSH 0.1.7.** The client half declared
  `inject = ['slots', 'settingsScope']` — the 0.1.5-era settings service. 0.1.7 removed it
  (the name appears **0 times** across the 12 shipped client packages), so the client entry
  never activated, and DSH treats a pending entry as a boot failure:

  ```
  web boot: 1 entry did not activate
  dsh-booster: pending (waiting for service: settingsScope)
  ```

  The app refused to start until the plugin was removed. `inject` is now exactly
  `['slots']`, and the smoke suite's first assertion keeps it that way — every name in that
  array has to exist in the live client service catalog, or the suite fails.

### Changed

- **Plugin configuration follows 0.1.7's model.** The host entry declares `Config`
  (schemastery) and the product's plugin manager renders the form; the client half reads
  live values through `configForms` when it is present. The plugin's own settings page,
  module manager, settings store, appearance module and header-tools module are **gone** —
  the product owns all of that now.
- Client bundle **52.2 KB → 15.2 KB**; sources 20 files → 8.
- `appearance` (accent colour, interface font) and `headerTools` (sidebar toggle, font
  stepper) were **removed**: 0.1.7's own Appearance settings and keyboard shortcuts cover
  them, so a second entry point was exactly the bloat this plugin is meant to avoid.
- The "the tab asks the host to start the service" path was **removed**: it wrote a
  `startRequest` value that only the host event `settings/updated` could carry, and 0.1.7's
  event catalog has no such event (`no catalogued Event named "settings/updated"`). The tab
  now says plainly that a file write starts the service, and hands over the manual command.

- The chime is **on by default** now: it is the point of the feature, and its switch lives
  in the plugin manager's form rather than behind a page nobody opens.

### Notes

- **`0.3.0-beta.1` is broken on DSH 0.1.7 — do not install it.** Use `0.3.0-beta.2`.
- Installing on the Windows desktop app is documented as profile wiring (`dependencies` +
  `dsh.profile.bundles` + a junction), because the CLI refuses to manage that profile:
  `error: profile "desktop" is managed exclusively by the Electron application`.

## [0.3.0-beta.1] - 2026-09-28

这一版是**减法**。DSH 0.1.6 把插件的两块功能收进了产品本身，于是它们从插件里删掉了 —— 留着只会变成两套机制抢同一个侧栏。

### Removed

- **网页面板**：跟随回复里的链接、可手填的地址栏、YouTube/B 站换 embed、直链走 `<video>`。
  产品现在支持**在侧边栏以浏览器模式访问指定 URL**，插件的这一套是重复实现。
- **写文件时的文档预览路由**：自己拼 `dsh-resource://` 地址、调用开始与结束各开一次以刷新。
  产品现在默认把文件引用与交付文件放进侧边栏预览，回合结束还有文件改动卡片与逐文件对比。
- 整个 `src/client/modules/preview.tsx`（997 行）及其全部行为，连带 `linkMode` 与 `url` 两个设置项。

### Changed

- 模块换主角：`vscode`（右侧真 VS Code）、`appearance`、`headerTools`、`chime`。设置键 `preview` 改名为 `vscode`。
- `fileOpen` 从三态收敛为两态：`vscode` / `off`。原先的第三个值在描述"用产品自带的预览器打开"—— 那是插件替产品做的决定，现在这个决定归产品，插件不必再表达它。
- 安装与卸载说明改成 **桌面版 profile**（`--profile desktop`）：桌面应用是 `profiles/desktop`，命令行 `dsh web` 是 `profiles/web`，两者插件各自独立。
- 客户端产物 **62.8 KB → 53.0 KB**；少了一整个模块和它的分支。

### Fixed

- 在 **DSH 0.1.7-rc.2 桌面版**下重新验证：宿主 `lib/index.js` 与客户端 `lib/client.js` 都做**真实 import**（不只是语法检查），客户端产物确认 `__ModuleLoader__.load` 被调用且导出齐全。
- 设置页的 `settings.section` 与标签页的 `sidebar.right.pane.tab` 两个槽位在 0.1.7 里逐个核对过仍然存在、且 key 未被占用。

### Notes

- 宿主侧监听器的回收**不需要额外代码**：Cordis 的 `on()` 实现是 `this.ctx.fiber.effect(…)`，注释写明监听器"随其所属 fiber 自动销毁"，`Service.register` 同理。0.1.6 要求的"检查插件加载与卸载逻辑"因此本来就满足。

## [0.2.0-beta.1] - 2026-09-15

### Added

- A **completion chime**, off by default: the host listens to `agent/status` and plays a
  sound when a turn goes `running` → `idle`, so it is heard even when the browser is
  behind something else. The sound is **synthesised** — a felt-piano voice whose partials
  sit slightly above n×f0, over a low F3+C4 bed with a rising G4→C5 on top — because
  shipping a sample would mean shipping someone's asset. A minimum turn length keeps
  one-line answers silent, errors get a falling variant instead, and the settings card can
  play it on demand.
- The VS Code tab **asks the host to start the service** when it is opened. A page
  cannot start a program, so it bumps `preview.startRequest`; the host starts code-server
  and writes the answer back into `preview.codeServer`, so the tab either becomes the
  workbench or shows an accurate explanation with a start command and an install command.
  The "no autostart, nothing idle" promise survives: only opening that tab starts it.
- An **editable address field** in the web panel. It shows the address in force — a
  followed link included, so the panel never hides what it is showing — and a typed
  address **pins** the panel until "follow links" hands it back, so the page you are
  reading is not replaced by the next URL in a reply. The typed address is remembered
  in `preview.url`.
- `preview`: writing or editing a file opens it in the product's own document
  preview, and a link in the agent's reply opens in a web panel this plugin owns.
- A fullscreen control in that panel, because a ~300px Sidebar column is narrower
  than any embedded player's lowest comfortable tier, which is what makes video
  look soft there.
- A VS Code bridge: a settled `write` or `edit` opens the file in a real
  code-server window in the Sidebar. The web workbench has no URL parameter for
  opening a file, so the host half drops a request file that a small code-server
  extension polls. `preview.fileOpen` chooses between that, the built-in preview,
  and neither.
- On-demand service start: the host half starts code-server the first time it has
  a file to bridge, through WMI so the process sits outside DSH's process tree.
  Nothing runs at logon, and a DSH restart no longer takes the panel down with it.
- The `preview.fileOpen` selector in the settings page, so the three behaviours the
  host already implemented are reachable again instead of being default-only.
- A **pinned VS Code tab** (`booster-vscode`) and a settings-page button that opens it.
  The workbench used to appear only when a reply happened to mention its URL; now it
  is opened on purpose, it keeps its own tab instead of sharing the web panel's, and
  the address it frames carries no `?folder=` — code-server persists that parameter
  past the page, which is how a documentation example once pinned the workbench to a
  path that does not exist.
- **An install-time choice about code-server.** A fresh install starts at
  `preview.codeServer: unknown`; one probe decides it, and the settings page plus the
  VS Code tab then report what was found. The probe never rewrites `fileOpen` — it only
  reports whether the service is *reachable now*, and the service has no autostart — so
  an absent service instead makes the client fall back to the built-in previewer for
  that write, with the install command one click away.
- `tools/setup-code-server.ps1`: download, verify, extract, install the bridge
  extension and start the service in one command, with an optional pinned SHA-256.

### Fixed

- The VS Code tab said "not found" whenever the service simply **was not running**, which
  reads as "not installed" and was wrong on a machine that had it. The wording now
  separates "not running" from "not installed" and hands over the command that matches:
  start, or install.
- **A crash on any machine without `powershell.exe`.** Starting the service spawned the
  launcher with no `'error'` listener, and Node reports a missing binary asynchronously —
  so the failure arrived as an unhandled event and took the whole host process with it. On
  macOS and Linux a single file write was enough to kill the GUI. The start is now skipped
  where it cannot work, and a failed spawn is logged instead of fatal. Found by the new CI
  matrix: the single-OS job could never have seen it.
- The Sidebar service's own address (`127.0.0.1:8443` / `localhost:8443`) is no longer
  followed as if it were content worth previewing. code-server persists the `?folder=`
  it is opened with, so a reply that merely *mentioned* that URL could pin the workbench
  to a path that does not exist — and there is no way back through the UI.
- The bridge's request marker is one-shot: it is removed once a window has opened
  the file, so reopening the Sidebar panel no longer replays the last file and
  takes focus with it. A request that could not be honoured stays on disk.
- Settings copy that still said files go to the built-in previewer, which stopped
  being the default when the VS Code bridge landed.
- The web panel no longer hides its referrer from the framed site. An embedded
  player that cannot see where it is framed refuses to start — YouTube reports
  that as error 153.
- The web panel's sandbox was too tight for ordinary pages: `allow-forms`,
  `allow-modals`, `allow-popups` and `allow-downloads` are now allowed, while
  top-level navigation stays blocked.

## [0.1.0]

### Added

- Modular shell: one `settings.section` page owns every module's switch, and a
  module manager applies and tears down contributions as those switches change —
  a disabled module registers no slot, starts no timer and injects no CSS.
- `appearance`: accent palette stacked through `ctx.theme.overrideTokens`, an
  interface font stack, and a reading size shared with the product's own theme
  service so the two can never drift apart.
- `headerTools`: a sidebar toggle and a reading-size stepper in the session
  header's utilities seat.
