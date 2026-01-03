@echo off
:loop
git add .
git commit -m "Auto-update %date% %time%"
git push origin main
timeout /t 1800
goto loop
