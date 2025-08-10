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
  Receipt
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
  totalSales?: number;
  totalPaid?: number;
  outstandingAmount?: number;
  numberOfSales?: number;
  netProfit?: number;
  profitMargin?: number;
  collectionRate?: number;
  salesByHour?: Array<{ hour: string; sales: number }>;
  salesByDay?: Array<{ day: string; sales: number }>;
  topItems?: Array<{ name: string; quantity: number; revenue: number; cost: number; profit: number }>;
  recentSales?: Array<{
    id: number;
    customer: string;
    amount: number;
    paymentType: string;
    date: string;
    items: Array<{ quantity: number; name: string }>;
  }>;
}

interface LossesData {
  summary: {
    totalLoss: number;
    numberOfLossItems: number;
    numberOfSales: number;
  };
  lossItems: ProfitLossItem[];
}

export const Reports = () => {
  const [selectedReport, setSelectedReport] = useState<'actual-profits' | 'inventory-projections' | 'losses' | 'most-sold' | 'customers-debt' | 'sales' | 'profits-summary' | 'inventory'>('sales');
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

  const isLoading = actualProfitsLoading || inventoryProjectionsLoading || lossesLoading || mostSoldLoading || 
                    customersDebtLoading || salesLoading || profitsSummaryLoading || inventoryLoading;

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
        </div>

        {/* Date Range Controls */}
        {(selectedReport === 'actual-profits' || selectedReport === 'losses' || selectedReport === 'most-sold') && (
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
                    KSH {sales.totalSales?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-blue-600">Total Sales</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    KSH {sales.totalPaid?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-green-600">Total Collected</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    KSH {sales.outstandingAmount?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-red-600">Outstanding</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {sales.numberOfSales || '0'}
                  </div>
                  <div className="text-sm text-purple-600">Transactions</div>
                </div>
              </div>

              {/* Profit Summary */}
              {sales.netProfit !== undefined && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      KSH {sales.netProfit?.toLocaleString() || '0'}
                    </div>
                    <div className="text-sm text-green-600">Net Profit</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {sales.profitMargin?.toFixed(1) || '0'}%
                    </div>
                    <div className="text-sm text-blue-600">Profit Margin</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {sales.collectionRate?.toFixed(1) || '0'}%
                    </div>
                    <div className="text-sm text-orange-600">Collection Rate</div>
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
                            {sale.items.map(item => `${item.quantity} ${item.name}`).join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">KSH {sale.amount?.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {sale.paymentType} • {format(new Date(sale.date), 'MMM dd, yyyy')}
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
                    KSH {losses.summary?.totalLoss?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-red-600">Total Loss</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {losses.summary?.numberOfLossItems || '0'}
                  </div>
                  <div className="text-sm text-orange-600">Loss Items</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {losses.summary?.numberOfSales || '0'}
                  </div>
                  <div className="text-sm text-yellow-600">Total Sales</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Items Sold at Loss</h3>
                {losses.lossItems?.slice(0, 20).map((item: ProfitLossItem, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive">{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.totalQuantity} units • Sold: KSH {item.averagePrice?.toFixed(2)} • Base: KSH {item.averageCost?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-red-600">KSH {item.totalProfit?.toLocaleString()}</div>
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
      </div>
    </Layout>
  );
};

export default Reports;
