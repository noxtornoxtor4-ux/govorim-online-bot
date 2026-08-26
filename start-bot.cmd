@echo off
chcp 65001 >nul
title Говорим онлайн — бот
cd /d "%~dp0"

echo Запускаю бота. Не закрывай это окно.
echo Остановить — Ctrl+C или просто закрыть окно.
echo.

:loop
bun src\index.ts
echo.
echo Бот остановился. Перезапуск через 5 секунд...
timeout /t 5 /nobreak >nul
goto loop
