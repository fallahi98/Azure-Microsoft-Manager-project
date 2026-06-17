@echo off
set ROOT=%~dp0

start "Flask Server" cmd /k call "%ROOT%Server\start-server.bat"
timeout /t 2 /nobreak >nul

start "React Client" cmd /k call "%ROOT%Client\start-client.bat"
timeout /t 8 /nobreak >nul

start "" "http://127.0.0.1:5000/"
start "" "http://127.0.0.1:5188/"
