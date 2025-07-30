import { NavLink, useLocation } from "react-router-dom";
import { Package, ShoppingCart, Users, BarChart3, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { 
    name: "Inventory", 
    href: "/inventory", 
    icon: Package 
  },
  { 
    name: "Sales", 
    href: "/sales", 
    icon: ShoppingCart 
  },
  { 
    name: "Customers", 
    href: "/customers", 
    icon: Users 
  },
  { 
    name: "Reports", 
    href: "/reports", 
    icon: BarChart3 
  },
  { 
    name: "Account", 
    href: "/account", 
    icon: User 
  },
];

export function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-medium md:hidden z-50">
      <div className="flex justify-around py-2">
        {navigationItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-smooth min-w-0 flex-1",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon 
                className={cn(
                  "h-5 w-5 mb-1",
                  isActive && "text-primary"
                )} 
              />
              <span className="text-xs font-medium truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}