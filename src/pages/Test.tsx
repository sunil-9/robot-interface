import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function TestPage() {
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
              <h1 className="text-2xl font-bold text-purple-400">Test Mode</h1>
              <p className="text-gray-400 text-sm">
                Test robot performance with trained models
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Test Mode Coming Soon
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            This feature is currently under development.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-purple-700 hover:bg-purple-600"
          >
            Return to Home
          </Button>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-4 bg-black">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          &copy; 2025 Robot Teaching Interface | Version 1.0.0
        </div>
      </footer>
    </div>
  );
}
