@echo off
rem Buoc 3: xem truoc va gan hoa don cu voi hop dong. Ket qua ghi vao .data\claude-logs
chcp 65001 >nul
cd /d "%~dp0.."
if not exist ".data\claude-logs" mkdir ".data\claude-logs"
del /q ".data\claude-logs\5-*.log" 2>nul
call npx tsx scripts\backfill-bill-contracts.ts > ".data\claude-logs\5-backfill-preview.log" 2>&1
call npx tsx --test tests\account-and-billing.test.ts > ".data\claude-logs\5-tests.log" 2>&1
call npx tsc --noEmit > ".data\claude-logs\5-tsc.log" 2>&1
echo done> ".data\claude-logs\5-done.log"
