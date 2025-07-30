import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: ' http://localhost:3000/',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
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
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  register: (userData: { name: string; email: string; password: string }) =>
    api.post('/auth/register', userData),
  
  getProfile: () => api.get('/auth/me'),
};

// Inventory API
export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  getById: (id: string) => api.get(`/inventory/${id}`),
  create: (data: any) => api.post('/inventory', data),
  update: (id: string, data: any) => api.put(`/inventory/${id}`, data),
  delete: (id: string) => api.delete(`/inventory/${id}`),
};

// Customers API
export const customersAPI = {
  getAll: () => api.get('/sales/customers'),
  getById: (id: string) => api.get(`/sales/customers/${id}`),
  create: (data: { name: string; phone: string }) => api.post('/sales/customers', data),
  update: (id: string, data: any) => api.put(`/sales/customers/${id}`, data),
  delete: (id: string) => api.delete(`/sales/customers/${id}`),
  getAccount: (id: string) => api.get(`/sales/customers/${id}/account`),
  getTransactions: (id: string) => api.get(`/sales/customers/${id}/transactions`),
  addTransaction: (id: string, data: any) => api.post(`/sales/customers/${id}/transactions`, data),
  addPayment: (id: string, data: { amount: number; paymentType: string }) =>
  api.post(`/sales/customers/${id}/payments`, data),

};
// 📦 Sales API
export const salesAPI = {
  // List all sales (optionally with date filters)
  getAll: (params?: any) => api.get('/sales/sales', { params }),

  // Get a single sale by ID
  getById: (id: string) => api.get(`/sales/${id}`),

  // Create a new sale
  create: (data: any) => api.post('/sales/sales', data),

  // Delete a sale (⚠️ NOT IMPLEMENTED in backend yet)
  delete: (id: string) => api.delete(`/sales/${id}`), // <- Optional

  // Get receipt (JSON or PDF)
  getReceipt: (id: string, format = 'json') =>
    api.get(`/sales/${id}/receipt`, { params: { format } }),

  // Filter sales by customer/date range
  filter: (params: any) => api.get('/sales/filter', { params }),

  // Daily/weekly report
  report: (range: 'daily' | 'weekly') => api.get('/sales/report', { params: { range } }),
};


// Reports API
export const reportsAPI = {
  getDailySales: () => api.get('/reports/sales/daily'),
  getWeeklySales: () => api.get('/reports/sales/weekly'),
  getCustomerSales: (customerId: string) => api.get(`/reports/sales/customer/${customerId}`),
};

export default api;