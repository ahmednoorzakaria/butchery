import { useState } from "react";
import { Plus, Search, Filter, Calendar, Receipt, Eye } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Mock data - replace with API call
const mockSales = [
  {
    id: "SAL001",
    customer: "Ahmed Hassan",
    date: "2024-01-20",
    time: "14:30",
    items: 3,
    total: 15000,
    paymentMethod: "Cash",
    status: "Completed"
  },
  {
    id: "SAL002", 
    customer: "Sarah Mohammed",
    date: "2024-01-20",
    time: "13:15",
    items: 2,
    total: 8500,
    paymentMethod: "Transfer",
    status: "Completed"
  },
  {
    id: "SAL003",
    customer: "Ibrahim Ali", 
    date: "2024-01-20",
    time: "12:45",
    items: 5,
    total: 22000,
    paymentMethod: "Card",
    status: "Completed"
  },
  {
    id: "SAL004",
    customer: "Fatima Abubakar",
    date: "2024-01-19",
    time: "16:20",
    items: 1,
    total: 1200,
    paymentMethod: "Cash",
    status: "Completed"
  }
];

export default function SalesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("today");

  const filteredSales = mockSales.filter(sale => {
    const matchesSearch = sale.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.id.toLowerCase().includes(searchTerm.toLowerCase());
    // Add date filtering logic here
    return matchesSearch;
  });

  const todayTotal = mockSales
    .filter(sale => sale.date === "2024-01-20")
    .reduce((sum, sale) => sum + sale.total, 0);

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case "Cash": return "bg-success/10 text-success";
      case "Transfer": return "bg-primary/10 text-primary";
      case "Card": return "bg-warning/10 text-warning";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Layout title="Sales Management" showSearch={false}>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Today's Sales</p>
                  <p className="text-2xl font-bold">₦{todayTotal.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold">{filteredSales.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Sale</p>
                  <p className="text-2xl font-bold">₦{Math.round(todayTotal / mockSales.filter(s => s.date === "2024-01-20").length).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Items Sold</p>
                  <p className="text-2xl font-bold">{mockSales.reduce((sum, sale) => sum + sale.items, 0)}</p>
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
                placeholder="Search by customer or sale ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={selectedDate === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDate("today")}
              >
                Today
              </Button>
              <Button
                variant={selectedDate === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDate("week")}
              >
                This Week
              </Button>
              <Button
                variant={selectedDate === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDate("month")}
              >
                This Month
              </Button>
            </div>
          </div>
          
          <Button variant="hero" size="lg" className="w-full md:w-auto">
            <Plus className="h-5 w-5 mr-2" />
            New Sale
          </Button>
        </div>

        {/* Sales List */}
        <div className="space-y-4">
          {filteredSales.map((sale) => (
            <Card key={sale.id} className="hover:shadow-primary transition-smooth">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                  <div className="flex items-start space-x-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Receipt className="h-6 w-6 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-lg">{sale.id}</h3>
                        <Badge className={cn("text-xs", getPaymentMethodColor(sale.paymentMethod))}>
                          {sale.paymentMethod}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{sale.customer}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {sale.date} at {sale.time}
                        </span>
                        <span>{sale.items} items</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">₦{sale.total.toLocaleString()}</p>
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        {sale.status}
                      </Badge>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Receipt className="h-4 w-4 mr-2" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {filteredSales.length === 0 && (
          <Card className="p-8">
            <div className="text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sales found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or date filter
              </p>
              <Button variant="outline">Clear Filters</Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}