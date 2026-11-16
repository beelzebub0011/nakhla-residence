@echo off
setlocal
rem NAKHLA RESIDENCE - local launcher (no admin rights, nothing installed globally)
cd /d "%~dp0"
set "NODE=%USERPROFILE%\.proto\tools\node\22.23.3\node.exe"
if not exist "%NODE%" set "NODE=node"
set "NPM_CLI=%USERPROFILE%\.proto\tools\node\22.23.3\node_modules\npm\bin\npm-cli.js"
if not exist "node_modules\vite\bin\vite.js" (
  echo Installing pinned dependencies from package-lock.json ...
  if exist "%NPM_CLI%" ( "%NODE%" "%NPM_CLI%" ci ) else ( call npm ci )
)
if not exist "dist\index.html" (
  echo Building ...
  "%NODE%" node_modules\vite\bin\vite.js build || goto :fail
)
echo.
echo NAKHLA RESIDENCE is running at http://127.0.0.1:4173   (Ctrl+C to stop)
start "" "http://127.0.0.1:4173/"
"%NODE%" node_modules\vite\bin\vite.js preview --host 127.0.0.1 --port 4173 --strictPort
goto :eof
:fail
echo Build failed. See the messages above.
pause
