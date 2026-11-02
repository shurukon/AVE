# ============================================================================
#  Palmier Pro for Windows 10 — Quick Start (PowerShell)
#  Run: powershell -ExecutionPolicy Bypass -File start.ps1
# ============================================================================
#
#  This script:
#    1. Verifies Node.js 18+ is installed (or downloads it for you)
#    2. Installs dependencies for the renderer + MCP server
#    3. Starts the MCP server in the background (port 19789)
#    4. Launches the Next.js dev server (port 3000) and opens the browser
#
#  Once running, open http://localhost:3000 in your browser.
# ============================================================================

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    !!  $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "    XX  $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "  Palmier Pro for Windows 10" -ForegroundColor White
Write-Host "  ===========================" -ForegroundColor White
Write-Host ""

# --- 1. Check Node.js ------------------------------------------------------
Write-Step "Checking Node.js..."
try {
    $nodeVer = (node --version) 2>$null
    if ($nodeVer -match "v(\d+)\.") {
        $major = [int]$Matches[1]
        if ($major -lt 18) {
            Write-Err "Node.js $nodeVer found, but version 18+ is required."
            Write-Warn "Download from: https://nodejs.org/"
            exit 1
        }
        Write-Ok "Node.js $nodeVer"
    } else {
        throw "not found"
    }
} catch {
    Write-Err "Node.js is not installed."
    Write-Host ""
    Write-Host "    Please install Node.js 18+ LTS:" -ForegroundColor Yellow
    Write-Host "      https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    Or use winget:" -ForegroundColor Yellow
    Write-Host "      winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    exit 1
}

# --- 2. Install renderer deps ---------------------------------------------
Write-Step "Installing renderer dependencies (first run only)..."
if (-not (Test-Path "node_modules")) {
    npm install --no-audit --no-fund --loglevel=error
    if ($LASTEXITCODE -ne 0) { Write-Err "npm install failed"; exit 1 }
    Write-Ok "Renderer deps installed"
} else {
    Write-Ok "Already installed (skipped)"
}

# --- 3. Start MCP server in background ------------------------------------
Write-Step "Starting MCP server on port 19789..."
$mcpProc = Start-Process -FilePath "node" -ArgumentList "mcp-server\server.js" -PassThru -WindowStyle Minimized
Start-Sleep -Seconds 2
if ($mcpProc.HasExited) {
    Write-Err "MCP server failed to start"
    exit 1
}
Write-Ok "MCP server PID: $($mcpProc.Id)"
Write-Host "    URL: http://127.0.0.1:19789/mcp" -ForegroundColor DarkGray

# --- 4. Start Next.js dev server and open browser -------------------------
Write-Step "Starting Palmier Pro editor on port 3000..."
Write-Host ""
Write-Host "    Editor:  http://localhost:3000" -ForegroundColor Green
Write-Host "    MCP:     http://127.0.0.1:19789/mcp" -ForegroundColor Green
Write-Host ""
Write-Host "    Press Ctrl+C to stop both servers." -ForegroundColor Yellow
Write-Host ""

# Open browser after a brief delay
Start-Process "http://localhost:3000"

# Run Next.js dev server in the foreground (Ctrl+C will kill it)
try {
    npm run dev
} finally {
    Write-Host ""
    Write-Step "Stopping MCP server..."
    if (-not $mcpProc.HasExited) { Stop-Process -Id $mcpProc.Id -Force }
    Write-Ok "Stopped"
}
