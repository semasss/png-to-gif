@echo off
echo Building PNG to GIF Converter for Windows...
cd "%~dp0"

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed. Please install Node.js first.
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

REM Build the app
echo Building the app...
call npm run build-win

echo Build complete! You can find the portable EXE file in the dist folder.