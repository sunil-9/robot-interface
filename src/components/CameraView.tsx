import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useBridgeData } from "@/hooks/useBridgeData";
import { Camera, Maximize2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

interface CameraViewProps {
  cameraType: "base" | "wrist";
  title: string;
  fullHeight?: boolean;
  showTitle?: boolean;
}

export const CameraView = ({
  cameraType,
  title,
  fullHeight = false,
  showTitle = true,
}: CameraViewProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMask, setShowMask] = useState(true);
  const [maskOpacity, setMaskOpacity] = useState([20]); // Opacity as percentage (0-100) default 20%
  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [lastFpsUpdate, setLastFpsUpdate] = useState(Date.now());
  const bridgeData = useBridgeData();

  const imageData =
    cameraType === "base" ? bridgeData.camera_base : bridgeData.camera_wrist;
  const maskData =
    cameraType === "base" ? bridgeData.mask_base : bridgeData.mask_wrist;

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

  // Debug logging
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
        camera_base: !!bridgeData.camera_base,
        camera_wrist: !!bridgeData.camera_wrist,
        mask_base: !!bridgeData.mask_base,
        mask_wrist: !!bridgeData.mask_wrist,
      },
    });
  }, [cameraType, bridgeData, imageData, maskData, showMask]);

  return (
    <>
      <Card className="h-full p-0 overflow-hidden">
        <div className="relative h-full w-full bg-gray-100 overflow-hidden">
          {imageData ? (
            <div className="relative w-full h-full">
              {/* Base camera image */}
              <img
                src={imageData}
                alt={title}
                className="w-full h-full object-cover"
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
              <div className="absolute top-0 left-0 right-0 px-2 py-1 bg-gradient-to-b from-black/70 to-transparent flex justify-between items-center">
                <div className="flex items-center gap-1 text-white">
                  <Camera className="h-3 w-3" />
                  <h3 className="text-xs font-medium">{title}</h3>
                  {bridgeData.isConnected ? (
                    <Wifi className="h-3 w-3 text-green-500 ml-1" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500 ml-1" />
                  )}
                  <span className="text-xs text-gray-300 ml-1">{fps} FPS</span>
                </div>
                <div className="flex gap-1 items-center">
                  <button
                    onClick={() => setShowMask(!showMask)}
                    disabled={!maskData}
                    className={`text-xs px-1 py-0.5 rounded ${
                      showMask
                        ? "bg-blue-500/80 text-white"
                        : "bg-gray-700/80 text-gray-200"
                    }`}
                  >
                    {showMask ? "Hide" : "Show"} Mask
                  </button>
                  <button
                    onClick={() => setIsFullscreen(true)}
                    disabled={!imageData}
                    className="text-gray-300 hover:text-white ml-1"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Mask status indicator */}
              {maskData && (
                <div className="absolute top-8 right-2 text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                  Mask: {showMask ? "ON" : "OFF"}
                </div>
              )}
            </div>
          ) : (
            <div className="relative h-full">
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {bridgeData.isConnected
                      ? "Waiting for camera data..."
                      : "No connection"}
                  </p>
                  {bridgeData.error && (
                    <p className="text-xs text-red-500 mt-1">
                      {bridgeData.error}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Camera: {cameraType}
                  </p>
                </div>
              </div>

              {/* Top overlay with controls even when no image data */}
              <div className="absolute top-0 left-0 right-0 px-2 py-1 bg-gradient-to-b from-black/70 to-transparent flex justify-between items-center">
                <div className="flex items-center gap-1 text-white">
                  <Camera className="h-3 w-3" />
                  <h3 className="text-xs font-medium">{title}</h3>
                  {bridgeData.isConnected ? (
                    <Wifi className="h-3 w-3 text-green-500 ml-1" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500 ml-1" />
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowMask(!showMask)}
                    disabled={!maskData}
                    className="text-xs px-1 py-0.5 rounded bg-gray-700/80 text-gray-300 opacity-50 cursor-not-allowed"
                  >
                    Show Mask
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mask Opacity Slider */}
        {/* {showMask && maskData && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <label className="text-gray-600">Mask Opacity</label>
              <span className="text-gray-500">{maskOpacity[0]}%</span>
            </div>
            <Slider
              value={maskOpacity}
              onValueChange={setMaskOpacity}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
          </div>
        )} */}
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <div className="aspect-video relative">
            {imageData ? (
              <div className="relative w-full h-full">
                {/* Base camera image */}
                <img
                  src={imageData}
                  alt={title}
                  className="w-full h-full object-cover"
                />

                {/* Attention mask overlay in fullscreen */}
                {showMask && maskData && (
                  <img
                    src={maskData}
                    alt="Attention Mask"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{
                      opacity: maskOpacity[0] / 100,
                      mixBlendMode: "multiply",
                    }}
                  />
                )}

                {/* Control overlay in fullscreen mode */}
                <div className="absolute top-0 left-0 right-0 px-4 py-2 bg-gradient-to-b from-black/70 to-transparent flex justify-between items-center">
                  <div className="flex items-center gap-2 text-white">
                    <Camera className="h-5 w-5" />
                    <h3 className="text-lg font-medium">{title}</h3>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMask(!showMask)}
                      disabled={!maskData}
                      className={`${showMask ? "bg-blue-500 text-white " : ""}`}
                    >
                      {showMask ? "Hide" : "Show"} Mask
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-900">
                <p className="text-white">No image data available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
