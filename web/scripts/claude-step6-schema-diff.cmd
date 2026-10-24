@echo off
rem Buoc 6 (chi doc): xem truoc cac thay doi CSDL ma "prisma db push" se thuc hien. Ket qua ghi vao .data\claude-logs
chcp 65001 >nul
cd /d "%~dp0.."
if not exist ".data\claude-logs" mkdir ".data\claude-logs"
del /q ".data\claude-logs\8-*.log" 2>nul
call npx prisma migrate diff --from-schema-datasource prisma\schema.prisma --to-schema-datamodel prisma\schema.prisma --script > ".data\claude-logs\8-schema-diff.log" 2>&1
(echo EXIT_CODE=%errorlevel%)>> ".data\claude-logs\8-schema-diff.log"
echo done> ".data\claude-logs\8-done.log"
