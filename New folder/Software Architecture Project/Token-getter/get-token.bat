@echo off
echo ========================================
echo    OAuth2 Token Acquisition
echo ========================================
echo.
echo Running PowerShell script...
echo.

powershell -ExecutionPolicy Bypass -File "get-oauth-token.ps1"

echo.
echo Batch file completed.
pause
