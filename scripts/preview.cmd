@echo off
rem Previews the site at http://localhost:4173 and opens it in your browser: a plain web server
rem (Python 3) serving this folder, which is all GitHub Pages does too. Double-click it, or run it
rem from a terminal. Close the window, or press Ctrl+C, to stop it.
setlocal
cd /d "%~dp0.."
set "PY="
where py >nul 2>nul && py -3 -c "import sys" >nul 2>nul && set "PY=py -3"
if not defined PY if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PY=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY (
  echo Python 3 was not found. Install it from https://www.python.org/downloads/ or run:  winget install Python.Python.3.12
  pause
  exit /b 1
)
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:4173"
echo Previewing the site at http://localhost:4173 (close this window, or press Ctrl+C, to stop)
%PY% -m http.server 4173 --bind 127.0.0.1
if errorlevel 1 pause
