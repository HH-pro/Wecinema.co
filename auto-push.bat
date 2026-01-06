@echo off
:loop
git add .
git diff --cached --quiet || git commit -m "Auto-update %date% %time%"
git push origin main
timeout /t 3600
goto loop
