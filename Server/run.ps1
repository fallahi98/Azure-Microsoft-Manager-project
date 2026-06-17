$env:ADMIN_EMAIL="fallahi98@gmail.com"
$env:SMTP_HOST="smtp.gmail.com"
$env:SMTP_PORT="587"
$env:SMTP_FROM_EMAIL="fallahi98@gmail.com"
$env:SMTP_USE_TLS="true"

Set-Location $PSScriptRoot
$logPath = Join-Path $PSScriptRoot "server.log"

$requiredSecrets = @(
    "DB_USER",
    "DB_PASSWORD",
    "ACS_CONNECTION_STRING",
    "SMTP_USERNAME",
    "SMTP_PASSWORD"
)

$missingSecrets = $requiredSecrets | Where-Object { -not [Environment]::GetEnvironmentVariable($_) }
if ($missingSecrets.Count -gt 0) {
    Write-Host "Missing required environment variables: $($missingSecrets -join ', ')" -ForegroundColor Red
    Write-Host "Set them in your user environment or in a local, untracked startup script."
    Read-Host "Press Enter to close this window"
    exit 1
}

Write-Host "Starting Flask server..." -ForegroundColor Green
Write-Host "Database driver: pymssql"
Write-Host "Server URL: http://127.0.0.1:5000/"
Write-Host "Log file: $logPath"
Write-Host ""

python app.py *>&1 | Tee-Object -FilePath $logPath

Write-Host ""
Write-Host "The Flask server stopped. Read the error message above." -ForegroundColor Yellow
Read-Host "Press Enter to close this window"
