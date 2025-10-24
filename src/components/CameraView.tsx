import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useBridgeData } from "@/hooks/useBridgeData";
import { useWebRTCClient } from "@/hooks/useWebRTCClient";
import { Camera, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const [maskOpacity, setMaskOpacity] = useState([20]);
  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [lastFpsUpdate, setLastFpsUpdate] = useState(Date.now());
  const bridgeData = useBridgeData();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rtc = useWebRTCClient();
  const webrtcEnabled = useMemo(
    () => sessionStorage.getItem("connection_ready") === "1",
    []
  );

  const base64 =
    cameraType === "head"
      ? bridgeData.camera_head
      : cameraType === "left"
      ? bridgeData.camera_left
      : bridgeData.camera_right;

  const maskBase64 =
    cameraType === "head"
      ? bridgeData.mask_head
      : cameraType === "left"
      ? bridgeData.mask_left
      : bridgeData.mask_right;

  const imgSrc = base64 ? `data:image/jpeg;base64,${base64}` : null;
  const maskSrc = maskBase64 ? `data:image/png;base64,${maskBase64}` : null;

  useEffect(() => {
    if (!webrtcEnabled && imgSrc) {
      const now = Date.now();
      const count = frameCount + 1;
      setFrameCount(count);
      if (now - lastFpsUpdate >= 1000) {
        setFps(Math.round((count * 1000) / (now - lastFpsUpdate)));
        setFrameCount(0);
        setLastFpsUpdate(now);
      }
    }
  }, [webrtcEnabled, imgSrc, frameCount, lastFpsUpdate]);

  useEffect(() => {
    if (!imgSrc) {
      setFps(0);
      setFrameCount(0);
      setLastFpsUpdate(Date.now());
    }
  }, [imgSrc]);

  useEffect(() => {
    if (!webrtcEnabled) return;
    let mounted = true;
    (async () => {
      if (!rtc.connected) {
        try {
          await rtc.connect();
        } catch (err) {
          console.error("WebRTC connect failed", err);
          return;
        }
      }
      if (!mounted) return;
      const stream = rtc.getStream(
        cameraType === "head"
          ? "head"
          : cameraType === "left"
          ? "left"
          : "right"
      );
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn("Video play failed", e);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [webrtcEnabled, rtc, rtc.version, cameraType]);

  return (
    <>
      <Card className="h-full w-full p-0 rounded-none">
        <div className="relative h-full w-full bg-black">
          {webrtcEnabled || imgSrc ? (
            <div className="relative h-full">
              {webrtcEnabled ? (
                <video
                  ref={videoRef}
                  className={`${
                    fullWidth ? "w-full" : "w-auto"
                  } h-full object-cover`}
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={imgSrc || ""}
                  alt={title}
                  className={`${
                    fullWidth ? "w-full" : "w-auto"
                  } h-full object-cover`}
                />
              )}

              {!webrtcEnabled && showMask && maskSrc && (
                <img
                  src={maskSrc}
                  alt={`${title} mask`}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{
                    opacity: maskOpacity[0] / 100,
                    mixBlendMode: "multiply",
                  }}
                />
              )}

              {showTitle && (
                <div className="absolute top-0 left-0 right-0 px-2 py-1 bg-gradient-to-b from-black/70 to-transparent flex z-50 justify-between items-center">
                  <div className="flex items-center gap-1 text-white">
                    <Camera className="h-3 w-3 text-purple-300" />
                    <h3 className="text-xs">{title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {bridgeData.isConnected ? (
                      <Wifi className="h-3 w-3 text-green-500" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-xs text-gray-300">{fps} FPS</span>
                    {/* <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 p-0.5 text-white hover:bg-white/10"
                      onClick={() => setIsFullscreen(true)}
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button> */}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative h-full flex items-center justify-center">
              <div className="text-center p-4">
                <Camera className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <h3 className="mb-1 text-gray-300">{title}</h3>
                <p className="text-xs text-gray-500">No camera feed</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl bg-black p-0 border-gray-700">
          <div className="w-full h-full p-0">
            {webrtcEnabled || imgSrc ? (
              <div className="relative">
                {webrtcEnabled ? (
                  <video
                    ref={videoRef}
                    className="w-full object-contain max-h-[80vh]"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={imgSrc || ""}
                    alt={title}
                    className="w-full object-contain max-h-[80vh]"
                  />
                )}
                {!webrtcEnabled && showMask && maskSrc && (
                  <img
                    src={maskSrc}
                    alt="Attention Mask"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    style={{
                      opacity: maskOpacity[0] / 100,
                      mixBlendMode: "multiply",
                    }}
                  />
                )}
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
