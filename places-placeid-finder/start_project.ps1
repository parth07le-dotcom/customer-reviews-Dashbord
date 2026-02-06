Write-Host "Configuring Node.js environment..."
$env:Path = "C:\Program Files\nodejs;" + $env:Path

# Verify Node is accessible now
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "Node.js found: $(node -v)"
} else {
    Write-Host "Error: Node.js still not found. Please ensure it is installed in C:\Program Files\nodejs" -ForegroundColor Red
    exit 1
}

Write-Host "Installing dependencies..."
npm install

Write-Host "Starting project..."
npm start
