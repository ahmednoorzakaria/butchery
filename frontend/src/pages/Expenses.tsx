import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Edit, Trash2, Download, Filter, DollarSign, User, FileText, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { expensesAPI } from '@/services/api';
import { format } from 'date-fns';

interface Expense {
  id: number;
  amount: number;
  reason: string;
  recipient: string;
  date: string;
  notes?: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

interface MonthlySummary {
  totalAmount: number;
  count: number;
  month: string;
  year: string;
}

const EXPENSE_CATEGORIES = [
  'General',
  'Utilities',
  'Rent',
  'Supplies',
  'Transportation',
  'Marketing',
  'Maintenance',
  'Insurance',
  'Taxes',
  'Other'
];

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const { toast } = useToast();
  
  // Check if current user is admin
  const isAdmin = localStorage.getItem("user_role") === "ADMIN";

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    recipient: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    category: 'General'
  });

  useEffect(() => {
    fetchExpenses();
    fetchMonthlyExpenses();
  }, [currentMonth]);

  useEffect(() => {
    filterExpenses();
  }, [expenses, searchTerm, selectedCategory]);

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const response = await expensesAPI.getAll();
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expenses",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMonthlyExpenses = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const response = await expensesAPI.getMonthly(year, month);
      setMonthlySummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching monthly expenses:', error);
    }
  };

  const filterExpenses = () => {
    let filtered = expenses;

    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(expense => expense.category === selectedCategory);
    }

    setFilteredExpenses(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingExpense) {
        await expensesAPI.update(editingExpense.id, formData);
        toast({
          title: "Success",
          description: "Expense updated successfully"
        });
      } else {
        await expensesAPI.create(formData);
        toast({
          title: "Success",
          description: "Expense added successfully"
        });
      }
      
      resetForm();
      setIsDialogOpen(false);
      fetchExpenses();
      fetchMonthlyExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: "Error",
        description: "Failed to save expense",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount.toString(),
      reason: expense.reason,
      recipient: expense.recipient,
      date: format(new Date(expense.date), 'yyyy-MM-dd'),
      notes: expense.notes || '',
      category: expense.category
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await expensesAPI.delete(id);
      toast({
        title: "Success",
        description: "Expense deleted successfully"
      });
      fetchExpenses();
      fetchMonthlyExpenses();
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      let errorMessage = "Failed to delete expense";
      if (error.response?.status === 403) {
        errorMessage = error.response?.data?.message || "Admin access required to delete expenses";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      reason: '',
      recipient: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      category: 'General'
    });
    setEditingExpense(null);
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const downloadMonthlyReport = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const response = await expensesAPI.downloadMonthlyReport(year, month);
      
      // Create and download the file
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-report-${year}-${month.toString().padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Monthly report downloaded successfully"
      });
    } catch (error: any) {
      console.error('Error downloading report:', error);
      
      let errorMessage = "Failed to download report";
      if (error.response?.status === 403) {
        errorMessage = error.response?.data?.message || "Admin access required to download reports";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const downloadComprehensiveReport = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const response = await expensesAPI.downloadComprehensiveReport(year, month);
      
      // Create and download the file
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprehensive-report-${year}-${month.toString().padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Comprehensive report downloaded successfully"
      });
    } catch (error: any) {
      console.error('Error downloading comprehensive report:', error);
      
      let errorMessage = "Failed to download comprehensive report";
      if (error.response?.status === 403) {
        errorMessage = error.response?.data?.message || "Admin access required to download reports";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'General': 'bg-gray-100 text-gray-800',
      'Utilities': 'bg-blue-100 text-blue-800',
      'Rent': 'bg-red-100 text-red-800',
      'Supplies': 'bg-green-100 text-green-800',
      'Transportation': 'bg-yellow-100 text-yellow-800',
      'Marketing': 'bg-purple-100 text-purple-800',
      'Maintenance': 'bg-orange-100 text-orange-800',
      'Insurance': 'bg-indigo-100 text-indigo-800',
      'Taxes': 'bg-pink-100 text-pink-800',
      'Other': 'bg-slate-100 text-slate-800'
    };
    return colors[category] || colors['General'];
  };

  return (
    <Layout title="Expenses Management" showSearch={false}>
      <div className="space-y-6">
        {/* Header with Monthly Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                KSH {monthlySummary?.totalAmount?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                {monthlySummary?.count || '0'} expenses in {format(currentMonth, 'MMMM yyyy')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Daily Expense</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                KSH {monthlySummary?.count ? (monthlySummary.totalAmount / monthlySummary.count).toFixed(0) : '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Per expense this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Month Navigation</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMonthChange('prev')}
                >
                  ←
                </Button>
                <span className="text-sm font-medium">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMonthChange('next')}
                >
                  →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Notice */}
        {!isAdmin && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-blue-800">
                <div className="h-5 w-5 text-blue-600">ℹ️</div>
                <p className="text-sm">
                  <span className="font-medium">Note:</span> Only administrators can delete expenses and download reports. 
                  Sales users can view expenses and add new ones.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EXPENSE_CATEGORIES.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={downloadMonthlyReport} 
              variant="outline"
              disabled={!isAdmin}
              title={!isAdmin ? "Admin access required" : ""}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
            <Button 
              onClick={downloadComprehensiveReport} 
              variant="outline"
              disabled={!isAdmin}
              title={!isAdmin ? "Admin access required" : ""}
            >
              <Download className="h-4 w-4 mr-2" />
              Comprehensive Report
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingExpense ? 'Update the expense details below.' : 'Fill in the expense details below.'}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (KSH)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recipient">Recipient</Label>
                    <Input
                      id="recipient"
                      value={formData.recipient}
                      onChange={(e) => setFormData({...formData, recipient: e.target.value})}
                      placeholder="Who received the payment?"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Input
                      id="reason"
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                      placeholder="What was this expense for?"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Additional details..."
                      rows={3}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingExpense ? 'Update Expense' : 'Add Expense'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Expenses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
            <CardDescription>
              {filteredExpenses.length} of {expenses.length} expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No expenses found</p>
                {searchTerm || selectedCategory !== 'all' ? (
                  <p className="text-sm">Try adjusting your filters</p>
                ) : (
                  <p className="text-sm">Add your first expense to get started</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">
                          {format(new Date(expense.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="font-bold text-red-600">
                          KSH {expense.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {expense.recipient}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {expense.reason}
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(expense.category)}>
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-muted-foreground">
                          {expense.notes || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(expense)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this expense? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(expense.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
