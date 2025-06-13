@echo off
echo Setting up PNG to GIF Converter...
cd "%~dp0"

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed.
    echo Please install Node.js from https://nodejs.org/ and try again.
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1,2,3 delims=v." %%a in ('node -v') do (
    set NODE_MAJOR_VERSION=%%b
)

if %NODE_MAJOR_VERSION% GTR 18 (
    echo WARNING: You're using a newer version of Node.js.
    echo Some dependencies might have compatibility issues with Node.js versions above 18.
    echo If you encounter problems, consider downgrading to Node.js v18.x LTS.
    echo Continuing anyway...
    echo.
)

REM Check for and clean node_modules if it exists
if exist "node_modules" (
    echo Cleaning existing node_modules directory...
    rmdir /s /q "node_modules"
)

REM Check if package-lock.json exists and remove it
if exist "package-lock.json" (
    echo Removing package-lock.json...
    del package-lock.json
)

REM Install dependencies
echo Installing dependencies...
call npm install --no-optional

REM Run the app
echo Starting the app...
call npm start