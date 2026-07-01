param(
  [string]$Tag,
  [switch]$Artifacts,
  [string]$Repo = "956zs/vrc-asset-manager",
  [string]$BundleDir,
  [string]$InstallerPath,
  [string]$LatestJsonPath
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

function Assert-Equals($Name, $Actual, $Expected) {
  if ([string]$Actual -ne [string]$Expected) {
    Fail "$Name '$Actual' does not match expected '$Expected'."
  }
}

function Assert-NonEmptyFile($Path, $Name) {
  if (-not (Test-Path $Path)) {
    Fail "$Name was not found: $Path"
  }

  if ((Get-Item $Path).Length -le 0) {
    Fail "$Name is empty: $Path"
  }
}

function Get-JsonProperty($Value, $Name) {
  $property = $Value.PSObject.Properties[$Name]
  if (-not $property) {
    return $null
  }

  return $property.Value
}

function Get-GitHubReleaseAssetName($Name) {
  # ponytail: GitHub release assets in this repo normalize spaces to dots; query release assets if naming changes.
  return $Name -replace '\s+', '.'
}

function Assert-UpdaterArtifacts($RepoRoot, $Repo, $Tag, $Version, $BundleDir, $InstallerPath, $LatestJsonPath) {
  if (-not $BundleDir) {
    $BundleDir = Join-Path $RepoRoot "src-tauri\target\release\bundle\nsis"
  }

  if (-not (Test-Path $BundleDir)) {
    Fail "Bundle directory was not found: $BundleDir"
  }

  if (-not $InstallerPath) {
    $installer = Get-ChildItem -Path $BundleDir -Filter "*.exe" |
      Where-Object { $_.Name -like "*$Version*" -and $_.Name -like "*setup.exe" } |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1

    if (-not $installer) {
      Fail "Could not find an NSIS setup.exe for version $Version in $BundleDir."
    }

    $InstallerPath = $installer.FullName
  }

  if (-not $LatestJsonPath) {
    $LatestJsonPath = Join-Path $BundleDir "latest.json"
  }

  $signaturePath = "$InstallerPath.sig"

  Assert-NonEmptyFile $InstallerPath "Installer"
  Assert-NonEmptyFile $signaturePath "Installer signature"
  Assert-NonEmptyFile $LatestJsonPath "Updater metadata"

  $bytes = [System.IO.File]::ReadAllBytes($LatestJsonPath)
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    Fail "latest.json must be UTF-8 without BOM."
  }

  $latest = Read-Json $LatestJsonPath
  Assert-Version "latest.json" (Get-JsonProperty $latest "version") $Version

  $platforms = Get-JsonProperty $latest "platforms"
  if (-not $platforms) {
    Fail "latest.json is missing platforms."
  }

  $platform = Get-JsonProperty $platforms "windows-x86_64"
  if (-not $platform) {
    Fail "latest.json is missing platforms.windows-x86_64."
  }

  $signature = (Get-Content $signaturePath -Raw).Trim()
  if ([string]::IsNullOrWhiteSpace($signature)) {
    Fail "Installer signature file is blank: $signaturePath"
  }

  Assert-Equals "latest.json signature" ([string](Get-JsonProperty $platform "signature")).Trim() $signature

  $platformUrl = Get-JsonProperty $platform "url"
  if ([string]::IsNullOrWhiteSpace([string]$platformUrl)) {
    Fail "latest.json platform URL is missing."
  }

  $installerName = Get-GitHubReleaseAssetName (Split-Path $InstallerPath -Leaf)
  $expectedUrl = "https://github.com/$Repo/releases/download/$Tag/$([System.Uri]::EscapeDataString($installerName))"
  Assert-Equals "latest.json platform URL" $platformUrl $expectedUrl

  $pubDate = Get-JsonProperty $latest "pub_date"
  if ($pubDate) {
    try {
      [void][DateTimeOffset]::Parse([string]$pubDate)
    } catch {
      Fail "latest.json pub_date is not a valid timestamp: $pubDate"
    }
  }

  if ($Tag -match "-(beta|rc|alpha|dev|preview)") {
    Write-Host "[release-version] INFO: $Tag is prerelease; GitHub /releases/latest will not serve it." -ForegroundColor Yellow
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

if ($Artifacts) {
  Assert-UpdaterArtifacts $RepoRoot $Repo $Tag $tagVersion $BundleDir $InstallerPath $LatestJsonPath
}

Write-Host "[release-version] OK: $Tag matches package, Tauri, and Cargo versions."
