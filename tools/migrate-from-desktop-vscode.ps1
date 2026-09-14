# Mirrors the desktop VS Code user profile into code-server.
#
# Copies, in this order:
#   1. User settings  — %APPDATA%\Code\User\settings.json  (merged; desktop wins)
#   2. Snippets       — %APPDATA%\Code\User\snippets\
#   3. Extensions     — %USERPROFILE%\.vscode\extensions\
# and finally re-adds the bridge extension, which belongs to this project rather
# than to the desktop.
#
# Read-only with respect to the desktop install: nothing here ever writes to
# %APPDATA%\Code or %USERPROFILE%\.vscode, so a desktop VS Code is unaffected.
#
# Two traps this script exists to encode, both learned the hard way:
#
#   * VS Code's extensions directory has a manifest (`extensions.json`), and any
#     directory NOT listed in it is treated as uninstall leftovers and DELETED on
#     the next start. Copying folders alone appears to work, then silently
#     vanishes. The manifest has to be rewritten to point at this side first.
#   * In PowerShell, `@(someCommand | ConvertFrom-Json)` wraps an entire JSON
#     array as ONE element, while `$x = $someCommand | ConvertFrom-Json` gives the
#     array. Getting that wrong nests the manifest and corrupts it — which then
#     deletes every extension the manifest failed to describe. So: never `@(...)`
#     a ConvertFrom-Json pipeline, and build entry lists as a typed List.
#
#   powershell -ExecutionPolicy Bypass -File tools\migrate-from-desktop-vscode.ps1
#   powershell -ExecutionPolicy Bypass -File tools\migrate-from-desktop-vscode.ps1 -NoExtensions
#
# Re-run it whenever the desktop profile gains settings, snippets or extensions.
[CmdletBinding()]
param(
  [string]$DesktopUserDir = "$env:APPDATA\Code\User",
  [string]$DesktopExtensionsDir = "$env:USERPROFILE\.vscode\extensions",
  [string]$DataDir = "$env:LOCALAPPDATA\code-server\Data",
  [switch]$NoExtensions,
  [switch]$NoRestart
)

$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding $false
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$userDir = Join-Path $DataDir 'User'
$extDir = Join-Path $DataDir 'extensions'
New-Item -ItemType Directory -Force -Path $userDir, $extDir | Out-Null

# ---------------------------------------------------------------- settings
$sourceSettings = Join-Path $DesktopUserDir 'settings.json'
if (Test-Path $sourceSettings) {
  $targetPath = Join-Path $userDir 'settings.json'
  if (Test-Path $targetPath) { Copy-Item $targetPath "$targetPath.bak-$stamp" -Force }

  $merged = [ordered]@{}
  if (Test-Path $targetPath) {
    $current = Get-Content $targetPath -Raw -Encoding utf8 | ConvertFrom-Json
    foreach ($property in $current.PSObject.Properties) { $merged[$property.Name] = $property.Value }
  }
  $source = Get-Content $sourceSettings -Raw -Encoding utf8 | ConvertFrom-Json
  foreach ($property in $source.PSObject.Properties) { $merged[$property.Name] = $property.Value }

  [System.IO.File]::WriteAllText($targetPath, ($merged | ConvertTo-Json -Depth 12), $utf8)
  Write-Host "settings merged ($($merged.Count) keys); previous file kept as settings.json.bak-$stamp"
}
else {
  Write-Host "no desktop settings.json at $sourceSettings; skipped"
}

# ---------------------------------------------------------------- snippets
$snippets = Join-Path $DesktopUserDir 'snippets'
if (Test-Path $snippets) {
  $files = Get-ChildItem $snippets -File -ErrorAction SilentlyContinue
  if ($files) {
    Copy-Item "$snippets\*" (Join-Path $userDir 'snippets') -Recurse -Force
    Write-Host "snippets copied: $($files.Count) file(s)"
  }
  else { Write-Host 'snippets: desktop side is empty' }
}

# -------------------------------------------------------------- extensions
if ($NoExtensions) {
  Write-Host 'extensions: skipped (-NoExtensions)'
}
elseif (-not (Test-Path $DesktopExtensionsDir)) {
  Write-Host "extensions: no desktop extensions dir at $DesktopExtensionsDir"
}
else {
  $desktopManifest = Join-Path $DesktopExtensionsDir 'extensions.json'
  if (-not (Test-Path $desktopManifest)) { throw "no extensions.json in $DesktopExtensionsDir" }

  $mirrored = Get-Content $desktopManifest -Raw -Encoding utf8 | ConvertFrom-Json
  $posix = '/' + ($extDir.Substring(0, 1).ToLower()) + ':' + ($extDir.Substring(2) -replace '\\', '/')

  $kept = [System.Collections.Generic.List[object]]::new()
  foreach ($entry in $mirrored) {
    $relative = [string]$entry.relativeLocation
    if ($relative -and (Test-Path (Join-Path $DesktopExtensionsDir $relative))) {
      $entry.location.path = "$posix/$relative"
      $kept.Add($entry)
    }
  }

  # Manifest first: a directory without its entry gets garbage-collected.
  $manifestJson = ConvertTo-Json -InputObject ([object[]]$kept.ToArray()) -Depth 12
  [System.IO.File]::WriteAllText((Join-Path $extDir 'extensions.json'), $manifestJson, $utf8)

  foreach ($entry in $kept) {
    Copy-Item (Join-Path $DesktopExtensionsDir $entry.relativeLocation) -Destination $extDir -Recurse -Force
  }
  Write-Host "extensions: $($kept.Count) mirrored (manifest rewritten to $posix/<name>)"
}

# ------------------------------------------------------------- our extension
# The bridge belongs to this project, and the mirror above rewrites the manifest
# from the desktop side — so put it back, or a mirror run would drop it.
$bridgeInstaller = Join-Path $PSScriptRoot 'install-vscode-bridge.ps1'
if ((Test-Path $bridgeInstaller) -and -not $NoExtensions) {
  & $bridgeInstaller -NoRestart | Out-Host
}

# ----------------------------------------------------------------- restart
if (-not $NoRestart) {
  Get-Process node -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -like '*code-server*' } |
    ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 3
  & (Join-Path $PSScriptRoot 'start-code-server.ps1')
}
