import { NavLink, useLocation } from "react-router-dom";
import { Package, ShoppingCart, Users, BarChart3, User, Menu, Settings, ShoppingBag, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const primaryItems = [
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Sales", href: "/sales", icon: ShoppingCart },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Account", href: "/account", icon: User },
];



interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={cn(
      "hidden md:flex flex-col bg-background border-r border-border h-screen transition-smooth",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-foreground">Hyper Fresh</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Primary Navigation */}
      <div className="flex-1 p-4 space-y-2">
        <div className="space-y-1">
          {primaryItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 transition-smooth",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-soft" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  isCollapsed && "justify-center"
                )}
              >
                <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                {!isCollapsed && <span className="font-medium">{item.name}</span>}
              </NavLink>
            );
          })}
        </div>

        {/* Divider */}
        <div className="py-2">
          <div className="border-t border-border"></div>
        </div>

        {/* Secondary Navigation */}
        
      </div>
    </aside>
  );
}