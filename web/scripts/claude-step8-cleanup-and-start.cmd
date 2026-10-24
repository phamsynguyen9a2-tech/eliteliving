@echo off
rem Buoc 8: sao luu roi xoa du lieu demo, sau do khoi dong lai web (npm run dev).
chcp 65001 >nul
cd /d "%~dp0.."
if not exist ".data\claude-logs" mkdir ".data\claude-logs"
call npx tsx scripts\cleanup-demo-data.ts --apply > ".data\claude-logs\10-cleanup-apply.log" 2>&1
(echo EXIT_CODE=%errorlevel%)>> ".data\claude-logs\10-cleanup-apply.log"
title Elite Living - npm run dev
call npm run dev
