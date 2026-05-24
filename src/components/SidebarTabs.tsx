import { Brain, Camera, FileVideo } from "lucide-react";
import React from "react";
import { DatasetSelector } from "./training/DatasetSelector";
import { EpisodeManagementContent } from "./training/EpisodeManagementSidebar";
import { ModelTrainingSection } from "./training/ModelTrainingSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export type SidebarTab = "secondary" | "episodes" | "models";

interface SidebarTabsProps {
  tab: SidebarTab;
  onTabChange: (value: SidebarTab) => void;
  secondaryContent: React.ReactNode;
  selectedDatasetDbId?: number | null;
  episodeManagementProps: Omit<
    React.ComponentProps<typeof EpisodeManagementContent>,
    "isActive" | "className"
  >;
}

export function SidebarTabs({
  tab,
  onTabChange,
  secondaryContent,
  selectedDatasetDbId,
  episodeManagementProps,
}: SidebarTabsProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex-shrink-0">
        <DatasetSelector
          datasets={episodeManagementProps.datasets}
          datasetItems={episodeManagementProps.datasetItems}
          isLoading={episodeManagementProps.isLoadingDatasets}
          onRequestCreate={episodeManagementProps.onRequestCreateDataset}
          onRequestDelete={episodeManagementProps.onRequestDeleteDataset}
          onDescriptionSave={episodeManagementProps.onDatasetDescriptionSave}
        />
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => onTabChange(value as SidebarTab)}
        className="flex-1 min-h-0 flex flex-col px-1 pt-2"
      >
        <TabsList className="grid w-full grid-cols-3 rounded-full bg-muted/40 p-1 h-10">
          <TabsTrigger
            value="secondary"
            className="rounded-full px-1 text-[10px] font-semibold uppercase tracking-wide gap-1 h-full data-[state=active]:scale-105 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=inactive]:scale-95 data-[state=inactive]:text-muted-foreground transition-all duration-200"
          >
            <Camera className="h-4 w-4" /> More Streams
          </TabsTrigger>
          <TabsTrigger
            value="episodes"
            className="rounded-full px-1 text-[10px] font-semibold uppercase tracking-wide gap-1 h-full data-[state=active]:scale-105 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=inactive]:scale-95 data-[state=inactive]:text-muted-foreground transition-all duration-200"
          >
            <FileVideo className="h-4 w-4" /> Episodes
          </TabsTrigger>
          <TabsTrigger
            value="models"
            className="rounded-full px-1 text-[10px] font-semibold uppercase tracking-wide gap-1 h-full data-[state=active]:scale-105 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=inactive]:scale-95 data-[state=inactive]:text-muted-foreground transition-all duration-200"
          >
            <Brain className="h-4 w-4" /> Models
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="secondary"
          className="flex-1 min-h-0 data-[state=active]:flex flex-col data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-95 focus-visible:outline-none"
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
          className="flex-1 min-h-0 data-[state=active]:flex flex-col data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-95 focus-visible:outline-none"
        >
          <EpisodeManagementContent
            {...episodeManagementProps}
            className="flex-1"
            showDatasetSelector={false}
          />
        </TabsContent>

        <TabsContent
          value="models"
          className="flex-1 min-h-0 data-[state=active]:flex flex-col data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-95 focus-visible:outline-none"
        >
          <div className="mt-2 flex-1 min-h-0 overflow-y-auto pr-1">
            <ModelTrainingSection
              isActive={tab === "models"}
              selectedDatasetDbId={selectedDatasetDbId}
              className="min-h-full"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
