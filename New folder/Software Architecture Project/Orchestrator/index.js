const express = require('express');
const amqp = require('amqplib');
const axios = require('axios'); // New: for making HTTP requests
const session = require('express-session');
const cors = require('cors');

// Import OAuth2 server configuration
const { 
    passport, 
    isAuthenticated, 
    hasScope, 
    handleAuthorization, 
    handleToken,
    generateServiceToken 
} = require('./oauth-server');

const app = express();
const port = 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
    secret: 'orchestrator-service-secret',
    resave: false,
    saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());

// API Documentation endpoint
app.get('/api-docs', (req, res) => {
    res.json({
        message: 'Orchestrator Service API',
        endpoints: {
            'GET /': 'Service status',
            'GET /health': 'Health check',
            'POST /place-order': 'Place a new order (requires write scope)',
            'GET /workflow-status/:orderId': 'Check order workflow status (requires read scope)',
            'PUT /update-catalog-stock/:productId': 'Update catalog stock (requires write scope)',
            'GET /oauth/authorize': 'OAuth2 authorization endpoint',
            'POST /oauth/token': 'OAuth2 token endpoint',
            'GET /oauth/clients': 'List OAuth2 clients (requires admin scope)'
        }
    });
});

let channel, connection;
const rabbitmq_url = 'amqp://rabbitmq';

// Function to update catalog stock
async function updateCatalogStock(productId, quantity) {
    try {
        const response = await axios.put(`http://catalog:8080/api/products/${productId}/stock`, {
            quantity: quantity
        });
        
        if (response.data.success) {
            console.log(`Catalog stock updated successfully for product ${productId}. New quantity: ${response.data.product.quantity}`);
            return true;
        } else {
            console.error(`Failed to update catalog stock for product ${productId}: ${response.data.message}`);
            return false;
        }
    } catch (error) {
        console.error(`Error updating catalog stock for product ${productId}:`, error.message);
        return false;
    }
}

// Function to get OAuth2 token for inter-service communication
async function getServiceToken() {
    try {
        // Generate a service-to-service token with read and write scope
        const token = generateServiceToken('orchestrator-service', 'read write');
        return token;
    } catch (error) {
        console.error('Error generating service token:', error);
        return null;
    }
}

// Function to make authenticated HTTP requests to other services
async function makeAuthenticatedRequest(url, method = 'GET', data = null) {
    try {
        const token = await getServiceToken();
        if (!token) {
            throw new Error('Failed to generate service token');
        }

        const config = {
            method: method,
            url: url,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`Authenticated request failed for ${url}:`, error.message);
        throw error;
    }
}

async function connectRabbitMQ() {
    let retries = 5;
    while (retries) {
        try {
            connection = await amqp.connect(rabbitmq_url);
            channel = await connection.createChannel();

            await channel.assertQueue('order_initiation_queue'); // For initial order requests from Orders service
            await channel.assertQueue('payment_command_queue');
            await channel.assertQueue('shipping_command_queue');
            await channel.assertQueue('payment_completed_queue');
            await channel.assertQueue('shipping_completed_queue');

            console.log('Orchestrator Connected to RabbitMQ');

            // Consume initial order requests
            channel.consume('order_initiation_queue', async (msg) => {
                const order = JSON.parse(msg.content.toString());
                console.log("Orchestrator received initial order:", order);

                // Store the complete order data for later use
                global.orderData = global.orderData || {};
                global.orderData[order.id] = order;

                // Step 1: Send command to Payment service
                channel.sendToQueue('payment_command_queue', Buffer.from(JSON.stringify(order)));
                console.log("Orchestrator sent payment command for order:", order.id);
                channel.ack(msg);
            }, { noAck: false });

            // Consume payment completed events
            channel.consume('payment_completed_queue', async (msg) => {
                const paymentResult = JSON.parse(msg.content.toString());
                console.log("Orchestrator received payment completed for order:", paymentResult.orderId);

                // Step 2: Upon successful payment, send command to Shipping service
                // Get the complete order data including shippingAddress
                const orderId = paymentResult.orderId;
                const completeOrder = global.orderData[orderId];
                
                if (completeOrder) {
                    channel.sendToQueue('shipping_command_queue', Buffer.from(JSON.stringify(completeOrder)));
                    console.log("Orchestrator sent shipping command for order:", orderId, "with complete data");
                } else {
                    console.error("Could not find complete order data for order:", orderId);
                    // Fallback: try to reconstruct with available data
                    const fallbackOrder = { 
                        id: orderId, 
                        item: paymentResult.item, 
                        quantity: paymentResult.quantity 
                    };
                    channel.sendToQueue('shipping_command_queue', Buffer.from(JSON.stringify(fallbackOrder)));
                    console.log("Orchestrator sent shipping command with fallback data for order:", orderId);
                }
                
                channel.ack(msg);
            }, { noAck: false });

            // Consume shipping completed events
            channel.consume('shipping_completed_queue', async (msg) => {
                const shippingResult = JSON.parse(msg.content.toString());
                console.log("Orchestrator received shipping completed for order:", shippingResult.orderId);
                
                // Step 3: Update catalog stock when shipping is completed
                if (shippingResult.productId && shippingResult.quantity) {
                    const stockUpdateSuccess = await updateCatalogStock(shippingResult.productId, shippingResult.quantity);
                    if (stockUpdateSuccess) {
                        console.log(`Order ${shippingResult.orderId} workflow completed successfully with stock update.`);
                    } else {
                        console.error(`Order ${shippingResult.orderId} workflow completed but stock update failed.`);
                    }
                } else {
                    console.log(`Order ${shippingResult.orderId} workflow completed successfully.`);
                }
                
                channel.ack(msg);
            }, { noAck: false });
            return;

        } catch (error) {
            retries--;
            console.error(`Orchestrator service failed to connect to RabbitMQ. Retries left: ${retries}`, error.message);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
        }
    }
    console.error('Orchestrator service failed to connect to RabbitMQ after multiple retries.');
}

connectRabbitMQ();

// Orchestrator endpoint to initiate an order (optional, can be triggered by Orders service)
app.post('/place-order', isAuthenticated, hasScope('write'), async (req, res) => {
    const order = req.body;
    
    try {
        // Step 1: Create the order in the Orders service database first
        console.log(`Creating order ${order.id} in Orders service...`);
        const orderResponse = await makeAuthenticatedRequest(`http://orders:3000/orders`, 'POST', order);
        console.log(`Order ${order.id} created successfully in Orders service`);
        
        // Step 2: Send to RabbitMQ for workflow processing
        if (channel) {
            channel.sendToQueue('order_initiation_queue', Buffer.from(JSON.stringify(order)));
            console.log(`Order ${order.id} sent to RabbitMQ for workflow processing`);
            return res.status(200).send(`Order ${order.id} created and initiation request sent to orchestrator.`);
        } else {
            return res.status(500).send('Orchestrator failed to connect to RabbitMQ.');
        }
    } catch (error) {
        console.error(`Error creating order ${order.id}:`, error.message);
        return res.status(500).send(`Failed to create order: ${error.message}`);
    }
});

// New: Endpoint to get workflow status
app.get('/workflow-status/:orderId', isAuthenticated, hasScope('read'), async (req, res) => {
    const orderId = req.params.orderId;
    let workflowStatus = { orderId: orderId, details: {} };

    try {
        // Fetch Order details
        const orderResponse = await makeAuthenticatedRequest(`http://orders:3000/orders/${orderId}`);
        workflowStatus.details.order = orderResponse;
    } catch (error) {
        workflowStatus.details.order = { status: 'not_found', message: 'Order details not found or Orders service unavailable.' };
        console.warn(`Could not fetch order ${orderId} from Orders service:`, error.message);
    }

    try {
        // Fetch Payment details
        const paymentResponse = await makeAuthenticatedRequest(`http://payments:3001/payments/${orderId}`);
        workflowStatus.details.payment = paymentResponse;
    } catch (error) {
        workflowStatus.details.payment = { status: 'not_found', message: 'Payment details not found or Payments service unavailable.' };
        console.warn(`Could not fetch payment for order ${orderId} from Payments service:`, error.message);
    }

    try {
        // Fetch Shipping details
        const shippingResponse = await makeAuthenticatedRequest(`http://shipping:3002/shipping/${orderId}`);
        workflowStatus.details.shipping = shippingResponse;
    } catch (error) {
        workflowStatus.details.shipping = { status: 'not_found', message: 'Shipping details not found or Shipping service unavailable.' };
        console.warn(`Could not fetch shipping for order ${orderId} from Shipping service:`, error.message);
    }

    res.status(200).json(workflowStatus);
});

// New: Direct endpoint to update catalog stock (for testing)
app.put('/update-catalog-stock/:productId', isAuthenticated, hasScope('write'), async (req, res) => {
    const productId = req.params.productId;
    const { quantity } = req.body;
    
    if (!quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be a positive number' });
    }
    
    try {
        const success = await updateCatalogStock(productId, quantity);
        if (success) {
            res.status(200).json({ message: `Stock updated successfully for product ${productId}` });
        } else {
            res.status(500).json({ error: `Failed to update stock for product ${productId}` });
        }
    } catch (error) {
        res.status(500).json({ error: `Error updating stock: ${error.message}` });
    }
});

// Basic Route
app.get('/', (req, res) => {
    res.send('Orchestrator Service API - OAuth2 Server');
});

// OAuth2 Server Endpoints
app.get('/oauth/authorize', handleAuthorization);
app.post('/oauth/token', handleToken);

// Health check endpoint (no authentication required)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        service: 'Orchestrator Service',
        timestamp: new Date().toISOString()
    });
});

// OAuth2 Client Management (admin only)
app.get('/oauth/clients', isAuthenticated, hasScope('admin'), (req, res) => {
    res.json({
        message: 'OAuth2 clients registered',
        clients: Object.keys(require('./oauth-server').clients || {})
    });
});

app.listen(port, () => {
    console.log(`Orchestrator service listening at http://localhost:${port}`);
    console.log('OAuth2 server enabled');
    console.log('OAuth2 endpoints: /oauth/authorize, /oauth/token');
});
