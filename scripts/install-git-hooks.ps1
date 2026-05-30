Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

git config core.hooksPath .githooks
if ($LASTEXITCODE -ne 0) {
  throw "[install-git-hooks] Failed to configure core.hooksPath."
}

Write-Host "[install-git-hooks] Git hooks enabled from .githooks"
