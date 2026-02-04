@echo off
echo ============================================
echo   Backend Connection Diagnostics
echo ============================================
echo.

echo [1/5] Checking if backend is running on port 9000...
netstat -ano | findstr :9000 | findstr LISTENING
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend is listening on port 9000
) else (
    echo [ERROR] Backend is NOT running!
    echo Please start your backend first.
    goto :end
)

echo.
echo [2/5] Checking if backend is listening on all interfaces...
netstat -ano | findstr "0.0.0.0:9000" | findstr LISTENING
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend is listening on 0.0.0.0 (all interfaces)
) else (
    echo [WARNING] Backend is only listening on localhost
    echo Please restart backend after code changes.
)

echo.
echo [3/5] Getting your computer's IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set IP=%%a
    set IP=!IP: =!
    echo Found IP: !IP!
)

echo.
echo [4/5] Checking Windows Firewall rule...
netsh advfirewall firewall show rule name="Property Backend API" | findstr "Property Backend API"
if %ERRORLEVEL% EQU 0 (
    echo [OK] Firewall rule exists
) else (
    echo [WARNING] Firewall rule not found
    echo Run fix_mobile_connection.bat as Administrator to add it
)

echo.
echo [5/5] Testing local connection to backend...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:9000/api/auth/login -X POST -H "Content-Type: application/json" -d "{\"username\":\"test\",\"password\":\"test\"}" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend is responding to requests
) else (
    echo [INFO] curl test completed (check HTTP status above)
)

echo.
echo ============================================
echo   SUMMARY
echo ============================================
echo.
echo Your Mobile App Configuration:
echo   API URL: http://192.168.100.254:9000/api
echo.
echo Next Steps:
echo   1. If firewall rule is missing, run fix_mobile_connection.bat as Admin
echo   2. Restart your backend if it's listening on 127.0.0.1 only
echo   3. Ensure your phone is on the same WiFi (192.168.100.x)
echo   4. Try logging in from the mobile app
echo   5. Watch backend console for incoming requests
echo.

:end
echo.
pause
