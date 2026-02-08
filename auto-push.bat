@echo off
git add .
git diff --cached --quiet || git commit -m "Manual update %date% %time%"
git push origin main
