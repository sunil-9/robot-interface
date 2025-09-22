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
  const [useTestImage, setUseTestImage] = useState(true); // Add a flag for test images

  // Map camera IDs to their respective ROS topics using useMemo to prevent re-creation
  const cameraTopics = useMemo(
    () => ({
      // From your config.js, these are the exact role values
      "1": "camera_base",  // Matches "/rgb_base" topic with role="camera_base"
      "2": "camera_wrist", // Matches "/rgb_wrist" topic with role="camera_wrist"
    }),
    []
  );
  
  // For debugging
  console.log(`CameraView ${cameraId} mounted - Looking for messages with role: ${cameraTopics[cameraId]}`);

  // WebSocket connection to ROS2 bridge
  const { isConnected, lastMessage, error } = useWebSocket({
    url: "ws://localhost:8080",
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  });

  // Process incoming camera images
  useEffect(() => {
    if (!lastMessage) return;

    // Looking at your bridge.js, the message structure should have:
    // - topic: the ROS topic (e.g., "/rgb_base")
    // - role: from config (e.g., "camera_base")

    // Match camera by topic or role
    let matchesThisCamera = false;

    // Base camera check (cameraId = "1")
    if (cameraId === "1" && (
      (lastMessage.topic && lastMessage.topic.includes("/rgb_base")) ||
      (lastMessage.role && lastMessage.role === "camera_base")
    )) {
      matchesThisCamera = true;
    }
    
    // Wrist camera check (cameraId = "2")
    if (cameraId === "2" && (
      (lastMessage.topic && lastMessage.topic.includes("/rgb_wrist")) ||
      (lastMessage.role && lastMessage.role === "camera_wrist")
    )) {
      matchesThisCamera = true;
    }
    
    if (matchesThisCamera) {
      console.log(`CameraView ${cameraId} - Found matching message!`);
      const normalized = lastMessage.normalized;
      
      if (
        normalized &&
        normalized.data &&
        normalized.width &&
        normalized.height
      ) {
        console.log(`CameraView ${cameraId} - Processing image: ${normalized.width}x${normalized.height}`);
        
        if (cameraId === "1") {
          console.log("Camera 1 Base64 Data (first 50 chars):", 
            typeof normalized.data === 'string' 
              ? normalized.data.substring(0, 50) + "..." 
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
  }, [lastMessage, cameraId]);

  // Effect to load a test image for Camera 1
  useEffect(() => {
    if (cameraId === "1" && useTestImage) {
      // Sample base64 image - A small red square (1x1 pixel)
      const sampleBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      
      // Log the base64 string
      console.log("Camera 1 Test Base64 Data:", sampleBase64);
      
      // Set the image data with the test base64 string
      setImageData(`data:image/png;base64,${sampleBase64}`);
      setDimensions({ width: 1, height: 1 });
      setLastUpdate(new Date());
    }
  }, [cameraId, useTestImage]);

  const CameraContent = ({ isModal = false }: { isModal?: boolean }) => (
    <div
      className={`bg-camera-bg rounded-lg flex items-center justify-center relative group ${
        isModal ? "aspect-video w-full h-full" : "aspect-video"
      }`}
    >
      {imageData ? (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <img
            src={imageData}
            alt={`Camera ${cameraId} feed`}
            className="max-w-full max-h-full object-contain"
            style={{
              width: isModal ? "auto" : "100%",
              height: isModal ? "auto" : "100%",
            }}
          />
          {useTestImage && (
            <div className="absolute bottom-10 left-0 right-0 text-center">
              <p className="text-xs text-white bg-black/50 inline-block px-2 py-1 rounded">
                Test image - No actual camera data received
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <Camera className="h-12 w-12 mb-2" />
          <p className="text-sm">Camera {cameraId}</p>
          <p className="text-xs opacity-60">
            {isConnected ? "Waiting for data..." : "No signal"}
          </p>
          {cameraId === "1" && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setUseTestImage(prev => !prev)}
            >
              {useTestImage ? "Hide Test Image" : "Show Test Image"}
            </Button>
          )}
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
            {cameraId === "1" && (
              <button 
                onClick={() => setUseTestImage(prev => !prev)}
                className={`text-xs px-2 py-1 rounded ${useTestImage ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'}`}
              >
                {useTestImage ? 'Test Mode' : 'Live Mode'}
              </button>
            )}
            
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
        
        {cameraId === "1" && (
          <div className="mt-3">
            <p className="text-xs text-gray-400">
              Base64 String Preview:
            </p>
            <div className="bg-black/20 p-2 rounded mt-1 overflow-x-auto">
              <code className="text-xs whitespace-pre-wrap break-all">
                {imageData ? imageData.substring(23, 100) + "..." : "No image data"}
              </code>
            </div>
          </div>
        )}
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
