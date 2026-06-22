Set-Location $PSScriptRoot
$logPath = Join-Path $PSScriptRoot "server.log"
$credentialsPath = Join-Path $PSScriptRoot "credentials.local.ps1"

function Read-RequiredValue {
    param(
        [string]$Name,
        [string]$Prompt,
        [switch]$Secret
    )

    $currentValue = [Environment]::GetEnvironmentVariable($Name)
    if ($currentValue) {
        return
    }

    if ($Secret) {
        $secureValue = Read-Host $Prompt -AsSecureString
        $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
        )
        Set-Item -Path "Env:$Name" -Value $plainValue
        return
    }

    Set-Item -Path "Env:$Name" -Value (Read-Host $Prompt)
}

if (Test-Path $credentialsPath) {
    . $credentialsPath
}

$env:DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } elseif ($env:DB_SERVER) { $env:DB_SERVER } else { "localhost" }
$env:DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$env:DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "client_manager" }
$env:SMS_GATEWAY_DOMAIN = if ($env:SMS_GATEWAY_DOMAIN) { $env:SMS_GATEWAY_DOMAIN } else { "vtext.com" }
$env:ADMIN_EMAIL = if ($env:ADMIN_EMAIL) { $env:ADMIN_EMAIL } else { "fallahi98@gmail.com" }
$env:SMTP_HOST = if ($env:SMTP_HOST) { $env:SMTP_HOST } else { "smtp.gmail.com" }
$env:SMTP_PORT = if ($env:SMTP_PORT) { $env:SMTP_PORT } else { "587" }
$env:SMTP_FROM_EMAIL = if ($env:SMTP_FROM_EMAIL) { $env:SMTP_FROM_EMAIL } else { "fallahi98@gmail.com" }
$env:SMTP_USE_TLS = if ($env:SMTP_USE_TLS) { $env:SMTP_USE_TLS } else { "true" }

Write-Host "Credential login" -ForegroundColor Cyan
Write-Host "Using: $credentialsPath"
Write-Host ""

Read-RequiredValue -Name "DB_USER" -Prompt "Database username"
Read-RequiredValue -Name "DB_PASSWORD" -Prompt "Database password" -Secret
Read-RequiredValue -Name "SMTP_USERNAME" -Prompt "SMTP username"
Read-RequiredValue -Name "SMTP_PASSWORD" -Prompt "SMTP password" -Secret

Write-Host "Starting Flask server..." -ForegroundColor Green
Write-Host "Database driver: psycopg2 / PostgreSQL"
Write-Host "SMS gateway: $env:SMS_GATEWAY_DOMAIN"
Write-Host "Server URL: http://127.0.0.1:5000/"
Write-Host "Log file: $logPath"
Write-Host ""

python app.py *>&1 | Tee-Object -FilePath $logPath

Write-Host ""
Write-Host "The Flask server stopped. Read the error message above." -ForegroundColor Yellow
Read-Host "Press Enter to close this window"
