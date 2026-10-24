@echo off
rem Buoc 7: cap nhat CSDL (da xem truoc: chi xoa bang rong landlord_settings + them unique hoa don), xem truoc chuyen thong bao + xoa du lieu demo, kiem tra kieu va test. Ket qua ghi vao .data\claude-logs
chcp 65001 >nul
cd /d "%~dp0.."
if not exist ".data\claude-logs" mkdir ".data\claude-logs"
del /q ".data\claude-logs\9-*.log" 2>nul

echo [0/5] Dung web dang chay (npm run dev tren cong 3000) de cap nhat Prisma ...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do taskkill /PID %%p /T /F > ".data\claude-logs\9-0-stop-dev.log" 2>&1
timeout /t 3 >nul

echo [1/5] npx prisma db push ...
call npx prisma db push --accept-data-loss > ".data\claude-logs\9-1-db-push.log" 2>&1
(echo EXIT_CODE=%errorlevel%)>> ".data\claude-logs\9-1-db-push.log"

echo [2/5] Chuyen thong bao tu file .data\notifications.json vao CSDL ...
call npx tsx scripts\import-notifications-json.ts --apply > ".data\claude-logs\9-2-import-notifications.log" 2>&1
(echo EXIT_CODE=%errorlevel%)>> ".data\claude-logs\9-2-import-notifications.log"

echo [3/5] Xem truoc du lieu demo se xoa ...
call npx tsx scripts\cleanup-demo-data.ts > ".data\claude-logs\9-3-cleanup-preview.log" 2>&1
(echo EXIT_CODE=%errorlevel%)>> ".data\claude-logs\9-3-cleanup-preview.log"

echo [4/5] npx tsc --noEmit ...
call npx tsc --noEmit > ".data\claude-logs\9-4-tsc.log" 2>&1
(echo EXIT_CODE=%errorlevel%)>> ".data\claude-logs\9-4-tsc.log"

echo [5/5] Chay test ...
call npx tsx --test tests\auth-scope.test.ts tests\database-resilience.test.ts tests\discovery-performance.test.ts tests\portal-password.test.ts tests\recommender-eval.test.ts tests\otp-security.test.ts tests\account-and-billing.test.ts tests\data-integrity.test.ts > ".data\claude-logs\9-5-tests.log" 2>&1
(echo EXIT_CODE=%errorlevel%)>> ".data\claude-logs\9-5-tests.log"

echo done> ".data\claude-logs\9-done.log"
echo.
echo Da xong buoc 7. Cua so nay se tu dong sau 10 giay.
timeout /t 10 >nul
