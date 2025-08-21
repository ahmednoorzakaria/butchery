import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Trash2, ShoppingCart, Search } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { salesAPI, inventoryAPI, customersAPI } from "@/services/api";

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

interface SaleSectionProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleSection({ isOpen, onOpenChange }: SaleSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter customers and items based on search terms with useMemo for performance
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
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || "Failed to create sale";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Handle dialog close
  const handleDialogClose = () => {
    resetForm();
    onOpenChange(false);
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
    setCustomerSearchTerm("");
    setItemSearchTerm("");
  };

  // Add item to sale
  const addItemToSale = () => {
    if (!selectedItem) return;

    // Validate quantity based on unit type
    let validQuantity = itemQuantity;
    if (selectedItem.unit === 'pcs') {
      // For pieces, ensure whole number
      validQuantity = Math.round(itemQuantity);
      if (validQuantity <= 0) {
        toast({
          title: "Invalid Quantity",
          description: "Quantity for pieces must be a whole number greater than 0",
          variant: "destructive"
        });
        return;
      }
    } else if (selectedItem.unit === 'kg' || selectedItem.unit === 'litres') {
      // For kg and litres, allow decimals but ensure positive
      if (itemQuantity <= 0) {
        toast({
          title: "Invalid Quantity",
          description: `Quantity for ${selectedItem.unit} must be greater than 0`,
          variant: "destructive"
        });
        return;
      }
      validQuantity = Math.round(itemQuantity * 100) / 100; // Round to 2 decimal places
    }

    // Check if item already exists in sale
    const existingItemIndex = formData.items.findIndex(item => item.itemId === selectedItem.id);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...formData.items];
      updatedItems[existingItemIndex].quantity += validQuantity;
      updatedItems[existingItemIndex].price = itemPrice;
      setFormData(prev => ({ ...prev, items: updatedItems }));
    } else {
      // Add new item
      const newItem: SaleItem = {
        itemId: selectedItem.id,
        quantity: validQuantity,
        price: itemPrice,
        item: selectedItem
      };
      setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    }

    // Reset item selection
    setSelectedItem(null);
    setItemQuantity(1);
    setItemPrice(0);
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
    setItemPrice(item.sellPrice || 0);
    setItemQuantity(1);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }
    
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

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Show loading state while initial data is being fetched
  if (isOpen && (inventoryLoading || customersLoading)) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Create New Sale
            </DialogTitle>
            <DialogDescription>
              Loading sale creation form...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-muted-foreground">Loading inventory and customer data...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleDialogClose();
      } else {
        onOpenChange(open);
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Create New Sale
          </DialogTitle>
          <DialogDescription>
            Create a new sale by selecting a customer and adding items. 
            The system will automatically update inventory and track payments.
          </DialogDescription>
        </DialogHeader>

        <form key={`sale-form-${isOpen}`} onSubmit={handleSubmit} className="space-y-6">
          {/* Loading overlay */}
          {isSubmitting && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="text-center">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p className="text-muted-foreground">Creating sale...</p>
              </div>
            </div>
          )}
          {/* Error Display */}
          {(inventoryError || customersError) && (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="p-4">
                <div className="text-center text-destructive">
                  <div className="h-5 w-5 mx-auto mb-2">⚠️</div>
                  <p className="font-medium">Failed to load data</p>
                  <p className="text-sm">
                    {inventoryError && 'Inventory data could not be loaded. '}
                    {customersError && 'Customer data could not be loaded. '}
                    Please try refreshing the page.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer *</Label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers by name or phone..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="mb-2 pl-10 pr-10"
                />
                {customerSearchTerm && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setCustomerSearchTerm("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Select
                value={formData.customerId?.toString() || ""}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  customerId: value ? parseInt(value) : null 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customersLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <LoadingSpinner size="sm" />
                    </div>
                                   ) : filteredCustomers.length === 0 ? (
                   <div className="p-4 text-center text-muted-foreground">
                     {customerSearchTerm ? 'No customers match your search' : 'No customers found. Please add customers first.'}
                     {!customerSearchTerm && (
                       <div className="mt-2">
                         <Button 
                           type="button" 
                           variant="outline" 
                           size="sm"
                           onClick={() => {
                             // You can add navigation to customer creation page here
                             toast({
                               title: "Info",
                               description: "Please add customers in the Customers section first",
                             });
                           }}
                         >
                           Go to Customers
                         </Button>
                       </div>
                     )}
                   </div>
                 ) : (
                    filteredCustomers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name} ({customer.phone})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Item Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                 <div className="md:col-span-2">
                   <Label htmlFor="item">Item</Label>
                   <div className="space-y-2">
                     <div className="relative">
                       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input
                         placeholder="Search items by name, category, or subtype..."
                         value={itemSearchTerm}
                         onChange={(e) => setItemSearchTerm(e.target.value)}
                         className="mb-2 pl-10 pr-10"
                       />
                       {itemSearchTerm && (
                         <Button
                           type="button"
                           variant="ghost"
                           size="sm"
                           className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                           onClick={() => setItemSearchTerm("")}
                         >
                           <X className="h-3 w-3" />
                         </Button>
                       )}
                     </div>
                     <Select
                       value={selectedItem?.id.toString() || ""}
                       onValueChange={(value) => {
                         const item = filteredInventory.find(i => i.id.toString() === value);
                         if (item) handleItemSelect(item);
                       }}
                     >
                       <SelectTrigger>
                         <SelectValue placeholder="Select an item" />
                       </SelectTrigger>
                       <SelectContent>
                         {inventoryLoading ? (
                           <div className="flex items-center justify-center p-4">
                             <LoadingSpinner size="sm" />
                           </div>
                         ) : filteredInventory.length === 0 ? (
                           <div className="p-4 text-center text-muted-foreground">
                             {itemSearchTerm ? 'No items match your search' : 'No inventory items found.'}
                             {!itemSearchTerm && (
                               <div className="mt-2">
                                 <Button 
                                   type="button" 
                                   variant="outline" 
                                   size="sm"
                                   onClick={() => {
                                     toast({
                                       title: "Info",
                                       description: "Please add inventory items in the Inventory section first",
                                     });
                                   }}
                                 >
                                   Go to Inventory
                                 </Button>
                               </div>
                             )}
                           </div>
                         ) : (
                           filteredInventory
                             .filter(item => item.quantity > 0)
                             .map((item) => (
                               <SelectItem key={item.id} value={item.id.toString()}>
                                 <div className="flex items-center justify-between w-full">
                                   <span>{item.name}</span>
                                   <Badge variant="outline" className="ml-2">
                                     {item.quantity} {item.unit}
                                   </Badge>
                                 </div>
                               </SelectItem>
                             ))
                         )}
                       </SelectContent>
                     </Select>
                   </div>
                 </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0.01"
                    step={selectedItem?.unit === 'kg' || selectedItem?.unit === 'litres' ? "0.01" : "1"}
                    value={itemQuantity}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (isNaN(value)) {
                        setItemQuantity(1);
                        return;
                      }
                      
                      // Validate based on unit type
                      if (selectedItem?.unit === 'pcs') {
                        // For pieces, only allow whole numbers
                        setItemQuantity(Math.max(1, Math.round(value)));
                      } else {
                        // For kg and litres, allow decimals
                        setItemQuantity(Math.max(0.01, value));
                      }
                    }}
                    disabled={!selectedItem}
                  />
                  {selectedItem && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Unit: {selectedItem.unit} 
                      {selectedItem.unit === 'kg' || selectedItem.unit === 'litres' 
                        ? ' (use decimals for precise amounts)' 
                        : ' (use whole numbers)'}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="price">Price per {selectedItem?.unit || 'unit'}</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                    disabled={!selectedItem}
                  />
                  {selectedItem && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Price per {selectedItem.unit}
                    </p>
                  )}
                </div>
              </div>

              {selectedItem && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium">Selected:</span> {selectedItem.name}
                    <br />
                    <span className="text-muted-foreground">
                      Available: {selectedItem.quantity} {selectedItem.unit} | 
                      Default Price: KSH {selectedItem.sellPrice?.toLocaleString() || 'N/A'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={addItemToSale}
                    disabled={!selectedItem || itemQuantity <= 0 || itemPrice <= 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Sale
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sale Items */}
          {formData.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sale Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {formData.items.map((item, index) => {
                    const inventoryItem = inventory.find(i => i.id === item.itemId);
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{inventoryItem?.name || 'Unknown Item'}</div>
                          <div className="text-sm text-muted-foreground">
                            {inventoryItem?.category} • {inventoryItem?.unit}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Quantity</div>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 0)}
                              className="w-20"
                            />
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Price</div>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Total</div>
                            <div className="font-medium">
                              KSH {(item.quantity * item.price).toLocaleString()}
                            </div>
                          </div>
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItemFromSale(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="discount">Discount</Label>
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
                  />
                </div>

                <div>
                  <Label htmlFor="paymentType">Payment Type *</Label>
                  <Select
                    value={formData.paymentType}
                    onValueChange={(value: 'CASH' | 'MPESA') => setFormData(prev => ({ 
                      ...prev, 
                      paymentType: value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="MPESA">M-Pesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="paidAmount">Amount Paid</Label>
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
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Subtotal</div>
                  <div className="text-lg font-semibold">KSH {subtotal.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Amount</div>
                  <div className="text-lg font-semibold">KSH {totalAmount.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Outstanding</div>
                  <div className={`text-lg font-semibold ${outstandingAmount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    KSH {outstandingAmount.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this sale..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDialogClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || formData.items.length === 0 || !formData.customerId}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating Sale...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Sale
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
