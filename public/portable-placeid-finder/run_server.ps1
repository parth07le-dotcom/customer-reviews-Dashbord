Write-Host "Starting Portable Place ID Finder..."
Write-Host "Attempting to use localhost to satisfy API Key restrictions..."

$env:Path = "C:\Program Files\nodejs;" + $env:Path

if (Get-Command npx -ErrorAction SilentlyContinue) {
    # -a localhost forces binding to localhost (fixes 127.0.0.1 API issues)
    # -p 8080 sets a fixed port
    # -o opens the browser
    # -c-1 disables caching
    npx -y http-server . -a localhost -p 8080 -o -c-1
}
else {
    Write-Host "Error: Node.js (npx) not found." -ForegroundColor Red
    Pause
}
