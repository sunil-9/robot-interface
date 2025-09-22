import { useState } from "react";
import { CameraView } from "./CameraView";
import { Header } from "./Header";
import { JointManager } from "./JointManager";

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
            {/* Camera Views */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CameraView cameraId="1" title="Base Camera" />
              <CameraView cameraId="2" title="Wrist Camera" />
            </div>

            {/* Line Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <JointManager title="Joint State" type="state" />
              <JointManager title="Joint Action" type="action" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
