import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Views } from "@/components/sales/Views";
import { useNavigate } from "react-router-dom";

export default function SalesManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState("all");
  const [isMounted, setIsMounted] = useState(false);
  const navigate = useNavigate();

  // Check URL parameters for opening sale creation
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create') {
      // Redirect to the dedicated sale creation page
      navigate('/sale-creation');
      // Remove the action parameter from URL
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, navigate]);

  // Ensure component is properly mounted before rendering
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  const handleCreateSale = () => {
    navigate('/sale-creation');
  };

  // Don't render until component is mounted
  if (!isMounted) {
    return (
      <Layout title="Sales Management" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading sales management...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error boundary for missing components
  try {
    // This will throw an error if Views is not properly imported
    if (typeof Views !== 'function') {
      throw new Error('Views component is not properly loaded');
    }
  } catch (error) {
    console.error('Error loading Views component:', error);
    return (
      <Layout title="Sales Management" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="h-12 w-12 text-destructive mx-auto mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Component Loading Error</h3>
            <p className="text-muted-foreground mb-4">
              The sales views component failed to load. Please refresh the page.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  try {
    return (
      <Layout title="Sales Management" showSearch={false}>
        <div className="space-y-6">
          {/* Header with New Sale Button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Sales Management</h2>
              <p className="text-muted-foreground">
                View, manage, and track all sales transactions and customer orders
              </p>
            </div>
            <Button 
              onClick={handleCreateSale} 
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              New Sale
            </Button>
          </div>

          {/* Views Component */}
          <Views
            searchTerm={searchTerm}
            selectedUser={selectedUser}
            onSearchChange={setSearchTerm}
            onUserChange={setSelectedUser}
          />
        </div>
      </Layout>
    );
  } catch (error) {
    console.error('Error rendering SalesManagement:', error);
    return (
      <Layout title="Sales Management" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="h-12 w-12 text-destructive mx-auto mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Rendering Error</h3>
            <p className="text-muted-foreground mb-4">
              An error occurred while rendering the sales management page. Please refresh the page.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
          </div>
        </div>
      </Layout>
    );
  }
}
