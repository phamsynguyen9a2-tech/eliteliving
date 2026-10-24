@echo off
rem Buoc 1: cap nhat CSDL + kiem tra (Claude tao, chay mot lan). Ket qua ghi vao .data\claude-logs
chcp 65001 >nul
cd /d "%~dp0.."
if not exist ".data\claude-logs" mkdir ".data\claude-logs"
del /q ".data\claude-logs\*.log" 2>nul
del /q ".data\claude-logs\step1-done.txt" 2>nul

echo [1/4] npx prisma db push ...
call npx prisma db push > ".data\claude-logs\1-db-push.log" 2>&1
echo EXIT_CODE=%errorlevel%>> ".data\claude-logs\1-db-push.log"

echo [2/4] Xem truoc gan hoa don cu voi hop dong ...
call npx tsx scripts\backfill-bill-contracts.ts > ".data\claude-logs\2-backfill-preview.log" 2>&1
echo EXIT_CODE=%errorlevel%>> ".data\claude-logs\2-backfill-preview.log"

echo [3/4] npx tsc --noEmit ...
call npx tsc --noEmit > ".data\claude-logs\3-tsc.log" 2>&1
echo EXIT_CODE=%errorlevel%>> ".data\claude-logs\3-tsc.log"

echo [4/4] Chay test ...
call npx tsx --test tests\auth-scope.test.ts tests\database-resilience.test.ts tests\discovery-performance.test.ts tests\portal-password.test.ts tests\recommender-eval.test.ts tests\otp-security.test.ts tests\account-and-billing.test.ts > ".data\claude-logs\4-tests.log" 2>&1
echo EXIT_CODE=%errorlevel%>> ".data\claude-logs\4-tests.log"

echo done> ".data\claude-logs\step1-done.txt"
echo.
echo Da xong buoc 1. Cua so nay se tu dong sau 10 giay.
timeout /t 10 >nul
