import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Phone, User, MoreVertical, CreditCard, Receipt, DollarSign, AlertTriangle } from "lucide-react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { customersAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

// Types
interface Customer {
  id: number;
  name: string;
  phone: string;
  createdAt: string;
}

interface CustomerTransaction {
  id: number;
  amount: number;
  reason: string;
  createdAt: string;
  saleId?: number;
  sale?: {
    id: number;
    totalAmount: number;
    discount: number;
    paidAmount: number;
    paymentType: string;
    createdAt: string;
    items: {
      id: number;
      quantity: number;
      price: number;
      item: {
        id: number;
        name: string;
        unit: string;
      };
    }[];
  };
}

interface CustomerAccount {
  balance: number;
  status: string;
  transactions: CustomerTransaction[];
}

export default function CustomerManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [editFormData, setEditFormData] = useState({ name: "", phone: "" });
  const [paymentData, setPaymentData] = useState({ amount: "", paymentType: "CASH" });
  const [showSaleDetailsDialog, setShowSaleDetailsDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState<CustomerTransaction['sale'] | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Ensure component is properly mounted before rendering
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Fetch customers with improved configuration
  const { 
    data: customersResponse, 
    isLoading, 
    error,
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      console.log('Fetching customers...');
      try {
        const response = await customersAPI.getAll();
        console.log('Customers response:', response);
        return response;
      } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Extract customers data safely
  const customers = Array.isArray(customersResponse?.data) ? customersResponse.data : 
                   Array.isArray(customersResponse) ? customersResponse : [];

  // Ensure query is executed when component mounts
  useEffect(() => {
    console.log('CustomersList mounted, triggering query...');
    refetch();
  }, [refetch]);

  // Debug logging
  console.log('CustomersList render state:', { 
    customers, 
    isLoading, 
    error, 
    isFetching,
    customersLength: customers?.length 
  });

  // Fetch customer account data
  const { data: customerAccount, isLoading: isLoadingAccount } = useQuery({
    queryKey: ['customerAccount', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return null;
      try {
        const response = await customersAPI.getTransactions(selectedCustomer.id.toString());
        return response.data || null;
      } catch (error) {
        console.error('Error fetching customer account:', error);
        throw error;
      }
    },
    enabled: !!selectedCustomer && (showAccountDialog || showPaymentDialog),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
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
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { error?: string } } };
      toast({
        title: "Error",
        description: apiError?.response?.data?.error || "Failed to add customer",
        variant: "destructive",
      });
    }
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: (data: { id: string; name: string; phone: string }) => 
      customersAPI.update(data.id, { name: data.name, phone: data.phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowEditDialog(false);
      setEditFormData({ name: "", phone: "" });
      setSelectedCustomer(null);
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { error?: string } } };
      toast({
        title: "Error",
        description: apiError?.response?.data?.error || "Failed to update customer",
        variant: "destructive",
      });
    }
  });

  // Add payment mutation
  const addPaymentMutation = useMutation({
    mutationFn: (data: { customerId: string; amount: number; paymentType: string }) => 
      customersAPI.addPayment(data.customerId, { amount: data.amount, paymentType: data.paymentType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerAccount', selectedCustomer?.id] });
      setShowPaymentDialog(false);
                      setPaymentData({ amount: "", paymentType: "CASH" });
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { error?: string } } };
      toast({
        title: "Error",
        description: apiError?.response?.data?.error || "Failed to record payment",
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
      case "Credit": return "bg-success/10 text-success";
      case "Due": return "bg-destructive/10 text-destructive";
      case "Settled": return "bg-muted text-muted-foreground";
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

  const handleViewProfile = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowProfileDialog(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditFormData({ name: customer.name, phone: customer.phone });
    setShowEditDialog(true);
  };

  const handleUpdateCustomer = () => {
    if (!selectedCustomer || !editFormData.name || !editFormData.phone) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    updateCustomerMutation.mutate({
      id: selectedCustomer.id.toString(),
      name: editFormData.name,
      phone: editFormData.phone
    });
  };

  const handleViewAccount = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowAccountDialog(true);
  };

  const handleMakePayment = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowPaymentDialog(true);
  };

  const handlePayment = () => {
    if (!selectedCustomer || !paymentData.amount) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    
    addPaymentMutation.mutate({
      customerId: selectedCustomer.id.toString(),
      amount: parseFloat(paymentData.amount),
      paymentType: paymentData.paymentType
    });
  };

  const handleViewSaleDetails = (sale: CustomerTransaction['sale']) => {
    if (sale) {
      setSelectedSale(sale);
      setShowSaleDetailsDialog(true);
    }
  };

  const totalCustomers = customers.length;
  const activeCustomers = customers.length; // All customers are considered active for now

  // Show error state
  if (error) {
    return (
      <Layout title="Customer Management" showSearch={false}>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load customers</h3>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "An error occurred while loading customers"}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading || !isMounted) {
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <User className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Customers</p>
                  <p className="text-2xl font-bold">{activeCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">{new Date().toLocaleDateString('en-US', { month: 'short' })}</p>
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
                      <p className="text-sm text-muted-foreground mb-1">Customer ID</p>
                      <p className="text-lg font-semibold">#{customer.id}</p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => handleViewProfile(customer)}>
                          <User className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                          <User className="h-4 w-4 mr-2" />
                          Edit Customer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewAccount(customer)}>
                          <Receipt className="h-4 w-4 mr-2" />
                          Account History
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMakePayment(customer)}>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Make Payment
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

        {/* Edit Customer Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
              <DialogDescription>
                Update customer information. All fields are required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Customer Name</Label>
                <Input
                  id="edit-name"
                  placeholder="Enter customer name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  placeholder="Enter phone number"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowEditDialog(false);
                setEditFormData({ name: "", phone: "" });
                setSelectedCustomer(null);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateCustomer}
                disabled={updateCustomerMutation.isPending}
              >
                {updateCustomerMutation.isPending ? "Updating..." : "Update Customer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Customer Profile Dialog */}
        <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Customer Profile</DialogTitle>
              <DialogDescription>
                Customer information and details
              </DialogDescription>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-4 py-4">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedCustomer.name}</h3>
                    <p className="text-muted-foreground flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {selectedCustomer.phone}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Customer ID</Label>
                    <p className="text-lg">#{selectedCustomer.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className="mt-1">Active</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Joined Date</Label>
                    <p>{new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
                  </div>

                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Account History Dialog */}
        <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Account History</DialogTitle>
              <DialogDescription>
                Transaction history and account balance for {selectedCustomer?.name}
              </DialogDescription>
            </DialogHeader>
            
            {isLoadingAccount ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : customerAccount ? (
              <div className="space-y-4">
                {/* Account Summary */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Account Balance</p>
                        <p className={cn("text-2xl font-bold", getBalanceColor(customerAccount.balance))}>
                          KSH {Math.abs(customerAccount.balance).toLocaleString()}
                        </p>
                      </div>
                      <Badge className={getStatusColor(customerAccount.status)}>
                        {customerAccount.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Transaction History */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  <h4 className="font-medium">Transaction History</h4>
                  {customerAccount.transactions.length > 0 ? (
                    customerAccount.transactions.map((transaction) => (
                      <Card 
                        key={transaction.id} 
                        className={cn(
                          "transition-colors",
                          transaction.saleId && "cursor-pointer hover:bg-muted/50"
                        )}
                        onClick={() => transaction.saleId && handleViewSaleDetails(transaction.sale)}
                      >
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{transaction.reason}</p>
                                {transaction.saleId && (
                                  <Badge variant="outline" className="text-xs">
                                    Sale #{transaction.saleId}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(transaction.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <p className={cn("font-semibold", getBalanceColor(transaction.amount))}>
                              {transaction.amount > 0 ? '+' : ''}KSH {Math.abs(transaction.amount).toLocaleString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No transactions found</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center py-4">No account data available</p>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAccountDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Make Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a payment for {selectedCustomer?.name}
              </DialogDescription>
            </DialogHeader>
            
            {isLoadingAccount ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : customerAccount && (
              <div className="space-y-4 py-4">
                {/* Current Balance */}
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className={cn("text-xl font-bold", getBalanceColor(customerAccount.balance))}>
                        KSH {Math.abs(customerAccount.balance).toLocaleString()}
                      </p>
                      <Badge className={getStatusColor(customerAccount.status)}>
                        {customerAccount.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Payment Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="paymentType">Payment Method</Label>
                    <Select 
                      value={paymentData.paymentType} 
                      onValueChange={(value) => setPaymentData({ ...paymentData, paymentType: value })}
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
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowPaymentDialog(false);
                                        setPaymentData({ amount: "", paymentType: "CASH" });
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handlePayment}
                disabled={addPaymentMutation.isPending || !paymentData.amount}
              >
                {addPaymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sale Details Dialog */}
        <Dialog open={showSaleDetailsDialog} onOpenChange={setShowSaleDetailsDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Sale Details</DialogTitle>
              <DialogDescription>
                Sale #{selectedSale?.id} - {selectedCustomer?.name}
              </DialogDescription>
            </DialogHeader>
            
            {selectedSale ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {/* Sale Summary */}
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Sale ID</p>
                        <p className="font-semibold">#{selectedSale.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-semibold">
                          {new Date(selectedSale.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Method</p>
                        <p className="font-semibold">{selectedSale.paymentType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={selectedSale.paidAmount >= selectedSale.totalAmount ? "default" : "destructive"}>
                          {selectedSale.paidAmount >= selectedSale.totalAmount ? "Paid" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sale Items */}
                <div className="space-y-2">
                  <h4 className="font-medium">Items Sold</h4>
                  {selectedSale.items.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-medium">{item.item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} {item.item.unit} @ KSH {item.price.toLocaleString()}
                            </p>
                          </div>
                          <p className="font-semibold">
                            KSH {(item.quantity * item.price).toLocaleString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Sale Totals */}
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>KSH {(selectedSale.totalAmount + selectedSale.discount).toLocaleString()}</span>
                      </div>
                      {selectedSale.discount > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Discount:</span>
                          <span>-KSH {selectedSale.discount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>KSH {selectedSale.totalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Paid:</span>
                        <span>KSH {selectedSale.paidAmount.toLocaleString()}</span>
                      </div>
                      {selectedSale.paidAmount < selectedSale.totalAmount && (
                        <div className="flex justify-between text-destructive font-semibold">
                          <span>Balance:</span>
                          <span>KSH {(selectedSale.totalAmount - selectedSale.paidAmount).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <p className="text-center py-4">No sale data available</p>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaleDetailsDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}