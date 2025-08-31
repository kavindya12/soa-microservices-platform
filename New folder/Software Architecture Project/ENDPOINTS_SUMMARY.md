# 🔌 **API Endpoints Quick Reference**

## 📍 **Service URLs**

| Service | Base URL | Status |
|---------|----------|--------|
| **Orders** | `http://localhost:3000` | ✅ Working |
| **Payments** | `http://localhost:3001` | ✅ Working |
| **Shipping** | `http://localhost:3002` | ✅ Working |
| **Orchestrator** | `http://localhost:3003` | ✅ Working |
| **Catalog** | `http://localhost:8080` | ⚠️ SOAP Only |
| **RabbitMQ** | `http://localhost:15672` | ✅ Working |

---

## 🚀 **Orders Service** (`:3000`)

### **Endpoints**
- **GET** `/` → Service status
- **POST** `/orders` → Create new order
- **GET** `/orders/{orderId}` → Get order by ID
- **GET** `/api-docs` → Swagger UI

### **Sample Request**
```json
POST /orders
{
  "id": "order123",
  "item": "Book Title",
  "quantity": 2,
  "customerName": "John Doe",
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "zipCode": "10001"
  }
}
```

---

## 💳 **Payments Service** (`:3001`)

### **Endpoints**
- **GET** `/` → Service status
- **GET** `/payments/{orderId}` → Get payment by order ID
- **GET** `/api-docs` → Swagger UI

### **Sample Response**
```json
{
  "_id": "payment_id",
  "orderId": "order123",
  "paymentId": "PAY-12345",
  "amount": 200,
  "status": "completed",
  "createdAt": "2025-08-29T...",
  "updatedAt": "2025-08-29T..."
}
```

---

## 📦 **Shipping Service** (`:3002`)

### **Endpoints**
- **GET** `/` → Service status
- **GET** `/shipping/{orderId}` → Get shipping by order ID
- **POST** `/shipping` → Create shipping record manually
- **GET** `/api-docs` → Swagger UI

### **Sample Response**
```json
{
  "_id": "shipping_id",
  "orderId": "order123",
  "shippingId": "SHIP-12345",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "zipCode": "10001"
  },
  "status": "shipped",
  "createdAt": "2025-08-29T...",
  "updatedAt": "2025-08-29T..."
}
```

---

## 🎯 **Orchestrator Service** (`:3003`)

### **Endpoints**
- **GET** `/` → Service status
- **GET** `/workflow-status/{orderId}` → Get complete workflow status
- **POST** `/place-order` → Alternative order creation
- **PUT** `/update-catalog-stock/{productId}` → Direct stock updates

### **Workflow Status Response**
```json
{
  "orderId": "order123",
  "details": {
    "order": { "status": "pending", ... },
    "payment": { "status": "completed", ... },
    "shipping": { "status": "shipped", ... }
  }
}
```

---

## 📚 **Catalog Service** (`:8080`)

### **SOAP Endpoints**
- **WSDL**: `http://localhost:8080/CatalogService?wsdl`
- **SOAP Service**: `http://localhost:8080/CatalogService`

### **REST Endpoints** (Currently not working)
- **GET** `/api/products` → Get all products
- **PUT** `/api/products/{productId}/stock` → Update product stock

---

## 🔍 **Swagger UI Access**

| Service | Swagger URL |
|---------|-------------|
| **Orders** | `http://localhost:3000/api-docs` |
| **Payments** | `http://localhost:3001/api-docs` |
| **Shipping** | `http://localhost:3002/api-docs` |

---

## 🧪 **Quick Testing Commands**

### **PowerShell**
```powershell
# Create order
Invoke-WebRequest -Uri "http://localhost:3000/orders" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"id": "test123", "item": "Test Book", "quantity": 1, "customerName": "Test User", "shippingAddress": {"street": "123 Test St", "city": "Test City", "zipCode": "12345"}}'

# Check workflow status
Invoke-WebRequest -Uri "http://localhost:3003/workflow-status/test123" -Method GET
```

### **cURL**
```bash
# Create order
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"id": "test123", "item": "Test Book", "quantity": 1, "customerName": "Test User", "shippingAddress": {"street": "123 Test St", "city": "Test City", "zipCode": "12345"}}'

# Check workflow status
curl http://localhost:3003/workflow-status/test123
```

---

## 📊 **Monitoring Endpoints**

### **Health Checks**
- **Orders**: `http://localhost:3000/`
- **Payments**: `http://localhost:3001/`
- **Shipping**: `http://localhost:3002/`
- **Orchestrator**: `http://localhost:3003/`

### **RabbitMQ Management**
- **URL**: `http://localhost:15672`
- **Credentials**: `guest` / `guest`

---

## 🎯 **Workflow Testing**

### **Complete Flow Test**
1. **Create Order** → `POST /orders`
2. **Wait 15-20 seconds** for automatic processing
3. **Check Status** → `GET /workflow-status/{orderId}`
4. **Verify Results** → All stages should show "completed"/"shipped"

### **Expected Timeline**
- **Order Creation**: Immediate
- **Payment Processing**: 5-10 seconds
- **Shipping Processing**: 10-15 seconds
- **Complete Workflow**: 15-20 seconds total

---

## 🚨 **Important Notes**

- **Use unique order IDs** to avoid conflicts
- **Wait for processing** before checking status
- **Monitor RabbitMQ queues** for message flow
- **Check service logs** if issues occur
- **All services must be running** for complete workflow

---

**🔌 Use these endpoints to test and integrate with the microservices!**
