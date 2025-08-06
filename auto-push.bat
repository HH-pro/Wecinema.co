@echo off
:loop
git add .
git commit -m "Auto-update %date% %time%"
git push origin main
timeout /t 30
goto loop
