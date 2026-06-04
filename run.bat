@echo off
title ABES GO ERP - Full-Stack Launcher
echo ==========================================================
echo               ABES GO - COLLEGE ERP LAUNCHER
echo ==========================================================
echo.
cd /d "%~dp0"

echo [1/3] Checking Node.js dependencies...
if not exist "client\node_modules" (
    echo Frontend dependencies not found. Installing node packages...
    cd client
    call npm install
    cd ..
) else (
    echo Frontend dependencies are already installed.
)

if not exist "server\node_modules" (
    echo Backend dependencies not found. Installing node packages...
    cd server
    call npm install
    cd ..
) else (
    echo Backend dependencies are already installed.
)
echo.

echo [2/3] Starting backend Express database server...
cd server
start "ABES GO Backend Server" cmd /k "npm start"
cd ..

echo [3/3] Starting frontend Vite client dashboard...
cd client
start "ABES GO Frontend Client" cmd /k "npm run dev"
cd ..
echo.

echo ==========================================================
echo SUCCESS: ABES GO services successfully initialized!
echo.
echo - Access Administrator Dashboard: http://localhost:5173/ (admin@abes.edu / admin123)
echo - Access Faculty grading views: sandeep@abes.edu / sandeep123
echo - Access Student GPA console: liam@abes.edu / liam123
echo ==========================================================
pause
