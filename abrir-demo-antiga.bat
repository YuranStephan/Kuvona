@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala o Node.js 22 ou superior para abrir a demonstracao antiga.
  pause
  exit /b 1
)
node scripts/open.mjs
if errorlevel 1 pause
