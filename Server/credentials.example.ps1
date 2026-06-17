# Copy this file to credentials.local.ps1 and fill in your real values.
# credentials.local.ps1 is ignored by Git so secrets stay local.

$env:DB_SERVER="aminsproject.database.windows.net"
$env:DB_PORT="1433"
$env:DB_NAME="aminsproject"
$env:DB_USER="your-database-user"
$env:DB_PASSWORD="your-database-password"

$env:ACS_CONNECTION_STRING="endpoint=https://your-resource.communication.azure.com/;accesskey=your-access-key"
$env:ACS_SMS_FROM_PHONE="+10000000000"

$env:ADMIN_EMAIL="you@example.com"
$env:SMTP_HOST="smtp.gmail.com"
$env:SMTP_PORT="587"
$env:SMTP_USERNAME="you@example.com"
$env:SMTP_PASSWORD="your-smtp-app-password"
$env:SMTP_FROM_EMAIL="you@example.com"
$env:SMTP_USE_TLS="true"
