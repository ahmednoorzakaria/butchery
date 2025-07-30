import { useState, useEffect } from "react";
import { Plus, Package, Search, MoreVertical, Edit, Trash2, ArrowLeft, Save, X } from "lucide-react";
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
  price: number;
  quantity: number;
  lowStockLimit?: number;
  lowStockAlert: boolean;
  createdAt?: string;
  updatedAt?: string;
}

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
    price: "",
    quantity: "",
  });

  const categories = ["All", "Meat", "Poultry", "Dairy", "Spices"];
  const units = ["kg", "g", "lbs", "dozen", "pieces", "liters"];
  
  // Fetch inventory data
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getAll();
      setInventory(response.data);
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
  
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = inventory.filter(item => item.lowStockAlert).length;

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      unit: "",
      price: "",
      quantity: "",
    });
  };

  const handleAddItem = async () => {
    if (!formData.name || !formData.category || !formData.unit || !formData.price || !formData.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const newItemData = {
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        price: parseFloat(formData.price),
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
    if (!selectedProduct || !formData.name || !formData.category || !formData.unit || !formData.price || !formData.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const updateData = {
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        price: parseFloat(formData.price),
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
      price: product.price.toString(),
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
                  <Button onClick={handleUpdateItem} variant="hero" disabled={submitting}>
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
                <Button onClick={() => handleEditProduct(selectedProduct)} variant="hero">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Product
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Image */}
            <Card>
              <CardContent className="p-6">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-4">
                  <img 
                    src="/api/placeholder/300/200" 
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
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
                      <Label htmlFor="edit-price">Price (SH  )</Label>
                      <Input
                        id="edit-price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
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
                      <Label>Price per {selectedProduct.unit}</Label>
                      <p className="text-xl font-bold">SH   {selectedProduct.price.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label>Current Stock</Label>
                      <p className={cn(
                        "text-lg font-semibold",
                        selectedProduct.lowStockAlert ? "text-warning" : "text-success"
                      )}>
                        {selectedProduct.quantity} {selectedProduct.unit}
                      </p>
                    </div>
                    <div>
                      <Label>Total Value</Label>
                      <p className="text-lg font-semibold">
                        SH   {(selectedProduct.price * selectedProduct.quantity).toLocaleString()}
                      </p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">SH   {inventory.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString()}</p>
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
          
          <Button variant="hero" size="lg" className="w-full md:w-auto" onClick={handleOpenAddDialog}>
            <Plus className="h-5 w-5 mr-2" />
            Add New Item
          </Button>
        </div>

        {/* Inventory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredInventory.map((item) => (
            <Card 
              key={item.id} 
              className="overflow-hidden hover:shadow-elegant transition-smooth cursor-pointer"
              onClick={() => handleViewProduct(item)}
            >
              <div className="aspect-video bg-muted relative">
                <img 
                  src="/api/placeholder/300/200" 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                {item.lowStockAlert && (
                  <Badge className="absolute top-2 right-2 bg-warning text-warning-foreground">
                    Low Stock
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
                      <Button variant="ghost" size="icon-sm">
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
                    <span className="text-sm text-muted-foreground">Price/{item.unit}</span>
                    <span className="font-semibold">SH   {item.price.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Stock</span>
                    <span className={cn(
                      "font-semibold",
                      item.lowStockAlert ? "text-warning" : "text-success"
                    )}>
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  
                  <Badge variant="secondary" className="w-fit">
                    {item.category}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {filteredInventory.length === 0 && (
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

        {/* Add Item Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Item</DialogTitle>
              <DialogDescription>
                Add a new item to your inventory. All fields are required.
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
                <Label htmlFor="price">Price (SH   )</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="Enter price"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  disabled={submitting}
                />
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
              <Button onClick={handleAddItem} variant="hero" disabled={submitting}>
                {submitting ? <LoadingSpinner /> : "Add Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}