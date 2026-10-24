@echo off
rem Chi doc: liet ke du lieu cu trong bang landlord_settings. Ket qua ghi vao .data\claude-logs
chcp 65001 >nul
cd /d "%~dp0.."
call npx tsx scripts\inspect-legacy-store.ts > ".data\claude-logs\7-inspect.log" 2>&1
echo done> ".data\claude-logs\7-done.log"
