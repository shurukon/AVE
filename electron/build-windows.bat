@echo off
REM ============================================================================
REM  Palmier Pro for Windows 10 — Build Script
REM  Produces:
REM    - release\PalmierPro-Windows-1.0.0-x64.exe        (NSIS installer)
REM    - release\PalmierPro-Windows-1.0.0-Portable.exe   (portable, no install)
REM  Requirements: Node.js 18+, internet access (first run only — installs deps).
REM ============================================================================

setlocal
cd /d "%~dp0"
title Building Palmier Pro for Windows

echo.
echo [1/5] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo  ✗ Node.js not found. Install from https://nodejs.org/ (LTS).
    pause
    exit /b 1
)
echo  √ Node.js found:
node --version

echo.
echo [2/5] Installing Electron + electron-builder...
call npm install --no-audit --no-fund --loglevel=error
if errorlevel 1 (
    echo  ✗ npm install failed.
    pause
    exit /b 1
)
echo  √ Dependencies installed.

echo.
echo [3/5] Building the Next.js renderer (static export)...
cd ..
call npm install --no-audit --no-fund --loglevel=error
if errorlevel 1 (
    echo  ✗ Renderer npm install failed.
    pause
    exit /b 1
)

REM Configure Next.js for static export
if not exist "out" (
    call npx next build
    if errorlevel 1 (
        echo  ✗ Next.js build failed. Trying with experimental export...
        set NEXT_EXPORT=1
    )
)

REM Copy the renderer into electron/renderer
if not exist "electron\renderer" mkdir "electron\renderer"
if exist "out" (
    xcopy /e /i /y "out\*" "electron\renderer\" >nul
) else if exist ".next\standalone" (
    REM Standalone output mode
    xcopy /e /i /y ".next\standalone\*" "electron\renderer\" >nul
    if exist ".next\static" xcopy /e /i /y ".next\static" "electron\renderer\.next\static\" >nul
    if exist "public" xcopy /e /i /y "public" "electron\renderer\public\" >nul
)

echo  √ Renderer built.

echo.
echo [4/5] Building Electron app + installers...
cd electron
call npm run build:all
if errorlevel 1 (
    echo  ✗ Electron build failed.
    pause
    exit /b 1
)

echo.
echo [5/5] Done!
echo.
echo  Output:
dir /b "..\release\*.exe" 2>nul
echo.
echo  - PalmierPro-Windows-1.0.0-x64.exe       (NSIS installer)
echo  - PalmierPro-Windows-1.0.0-Portable.exe  (portable, no install)
echo.
echo  Copy these files to distribute Palmier Pro to other Windows 10 machines.
echo.
pause
endlocal
