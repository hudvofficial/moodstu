# restore-drill.ps1 — dien tap khoi phuc ban dump vao Postgres CUC BO (buoc #7, RUNBOOK-SU-CO §2)
# KHONG cham prod. Chay tay: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\restore-drill.ps1 [-Dump H:\...\mood_x.dump]
# Ket qua: H:\backups\mood-studio\restore-test\counts-local.json (so dong tung bang) + dong OK/FAIL trong restore.log
# So voi prod: node scripts/restore-drill-compare.mjs

param(
  [string]$Dump = '',
  [int]$Port = 5433
)
$ErrorActionPreference = 'Stop'
$dest   = 'H:\backups\mood-studio'
$bin    = "$dest\tools\pgsql\bin"
$work   = "$dest\restore-test"
$pgdata = "$work\pgdata"
$db     = 'mood_restore'
$log    = "$dest\restore.log"

function Log($msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
  Add-Content -Path $log -Value $line -Encoding utf8
  Write-Output $line
}
# Chay exe, bat stdout/stderr ra file, tra ve ExitCode (tranh NativeCommandError cua PS 5.1)
function Run($exe, $argList, $tag) {
  $out = "$work\$tag.out.txt"; $err = "$work\$tag.err.txt"
  # Start-Process noi mang bang khoang trang -> tham so co khoang trang phai tu boc ngoac kep
  $quoted = foreach ($a in $argList) { $s = "$a"; if ($s -match '\s' -and -not $s.StartsWith('"')) { '"' + $s.Replace('"','\"') + '"' } else { $s } }
  $p = Start-Process -FilePath $exe -ArgumentList $quoted -Wait -NoNewWindow -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
  return $p.ExitCode
}
function Psql($sqlOrFile, $tag, [switch]$File, [string]$Database = $db) {
  $a = @('-h','127.0.0.1','-p',$Port,'-U','postgres','-d',$Database,'-v','ON_ERROR_STOP=1','-X','-q')
  if ($File) { $a += @('-f', $sqlOrFile) } else { $a += @('-c', $sqlOrFile) }
  return Run "$bin\psql.exe" $a $tag
}
function ErrCount($tag) {
  $f = "$work\$tag.err.txt"
  if (-not (Test-Path $f)) { return 0 }
  return @(Select-String -Path $f -Pattern 'pg_restore: error:' -SimpleMatch).Count
}

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$started = $false
try {
  New-Item -ItemType Directory -Force -Path $work | Out-Null
  if (-not $Dump) { $Dump = (Get-ChildItem "$dest\mood_*.dump" | Sort-Object Name | Select-Object -Last 1).FullName }
  if (-not (Test-Path $Dump)) { throw "khong thay dump: $Dump" }
  Log "BAT DAU dien tap restore  $Dump  port $Port"

  # 1. Cluster cuc bo (pg_ctl tu ha quyen admin tren Windows; initdb goi thang se bi tu choi)
  if (-not (Test-Path "$pgdata\PG_VERSION")) {
    $rc = Run "$bin\pg_ctl.exe" @('init','-D',$pgdata,'-o','"-U postgres -A trust -E UTF8 --no-locale"') 'initdb'
    if ($rc -ne 0) { throw "initdb loi rc=$rc (xem $work\initdb.err.txt)" }
    Log "initdb xong: $pgdata"
  }
  # KHONG dung Start-Process -Wait o day: PS 5.1 -Wait doi ca tien trinh con (postgres.exe) -> treo mai. WaitForExit() chi doi pg_ctl.
  $p = Start-Process -FilePath "$bin\pg_ctl.exe" -ArgumentList @('start','-w','-D',$pgdata,'-l',"$work\pg.log",'-o',"`"-p $Port -c listen_addresses=127.0.0.1`"") -NoNewWindow -PassThru
  $null = $p.Handle   # PS 5.1: khong cham Handle truoc khi thoat thi ExitCode = null
  $started = $true    # dat truoc khi kiem rc: server co the da len du pg_ctl bao loi -> finally van stop
  $p.WaitForExit()
  if ($p.ExitCode -ne 0) { throw "pg_ctl start loi rc=$($p.ExitCode) (xem $work\pg.log)" }

  # 2. DB sach + dung gia cac thu ngoai public ma dump can (auth.users, auth.uid/role/jwt, extensions.*, role RLS)
  $null = Psql "DROP DATABASE IF EXISTS $db" 'dropdb' -Database 'postgres'
  $rc = Psql "CREATE DATABASE $db" 'createdb' -Database 'postgres'
  if ($rc -ne 0) { throw "CREATE DATABASE loi (xem $work\createdb.err.txt)" }
  $prep = @'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon')          THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role')  THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now());
CREATE OR REPLACE FUNCTION auth.uid()  RETURNS uuid  LANGUAGE sql STABLE AS 'SELECT NULL::uuid';
CREATE OR REPLACE FUNCTION auth.role() RETURNS text  LANGUAGE sql STABLE AS 'SELECT ''service_role''::text';
CREATE OR REPLACE FUNCTION auth.jwt()  RETURNS jsonb LANGUAGE sql STABLE AS 'SELECT ''{}''::jsonb';
DROP SCHEMA public CASCADE;
'@
  Set-Content -Path "$work\prep.sql" -Value $prep -Encoding ascii
  $rc = Psql "$work\prep.sql" 'prep' -File
  if ($rc -ne 0) { throw "prep.sql loi (xem $work\prep.err.txt)" }

  # 3. Restore 3 doan: pre-data (schema public, type, bang, ham) -> pg_trgm -> data -> auth.users gia -> post-data (index, FK, policy, trigger)
  $common = @('-h','127.0.0.1','-p',$Port,'-U','postgres','-d',$db,'--no-owner','--no-privileges')
  $null = Run "$bin\pg_restore.exe" ($common + @('--section=pre-data', $Dump)) 'restore-pre'
  $ePre = ErrCount 'restore-pre'
  $rc = Psql 'CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public' 'trgm'
  if ($rc -ne 0) { throw "pg_trgm loi (xem $work\trgm.err.txt)" }
  $null = Run "$bin\pg_restore.exe" ($common + @('--section=data', $Dump)) 'restore-data'
  $eData = ErrCount 'restore-data'

  # auth.users gia: gom moi uuid ma cac cot FK -> auth.users dang tro toi (doc tu chinh dump, khong doan)
  $null = Run "$bin\pg_restore.exe" @('--section=post-data','--file',"$work\post-data.sql",$Dump) 'restore-post-list'
  $pairs = @{}
  $tbl = ''
  foreach ($line in Get-Content "$work\post-data.sql") {
    if ($line -match '^ALTER TABLE ONLY public\.([a-z_0-9]+)') { $tbl = $Matches[1] }
    elseif ($line -match 'FOREIGN KEY \(([a-z_0-9]+)\) REFERENCES auth\.users') { $pairs["$tbl|$($Matches[1])"] = $true }
  }
  $ins = foreach ($k in $pairs.Keys) { $t,$c = $k.Split('|'); "INSERT INTO auth.users(id) SELECT DISTINCT $c FROM public.$t WHERE $c IS NOT NULL ON CONFLICT DO NOTHING;" }
  Set-Content -Path "$work\auth-users.sql" -Value ($ins -join "`n") -Encoding ascii
  $rc = Psql "$work\auth-users.sql" 'auth-users' -File
  if ($rc -ne 0) { throw "auth-users.sql loi (xem $work\auth-users.err.txt)" }

  $null = Run "$bin\pg_restore.exe" ($common + @('--section=post-data', $Dump)) 'restore-post'
  $ePost = ErrCount 'restore-post'
  $sw.Stop()

  # 4. Dem: so bang/ham/policy/trigger/index + so dong tung bang -> counts-local.json
  $q = @"
SELECT json_build_object(
  'bang',    (SELECT count(*) FROM pg_tables WHERE schemaname='public'),
  'ham',     (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'),
  'policy',  (SELECT count(*) FROM pg_policy),
  'trigger', (SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal),
  'index',   (SELECT count(*) FROM pg_indexes WHERE schemaname='public'),
  'auth_users', (SELECT count(*) FROM auth.users),
  'dong', (SELECT json_object_agg(relname, n ORDER BY relname) FROM (
     SELECT c.relname, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', c.relname), false, true, '')))[1]::text::bigint AS n
     FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname='public' AND c.relkind='r') s)
)::text
"@
  Set-Content -Path "$work\counts.sql" -Value $q -Encoding ascii
  $rc = Run "$bin\psql.exe" @('-h','127.0.0.1','-p',$Port,'-U','postgres','-d',$db,'-X','-A','-t','-f',"$work\counts.sql") 'counts'
  if ($rc -ne 0) { throw "dem loi (xem $work\counts.err.txt)" }
  $json = (Get-Content "$work\counts.out.txt" -Raw).Trim()
  Set-Content -Path "$work\counts-local.json" -Value $json -Encoding ascii
  $o = $json | ConvertFrom-Json
  $verdict = if ($o.bang -eq 93 -and $eData -eq 0 -and $ePost -eq 0) { 'OK' } else { 'FAIL' }
  Log "$verdict  $(Split-Path $Dump -Leaf)  $([int]$sw.Elapsed.TotalSeconds)s  bang=$($o.bang) ham=$($o.ham) policy=$($o.policy) trigger=$($o.trigger) index=$($o.index) auth_users=$($o.auth_users)  loi restore pre/data/post=$ePre/$eData/$ePost"
}
catch {
  Log "FAIL $($_.Exception.Message)"
  exit 1
}
finally {
  if ($started) { $null = Run "$bin\pg_ctl.exe" @('stop','-D',$pgdata,'-m','fast','-w') 'pgctl-stop' }
}
