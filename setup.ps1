# Signal Engine extension setup for Windows (PowerShell)
# Run from project folder as Administrator if needed:
#   pwsh ./setup.ps1

$ErrorActionPreference = 'Stop'

function Check-Command($cmd) {
    $path = (& where.exe $cmd 2>$null) -join ''
    return -not [string]::IsNullOrEmpty($path)
}

if (-not (Check-Command 'ollama')) {
    Write-Host 'Ollama not found.' -ForegroundColor Yellow
    Write-Host 'Please install Ollama from https://ollama.ai and ensure it is on PATH.' -ForegroundColor Cyan
    exit 1
}

Write-Host 'Ollama found.' -ForegroundColor Green

Write-Host 'Pulling phi3 model into Ollama...' -ForegroundColor Cyan
& ollama pull phi3

$existing = Get-Process -Name 'ollama' -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host 'Ollama already running' -ForegroundColor Green
} else {
    Write-Host 'Starting Ollama server on port 11434...' -ForegroundColor Cyan
    Start-Process -NoNewWindow -FilePath 'ollama' -ArgumentList 'serve --host 127.0.0.1 --port 11434 --cors'
    Start-Sleep -Seconds 2
}

Write-Host "`nSetup complete!" -ForegroundColor Green
Write-Host 'Next steps:'
Write-Host '  1. Open Chrome and navigate to chrome://extensions'
Write-Host '  2. Enable Developer mode'
Write-Host '  3. Click Load unpacked and point to this folder'
Write-Host '  4. Use the Signal Engine popup to select mode and verify AI status'
