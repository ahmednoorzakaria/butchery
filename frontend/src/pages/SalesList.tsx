import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { SaleSection } from "@/components/sales/SaleSection";
import { Views } from "@/components/sales/Views";

export default function SalesManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState("all");
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Debug logging
  console.log('SalesList render:', { isNewSaleOpen, isMounted });

  // Ensure component is properly mounted before rendering
  useEffect(() => {
    console.log('SalesList mounting...');
    setIsMounted(true);
    return () => {
      console.log('SalesList unmounting...');
      setIsMounted(false);
    };
  }, []);

  // Handle dialog state changes
  const handleNewSaleOpenChange = (open: boolean) => {
    console.log('SalesList handleNewSaleOpenChange:', open);
    if (!open) {
      // When closing, ensure we reset any potential state issues
      setTimeout(() => {
        setIsNewSaleOpen(false);
      }, 100);
    } else {
      setIsNewSaleOpen(open);
    }
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
    // This will throw an error if SaleSection is not properly imported
    if (typeof SaleSection !== 'function') {
      throw new Error('SaleSection component is not properly loaded');
    }
  } catch (error) {
    console.error('Error loading SaleSection component:', error);
    return (
      <Layout title="Sales Management" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="h-12 w-12 text-destructive mx-auto mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Component Loading Error</h3>
            <p className="text-muted-foreground mb-4">
              The sale creation component failed to load. Please refresh the page.
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
                Manage sales, track inventory, and monitor customer transactions
              </p>
            </div>
            <Button onClick={() => setIsNewSaleOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Sale
            </Button>
          </div>

          {/* New Sale Section */}
          <SaleSection 
            isOpen={isNewSaleOpen} 
            onOpenChange={handleNewSaleOpenChange} 
          />

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
    console.error('Error rendering SalesList:', error);
    return (
      <Layout title="Sales Management" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="h-12 w-12 text-destructive mx-auto mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Rendering Error</h3>
            <p className="text-muted-foreground mb-4">
              An error occurred while rendering the sales page. Please refresh the page.
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
