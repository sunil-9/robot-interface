import { useState } from "react";
import { Maximize2, Minimize2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface CameraViewProps {
  cameraId: string;
  title: string;
}

export const CameraView = ({ cameraId, title }: CameraViewProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const CameraContent = ({ isModal = false }: { isModal?: boolean }) => (
    <div className={`bg-camera-bg rounded-lg flex items-center justify-center relative group ${
      isModal ? "aspect-video w-full h-full" : "aspect-video"
    }`}>
      {/* Mock camera feed - replace with actual video stream */}
      <div className="flex flex-col items-center justify-center text-muted-foreground">
        <Camera className="h-12 w-12 mb-2" />
        <p className="text-sm">Camera {cameraId}</p>
        <p className="text-xs opacity-60">No signal</p>
      </div>
      
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
      <div className="absolute bottom-2 left-2 bg-black/50 rounded px-2 py-1">
        <p className="text-xs text-white">{title}</p>
      </div>
    </div>
  );

  return (
    <>
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3 text-foreground">{title}</h3>
        <CameraContent />
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-6">
          <CameraContent isModal />
        </DialogContent>
      </Dialog>
    </>
  );
};