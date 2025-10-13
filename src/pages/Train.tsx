import { InputTracker } from "@/components/InputTracker";
import { TrainingInterface as OriginalTrainingInterface } from "@/components/TrainingInterface";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function TrainPage() {
  const navigate = useNavigate();
  const selectedRobot = sessionStorage.getItem("selectedRobot");
  const selectedControl = sessionStorage.getItem("selectedControl");

  // Redirect to home if no selections are made
  useEffect(() => {
    if (!selectedRobot || !selectedControl) {
      navigate("/");
    }
  }, [selectedRobot, selectedControl, navigate]);

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
        <OriginalTrainingInterface />
      </main>

      {/* Input tracker overlay */}
      <InputTracker controlType={selectedControl} />
    </div>
  );
}
