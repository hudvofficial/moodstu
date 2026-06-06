# ==============================================================================
# SCRIPT CAI DAT MOI TRUONG PHAT TRIEN CHO DU AN (NODE.JS & PNPM)
# ==============================================================================
# Huong dan chay:
# 1. Click chuot phai vao nut Start (hoac nhan Win + X), chon "Terminal" hoac "PowerShell"
# 2. Copy toan bo lenh sau dan vao va nhan Enter:
#    cd "c:\Users\Admin\Desktop\Ai\mood saas\mood-studio"; powershell -ExecutionPolicy Bypass -File setup_environment.ps1
# ==============================================================================

Clear-Host
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "     BAT DAU CAI DAT MOI TRUONG PHAT TRIEN (NODE.JS & PNPM)      " -ForegroundColor Cyan -BackgroundColor DarkBlue
Write-Host "=================================================================" -ForegroundColor Cyan

$NodeVersion = "v22.11.0"
$ZipName = "node-$NodeVersion-win-x64.zip"
$DownloadUrl = "https://nodejs.org/dist/$NodeVersion/$ZipName"
$InstallDir = "C:\Users\Admin\.nodejs"
$TargetZip = Join-Path $InstallDir "node.zip"

# Buoc 1: Tao thu muc cai dat
Write-Host "`n[1/5] Dang tao thu muc cai dat tai: $InstallDir..." -ForegroundColor Yellow
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    Write-Host "-> Da tao thu muc thanh cong." -ForegroundColor Green
} else {
    Write-Host "-> Thu muc da ton tai." -ForegroundColor Gray
}

# Buoc 2: Tai xuong Node.js
Write-Host "`n[2/5] Dang tai Node.js $NodeVersion tu trang chu..." -ForegroundColor Yellow
try {
    Start-BitsTransfer -Source $DownloadUrl -Destination $TargetZip -ErrorAction Stop
    Write-Host "-> Da tai xong bang BITS." -ForegroundColor Green
} catch {
    Write-Host "-> BITS that bai, dang thu tai bang WebClient..." -ForegroundColor Gray
    try {
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $TargetZip -UseBasicParsing -ErrorAction Stop
        Write-Host "-> Da tai xong bang Invoke-WebRequest." -ForegroundColor Green
    } catch {
        Write-Host "[LOI] Khong the tai xuong Node.js. Vui long kiem tra ket noi mang!" -ForegroundColor Red
        Exit
    }
}

# Buoc 3: Giai nen Node.js
Write-Host "`n[3/5] Dang giai nen Node.js..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $TargetZip -DestinationPath $InstallDir -Force -ErrorAction Stop
    Write-Host "-> Da giai nen thanh cong." -ForegroundColor Green
} catch {
    Write-Host "[LOI] Giai nen that bai!" -ForegroundColor Red
    Exit
} finally {
    if (Test-Path $TargetZip) {
        Remove-Item $TargetZip -Force | Out-Null
    }
}

$NodeBinDir = Join-Path $InstallDir "node-$NodeVersion-win-x64"

# Buoc 4: Cau hinh bien moi truong PATH cho User (Khong can Admin)
Write-Host "`n[4/5] Dang cau hinh bien moi truong PATH..." -ForegroundColor Yellow
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$NodeBinDir*") {
    $NewUserPath = "$NodeBinDir;$UserPath"
    [Environment]::SetEnvironmentVariable("Path", $NewUserPath, "User")
    Write-Host "-> Da them Node.js vao User PATH thanh cong!" -ForegroundColor Green
} else {
    Write-Host "-> Node.js da duoc cau hinh trong PATH tu truoc." -ForegroundColor Gray
}

# Cap nhat session hien tai de co the dung luon
$env:Path = "$NodeBinDir;" + $env:Path

# Kiem tra Node & NPM
Write-Host "`n[XAC MINH] Kiem tra phien ban Node.js & NPM:" -ForegroundColor Cyan
Write-Host "Node.js version: $(node -v)" -ForegroundColor Green
Write-Host "NPM version:     $(npm -v)" -ForegroundColor Green

# Buoc 5: Cai dat PNPM toan cuc
Write-Host "`n[5/5] Dang cai dat PNPM toan cuc..." -ForegroundColor Yellow
try {
    npm install -g pnpm
    # Cau hinh pnpm path trong session hien tai
    $PnpmPath = Join-Path $env:APPDATA "npm"
    if ($env:Path -notlike "*$PnpmPath*") {
        $env:Path = "$PnpmPath;" + $env:Path
    }
    Write-Host "-> Cai dat PNPM thanh cong!" -ForegroundColor Green
    Write-Host "PNPM version:    $(pnpm -v)" -ForegroundColor Green
} catch {
    Write-Host "[LOI] Cai dat PNPM that bai!" -ForegroundColor Red
}

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host " CAI DAT THANH CONG! HAY KHOI DONG LAI TERMINAL DE CO HIEU LUC." -ForegroundColor Green -BackgroundColor Black
Write-Host " Sau khi khoi dong lai, ban co the chay: pnpm dev de khoi dong app." -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
