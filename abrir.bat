@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo A Academia Kuvona precisa do Node.js 22 ou superior.
  echo Instala o Node.js e volta a abrir este ficheiro.
  pause
  exit /b 1
)
node platform/scripts/launch.mjs
if errorlevel 1 pause
