# Builds the HSS schema in a RUNNING Oracle XE container by piping the SQL
# scripts (in order) into sqlplus. Independent of docker volume mounts / the
# image's auto-init, so it works regardless of where you started the DB.
#
#   Usage (after `docker compose up -d`):
#     ./build-schema.ps1
#     ./build-schema.ps1 -Container hss-backend-oracle-db-1
#
param(
    [string]$Container = "",
    [string]$Conn = "SYSTEM/Oracle123@//localhost:1521/XEPDB1"
)

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot

# 1. Locate the Oracle container if not given.
if (-not $Container) {
    $Container = docker ps --format "{{.Names}} {{.Image}}" |
        Select-String "database/express|oracle" |
        ForEach-Object { ($_ -split " ")[0] } | Select-Object -First 1
}
if (-not $Container) { throw "No running Oracle container found. Run 'docker compose up -d' first." }
Write-Host "Using container: $Container" -ForegroundColor Cyan

# 2. Wait for the database to accept connections (first boot can take minutes).
Write-Host "Waiting for Oracle to be ready..." -NoNewline
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    $out = "SELECT 'DB_IS_UP' FROM DUAL;" | docker exec -i $Container sqlplus -S $Conn 2>$null
    if ($out -match "DB_IS_UP") { $ready = $true; break }
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 5
}
Write-Host ""
if (-not $ready) { throw "Oracle did not become ready. Check 'docker compose logs oracle-db'." }

# 3. Run each script in order. SET DEFINE OFF stops '&' in data from prompting.
$scripts = @(
    "1_create_schemas.sql",
    "2_table_data_bkp.sql",
    "3_db_objects_bkp.sql",
    "4_dummy_table_data.sql",   # dev sample data — remove for non-dev
    "phase_2.sql",
    "dental-release2.sql",
    "99_seed_admin_user.sql"
)

foreach ($s in $scripts) {
    $path = Join-Path $here "scripts\$s"
    if (-not (Test-Path $path)) { Write-Host "SKIP (missing): $s" -ForegroundColor Yellow; continue }
    Write-Host "===== $s =====" -ForegroundColor Green
    # Normalize CRLF -> LF and wrap with sqlplus settings.
    $sql = "SET DEFINE OFF`nSET SQLBLANKLINES ON`nWHENEVER SQLERROR CONTINUE`n" +
           ((Get-Content -Raw $path) -replace "`r", "") +
           "`n`nEXIT`n"
    $sql | docker exec -i $Container sqlplus -S $Conn
}

Write-Host "===== HSS schema build complete =====" -ForegroundColor Cyan
Write-Host "Verify:" -ForegroundColor Cyan
"SELECT COUNT(*) AS perms FROM GENERAL.USER_PERMISSIONS_V WHERE LOWER(USER_EMAIL)=LOWER('michael@icefoganalytics.com');`nEXIT`n" |
    docker exec -i $Container sqlplus -S $Conn
