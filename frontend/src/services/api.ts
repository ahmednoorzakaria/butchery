import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: "http://localhost:3005",
  timeout: 10000,
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
  getAll: () => api.get("/inventory"),
  getById: (id: string) => api.get(`/inventory/${id}`),
  create: (data: any) => api.post("/inventory", data),
  update: (id: string, data: any) => api.put(`/inventory/${id}`, data),
  delete: (id: string) => api.delete(`/inventory/${id}`),
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
  delete: (id: string) => api.delete(`/sales/${id}`),
  getReceipt: (id: string, format = "json") =>
    api.get(`/sales/${id}/receipt`, { params: { format } }),
  filter: (params: any) => api.get("/sales/filter", { params }),
  report: (range: "daily" | "weekly") =>
    api.get("/sales/sales/report", { params: { range } }),
};

// Reports API
export const reportsAPI = {
  getOutstandingBalances: () => api.get("/sales/reports/outstanding-balances"),
  getTopProducts: (start?: string, end?: string) =>
    api.get("/sales/reports/top-products", { params: { start, end } }),
  getInventoryUsage: () => api.get("/sales/reports/inventory-usage"),

  // ✅ NEW: Get sales performance by user
  getUserPerformance: () => api.get("/sales/reports/user-performance"), // <-- ADDED
};

export default api;
