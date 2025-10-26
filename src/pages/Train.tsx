import { InputTracker } from "@/components/InputTracker";
import { TrainingInterface } from "@/components/TrainingInterface";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useWebRTCSession } from "@/hooks/useWebRTCSession";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function TrainPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  // Get session data from URL params or from session storage
  const sessionData = (() => {
    try {
      const storedData = sessionStorage.getItem("sessionData");
      return storedData ? JSON.parse(storedData) : null;
    } catch (e) {
      console.error("Failed to parse session data", e);
      return null;
    }
  })();

  // Prioritize URL params over session storage for better user experience
  const selectedRobot = params.get("robot") || sessionData?.robot || null;
  const selectedControl =
    params.get("controller") || sessionData?.controller || null;

  const session = useWebRTCSession(selectedRobot);

  // On mount: validate URL params and test connectivity; fail -> toast + redirect home
  useEffect(() => {
    (async () => {
      if (!selectedRobot || !selectedControl) {
        toast({
          title: "Missing info",
          description: "Robot or controller missing. Please choose from home.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Support legacy components with individual session storage items
      // while maintaining our new structured approach
      try {
        // Update session storage with current values for backward compatibility
        if (sessionData) {
          Object.entries(sessionData).forEach(([key, value]) => {
            if (typeof value === "string") {
              sessionStorage.setItem(key, value);
            }
          });
        }

        // Fallback for direct session storage access in legacy components
        sessionStorage.setItem("selectedRobot", selectedRobot);
        sessionStorage.setItem("selectedControl", selectedControl);

        // Check if connection was tested and signaling config is available
        const connectionReady = sessionStorage.getItem("connection_ready");
        const signalingConfig = sessionStorage.getItem("signalingConfig");

        if (!connectionReady || !signalingConfig) {
          throw new Error(
            "Connection test required. Please test connection from the home page."
          );
        }

        // Parse the signaling config to verify it's valid
        try {
          const parsedConfig = JSON.parse(signalingConfig);
          if (!parsedConfig.signaling_base_url) {
            throw new Error(
              "Invalid signaling configuration: missing signaling_base_url"
            );
          }
          console.info(
            "Training session initialized with valid signaling config",
            parsedConfig.signaling_base_url
          );
        } catch (e) {
          throw new Error(
            "Invalid signaling configuration. Please test connection again."
          );
        }
      } catch (e) {
        console.error("Error initializing session data", e);
        toast({
          title: "Session initialization failed",
          description: "Could not initialize session data. Please try again.",
          variant: "destructive",
        });
        navigate("/");
      }
    })();
  }, [selectedRobot, selectedControl, sessionData, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Transparent overlay header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto py-3 px-4">
          <div className="flex items-center justify-center">
            <div className="bg-black/30 backdrop-blur-sm py-1.5 px-4 rounded-full flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white mr-2 h-7 w-7"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <h1 className="text-lg font-semibold text-purple-300 mr-2">
                Training Mode
              </h1>
              <p className="text-xs text-gray-300">
                {selectedRobot ? `${selectedRobot}` : ""}
                {selectedControl ? ` · ${selectedControl}` : ""}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content takes full height */}
      <main className="h-full">
        <TrainingInterface
          robotId={selectedRobot}
          controllerId={selectedControl}
          session={session}
        />
      </main>

      {/* Input tracker overlay */}
      <InputTracker controlType={selectedControl} session={session} />
    </div>
  );
}
