import { useState, useEffect } from "react";
import { Plus, Package, Search, MoreVertical, Edit, Trash2, ArrowLeft, Save, X, Beef, Bird, Milk, Leaf } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { inventoryAPI } from "@/services/api";

// Types
interface InventoryItem {
  id: number;
  name: string;
  category: string;
  subtype?: string;
  unit: string;
  basePrice: number; // Cost price
  sellPrice: number; // Selling price
  limitPrice: number; // Minimum selling price
  quantity: number;
  lowStockLimit?: number;
  lowStockAlert: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Category Icons
const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'meat':
      return Beef;
    case 'poultry':
      return Bird;
    case 'dairy':
      return Milk;
    case 'spices':
      return Leaf;
    default:
      return Package;
  }
};

const getCategoryIconColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'meat':
      return "text-red-500";
    case 'poultry':
      return "text-yellow-500";
    case 'dairy':
      return "text-blue-500";
    case 'spices':
      return "text-green-500";
    default:
      return "text-muted-foreground";
  }
};

// Helper function to calculate profit margin
const calculateProfitMargin = (sellPrice: number, basePrice: number) => {
  if (basePrice === 0) return 0;
  return ((sellPrice - basePrice) / basePrice) * 100;
};

// Helper function to format currency
const formatCurrency = (amount: number) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "SH 0";
  return `SH ${amount.toLocaleString()}`;
};

// Helper function to safely get numeric value
const safeNumber = (value: number | null | undefined, defaultValue: number = 0) => {
  if (value === null || value === undefined || isNaN(value)) return defaultValue;
  return Number(value);
};

// Helper function to safely format currency
const safeFormatCurrency = (amount: number | null | undefined) => {
  const safeAmount = safeNumber(amount);
  return `SH ${safeAmount.toLocaleString()}`;
};

export default function InventoryManagement() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    unit: "",
    basePrice: "",
    sellPrice: "",
    limitPrice: "",
    quantity: "",
  });

  const categories = ["All", "Meat", "Poultry", "Dairy", "Spices"];
  const units = ["kg", "g", "lbs", "dozen", "pieces", "liters"];
  
  // Fetch inventory data
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getAll();
      // Ensure all numeric fields have safe values
      const safeInventory = response.data.map((item: InventoryItem) => ({
        ...item,
        basePrice: safeNumber(item.basePrice),
        sellPrice: safeNumber(item.sellPrice),
        limitPrice: safeNumber(item.limitPrice),
        quantity: safeNumber(item.quantity, 0),
        lowStockLimit: safeNumber(item.lowStockLimit, 10),
        lowStockAlert: safeNumber(item.quantity, 0) <= safeNumber(item.lowStockLimit, 10)
      }));
      setInventory(safeInventory);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch inventory data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);
  
  const filteredInventory = inventory?.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const lowStockCount = inventory?.filter(item => item.lowStockAlert)?.length || 0;

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      unit: "",
      basePrice: "",
      sellPrice: "",
      limitPrice: "",
      quantity: "",
    });
  };

  const handleAddItem = async () => {
    if (!formData.name || !formData.category || !formData.unit || !formData.basePrice || !formData.sellPrice || !formData.limitPrice || !formData.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Validate prices
    const basePrice = parseFloat(formData.basePrice);
    const sellPrice = parseFloat(formData.sellPrice);
    const limitPrice = parseFloat(formData.limitPrice);

    if (basePrice <= 0 || sellPrice <= 0 || limitPrice <= 0) {
      toast({
        title: "Error",
        description: "All prices must be greater than zero",
        variant: "destructive",
      });
      return;
    }

    if (sellPrice < limitPrice) {
      toast({
        title: "Error",
        description: "Sell price cannot be less than limit price",
        variant: "destructive",
      });
      return;
    }

    if (basePrice > sellPrice) {
      toast({
        title: "Warning",
        description: "Base price is higher than sell price. This will result in a loss.",
        variant: "destructive",
      });
    }

    try {
      setSubmitting(true);
      const newItemData = {
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        basePrice: parseFloat(formData.basePrice),
        sellPrice: parseFloat(formData.sellPrice),
        limitPrice: parseFloat(formData.limitPrice),
        quantity: parseInt(formData.quantity),
      };

      await inventoryAPI.create(newItemData);
      await fetchInventory(); // Refresh the list
      setShowAddDialog(false);
      resetForm();
      toast({
        title: "Success",
        description: "Item added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!selectedProduct || !formData.name || !formData.category || !formData.unit || !formData.basePrice || !formData.sellPrice || !formData.limitPrice || !formData.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Validate prices
    const basePrice = parseFloat(formData.basePrice);
    const sellPrice = parseFloat(formData.sellPrice);
    const limitPrice = parseFloat(formData.limitPrice);

    if (basePrice <= 0 || sellPrice <= 0 || limitPrice <= 0) {
      toast({
        title: "Error",
        description: "All prices must be greater than zero",
        variant: "destructive",
      });
      return;
    }

    if (sellPrice < limitPrice) {
      toast({
        title: "Error",
        description: "Sell price cannot be less than limit price",
        variant: "destructive",
      });
      return;
    }

    if (basePrice > sellPrice) {
      toast({
        title: "Warning",
        description: "Base price is higher than sell price. This will result in a loss.",
        variant: "destructive",
      });
    }

    try {
      setSubmitting(true);
      const updateData = {
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        basePrice: parseFloat(formData.basePrice),
        sellPrice: parseFloat(formData.sellPrice),
        limitPrice: parseFloat(formData.limitPrice),
        quantity: parseInt(formData.quantity),
      };

      const response = await inventoryAPI.update(selectedProduct.id.toString(), updateData);
      
      // Update the selected product with the response data
      const updatedItem = { ...response.data, lowStockAlert: response.data.quantity <= (response.data.lowStockLimit || 10) };
      setSelectedProduct(updatedItem);
      
      // Refresh the inventory list
      await fetchInventory();
      
      setEditMode(false);
      resetForm();
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await inventoryAPI.delete(id.toString());
      await fetchInventory(); // Refresh the list
      if (selectedProduct?.id === id) {
        setSelectedProduct(null);
      }
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const handleViewProduct = (product: InventoryItem) => {
    setSelectedProduct(product);
    setEditMode(false);
  };

  const handleEditProduct = (product: InventoryItem) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      unit: product.unit,
      basePrice: product.basePrice.toString(),
      sellPrice: product.sellPrice.toString(),
      limitPrice: product.limitPrice.toString(),
      quantity: product.quantity.toString(),
    });
    setEditMode(true);
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setShowAddDialog(true);
  };

  if (loading) {
    return (
      <Layout title="Inventory Management" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  // Product Detail View
  if (selectedProduct) {
    const CategoryIcon = getCategoryIcon(selectedProduct.category);
    
    return (
      <Layout title="Product Details" showSearch={false}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => setSelectedProduct(null)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inventory
            </Button>
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <Button onClick={handleUpdateItem} variant="default" disabled={submitting}>
                    {submitting ? <LoadingSpinner /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditMode(false);
                      resetForm();
                    }}
                    disabled={submitting}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => handleEditProduct(selectedProduct)} variant="default">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Product
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Icon */}
            <Card>
              <CardContent className="p-6">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                  <CategoryIcon className={cn("h-32 w-32", getCategoryIconColor(selectedProduct.category))} />
                </div>
                {selectedProduct.lowStockAlert && (
                  <Badge className="bg-warning text-warning-foreground">
                    Low Stock Alert
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Product Details */}
            <Card>
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    <div>
                      <Label htmlFor="edit-name">Product Name</Label>
                      <Input
                        id="edit-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-category">Category</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })} disabled={submitting}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.filter(cat => cat !== "All").map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-unit">Unit</Label>
                      <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })} disabled={submitting}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-basePrice">Base Price (SH) - Cost Price</Label>
                      <Input
                        id="edit-basePrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.basePrice}
                        onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-sellPrice">Default Sell Price (SH) - Reference Price</Label>
                      <Input
                        id="edit-sellPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.sellPrice}
                        onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                        disabled={submitting}
                      />
                      <p className="text-xs text-muted-foreground">Default price for this item. Actual sale price can vary per transaction.</p>
                    </div>
                    <div>
                      <Label htmlFor="edit-limitPrice">Limit Price (SH) - Minimum Price</Label>
                      <Input
                        id="edit-limitPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.limitPrice}
                        onChange={(e) => setFormData({ ...formData, limitPrice: e.target.value })}
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-quantity">Stock Quantity</Label>
                      <Input
                        id="edit-quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        disabled={submitting}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Product Name</Label>
                      <p className="text-lg font-semibold">{selectedProduct.name}</p>
                    </div>
                    <div>
                      <Label>Product ID</Label>
                      <p className="text-muted-foreground">#{selectedProduct.id}</p>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Badge variant="secondary">{selectedProduct.category}</Badge>
                    </div>
                    <div>
                      <Label>Base Price</Label>
                      <p className="text-lg font-semibold">{safeFormatCurrency(selectedProduct.basePrice)}</p>
                    </div>
                    <div>
                      <Label>Default Sell Price</Label>
                      <p className="text-lg font-semibold">{safeFormatCurrency(selectedProduct.sellPrice)}</p>
                      <p className="text-xs text-muted-foreground">Reference price - actual sale price may vary</p>
                    </div>
                    <div>
                      <Label>Limit Price</Label>
                      <p className="text-lg font-semibold">{safeFormatCurrency(selectedProduct.limitPrice)}</p>
                    </div>
                    <div>
                      <Label>Current Stock</Label>
                      <p className={cn(
                        "text-lg font-semibold",
                        selectedProduct.lowStockAlert ? "text-warning" : "text-success"
                      )}>
                        {safeNumber(selectedProduct.quantity)} {selectedProduct.unit}
                      </p>
                    </div>
                    <div>
                      <Label>Total Value (Base Cost)</Label>
                      <p className="text-lg font-semibold">
                        {safeFormatCurrency(safeNumber(selectedProduct.basePrice) * safeNumber(selectedProduct.quantity))}
                      </p>
                    </div>
                                       <div>
                     <Label>Potential Revenue (Default Price)</Label>
                     <p className="text-lg font-semibold text-green-600">
                       {safeFormatCurrency(safeNumber(selectedProduct.sellPrice) * safeNumber(selectedProduct.quantity))}
                     </p>
                     <p className="text-xs text-muted-foreground">Based on default sell price</p>
                   </div>
                                       <div>
                     <Label>Profit Margin (Default Price)</Label>
                     <p className="text-lg font-semibold text-green-600">
                       {calculateProfitMargin(safeNumber(selectedProduct.sellPrice), safeNumber(selectedProduct.basePrice)).toFixed(1)}%
                     </p>
                     <p className="text-xs text-muted-foreground">Based on default sell price</p>
                   </div>
                                       <div>
                     <Label>Profit per {selectedProduct.unit} (Default)</Label>
                     <p className="text-lg font-semibold text-green-600">
                       {safeFormatCurrency(safeNumber(selectedProduct.sellPrice) - safeNumber(selectedProduct.basePrice))}
                     </p>
                     <p className="text-xs text-muted-foreground">Based on default sell price</p>
                   </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Inventory Management" showSearch={false}>
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{inventory.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold text-warning">{lowStockCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="text-2xl font-bold">{categories.length - 1}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Value (Base Cost)</p>
                  <p className="text-2xl font-bold">{formatCurrency((inventory || []).reduce((acc, item) => acc + (safeNumber(item.basePrice) * safeNumber(item.quantity)), 0))}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Potential Revenue (Default Prices)</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency((inventory || []).reduce((acc, item) => acc + (safeNumber(item.sellPrice) * safeNumber(item.quantity)), 0))}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Profit (Default Prices)</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency((inventory || []).reduce((acc, item) => acc + ((safeNumber(item.sellPrice) - safeNumber(item.basePrice)) * safeNumber(item.quantity)), 0))}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const lowProfitItems = (inventory || []).filter(item => 
                  calculateProfitMargin(safeNumber(item.sellPrice), safeNumber(item.basePrice)) < 20
                );
                if (lowProfitItems.length > 0) {
                  toast({
                    title: "Low Profit Items",
                    description: `Found ${lowProfitItems.length} items with profit margin below 20%`,
                    variant: "destructive",
                  });
                } else {
                  toast({
                    title: "Profit Analysis",
                    description: "All items have good profit margins (20%+)",
                  });
                }
              }}
            >
              Analyze Profits
            </Button>
            <Button variant="default" size="lg" onClick={handleOpenAddDialog}>
              <Plus className="h-5 w-5 mr-2" />
              Add New Item
            </Button>
          </div>
        </div>

        {/* Inventory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {(filteredInventory || []).map((item) => {
            const CategoryIcon = getCategoryIcon(item.category);
            return (
              <Card 
                key={item.id} 
                className="overflow-hidden hover:shadow-elegant transition-smooth cursor-pointer"
                onClick={() => handleViewProduct(item)}
              >
                <div className="aspect-video bg-muted relative flex items-center justify-center">
                  <CategoryIcon className={cn("h-16 w-16", getCategoryIconColor(item.category))} />
                  {item.lowStockAlert && (
                    <Badge className="absolute top-2 right-2 bg-warning text-warning-foreground">
                      Low Stock
                    </Badge>
                  )}
                  {item.sellPrice < item.limitPrice && (
                    <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">
                      Below Limit
                    </Badge>
                  )}
                </div>
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{item.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">ID: #{item.id}</p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleEditProduct(item);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Item
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(item.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Item
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                                      <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Base Price/{item.unit}</span>
                        <span className="font-semibold">{safeFormatCurrency(item.basePrice)}</span>
                      </div>
                                     <div className="flex items-center justify-between">
                 <span className="text-sm text-muted-foreground">Default Sell Price/{item.unit}</span>
                 <span className="font-semibold text-green-600">{safeFormatCurrency(item.sellPrice)}</span>
               </div>
                                     <div className="flex items-center justify-between">
                 <span className="text-sm text-muted-foreground">Profit Margin (Default)</span>
                 <span className="font-semibold text-green-600">
                   {calculateProfitMargin(safeNumber(item.sellPrice), safeNumber(item.basePrice)).toFixed(1)}%
                 </span>
               </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Stock</span>
                        <span className={cn(
                          "font-semibold",
                          item.lowStockAlert ? "text-warning" : "text-success"
                        )}>
                          {safeNumber(item.quantity)} {item.unit}
                        </span>
                      </div>
                      
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="w-fit">
                          {item.category}
                        </Badge>
                        {item.sellPrice < item.limitPrice && (
                          <Badge variant="destructive" className="w-fit text-xs">
                            Below Limit
                          </Badge>
                        )}
                      </div>
                    </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {(filteredInventory || []).length === 0 && (
          <Card className="p-8">
            <div className="text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No items found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filter criteria
              </p>
              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setSelectedCategory("All");
              }}>Clear Filters</Button>
            </div>
          </Card>
        )}

        {/* Inventory Summary */}
        {(filteredInventory || []).length > 0 && (
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Items Shown</p>
                <p className="text-lg font-semibold">{(filteredInventory || []).length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cost Value</p>
                <p className="text-lg font-semibold">
                  {formatCurrency((filteredInventory || []).reduce((acc, item) => acc + (safeNumber(item.basePrice) * safeNumber(item.quantity)), 0))}
                </p>
              </div>
                             <div>
                 <p className="text-sm text-muted-foreground">Potential Revenue (Default Prices)</p>
                 <p className="text-lg font-semibold text-green-600">
                   {formatCurrency((filteredInventory || []).reduce((acc, item) => acc + (safeNumber(item.sellPrice) * safeNumber(item.quantity)), 0))}
                 </p>
               </div>
                             <div>
                 <p className="text-sm text-muted-foreground">Total Profit (Default Prices)</p>
                 <p className="text-lg font-semibold text-green-600">
                   {formatCurrency((filteredInventory || []).reduce((acc, item) => acc + ((safeNumber(item.sellPrice) - safeNumber(item.basePrice)) * safeNumber(item.quantity)), 0))}
                 </p>
               </div>
            </div>
          </Card>
        )}

        {/* Add Item Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Item</DialogTitle>
              <DialogDescription>
                Add a new item to your inventory. All fields are required. Note: The sell price is a default/reference price - actual sale prices can vary per transaction.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input
                  id="name"
                  placeholder="Enter item name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(cat => cat !== "All").map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price (SH) - Cost Price</Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter cost price per unit"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">The cost price you paid for this item</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellPrice">Default Sell Price (SH) - Reference Price</Label>
                <Input
                  id="sellPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter default selling price per unit"
                  value={formData.sellPrice}
                  onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">Default price for this item. Actual sale price can vary per transaction.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="limitPrice">Limit Price (SH) - Minimum Price</Label>
                <Input
                  id="limitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter minimum selling price"
                  value={formData.limitPrice}
                  onChange={(e) => setFormData({ ...formData, limitPrice: e.target.value })}
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">The lowest price you're willing to sell for</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  disabled={submitting}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowAddDialog(false);
                resetForm();
              }} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleAddItem} variant="default" disabled={submitting}>
                {submitting ? <LoadingSpinner /> : "Add Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
