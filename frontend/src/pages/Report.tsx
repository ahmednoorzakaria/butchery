import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsAPI, salesAPI } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MetricCard } from "@/components/reports/MetricCard";
import { SalesGrowthChart } from "@/components/charts/SalesGrowthChart";
import { SalesHeatmap } from "@/components/charts/SalesHeatmap";
import { 
  TrendingUp, 
  Users, 
  Package, 
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  BarChart3,
  Calendar,
  User,
  Trophy,
  Target,
  CreditCard,
  TrendingDown,
  Activity,
  PieChart as PieChartIcon,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Zap
} from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, LineChart, Line } from "recharts";

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedReportType, setSelectedReportType] = useState<'overview' | 'detailed' | 'analytics'>('overview');

  // Fetch all report data
  const { data: dailyReport, isLoading: dailyLoading } = useQuery({
    queryKey: ['salesReport', 'daily'],
    queryFn: () => salesAPI.report('daily').then(res => res.data)
  });

  const { data: weeklyReport, isLoading: weeklyLoading } = useQuery({
    queryKey: ['salesReport', 'weekly'],
    queryFn: () => salesAPI.report('weekly').then(res => res.data)
  });

  const { data: allSales, isLoading: salesLoading } = useQuery({
    queryKey: ['allSales'],
    queryFn: () => salesAPI.getAll().then(res => res.data)
  });

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

  const { data: userPerformance, isLoading: userPerformanceLoading } = useQuery({
    queryKey: ['userPerformance'],
    queryFn: () => reportsAPI.getUserPerformance().then(res => res.data)
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
                    topProductsLoading || inventoryLoading || outstandingLoading || userPerformanceLoading;

  const currentReport = selectedPeriod === 'daily' ? dailyReport : 
                      selectedPeriod === 'weekly' ? weeklyReport : 
                      monthlyReport;

  const totalOutstanding = outstandingBalances?.reduce((sum: number, customer: any) => sum + Math.abs(customer.balance), 0) || 0;
  const collectionRate = currentReport ? ((currentReport.totalPaid / currentReport.totalSales) * 100) : 0;

  // Prepare chart data
  const productChartData = topProducts?.slice(0, 8).map((product: any) => ({
    name: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
    quantity: product.quantitySold,
    revenue: product.totalRevenue || 0
  })) || [];

  const inventoryChartData = inventoryUsage?.slice(0, 10).map((item: any) => ({
    name: item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name,
    used: item.totalUsed,
    remaining: item.currentStock,
    turnover: item.currentStock > 0 ? (item.totalUsed / item.currentStock).toFixed(1) : 0
  })) || [];

  // User performance chart data
  const userPerformanceChartData = userPerformance?.map((user: any) => ({
    name: user.name === 'Unknown' ? 'Anonymous' : (user.name.length > 12 ? user.name.substring(0, 12) + '...' : user.name),
    totalSales: user.totalSales,
    saleCount: user.saleCount,
    avgSale: user.saleCount > 0 ? (user.totalSales / user.saleCount) : 0
  })) || [];

  // Sales heatmap data (simulated - day of week analysis)
  const salesHeatmapData = allSales ? (() => {
    const dayMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
    const daySales = [0, 0, 0, 0, 0, 0, 0];
    
    allSales.forEach((sale: any) => {
      const day = new Date(sale.createdAt).getDay();
      daySales[day] += sale.totalAmount;
    });

    const maxSales = Math.max(...daySales);
    return daySales.map((sales, index) => ({
      day: dayMap[index as keyof typeof dayMap],
      sales,
      intensity: maxSales > 0 ? (sales / maxSales) * 4 : 0
    }));
  })() : [];

  // Find top performer
  const topPerformer = userPerformance?.reduce((top: any, user: any) => 
    user.totalSales > (top?.totalSales || 0) ? user : top, null);

  // Calculate growth trends (simulated)
  const salesGrowthData = [
    { period: 'Jan', sales: 45000, growth: 12 },
    { period: 'Feb', sales: 52000, growth: 15.5 },
    { period: 'Mar', sales: 48000, growth: -7.7 },
    { period: 'Apr', sales: 61000, growth: 27.1 },
    { period: 'May', sales: 55000, growth: -9.8 },
    { period: 'Jun', sales: 67000, growth: 21.8 },
  ];

  if (isLoading) {
    return (
      <Layout title="Business Analytics Dashboard" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Business Analytics Dashboard" showSearch={false}>
      <div className="space-y-8">
        {/* Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {(['overview', 'detailed', 'analytics'] as const).map((type) => (
              <Button
                key={type}
                variant={selectedReportType === type ? "analytics" : "outline"}
                onClick={() => setSelectedReportType(type)}
                className="capitalize"
              >
                {type === 'overview' && <BarChart3 className="h-4 w-4 mr-2" />}
                {type === 'detailed' && <FileText className="h-4 w-4 mr-2" />}
                {type === 'analytics' && <Activity className="h-4 w-4 mr-2" />}
                {type}
              </Button>
            ))}
          </div>

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

        </div>

        {/* Key Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title={`${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Revenue`}
            value={`KSH ${currentReport?.totalSales?.toLocaleString() || 0}`}
            icon={<DollarSign className="h-6 w-6 text-primary" />}
            subtitle={`${currentReport?.numberOfSales || 0} transactions`}
            trend={{ value: 15.2, direction: 'up' }}
            variant="default"
          />

          <MetricCard
            title="Collection Rate"
            value={`${collectionRate.toFixed(1)}%`}
            icon={<TrendingUp className="h-6 w-6 text-success" />}
            subtitle={`KSH ${currentReport?.totalPaid?.toLocaleString() || 0} collected`}
            trend={{ value: 8.5, direction: 'up' }}
            variant="success"
          />

          <MetricCard
            title="Outstanding Debts"
            value={`KSH ${totalOutstanding.toLocaleString()}`}
            icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
            subtitle="All customers combined"
            trend={{ value: 3.2, direction: 'down' }}
            variant="destructive"
          />

          <MetricCard
            title="Discounts Given"
            value={`KSH ${currentReport?.totalDiscount?.toLocaleString() || 0}`}
            icon={<ShoppingCart className="h-6 w-6 text-warning" />}
            subtitle="Customer savings"
            trend={{ value: 2.1, direction: 'up' }}
            variant="warning"
          />
        </div>

        {/* Conditional Content Based on Report Type */}
        {selectedReportType === 'overview' && (
          <>
            {/* User Performance Overview */}
            {userPerformance && userPerformance.length > 0 && (
              <Card className="animate-slide-up">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-chart-1" />
                    Sales Team Performance
                  </CardTitle>
                  <Badge className="bg-primary/10 text-primary">
                    🏆 {topPerformer?.name || 'No data'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {userPerformance.slice(0, 4).map((user: any, index: number) => {
                        const collectionRate = ((user.totalPaid / user.totalSales) * 100);
                        const isTopPerformer = user.userId === topPerformer?.userId;
                        
                        return (
                          <div 
                            key={user.userId || 'unknown'}
                            className={`p-4 rounded-lg border transition-smooth hover:shadow-medium ${
                              isTopPerformer ? 'bg-primary/5 border-primary/30' : 'bg-card'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                  isTopPerformer ? 'bg-primary/10' : 'bg-muted'
                                }`}>
                                  {isTopPerformer ? <Trophy className="h-5 w-5 text-primary" /> : <User className="h-5 w-5" />}
                                </div>
                                <div>
                                  <h3 className="font-semibold">{user.name}</h3>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-primary">KSH {user.totalSales.toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground">{user.saleCount} sales</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Performance Comparison</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={userPerformanceChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-muted-foreground" tick={{ fontSize: 11 }} />
                          <YAxis className="text-muted-foreground" tick={{ fontSize: 11 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              boxShadow: 'var(--shadow-medium)'
                            }} 
                          />
                          <Bar dataKey="totalSales" fill="hsl(var(--chart-1))" name="Total Sales (KSH)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Best & Worst Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-success flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Best Performer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentReport?.mostSoldItem ? (
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold">{currentReport.mostSoldItem.name}</h3>
                      <p className="text-muted-foreground">
                        Sold {currentReport.mostSoldItem.quantity} units this {selectedPeriod}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-success/10 text-success border-success/20">
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                          Top Seller
                        </Badge>
                        <Badge variant="outline">
                          {((currentReport.mostSoldItem.quantity / currentReport.numberOfSales) * 100).toFixed(1)}% of sales
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No data available</p>
                  )}
                </CardContent>
              </Card>

              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Needs Attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentReport?.leastSoldItem ? (
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold">{currentReport.leastSoldItem.name}</h3>
                      <p className="text-muted-foreground">
                        Only {currentReport.leastSoldItem.quantity} units sold this {selectedPeriod}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                          Low Sales
                        </Badge>
                        <Badge variant="outline">
                          Needs marketing boost
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No data available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {selectedReportType === 'detailed' && (
          <>
            {/* Detailed Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-chart-1" />
                    Top Selling Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={productChartData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-muted-foreground" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" className="text-muted-foreground" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: 'var(--shadow-medium)'
                        }} 
                      />
                      <Bar dataKey="quantity" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-chart-2" />
                    Inventory Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={inventoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-muted-foreground" tick={{ fontSize: 10 }} height={80} />
                      <YAxis className="text-muted-foreground" tick={{ fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: 'var(--shadow-medium)'
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="used" fill="hsl(var(--chart-4))" name="Used" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="remaining" fill="hsl(var(--chart-2))" name="Remaining" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Outstanding Customers */}
            {outstandingBalances && outstandingBalances.length > 0 && (
              <Card className="animate-slide-up">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <CreditCard className="h-5 w-5" />
                    Outstanding Customer Balances
                  </CardTitle>
                  <Badge variant="destructive">
                    {outstandingBalances.length} customers
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {outstandingBalances.map((customer: any) => (
                      <div key={customer.customerId} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-smooth">
                        <div>
                          <h4 className="font-medium">{customer.name}</h4>
                          <p className="text-sm text-muted-foreground">ID: {customer.customerId}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive" className="text-sm">
                            KSH {Math.abs(customer.balance).toLocaleString()}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.floor(Math.random() * 30 + 1)} days overdue
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {selectedReportType === 'analytics' && (
          <>
            {/* Advanced Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-chart-3" />
                    Sales Growth Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SalesGrowthChart data={salesGrowthData} />
                </CardContent>
              </Card>

              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-chart-4" />
                    Sales Heatmap (By Day)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SalesHeatmap data={salesHeatmapData} />
                </CardContent>
              </Card>
            </div>

            {/* Advanced Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Average Transaction Value"
                value={`KSH ${currentReport?.numberOfSales ? (currentReport.totalSales / currentReport.numberOfSales).toLocaleString() : 0}`}
                icon={<Target className="h-6 w-6 text-chart-1" />}
                subtitle="Per transaction"
                trend={{ value: 4.2, direction: 'up' }}
              />

              <MetricCard
                title="Inventory Turnover"
                value="2.4x"
                icon={<Zap className="h-6 w-6 text-chart-3" />}
                subtitle="Times per month"
                trend={{ value: 0.8, direction: 'up' }}
                variant="success"
              />

              <MetricCard
                title="Customer Retention"
                value="78.5%"
                icon={<Users className="h-6 w-6 text-chart-5" />}
                subtitle="Returning customers"
                trend={{ value: 5.3, direction: 'up' }}
                variant="success"
              />
            </div>
          </>
        )}

        {/* Summary Statistics */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-primary rounded-lg text-primary-foreground">
                <h3 className="text-lg font-semibold">Total Sales</h3>
                <p className="text-2xl font-bold">KSH {currentReport?.totalSales?.toLocaleString() || 0}</p>
                <p className="text-sm opacity-90">{currentReport?.numberOfSales || 0} transactions</p>
              </div>
              <div className="text-center p-4 bg-gradient-success rounded-lg text-success-foreground">
                <h3 className="text-lg font-semibold">Amount Collected</h3>
                <p className="text-2xl font-bold">KSH {currentReport?.totalPaid?.toLocaleString() || 0}</p>
                <p className="text-sm opacity-90">{collectionRate.toFixed(1)}% collection rate</p>
              </div>
              <div className="text-center p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <h3 className="text-lg font-semibold text-destructive">Outstanding</h3>
                <p className="text-2xl font-bold text-destructive">KSH {((currentReport?.totalSales || 0) - (currentReport?.totalPaid || 0)).toLocaleString()}</p>
                <p className="text-sm text-destructive/80">Pending collection</p>
              </div>
              <div className="text-center p-4 bg-gradient-warning rounded-lg text-warning-foreground">
                <h3 className="text-lg font-semibold">Discounts</h3>
                <p className="text-2xl font-bold">KSH {currentReport?.totalDiscount?.toLocaleString() || 0}</p>
                <p className="text-sm opacity-90">Customer savings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;