# 🚀 SOA & Microservices Platform - GlobalBooks Inc.

A complete Service-Oriented Architecture (SOA) and microservices platform for order management, payment processing, shipping, and catalog management with OAuth2 authentication and event-driven workflow orchestration.

---

## 🎯 Project Overview

This project demonstrates the migration of a monolithic order-processing system into a **SOA-based microservices architecture** with the following services:

1. **Catalog Service** (SOAP + REST)
2. **Orders Service** (REST)
3. **Payments Service** (REST)
4. **Shipping Service** (REST)
5. **Orchestrator Service** (OAuth2 Authorization + workflow management)

**Key Features:**

- OAuth2 authentication with JWT tokens
- Event-driven messaging via RabbitMQ
- Full order workflow: creation → payment → shipping → stock update
- RESTful APIs with Swagger documentation
- Secure service-to-service communication
- Scalable and containerized with Docker

---

## 🏗️ Architecture

Client → Orchestrator Service → Orders/Payments/Shipping → Catalog Service
↑ ↑
OAuth2 RabbitMQ Messaging

yaml
Copy code

- **Databases:** MongoDB for Orders, Payments, Shipping
- **Message Broker:** RabbitMQ for asynchronous workflow events
- **Catalog:** Java SOAP/REST service

---

## 🗂️ File Structure

SOA-MicroService/

├── Orchestrator/ # OAuth2 server & workflow orchestrator

├── Orders/ # Orders microservice

├── Payments/ # Payments microservice

├── Shipping/ # Shipping microservice

├── CatalogService/ # Java SOAP + REST catalog service

├── docker-compose.yml

├── README.md

├── ENDPOINTS_SUMMARY.md

├── SWAGGER_REFERENCE.md

└── OAUTH2_GUIDE.md

---

## 🚀 Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 16+ (for JS services)
- Java 11+ & Maven (for Catalog Service)

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd SOA-MicroService

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
Service URLs
Service	Port	Description
Orchestrator	3003	OAuth2 + workflow API
Orders	3000	Order management REST API
Payments	3001	Payment processing REST API
Shipping	3002	Shipping management REST API
Catalog	8080	SOAP + REST product catalog
RabbitMQ	15672	Management console

🧪 Testing
SOAP UI: Test CatalogService SOAP endpoints

Postman / curl: Test REST APIs for Orders, Payments, Shipping, Orchestrator

Workflow Testing: Create orders via Orchestrator and observe automatic payment/shipping processing

📄 Design Docs & Reports
ENDPOINTS_SUMMARY.md: Complete API reference

SWAGGER_REFERENCE.md: Swagger/OpenAPI guides

OAUTH2_GUIDE.md: OAuth2 setup instructions

Reflective Report: Trade-offs and design decisions (submit separately)

🔧 Development Notes
Individual services can be started locally:

cd Orders && npm install && npm run dev
cd Payments && npm install && npm run dev
cd Shipping && npm install && npm run dev
cd Orchestrator && npm install && npm run dev
Environment variables (MongoDB URIs, OAuth2 credentials, JWT secret) are required for local dev.

📚 References
Docker & Docker Compose documentation

RabbitMQ messaging guides

MongoDB usage for microservices

OAuth2 and JWT authentication patterns
