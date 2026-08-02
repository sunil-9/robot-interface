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
  episodeCount?: number;
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
  episodeCount = 0,
  episodeManagementProps,
}: SidebarTabsProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex-shrink-0" data-tour="dataset-selector">
        <DatasetSelector
          datasets={episodeManagementProps.datasets}
          datasetItems={episodeManagementProps.datasetItems}
          isLoading={episodeManagementProps.isLoadingDatasets}
          onRequestCreate={episodeManagementProps.onRequestCreateDataset}
          onRequestClone={episodeManagementProps.onRequestCloneDataset}
          onRequestDelete={episodeManagementProps.onRequestDeleteDataset}
          onDatasetSave={episodeManagementProps.onDatasetSave}
        />
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => onTabChange(value as SidebarTab)}
        className="flex-1 min-h-0 flex flex-col px-1 pt-2"
      >
        <TabsList className="grid h-10 w-full grid-cols-3 rounded-md bg-muted/60 p-1">
          <TabsTrigger
            data-tour="more-streams-tab"
            value="secondary"
            className="h-full gap-1 rounded px-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_14px_hsl(var(--primary)/0.24)] data-[state=inactive]:text-muted-foreground"
          >
            <Camera className="h-4 w-4" /> Cameras
          </TabsTrigger>
          <TabsTrigger
            data-tour="episodes-tab"
            value="episodes"
            className="h-full gap-1 rounded px-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_14px_hsl(var(--primary)/0.24)] data-[state=inactive]:text-muted-foreground"
          >
            <FileVideo className="h-4 w-4" /> Episodes
          </TabsTrigger>
          <TabsTrigger
            data-tour="models-tab"
            value="models"
            className="h-full gap-1 rounded px-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_14px_hsl(var(--primary)/0.24)] data-[state=inactive]:text-muted-foreground"
          >
            <Brain className="h-4 w-4" /> Models
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="secondary"
          className="flex-1 min-h-0 data-[state=active]:flex flex-col data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-95 focus-visible:outline-none"
        >
          <div className="mt-2 flex-1 flex flex-col gap-3 min-h-0">
            <div className="operator-label px-2">
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
              episodeCount={episodeCount}
              className="min-h-full"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
