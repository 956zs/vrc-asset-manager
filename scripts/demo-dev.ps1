param(
  [switch]$KeepData
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$demoDir = Join-Path $repoRoot ".demo-data"
$demoDirFull = [System.IO.Path]::GetFullPath($demoDir)
$repoRootFull = [System.IO.Path]::GetFullPath($repoRoot)

if (-not $demoDirFull.StartsWith($repoRootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to use demo directory outside the repository: $demoDirFull"
}

if ((Test-Path -LiteralPath $demoDirFull) -and -not $KeepData) {
  Remove-Item -LiteralPath $demoDirFull -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $demoDirFull | Out-Null

$env:VRC_ASSET_MANAGER_DEMO = "1"
$env:VRC_ASSET_MANAGER_DEMO_ROOT = $demoDirFull
$env:VRC_ASSET_MANAGER_DB_PATH = Join-Path $demoDirFull "vrc_asset_manager.sqlite3"
$env:LOCALAPPDATA = Join-Path $demoDirFull "LocalAppData"

Write-Host "Starting demo mode with isolated data:"
Write-Host "  DB: $env:VRC_ASSET_MANAGER_DB_PATH"
Write-Host "  LOCALAPPDATA: $env:LOCALAPPDATA"

npm run tauri dev
