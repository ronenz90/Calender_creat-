# מחולל לוחות שנה - Open Calendar Editor
# PowerShell script to start local server and open Chrome

$ErrorActionPreference = "Stop"

# Get the directory where this script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  מחולל לוחות שנה - Hebrew Calendar Designer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting local server..." -ForegroundColor Yellow

# Check if Python is available
$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonCmd = "py"
}

if (-not $pythonCmd) {
    Write-Host "ERROR: Python is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Python from https://www.python.org/downloads/" -ForegroundColor Red
    Write-Host "Make sure to check 'Add Python to PATH' during installation." -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Port to use
$Port = 8080
$Url = "http://localhost:$Port"

# Check if port is already in use
$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "Port $Port is already in use. Trying to open the site anyway..." -ForegroundColor Yellow
} else {
    # Start the HTTP server in a new minimized window
    Write-Host "Starting Python HTTP server on port $Port ..." -ForegroundColor Green
    $serverArgs = "-m http.server $Port"
    Start-Process -FilePath $pythonCmd -ArgumentList $serverArgs -WorkingDirectory $ScriptDir -WindowStyle Minimized
    Start-Sleep -Seconds 1.5
}

# Open Chrome (or default browser if Chrome not found)
Write-Host "Opening Chrome..." -ForegroundColor Green

$chromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:LocalAppData}\Google\Chrome\Application\chrome.exe"
)

$chromeFound = $false
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        Start-Process -FilePath $path -ArgumentList "--new-window", $Url
        $chromeFound = $true
        break
    }
}

if (-not $chromeFound) {
    Write-Host "Chrome not found. Opening default browser..." -ForegroundColor Yellow
    Start-Process $Url
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Server is running at: $Url" -ForegroundColor Green
Write-Host "  The site should open in Chrome shortly." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop the server later:" -ForegroundColor Yellow
Write-Host "  - Close the minimized Python window, or" -ForegroundColor Yellow
Write-Host "  - Run: Get-Process python* | Stop-Process" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to close this window (server will keep running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
