# tools

Scripts that keep the Sidebar's VS Code alive. None of them are part of the
plugin bundle; the plugin only embeds the URL.

| Script | What it does |
|---|---|
| `start-code-server.ps1` | Starts code-server detached, so it survives a DSH restart. Prints the URL to open. |
| `install-vscode-bridge.ps1` | Copies the bridge extension into code-server and registers it in the extension manifest. |
| `migrate-from-desktop-vscode.ps1` | Mirrors the desktop VS Code profile (settings, snippets, extensions) into code-server. Read-only with respect to the desktop install. |

## Typical use

```powershell
powershell -ExecutionPolicy Bypass -File tools\start-code-server.ps1              # start the service
powershell -ExecutionPolicy Bypass -File tools\migrate-from-desktop-vscode.ps1    # after desktop changes
powershell -ExecutionPolicy Bypass -File tools\install-vscode-bridge.ps1          # after changing the extension
```

Nothing here registers a logon entry. dsh-booster's host half starts the service
**on demand**, the first time it has a file to bridge — roughly 2 s once, instead
of ~2 s of login activity plus ~164 MB held all day. Measured: cold start to
listening 2.0 s, idle footprint ~164 MB, and ~870 MB once a VS Code window is
open (that last number is VS Code itself, not the autostart decision).

`start-code-server.ps1` stays as the manual path for when you want the panel
before the plugin would have started it.

Both start paths use WMI rather than `Start-Process`, because a `Start-Process`
child stays inside the caller's process tree and a DSH restart killed code-server
that way once — the Sidebar panel then read "127.0.0.1 refused to connect".

Verified rather than assumed: the listening process's parent chain runs
`node.exe -> cmd.exe -> WmiPrvSE.exe -> svchost.exe -> services.exe` and never
meets a DSH pid.

Two more things about that WMI call, both measured:

**A detached caller cannot create a process.** `spawn(..., { detached: true })`
gives PowerShell no console, and `Win32_Process.Create` then returns **0 while
starting nothing**. The helper therefore spawns it attached and lets WMI — not the
process tree — put code-server where it belongs.

**A quoted first token is unreliable too.** `CommandLine = '"C:\...\cmd" --args'`
also returned 0 and started nothing, while the same command with a bare path
worked. The helper quotes the launcher only when its path contains a space.

## Three traps, all of them learned the hard way

**The extension manifest is load-bearing.** VS Code's extensions directory has an
`extensions.json`, and a directory that is not listed in it is treated as
uninstall leftovers and **deleted** on the next start. Copying folders alone
appears to work and then silently vanishes. Both `migrate-from-desktop-vscode.ps1`
and `install-vscode-bridge.ps1` therefore rewrite the manifest before copying
directories, and rewrite `location.path` to point at this side.

**Never `@(...)` a `ConvertFrom-Json` pipeline.** In PowerShell,
`@($cmd | ConvertFrom-Json)` wraps an entire JSON array as ONE element, while
`$x = $cmd | ConvertFrom-Json` yields the array. Getting this wrong nested the
manifest into `[ { value: [...], Count: 7 } ]`, which VS Code could not read —
and an unreadable manifest deletes every extension it fails to describe. Entry
lists are built as a typed `List[object]` here for that reason.

**A backtick-n inside a single-quoted string stays literal.** One script edit
embedded `` `n `` in a comment and the following statement became part of the
comment, so an assignment silently never ran. Build multi-line replacements from
real newlines, not escape text.

## The folder URL, and why it looks odd

The workbench parser (`workbench.js`, `QUERY_PARAM_FOLDER`) has two branches:

```js
o.remoteAuthority && r.startsWith(Ho.sep)
  ? t = { folderUri: P.from({ scheme: X.vscodeRemote, path: r, authority: o.remoteAuthority }) }
  : t = { folderUri: P.parse(r) }
```

With a remote authority, a value that **starts with a slash** becomes a
`vscode-remote://` URI — the server's file system. So a server folder travels as
`/C:/Users/...`. A bare `C:\Users\...` parses `C` as a URI scheme and fails; a
`file:///C:/...` URI parses fine but names the **browser's** file system, which is
read-only-ish inside a sandboxed iframe and fails on save with
"Not allowed to request permissions in this context".
