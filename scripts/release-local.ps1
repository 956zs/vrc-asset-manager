param(
  [string]$Tag,
  [string]$Repo = "956zs/vrc-asset-manager",
  [string]$PrivateKeyPath = "$env:USERPROFILE\.tauri\vrc-asset-manager.key",
  [string]$PrivateKeyPassword,
  [string]$Notes = "Draft local build. Run smoke checks before publishing this release.",
  [switch]$SkipBuild,
  [switch]$Clobber
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Fail($Message) {
  throw "[release-local] $Message"
}

function Invoke-Step($Command, $Arguments) {
  Write-Host ">> $Command $($Arguments -join ' ')" -ForegroundColor Cyan
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    Fail "Command failed: $Command $($Arguments -join ' ')"
  }
}

function Resolve-Gh {
  $cmd = Get-Command gh -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $candidates = @(
    "C:\Program Files\GitHub CLI\gh.exe",
    "C:\Program Files (x86)\GitHub CLI\gh.exe",
    "$env:LOCALAPPDATA\GitHub CLI\gh.exe",
    "$env:LOCALAPPDATA\Programs\GitHub CLI\gh.exe"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  Fail "GitHub CLI was not found. Install gh or add it to PATH."
}

function Read-Json($Path) {
  return Get-Content $Path -Raw | ConvertFrom-Json
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

$gh = Resolve-Gh
Invoke-Step $gh @("auth", "status")

$package = Read-Json (Join-Path $RepoRoot "package.json")
$tauri = Read-Json (Join-Path $RepoRoot "src-tauri\tauri.conf.json")
$cargoToml = Get-Content (Join-Path $RepoRoot "src-tauri\Cargo.toml") -Raw

$version = [string]$package.version
if (-not $Tag) {
  $Tag = "v$version"
}

if ($Tag -notmatch "^v") {
  Fail "Tag must start with 'v'. Received: $Tag"
}

$tagVersion = $Tag.Substring(1)
if ($tagVersion -ne $version) {
  Fail "Tag $Tag does not match package.json version $version."
}

if ([string]$tauri.version -ne $version) {
  Fail "src-tauri/tauri.conf.json version $($tauri.version) does not match package.json version $version."
}

if ($cargoToml -notmatch "version\s*=\s*`"$([regex]::Escape($version))`"") {
  Fail "src-tauri/Cargo.toml version does not match package.json version $version."
}

$dirty = git status --porcelain
if ($dirty) {
  Fail "Working tree is not clean. Commit or stash changes before creating a release."
}

if (-not $env:TAURI_SIGNING_PRIVATE_KEY -and -not $env:TAURI_SIGNING_PRIVATE_KEY_PATH) {
  if (-not (Test-Path $PrivateKeyPath)) {
    Fail "Signing key was not found: $PrivateKeyPath"
  }

  $env:TAURI_SIGNING_PRIVATE_KEY_PATH = (Resolve-Path $PrivateKeyPath).Path
}

if ($PSBoundParameters.ContainsKey("PrivateKeyPassword")) {
  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $PrivateKeyPassword
} elseif ($null -eq $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
}

$remoteTag = git ls-remote --tags origin "refs/tags/$Tag"
if (-not $remoteTag) {
  $localTag = git tag --list $Tag
  if (-not $localTag) {
    Invoke-Step "git" @("tag", $Tag)
  }

  Invoke-Step "git" @("push", "origin", $Tag)
}

if (-not $SkipBuild) {
  Invoke-Step "npm" @("run", "tauri", "build", "--", "--bundles", "nsis")
}

$bundleDir = Join-Path $RepoRoot "src-tauri\target\release\bundle\nsis"
if (-not (Test-Path $bundleDir)) {
  Fail "NSIS bundle directory was not found: $bundleDir"
}

$installer = Get-ChildItem -Path $bundleDir -Filter "*.exe" |
  Where-Object { $_.Name -like "*$version*" -and $_.Name -like "*setup.exe" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $installer) {
  Fail "Could not find an NSIS installer for version $version in $bundleDir."
}

$signaturePath = "$($installer.FullName).sig"
if (-not (Test-Path $signaturePath)) {
  Fail "Could not find installer signature: $signaturePath"
}

$signature = (Get-Content $signaturePath -Raw).Trim()
$encodedInstallerName = [System.Uri]::EscapeDataString($installer.Name)
$downloadUrl = "https://github.com/$Repo/releases/download/$Tag/$encodedInstallerName"
$latestJsonPath = Join-Path $bundleDir "latest.json"

$latest = [ordered]@{
  version = $version
  notes = $Notes
  pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  platforms = [ordered]@{
    "windows-x86_64" = [ordered]@{
      signature = $signature
      url = $downloadUrl
    }
  }
}

$latest | ConvertTo-Json -Depth 10 | Set-Content -Path $latestJsonPath -Encoding utf8

$releaseExists = $true
& $gh release view $Tag --repo $Repo *> $null
if ($LASTEXITCODE -ne 0) {
  $releaseExists = $false
}

$isPrerelease = $Tag -match "-(beta|rc)"
$assetPaths = @($installer.FullName, $signaturePath, $latestJsonPath)

if ($releaseExists) {
  if (-not $Clobber) {
    Fail "Release $Tag already exists. Re-run with -Clobber to replace assets."
  }

  Invoke-Step $gh (@("release", "upload", $Tag) + $assetPaths + @("--repo", $Repo, "--clobber"))
} else {
  $args = @(
    "release", "create", $Tag
  ) + $assetPaths + @(
    "--repo", $Repo,
    "--draft",
    "--verify-tag",
    "--title", "$($tauri.productName) $Tag",
    "--notes", $Notes
  )

  if ($isPrerelease) {
    $args += @("--prerelease", "--latest=false")
  }

  Invoke-Step $gh $args
}

Write-Host ""
Write-Host "Local draft release is ready:" -ForegroundColor Green
Write-Host "  Tag: $Tag"
Write-Host "  Installer: $($installer.FullName)"
Write-Host "  Updater JSON: $latestJsonPath"
Write-Host "  Release: https://github.com/$Repo/releases/tag/$Tag"
