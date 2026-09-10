# backup-db.ps1 — dump DB production Mood Studio ve o H moi dem (chuan S1, buoc #4)
# CHI DOC database. Chay tay: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\backup-db.ps1
# Task Scheduler goi file nay luc 02:00 (xem scripts\backup-install-task.ps1)

$ErrorActionPreference = 'Stop'
$root    = 'C:\Users\Admin\Desktop\Ai\mood saas\mood-studio'
$dest    = 'H:\backups\mood-studio'
$pgdump  = "$dest\tools\pgsql\bin\pg_dump.exe"
$pgrest  = "$dest\tools\pgsql\bin\pg_restore.exe"
$keep    = 14
$log     = "$dest\backup.log"
$stamp   = Get-Date -Format 'yyyyMMdd_HHmm'

function Log($msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
  Add-Content -Path $log -Value $line -Encoding utf8
  Write-Output $line
}

try {
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  if (-not (Test-Path $pgdump)) { throw "khong thay pg_dump tai $pgdump" }

  # Lay chuoi ket noi tu .env.local, doi cong 6543 (transaction) -> 5432 (session) cho pg_dump
  $envLine = Get-Content "$root\.env.local" | Where-Object { $_ -match '^SUPABASE_POOLER_URL=' } | Select-Object -First 1
  if (-not $envLine) { throw 'khong thay SUPABASE_POOLER_URL trong .env.local' }
  $url = ($envLine -replace '^SUPABASE_POOLER_URL=', '').Trim().Trim('"').Trim("'")
  $url = $url -replace ':6543/', ':5432/'
  if ($url -notmatch 'sslmode=') { $url = $url + $(if ($url -match '\?') { '&' } else { '?' }) + 'sslmode=require' }

  $dumpFile   = "$dest\mood_$stamp.dump"
  $schemaFile = "$dest\mood_$stamp.schema.sql"

  # 1. Dump du lieu + cau truc (custom format, nen san)
  & $pgdump --dbname="$url" --format=custom --no-owner --no-privileges --schema=public --file="$dumpFile"
  if ($LASTEXITCODE -ne 0) { throw "pg_dump data exit $LASTEXITCODE" }

  # 2. Dump rieng cau truc (doc bang mat, dung cho diff catalog)
  & $pgdump --dbname="$url" --schema-only --no-owner --no-privileges --schema=public --file="$schemaFile"
  if ($LASTEXITCODE -ne 0) { throw "pg_dump schema exit $LASTEXITCODE" }

  # 3. Kiem file
  $sizeMB = [math]::Round((Get-Item $dumpFile).Length / 1MB, 1)
  if ((Get-Item $dumpFile).Length -lt 100KB) { throw "dump qua nho ($sizeMB MB)" }
  $tables = (& $pgrest --list "$dumpFile" | Select-String 'TABLE DATA' | Measure-Object).Count
  if ($tables -lt 80) { throw "chi thay $tables bang trong dump" }

  Log "OK  $dumpFile  $sizeMB MB  $tables bang"

  # 4. Giu $keep ban gan nhat
  Get-ChildItem $dest -Filter 'mood_*.dump' | Sort-Object LastWriteTime -Descending | Select-Object -Skip $keep | ForEach-Object {
    Remove-Item $_.FullName -Force
    $sch = $_.FullName -replace '\.dump$', '.schema.sql'
    if (Test-Path $sch) { Remove-Item $sch -Force }
    Log "XOA $($_.Name) (qua $keep ban)"
  }
  exit 0
}
catch {
  Log "FAIL $($_.Exception.Message)"
  exit 1
}
