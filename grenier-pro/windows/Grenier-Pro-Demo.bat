@echo off
chcp 65001 >nul
title Grenier Pro - DEMONSTRATION
cd /d "%~dp0"
set "GRENIER_DATA=%USERPROFILE%\Documents\Grenier Pro (donnees-demo)"
set PORT=3001
echo.
echo   MODE DEMONSTRATION - donnees fictives, separees de vos vraies donnees.
echo   Connexion : owner@grenier.test   Mot de passe : password
"%~dp0node\node.exe" --no-warnings "%~dp0app\server\index.js" --demo --open
pause >nul
