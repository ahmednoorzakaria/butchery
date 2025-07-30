import { TrendingUp, Users, Package, ShoppingCart, AlertTriangle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  // Mock data - replace with API calls
  const stats = {
    todaySales: 125000,
    totalCustomers: 142,
    lowStockItems: 5,
    totalProducts: 28
  };

  const recentSales = [
    { id: 1, customer: "Ahmed Hassan", amount: 15000, time: "10 mins ago" },
    { id: 2, customer: "Sarah Mohammed", amount: 8500, time: "25 mins ago" },
    { id: 3, customer: "Ibrahim Ali", amount: 22000, time: "1 hour ago" },
  ];

  const lowStockItems = [
    { name: "Chicken Breast", stock: 3, unit: "kg" },
    { name: "Farm Fresh Eggs", stock: 2, unit: "dozen" },
    { name: "Goat Ribs", stock: 1, unit: "kg" },
  ];

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Today's Sales</p>
                  <p className="text-3xl font-bold">₦{stats.todaySales.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                  <p className="text-3xl font-bold text-foreground">{stats.totalCustomers}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Products</p>
                  <p className="text-3xl font-bold text-foreground">{stats.totalProducts}</p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-warning">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock Alert</p>
                  <p className="text-3xl font-bold text-warning">{stats.lowStockItems}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sales */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Sales</CardTitle>
                <Button variant="outline" size="sm">View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{sale.customer}</p>
                        <p className="text-sm text-muted-foreground">{sale.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₦{sale.amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card className="border-warning/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <AlertTriangle className="h-5 w-5 text-warning mr-2" />
                  Low Stock Alert
                </CardTitle>
                <Badge variant="secondary" className="bg-warning/10 text-warning">
                  {lowStockItems.length} items
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lowStockItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Only {item.stock} {item.unit} left
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Restock
                    </Button>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4" variant="warning">
                Manage Inventory
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="butcher" size="lg" className="h-auto py-4 flex-col">
                <ShoppingCart className="h-6 w-6 mb-2" />
                New Sale
              </Button>
              <Button variant="action" size="lg" className="h-auto py-4 flex-col">
                <Package className="h-6 w-6 mb-2" />
                Add Product
              </Button>
              <Button variant="action" size="lg" className="h-auto py-4 flex-col">
                <Users className="h-6 w-6 mb-2" />
                Add Customer
              </Button>
              <Button variant="action" size="lg" className="h-auto py-4 flex-col">
                <TrendingUp className="h-6 w-6 mb-2" />
                View Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}