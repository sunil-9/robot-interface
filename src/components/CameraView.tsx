import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Camera, Maximize2, Minimize2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface CameraViewProps {
  cameraId: string;
  title: string;
}

export const CameraView = ({ cameraId, title }: CameraViewProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Map camera IDs to their respective ROS topics using useMemo to prevent re-creation
  const cameraTopics = useMemo(
    () => ({
      "1": "camera_base", // Maps to /rgb_base topic's role
      "2": "camera_wrist", // Maps to /rgb_wrist topic's role
    }),
    []
  );

  // WebSocket connection to ROS2 bridge
  const { isConnected, lastMessage, error } = useWebSocket({
    url: "ws://localhost:8080",
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  });

  // Process incoming camera images
  useEffect(() => {
    if (!lastMessage) return;

    // Check if the message is for our camera
    if (lastMessage.role === cameraTopics[cameraId]) {
      const normalized = lastMessage.normalized;
      if (
        normalized &&
        normalized.data &&
        normalized.width &&
        normalized.height
      ) {
        // Log the base64 string for camera one
        if (cameraId === "1") {
          console.log("Camera 1 Base64 Data:", normalized.data);
          // Log only the first 100 characters to avoid console flooding
          console.log("Camera 1 Base64 Data (truncated):", 
            typeof normalized.data === 'string' 
              ? normalized.data.substring(0, 100) + "..." 
              : "Not a string"
          );
        }
        
        // Set image data from base64 string
        setImageData(`data:image/jpeg;base64,${normalized.data}`);
        setDimensions({
          width: normalized.width,
          height: normalized.height,
        });
        setLastUpdate(new Date());
      }
    }
  }, [lastMessage, cameraId, cameraTopics]);

  const CameraContent = ({ isModal = false }: { isModal?: boolean }) => (
    <div
      className={`bg-camera-bg rounded-lg flex items-center justify-center relative group ${
        isModal ? "aspect-video w-full h-full" : "aspect-video"
      }`}
    >
      {imageData ? (
        <img
          src={imageData}
          alt={`Camera ${cameraId} feed`}
          className="max-w-full max-h-full object-contain"
          style={{
            width: isModal ? "auto" : "100%",
            height: isModal ? "auto" : "100%",
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <Camera className="h-12 w-12 mb-2" />
          <p className="text-sm">Camera {cameraId}</p>
          <p className="text-xs opacity-60">
            {isConnected ? "Waiting for data..." : "No signal"}
          </p>
        </div>
      )}

      {/* Fullscreen button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70"
        onClick={() => setIsFullscreen(!isFullscreen)}
      >
        {isModal ? (
          <Minimize2 className="h-4 w-4 text-white" />
        ) : (
          <Maximize2 className="h-4 w-4 text-white" />
        )}
      </Button>

      {/* Camera info overlay */}
      <div className="absolute bottom-2 left-2 bg-black/50 rounded px-2 py-1 flex items-center gap-1">
        <p className="text-xs text-white">{title}</p>
        {isConnected ? (
          <Wifi className="h-2 w-2 text-green-400" />
        ) : (
          <WifiOff className="h-2 w-2 text-red-400" />
        )}
        {lastUpdate && (
          <span className="text-xs text-gray-300 ml-1">
            {`${lastUpdate.toLocaleTimeString()}`}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1 text-xs text-green-400">
                <Wifi className="h-3 w-3" />
                Live
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-red-400">
                <WifiOff className="h-3 w-3" />
                {error ? "Error" : "Connecting..."}
              </div>
            )}
          </div>
        </div>
        <CameraContent />
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-6">
          <div className="h-[70vh]">
            <h3 className="text-lg font-medium mb-4 text-foreground">
              {title} - Fullscreen
            </h3>
            <CameraContent isModal />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
