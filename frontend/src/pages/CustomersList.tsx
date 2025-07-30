import { useState } from "react";
import { Plus, Search, Phone, User, MoreVertical, Edit, Trash2, CreditCard } from "lucide-react";
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
const mockCustomers = [
  {
    id: 1,
    name: "Ahmed Hassan",
    phone: "+234 801 234 5678",
    totalPurchases: 45000,
    lastPurchase: "2024-01-20",
    accountBalance: 0,
    status: "Active"
  },
  {
    id: 2,
    name: "Sarah Mohammed", 
    phone: "+234 802 345 6789",
    totalPurchases: 28500,
    lastPurchase: "2024-01-19",
    accountBalance: -2500,
    status: "Active"
  },
  {
    id: 3,
    name: "Ibrahim Ali",
    phone: "+234 803 456 7890", 
    totalPurchases: 67200,
    lastPurchase: "2024-01-20",
    accountBalance: 1500,
    status: "VIP"
  },
  {
    id: 4,
    name: "Fatima Abubakar",
    phone: "+234 804 567 8901",
    totalPurchases: 12000,
    lastPurchase: "2024-01-18",
    accountBalance: 0,
    status: "Active"
  },
  {
    id: 5,
    name: "Yusuf Garba",
    phone: "+234 805 678 9012",
    totalPurchases: 89000,
    lastPurchase: "2024-01-15",
    accountBalance: -5000,
    status: "VIP"
  }
];

export default function CustomersList() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredCustomers = mockCustomers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone.includes(searchTerm);
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VIP": return "bg-primary/10 text-primary";
      case "Active": return "bg-success/10 text-success";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-success";
    if (balance < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const totalCustomers = mockCustomers.length;
  const vipCustomers = mockCustomers.filter(c => c.status === "VIP").length;
  const totalDebt = mockCustomers.reduce((sum, c) => sum + Math.abs(Math.min(c.accountBalance, 0)), 0);
  const totalCredit = mockCustomers.reduce((sum, c) => sum + Math.max(c.accountBalance, 0), 0);

  return (
    <Layout title="Customer Management" showSearch={false}>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                  <p className="text-2xl font-bold">{totalCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">VIP Customers</p>
                  <p className="text-2xl font-bold">{vipCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Debt</p>
                  <p className="text-2xl font-bold text-destructive">₦{totalDebt.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Credit</p>
                  <p className="text-2xl font-bold text-success">₦{totalCredit.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button variant="hero" size="lg" className="w-full md:w-auto">
            <Plus className="h-5 w-5 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Customers List */}
        <div className="space-y-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-primary transition-smooth">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                  <div className="flex items-start space-x-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-lg">{customer.name}</h3>
                        <Badge className={cn("text-xs", getStatusColor(customer.status))}>
                          {customer.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1 text-muted-foreground mb-2">
                        <Phone className="h-4 w-4" />
                        <span>{customer.phone}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span>Total purchases: ₦{customer.totalPurchases.toLocaleString()}</span>
                        <span className="mx-2">•</span>
                        <span>Last purchase: {customer.lastPurchase}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">Account Balance</p>
                      <p className={cn("text-xl font-bold", getBalanceColor(customer.accountBalance))}>
                        {customer.accountBalance === 0 
                          ? "₦0" 
                          : customer.accountBalance > 0 
                            ? `+₦${customer.accountBalance.toLocaleString()}`
                            : `-₦${Math.abs(customer.accountBalance).toLocaleString()}`
                        }
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem>
                          <User className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Customer
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Account History
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Customer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {filteredCustomers.length === 0 && (
          <Card className="p-8">
            <div className="text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No customers found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria
              </p>
              <Button variant="outline">Clear Search</Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}