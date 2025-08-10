import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { SaleSection } from "@/components/sales/SaleSection";
import { Views } from "@/components/sales/Views";

export default function SalesManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("today");
  const [selectedUser, setSelectedUser] = useState("all");
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is properly mounted before rendering
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Don't render until component is mounted
  if (!isMounted) {
    return (
      <Layout title="Sales Management" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading sales...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Sales Management" showSearch={false}>
      <div className="space-y-6">
        {/* New Sale Section */}
        <SaleSection 
          isOpen={isNewSaleOpen} 
          onOpenChange={setIsNewSaleOpen} 
        />

        {/* Views Component */}
        <Views
          searchTerm={searchTerm}
          selectedDate={selectedDate}
          selectedUser={selectedUser}
          onSearchChange={setSearchTerm}
          onDateChange={setSelectedDate}
          onUserChange={setSelectedUser}
        />
      </div>
    </Layout>
  );
}
