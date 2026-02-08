@REM @echo off
@REM :loop
@REM git add .
@REM git diff --cached --quiet || git commit -m "Auto-update %date% %time%"
@REM git push origin main
@REM timeout /t 3600
@REM goto loop
