@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\" (
  echo Installing game dependencies...
  call npm install
  if errorlevel 1 goto :error
)
echo Starting LAST EMBER...
call npm run dev -- --port 4173 --open
goto :eof

:error
echo.
echo Failed to install dependencies. Check that Node.js is installed.
pause
