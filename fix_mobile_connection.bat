@echo off
echo ============================================
echo   Property Backend - Mobile Connection Fix
echo ============================================
echo.
echo This script will:
echo 1. Add Windows Firewall rule for port 9000
echo 2. Allow incoming connections from mobile devices
echo.
echo NOTE: This requires Administrator privileges
echo.
pause

echo.
echo Adding Windows Firewall rule...
netsh advfirewall firewall delete rule name="Property Backend API" protocol=TCP localport=9000 2>nul
netsh advfirewall firewall add rule name="Property Backend API" dir=in action=allow protocol=TCP localport=9000

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Firewall rule added successfully!
    echo.
    echo Your backend is now accessible from mobile devices on:
    echo   http://192.168.100.254:9000/api
    echo.
) else (
    echo.
    echo [ERROR] Failed to add firewall rule.
    echo Please run this script as Administrator.
    echo.
)

echo.
echo Press any key to exit...
pause >nul
