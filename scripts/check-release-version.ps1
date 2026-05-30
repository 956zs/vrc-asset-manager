param(
  [string]$Tag
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Fail($Message) {
  Write-Host "[release-version] ERROR: $Message" -ForegroundColor Red
  exit 1
}

function Read-Json($Path) {
  if (-not (Test-Path $Path)) {
    Fail "File was not found: $Path"
  }

  return Get-Content $Path -Raw | ConvertFrom-Json
}

function Assert-Version($Name, $Actual, $Expected) {
  if ([string]::IsNullOrWhiteSpace([string]$Actual)) {
    Fail "$Name version is missing."
  }

  if ([string]$Actual -ne $Expected) {
    Fail "$Name version '$Actual' does not match tag version '$Expected'."
  }
}

function Get-PackageLockTopVersion($LockText) {
  $versionMatch = [regex]::Match(
    $LockText,
    '(?ms)^\s*\{\s*"name"\s*:\s*"[^"]+"\s*,\s*"version"\s*:\s*"([^"]+)"'
  )

  if (-not $versionMatch.Success) {
    Fail "package-lock.json top-level version was not found."
  }

  return $versionMatch.Groups[1].Value
}

function Get-PackageLockRootVersion($LockText) {
  $versionMatch = [regex]::Match(
    $LockText,
    '(?ms)"packages"\s*:\s*\{\s*""\s*:\s*\{.*?"version"\s*:\s*"([^"]+)"'
  )

  if (-not $versionMatch.Success) {
    Fail "package-lock.json packages[''] version was not found."
  }

  return $versionMatch.Groups[1].Value
}

function Get-TomlPackageField($TomlText, $FieldName) {
  $packageSection = [regex]::Match($TomlText, '(?ms)^\[package\]\s*(.*?)(?=^\[|\z)')
  if (-not $packageSection.Success) {
    Fail "src-tauri/Cargo.toml is missing a [package] section."
  }

  $fieldMatch = [regex]::Match(
    $packageSection.Groups[1].Value,
    "(?m)^$([regex]::Escape($FieldName))\s*=\s*`"([^`"]+)`""
  )

  if (-not $fieldMatch.Success) {
    Fail "src-tauri/Cargo.toml is missing package field '$FieldName'."
  }

  return $fieldMatch.Groups[1].Value
}

function Get-CargoLockPackageVersion($CargoLockText, $PackageName) {
  $packageMatches = [regex]::Matches($CargoLockText, '(?ms)^\[\[package\]\]\s*(.*?)(?=^\[\[package\]\]|\z)')

  foreach ($packageMatch in $packageMatches) {
    $section = $packageMatch.Groups[1].Value
    $nameMatch = [regex]::Match($section, '(?m)^name\s*=\s*"([^"]+)"')

    if ($nameMatch.Success -and $nameMatch.Groups[1].Value -eq $PackageName) {
      $versionMatch = [regex]::Match($section, '(?m)^version\s*=\s*"([^"]+)"')
      if (-not $versionMatch.Success) {
        Fail "src-tauri/Cargo.lock package '$PackageName' is missing a version."
      }

      return $versionMatch.Groups[1].Value
    }
  }

  Fail "src-tauri/Cargo.lock is missing package '$PackageName'."
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

$package = Read-Json (Join-Path $RepoRoot "package.json")
$packageVersion = [string]$package.version
if ([string]::IsNullOrWhiteSpace($packageVersion)) {
  Fail "package.json version is missing."
}

if (-not $Tag -and $env:RELEASE_TAG) {
  $Tag = $env:RELEASE_TAG
}

if (-not $Tag) {
  $Tag = "v$packageVersion"
}

if ($Tag -match '^refs/tags/(.+)$') {
  $Tag = $Matches[1]
}

if ($Tag -notmatch '^v\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$') {
  Fail "Tag must be a semver tag like v0.1.0 or v0.1.0-beta.1. Received: $Tag"
}

$tagVersion = $Tag.Substring(1)

Assert-Version "package.json" $packageVersion $tagVersion

$packageLock = Get-Content (Join-Path $RepoRoot "package-lock.json") -Raw
Assert-Version "package-lock.json" (Get-PackageLockTopVersion $packageLock) $tagVersion
Assert-Version "package-lock.json packages['']" (Get-PackageLockRootVersion $packageLock) $tagVersion

$tauri = Read-Json (Join-Path $RepoRoot "src-tauri\tauri.conf.json")
Assert-Version "src-tauri/tauri.conf.json" ([string]$tauri.version) $tagVersion

$cargoToml = Get-Content (Join-Path $RepoRoot "src-tauri\Cargo.toml") -Raw
$cargoPackageName = Get-TomlPackageField $cargoToml "name"
Assert-Version "src-tauri/Cargo.toml" (Get-TomlPackageField $cargoToml "version") $tagVersion

$cargoLock = Get-Content (Join-Path $RepoRoot "src-tauri\Cargo.lock") -Raw
Assert-Version "src-tauri/Cargo.lock package '$cargoPackageName'" (Get-CargoLockPackageVersion $cargoLock $cargoPackageName) $tagVersion

Write-Host "[release-version] OK: $Tag matches package, Tauri, and Cargo versions."
