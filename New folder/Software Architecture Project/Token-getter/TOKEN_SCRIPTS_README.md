# 🔐 **OAuth2 Token Acquisition Scripts**

This directory contains scripts to automatically acquire OAuth2 JWT tokens from the Orchestrator Service.

## 📁 **Available Scripts**

### **1. `get-oauth-token.ps1` (PowerShell Script - Recommended)**
- **Primary script** for OAuth2 token acquisition
- **Most reliable** and feature-rich
- **Colored output** for better readability
- **Error handling** with detailed error messages
- **Environment variables** set automatically

### **2. `get-token.bat` (Batch File)**
- **Simple wrapper** that calls the PowerShell script
- **Easy to double-click** and run
- **No manual PowerShell execution** needed

### **3. `get-oauth-token.bat` (Complex Batch File)**
- **Pure batch implementation** using PowerShell commands
- **Alternative option** if PowerShell script has issues
- **More complex** but self-contained

## 🚀 **How to Use**

### **Option 1: Double-Click (Easiest)**
1. **Double-click** `get-token.bat`
2. **Wait** for the script to complete
3. **Copy** the JWT token from the output

### **Option 2: PowerShell Direct**
1. **Right-click** `get-oauth-token.ps1`
2. **Select** "Run with PowerShell"
3. **Or** open PowerShell and run: `.\get-oauth-token.ps1`

### **Option 3: Command Line**
```bash
# From Command Prompt
get-token.bat

# From PowerShell
.\get-oauth-token.ps1
```

## 📋 **What the Scripts Do**

### **Step 1: Get Authorization Code**
- Requests authorization from Orchestrator OAuth2 server
- Receives a temporary authorization code
- **No user interaction required** (automatic approval)

### **Step 2: Exchange Code for Token**
- Sends authorization code to token endpoint
- Receives JWT token and access token
- **Token valid for 24 hours** (no timeout as requested)

### **Step 3: Display Results**
- Shows **JWT Token** (main token for API calls)
- Shows **Access Token** (OAuth2 access token)
- Shows **Token Type** (Bearer)
- Shows **Expiration** (86400 seconds = 24 hours)
- Shows **Scope** (read write permissions)

## 🔧 **Configuration**

The scripts use these **pre-configured settings**:

```powershell
$OAUTH_SERVER = "http://localhost:3003"
$CLIENT_ID = "orders-service-client"
$CLIENT_SECRET = "orders-service-secret"
$REDIRECT_URI = "http://localhost:3000/auth/callback"
$SCOPE = "read write"
```

**No changes needed** - these are the correct values for your setup.

## 📤 **Output Example**

When successful, you'll see:

```
========================================
         TOKEN ACQUISITION SUCCESS
========================================

JWT Token:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvcmRlcnMtc2VydmljZS1jbGllbnQi...

Access Token:
df8e34fc-915f-4f72-a08c-3d7bed380377

Token Type:
Bearer

Expires In:
86400 seconds

Scope:
read write
```

## 🎯 **Using the Token**

### **In Postman:**
1. **Header**: `Authorization`
2. **Value**: `Bearer YOUR_JWT_TOKEN`

### **In PowerShell:**
```powershell
$headers = @{ "Authorization" = "Bearer $env:JWT_TOKEN" }
Invoke-WebRequest -Uri "http://localhost:3003/workflow-status/order123" -Headers $headers
```

### **In cURL:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3003/workflow-status/order123
```

## ⚠️ **Important Notes**

1. **Orchestrator Service Must Be Running** on port 3003
2. **Fresh Token Each Run** - authorization codes are single-use
3. **24-Hour Validity** - tokens expire after 24 hours
4. **Automatic Cleanup** - temporary files are removed automatically
5. **Error Handling** - detailed error messages if something goes wrong

## 🚨 **Troubleshooting**

### **"Execution Policy" Error:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### **"Service Unavailable" Error:**
- Check if Orchestrator service is running
- Verify port 3003 is accessible

### **"Authorization Failed" Error:**
- Check client credentials in the script
- Verify OAuth2 server configuration

## 🎉 **Success Indicators**

- ✅ **Authorization Code** received
- ✅ **Token Response** received (200 status)
- ✅ **JWT Token** extracted and displayed
- ✅ **Environment Variables** set automatically
- ✅ **Clean output** with no error messages

---

**🎯 The scripts are now ready to use! Double-click `get-token.bat` for the easiest experience.**
