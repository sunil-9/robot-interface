import { useState } from "react";
import { CameraView } from "./CameraView";
import { Header } from "./Header";
import { MockActionVarianceChart } from "./MockActionVarianceChart";

export const TrainingInterface = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header onToggleSidebar={toggleSidebar} />

      <div className="flex">
        {/* todo: add sidebar */}
        {/* <Sidebar isCollapsed={sidebarCollapsed} /> */}

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Camera Views - Top */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CameraView cameraType="base" title="Base Camera" />
              <CameraView cameraType="wrist" title="Wrist Camera" />
            </div>

            {/* Joint Data - Bottom */}
            {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <JointManager title="Joint State" type="state" />
              <JointManager title="Joint Command" type="command" />
            </div> */}

            {/* Mock Joint Data - Smooth Charts */}
            {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LineChart title="Joint State" type="state" />
              <LineChart title="Joint Command" type="command" />
            </div> */}

            {/* Action Variance Chart */}
            <div className="grid grid-cols-1 gap-6">
              <MockActionVarianceChart title="Action Variance Windows" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
