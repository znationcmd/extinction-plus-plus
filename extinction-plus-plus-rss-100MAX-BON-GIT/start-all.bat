@echo off
cd /d "%~dp0bot"
if not exist package.json (
echo ERREUR : package.json introuvable dans le dossier bot !
pause
exit
)
npm install
start "Extinction++ RSS BOT" cmd /k "node deploy-commands.js && node index.js"
cd /d "%~dp0bot\dashboard"
npm install
start "Extinction++ RSS DASHBOARD" cmd /k "npm run dev"
echo Bot et dashboard lances.
echo Dashboard: http://localhost:3000
pause
