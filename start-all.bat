@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "MONGO_DATA=%ROOT%data\db"

echo.
echo ==========================================
echo   Cences Form - Starting all services
echo ==========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js was not found in PATH.
    echo Install Node.js 20 or newer, then run this file again.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm was not found in PATH.
    echo Install Node.js 20 or newer, then run this file again.
    pause
    exit /b 1
)

if not exist "%BACKEND%\package.json" (
    echo ERROR: Backend project was not found at "%BACKEND%".
    pause
    exit /b 1
)

if not exist "%FRONTEND%\package.json" (
    echo ERROR: Frontend project was not found at "%FRONTEND%".
    pause
    exit /b 1
)

rem Use an existing MongoDB listener when MongoDB is already running.
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if not errorlevel 1 (
    echo MongoDB is already running on port 27017.
    goto :start_apps
)

set "MONGOD_EXE="
for /f "delims=" %%M in ('where mongod.exe 2^>nul') do if not defined MONGOD_EXE set "MONGOD_EXE=%%M"

if not defined MONGOD_EXE (
    for /f "delims=" %%M in ('where /r "%ProgramFiles%\MongoDB\Server" mongod.exe 2^>nul') do if not defined MONGOD_EXE set "MONGOD_EXE=%%M"
)

if not defined MONGOD_EXE (
    echo ERROR: MongoDB is not running and mongod.exe was not found.
    echo Install MongoDB Community Server, or add mongod.exe to PATH.
    echo Expected database folder: "%MONGO_DATA%"
    pause
    exit /b 1
)

if not exist "%MONGO_DATA%" mkdir "%MONGO_DATA%"

echo Starting MongoDB...
start "Cences Form - MongoDB" "%MONGOD_EXE%" --dbpath "%MONGO_DATA%"
timeout /t 3 /nobreak >nul

:start_apps
echo Starting backend on http://localhost:4000 ...
start "Cences Form - Backend" /D "%BACKEND%" cmd /k "npm run dev"

echo Starting frontend on http://localhost:3000 ...
start "Cences Form - Frontend" /D "%FRONTEND%" cmd /k "npm start"

echo.
echo Services are starting in separate windows.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:4000
echo Admin:    http://localhost:4000/admin
echo.

timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"

endlocal
