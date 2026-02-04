@echo off
echo ============================================
echo    RabbitMQ Status Checker
echo ============================================
echo.

echo Checking RabbitMQ Service Status...
sc query RabbitMQ | find "RUNNING" >nul
if %errorLevel% equ 0 (
    echo [OK] RabbitMQ service is RUNNING
) else (
    echo [!] RabbitMQ service is NOT RUNNING
    echo.
    echo To start RabbitMQ, run:
    echo   net start RabbitMQ
)

echo.
echo Checking if RabbitMQ ports are listening...
netstat -an | find ":5672" | find "LISTENING" >nul
if %errorLevel% equ 0 (
    echo [OK] AMQP port 5672 is listening
) else (
    echo [!] AMQP port 5672 is NOT listening
)

netstat -an | find ":15672" | find "LISTENING" >nul
if %errorLevel% equ 0 (
    echo [OK] Management UI port 15672 is listening
) else (
    echo [!] Management UI port 15672 is NOT listening
)

echo.
echo ============================================
echo    Connection Information
echo ============================================
echo Management UI: http://localhost:15672
echo Username: guest
echo Password: guest
echo AMQP Port: 5672
echo ============================================
echo.
pause
