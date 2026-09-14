# Starts code-server for the Sidebar panel.
#
# Two lessons are baked in here:
#
# 1. Start it through WMI, never with `Start-Process`. `Start-Process` leaves
#    code-server inside the caller's process tree, and a DSH restart took it down
#    with everything else — the panel then showed "127.0.0.1 refused to connect".
#    A WMI-created process belongs to the WMI provider host: its parent chain runs
#    ... cmd.exe -> WmiPrvSE.exe -> svchost.exe -> services.exe, which never meets
#    a DSH pid. Verified by walking that chain, not assumed.
#
# 2. Nothing here registers an autostart entry. The plugin's host half starts this
#    service on demand instead; see the note further down.
#
# code-server is the real VS Code (same source, same workbench) served over HTTP.
# It is NOT part of the plugin: dsh-booster only embeds the URL. If this service
# is not running, the Sidebar panel has nothing to show.
#
#   powershell -ExecutionPolicy Bypass -File tools\start-code-server.ps1
#   powershell -ExecutionPolicy Bypass -File tools\start-code-server.ps1 -Folder C:\some\other\repo
#
# (`pwsh -File ...` works too if PowerShell 7 is installed; `powershell` is the
# one that exists on a stock Windows box.)
#
# Stop it with:
#   Get-Process node | Where-Object { $_.Path -like '*code-server*' } | Stop-Process
#
# Note on the folder: two different traps.
#
# 1. code-server's positional path resolves to a real Windows path and passes it
#    through as-is (`folder = lastEntry` in out/node/routes/vscode.js). The web
#    workbench then parses that value as a URI, so `C:\Users\...` arrives with
#    `C` as its scheme: "Unable to resolve resource C%5CUsers...".
# 2. Handing over `file:///C:/...` fixes the parse but names the WRONG file
#    system: the browser claims it through the File System Access API, so the
#    folder opens effectively read-only and saving fails with
#    "Not allowed to request permissions in this context".
#
# The workbench's own parser (workbench.js, QUERY_PARAM_FOLDER) shows the real
# rule: with a remote authority, a value that STARTS WITH A SLASH becomes
# `vscode-remote://<authority><value>` — the server's file system. So a server
# folder travels as `/C:/Users/...`, which is also the form the workbench itself
# stores for its server-side workspaces.
[CmdletBinding()]
param(
  [int]$Port = 8443,
  [string]$Folder = (Get-Location).Path,
  [string]$Locale = 'zh-cn',
  [string]$InstallRoot = "$env:LOCALAPPDATA\code-server"
)

$ErrorActionPreference = 'Stop'

$launcher = Get-ChildItem -Path $InstallRoot -Filter 'code-server.cmd' -Recurse -ErrorAction SilentlyContinue |
  Select-Object -First 1 -ExpandProperty FullName
if (-not $launcher) {
  throw "code-server not found under $InstallRoot. Take the Windows build from the coder/code-server releases page and extract it there."
}

$argumentLine = @(
  '--auth', 'none',
  '--bind-addr', "127.0.0.1:$Port",
  '--locale', $Locale,
  '--disable-telemetry',
  '--disable-update-check',
  '--disable-workspace-trust'
) -join ' '

# ------------------------------------------------------------ no autostart
# Deliberately nothing here registers a logon entry. dsh-booster's host half
# starts this service on demand, the first time it has a file to bridge, which
# costs ~2 s once instead of ~2 s of login activity plus ~164 MB held all day.
# This script is the manual path for when you want the panel before then.

# ------------------------------------------------------------------- start
$already = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($already) {
  Write-Host "code-server already listening on $Port (pid $($already[0].OwningProcess))"
}
else {
  # --auth none is safe here only because the bind address is loopback. No
  # positional path: the folder travels in the URL instead (see the note above).
  $created = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine = "`"$launcher`" $argumentLine"
  }
  if ($created.ReturnValue -ne 0) { throw "WMI could not start code-server (return value $($created.ReturnValue))" }

  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    Start-Sleep -Milliseconds 500
    if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { break }
  }
  $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $listening) { throw "code-server did not start listening on $Port within 20s" }
  Write-Host "started code-server on $Port (pid $($listening[0].OwningProcess), outside the DSH process tree)"
}

# The URL below is only for opening the workbench in a browser, pinned to $Folder.
# The plugin's own VS Code tab frames the plain address with no folder parameter:
# code-server persists `?folder=` past the page it was opened from, so a stale value
# there outlives everything and greets the next window with "Workspace does not exist".
$folderPath = '/' + ($Folder -replace '\\', '/')
$url = "http://127.0.0.1:$Port/?folder=" + [uri]::EscapeDataString($folderPath)
Write-Host "open in a browser:"
Write-Host "  $url"
Write-Host "(the plugin's VS Code tab does not need this URL)"
