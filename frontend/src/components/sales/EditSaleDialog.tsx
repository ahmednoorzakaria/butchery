import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2 } from "lucide-react";
import { salesAPI, inventoryAPI, customersAPI } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SaleItem {
  itemId: number;
  quantity: number;
  price: number;
  item?: {
    name: string;
    unit?: string;
    category?: string;
    subtype?: string;
  };
}

interface Customer {
  id: number;
  name: string;
  phone: string;
}

interface User {
  id: number;
  name: string;
}

interface Sale {
  id: number;
  customerId: number;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  paymentType: string;
  createdAt: string;
  customer: Customer;
  user: User;
  userId: number;
  items: SaleItem[];
}

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  sellPrice: number | null;
  limitPrice: number | null;
}

interface EditSaleDialogProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditSaleDialog({ sale, isOpen, onClose }: EditSaleDialogProps) {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentType, setPaymentType] = useState<string>("");
  const [customerId, setCustomerId] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Fetch inventory items for selection
  const { data: inventoryResponse } = useQuery({
    queryKey: ["inventory"],
    queryFn: inventoryAPI.getAll,
    enabled: isOpen,
  });

  // Fetch customers for selection
  const { data: customersResponse } = useQuery({
    queryKey: ["customers"],
    queryFn: customersAPI.getAll,
    enabled: isOpen,
  });

  // Extract data safely
  const inventoryItems = Array.isArray((inventoryResponse as any)?.data) ? (inventoryResponse as any).data : 
                       Array.isArray(inventoryResponse) ? inventoryResponse : [];
  const customers = Array.isArray((customersResponse as any)?.data) ? (customersResponse as any).data : 
                   Array.isArray(customersResponse) ? customersResponse : [];

  // Initialize form when sale changes
  useEffect(() => {
    if (sale) {
      setItems([...sale.items]);
      setDiscount(sale.discount);
      setPaidAmount(sale.paidAmount);
      setPaymentType(sale.paymentType);
      setCustomerId(sale.customerId);
    }
  }, [sale]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const totalAmount = subtotal - discount;

  // Update mutation
  const updateSaleMutation = useMutation({
    mutationFn: (data: any) => salesAPI.update(sale!.id.toString(), data),
    onSuccess: () => {
      toast.success("Sale updated successfully");
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update sale");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;

    setIsSubmitting(true);
    try {
      await updateSaleMutation.mutateAsync({
        customerId,
        items,
        discount,
        paidAmount,
        paymentType,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    if (inventoryItems.length > 0) {
      const firstItem = inventoryItems[0];
      setItems([
        ...items,
        {
          itemId: firstItem.id,
          quantity: 1,
          price: firstItem.sellPrice || 0,
        },
      ]);
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const getItemName = (itemId: number) => {
    const item = inventoryItems.find((i) => i.id === itemId);
    return item?.name || "Unknown Item";
  };

  const getItemStock = (itemId: number) => {
    const item = inventoryItems.find((i) => i.id === itemId);
    return item?.quantity || 0;
  };

  if (!sale) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Sale #{sale.id}</DialogTitle>
          <DialogDescription>
            Modify the sale details. Changes will automatically adjust inventory and customer balances.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer">Customer</Label>
              <Select value={customerId.toString()} onValueChange={(value) => setCustomerId(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer: any) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name} - {customer.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="MPESA">M-Pesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg font-semibold">Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-center p-3 border rounded-lg mb-3">
                  <div className="col-span-4">
                    <Label>Item</Label>
                    <Select
                      value={item.itemId.toString()}
                      onValueChange={(value) => updateItem(index, "itemId", parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {getItemName(item.itemId)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map((invItem: InventoryItem) => (
                          <SelectItem key={invItem.id} value={invItem.id.toString()}>
                            {invItem.name} (Stock: {invItem.quantity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="0.00001"
                      step="0.00001"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value))}
                    />
                    <div className="text-xs text-muted-foreground">
                      Available: {getItemStock(item.itemId)}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <Label>Price (KSH)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.00001"
                      value={item.price}
                      onChange={(e) => updateItem(index, "price", parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Total</Label>
                    <div className="p-2 bg-muted rounded text-center font-medium">
                      KSH {(item.quantity * item.price).toLocaleString()}
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>

          {/* Totals Section */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount">Discount (KSH)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  step="0.00001"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <Label htmlFor="paidAmount">Amount Paid (KSH)</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  min="0"
                  step="0.00001"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2 text-right">
              <div className="text-lg">
                <span className="font-medium">Subtotal:</span>{" "}
                <span>KSH {subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="text-lg">
                  <span className="font-medium">Discount:</span>{" "}
                  <span className="text-destructive">-KSH {discount.toLocaleString()}</span>
                </div>
              )}
              <div className="text-2xl font-bold text-primary">
                <span>Total:</span> <span>KSH {totalAmount.toLocaleString()}</span>
              </div>
              {paidAmount < totalAmount && (
                <div className="text-lg text-warning">
                  <span>Outstanding:</span>{" "}
                  <span>KSH {(totalAmount - paidAmount).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || items.length === 0}>
              {isSubmitting ? "Updating..." : "Update Sale"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
