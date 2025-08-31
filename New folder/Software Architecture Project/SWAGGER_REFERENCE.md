# 🔍 **Swagger UI Reference Guide**

## 📚 **Interactive API Documentation**

All services in this microservices integration provide **Swagger UI** for interactive API testing and documentation.

---

## 🚀 **Orders Service Swagger UI**

### **Access URL**
```
http://localhost:3000/api-docs
```

### **Available Endpoints**
- **POST** `/orders` - Create a new order
- **GET** `/orders/{orderId}` - Get order by ID

### **Features**
- ✅ **Interactive Testing** - Test APIs directly from the browser
- ✅ **Request/Response Examples** - See expected data formats
- ✅ **Schema Validation** - Understand required fields
- ✅ **Real-time Testing** - Execute requests and see responses

---

## 💳 **Payments Service Swagger UI**

### **Access URL**
```
http://localhost:3001/api-docs
```

### **Available Endpoints**
- **GET** `/payments/{orderId}` - Get payment details by order ID

### **Features**
- ✅ **Payment Status Monitoring** - Check payment processing status
- ✅ **Order Payment Lookup** - Find payments by order ID
- ✅ **Response Schema** - Understand payment data structure

---

## 📦 **Shipping Service Swagger UI**

### **Access URL**
```
http://localhost:3002/api-docs
```

### **Available Endpoints**
- **GET** `/shipping/{orderId}` - Get shipping details by order ID
- **POST** `/shipping` - Create shipping record manually

### **Features**
- ✅ **Shipping Status Monitoring** - Check shipping processing status
- ✅ **Manual Shipping Creation** - Create shipping records for testing
- ✅ **Address Validation** - Understand required address fields

---

## 🎯 **Orchestrator Service**

### **Note: No Swagger UI**
The Orchestrator Service doesn't have Swagger UI but provides these endpoints:

- **GET** `/workflow-status/{orderId}` - Get complete workflow status
- **POST** `/place-order` - Alternative order creation
- **PUT** `/update-catalog-stock/{productId}` - Direct stock updates

---

## 🔧 **How to Use Swagger UI**

### **Step 1: Access the Service**
1. Open your browser
2. Navigate to the service's Swagger UI URL
3. Example: `http://localhost:3000/api-docs`

### **Step 2: Explore Endpoints**
1. **Expand** the endpoint you want to test
2. **Click** "Try it out" button
3. **Fill in** required parameters
4. **Execute** the request

### **Step 3: Test the API**
1. **View** the request details
2. **Modify** parameters if needed
3. **Click** "Execute"
4. **See** the response in real-time

---

## 📋 **Swagger UI Benefits**

### **✅ For Developers**
- **Interactive Testing** - No need for external tools like Postman
- **Real-time Validation** - Immediate feedback on request/response
- **Schema Understanding** - Clear view of data structures
- **Error Handling** - See what errors to expect

### **✅ For API Consumers**
- **Self-Documentation** - Always up-to-date API docs
- **Example Requests** - Copy-paste working examples
- **Response Examples** - Understand what data to expect
- **Testing Environment** - Safe testing without affecting production

---

## 🎯 **Quick Test Examples**

### **Test Orders Service**
1. Go to `http://localhost:3000/api-docs`
2. Expand **POST** `/orders`
3. Click "Try it out"
4. Use this sample data:
```json
{
  "id": "test-order",
  "item": "Test Book",
  "quantity": 1,
  "customerName": "Test User",
  "shippingAddress": {
    "street": "123 Test St",
    "city": "Test City",
    "zipCode": "12345"
  }
}
```
5. Click "Execute"

### **Test Payments Service**
1. Go to `http://localhost:3001/api-docs`
2. Expand **GET** `/payments/{orderId}`
3. Click "Try it out"
4. Enter order ID: `test-order`
5. Click "Execute"

### **Test Shipping Service**
1. Go to `http://localhost:3002/api-docs`
2. Expand **GET** `/shipping/{orderId}`
3. Click "Try it out"
4. Enter order ID: `test-order`
5. Click "Execute"

---

## 🚨 **Important Notes**

### **Service Dependencies**
- **Orders Service** must be running for order creation
- **Payments Service** processes orders automatically via RabbitMQ
- **Shipping Service** processes orders automatically via RabbitMQ
- **Orchestrator** coordinates the entire workflow

### **Data Flow**
1. **Create Order** → Orders Service
2. **Automatic Payment** → Orchestrator → Payments Service
3. **Automatic Shipping** → Orchestrator → Shipping Service
4. **Monitor Status** → Orchestrator workflow-status endpoint

### **Testing Tips**
- **Wait 15-20 seconds** after creating an order for automatic processing
- **Check workflow status** via Orchestrator to see complete progress
- **Use unique order IDs** to avoid conflicts
- **Monitor RabbitMQ queues** for message flow visualization

---

## 🎉 **Success Indicators**

### **✅ Working Integration**
- Order created successfully
- Payment processed automatically (status: "completed")
- Shipping processed automatically (status: "shipped")
- Workflow status shows all stages completed

### **⚠️ Common Issues**
- Service not responding → Check `docker-compose ps`
- Workflow stuck → Check RabbitMQ queues
- Data not persisting → Check MongoDB connections

---

**🔍 Use Swagger UI to explore, test, and understand the microservices APIs interactively!**
