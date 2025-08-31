package globalbooks.catalog.utils;

import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeoutException;

public class RabbitMQPublisher {

    private static ConnectionFactory factory;
    private static Connection connection;
    private static Channel channel;
    private static final String EXCHANGE_NAME = "catalog_events_exchange"; // Direct exchange for catalog events

    public static void init() throws IOException, TimeoutException {
        factory = new ConnectionFactory();
        factory.setHost("localhost"); // Assuming RabbitMQ is on localhost as per docker-compose
        factory.setPort(5672);
        factory.setUsername("guest"); // Default RabbitMQ username
        factory.setPassword("guest"); // Default RabbitMQ password
        connection = factory.newConnection();
        channel = connection.createChannel();
        channel.exchangeDeclare(EXCHANGE_NAME, "topic", true); // Declare a topic exchange
        System.out.println("RabbitMQ Publisher initialized. Exchange: " + EXCHANGE_NAME);
    }

    public static void publishEvent(String routingKey, String message) throws IOException {
        if (channel == null || !channel.isOpen()) {
            System.err.println("RabbitMQ channel is not open. Reinitializing...");
            try {
                init(); // Attempt to reinitialize connection
            } catch (TimeoutException e) {
                System.err.println("Failed to reinitialize RabbitMQ connection: " + e.getMessage());
                return;
            }
        }
        channel.basicPublish(EXCHANGE_NAME, routingKey, null, message.getBytes(StandardCharsets.UTF_8));
        System.out.println(" [x] Sent '" + routingKey + "':'" + message + "'");
    }

    public static void close() throws IOException, TimeoutException {
        if (channel != null && channel.isOpen()) {
            channel.close();
        }
        if (connection != null && connection.isOpen()) {
            connection.close();
        }
        System.out.println("RabbitMQ Publisher closed.");
    }
}
