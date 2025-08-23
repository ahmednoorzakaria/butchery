import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import * as PDFDocument from "pdfkit";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  format,
  parseISO,
  isValid
} from "date-fns";
import prisma from "../lib/prisma";

const router = Router();



// OPTIMIZED: Sales Filter & Summary with Advanced Search and Date Filtering
router.get("/sales", authenticateToken, async (req, res) => {
  let { 
    start, 
    end, 
    search, 
    page = 1, 
    limit = "all",
    filterType = "custom" // custom, today, week, month, year
  } = req.query as { 
    start?: string; 
    end?: string; 
    search?: string; 
    page?: string; 
    limit?: string;
    filterType?: string;
  };
  
  const pageNum = parseInt(page as string) || 1;
  const limitNum = limit === "all" ? undefined : Math.min(parseInt(limit as string) || 1000, 1000);
  const skip = limitNum ? (pageNum - 1) * limitNum : undefined;
  
  try {
    // Handle different filter types
    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    switch (filterType) {
      case "today":
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case "week":
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case "month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "year":
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      default:
        if (start && isValid(parseISO(start))) {
          startDate = parseISO(start);
        } else {
          startDate = subDays(now, 7);
        }
        if (end && isValid(parseISO(end))) {
          endDate = endOfDay(parseISO(end));
        } else {
          endDate = endOfDay(now);
        }
    }

    const whereClause: any = { createdAt: { gte: startDate, lte: endDate } };

    if (search && search.trim()) {
      const searchTerm = search.trim();
      const saleId = parseInt(searchTerm);
      if (!isNaN(saleId)) {
        whereClause.OR = [
          { id: saleId },
          { customer: { is: { name: { contains: searchTerm, mode: 'insensitive' } } } },
          { customer: { is: { phone: { contains: searchTerm, mode: 'insensitive' } } } },
        ];
      } else {
        whereClause.OR = [
          { customer: { is: { name: { contains: searchTerm, mode: 'insensitive' } } } },
          { customer: { is: { phone: { contains: searchTerm, mode: 'insensitive' } } } },
        ];
      }
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { item: { select: { id: true, name: true, category: true, unit: true } } } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    });

    const totalCount = await prisma.sale.count({ where: whereClause });
    const totalPages = limitNum ? Math.ceil(totalCount / limitNum) : 1;

    const summary = {
      totalSales: sales.length,
      totalAmount: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      totalPaid: sales.reduce((sum, sale) => sum + sale.paidAmount, 0),
      totalDiscount: sales.reduce((sum, sale) => sum + sale.discount, 0),
      outstandingAmount: sales.reduce((sum, sale) => sum + (sale.totalAmount - sale.paidAmount), 0),
      averageSaleValue: sales.length > 0 ? sales.reduce((sum, sale) => sum + sale.totalAmount, 0) / sales.length : 0,
    };

    res.json({
      sales,
      pagination: limitNum ? {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        limit: limitNum,
      } : null,
      summary,
      filterInfo: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        filterType,
        searchTerm: search || null,
      }
    });
  } catch (error) {
    console.error("Failed to fetch sales:", error);
    res.status(500).json({ error: "Server error fetching sales" });
  }
});

// OPTIMIZED: Get sales by specific date range with advanced filtering
router.get("/sales/by-date", authenticateToken, async (req, res) => {
  let { 
    date, 
    type = "day", // day, week, month, year
    page = 1, 
    limit = 1000 
  } = req.query as { 
    date?: string; 
    type?: string; 
    page?: string; 
    limit?: string; 
  };
  
  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 1000, 1000);
  const skip = (pageNum - 1) * limitNum;
  
  try {
    let startDate: Date;
    let endDate: Date;
    
    if (date && isValid(parseISO(date))) {
      const targetDate = parseISO(date);
      
      switch (type) {
        case "day":
          startDate = startOfDay(targetDate);
          endDate = endOfDay(targetDate);
          break;
        case "week":
          startDate = startOfWeek(targetDate);
          endDate = endOfWeek(targetDate);
          break;
        case "month":
          startDate = startOfMonth(targetDate);
          endDate = endOfMonth(targetDate);
          break;
        case "year":
          startDate = startOfYear(targetDate);
          endDate = endOfYear(targetDate);
          break;
        default:
          startDate = startOfDay(targetDate);
          endDate = endOfDay(targetDate);
      }
    } else {
      // Default to current day
      const now = new Date();
      startDate = startOfDay(now);
      endDate = endOfDay(now);
    }

    const totalCount = await prisma.sale.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          }
        },
        items: { 
          include: { 
            item: {
              select: {
                id: true,
                name: true,
                category: true,
                unit: true,
              }
            } 
          } 
        },
        user: { 
          select: { 
            id: true, 
            name: true 
          } 
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    });

    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    const summary = {
      totalSales: sales.length,
      totalAmount: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      totalPaid: sales.reduce((sum, sale) => sum + sale.paidAmount, 0),
      totalDiscount: sales.reduce((sum, sale) => sum + sale.discount, 0),
      outstandingAmount: sales.reduce((sum, sale) => sum + (sale.totalAmount - sale.paidAmount), 0),
      averageSaleValue: sales.length > 0 ? sales.reduce((sum, sale) => sum + sale.totalAmount, 0) / sales.length : 0,
    };

    res.json({
      sales,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit: limitNum,
      },
      summary,
      dateInfo: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        type,
        targetDate: date || null,
      }
    });
  } catch (error) {
    console.error("Failed to fetch sales by date:", error);
    res.status(500).json({ error: "Server error fetching sales by date" });
  }
});

// OPTIMIZED: Get all sales without pagination (for exports, reports, etc.)
router.get("/sales/all", authenticateToken, async (req, res) => {
  let { 
    start, 
    end, 
    search 
  } = req.query as { 
    start?: string; 
    end?: string; 
    search?: string; 
  };
  
  try {
    let startDate: Date;
    let endDate: Date;
    
    if (start && isValid(parseISO(start))) {
      startDate = parseISO(start);
    } else {
      startDate = subDays(new Date(), 30); // Default to last 30 days
    }
    
    if (end && isValid(parseISO(end))) {
      endDate = endOfDay(parseISO(end));
    } else {
      endDate = endOfDay(new Date());
    }

    const whereClause: any = {
      createdAt: { gte: startDate, lte: endDate },
    };

    if (search && search.trim()) {
      const searchTerm = search.trim();
      const saleId = parseInt(searchTerm);
      
      if (!isNaN(saleId)) {
        whereClause.OR = [
          { id: saleId },
          { 
            customer: { 
              OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { phone: { contains: searchTerm, mode: 'insensitive' } }
              ]
            } 
          }
        ];
      } else {
        whereClause.OR = [
          { customer: { name: { contains: searchTerm, mode: 'insensitive' } } },
          { customer: { phone: { contains: searchTerm, mode: 'insensitive' } } },
        ];
      }
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          }
        },
        items: { 
          include: { 
            item: {
              select: {
                id: true,
                name: true,
                category: true,
                unit: true,
              }
            } 
          } 
        },
        user: { 
          select: { 
            id: true, 
            name: true 
          } 
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const summary = {
      totalSales: sales.length,
      totalAmount: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      totalPaid: sales.reduce((sum, sale) => sum + sale.paidAmount, 0),
      totalDiscount: sales.reduce((sum, sale) => sum + sale.discount, 0),
      outstandingAmount: sales.reduce((sum, sale) => sum + (sale.totalAmount - sale.paidAmount), 0),
      averageSaleValue: sales.length > 0 ? sales.reduce((sum, sale) => sum + sale.totalAmount, 0) / sales.length : 0,
    };

    res.json({
      sales,
      summary,
      filterInfo: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        searchTerm: search || null,
      }
    });
  } catch (error) {
    console.error("Failed to fetch all sales:", error);
    res.status(500).json({ error: "Server error fetching all sales" });
  }
});

// OPTIMIZED: Top Products Report - Single query with joins
router.get("/reports/top-products", authenticateToken, async (req, res) => {
  const { start, end } = req.query;
  const startDate = start ? new Date(start as string) : subDays(new Date(), 7);
  const endDate = end ? new Date(end as string) : new Date();

  try {
    const topProducts = await prisma.$queryRaw<Array<{
      itemId: number;
      name: string;
      quantitySold: number;
    }>>`
      SELECT 
        si."itemId",
        ii.name,
        SUM(si.quantity) as "quantitySold"
      FROM "SaleItem" si
      JOIN "Sale" s ON si."saleId" = s.id
      JOIN "InventoryItem" ii ON si."itemId" = ii.id
      WHERE s."createdAt" >= ${startDate} AND s."createdAt" <= ${endDate}
      GROUP BY si."itemId", ii.name
      ORDER BY "quantitySold" DESC
      LIMIT 10
    `;

    res.json(topProducts);
  } catch (error) {
    console.error("Top products error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// OPTIMIZED: Inventory Usage Report - Single query with joins
router.get("/reports/inventory-usage", authenticateToken, async (req, res) => {
  try {
    const usage = await prisma.$queryRaw<Array<{
      itemId: number;
      name: string;
      totalUsed: number;
      currentStock: number;
    }>>`
      SELECT 
        ii.id as "itemId",
        ii.name,
        COALESCE(SUM(si.quantity), 0) as "totalUsed",
        ii.quantity as "currentStock"
      FROM "InventoryItem" ii
      LEFT JOIN "SaleItem" si ON ii.id = si."itemId"
      GROUP BY ii.id, ii.name, ii.quantity
      ORDER BY "totalUsed" DESC
    `;

    res.json(usage);
  } catch (error) {
    console.error("Inventory usage error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// OPTIMIZED: User Performance Report - Single query with joins
router.get("/reports/user-performance", authenticateToken, async (req, res) => {
  try {
    const userPerformance = await prisma.$queryRaw<Array<{
      userId: number;
      name: string;
      email: string;
      totalSales: number;
      totalPaid: number;
      saleCount: number;
    }>>`
      SELECT 
        u.id as "userId",
        u.name,
        u.email,
        COALESCE(SUM(s."totalAmount"), 0) as "totalSales",
        COALESCE(SUM(s."paidAmount"), 0) as "totalPaid",
        COUNT(s.id) as "saleCount"
      FROM "User" u
      LEFT JOIN "Sale" s ON u.id = s."userId"
      GROUP BY u.id, u.name, u.email
      ORDER BY "totalSales" DESC
    `;

    res.json(userPerformance);
  } catch (error) {
    console.error("User performance error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// OPTIMIZED: Sales by Date Report - Single query with all data
router.get("/reports/sales-by-date", authenticateToken, async (req, res) => {
  const { start, end, groupBy = "day" } = req.query;
  const startDate = start ? new Date(start as string) : subDays(new Date(), 30);
  const endDate = end ? new Date(end as string) : new Date();

  try {
    // Single optimized query with all necessary includes
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        items: { include: { item: true } },
        customer: true,
        user: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Process data in memory (much faster than multiple DB queries)
    const groupedSales: Record<string, any> = {};
    
    sales.forEach((sale) => {
      let key: string;
      const date = new Date(sale.createdAt);
      
      switch (groupBy) {
        case "day":
          key = format(date, "yyyy-MM-dd");
          break;
        case "week":
          key = format(date, "yyyy-'W'ww");
          break;
        case "month":
          key = format(date, "yyyy-MM");
          break;
        case "year":
          key = format(date, "yyyy");
          break;
        default:
          key = format(date, "yyyy-MM-dd");
      }

      if (!groupedSales[key]) {
        groupedSales[key] = {
          period: key,
          totalSales: 0,
          totalPaid: 0,
          totalDiscount: 0,
          numberOfSales: 0,
          items: {},
          customers: new Set(),
          paymentMethods: {},
        };
      }

      groupedSales[key].totalSales += sale.totalAmount;
      groupedSales[key].totalPaid += sale.paidAmount;
      groupedSales[key].totalDiscount += sale.discount;
      groupedSales[key].numberOfSales += 1;
      groupedSales[key].customers.add(sale.customer.name);
      
      const paymentType = sale.paymentType;
      groupedSales[key].paymentMethods[paymentType] = (groupedSales[key].paymentMethods[paymentType] || 0) + 1;

      sale.items.forEach((item) => {
        const itemKey = item.item.name;
        if (!groupedSales[key].items[itemKey]) {
          groupedSales[key].items[itemKey] = {
            name: item.item.name,
            quantity: 0,
            revenue: 0,
            unit: item.item.unit,
          };
        }
        groupedSales[key].items[itemKey].quantity += item.quantity;
        groupedSales[key].items[itemKey].revenue += item.quantity * item.price;
      });
    });

    const result = Object.values(groupedSales).map((group) => ({
      ...group,
      customers: Array.from(group.customers),
      uniqueCustomers: group.customers.size,
      outstandingAmount: group.totalSales - group.totalPaid,
      averageSaleValue: group.numberOfSales > 0 ? group.totalSales / group.numberOfSales : 0,
      items: Object.values(group.items),
    }));

    res.json(result);
  } catch (error) {
    console.error("Sales by date error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// OPTIMIZED: Profit & Loss Report - Single query with all data
router.get("/reports/profit-loss", authenticateToken, async (req, res) => {
  const { start, end } = req.query;
  const startDate = start ? new Date(start as string) : subDays(new Date(), 30);
  const endDate = end ? new Date(end as string) : new Date();

  try {
    // Single optimized query with all necessary includes
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        items: { 
          include: { 
            item: true 
          } 
        },
      },
    });

    // Process data in memory
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let totalDiscount = 0;
    const itemProfitability: Record<string, any> = {};

    sales.forEach((sale) => {
      totalRevenue += sale.totalAmount;
      totalDiscount += sale.discount;

      sale.items.forEach((saleItem) => {
        const item = saleItem.item;
        const itemKey = item.name;
        
        if (!itemProfitability[itemKey]) {
          itemProfitability[itemKey] = {
            name: item.name,
            category: item.category,
            totalQuantity: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            averagePrice: 0,
            averageCost: 0,
            profitMargin: 0,
          };
        }

        const revenue = saleItem.quantity * saleItem.price;
        const cost = saleItem.quantity * (item.basePrice || 0);
        const profit = revenue - cost;

        itemProfitability[itemKey].totalQuantity += saleItem.quantity;
        itemProfitability[itemKey].totalRevenue += revenue;
        itemProfitability[itemKey].totalCost += cost;
        itemProfitability[itemKey].totalProfit += profit;
      });
    });

    // Calculate totals and averages for each item
    Object.values(itemProfitability).forEach((item: any) => {
      item.averagePrice = item.totalQuantity > 0 ? item.totalRevenue / item.totalQuantity : 0;
      item.averageCost = item.totalQuantity > 0 ? item.totalCost / item.totalQuantity : 0;
      item.profitMargin = item.totalRevenue > 0 ? (item.totalProfit / item.totalRevenue) * 100 : 0;
      
      totalCost += item.totalCost;
      totalProfit += item.totalProfit;
    });

    const sortedItems = Object.values(itemProfitability).sort((a: any, b: any) => b.totalProfit - a.totalProfit);

    const result = {
      period: { start: startDate, end: endDate },
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        totalDiscount,
        netProfit: totalProfit - totalDiscount,
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        numberOfSales: sales.length,
      },
      topPerformers: sortedItems.slice(0, 10),
      leastProfitable: sortedItems.slice(-10).reverse(),
      categoryBreakdown: (() => {
        const categories: Record<string, any> = {};
        sortedItems.forEach((item: any) => {
          if (!categories[item.category]) {
            categories[item.category] = {
              name: item.category,
              totalRevenue: 0,
              totalCost: 0,
              totalProfit: 0,
              itemCount: 0,
            };
          }
          categories[item.category].totalRevenue += item.totalRevenue;
          categories[item.category].totalCost += item.totalCost;
          categories[item.category].totalProfit += item.totalProfit;
          categories[item.category].itemCount += 1;
        });
        return Object.values(categories).sort((a: any, b: any) => b.totalProfit - a.totalProfit);
      })(),
    };

    res.json(result);
  } catch (error) {
    console.error("Profit & Loss error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// OPTIMIZED: Customer Analysis Report - Single query with all data
router.get("/reports/customer-analysis", authenticateToken, async (req, res) => {
  const { start, end } = req.query;
  const startDate = start ? new Date(start as string) : subDays(new Date(), 90);
  const endDate = end ? new Date(end as string) : new Date();

  try {
    // Single optimized query with all necessary includes
    const customers = await prisma.customer.findMany({
      include: {
        sales: {
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          include: {
            items: true,
          },
        },
        transactions: true,
      },
    });

    // Process data in memory
    const customerAnalysis = customers.map((customer) => {
      const totalSpent = customer.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const totalPaid = customer.sales.reduce((sum, sale) => sum + sale.paidAmount, 0);
      const totalDiscount = customer.sales.reduce((sum, sale) => sum + sale.discount, 0);
      const outstandingBalance = customer.transactions.reduce((sum, tx) => sum + tx.amount, 0);
      
      const averageOrderValue = customer.sales.length > 0 ? totalSpent / customer.sales.length : 0;
      const lifetimeValue = customer.transactions.reduce((sum, tx) => sum + tx.amount, 0);
      
      let segment = "Bronze";
      if (totalSpent >= 50000) segment = "Gold";
      else if (totalSpent >= 20000) segment = "Silver";
      else if (totalSpent >= 5000) segment = "Bronze";
      else segment = "New";

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        totalSpent,
        totalPaid,
        totalDiscount,
        outstandingBalance,
        averageOrderValue,
        lifetimeValue,
        numberOfOrders: customer.sales.length,
        lastOrderDate: customer.sales.length > 0 ? 
          Math.max(...customer.sales.map(s => s.createdAt.getTime())) : null,
        segment,
        paymentHistory: customer.transactions.length,
        isActive: customer.sales.length > 0,
      };
    });

    customerAnalysis.sort((a, b) => b.totalSpent - a.totalSpent);

    const summary = {
      totalCustomers: customerAnalysis.length,
      activeCustomers: customerAnalysis.filter(c => c.isActive).length,
      totalRevenue: customerAnalysis.reduce((sum, c) => sum + c.totalSpent, 0),
      totalOutstanding: customerAnalysis.reduce((sum, c) => sum + Math.abs(c.outstandingBalance), 0),
      averageCustomerValue: customerAnalysis.length > 0 ? 
        customerAnalysis.reduce((sum, c) => sum + c.totalSpent, 0) / customerAnalysis.length : 0,
      segmentBreakdown: {
        Gold: customerAnalysis.filter(c => c.segment === "Gold").length,
        Silver: customerAnalysis.filter(c => c.segment === "Silver").length,
        Bronze: customerAnalysis.filter(c => c.segment === "Bronze").length,
        New: customerAnalysis.filter(c => c.segment === "New").length,
      },
    };

    res.json({ summary, customers: customerAnalysis });
  } catch (error) {
    console.error("Customer analysis error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
