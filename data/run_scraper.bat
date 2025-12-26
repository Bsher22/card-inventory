@echo off
echo.
echo ============================================
echo   Beckett XLSX Checklist Scraper
echo ============================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python from https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Run the scraper
echo Starting scraper...
echo.
python "%~dp0beckett_xlsx_scraper.py"

echo.
echo ============================================
echo   Scraping complete!
echo ============================================
echo.
pause