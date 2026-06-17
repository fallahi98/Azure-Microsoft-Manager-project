@echo off
cd /d "%~dp0"

echo Starting React client...
echo Client URL: http://127.0.0.1:5188/
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "npm run dev -- --host 127.0.0.1 --port 5188 --strictPort"

echo.
echo The React client stopped. Read the error message above.
pause
