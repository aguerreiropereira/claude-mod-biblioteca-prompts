@echo off
rem Abre o instalador do mod com um duplo clique.
rem Use "instalar.cmd remover" para remover o mod.
if /i "%~1"=="remover" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1" -Remover
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1"
)
echo.
pause
