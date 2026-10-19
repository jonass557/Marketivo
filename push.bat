@echo off
echo ====================================
echo    MyShop - Push vers GitHub
echo ====================================
echo.

:: Demander le message de commit
set /p message="Message du commit: "

:: Si pas de message, utiliser un message par defaut
if "%message%"=="" set message=Update

:: Ajouter tous les fichiers
git add -A

:: Creer le commit
git commit -m "%message%"

:: Pousser sur GitHub
git push origin main

echo.
echo ====================================
echo    Push termine avec succes!
echo ====================================
pause
