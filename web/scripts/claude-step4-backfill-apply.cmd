@echo off
rem Buoc 4: gan hoa don cu voi hop dong (ghi vao CSDL). Ket qua ghi vao .data\claude-logs
chcp 65001 >nul
cd /d "%~dp0.."
call npx tsx scripts\backfill-bill-contracts.ts --apply > ".data\claude-logs\6-backfill-apply.log" 2>&1
echo done> ".data\claude-logs\6-done.log"
