@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "GRENIER_DEFAULT_DATA=%USERPROFILE%\Documents\Grenier Pro (donnees)"
if not defined GRENIER_DATA set "GRENIER_DATA=%GRENIER_DEFAULT_DATA%"
echo.
echo   Administration de Grenier Pro (fermez Grenier Pro avant toute modification)
echo   Donnees : %GRENIER_DATA%
echo.
echo   Commandes (a taper ici) :
echo     node\node.exe app\server\admin.js liste
echo     node\node.exe app\server\admin.js mot-de-passe adresse@email.bf nouveaumotdepasse
echo     node\node.exe app\server\admin.js licence licence.txt        (enregistrer la licence recue)
echo     node\node.exe app\server\admin.js licence                    (etat de la licence)
echo.
echo   La licence peut aussi etre collee dans Grenier : menu Controle ^> Licence.
echo.
cmd /k
