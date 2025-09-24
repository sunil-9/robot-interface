import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useBridgeData } from "@/hooks/useBridgeData";
import { Camera, Maximize2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

interface CameraViewProps {
  cameraType: "base" | "wrist";
  title: string;
}

export const CameraView = ({ cameraType, title }: CameraViewProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMask, setShowMask] = useState(true);
  const bridgeData = useBridgeData();

  const imageData =
    cameraType === "base" ? bridgeData.camera_base : bridgeData.camera_wrist;
  const maskData =
    cameraType === "base" ? bridgeData.mask_base : bridgeData.mask_wrist;

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
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            <h3 className="text-lg font-semibold">{title}</h3>
            {bridgeData.isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMask(!showMask)}
              disabled={!maskData}
              className={showMask ? "bg-blue-100" : ""}
            >
              {showMask ? "Hide" : "Show"} Mask
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(true)}
              disabled={!imageData}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
          {imageData ? (
            <div className="relative w-full h-full">
              {/* Base camera image */}
              <img
                src={imageData}
                alt={title}
                className="w-full h-full object-contain"
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
                <div
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{
                    backgroundImage: `url(${maskData})`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    mixBlendMode: "multiply",
                    opacity: 0.7,
                  }}
                >
                  {/* Color overlay for highlighted regions */}
                  <div
                    className="w-full h-full"
                    style={{
                      background:
                        "linear-gradient(45deg, rgba(255,0,0,0.3), rgba(255,255,0,0.3), rgba(0,255,0,0.3), rgba(0,0,255,0.3))",
                      maskImage: `url(${maskData})`,
                      WebkitMaskImage: `url(${maskData})`,
                      maskSize: "contain",
                      WebkitMaskSize: "contain",
                      maskRepeat: "no-repeat",
                      WebkitMaskRepeat: "no-repeat",
                      maskPosition: "center",
                      WebkitMaskPosition: "center",
                    }}
                  />
                </div>
              )}

              {/* Mask status indicator */}
              {maskData && (
                <div className="absolute top-2 right-2 text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                  Mask: {showMask ? "ON" : "OFF"}
                </div>
              )}
            </div>
          ) : (
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
          )}
        </div>
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl">
          <div className="aspect-video">
            {imageData ? (
              <div className="relative w-full h-full">
                {/* Base camera image */}
                <img
                  src={imageData}
                  alt={title}
                  className="w-full h-full object-contain"
                />

                {/* Attention mask overlay in fullscreen */}
                {showMask && maskData && (
                  <div
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{
                      backgroundImage: `url(${maskData})`,
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                      mixBlendMode: "multiply",
                      opacity: 0.7,
                    }}
                  >
                    {/* Color overlay for highlighted regions */}
                    <div
                      className="w-full h-full"
                      style={{
                        background:
                          "linear-gradient(45deg, rgba(255,0,0,0.3), rgba(255,255,0,0.3), rgba(0,255,0,0.3), rgba(0,0,255,0.3))",
                        maskImage: `url(${maskData})`,
                        WebkitMaskImage: `url(${maskData})`,
                        maskSize: "contain",
                        WebkitMaskSize: "contain",
                        maskRepeat: "no-repeat",
                        WebkitMaskRepeat: "no-repeat",
                        maskPosition: "center",
                        WebkitMaskPosition: "center",
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p>No image data available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
