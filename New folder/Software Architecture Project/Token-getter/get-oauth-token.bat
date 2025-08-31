@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    OAuth2 Token Acquisition Script
echo ========================================
echo.

:: Set OAuth2 configuration
set "OAUTH_SERVER=http://localhost:3003"
set "CLIENT_ID=orders-service-client"
set "CLIENT_SECRET=orders-service-secret"
set "REDIRECT_URI=http://localhost:3000/auth/callback"
set "SCOPE=read write"

echo [INFO] Configuration:
echo   OAuth Server: %OAUTH_SERVER%
echo   Client ID: %CLIENT_ID%
echo   Scope: %SCOPE%
echo.

:: Step 1: Get Authorization Code
echo [STEP 1] Getting Authorization Code...
echo.

set "AUTH_URL=%OAUTH_SERVER%/oauth/authorize?client_id=%CLIENT_ID%&redirect_uri=%REDIRECT_URI%&scope=%SCOPE%&response_type=code"

echo Requesting: %AUTH_URL%
echo.

:: Use PowerShell to make the HTTP request and capture the redirect
powershell -Command "try { $response = Invoke-WebRequest -Uri '%AUTH_URL%' -Method GET -MaximumRedirection 0; if ($response.StatusCode -eq 302) { $location = $response.Headers.Location; if ($location -match 'code=([^&]+)') { $matches[1]; exit 0 } else { Write-Host 'No authorization code found in redirect'; exit 1 } } else { Write-Host 'Unexpected response status: ' + $response.StatusCode; exit 1 } } catch { Write-Host 'Error getting authorization code: ' + $_.Exception.Message; exit 1 }" > temp_auth_code.txt 2>&1

if not exist "temp_auth_code.txt" (
    echo [ERROR] Failed to create temporary file
    goto :cleanup
)

:: Read the authorization code from the file
set /p AUTH_CODE=<temp_auth_code.txt

:: Check if we got a valid authorization code
echo %AUTH_CODE% | findstr /r "^[a-f0-9-]*$" >nul
if errorlevel 1 (
    echo [ERROR] Failed to get authorization code
    echo Response: %AUTH_CODE%
    goto :cleanup
)

echo [SUCCESS] Authorization Code: %AUTH_CODE%
echo.

:: Step 2: Exchange Authorization Code for Token
echo [STEP 2] Exchanging Code for Token...
echo.

:: Create JSON payload for token request
set "TOKEN_PAYLOAD={\"grant_type\":\"authorization_code\",\"code\":\"%AUTH_CODE%\",\"client_id\":\"%CLIENT_ID%\",\"client_secret\":\"%CLIENT_SECRET%\",\"redirect_uri\":\"%REDIRECT_URI%\"}"

echo Token Request Payload:
echo %TOKEN_PAYLOAD%
echo.

:: Use PowerShell to make the token request
powershell -Command "try { $response = Invoke-WebRequest -Uri '%OAUTH_SERVER%/oauth/token' -Method POST -Body '%TOKEN_PAYLOAD%' -ContentType 'application/json'; $response.Content; exit 0 } catch { Write-Host 'Error getting token: ' + $_.Exception.Message; exit 1 }" > temp_token_response.txt 2>&1

if not exist "temp_token_response.txt" (
    echo [ERROR] Failed to create token response file
    goto :cleanup
)

:: Read the token response
set /p TOKEN_RESPONSE=<temp_token_response.txt

:: Check if we got a valid token response
echo %TOKEN_RESPONSE% | findstr "jwt_token" >nul
if errorlevel 1 (
    echo [ERROR] Failed to get valid token response
    echo Response: %TOKEN_RESPONSE%
    goto :cleanup
)

echo [SUCCESS] Token Response Received!
echo.

:: Extract and display the JWT token
echo [STEP 3] Extracting JWT Token...
echo.

:: Use PowerShell to parse JSON and extract JWT token
powershell -Command "try { $response = '%TOKEN_RESPONSE%' | ConvertFrom-Json; if ($response.jwt_token) { Write-Host 'JWT_TOKEN=' + $response.jwt_token; Write-Host 'ACCESS_TOKEN=' + $response.access_token; Write-Host 'TOKEN_TYPE=' + $response.token_type; Write-Host 'EXPIRES_IN=' + $response.expires_in; Write-Host 'SCOPE=' + $response.scope; exit 0 } else { Write-Host 'No JWT token found in response'; exit 1 } } catch { Write-Host 'Error parsing token response: ' + $_.Exception.Message; exit 1 }" > temp_token_details.txt 2>&1

if not exist "temp_token_details.txt" (
    echo [ERROR] Failed to parse token response
    goto :cleanup
)

:: Display the extracted token details
echo ========================================
echo         TOKEN ACQUISITION SUCCESS
echo ========================================
echo.
type temp_token_details.txt
echo.
echo ========================================
echo [INFO] Token saved to environment variables
echo [INFO] You can now use these tokens in your requests
echo ========================================
echo.

:: Set environment variables for the current session
for /f "tokens=1,2 delims==" %%a in (temp_token_details.txt) do (
    set "%%a=%%b"
)

echo [INFO] Environment variables set for this session:
echo   JWT_TOKEN: !JWT_TOKEN!
echo   ACCESS_TOKEN: !ACCESS_TOKEN!
echo   TOKEN_TYPE: !TOKEN_TYPE!
echo   EXPIRES_IN: !EXPIRES_IN! seconds
echo   SCOPE: !SCOPE!
echo.

goto :cleanup

:cleanup
:: Clean up temporary files
if exist "temp_auth_code.txt" del "temp_auth_code.txt"
if exist "temp_token_response.txt" del "temp_token_response.txt"
if exist "temp_token_details.txt" del "temp_token_details.txt"

echo [INFO] Temporary files cleaned up
echo.
echo ========================================
echo    Script completed
echo ========================================
echo.
pause
