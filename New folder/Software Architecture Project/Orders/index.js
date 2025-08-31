const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./openapi.yaml');
const session = require('express-session');
const cors = require('cors');

// Import OAuth2 configuration
const { passport, isAuthenticated, hasScope } = require('./auth-config');

// Define Order Schema and Model
const OrderSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    item: { type: String, required: true },
    quantity: { type: Number, required: true },
    customerName: { type: String, required: true },
    shippingAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        zipCode: { type: String, required: true },
    },
    status: { type: String, default: 'pending' }, // e.g., pending, processed, shipped
    createdBy: { type: String, required: false }, // Track who created the order
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Order = mongoose.model('Order', OrderSchema);

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
    secret: 'orders-service-secret',
    resave: false,
    saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// RabbitMQ Connection
let channel, connection;
const rabbitmq_url = 'amqp://rabbitmq';

async function connectRabbitMQ() {
    let retries = 5;
    while (retries) {
        try {
            connection = await amqp.connect(rabbitmq_url);
            channel = await connection.createChannel();
            await channel.assertQueue('order_initiation_queue'); // New queue for orchestrator
            await channel.assertQueue('order_queue');
            console.log('Orders service Connected to RabbitMQ');
            return;
        } catch (error) {
            retries--;
            console.error(`Orders service failed to connect to RabbitMQ. Retries left: ${retries}`, error.message);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
        }
    }
    console.error('Orders service failed to connect to RabbitMQ after multiple retries.');
}

connectRabbitMQ();

// MongoDB Connection
mongoose.connect('mongodb://orders-db:27017/orders', {
})
.then(() => console.log('Connected to Orders MongoDB'))
.catch(err => console.error('Could not connect to Orders MongoDB...', err));

// Basic Route
app.get('/', (req, res) => {
  res.send('Orders Service API - OAuth2 Protected');
});

// OAuth2 Authentication Routes
app.get('/auth/login', passport.authenticate('oauth2'));

app.get('/auth/callback', 
    passport.authenticate('oauth2', { failureRedirect: '/auth/failure' }),
    (req, res) => {
        res.redirect('/auth/success');
    }
);

app.get('/auth/success', (req, res) => {
    res.json({ message: 'Authentication successful', user: req.user });
});

app.get('/auth/failure', (req, res) => {
    res.status(401).json({ error: 'Authentication failed' });
});

// Protected Routes - Require Authentication
app.post('/orders', isAuthenticated, hasScope('write'), async (req, res) => {
    const { id, item, quantity, customerName, shippingAddress } = req.body;

    try {
        const newOrder = new Order({ 
            id, 
            item, 
            quantity, 
            customerName, 
            shippingAddress,
            createdBy: req.user.email || req.user.id
        });
        await newOrder.save();
        console.log('Order saved to MongoDB:', newOrder);

        if (channel) {
            channel.sendToQueue('order_initiation_queue', Buffer.from(JSON.stringify(newOrder)));
            return res.status(200).send(`Order ${newOrder.id} saved and initiation request sent to Orchestrator`);
        } else {
            return res.status(500).send('Failed to connect to RabbitMQ');
        }
    } catch (error) {
        console.error('Error saving order or sending to RabbitMQ:', error);
        return res.status(500).send('Error processing order');
    }
});

app.get('/orders/:id', isAuthenticated, hasScope('read'), async (req, res) => {
    try {
        const order = await Order.findOne({ id: req.params.id });
        if (!order) {
            return res.status(404).send('Order not found');
        }
        res.status(200).json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Get all orders (admin scope required)
app.get('/orders', isAuthenticated, hasScope('admin'), async (req, res) => {
    try {
        const orders = await Order.find({}).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Health check endpoint (no authentication required)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        service: 'Orders Service',
        timestamp: new Date().toISOString()
    });
});

app.listen(port, () => {
  console.log(`Orders service listening at http://localhost:${port}`);
  console.log('OAuth2 authentication enabled');
});
