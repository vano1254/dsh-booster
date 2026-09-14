# Installs the DSH open bridge extension into code-server.
#
# The extension lives in this repository but runs inside code-server, and it is
# installed by hand rather than through the marketplace. The one non-obvious
# step is the manifest: VS Code's extensions directory has an `extensions.json`,
# and a directory that is not listed in it is treated as uninstall leftovers and
# DELETED on the next start. So the manifest entry has to be written too.
#
#   powershell -ExecutionPolicy Bypass -File tools\install-vscode-bridge.ps1
#   powershell -ExecutionPolicy Bypass -File tools\install-vscode-bridge.ps1 -NoRestart
[CmdletBinding()]
param(
  [string]$DataDir = "$env:LOCALAPPDATA\code-server\Data",
  [switch]$NoRestart
)

$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding $false

$source = Get-ChildItem (Join-Path $PSScriptRoot '..\vscode-extension') -Directory |
  Where-Object { $_.Name -like 'dsh-booster.dsh-open-bridge-*' } |
  Select-Object -First 1 -ExpandProperty FullName
if (-not $source) { throw 'the extension source is missing under vscode-extension/' }

$folderName = Split-Path $source -Leaf
$manifest = Join-Path $source 'package.json'
$declared = Get-Content $manifest -Raw -Encoding utf8 | ConvertFrom-Json
$extensionId = "$($declared.publisher).$($declared.name)"

$extensionsDir = Join-Path $DataDir 'extensions'
New-Item -ItemType Directory -Force -Path $extensionsDir | Out-Null

# 1. Copy the extension into place, replacing any previous version of it.
$target = Join-Path $extensionsDir $folderName
Get-ChildItem $extensionsDir -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like 'dsh-booster.dsh-open-bridge-*' -and $_.Name -ne $folderName } |
  ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path $target) { Remove-Item $target -Recurse -Force }
Copy-Item $source -Destination $target -Recurse -Force
Write-Host "copied $folderName"

# 2. Register it in the manifest so the scanner keeps it.
$manifestPath = Join-Path $extensionsDir 'extensions.json'
# Build the list explicitly. `@(Get-Content -Raw | ConvertFrom-Json)` nests the
# whole JSON array as ONE element, which silently produced a manifest VS Code
# could not read -- and an unreadable manifest means the next start deletes every
# extension folder it lists. Keep this an explicit, typed list.
$entries = [System.Collections.Generic.List[object]]::new()
if ((Test-Path $manifestPath) -and (Get-Item $manifestPath).Length -gt 2) {
  foreach ($existing in (ConvertFrom-Json (Get-Content $manifestPath -Raw -Encoding utf8))) {
    if ($existing.identifier -and $existing.identifier.id -and $existing.identifier.id -ne $extensionId) {
      $entries.Add($existing)
    }
  }
}

$posix = '/' + ($extensionsDir.Substring(0, 1).ToLower()) + ':' + ($extensionsDir.Substring(2) -replace '\\', '/')
$entries.Add([pscustomobject]@{
  identifier = [pscustomobject]@{
    id   = $extensionId
    uuid = '8f1c2e40-6b1a-4d3e-9c77-2a5f0d9b1e33'
  }
  version          = $declared.version
  location         = [pscustomobject]@{
    '$mid' = 1
    path   = "$posix/$folderName"
    scheme = 'file'
  }
  relativeLocation = $folderName
  metadata         = [pscustomobject]@{
    installedTimestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    pinned             = $false
    source             = 'vsix'
    id                 = '8f1c2e40-6b1a-4d3e-9c77-2a5f0d9b1e33'
    updated            = $false
    private            = $true
    isPreReleaseVersion = $false
    hasPreReleaseVersion = $false
  }
})

[System.IO.File]::WriteAllText($manifestPath, (ConvertTo-Json -InputObject ([object[]]$entries.ToArray()) -Depth 12), $utf8)
Write-Host "manifest now lists $($entries.Count) extension(s), including $extensionId@$($declared.version)"

# 3. Restart so the window loads it.
if (-not $NoRestart) {
  Get-Process node -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -like '*code-server*' } |
    ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 3
  & (Join-Path $PSScriptRoot 'start-code-server.ps1') | Select-Object -First 1
}
