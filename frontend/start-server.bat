@echo off
echo ========================================
echo   Restaurant Inventory Management System
echo   Starting local server...
echo ========================================
echo.

:: Check if Python is available
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Python found. Starting server on port 8000...
    echo.
    echo Open your browser and go to:
    echo    http://localhost:8000
    echo.
    echo Press Ctrl+C to stop the server.
    echo ========================================
    start http://localhost:8000
    python -m http.server 8000
    goto :end
)

:: Check if Python3 is available
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Python3 found. Starting server on port 8000...
    echo.
    echo Open your browser and go to:
    echo    http://localhost:8000
    echo.
    echo Press Ctrl+C to stop the server.
    echo ========================================
    start http://localhost:8000
    python3 -m http.server 8000
    goto :end
)

:: Check if Node.js npx is available
npx --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Node.js found. Starting server on port 8000...
    echo.
    echo Open your browser and go to:
    echo    http://localhost:8000
    echo.
    echo Press Ctrl+C to stop the server.
    echo ========================================
    start http://localhost:8000
    npx serve -l 8000
    goto :end
)

:: No server found
echo [ERROR] No Python or Node.js found!
echo.
echo Please install one of the following:
echo   - Python: https://www.python.org/downloads/
echo   - Node.js: https://nodejs.org/
echo.
echo Or use VS Code with "Live Server" extension.
echo.
pause

:end
