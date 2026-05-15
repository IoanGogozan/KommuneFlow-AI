$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$processes = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
  Where-Object {
    $_.CommandLine -like "*$repoRoot*" -and (
      $_.CommandLine -like "*@kommuneflow/api*" -or
      $_.CommandLine -like "*@kommuneflow/web*" -or
      $_.CommandLine -like "*apps\api*" -or
      $_.CommandLine -like "*apps\web*" -or
      $_.CommandLine -like "*next*" -or
      $_.CommandLine -like "*nest*"
    )
  }

if (-not $processes) {
  Write-Host "No KommuneFlow dev node processes found."
  exit 0
}

foreach ($process in $processes) {
  Write-Host ("Stopping pid {0}" -f $process.ProcessId)
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host "Stopped KommuneFlow dev node processes."
