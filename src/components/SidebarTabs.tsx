import { Camera, FileVideo } from "lucide-react";
import React from "react";
import { EpisodeManagementContent } from "./training/EpisodeManagementSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ModelTrainingSection } from "./training/ModelTrainingSection";

interface SidebarTabsProps {
  tab: "secondary" | "episodes";
  onTabChange: (value: "secondary" | "episodes") => void;
  secondaryContent: React.ReactNode;
  episodeManagementProps: Omit<
    React.ComponentProps<typeof EpisodeManagementContent>,
    "isActive" | "className"
  >;
}

export function SidebarTabs({
  tab,
  onTabChange,
  secondaryContent,
  episodeManagementProps,
}: SidebarTabsProps) {
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => onTabChange(value as "secondary" | "episodes")}
      className="flex-1 min-h-0 flex flex-col"
    >
      <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/60 p-1">
        <TabsTrigger
          value="secondary"
          className="rounded-xl text-[11px] font-semibold uppercase tracking-wide gap-1"
        >
          <Camera className="h-4" /> Other Cameras
        </TabsTrigger>
        <TabsTrigger
          value="episodes"
          className="rounded-xl text-[11px] font-semibold uppercase tracking-wide"
        >
          <FileVideo className="h-4" /> Episodes
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="secondary"
        className="flex-1 min-h-0 data-[state=active]:flex flex-col focus-visible:outline-none"
      >
        <div className="mt-2 flex-1 flex flex-col gap-3 min-h-0">
          <div className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Auxiliary Cameras
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {secondaryContent}
          </div>
        </div>
      </TabsContent>

      <TabsContent
        value="episodes"
        className="flex-1 min-h-0 data-[state=active]:flex flex-col focus-visible:outline-none"
      >
        <EpisodeManagementContent
          {...episodeManagementProps}
          className="flex-1"
        />
        {/* add model training related data here not inside EpisodeManagementContent */}
         <div className="flex-shrink-0">
        <ModelTrainingSection isActive={tab === "episodes"} />
      </div>
      </TabsContent>
    </Tabs>
  );
}
