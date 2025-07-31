import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsAPI, salesAPI } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  BarChart3,
  Calendar,
  RefreshCw
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const Report = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // Fetch sales reports for different periods
  const { data: dailyReport, isLoading: dailyLoading } = useQuery({
    queryKey: ['salesReport', 'daily'],
    queryFn: () => salesAPI.report('daily').then(res => res.data)
  });

  const { data: weeklyReport, isLoading: weeklyLoading } = useQuery({
    queryKey: ['salesReport', 'weekly'],
    queryFn: () => salesAPI.report('weekly').then(res => res.data)
  });

  // Fetch all sales for monthly calculations and charts
  const { data: allSales, isLoading: salesLoading } = useQuery({
    queryKey: ['allSales'],
    queryFn: () => salesAPI.getAll().then(res => res.data)
  });

  // Fetch additional report data
  const { data: topProducts, isLoading: topProductsLoading } = useQuery({
    queryKey: ['topProducts'],
    queryFn: () => reportsAPI.getTopProducts().then(res => res.data)
  });

  const { data: inventoryUsage, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventoryUsage'],
    queryFn: () => reportsAPI.getInventoryUsage().then(res => res.data)
  });

  const { data: outstandingBalances, isLoading: outstandingLoading } = useQuery({
    queryKey: ['outstandingBalances'],
    queryFn: () => reportsAPI.getOutstandingBalances().then(res => res.data)
  });

  // Calculate monthly report from all sales
  const monthlyReport = allSales ? (() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const monthlySales = allSales.filter((sale: any) => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= monthStart && saleDate <= monthEnd;
    });

    const totalSales = monthlySales.reduce((sum: number, sale: any) => sum + sale.totalAmount, 0);
    const totalPaid = monthlySales.reduce((sum: number, sale: any) => sum + sale.paidAmount, 0);
    const totalDiscount = monthlySales.reduce((sum: number, sale: any) => sum + sale.discount, 0);

    return {
      totalSales,
      totalPaid,
      totalDiscount,
      numberOfSales: monthlySales.length,
      outstandingAmount: totalSales - totalPaid
    };
  })() : null;

  const isLoading = dailyLoading || weeklyLoading || salesLoading || 
                    topProductsLoading || inventoryLoading || outstandingLoading;

  const currentReport = selectedPeriod === 'daily' ? dailyReport : 
                      selectedPeriod === 'weekly' ? weeklyReport : 
                      monthlyReport;

  const totalOutstanding = outstandingBalances?.reduce((sum: number, customer: any) => sum + Math.abs(customer.balance), 0) || 0;
  const collectionRate = currentReport ? ((currentReport.totalPaid / currentReport.totalSales) * 100) : 0;

  // Prepare chart data
  const productChartData = topProducts?.slice(0, 5).map((product: any) => ({
    name: product.name,
    quantity: product.quantitySold
  })) || [];

  const inventoryChartData = inventoryUsage?.map((item: any) => ({
    name: item.name,
    used: item.totalUsed,
    remaining: item.currentStock
  })) || [];

  if (isLoading) {
    return (
      <Layout title="Business Reports & Analytics" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Business Reports & Analytics" showSearch={false}>
      <div className="space-y-6">
        {/* Period Selector */}
        <div className="flex flex-wrap gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? "hero" : "outline"}
              onClick={() => setSelectedPeriod(period)}
              className="capitalize"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {period}
            </Button>
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">{selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Revenue</p>
                  <p className="text-2xl font-bold text-primary">KSH  {currentReport?.totalSales?.toLocaleString() || 0}</p>
                  <p className="text-xs text-muted-foreground">{currentReport?.numberOfSales || 0} sales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Collection Rate</p>
                  <p className="text-2xl font-bold text-success">{collectionRate.toFixed(1)}%</p>
                  <p className="text-xs text-success">KSH  {currentReport?.totalPaid?.toLocaleString() || 0} collected</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding Amount</p>
                  <p className="text-2xl font-bold text-destructive">KSH  {totalOutstanding.toLocaleString()}</p>
                  <p className="text-xs text-destructive">All customers combined</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-8 w-8 text-secondary" />
                <div>
                  <p className="text-sm text-muted-foreground">Discounts Given</p>
                  <p className="text-2xl font-bold text-secondary">KSH  {currentReport?.totalDiscount?.toLocaleString() || 0}</p>
                  <p className="text-xs text-muted-foreground">Customer savings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Best & Worst Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-success">🏆 Best Performer</CardTitle>
            </CardHeader>
            <CardContent>
              {currentReport?.mostSoldItem ? (
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">{currentReport.mostSoldItem.name}</h3>
                  <p className="text-muted-foreground">
                    Sold {currentReport.mostSoldItem.quantity} units this {selectedPeriod}
                  </p>
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    Top Seller
                  </Badge>
                </div>
              ) : (
                <p className="text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">📉 Needs Attention</CardTitle>
            </CardHeader>
            <CardContent>
              {currentReport?.leastSoldItem ? (
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">{currentReport.leastSoldItem.name}</h3>
                  <p className="text-muted-foreground">
                    Only {currentReport.leastSoldItem.quantity} units sold this {selectedPeriod}
                  </p>
                  <Badge variant="destructive" className="bg-destructive/10">
                    Low Sales
                  </Badge>
                </div>
              ) : (
                <p className="text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Selling Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="quantity" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Inventory Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory Usage vs Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={inventoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="used" fill="hsl(var(--destructive))" name="Used" />
                  <Bar dataKey="remaining" fill="hsl(var(--primary))" name="Remaining" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Outstanding Customers */}
        {outstandingBalances && outstandingBalances.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Users className="h-5 w-5" />
                Customers with Outstanding Balances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {outstandingBalances.slice(0, 5).map((customer: any) => (
                  <div key={customer.customerId} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div>
                      <h4 className="font-medium">{customer.name}</h4>
                      <p className="text-sm text-muted-foreground">Customer ID: {customer.customerId}</p>
                    </div>
                    <Badge variant="destructive">
                      KSH  {Math.abs(customer.balance).toLocaleString()}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>📊 {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <h3 className="text-lg font-semibold text-primary">Total Sales</h3>
                <p className="text-2xl font-bold">KSH  {currentReport?.totalSales?.toLocaleString() || 0}</p>
              </div>
              <div className="text-center p-4 bg-success/5 rounded-lg">
                <h3 className="text-lg font-semibold text-success">Amount Collected</h3>
                <p className="text-2xl font-bold">KSH  {currentReport?.totalPaid?.toLocaleString() || 0}</p>
              </div>
              <div className="text-center p-4 bg-destructive/5 rounded-lg">
                <h3 className="text-lg font-semibold text-destructive">Outstanding</h3>
                <p className="text-2xl font-bold">KSH  {((currentReport?.totalSales || 0) - (currentReport?.totalPaid || 0)).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Report;