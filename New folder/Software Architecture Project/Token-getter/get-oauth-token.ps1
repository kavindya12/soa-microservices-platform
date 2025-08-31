# OAuth2 Token Acquisition PowerShell Script
# This script automates the complete OAuth2 flow and displays the JWT token

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    OAuth2 Token Acquisition Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# OAuth2 Configuration
$OAUTH_SERVER = "http://localhost:3003"
$CLIENT_ID = "orders-service-client"
$CLIENT_SECRET = "orders-service-secret"
$REDIRECT_URI = "http://localhost:3000/auth/callback"
$SCOPE = "read write"

Write-Host "[INFO] Configuration:" -ForegroundColor Yellow
Write-Host "  OAuth Server: $OAUTH_SERVER" -ForegroundColor Gray
Write-Host "  Client ID: $CLIENT_ID" -ForegroundColor Gray
Write-Host "  Scope: $SCOPE" -ForegroundColor Gray
Write-Host ""

try {
    # Step 1: Get Authorization Code
    Write-Host "[STEP 1] Getting Authorization Code..." -ForegroundColor Green
    Write-Host ""
    
    $authUrl = "$OAUTH_SERVER/oauth/authorize?client_id=$CLIENT_ID&redirect_uri=$REDIRECT_URI&scope=$SCOPE&response_type=code"
    Write-Host "Requesting: $authUrl" -ForegroundColor Gray
    Write-Host ""
    
    # Make the authorization request
    $authResponse = Invoke-WebRequest -Uri $authUrl -Method GET -MaximumRedirection 0
    
    if ($authResponse.StatusCode -eq 302) {
        $location = $authResponse.Headers.Location
        
        # Extract authorization code from redirect URL
        if ($location -match 'code=([^&]+)') {
            $authCode = $matches[1]
            Write-Host "[SUCCESS] Authorization Code: $authCode" -ForegroundColor Green
            Write-Host ""
        } else {
            throw "No authorization code found in redirect URL: $location"
        }
    } else {
        throw "Unexpected response status: $($authResponse.StatusCode)"
    }
    
    # Step 2: Exchange Authorization Code for Token
    Write-Host "[STEP 2] Exchanging Code for Token..." -ForegroundColor Green
    Write-Host ""
    
    $tokenPayload = @{
        grant_type = "authorization_code"
        code = $authCode
        client_id = $CLIENT_ID
        client_secret = $CLIENT_SECRET
        redirect_uri = $REDIRECT_URI
    } | ConvertTo-Json
    
    Write-Host "Token Request Payload:" -ForegroundColor Gray
    Write-Host $tokenPayload -ForegroundColor Gray
    Write-Host ""
    
    # Make the token request
    $tokenResponse = Invoke-WebRequest -Uri "$OAUTH_SERVER/oauth/token" -Method POST -Body $tokenPayload -ContentType "application/json"
    
    if ($tokenResponse.StatusCode -eq 200) {
        $tokenData = $tokenResponse.Content | ConvertFrom-Json
        
        Write-Host "[SUCCESS] Token Response Received!" -ForegroundColor Green
        Write-Host ""
        
        # Step 3: Extract and Display Token Details
        Write-Host "[STEP 3] Extracting JWT Token..." -ForegroundColor Green
        Write-Host ""
        
        if ($tokenData.jwt_token) {
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "         TOKEN ACQUISITION SUCCESS" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            
            Write-Host "JWT Token:" -ForegroundColor Cyan
            Write-Host $tokenData.jwt_token -ForegroundColor White
            Write-Host ""
            
            Write-Host "Access Token:" -ForegroundColor Cyan
            Write-Host $tokenData.access_token -ForegroundColor White
            Write-Host ""
            
            Write-Host "Token Type:" -ForegroundColor Cyan
            Write-Host $tokenData.token_type -ForegroundColor White
            Write-Host ""
            
            Write-Host "Expires In:" -ForegroundColor Cyan
            Write-Host "$($tokenData.expires_in) seconds" -ForegroundColor White
            Write-Host ""
            
            Write-Host "Scope:" -ForegroundColor Cyan
            Write-Host $tokenData.scope -ForegroundColor White
            Write-Host ""
            
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "[INFO] Token acquired successfully!" -ForegroundColor Green
            Write-Host "[INFO] Use the JWT Token in Authorization header:" -ForegroundColor Yellow
            Write-Host "[INFO] Authorization: Bearer $($tokenData.jwt_token)" -ForegroundColor Yellow
            Write-Host "========================================" -ForegroundColor Green
            
            # Set environment variables for the current session
            $env:JWT_TOKEN = $tokenData.jwt_token
            $env:ACCESS_TOKEN = $tokenData.access_token
            $env:TOKEN_TYPE = $tokenData.token_type
            $env:EXPIRES_IN = $tokenData.expires_in
            $env:SCOPE = $tokenData.scope
            
            Write-Host ""
            Write-Host "[INFO] Environment variables set for this session:" -ForegroundColor Yellow
            Write-Host "  JWT_TOKEN: $env:JWT_TOKEN" -ForegroundColor Gray
            Write-Host "  ACCESS_TOKEN: $env:ACCESS_TOKEN" -ForegroundColor Gray
            Write-Host "  TOKEN_TYPE: $env:TOKEN_TYPE" -ForegroundColor Gray
            Write-Host "  EXPIRES_IN: $env:EXPIRES_IN seconds" -ForegroundColor Gray
            Write-Host "  SCOPE: $env:SCOPE" -ForegroundColor Gray
            
        } else {
            throw "No JWT token found in response"
        }
        
    } else {
        throw "Token request failed with status: $($tokenResponse.StatusCode)"
    }
    
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Full error details:" -ForegroundColor Red
    Write-Host $_.Exception -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Script completed" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
