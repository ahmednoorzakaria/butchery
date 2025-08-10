import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsAPI } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  Calendar,
  BarChart3,
  Target,
  Receipt,
  CreditCard,
  UserCheck,
  Activity,
  AlertTriangle
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

// TypeScript interfaces for the data structures
interface ProfitLossItem {
  name: string;
  category: string;
  totalQuantity: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averagePrice: number;
  averageCost: number;
  profitMargin: number;
}

interface ProfitLossSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalDiscount: number;
  netProfit: number;
  profitMargin: number;
  numberOfSales: number;
}

interface ProfitLossData {
  period: { start: Date; end: Date };
  summary: ProfitLossSummary;
  topPerformers: ProfitLossItem[];
  leastProfitable: ProfitLossItem[];
  categoryBreakdown: Array<{
    name: string;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    itemCount: number;
  }>;
}

interface TopProductItem {
  itemId: string;
  name: string;
  quantitySold: number;
}

interface CustomerDebt {
  customerId: string;
  name: string;
  balance: number;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  stockStatus?: string;
  currentValue?: number;
  currentCost?: number;
}

interface InventoryData {
  totalItems?: number;
  totalValue?: number;
  potentialProfit?: number;
  categoryCount?: number;
  items?: InventoryItem[];
}

interface SalesSummaryData {
  period: { start: Date; end: Date };
  summary: {
    totalSales: number;
    totalPaid: number;
    totalDiscount: number;
    totalCost: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    numberOfSales: number;
    averageOrderValue: number;
    collectionRate: number;
    outstandingAmount: number;
  };
  salesByHour: Array<{ hour: number; sales: number; orders: number }>;
  salesByDay: Array<{ day: string; sales: number; orders: number }>;
  topItems: Array<{ name: string; quantity: number; revenue: number; cost: number; profit: number }>;
  recentSales: Array<{
    id: number;
    customer: string;
    amount: number;
    paid: number;
    discount: number;
    paymentType: string;
    date: string;
    items: Array<{ quantity: number; name: string; price: number }>;
  }>;
}

interface LossesData {
  summary: {
    highRiskItems: number;
    wasteRiskItems: number;
    expiryRiskItems: number;
    totalPotentialLoss: number;
  };
  items: Array<{
    id: string;
    name: string;
    category: string;
    currentStock: number;
    unit: string;
    potentialLoss: number;
    riskType: string;
    recommendations: string[];
  }>;
}

interface InventoryValuationData {
  summary: {
    totalItems: number;
    totalValue: number;
    totalPotentialValue: number;
    totalProfitPotential: number;
    lowStockItems: number;
    outOfStockItems: number;
    highValueItems: number;
  };
  items: Array<{
    id: number;
    name: string;
    category: string;
    subtype: string | null;
    currentStock: number;
    unit: string;
    basePrice: number;
    sellPrice: number;
    limitPrice: number;
    currentValue: number;
    potentialValue: number;
    profitPotential: number;
    profitMargin: number;
    lowStockAlert: boolean;
    salesVelocity: number;
    daysUntilStockout: number;
    turnoverRate: number;
    totalSold: number;
    lastUpdated: string;
  }>;
}

interface CashFlowData {
  period: { start: Date; end: Date };
  summary: {
    totalRevenue: number;
    totalCollected: number;
    totalOutstanding: number;
    totalDiscounts: number;
    totalCost: number;
    grossProfit: number;
    netProfit: number;
    collectionRate: number;
    outstandingRate: number;
  };
  paymentMethods: Array<{
    method: string;
    count: number;
    total: number;
    collected: number;
    outstanding: number;
    collectionRate: number;
  }>;
  dailyCashFlow: Array<{
    date: string;
    revenue: number;
    collected: number;
    outstanding: number;
  }>;
}

interface CustomerAnalysisData {
  customers: Array<{
    name: string;
    numberOfOrders: number;
    totalSpent: number;
    averageOrderValue: number;
  }>;
  totalCustomers: number;
  activeCustomers: number;
}

interface UserPerformanceData {
  userId: string;
  name: string;
  email: string;
  totalSales: number;
  totalPaid: number;
  saleCount: number;
}

interface InventoryUsageData {
  itemId: string;
  name: string;
  totalUsed: number;
  currentStock: number;
}

export const Reports = () => {
  const [selectedReport, setSelectedReport] = useState<'actual-profits' | 'inventory-projections' | 'losses' | 'most-sold' | 'customers-debt' | 'sales' | 'profits-summary' | 'inventory' | 'inventory-valuation' | 'cash-flow' | 'customer-analysis' | 'user-performance' | 'inventory-usage'>('sales');
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch report data based on selection
  const { data: actualProfits, isLoading: actualProfitsLoading } = useQuery<ProfitLossData>({
    queryKey: ['actual-profits', startDate, endDate],
    queryFn: () => reportsAPI.getProfits(startDate, endDate).then(res => res.data),
    enabled: selectedReport === 'actual-profits'
  });

  const { data: inventoryProjections, isLoading: inventoryProjectionsLoading } = useQuery<ProfitLossData>({
    queryKey: ['inventory-projections'],
    queryFn: () => reportsAPI.getProjectedProfits().then(res => res.data),
    enabled: selectedReport === 'inventory-projections'
  });

  const { data: losses, isLoading: lossesLoading } = useQuery<LossesData>({
    queryKey: ['losses', startDate, endDate],
    queryFn: () => reportsAPI.getLosses(startDate, endDate).then(res => res.data),
    enabled: selectedReport === 'losses'
  });

  const { data: mostSold, isLoading: mostSoldLoading } = useQuery<TopProductItem[]>({
    queryKey: ['most-sold', startDate, endDate],
    queryFn: () => reportsAPI.getMostSold(startDate, endDate).then(res => res.data),
    enabled: selectedReport === 'most-sold'
  });

  const { data: customersDebt, isLoading: customersDebtLoading } = useQuery<CustomerDebt[]>({
    queryKey: ['customers-debt'],
    queryFn: () => reportsAPI.getCustomersDebt().then(res => res.data),
    enabled: selectedReport === 'customers-debt'
  });

  const { data: sales, isLoading: salesLoading } = useQuery<SalesSummaryData>({
    queryKey: ['sales', selectedPeriod],
    queryFn: () => reportsAPI.getSalesSummary(selectedPeriod).then(res => res.data),
    enabled: selectedReport === 'sales'
  });

  const { data: profitsSummary, isLoading: profitsSummaryLoading } = useQuery<ProfitLossData>({
    queryKey: ['profits-summary', selectedPeriod],
    queryFn: () => reportsAPI.getProfitsSummary(selectedPeriod).then(res => res.data),
    enabled: selectedReport === 'profits-summary'
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery<InventoryData>({
    queryKey: ['inventory'],
    queryFn: () => reportsAPI.getInventory().then(res => res.data),
    enabled: selectedReport === 'inventory'
  });

  // New queries for additional reports
  const { data: inventoryValuation, isLoading: inventoryValuationLoading } = useQuery<InventoryValuationData>({
    queryKey: ['inventory-valuation'],
    queryFn: () => reportsAPI.getInventoryValuation().then(res => res.data),
    enabled: selectedReport === 'inventory-valuation'
  });

  const { data: cashFlow, isLoading: cashFlowLoading } = useQuery<CashFlowData>({
    queryKey: ['cash-flow', startDate, endDate],
    queryFn: () => reportsAPI.getCashFlow(startDate, endDate).then(res => res.data),
    enabled: selectedReport === 'cash-flow'
  });

  const { data: customerAnalysis, isLoading: customerAnalysisLoading } = useQuery<CustomerAnalysisData>({
    queryKey: ['customer-analysis', startDate, endDate],
    queryFn: () => reportsAPI.getCustomerAnalysis(startDate, endDate).then(res => res.data),
    enabled: selectedReport === 'customer-analysis'
  });

  const { data: userPerformance, isLoading: userPerformanceLoading } = useQuery<UserPerformanceData[]>({
    queryKey: ['user-performance'],
    queryFn: () => reportsAPI.getUserPerformance().then(res => res.data),
    enabled: selectedReport === 'user-performance'
  });

  const { data: inventoryUsage, isLoading: inventoryUsageLoading } = useQuery<InventoryUsageData[]>({
    queryKey: ['inventory-usage'],
    queryFn: () => reportsAPI.getInventoryUsage().then(res => res.data),
    enabled: selectedReport === 'inventory-usage'
  });

  const isLoading = actualProfitsLoading || inventoryProjectionsLoading || lossesLoading || mostSoldLoading || 
                    customersDebtLoading || salesLoading || profitsSummaryLoading || inventoryLoading ||
                    inventoryValuationLoading || cashFlowLoading || customerAnalysisLoading || 
                    userPerformanceLoading || inventoryUsageLoading;

  // Handle period selection
  const handlePeriodChange = (period: 'day' | 'week' | 'month' | 'year') => {
    setSelectedPeriod(period);
    const now = new Date();
    
    switch (period) {
      case 'day':
        setStartDate(format(startOfDay(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfDay(now), 'yyyy-MM-dd'));
        break;
      case 'week':
        setStartDate(format(startOfWeek(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfWeek(now), 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
      case 'year':
        setStartDate(format(startOfYear(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfYear(now), 'yyyy-MM-dd'));
        break;
    }
  };

  if (isLoading) {
    return (
      <Layout title="Business Reports" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Business Reports" showSearch={false}>
      <div className="space-y-6">
        {/* Report Type Selection */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedReport === 'sales' ? "default" : "outline"}
            onClick={() => setSelectedReport('sales')}
            className="capitalize"
          >
            <Receipt className="h-4 w-4 mr-2" />
            Sales
          </Button>
          <Button
            variant={selectedReport === 'actual-profits' ? "default" : "outline"}
            onClick={() => setSelectedReport('actual-profits')}
            className="capitalize"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Actual Profits
          </Button>
          <Button
            variant={selectedReport === 'inventory-projections' ? "default" : "outline"}
            onClick={() => setSelectedReport('inventory-projections')}
            className="capitalize"
          >
            <Target className="h-4 w-4 mr-2" />
            Inventory Projections
          </Button>
          <Button
            variant={selectedReport === 'losses' ? "default" : "outline"}
            onClick={() => setSelectedReport('losses')}
            className="capitalize"
          >
            <TrendingDown className="h-4 w-4 mr-2" />
            Losses
          </Button>
          <Button
            variant={selectedReport === 'most-sold' ? "default" : "outline"}
            onClick={() => setSelectedReport('most-sold')}
            className="capitalize"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Most Sold
          </Button>
          <Button
            variant={selectedReport === 'customers-debt' ? "default" : "outline"}
            onClick={() => setSelectedReport('customers-debt')}
            className="capitalize"
          >
            <Users className="h-4 w-4 mr-2" />
            Customers Debt
          </Button>
          <Button
            variant={selectedReport === 'profits-summary' ? "default" : "outline"}
            onClick={() => setSelectedReport('profits-summary')}
            className="capitalize"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Profits Summary
          </Button>
          <Button
            variant={selectedReport === 'inventory' ? "default" : "outline"}
            onClick={() => setSelectedReport('inventory')}
            className="capitalize"
          >
            <Package className="h-4 w-4 mr-2" />
            Inventory
          </Button>
          <Button
            variant={selectedReport === 'inventory-valuation' ? "default" : "outline"}
            onClick={() => setSelectedReport('inventory-valuation')}
            className="capitalize"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Inventory Valuation
          </Button>
          <Button
            variant={selectedReport === 'cash-flow' ? "default" : "outline"}
            onClick={() => setSelectedReport('cash-flow')}
            className="capitalize"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Cash Flow
          </Button>
          <Button
            variant={selectedReport === 'customer-analysis' ? "default" : "outline"}
            onClick={() => setSelectedReport('customer-analysis')}
            className="capitalize"
          >
            <Users className="h-4 w-4 mr-2" />
            Customer Analysis
          </Button>
          <Button
            variant={selectedReport === 'user-performance' ? "default" : "outline"}
            onClick={() => setSelectedReport('user-performance')}
            className="capitalize"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            User Performance
          </Button>
          <Button
            variant={selectedReport === 'inventory-usage' ? "default" : "outline"}
            onClick={() => setSelectedReport('inventory-usage')}
            className="capitalize"
          >
            <Activity className="h-4 w-4 mr-2" />
            Inventory Usage
          </Button>
        </div>

        {/* Date Range Controls */}
        {(selectedReport === 'actual-profits' || selectedReport === 'losses' || selectedReport === 'most-sold' || selectedReport === 'cash-flow' || selectedReport === 'customer-analysis') && (
          <Card>
            <CardHeader>
              <CardTitle>Date Range</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <Label htmlFor="startDate">From:</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">To:</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(startDate), 'MMM dd, yyyy')} - {format(new Date(endDate), 'MMM dd, yyyy')}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Period Selection */}
        {(selectedReport === 'sales' || selectedReport === 'profits-summary') && (
          <Card>
            <CardHeader>
              <CardTitle>Time Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(['day', 'week', 'month', 'year'] as const).map((period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? "default" : "outline"}
                    onClick={() => handlePeriodChange(period)}
                    className="capitalize"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {period}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sales Report */}
        {selectedReport === 'sales' && sales && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-500" />
                Sales Report - {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    KSH {sales.summary?.totalSales?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-blue-600">Total Sales</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    KSH {sales.summary?.totalPaid?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-green-600">Total Collected</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    KSH {sales.summary?.outstandingAmount?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-red-600">Outstanding</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {sales.summary?.numberOfSales || '0'}
                  </div>
                  <div className="text-sm text-purple-600">Transactions</div>
                </div>
              </div>

              {/* Profit Summary */}
              {sales.summary?.netProfit !== undefined && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      KSH {sales.summary?.netProfit?.toLocaleString() || '0'}
                    </div>
                    <div className="text-sm text-green-600">Net Profit</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {sales.summary?.profitMargin?.toFixed(1) || '0'}%
                    </div>
                    <div className="text-sm text-blue-600">Profit Margin</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {sales.summary?.collectionRate?.toFixed(1) || '0'}%
                    </div>
                    <div className="text-sm text-orange-600">Collection Rate</div>
                  </div>
                </div>
              )}

              {/* Sales by Hour */}
              {sales.salesByHour && sales.salesByHour.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="text-lg font-semibold">Sales by Hour</h3>
                  <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                    {sales.salesByHour.map((hourData, index) => (
                      <div key={index} className="text-center p-2 bg-muted rounded">
                        <div className="text-xs font-medium">{hourData.hour}:00</div>
                        <div className="text-sm text-blue-600">KSH {hourData.sales?.toLocaleString() || '0'}</div>
                        <div className="text-xs text-muted-foreground">{hourData.orders || 0} orders</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sales by Day */}
              {sales.salesByDay && sales.salesByDay.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="text-lg font-semibold">Sales by Day</h3>
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                    {sales.salesByDay.map((dayData, index) => (
                      <div key={index} className="text-center p-3 bg-muted rounded">
                        <div className="text-sm font-medium">{dayData.day}</div>
                        <div className="text-lg text-blue-600">KSH {dayData.sales?.toLocaleString() || '0'}</div>
                        <div className="text-xs text-muted-foreground">{dayData.orders || 0} orders</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Items */}
              {sales.topItems && sales.topItems.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="text-lg font-semibold">Top Selling Items</h3>
                  {sales.topItems.slice(0, 10).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{index + 1}</Badge>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.quantity} units sold
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-blue-600">KSH {item.revenue?.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          Profit: KSH {item.profit?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Sales */}
              {sales.recentSales && sales.recentSales.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Recent Sales</h3>
                  {sales.recentSales.slice(0, 10).map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{sale.id}</Badge>
                        <div>
                          <div className="font-medium">{sale.customer}</div>
                          <div className="text-sm text-muted-foreground">
                            {sale.items.map(item => `${item.quantity} ${item.name} @ KSH ${item.price}`).join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">KSH {sale.amount?.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          Paid: KSH {sale.paid?.toLocaleString()} • {sale.paymentType} • {format(new Date(sale.date), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actual Profits Report */}
        {selectedReport === 'actual-profits' && actualProfits && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Actual Profits Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    KSH {actualProfits.summary?.totalProfit?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-green-600">Total Profit</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    KSH {actualProfits.summary?.totalRevenue?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-blue-600">Total Revenue</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    KSH {actualProfits.summary?.totalCost?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-red-600">Total Cost</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {actualProfits.summary?.profitMargin?.toFixed(1) || '0'}%
                  </div>
                  <div className="text-sm text-purple-600">Profit Margin</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Top Performing Items</h3>
                {actualProfits.topPerformers?.slice(0, 20).map((item: ProfitLossItem, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.totalQuantity} units @ KSH {item.averagePrice?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">KSH {item.totalProfit?.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.profitMargin?.toFixed(1)}% margin
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Projections Report */}
        {selectedReport === 'inventory-projections' && inventoryProjections && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Inventory Projections Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    KSH {inventoryProjections.summary?.totalProfit?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-blue-600">Projected Profit</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    KSH {inventoryProjections.summary?.totalRevenue?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-green-600">Projected Revenue</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    KSH {inventoryProjections.summary?.totalCost?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-red-600">Projected Cost</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {inventoryProjections.summary?.profitMargin?.toFixed(1) || '0'}%
                  </div>
                  <div className="text-sm text-purple-600">Projected Margin</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Item Projections</h3>
                {inventoryProjections.topPerformers?.slice(0, 20).map((item: ProfitLossItem, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.category} • {item.totalQuantity} units
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">KSH {item.totalProfit?.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.profitMargin?.toFixed(1)}% margin
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Losses Report */}
        {selectedReport === 'losses' && losses && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Losses Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    KSH {losses.summary?.totalPotentialLoss?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-red-600">Total Potential Loss</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {losses.summary?.highRiskItems || '0'}
                  </div>
                  <div className="text-sm text-orange-600">High Risk Items</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {losses.summary?.wasteRiskItems || '0'}
                  </div>
                  <div className="text-sm text-yellow-600">Waste Risk Items</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {losses.summary?.expiryRiskItems || '0'}
                  </div>
                  <div className="text-sm text-purple-600">Expiry Risk Items</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Items at Risk</h3>
                {losses.items?.slice(0, 20).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive">{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.riskType} • Current Stock: {item.currentStock} {item.unit}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-red-600">KSH {item.potentialLoss?.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        Recommendations: {item.recommendations.join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Most Sold Report */}
        {selectedReport === 'most-sold' && mostSold && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-green-500" />
                Most Sold Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {mostSold.length || 0}
                  </div>
                  <div className="text-sm text-green-600">Total Items</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {format(new Date(startDate), 'MMM dd')} - {format(new Date(endDate), 'MMM dd')}
                  </div>
                  <div className="text-sm text-blue-600">Period</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    Top 10
                  </div>
                  <div className="text-sm text-purple-600">Ranking</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Top Selling Items</h3>
                {mostSold.slice(0, 20).map((item: TopProductItem, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Item ID: {item.itemId}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{item.quantitySold} units</div>
                      <div className="text-sm text-muted-foreground">
                        Rank #{index + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customers Debt Report */}
        {selectedReport === 'customers-debt' && customersDebt && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                Customers with Outstanding Debt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {customersDebt.length || 0}
                  </div>
                  <div className="text-sm text-orange-600">Customers with Debt</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    KSH {customersDebt.reduce((sum: number, customer: CustomerDebt) => sum + Math.abs(customer.balance), 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-red-600">Total Outstanding</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {customersDebt.length || 0}
                  </div>
                  <div className="text-sm text-blue-600">Total Customers</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Customer Debts</h3>
                {customersDebt.slice(0, 20).map((customer: CustomerDebt, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive">{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Customer ID: {customer.customerId}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-red-600">KSH {Math.abs(customer.balance).toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        Outstanding Balance
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profits Summary Report */}
        {selectedReport === 'profits-summary' && profitsSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Profits Summary - {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    KSH {profitsSummary.summary?.totalProfit?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-green-600">Total Profit</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    KSH {profitsSummary.summary?.totalRevenue?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-blue-600">Total Revenue</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    KSH {profitsSummary.summary?.totalCost?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-red-600">Total Cost</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {profitsSummary.summary?.profitMargin?.toFixed(1) || '0'}%
                  </div>
                  <div className="text-sm text-purple-600">Profit Margin</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Profit by Item</h3>
                {profitsSummary.topPerformers?.slice(0, 15).map((item: ProfitLossItem, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.category} • {item.totalQuantity} units
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">KSH {item.totalProfit?.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        Revenue: KSH {item.totalRevenue?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Report */}
        {selectedReport === 'inventory' && inventory && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-500" />
                Inventory Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {inventory.totalItems || '0'}
                  </div>
                  <div className="text-sm text-purple-600">Total Items</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    KSH {inventory.totalValue?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-blue-600">Total Value</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    KSH {inventory.potentialProfit?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-green-600">Potential Profit</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {inventory.categoryCount || '0'}
                  </div>
                  <div className="text-sm text-orange-600">Categories</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Inventory Items</h3>
                {inventory.items?.slice(0, 20).map((item: InventoryItem) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.category} • {item.quantity} {item.unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        item.stockStatus === 'healthy' ? 'default' :
                        item.stockStatus === 'low_stock' ? 'secondary' :
                        item.stockStatus === 'overstocked' ? 'outline' : 'destructive'
                      }>
                        {item.stockStatus?.replace('_', ' ') || 'Unknown'}
                      </Badge>
                      <div className="text-right">
                        <div className="font-semibold">KSH {item.currentValue?.toLocaleString() || '0'}</div>
                        <div className="text-sm text-muted-foreground">
                          Cost: KSH {item.currentCost?.toLocaleString() || '0'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Valuation Report */}
        {selectedReport === 'inventory-valuation' && inventoryValuation && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                Inventory Valuation Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {inventoryValuation.summary?.totalItems || '0'}
                  </div>
                  <div className="text-sm text-purple-600">Total Items</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    KSH {inventoryValuation.summary?.totalValue?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-blue-600">Current Value</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    KSH {inventoryValuation.summary?.totalPotentialValue?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-green-600">Potential Value</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    KSH {inventoryValuation.summary?.totalProfitPotential?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-orange-600">Profit Potential</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {inventoryValuation.summary?.lowStockItems || '0'}
                  </div>
                  <div className="text-sm text-red-600">Low Stock Items</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {inventoryValuation.summary?.outOfStockItems || '0'}
                  </div>
                  <div className="text-sm text-yellow-600">Out of Stock</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {inventoryValuation.summary?.highValueItems || '0'}
                  </div>
                  <div className="text-sm text-green-600">High Value Items</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Inventory Items</h3>
                {inventoryValuation.items?.slice(0, 20).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={item.lowStockAlert ? "destructive" : "secondary"}>{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.category} • {item.currentStock} {item.unit} • Base: KSH {item.basePrice} • Sell: KSH {item.sellPrice}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">KSH {item.currentValue?.toLocaleString() || '0'}</div>
                      <div className="text-sm text-muted-foreground">
                        Profit: KSH {item.profitPotential?.toLocaleString()} • Margin: {item.profitMargin?.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Velocity: {item.salesVelocity?.toFixed(2)} • Days to Stockout: {item.daysUntilStockout?.toFixed(0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cash Flow Report */}
        {selectedReport === 'cash-flow' && cashFlow && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-500" />
                Cash Flow Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    KSH {cashFlow.summary?.totalRevenue?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-green-600">Total Revenue</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    KSH {cashFlow.summary?.totalCollected?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-blue-600">Total Collected</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    KSH {cashFlow.summary?.totalOutstanding?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-red-600">Total Outstanding</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {cashFlow.summary?.collectionRate?.toFixed(1) || '0'}%
                  </div>
                  <div className="text-sm text-purple-600">Collection Rate</div>
                </div>
              </div>

              {/* Daily Cash Flow */}
              {cashFlow.dailyCashFlow && cashFlow.dailyCashFlow.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="text-lg font-semibold">Daily Cash Flow</h3>
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                    {cashFlow.dailyCashFlow.slice(0, 7).map((dayData, index) => (
                      <div key={index} className="text-center p-3 bg-muted rounded">
                        <div className="text-sm font-medium">{format(new Date(dayData.date), 'MMM dd')}</div>
                        <div className="text-lg text-green-600">KSH {dayData.revenue?.toLocaleString() || '0'}</div>
                        <div className="text-sm text-blue-600">Collected: KSH {dayData.collected?.toLocaleString() || '0'}</div>
                        <div className="text-xs text-red-600">Outstanding: KSH {dayData.outstanding?.toLocaleString() || '0'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Payment Methods</h3>
                {cashFlow.paymentMethods?.slice(0, 10).map((method, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{method.method}</div>
                        <div className="text-sm text-muted-foreground">
                          {method.count} transactions • Total: KSH {method.total?.toLocaleString() || '0'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">KSH {method.collected?.toLocaleString() || '0'}</div>
                      <div className="text-sm text-muted-foreground">
                        Outstanding: KSH {method.outstanding?.toLocaleString() || '0'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Collection Rate: {method.collectionRate?.toFixed(1) || '0'}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Analysis Report */}
        {selectedReport === 'customer-analysis' && customerAnalysis && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                Customer Analysis Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {customerAnalysis.totalCustomers || '0'}
                  </div>
                  <div className="text-sm text-orange-600">Total Customers</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {customerAnalysis.activeCustomers || '0'}
                  </div>
                  <div className="text-sm text-blue-600">Active Customers</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    KSH {customerAnalysis.customers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-green-600">Total Spent</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {customerAnalysis.customers.length || 0}
                  </div>
                  <div className="text-sm text-purple-600">Customers in Period</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Customer Overview</h3>
                {customerAnalysis.customers.slice(0, 20).map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Orders: {customer.numberOfOrders}, Total Spent: KSH {customer.totalSpent?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">KSH {customer.averageOrderValue?.toLocaleString() || '0'}</div>
                      <div className="text-sm text-muted-foreground">
                        Avg. Order Value
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Performance Report */}
        {selectedReport === 'user-performance' && userPerformance && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-purple-500" />
                User Performance Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {userPerformance.length || 0}
                  </div>
                  <div className="text-sm text-purple-600">Total Users</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {userPerformance.reduce((sum, user) => sum + user.totalSales, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-600">Total Sales</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {userPerformance.reduce((sum, user) => sum + user.saleCount, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-green-600">Total Sales Count</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {userPerformance.reduce((sum, user) => sum + user.totalPaid, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-orange-600">Total Paid</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">User Performance</h3>
                {userPerformance.slice(0, 20).map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Email: {user.email}, Total Sales: {user.totalSales?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">Sales Count: {user.saleCount}</div>
                      <div className="text-sm text-muted-foreground">
                        Total Paid: KSH {user.totalPaid?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Usage Report */}
        {selectedReport === 'inventory-usage' && inventoryUsage && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-500" />
                Inventory Usage Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {inventoryUsage.length || 0}
                  </div>
                  <div className="text-sm text-purple-600">Total Items Tracked</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {inventoryUsage.reduce((sum, item) => sum + item.totalUsed, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-600">Total Units Used</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {inventoryUsage.reduce((sum, item) => sum + item.currentStock, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-green-600">Total Current Stock</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {inventoryUsage.length || 0}
                  </div>
                  <div className="text-sm text-orange-600">Items Tracked</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Inventory Usage Details</h3>
                {inventoryUsage.slice(0, 20).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Item ID: {item.itemId}, Total Used: {item.totalUsed}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">Current Stock: {item.currentStock}</div>
                      <div className="text-sm text-muted-foreground">
                        Total Used: {item.totalUsed}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
