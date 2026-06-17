@echo off
cd /d "%~dp0"

set "DB_SERVER=aminsproject.database.windows.net"
set "DB_PORT=1433"
set "DB_NAME=aminsproject"

set "ACS_SMS_FROM_PHONE=+16302002405"

set "ADMIN_EMAIL=fallahi98@gmail.com"
set "SMTP_HOST=smtp.gmail.com"
set "SMTP_PORT=587"
set "SMTP_FROM_EMAIL=fallahi98@gmail.com"
set "SMTP_USE_TLS=true"

if "%DB_USER%"=="" (
    echo Missing DB_USER environment variable.
    goto :missing_config
)

if "%DB_PASSWORD%"=="" (
    echo Missing DB_PASSWORD environment variable.
    goto :missing_config
)

if "%ACS_CONNECTION_STRING%"=="" (
    echo Missing ACS_CONNECTION_STRING environment variable.
    goto :missing_config
)

if "%SMTP_USERNAME%"=="" (
    echo Missing SMTP_USERNAME environment variable.
    goto :missing_config
)

if "%SMTP_PASSWORD%"=="" (
    echo Missing SMTP_PASSWORD environment variable.
    goto :missing_config
)

echo Starting Flask server...
echo Database driver: pymssql
echo Server URL: http://127.0.0.1:5000/
echo.

python app.py

echo.
echo The Flask server stopped. Read the error message above.
pause
exit /b

:missing_config
echo.
echo Set the missing secret in your user environment or in a local, untracked startup script.
pause
exit /b 1
