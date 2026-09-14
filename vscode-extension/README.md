# dsh-open-bridge

A code-server extension. It opens, in the window you are looking at, the file that
DSH just wrote or edited.

## Why an extension is needed

The web workbench has no URL parameter for "open this file" — only for "open this
folder" (`?folder=`, `?workspace=`, `?ew=`, `?payload=`). So the two sides meet in
a file instead.

## The contract

dsh-booster's host half watches `tools/result` and, for a settled successful
`write` or `edit`, writes:

```json
{ "path": "C:\\absolute\\or\\workspace-relative\\path.ts", "at": 1789392128959 }
```

to `<LOCALAPPDATA>\code-server\bridge\open-request.json`, via a temp file and a
rename so the poll can never read a half-written marker. `markerPath()` in
`src/bridge.ts` owns that path; the extension hard-codes the same one, so the two
must be changed together.

The extension polls the marker every 300 ms, ignores anything at or below the last
`at` it acted on, coalesces requests arriving within 200 ms into the newest one,
and honours a request that is already waiting when its window activates — which is
what makes the ordering safe: the host writes the request first and only then makes
sure a service exists to read it. The request is **one-shot**: once a window has
opened the file, the extension removes the marker, so reopening the panel never
replays the last file. A request that could not be honoured stays on disk for the
next window.

## Installing it

```powershell
powershell -ExecutionPolicy Bypass -File tools\install-vscode-bridge.ps1
```

Not through the marketplace. The non-obvious part is the manifest: VS Code's
extensions directory has an `extensions.json`, and a directory that is not listed
in it is treated as uninstall leftovers and **deleted** on the next start. Copying
the folder alone therefore appears to work and then silently vanishes. The
installer rewrites the manifest entry too.

## Scope

This runs inside code-server only. It reads and writes nothing belonging to a
desktop VS Code install, and the two never share state. The marker lives under
code-server's own data directory, not in the workspace, so nothing appears in your
file tree or in `git status`.

## Limits worth knowing

- **Desktop-only extension APIs do nothing here.** Anything that opens the
  operating system's browser (`techer.open-in-browser`) or shells out to a desktop
  binary has no counterpart in a web workbench.
- **One file per request.** Successive edits each produce a request; a burst
  collapses, edits spread over minutes open one after another and take focus with
  them.
