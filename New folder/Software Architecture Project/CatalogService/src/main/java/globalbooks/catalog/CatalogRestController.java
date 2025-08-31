package globalbooks.catalog;

import globalbooks.catalog.utils.RabbitMQPublisher;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.io.IOException;
import java.util.concurrent.TimeoutException;

@Path("/api")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CatalogRestController {

    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static CatalogServiceImpl catalogService;

    static {
        try {
            RabbitMQPublisher.init();
            catalogService = new CatalogServiceImpl();
        } catch (IOException | TimeoutException e) {
            System.err.println("Failed to initialize CatalogRestController: " + e.getMessage());
        }
    }

    // REST endpoint for stock updates
    @PUT
    @Path("/products/{productId}/stock")
    public Response updateStockREST(@PathParam("productId") String productId, StockUpdateRequest request) {
        try {
            if (catalogService == null) {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new StockUpdateResponse(false, "Catalog service not initialized", null)).build();
            }
            
            String result = catalogService.updateProductStock(productId, request.getQuantity());
            if (result.startsWith("Stock updated successfully")) {
                return Response.ok().entity(new StockUpdateResponse(true, result, catalogService.getProduct(productId))).build();
            } else {
                return Response.status(Response.Status.BAD_REQUEST).entity(new StockUpdateResponse(false, result, null)).build();
            }
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new StockUpdateResponse(false, "Error updating stock: " + e.getMessage(), null)).build();
        }
    }

    // REST endpoint to get product by ID
    @GET
    @Path("/products/{productId}")
    public Response getProductREST(@PathParam("productId") String productId) {
        try {
            if (catalogService == null) {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity("Catalog service not initialized").build();
            }
            
            Product product = catalogService.getProduct(productId);
            if (product.getId().isEmpty()) {
                return Response.status(Response.Status.NOT_FOUND).entity("Product not found").build();
            }
            return Response.ok().entity(product).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity("Error retrieving product: " + e.getMessage()).build();
        }
    }

    // REST endpoint to get all products
    @GET
    @Path("/products")
    public Response getAllProductsREST() {
        try {
            if (catalogService == null) {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity("Catalog service not initialized").build();
            }
            
            return Response.ok().entity(catalogService.getAllProducts()).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity("Error retrieving products: " + e.getMessage()).build();
        }
    }

    // Inner classes for REST API
    public static class StockUpdateRequest {
        private int quantity;
        
        public StockUpdateRequest() {}
        
        public StockUpdateRequest(int quantity) {
            this.quantity = quantity;
        }
        
        public int getQuantity() {
            return quantity;
        }
        
        public void setQuantity(int quantity) {
            this.quantity = quantity;
        }
    }
    
    public static class StockUpdateResponse {
        private boolean success;
        private String message;
        private Product product;
        
        public StockUpdateResponse() {}
        
        public StockUpdateResponse(boolean success, String message, Product product) {
            this.success = success;
            this.message = message;
            this.product = product;
        }
        
        public boolean isSuccess() {
            return success;
        }
        
        public void setSuccess(boolean success) {
            this.success = success;
        }
        
        public String getMessage() {
            return message;
        }
        
        public void setMessage(String message) {
            this.message = message;
        }
        
        public Product getProduct() {
            return product;
        }
        
        public void setProduct(Product product) {
            this.product = product;
        }
    }
}
