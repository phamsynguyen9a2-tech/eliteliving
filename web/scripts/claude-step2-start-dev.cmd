@echo off
rem Buoc 2: khoi dong lai web (npm run dev). Dong cua so nay hoac nhan Ctrl+C de dung.
chcp 65001 >nul
cd /d "%~dp0.."
title Elite Living - npm run dev
call npm run dev
