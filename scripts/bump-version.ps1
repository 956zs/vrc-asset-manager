param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Version
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Fail($Message) {
  Write-Host "[version-bump] ERROR: $Message" -ForegroundColor Red
  exit 1
}

function Read-Text($Path) {
  if (-not (Test-Path $Path)) {
    Fail "File was not found: $Path"
  }

  return [System.IO.File]::ReadAllText($Path)
}

function Write-Text($Path, $Content) {
  $encoding = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Replace-CapturedValue($Text, $Pattern, $Value, $Name) {
  $options = [System.Text.RegularExpressions.RegexOptions]::Singleline -bor
    [System.Text.RegularExpressions.RegexOptions]::Multiline
  $regex = New-Object System.Text.RegularExpressions.Regex $Pattern, $options
  $match = $regex.Match($Text)

  if (-not $match.Success -or $match.Groups.Count -lt 4) {
    Fail "Could not update $Name."
  }

  return $Text.Substring(0, $match.Groups[2].Index) +
    $Value +
    $Text.Substring($match.Groups[2].Index + $match.Groups[2].Length)
}

function Replace-VersionExamples($Text, $Version, $Tag) {
  $Text = [regex]::Replace(
    $Text,
    '(npm run version:bump -- )v?[0-9A-Za-z.+-]+',
    "`${1}$Version"
  )

  return [regex]::Replace(
    $Text,
    '(npm run release:(?:check|local) -- -Tag )v[0-9A-Za-z.+-]+',
    "`${1}$Tag"
  )
}

function Get-CargoPackageName($CargoToml) {
  $match = [regex]::Match(
    $CargoToml,
    '(?ms)^\[package\]\s*.*?^name\s*=\s*"([^"]+)"'
  )

  if (-not $match.Success) {
    Fail "Could not read package name from src-tauri/Cargo.toml."
  }

  return $match.Groups[1].Value
}

if ($Version.StartsWith("v")) {
  $Version = $Version.Substring(1)
}

if ($Version -notmatch '^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$') {
  Fail "Version must be semver, for example 0.1.0 or 0.1.0-beta.6. Received: $Version"
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$tag = "v$Version"
$badgeVersion = $Version.Replace("-", "--").Replace("_", "__")

$packageJsonPath = Join-Path $RepoRoot "package.json"
$packageLockPath = Join-Path $RepoRoot "package-lock.json"
$tauriConfigPath = Join-Path $RepoRoot "src-tauri\tauri.conf.json"
$cargoTomlPath = Join-Path $RepoRoot "src-tauri\Cargo.toml"
$cargoLockPath = Join-Path $RepoRoot "src-tauri\Cargo.lock"
$readmePath = Join-Path $RepoRoot "README.md"
$updaterDocPath = Join-Path $RepoRoot "docs\github-releases-updater.md"

$packageJson = Read-Text $packageJsonPath
$packageJson = Replace-CapturedValue $packageJson '(?m)^(\s*"version"\s*:\s*")([^"]+)(")' $Version "package.json version"
Write-Text $packageJsonPath $packageJson

$packageLock = Read-Text $packageLockPath
$packageLock = Replace-CapturedValue $packageLock '(?ms)^(\s*\{\s*"name"\s*:\s*"[^"]+"\s*,\s*"version"\s*:\s*")([^"]+)(")' $Version "package-lock.json top-level version"
$packageLock = Replace-CapturedValue $packageLock '(?ms)("packages"\s*:\s*\{\s*""\s*:\s*\{\s*"name"\s*:\s*"[^"]+"\s*,\s*"version"\s*:\s*")([^"]+)(")' $Version "package-lock.json root package version"
Write-Text $packageLockPath $packageLock

$tauriConfig = Read-Text $tauriConfigPath
$tauriConfig = Replace-CapturedValue $tauriConfig '(?m)^(\s*"version"\s*:\s*")([^"]+)(")' $Version "src-tauri/tauri.conf.json version"
Write-Text $tauriConfigPath $tauriConfig

$cargoToml = Read-Text $cargoTomlPath
$cargoPackageName = Get-CargoPackageName $cargoToml
$cargoToml = Replace-CapturedValue $cargoToml '(?ms)(^\[package\]\s*.*?^version\s*=\s*")([^"]+)(")' $Version "src-tauri/Cargo.toml package version"
Write-Text $cargoTomlPath $cargoToml

$cargoLock = Read-Text $cargoLockPath
$escapedCargoPackageName = [regex]::Escape($cargoPackageName)
$cargoLock = Replace-CapturedValue $cargoLock "(?ms)(\[\[package\]\]\s*name\s*=\s*`"$escapedCargoPackageName`"\s*version\s*=\s*`")([^`"]+)(`")" $Version "src-tauri/Cargo.lock package version"
Write-Text $cargoLockPath $cargoLock

if (Test-Path $readmePath) {
  $readme = Read-Text $readmePath
  $readme = Replace-CapturedValue $readme '(https://img\.shields\.io/badge/release-)(.*?)(-0ea5e9\?style=flat-square)' $badgeVersion "README release badge"
  $readme = Replace-VersionExamples $readme $Version $tag
  Write-Text $readmePath $readme
}

if (Test-Path $updaterDocPath) {
  $updaterDoc = Read-Text $updaterDocPath
  $updaterDoc = Replace-VersionExamples $updaterDoc $Version $tag
  Write-Text $updaterDocPath $updaterDoc
}

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "scripts\check-release-version.ps1") -Tag $tag
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "[version-bump] Updated project version to $Version."
