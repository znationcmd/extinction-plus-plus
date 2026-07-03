@echo off
cd /d "%~dp0bot\dashboard"
if not exist package.json (
echo ERREUR : package.json introuvable dans le dossier bot\dashboard !
pause
exit
)
npm install
npm run dev
pause
