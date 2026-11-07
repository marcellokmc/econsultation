; Installateur Windows de Grenier Pro (NSIS 3, Unicode). Fabriqué par build/construire-installeur.sh.
; Installation par utilisateur (pas besoin de droits administrateur), comme la version 1.0.
Unicode true
!include "MUI2.nsh"
!include "FileFunc.nsh"

!ifndef VERSION
  !define VERSION "2.0.0"
!endif
!ifndef STAGE
  !define STAGE "..\dist\stage"
!endif
!ifndef OUTFILE
  !define OUTFILE "..\dist\Grenier-Pro-Setup-${VERSION}.exe"
!endif
!define APP "Grenier Pro"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\GrenierPro"

Name "${APP} ${VERSION}"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\Programs\Grenier Pro"
InstallDirRegKey HKCU "Software\GrenierPro" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "Installateur de Grenier Pro ${VERSION}"
VIProductVersion "${VERSION}.0"
VIAddVersionKey /LANG=1036 "ProductName" "${APP}"
VIAddVersionKey /LANG=1036 "FileDescription" "Installateur de ${APP}"
VIAddVersionKey /LANG=1036 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=1036 "LegalCopyright" "Grenier Pro"

!define MUI_ICON "${STAGE}\app\public\favicon.ico"
!define MUI_UNICON "${STAGE}\app\public\favicon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TEXT "Grenier Pro : stock par lot, production, ventes, traçabilité par QR code et coopérative.$\r$\n$\r$\nVos données (Documents\Grenier Pro (donnees)) sont conservées lors d'une mise à jour.$\r$\n$\r$\nFermez Grenier Pro s'il est ouvert avant de continuer."
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Lancer Grenier Pro"
!define MUI_FINISHPAGE_RUN_FUNCTION LaunchApp
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\LISEZ-MOI.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Lire le mode d'emploi"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "French"

Function LaunchApp
  ExecShell "" "$INSTDIR\Grenier-Pro.bat" "" SW_SHOWMINIMIZED
FunctionEnd

Section "Grenier Pro (obligatoire)" SecMain
  SectionIn RO
  SetOutPath "$INSTDIR"
  ; l'ancienne interface est remplacée entièrement (les noms de fichiers changent à chaque version)
  RMDir /r "$INSTDIR\app\public"
  RMDir /r "$INSTDIR\app\server"
  File /r "${STAGE}\node"
  File /r "${STAGE}\app"
  File /r "${STAGE}\docs"
  File "${STAGE}\*.bat"
  File "${STAGE}\LISEZ-MOI.txt"
  ; réglages : jamais écrasés lors d'une mise à jour
  IfFileExists "$INSTDIR\reglages.json" +2 0
    File "${STAGE}\reglages.json"

  CreateDirectory "$SMPROGRAMS\Grenier Pro"
  CreateShortCut "$SMPROGRAMS\Grenier Pro\Grenier Pro.lnk" "$INSTDIR\Grenier-Pro.bat" "" "$INSTDIR\app\public\favicon.ico" 0 SW_SHOWMINIMIZED
  CreateShortCut "$SMPROGRAMS\Grenier Pro\Grenier Pro (démonstration).lnk" "$INSTDIR\Grenier-Pro-Demo.bat" "" "$INSTDIR\app\public\favicon.ico" 0 SW_SHOWMINIMIZED
  CreateShortCut "$SMPROGRAMS\Grenier Pro\Réglages.lnk" "notepad.exe" '"$INSTDIR\reglages.json"'
  CreateShortCut "$SMPROGRAMS\Grenier Pro\Administration.lnk" "$INSTDIR\Administration.bat" "" "$INSTDIR\app\public\favicon.ico"
  CreateShortCut "$SMPROGRAMS\Grenier Pro\Mode d'emploi.lnk" "$INSTDIR\LISEZ-MOI.txt"
  CreateShortCut "$SMPROGRAMS\Grenier Pro\Désinstaller Grenier Pro.lnk" "$INSTDIR\Desinstaller.exe"
  CreateShortCut "$DESKTOP\Grenier Pro.lnk" "$INSTDIR\Grenier-Pro.bat" "" "$INSTDIR\app\public\favicon.ico" 0 SW_SHOWMINIMIZED

  WriteUninstaller "$INSTDIR\Desinstaller.exe"
  WriteRegStr HKCU "Software\GrenierPro" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "${APP}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "Grenier Pro"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\app\public\favicon.ico"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\Desinstaller.exe"'
  WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  WriteRegDWORD HKCU "${UNINST_KEY}" "EstimatedSize" $0
SectionEnd

Section /o "Démarrer Grenier avec Windows (poste principal)" SecAuto
  CreateShortCut "$SMSTARTUP\Grenier Pro.lnk" "$INSTDIR\Grenier-Pro-Auto.bat" "" "$INSTDIR\app\public\favicon.ico" 0 SW_SHOWMINIMIZED
SectionEnd

LangString DESC_Main ${LANG_FRENCH} "Le logiciel, l'interface, la collecte terrain et Node.js."
LangString DESC_Auto ${LANG_FRENCH} "Lance Grenier à l'ouverture de la session, pour que les autres postes et téléphones puissent s'y connecter."
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecMain} $(DESC_Main)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecAuto} $(DESC_Auto)
!insertmacro MUI_FUNCTION_DESCRIPTION_END

Section "Uninstall"
  ; les DONNÉES (Documents\Grenier Pro (donnees)) ne sont jamais supprimées
  Delete "$DESKTOP\Grenier Pro.lnk"
  Delete "$SMSTARTUP\Grenier Pro.lnk"
  RMDir /r "$SMPROGRAMS\Grenier Pro"
  RMDir /r "$INSTDIR\node"
  RMDir /r "$INSTDIR\app"
  RMDir /r "$INSTDIR\docs"
  Delete "$INSTDIR\*.bat"
  Delete "$INSTDIR\LISEZ-MOI.txt"
  Delete "$INSTDIR\Desinstaller.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${UNINST_KEY}"
  DeleteRegKey HKCU "Software\GrenierPro"
SectionEnd
