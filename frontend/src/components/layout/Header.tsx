import { Bell, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  className?: string;
  showSearch?: boolean;
}

export function Header({ title, className, showSearch = false }: HeaderProps) {
  return (
    <header className={cn(
      "bg-background border-b border-border px-4 py-3 md:px-6",
      className
    )}>
      <div className="flex items-center justify-between">
        {/* Left side - Title or Search */}
        <div className="flex items-center space-x-4 flex-1">
          {title && (
            <h1 className="text-xl font-bold text-foreground md:text-2xl">
              {title}
            </h1>
          )}
          
          {showSearch && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-10 rounded-lg border-input bg-background"
              />
            </div>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          
        </div>
      </div>
    </header>
  );
}