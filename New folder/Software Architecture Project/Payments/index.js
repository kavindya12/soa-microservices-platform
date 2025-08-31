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

// Define Payment Schema and Model
const PaymentSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    paymentId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    status: { type: String, default: 'pending' }, // e.g., pending, completed, failed
    processedBy: { type: String, required: false }, // Track who processed the payment
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Payment = mongoose.model('Payment', PaymentSchema);

const app = express();
const port = 3001; // Different port for Payments service

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
    secret: 'payments-service-secret',
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
            await channel.assertQueue('payment_command_queue'); // New queue for commands from Orchestrator
            await channel.assertQueue('payment_completed_queue'); // New queue for events to Orchestrator
            // Removed: await channel.assertQueue('order_queue');
            console.log('Payments service Connected to RabbitMQ');

            // Consume payment commands from Orchestrator
            channel.consume('payment_command_queue', async (msg) => {
                const order = JSON.parse(msg.content.toString());
                console.log("Payments service received command to process payment for order:", order);
                
                // Simulate payment processing
                const paymentSuccess = Math.random() > 0.1; // 90% success rate
                const paymentId = `PAY-${Math.floor(Math.random() * 100000)}`;
                const amount = order.quantity * 100; // Example amount calculation

                const newPayment = new Payment({
                    orderId: order.id,
                    paymentId: paymentId,
                    amount: amount,
                    status: paymentSuccess ? 'completed' : 'failed',
                    processedBy: 'system'
                });

                try {
                    await newPayment.save();
                    console.log('Payment saved to MongoDB:', newPayment);
                } catch (dbError) {
                    console.error('Error saving payment to MongoDB:', dbError);
                    // Depending on policy, you might still acknowledge or re-queue
                    channel.ack(msg);
                    return; 
                }

                if (paymentSuccess) {
                    console.log(`Payment processed successfully for order ${order.id}`);
                    const paymentResult = { orderId: order.id, paymentId: paymentId, status: 'completed', item: order.item, quantity: order.quantity, amount: amount };
                    channel.sendToQueue('payment_completed_queue', Buffer.from(JSON.stringify(paymentResult)));
                    console.log("Payments service sent 'payment completed' event for order:", order.id);
                } else {
                    console.log(`Payment failed for order ${order.id}`);
                    const paymentResult = { orderId: order.id, paymentId: paymentId, status: 'failed', item: order.item, quantity: order.quantity, amount: amount };
                    channel.sendToQueue('payment_completed_queue', Buffer.from(JSON.stringify(paymentResult))); // Send failed status to orchestrator
                }
                channel.ack(msg);
            }, { noAck: false });
            return;

        } catch (error) {
            retries--;
            console.error(`Payments service failed to connect to RabbitMQ. Retries left: ${retries}`, error.message);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
        }
    }
    console.error('Payments service failed to connect to RabbitMQ after multiple retries.');
}

connectRabbitMQ();



// MongoDB Connection
mongoose.connect('mongodb://payments-db:27017/payments', {
})
.then(() => console.log('Connected to Payments MongoDB'))
.catch(err => console.error('Could not connect to Payments MongoDB...', err));

// Basic Route
app.get('/', (req, res) => {
  res.send('Payments Service API - OAuth2 Protected');
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
app.get('/payments/:orderId', isAuthenticated, hasScope('read'), async (req, res) => {
    try {
        const payment = await Payment.findOne({ orderId: req.params.orderId });
        if (!payment) {
            return res.status(404).send('Payment details not found for this order.');
        }
        res.status(200).json(payment);
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Get all payments (admin scope required)
app.get('/payments', isAuthenticated, hasScope('admin'), async (req, res) => {
    try {
        const payments = await Payment.find({}).sort({ createdAt: -1 });
        res.status(200).json(payments);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Health check endpoint (no authentication required)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        service: 'Payments Service',
        timestamp: new Date().toISOString()
    });
});

app.listen(port, () => {
  console.log(`Payments service listening at http://localhost:${port}`);
  console.log('OAuth2 authentication enabled');
});

app.get('/payments/:orderId', async (req, res) => {
    try {
        const payment = await Payment.findOne({ orderId: req.params.orderId });
        if (!payment) {
            return res.status(404).send('Payment details not found for this order.');
        }
        res.status(200).json(payment);
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).send('Internal Server Error');
    }
});
