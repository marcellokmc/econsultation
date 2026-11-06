@echo off
chcp 65001 >nul
title Grenier Pro (demarrage automatique)
cd /d "%~dp0"
set "GRENIER_DEFAULT_DATA=%USERPROFILE%\Documents\Grenier Pro (donnees)"
"%~dp0node\node.exe" --no-warnings "%~dp0app\server\index.js"
