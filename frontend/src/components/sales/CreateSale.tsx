import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Trash2, ShoppingCart, Search, Calculator, User, Package, CreditCard, Receipt, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { salesAPI, inventoryAPI, customersAPI } from "@/services/api";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// Types
interface InventoryItem {
  id: number;
  name: string;
  category: string;
  subtype?: string;
  unit: string;
  basePrice: number;
  sellPrice: number;
  limitPrice: number;
  quantity: number;
  lowStockLimit?: number;
  lowStockAlert: boolean;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
}

interface SaleItem {
  itemId: number;
  quantity: number;
  price: number;
  item?: InventoryItem;
}

interface SaleFormData {
  customerId: number | null;
  items: SaleItem[];
  discount: number;
  paidAmount: number;
  paymentType: 'CASH' | 'MPESA';
  notes: string;
}

interface CreateSaleProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSale({ isOpen, onOpenChange }: CreateSaleProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState<SaleFormData>({
    customerId: null,
    items: [],
    discount: 0,
    paidAmount: 0,
    paymentType: 'CASH',
    notes: ''
  });

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputMode, setInputMode] = useState<'quantity' | 'totalAmount'>('quantity');
  const [itemTotalAmount, setItemTotalAmount] = useState(0);
  
  // Search states
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [itemSearchTerm, setItemSearchTerm] = useState("");

  // Fetch data
  const { data: inventory = [], isLoading: inventoryLoading, error: inventoryError } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      try {
        const response = await inventoryAPI.getAll();
        return response.data || [];
      } catch (error) {
        console.error('Error fetching inventory:', error);
        throw error;
      }
    },
    enabled: isOpen,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  const { data: customers = [], isLoading: customersLoading, error: customersError } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const response = await customersAPI.getAll();
        return response.data || [];
      } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
    },
    enabled: isOpen,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Filter customers and items based on search terms
  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return customers;
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      customer.phone.includes(customerSearchTerm)
    );
  }, [customers, customerSearchTerm]);

  const filteredInventory = useMemo(() => {
    if (!itemSearchTerm.trim()) return inventory;
    return inventory.filter(item =>
      item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
      (item.subtype && item.subtype.toLowerCase().includes(itemSearchTerm.toLowerCase()))
    );
  }, [inventory, itemSearchTerm]);

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: (data: SaleFormData) => salesAPI.create(data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sale created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error | { response?: { data?: { error?: string } } }) => {
      let errorMessage = "Failed to create sale";
      
      if ('response' in error && error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if ('message' in error && error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Handle dialog close - now navigates back
  const handleDialogClose = () => {
    navigate('/sales');
  };

  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const totalAmount = subtotal - formData.discount;
  const outstandingAmount = totalAmount - formData.paidAmount;

  // Reset form
  const resetForm = () => {
    setFormData({
      customerId: null,
      items: [],
      discount: 0,
      paidAmount: 0,
      paymentType: 'CASH',
      notes: ''
    });
    setSelectedItem(null);
    setItemQuantity(1);
    setItemPrice(0);
    setInputMode('quantity');
    setItemTotalAmount(0);
    setCustomerSearchTerm("");
    setItemSearchTerm("");
  };

  // Add item to sale
  const addItemToSale = () => {
    if (!selectedItem) return;

    // Validate price against limit price
    if (selectedItem.limitPrice && itemPrice < selectedItem.limitPrice) {
      toast({
        title: "Price Below Limit",
        description: `Cannot sell ${selectedItem.name} below KSH ${selectedItem.limitPrice.toLocaleString()}. Please adjust the price.`,
        variant: "destructive"
      });
      return;
    }

    let validQuantity = itemQuantity;
    
    // If in total amount mode, calculate quantity from total amount
    if (inputMode === 'totalAmount' && itemTotalAmount > 0 && itemPrice > 0) {
      validQuantity = itemTotalAmount / itemPrice;
    }

    if (selectedItem.unit === 'pcs') {
      validQuantity = Math.round(validQuantity);
      if (validQuantity <= 0) {
        toast({
          title: "Invalid Quantity",
          description: "Quantity for pieces must be a whole number greater than 0",
          variant: "destructive"
        });
        return;
      }
    } else if (selectedItem.unit === 'kg' || selectedItem.unit === 'litres') {
      if (validQuantity <= 0) {
        toast({
          title: "Invalid Quantity",
          description: `Quantity for ${selectedItem.unit} must be greater than 0`,
          variant: "destructive"
        });
        return;
      }
      validQuantity = Math.round(validQuantity * 100) / 100;
    }

    const existingItemIndex = formData.items.findIndex(item => item.itemId === selectedItem.id);
    
    if (existingItemIndex >= 0) {
      const updatedItems = [...formData.items];
      updatedItems[existingItemIndex].quantity += validQuantity;
      updatedItems[existingItemIndex].price = itemPrice;
      setFormData(prev => ({ ...prev, items: updatedItems }));
    } else {
      const newItem: SaleItem = {
        itemId: selectedItem.id,
        quantity: validQuantity,
        price: itemPrice,
        item: selectedItem
      };
      setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    }

    setSelectedItem(null);
    setItemQuantity(1);
    setItemPrice(0);
    setInputMode('quantity');
    setItemTotalAmount(0);
  };

  // Remove item from sale
  const removeItemFromSale = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Update item quantity
  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    
    const updatedItems = [...formData.items];
    updatedItems[index].quantity = quantity;
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  // Update item price
  const updateItemPrice = (index: number, price: number) => {
    if (price < 0) return;
    
    const updatedItems = [...formData.items];
    updatedItems[index].price = price;
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  // Handle item selection
  const handleItemSelect = (item: InventoryItem) => {
    setSelectedItem(item);
    // Set price to limit price if available, otherwise use sell price, fallback to 0
    const defaultPrice = item.limitPrice || item.sellPrice || 0;
    setItemPrice(defaultPrice);
    setItemQuantity(1);
    setInputMode('quantity');
    setItemTotalAmount(0);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    if (!formData.customerId) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    if (formData.items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the sale",
        variant: "destructive",
      });
      return;
    }

    // Validate all item prices against their limit prices
    for (const saleItem of formData.items) {
      const inventoryItem = inventory.find(item => item.id === saleItem.itemId);
      if (inventoryItem?.limitPrice && saleItem.price < inventoryItem.limitPrice) {
        toast({
          title: "Price Validation Error",
          description: `Cannot sell ${inventoryItem.name} below KSH ${inventoryItem.limitPrice.toLocaleString()}. Please adjust the price.`,
          variant: "destructive",
        });
        return;
      }
    }

    if (formData.paidAmount < 0) {
      toast({
        title: "Error",
        description: "Paid amount cannot be negative",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createSaleMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Sale creation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-update paid amount when total changes
  useEffect(() => {
    if (formData.paidAmount === 0 && totalAmount > 0) {
      setFormData(prev => ({ ...prev, paidAmount: totalAmount }));
    }
  }, [totalAmount]);

  // Auto-calculate quantity when total amount changes
  useEffect(() => {
    if (inputMode === 'totalAmount' && selectedItem && itemPrice > 0 && itemTotalAmount > 0) {
      const calculatedQuantity = itemTotalAmount / itemPrice;
      setItemQuantity(calculatedQuantity);
    }
  }, [itemTotalAmount, itemPrice, selectedItem, inputMode]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Show loading state while initial data is being fetched
  if (inventoryLoading || customersLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">Loading inventory and customer data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Error Display */}
      {(inventoryError || customersError) && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <div className="h-8 w-8 mx-auto mb-3">⚠️</div>
              <p className="font-medium text-lg">Failed to load data</p>
              <p className="text-base">
                {inventoryError && 'Inventory data could not be loaded. '}
                {customersError && 'Customer data could not be loaded. '}
                Please try refreshing the page.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Customer Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="customer" className="text-base font-medium">Customer *</Label>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="customer"
                  placeholder="Search customers by name or phone..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
              
              {/* Customer search results */}
              {customerSearchTerm && (
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {customers
                    .filter(customer => 
                      customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                      customer.phone.includes(customerSearchTerm)
                    )
                    .map(customer => (
                      <div
                        key={customer.id}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, customerId: customer.id }));
                          setCustomerSearchTerm(customer.name);
                        }}
                        className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">{customer.phone}</div>
                      </div>
                    ))}
                </div>
              )}

              {/* Selected customer display */}
              {formData.customerId && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-primary">
                        {customers.find(c => c.id === formData.customerId)?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {customers.find(c => c.id === formData.customerId)?.phone}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, customerId: null }));
                        setCustomerSearchTerm("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Item Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Item Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search and selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="item" className="text-base font-medium">Search Item *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="item"
                  placeholder="Search items by name or category..."
                  value={itemSearchTerm}
                  onChange={(e) => setItemSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
              
              {/* Item search results */}
              {itemSearchTerm && (
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {inventory
                    .filter(item => 
                      item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
                      item.category.toLowerCase().includes(itemSearchTerm.toLowerCase())
                    )
                    .map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleItemSelect(item)}
                        className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.category} • {item.unit} • KSH {item.sellPrice?.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Stock: {item.quantity} {item.unit}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Quantity and price input */}
            {selectedItem && (
              <div className="space-y-3">
                <Label className="text-base font-medium">Item Details</Label>
                <div className="p-3 bg-accent rounded-lg">
                  <div className="font-medium">{selectedItem.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedItem.category} • {selectedItem.unit}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Stock: {selectedItem.quantity} {selectedItem.unit}
                  </div>
                  {selectedItem.limitPrice && (
                    <div className="text-sm font-medium text-amber-600 mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                      🚫 Minimum Price: KSH {selectedItem.limitPrice.toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Input Mode Toggle */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Input Mode</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Choose how to specify the item amount: enter quantity directly or enter total amount to auto-calculate quantity
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={inputMode === 'quantity' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInputMode('quantity')}
                        className="flex-1"
                      >
                        <Calculator className="h-4 w-4 mr-2" />
                        Quantity
                      </Button>
                      <Button
                        type="button"
                        variant={inputMode === 'totalAmount' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInputMode('totalAmount')}
                        className="flex-1"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Total Amount
                      </Button>
                    </div>
                  </div>

                  {/* Quantity Input */}
                  {inputMode === 'quantity' && (
                    <div>
                      <Label htmlFor="quantity" className="text-sm font-medium">Quantity ({selectedItem.unit})</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="0.01"
                        step={selectedItem.unit === 'pcs' ? 1 : 0.01}
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(parseFloat(e.target.value) || 0)}
                        className="h-10"
                      />
                    </div>
                  )}

                  {/* Total Amount Input */}
                  {inputMode === 'totalAmount' && (
                    <div>
                      <Label htmlFor="totalAmount" className="text-sm font-medium">Total Amount (KSH)</Label>
                      <Input
                        id="totalAmount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={itemTotalAmount}
                        onChange={(e) => setItemTotalAmount(parseFloat(e.target.value) || 0)}
                        className="h-10"
                        placeholder="e.g., 500"
                      />
                      {itemTotalAmount > 0 && itemPrice > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Calculated Quantity: {(itemTotalAmount / itemPrice).toFixed(3)} {selectedItem.unit}
                        </div>
                      )}
                      {itemTotalAmount > 0 && itemPrice <= 0 && (
                        <div className="text-xs text-amber-600 mt-1">
                          ⚠️ Please set the price first to calculate quantity
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="price" className="text-sm font-medium">Price per {selectedItem.unit}</Label>
                    <Input
                      id="price"
                      type="number"
                      min={selectedItem.limitPrice || 0}
                      step="0.01"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                      className={cn(
                        "h-10",
                        selectedItem.limitPrice && itemPrice < selectedItem.limitPrice && "border-red-500 focus:border-red-500"
                      )}
                    />
                    {/* Price validation warnings */}
                    {selectedItem.limitPrice && (
                      <div className="mt-1">
                        {itemPrice < selectedItem.limitPrice ? (
                          <div className="text-xs text-red-600 flex items-center gap-1">
                            ⚠️ Price cannot be below limit price: KSH {selectedItem.limitPrice.toLocaleString()}
                          </div>
                        ) : (
                          <div className="text-xs text-green-600">
                            ✅ Price is above limit price
                          </div>
                        )}
                      </div>
                    )}
                    {selectedItem.basePrice && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Base price: KSH {selectedItem.basePrice.toLocaleString()}
                      </div>
                    )}
                    {selectedItem.sellPrice && (
                      <div className="text-xs text-muted-foreground">
                        Recommended price: KSH {selectedItem.sellPrice.toLocaleString()}
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={addItemToSale}
                    disabled={!selectedItem || 
                      (inputMode === 'quantity' ? itemQuantity <= 0 : itemTotalAmount <= 0) || 
                      itemPrice <= 0 ||
                      (selectedItem.limitPrice && itemPrice < selectedItem.limitPrice)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Sale
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Selected items list */}
          {formData.items.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Selected Items</Label>
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.item?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.quantity} {item.item?.unit} × KSH {item.price?.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-medium">KSH {(item.quantity * item.price).toLocaleString()}</div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItemFromSale(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment and Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment & Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="paymentType" className="text-base font-medium">Payment Type *</Label>
              <Select
                value={formData.paymentType}
                onValueChange={(value: 'CASH' | 'MPESA') => setFormData(prev => ({ ...prev, paymentType: value }))}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="MPESA">M-Pesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="discount" className="text-base font-medium">Discount (KSH)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                step="0.01"
                value={formData.discount}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  discount: parseFloat(e.target.value) || 0 
                }))}
                className="h-12 text-base"
              />
            </div>

            <div>
              <Label htmlFor="paidAmount" className="text-base font-medium">Amount Paid</Label>
              <Input
                id="paidAmount"
                type="number"
                min="0"
                step="0.01"
                value={formData.paidAmount}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  paidAmount: parseFloat(e.target.value) || 0 
                }))}
                className="h-12 text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <div className="text-sm text-blue-600 font-medium mb-2">Subtotal</div>
              <div className="text-2xl font-bold text-blue-800">KSH {subtotal.toLocaleString()}</div>
            </div>
            <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
              <div className="text-sm text-green-600 font-medium mb-2">Total Amount</div>
              <div className="text-2xl font-bold text-green-800">KSH {totalAmount.toLocaleString()}</div>
            </div>
            <div className={`p-6 rounded-xl border ${
              outstandingAmount > 0 
                ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200' 
                : 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200'
            }`}>
              <div className={`text-sm font-medium mb-2 ${
                outstandingAmount > 0 ? 'text-red-600' : 'text-emerald-600'
              }`}>
                Outstanding
              </div>
              <div className={`text-2xl font-bold ${
                outstandingAmount > 0 ? 'text-red-800' : 'text-emerald-800'
              }`}>
                KSH {outstandingAmount.toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-3">
        <Label htmlFor="notes" className="text-base font-medium">Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Add any additional notes about this sale..."
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={4}
          className="text-base"
        />
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleDialogClose}
          disabled={isSubmitting}
          size="lg"
          className="px-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sales
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || formData.items.length === 0 || !formData.customerId}
          size="lg"
          className="px-8"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Creating Sale...
            </>
          ) : (
            <>
              <Plus className="h-5 w-5 mr-2" />
              Create Sale
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
