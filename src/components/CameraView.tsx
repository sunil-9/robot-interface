import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useBridgeData } from "@/hooks/useBridgeData";
import { useRobotConfig } from "@/hooks/useRobotConfig";
import { Camera, Maximize2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

interface CameraViewProps {
  cameraType: "head" | "left" | "right";
  title: string;
  fullHeight?: boolean;
  fullWidth?: boolean;
  showTitle?: boolean;
}

export const CameraView = ({
  cameraType,
  title,
  fullHeight = false,
  fullWidth = false,
  showTitle = true,
}: CameraViewProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMask, setShowMask] = useState(true);
  const [maskOpacity, setMaskOpacity] = useState([20]); // Opacity as percentage (0-100)
  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [lastFpsUpdate, setLastFpsUpdate] = useState(Date.now());
  const bridgeData = useBridgeData();
  const { cameras, getCamera } = useRobotConfig();

  // For debugging, uncomment this line to use test data instead of WebSocket data
  // const useTestData = true;
  const useTestData = false;

  // Get camera configuration if available
  const cameraConfig = getCamera(
    cameraType === "head"
      ? "base"
      : cameraType === "left"
      ? "left"
      : cameraType === "right"
      ? "wrist"
      : ""
  );

  // Select appropriate camera data based on type
  const imageData = useTestData
    ? // Test data placeholders
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD"
    : // Actual WebSocket data
    cameraType === "head"
    ? bridgeData.camera_head
    : cameraType === "left"
    ? bridgeData.camera_left
    : cameraType === "right"
    ? bridgeData.camera_right
    : null;

  // Select appropriate mask data based on type
  const maskData = useTestData
    ? // Test mask data placeholder
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD"
    : // Actual WebSocket mask data
    cameraType === "head"
    ? bridgeData.mask_head
    : cameraType === "left"
    ? bridgeData.mask_left
    : cameraType === "right"
    ? bridgeData.mask_right
    : null;

  // FPS calculation
  useEffect(() => {
    if (imageData) {
      const now = Date.now();
      const newFrameCount = frameCount + 1;
      setFrameCount(newFrameCount);

      // Calculate FPS every second
      if (now - lastFpsUpdate >= 1000) {
        const calculatedFps = Math.round(
          (newFrameCount * 1000) / (now - lastFpsUpdate)
        );
        setFps(calculatedFps);
        setFrameCount(0);
        setLastFpsUpdate(now);
      }
    }
  }, [imageData, frameCount, lastFpsUpdate]);

  // Reset FPS when no data
  useEffect(() => {
    if (!imageData) {
      setFps(0);
      setFrameCount(0);
      setLastFpsUpdate(Date.now());
    }
  }, [imageData]);

  // Debug logging - more verbose to help diagnose the issue
  useEffect(() => {
    console.log(`CameraView ${cameraType}:`, {
      isConnected: bridgeData.isConnected,
      hasImageData: !!imageData,
      hasMaskData: !!maskData,
      imageDataLength: imageData ? imageData.length : 0,
      maskDataLength: maskData ? maskData.length : 0,
      showMask,
      imageDataPreview: imageData ? imageData.substring(0, 50) + "..." : "none",
      fullBridgeData: {
        state: !!bridgeData.state,
        command: !!bridgeData.command,
        camera_head: !!bridgeData.camera_head,
        camera_left: !!bridgeData.camera_left,
        camera_right: !!bridgeData.camera_right,
        mask_head: !!bridgeData.mask_head,
        mask_left: !!bridgeData.mask_left,
        mask_right: !!bridgeData.mask_right,
      },
      headCameraData: bridgeData.camera_head
        ? bridgeData.camera_head.substring(0, 50) + "..."
        : "none",
      leftCameraData: bridgeData.camera_left
        ? bridgeData.camera_left.substring(0, 50) + "..."
        : "none",
      rightCameraData: bridgeData.camera_right
        ? bridgeData.camera_right.substring(0, 50) + "..."
        : "none",
    });
  }, [cameraType, bridgeData, imageData, maskData, showMask]);

  return (
    <>
      <Card className="h-full w-full p-0 rounded-none">
        <div
          className={`relative h-full w-full bg-black ${
            cameraType === "head"
              ? "border-l-4 border-blue-500"
              : cameraType === "left"
              ? "border-l-4 border-green-500"
              : cameraType === "right"
              ? "border-l-4 border-amber-500"
              : ""
          }`}
        >
          {imageData ? (
            <div className="relative  h-full">
              {/* Base camera image */}
              <img
                src={imageData}
                alt={title}
                className={`${
                  fullWidth ? "w-full" : "w-auto"
                } h-full object-cover`} //full width or not check here
                onLoad={() =>
                  console.log(`✅ ${cameraType} image loaded successfully`)
                }
                onError={(e) => {
                  console.error(`❌ ${cameraType} image failed to load:`, e);
                  console.log(
                    "Image data:",
                    imageData?.substring(0, 100) + "..."
                  );
                }}
                style={{ imageRendering: "auto" }}
              />

              {/* Attention mask overlay */}
              {showMask && maskData && (
                <img
                  src={maskData}
                  alt="Attention Mask"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{
                    opacity: maskOpacity[0] / 100,
                    mixBlendMode: "multiply",
                  }}
                  onLoad={() =>
                    console.log(`✅ ${cameraType} mask loaded successfully`)
                  }
                  onError={(e) => {
                    console.error(`❌ ${cameraType} mask failed to load:`, e);
                  }}
                />
              )}

              {/* Top overlay with controls - semi-transparent black gradient */}
              <div className="absolute top-0 left-0 gap-2 px-2 py-1 bg-gradient-to-b from-black/70 to-transparent flex z-50 justify-between items-center">
                <div className="flex items-center gap-1 text-white">
                  <Camera
                    className={`h-3 w-3 ${
                      cameraType === "head"
                        ? "text-blue-400"
                        : cameraType === "left"
                        ? "text-green-400"
                        : cameraType === "right"
                        ? "text-amber-400"
                        : ""
                    }`}
                  />
                  <h3
                    className={`text-xs font-medium ${
                      cameraType === "head"
                        ? "text-blue-200"
                        : cameraType === "left"
                        ? "text-green-200"
                        : cameraType === "right"
                        ? "text-amber-200"
                        : ""
                    }`}
                  >
                    {title}
                    <span className="opacity-75 ml-1 text-[10px]">
                      {cameraType === "head"
                        ? "(Head)"
                        : cameraType === "left"
                        ? "(Left)"
                        : cameraType === "right"
                        ? "(Right)"
                        : ""}
                    </span>
                  </h3>
                  {bridgeData.isConnected ? (
                    <Wifi className="h-3 w-3 text-green-500 ml-1" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500 ml-1" />
                  )}
                  <span className="text-xs text-gray-300 ml-1">{fps} FPS</span>
                </div>
                <div className="flex gap-1 items-center">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 p-0.5 text-white hover:bg-white/10"
                    onClick={() => setIsFullscreen(true)}
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative h-full flex items-center justify-center">
              <div className="text-center p-4">
                <Camera
                  className={`h-8 w-8 mx-auto mb-2 ${
                    cameraType === "head"
                      ? "text-blue-500"
                      : cameraType === "left"
                      ? "text-green-500"
                      : cameraType === "right"
                      ? "text-amber-500"
                      : "text-gray-500"
                  }`}
                />
                <h3
                  className={`mb-1 ${
                    cameraType === "head"
                      ? "text-blue-400"
                      : cameraType === "left"
                      ? "text-green-400"
                      : cameraType === "right"
                      ? "text-amber-400"
                      : "text-gray-400"
                  }`}
                >
                  {title}
                </h3>
                <p className="text-xs text-gray-500">No camera feed</p>
                {!bridgeData.isConnected && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-red-500">
                    <WifiOff className="h-3 w-3" />
                    <p className="text-xs">Disconnected</p>
                  </div>
                )}
                {bridgeData.isConnected && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-yellow-500">
                    <Wifi className="h-3 w-3" />
                    <p className="text-xs">Connected, awaiting data...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl bg-black p-0 border-gray-700">
          <div className="w-full h-full p-0">
            {imageData ? (
              <div className="relative">
                {/* Fullscreen image */}
                <img
                  src={imageData}
                  alt={title}
                  className="w-full object-contain max-h-[80vh]"
                />

                {/* Fullscreen mask overlay */}
                {showMask && maskData && (
                  <img
                    src={maskData}
                    alt="Attention Mask"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    style={{
                      opacity: maskOpacity[0] / 100,
                      mixBlendMode: "multiply",
                    }}
                  />
                )}

                {/* Fullscreen overlay controls */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Camera
                        className={`h-4 w-4 ${
                          cameraType === "head"
                            ? "text-blue-400"
                            : cameraType === "left"
                            ? "text-green-400"
                            : cameraType === "right"
                            ? "text-amber-400"
                            : ""
                        }`}
                      />
                      <h2
                        className={`text-lg font-medium ${
                          cameraType === "head"
                            ? "text-blue-200"
                            : cameraType === "left"
                            ? "text-green-200"
                            : cameraType === "right"
                            ? "text-amber-200"
                            : ""
                        }`}
                      >
                        {title}
                        <span className="opacity-75 ml-2 text-sm">
                          {cameraType === "head"
                            ? "(Head Camera)"
                            : cameraType === "left"
                            ? "(Left Hand Camera)"
                            : cameraType === "right"
                            ? "(Right Hand Camera)"
                            : ""}
                        </span>
                      </h2>
                    </div>
                    <div className="text-sm text-gray-300">{fps} FPS</div>
                  </div>

                  {/* Mask visibility and opacity controls */}
                  {maskData && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={showMask ? "default" : "outline"}
                            onClick={() => setShowMask(!showMask)}
                            className="h-7 px-2"
                          >
                            {showMask ? "Hide Mask" : "Show Mask"}
                          </Button>
                          <span className="text-xs text-gray-300">
                            Opacity: {maskOpacity[0]}%
                          </span>
                        </div>
                      </div>
                      {showMask && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">0%</span>
                          <Slider
                            value={maskOpacity}
                            onValueChange={setMaskOpacity}
                            max={100}
                            step={1}
                            className="w-64"
                          />
                          <span className="text-xs text-gray-400">100%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full flex items-center justify-center bg-black p-12">
                <div className="text-center">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-gray-700" />
                  <h2 className="text-xl text-gray-400 mb-2">{title}</h2>
                  <p className="text-gray-500">No camera feed available</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
