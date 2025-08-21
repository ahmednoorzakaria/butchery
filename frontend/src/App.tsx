import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import InventoryList from "./pages/InventoryList";
import Reports from "./pages/Reports";
import DailyReports from "./pages/DailyReports";
import SalesList from "./pages/SalesList";
import SaleCreation from "./pages/SaleCreation";
import CustomersList from "./pages/CustomersList";
import Expenses from "./pages/Expenses";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import Account from "./pages/Account";
import UnauthorizedRedirect from "./pages/UnauthorizedRedirect";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "SALES"]}>
                <Index />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "SALES"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <InventoryList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "SALES"]}>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "SALES"]}>
                <SalesList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sale-creation"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "SALES"]}>
                <SaleCreation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "SALES"]}>
                <CustomersList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <Expenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/daily-reports"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <DailyReports />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
          <Route path="/unauthorized" element={<UnauthorizedRedirect />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
