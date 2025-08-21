import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { CreateSale } from "@/components/sales/CreateSale";

export default function SaleCreation() {
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(true);

  // Handle dialog state changes
  const handleNewSaleOpenChange = (open: boolean) => {
    if (!open) {
      // When closing, redirect back to sales management
      window.history.back();
    } else {
      setIsNewSaleOpen(open);
    }
  };

  return (
    <Layout title="Create New Sale" showSearch={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Create New Sale</h2>
            <p className="text-muted-foreground">
              Add new sales transactions and manage customer orders
            </p>
          </div>
        </div>

        {/* Create Sale Component */}
        <CreateSale 
          isOpen={isNewSaleOpen} 
          onOpenChange={handleNewSaleOpenChange} 
        />
      </div>
    </Layout>
  );
}
