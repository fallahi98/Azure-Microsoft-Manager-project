$rootPath = $PSScriptRoot
$serverPath = Join-Path $rootPath "Server"
$clientPath = Join-Path $rootPath "Client"
$serverRunScript = Join-Path $serverPath "start-server.bat"
$clientRunScript = Join-Path $clientPath "start-client.bat"

Start-Process cmd.exe -WorkingDirectory $serverPath -ArgumentList @("/k", $serverRunScript)

Start-Sleep -Seconds 2

Start-Process cmd.exe -WorkingDirectory $clientPath -ArgumentList @("/k", $clientRunScript)

for ($attempt = 1; $attempt -le 20; $attempt++) {
    try {
        Invoke-WebRequest -Uri "http://127.0.0.1:5000/" -UseBasicParsing -TimeoutSec 1 | Out-Null
        break
    }
    catch {
        Start-Sleep -Seconds 1
    }
}

for ($attempt = 1; $attempt -le 20; $attempt++) {
    try {
        Invoke-WebRequest -Uri "http://127.0.0.1:5188/" -UseBasicParsing -TimeoutSec 1 | Out-Null
        break
    }
    catch {
        Start-Sleep -Seconds 1
    }
}

Start-Sleep -Seconds 2

Start-Process "http://127.0.0.1:5000/"
Start-Process "http://127.0.0.1:5188/"
