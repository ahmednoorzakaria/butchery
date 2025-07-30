import { useState } from "react";
import { Plus, Package, Search, Filter, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Mock data - replace with API call
const mockInventory = [
  {
    id: 1,
    name: "Goat Meat - Fresh Cut",
    category: "Meat",
    unit: "kg",
    price: 1200,
    stock: 25,
    productCode: "GM001",
    image: "/api/placeholder/300/200",
    lowStock: false
  },
  {
    id: 2,
    name: "Chicken Breast - Boneless", 
    category: "Poultry",
    unit: "kg",
    price: 800,
    stock: 8,
    productCode: "CB001",
    image: "/api/placeholder/300/200",
    lowStock: true
  },
  {
    id: 3,
    name: "Camel Meat - Premium",
    category: "Meat", 
    unit: "kg",
    price: 1500,
    stock: 15,
    productCode: "CM001",
    image: "/api/placeholder/300/200",
    lowStock: false
  },
  {
    id: 4,
    name: "Farm Fresh Eggs",
    category: "Dairy",
    unit: "dozen",
    price: 450,
    stock: 5,
    productCode: "EG001", 
    image: "/api/placeholder/300/200",
    lowStock: true
  },
  {
    id: 5,
    name: "Berbere Spice Mix",
    category: "Spices",
    unit: "g",
    price: 150,
    stock: 50,
    productCode: "SP001",
    image: "/api/placeholder/300/200",
    lowStock: false
  }
];

export default function InventoryList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Meat", "Poultry", "Dairy", "Spices"];
  
  const filteredInventory = mockInventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.productCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = mockInventory.filter(item => item.lowStock).length;

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
                  <p className="text-2xl font-bold">{mockInventory.length}</p>
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
                  <p className="text-2xl font-bold">₦{mockInventory.reduce((acc, item) => acc + (item.price * item.stock), 0).toLocaleString()}</p>
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
                placeholder="Search by name or product code..."
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
          
          <Button variant="hero" size="lg" className="w-full md:w-auto">
            <Plus className="h-5 w-5 mr-2" />
            Add New Item
          </Button>
        </div>

        {/* Inventory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredInventory.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-primary transition-smooth">
              <div className="aspect-video bg-muted relative">
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                {item.lowStock && (
                  <Badge className="absolute top-2 right-2 bg-warning text-warning-foreground">
                    Low Stock
                  </Badge>
                )}
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{item.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{item.productCode}</p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Item
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
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
                    <span className="font-semibold">₦{item.price.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Stock</span>
                    <span className={cn(
                      "font-semibold",
                      item.lowStock ? "text-warning" : "text-success"
                    )}>
                      {item.stock} {item.unit}
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
              <Button variant="outline">Clear Filters</Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}