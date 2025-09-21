import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { CameraView } from "./CameraView";
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
        <Sidebar isCollapsed={sidebarCollapsed} />
        
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Camera Views */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CameraView cameraId="1" title="Camera 1 - Left View" />
              <CameraView cameraId="2" title="Camera 2 - Right View" />
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