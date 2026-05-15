$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

function Test-Url {
  param([Parameter(Mandatory = $true)][string]$Url)

  try {
    Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 | Out-Null
    return $true
  } catch {
    return $false
  }
}

Push-Location $repoRoot
try {
  Write-Host "Starting local dependencies..." -ForegroundColor Cyan
  docker compose up -d postgres

  $apiRunning = Test-Url "http://localhost:3101/api/v1/health"
  $webRunning = Test-Url "http://localhost:3000/internal/login"

  Write-Host ""
  Write-Host "Open: http://localhost:3000/internal/login" -ForegroundColor Cyan
  Write-Host "Check status: pnpm dev:status"
  Write-Host "Stop local dev node processes: pnpm dev:stop"

  if ($apiRunning -and $webRunning) {
    Write-Host ""
    Write-Host "API and Web are already running. Nothing to start." -ForegroundColor Green
    exit 0
  }

  Write-Host ""
  Write-Host "Running dev server logs in this terminal. Stop with Ctrl+C." -ForegroundColor Cyan

  if ($apiRunning) {
    Write-Host "API is already running; starting Web only." -ForegroundColor Green
    pnpm --filter @kommuneflow/web dev
    exit $LASTEXITCODE
  }

  if ($webRunning) {
    Write-Host "Web is already running; starting API only." -ForegroundColor Green
    pnpm --filter @kommuneflow/api start:dev
    exit $LASTEXITCODE
  }

  pnpm --parallel --filter @kommuneflow/api --filter @kommuneflow/web dev
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
