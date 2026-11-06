@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "GRENIER_DEFAULT_DATA=%USERPROFILE%\Documents\Grenier Pro (donnees)"
echo.
echo   Administration de Grenier Pro (fermez Grenier Pro avant toute modification)
echo.
echo   Commandes (a taper ici) :
echo     node\node.exe app\server\admin.js liste
echo     node\node.exe app\server\admin.js mot-de-passe adresse@email.bf nouveaumotdepasse
echo     node\node.exe app\server\admin.js offre NOM-ENTREPRISE pro
echo.
cmd /k
