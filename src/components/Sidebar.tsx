import { cn } from "@/lib/utils";

interface SidebarProps {
  isCollapsed: boolean;
}

export const Sidebar = ({ isCollapsed }: SidebarProps) => {
  return (
    <aside
      className={cn(
        "bg-card border-r border-border transition-all duration-300 ease-in-out",
        isCollapsed ? "w-14" : "w-64"
      )}
    >
      <div className="p-4 h-full">
        {!isCollapsed && (
          <div className="text-sm text-muted-foreground">
            {/* Sidebar content will be added later */}
            <p>Sidebar content coming soon...</p>
          </div>
        )}
      </div>
    </aside>
  );
};