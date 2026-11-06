@echo off
chcp 65001 >nul
title Grenier Pro
cd /d "%~dp0"
set "GRENIER_DEFAULT_DATA=%USERPROFILE%\Documents\Grenier Pro (donnees)"
echo.
echo   Grenier Pro demarre... Le navigateur va s'ouvrir tout seul.
echo   Laissez cette fenetre ouverte (reduite dans la barre des taches)
echo   pendant que vous travaillez. Pour arreter : fermez-la.
"%~dp0node\node.exe" --no-warnings "%~dp0app\server\index.js" --open
echo.
echo   Grenier Pro s'est arrete. Si c'est inattendu, lisez le message ci-dessus.
echo   Appuyez sur une touche pour fermer cette fenetre.
pause >nul
