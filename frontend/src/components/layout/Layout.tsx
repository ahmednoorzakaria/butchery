import { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { BottomNavigation } from "./BottomNavigation";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showSearch?: boolean;
  className?: string;
}

export function Layout({ children, title, showSearch, className }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-warm">
      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title={title} showSearch={showSearch} />
          
          <main className={cn(
            "flex-1 overflow-auto p-4 pb-20 md:pb-4",
            className
          )}>
            {children}
          </main>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}