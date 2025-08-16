import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: "http://13.49.240.213:3000", timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
// Authentication API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post("/auth/login", credentials),

  register: (userData: {
    name: string;
    email: string;
    password: string;
    role: 'ADMIN' | 'SALES';
  }) => api.post("/auth/register", userData),

  getProfile: () => api.get("/profile"),

  logout: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_role"); // 👈 Also clear role
    localStorage.removeItem("tokenExpiry");
  },
};

// Inventory API
export const inventoryAPI = {
  // Basic CRUD
  getAll: () => api.get("/inventory"),
  getById: (id: string | number) => api.get(`/inventory/${id}`),
  create: (data: any) => api.post("/inventory", data),
  update: (id: string | number, data: any) => api.put(`/inventory/${id}`, data),
  delete: (id: string | number) => api.delete(`/inventory/${id}`),

  // Stock management
  stockIn: (id: string | number, quantity: number) =>
    api.post(`/inventory/${id}/stock-in`, { quantity }),
  stockOut: (id: string | number, quantity: number) =>
    api.post(`/inventory/${id}/stock-out`, { quantity }),

  // Transactions
  getTransactions: (id: string | number) =>
    api.get(`/inventory/${id}/transactions`),

  // Direct quantity increase (alternative to stock-in)
  increaseQuantity: (id: string | number, quantity: number) =>
    api.post(`/inventory/${id}/increase`, { quantity }),
};


// Customers API
export const customersAPI = {
  getAll: () => api.get("/sales/customers"),
  getById: (id: string) => api.get(`/sales/customers/${id}`),
  create: (data: { name: string; phone: string }) =>
    api.post("/sales/customers", data),
  update: (id: string, data: any) => api.put(`/sales/customers/${id}`, data),
  delete: (id: string) => api.delete(`/sales/customers/${id}`),
  getTransactions: (id: string) =>
    api.get(`/sales/customers/${id}/transactions`),
  addPayment: (id: string, data: { amount: number; paymentType: string }) =>
    api.post(`/sales/customers/${id}/payments`, data),
};

// Sales API
export const salesAPI = {
  getAll: (params?: any) => api.get("/sales/sales", { params }),
  getById: (id: string) => api.get(`/sales/${id}`),
  create: (data: any) => api.post("/sales/sales", data),
  update: (id: string, data: any) => api.put(`/sales/sales/${id}`, data),
  delete: (id: string) => api.delete(`/sales/${id}`),
  getReceipt: (id: string, format = "json") =>
    api.get(`/sales/${id}/receipt`, { params: { format } }),
  filter: (params: any) => api.get("/sales/filter", { params }),
  report: (range: "daily" | "weekly" | "monthly" | "yearly") =>
    api.get("/sales/sales/report", { params: { range } }),

};

// Reports API
export const reportsAPI = {
  // Profits and Losses
  getProfits: (start?: string, end?: string) =>
    api.get("/sales/reports/profit-loss", { params: { start, end } }),
  getProjectedProfits: () => api.get("/sales/reports/inventory-projections"),
  getLosses: (start?: string, end?: string) =>
    api.get("/sales/reports/loss-analysis", { params: { start, end } }),

  // Sales Analysis
  getMostSold: (start?: string, end?: string) =>
    api.get("/sales/reports/top-products", { params: { start, end } }),
  getSalesSummary: (period: 'day' | 'week' | 'month' | 'year') =>
    api.get("/sales/reports/sales-by-period", { params: { period } }),
  getProfitsSummary: (period: 'day' | 'week' | 'month' | 'year') =>
    api.get("/sales/reports/profit-loss", { params: { period } }),

  // Customer and Inventory
  getCustomersDebt: () => api.get("/sales/reports/outstanding-balances"),
  getInventory: () => api.get("/sales/reports/enhanced-inventory"),

  // Additional endpoints
  getInventoryValuation: () => api.get("/sales/reports/inventory-valuation"),
  getCashFlow: (start?: string, end?: string) =>
    api.get("/sales/reports/cash-flow", { params: { start, end } }),
  getCustomerAnalysis: (start?: string, end?: string) =>
    api.get("/sales/reports/customer-analysis", { params: { start, end } }),
  getUserPerformance: () => api.get("/sales/reports/user-performance"),
  getInventoryUsage: () => api.get("/sales/reports/inventory-usage"),
};
// Daily Reports API
export const dailyReportsAPI = {
  getStatus: () => api.get("/daily-reports/status"),
  triggerReport: (recipientEmail?: string) =>
    api.post("/daily-reports/trigger", { recipientEmail }),
  testEmail: (recipientEmail: string) =>
    api.post("/daily-reports/test-email", { recipientEmail }),
  configureEmail: (config: { emailUser: string; emailPassword: string; emailService: string }) =>
    api.post("/daily-reports/configure", config),
  getConfiguration: () => api.get("/daily-reports/configuration"),
  downloadReport: (date: string) =>
    api.get(`/daily-reports/download/${date}`, { responseType: 'blob' }),
  previewReport: (date: string) =>
    api.get(`/daily-reports/preview/${date}`, { responseType: 'blob' }),
  sendDebtSummary: (recipientEmail: string) =>
    api.post("/daily-reports/debt-summary", { recipientEmail }),
  sendCompleteReport: (recipientEmail: string) =>
    api.post("/daily-reports/send-complete-report", { recipientEmail }),
  testPDF: () => api.get("/daily-reports/test-pdf", { responseType: 'blob' }),
};

export default api;

