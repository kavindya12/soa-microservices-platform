package globalbooks.catalog;

import globalbooks.catalog.utils.RabbitMQPublisher;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.jws.WebService;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeoutException;

@WebService(endpointInterface = "globalbooks.catalog.CatalogService")
public class CatalogServiceImpl implements CatalogService {

    private static Map<String, Product> products = new HashMap<>();
    private static final ObjectMapper objectMapper = new ObjectMapper();

    static {
        try {
            RabbitMQPublisher.init();
        } catch (IOException | TimeoutException e) {
            System.err.println("Failed to initialize RabbitMQ Publisher: " + e.getMessage());
            // Depending on desired behavior, re-throw or handle gracefully
        }
        // Sample data
        products.put("1", new Product("1", "The Lord of the Rings", "Fantasy novel by J.R.R. Tolkien", 25.00, 100));
        products.put("2", new Product("2", "Pride and Prejudice", "Romantic novel by Jane Austen", 15.50, 150));
    }

    @Override
    public String addProduct(Product product) {
        if (product == null) {
            return "Product cannot be null.";
        }
        if (product.getId() == null || product.getId().trim().isEmpty()) {
            return "Product ID cannot be null or empty.";
        }
        if (products.containsKey(product.getId())) {
            return "Product with ID " + product.getId() + " already exists.";
        }
        if (product.getName() == null || product.getName().trim().isEmpty()) {
            return "Product name cannot be null or empty.";
        }
        products.put(product.getId(), product);
        try {
            String productJson = objectMapper.writeValueAsString(product);
            RabbitMQPublisher.publishEvent("product.created", productJson);
        } catch (IOException e) {
            System.err.println("Failed to publish product.created event: " + e.getMessage());
        }
        return "Product " + product.getName() + " added successfully.";
    }

    @Override
    public Product getProduct(String id) {
        Product product = products.get(id);
        if (product == null) {
            // Return an empty Product or throw a SOAPFaultException
            // For simplicity, returning an empty Product here.
            return new Product("", "", "", 0.0, 0);
        }
        return product;
    }

    @Override
    public ProductList getAllProducts() {
        return new ProductList(new ArrayList<>(products.values()));
    }

    @Override
    public String updateProduct(Product product) {
        if (!products.containsKey(product.getId())) {
            return "Product with ID " + product.getId() + " not found.";
        }
        products.put(product.getId(), product);
        try {
            String productJson = objectMapper.writeValueAsString(product);
            RabbitMQPublisher.publishEvent("product.updated", productJson);
        } catch (IOException e) {
            System.err.println("Failed to publish product.updated event: " + e.getMessage());
        }
        return "Product " + product.getName() + " updated successfully.";
    }

    @Override
    public String deleteProduct(String id) {
        if (!products.containsKey(id)) {
            return "Product with ID " + id + " not found.";
        }
        Product removedProduct = products.remove(id);
        try {
            String productJson = objectMapper.writeValueAsString(removedProduct);
            RabbitMQPublisher.publishEvent("product.deleted", productJson);
        } catch (IOException e) {
            System.err.println("Failed to publish product.deleted event: " + e.getMessage());
        }
        return "Product with ID " + id + " deleted successfully.";
    }

    @Override
    public String updateProductStock(String productId, int quantity) {
        if (!products.containsKey(productId)) {
            return "Product with ID " + productId + " not found.";
        }
        
        Product product = products.get(productId);
        int currentStock = product.getQuantity();
        
        if (currentStock < quantity) {
            return "Insufficient stock. Available: " + currentStock + ", Requested: " + quantity;
        }
        
        // Decrease stock by the ordered quantity
        product.setQuantity(currentStock - quantity);
        products.put(productId, product);
        
        try {
            String productJson = objectMapper.writeValueAsString(product);
            RabbitMQPublisher.publishEvent("product.stock.updated", productJson);
        } catch (IOException e) {
            System.err.println("Failed to publish product.stock.updated event: " + e.getMessage());
        }
        
        return "Stock updated successfully. New quantity: " + product.getQuantity();
    }
}
