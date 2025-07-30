import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Phone, User, MoreVertical, Edit, Trash2, CreditCard } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { customersAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

// Types
interface Customer {
  id: number;
  name: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerAccount {
  balance: number;
  status: string;
  transactions: Array<{
    id: number;
    amount: number;
    reason: string;
    createdAt: string;
  }>;
}

export default function CustomersList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersAPI.getAll().then(res => res.data)
  });

  // Add customer mutation
  const addCustomerMutation = useMutation({
    mutationFn: (data: { name: string; phone: string }) => customersAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowAddDialog(false);
      setFormData({ name: "", phone: "" });
      toast({
        title: "Success",
        description: "Customer added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add customer",
        variant: "destructive",
      });
    }
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: (id: number) => customersAPI.delete(id.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    }
  });

  const filteredCustomers = customers.filter((customer: Customer) => {
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

  const handleAddCustomer = () => {
    if (!formData.name || !formData.phone) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    addCustomerMutation.mutate(formData);
  };

  const handleDeleteCustomer = (id: number) => {
    deleteCustomerMutation.mutate(id);
  };

  const totalCustomers = customers.length;
  const vipCustomers = 0; // Will need to be calculated based on purchase history
  const totalDebt = 0; // Will need to fetch from customer accounts
  const totalCredit = 0; // Will need to fetch from customer accounts

  if (isLoading) {
    return (
      <Layout title="Customer Management" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

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
          
          <Button 
            variant="hero" 
            size="lg" 
            className="w-full md:w-auto"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Customers List */}
        <div className="space-y-4">
          {filteredCustomers.map((customer: Customer) => (
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
                        <Badge className={cn("text-xs", getStatusColor("Active"))}>
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1 text-muted-foreground mb-2">
                        <Phone className="h-4 w-4" />
                        <span>{customer.phone}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span>Joined: {new Date(customer.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">Account Balance</p>
                      <p className={cn("text-xl font-bold", getBalanceColor(0))}>
                        ₦0
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
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteCustomer(customer.id)}
                        >
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
              <Button variant="outline" onClick={() => setSearchTerm("")}>
                Clear Search
              </Button>
            </div>
          </Card>
        )}

        {/* Add Customer Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Add a new customer to your database. All fields are required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name</Label>
                <Input
                  id="name"
                  placeholder="Enter customer name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowAddDialog(false);
                setFormData({ name: "", phone: "" });
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddCustomer}
                disabled={addCustomerMutation.isPending}
              >
                {addCustomerMutation.isPending ? "Adding..." : "Add Customer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}