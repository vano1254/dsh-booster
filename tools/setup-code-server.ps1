# Installs code-server for the Sidebar's VS Code tab, in one command.
#
# dsh-booster's "right Sidebar VS Code" is a real workbench, which means a real
# program on disk: code-server, ~206 MB compressed, ~675 MB extracted. That is too
# big to bundle into a plugin, so this script fetches it and puts it where the
# plugin looks for it:
#
#   %LOCALAPPDATA%\code-server\code-server-<version>-windows-amd64\
#
# What it does, in order:
#   1. downloads the Windows tarball for the requested version from the official
#      coder/code-server release (or reuses a file you already downloaded)
#   2. verifies it — against -ExpectedSha256 when you pass one, and always by
#      actually extracting it
#   3. extracts it into %LOCALAPPDATA%\code-server\
#   4. installs the bridge extension into it (unless -NoBridge)
#   5. tells you how to start it (unless -NoStart, in which case it stays off)
#
# Nothing here registers a logon entry. dsh-booster starts the service on demand.
#
#   powershell -ExecutionPolicy Bypass -File tools\setup-code-server.ps1
#   powershell -ExecutionPolicy Bypass -File tools\setup-code-server.ps1 -Version 4.137.0
#   powershell -ExecutionPolicy Bypass -File tools\setup-code-server.ps1 -Archive C:\path\to\code-server.tar.gz -ExpectedSha256 <hex>
#   powershell -ExecutionPolicy Bypass -File tools\setup-code-server.ps1 -NoBridge -NoStart
[CmdletBinding()]
param(
  [string]$Version = '4.137.0',
  [string]$InstallRoot = "$env:LOCALAPPDATA\code-server",
  [string]$Archive,
  [string]$ExpectedSha256,
  [switch]$NoBridge,
  [switch]$NoStart
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # the progress bar makes downloads far slower

$asset = "code-server-$Version-windows-amd64.tar.gz"
$url = "https://github.com/coder/code-server/releases/download/v$Version/$asset"
$target = Join-Path $InstallRoot "code-server-$Version-windows-amd64"

Write-Host "code-server $Version -> $target"

# --------------------------------------------------------------- already there?
if (Test-Path (Join-Path $target 'code-server.cmd')) {
  Write-Host "already installed at that path; nothing to download."
} else {
  New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null

  # ------------------------------------------------------------- 1. obtain it
  if (-not $Archive) {
    $Archive = Join-Path $env:TEMP $asset
    if (Test-Path $Archive) {
      $size = [math]::Round((Get-Item $Archive).Length / 1MB, 1)
      Write-Host "reusing $Archive ($size MB) — delete it to download again"
    } else {
      Write-Host "downloading $url"
      $sw = [System.Diagnostics.Stopwatch]::StartNew()
      Invoke-WebRequest -Uri $url -OutFile $Archive -UseBasicParsing
      $sw.Stop()
      $size = [math]::Round((Get-Item $Archive).Length / 1MB, 1)
      Write-Host "downloaded $size MB in $([math]::Round($sw.Elapsed.TotalSeconds, 1))s"
    }
  } else {
    if (-not (Test-Path $Archive)) { throw "archive not found: $Archive" }
    Write-Host "using local archive $Archive"
  }

  # ------------------------------------------------------------- 2. verify it
  $actual = (Get-FileHash -Algorithm SHA256 -Path $Archive).Hash
  if ($ExpectedSha256) {
    if ($actual -ne $ExpectedSha256.ToUpperInvariant()) {
      throw "sha256 mismatch: expected $ExpectedSha256, got $actual"
    }
    Write-Host "sha256 verified against the value you supplied"
  } else {
    # No published checksum is assumed to exist, so say plainly what was and was
    # not checked. The extraction below is the real integrity test: a truncated or
    # corrupted gzip fails there rather than half-installing.
    Write-Host "sha256: $actual"
    Write-Host "  (no -ExpectedSha256 given, so this hash was NOT compared to anything;"
    Write-Host "   add one from the release page if you want the download pinned)"
  }

  # ------------------------------------------------------------ 3. extract it
  # Windows 10+ ships bsdtar, which reads .tar.gz; no 7-Zip dependency needed.
  $staging = Join-Path $env:TEMP "code-server-extract-$Version"
  if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $staging | Out-Null

  Write-Host "extracting..."
  & tar.exe -xzf $Archive -C $staging
  if ($LASTEXITCODE -ne 0) { throw "tar failed with exit code $LASTEXITCODE; the archive may be corrupt" }

  $extracted = Join-Path $staging "code-server-$Version-windows-amd64"
  if (-not (Test-Path (Join-Path $extracted 'code-server.cmd'))) {
    throw "extraction produced no code-server.cmd under $extracted"
  }

  # Move rather than copy: a copy doubles the disk cost for a 675 MB tree.
  if (Test-Path $target) { Remove-Item $target -Recurse -Force }
  Move-Item -Path $extracted -Destination $target
  Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue

  Write-Host "installed: $([math]::Round(((Get-ChildItem $target -Recurse -File | Measure-Object Length -Sum).Sum / 1MB), 1)) MB"
}

# ------------------------------------------------------- 4. the bridge extension
if (-not $NoBridge) {
  $installer = Join-Path $PSScriptRoot 'install-vscode-bridge.ps1'
  if (Test-Path $installer) {
    Write-Host "installing the bridge extension..."
    & $installer -DataDir (Join-Path $InstallRoot 'Data') -NoRestart
  } else {
    Write-Warning "install-vscode-bridge.ps1 not found next to this script; the plugin will not be able to open files until it is installed"
  }
}

# ----------------------------------------------------------------- 5. what now
Write-Host ""
if ($NoStart) {
  Write-Host "done. code-server is installed but not running."
  Write-Host "dsh-booster starts it on demand the first time the agent writes a file,"
  Write-Host "or run tools\start-code-server.ps1 to bring it up now."
} else {
  $starter = Join-Path $PSScriptRoot 'start-code-server.ps1'
  if (Test-Path $starter) {
    Write-Host "starting it now..."
    & $starter -InstallRoot $InstallRoot
  } else {
    Write-Host "start it with the code-server.cmd in $target"
  }
}
