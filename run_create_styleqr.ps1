# Create DB styleqr and user styleqr_user. Requires postgres superuser password.
# Run: $env:PGPASSWORD='YOUR_POSTGRES_PASSWORD'; .\run_create_styleqr.ps1

$pg = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
if (-not (Test-Path $pg)) { Write-Error "PostgreSQL 16 psql not found at $pg"; exit 1 }
if (-not $env:PGPASSWORD) { $env:PGPASSWORD = $env:POSTGRES_PASSWORD }
if (-not $env:PGPASSWORD) { Write-Host "Set PGPASSWORD or POSTGRES_PASSWORD to your postgres password, then re-run."; exit 1 }

$sql = Join-Path $PSScriptRoot "prisma\create_styleqr.sql"
& $pg -U postgres -h localhost -p 5432 -f $sql
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Created database styleqr and user styleqr_user. Run: npx prisma migrate deploy"
