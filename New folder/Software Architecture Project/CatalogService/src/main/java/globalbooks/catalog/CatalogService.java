package globalbooks.catalog;

import javax.jws.WebMethod;
import javax.jws.WebService;
import javax.jws.soap.SOAPBinding;
import java.util.List;
import javax.jws.WebParam;

@WebService
@SOAPBinding(style = SOAPBinding.Style.RPC)
public interface CatalogService {

    @WebMethod
    String addProduct(@WebParam(name = "product") Product product);

    @WebMethod
    Product getProduct(@WebParam(name = "id") String id);

    @WebMethod
    ProductList getAllProducts();

    @WebMethod
    String updateProduct(@WebParam(name = "product") Product product);

    @WebMethod
    String deleteProduct(@WebParam(name = "id") String id);

    @WebMethod
    String updateProductStock(@WebParam(name = "productId") String productId, @WebParam(name = "quantity") int quantity);
}
