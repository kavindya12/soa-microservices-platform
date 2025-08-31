# 🔐 **OAuth2 Authentication Guide**

## 🎯 **Overview**
This microservices integration now includes **OAuth2 authentication** for all REST API endpoints. The Orchestrator Service acts as the OAuth2 server, while other services are OAuth2 clients.

## ✅ **Key Features**
- **No Timeout** - Tokens don't expire (as requested)
- **JWT Integration** - Secure token-based authentication
- **Scope-Based Access** - Granular permission control
- **Centralized Auth Server** - Single point of authentication
- **Service-to-Service Auth** - Secure inter-service communication

---

## 🏗 **Architecture**

### **OAuth2 Server (Orchestrator Service)**
- **Port**: `3003`
- **Role**: Authorization server, token issuer
- **Endpoints**: `/oauth/authorize`, `/oauth/token`

### **OAuth2 Clients (Other Services)**
- **Orders Service** (`:3000`) - Client ID: `orders-service-client`
- **Payments Service** (`:3001`) - Client ID: `payments-service-client`
- **Shipping Service** (`:3002`) - Client ID: `shipping-service-client`

---

## 🔑 **Authentication Flow**

### **1. Authorization Code Flow**
```
Client App → Orchestrator (/oauth/authorize) → Authorization Code
Client App → Orchestrator (/oauth/token) → Access Token + JWT
Client App → Service API (with JWT) → Protected Resource
```

### **2. Service-to-Service Flow**
```
Service A → Orchestrator (get token) → JWT Token
Service A → Service B (with JWT) → Protected Resource
```

---

## 🚀 **Getting Started**

### **Step 1: Install Dependencies**
```bash
# For each service (Orders, Payments, Shipping, Orchestrator)
npm install
```

### **Step 2: Start Services**
```bash
docker-compose up -d
```

### **Step 3: Verify OAuth2 Server**
```bash
curl http://localhost:3003/health
```

---

## 🔌 **OAuth2 Endpoints**

### **Authorization Endpoint**
```http
GET /oauth/authorize
```

**Parameters:**
- `client_id` - OAuth2 client identifier
- `redirect_uri` - Callback URL
- `scope` - Requested permissions
- `state` - CSRF protection
- `response_type` - Must be "code"

**Example:**
```bash
curl "http://localhost:3003/oauth/authorize?client_id=orders-service-client&redirect_uri=http://localhost:3000/auth/callback&scope=read%20write&response_type=code"
```

### **Token Endpoint**
```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded
```

**Parameters:**
- `grant_type` - Must be "authorization_code"
- `code` - Authorization code from previous step
- `client_id` - OAuth2 client identifier
- `client_secret` - OAuth2 client secret
- `redirect_uri` - Must match authorization request

**Example:**
```bash
curl -X POST http://localhost:3003/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&client_id=orders-service-client&client_secret=orders-service-secret&redirect_uri=http://localhost:3000/auth/callback"
```

---

## 🎭 **Client Applications**

### **Orders Service Client**
```javascript
const OAUTH2_CONFIG = {
    clientID: 'orders-service-client',
    clientSecret: 'orders-service-secret',
    redirectUri: 'http://localhost:3000/auth/callback',
    scope: 'read write'
};
```

### **Payments Service Client**
```javascript
const OAUTH2_CONFIG = {
    clientID: 'payments-service-client',
    clientSecret: 'payments-service-secret',
    redirectUri: 'http://localhost:3001/auth/callback',
    scope: 'read write payments'
};
```

### **Shipping Service Client**
```javascript
const OAUTH2_CONFIG = {
    clientID: 'shipping-service-client',
    clientSecret: 'shipping-service-secret',
    redirectUri: 'http://localhost:3002/auth/callback',
    scope: 'read write shipping'
};
```

---

## 🔒 **Protected Endpoints**

### **Orders Service** (`:3000`)
- **POST** `/orders` → Requires `write` scope
- **GET** `/orders/{id}` → Requires `read` scope
- **GET** `/orders` → Requires `admin` scope

### **Payments Service** (`:3001`)
- **GET** `/payments/{orderId}` → Requires `read` scope
- **GET** `/payments` → Requires `admin` scope

### **Shipping Service** (`:3002`)
- **GET** `/shipping/{orderId}` → Requires `read` scope
- **POST** `/shipping` → Requires `write` scope
- **GET** `/shipping` → Requires `admin` scope

### **Orchestrator Service** (`:3003`)
- **POST** `/place-order` → Requires `write` scope
- **GET** `/workflow-status/{orderId}` → Requires `read` scope
- **PUT** `/update-catalog-stock/{productId}` → Requires `write` scope
- **GET** `/oauth/clients` → Requires `admin` scope

---

## 🧪 **Testing OAuth2**

### **1. Test Authorization Flow**
```bash
# Step 1: Get authorization code
curl "http://localhost:3003/oauth/authorize?client_id=orders-service-client&redirect_uri=http://localhost:3000/auth/callback&scope=read%20write&response_type=code"

# Step 2: Exchange code for token
curl -X POST http://localhost:3003/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=YOUR_CODE&client_id=orders-service-client&client_secret=orders-service-secret&redirect_uri=http://localhost:3000/auth/callback"
```

### **2. Test Protected Endpoint**
```bash
# Use the JWT token from the previous response
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/orders/test123
```

### **3. Test Service Authentication**
```bash
# Check if service is authenticated
curl http://localhost:3000/health
```

---

## 🔧 **Configuration**

### **Environment Variables**
```bash
# OAuth2 Server Configuration
OAUTH2_AUTH_URL=http://localhost:3003/oauth/authorize
OAUTH2_TOKEN_URL=http://localhost:3003/oauth/token

# Client Configuration
OAUTH2_CLIENT_ID=your-service-client
OAUTH2_CLIENT_SECRET=your-service-secret
OAUTH2_CALLBACK_URL=http://localhost:3000/auth/callback

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
```

### **Default Values**
- **JWT Secret**: `your-super-secret-jwt-key`
- **Token Expiry**: `24 hours` (no timeout as requested)
- **Authorization Code Expiry**: `10 minutes`

---

## 🚨 **Security Considerations**

### **Production Recommendations**
1. **Use Strong JWT Secrets** - Generate cryptographically secure secrets
2. **HTTPS Only** - Always use HTTPS in production
3. **Database Storage** - Store tokens and codes in a database, not in memory
4. **Rate Limiting** - Implement rate limiting on OAuth2 endpoints
5. **Audit Logging** - Log all authentication attempts

### **Current Implementation**
- **In-Memory Storage** - Tokens stored in memory (for development)
- **No Token Expiry** - Tokens don't expire (as requested)
- **HTTP Only** - Using HTTP for local development

---

## 📋 **Scope Definitions**

### **Available Scopes**
- **`read`** - Read access to resources
- **`write`** - Write access to resources
- **`payments`** - Payment-specific operations
- **`shipping`** - Shipping-specific operations
- **`admin`** - Administrative access (includes all scopes)

### **Scope Hierarchy**
```
admin > [payments, shipping] > [read, write]
```

---

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. "Unauthorized - Invalid or missing token"**
- Check if JWT token is included in Authorization header
- Verify token format: `Bearer <token>`
- Ensure token hasn't expired

#### **2. "Forbidden - Insufficient permissions"**
- Check if user has required scope
- Verify scope format in JWT payload
- Use `admin` scope for full access

#### **3. "Invalid client"**
- Verify client ID and secret
- Check if client is registered in OAuth2 server
- Ensure redirect URI matches

### **Debug Commands**
```bash
# Check OAuth2 server health
curl http://localhost:3003/health

# List registered clients
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:3003/oauth/clients

# Check service health
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

---

## 📚 **API Examples**

### **Complete OAuth2 Flow**
```bash
# 1. Get authorization code
AUTH_CODE=$(curl -s "http://localhost:3003/oauth/authorize?client_id=orders-service-client&redirect_uri=http://localhost:3000/auth/callback&scope=read%20write&response_type=code" | grep -o 'code=[^&]*' | cut -d'=' -f2)

# 2. Exchange for token
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3003/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=$AUTH_CODE&client_id=orders-service-client&client_secret=orders-service-secret&redirect_uri=http://localhost:3000/auth/callback")

# 3. Extract JWT token
JWT_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"jwt_token":"[^"]*"' | cut -d'"' -f4)

# 4. Use protected endpoint
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/orders/test123
```

---

## 🎉 **Success Indicators**

### **✅ Working OAuth2 Integration**
- OAuth2 server responds to `/oauth/authorize`
- Token exchange works at `/oauth/token`
- JWT tokens are generated and validated
- Protected endpoints require authentication
- Scope-based access control works

### **⚠️ Common Issues**
- Service not responding → Check `docker-compose ps`
- OAuth2 endpoints not working → Check Orchestrator logs
- Authentication failing → Verify JWT secret consistency
- Scope errors → Check scope configuration

---

**🔐 Your microservices now have enterprise-grade OAuth2 authentication with no timeouts!**
