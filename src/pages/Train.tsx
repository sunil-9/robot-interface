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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 p-4 bg-black">
        <div className="container mx-auto">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="mr-4 text-gray-400 hover:text-white"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-purple-400">
                Training Mode
              </h1>
              <p className="text-gray-400 text-sm">
                Training {selectedRobot ? `robot: ${selectedRobot}` : ""}
                {selectedControl ? ` with ${selectedControl} control` : ""}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <OriginalTrainingInterface />
      </main>
    </div>
  );
}
