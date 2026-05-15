$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

function Test-Url {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    Write-Host ("{0}: running ({1})" -f $Name, $response.StatusCode) -ForegroundColor Green
  } catch {
    Write-Host ("{0}: not responding" -f $Name) -ForegroundColor Yellow
  }
}

function Show-Port {
  param([Parameter(Mandatory = $true)][int]$Port)

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    Write-Host ("port {0}: free" -f $Port)
    return
  }

  foreach ($connection in $connections) {
    $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
    $processName = if ($process) { $process.ProcessName } else { "unknown" }
    Write-Host ("port {0}: pid {1} ({2})" -f $Port, $connection.OwningProcess, $processName)
  }
}

Push-Location $repoRoot
try {
  Write-Host "KommuneFlow local status" -ForegroundColor Cyan
  Write-Host ""

  Test-Url -Name "web" -Url "http://localhost:3000/internal/login"
  Test-Url -Name "api" -Url "http://localhost:3101/api/v1/health"

  Write-Host ""
  Show-Port -Port 3000
  Show-Port -Port 3101
  Show-Port -Port 5434

  Write-Host ""
  docker compose ps postgres

  Write-Host ""
  $processes = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
    Where-Object { $_.CommandLine -like "*$repoRoot*" } |
    Select-Object ProcessId, CommandLine

  if ($processes) {
    Write-Host "repo node processes:"
    $processes | Format-Table -AutoSize
  } else {
    Write-Host "repo node processes: none"
  }
} finally {
  Pop-Location
}
