import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Plus,
  ShoppingCart,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { salesAPI, inventoryAPI, customersAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

// Types
interface InventoryItem {
  id: number;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  limitPrice?: number;
  sellPrice?: number;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
}

interface NewSaleItem {
  itemId: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface SaleSectionProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

export function SaleSection({ isOpen, onOpenChange }: SaleSectionProps) {
  const [customerId, setCustomerId] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [saleItems, setSaleItems] = useState<NewSaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState<number>(0); // Start with 0 for debt
  const [totalAmountInput, setTotalAmountInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [autoDiscount, setAutoDiscount] = useState(0); // New state for auto-calculated discount

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data
  const { data: customersResponse, isLoading: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: customersAPI.getAll,
  });

  const { data: inventoryResponse, isLoading: inventoryLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: inventoryAPI.getAll,
  });

  // Extract data safely
  const customers = Array.isArray(customersResponse?.data) ? customersResponse.data : 
                   Array.isArray(customersResponse) ? customersResponse : [];
  const inventory = Array.isArray(inventoryResponse?.data) ? inventoryResponse.data : 
                   Array.isArray(inventoryResponse) ? inventoryResponse : [];

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: salesAPI.create,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sale created successfully!",
      });
      resetSaleForm();
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (error: unknown) => {
      const apiError = error as ApiError;
      const errorMessage = apiError?.response?.data?.error || "Failed to create sale";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const resetSaleForm = () => {
    setCustomerId("");
    setPaymentType("");
    setSaleItems([]);
    setSelectedProduct("");
    setQuantity(1);
    setDiscount(0);
    setPaidAmount(0); // Reset to 0 for debt
    setTotalAmountInput("");
    setPriceInput("");
    setAutoDiscount(0); // Reset auto discount
  };

  const addItemToSale = () => {
    if (!selectedProduct || !priceInput) {
      toast({
        title: "Error",
        description: "Please select a product and enter a price",
        variant: "destructive",
      });
      return;
    }

    const product = inventory.find((p: InventoryItem) => p.id.toString() === selectedProduct);
    if (!product) return;

    const price = parseFloat(priceInput);
    const qty = parseFloat(quantity.toString());

    // Validate sell limit
    if (product.limitPrice && price < product.limitPrice) {
      toast({
        title: "Price Below Limit",
        description: `Sale price (${price}) cannot be lower than limit price (${product.limitPrice})`,
        variant: "destructive",
      });
      return;
    }

    // Warn if price is significantly lower than default sell price
    if (product.sellPrice && price < product.sellPrice * 0.8) {
      toast({
        title: "Low Price Warning",
        description: `Sale price ${price} is significantly lower than default sell price ${product.sellPrice}`,
        variant: "default",
      });
    }

    const newItem: NewSaleItem = {
      itemId: product.id,
      name: product.name,
      quantity: qty,
      price: price,
      total: qty * price,
    };

    setSaleItems([...saleItems, newItem]);
    setSelectedProduct("");
    setQuantity(1);
    setPriceInput("");
    setTotalAmountInput("");
    setAutoDiscount(0); // Reset auto discount
  };

  const removeItemFromSale = (itemId: number) => {
    setSaleItems(saleItems.filter((item) => item.itemId !== itemId));
    // paidAmount remains as user set it
  };

  const calculateSaleTotal = () => {
    return saleItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateNetTotal = () => {
    return calculateSaleTotal() - discount;
  };

  const completeSale = () => {
    if (!customerId || !paymentType || saleItems.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const saleData = {
      customerId: parseInt(customerId),
      items: saleItems.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        price: item.price,
      })),
      discount: discount,
      paidAmount: paidAmount, // Now always a number, 0 means full debt
      paymentType: paymentType,
    };

    createSaleMutation.mutate(saleData);
  };

  // Calculate quantity from total amount
  const calculateQuantityFromTotal = () => {
    if (!selectedProduct || !totalAmountInput) return;

    const product = inventory.find((p: InventoryItem) => p.id.toString() === selectedProduct);
    if (!product) return;

    const totalAmount = parseFloat(totalAmountInput);
    const calculatedQuantity = totalAmount / product.price;
    
    if (calculatedQuantity > 0) {
      setQuantity(calculatedQuantity);
      setPriceInput(product.price.toString());
      toast({
        title: "Quantity Calculated",
        description: `Quantity: ${calculatedQuantity.toFixed(2)} ${product.unit}`,
      });
    }
  };

  const selectedProductData = inventory.find((p: InventoryItem) => p.id.toString() === selectedProduct);

  // Auto-calculate totals when saleItems or discount changes
  useEffect(() => {
    // paidAmount is now always a number starting at 0
    // Users can manually change this to any amount they want
  }, [saleItems, discount]);

  // Auto-calculate quantity when both price and total amount are entered
  useEffect(() => {
    if (selectedProduct && priceInput && totalAmountInput) {
      const price = parseFloat(priceInput);
      const totalAmount = parseFloat(totalAmountInput);
      
      if (price > 0 && totalAmount > 0) {
        const calculatedQuantity = totalAmount / price;
        if (calculatedQuantity > 0) {
          setQuantity(calculatedQuantity);
        }
      }
    }
  }, [selectedProduct, priceInput, totalAmountInput]);

  // Auto-calculate discount when price differs from sell price
  useEffect(() => {
    if (selectedProduct && priceInput) {
      const product = inventory.find((p: InventoryItem) => p.id.toString() === selectedProduct);
      if (product && product.sellPrice) {
        const enteredPrice = parseFloat(priceInput);
        const sellPrice = product.sellPrice;
        
        if (enteredPrice !== sellPrice) {
          const priceDifference = sellPrice - enteredPrice;
          setAutoDiscount(Math.abs(priceDifference));
        } else {
          setAutoDiscount(0);
        }
      }
    }
  }, [selectedProduct, priceInput, inventory]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" size="lg" className="w-full md:w-auto">
          <Plus className="h-5 w-5 mr-2" />
          New Sale
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Sale</DialogTitle>
          <DialogDescription>
            Add items to the sale and complete the transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer and Payment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Customer
              </Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customersLoading ? (
                    <SelectItem value="" disabled>
                      Loading customers...
                    </SelectItem>
                  ) : customers.length === 0 ? (
                    <SelectItem value="" disabled>
                      No customers available
                    </SelectItem>
                  ) : (
                    customers.map((customer: Customer) => (
                      <SelectItem
                        key={customer.id}
                        value={customer.id.toString()}
                      >
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Payment Method
              </Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="MPESA">M-Pesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Add Items */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-4">Add Items</h3>
            
            {/* Product Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Product</Label>
                <Select
                  value={selectedProduct}
                  onValueChange={setSelectedProduct}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryLoading ? (
                      <SelectItem value="" disabled>
                        Loading products...
                      </SelectItem>
                    ) : inventory.length === 0 ? (
                      <SelectItem value="" disabled>
                        No products available
                      </SelectItem>
                    ) : (
                      inventory.map((product: InventoryItem) => (
                        <SelectItem
                          key={product.id}
                          value={product.id.toString()}
                        >
                          {product.name} - KSH {product.price}/{product.unit}{" "}
                          (Stock: {product.quantity})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedProductData && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Price Limits</Label>
                  <div className="flex gap-2 text-xs">
                    {selectedProductData.limitPrice && (
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        Min: KSH {selectedProductData.limitPrice}
                      </Badge>
                    )}
                    {selectedProductData.sellPrice && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Default: KSH {selectedProductData.sellPrice}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Price and Quantity Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Sale Price (KSH)</Label>
                <Input
                  type="number"
                  placeholder="Enter sale price"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  step="0.01"
                  min="0"
                />
                {selectedProductData?.limitPrice && priceInput && parseFloat(priceInput) < selectedProductData.limitPrice && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    Price below limit (KSH {selectedProductData.limitPrice})
                  </div>
                )}
                {selectedProductData?.sellPrice && priceInput && parseFloat(priceInput) !== selectedProductData.sellPrice && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                    <AlertTriangle className="h-3 w-3" />
                    {parseFloat(priceInput) > selectedProductData.sellPrice 
                      ? `Price above default (KSH ${selectedProductData.sellPrice})`
                      : `Price below default (KSH ${selectedProductData.sellPrice})`
                    }
                  </div>
                )}
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-2 block">Quantity</Label>
                <Input
                  type="number"
                  placeholder="Quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min="0.01"
                  step="0.01"
                />
                {totalAmountInput && priceInput && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-calculated from total amount
                  </p>
                )}
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-2 block">Total Amount (KSH)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Enter total amount"
                    value={totalAmountInput}
                    onChange={(e) => setTotalAmountInput(e.target.value)}
                    step="0.01"
                    min="0"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter total amount to auto-calculate quantity
                </p>
              </div>
            </div>

            {/* Auto Discount Display */}
            {autoDiscount > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Auto-calculated discount: KSH {autoDiscount.toFixed(2)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDiscount(discount + autoDiscount);
                      setAutoDiscount(0);
                    }}
                  >
                    Apply to Sale
                  </Button>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Price difference from default sell price has been calculated as discount
                </p>
              </div>
            )}

            <Button onClick={addItemToSale} disabled={!selectedProduct || !priceInput}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {/* Sale Items */}
          {saleItems.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-4">Sale Items</h3>
              <div className="space-y-2">
                {saleItems.map((item) => (
                  <div
                    key={item.itemId}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground ml-2">
                        {item.quantity}x KSH {item.price}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        KSH {item.total.toLocaleString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItemFromSale(item.itemId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Totals and Payment */}
              <div className="border-t mt-4 pt-4 space-y-2">
                <div className="flex items-center space-x-2">
                  <Label className="text-sm font-medium">
                    Discount (KSH):
                  </Label>
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => {
                      const newDiscount = Number(e.target.value);
                      setDiscount(newDiscount);
                      // paidAmount remains as user set it
                    }}
                    className="w-32"
                    min="0"
                  />
                </div>
                <div className="flex justify-between text-lg">
                  <span>Subtotal:</span>
                  <span>KSH {calculateSaleTotal().toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Discount:</span>
                    <span>-KSH {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span>KSH {calculateNetTotal().toLocaleString()}</span>
                </div>

                {/* Payment Amount Section */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Label className="text-sm font-medium">
                      Amount Paid (KSH):
                    </Label>
                    <Input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => {
                        const newPaidAmount = Number(e.target.value);
                        setPaidAmount(newPaidAmount);
                        // If user manually sets paidAmount, don't auto-update it
                      }}
                      className="w-32"
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter 0 to record as debt, or enter the actual amount paid
                    </p>
                  </div>

                  {(paidAmount === 0 || paidAmount < calculateNetTotal()) && (
                    <div className="bg-warning/10 border border-warning/20 rounded p-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-warning-foreground">
                          Amount Due:
                        </span>
                        <span className="font-medium text-warning-foreground">
                          KSH{" "}
                          {(
                            calculateNetTotal() - paidAmount
                          ).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-warning-foreground mt-1">
                        {paidAmount === 0 
                          ? "This sale will be recorded as full debt for the customer"
                          : "This sale will be recorded as partial debt for the customer"
                        }
                      </p>
                    </div>
                  )}

                  {paidAmount && paidAmount > calculateNetTotal() && (
                    <div className="bg-success/10 border border-success/20 rounded p-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-success-foreground">
                          Change:
                        </span>
                        <span className="font-medium text-success-foreground">
                          KSH{" "}
                          {(
                            paidAmount - calculateNetTotal()
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={completeSale}
              disabled={
                !customerId ||
                !paymentType ||
                saleItems.length === 0 ||
                createSaleMutation.isPending
              }
            >
              {createSaleMutation.isPending
                ? "Processing..."
                : "Complete Sale"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
