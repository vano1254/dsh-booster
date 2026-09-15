# Changelog

All notable changes to `dsh-booster` are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-09-14

### Added

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
