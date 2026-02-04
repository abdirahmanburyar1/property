@echo off
echo ============================================
echo    RabbitMQ Setup Script for Windows
echo ============================================
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script requires administrator privileges.
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo Checking if Chocolatey is installed...
where choco >nul 2>&1
if %errorLevel% neq 0 (
    echo Chocolatey not found. Installing Chocolatey...
    echo.
    powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))"
    
    if %errorLevel% neq 0 (
        echo ERROR: Failed to install Chocolatey
        pause
        exit /b 1
    )
    
    echo Chocolatey installed successfully!
    echo Please close this window and run the script again.
    pause
    exit /b 0
)

echo Chocolatey is installed.
echo.

echo Installing RabbitMQ...
choco install rabbitmq -y

if %errorLevel% neq 0 (
    echo ERROR: Failed to install RabbitMQ
    pause
    exit /b 1
)

echo.
echo RabbitMQ installed successfully!
echo.

echo Enabling RabbitMQ Management Plugin...
"%ProgramFiles%\RabbitMQ Server\rabbitmq_server-3.13.0\sbin\rabbitmq-plugins.bat" enable rabbitmq_management

echo.
echo Starting RabbitMQ Service...
net start RabbitMQ

echo.
echo ============================================
echo    RabbitMQ Setup Complete!
echo ============================================
echo.
echo RabbitMQ is now running!
echo.
echo Management UI: http://localhost:15672
echo Username: guest
echo Password: guest
echo.
echo AMQP Port: 5672 (for application connections)
echo Management Port: 15672 (for web UI)
echo.
pause
