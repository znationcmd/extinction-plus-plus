@echo off
cd /d "%~dp0bot"
if not exist package.json (
echo ERREUR : package.json introuvable dans le dossier bot !
pause
exit
)
npm install
node deploy-commands.js
node index.js
pause
